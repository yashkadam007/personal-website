---
title: "Resume"
layout: "resume"
url: "/resume/"
summary: "Yash Kadam – Software Engineer"
showToc: false
showReadingTime: false
showBreadCrumbs: false
hideMeta: true
disableShare: true
---

# Yash Kadam

**Software Engineer**

[hello@yashk.net](mailto:hello@yashk.net) · [LinkedIn](https://linkedin.com/in/yashkadam007) · [GitHub](https://github.com/yashkadam007) · [yashk.net](https://yashk.net)

---

## Summary

Backend-leaning full-stack engineer with 3+ years of experience building multi-tenant SaaS products, REST APIs, asynchronous workflows, and cross-platform applications using Node.js, Go, Python, PostgreSQL, AWS, and React Native. Founding engineer who owned systems from architecture and data modeling through testing, deployment, and production operations.

---

## Experience

### Fullstack Developer · StratexCS Pty. Ltd

*Mar 2024 – Feb 2026 · Remote, Perth AU*

- Architected a multi-tenant NDIS operations platform on Node.js, PostgreSQL, and AWS supporting approximately 10 providers, 800+ users, and 10,000+ monthly shifts.
- Owned backend architecture and REST APIs across rostering, timesheets, billing, client records, documents, and RBAC, translating ambiguous requirements into pragmatic, maintainable production features through AI-assisted analysis, prototyping, testing, and iterative validation.
- Built asynchronous processing using BullMQ and cron-based schedulers for approvals, invoicing, document generation, notifications, and recurring rosters, reducing manual follow-ups while keeping long-running work outside user-facing requests.
- Owned the end-to-end development of "Carers Community" ([iOS](https://apps.apple.com/in/app/carers-community/id6743124831) · [Android](https://play.google.com/store/apps/details?id=com.stratexcs.carers_community_cc)) and "Carers Academy" ([iOS](https://apps.apple.com/in/app/carers-academy/id6754163361) · [Android](https://play.google.com/store/apps/details?id=com.stratexcs.carersacademymobileapp)), building cross-platform React Native products covering workforce operations and learning management, including a multi-tenant LMS backend using Go/Gin, PostgreSQL, and REST APIs.
- Built an outbound LiveKit voice AI system that automated 1,000+ monthly NDIS shift confirmation calls, using roster-aware prompts and LLM tool-calling for in-call shift assignment, reducing coordinator follow-ups by ~50% and saving ~12 hours per week.

### Software Engineer · Ratham

*Jul 2023 – Feb 2024 · Hyderabad, IN*

- Designed and implemented Go REST APIs for an enterprise transportation platform piloted across ~100 cabs, with unit and end-to-end tests covering core workflows.
- Built a cross-platform React Native and TypeScript application for Android and iOS, enabling field operators to manage transportation workflows during the proof of concept.
- Established a CI/CD pipeline that automated build and deployment workflows, improving release consistency throughout the pilot.

### Application Development Associate · Accenture

*Oct 2021 – Jun 2022 · Mumbai, IN*

- Investigated and resolved SQL production issues affecting Best Buy purchase transactions, coordinating validated database changes across engineering and operations teams in the US and India.

### Internship Trainee · Siemens

*Jun 2019 – Jul 2019 · Mumbai, IN*

- Interned in the Mobility Division R&D department, researching digitalization in Indian Railways.

---

## Education

**Savitribai Phule Pune University** · B.E. in Information Technology\
CGPA: 7.7 · 2017 – 2021

---

## Projects

### Document RAG · [doc-rag.yashk.net](https://doc-rag.yashk.net)

- Built a Retrieval-Augmented Generation (RAG) API with FastAPI and Python, enabling users to upload documents and ask natural language questions with context-grounded answers powered by Google Gemini.
- Designed a document ingestion pipeline that parses multiple file formats (PDF, HTML, Markdown, TXT), chunks text with configurable overlap, and generates embeddings via Google's embedding API.

### BitTorrent Client · [github.com/yashkadam007/bittorrent-client](https://github.com/yashkadam007/bittorrent-client)

- Designed and built a functional BitTorrent client from the protocol specification, implementing bencode parsing, HTTP/UDP tracker communication, and the peer wire protocol.
- Architected a concurrent download system using goroutines to manage 50+ peer connections with thread-safe piece state tracking, request pipelining, and graceful resource cleanup.
- Built an interactive terminal UI with real-time progress visualization, live statistics (speed, ETA, peer count), and piece-level completion mapping.

---

## Skills

**Languages:** Go, TypeScript, Python, SQL

**Frameworks:** Gin, Node.js, React Native, FastAPI, Express

**Data & Infrastructure:** PostgreSQL, Kafka, AWS (EC2, S3, RDS, ECS), Docker, CI/CD
