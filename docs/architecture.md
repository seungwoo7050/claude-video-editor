# VrewCraft Architecture

## Overview

VrewCraft is a web-based video editor built to demonstrate modern full-stack development with deep C++ integration.

## System Architecture

```
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│   Frontend  │──────▶│   Backend   │──────▶│  PostgreSQL │
│  React+TS   │       │  Node.js+TS │       │             │
└─────────────┘       └─────────────┘       └─────────────┘
       │                     │
       │              ┌──────┴──────┐
       │              │             │
       │          ┌───▼───┐    ┌───▼───┐
       └─────────▶│ Redis │    │ C++   │
         WS        │       │    │Native │
                   └───────┘    └───────┘
```

## Technology Stack

### Frontend
- **React 18**: UI framework
- **TypeScript**: Type safety
- **Vite**: Build tool
- **TailwindCSS**: Styling
- **WebGL/Canvas**: Timeline rendering

### Backend
- **Node.js 20**: Runtime
- **Express**: Web framework
- **TypeScript**: Type safety
- **fluent-ffmpeg**: FFmpeg wrapper (Phase 1)
- **WebSocket**: Real-time updates

### Native Layer (Phase 2)
- **C++17**: Performance-critical operations
- **N-API**: Node.js bindings
- **FFmpeg C API**: Direct video processing
- **RAII**: Memory management

### Data Layer
- **PostgreSQL 15**: Project persistence
- **Redis 7**: Caching, sessions
- **Prometheus**: Metrics
- **Grafana**: Monitoring dashboards

## Data Flow

### Video Upload
1. Frontend: Multipart file upload
2. Backend: Save to `uploads/` directory
3. Backend: Extract metadata with FFmpeg
4. Backend: Generate thumbnail (cached in Redis)
5. Frontend: Display preview

### Video Processing
1. Frontend: User defines edits (trim, split, subtitle)
2. Backend: Queue processing job
3. Backend: FFmpeg processing with WebSocket progress
4. Backend: Save output to `outputs/` directory
5. Frontend: Display result

### Project Save/Load
1. Frontend: Serialize timeline state
2. Backend: Store in PostgreSQL
3. Backend: Cache in Redis (session-based)
4. Frontend: Restore on load

## Performance Targets

- Thumbnail extraction: p99 < 50ms
- API latency: p99 < 200ms
- Frontend render: 60 FPS
- Video upload: p99 < 5s (100MB)

## Security Considerations

- Input validation on all endpoints
- File type restrictions
- Size limits on uploads
- Parameterized SQL queries
- CORS configuration

## Scalability

- Stateless backend (horizontal scaling)
- Redis for distributed sessions
- PostgreSQL connection pooling
- CDN for static assets (future)

## Development Phases

See `CLAUDE.md` for detailed phase breakdown.
