# apps/api/Dockerfile (Definitive Final Version)

# --- Stage 1: Build Environment ---
FROM node:20-slim AS builder
WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/
RUN npm install

COPY . .

RUN npx prisma generate --schema=./apps/api/prisma/schema.prisma
RUN npm run build --workspace=api

# --- Stage 2: Production Environment ---
FROM node:20-slim AS runner
WORKDIR /app

# --- THE FIX IS HERE ---
# Install OpenSSL AND the trusted root certificates.
RUN apt-get update && apt-get install -y openssl ca-certificates

COPY --from=builder /app/package.json /app/package-lock.json ./
COPY --from=builder /app/apps/api/package.json ./apps/api/

RUN npm install --omit=dev

COPY --from=builder /app/apps/api/prisma/schema.prisma ./apps/api/prisma/
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

COPY --from=builder /app/apps/api/dist ./dist

EXPOSE 8080

CMD ["node", "dist/src/main.js"]