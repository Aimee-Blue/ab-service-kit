FROM node:10-alpine
WORKDIR /usr/src/server
COPY . .
ENV PORT 8080
EXPOSE 8080
RUN npm install -g yarn
RUN yarn install --silent
CMD [ "yarn", "start" ]