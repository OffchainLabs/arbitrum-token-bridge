# syntax=docker/dockerfile:1
FROM synthetixio/docker-e2e:18.13-ubuntu as base

RUN mkdir /app
WORKDIR /app

COPY package.json ./
COPY package.json ./packages/arb-token-bridge-ui/
COPY package.json ./packages/token-bridge-sdk/
COPY package.json ./packages/use-wallet/
COPY yarn.lock ./

FROM base as test
RUN npm install
COPY . .
