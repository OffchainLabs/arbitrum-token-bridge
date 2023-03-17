# syntax=docker/dockerfile:1
FROM synthetixio/docker-e2e:18.13-ubuntu as base

RUN mkdir /app
WORKDIR /app

COPY package.json ./
COPY yarn.lock ./

FROM base as test
# RUN CYPRESS_CACHE_FOLDER=~/.cache/Cypress npm install
COPY . .



