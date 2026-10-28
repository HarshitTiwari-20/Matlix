FROM oven/bun:1.3.14
WORKDIR /app
ENV NODE_ENV=production

COPY package.json bun.lock turbo.json ./
COPY packages/typescript-config/package.json packages/typescript-config/package.json
COPY packages/eslint-config/package.json packages/eslint-config/package.json
COPY packages/common/package.json packages/common/package.json
COPY packages/db/package.json packages/db/package.json
COPY packages/ui/package.json packages/ui/package.json
COPY apps/frontend/package.json apps/frontend/package.json
COPY apps/http-backend/package.json apps/http-backend/package.json
COPY apps/ws-backend/package.json apps/ws-backend/package.json
RUN bun install --frozen-lockfile --ignore-scripts

COPY packages/typescript-config packages/typescript-config
COPY packages/eslint-config packages/eslint-config
COPY packages/common packages/common
COPY packages/db packages/db
COPY apps/http-backend apps/http-backend
RUN bun run --cwd packages/db generate

USER bun
EXPOSE 3001
CMD ["bun", "apps/http-backend/index.ts"]
