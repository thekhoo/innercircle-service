# syntax=docker/dockerfile:1
FROM node:25-slim AS build
WORKDIR /app
ENV HUSKY=0
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY tsconfig.json ./
COPY src ./src
RUN pnpm build
RUN pnpm prune --prod --ignore-scripts

FROM node:25-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json ./package.json
USER node
EXPOSE 3002
CMD ["node", "dist/server.js"]
