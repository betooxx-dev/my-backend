FROM node:22-bookworm-slim AS dependencies

WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM dependencies AS development

COPY . .
EXPOSE 5000
CMD ["npm", "run", "start"]

FROM dependencies AS builder

COPY . .
RUN npm run build && npm prune --omit=dev

FROM node:22-bookworm-slim AS production

ENV NODE_ENV=production
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json
EXPOSE 5000
CMD ["node", "dist/src/main.js"]
