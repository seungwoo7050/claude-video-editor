# WebSocket 실시간 진행률

**목표**: WebSocket으로 비디오 처리 진행률 실시간 전송  
**난이도**: ⭐⭐⭐☆☆ (중급)  
**예상 시간**: 4-5시간 (정독 + 실습)  
**선행 과정**: [91-nodejs-express-backend.md](91-nodejs-express-backend.md)

---

## 📋 목차

1. [WebSocket 기초](#part-1-websocket-기초)
2. [서버 구현](#part-2-서버-구현)
3. [클라이언트 구현](#part-3-클라이언트-구현)
4. [진행률 통합](#part-4-진행률-통합)

---

## Part 1: WebSocket 기초

### 1.1 WebSocket이란?

```
WebSocket = 양방향 실시간 통신 프로토콜

특징:
✅ 전이중 통신 (Full-Duplex)
✅ 실시간 데이터 전송
✅ 낮은 오버헤드 (HTTP 폴링 대비)
✅ 지속적 연결

vs HTTP:
- HTTP: 요청-응답 (단방향)
- WebSocket: 양방향 (서버 → 클라이언트 푸시 가능)

vs Server-Sent Events (SSE):
- SSE: 서버 → 클라이언트만 (단방향)
- WebSocket: 양방향
```

---

### 1.2 사용 사례

```
VrewCraft에서 WebSocket:

1. 비디오 업로드 진행률
   - 0% → 100% 실시간 업데이트

2. 비디오 처리 진행률
   - FFmpeg 트리밍/자막 추가 진행률

3. 썸네일 추출 상태
   - 추출 시작 → 완료 알림

4. 에러 알림
   - 처리 실패 시 즉시 통지
```

---

### 1.3 설치

```bash
# Backend
cd backend
npm install ws
npm install -D @types/ws

# Frontend
# 브라우저 내장 WebSocket API 사용 (설치 불필요)
```

---

## Part 2: 서버 구현

### 2.1 WebSocket 서버 생성

```typescript
// backend/src/ws/ws-server.ts
import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';

export interface WSMessage {
  type: 'progress' | 'complete' | 'error';
  videoId: string;
  data: any;
}

export class VrewCraftWSServer {
  private wss: WebSocketServer;
  private clients: Map<string, Set<WebSocket>> = new Map();
  
  constructor(port: number = 3002) {
    this.wss = new WebSocketServer({ port });
    
    this.wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
      console.log('WebSocket client connected');
      
      ws.on('message', (data: Buffer) => {
        this.handleMessage(ws, data);
      });
      
      ws.on('close', () => {
        this.handleDisconnect(ws);
        console.log('WebSocket client disconnected');
      });
      
      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
      });
    });
    
    console.log(`WebSocket server running on port ${port}`);
  }
  
  private handleMessage(ws: WebSocket, data: Buffer) {
    try {
      const message = JSON.parse(data.toString());
      
      // 클라이언트 등록
      if (message.type === 'subscribe') {
        const videoId = message.videoId;
        
        if (!this.clients.has(videoId)) {
          this.clients.set(videoId, new Set());
        }
        
        this.clients.get(videoId)!.add(ws);
        
        ws.send(JSON.stringify({
          type: 'subscribed',
          videoId
        }));
      }
    } catch (error) {
      console.error('Failed to parse message:', error);
    }
  }
  
  private handleDisconnect(ws: WebSocket) {
    // 모든 구독에서 제거
    this.clients.forEach((clients) => {
      clients.delete(ws);
    });
  }
  
  // 특정 비디오에 대한 메시지 전송
  sendToVideo(videoId: string, message: WSMessage) {
    const clients = this.clients.get(videoId);
    
    if (!clients || clients.size === 0) {
      return;
    }
    
    const data = JSON.stringify(message);
    
    clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    });
  }
  
  // 진행률 전송
  sendProgress(videoId: string, percent: number, message?: string) {
    this.sendToVideo(videoId, {
      type: 'progress',
      videoId,
      data: {
        percent,
        message
      }
    });
  }
  
  // 완료 알림
  sendComplete(videoId: string, outputUrl: string) {
    this.sendToVideo(videoId, {
      type: 'complete',
      videoId,
      data: {
        outputUrl
      }
    });
  }
  
  // 에러 알림
  sendError(videoId: string, error: string) {
    this.sendToVideo(videoId, {
      type: 'error',
      videoId,
      data: {
        error
      }
    });
  }
  
  close() {
    this.wss.close();
  }
}
```

---

### 2.2 서버 통합

```typescript
// backend/src/server.ts
import express from 'express';
import { VrewCraftWSServer } from './ws/ws-server';

const app = express();
const PORT = 3001;

// WebSocket 서버 생성
export const wsServer = new VrewCraftWSServer(3002);

app.use(express.json());

// ... 기존 라우트

app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
  console.log(`WebSocket running on port 3002`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  wsServer.close();
  process.exit(0);
});
```

---

### 2.3 FFmpeg 진행률 통합

```typescript
// backend/src/services/ffmpeg.service.ts
import ffmpeg from 'fluent-ffmpeg';
import { wsServer } from '../server';

export class FFmpegService {
  async trimWithProgress(
    videoId: string,
    inputPath: string,
    startTime: number,
    endTime: number
  ): Promise<string> {
    const outputPath = `outputs/${videoId}_trimmed.mp4`;
    
    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .setStartTime(startTime)
        .setDuration(endTime - startTime)
        .videoCodec('copy')
        .audioCodec('copy')
        .output(outputPath)
        .on('start', () => {
          wsServer.sendProgress(videoId, 0, 'Starting trim...');
        })
        .on('progress', (progress) => {
          // FFmpeg progress: { percent, currentFps, currentKbps }
          const percent = Math.min(progress.percent || 0, 100);
          wsServer.sendProgress(videoId, percent, 'Trimming video...');
        })
        .on('end', () => {
          wsServer.sendProgress(videoId, 100, 'Trim complete');
          wsServer.sendComplete(videoId, `/videos/${videoId}_trimmed.mp4`);
          resolve(outputPath);
        })
        .on('error', (err) => {
          wsServer.sendError(videoId, err.message);
          reject(err);
        })
        .run();
    });
  }
}
```

---

### 2.4 라우트 통합

```typescript
// backend/src/routes/edit.ts
import { Router } from 'express';
import { FFmpegService } from '../services/ffmpeg.service';

const router = Router();
const ffmpegService = new FFmpegService();

router.post('/trim', async (req, res) => {
  try {
    const { videoId, inputPath, startTime, endTime } = req.body;
    
    // 비동기 처리 시작 (WebSocket으로 진행률 전송)
    ffmpegService.trimWithProgress(videoId, inputPath, startTime, endTime)
      .catch(err => {
        console.error('Trim failed:', err);
      });
    
    // 즉시 응답
    res.json({
      success: true,
      message: 'Trim started',
      videoId
    });
    
  } catch (error) {
    res.status(500).json({ error: 'Trim failed' });
  }
});

export default router;
```

---

## Part 3: 클라이언트 구현

### 3.1 WebSocket Hook

```typescript
// frontend/src/hooks/useWebSocket.ts
import { useEffect, useRef, useState } from 'react';

interface ProgressData {
  percent: number;
  message?: string;
}

interface WSMessage {
  type: 'progress' | 'complete' | 'error' | 'subscribed';
  videoId: string;
  data: any;
}

export const useWebSocket = (videoId: string | null) => {
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  
  const wsRef = useRef<WebSocket | null>(null);
  
  useEffect(() => {
    if (!videoId) return;
    
    // WebSocket 연결
    const ws = new WebSocket('ws://localhost:3002');
    wsRef.current = ws;
    
    ws.onopen = () => {
      console.log('WebSocket connected');
      setConnected(true);
      
      // 구독
      ws.send(JSON.stringify({
        type: 'subscribe',
        videoId
      }));
    };
    
    ws.onmessage = (event) => {
      const message: WSMessage = JSON.parse(event.data);
      
      switch (message.type) {
        case 'subscribed':
          console.log('Subscribed to', message.videoId);
          break;
        
        case 'progress':
          setProgress(message.data);
          break;
        
        case 'complete':
          setOutputUrl(message.data.outputUrl);
          setProgress({ percent: 100, message: 'Complete!' });
          break;
        
        case 'error':
          setError(message.data.error);
          break;
      }
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setError('WebSocket connection error');
    };
    
    ws.onclose = () => {
      console.log('WebSocket disconnected');
      setConnected(false);
    };
    
    // 정리
    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
    
  }, [videoId]);
  
  return {
    progress,
    outputUrl,
    error,
    connected
  };
};
```

---

### 3.2 진행률 바 컴포넌트

```typescript
// frontend/src/components/ProgressBar.tsx
import React from 'react';

interface ProgressBarProps {
  percent: number;
  message?: string;
}

export const ProgressBar = ({ percent, message }: ProgressBarProps) => {
  return (
    <div className="w-full">
      <div className="flex justify-between mb-1">
        <span className="text-sm text-gray-400">{message || 'Processing...'}</span>
        <span className="text-sm text-gray-400">{Math.round(percent)}%</span>
      </div>
      
      <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-500 transition-all duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
};
```

---

### 3.3 비디오 편집 컴포넌트

```typescript
// frontend/src/components/VideoEditor.tsx
import React, { useState } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';
import { ProgressBar } from './ProgressBar';
import axios from 'axios';

export const VideoEditor = () => {
  const [videoId, setVideoId] = useState<string | null>(null);
  const [inputPath, setInputPath] = useState<string>('');
  
  const { progress, outputUrl, error, connected } = useWebSocket(videoId);
  
  const handleTrim = async () => {
    try {
      const newVideoId = `video_${Date.now()}`;
      setVideoId(newVideoId);
      
      const response = await axios.post('http://localhost:3001/api/edit/trim', {
        videoId: newVideoId,
        inputPath,
        startTime: 10,
        endTime: 30
      });
      
      console.log('Trim started:', response.data);
      
    } catch (err) {
      console.error('Trim failed:', err);
    }
  };
  
  return (
    <div className="p-8 bg-gray-800 rounded-lg">
      <h2 className="text-2xl font-bold mb-4">Video Editor</h2>
      
      <div className="mb-4">
        <label className="block text-sm mb-2">Input Video Path</label>
        <input
          type="text"
          value={inputPath}
          onChange={(e) => setInputPath(e.target.value)}
          className="w-full px-3 py-2 bg-gray-700 rounded"
          placeholder="uploads/video.mp4"
        />
      </div>
      
      <button
        onClick={handleTrim}
        disabled={!connected || !inputPath}
        className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50"
      >
        Trim Video (10s - 30s)
      </button>
      
      {progress && (
        <div className="mt-4">
          <ProgressBar percent={progress.percent} message={progress.message} />
        </div>
      )}
      
      {outputUrl && (
        <div className="mt-4 p-4 bg-green-900 rounded">
          <p className="text-green-300">✅ Video ready!</p>
          <a
            href={`http://localhost:3001${outputUrl}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 underline"
          >
            Download
          </a>
        </div>
      )}
      
      {error && (
        <div className="mt-4 p-4 bg-red-900 rounded">
          <p className="text-red-300">❌ Error: {error}</p>
        </div>
      )}
      
      <div className="mt-4 text-xs text-gray-500">
        WebSocket: {connected ? '✅ Connected' : '❌ Disconnected'}
      </div>
    </div>
  );
};
```

---

## Part 4: 진행률 통합

### 4.1 업로드 진행률

```typescript
// frontend/src/hooks/useVideoUpload.ts
import { useState } from 'react';
import axios from 'axios';

