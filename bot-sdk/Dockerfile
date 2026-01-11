FROM node:18-bullseye

WORKDIR /app

COPY src /app

RUN npm install --omit=dev

CMD jirabot.js

