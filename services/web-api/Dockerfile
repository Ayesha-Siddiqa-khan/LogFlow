# Multi-stage lightweight Dockerfile for web-api
FROM node:20-alpine AS base

WORKDIR /app

COPY package.json ./
COPY src/ ./src/

ENV NODE_ENV=production
ENV PORT=3002
ENV SERVICE_NAME=web-api

USER node

EXPOSE 3002

HEALTHCHECK --interval=15s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3002/health || exit 1

CMD ["node", "src/index.js"]
