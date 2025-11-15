# React + TypeScript + Vite 세팅

**목표**: 모던 React 개발 환경 구축 및 비디오 편집기 UI 구현  
**난이도**: ⭐⭐⭐☆☆ (중급)  
**예상 시간**: 4-5시간 (정독 + 실습)  
**선행 과정**: [07-frontend-basics.md](../00-common/07-frontend-basics.md)

---

## 📋 목차

1. [프로젝트 세팅](#part-1-프로젝트-세팅)
2. [React 핵심 개념](#part-2-react-핵심-개념)
3. [TypeScript 타입 시스템](#part-3-typescript-타입-시스템)
4. [비디오 편집기 UI](#part-4-비디오-편집기-ui)

---

## Part 1: 프로젝트 세팅

### 1.1 Vite란?

```
Vite = 차세대 프론트엔드 빌드 도구

장점:
✅ 빠른 개발 서버 (ESM 기반, HMR < 100ms)
✅ 빠른 빌드 (Rollup 기반)
✅ TypeScript 기본 지원
✅ React Fast Refresh

Create React App vs Vite:
CRA: 느린 시작 (Webpack), 느린 HMR (5초+)
Vite: 빠른 시작 (<1초), 빠른 HMR (<100ms)
```

---

### 1.2 프로젝트 생성

```bash
# Vite 프로젝트 생성
npm create vite@latest vrewcraft-frontend -- --template react-ts

cd vrewcraft-frontend

# 의존성 설치
npm install

# 개발 서버 시작
npm run dev
# → http://localhost:5173
```

**프로젝트 구조**:
```
vrewcraft-frontend/
├── src/
│   ├── App.tsx           # 메인 컴포넌트
│   ├── main.tsx          # Entry point
│   ├── index.css         # 전역 스타일
│   └── vite-env.d.ts     # Vite 타입 정의
├── public/               # 정적 파일
├── index.html            # HTML 템플릿
├── tsconfig.json         # TypeScript 설정
├── vite.config.ts        # Vite 설정
└── package.json
```

---

### 1.3 TailwindCSS 설치

```bash
# TailwindCSS 설치
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p

# 또는 자동 설정
npm install -D @tailwindcss/vite
```

**tailwind.config.js**:
```js
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

**src/index.css**:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

---

### 1.4 추가 라이브러리

```bash
# 상태 관리
npm install zustand

# HTTP 클라이언트
npm install axios

# 비디오 플레이어
npm install react-player

# 아이콘
npm install lucide-react

# 유틸리티
npm install clsx
```

---

## Part 2: React 핵심 개념

### 2.1 Component 기초

#### Function Component

```tsx
// src/components/VideoPlayer.tsx
import { useState } from 'react';

interface VideoPlayerProps {
  url: string;
  onTimeUpdate?: (currentTime: number) => void;
}

export function VideoPlayer({ url, onTimeUpdate }: VideoPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  
  return (
    <div className="relative w-full h-full bg-black">
      <video
        src={url}
        className="w-full h-full"
        controls
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onTimeUpdate={(e) => {
          const video = e.target as HTMLVideoElement;
          onTimeUpdate?.(video.currentTime);
        }}
      />
      <div className="absolute top-4 right-4 text-white">
        {isPlaying ? '▶️ Playing' : '⏸️ Paused'}
      </div>
    </div>
  );
}
```

**설명**:
- `interface VideoPlayerProps`: Props 타입 정의
- `useState`: 상태 관리 (재생/일시정지)
- `onTimeUpdate?`: Optional prop (콜백 함수)
- `className`: TailwindCSS 클래스

---

### 2.2 useState Hook

```tsx
// 단일 상태
const [count, setCount] = useState(0);
setCount(count + 1);  // 상태 업데이트 → 자동 re-render

// 객체 상태
const [video, setVideo] = useState({
  duration: 0,
  currentTime: 0,
  url: ''
});

// ❌ Bad: 직접 수정 (불가)
video.currentTime = 10;

// ✅ Good: 새 객체 생성
setVideo({
  ...video,
  currentTime: 10
});

// 또는
setVideo(prev => ({
  ...prev,
  currentTime: 10
}));
```

---

### 2.3 useEffect Hook

```tsx
import { useEffect } from 'react';

function VideoUploader() {
  const [file, setFile] = useState<File | null>(null);
  
  // 1. Mount 시 한 번만 실행
  useEffect(() => {
    console.log('Component mounted');
    
    // Cleanup (Unmount 시)
    return () => {
      console.log('Component unmounted');
    };
  }, []);  // Empty dependency array
  
  // 2. file 변경 시 실행
  useEffect(() => {
    if (file) {
      console.log('File changed:', file.name);
    }
  }, [file]);  // file이 dependency
  
  // 3. 매 렌더마다 실행 (비권장)
  useEffect(() => {
    console.log('Every render');
  });  // No dependency array
  
  return (
    <input
      type="file"
      accept="video/*"
      onChange={(e) => setFile(e.target.files?.[0] || null)}
    />
  );
}
```

---

### 2.4 Custom Hook

```tsx
// src/hooks/useVideoUpload.ts
import { useState } from 'react';
import axios from 'axios';

interface UploadProgress {
  loaded: number;
  total: number;
  percent: number;
}

export function useVideoUpload() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const upload = async (file: File) => {
    setUploading(true);
    setError(null);
    
    const formData = new FormData();
    formData.append('video', file);
    
    try {
      const response = await axios.post('/api/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            setProgress({
              loaded: progressEvent.loaded,
              total: progressEvent.total,
              percent: Math.round((progressEvent.loaded / progressEvent.total) * 100)
            });
          }
        }
      });
      
      return response.data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
      throw err;
    } finally {
      setUploading(false);
    }
  };
  
  return { upload, uploading, progress, error };
}
```

**사용**:
```tsx
function UploadButton() {
  const { upload, uploading, progress } = useVideoUpload();
  
  const handleUpload = async (file: File) => {
    const result = await upload(file);
    console.log('Uploaded:', result.url);
  };
  
  return (
    <div>
      {uploading && progress && (
        <div>Uploading: {progress.percent}%</div>
      )}
    </div>
  );
}
```

---

## Part 3: TypeScript 타입 시스템

### 3.1 기본 타입

```tsx
// Primitive types
const name: string = 'video.mp4';
const duration: number = 120.5;
const isPlaying: boolean = false;

