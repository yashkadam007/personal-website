export async function onRequestPost(context) {
  const { request, env } = context;

  // Validate content length
  const contentLength = request.headers.get("content-length");
  if (contentLength && parseInt(contentLength) > 1024) {
    return new Response("Payload too large", { status: 413 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  // Build the event object with server-side metadata
  const event = {
    path: String(body.p || "/").slice(0, 256),
    referrer: String(body.r || "").slice(0, 512),
    screen_width: parseInt(body.sw) || 0,
    screen_height: parseInt(body.sh) || 0,
    user_agent: String(body.ua || "").slice(0, 512),
    ip: request.headers.get("CF-Connecting-IP") || "",
    country: request.headers.get("CF-IPCountry") || "",
    timestamp: new Date().toISOString(),
  };

  // Try forwarding to the analytics server
  const serverUrl = env.ANALYTICS_SERVER_URL || "http://localhost:8080";
  try {
    const resp = await fetch(`${serverUrl}/api/event`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(event),
    });

    if (resp.ok) {
      return new Response(null, { status: 204 });
    }
  } catch {
    // Server unreachable — fall through to KV buffer
  }

  // Buffer in KV if server is down
  if (env.ANALYTICS_BUFFER) {
    const key = `evt:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;
    await env.ANALYTICS_BUFFER.put(key, JSON.stringify(event), {
      expirationTtl: 604800, // 7 days
    });
  }

  return new Response(null, { status: 202 });
}
