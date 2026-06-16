# ==========================================
# STAGE 1: Build Next.js Frontend
# ==========================================
FROM --platform=$BUILDPLATFORM node:20-alpine AS frontend-builder

WORKDIR /app/frontend

# Install dependencies
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci

# Copy source and build (Static Export)
COPY frontend/ ./
RUN npm run build

# ==========================================
# STAGE 2: Build Go Backend
# ==========================================
FROM --platform=$BUILDPLATFORM golang:1.26-alpine AS backend-builder

WORKDIR /app

# Install dependencies
COPY go.mod go.sum ./
RUN go mod download

# Copy source and build
COPY cmd/ ./cmd/
COPY internal/ ./internal/
COPY locales/ ./locales/
ARG TARGETOS
ARG TARGETARCH
RUN CGO_ENABLED=0 GOOS=$TARGETOS GOARCH=$TARGETARCH go build -ldflags="-s -w" -o levia_api ./cmd/api

# ==========================================
# STAGE 3: Final Production Image
# ==========================================
FROM alpine:latest AS runner

WORKDIR /app

# Install tzdata for standard timezone
RUN apk add --no-cache tzdata bash

# Set default timezone
ENV TZ=Asia/Ho_Chi_Minh

# Copy Go binary and locales
COPY --from=backend-builder /app/levia_api ./
COPY --from=backend-builder /app/locales ./locales

# Copy static frontend export
COPY --from=frontend-builder /app/frontend/out ./frontend/out

# Copy default data files
COPY data/*.json ./default_data/

# Create necessary directories for the Go backend
RUN mkdir -p data logs exports cache backups

# Create start script
RUN echo '#!/bin/bash' > /app/start.sh && \
    echo 'echo "Starting LeviaTech Story..."' >> /app/start.sh && \
    echo '# Initialize default data if missing' >> /app/start.sh && \
    echo 'cp -n default_data/*.json data/ 2>/dev/null || true' >> /app/start.sh && \
    echo '# Run Go Backend on port 1997' >> /app/start.sh && \
    echo 'PORT=1997 ./levia_api' >> /app/start.sh && \
    chmod +x /app/start.sh

# Expose Go port
EXPOSE 1997

CMD ["/app/start.sh"]
