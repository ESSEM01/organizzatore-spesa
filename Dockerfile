# Immagine unica per Render (D20): l'API AdonisJS serve anche la PWA compilata, sullo stesso indirizzo.
# Il database è Turso; il controllo settimanale dei volantini gira su GitHub Actions, non qui.

FROM node:24-bookworm-slim AS build
WORKDIR /app

# Prima solo i manifest, così l'installazione resta in cache finché non cambiano le dipendenze.
COPY package.json package-lock.json ./
COPY packages/domain/package.json packages/domain/
COPY apps/web/package.json apps/web/
COPY apps/api/package.json apps/api/
RUN npm ci

COPY . .
RUN npm run build -w @spesa/domain \
 && npm run build -w @spesa/web \
 && npm run build -w @spesa/api \
 && cp -r apps/web/dist apps/api/build/public \
 && npm prune --omit=dev

FROM node:24-bookworm-slim
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=10000
WORKDIR /app

COPY --from=build /app/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages/domain/package.json ./packages/domain/package.json
COPY --from=build /app/packages/domain/dist ./packages/domain/dist
COPY --from=build /app/apps/api/package.json ./apps/api/package.json
COPY --from=build /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=build /app/apps/api/build ./apps/api/build

WORKDIR /app/apps/api/build
USER node
EXPOSE 10000

# Le migrazioni si applicano a ogni avvio: se sono già fatte non cambia nulla.
CMD ["sh", "-c", "node ace migration:run --force && node bin/server.js"]
