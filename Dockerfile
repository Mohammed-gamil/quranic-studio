# ─────────────────────────────────────────────
# Stage 1 — Builder
# ─────────────────────────────────────────────
FROM node:22-bookworm-slim AS builder

WORKDIR /app

# Copy package files first for better layer caching
COPY package.json package-lock.json ./

# Install ALL deps (including devDeps needed for build)
RUN npm ci

# Copy source code
COPY . .

# Build: Vite frontend + esbuild server bundle
RUN npm run build

# ─────────────────────────────────────────────
# Stage 2 — Production runner
# ─────────────────────────────────────────────
FROM node:22-bookworm-slim AS runner

# Install ffmpeg (required by ffmpegEngine) + font support + lsof
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    fontconfig \
    fonts-noto \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy only production node_modules
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copy compiled artifacts from builder
COPY --from=builder /app/dist ./dist

# Copy runtime assets (fonts only — media dirs are created at runtime via volumes)
COPY data/fonts ./data/fonts

# Ensure runtime directories exist (volumes will overlay these)
RUN mkdir -p \
    data/media/audio \
    data/media/backgrounds \
    data/media/uploads \
    data/media/ambient \
    output

# Environment defaults (override via docker-compose or --env-file)
ENV NODE_ENV=production \
    PORT=3000

EXPOSE 3000

# Health check — hits the /api/health endpoint
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', r => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

CMD ["node", "dist/server.cjs"]
