# ─────────────────────────────────────────────────────────────────────────────
# Single-stage build — simpler and more reliable than multi-stage for this app.
# Coolify injects NODE_ENV=production as a build arg, but we override it with
# ENV to ensure ALL deps (including devDeps) are installed for the build step,
# then we reset to production before runtime.
# ─────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine

# Install wget (for Coolify healthcheck) and dumb-init (proper PID 1 handling)
RUN apk add --no-cache wget dumb-init

# Non-root user
RUN addgroup -S readhub && adduser -S readhub -G readhub

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Force development during install so ALL deps (dev + optional) are installed.
# This ensures esbuild, vite, typescript, tsx etc. are all present.
RUN NODE_ENV=development npm install --include=optional

# Copy full source
COPY . .

# Build 1: Compile React frontend → dist/
RUN NODE_ENV=development npm run build

# Build 2: Bundle server.ts → server.mjs using esbuild
# --packages=external keeps node_modules as external requires (they're already installed)
RUN NODE_ENV=development npx esbuild server.ts \
      --bundle \
      --platform=node \
      --format=esm \
      --outfile=server.mjs \
      --packages=external

# Create runtime directories and set ownership
RUN mkdir -p /app/data /app/uploads /app/generated-sites /app/logs \
    && chown -R readhub:readhub /app

VOLUME ["/app/data", "/app/uploads", "/app/generated-sites"]

USER readhub

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/health || exit 1

# Set production at runtime only
ENV NODE_ENV=production

# dumb-init ensures signals are forwarded correctly (graceful shutdown)
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.mjs"]
