# Multi-stage lightweight Dockerfile for payments-api
FROM node:20-alpine AS base

WORKDIR /app

# Copy package manifests
COPY package.json ./

# Copy application source
COPY src/ ./src/

ENV NODE_ENV=production
ENV PORT=3001
ENV SERVICE_NAME=payments-api

# Run as non-root user for security
USER node

EXPOSE 3001

HEALTHCHECK --interval=15s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3001/health || exit 1

CMD ["node", "src/index.js"]
