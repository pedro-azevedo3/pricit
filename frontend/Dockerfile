FROM node:22-alpine AS build
WORKDIR /usr/src/pricit
COPY package*.json ./
RUN npm ci
COPY . .
ENV API_URL=http://backend:8000 NEXT_TELEMETRY_DISABLED=1
RUN npm run build
FROM node:22-alpine
WORKDIR /usr/src/pricit
ENV NODE_ENV=production HOSTNAME=0.0.0.0 PORT=3000 NEXT_TELEMETRY_DISABLED=1
COPY --from=build /usr/src/pricit/.next/standalone ./
COPY --from=build /usr/src/pricit/.next/static ./.next/static
COPY --from=build /usr/src/pricit/public ./public
COPY --from=build /usr/src/pricit/scripts/encrypted-run.mjs ./scripts/encrypted-run.mjs
USER node
EXPOSE 3000
CMD ["node", "scripts/encrypted-run.mjs", "node", "server.js"]
