# VrewCraft – Web-Based Video Editor

## Project Mission

Build a production-quality web video editor that demonstrates:
1. **Deep C++ understanding** - FFmpeg C API, N-API, memory management
2. **Modern web stack mastery** - React, TypeScript, Node.js
3. **Arena60 experience reuse** - PostgreSQL, Redis, WebSocket, Prometheus
4. **Voyager X (Vrew) job alignment** - 100% tech stack match

## Why This Project

**Voyager X Requirements**:
- "C++ 혹은 JavaScript에 대한 이해가 깊음" → Both proven
- "필요에 따라서 더욱 저수준으로 내려갈 수 있음" → FFmpeg C API direct usage
- "동영상 관련 기술에 대해 관심이 많음" → Core domain
- React, Node.js, TypeScript, FFmpeg, WebGL → Perfect match

**Strategy**: Hybrid approach
- Fast win: Editing features (React + FFmpeg wrapper)
- Deep tech: C++ Native Addon (FFmpeg C API)
- Arena60 synergy: Reuse PostgreSQL, Redis, WebSocket, Prometheus patterns

## Tech Stack

**Frontend**: React 18, TypeScript 5, Vite, TailwindCSS, WebGL, Canvas API  
**Backend**: Node.js 20, Express, TypeScript, fluent-ffmpeg (initial), WebSocket  
**Native Layer**: C++17, N-API, FFmpeg C API (libavformat/libavcodec), RAII  
**Data**: PostgreSQL 15+ (Arena60 M1.10), Redis 7+ (Arena60 M1.8)  
**Monitoring**: Prometheus, Grafana (Arena60 M1.7)  
**Infrastructure**: Docker Compose

## Project Structure

```
vrewcraft/
├── frontend/               # React + TypeScript
│   ├── src/
│   │   ├── components/    # VideoPlayer, Timeline, ControlPanel, etc.
│   │   ├── hooks/         # useVideoUpload, useFFmpeg, useWebSocket
│   │   ├── types/
│   │   └── App.tsx
│   └── package.json
│
├── backend/               # Node.js + Express
│   ├── src/
│   │   ├── routes/       # upload, edit, render, projects
│   │   ├── services/     # ffmpeg.service, storage.service
│   │   ├── db/           # postgres (Arena60), redis (Arena60)
│   │   ├── ws/           # WebSocket progress server
│   │   ├── metrics/      # Prometheus (Arena60)
│   │   └── server.ts
│   └── package.json
│
├── native/               # C++ Native Addon
│   ├── src/
│   │   ├── video_processor.cpp
│   │   ├── thumbnail_extractor.cpp
│   │   ├── metadata_analyzer.cpp
│   │   └── memory_pool.cpp        # Arena60 pattern
│   ├── include/
│   └── binding.gyp
│
├── migrations/           # PostgreSQL
├── monitoring/           # Prometheus + Grafana (Arena60)
├── deployments/docker/
└── docs/
    ├── architecture.md
    ├── performance-report.md
    └── evidence/
```

## Key Performance Indicators (KPIs)

**Must achieve ALL**:
- Frontend render: **60 FPS** (timeline + preview)
- Video upload: **p99 < 5s** for 100MB
- Thumbnail extraction (C++): **p99 < 50ms** per frame
- Trim/Split: **< 3s** for 1-min video
- WebSocket latency: **< 100ms**
- API latency: **p99 < 200ms**
- Memory: **0 leaks** (valgrind + Chrome DevTools)
- Test coverage: **≥ 70%**

---

## Phase 1: Editing Features (Quick Win)

**Goal**: Working video editor with core editing capabilities  
**Focus**: React + Node.js + FFmpeg wrapper (fluent-ffmpeg)  
**Outcome**: Demonstrate web development skills quickly

### MVP 1.0: Basic Infrastructure

**Requirements**:
- React app with video upload (drag & drop, multipart)
- Video playback with controls
- Canvas-based timeline (ruler, time markers)
- Express server with upload endpoint
- Static file serving

**Acceptance Criteria**:
- [ ] Upload 100MB video → returns URL
- [ ] Play video → controls work (play/pause/seek)
- [ ] Timeline displays duration with ruler
- [ ] No console errors
- [ ] TypeScript compilation passes

