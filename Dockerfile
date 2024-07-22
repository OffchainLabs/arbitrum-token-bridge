# syntax=docker/dockerfile:1
FROM synthetixio/docker-e2e:18.16-ubuntu as base

RUN mkdir /app
WORKDIR /app

RUN apt update && apt install -y nginx

COPY nginx.conf /etc/nginx/sites-available/default

COPY package.json ./
COPY pnpm-lock.yaml ./

FROM base as test
RUN npm install
RUN npm install cypress@12.17.3
RUN pnpm install --frozen-lockfile --prefer-offline
COPY . .
