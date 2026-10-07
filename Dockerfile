# ─────────────────────────────────────────────────────────────────────────────
# Stage 1 — Build everything: frontend (Vite) + server (esbuild bundle)
# NODE_ENV=development so ALL deps (dev + optional) install correctly
# ─────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

ENV NODE_ENV=development

WORKDIR /app

COPY package.json package-lock.json* ./

RUN npm install --include=optional

COPY . .

# 1a. Build the React frontend → dist/
RUN npm run build

# 1b. Bundle server.ts into a single plain-JS file using esbuild
#     --bundle: inline all imports from services/ into one file
#     --platform=node: target Node.js (not browser)
#     --format=esm: keep ESM since package.json has "type":"module"
#     --external: keep these as dynamic require() — they are native/binary modules
RUN npx esbuild server.ts \
      --bundle \
      --platform=node \
      --format=esm \
      --outfile=server.mjs \
      --external:pg \
      --external:bcrypt \
      --external:fsevents \
      --external:sharp \
      --external:@swc/core \
      --external:esbuild \
      --packages=external

# ─────────────────────────────────────────────────────────────────────────────
# Stage 2 — Lean production runtime (plain node, no tsx, no esbuild needed)
# ─────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS runtime

# wget for Coolify healthcheck
RUN apk add --no-cache wget

# Non-root user
RUN addgroup -S readhub && adduser -S readhub -G readhub

WORKDIR /app

COPY package.json package-lock.json* ./

# Install only prod deps needed at runtime (pg, express, cheerio, etc.)
# NODE_ENV=production here is fine — we don't need tsx/esbuild/vite anymore
RUN npm install --omit=dev

# Copy compiled server bundle
COPY --from=builder /app/server.mjs ./server.mjs

# Copy frontend
COPY --from=builder /app/dist ./dist

# Copy services source (needed by server bundle for dynamic requires if any)
COPY services/ ./services/

# Runtime directories
RUN mkdir -p /app/data /app/uploads /app/generated-sites /app/logs \
    && chown -R readhub:readhub /app

VOLUME ["/app/data", "/app/uploads", "/app/generated-sites"]

USER readhub

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=25s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/health || exit 1

ENV NODE_ENV=production

# Run plain compiled JS — no tsx, no esbuild at runtime
CMD ["node", "server.mjs"]
