# VrewCraft Demo Video Guide

**Video Length**: 5 minutes
**Target Audience**: Voyager X (Vrew) hiring team
**Purpose**: Demonstrate full-stack capabilities and technical depth

---

## Video Outline

### Segment 1: Introduction (0:00 - 0:30)

**Talking Points**:
- "Hi, I'm presenting VrewCraft - a production-quality web video editor"
- "Built specifically to demonstrate skills for Voyager X's Web Application Developer position"
- "This project showcases: React + TypeScript, C++ depth, high-performance video processing, and production architecture"

**Screen**:
- Show GitHub repository
- Display README.md with project status table
- Highlight tech stack alignment (100%)

---

### Segment 2: Quick Start - Docker Deployment (0:30 - 1:30)

**Talking Points**:
- "Let me show you how easy it is to deploy the entire stack"
- "One command starts 6 services: frontend, backend, PostgreSQL, Redis, Prometheus, Grafana"
- "Everything is containerized and auto-provisioned"

**Demo Steps**:
```bash
# Terminal commands
cd deployments/docker
docker-compose up -d

# Wait ~10 seconds
docker-compose ps
```

**Screen Capture**:
1. Show `docker-compose.yml` file (all services)
2. Run `docker-compose up -d`
3. Show logs starting (all services healthy)
4. Show `docker ps` - 6 containers running
5. Open browser tabs:
   - http://localhost:5173 (Frontend)
   - http://localhost:3000 (Grafana)

**Talking Points**:
- "Frontend on port 5173, Backend API on 3001, WebSocket on 3002"
- "Grafana dashboard auto-configured with Prometheus datasource"
- "All services connected and ready to use"

---

### Segment 3: Frontend Demo - Video Editing (1:30 - 2:30)

**Talking Points**:
- "Now let's use the video editor"
- "Upload a video, see real-time metadata extraction"
- "Timeline renders at 60 FPS using Canvas API"
- "Let's perform some edits"

**Demo Steps**:
1. **Upload Video**:
   - Drag-and-drop a test video (e.g., 30-second clip)
   - Show upload progress
   - Metadata displays (duration, codec, resolution)
   - Thumbnail preview appears

2. **Timeline Interaction**:
   - Scroll through timeline
   - Click to seek to different positions
   - Show smooth 60 FPS rendering
   - Time ruler updates

3. **Edit Operations**:
   - **Trim**: Select 5s-15s range
   - Click "Trim"
   - WebSocket progress bar (real-time updates)
   - Download trimmed video

**Screen Capture**:
- Show upload UI with drag-and-drop zone
- Display video player with controls
- Highlight Canvas timeline (60 FPS indicator)
- Show edit panel (trim, split, subtitle, speed controls)
- Real-time progress bar during processing

**Talking Points**:
- "Notice the smooth timeline - that's Canvas rendering at 60 FPS"
- "Progress updates in real-time via WebSocket (< 100ms latency)"
- "All edits process in < 3 seconds for a 1-minute video"

---

### Segment 4: C++ Native Addon - Performance Deep Dive (2:30 - 3:30)

**Talking Points**:
- "This is where it gets interesting - C++ performance layer"
- "Direct FFmpeg C API usage, not a wrapper"
- "Let me show you the code and benchmarks"

**Demo Steps**:
1. **Show C++ Code**:
   ```bash
   # Open native/src/thumbnail_extractor.cpp
   code native/src/thumbnail_extractor.cpp
   ```
   - Scroll to RAII wrappers
   - Highlight memory pool usage
   - Show N-API bindings

2. **Run Load Test**:
   ```bash
   cd native/test/load-tests
   node thumbnail-load-test.js
   ```
   - Show 100 requests completing
   - Display results: p50, p95, p99
   - **Result**: p99 < 50ms ✅

3. **Memory Leak Check**:
   ```bash
   valgrind --leak-check=full node test/test.js
   ```
   - Show "0 bytes in 0 blocks" (no leaks)
   - **Result**: Zero leaks ✅

