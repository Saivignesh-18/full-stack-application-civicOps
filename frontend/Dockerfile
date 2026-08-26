# CivicOps Frontend Dockerfile

# Build stage
FROM node:20-alpine AS builder
WORKDIR /app

# API + WS URLs are baked in at build time by Vite.
# Default to relative paths so the nginx reverse proxy (/api, /socket.io) handles routing.
ARG VITE_API_URL=/api/v1
ARG VITE_WS_URL=/
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_WS_URL=$VITE_WS_URL

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm ci

# Copy source
COPY . .

# Build
RUN npm run build

# Production stage - use nginx
FROM nginx:alpine AS runner

# Copy nginx config
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

# Copy built assets
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
