# READHUB — Coolify Deployment Guide

## Why PostgreSQL and not Redis?

This app stores **relational data** — manga, chapters, images, invoices, users — across linked tables.
PostgreSQL handles all of that natively with full SQL support.
Redis is a cache/message broker; it is not a replacement for a relational database and would require
rewriting the entire data layer.

**Use PostgreSQL. Redis is not needed.**

---

## What you need

| Item | Details |
|---|---|
| Coolify instance | Self-hosted (VPS/bare metal) or Coolify Cloud |
| PostgreSQL database | Coolify one-click DB **or** any external PG host (see options below) |
| The deployment archive | `readhub-coolify-deploy.tar.gz` (in the project root) |

---

## Step 1 — Provision a PostgreSQL database

You have several options. Pick the one that matches your setup.

### Option A — PostgreSQL inside Coolify (recommended for beginners)

1. In Coolify, go to **Databases → New Database → PostgreSQL**.
2. Set:
   - **Name:** `readhub-db`
   - **Database name:** `readhub`
   - **User:** `readhub_user`
   - **Password:** choose a strong password, save it
3. Click **Create**.
4. Once running, copy the **Internal connection URL** shown on the database page.
   It looks like:  
   `postgresql://readhub_user:YOUR_PASS@readhub-db:5432/readhub`

> **Note:** When your app and database are in the **same Coolify network**, use the internal URL
> (hostname = container name, e.g. `readhub-db`). No SSL needed for internal connections.

---

### Option B — Supabase (free managed PostgreSQL)

