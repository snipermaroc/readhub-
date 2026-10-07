# ─────────────────────────────────────────────────────────────────────────────
# Stage 1 — Build the React frontend
# Force NODE_ENV=development so npm installs ALL deps including devDependencies
# (TypeScript, Vite, esbuild, tsx etc. are devDeps needed to compile the app)
# ─────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

# Override any build-arg NODE_ENV injected by Coolify — build always needs devDeps
ENV NODE_ENV=development

WORKDIR /app

COPY package.json package-lock.json* ./

# Install ALL deps (dev + prod + optional) — required for tsc + vite build
RUN npm install --include=optional

COPY . .

# Compile TypeScript + bundle React → dist/
RUN npm run build

# ─────────────────────────────────────────────────────────────────────────────
# Stage 2 — Lean production runtime
# ─────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS runtime

# Install wget for Coolify/Docker healthcheck
RUN apk add --no-cache wget

# Non-root user for security
RUN addgroup -S readhub && adduser -S readhub -G readhub

WORKDIR /app

COPY package.json package-lock.json* ./

# Install prod + optional deps (optional needed for esbuild linux binary used by tsx)
# NODE_ENV not set here so npm respects --include=optional properly
RUN npm install --omit=dev --include=optional --ignore-scripts

# Copy compiled frontend from builder
COPY --from=builder /app/dist ./dist

# Copy server source
COPY server.ts ./
COPY services/ ./services/
COPY tsconfig.json ./
COPY tsconfig.node.json* ./
COPY tsconfig.app.json* ./

# Create runtime directories and set ownership
RUN mkdir -p /app/data /app/uploads /app/generated-sites /app/logs \
    && chown -R readhub:readhub /app

VOLUME ["/app/data", "/app/uploads", "/app/generated-sites"]

USER readhub

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=25s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/health || exit 1

# Set production only at runtime — never at buildtime
ENV NODE_ENV=production

CMD ["npx", "tsx", "server.ts"]
