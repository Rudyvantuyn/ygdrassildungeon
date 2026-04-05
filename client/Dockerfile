FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json ./
COPY shared/package*.json ./shared/
COPY client/package*.json ./client/
RUN npm install

FROM deps AS build
WORKDIR /app
COPY . .
RUN npm run build -w shared && npm run build -w client

FROM nginx:1.29-alpine AS runtime
COPY --from=build /app/client/dist /usr/share/nginx/html
EXPOSE 80
