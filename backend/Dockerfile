# Build context is the repo root so the pnpm workspace lockfile is available.
FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /app

FROM base AS build
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY backend/package.json backend/
RUN pnpm install --frozen-lockfile --filter backend
COPY backend backend
RUN pnpm --filter backend build \
 && pnpm --filter backend deploy --prod --legacy /out

FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /out/package.json ./
COPY --from=build /out/node_modules ./node_modules
COPY --from=build /app/backend/dist ./dist
COPY backend/drizzle ./drizzle
USER node
EXPOSE 3000
# Apply migrations and the idempotent seed, then exec so node is PID 1 and receives SIGTERM.
CMD ["sh", "-c", "node dist/db/migrate.js && node dist/db/seed.js && exec node dist/index.js"]
