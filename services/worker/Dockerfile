# Multi-stage lightweight Dockerfile for worker
FROM node:20-alpine AS base

WORKDIR /app

COPY package.json ./
COPY src/ ./src/

ENV NODE_ENV=production
ENV PORT=3003
ENV SERVICE_NAME=worker
ENV WORK_INTERVAL_MS=5000

USER node

EXPOSE 3003

HEALTHCHECK --interval=15s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3003/health || exit 1

CMD ["node", "src/index.js"]