1. Create a free project at [https://supabase.com](https://supabase.com).
2. Go to **Project Settings → Database → Connection String → URI**.
3. Copy the **Transaction pooler** URI (port 6543) — works best with serverless/container apps.
   Example: `postgresql://postgres.xxxx:password@aws-0-eu-west-3.pooler.supabase.com:6543/postgres`
4. Add `?sslmode=require` at the end if not already present.

---

### Option C — Neon (free serverless PostgreSQL)

1. Sign up at [https://neon.tech](https://neon.tech).
2. Create a project and copy the **connection string** from the dashboard.
   Example: `postgresql://user:pass@ep-xxx.eu-central-1.aws.neon.tech/neondb?sslmode=require`

---

### Option D — Railway / Render / Aiven

All provide a PostgreSQL connection string on their dashboard. Copy it and use it as `DATABASE_URL`.

---

## Step 2 — Push the code to a Git repository

Coolify deploys from **Git only** — there is no "Upload archive" option.
You need to push this project to GitHub, GitLab, Gitea, or any Git host.

### 2a — Push to GitHub (most common)

```bash
# Inside the project folder on your machine:
git init
git add .
git commit -m "initial deploy"

# Create a new repo on github.com, then:
git remote add origin https://github.com/YOUR_USERNAME/readhub.git
git branch -M main
git push -u origin main
```

A **private** repository is fine and recommended.

> Already have a repo? Just `git add . && git commit -m "security fixes" && git push`.

---

## Step 3 — Create the READHUB application in Coolify

### Option A — Public GitHub/GitLab repository

1. In Coolify → open your **Project** → click **+ New**.
2. Select **Public Repository**.
3. Paste your repository HTTPS URL (e.g. `https://github.com/you/readhub`).
4. Click **Check Repository**.
5. In the **Build Pack** dropdown → choose **Dockerfile**.
6. Leave **Base Directory** as `/` and **Dockerfile Location** as `Dockerfile`.
7. Set **Ports Exposes** to `3000`.
8. Click **Continue**.

### Option B — Private GitHub repository (via GitHub App — recommended)

1. In Coolify → **Settings → Source Code Providers → GitHub → New GitHub App**.
2. Follow the on-screen wizard — it opens GitHub, you authorize Coolify, select repositories.
3. Go back to your **Project** → **+ New** → **Private Repository (GitHub App)**.
4. Choose your server, select the `readhub` repository → **Load Repository**.
5. Choose branch `main`, **Build Pack → Dockerfile**, Port `3000`.
6. Click **Continue**.

### Option C — Any private Git server (GitLab, Gitea, self-hosted)

1. Coolify → **Settings → Source Code Providers → GitLab / Gitea / Other**.
2. Add the connection, then **Project → + New → Private Repository (Deploy Key)**.
3. Coolify shows you an SSH public key — add it as a Deploy Key in your Git repo settings.
4. Paste the SSH clone URL, select branch, **Build Pack → Dockerfile**, Port `3000`.
5. Click **Continue**.

---

## Step 4 — Set Environment Variables

In Coolify → your app → **Environment Variables**, add the following.

### Required variables (app will not start without these)

| Variable | Value | Notes |
|---|---|---|
| `NODE_ENV` | `production` | Enables security headers, Secure cookies, etc. |
| `ADMIN_PASSWORD` | `YourStrongPassword123!` | **Change this.** Min 12 chars. First boot creates `admin@readhub.com` with this password. |
| `DATABASE_URL` | `postgresql://user:pass@host:5432/readhub` | Your connection string from Step 1. |

### Recommended variables

| Variable | Value | Notes |
|---|---|---|
| `APP_URL` | `https://readhub.yourdomain.com` | Your public domain — used for CORS and cookie policy. |
| `PORT` | `3000` | Must match the port you set in Coolify. |

### Optional variables

| Variable | Value | Notes |
|---|---|---|
| `ALLOWED_ORIGINS` | `https://sub.yourdomain.com` | Extra origins allowed to call the API (comma-separated). |
| `PGSSL` | `true` | Set to `true` if your PostgreSQL requires SSL (Neon, Supabase, Aiven). |
| `PROXY_ALLOWED_HOSTS` | `cdn.yourmangasite.com` | Extra CDN hostnames the image proxy can fetch from. |

> **Tip:** Do not add a `.env` file to the repository. Set all secrets in Coolify's UI — they are
> injected at runtime and never stored in your image.

---

## Step 5 — Configure Persistent Storage (Volumes)

The app writes three kinds of data to disk:

| Container path | What it stores | Must persist? |
|---|---|---|
| `/app/data` | `postgres_store.json` in-memory fallback, blocked IPs | Yes |
| `/app/uploads` | Uploaded cover images, chapter files | Yes |
| `/app/generated-sites` | Generated static HTML manga sites | Yes |

In Coolify → your app → **Storages**, add three volumes:

| Host path (Coolify creates this) | Container path |
|---|---|
| `/data/coolify/readhub/data` | `/app/data` |
| `/data/coolify/readhub/uploads` | `/app/uploads` |
| `/data/coolify/readhub/generated-sites` | `/app/generated-sites` |

> Without these volumes, uploaded files and generated sites are lost every time the container restarts.

---

## Step 6 — Domain & HTTPS

1. In Coolify → your app → **Domains**, add your domain:  
   `readhub.yourdomain.com`
2. Enable **Force HTTPS** — Coolify provisions a Let's Encrypt certificate automatically.
3. Make sure the `APP_URL` environment variable matches this domain exactly (with `https://`).

---

## Step 7 — Deploy

Click **Deploy** in Coolify. The build process:

1. Docker pulls `node:20-alpine`
2. Runs `npm install` to install all dependencies
3. Runs `npm run build` to compile the React frontend into `dist/`
4. Creates a lean production image
5. Starts the server with `npx tsx server.ts`

Watch the **Deployment Logs** tab. A successful deployment ends with:

```
🚀 READHUB Server running on http://0.0.0.0:3000
```

The health check endpoint `/api/health` confirms database connectivity:

```json
{ "connected": true, "mode": "postgresql", "database": "readhub" }
```

---

## Step 7 — First Login

Once deployed, open your app URL and go to `/login`.

- **Email:** `admin@readhub.com`
- **Password:** the value you set as `ADMIN_PASSWORD`

You will land on the admin dashboard at `/admin`.

> **Immediately change your admin email** in the admin settings after first login.

---

## Step 8 — Database schema

The app **auto-creates all tables** on first boot via the `checkAndInitDB()` function.
You do not need to run any migrations manually.

Tables created automatically:

- `profiles` — admin profiles  
- `users` — admin accounts with hashed passwords  
- `manga_sites` — your manga edition sites  
- `manga` — manga series  
- `chapters` — chapters per manga  
- `chapter_images` — individual page images  
- `site_settings` — homepage, portal, legal page config  
- `analytics_events` — anonymized traffic logs  
- `import_jobs` — background import job tracking  
- `activity_logs` — admin action history  
- `projects` — site wizard projects  
- `invoices` — billing records  
- `blocked_ips` — firewall IP block list  
- `sessions` — server-side auth sessions  

---

## Troubleshooting

### App crashes immediately on startup

Check Coolify deployment logs. The most common cause:

```
CRITICAL SECURITY ERROR: ADMIN_PASSWORD environment variable is missing
```

→ Add `ADMIN_PASSWORD` to environment variables and redeploy.

---

### Database connection refused

```
connected: false, mode: "in-memory-fallback"
```

→ Check `DATABASE_URL` is correct. For Coolify internal DB, make sure both the app and the database
are in the **same Coolify network**. Use the internal hostname (e.g. `readhub-db`), not the public IP.

---

### SSL error connecting to PostgreSQL

```
error: SSL is not enabled on the server
```

→ Remove `?sslmode=require` from `DATABASE_URL`, or set `PGSSL=false`.

```
error: self-signed certificate
```

→ Add `?sslmode=no-verify` or set `PGSSL=true` in environment variables (the app uses
`rejectUnauthorized: false` for self-signed certs).

---

### Uploads or generated sites disappear after redeploy

→ You did not configure persistent volumes in Step 4. Add them and redeploy.

---

### CORS error in browser

```
Access to fetch blocked by CORS policy
```

→ Make sure `APP_URL` matches your exact domain including protocol (`https://`).
→ If you have manga subdomains, add them to `ALLOWED_ORIGINS`.

---

## Full environment variables reference

```env
# Required
NODE_ENV=production
ADMIN_PASSWORD=YourStrongPassword123!
DATABASE_URL=postgresql://readhub_user:pass@readhub-db:5432/readhub

# Recommended
APP_URL=https://readhub.yourdomain.com
PORT=3000
HOST=0.0.0.0

# Optional
ALLOWED_ORIGINS=https://manga1.yourdomain.com,https://manga2.yourdomain.com
PGSSL=false
PROXY_ALLOWED_HOSTS=cdn.yourmangacdn.com
GOOGLE_APPLICATION_CREDENTIALS=/run/secrets/gcp-credentials.json
```

---

## Architecture summary

```
┌─────────────────────────────────────┐
│          Coolify (your VPS)         │
│                                     │
│  ┌──────────────────────────────┐   │
│  │   READHUB container          │   │
│  │   node:20-alpine             │   │
│  │   tsx server.ts              │   │
│  │   PORT 3000                  │   │
│  │                              │   │
│  │   /app/dist   (React SPA)    │   │
│  │   /app/data   (volume)       │   │
│  │   /app/uploads (volume)      │   │
│  │   /app/generated-sites (vol) │   │
│  └──────────────────────────────┘   │
│                │                    │
│  ┌─────────────▼──────────────┐     │
│  │   PostgreSQL container      │     │
│  │   (or external PG host)     │     │
│  └────────────────────────────┘     │
│                                     │
│  Coolify reverse proxy (Traefik)    │
│  → HTTPS + Let's Encrypt            │
└─────────────────────────────────────┘
```

The React frontend is served as static files from `dist/` by the Express server in production mode.
There is no separate Nginx or frontend container needed.
