# ---- deps: install once, cached across builds unless package.json changes ----
# (No --omit here — this stage needs the full dependency tree, including devDependencies
# like @nestjs/cli and typescript, to actually run the build below.)
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install

# ---- build: compile TypeScript + generate the Prisma client ----
FROM node:20-alpine AS build
WORKDIR /app
# node:20-alpine ships no OpenSSL at all, so `prisma generate` can't detect a libssl version
# and silently defaults its binary-target guess to "openssl-1.1.x" — installing openssl here
# lets it correctly detect Alpine's actual OpenSSL 3.x and generate the matching engine binary.
RUN apk add --no-cache openssl
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

# ---- production runtime: slim image, prod deps only ----
# prisma / ts-node / typescript / @types/node are deliberately kept in "dependencies" (not
# devDependencies) in package.json specifically so `npm install --omit=dev` below still
# includes them — `docker compose exec backend npx prisma migrate deploy` and
# `npm run prisma:seed` (ts-node) need to work against this exact image, in every environment,
# not just a separate dev build.
FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
# Same reason as the build stage: the actual query engine .so file loaded at runtime
# (libquery_engine-linux-musl.so.node) dynamically links against libssl — without this,
# it fails with "Error loading shared library libssl.so.1.1: No such file or directory"
# even though the engine binary itself was copied in correctly.
RUN apk add --no-cache openssl
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY package.json package-lock.json* ./
RUN npm install --omit=dev
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma

# `prisma migrate dev` (first-run, before any migration exists) needs to write new migration
# folders under ./prisma, and the seed script only needs read access — appuser must own these
# rather than run everything as root.
RUN chown -R appuser:appgroup /app

USER appuser
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/v1/docs', r => process.exit(r.statusCode < 500 ? 0 : 1)).on('error', () => process.exit(1))"

CMD ["node", "dist/main.js"]
