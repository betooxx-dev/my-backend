# syntax=docker/dockerfile:1.7

FROM node:22-alpine AS base

ENV NPM_CONFIG_AUDIT=false \
    NPM_CONFIG_FUND=false

WORKDIR /app

FROM base AS dependencies

COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --ignore-scripts

FROM dependencies AS development

COPY . .
EXPOSE 5000
CMD ["npm", "run", "start:dev"]

FROM dependencies AS builder

COPY . .
RUN npm run build \
    && npm prune --omit=dev --ignore-scripts

FROM node:22-alpine AS production

WORKDIR /app
ENV NODE_ENV=production

RUN apk add --no-cache dumb-init

COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/dist ./dist
COPY --from=builder --chown=node:node /app/package.json ./package.json

USER node
EXPOSE 5000

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/src/main.js"]