export const useVideoUpload = (onComplete: (videoId: string) => void) => {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  const upload = async (file: File) => {
    setUploading(true);
    setUploadProgress(0);
    
    const formData = new FormData();
    formData.append('video', file);
    
    try {
      const response = await axios.post(
        'http://localhost:3001/api/upload',
        formData,
        {
          onUploadProgress: (progressEvent) => {
            const percent = (progressEvent.loaded / progressEvent.total!) * 100;
            setUploadProgress(percent);
          }
        }
      );
      
      const videoId = response.data.videoId;
      onComplete(videoId);
      
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setUploading(false);
    }
  };
  
  return {
    upload,
    uploading,
    uploadProgress
  };
};
```

---

### 4.2 다중 작업 진행률

```typescript
// frontend/src/components/TaskList.tsx
import React from 'react';
import { ProgressBar } from './ProgressBar';

interface Task {
  id: string;
  name: string;
  progress: number;
  status: 'pending' | 'processing' | 'complete' | 'error';
}

export const TaskList = ({ tasks }: { tasks: Task[] }) => {
  return (
    <div className="space-y-4">
      {tasks.map((task) => (
        <div key={task.id} className="p-4 bg-gray-800 rounded">
          <div className="flex justify-between mb-2">
            <span className="font-medium">{task.name}</span>
            <span className={`text-sm ${
              task.status === 'complete' ? 'text-green-400' :
              task.status === 'error' ? 'text-red-400' :
              'text-gray-400'
            }`}>
              {task.status.toUpperCase()}
            </span>
          </div>
          
          {task.status === 'processing' && (
            <ProgressBar percent={task.progress} />
          )}
        </div>
      ))}
    </div>
  );
};
```

---

### 4.3 재연결 로직

```typescript
// frontend/src/hooks/useWebSocket.ts (수정)
export const useWebSocket = (videoId: string | null) => {
  // ... 기존 코드
  
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const maxReconnectAttempts = 5;
  
  const connect = () => {
    if (!videoId) return;
    
    const ws = new WebSocket('ws://localhost:3002');
    wsRef.current = ws;
    
    ws.onopen = () => {
      setConnected(true);
      setReconnectAttempts(0);  // 리셋
      
      ws.send(JSON.stringify({
        type: 'subscribe',
        videoId
      }));
    };
    
    ws.onclose = () => {
      setConnected(false);
      
      // 재연결 시도
      if (reconnectAttempts < maxReconnectAttempts) {
        setTimeout(() => {
          setReconnectAttempts(prev => prev + 1);
          connect();
        }, 2000 * (reconnectAttempts + 1));  // 지수 백오프
      }
    };
    
    // ... 기존 메시지 핸들러
  };
  
  useEffect(() => {
    connect();
    
    return () => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.close();
      }
    };
  }, [videoId]);
  
  // ...
};
```

---

## 🎯 실전 체크리스트

### 서버
- [ ] WebSocketServer 생성
- [ ] 클라이언트 구독 관리 (Map)
- [ ] 메시지 브로드캐스트
- [ ] FFmpeg 진행률 통합

### 클라이언트
- [ ] WebSocket Hook 구현
- [ ] 진행률 바 컴포넌트
- [ ] 연결 상태 표시
- [ ] 재연결 로직

### 통합
- [ ] 업로드 진행률 (axios)
- [ ] 처리 진행률 (FFmpeg)
- [ ] 완료 알림
- [ ] 에러 처리

---

## 📚 면접 예상 질문

### 기초
1. **WebSocket vs HTTP의 차이는?**
   - HTTP: 요청-응답 (단방향)
   - WebSocket: 양방향 실시간 통신

2. **WebSocket 연결 과정은?**
   - HTTP Upgrade 요청 → 101 Switching Protocols

3. **readyState란?**
   - CONNECTING (0), OPEN (1), CLOSING (2), CLOSED (3)

4. **ws 패키지의 역할은?**
   - Node.js WebSocket 서버 구현

5. **클라이언트 구독 관리 방법은?**
   - Map<videoId, Set<WebSocket>>

### 심화
6. **재연결 전략은?**
   - 지수 백오프 (2초, 4초, 8초, ...)
   - 최대 재시도 횟수 제한

7. **다중 클라이언트 동기화는?**
   - 동일 videoId 구독자들에게 브로드캐스트

8. **메모리 누수 방지는?**
   - 연결 종료 시 Map에서 제거
   - useEffect cleanup

9. **WebSocket vs Server-Sent Events?**
   - WebSocket: 양방향, 바이너리 지원
   - SSE: 서버 → 클라이언트만, 텍스트만

10. **프로덕션에서 고려사항은?**
    - 인증 (JWT 토큰)
    - 로드 밸런싱 (Redis Pub/Sub)
    - 타임아웃 설정

---

**다음 문서**: [98-docker-compose-stack.md](98-docker-compose-stack.md) - Docker 배포 스택
