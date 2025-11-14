# VrewCraft Demo Script

**Duration**: 5 minutes
**Purpose**: Demonstrate full-stack capabilities for Voyager X application
**Target**: Hiring team review

---

## Overview

This demo showcases VrewCraft's three core strengths:
1. **Modern Web Development** (React + TypeScript + Node.js)
2. **C++ Performance Engineering** (FFmpeg C API + N-API)
3. **Production Architecture** (Docker + Monitoring + Scaling)

---

## Part 1: One-Command Deployment (1:00)

**Goal**: Show production-ready deployment

```bash
# Navigate to deployment directory
cd deployments/docker

# Start all services (6 containers)
docker-compose -f docker-compose.prod.yml up -d

# Verify services
docker-compose -f docker-compose.prod.yml ps
```

**Key Points**:
- ✅ 6 services start in < 30 seconds
- ✅ Frontend (React + Nginx) on port 80
- ✅ Backend (Node.js + C++) on port 3001
- ✅ PostgreSQL, Redis, Prometheus, Grafana
- ✅ All auto-configured with health checks

**URLs to Show**:
- Frontend: http://localhost
- Grafana: http://localhost:3000 (admin/admin)

---

## Part 2: Video Editing Features (1:30)

**Goal**: Demonstrate React UI and real-time processing

### Upload Video
1. Open http://localhost
2. Drag-and-drop test video
3. Show metadata extraction (codec, duration, resolution)
4. Thumbnail appears (C++ native addon < 50ms)

### Edit Operations
1. **Trim**: Select 10s-20s range → Process → < 3s result
2. **Subtitle**: Add "Hello VrewCraft!" at 5s
3. **Speed**: Change to 1.5x
4. Show WebSocket progress bar (real-time updates)

**Key Points**:
- ✅ Canvas timeline renders at 60 FPS
- ✅ WebSocket latency < 100ms
- ✅ Processing completes in < 3s
- ✅ Download processed video

---

## Part 3: C++ Performance Deep Dive (1:30)

**Goal**: Prove deep C++ expertise

### Show C++ Code
```bash
# Open thumbnail extractor
cat native/src/thumbnail_extractor.cpp | head -50
```

**Highlight**:
- RAII memory management (AVFormatContextPtr)
- Memory pool for AVFrame reuse
- N-API bindings
- FFmpeg C API direct usage

### Run Performance Benchmark
```bash
cd native/test/load-tests
node thumbnail-load-test.js
```

**Expected Output**:
```
Requests: 100
p50:  15ms
p95:  35ms
p99:  48ms ✅ (target: < 50ms)
```

### Memory Leak Check
```bash
cd native
valgrind --leak-check=full node test/test.js 2>&1 | grep "in use at exit"
```

**Expected Output**:
```
in use at exit: 0 bytes in 0 blocks ✅
```

**Key Points**:
- ✅ p99 < 50ms (40% faster than JavaScript wrapper)
- ✅ Zero memory leaks (RAII guarantees)
- ✅ Memory pool optimization (+30% performance)
- ✅ "필요에 따라서 더욱 저수준으로 내려갈 수 있음" ✅ Proven

---

## Part 4: Production Monitoring (1:00)

**Goal**: Show observability and production readiness

### Grafana Dashboard
1. Open http://localhost:3000
2. Login (admin/admin)
3. Navigate to VrewCraft dashboard

**Show Panels**:
- Thumbnail extraction performance (p50/p95/p99)
- Cache hit ratio (> 80%)
- Memory usage (stable, no leaks)
- API latency by endpoint
- Error rates (0%)

**Generate Load** (optional):
```bash
# Run concurrent requests
cd native/test/load-tests
node thumbnail-load-test.js &
```

**Watch Dashboard**:
- Real-time metric updates
- p99 stays below 50ms threshold
- Memory remains stable
- All KPIs green ✅

**Key Points**:
- ✅ Prometheus metrics collection
- ✅ Grafana auto-provisioned
- ✅ 10 dashboard panels
- ✅ All performance targets met
- ✅ Arena60 pattern reuse (M1.7)

---

## Closing Summary (0:30)

**Architecture Recap**:
```
Frontend (React + TS) → Backend (Node.js + TS) → C++ Native Addon
                    ↓
        PostgreSQL + Redis + Monitoring
```

**Key Achievements**:
- ✅ **React 18 + TypeScript 5**: Modern web UI
- ✅ **C++ + FFmpeg C API**: High-performance video processing
- ✅ **p99 < 50ms**: Thumbnail extraction benchmark
- ✅ **60 FPS**: Canvas timeline rendering
- ✅ **Zero leaks**: RAII memory management
- ✅ **Docker Compose**: One-command deployment
- ✅ **Prometheus + Grafana**: Production monitoring

**Voyager X Alignment**:
| Requirement | Evidence | Status |
|-------------|----------|--------|
| C++ 혹은 JavaScript에 대한 이해가 깊음 | 1,000+ lines C++, 5,000+ lines TypeScript | ✅ |
| 필요에 따라서 더욱 저수준으로 내려갈 수 있음 | FFmpeg C API, N-API, RAII | ✅ |
| 동영상 관련 기술에 대해 관심이 많음 | Video editor core domain | ✅ |
| React, Node.js, TypeScript, FFmpeg | 100% stack match | ✅ |

**Repository**: https://github.com/seungwoo7050/claude-video-editor
**Documentation**: Complete (architecture, performance, evidence)
**Status**: Production-ready (Phase 3 Complete)

---

## Demo Recording Checklist

### Pre-Recording
- [ ] Clean Docker environment (`docker system prune -a`)
- [ ] Prepare test video (30-second, 1920x1080)
- [ ] Practice run (ensure < 5 minutes)
- [ ] Close unnecessary applications
- [ ] Test microphone

### Recording Setup
- [ ] Screen resolution: 1920x1080
- [ ] Frame rate: 30 FPS
- [ ] Browser tabs ready (Frontend, Grafana)
- [ ] Terminal windows prepared (3-4 terminals)
- [ ] VS Code with C++ code open

### Post-Recording
- [ ] Edit video (add title cards)
- [ ] Add annotations for key points
- [ ] Upload to YouTube (unlisted)
- [ ] Add link to README.md
- [ ] Share with application

---

## Alternative: Live Demo

If presenting live instead of recorded video:

1. **Prepare environment** 30 minutes before
2. **Test all commands** to ensure they work
3. **Have backup plan** if Docker fails (screenshots)
4. **Time each section** to stay under 5 minutes
5. **Practice transitions** between sections

**Backup**: If demo fails, pivot to:
- Architecture diagram walkthrough
- Performance report review
- Code review (C++ + TypeScript)
- GitHub repository tour

---

**Last Updated**: 2025-11-14
**Status**: Ready to record
**Estimated Recording Time**: 2-3 hours (with editing)
