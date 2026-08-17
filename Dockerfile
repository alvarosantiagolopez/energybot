FROM node:20-alpine AS frontend-build

WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

FROM python:3.12-alpine

WORKDIR /app

RUN apk add --no-cache nodejs npm

COPY python-service/requirements.txt ./python-service/

RUN pip install --no-cache-dir -r python-service/requirements.txt

COPY python-service/ ./python-service/

COPY backend/package*.json ./backend/

RUN npm ci --omit=dev --prefix backend

COPY backend/ ./backend/
COPY --from=frontend-build /app/frontend/dist ./frontend/dist

ENV NODE_ENV=production
ENV STATS_SERVICE_URL=http://localhost:8000

EXPOSE 3000 8000

COPY docker-entrypoint.sh /

RUN chmod +x /docker-entrypoint.sh

CMD ["/docker-entrypoint.sh"]
