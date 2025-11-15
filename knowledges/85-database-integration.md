# Database 통합 (PostgreSQL + Redis)

**목표**: PostgreSQL과 Redis를 VrewCraft에 통합 (Arena60 M1.8, M1.10 패턴)
**난이도**: ⭐⭐⭐☆☆ (중급)
**예상 시간**: 5-6시간 (정독 + 실습)
**선행 과정**: [91-nodejs-express-backend.md](91-nodejs-express-backend.md)

---

## 📋 목차

1. [PostgreSQL 연동](#part-1-postgresql-연동)
2. [Redis 캐싱](#part-2-redis-캐싱)
3. [트랜잭션 관리](#part-3-트랜잭션-관리)
4. [성능 최적화](#part-4-성능-최적화)

---

## Part 1: PostgreSQL 연동

### 1.1 PostgreSQL이란?

```
PostgreSQL = 오픈소스 관계형 데이터베이스

VrewCraft 사용 사례:
✅ 프로젝트 저장 (비디오 메타데이터)
✅ 편집 히스토리 (Trim, Split, Subtitle)
✅ 사용자 세션 (선택)
✅ 트랜잭션 지원 (원자성)

Arena60 패턴 (M1.10):
- Connection Pooling
- Parameterized Queries (SQL Injection 방지)
- Migration Scripts
- 트랜잭션 관리
```

---

### 1.2 설치 및 연결

```bash
# Docker로 PostgreSQL 실행 (권장)
docker run -d \
  --name vrewcraft-postgres \
  -e POSTGRES_DB=vrewcraft \
  -e POSTGRES_USER=admin \
  -e POSTGRES_PASSWORD=password \
  -p 5432:5432 \
  postgres:15-alpine

# 연결 확인
psql -h localhost -U admin -d vrewcraft
# Password: password

# 테이블 확인
\dt
```

**Node.js 패키지 설치:**
```bash
cd backend
npm install pg
npm install -D @types/pg
```

---

### 1.3 Connection Pool 설정

```typescript
// backend/src/db/postgres.ts
import { Pool, PoolClient, QueryResult } from 'pg';

interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  max?: number;          // 최대 연결 수
  idleTimeoutMillis?: number;
  connectionTimeoutMillis?: number;
}

class PostgresDatabase {
  private pool: Pool;

  constructor(config: DatabaseConfig) {
    this.pool = new Pool({
      host: config.host || 'localhost',
      port: config.port || 5432,
      database: config.database,
      user: config.user,
      password: config.password,
      max: config.max || 20,                      // 최대 20개 연결
      idleTimeoutMillis: config.idleTimeoutMillis || 30000,
      connectionTimeoutMillis: config.connectionTimeoutMillis || 2000,
    });

    // 에러 핸들링
    this.pool.on('error', (err) => {
      console.error('Unexpected database error:', err);
    });

    console.log('PostgreSQL connection pool created');
  }

  // 쿼리 실행
  async query<T = any>(
    text: string,
    params?: any[]
  ): Promise<QueryResult<T>> {
    const start = Date.now();
    try {
      const result = await this.pool.query<T>(text, params);
      const duration = Date.now() - start;

      console.log('Query executed', { text, duration, rows: result.rowCount });

      return result;
    } catch (error) {
      console.error('Query error:', { text, params, error });
      throw error;
    }
  }

  // 트랜잭션용 클라이언트 가져오기
  async getClient(): Promise<PoolClient> {
    return await this.pool.connect();
  }

  // Pool 종료
  async close(): Promise<void> {
    await this.pool.end();
    console.log('PostgreSQL connection pool closed');
  }
}

// Singleton 인스턴스
export const db = new PostgresDatabase({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'vrewcraft',
  user: process.env.DB_USER || 'admin',
  password: process.env.DB_PASSWORD || 'password',
});
```

---

### 1.4 스키마 설계

```sql
-- migrations/001_initial_schema.sql

-- 비디오 테이블
CREATE TABLE IF NOT EXISTS videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename VARCHAR(255) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  mime_type VARCHAR(100),

  -- 메타데이터
  duration DECIMAL(10, 2),      -- 초 단위
  codec VARCHAR(50),
  resolution VARCHAR(20),       -- 1920x1080
  bitrate INTEGER,              -- kbps
  fps DECIMAL(5, 2),

  -- 타임스탬프
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- 인덱스
  CONSTRAINT videos_filename_unique UNIQUE (filename)
);

CREATE INDEX idx_videos_uploaded_at ON videos(uploaded_at DESC);

-- 프로젝트 테이블
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  video_id UUID REFERENCES videos(id) ON DELETE CASCADE,

  -- 편집 상태
  timeline_data JSONB,           -- Timeline 구조
  edits JSONB,                   -- 편집 히스토리

  -- 타임스탬프
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_projects_video_id ON projects(video_id);
CREATE INDEX idx_projects_updated_at ON projects(updated_at DESC);

-- 편집 히스토리 테이블
CREATE TABLE IF NOT EXISTS edit_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,

  -- 편집 타입
  edit_type VARCHAR(50) NOT NULL,  -- trim, split, subtitle, speed

  -- 파라미터 (JSON)
  params JSONB NOT NULL,

  -- 결과
  output_path TEXT,
  status VARCHAR(20) DEFAULT 'pending',  -- pending, processing, complete, error
  error_message TEXT,

  -- 타임스탬프
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP
);

CREATE INDEX idx_edit_history_project_id ON edit_history(project_id);
CREATE INDEX idx_edit_history_status ON edit_history(status);

-- 썸네일 캐시 메타데이터 (Redis 보조)
CREATE TABLE IF NOT EXISTS thumbnail_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
  timestamp DECIMAL(10, 2) NOT NULL,

  -- 썸네일 정보
  redis_key VARCHAR(255) NOT NULL,
  width INTEGER,
  height INTEGER,

  -- 캐시 TTL 추적
  cached_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP,

  CONSTRAINT thumbnail_unique UNIQUE (video_id, timestamp)
);

CREATE INDEX idx_thumbnail_video_id ON thumbnail_metadata(video_id);
```

---

### 1.5 마이그레이션 실행

```typescript
// backend/src/db/migrate.ts
import { db } from './postgres';
import fs from 'fs/promises';
import path from 'path';

async function runMigrations() {
  const migrationsDir = path.join(__dirname, '../../migrations');
  const files = await fs.readdir(migrationsDir);

  // 파일명 정렬 (001_, 002_, ...)
  const sqlFiles = files
    .filter(f => f.endsWith('.sql'))
    .sort();

  for (const file of sqlFiles) {
    console.log(`Running migration: ${file}`);

    const filePath = path.join(migrationsDir, file);
    const sql = await fs.readFile(filePath, 'utf-8');

    try {
      await db.query(sql);
      console.log(`✅ ${file} completed`);
    } catch (error) {
      console.error(`❌ ${file} failed:`, error);
      throw error;
    }
  }

  console.log('All migrations completed');
}

// 실행
if (require.main === module) {
  runMigrations()
    .then(() => process.exit(0))
    .catch(err => {
      console.error(err);
      process.exit(1);
    });
}
```

**실행:**
```bash
npm run migrate
# 또는
ts-node backend/src/db/migrate.ts
```

---

### 1.6 Video Service 구현

```typescript
// backend/src/services/video.service.ts
import { db } from '../db/postgres';
import { QueryResult } from 'pg';

export interface Video {
  id: string;
  filename: string;
  originalName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  duration?: number;
  codec?: string;
  resolution?: string;
  bitrate?: number;
  fps?: number;
  uploadedAt: Date;
  updatedAt: Date;
}

export class VideoService {
  // 비디오 저장
  async save(videoData: Partial<Video>): Promise<Video> {
    const query = `
      INSERT INTO videos (
        filename, original_name, file_path, file_size, mime_type,
        duration, codec, resolution, bitrate, fps
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;

    const params = [
      videoData.filename,
      videoData.originalName,
      videoData.filePath,
      videoData.fileSize,
      videoData.mimeType,
      videoData.duration,
      videoData.codec,
      videoData.resolution,
      videoData.bitrate,
      videoData.fps,
    ];

    const result: QueryResult<Video> = await db.query(query, params);
    return result.rows[0];
  }

  // 비디오 조회 (ID)
  async findById(id: string): Promise<Video | null> {
    const query = 'SELECT * FROM videos WHERE id = $1';
    const result: QueryResult<Video> = await db.query(query, [id]);

    return result.rows[0] || null;
  }

  // 비디오 목록 조회 (페이지네이션)
  async findAll(limit = 20, offset = 0): Promise<Video[]> {
    const query = `
      SELECT * FROM videos
      ORDER BY uploaded_at DESC
      LIMIT $1 OFFSET $2
    `;

    const result: QueryResult<Video> = await db.query(query, [limit, offset]);
    return result.rows;
  }

  // 비디오 삭제
  async delete(id: string): Promise<boolean> {
    const query = 'DELETE FROM videos WHERE id = $1 RETURNING id';
    const result = await db.query(query, [id]);

    return result.rowCount !== null && result.rowCount > 0;
  }

  // 메타데이터 업데이트
  async updateMetadata(
    id: string,
    metadata: Partial<Pick<Video, 'duration' | 'codec' | 'resolution' | 'bitrate' | 'fps'>>
  ): Promise<Video | null> {
    const query = `
      UPDATE videos
      SET
        duration = COALESCE($2, duration),
        codec = COALESCE($3, codec),
        resolution = COALESCE($4, resolution),
        bitrate = COALESCE($5, bitrate),
        fps = COALESCE($6, fps),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;

    const params = [
      id,
      metadata.duration,
      metadata.codec,
      metadata.resolution,
      metadata.bitrate,
      metadata.fps,
    ];

    const result: QueryResult<Video> = await db.query(query, params);
    return result.rows[0] || null;
  }
}
```

---

## Part 2: Redis 캐싱

### 2.1 Redis란?

```
Redis = In-Memory Key-Value Store

VrewCraft 사용 사례:
✅ 썸네일 캐싱 (p99 < 50ms)
✅ 세션 관리 (WebSocket)
✅ 임시 데이터 저장
✅ Rate Limiting (선택)

Arena60 패턴 (M1.8):
- TTL 설정 (자동 만료)
- Pub/Sub (실시간 알림)
- 캐시 전략 (Cache-Aside)
```

---

### 2.2 Redis 연결

```bash
# Docker로 Redis 실행
docker run -d \
  --name vrewcraft-redis \
  -p 6379:6379 \
  redis:7-alpine redis-server --appendonly yes

# 연결 확인
redis-cli ping
# PONG
```

**Node.js 패키지 설치:**
```bash
cd backend
npm install redis
npm install -D @types/redis
```

---

### 2.3 Redis Client 설정

```typescript
// backend/src/db/redis.ts
import { createClient, RedisClientType } from 'redis';

class RedisCache {
  private client: RedisClientType;
  private connected: boolean = false;

  constructor() {
    this.client = createClient({
      socket: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
      },
      password: process.env.REDIS_PASSWORD || undefined,
    });

    // 에러 핸들링
    this.client.on('error', (err) => {
      console.error('Redis error:', err);
    });

    this.client.on('connect', () => {
      console.log('Redis connected');
      this.connected = true;
    });

    this.client.on('disconnect', () => {
      console.log('Redis disconnected');
      this.connected = false;
    });
  }

  // 연결
  async connect(): Promise<void> {
    if (!this.connected) {
      await this.client.connect();
    }
  }

  // 값 저장 (TTL 지원)
  async set(key: string, value: string, ttl?: number): Promise<void> {
    if (ttl) {
      await this.client.setEx(key, ttl, value);
    } else {
      await this.client.set(key, value);
    }
  }

  // 값 조회
  async get(key: string): Promise<string | null> {
    return await this.client.get(key);
  }

  // 값 삭제
  async del(key: string): Promise<number> {
    return await this.client.del(key);
  }

  // 존재 여부 확인
  async exists(key: string): Promise<boolean> {
    const result = await this.client.exists(key);
    return result === 1;
  }

  // TTL 조회
  async ttl(key: string): Promise<number> {
    return await this.client.ttl(key);
  }

  // Buffer 저장 (이미지 등)
  async setBuffer(key: string, value: Buffer, ttl?: number): Promise<void> {
    if (ttl) {
      await this.client.setEx(key, ttl, value);
    } else {
      await this.client.set(key, value);
    }
  }

  // Buffer 조회
  async getBuffer(key: string): Promise<Buffer | null> {
    const result = await this.client.getBuffer(key);
    return result;
  }

  // 연결 종료
  async disconnect(): Promise<void> {
    await this.client.disconnect();
  }
}

// Singleton
export const redis = new RedisCache();

// 초기화
export async function initRedis(): Promise<void> {
  await redis.connect();
}
```

---

### 2.4 썸네일 캐싱 구현

```typescript
// backend/src/services/thumbnail.service.ts
import { redis } from '../db/redis';
import native from '../../native/build/Release/native';

export class ThumbnailService {
  private readonly CACHE_TTL = 3600; // 1시간
  private readonly CACHE_PREFIX = 'thumbnail:';

  // 캐시 키 생성
  private getCacheKey(videoId: string, timestamp: number): string {
    return `${this.CACHE_PREFIX}${videoId}:${timestamp}`;
  }

  // 썸네일 추출 (캐싱)
  async extract(
    videoPath: string,
    videoId: string,
    timestamp: number
  ): Promise<Buffer> {
    const cacheKey = this.getCacheKey(videoId, timestamp);

    // 1. 캐시 확인
    const cached = await redis.getBuffer(cacheKey);
    if (cached) {
      console.log('Thumbnail cache hit:', cacheKey);
      return cached;
    }

    // 2. 캐시 미스 → Native Addon 호출
    console.log('Thumbnail cache miss:', cacheKey);
    const buffer = await native.extractThumbnail(videoPath, timestamp);

    // 3. 캐시 저장
    await redis.setBuffer(cacheKey, buffer, this.CACHE_TTL);

    return buffer;
  }

  // 캐시 무효화
  async invalidate(videoId: string): Promise<void> {
    // 패턴 매칭으로 모든 썸네일 삭제
    // Redis SCAN 사용 (KEYS는 프로덕션에서 위험)
    const pattern = `${this.CACHE_PREFIX}${videoId}:*`;

    // 구현 간략화 (실제로는 SCAN 사용)
    console.log(`Invalidating thumbnails for video: ${videoId}`);
    // TODO: SCAN으로 키 찾아서 DEL
  }
}
```

**라우트 통합:**
```typescript
// backend/src/routes/thumbnail.ts
import { Router } from 'express';
import { ThumbnailService } from '../services/thumbnail.service';
import { VideoService } from '../services/video.service';

const router = Router();
const thumbnailService = new ThumbnailService();
const videoService = new VideoService();

router.get('/', async (req, res) => {
  try {
    const { videoId, timestamp } = req.query;

    if (!videoId || !timestamp) {
      return res.status(400).json({ error: 'Missing parameters' });
    }

    const video = await videoService.findById(videoId as string);
    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }

    const t = parseFloat(timestamp as string);
    const buffer = await thumbnailService.extract(video.filePath, videoId as string, t);

    res.set('Content-Type', 'image/jpeg');
    res.set('Cache-Control', 'public, max-age=3600');
    res.send(buffer);

  } catch (error) {
    console.error('Thumbnail error:', error);
    res.status(500).json({ error: 'Thumbnail extraction failed' });
  }
});

export default router;
```

---

## Part 3: 트랜잭션 관리

### 3.1 트랜잭션이란?

```
트랜잭션 = 원자성을 보장하는 작업 단위

ACID 속성:
- Atomicity: 전부 성공 또는 전부 실패
- Consistency: 데이터 무결성 유지
- Isolation: 동시 실행 시 격리
- Durability: 영구 저장

VrewCraft 사용 사례:
- 비디오 + 프로젝트 동시 생성
- 편집 히스토리 + 결과 저장
- 다중 테이블 업데이트
```

---

### 3.2 트랜잭션 구현

```typescript
// backend/src/services/project.service.ts
import { db } from '../db/postgres';
import { PoolClient } from 'pg';

export interface Project {
  id: string;
  name: string;
  videoId: string;
  timelineData: any;
  edits: any[];
  createdAt: Date;
  updatedAt: Date;
}

export class ProjectService {
  // 프로젝트 생성 (트랜잭션)
  async create(
    name: string,
    videoId: string,
    initialTimeline: any
  ): Promise<Project> {
    const client: PoolClient = await db.getClient();

    try {
      // 트랜잭션 시작
      await client.query('BEGIN');

      // 1. 비디오 존재 확인
      const videoCheck = await client.query(
        'SELECT id FROM videos WHERE id = $1',
        [videoId]
      );

      if (videoCheck.rowCount === 0) {
        throw new Error('Video not found');
      }

      // 2. 프로젝트 생성
      const projectResult = await client.query(
        `INSERT INTO projects (name, video_id, timeline_data, edits)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [name, videoId, JSON.stringify(initialTimeline), JSON.stringify([])]
      );

      const project = projectResult.rows[0];

      // 3. 초기 편집 히스토리 생성
      await client.query(
        `INSERT INTO edit_history (project_id, edit_type, params, status)
         VALUES ($1, $2, $3, $4)`,
        [project.id, 'init', JSON.stringify({}), 'complete']
      );

      // 커밋
      await client.query('COMMIT');

      return project;

    } catch (error) {
      // 롤백
      await client.query('ROLLBACK');
      console.error('Transaction error:', error);
      throw error;

    } finally {
      // 클라이언트 반환
      client.release();
    }
  }

  // 편집 추가 (트랜잭션)
  async addEdit(
    projectId: string,
    editType: string,
    params: any,
    outputPath?: string
  ): Promise<void> {
    const client = await db.getClient();

    try {
      await client.query('BEGIN');

      // 1. 편집 히스토리 추가
      const editResult = await client.query(
        `INSERT INTO edit_history (project_id, edit_type, params, output_path, status)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        [projectId, editType, JSON.stringify(params), outputPath, 'complete']
      );

      const editId = editResult.rows[0].id;

      // 2. 프로젝트 edits 배열 업데이트
      await client.query(
        `UPDATE projects
         SET
           edits = edits || $1::jsonb,
           updated_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [JSON.stringify({ editId, editType, params }), projectId]
      );

      await client.query('COMMIT');

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}
```

---

## Part 4: 성능 최적화

### 4.1 인덱스 전략

```sql
-- 자주 조회되는 컬럼에 인덱스 추가

-- 비디오 업로드 시간 (최신순 정렬)
CREATE INDEX idx_videos_uploaded_at ON videos(uploaded_at DESC);

-- 프로젝트 검색
CREATE INDEX idx_projects_video_id ON projects(video_id);
CREATE INDEX idx_projects_updated_at ON projects(updated_at DESC);

-- 편집 히스토리 필터링
CREATE INDEX idx_edit_history_status ON edit_history(status);
CREATE INDEX idx_edit_history_project_id ON edit_history(project_id);

-- 복합 인덱스 (썸네일)
CREATE INDEX idx_thumbnail_video_timestamp ON thumbnail_metadata(video_id, timestamp);
```

---

### 4.2 쿼리 최적화

```typescript
// ❌ N+1 쿼리 문제
async function getProjectsWithVideos_BAD(limit: number) {
  const projects = await db.query(
    'SELECT * FROM projects LIMIT $1',
    [limit]
  );

  // N번 추가 쿼리 발생!
  for (const project of projects.rows) {
    const video = await db.query(
      'SELECT * FROM videos WHERE id = $1',
      [project.video_id]
    );
    project.video = video.rows[0];
  }

  return projects.rows;
}

// ✅ JOIN으로 한 번에 조회
async function getProjectsWithVideos_GOOD(limit: number) {
  const result = await db.query(
    `SELECT
       p.*,
       v.filename, v.duration, v.resolution
     FROM projects p
     LEFT JOIN videos v ON p.video_id = v.id
     ORDER BY p.updated_at DESC
     LIMIT $1`,
    [limit]
  );

  return result.rows;
}
```

---

### 4.3 Connection Pool 모니터링

```typescript
// backend/src/db/postgres.ts (추가)
class PostgresDatabase {
  // ...

  // Pool 상태 확인
  getPoolStatus() {
    return {
      total: this.pool.totalCount,
      idle: this.pool.idleCount,
      waiting: this.pool.waitingCount,
    };
  }
}

// 메트릭 수집 (Prometheus)
import { Gauge } from 'prom-client';

const dbPoolTotal = new Gauge({
  name: 'db_pool_connections_total',
  help: 'Total database connections',
});

const dbPoolIdle = new Gauge({
  name: 'db_pool_connections_idle',
  help: 'Idle database connections',
});

setInterval(() => {
  const status = db.getPoolStatus();
  dbPoolTotal.set(status.total);
  dbPoolIdle.set(status.idle);
}, 5000);
```

---

### 4.4 Redis 캐시 전략

```typescript
// Cache-Aside 패턴
async function getVideoMetadata(videoId: string): Promise<Video> {
  const cacheKey = `video:${videoId}`;

  // 1. 캐시 확인
  const cached = await redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }

  // 2. DB 조회
  const video = await videoService.findById(videoId);
  if (!video) {
    throw new Error('Video not found');
  }

  // 3. 캐시 저장 (10분)
  await redis.set(cacheKey, JSON.stringify(video), 600);

  return video;
}

// Write-Through 패턴
async function updateVideo(videoId: string, updates: Partial<Video>): Promise<Video> {
  const cacheKey = `video:${videoId}`;

  // 1. DB 업데이트
  const updated = await videoService.updateMetadata(videoId, updates);

  // 2. 캐시 업데이트
  await redis.set(cacheKey, JSON.stringify(updated), 600);

  return updated;
}
```

---

## 🎯 실전 체크리스트

### PostgreSQL
- [ ] Connection Pool 설정
- [ ] 스키마 설계 및 마이그레이션
- [ ] VideoService 구현
- [ ] ProjectService 구현
- [ ] 트랜잭션 구현
- [ ] 인덱스 최적화

### Redis
- [ ] Redis Client 연결
- [ ] 썸네일 캐싱 구현
- [ ] TTL 설정 (1시간)
- [ ] 캐시 무효화 로직
- [ ] Buffer 저장/조회

### 성능
- [ ] N+1 쿼리 제거
- [ ] JOIN 최적화
- [ ] 인덱스 추가
- [ ] Connection Pool 모니터링
- [ ] 캐시 히트율 측정

---

## 📚 면접 예상 질문

### 기초
1. **Connection Pool이란?**
   - 연결 재사용, 성능 향상

2. **Parameterized Query를 사용하는 이유는?**
   - SQL Injection 방지

3. **Redis TTL이란?**
   - Time To Live (자동 만료)

4. **트랜잭션 ACID 속성은?**
   - Atomicity, Consistency, Isolation, Durability

5. **Cache-Aside 패턴은?**
   - 캐시 확인 → 미스 시 DB 조회 → 캐시 저장

### 심화
6. **N+1 쿼리 문제란?**
   - 반복문에서 쿼리 발생 → JOIN으로 해결

7. **인덱스 장단점은?**
   - 장점: 조회 빠름, 단점: 쓰기 느림, 공간 사용

8. **Redis vs Memcached 차이는?**
   - Redis: 다양한 자료구조, 영속성
   - Memcached: 단순 Key-Value

9. **트랜잭션 격리 수준은?**
   - Read Uncommitted, Read Committed, Repeatable Read, Serializable

10. **Connection Pool 크기 설정 기준은?**
    - CPU 코어 수, 동시 요청 수, DB 성능

---

**다음 문서**: [86-prometheus-grafana.md](86-prometheus-grafana.md) - 모니터링
