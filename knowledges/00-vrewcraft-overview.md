# VrewCraft 프로젝트 개요

**목표**: VrewCraft 아키텍처 이해 및 빠른 시작
**난이도**: ⭐☆☆☆☆ (입문)
**예상 시간**: 30분 (정독)
**선행 과정**: 없음

---

## 📋 목차

1. [프로젝트 소개](#part-1-프로젝트-소개)
2. [아키텍처](#part-2-아키텍처)
3. [빠른 시작](#part-3-빠른-시작)
4. [개발 워크플로우](#part-4-개발-워크플로우)

---

## Part 1: 프로젝트 소개

### 1.1 VrewCraft란?

```
VrewCraft = Web-Based Video Editor

핵심 가치:
✅ 브라우저에서 동작하는 비디오 편집기
✅ React + Node.js + C++ Native Addon 하이브리드
✅ 프로덕션 수준의 성능 (60 FPS, p99 < 50ms)
✅ Voyager X (Vrew) 채용을 위한 포트폴리오 프로젝트

기술 스택:
- Frontend: React 18, TypeScript, Vite, TailwindCSS
- Backend: Node.js 20, Express, FFmpeg
- Native: C++17, N-API, FFmpeg C API
- Database: PostgreSQL 15, Redis 7
- Monitoring: Prometheus, Grafana
```

---

### 1.2 프로젝트 목표

**Phase 1: 기본 편집 기능** (✅ 완료)
- 비디오 업로드/재생
- Trim (구간 자르기)
- Split (분할)
- Subtitle (자막 추가)
- Speed (재생 속도 변경)

**Phase 2: C++ 성능 최적화** (✅ 완료)
- N-API Native Addon 구현
- FFmpeg C API 직접 호출
- 썸네일 추출 (p99 < 50ms)
- 메타데이터 분석
- 메모리 풀 (RAII 패턴)

**Phase 3: 프로덕션 배포** (✅ 완료)
- Docker Compose 스택
- CI/CD (GitHub Actions)
- 모니터링 (Prometheus + Grafana)
- 문서화 및 데모

---

### 1.3 핵심 성능 지표 (KPI)

```
✅ Frontend 렌더링: 60 FPS (Timeline + Preview)
✅ 비디오 업로드: p99 < 5s (100MB)
✅ 썸네일 추출 (C++): p99 < 50ms
✅ Trim/Split: < 3s (1분 비디오)
✅ WebSocket 지연: < 100ms
✅ API 지연: p99 < 200ms
✅ 메모리 누수: 0 (valgrind 검증)
✅ 테스트 커버리지: ≥ 70%
```

---

## Part 2: 아키텍처

### 2.1 전체 시스템 구조

```
┌──────────────────────────────────────────────────────┐
│                   Browser (Client)                   │
│  ┌────────────────┐  ┌─────────────────────────────┐ │
│  │  React App     │  │  WebSocket Client           │ │
│  │  (Port 5173)   │  │  (Real-time Progress)       │ │
│  └────────┬───────┘  └──────────┬──────────────────┘ │
└───────────┼──────────────────────┼────────────────────┘
            │ HTTP                 │ WS
            │                      │
┌───────────▼──────────────────────▼────────────────────┐
│              Backend (Node.js + Express)              │
│  ┌──────────────────┐  ┌──────────────────────────┐  │
│  │  REST API        │  │  WebSocket Server        │  │
│  │  (Port 3001)     │  │  (Port 3002)             │  │
│  └────────┬─────────┘  └────────┬─────────────────┘  │
│           │                     │                     │
│  ┌────────▼─────────────────────▼─────────────────┐  │
│  │         FFmpeg Service (fluent-ffmpeg)         │  │
│  │  - Trim, Split, Subtitle, Speed                │  │
│  └────────┬───────────────────────────────────────┘  │
│           │                                           │
│  ┌────────▼───────────────────────────────────────┐  │
│  │      Native Addon (C++ + FFmpeg C API)         │  │
│  │  - Thumbnail Extraction (p99 < 50ms)           │  │
│  │  - Metadata Analysis                           │  │
│  │  - Memory Pool (RAII)                          │  │
│  └────────────────────────────────────────────────┘  │
└─────────┬──────────────────────┬─────────────────────┘
          │                      │
┌─────────▼─────────┐  ┌─────────▼──────────┐
│  PostgreSQL 15    │  │  Redis 7           │
│  - Projects       │  │  - Sessions        │
│  - Video Metadata │  │  - Thumbnail Cache │
└───────────────────┘  └────────────────────┘

┌──────────────────────────────────────────────────────┐
│              Monitoring (Prometheus + Grafana)       │
│  - API Latency, Thumbnail Duration, Memory Usage     │
└──────────────────────────────────────────────────────┘
```

---

### 2.2 데이터 흐름

#### 비디오 업로드 플로우
```
1. User: 파일 선택 (Drag & Drop)
   ↓
2. Frontend: FormData 생성, axios POST /api/upload
   ↓
3. Backend: multer로 파일 저장 (uploads/)
   ↓
4. Backend: FFmpeg로 메타데이터 추출 (duration, codec, resolution)
   ↓
5. Backend: PostgreSQL에 비디오 정보 저장
   ↓
6. Backend: Response { videoId, url, metadata }
   ↓
7. Frontend: 비디오 플레이어에 표시
```

#### 비디오 편집 플로우 (Trim)
```
1. User: Timeline에서 구간 선택 (10s ~ 30s)
   ↓
2. Frontend: WebSocket 연결 (videoId 구독)
   ↓
3. Frontend: POST /api/edit/trim { videoId, startTime, endTime }
   ↓
4. Backend: 비동기 FFmpeg 처리 시작
   ↓
5. Backend: WebSocket으로 진행률 전송 (0% → 100%)
   ↓
6. Frontend: ProgressBar 업데이트 (실시간)
   ↓
7. Backend: 완료 시 outputUrl 전송
   ↓
8. Frontend: 다운로드 링크 표시
```

#### 썸네일 추출 플로우 (C++)
```
1. Frontend: GET /api/thumbnail?videoId=xxx&timestamp=10
   ↓
2. Backend: Redis 캐시 확인
   ↓ (Cache Miss)
3. Backend: Native Addon 호출 (C++)
   ↓
4. C++: FFmpeg C API로 프레임 디코딩
   ↓
5. C++: RGB 변환 (SwsContext)
   ↓
6. C++: JPEG 인코딩 (libjpeg)
   ↓
7. C++: Buffer 반환 (N-API)
   ↓
8. Backend: Redis에 캐싱 (TTL 1시간)
   ↓
9. Backend: Response Buffer (image/jpeg)
   ↓
10. Frontend: <img src="..." /> 표시
```

---

### 2.3 컴포넌트 의존성

```
Frontend Dependencies:
- React → React Router
- Zustand (State Management)
- Axios (HTTP Client)
- WebSocket API (Real-time)
- Canvas API (Timeline Rendering)

Backend Dependencies:
- Express → CORS, Multer
- fluent-ffmpeg → FFmpeg CLI
- ws (WebSocket Server)
- pg (PostgreSQL Client)
- redis (Redis Client)
- prom-client (Prometheus Metrics)

Native Addon Dependencies:
- node-addon-api (N-API Wrapper)
- FFmpeg C Libraries (libavformat, libavcodec, libavutil, libswscale)
- libjpeg (JPEG Encoding)
```

---

## Part 3: 빠른 시작

### 3.1 환경 요구사항

```bash
# 필수
Node.js: 20+
npm: 10+
PostgreSQL: 15+
Redis: 7+
FFmpeg: 6.0+

# 선택 (C++ Native Addon)
C++: C++17 지원 컴파일러
Xcode Command Line Tools (macOS)
Python: 3.x (node-gyp)
```

---

### 3.2 프로젝트 설치

```bash
# 1. 저장소 클론
git clone https://github.com/seungwoo7050/claude-video-editor.git
cd claude-video-editor

# 2. Docker Compose로 전체 스택 실행 (권장)
docker-compose up -d

# 서비스 확인
docker-compose ps

# 3. 수동 설치 (개발 환경)
# PostgreSQL + Redis 시작
docker-compose up -d postgres redis

# Backend
cd backend
npm install
npm run dev  # Port 3001, 3002

# Frontend
cd frontend
npm install
npm run dev  # Port 5173

# Native Addon (선택)
cd native
npm install
npm run build
```

---

### 3.3 접속 URL

```
Frontend:     http://localhost:5173
Backend API:  http://localhost:3001
WebSocket:    ws://localhost:3002
PostgreSQL:   localhost:5432 (admin/password)
Redis:        localhost:6379
Grafana:      http://localhost:3000 (admin/admin)
Prometheus:   http://localhost:9090
```

---

### 3.4 첫 번째 비디오 편집

```bash
# 1. 브라우저에서 http://localhost:5173 접속

# 2. 비디오 업로드
# - Sidebar에서 "Upload Video" 클릭
# - 비디오 파일 선택 (MP4, MOV, AVI)
# - 업로드 진행률 확인

# 3. 비디오 편집
# - Timeline에서 구간 선택 (드래그)
# - Control Panel에서 "Trim" 클릭
# - WebSocket 진행률 실시간 확인

# 4. 결과 다운로드
# - "Download" 링크 클릭
# - 편집된 비디오 저장
```

---

## Part 4: 개발 워크플로우

### 4.1 브랜치 전략

```
main
 ├─ feature/video-player     (새 기능)
 ├─ fix/trim-memory-leak      (버그 수정)
 └─ docs/update-readme        (문서)

개발 플로우:
1. feature/* 브랜치 생성
2. 기능 개발 + 테스트
3. Pull Request 생성
4. 코드 리뷰 + CI 통과
5. main 브랜치 병합
6. 자동 배포 (CI/CD)
```

---

### 4.2 테스트 실행

```bash
# Frontend 테스트
cd frontend
npm test              # Unit tests
npm run test:e2e      # E2E tests (Playwright)

# Backend 테스트
cd backend
npm test              # Unit + Integration tests
npm run test:coverage # Coverage report

# Native Addon 테스트
cd native
npm test

# 메모리 누수 검사
valgrind --leak-check=full node backend/dist/server.js
```

---

### 4.3 코드 스타일

```bash
# Linting
npm run lint          # ESLint
npm run lint:fix      # Auto-fix

# Formatting
npm run format        # Prettier

# Type Check
npm run type-check    # TypeScript

# Pre-commit Hook
# .husky/pre-commit에 자동 설정
```

---

### 4.4 디버깅

```bash
# Backend 디버깅
cd backend
npm run dev:debug     # Node.js Inspector
# Chrome: chrome://inspect

# Frontend 디버깅
# React DevTools 사용
# Chrome Extension 설치

# Native Addon 디버깅
cd native
node-gyp build --debug
lldb node              # macOS
gdb node               # Linux
```

---

### 4.5 로그 확인

```bash
# Docker Compose 로그
docker-compose logs -f backend
docker-compose logs -f frontend

# 개별 서비스 로그
tail -f backend/logs/app.log
tail -f backend/logs/error.log

# Grafana에서 실시간 로그 (Loki)
# http://localhost:3000 → Explore → Loki
```

---

## 🎯 다음 단계

### 추천 학습 순서

1. **[01-codebase-guide.md](01-codebase-guide.md)** - 코드베이스 탐색
2. **[90-react-typescript-vite.md](90-react-typescript-vite.md)** - Frontend 개발
3. **[91-nodejs-express-backend.md](91-nodejs-express-backend.md)** - Backend 개발
4. **[92-ffmpeg-video-processing.md](92-ffmpeg-video-processing.md)** - FFmpeg 편집
5. **[85-database-integration.md](85-database-integration.md)** - DB 연동
6. **[97-websocket-progress.md](97-websocket-progress.md)** - 실시간 통신
7. **[94-napi-native-addon.md](94-napi-native-addon.md)** - C++ 확장
8. **[95-ffmpeg-c-api.md](95-ffmpeg-c-api.md)** - FFmpeg C API
9. **[98-docker-compose-stack.md](98-docker-compose-stack.md)** - Docker 배포
10. **[99-deployment-production.md](99-deployment-production.md)** - 프로덕션

---

## 📚 추가 리소스

### 프로젝트 문서
- [CLAUDE.md](../CLAUDE.md) - 프로젝트 명세서
- [docs/architecture.md](../docs/architecture.md) - 상세 아키텍처
- [docs/performance-report.md](../docs/performance-report.md) - 성능 벤치마크
- [docs/PROJECT-COMPLETION.md](../docs/PROJECT-COMPLETION.md) - 프로젝트 완료 보고서

### 외부 리소스
- [React 공식 문서](https://react.dev)
- [FFmpeg 문서](https://ffmpeg.org/documentation.html)
- [N-API 문서](https://nodejs.org/api/n-api.html)
- [PostgreSQL 문서](https://www.postgresql.org/docs/)

---

## ❓ 자주 묻는 질문 (FAQ)

**Q: VrewCraft를 로컬에서 실행하려면 무엇이 필요한가요?**
A: Docker Compose만 있으면 됩니다. `docker-compose up -d`로 전체 스택을 시작할 수 있습니다.

**Q: C++ Native Addon은 필수인가요?**
A: 아니요. Phase 1 기능(업로드, Trim, 자막)은 fluent-ffmpeg만으로 동작합니다. Native Addon은 Phase 2의 고성능 썸네일 추출을 위한 선택사항입니다.

**Q: 프로덕션 배포는 어떻게 하나요?**
A: [99-deployment-production.md](99-deployment-production.md)를 참고하세요. AWS ECS Fargate 기반 배포 가이드를 제공합니다.

**Q: 테스트는 어떻게 실행하나요?**
A: `npm test` (각 패키지에서 실행). 상세 가이드는 [87-testing-strategy.md](87-testing-strategy.md)를 참고하세요.

**Q: 버그를 발견했어요. 어디에 보고하나요?**
A: GitHub Issues에 보고해주세요: https://github.com/seungwoo7050/claude-video-editor/issues

---

**작성자**: VrewCraft Team
**최종 업데이트**: 2025-01-15
**버전**: 1.0.0
