# Core service JamHijau
# node:22-bookworm-slim tersedia untuk arm64 dan arm32v7 (STB) serta amd64 (laptop).
FROM node:22-bookworm-slim

ENV NODE_ENV=production
WORKDIR /app

# Dependensi dulu supaya layer ini di-cache saat hanya kode yang berubah.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund && npm cache clean --force

COPY src ./src

# Folder database. Pakai named volume di compose agar kepemilikan folder ikut image.
RUN mkdir -p /data && chown node:node /data
USER node

ENV PORT=3000 \
    CORE_DB_PATH=/data/core.db \
    # Batasi heap V8 di bawah mem_limit 256m agar tidak dibunuh OOM killer.
    NODE_OPTIONS=--max-old-space-size=160

EXPOSE 3000

# Image slim tidak punya curl/wget, jadi healthcheck memakai fetch bawaan Node.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:3000/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]

CMD ["node", "--disable-warning=ExperimentalWarning", "src/server.js"]
