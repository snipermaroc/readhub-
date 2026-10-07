# ─────────────────────────────────────────────────────────────────────────────
# Stage 1 — Build the React frontend
# ─────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json* ./

# Install ALL deps (including dev + optionalDeps so esbuild linux binary is present)
RUN npm install --include=optional

COPY . .

# Build the Vite frontend → dist/
RUN npm run build

# ─────────────────────────────────────────────────────────────────────────────
# Stage 2 — Production runtime
# ─────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS runtime

# Install wget for the Coolify/Docker healthcheck
RUN apk add --no-cache wget

# Security: run as non-root user
RUN addgroup -S readhub && adduser -S readhub -G readhub

WORKDIR /app

COPY package.json package-lock.json* ./

# Install ALL deps including optional (esbuild linux binary required by tsx at runtime)
RUN npm install --include=optional --ignore-scripts

# Copy built frontend from builder
COPY --from=builder /app/dist ./dist

# Copy server source files
COPY server.ts ./
COPY services/ ./services/
COPY tsconfig.json ./
COPY tsconfig.node.json* ./
COPY tsconfig.app.json* ./

# Create persistent volume directories
RUN mkdir -p /app/data /app/uploads /app/generated-sites /app/logs \
    && chown -R readhub:readhub /app

VOLUME ["/app/data", "/app/uploads", "/app/generated-sites"]

USER readhub

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=25s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/health || exit 1

ENV NODE_ENV=production

CMD ["npx", "tsx", "server.ts"]
