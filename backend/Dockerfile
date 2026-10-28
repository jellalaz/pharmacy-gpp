FROM node:22-bookworm-slim
RUN apt-get update && apt-get install -y openssl --no-install-recommends && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package*.json ./
COPY backend/package.json backend/package.json
COPY frontend/package.json frontend/package.json
RUN npm ci --workspace backend --include-workspace-root
COPY backend backend
RUN npm run db:generate && npm run build -w backend
USER node
EXPOSE 4000
CMD ["sh", "-c", "npm run db:migrate && if [ \"$DEMO_SEED\" = \"true\" ]; then npm run db:seed; fi && npm start -w backend"]
