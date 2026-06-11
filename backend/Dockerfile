# Build context は リポジトリルート (shared パッケージを含めるため)
FROM node:20-slim AS build
WORKDIR /repo
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
COPY package.json ./
COPY shared/package.json shared/
COPY backend/package.json backend/
RUN npm install --workspaces --include-workspace-root
COPY shared shared
COPY backend backend
RUN npm run build -w shared \
    && npx prisma generate --schema backend/prisma/schema.prisma \
    && npm run build -w backend

FROM node:20-slim
WORKDIR /repo
ENV NODE_ENV=production
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
COPY --from=build /repo/node_modules node_modules
COPY --from=build /repo/shared shared
COPY --from=build /repo/backend backend
COPY --from=build /repo/package.json ./
EXPOSE 8000
WORKDIR /repo/backend
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/seed.js && node dist/main.js"]
