# Next.js frontend (portal + /panel). NEXT_PUBLIC_* values are inlined at build
# time, so pass them as build args; server-only values (NEAT_API_ORIGIN,
# NEAT_JWT_SECRET) are read at runtime.
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY vendor ./vendor
RUN npm ci
COPY . .
ARG NEXT_PUBLIC_FILES_ORIGIN
ARG NEXT_PUBLIC_API_DISPLAY_BASE
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run check:no-ts && npm run build && npm prune --omit=dev

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1
COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
USER node
EXPOSE 3000
CMD ["node", "node_modules/next/dist/bin/next", "start", "-p", "3000"]