**Validation**:
```bash
# Upload test
curl -F "video=@test.mp4" http://localhost:3001/api/upload
# Should return: { "url": "/videos/{id}", "path": "..." }

# Frontend access
curl http://localhost:5173
# Should load React app
```

---

### MVP 1.1: Trim & Split

**Requirements**:
- Trim: Extract segment from video (start time → end time)
- Split: Cut video at specific point → 2 files
- Control panel UI with time inputs
- Timeline selection (drag range)
- Processing feedback

**Tech Approach**:
- Use fluent-ffmpeg wrapper initially
- Server-side processing (Express endpoint)
- Return processed video URL

**Acceptance Criteria**:
- [ ] Trim 1-min video (10s-30s) → 20s output
- [ ] Split at 30s → two files (0-30s, 30-60s)
- [ ] Processing time < 5s for 1-min video
- [ ] Output files playable
- [ ] UI shows processing state

**Quality Gate**:
- FFmpeg command correctness verified
- Output video integrity checked (ffprobe)
- Error handling for invalid inputs

---

### MVP 1.2: Subtitle & Speed

**Requirements**:
- Add text subtitles with timing (start, duration)
- Change playback speed (0.5x - 2x)
- Subtitle editor UI (add/edit/remove)
- Speed slider
- Support multiple subtitles

**Acceptance Criteria**:
- [ ] Add subtitle "Hello World" at 5s for 3s → visible in output
- [ ] Change speed to 2x → video duration halved
- [ ] Multiple subtitles (3+) → all displayed correctly
- [ ] Font rendering correct (UTF-8 support)
- [ ] Audio pitch preserved at different speeds

**Quality Gate**:
- Subtitle positioning correct (centered, bottom)
- Speed change maintains A/V sync
- UTF-8 text (Korean, emoji) renders correctly

---

### MVP 1.3: WebSocket Progress + PostgreSQL

**Requirements**:
- Real-time processing progress via WebSocket
- Project persistence (PostgreSQL)
- Save/Load editing timeline
- Session management (Redis)

**Arena60 Reuse**:
- PostgreSQL integration (M1.10 pattern)
- Redis caching (M1.8 pattern)
- WebSocket real-time sync (M1.6 pattern)

**Acceptance Criteria**:
- [ ] Render video → progress bar updates in real-time (0-100%)
- [ ] Save project → stored in PostgreSQL with all edits
- [ ] Load project → timeline restored exactly
- [ ] WebSocket reconnection works (client disconnect/reconnect)
- [ ] Session expires after 1 hour (Redis TTL)

**Quality Gate**:
- WebSocket handles 10+ concurrent clients
- PostgreSQL transactions atomic
- No data loss on server restart (Redis persistence)

---

## Phase 2: C++ Performance (Deep Tech)

**Goal**: Demonstrate C++ mastery and low-level optimization  
**Focus**: N-API Native Addon + FFmpeg C API  
**Outcome**: "필요에 따라서 더욱 저수준으로 내려갈 수 있음" proven

### MVP 2.0: C++ Native Addon Setup

**Requirements**:
- N-API binding configuration (binding.gyp)
- FFmpeg C libraries linked (libavformat, libavcodec, libavutil, libswscale)
- RAII wrappers for AVFormatContext, AVFrame
- Memory-safe API design

**Acceptance Criteria**:
- [ ] `npm run build` → native module compiles
- [ ] `require('video_processor')` → loads without error
- [ ] valgrind → 0 memory leaks
- [ ] AddressSanitizer clean

**Quality Gate**:
- All FFmpeg resources properly freed (RAII)
- No raw pointers in public API
- Exception safety (NAPI_DISABLE_CPP_EXCEPTIONS)

---

### MVP 2.1: Thumbnail Extraction

**Requirements**:
- Extract video frame at specific timestamp
- Convert to RGB → JPEG
- Memory pool for AVFrame reuse (Arena60 MVP 2.0 pattern)
- Redis caching (Arena60 M1.8)

**Performance Target**: **p99 < 50ms**

