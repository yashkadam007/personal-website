---
title: "Building a Self-Hosted Analytics System for My Personal Website"
date: 2026-03-31
draft: false
---

I wanted to know when someone visits my website. Not in the aggregate, pageviews-per-month way that Cloudflare Analytics shows you, but in a "someone just opened my resume from LinkedIn" way.

The problem with Cloudflare's built-in analytics is that most of the traffic is bots and scrapers. I couldn't tell the difference between a real person and a crawler. I wanted something that would:

- Only track real human visitors (filter out bots)
- Tell me where they're from (city, country)
- Notify me instantly on Telegram
- Show me what pages they visited, from where, on what device
- Not slow down the site at all
- Cost nothing

So I built it myself.

## The architecture

```
Browser → Cloudflare Pages Function → Cloudflare Tunnel → Go service → PostgreSQL
                                                              ↓
                                                          Telegram
                                                          Grafana
```

The site is a static Hugo site hosted on Cloudflare Pages. The analytics pipeline works like this:

1. A tiny inline script (~500 bytes) fires a `navigator.sendBeacon()` POST on the first user interaction (scroll, click, touch)
2. A Cloudflare Pages Function receives it, attaches the visitor's real IP and country from CF headers
3. The function forwards the event through a Cloudflare Tunnel to a Go service running on my spare Ubuntu laptop at home
4. The Go service parses the user agent, does a geo-IP lookup for city-level location, stores everything in PostgreSQL, and sends me a Telegram notification if it's a new visitor

No cookies. No fingerprinting. No third-party scripts. The beacon is same-origin, so ad-blockers mostly ignore it.

## Bot filtering: keep it simple

The initial bot filtering strategy was dead simple: if JavaScript executed and sent the beacon, it's probably a human. Bots and scrapers that don't run JS never fire the beacon.

This is the inverse of most analytics tools. Instead of trying to detect and block bots from a firehose of traffic, I only see events from browsers that ran my script. It worked well as a first pass, but headless Chrome bots eventually slipped through — more on that [below](#update-the-bots-got-smarter).

## The beacon

The client-side code is minimal. It lives in a Hugo partial that only loads in production:

```html
{{- if hugo.IsProduction | or (eq site.Params.env "production") }}
<script>
(function(){
  if(!navigator.sendBeacon)return;
  navigator.sendBeacon("/api/ping",JSON.stringify({
    p:location.pathname,
    r:document.referrer,
    sw:screen.width,
    sh:screen.height,
    ua:navigator.userAgent,
    t:Date.now()
  }));
})();
</script>
{{- end }}
```

`sendBeacon` is non-blocking by design. It fires and forgets, with zero impact on page load or interaction. The payload is ~150 bytes of JSON.

## The Cloudflare Pages Function

The Pages Function at `/api/ping` does the server-side enrichment. The browser can't tell you a visitor's IP address, but Cloudflare can via the `CF-Connecting-IP` header. The function merges the client payload with server-side metadata and forwards it:

```javascript
export async function onRequestPost(context) {
  const { request, env } = context;
  const body = await request.json();

  const event = {
    path: String(body.p || "/"),
    referrer: String(body.r || ""),
    screen_width: parseInt(body.sw) || 0,
    screen_height: parseInt(body.sh) || 0,
    user_agent: String(body.ua || ""),
    ip: request.headers.get("CF-Connecting-IP") || "",
    country: request.headers.get("CF-IPCountry") || "",
    timestamp: new Date().toISOString(),
  };

  // Forward to analytics server, buffer in KV if it's down
  try {
    const resp = await fetch(`${env.ANALYTICS_SERVER_URL}/api/event`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(event),
    });
    if (resp.ok) return new Response(null, { status: 204 });
  } catch {}

  // Server down — buffer in CF KV
  if (env.ANALYTICS_BUFFER) {
    const key = `evt:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;
    await env.ANALYTICS_BUFFER.put(key, JSON.stringify(event), {
      expirationTtl: 604800,
    });
  }
  return new Response(null, { status: 202 });
}
```

If my laptop is offline, events get buffered in Cloudflare KV with a 7-day TTL. A cron worker drains them when the server comes back.

## The server: no open ports

The Go analytics service runs on an Ubuntu laptop at home inside a Podman container. The key constraint: I didn't want to open any ports on my home network.

Cloudflare Tunnel solves this. The `cloudflared` daemon runs in a container, creates an outbound-only encrypted tunnel to Cloudflare's edge, and routes `analytics-internal.yashk.net` to the Go service. My laptop's IP is never exposed.

The whole stack runs as a Podman Compose setup:

- **Go analytics service** — receives events, parses user agents, does MaxMind geo-IP lookups, sends Telegram notifications
- **PostgreSQL** — stores all events
- **Grafana** — dashboards, accessible only via SSH tunnel
- **cloudflared** — the tunnel, no ports needed

## Geo-IP: city-level location for free

MaxMind's GeoLite2-City database is free (you just need to sign up for a license key). The Go service loads the ~70MB database at startup and does in-memory lookups. For a given IP, I get city, country, latitude/longitude, and ISP.

This means my Telegram notifications look like:

```
New visitor on yashk.net

