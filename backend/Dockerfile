FROM node:20-alpine

RUN apk add --no-cache wget

WORKDIR /workspace

COPY shared/ ./shared/

WORKDIR /workspace/backend

# Copy backend files
COPY backend/package*.json ./
COPY backend/ .

# Install dependencies - npm will create symlink from node_modules/@student-identity-platform/shared -> ../../shared
RUN npm ci --only=production

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /workspace

USER nodejs

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:4000/health || exit 1

# Wait for contracts to be deployed, then start server
CMD ["sh", "-c", "node server.js"]

