# Canvas 타임라인 UI

**목표**: 60 FPS Canvas 타임라인 렌더링 및 드래그 인터랙션  
**난이도**: ⭐⭐⭐⭐☆ (중상급)  
**예상 시간**: 6-7시간 (정독 + 실습)  
**선행 과정**: [90-react-typescript-vite.md](90-react-typescript-vite.md)

---

## 📋 목차

1. [Canvas API 기초](#part-1-canvas-api-기초)
2. [타임라인 렌더링](#part-2-타임라인-렌더링)
3. [드래그 인터랙션](#part-3-드래그-인터랙션)
4. [성능 최적화](#part-4-성능-최적화)

---

## Part 1: Canvas API 기초

### 1.1 Canvas란?

```
Canvas = HTML5 그래픽 API

특징:
✅ 픽셀 기반 렌더링 (비트맵)
✅ JavaScript로 제어
✅ 고성능 (60 FPS 가능)
✅ 게임, 차트, 비디오 편집기에 적합

vs DOM:
- Canvas: 픽셀 단위 (빠름, 저수준)
- DOM: 요소 단위 (느림, 고수준)
```

---

### 1.2 기본 사용법

```typescript
// src/components/Timeline.tsx
import { useEffect, useRef } from 'react';

export const Timeline = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // 2D 컨텍스트 가져오기
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // 배경 그리기
    ctx.fillStyle = '#1f2937';  // gray-800
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // 텍스트 그리기
    ctx.fillStyle = 'white';
    ctx.font = '16px sans-serif';
    ctx.fillText('Timeline', 10, 30);
    
  }, []);
  
  return (
    <canvas
      ref={canvasRef}
      width={1200}
      height={150}
      className="border border-gray-700"
    />
  );
};
```

---

### 1.3 좌표계

```
Canvas 좌표계:

(0,0) ──────────► X
  │
  │
  │
  ▼
  Y

원점: 좌상단 (top-left)
X: 오른쪽으로 증가
Y: 아래쪽으로 증가
```

---

### 1.4 기본 도형

```typescript
const drawShapes = (ctx: CanvasRenderingContext2D) => {
  // 사각형
  ctx.fillStyle = '#3b82f6';  // blue
  ctx.fillRect(50, 50, 100, 80);
  
  // 테두리
  ctx.strokeStyle = 'red';
  ctx.lineWidth = 2;
  ctx.strokeRect(200, 50, 100, 80);
  
  // 선
  ctx.beginPath();
  ctx.moveTo(350, 50);
  ctx.lineTo(450, 130);
  ctx.stroke();
  
  // 원
  ctx.beginPath();
  ctx.arc(550, 90, 40, 0, Math.PI * 2);  // x, y, radius, startAngle, endAngle
  ctx.fill();
  
  // 텍스트
  ctx.fillStyle = 'white';
  ctx.font = '20px sans-serif';
  ctx.fillText('Hello Canvas', 650, 90);
};
```

---

## Part 2: 타임라인 렌더링

### 2.1 타임라인 컴포넌트

```typescript
// src/components/Timeline.tsx
import { useEffect, useRef } from 'react';

interface TimelineProps {
  duration: number;        // 비디오 총 길이 (초)
  currentTime: number;     // 현재 재생 시간 (초)
  width?: number;
  height?: number;
}

export const Timeline = ({
  duration,
  currentTime,
  width = 1200,
  height = 150
}: TimelineProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    drawTimeline(ctx, width, height, duration, currentTime);
    
  }, [width, height, duration, currentTime]);
  
  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="border border-gray-700"
    />
  );
};
```

---

### 2.2 눈금자 (Ruler) 렌더링

```typescript
const drawTimeline = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  duration: number,
  currentTime: number
) => {
  // 배경
  ctx.fillStyle = '#1f2937';
  ctx.fillRect(0, 0, width, height);
  
  // 눈금자
  drawRuler(ctx, width, height, duration);
  
  // 현재 시간 인디케이터
  drawPlayhead(ctx, width, height, duration, currentTime);
};

const drawRuler = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  duration: number
) => {
  ctx.strokeStyle = '#6b7280';  // gray-500
  ctx.fillStyle = '#9ca3af';    // gray-400
  ctx.font = '12px sans-serif';
  
  // 눈금 간격 계산
  const tickInterval = calculateTickInterval(duration);
  const tickCount = Math.ceil(duration / tickInterval);
  
  for (let i = 0; i <= tickCount; i++) {
    const time = i * tickInterval;
    const x = (time / duration) * width;
    
    // 큰 눈금
    ctx.beginPath();
    ctx.moveTo(x, height - 40);
    ctx.lineTo(x, height - 20);
    ctx.stroke();
    
    // 시간 텍스트
    ctx.fillText(formatTime(time), x - 15, height - 5);
  }
  
  // 작은 눈금 (중간)
  const subTickInterval = tickInterval / 5;
  const subTickCount = Math.ceil(duration / subTickInterval);
  
  for (let i = 0; i <= subTickCount; i++) {
    if (i % 5 === 0) continue;  // 큰 눈금은 스킵
    
    const time = i * subTickInterval;
    const x = (time / duration) * width;
    
    ctx.beginPath();
    ctx.moveTo(x, height - 35);
    ctx.lineTo(x, height - 25);
    ctx.stroke();
  }
};

const calculateTickInterval = (duration: number): number => {
  // 적절한 눈금 간격 자동 계산
  if (duration <= 60) return 5;        // 5초
  if (duration <= 300) return 30;      // 30초
  if (duration <= 1800) return 60;     // 1분
  return 300;                          // 5분
};

const formatTime = (seconds: number): string => {
  const min = Math.floor(seconds / 60);
  const sec = Math.floor(seconds % 60);
  return `${min}:${sec.toString().padStart(2, '0')}`;
};
```

---

### 2.3 Playhead (현재 시간 인디케이터)

```typescript
const drawPlayhead = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  duration: number,
  currentTime: number
) => {
  const x = (currentTime / duration) * width;
  
  // 빨간 선
  ctx.strokeStyle = '#ef4444';  // red-500
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, 0);
  ctx.lineTo(x, height - 50);
  ctx.stroke();
  
  // 상단 삼각형
  ctx.fillStyle = '#ef4444';
  ctx.beginPath();
  ctx.moveTo(x, 0);
  ctx.lineTo(x - 5, 10);
  ctx.lineTo(x + 5, 10);
  ctx.closePath();
  ctx.fill();
  
  // 현재 시간 텍스트
  ctx.fillStyle = 'white';
  ctx.font = 'bold 14px sans-serif';
  ctx.fillText(formatTime(currentTime), x + 10, 20);
};
```

---

### 2.4 비디오 클립 표시

```typescript
interface VideoClip {
  id: string;
  startTime: number;
  endTime: number;
  color: string;
  label: string;
}

const drawClips = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  duration: number,
  clips: VideoClip[]
) => {
  const clipHeight = 60;
  const clipY = 10;
  
  clips.forEach(clip => {
    const startX = (clip.startTime / duration) * width;
    const endX = (clip.endTime / duration) * width;
    const clipWidth = endX - startX;
    
    // 클립 배경
    ctx.fillStyle = clip.color;
    ctx.fillRect(startX, clipY, clipWidth, clipHeight);
    
    // 테두리
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;
    ctx.strokeRect(startX, clipY, clipWidth, clipHeight);
    
    // 라벨
    ctx.fillStyle = 'white';
    ctx.font = '12px sans-serif';
    ctx.fillText(clip.label, startX + 5, clipY + 20);
  });
};
```

**사용 예시**:
```typescript
const Timeline = ({ duration, currentTime }: TimelineProps) => {
  const clips: VideoClip[] = [
    { id: '1', startTime: 0, endTime: 30, color: '#3b82f6', label: 'Clip 1' },
    { id: '2', startTime: 30, endTime: 60, color: '#10b981', label: 'Clip 2' }
  ];
  
  useEffect(() => {
    // ... ctx 가져오기
    drawClips(ctx, width, height, duration, clips);
  }, [clips]);
};
```

---

## Part 3: 드래그 인터랙션

### 3.1 마우스 이벤트 핸들링

```typescript
export const Timeline = ({ duration, currentTime, onSeek }: TimelineProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDragging = useRef(false);
  
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    isDragging.current = true;
    handleSeek(e);
  };
  
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging.current) return;
    handleSeek(e);
  };
  
  const handleMouseUp = () => {
    isDragging.current = false;
  };
  
  const handleSeek = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const time = (x / canvas.width) * duration;
    
    // 범위 제한
    const clampedTime = Math.max(0, Math.min(time, duration));
    onSeek?.(clampedTime);
  };
  
  return (
    <canvas
      ref={canvasRef}
      width={1200}
      height={150}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      className="cursor-pointer border border-gray-700"
    />
  );
};
```

---

### 3.2 터치 이벤트 (모바일)

```typescript
const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
  isDragging.current = true;
  handleTouchSeek(e);
};

const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
  if (!isDragging.current) return;
  handleTouchSeek(e);
};

const handleTouchEnd = () => {
  isDragging.current = false;
};

const handleTouchSeek = (e: React.TouchEvent<HTMLCanvasElement>) => {
  const canvas = canvasRef.current;
  if (!canvas) return;
  
  const rect = canvas.getBoundingClientRect();
  const touch = e.touches[0];
  const x = touch.clientX - rect.left;
  const time = (x / canvas.width) * duration;
  
  onSeek?.(Math.max(0, Math.min(time, duration)));
};

return (
  <canvas
    // ... 기존 props
    onTouchStart={handleTouchStart}
    onTouchMove={handleTouchMove}
    onTouchEnd={handleTouchEnd}
  />
);
```

---

### 3.3 구간 선택 (Range Selection)

```typescript
interface TimelineProps {
  duration: number;
  currentTime: number;
  selectionStart?: number;
  selectionEnd?: number;
  onSelectionChange?: (start: number, end: number) => void;
}

export const Timeline = ({ 
  duration, 
  currentTime,
  selectionStart,
  selectionEnd,
  onSelectionChange
}: TimelineProps) => {
  const [dragStart, setDragStart] = useState<number | null>(null);
  
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const time = getTimeFromMouseEvent(e);
    setDragStart(time);
  };
  
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (dragStart === null) return;
    
    const time = getTimeFromMouseEvent(e);
    const start = Math.min(dragStart, time);
    const end = Math.max(dragStart, time);
    
    onSelectionChange?.(start, end);
  };
  
  const handleMouseUp = () => {
    setDragStart(null);
  };
  
  useEffect(() => {
    // ... 렌더링
    if (selectionStart !== undefined && selectionEnd !== undefined) {
      drawSelection(ctx, width, height, duration, selectionStart, selectionEnd);
    }
  }, [selectionStart, selectionEnd]);
};

const drawSelection = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  duration: number,
  start: number,
  end: number
) => {
  const startX = (start / duration) * width;
  const endX = (end / duration) * width;
  
  // 반투명 파란색 오버레이
  ctx.fillStyle = 'rgba(59, 130, 246, 0.3)';
  ctx.fillRect(startX, 0, endX - startX, height - 50);
  
  // 시작/끝 경계선
  ctx.strokeStyle = '#3b82f6';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(startX, 0);
  ctx.lineTo(startX, height - 50);
  ctx.moveTo(endX, 0);
  ctx.lineTo(endX, height - 50);
  ctx.stroke();
};
```

---

### 3.4 줌/패닝

```typescript
const Timeline = ({ duration, currentTime }: TimelineProps) => {
  const [zoom, setZoom] = useState(1);         // 1 = 100%
  const [panOffset, setPanOffset] = useState(0);
  
  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    
    // Ctrl/Cmd + Wheel = Zoom
    if (e.ctrlKey || e.metaKey) {
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      setZoom(prev => Math.max(1, Math.min(prev * delta, 10)));
    }
    // Wheel = Pan
    else {
      setPanOffset(prev => {
        const newOffset = prev - e.deltaX;
        const maxOffset = (zoom - 1) * width;
        return Math.max(0, Math.min(newOffset, maxOffset));
      });
    }
  };
  
  useEffect(() => {
    // 렌더링 시 zoom, panOffset 반영
    ctx.save();
    ctx.scale(zoom, 1);
    ctx.translate(-panOffset / zoom, 0);
    
    drawTimeline(ctx, width, height, duration, currentTime);
    
    ctx.restore();
  }, [zoom, panOffset]);
  
  return (
    <canvas
      onWheel={handleWheel}
      // ...
    />
  );
};
```

---

## Part 4: 성능 최적화

### 4.1 requestAnimationFrame

```typescript
const Timeline = ({ duration, currentTime }: TimelineProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const render = () => {
      drawTimeline(ctx, width, height, duration, currentTime);
      
      // 다음 프레임 요청 (60 FPS)
      animationRef.current = requestAnimationFrame(render);
    };
    
    render();
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [duration, currentTime]);
};
```

---

### 4.2 오프스크린 캔버스 (캐싱)

```typescript
const Timeline = ({ duration, currentTime }: TimelineProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const offscreenCanvasRef = useRef<HTMLCanvasElement>();
  
  useEffect(() => {
    // 오프스크린 캔버스 생성 (한 번만)
    if (!offscreenCanvasRef.current) {
      offscreenCanvasRef.current = document.createElement('canvas');
      offscreenCanvasRef.current.width = width;
      offscreenCanvasRef.current.height = height;
      
      const offCtx = offscreenCanvasRef.current.getContext('2d');
      if (offCtx) {
        // 정적 요소 (눈금자, 클립) 렌더링
        drawRuler(offCtx, width, height, duration);
        drawClips(offCtx, width, height, duration, clips);
      }
    }
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // 오프스크린 캔버스 복사 (빠름)
    ctx.drawImage(offscreenCanvasRef.current, 0, 0);
    
    // 동적 요소만 렌더링
    drawPlayhead(ctx, width, height, duration, currentTime);
    
  }, [currentTime]);  // currentTime 변경 시만 재렌더링
};
```

---

### 4.3 디바운싱 (Debounce)

```typescript
import { useRef, useEffect } from 'react';

const useDebounce = <T extends (...args: any[]) => void>(
  callback: T,
  delay: number
): T => {
  const timeoutRef = useRef<NodeJS.Timeout>();
  
  return ((...args: Parameters<T>) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      callback(...args);
    }, delay);
  }) as T;
};

const Timeline = ({ onSeek }: TimelineProps) => {
  const debouncedSeek = useDebounce(onSeek, 100);  // 100ms 디바운스
  
  const handleSeek = (e: React.MouseEvent) => {
    // ... 시간 계산
    debouncedSeek(time);
  };
};
```

---

### 4.4 고해상도 디스플레이 (Retina)

```typescript
const Timeline = ({ width, height }: TimelineProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // 디바이스 픽셀 비율
    const dpr = window.devicePixelRatio || 1;
    
    // 캔버스 내부 해상도 증가
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    
    // CSS 크기는 유지
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    
    // 스케일 보정
    ctx.scale(dpr, dpr);
    
    // 렌더링
    drawTimeline(ctx, width, height, duration, currentTime);
    
  }, [width, height]);
};
```

---

## 🎯 실전 체크리스트

### Canvas 기초
- [ ] Canvas 요소 생성 및 컨텍스트 가져오기
- [ ] 기본 도형 그리기 (rect, line, arc, text)
- [ ] 좌표계 이해 (top-left 원점)

### 타임라인 렌더링
- [ ] 눈금자 렌더링 (큰 눈금 + 작은 눈금)
- [ ] 시간 포맷팅 (mm:ss)
- [ ] Playhead 인디케이터
- [ ] 비디오 클립 표시

### 인터랙션
- [ ] 마우스 드래그로 시크 (onMouseDown/Move/Up)
- [ ] 터치 이벤트 (모바일)
- [ ] 구간 선택 (드래그 범위)
- [ ] 줌/패닝 (Wheel 이벤트)

### 성능
- [ ] requestAnimationFrame (60 FPS)
- [ ] 오프스크린 캔버스 (정적 요소 캐싱)
- [ ] 디바운싱 (과도한 이벤트 방지)
- [ ] 고해상도 디스플레이 지원

---

## 📚 면접 예상 질문

### 기초
1. **Canvas와 DOM의 차이는?**
   - Canvas: 픽셀 기반, 빠름, 저수준
   - DOM: 요소 기반, 느림, 고수준

2. **Canvas 좌표계는?**
   - 원점: 좌상단 (0, 0)
   - X: 오른쪽 증가, Y: 아래쪽 증가

3. **fillRect vs strokeRect 차이는?**
   - fillRect: 채우기 (fill)
   - strokeRect: 테두리 (border)

4. **beginPath()의 역할은?**
   - 새 경로 시작 (이전 경로와 분리)

5. **Canvas에서 텍스트 렌더링 방법은?**
   - fillText(text, x, y)
   - font, fillStyle 설정

### 심화
6. **60 FPS를 유지하려면?**
   - requestAnimationFrame 사용
   - 불필요한 렌더링 최소화
   - 오프스크린 캔버스 캐싱

7. **오프스크린 캔버스의 장점은?**
   - 정적 요소 한 번만 렌더링
   - 메인 캔버스에 복사 (빠름)

8. **고해상도 디스플레이 대응은?**
   - devicePixelRatio 확인
   - 캔버스 내부 해상도 증가 (width * dpr)
   - ctx.scale(dpr, dpr)

9. **Canvas에서 마우스 좌표 계산은?**
   - getBoundingClientRect()
   - clientX/Y - rect.left/top

10. **디바운싱이 필요한 이유는?**
    - 과도한 이벤트 발생 방지
    - 성능 최적화 (API 호출 횟수 감소)

---

**다음 문서**: [94-napi-native-addon.md](94-napi-native-addon.md) - N-API Native Addon
