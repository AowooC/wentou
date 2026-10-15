FROM node:20-slim
RUN apt-get update && apt-get install -y --no-install-recommends poppler-utils && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json server.js ./
COPY public ./public
ENV NODE_ENV=production HOST=0.0.0.0 PORT=10000
USER node
EXPOSE 10000
CMD ["node","server.js"]
