# Stage 1: Builder
FROM node:20-slim AS builder

WORKDIR /app

# Install dependencies (including devDependencies for build)
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Stage 2: Runner
FROM node:20-slim AS runner

WORKDIR /app

ENV NODE_ENV=production

# Copy package.json for production install
COPY package*.json ./

# Install only production dependencies
RUN npm ci --omit=dev

# Copy built artifacts from builder
COPY --from=builder /app/dist ./dist

# Copy .env if available (Secrets should ideally be injected via Cloud Run)
# COPY .env .env

EXPOSE 8080

CMD ["node", "dist/index.js"]
