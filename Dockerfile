# ─────────────────────────────────────────────────────────────────────────────
# Stage 1 — Build the React frontend
# ─────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package manifests first for better layer caching
COPY package.json bun.lock* package-lock.json* ./

# Install ALL dependencies (dev + prod) needed to build the frontend
RUN npm install --frozen-lockfile 2>/dev/null || npm install

# Copy full source
COPY . .

# Build the Vite frontend → dist/
RUN npm run build

# ─────────────────────────────────────────────────────────────────────────────
# Stage 2 — Production runtime (lean image, no dev deps, no source code)
# ─────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS runtime

# Security: run as non-root user
RUN addgroup -S readhub && adduser -S readhub -G readhub

WORKDIR /app

# Copy package manifests
COPY package.json ./

# Install ONLY production dependencies
RUN npm install --omit=dev --ignore-scripts 2>/dev/null || npm install --production --ignore-scripts

# Copy compiled frontend from builder stage
COPY --from=builder /app/dist ./dist

# Copy server source (TypeScript executed directly via tsx — no separate compile step needed)
COPY server.ts ./
COPY services/ ./services/
COPY tsconfig.json ./
COPY tsconfig.node.json* ./
COPY tsconfig.app.json* ./

# Create persistent volume directories with correct ownership
# /app/data        → postgres_store.json fallback persistence
# /app/uploads     → user-uploaded images / chapter files
# /app/generated-sites → static HTML site output
RUN mkdir -p /app/data /app/uploads /app/generated-sites /app/logs \
    && chown -R readhub:readhub /app

# CapRover / Docker volumes: mount these for persistence across deploys
VOLUME ["/app/data", "/app/uploads", "/app/generated-sites"]

# Switch to non-root user
USER readhub

# Expose the application port (must match PORT env var — default 3000)
EXPOSE 3000

# Health-check so CapRover knows the container is ready
HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/health || exit 1

# Start the Express + Vite-static server in production mode
ENV NODE_ENV=production
CMD ["npx", "tsx", "server.ts"]
