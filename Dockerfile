#
# Stage 1: Build the client
#
FROM node:18-bullseye AS client-builder

WORKDIR /usr/src/poinz

COPY package.json package-lock.json ./
COPY client/package.json client/package-lock.json ./client/

RUN cd client && npm ci
COPY client/ ./client/

RUN cd client && npm run build


#
# Stage 2: Build the server and final image
#
FROM node:18-bullseye AS production
ENV NODE_ENV=production

WORKDIR /usr/src/poinz
COPY server/package.json server/package-lock.json ./
RUN npm ci --omit=dev
COPY server/src ./src

# Copy built client from the previous stage
COPY --from=client-builder /usr/src/poinz/client/dist ./public

EXPOSE 3000

CMD ["npm", "start"]
