# Smart Murojaat AI — Telegram bot (grammY)
FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /app

FROM base AS build
COPY pnpm-workspace.yaml package.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/bot/package.json apps/bot/
RUN pnpm install --frozen-lockfile=false
COPY packages/shared packages/shared
COPY apps/bot apps/bot
RUN pnpm --filter @smart/shared build && pnpm --filter @smart/bot build

FROM base AS runtime
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages ./packages
COPY --from=build /app/apps/bot/node_modules ./apps/bot/node_modules
COPY --from=build /app/apps/bot/dist ./apps/bot/dist
COPY --from=build /app/apps/bot/package.json ./apps/bot/
WORKDIR /app/apps/bot
CMD ["node", "dist/index.js"]
