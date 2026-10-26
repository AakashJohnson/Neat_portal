# Express API. Mount /app/storage for persistent uploads and admin settings.
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY src ./src
COPY scripts ./scripts
COPY assets ./assets
RUN node scripts/check-no-ts.js src scripts && node scripts/check-no-ddl.js src scripts
RUN mkdir -p storage/public && chown -R node:node storage
VOLUME ["/app/storage"]
USER node
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD wget -qO- http://127.0.0.1:4000/health/live || exit 1
CMD ["node", "src/server.js"]
