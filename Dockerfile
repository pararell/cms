FROM node:24.9-alpine3.21 AS buildContainer
RUN apk update && apk add python3 make g++ sqlite-dev

WORKDIR /usr/src/app
COPY ./package.json ./package-lock.json ./
RUN npm install
COPY . /usr/src/app
RUN npm run build:ssr
RUN npm prune --omit=dev

FROM node:24.9-alpine3.21
WORKDIR /usr/src/app
COPY --from=buildContainer /usr/src/app/package.json /usr/src/app/package-lock.json /usr/src/app/.env* ./
COPY --from=buildContainer /usr/src/app/dist ./dist
COPY --from=buildContainer /usr/src/app/node_modules ./node_modules

ENTRYPOINT ["npm", "run", "start"]