**Acceptance Criteria**:
- [ ] Extract thumbnail at 10s → valid JPEG returned
- [ ] Performance: p99 < 50ms (100 concurrent requests)
- [ ] Memory: valgrind 0 leaks after 1000 extractions
- [ ] Cache hit rate > 80% (repeated requests)
- [ ] Handles corrupted videos gracefully

**Quality Gate**:
- Load test: 100 requests, measure p50/p95/p99
- Memory profile: valgrind --leak-check=full
- Cache metrics: Redis hit/miss ratio
- Error handling: test with invalid files

**Validation**:
```bash
# Performance test
for i in {1..100}; do
  curl -w "%{time_total}\n" http://localhost:3001/api/thumbnail?t=$i
done | sort -n | tail -n 1
# p99 should be < 50ms
```

---

### MVP 2.2: Metadata Analysis

**Requirements**:
- Extract video metadata (codec, resolution, bitrate, fps, duration)
- Audio metadata (codec, sample rate, channels)
- Format information
- Codec support detection

**Acceptance Criteria**:
- [ ] Get metadata → correct codec, resolution, duration
- [ ] Performance: < 100ms for any video size
- [ ] Support H.264, H.265, VP9, AV1
- [ ] Handles audio-only and video-only files

**Quality Gate**:
- Accuracy verified against ffprobe output
- Performance consistent across file sizes

---

### MVP 2.3: Performance Benchmarking

**Requirements**:
- Prometheus metrics collection (Arena60 M1.7 pattern)
- Grafana dashboard
- Load testing scripts
- Performance report

**Arena60 Reuse**:
- Prometheus setup (M1.7)
- Metric definitions
- Dashboard templates

**Metrics Required**:
```
vrewcraft_thumbnail_duration_seconds (histogram)
vrewcraft_thumbnail_requests_total (counter)
vrewcraft_thumbnail_cache_hit_ratio (gauge)
vrewcraft_api_latency_seconds (histogram)
vrewcraft_ffmpeg_errors_total (counter)
vrewcraft_memory_usage_bytes (gauge)
```

**Acceptance Criteria**:
- [ ] Prometheus scrapes metrics at /metrics
- [ ] Grafana dashboard shows 8+ panels
- [ ] Load test generates 1000 req/min for 5 min
- [ ] Performance report includes p50/p95/p99
- [ ] Memory usage stable over time

**Quality Gate**:
- All KPIs met (see top section)
- No performance regression from Phase 1
- Memory usage < 500MB under load

---

## Phase 3: Production Polish

**Goal**: Deployable application with documentation  
**Focus**: Infrastructure, docs, demo  

### MVP 3.0: Deployment & Documentation

**Requirements**:
- Docker Compose (all services)
- README with quick start
- Architecture diagram
- Performance report
- Demo video (5 min)

**Acceptance Criteria**:
- [ ] `docker-compose up` → all services start
- [ ] Frontend accessible at localhost:5173
- [ ] Backend accessible at localhost:3001
- [ ] Grafana dashboard at localhost:3000
- [ ] Demo video uploaded (YouTube/Loom)

**Deliverables**:
- README.md with architecture diagram
- docs/architecture.md (data flow, tech choices)
- docs/performance-report.md (benchmarks, charts)
- Demo video showing: upload → edit → export

---

## Quality Gates (ALL must pass)

### Build & Compilation
- [ ] TypeScript: 0 errors
- [ ] ESLint: 0 warnings
- [ ] C++ compilation: Release + Debug both pass
- [ ] No compiler warnings (-Wall -Wextra)

### Testing
- [ ] Unit tests: ≥ 70% coverage
- [ ] Integration tests: all pass
- [ ] Load tests: KPIs met
- [ ] E2E tests: critical paths work

### Memory Safety
- [ ] valgrind: 0 leaks, 0 errors
- [ ] AddressSanitizer (ASan): clean
- [ ] UndefinedBehaviorSanitizer (UBSan): clean
- [ ] Chrome DevTools: no memory leaks (frontend)

### Performance
- [ ] Thumbnail extraction: p99 < 50ms
- [ ] API latency: p99 < 200ms
- [ ] Frontend: 60 FPS
- [ ] Memory usage: stable under load

