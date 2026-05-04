# ===== Build Stage =====
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run prisma:generate
RUN npm run build

# ===== Production Stage =====
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy built application + Prisma artifacts
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src/configs ./src/configs
COPY --from=builder /app/src/database ./src/database
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

EXPOSE 3003

HEALTHCHECK --interval=30s --timeout=10s --retries=3 --start-period=15s \
    CMD wget -qO- http://localhost:3003/health || exit 1

CMD ["node", "dist/main"]