# Build context は リポジトリルート (shared パッケージを含めるため)
FROM node:20-slim AS build
WORKDIR /repo
ARG NEXT_PUBLIC_API_URL=http://localhost:8000
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
COPY package.json ./
COPY shared/package.json shared/
COPY frontend/package.json frontend/
RUN npm install --workspaces --include-workspace-root
COPY shared shared
COPY frontend frontend
RUN npm run build -w shared && npm run build -w frontend

FROM node:20-slim
WORKDIR /repo
ENV NODE_ENV=production
COPY --from=build /repo/node_modules node_modules
COPY --from=build /repo/shared shared
COPY --from=build /repo/frontend frontend
COPY --from=build /repo/package.json ./
EXPOSE 3000
WORKDIR /repo/frontend
CMD ["npx", "next", "start", "-H", "0.0.0.0"]
