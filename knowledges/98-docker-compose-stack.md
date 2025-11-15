# Docker Compose 배포 스택

**목표**: Docker Compose로 전체 스택 배포 (개발 + 프로덕션)  
**난이도**: ⭐⭐⭐☆☆ (중급)  
**예상 시간**: 3-4시간 (정독 + 실습)  
**선행 과정**: [91-nodejs-express-backend.md](91-nodejs-express-backend.md)

---

## 📋 목차

1. [Docker 기초](#part-1-docker-기초)
2. [개발 환경](#part-2-개발-환경)
3. [프로덕션 환경](#part-3-프로덕션-환경)
4. [모니터링 스택](#part-4-모니터링-스택)

---

## Part 1: Docker 기초

### 1.1 Docker란?

```
Docker = 컨테이너 플랫폼

컨테이너:
✅ 애플리케이션 + 의존성 패키징
✅ 격리된 실행 환경
✅ 이식성 (어디서나 동일하게 실행)
✅ 가볍고 빠름 (VM 대비)

vs VM:
- Docker: OS 커널 공유, 빠름, 가벼움
- VM: 전체 OS, 느림, 무거움
```

---

### 1.2 Docker 설치

```bash
# macOS
brew install --cask docker

# Ubuntu
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# 확인
docker --version
docker-compose --version
```

---

### 1.3 Dockerfile

```dockerfile
# frontend/Dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

# 의존성 설치 (캐시 활용)
COPY package*.json ./
RUN npm ci

# 소스 복사
COPY . .

# 빌드
RUN npm run build

# 프로덕션 이미지
FROM nginx:alpine

# Nginx 설정
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 빌드 결과 복사
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

```dockerfile
# backend/Dockerfile
FROM node:20-alpine

WORKDIR /app

# FFmpeg 설치
RUN apk add --no-cache ffmpeg

# 의존성 설치
COPY package*.json ./
RUN npm ci --only=production

# 소스 복사
COPY . .

# TypeScript 빌드
RUN npm run build

# 업로드 디렉토리 생성
RUN mkdir -p uploads outputs

EXPOSE 3001 3002

CMD ["node", "dist/server.js"]
```

---

## Part 2: 개발 환경

### 2.1 docker-compose.yml (개발)

```yaml
# docker-compose.yml
version: '3.8'

services:
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.dev
    ports:
      - "5173:5173"
    volumes:
      - ./frontend:/app
      - /app/node_modules
    environment:
      - VITE_API_URL=http://localhost:3001
      - VITE_WS_URL=ws://localhost:3002
    command: npm run dev

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile.dev
    ports:
      - "3001:3001"
      - "3002:3002"
    volumes:
      - ./backend:/app
      - /app/node_modules
      - ./uploads:/app/uploads
      - ./outputs:/app/outputs
    environment:
      - NODE_ENV=development
      - DB_HOST=postgres
      - DB_PORT=5432
      - DB_NAME=vrewcraft
      - DB_USER=admin
      - DB_PASSWORD=password
      - REDIS_HOST=redis
      - REDIS_PORT=6379
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_started
    command: npm run dev

  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: vrewcraft
      POSTGRES_USER: admin
      POSTGRES_PASSWORD: password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./migrations:/docker-entrypoint-initdb.d
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U admin -d vrewcraft"]
      interval: 5s
      timeout: 3s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes

  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./monitoring/prometheus/prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3000:3000"
    volumes:
      - grafana_data:/var/lib/grafana
      - ./monitoring/grafana/dashboards:/etc/grafana/provisioning/dashboards
      - ./monitoring/grafana/datasources:/etc/grafana/provisioning/datasources
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
      - GF_USERS_ALLOW_SIGN_UP=false
    depends_on:
      - prometheus

volumes:
  postgres_data:
  redis_data:
  prometheus_data:
  grafana_data:
```

---

### 2.2 개발용 Dockerfile

```dockerfile
# frontend/Dockerfile.dev
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev"]
```

```dockerfile
# backend/Dockerfile.dev
FROM node:20-alpine

WORKDIR /app

# FFmpeg 설치
RUN apk add --no-cache ffmpeg

COPY package*.json ./
RUN npm install

COPY . .

RUN mkdir -p uploads outputs

EXPOSE 3001 3002

CMD ["npm", "run", "dev"]
```

---

### 2.3 환경 변수 파일

```bash
# .env
# PostgreSQL
POSTGRES_DB=vrewcraft
POSTGRES_USER=admin
POSTGRES_PASSWORD=password

# Redis
REDIS_PASSWORD=

# Backend
NODE_ENV=development
PORT=3001
WS_PORT=3002

# Frontend
VITE_API_URL=http://localhost:3001
VITE_WS_URL=ws://localhost:3002

# Grafana
GF_SECURITY_ADMIN_PASSWORD=admin
```

---

### 2.4 시작/중지 스크립트

```bash
#!/bin/bash
# scripts/dev-start.sh

echo "🚀 Starting VrewCraft development environment..."

# Docker Compose 시작
docker-compose up -d

# 서비스 대기
echo "⏳ Waiting for services..."
sleep 5

# 헬스 체크
echo "🏥 Health checks:"
curl -s http://localhost:3001/health | jq .
curl -s http://localhost:9090/-/healthy

echo "✅ All services ready!"
echo ""
echo "📍 URLs:"
echo "  Frontend: http://localhost:5173"
echo "  Backend: http://localhost:3001"
echo "  Grafana: http://localhost:3000 (admin/admin)"
echo "  Prometheus: http://localhost:9090"
echo ""
echo "📊 Logs: docker-compose logs -f"
echo "🛑 Stop: docker-compose down"
```

```bash
#!/bin/bash
# scripts/dev-stop.sh

echo "🛑 Stopping VrewCraft development environment..."

docker-compose down

echo "✅ All services stopped"
```

---

## Part 3: 프로덕션 환경

### 3.1 docker-compose.prod.yml

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    restart: always
    environment:
      - VITE_API_URL=https://api.vrewcraft.com
      - VITE_WS_URL=wss://api.vrewcraft.com/ws
    networks:
      - vrewcraft

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    restart: always
    environment:
      - NODE_ENV=production
      - DB_HOST=postgres
      - DB_NAME=${POSTGRES_DB}
      - DB_USER=${POSTGRES_USER}
      - DB_PASSWORD=${POSTGRES_PASSWORD}
      - REDIS_HOST=redis
      - REDIS_PASSWORD=${REDIS_PASSWORD}
    volumes:
      - uploads:/app/uploads
      - outputs:/app/outputs
    depends_on:
      - postgres
      - redis
    networks:
      - vrewcraft

  nginx:
    image: nginx:alpine
    restart: always
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./nginx/ssl:/etc/nginx/ssl
      - uploads:/var/www/uploads
      - outputs:/var/www/outputs
    depends_on:
      - frontend
      - backend
    networks:
      - vrewcraft

  postgres:
    image: postgres:15-alpine
    restart: always
    environment:
      POSTGRES_DB: ${POSTGRES_DB}
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - vrewcraft

  redis:
    image: redis:7-alpine
    restart: always
    command: redis-server --requirepass ${REDIS_PASSWORD} --appendonly yes
    volumes:
      - redis_data:/data
    networks:
      - vrewcraft

  prometheus:
    image: prom/prometheus:latest
    restart: always
    volumes:
      - ./monitoring/prometheus/prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    networks:
      - vrewcraft

  grafana:
    image: grafana/grafana:latest
    restart: always
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=${GF_ADMIN_PASSWORD}
      - GF_SERVER_ROOT_URL=https://metrics.vrewcraft.com
    volumes:
      - grafana_data:/var/lib/grafana
    depends_on:
      - prometheus
    networks:
      - vrewcraft

networks:
  vrewcraft:
    driver: bridge

volumes:
  postgres_data:
  redis_data:
  prometheus_data:
  grafana_data:
  uploads:
  outputs:
```

---

### 3.2 Nginx 설정

```nginx
# nginx/nginx.conf
upstream frontend {
    server frontend:80;
}

upstream backend {
    server backend:3001;
}

upstream backend_ws {
    server backend:3002;
}

server {
    listen 80;
    server_name vrewcraft.com www.vrewcraft.com;
    
    # HTTP → HTTPS 리다이렉트
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name vrewcraft.com www.vrewcraft.com;
    
    # SSL 인증서
    ssl_certificate /etc/nginx/ssl/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/privkey.pem;
    
    # SSL 설정
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers "EECDH+AESGCM:EDH+AESGCM:AES256+EECDH:AES256+EDH";
    
    # Frontend
    location / {
        proxy_pass http://frontend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Backend API
    location /api {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        
        # 파일 업로드 (최대 500MB)
        client_max_body_size 500M;
    }
    
    # WebSocket
    location /ws {
        proxy_pass http://backend_ws;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
    
    # 정적 파일
    location /uploads {
        alias /var/www/uploads;
    }
    
    location /outputs {
        alias /var/www/outputs;
    }
}

# Grafana
server {
    listen 443 ssl http2;
    server_name metrics.vrewcraft.com;
    
    ssl_certificate /etc/nginx/ssl/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/privkey.pem;
    
    location / {
        proxy_pass http://grafana:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

### 3.3 배포 스크립트

```bash
#!/bin/bash
# scripts/deploy.sh

set -e

echo "🚀 Deploying VrewCraft to production..."

# 환경 변수 확인
if [ ! -f .env.prod ]; then
    echo "❌ .env.prod not found"
    exit 1
fi

# .env.prod 로드
export $(cat .env.prod | xargs)

# Git pull (선택)
# git pull origin main

# Docker 이미지 빌드
echo "🔨 Building Docker images..."
docker-compose -f docker-compose.prod.yml build --no-cache

# 기존 컨테이너 중지
echo "🛑 Stopping old containers..."
docker-compose -f docker-compose.prod.yml down

# 새 컨테이너 시작
echo "▶️  Starting new containers..."
docker-compose -f docker-compose.prod.yml up -d

# 헬스 체크
echo "🏥 Health checks..."
sleep 10

BACKEND_HEALTH=$(curl -s http://localhost:3001/health | jq -r .status)

if [ "$BACKEND_HEALTH" == "ok" ]; then
    echo "✅ Deployment successful!"
else
    echo "❌ Health check failed"
    docker-compose -f docker-compose.prod.yml logs backend
    exit 1
fi

echo ""
echo "📍 Services:"
docker-compose -f docker-compose.prod.yml ps

echo ""
echo "📊 Logs: docker-compose -f docker-compose.prod.yml logs -f"
```

---

## Part 4: 모니터링 스택

### 4.1 Prometheus 설정

```yaml
# monitoring/prometheus/prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'vrewcraft-backend'
    static_configs:
      - targets: ['backend:3001']
    metrics_path: '/metrics'

  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  - job_name: 'postgres'
    static_configs:
      - targets: ['postgres-exporter:9187']

  - job_name: 'redis'
    static_configs:
      - targets: ['redis-exporter:9121']
```

---

### 4.2 Grafana 대시보드

```json
// monitoring/grafana/dashboards/vrewcraft.json
{
  "dashboard": {
    "title": "VrewCraft Dashboard",
    "panels": [
      {
        "title": "API Latency (p99)",
        "targets": [
          {
            "expr": "histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m]))"
          }
        ]
      },
      {
        "title": "Video Processing Rate",
        "targets": [
          {
            "expr": "rate(video_processing_total[5m])"
          }
        ]
      },
      {
        "title": "Memory Usage",
        "targets": [
          {
            "expr": "process_resident_memory_bytes"
          }
        ]
      }
    ]
  }
}
```

---

### 4.3 로그 수집

```yaml
# docker-compose.prod.yml (추가)
services:
  loki:
    image: grafana/loki:latest
    ports:
      - "3100:3100"
    volumes:
      - ./monitoring/loki/loki-config.yml:/etc/loki/local-config.yaml
      - loki_data:/loki
    networks:
      - vrewcraft

  promtail:
    image: grafana/promtail:latest
    volumes:
      - /var/log:/var/log
      - /var/lib/docker/containers:/var/lib/docker/containers
      - ./monitoring/promtail/promtail-config.yml:/etc/promtail/config.yml
    networks:
      - vrewcraft

volumes:
  loki_data:
```

---

## 🎯 실전 체크리스트

### 개발 환경
- [ ] docker-compose.yml 작성
- [ ] 개발용 Dockerfile
- [ ] 환경 변수 설정 (.env)
- [ ] 볼륨 마운트 (핫 리로드)
- [ ] 시작/중지 스크립트

### 프로덕션 환경
- [ ] docker-compose.prod.yml
- [ ] 프로덕션 Dockerfile (multi-stage)
- [ ] Nginx 리버스 프록시
- [ ] SSL 인증서 (Let's Encrypt)
- [ ] 배포 스크립트

### 모니터링
- [ ] Prometheus 메트릭 수집
- [ ] Grafana 대시보드
- [ ] 로그 수집 (Loki)
- [ ] 알림 설정 (Alertmanager)

---

## 📚 면접 예상 질문

### 기초
1. **Docker vs VM 차이는?**
   - Docker: OS 커널 공유, 빠름
   - VM: 전체 OS, 느림

2. **Dockerfile의 COPY vs ADD?**
   - COPY: 파일 복사만
   - ADD: URL 다운로드, tar 압축 해제

3. **Multi-stage build의 장점은?**
   - 빌드 의존성 제외 → 이미지 크기 감소

4. **docker-compose의 역할은?**
   - 다중 컨테이너 오케스트레이션

5. **volumes vs bind mounts?**
   - volumes: Docker 관리 (프로덕션)
   - bind mounts: 호스트 경로 (개발)

### 심화
6. **depends_on vs healthcheck?**
   - depends_on: 시작 순서만
   - healthcheck: 준비 상태 확인

7. **restart: always 정책은?**
   - 컨테이너 종료 시 자동 재시작

8. **nginx 리버스 프록시 장점은?**
   - 로드 밸런싱, SSL 종료, 정적 파일

9. **Docker 네트워크 종류는?**
   - bridge, host, overlay, macvlan

10. **프로덕션 배포 전략은?**
    - Blue-Green, Canary, Rolling Update

---

**다음 문서**: [99-deployment-production.md](99-deployment-production.md) - 프로덕션 배포
