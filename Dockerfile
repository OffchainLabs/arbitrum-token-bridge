# syntax=docker/dockerfile:1
FROM synthetixio/docker-e2e:18.13-ubuntu as base

RUN mkdir /app
WORKDIR /app

COPY e2e-package.json ./
RUN mv ./e2e-package.json ./package.json
COPY yarn.lock ./

FROM base as test
RUN CYPRESS_CACHE_FOLDER=~/.cache/Cypress npm install
COPY . .



