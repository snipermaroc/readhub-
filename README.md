# READHUB — Manga Portal Platform

A full-stack manga publishing platform with a React frontend, Express backend, PostgreSQL database, static site generator, and admin dashboard.

## Quick Start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

Admin panel: [http://localhost:3000/hub](http://localhost:3000/hub)

## Deploy

See [COOLIFY_DEPLOY.md](./COOLIFY_DEPLOY.md) for full deployment instructions.

## Tech Stack

- **Frontend:** React 18, Vite, TypeScript, Tailwind CSS
- **Backend:** Express 4, Node.js, tsx
- **Database:** PostgreSQL (with in-memory fallback)
- **Auth:** scrypt password hashing, HttpOnly session cookies
- **Security:** helmet, rate limiting, CORS allowlist, sanitize-html, DOMPurify

<!-- sync test: 2026-10-07 -->
