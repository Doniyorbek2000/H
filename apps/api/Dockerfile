# Smart Murojaat AI — Backend API (NestJS)
FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /app

FROM base AS build
COPY pnpm-workspace.yaml package.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
RUN pnpm install --frozen-lockfile=false
COPY packages/shared packages/shared
COPY apps/api apps/api
RUN pnpm --filter @smart/shared build \
  && cd apps/api && npx prisma generate \
  && cd /app && pnpm --filter @smart/api build

FROM base AS runtime
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages ./packages
COPY --from=build /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/api/prisma ./apps/api/prisma
COPY --from=build /app/apps/api/package.json ./apps/api/
WORKDIR /app/apps/api
EXPOSE 3001
# Migratsiya + seed + start
CMD npx prisma migrate deploy && npx ts-node prisma/seed.ts || true && node dist/main.js