**Screen Capture**:
- VS Code with C++ code open
- Highlight key sections:
  - `AVFormatContextPtr` (RAII)
  - `MemoryPool::acquire()`
  - N-API `ObjectWrap`
- Terminal showing load test results
- Valgrind output (clean)

**Talking Points**:
- "RAII guarantees zero memory leaks"
- "Memory pool reduces allocations by 30%"
- "Thumbnail extraction: p99 < 50ms - that's 40% faster than JavaScript wrappers"
- "This demonstrates '필요에 따라서 더욱 저수준으로 내려갈 수 있음'"

---

### Segment 5: Production Monitoring (3:30 - 4:15)

**Talking Points**:
- "Production-grade monitoring with Prometheus and Grafana"
- "10 dashboard panels tracking all KPIs"
- "Real-time performance metrics"

**Demo Steps**:
1. **Grafana Dashboard**:
   - Open http://localhost:3000
   - Login (admin/admin)
   - Navigate to VrewCraft dashboard

2. **Show Panels**:
   - Thumbnail extraction performance (p50/p95/p99)
   - Metadata extraction performance
   - Cache hit ratio (> 80%)
   - Memory usage (stable)
   - Error rates (0%)

3. **Generate Load**:
   - Run load test in background
   - Watch dashboard update in real-time
   - Show p99 staying below 50ms threshold

**Screen Capture**:
- Grafana dashboard with all 10 panels
- Highlight key metrics:
  - Green lines (meeting targets)
  - Cache hit ratio gauge
  - Memory usage (flat line - no leak)
- Real-time updates as load test runs

**Talking Points**:
- "All metrics auto-provisioned via Docker Compose"
- "Dashboard shows we're meeting all performance targets"
- "This is Arena60 experience reuse - Prometheus M1.7 pattern"

---

### Segment 6: Architecture & Wrap-up (4:15 - 5:00)

**Talking Points**:
- "Let me quickly show the architecture"
- "This project demonstrates exactly what Voyager X is looking for"

**Demo Steps**:
1. **Show Architecture Diagram**:
   - Open `docs/architecture.md` in browser
   - Scroll through system overview diagram
   - Highlight components:
     - React Frontend
     - Node.js Backend
     - C++ Native Addon
     - PostgreSQL + Redis
     - Prometheus + Grafana

2. **Show Documentation**:
   - README.md (comprehensive)
   - docs/performance-report.md (detailed benchmarks)
   - GitHub repository structure

**Screen Capture**:
- Architecture diagram (ASCII art)
- Performance report table (all KPIs met)
- GitHub repository (clean structure)

**Talking Points**:
- "React 18 + TypeScript for frontend"
- "Node.js 20 + Express for backend"
- "C++17 for performance-critical operations"
- "PostgreSQL for persistence, Redis for caching"
- "100% alignment with Voyager X tech stack"

**Closing**:
- "This project demonstrates:
  1. Deep C++ understanding - FFmpeg C API, N-API, RAII
  2. Modern web development - React, TypeScript, WebSocket
  3. Production architecture - Docker, monitoring, scaling
  4. Arena60 experience reuse - PostgreSQL, Redis, Prometheus"

- "All code is on GitHub, fully documented, and ready to deploy"
- "Thank you for your time!"

---

## Recording Checklist

### Before Recording

- [ ] Clean system (close unnecessary apps)
- [ ] Prepare test video (30-second clip, 1920x1080)
- [ ] Start Docker services (`docker-compose up -d`)
- [ ] Verify all services healthy
- [ ] Open required browser tabs (Frontend, Grafana)
- [ ] Open VS Code with C++ code
- [ ] Test microphone and screen capture
- [ ] Practice run (ensure timing)

### Recording Setup

**Screen Recording**:
- Tool: OBS Studio / Loom / QuickTime
- Resolution: 1920x1080
- Frame rate: 30 FPS
- Bitrate: 5000 kbps (high quality)

**Audio**:
- Clear microphone
- Quiet environment
- Script prepared (natural delivery)

