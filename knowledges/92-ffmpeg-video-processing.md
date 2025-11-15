# FFmpeg 비디오 처리

**목표**: FFmpeg로 비디오 편집 기능 구현 (트리밍, 자막, 속도 변경)  
**난이도**: ⭐⭐⭐☆☆ (중급)  
**예상 시간**: 5-6시간 (정독 + 실습)  
**선행 과정**: [91-nodejs-express-backend.md](91-nodejs-express-backend.md)

---

## 📋 목차

1. [FFmpeg 기초](#part-1-ffmpeg-기초)
2. [fluent-ffmpeg (Node.js)](#part-2-fluent-ffmpeg-nodejs)
3. [비디오 편집 기능](#part-3-비디오-편집-기능)
4. [메타데이터 추출](#part-4-메타데이터-추출)

---

## Part 1: FFmpeg 기초

### 1.1 FFmpeg란?

```
FFmpeg = 오픈소스 멀티미디어 처리 도구

기능:
✅ 비디오/오디오 인코딩/디코딩
✅ 포맷 변환 (MP4, MOV, AVI, etc.)
✅ 편집 (트리밍, 분할, 병합)
✅ 필터 (자막, 워터마크, 리사이즈)
✅ 스트리밍

구성:
- ffmpeg: 변환 도구
- ffprobe: 메타데이터 추출
- ffplay: 플레이어
```

---

### 1.2 설치

```bash
# macOS
brew install ffmpeg

# Ubuntu/Debian
sudo apt update
sudo apt install ffmpeg

# Windows
# https://ffmpeg.org/download.html

# 확인
ffmpeg -version
# ffmpeg version 6.0
```

---

### 1.3 기본 명령어

#### 포맷 변환

```bash
# MP4 → MOV
ffmpeg -i input.mp4 output.mov

# 코덱 재인코딩 없이 복사 (빠름)
ffmpeg -i input.mp4 -c copy output.mov

# 특정 코덱 지정
ffmpeg -i input.mov -c:v libx264 -c:a aac output.mp4
# -c:v: 비디오 코덱 (H.264)
# -c:a: 오디오 코덱 (AAC)
```

---

#### 해상도 변경

```bash
# 1280x720으로 리사이즈
ffmpeg -i input.mp4 -vf scale=1280:720 output.mp4

# 가로 비율 유지하며 세로 720
ffmpeg -i input.mp4 -vf scale=-1:720 output.mp4

# 50% 축소
ffmpeg -i input.mp4 -vf scale=iw*0.5:ih*0.5 output.mp4
```

---

#### 품질 조절

```bash
# CRF (Constant Rate Factor) 0-51
# 18-28 권장, 낮을수록 고품질
ffmpeg -i input.mp4 -crf 23 output.mp4

# 비트레이트 지정
ffmpeg -i input.mp4 -b:v 2M output.mp4  # 2 Mbps

# 오디오 비트레이트
ffmpeg -i input.mp4 -b:a 128k output.mp4  # 128 kbps
```

---

### 1.4 파일 정보 확인 (ffprobe)

```bash
# 기본 정보
ffprobe input.mp4

# JSON 출력
ffprobe -v quiet -print_format json -show_format -show_streams input.mp4

# 특정 필드만
ffprobe -v error -select_streams v:0 -show_entries stream=width,height,duration -of default=noprint_wrappers=1 input.mp4
```

---

## Part 2: fluent-ffmpeg (Node.js)

### 2.1 설치

```bash
npm install fluent-ffmpeg
npm install -D @types/fluent-ffmpeg

# FFmpeg 바이너리 경로 설정 (선택)
npm install @ffmpeg-installer/ffmpeg
npm install @ffprobe-installer/ffprobe
```

---

### 2.2 기본 사용법

```typescript
// src/services/ffmpeg.service.ts
import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

export class FFmpegService {
  private outputDir: string;
  
  constructor() {
    this.outputDir = process.env.PROCESSED_DIR || 'processed';
    
    // FFmpeg 경로 설정 (선택)
    // const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
    // const ffprobePath = require('@ffprobe-installer/ffprobe').path;
    // ffmpeg.setFfmpegPath(ffmpegPath);
    // ffmpeg.setFfprobePath(ffprobePath);
  }
  
  // 기본 템플릿
  async processVideo(
    inputPath: string,
    callback: (cmd: ffmpeg.FfmpegCommand) => void
  ): Promise<string> {
    const outputFilename = `${uuidv4()}.mp4`;
    const outputPath = path.join(this.outputDir, outputFilename);
    
    return new Promise((resolve, reject) => {
      const command = ffmpeg(inputPath);
      
      // 사용자 정의 처리
      callback(command);
      
      command
        .output(outputPath)
        .on('start', (cmd) => {
          console.log('FFmpeg command:', cmd);
        })
        .on('progress', (progress) => {
          console.log(`Processing: ${progress.percent}%`);
        })
        .on('end', () => {
          console.log('Processing complete');
          resolve(outputPath);
        })
        .on('error', (err) => {
          console.error('FFmpeg error:', err);
          reject(err);
        })
        .run();
    });
  }
}
```

---

### 2.3 메타데이터 추출

```typescript
// src/services/ffmpeg.service.ts (계속)
export class FFmpegService {
  async getMetadata(filePath: string): Promise<ffmpeg.FfprobeData> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(filePath, (err, data) => {
        if (err) {
          reject(err);
        } else {
          resolve(data);
        }
      });
    });
  }
  
  async getVideoInfo(filePath: string) {
    const metadata = await this.getMetadata(filePath);
    const videoStream = metadata.streams.find(s => s.codec_type === 'video');
    const audioStream = metadata.streams.find(s => s.codec_type === 'audio');
    
    return {
      duration: metadata.format.duration || 0,
      size: metadata.format.size || 0,
      bitrate: metadata.format.bit_rate || 0,
      video: videoStream ? {
        codec: videoStream.codec_name,
        width: videoStream.width,
        height: videoStream.height,
        fps: eval(videoStream.r_frame_rate || '0/1'),
        bitrate: videoStream.bit_rate
      } : null,
      audio: audioStream ? {
        codec: audioStream.codec_name,
        sampleRate: audioStream.sample_rate,
        channels: audioStream.channels,
        bitrate: audioStream.bit_rate
      } : null
    };
  }
}
```

---

## Part 3: 비디오 편집 기능

### 3.1 트리밍 (구간 추출)

```typescript
// src/services/ffmpeg.service.ts (계속)
export class FFmpegService {
  async trim(
    inputPath: string,
    startTime: number,
    endTime: number
  ): Promise<string> {
    return this.processVideo(inputPath, (cmd) => {
      cmd
        .setStartTime(startTime)
        .setDuration(endTime - startTime)
        .videoCodec('copy')  // 재인코딩 없이 복사 (빠름)
        .audioCodec('copy');
    });
  }
}
```

**사용 예시**:
```typescript
const ffmpegService = new FFmpegService();

// 10초부터 30초까지 추출
const outputPath = await ffmpegService.trim('input.mp4', 10, 30);
console.log('Trimmed video:', outputPath);
```

**FFmpeg 명령어**:
```bash
ffmpeg -i input.mp4 -ss 10 -t 20 -c copy output.mp4
# -ss: 시작 시간 (seconds)
# -t: 지속 시간 (duration)
# -c copy: 코덱 복사 (재인코딩 없음)
```

---

### 3.2 분할 (Split)

```typescript
export class FFmpegService {
  async split(
    inputPath: string,
    splitTime: number
  ): Promise<{ part1: string; part2: string }> {
    const metadata = await this.getMetadata(inputPath);
    const duration = metadata.format.duration || 0;
    
    // Part 1: 0 ~ splitTime
    const part1 = await this.trim(inputPath, 0, splitTime);
    
    // Part 2: splitTime ~ end
    const part2 = await this.trim(inputPath, splitTime, duration);
    
    return { part1, part2 };
  }
}
```

**사용 예시**:
```typescript
// 30초에서 분할
const { part1, part2 } = await ffmpegService.split('input.mp4', 30);
console.log('Part 1:', part1);  // 0-30s
console.log('Part 2:', part2);  // 30s-end
```

---

### 3.3 자막 추가

```typescript
export class FFmpegService {
  async addSubtitle(
    inputPath: string,
    text: string,
    startTime: number,
    duration: number,
    position: 'top' | 'center' | 'bottom' = 'bottom'
  ): Promise<string> {
    // Y 위치 계산
    const yPositions = {
      top: 'h*0.1',
      center: '(h-text_h)/2',
      bottom: 'h-text_h-20'
    };
    
    return this.processVideo(inputPath, (cmd) => {
      cmd
        .videoFilters([
          {
            filter: 'drawtext',
            options: {
              text: text.replace(/:/g, '\\:'),  // 특수문자 이스케이프
              fontsize: 24,
              fontcolor: 'white',
              borderw: 2,
              bordercolor: 'black',
              x: '(w-text_w)/2',  // 가로 중앙
              y: yPositions[position],
              enable: `between(t,${startTime},${startTime + duration})`
            }
          }
        ])
        .videoCodec('libx264')  // 재인코딩 필요
        .audioCodec('copy');
  });
  }
}
```

**사용 예시**:
```typescript
// "Hello World" 자막, 5초부터 3초간, 하단
const outputPath = await ffmpegService.addSubtitle(
  'input.mp4',
  'Hello World',
  5,
  3,
  'bottom'
);
```

**FFmpeg 명령어**:
```bash
ffmpeg -i input.mp4 \
  -vf "drawtext=text='Hello World':fontsize=24:fontcolor=white:x=(w-text_w)/2:y=h-text_h-20:enable='between(t,5,8)'" \
  output.mp4
```

---

### 3.4 재생 속도 변경

```typescript
export class FFmpegService {
  async changeSpeed(
    inputPath: string,
    speed: number  // 0.5, 1, 1.5, 2
  ): Promise<string> {
    if (speed <= 0) {
      throw new Error('Speed must be positive');
    }
    
    return this.processVideo(inputPath, (cmd) => {
      // 비디오 속도 (setpts)
      const videoSpeed = 1 / speed;
      
      // 오디오 속도 (atempo)
      // atempo는 0.5-2 범위만 지원
      let audioFilters: string[] = [];
      let tempSpeed = speed;
      
      while (tempSpeed > 2) {
        audioFilters.push('atempo=2');
        tempSpeed /= 2;
      }
      while (tempSpeed < 0.5) {
        audioFilters.push('atempo=0.5');
        tempSpeed /= 0.5;
      }
      if (tempSpeed !== 1) {
        audioFilters.push(`atempo=${tempSpeed}`);
      }
      
      cmd
        .videoFilters([
          `setpts=${videoSpeed}*PTS`
        ])
        .audioFilters(audioFilters)
        .videoCodec('libx264')
        .audioCodec('aac');
    });
  }
}
```

**사용 예시**:
```typescript
// 2배속
const outputPath = await ffmpegService.changeSpeed('input.mp4', 2);

// 0.5배속 (슬로우모션)
const slowPath = await ffmpegService.changeSpeed('input.mp4', 0.5);
```

**FFmpeg 명령어**:
```bash
# 2배속
ffmpeg -i input.mp4 \
  -filter:v "setpts=0.5*PTS" \
  -filter:a "atempo=2" \
  output.mp4

# 0.5배속
ffmpeg -i input.mp4 \
  -filter:v "setpts=2*PTS" \
  -filter:a "atempo=0.5" \
  output.mp4
```

---

### 3.5 다중 자막

```typescript
export class FFmpegService {
  async addMultipleSubtitles(
    inputPath: string,
    subtitles: Array<{
      text: string;
      startTime: number;
      duration: number;
      position?: 'top' | 'center' | 'bottom';
    }>
  ): Promise<string> {
    return this.processVideo(inputPath, (cmd) => {
      const yPositions = {
        top: 'h*0.1',
        center: '(h-text_h)/2',
        bottom: 'h-text_h-20'
      };
      
      const drawTextFilters = subtitles.map(sub => ({
        filter: 'drawtext',
        options: {
          text: sub.text.replace(/:/g, '\\:'),
          fontsize: 24,
          fontcolor: 'white',
          borderw: 2,
          bordercolor: 'black',
          x: '(w-text_w)/2',
          y: yPositions[sub.position || 'bottom'],
          enable: `between(t,${sub.startTime},${sub.startTime + sub.duration})`
        }
      }));
      
      cmd
        .videoFilters(drawTextFilters)
        .videoCodec('libx264')
        .audioCodec('copy');
    });
  }
}
```

---

## Part 4: 메타데이터 추출

### 4.1 썸네일 추출

```typescript
export class FFmpegService {
  async extractThumbnail(
    inputPath: string,
    timeInSeconds: number
  ): Promise<string> {
    const outputFilename = `${uuidv4()}.jpg`;
    const outputPath = path.join(this.outputDir, outputFilename);
    
    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .screenshots({
          timestamps: [timeInSeconds],
          filename: outputFilename,
          folder: this.outputDir,
          size: '320x240'
        })
        .on('end', () => {
          resolve(outputPath);
        })
        .on('error', (err) => {
          reject(err);
        });
    });
  }
}
```

**사용 예시**:
```typescript
// 10초 시점 썸네일
const thumbnail = await ffmpegService.extractThumbnail('input.mp4', 10);
console.log('Thumbnail:', thumbnail);
```

---

### 4.2 진행률 추적

```typescript
export class FFmpegService {
  async trimWithProgress(
    inputPath: string,
    startTime: number,
    endTime: number,
    onProgress: (percent: number) => void
  ): Promise<string> {
    const outputFilename = `${uuidv4()}.mp4`;
    const outputPath = path.join(this.outputDir, outputFilename);
    
    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .setStartTime(startTime)
        .setDuration(endTime - startTime)
        .videoCodec('copy')
        .audioCodec('copy')
        .output(outputPath)
        .on('progress', (progress) => {
          onProgress(progress.percent || 0);
        })
        .on('end', () => {
          resolve(outputPath);
        })
        .on('error', (err) => {
          reject(err);
        })
        .run();
    });
  }
}
```

**사용 예시 (WebSocket과 통합)**:
```typescript
// src/routes/edit.ts
router.post('/trim', async (req, res) => {
  const { videoId, startTime, endTime, socketId } = req.body;
  
  const video = videoService.findById(videoId);
  if (!video) {
    return res.status(404).json({ error: 'Video not found' });
  }
  
  // WebSocket으로 진행률 전송
  const outputPath = await ffmpegService.trimWithProgress(
    video.path,
    startTime,
    endTime,
    (percent) => {
      // WebSocket 전송 (다음 문서에서 구현)
      wss.to(socketId).emit('progress', { percent });
    }
  );
  
  res.json({
    success: true,
    outputUrl: `/videos/${path.basename(outputPath)}`
  });
});
```

---

### 4.3 비디오 정보 캐싱

```typescript
// src/services/video.service.ts
import { VideoInfo } from '../types/video';
import { FFmpegService } from './ffmpeg.service';

export class VideoService {
  private videos: Map<string, VideoInfo> = new Map();
  private ffmpegService: FFmpegService;
  
  constructor() {
    this.ffmpegService = new FFmpegService();
  }
  
  async saveWithMetadata(video: VideoInfo): Promise<VideoInfo> {
    // 메타데이터 추출
    const info = await this.ffmpegService.getVideoInfo(video.path);
    
    const enriched = {
      ...video,
      duration: info.duration,
      resolution: info.video ? `${info.video.width}x${info.video.height}` : undefined,
      codec: info.video?.codec
    };
    
    this.videos.set(video.id, enriched);
    return enriched;
  }
}
```

---

## 🎯 실전 체크리스트

### FFmpeg 기본
- [ ] FFmpeg 설치 확인 (ffmpeg -version)
- [ ] 기본 명령어 실습 (포맷 변환, 해상도 변경)
- [ ] ffprobe로 메타데이터 확인

### Node.js 통합
- [ ] fluent-ffmpeg 설치
- [ ] FFmpegService 클래스 구현
- [ ] 에러 핸들링 (try-catch)

### 편집 기능
- [ ] 트리밍 구현 (trim)
- [ ] 분할 구현 (split)
- [ ] 자막 추가 (addSubtitle)
- [ ] 속도 변경 (changeSpeed)
- [ ] 썸네일 추출 (extractThumbnail)

### 최적화
- [ ] 코덱 복사 (-c copy) 활용
- [ ] 진행률 추적 (onProgress)
- [ ] 메타데이터 캐싱

---

## 📚 면접 예상 질문

### 기초
1. **FFmpeg란?**
   - 오픈소스 멀티미디어 처리 도구 (인코딩, 디코딩, 변환)

2. **코덱이란?**
   - Encoder + Decoder (압축 알고리즘)
   - H.264 (비디오), AAC (오디오)

3. **CRF란?**
   - Constant Rate Factor (품질 지표, 0-51)
   - 18-28 권장

4. **fluent-ffmpeg의 장점은?**
   - Node.js에서 FFmpeg 쉽게 사용
   - 체이닝 API, 진행률 추적

5. **비디오 편집 시 재인코딩이 필요한 경우는?**
   - 자막 추가, 속도 변경, 필터 적용

### 심화
6. **코덱 복사 (-c copy)의 장점은?**
   - 재인코딩 없음 → 빠름, 무손실

7. **atempo 필터의 제약은?**
   - 0.5-2 범위만 지원 (체이닝으로 해결)

8. **drawtext 필터에서 특수문자 처리는?**
   - 콜론(:) → \\: 이스케이프

9. **비디오 메타데이터 추출 방법은?**
   - ffprobe (JSON 출력)

10. **대용량 비디오 처리 시 고려사항은?**
    - 디스크 공간, 메모리, CPU
    - 스트리밍 처리 (chunk)

---

**다음 문서**: [93-canvas-timeline-ui.md](93-canvas-timeline-ui.md) - Canvas 타임라인 UI
