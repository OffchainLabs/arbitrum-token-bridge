# syntax=docker/dockerfile:1
FROM synthetixio/docker-e2e:18.13-ubuntu as base

RUN mkdir /app
WORKDIR /app

COPY package.json ./
COPY yarn.lock ./

COPY packages/arb-token-bridge-ui packages/arb-token-bridge-ui
COPY packages/use-wallet packages/use-wallet
COPY packages/token-bridge-sdk packages/token-bridge-sdk

FROM base as test
RUN npm install --legacy-peer-deps
COPY . .
