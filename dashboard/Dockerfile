# Multi-stage lightweight Dockerfile for LogFlow Dashboard
FROM node:20-alpine AS base

WORKDIR /app

COPY package.json ./
COPY src/ ./src/

ENV NODE_ENV=production
ENV PORT=3000
ENV PAYMENTS_API_URL=http://payments-api:3001
ENV WEB_API_URL=http://web-api:3002
ENV WORKER_URL=http://worker:3003

USER node

EXPOSE 3000

HEALTHCHECK --interval=15s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3000/health || exit 1

CMD ["node", "src/server.js"]