### Code Quality
- [ ] All functions documented (TSDoc/Doxygen)
- [ ] No TODOs in main branch
- [ ] Git history clean (no "WIP" commits)
- [ ] Secrets not in repo

---

## Validation Checklist

### Phase 1 Complete
- [ ] Video upload works (100MB file)
- [ ] Trim/split functional
- [ ] Subtitles render correctly
- [ ] WebSocket progress works
- [ ] PostgreSQL saves projects
- [ ] All Phase 1 quality gates pass

### Phase 2 Complete
- [ ] C++ Native Addon compiles
- [ ] Thumbnail extraction p99 < 50ms
- [ ] Metadata extraction < 100ms
- [ ] Prometheus metrics exposed
- [ ] Grafana dashboard deployed
- [ ] All Phase 2 quality gates pass

### Phase 3 Complete
- [ ] Docker Compose works
- [ ] README complete
- [ ] Architecture documented
- [ ] Performance report written
- [ ] Demo video published

---

## Tech Patterns to Follow

### From Arena60

**PostgreSQL (M1.10)**:
- Connection pooling
- Parameterized queries (SQL injection prevention)
- Migration scripts
- Transaction management

**Redis (M1.8)**:
- Caching strategy (thumbnail URLs)
- TTL for sessions
- Pub/sub for notifications (optional)

**WebSocket (M1.6)**:
- Real-time state sync
- Reconnection handling
- Delta compression (optional)

**Prometheus (M1.7)**:
- Counter, Histogram, Gauge usage
- Label conventions
- Dashboard design

**Memory Pool (MVP 2.0)**:
- Object reuse pattern
- Lock-free queue (optional)
- RAII wrappers

### New Patterns

**N-API**:
- ObjectWrap for classes
- AsyncWorker for long-running ops
- Error handling (NAPI_THROW_IF_FAILED)
- Buffer management

**FFmpeg C API**:
- RAII wrappers (unique_ptr with custom deleters)
- Error checking (AVERROR codes)
- Format/codec discovery
- Frame processing pipeline

---

## Success Criteria

### Minimum (Phase 1 only)
- ✅ Working video editor (trim, split, subtitle)
- ✅ React + TypeScript + Node.js demonstrated
- ✅ PostgreSQL + WebSocket integrated
- ⭐⭐⭐ Portfolio value

### Target (Phase 1 + 2)
- ✅ Above + C++ Native Addon
- ✅ High-performance thumbnail extraction
- ✅ Prometheus monitoring
- ⭐⭐⭐⭐⭐ Portfolio value

### Ideal (All phases)
- ✅ Above + Production deployment
- ✅ Complete documentation
- ✅ Demo video
- ⭐⭐⭐⭐⭐ Portfolio value + Deployable

---

## Reference Resources

**React & TypeScript**:
- React Docs: https://react.dev
- TypeScript Handbook: https://www.typescriptlang.org/docs

**FFmpeg**:
- FFmpeg Documentation: https://ffmpeg.org/documentation.html
- FFmpeg C API Examples: https://github.com/FFmpeg/FFmpeg/tree/master/doc/examples

**Node.js Native Addons**:
- N-API Documentation: https://nodejs.org/api/n-api.html
- node-addon-api: https://github.com/nodejs/node-addon-api

---

## Implementation Notes

### Agent Autonomy
- Tech choices: Agent decides implementation details
- Architecture: Agent designs class structure
- Optimization: Agent profiles and optimizes
- Testing: Agent writes test cases

### What Agent Should Decide
- Exact API endpoints and routes
- Database schema details
- Component hierarchy (React)
- C++ class design
- Caching strategies
- Error handling details

### What's Fixed
- KPIs (p99 < 50ms, etc.)
- Tech stack (React, C++, FFmpeg)
- Quality gates (valgrind, coverage)
- Arena60 patterns to reuse

---

**Target**: Voyager X (Vrew) - Web Application Developer  
**Tech Match**: 100% (React, TypeScript, Node.js, C++, FFmpeg, WebGL)  
**Arena60 Synergy**: PostgreSQL, Redis, WebSocket, Prometheus, Performance

**For execution**: Implement MVPs sequentially, validate each before proceeding