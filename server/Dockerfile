FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json ./
COPY shared/package*.json ./shared/
COPY server/package*.json ./server/
RUN npm install

FROM deps AS build
WORKDIR /app
COPY . .
RUN npm run build -w shared && npm run build -w server

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/package*.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/shared/package.json ./shared/package.json
COPY --from=build /app/shared/dist ./shared/dist
COPY --from=build /app/server/package.json ./server/package.json
COPY --from=build /app/server/dist ./server/dist
EXPOSE 3000
CMD ["node", "server/dist/index.js"]
