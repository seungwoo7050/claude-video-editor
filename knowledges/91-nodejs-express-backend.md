# Node.js + Express + TypeScript 백엔드

**목표**: RESTful API 서버 구축 및 비디오 파일 처리  
**난이도**: ⭐⭐⭐☆☆ (중급)  
**예상 시간**: 4-5시간 (정독 + 실습)  
**선행 과정**: [20-java-spring-boot.md](../10-backend-phase1/20-java-spring-boot.md)

---

## 📋 목차

1. [Node.js 기초](#part-1-nodejs-기초)
2. [Express 서버 구축](#part-2-express-서버-구축)
3. [파일 업로드 처리](#part-3-파일-업로드-처리)
4. [TypeScript 설정](#part-4-typescript-설정)

---

## Part 1: Node.js 기초

### 1.1 Node.js란?

```
Node.js = Chrome V8 엔진 기반 JavaScript 런타임

특징:
✅ 비동기 I/O (Non-blocking)
✅ 이벤트 기반 (Event Loop)
✅ 싱글 스레드 (Worker Threads 지원)
✅ npm 생태계 (200만+ 패키지)

사용 사례:
- RESTful API 서버
- 실시간 애플리케이션 (WebSocket)
- 마이크로서비스
- CLI 도구
```

---

### 1.2 프로젝트 초기화

```bash
# 프로젝트 생성
mkdir vrewcraft-backend
cd vrewcraft-backend

# package.json 생성
npm init -y

# TypeScript 설정
npm install -D typescript @types/node ts-node nodemon
npx tsc --init

# Express 설치
npm install express
npm install -D @types/express

# 추가 라이브러리
npm install cors dotenv multer
npm install -D @types/cors @types/multer
```

---

### 1.3 프로젝트 구조

```
vrewcraft-backend/
├── src/
│   ├── routes/           # API 라우트
│   │   ├── upload.ts
│   │   ├── edit.ts
│   │   └── projects.ts
│   ├── services/         # 비즈니스 로직
│   │   ├── ffmpeg.service.ts
│   │   ├── storage.service.ts
│   │   └── video.service.ts
│   ├── middleware/       # 미들웨어
│   │   ├── error.ts
│   │   └── logger.ts
│   ├── types/            # TypeScript 타입
│   │   └── video.ts
│   ├── utils/            # 유틸리티
│   │   └── validation.ts
│   └── server.ts         # Entry point
├── uploads/              # 업로드된 파일 (임시)
├── processed/            # 처리된 파일
├── .env                  # 환경 변수
├── tsconfig.json
└── package.json
```

---

### 1.4 tsconfig.json 설정

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "moduleResolution": "node"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

---

### 1.5 package.json 스크립트

```json
{
  "name": "vrewcraft-backend",
  "version": "1.0.0",
  "scripts": {
    "dev": "nodemon --exec ts-node src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "test": "jest"
  }
}
```

---

## Part 2: Express 서버 구축

### 2.1 기본 서버

```typescript
// src/server.ts
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files (processed videos)
app.use('/videos', express.static('processed'));

// Routes
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message
  });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
```

---

### 2.2 환경 변수

```bash
# .env
PORT=3001
NODE_ENV=development

# Storage
UPLOAD_DIR=uploads
PROCESSED_DIR=processed
MAX_FILE_SIZE=524288000  # 500MB

# Database (optional)
DATABASE_URL=postgresql://user:pass@localhost:5432/vrewcraft

# Redis (optional)
REDIS_URL=redis://localhost:6379
```

**사용**:
```typescript
const PORT = process.env.PORT || 3001;
const uploadDir = process.env.UPLOAD_DIR || 'uploads';
```

---

### 2.3 Middleware

#### Logger Middleware

```typescript
// src/middleware/logger.ts
import { Request, Response, NextFunction } from 'express';

export function loggerMiddleware(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(
      `[${new Date().toISOString()}] ${req.method} ${req.path} ${res.statusCode} ${duration}ms`
    );
  });
  
  next();
}
```

#### Error Handler

```typescript
// src/middleware/error.ts
import { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: err.message
    });
  }
  
  console.error('Unexpected error:', err);
  res.status(500).json({
    error: 'Internal Server Error'
  });
}
```

---

### 2.4 라우팅

```typescript
// src/server.ts (updated)
import express from 'express';
import { loggerMiddleware } from './middleware/logger';
import { errorHandler } from './middleware/error';
import uploadRouter from './routes/upload';
import editRouter from './routes/edit';
import projectsRouter from './routes/projects';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(loggerMiddleware);

// Routes
app.use('/api/upload', uploadRouter);
app.use('/api/edit', editRouter);
app.use('/api/projects', projectsRouter);

// Error handling
app.use(errorHandler);

export default app;
```

---

## Part 3: 파일 업로드 처리

### 3.1 Multer 설정

```typescript
// src/routes/upload.ts
import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const filename = `${uuidv4()}${ext}`;
    cb(null, filename);
  }
});

// File filter
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimes = ['video/mp4', 'video/quicktime', 'video/x-msvideo'];
  
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only MP4, MOV, AVI allowed.'));
  }
};

// Multer instance
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '524288000') // 500MB
  }
});

// Upload endpoint
router.post('/', upload.single('video'), async (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  
  const videoInfo = {
    id: path.parse(req.file.filename).name,
    filename: req.file.originalname,
    path: req.file.path,
    size: req.file.size,
    mimetype: req.file.mimetype,
    url: `/videos/${req.file.filename}`
  };
  
  res.json(videoInfo);
});

export default router;
```

---

### 3.2 타입 정의

```typescript
// src/types/video.ts
export interface VideoInfo {
  id: string;
  filename: string;
  path: string;
  size: number;
  mimetype: string;
  url: string;
  duration?: number;
  resolution?: string;
  codec?: string;
}

export interface EditRequest {
  type: 'trim' | 'split' | 'subtitle' | 'speed';
  videoId: string;
  params: TrimParams | SplitParams | SubtitleParams | SpeedParams;
}

export interface TrimParams {
  startTime: number;
  endTime: number;
}

export interface SplitParams {
  splitTime: number;
}

export interface SubtitleParams {
  text: string;
  startTime: number;
  duration: number;
  position?: 'top' | 'center' | 'bottom';
}

export interface SpeedParams {
  speed: number;  // 0.5, 1, 1.5, 2
}
```

---

### 3.3 유효성 검증

```typescript
// src/utils/validation.ts
import { TrimParams, SplitParams, SubtitleParams, SpeedParams } from '../types/video';

export function validateTrimParams(params: any): TrimParams {
  const { startTime, endTime } = params;
  
  if (typeof startTime !== 'number' || typeof endTime !== 'number') {
    throw new Error('startTime and endTime must be numbers');
  }
  
  if (startTime < 0 || endTime <= startTime) {
    throw new Error('Invalid time range');
  }
  
  return { startTime, endTime };
}

export function validateSpeedParams(params: any): SpeedParams {
  const { speed } = params;
  
  if (typeof speed !== 'number') {
    throw new Error('speed must be a number');
  }
  
  const allowedSpeeds = [0.5, 1, 1.5, 2];
  if (!allowedSpeeds.includes(speed)) {
    throw new Error('speed must be one of: 0.5, 1, 1.5, 2');
  }
  
  return { speed };
}

export function validateSubtitleParams(params: any): SubtitleParams {
  const { text, startTime, duration, position = 'bottom' } = params;
  
  if (typeof text !== 'string' || text.length === 0) {
    throw new Error('text must be a non-empty string');
  }
  
  if (typeof startTime !== 'number' || startTime < 0) {
    throw new Error('startTime must be a positive number');
  }
  
  if (typeof duration !== 'number' || duration <= 0) {
    throw new Error('duration must be a positive number');
  }
  
  const allowedPositions = ['top', 'center', 'bottom'];
  if (!allowedPositions.includes(position)) {
    throw new Error('position must be one of: top, center, bottom');
  }
  
  return { text, startTime, duration, position };
}
```

---

## Part 4: TypeScript 설정

### 4.1 고급 타입

#### Utility Types

```typescript
// Partial (모든 속성 optional)
type PartialVideo = Partial<VideoInfo>;
// { id?: string, filename?: string, ... }

// Required (모든 속성 required)
type RequiredVideo = Required<VideoInfo>;

// Pick (특정 속성만 선택)
type VideoBasic = Pick<VideoInfo, 'id' | 'filename'>;
// { id: string, filename: string }

// Omit (특정 속성 제외)
type VideoWithoutPath = Omit<VideoInfo, 'path'>;

// Record (키-값 맵)
type VideoCache = Record<string, VideoInfo>;
// { [key: string]: VideoInfo }
```

---

#### 실전 예시

```typescript
// src/services/video.service.ts
import { VideoInfo } from '../types/video';

export class VideoService {
  private videos: Map<string, VideoInfo> = new Map();
  
  // Create
  save(video: VideoInfo): void {
    this.videos.set(video.id, video);
  }
  
  // Read
  findById(id: string): VideoInfo | undefined {
    return this.videos.get(id);
  }
  
  // Update
  update(id: string, updates: Partial<VideoInfo>): VideoInfo | null {
    const video = this.videos.get(id);
    if (!video) return null;
    
    const updated = { ...video, ...updates };
    this.videos.set(id, updated);
    return updated;
  }
  
  // Delete
  delete(id: string): boolean {
    return this.videos.delete(id);
  }
  
  // List
  findAll(): VideoInfo[] {
    return Array.from(this.videos.values());
  }
}
```

---

### 4.2 Async/Await

```typescript
// src/services/storage.service.ts
import fs from 'fs/promises';
import path from 'path';

export class StorageService {
  private uploadDir: string;
  private processedDir: string;
  
  constructor() {
    this.uploadDir = process.env.UPLOAD_DIR || 'uploads';
    this.processedDir = process.env.PROCESSED_DIR || 'processed';
  }
  
  async ensureDirectories(): Promise<void> {
    await fs.mkdir(this.uploadDir, { recursive: true });
    await fs.mkdir(this.processedDir, { recursive: true });
  }
  
  async getFileSize(filePath: string): Promise<number> {
    const stats = await fs.stat(filePath);
    return stats.size;
  }
  
  async deleteFile(filePath: string): Promise<void> {
    try {
      await fs.unlink(filePath);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw err;
      }
    }
  }
  
  async copyFile(src: string, dest: string): Promise<void> {
    await fs.copyFile(src, dest);
  }
  
  async readFile(filePath: string): Promise<Buffer> {
    return fs.readFile(filePath);
  }
}
```

---

### 4.3 Error Handling

```typescript
// src/routes/edit.ts
import { Router, Request, Response, NextFunction } from 'express';
import { AppError } from '../middleware/error';
import { validateTrimParams } from '../utils/validation';
import { VideoService } from '../services/video.service';
import { FFmpegService } from '../services/ffmpeg.service';

const router = Router();
const videoService = new VideoService();
const ffmpegService = new FFmpegService();

router.post('/trim', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { videoId, params } = req.body;
    
    // Validate
    if (!videoId) {
      throw new AppError(400, 'videoId is required');
    }
    
    const trimParams = validateTrimParams(params);
    
    // Get video
    const video = videoService.findById(videoId);
    if (!video) {
      throw new AppError(404, 'Video not found');
    }
    
    // Process
    const outputPath = await ffmpegService.trim(
      video.path,
      trimParams.startTime,
      trimParams.endTime
    );
    
    res.json({
      success: true,
      outputUrl: `/videos/${path.basename(outputPath)}`
    });
  } catch (err) {
    next(err);
  }
});

export default router;
```

---

### 4.4 Dependency Injection

```typescript
// src/server.ts (with DI)
import express from 'express';
import { VideoService } from './services/video.service';
import { StorageService } from './services/storage.service';
import { FFmpegService } from './services/ffmpeg.service';
import { createUploadRouter } from './routes/upload';
import { createEditRouter } from './routes/edit';

const app = express();

// Services
const storageService = new StorageService();
const videoService = new VideoService();
const ffmpegService = new FFmpegService();

// Initialize
await storageService.ensureDirectories();

// Routes with DI
app.use('/api/upload', createUploadRouter(videoService, storageService));
app.use('/api/edit', createEditRouter(videoService, ffmpegService));

export default app;
```

**Route with DI**:
```typescript
// src/routes/upload.ts (with DI)
import { Router } from 'express';
import { VideoService } from '../services/video.service';
import { StorageService } from '../services/storage.service';

export function createUploadRouter(
  videoService: VideoService,
  storageService: StorageService
) {
  const router = Router();
  
  router.post('/', upload.single('video'), async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const videoInfo = {
      id: path.parse(req.file.filename).name,
      filename: req.file.originalname,
      path: req.file.path,
      size: req.file.size,
      mimetype: req.file.mimetype,
      url: `/videos/${req.file.filename}`
    };
    
    videoService.save(videoInfo);
    
    res.json(videoInfo);
  });
  
  return router;
}
```

---

## 🎯 실전 체크리스트

### 프로젝트 세팅
- [ ] Node.js 20+ 설치
- [ ] TypeScript 설정 (tsconfig.json)
- [ ] Express 서버 구축
- [ ] 환경 변수 설정 (.env)

### 파일 업로드
- [ ] Multer 설정 (storage, fileFilter)
- [ ] 파일 유효성 검증 (타입, 크기)
- [ ] 업로드 디렉토리 생성 (uploads/, processed/)
- [ ] Static file serving (/videos)

### API 개발
- [ ] RESTful API 설계 (upload, edit, projects)
- [ ] Request 유효성 검증
- [ ] Error handling (AppError, errorHandler)
- [ ] Logger middleware

### TypeScript
- [ ] 타입 정의 (VideoInfo, EditRequest)
- [ ] Utility Types 활용 (Partial, Omit)
- [ ] Async/Await 패턴
- [ ] Dependency Injection

---

## 📚 면접 예상 질문

### 기초
1. **Node.js가 싱글 스레드인데 어떻게 동시 처리하나?**
   - Event Loop + Non-blocking I/O

2. **Express Middleware란?**
   - 요청-응답 사이에 실행되는 함수 (req, res, next)

3. **Multer의 역할은?**
   - Multipart/form-data 파싱 (파일 업로드)

4. **CORS란?**
   - Cross-Origin Resource Sharing (다른 도메인 요청 허용)

5. **async/await vs Promise 차이는?**
   - async/await: 동기 코드처럼 작성 (가독성)
   - Promise: then/catch 체이닝

### 심화
6. **Event Loop 동작 원리는?**
   - Call Stack → Microtask Queue → Macrotask Queue

7. **Node.js에서 파일 I/O가 빠른 이유는?**
   - libuv의 비동기 I/O (스레드 풀)

8. **Express Error Handling 순서는?**
   - try-catch → next(err) → errorHandler middleware

9. **TypeScript Utility Types 종류는?**
   - Partial, Required, Pick, Omit, Record

10. **Dependency Injection 장점은?**
    - 테스트 용이성, 결합도 감소

---

**다음 문서**: [92-ffmpeg-video-processing.md](92-ffmpeg-video-processing.md) - FFmpeg 비디오 처리
