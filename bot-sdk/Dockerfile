FROM node:18-bullseye

WORKDIR /app

COPY ./src/ /app/
COPY ./package.json /app/
RUN npm install --omit=dev

CMD node jirabot.js

