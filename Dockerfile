# syntax=docker/dockerfile:1
FROM synthetixio/docker-e2e:18.13-ubuntu as base

RUN mkdir /app
WORKDIR /app

COPY package.json ./
COPY yarn.lock ./

# COPY ./packages/arb-token-bridge-ui/package.json ./packages/arb-token-bridge-ui/
# COPY ./packages/use-wallet/package.json ./packages/use-wallet/
# COPY ./packages/token-bridge-sdk/package.json ./packages/token-bridge-sdk/

# RUN cd ./packages/use-wallet && npm build
# RUN cd ./packages/token-bridge-sdk && npm build
# RUN cd ./packages/arb-token-bridge-ui && npm build

FROM base as test
RUN CYPRESS_CACHE_FOLDER=~/.cache/Cypress npm install
# COPY ./packages/arb-token-bridge-ui/build ./packages/arb-token-bridge-ui/
# COPY ./packages/use-wallet/build ./packages/use-wallet/
# COPY ./packages/token-bridge-sdk/build ./packages/token-bridge-sdk/
COPY . .



