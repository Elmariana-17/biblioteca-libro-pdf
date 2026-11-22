FROM node:24-bookworm-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY public ./public
COPY lib ./lib
COPY scripts ./scripts
COPY seed ./seed
COPY server.mjs ./
ENV NODE_ENV=production HOST=0.0.0.0 PORT=4317 DATA_DIR=/data COOKIE_SECURE=true
RUN mkdir /data && chown node:node /data
USER node
EXPOSE 4317
CMD ["node","server.mjs"]
