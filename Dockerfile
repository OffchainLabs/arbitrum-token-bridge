# syntax=docker/dockerfile:1
FROM synthetixio/docker-e2e:18.13-ubuntu as base

RUN mkdir /app
WORKDIR /app

COPY package.json ./
COPY package-lock.json ./

FROM base as test
RUN npm install
COPY . .
