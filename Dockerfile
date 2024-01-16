# syntax=docker/dockerfile:1
FROM synthetixio/docker-e2e:18.16-ubuntu as base

RUN mkdir /app
WORKDIR /app

COPY package.json ./
COPY yarn.lock ./

FROM base as test
RUN npm install
RUN npm install cypress@12.17.3
RUN yarn cypress install --force
COPY . .

