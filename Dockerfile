FROM node:22-bookworm AS frontend
WORKDIR /src
COPY package*.json ./
RUN npm ci
COPY web ./web
COPY vite.config.ts tsconfig.json ./
RUN npm run build

FROM php:8.3-cli-bookworm
RUN apt-get update && apt-get install -y --no-install-recommends git unzip libsqlite3-dev \
    && docker-php-ext-install pdo_sqlite \
    && rm -rf /var/lib/apt/lists/*
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer
WORKDIR /app
COPY server/composer.json server/composer.lock ./server/
RUN cd server && composer install --no-dev --prefer-dist --no-interaction --optimize-autoloader
COPY . .
COPY --from=frontend /src/server/public ./server/public
RUN mkdir -p server/runtime
EXPOSE 8787 8788
CMD ["php", "server/start.php", "start"]
