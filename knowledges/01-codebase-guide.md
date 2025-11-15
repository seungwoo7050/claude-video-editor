# VrewCraft 코드베이스 가이드

**목표**: 프로젝트 구조 이해 및 효율적인 코드 탐색
**난이도**: ⭐☆☆☆☆ (입문)
**예상 시간**: 40분 (정독)
**선행 과정**: [00-vrewcraft-overview.md](00-vrewcraft-overview.md)

---

## 📋 목차

1. [프로젝트 구조](#part-1-프로젝트-구조)
2. [주요 파일 및 디렉토리](#part-2-주요-파일-및-디렉토리)
3. [기능별 코드 위치](#part-3-기능별-코드-위치)
4. [코드 탐색 팁](#part-4-코드-탐색-팁)

---

## Part 1: 프로젝트 구조

### 1.1 전체 디렉토리 트리

```
claude-video-editor/
├── frontend/                    # React Frontend (Port 5173)
│   ├── src/
│   │   ├── components/         # React 컴포넌트
│   │   ├── hooks/              # Custom React Hooks
│   │   ├── types/              # TypeScript 타입 정의
│   │   ├── utils/              # 유틸리티 함수
│   │   ├── App.tsx             # 메인 앱 컴포넌트
│   │   └── main.tsx            # Entry Point
│   ├── public/                 # 정적 파일
│   ├── package.json
│   ├── vite.config.ts          # Vite 설정
│   └── tsconfig.json           # TypeScript 설정
│
├── backend/                     # Node.js Backend (Port 3001, 3002)
│   ├── src/
│   │   ├── routes/             # API 라우트
│   │   ├── services/           # 비즈니스 로직
│   │   ├── middleware/         # Express 미들웨어
│   │   ├── ws/                 # WebSocket 서버
│   │   ├── db/                 # Database 연결
│   │   ├── types/              # TypeScript 타입
│   │   └── server.ts           # Entry Point
│   ├── uploads/                # 업로드된 비디오 (임시)
│   ├── processed/              # 처리된 비디오 (출력)
│   ├── package.json
│   └── tsconfig.json
│
├── native/                      # C++ Native Addon (선택)
│   ├── src/
│   │   ├── module.cpp          # N-API 진입점
│   │   ├── thumbnail.cpp       # 썸네일 추출
│   │   ├── thumbnail.h
│   │   └── ffmpeg_utils.cpp    # FFmpeg 유틸리티
│   ├── binding.gyp             # 빌드 설정
│   ├── package.json
│   └── build/                  # 빌드 결과
│       └── Release/
│           └── native.node
│
├── docs/                        # 프로젝트 문서
│   ├── architecture.md         # 아키텍처 설명
│   ├── performance-report.md   # 성능 벤치마크
│   ├── PROJECT-COMPLETION.md   # 완료 보고서
│   └── evidence/               # Phase별 증거 자료
│
├── knowledges/                  # 기술 학습 문서
│   ├── 00-vrewcraft-overview.md
│   ├── 90-react-typescript-vite.md
│   ├── 91-nodejs-express-backend.md
│   └── ...
│
├── migrations/                  # PostgreSQL 마이그레이션
│   └── 001_initial_schema.sql
│
├── monitoring/                  # Prometheus + Grafana 설정
│   ├── prometheus/
│   │   └── prometheus.yml
│   └── grafana/
│       └── dashboards/
│
├── deployments/                 # 배포 스크립트
│   └── docker/
│       └── docker-compose.yml
│
├── scripts/                     # 유틸리티 스크립트
│   ├── dev-start.sh
│   ├── deploy.sh
│   └── backup.sh
│
├── .github/                     # GitHub 설정
│   └── workflows/
│       └── deploy.yml          # CI/CD
│
├── docker-compose.yml           # 개발 환경
├── docker-compose.prod.yml      # 프로덕션 환경
├── CLAUDE.md                    # 프로젝트 명세서
├── README.md
└── package.json
```

---

### 1.2 패키지별 역할

| 패키지 | 주요 기술 | 포트 | 역할 |
|--------|---------|------|------|
| **frontend** | React, TypeScript, Vite, TailwindCSS | 5173 | 비디오 플레이어, 타임라인 UI, 편집 컨트롤 |
| **backend** | Node.js, Express, FFmpeg, WebSocket | 3001, 3002 | REST API, 비디오 처리, 실시간 통신 |
| **native** | C++17, N-API, FFmpeg C API | - | 고성능 썸네일 추출, 메타데이터 분석 |

---

## Part 2: 주요 파일 및 디렉토리

### 2.1 Frontend 핵심 파일

#### App.tsx (메인 레이아웃)
```
📁 frontend/src/App.tsx (라인 수: ~150)

역할: 전체 레이아웃 구성
- Header (VrewCraft 로고)
- Sidebar (비디오 업로드)
- VideoPlayer (재생 영역)
- Timeline (타임라인 컨트롤)
- ControlPanel (편집 버튼)

주요 State:
- videoUrl: 현재 비디오 URL
- currentTime: 재생 시간
- duration: 비디오 길이
```

#### components/VideoPlayer.tsx
```
📁 frontend/src/components/VideoPlayer.tsx (라인 수: ~100)

역할: HTML5 비디오 플레이어 + 컨트롤
- <video> 태그 래퍼
- 재생/일시정지/시크
- currentTime 동기화

Props:
- url: string
- onTimeUpdate: (time: number) => void
- onDurationChange: (duration: number) => void
```

#### components/Timeline.tsx
```
📁 frontend/src/components/Timeline.tsx (라인 수: ~200)

역할: Canvas 기반 타임라인 렌더링
- 눈금자 (Ruler) 그리기
- Playhead (현재 시간 인디케이터)
- 마우스 드래그로 시크
- 구간 선택 (Range Selection)

기술:
- Canvas API (60 FPS)
- requestAnimationFrame
- 마우스/터치 이벤트 처리
```

#### hooks/useWebSocket.ts
```
📁 frontend/src/hooks/useWebSocket.ts (라인 수: ~80)

역할: WebSocket 연결 및 진행률 수신
- 서버 연결 (ws://localhost:3002)
- videoId 구독
- 진행률 업데이트 수신
- 재연결 로직

Returns:
- progress: { percent, message }
- outputUrl: string
- error: string
- connected: boolean
```

---

### 2.2 Backend 핵심 파일

#### server.ts (진입점)
```
📁 backend/src/server.ts (라인 수: ~80)

역할: Express 서버 초기화
- 미들웨어 등록 (CORS, JSON Parser)
- 라우트 등록 (upload, edit, projects)
- WebSocket 서버 시작
- 에러 핸들러

주요 의존성:
- Express
- CORS
- dotenv
```

#### routes/upload.ts
```
📁 backend/src/routes/upload.ts (라인 수: ~60)

역할: 비디오 업로드 API
Endpoint: POST /api/upload
- Multer로 파일 수신
- uploads/ 디렉토리에 저장
- UUID 기반 파일명
- 메타데이터 추출 (FFmpeg)

Response:
{
  "videoId": "uuid",
  "url": "/videos/uuid.mp4",
  "metadata": { duration, codec, resolution }
}
```

#### routes/edit.ts
```
📁 backend/src/routes/edit.ts (라인 수: ~150)

역할: 비디오 편집 API
Endpoints:
- POST /api/edit/trim      (구간 자르기)
- POST /api/edit/split     (분할)
- POST /api/edit/subtitle  (자막 추가)
- POST /api/edit/speed     (속도 변경)

특징:
- 비동기 처리 (즉시 Response)
- WebSocket으로 진행률 전송
- FFmpegService 사용
```

#### services/ffmpeg.service.ts
```
📁 backend/src/services/ffmpeg.service.ts (라인 수: ~250)

역할: FFmpeg 비디오 처리 로직
Methods:
- trim(inputPath, startTime, endTime)
- split(inputPath, splitTime)
- addSubtitle(inputPath, text, startTime, duration)
- changeSpeed(inputPath, speed)

기술:
- fluent-ffmpeg (FFmpeg 래퍼)
- Promise 기반 비동기 처리
- 진행률 이벤트 리스닝
```

#### ws/ws-server.ts
```
📁 backend/src/ws/ws-server.ts (라인 수: ~150)

역할: WebSocket 서버 구현
- 클라이언트 연결 관리
- videoId 기반 구독
- 진행률 브로드캐스트

주요 메서드:
- sendProgress(videoId, percent, message)
- sendComplete(videoId, outputUrl)
- sendError(videoId, error)

Data Structure:
Map<videoId, Set<WebSocket>>
```

---

### 2.3 Native Addon 핵심 파일

#### module.cpp (진입점)
```
📁 native/src/module.cpp (라인 수: ~30)

역할: N-API 모듈 초기화
- extractThumbnail 함수 등록
- NODE_API_MODULE 매크로

Export:
native.extractThumbnail(inputPath, timestamp)
→ Promise<Buffer> (JPEG 데이터)
```

#### thumbnail.cpp
```
📁 native/src/thumbnail.cpp (라인 수: ~200)

역할: 썸네일 추출 구현
Class: ThumbnailWorker (AsyncWorker)
- Execute(): FFmpeg C API로 프레임 디코딩
- OnOK(): JPEG Buffer 반환

성능:
- p99 < 50ms (100 concurrent requests)
- 메모리 풀 사용 (재사용)
```

#### ffmpeg_utils.cpp
```
📁 native/src/ffmpeg_utils.cpp (라인 수: ~300)

역할: FFmpeg C API 유틸리티
Classes:
- VideoDecoder: 비디오 파일 열기, 시크, 디코딩
- FrameConverter: YUV → RGB 변환, 리사이즈

RAII 패턴:
- 생성자에서 리소스 할당
- 소멸자에서 자동 해제
```

---

## Part 3: 기능별 코드 위치

### 3.1 비디오 업로드

```
Frontend:
📁 frontend/src/components/Sidebar.tsx
   - 파일 선택 UI (Drag & Drop)
   - useVideoUpload Hook 호출

📁 frontend/src/hooks/useVideoUpload.ts
   - axios POST /api/upload
   - FormData 생성
   - 업로드 진행률 추적

Backend:
📁 backend/src/routes/upload.ts
   - POST /api/upload
   - Multer 설정 (파일 필터, 크기 제한)
   - VideoService.save()

📁 backend/src/services/video.service.ts
   - 비디오 메타데이터 저장
   - PostgreSQL 연동
```

**데이터 흐름:**
```
Sidebar → useVideoUpload → axios → Multer → VideoService → PostgreSQL
```

---

### 3.2 비디오 Trim (구간 자르기)

```
Frontend:
📁 frontend/src/components/ControlPanel.tsx
   - "Trim" 버튼 UI
   - 시작/종료 시간 입력

📁 frontend/src/components/Timeline.tsx
   - 구간 선택 (드래그)
   - selectionStart, selectionEnd 계산

📁 frontend/src/hooks/useWebSocket.ts
   - 진행률 수신
   - ProgressBar 업데이트

Backend:
📁 backend/src/routes/edit.ts
   - POST /api/edit/trim
   - 요청 검증 (validateTrimParams)
   - FFmpegService.trimWithProgress()

📁 backend/src/services/ffmpeg.service.ts
   - fluent-ffmpeg 사용
   - setStartTime(), setDuration()
   - WebSocket으로 진행률 전송
```

**데이터 흐름:**
```
Timeline → ControlPanel → POST /trim → FFmpegService → WebSocket → ProgressBar
```

---

### 3.3 썸네일 추출 (C++)

```
Frontend:
📁 frontend/src/components/Timeline.tsx
   - 썸네일 요청 (GET /api/thumbnail?t=10)
   - <img src="..." /> 렌더링

Backend:
📁 backend/src/routes/thumbnail.ts
   - GET /api/thumbnail
   - Redis 캐시 확인
   - Native Addon 호출

Native Addon:
📁 native/src/thumbnail.cpp
   - ThumbnailWorker::Execute()
   - FFmpeg C API로 프레임 디코딩
   - JPEG 인코딩

📁 native/src/ffmpeg_utils.cpp
   - VideoDecoder::DecodeFrameAt()
   - FrameConverter::Convert() (RGB 변환)
```

**데이터 흐름:**
```
Timeline → GET /thumbnail → Redis (Cache Miss) → Native Addon (C++)
→ FFmpeg C API → JPEG Buffer → Redis (Cache) → Response
```

---

### 3.4 실시간 진행률 (WebSocket)

```
Frontend:
📁 frontend/src/hooks/useWebSocket.ts
   - new WebSocket('ws://localhost:3002')
   - subscribe message 전송
   - progress/complete/error 수신

📁 frontend/src/components/ProgressBar.tsx
   - 진행률 바 렌더링
   - percent, message 표시

Backend:
📁 backend/src/ws/ws-server.ts
   - VrewCraftWSServer 클래스
   - 클라이언트 구독 관리 (Map)
   - sendProgress(videoId, percent)

📁 backend/src/services/ffmpeg.service.ts
   - .on('progress', (progress) => { ... })
   - wsServer.sendProgress()
```

**데이터 흐름:**
```
Frontend (subscribe) → WebSocket Server → Map<videoId, clients>
FFmpegService (progress event) → wsServer.sendProgress() → Frontend (update)
```

---

## Part 4: 코드 탐색 팁

### 4.1 새 기능 추가 방법

#### 예시: "Merge" 기능 추가 (두 비디오 병합)

**1. Backend API 추가**
```typescript
// backend/src/routes/edit.ts
router.post('/merge', async (req, res) => {
  const { videoId1, videoId2 } = req.body;

  // FFmpegService에 merge 메서드 추가
  const outputPath = await ffmpegService.merge(videoId1, videoId2);

  res.json({ success: true, outputUrl: `/videos/${outputPath}` });
});
```

**2. FFmpegService 메서드 구현**
```typescript
// backend/src/services/ffmpeg.service.ts
async merge(video1: string, video2: string): Promise<string> {
  const outputPath = `outputs/merged_${Date.now()}.mp4`;

  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(video1)
      .input(video2)
      .mergeToFile(outputPath)
      .on('end', () => resolve(outputPath))
      .on('error', reject);
  });
}
```

**3. Frontend UI 추가**
```tsx
// frontend/src/components/ControlPanel.tsx
<button onClick={handleMerge} className="...">
  <Merge size={20} /> Merge
</button>
```

**4. Hook 추가**
```typescript
// frontend/src/hooks/useVideoEdit.ts
const merge = async (videoId1: string, videoId2: string) => {
  const response = await axios.post('/api/edit/merge', {
    videoId1,
    videoId2
  });
  return response.data;
};
```

---

### 4.2 버그 디버깅 가이드

#### 문제: "Trim이 완료되지 않음"

**1. 로그 확인**
```bash
# Backend 로그
docker-compose logs -f backend

# FFmpeg 명령어 확인
# [FFmpeg] ffmpeg -i input.mp4 -ss 10 -t 20 output.mp4
```

**2. WebSocket 연결 확인**
```javascript
// Frontend DevTools Console
ws.readyState  // 1 = OPEN
```

**3. 파일 시스템 확인**
```bash
# 출력 파일 생성 여부
ls -lh backend/processed/

# 권한 확인
chmod 777 backend/processed/
```

**4. FFmpeg 에러 확인**
```typescript
// backend/src/services/ffmpeg.service.ts
.on('error', (err) => {
  console.error('FFmpeg error:', err);  // 에러 상세 로그
  wsServer.sendError(videoId, err.message);
});
```

---

### 4.3 코드 검색 패턴

#### IDE 검색 (VS Code)

```bash
# 함수 정의 찾기
Cmd+P → @trim          # "trim" 함수 검색

# 파일 찾기
Cmd+P → upload.ts      # "upload.ts" 파일 검색

# 전체 검색
Cmd+Shift+F → "WebSocket"  # 모든 파일에서 "WebSocket" 검색

# 타입 정의로 이동
Cmd+클릭 → interface    # 타입 정의로 점프
```

#### Grep 명령어

```bash
# "trim" 함수가 사용되는 모든 위치
grep -r "trim" backend/src/

# FFmpegService 사용 위치
grep -r "FFmpegService" backend/src/

# WebSocket 메시지 타입
grep -r "WSMessage" .
```

---

### 4.4 성능 프로파일링

#### Frontend 성능 측정

```javascript
// Chrome DevTools → Performance 탭
// 1. Record 시작
// 2. 타임라인 드래그 (60 FPS 확인)
// 3. Record 중지
// 4. Flame Chart 분석

// React DevTools Profiler
import { Profiler } from 'react';

<Profiler id="Timeline" onRender={onRenderCallback}>
  <Timeline />
</Profiler>

function onRenderCallback(id, phase, actualDuration) {
  console.log(`${id} took ${actualDuration}ms`);
}
```

#### Backend 성능 측정

```bash
# API 응답 시간 측정
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:3001/api/health

# curl-format.txt:
# time_total: %{time_total}s

# Prometheus 메트릭 확인
curl http://localhost:3001/metrics | grep http_request_duration
```

#### Native Addon 성능 측정

```bash
# C++ 프로파일링 (macOS)
instruments -t "Time Profiler" node backend/dist/server.js

# Linux (perf)
perf record -g node backend/dist/server.js
perf report

# 메모리 누수 검사
valgrind --leak-check=full node backend/dist/server.js
```

---

### 4.5 자주 사용하는 명령어

```bash
# 개발 서버 시작
npm run dev                    # Frontend/Backend 각각

# 전체 스택 시작
docker-compose up -d

# 빌드
npm run build                  # TypeScript → JavaScript

# 테스트
npm test                       # Jest
npm run test:e2e               # Playwright

# Linting
npm run lint
npm run lint:fix

# Native Addon 빌드
cd native && npm run build

# 로그 확인
docker-compose logs -f [service]

# Docker 재시작
docker-compose restart backend

# DB 마이그레이션
npm run migrate:up
```

---

## 🎯 실전 체크리스트

### 코드 탐색
- [ ] 전체 디렉토리 구조 파악
- [ ] 주요 파일 역할 이해
- [ ] 기능별 데이터 흐름 추적
- [ ] 의존성 관계 파악

### 개발 환경
- [ ] VS Code 설치 (권장)
- [ ] 유용한 Extension 설치:
  - [ ] ESLint
  - [ ] Prettier
  - [ ] TypeScript Hero
  - [ ] Docker
- [ ] Docker Desktop 설치

### 디버깅
- [ ] Chrome DevTools 사용법 숙지
- [ ] React DevTools 설치
- [ ] Backend 로그 확인 방법
- [ ] Breakpoint 설정 방법

---

## 📚 다음 단계

기본 구조를 이해했다면, 기능별 상세 문서를 참고하세요:

1. **Frontend 개발**: [90-react-typescript-vite.md](90-react-typescript-vite.md)
2. **Backend 개발**: [91-nodejs-express-backend.md](91-nodejs-express-backend.md)
3. **비디오 처리**: [92-ffmpeg-video-processing.md](92-ffmpeg-video-processing.md)
4. **Database 연동**: [85-database-integration.md](85-database-integration.md)
5. **WebSocket**: [97-websocket-progress.md](97-websocket-progress.md)

---

**작성자**: VrewCraft Team
**최종 업데이트**: 2025-01-15
**버전**: 1.0.0