// Array
const tags: string[] = ['tutorial', 'react'];
const numbers: Array<number> = [1, 2, 3];

// Tuple
const point: [number, number] = [100, 200];

// Union
type Status = 'idle' | 'uploading' | 'processing' | 'done';
const status: Status = 'uploading';

// Any (비권장)
const data: any = { foo: 'bar' };

// Unknown (권장)
const input: unknown = getUserInput();
if (typeof input === 'string') {
  console.log(input.toUpperCase());
}
```

---

### 3.2 Interface vs Type

```tsx
// Interface (확장 가능)
interface Video {
  id: string;
  url: string;
  duration: number;
}

interface EditableVideo extends Video {
  edits: Edit[];
}

// Type Alias (유니온, 인터섹션 가능)
type VideoFile = {
  file: File;
  preview: string;
};

type VideoSource = Video | VideoFile;

// Intersection
type VideoWithMetadata = Video & {
  metadata: {
    codec: string;
    resolution: string;
  };
};
```

**선택 기준**:
```tsx
// Interface: 객체 타입, 확장 필요
interface User {
  id: string;
  name: string;
}

// Type: 유니온, 복잡한 타입
type Status = 'idle' | 'loading' | 'success' | 'error';
type Result = { data: string } | { error: string };
```

---

### 3.3 Generics

```tsx
// Generic 함수
function first<T>(arr: T[]): T | undefined {
  return arr[0];
}

const num = first([1, 2, 3]);  // number | undefined
const str = first(['a', 'b']);  // string | undefined

// Generic 인터페이스
interface Response<T> {
  data: T;
  status: number;
  message: string;
}

type VideoResponse = Response<Video>;
// { data: Video, status: number, message: string }

