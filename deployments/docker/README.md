# VrewCraft Docker Deployment

This directory contains Docker configurations for deploying VrewCraft in both development and production environments.

---

## Quick Start

### Development Deployment

```bash
# Start all services in development mode
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

**Development features**:
- Hot reload for frontend (Vite HMR)
- Hot reload for backend (nodemon)
- Source code mounted as volumes
- Debug logging enabled

**Access**:
- Frontend: http://localhost:5173
- Backend API: http://localhost:3001
- WebSocket: ws://localhost:3002
- Grafana: http://localhost:3000
- Prometheus: http://localhost:9090
- PostgreSQL: localhost:5432
- Redis: localhost:6379

---

### Production Deployment

```bash
# Copy environment file and configure
cp .env.example .env
nano .env  # Edit configuration

# Build and start services
docker-compose -f docker-compose.prod.yml up -d

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Check service health
docker-compose -f docker-compose.prod.yml ps

# Stop services
docker-compose -f docker-compose.prod.yml down
```

**Production features**:
- Optimized builds (multi-stage Dockerfiles)
- Nginx for frontend serving
- Health checks for all services
- Named volumes for data persistence
- Non-root user for security
- Restart policies configured

**Access**:
- Frontend: http://localhost:80 (or configured port)
- Backend API: http://localhost:3001
- Grafana: http://localhost:3000

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Docker Network                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ Frontend │  │ Backend  │  │PostgreSQL│  │  Redis   │   │
│  │ (Nginx)  │──│ (Node.js)│──│          │  │          │   │
│  └────┬─────┘  └────┬─────┘  └──────────┘  └──────────┘   │
│       │             │                                        │
│       │             └───────┬──────────────────────┐        │
│       │                     │                      │        │
│  ┌────▼─────┐      ┌───────▼────────┐    ┌───────▼──────┐ │
│  │   User   │      │  Prometheus    │    │   Grafana    │ │
│  │ Browser  │      │   (Metrics)    │    │ (Dashboard)  │ │
│  └──────────┘      └────────────────┘    └──────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## Services

### Frontend
- **Image**: Custom build (React + Vite + Nginx)
- **Ports**: 80 (production), 5173 (development)
- **Health**: HTTP GET /health
- **Restart**: unless-stopped

### Backend
- **Image**: Custom build (Node.js + TypeScript + C++ Native Addon)
- **Ports**: 3001 (HTTP API), 3002 (WebSocket)
- **Health**: HTTP GET /health
- **Restart**: unless-stopped
- **Volumes**: uploads, outputs (persistent)

### PostgreSQL
- **Image**: postgres:15-alpine
- **Port**: 5432
- **Health**: pg_isready
- **Restart**: unless-stopped
- **Volume**: postgres-data (persistent)

### Redis
- **Image**: redis:7-alpine
- **Port**: 6379
- **Health**: redis-cli ping
- **Restart**: unless-stopped
- **Volume**: redis-data (persistent)
- **Config**: Appendonly mode, 256MB max memory, LRU eviction

### Prometheus
- **Image**: prom/prometheus:latest
- **Port**: 9090
- **Restart**: unless-stopped
- **Volume**: prometheus-data (persistent)
- **Retention**: 30 days

### Grafana
- **Image**: grafana/grafana:latest
- **Port**: 3000
- **Health**: HTTP GET /api/health
- **Restart**: unless-stopped
- **Volume**: grafana-data (persistent)
- **Provisioning**: Automatic datasource and dashboard setup

---

## Configuration

### Environment Variables

See `.env.example` for all available configuration options.

**Critical variables** to change in production:
```bash
# Security
DB_PASSWORD=<strong-random-password>
GRAFANA_PASSWORD=<strong-random-password>

# URLs (if deploying to external domain)
VITE_API_URL=https://api.yourdomain.com
VITE_WS_URL=wss://ws.yourdomain.com
GRAFANA_ROOT_URL=https://grafana.yourdomain.com
```

### Volume Management

**List volumes**:
```bash
docker volume ls | grep vrewcraft
```

**Backup volumes**:
```bash
# PostgreSQL backup
docker exec vrewcraft-postgres-prod pg_dump -U admin vrewcraft > backup.sql

# Redis backup
docker exec vrewcraft-redis-prod redis-cli SAVE
docker cp vrewcraft-redis-prod:/data/dump.rdb ./redis-backup.rdb

# Upload files backup
docker cp vrewcraft-backend-prod:/app/uploads ./uploads-backup
docker cp vrewcraft-backend-prod:/app/outputs ./outputs-backup
```

**Restore volumes**:
```bash
# PostgreSQL restore
docker exec -i vrewcraft-postgres-prod psql -U admin vrewcraft < backup.sql