**Browser Windows**:
- Tab 1: Frontend (http://localhost:5173)
- Tab 2: Grafana (http://localhost:3000)
- Tab 3: GitHub repository
- Tab 4: Documentation (architecture.md)

**Terminal Windows**:
- Terminal 1: Docker commands
- Terminal 2: Load tests
- Terminal 3: Valgrind

**Code Editor**:
- VS Code with native/src/thumbnail_extractor.cpp open
- Font size: 14-16pt (readable on video)

---

## Alternative: Screen Recording Script

If creating a full demo video is not feasible, prepare a **screenshot walkthrough** with annotations:

### Screenshot Set 1: Deployment
1. `docker-compose.yml` file
2. `docker-compose up -d` output
3. `docker ps` showing 6 containers
4. Frontend homepage
5. Grafana dashboard

### Screenshot Set 2: Video Editing
1. Upload UI (drag-and-drop)
2. Video player with timeline
3. Edit controls (trim, split, subtitle, speed)
4. WebSocket progress bar
5. Download completed video

### Screenshot Set 3: C++ Performance
1. `thumbnail_extractor.cpp` code (RAII section)
2. Load test results (p99 < 50ms)
3. Valgrind output (zero leaks)
4. Memory pool stats

### Screenshot Set 4: Monitoring
1. Grafana dashboard overview
2. Thumbnail performance panel
3. Cache hit ratio
4. Memory usage
5. KPI table (all green)

### Screenshot Set 5: Architecture
1. Architecture diagram
2. Performance report table
3. GitHub repository structure
4. README with tech stack

---

## Upload Locations

**Primary**:
- YouTube (unlisted) - Best for portfolio
- Loom - Quick sharing with hiring team

**Secondary**:
- GitHub README (embedded video)
- LinkedIn (career highlight)
- Portfolio website

---

## Video Title & Description

**Title**:
"VrewCraft - Web Video Editor: React + TypeScript + C++ | Voyager X Portfolio"

**Description**:
```
VrewCraft is a production-quality web video editor demonstrating:

✅ Deep C++ expertise: FFmpeg C API, N-API, RAII, zero memory leaks
✅ Modern web development: React 18, TypeScript 5, WebSocket real-time
✅ Performance optimization: p99 < 50ms thumbnail extraction
✅ Production architecture: Docker, Prometheus, Grafana monitoring
✅ 100% Voyager X tech stack alignment

Tech Stack:
- Frontend: React 18, TypeScript 5, Vite, TailwindCSS, Canvas API
- Backend: Node.js 20, Express, TypeScript, WebSocket
- Native: C++17, N-API, FFmpeg C API, RAII memory management
- Data: PostgreSQL 15, Redis 7
- Monitoring: Prometheus, Grafana

Performance Achievements:
- Thumbnail extraction: p99 < 50ms ✅
- Timeline rendering: 60 FPS ✅
- Zero memory leaks (valgrind verified) ✅
- WebSocket latency: < 100ms ✅

GitHub: [repository URL]
Documentation: [docs link]

Built for Voyager X (Vrew) - Web Application Developer position
```

---

## Tips for Effective Demo

1. **Keep it moving**: Don't dwell on any section > 1 minute
2. **Show, don't just tell**: Actually run commands and show results
3. **Highlight differentiators**:
   - C++ vs. JavaScript wrapper (40% faster)
   - RAII (zero leaks)
   - Production monitoring (most don't have this)
4. **Be enthusiastic**: Show passion for the tech
5. **Practice timing**: Aim for 4:30-4:45 (buffer for editing)
6. **End strong**: Clear summary of value delivered

---

## Post-Recording

### Editing
- Add title cards for each segment
- Zoom in on important code sections
- Add annotations/arrows to highlight key points
- Include performance numbers as overlays
- Background music (subtle, professional)

### Publishing
- Upload to YouTube (unlisted)
- Add to GitHub README
- Share link in job application
- LinkedIn post (career highlight)

---

**Last Updated**: 2025-11-14
**Status**: Ready to record
**Estimated Production Time**: 2-3 hours (recording + editing)