// Generic React Component
interface ListProps<T> {
  items: T[];
  renderItem: (item: T) => React.ReactNode;
}

function List<T>({ items, renderItem }: ListProps<T>) {
  return (
    <ul>
      {items.map((item, index) => (
        <li key={index}>{renderItem(item)}</li>
      ))}
    </ul>
  );
}

// 사용
<List
  items={videos}
  renderItem={(video) => <div>{video.url}</div>}
/>
```

---

### 3.4 실전 타입 정의

```tsx
// src/types/video.ts
export interface Video {
  id: string;
  url: string;
  filename: string;
  duration: number;
  size: number;
  createdAt: Date;
}

export interface Edit {
  id: string;
  type: 'trim' | 'split' | 'subtitle' | 'speed';
  startTime: number;
  endTime?: number;
  data: TrimData | SplitData | SubtitleData | SpeedData;
}

export interface TrimData {
  start: number;
  end: number;
}

export interface SubtitleData {
  text: string;
  duration: number;
  position: 'top' | 'center' | 'bottom';
}

export type SpeedData = 0.5 | 1 | 1.5 | 2;

export interface Project {
  id: string;
  video: Video;
  edits: Edit[];
  updatedAt: Date;
}
```

---

## Part 4: 비디오 편집기 UI

### 4.1 전체 레이아웃

```tsx
// src/App.tsx
import { useState } from 'react';
import { VideoPlayer } from './components/VideoPlayer';
import { Timeline } from './components/Timeline';
import { ControlPanel } from './components/ControlPanel';
import { Sidebar } from './components/Sidebar';

function App() {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  
  return (
    <div className="h-screen flex flex-col bg-gray-900 text-white">
      {/* Header */}
      <header className="h-16 bg-gray-800 flex items-center px-4 border-b border-gray-700">
        <h1 className="text-2xl font-bold">VrewCraft</h1>
      </header>
      
      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 bg-gray-800 border-r border-gray-700 p-4">
          <Sidebar onVideoUpload={setVideoUrl} />
        </aside>
        
        {/* Center */}
        <main className="flex-1 flex flex-col">
          {/* Video Player */}
          <div className="flex-1 bg-black">
            {videoUrl ? (
              <VideoPlayer
                url={videoUrl}
                onTimeUpdate={setCurrentTime}
                onDurationChange={setDuration}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                Upload a video to start editing
              </div>
            )}
          </div>
          
          {/* Timeline */}
          <div className="h-48 bg-gray-800 border-t border-gray-700">
            <Timeline
              duration={duration}
              currentTime={currentTime}
              onSeek={(time) => setCurrentTime(time)}
            />
          </div>
          
          {/* Control Panel */}
          <div className="h-16 bg-gray-800 border-t border-gray-700">
            <ControlPanel
              isPlaying={false}
              onPlayPause={() => {}}
              onTrim={() => {}}
              onSplit={() => {}}
            />
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
```

---

### 4.2 VideoPlayer 컴포넌트

```tsx
// src/components/VideoPlayer.tsx
import { useRef, useEffect } from 'react';

interface VideoPlayerProps {
  url: string;
  currentTime?: number;
  isPlaying?: boolean;
  onTimeUpdate?: (time: number) => void;
  onDurationChange?: (duration: number) => void;
}

export function VideoPlayer({
  url,
  currentTime = 0,
  isPlaying = false,
  onTimeUpdate,
  onDurationChange
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  
  // currentTime 동기화
  useEffect(() => {
    if (videoRef.current && Math.abs(videoRef.current.currentTime - currentTime) > 0.1) {
      videoRef.current.currentTime = currentTime;
    }
  }, [currentTime]);
  
  // isPlaying 동기화
  useEffect(() => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.play();
      } else {
        videoRef.current.pause();
      }
    }
  }, [isPlaying]);
  
  return (
    <div className="relative w-full h-full bg-black flex items-center justify-center">
      <video
        ref={videoRef}
        src={url}
        className="max-w-full max-h-full"
        onLoadedMetadata={(e) => {
          const video = e.target as HTMLVideoElement;
          onDurationChange?.(video.duration);
        }}
        onTimeUpdate={(e) => {
          const video = e.target as HTMLVideoElement;
          onTimeUpdate?.(video.currentTime);
        }}
      />
      
      {/* Overlay Controls */}
      <div className="absolute bottom-4 left-4 text-white text-sm bg-black/50 px-2 py-1 rounded">
        {formatTime(currentTime)}
      </div>
    </div>
  );
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
```

---

### 4.3 Timeline 컴포넌트

```tsx
// src/components/Timeline.tsx
import { useRef, useEffect, useState } from 'react';

interface TimelineProps {
  duration: number;
  currentTime: number;
  onSeek: (time: number) => void;
}

export function Timeline({ duration, currentTime, onSeek }: TimelineProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  // Canvas 렌더링
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const width = canvas.width;
    const height = canvas.height;
    
    // Clear
    ctx.fillStyle = '#1f2937';
    ctx.fillRect(0, 0, width, height);
    
    // Ruler
    const tickInterval = Math.max(1, Math.floor(duration / 20));
    for (let i = 0; i <= duration; i += tickInterval) {
      const x = (i / duration) * width;
      
      ctx.strokeStyle = '#4b5563';
      ctx.beginPath();
      ctx.moveTo(x, height - 20);
      ctx.lineTo(x, height);
      ctx.stroke();
      
      ctx.fillStyle = '#9ca3af';
      ctx.font = '10px sans-serif';
      ctx.fillText(formatTime(i), x + 2, height - 25);
    }
    
    // Current time indicator
    const currentX = (currentTime / duration) * width;
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(currentX, 0);
    ctx.lineTo(currentX, height);
    ctx.stroke();
  }, [duration, currentTime]);
  
  // Mouse events
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    handleSeek(e);
  };
  
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDragging) {
      handleSeek(e);
    }
  };
  
  const handleMouseUp = () => {
    setIsDragging(false);
  };
  
  const handleSeek = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const time = (x / rect.width) * duration;
    onSeek(Math.max(0, Math.min(duration, time)));
  };
  
  return (
    <div className="w-full h-full p-4">
      <canvas
        ref={canvasRef}
        width={1200}
        height={150}
        className="w-full h-full cursor-pointer"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />
    </div>
  );
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
```

---

### 4.4 Sidebar 컴포넌트

```tsx
// src/components/Sidebar.tsx
import { useVideoUpload } from '../hooks/useVideoUpload';
import { Upload } from 'lucide-react';