# Redis restore
docker cp ./redis-backup.rdb vrewcraft-redis-prod:/data/dump.rdb
docker restart vrewcraft-redis-prod

# Upload files restore
docker cp ./uploads-backup vrewcraft-backend-prod:/app/uploads
docker cp ./outputs-backup vrewcraft-backend-prod:/app/outputs
```

---

## Monitoring

### Health Checks

**Check all service health**:
```bash
docker-compose -f docker-compose.prod.yml ps
```

**Manual health checks**:
```bash
# Frontend
curl http://localhost/health

# Backend
curl http://localhost:3001/health

# PostgreSQL
docker exec vrewcraft-postgres-prod pg_isready -U admin

# Redis
docker exec vrewcraft-redis-prod redis-cli ping

# Grafana
curl http://localhost:3000/api/health
```

### Logs

**View all logs**:
```bash
docker-compose -f docker-compose.prod.yml logs -f
```

**View specific service logs**:
```bash
docker-compose -f docker-compose.prod.yml logs -f frontend
docker-compose -f docker-compose.prod.yml logs -f backend
docker-compose -f docker-compose.prod.yml logs -f postgres
```

### Metrics

**Access Prometheus**:
- URL: http://localhost:9090
- Query examples:
  ```promql
  # Thumbnail extraction p99 latency
  histogram_quantile(0.99, rate(vrewcraft_thumbnail_duration_seconds_bucket[5m]))

  # Request rate
  rate(vrewcraft_thumbnail_requests_total[1m])

  # Cache hit ratio
  vrewcraft_thumbnail_cache_hit_ratio
  ```

**Access Grafana**:
- URL: http://localhost:3000
- Default credentials: admin/admin (change in production!)
- Dashboard: VrewCraft Performance

---

## Troubleshooting

### Service won't start

```bash
# Check logs for errors
docker-compose -f docker-compose.prod.yml logs <service-name>

# Check if ports are already in use
netstat -tulpn | grep -E '80|3000|3001|3002|5432|6379|9090'

# Restart specific service
docker-compose -f docker-compose.prod.yml restart <service-name>
```

### Database connection errors

```bash
# Ensure PostgreSQL is healthy
docker-compose -f docker-compose.prod.yml ps postgres

# Check PostgreSQL logs
docker-compose -f docker-compose.prod.yml logs postgres

# Connect to PostgreSQL manually
docker exec -it vrewcraft-postgres-prod psql -U admin -d vrewcraft
```

### Native addon build failures

```bash
# Rebuild backend with verbose output
docker-compose -f docker-compose.prod.yml build --no-cache backend

# Check FFmpeg availability
docker run --rm node:20-alpine sh -c "apk add ffmpeg && ffmpeg -version"
```

### Out of disk space

```bash
# Check disk usage
df -h

# Clean up Docker resources
docker system prune -a --volumes

# Remove old images
docker image prune -a
```

---

## Scaling

### Horizontal Scaling

**Scale backend replicas** (with load balancer):
```bash
docker-compose -f docker-compose.prod.yml up -d --scale backend=3
```

**Note**: Requires:
- Shared file storage (NFS/S3) for uploads/outputs
- Load balancer (Nginx/HAProxy) in front of backends
- Session management via Redis (already configured)

### Vertical Scaling

**Increase resource limits**:
```yaml
# Add to docker-compose.prod.yml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 2G
        reservations:
          cpus: '1.0'
          memory: 512M
```

---

## Production Checklist

Before deploying to production:

- [ ] Change default passwords in `.env`
- [ ] Configure HTTPS/TLS (add nginx reverse proxy)
- [ ] Set up firewall rules (only expose 80/443)
- [ ] Configure domain names and DNS
- [ ] Set up automated backups (PostgreSQL, Redis, volumes)
- [ ] Configure log aggregation (ELK stack, CloudWatch, etc.)
- [ ] Set up alerting (Grafana alerts, PagerDuty, etc.)
- [ ] Enable Redis authentication if exposed externally
- [ ] Review and harden PostgreSQL configuration
- [ ] Set up monitoring dashboards (Grafana)
- [ ] Test disaster recovery procedures
- [ ] Document runbooks for common issues
- [ ] Set up CI/CD pipeline for deployments

---

## Files

- `docker-compose.yml` - Development configuration
- `docker-compose.prod.yml` - Production configuration
- `.env.example` - Environment variable template
- `README.md` - This file

---

## Support

For issues and questions:
- GitHub Issues: https://github.com/seungwoo7050/claude-video-editor/issues
- Documentation: [docs/architecture.md](../../docs/architecture.md)
- Performance Report: [docs/performance-report.md](../../docs/performance-report.md)

---

**Last Updated**: 2025-11-14
**Version**: 1.0.0
**Status**: Production Ready
