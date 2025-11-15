# Prometheus + Grafana 모니터링

**목표**: VrewCraft 성능 모니터링 및 시각화 (Arena60 M1.7 패턴)
**난이도**: ⭐⭐⭐☆☆ (중급)
**예상 시간**: 4-5시간 (정독 + 실습)
**선행 과정**: [91-nodejs-express-backend.md](91-nodejs-express-backend.md)

---

## 📋 목차

1. [Prometheus 기초](#part-1-prometheus-기초)
2. [메트릭 수집](#part-2-메트릭-수집)
3. [Grafana 대시보드](#part-3-grafana-대시보드)
4. [알림 설정](#part-4-알림-설정)

---

## Part 1: Prometheus 기초

### 1.1 Prometheus란?

```
Prometheus = 오픈소스 모니터링 시스템

특징:
✅ 시계열 데이터베이스 (Time-Series DB)
✅ Pull 방식 메트릭 수집
✅ PromQL 쿼리 언어
✅ 알림 지원 (Alertmanager)

VrewCraft 사용 사례:
- API 응답 시간 (p50, p95, p99)
- 썸네일 추출 성능
- FFmpeg 처리 시간
- 메모리 사용량
- 에러율

Arena60 패턴 (M1.7):
- Counter, Histogram, Gauge 사용
- Label 규칙
- Dashboard 디자인
```

---

### 1.2 메트릭 타입

```
1. Counter (카운터)
   - 증가만 가능 (리셋 시 0)
   - 예: 요청 수, 에러 수

2. Gauge (게이지)
   - 증가/감소 가능
   - 예: 메모리 사용량, 동시 연결 수

3. Histogram (히스토그램)
   - 분포 측정
   - 예: API 지연 시간, 파일 크기

4. Summary (요약)
   - Histogram과 유사
   - 클라이언트에서 분위수 계산
```

---

### 1.3 Docker로 Prometheus 실행

```yaml
# docker-compose.yml (추가)
services:
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
      - '--storage.tsdb.retention.time=30d'
    restart: unless-stopped

volumes:
  prometheus_data:
```

**설정 파일:**
```yaml
# monitoring/prometheus/prometheus.yml
global:
  scrape_interval: 15s      # 메트릭 수집 주기
  evaluation_interval: 15s  # 규칙 평가 주기

scrape_configs:
  - job_name: 'vrewcraft-backend'
    static_configs:
      - targets: ['backend:3001']
    metrics_path: '/metrics'

  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']
```

**실행:**
```bash
docker-compose up -d prometheus

# 접속
open http://localhost:9090
```

---

## Part 2: 메트릭 수집

### 2.1 prom-client 설치

```bash
cd backend
npm install prom-client
npm install -D @types/prom-client
```

---

### 2.2 메트릭 초기화

```typescript
// backend/src/metrics/metrics.ts
import { Registry, Counter, Histogram, Gauge, collectDefaultMetrics } from 'prom-client';

// Registry 생성
export const register = new Registry();

// 기본 메트릭 수집 (CPU, 메모리, 이벤트 루프 등)
collectDefaultMetrics({
  register,
  prefix: 'vrewcraft_',
});

// === Counter ===

// HTTP 요청 수
export const httpRequestsTotal = new Counter({
  name: 'vrewcraft_http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

// 비디오 업로드 수
export const videoUploadsTotal = new Counter({
  name: 'vrewcraft_video_uploads_total',
  help: 'Total number of video uploads',
  labelNames: ['status'],
  registers: [register],
});

// 비디오 편집 수
export const videoEditsTotal = new Counter({
  name: 'vrewcraft_video_edits_total',
  help: 'Total number of video edits',
  labelNames: ['edit_type', 'status'],
  registers: [register],
});

// 썸네일 요청 수
export const thumbnailRequestsTotal = new Counter({
  name: 'vrewcraft_thumbnail_requests_total',
  help: 'Total number of thumbnail requests',
  labelNames: ['cache_status'],
  registers: [register],
});

// FFmpeg 에러 수
export const ffmpegErrorsTotal = new Counter({
  name: 'vrewcraft_ffmpeg_errors_total',
  help: 'Total number of FFmpeg errors',
  labelNames: ['operation'],
  registers: [register],
});

// === Histogram ===

// API 지연 시간
export const httpRequestDuration = new Histogram({
  name: 'vrewcraft_http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5],
  registers: [register],
});

// 썸네일 추출 시간
export const thumbnailDuration = new Histogram({
  name: 'vrewcraft_thumbnail_duration_seconds',
  help: 'Thumbnail extraction duration in seconds',
  buckets: [0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1],
  registers: [register],
});

// FFmpeg 처리 시간
export const ffmpegDuration = new Histogram({
  name: 'vrewcraft_ffmpeg_duration_seconds',
  help: 'FFmpeg processing duration in seconds',
  labelNames: ['operation'],
  buckets: [0.5, 1, 2, 5, 10, 30, 60],
  registers: [register],
});

// 비디오 업로드 시간
export const uploadDuration = new Histogram({
  name: 'vrewcraft_upload_duration_seconds',
  help: 'Video upload duration in seconds',
  buckets: [0.5, 1, 2, 5, 10, 30],
  registers: [register],
});

// === Gauge ===

// 활성 WebSocket 연결 수
export const websocketConnections = new Gauge({
  name: 'vrewcraft_websocket_connections',
  help: 'Number of active WebSocket connections',
  registers: [register],
});

// 진행 중인 FFmpeg 작업 수
export const ffmpegJobsActive = new Gauge({
  name: 'vrewcraft_ffmpeg_jobs_active',
  help: 'Number of active FFmpeg jobs',
  registers: [register],
});

// 썸네일 캐시 히트율
export const thumbnailCacheHitRatio = new Gauge({
  name: 'vrewcraft_thumbnail_cache_hit_ratio',
  help: 'Thumbnail cache hit ratio (0-1)',
  registers: [register],
});

// 메모리 사용량 (커스텀)
export const memoryUsageBytes = new Gauge({
  name: 'vrewcraft_memory_usage_bytes',
  help: 'Memory usage in bytes',
  labelNames: ['type'],
  registers: [register],
});

// DB Connection Pool
export const dbPoolConnections = new Gauge({
  name: 'vrewcraft_db_pool_connections',
  help: 'Database connection pool status',
  labelNames: ['state'],
  registers: [register],
});
```

---

### 2.3 메트릭 엔드포인트

```typescript
// backend/src/routes/metrics.ts
import { Router, Request, Response } from 'express';
import { register } from '../metrics/metrics';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

export default router;
```

**서버 통합:**
```typescript
// backend/src/server.ts
import metricsRouter from './routes/metrics';

app.use('/metrics', metricsRouter);
```

**확인:**
```bash
curl http://localhost:3001/metrics

# 출력 예시:
# # HELP vrewcraft_http_requests_total Total number of HTTP requests
# # TYPE vrewcraft_http_requests_total counter
# vrewcraft_http_requests_total{method="GET",route="/api/videos",status_code="200"} 42
```

---

### 2.4 미들웨어 통합

```typescript
// backend/src/middleware/metrics.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { httpRequestsTotal, httpRequestDuration } from '../metrics/metrics';

export function metricsMiddleware(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();

  // Response 종료 시 메트릭 기록
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;

    const labels = {
      method: req.method,
      route: req.route?.path || req.path,
      status_code: res.statusCode.toString(),
    };

    // Counter 증가
    httpRequestsTotal.inc(labels);

    // Histogram 기록
    httpRequestDuration.observe(labels, duration);
  });

  next();
}
```

**적용:**
```typescript
// backend/src/server.ts
import { metricsMiddleware } from './middleware/metrics.middleware';

app.use(metricsMiddleware);
```

---

### 2.5 FFmpeg 메트릭

```typescript
// backend/src/services/ffmpeg.service.ts
import { ffmpegDuration, ffmpegJobsActive, ffmpegErrorsTotal } from '../metrics/metrics';

export class FFmpegService {
  async trimWithProgress(
    videoId: string,
    inputPath: string,
    startTime: number,
    endTime: number
  ): Promise<string> {
    const outputPath = `processed/${videoId}_trimmed.mp4`;
    const startTimer = Date.now();

    // 활성 작업 증가
    ffmpegJobsActive.inc();

    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .setStartTime(startTime)
        .setDuration(endTime - startTime)
        .output(outputPath)
        .on('end', () => {
          // 성공 시 메트릭 기록
          const duration = (Date.now() - startTimer) / 1000;
          ffmpegDuration.observe({ operation: 'trim' }, duration);
          ffmpegJobsActive.dec();

          resolve(outputPath);
        })
        .on('error', (err) => {
          // 실패 시 메트릭 기록
          ffmpegErrorsTotal.inc({ operation: 'trim' });
          ffmpegJobsActive.dec();

          reject(err);
        })
        .run();
    });
  }
}
```

---

### 2.6 썸네일 캐시 메트릭

```typescript
// backend/src/services/thumbnail.service.ts
import { thumbnailDuration, thumbnailRequestsTotal, thumbnailCacheHitRatio } from '../metrics/metrics';

export class ThumbnailService {
  private cacheHits = 0;
  private cacheMisses = 0;

  async extract(videoPath: string, videoId: string, timestamp: number): Promise<Buffer> {
    const cacheKey = this.getCacheKey(videoId, timestamp);
    const startTimer = Date.now();

    try {
      // 캐시 확인
      const cached = await redis.getBuffer(cacheKey);

      if (cached) {
        // 캐시 히트
        this.cacheHits++;
        thumbnailRequestsTotal.inc({ cache_status: 'hit' });
        this.updateCacheHitRatio();

        return cached;
      }

      // 캐시 미스
      this.cacheMisses++;
      thumbnailRequestsTotal.inc({ cache_status: 'miss' });
      this.updateCacheHitRatio();

      // Native Addon 호출
      const buffer = await native.extractThumbnail(videoPath, timestamp);

      // 캐시 저장
      await redis.setBuffer(cacheKey, buffer, this.CACHE_TTL);

      return buffer;

    } finally {
      // 처리 시간 기록
      const duration = (Date.now() - startTimer) / 1000;
      thumbnailDuration.observe(duration);
    }
  }

  private updateCacheHitRatio() {
    const total = this.cacheHits + this.cacheMisses;
    const ratio = total > 0 ? this.cacheHits / total : 0;
    thumbnailCacheHitRatio.set(ratio);
  }
}
```

---

## Part 3: Grafana 대시보드

### 3.1 Grafana 설치

```yaml
# docker-compose.yml (추가)
services:
  grafana:
    image: grafana/grafana:latest
    ports:
      - "3000:3000"
    volumes:
      - grafana_data:/var/lib/grafana
      - ./monitoring/grafana/provisioning:/etc/grafana/provisioning
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
      - GF_USERS_ALLOW_SIGN_UP=false
      - GF_SERVER_ROOT_URL=http://localhost:3000
    depends_on:
      - prometheus
    restart: unless-stopped

volumes:
  grafana_data:
```

**실행:**
```bash
docker-compose up -d grafana

# 접속
open http://localhost:3000
# ID: admin, PW: admin
```

---

### 3.2 Prometheus 데이터 소스 추가

**자동 프로비저닝:**
```yaml
# monitoring/grafana/provisioning/datasources/prometheus.yml
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
    editable: false
```

---

### 3.3 VrewCraft 대시보드

**대시보드 프로비저닝:**
```yaml
# monitoring/grafana/provisioning/dashboards/dashboard.yml
apiVersion: 1

providers:
  - name: 'VrewCraft'
    orgId: 1
    folder: ''
    type: file
    disableDeletion: false
    updateIntervalSeconds: 10
    allowUiUpdates: true
    options:
      path: /etc/grafana/provisioning/dashboards
```

**대시보드 JSON:**
```json
// monitoring/grafana/provisioning/dashboards/vrewcraft.json
{
  "dashboard": {
    "id": null,
    "uid": "vrewcraft-main",
    "title": "VrewCraft Dashboard",
    "tags": ["vrewcraft"],
    "timezone": "browser",
    "schemaVersion": 16,
    "version": 1,
    "refresh": "5s",

    "panels": [
      {
        "id": 1,
        "title": "API Latency (p99)",
        "type": "graph",
        "gridPos": { "x": 0, "y": 0, "w": 12, "h": 8 },
        "targets": [
          {
            "expr": "histogram_quantile(0.99, rate(vrewcraft_http_request_duration_seconds_bucket[5m]))",
            "legendFormat": "p99",
            "refId": "A"
          },
          {
            "expr": "histogram_quantile(0.95, rate(vrewcraft_http_request_duration_seconds_bucket[5m]))",
            "legendFormat": "p95",
            "refId": "B"
          },
          {
            "expr": "histogram_quantile(0.50, rate(vrewcraft_http_request_duration_seconds_bucket[5m]))",
            "legendFormat": "p50",
            "refId": "C"
          }
        ],
        "yaxes": [
          { "format": "s", "label": "Duration" }
        ]
      },

      {
        "id": 2,
        "title": "Thumbnail Extraction (p99)",
        "type": "graph",
        "gridPos": { "x": 12, "y": 0, "w": 12, "h": 8 },
        "targets": [
          {
            "expr": "histogram_quantile(0.99, rate(vrewcraft_thumbnail_duration_seconds_bucket[5m]))",
            "legendFormat": "p99",
            "refId": "A"
          }
        ],
        "alert": {
          "conditions": [
            {
              "evaluator": { "params": [0.05], "type": "gt" },
              "query": { "params": ["A", "5m", "now"] },
              "reducer": { "type": "avg" },
              "type": "query"
            }
          ],
          "name": "Thumbnail p99 > 50ms"
        }
      },

      {
        "id": 3,
        "title": "Request Rate",
        "type": "graph",
        "gridPos": { "x": 0, "y": 8, "w": 12, "h": 8 },
        "targets": [
          {
            "expr": "sum(rate(vrewcraft_http_requests_total[5m])) by (route)",
            "legendFormat": "{{route}}",
            "refId": "A"
          }
        ]
      },

      {
        "id": 4,
        "title": "Cache Hit Ratio",
        "type": "gauge",
        "gridPos": { "x": 12, "y": 8, "w": 6, "h": 8 },
        "targets": [
          {
            "expr": "vrewcraft_thumbnail_cache_hit_ratio",
            "refId": "A"
          }
        ],
        "options": {
          "minValue": 0,
          "maxValue": 1,
          "thresholds": [
            { "value": 0.5, "color": "red" },
            { "value": 0.8, "color": "yellow" },
            { "value": 0.9, "color": "green" }
          ]
        }
      },

      {
        "id": 5,
        "title": "Active FFmpeg Jobs",
        "type": "stat",
        "gridPos": { "x": 18, "y": 8, "w": 6, "h": 8 },
        "targets": [
          {
            "expr": "vrewcraft_ffmpeg_jobs_active",
            "refId": "A"
          }
        ]
      },

      {
        "id": 6,
        "title": "Memory Usage",
        "type": "graph",
        "gridPos": { "x": 0, "y": 16, "w": 12, "h": 8 },
        "targets": [
          {
            "expr": "process_resident_memory_bytes{job='vrewcraft-backend'}",
            "legendFormat": "RSS",
            "refId": "A"
          },
          {
            "expr": "nodejs_heap_size_used_bytes{job='vrewcraft-backend'}",
            "legendFormat": "Heap Used",
            "refId": "B"
          }
        ],
        "yaxes": [
          { "format": "bytes" }
        ]
      },

      {
        "id": 7,
        "title": "Error Rate",
        "type": "graph",
        "gridPos": { "x": 12, "y": 16, "w": 12, "h": 8 },
        "targets": [
          {
            "expr": "sum(rate(vrewcraft_http_requests_total{status_code=~\"5..\"}[5m]))",
            "legendFormat": "5xx Errors",
            "refId": "A"
          },
          {
            "expr": "sum(rate(vrewcraft_ffmpeg_errors_total[5m]))",
            "legendFormat": "FFmpeg Errors",
            "refId": "B"
          }
        ]
      }
    ]
  }
}
```

---

### 3.4 주요 PromQL 쿼리

```promql
# === API 성능 ===

# API p99 지연 시간 (전체)
histogram_quantile(0.99, rate(vrewcraft_http_request_duration_seconds_bucket[5m]))

# 특정 라우트 p99
histogram_quantile(0.99, rate(vrewcraft_http_request_duration_seconds_bucket{route="/api/upload"}[5m]))

# 요청률 (req/s)
rate(vrewcraft_http_requests_total[5m])

# 에러율
sum(rate(vrewcraft_http_requests_total{status_code=~"5.."}[5m])) / sum(rate(vrewcraft_http_requests_total[5m]))

# === 썸네일 성능 ===

# 썸네일 p99 (목표: < 50ms)
histogram_quantile(0.99, rate(vrewcraft_thumbnail_duration_seconds_bucket[5m]))

# 캐시 히트율
vrewcraft_thumbnail_cache_hit_ratio

# 썸네일 요청률
rate(vrewcraft_thumbnail_requests_total[5m])

# === FFmpeg 성능 ===

# Trim 평균 처리 시간
rate(vrewcraft_ffmpeg_duration_seconds_sum{operation="trim"}[5m]) / rate(vrewcraft_ffmpeg_duration_seconds_count{operation="trim"}[5m])

# FFmpeg 에러율
rate(vrewcraft_ffmpeg_errors_total[5m])

# 활성 작업 수
vrewcraft_ffmpeg_jobs_active

# === 시스템 리소스 ===

# 메모리 사용량
process_resident_memory_bytes

# CPU 사용률
rate(process_cpu_seconds_total[5m]) * 100

# Node.js Heap
nodejs_heap_size_used_bytes / nodejs_heap_size_total_bytes

# === Database ===

# Connection Pool (Total)
vrewcraft_db_pool_connections{state="total"}

# Connection Pool (Idle)
vrewcraft_db_pool_connections{state="idle"}

# === WebSocket ===

# 활성 연결 수
vrewcraft_websocket_connections
```

---

## Part 4: 알림 설정

### 4.1 Alertmanager 설정

```yaml
# docker-compose.yml (추가)
services:
  alertmanager:
    image: prom/alertmanager:latest
    ports:
      - "9093:9093"
    volumes:
      - ./monitoring/alertmanager/alertmanager.yml:/etc/alertmanager/alertmanager.yml
    command:
      - '--config.file=/etc/alertmanager/alertmanager.yml'
    restart: unless-stopped
```

**설정:**
```yaml
# monitoring/alertmanager/alertmanager.yml
global:
  smtp_smarthost: 'smtp.gmail.com:587'
  smtp_from: 'alerts@vrewcraft.com'
  smtp_auth_username: 'alerts@vrewcraft.com'
  smtp_auth_password: 'password'

route:
  receiver: 'email'
  group_by: ['alertname']
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 4h

receivers:
  - name: 'email'
    email_configs:
      - to: 'team@vrewcraft.com'
        headers:
          Subject: '[VrewCraft] {{ .GroupLabels.alertname }}'

  - name: 'slack'
    slack_configs:
      - api_url: 'https://hooks.slack.com/services/XXX'
        channel: '#vrewcraft-alerts'
        title: '{{ .GroupLabels.alertname }}'
        text: '{{ range .Alerts }}{{ .Annotations.summary }}{{ end }}'
```

---

### 4.2 알림 규칙

```yaml
# monitoring/prometheus/alerts.yml
groups:
  - name: vrewcraft_alerts
    interval: 30s
    rules:
      # API p99 > 200ms
      - alert: HighAPILatency
        expr: histogram_quantile(0.99, rate(vrewcraft_http_request_duration_seconds_bucket[5m])) > 0.2
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High API latency detected"
          description: "API p99 latency is {{ $value }}s (threshold: 0.2s)"

      # 썸네일 p99 > 50ms
      - alert: HighThumbnailLatency
        expr: histogram_quantile(0.99, rate(vrewcraft_thumbnail_duration_seconds_bucket[5m])) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Thumbnail extraction too slow"
          description: "Thumbnail p99 is {{ $value }}s (threshold: 0.05s)"

      # 에러율 > 5%
      - alert: HighErrorRate
        expr: sum(rate(vrewcraft_http_requests_total{status_code=~"5.."}[5m])) / sum(rate(vrewcraft_http_requests_total[5m])) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate"
          description: "Error rate is {{ $value | humanizePercentage }}"

      # 메모리 사용량 > 1GB
      - alert: HighMemoryUsage
        expr: process_resident_memory_bytes > 1073741824
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "High memory usage"
          description: "Memory usage is {{ $value | humanize1024 }}B"

      # FFmpeg 에러 급증
      - alert: FFmpegErrorSpike
        expr: rate(vrewcraft_ffmpeg_errors_total[5m]) > 0.1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "FFmpeg error spike detected"
          description: "FFmpeg error rate: {{ $value }}/s"

      # 캐시 히트율 < 80%
      - alert: LowCacheHitRatio
        expr: vrewcraft_thumbnail_cache_hit_ratio < 0.8
        for: 10m
        labels:
          severity: info
        annotations:
          summary: "Low cache hit ratio"
          description: "Cache hit ratio is {{ $value | humanizePercentage }}"
```

**Prometheus 설정 업데이트:**
```yaml
# monitoring/prometheus/prometheus.yml (추가)
rule_files:
  - '/etc/prometheus/alerts.yml'

alerting:
  alertmanagers:
    - static_configs:
        - targets: ['alertmanager:9093']
```

---

## 🎯 실전 체크리스트

### Prometheus
- [ ] Prometheus 설치 및 실행
- [ ] prom-client 설정
- [ ] 메트릭 정의 (Counter, Histogram, Gauge)
- [ ] /metrics 엔드포인트 노출
- [ ] 미들웨어 통합

### Grafana
- [ ] Grafana 설치
- [ ] Prometheus 데이터 소스 추가
- [ ] VrewCraft 대시보드 생성
- [ ] 주요 패널 (API, 썸네일, FFmpeg, 메모리)
- [ ] 자동 새로고침 (5초)

### 알림
- [ ] Alertmanager 설정
- [ ] 알림 규칙 정의
- [ ] 이메일/Slack 통합
- [ ] 알림 테스트

### 메트릭
- [ ] API 지연 시간 (p99 < 200ms)
- [ ] 썸네일 성능 (p99 < 50ms)
- [ ] 캐시 히트율 (> 80%)
- [ ] 메모리 사용량
- [ ] 에러율

---

## 📚 면접 예상 질문

### 기초
1. **Prometheus vs Graphite 차이는?**
   - Prometheus: Pull, PromQL, 알림
   - Graphite: Push, 시계열 저장

2. **Counter vs Gauge 차이는?**
   - Counter: 증가만
   - Gauge: 증가/감소

3. **Histogram이란?**
   - 분포 측정 (버킷 기반)

4. **PromQL이란?**
   - Prometheus Query Language

5. **Grafana 역할은?**
   - 시각화 대시보드

### 심화
6. **p99가 중요한 이유는?**
   - 꼬리 지연(Tail Latency) 확인

7. **Histogram vs Summary 차이는?**
   - Histogram: 서버 계산 (더 정확)
   - Summary: 클라이언트 계산 (부하 적음)

8. **메트릭 Label 규칙은?**
   - 카디널리티 주의 (너무 많으면 성능 저하)

9. **Alert Fatigue 방지는?**
   - 임계값 적절히 설정, 그룹화

10. **Pull vs Push 방식 장단점은?**
    - Pull: 서버 부하 분산, 일관성
    - Push: 단기 작업 적합

---

**다음 문서**: [87-testing-strategy.md](87-testing-strategy.md) - 테스팅
