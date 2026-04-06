FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
COPY apps/web/package.json apps/web/package.json
COPY packages/core/package.json packages/core/package.json
COPY packages/service/package.json packages/service/package.json
COPY packages/worker/package.json packages/worker/package.json
RUN npm install

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/apps/web ./apps/web
COPY --from=builder /app/apps/web/public ./apps/web/public
COPY --from=builder /app/packages/core ./packages/core
COPY --from=builder /app/packages/service ./packages/service
EXPOSE 3000
CMD ["npm", "run", "start", "--workspace", "@assurance/web"]