Page: /resume
Location: Mumbai, Maharashtra, India
Referrer: linkedin.com
Device: Chrome 120 / macOS (Desktop)
Time: 14:32 IST
```

If someone from a company opens my resume from LinkedIn, I know about it within seconds.

## Grafana dashboards

Grafana connects directly to PostgreSQL and gives me:

- Visitors over time
- Top pages and referrers
- Geographic distribution
- Browser and OS breakdown
- A table of recent visitors with full details

I access it via SSH tunnel — it's never exposed to the internet.

## Lessons learned

A few things I hit during implementation that might save you time:

**Cloudflare reserves `/cdn-cgi/`.** I originally used `/cdn-cgi/beacon` as the beacon path since it looks like a native CF endpoint. Turns out CF blocks Pages Functions under that path entirely. Switched to `/api/ping`.

**Pages Functions != Workers.** The `wrangler.toml` `[vars]` and `[[kv_namespaces]]` sections only apply to Workers, not Pages Functions. For Pages, you set environment variables and KV bindings in the CF dashboard under your Pages project settings.

**Podman networking is different from Docker.** Container name resolution works via network aliases, not container names. In a compose file, the service name (`analytics`) is the alias, not the `container_name` (`analytics-service`). The CF tunnel needed to route to `http://analytics:8080`, not `http://analytics-service:8080`.

**Podman needs fully-qualified image names.** `postgres:16-alpine` doesn't resolve — you need `docker.io/library/postgres:16-alpine`. Unlike Docker, Podman doesn't default to Docker Hub without explicit registry configuration.

**Grafana provisioning can't interpolate secrets.** You can use `${ENV_VAR}` in Grafana provisioning YAML for some fields, but `secureJsonData` (like database passwords) doesn't support it. I ended up configuring the PostgreSQL datasource manually through the Grafana UI.

**Restart all containers together.** With Podman Compose, if you restart just one container (like the tunnel), it can get a new IP on a different network segment than the other containers. Always `podman compose down && podman compose up -d` to keep everyone on the same network.

## Update: the bots got smarter

After running the system for about 10 days, I pulled the raw data from PostgreSQL to see how things were going. 26 events total. I expected most of them to be real visitors — after all, the whole point of the JS-execution filter was to keep bots out.

Turns out, 7 of the 26 events (27%) were bots.

### What slipped through

| IP | Signal | What it was |
|----|--------|-------------|
| 104.197.69.115 | Google Cloud IP, Chrome 125 (outdated), 800×600 | Datacenter bot |
| 205.169.39.14 | Chrome 117, 800×600, referrer "bing.com" | Crawler |
| 205.169.39.23 | Same /24 subnet, identical fingerprint | Crawler |
| 205.169.39.85 | Same /24 subnet, Chrome 79, 1024×1024 | Crawler |
| 40.77.177.109 | UA literally says `bingbot/2.0` | Bingbot |
| 185.241.208.176 | `HeadlessChrome` in UA, Tor exit node | Headless scraper |
| 146.112.163.52 | Reston, VA — Cisco Umbrella/OpenDNS IP | URL safety scanner |

The pattern was clear. These bots all execute JavaScript (that's how they got past the original filter), but they share telltale signs:

- **Default headless viewport sizes**: 800×600, 1024×1024 — no real person uses these
- **Outdated Chrome versions**: 79, 117, 125 — real browsers auto-update, bots freeze on old versions
- **Datacenter IPs**: Google Cloud, Microsoft, Cisco — not residential ISPs
- **No city resolved**: geo-IP returned empty or generic datacenter locations

The JS-execution filter was a good first pass, but "can run JavaScript" is too low a bar now that headless Chrome is everywhere.

### The fix: interaction-based filtering

The insight is simple: bots load pages and execute scripts, but they don't scroll, move a mouse, or tap. Real humans do.

I changed the beacon from firing on page load to firing on the first user interaction:

```html
<script>
(function(){
  if(!navigator.sendBeacon)return;
  var sent=false;
  function ping(){
    if(sent)return;
    sent=true;
    navigator.sendBeacon("/api/ping",JSON.stringify({
      p:location.pathname,
      r:document.referrer,
      sw:screen.width,
      sh:screen.height,
      ua:navigator.userAgent,
      t:Date.now()
    }));
  }
  var ev=["scroll","mousemove","touchstart","click","keydown"];
  ev.forEach(function(e){
    document.addEventListener(e,ping,{once:true,passive:true});
  });
})();
</script>
```

The beacon now waits for `scroll`, `mousemove`, `touchstart`, `click`, or `keydown` before firing. The `{once: true}` option auto-removes each listener after the first trigger, and the `sent` flag ensures only one beacon fires per pageview.

This covers all real usage patterns:

- **Desktop**: mouse move or scroll
- **Mobile browser**: touch to scroll or tap
- **In-app webviews** (Instagram, Twitter, LinkedIn): touch events fire the same way
- **Keyboard navigation**: keydown catches it

The tradeoff is that visitors who land and leave without any interaction won't be counted. On a personal site, this is negligible — almost everyone at least scrolls.

Every single bot from the data above would have been filtered out by this change. None of them simulate real user interactions.

## What's next

I might also add reverse DNS lookups to identify company visitors by their IP ranges. Knowing that a visit came from a corporate network is more useful than just seeing a city name.

## The stack

| Component | Technology | Cost |
|-----------|-----------|------|
| Static site | Hugo + PaperMod | Free (CF Pages) |
| Beacon | Inline JS, ~500 bytes | Free |
| Edge function | CF Pages Function | Free tier |
| Event buffer | CF KV | Free tier |
| Tunnel | Cloudflare Tunnel | Free |
| Analytics service | Go | Self-hosted |
| Database | PostgreSQL 16 | Self-hosted |
| Geo-IP | MaxMind GeoLite2 | Free |
| Dashboards | Grafana OSS | Self-hosted |
| Notifications | Telegram Bot API | Free |
| Container runtime | Podman Compose | Free |

Total cost: $0/month. Total infrastructure: one spare laptop.