interface SidebarProps {
  onVideoUpload: (url: string) => void;
}

export function Sidebar({ onVideoUpload }: SidebarProps) {
  const { upload, uploading, progress } = useVideoUpload();
  
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      const result = await upload(file);
      onVideoUpload(result.url);
    } catch (err) {
      console.error('Upload failed:', err);
    }
  };
  
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold">Upload Video</h2>
      
      <label className="block">
        <div className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center cursor-pointer hover:border-gray-500 transition">
          <Upload className="w-12 h-12 mx-auto mb-2 text-gray-500" />
          <p className="text-sm text-gray-400">
            Click to upload or drag and drop
          </p>
          <p className="text-xs text-gray-500 mt-1">
            MP4, MOV, AVI (max 500MB)
          </p>
        </div>
        <input
          type="file"
          accept="video/*"
          onChange={handleFileChange}
          className="hidden"
          disabled={uploading}
        />
      </label>
      
      {uploading && progress && (
        <div>
          <div className="text-sm text-gray-400 mb-2">
            Uploading: {progress.percent}%
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all"
              style={{ width: `${progress.percent}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
```

---

### 4.5 ControlPanel 컴포넌트

```tsx
// src/components/ControlPanel.tsx
import { Play, Pause, Scissors, Split, Type, Gauge } from 'lucide-react';

interface ControlPanelProps {
  isPlaying: boolean;
  onPlayPause: () => void;
  onTrim: () => void;
  onSplit: () => void;
  onSubtitle: () => void;
  onSpeed: () => void;
}

export function ControlPanel({
  isPlaying,
  onPlayPause,
  onTrim,
  onSplit,
  onSubtitle,
  onSpeed
}: ControlPanelProps) {
  return (
    <div className="flex items-center justify-center gap-4 h-full px-4">
      {/* Play/Pause */}
      <button
        onClick={onPlayPause}
        className="p-2 rounded-lg bg-blue-600 hover:bg-blue-700 transition"
      >
        {isPlaying ? <Pause size={20} /> : <Play size={20} />}
      </button>
      
      {/* Divider */}
      <div className="h-8 w-px bg-gray-700" />
      
      {/* Edit Tools */}
      <button
        onClick={onTrim}
        className="p-2 rounded-lg hover:bg-gray-700 transition"
        title="Trim"
      >
        <Scissors size={20} />
      </button>
      
      <button
        onClick={onSplit}
        className="p-2 rounded-lg hover:bg-gray-700 transition"
        title="Split"
      >
        <Split size={20} />
      </button>
      
      <button
        onClick={onSubtitle}
        className="p-2 rounded-lg hover:bg-gray-700 transition"
        title="Add Subtitle"
      >
        <Type size={20} />
      </button>
      
      <button
        onClick={onSpeed}
        className="p-2 rounded-lg hover:bg-gray-700 transition"
        title="Change Speed"
      >
        <Gauge size={20} />
      </button>
    </div>
  );
}
```

---

## 🎯 실전 체크리스트

### 프로젝트 세팅
- [ ] Vite + React + TypeScript 프로젝트 생성
- [ ] TailwindCSS 설치 및 설정
- [ ] 필요한 라이브러리 설치 (axios, lucide-react)
- [ ] 디렉토리 구조 정리 (components, hooks, types)

### React 기초
- [ ] Function Component 작성
- [ ] useState로 상태 관리
- [ ] useEffect로 side effect 처리
- [ ] Custom Hook 작성 (useVideoUpload)

### TypeScript
- [ ] Interface로 Props 타입 정의
- [ ] Type Alias로 유니온/인터섹션 타입
- [ ] Generic 타입 활용
- [ ] 타입 안전성 확보 (no any!)

### UI 구현
- [ ] VideoPlayer 컴포넌트 (video 태그 + ref)
- [ ] Timeline 컴포넌트 (Canvas 렌더링)
- [ ] Sidebar 컴포넌트 (파일 업로드)
- [ ] ControlPanel 컴포넌트 (버튼 그룹)

---

## 📚 면접 예상 질문

### 기초
1. **Vite가 CRA보다 빠른 이유는?**
   - ESM 기반 개발 서버 (번들링 없음)
   - Rollup 기반 빠른 프로덕션 빌드

2. **useState와 useEffect의 차이는?**
   - useState: 상태 관리
   - useEffect: Side effect (API, DOM 조작, 구독)

3. **TypeScript를 사용하는 이유는?**
   - 타입 안전성 (런타임 에러 사전 방지)
   - 자동완성, 리팩토링 지원

4. **Interface vs Type 차이는?**
   - Interface: 객체 타입, 확장 가능
   - Type: 유니온, 인터섹션, Primitive

5. **Custom Hook을 만드는 이유는?**
   - 로직 재사용 (여러 컴포넌트에서 공유)
   - 관심사 분리 (UI vs 비즈니스 로직)

### 심화
6. **React의 re-render 조건은?**
   - State 변경, Props 변경, 부모 re-render

7. **useEffect dependency array 역할은?**
   - 의존성 변경 시에만 effect 재실행
   - 빈 배열 []: Mount 시 한 번만

8. **Generic 타입의 장점은?**
   - 타입 재사용, 타입 안전성 유지

9. **Canvas vs DOM 렌더링 차이는?**
   - Canvas: 픽셀 기반, 빠름 (60 FPS)
   - DOM: 요소 기반, 느림 (Reflow)

10. **TailwindCSS 장점은?**
    - Utility-first (빠른 개발)
    - 일관된 디자인 시스템

---

**다음 문서**: [91-nodejs-express-backend.md](91-nodejs-express-backend.md) - Node.js 백엔드 구현
