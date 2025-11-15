# FFmpeg C API 심화

**목표**: FFmpeg C API로 고성능 썸네일 추출 (p99 < 50ms)  
**난이도**: ⭐⭐⭐⭐⭐ (최고급)  
**예상 시간**: 10-12시간 (정독 + 실습)  
**선행 과정**: [94-napi-native-addon.md](94-napi-native-addon.md)

---

## 📋 목차

1. [FFmpeg C API 기초](#part-1-ffmpeg-c-api-기초)
2. [비디오 디코딩](#part-2-비디오-디코딩)
3. [썸네일 추출](#part-3-썸네일-추출)
4. [메모리 관리 (RAII)](#part-4-메모리-관리-raii)

---

## Part 1: FFmpeg C API 기초

### 1.1 FFmpeg 라이브러리 구조

```
FFmpeg C API:

libavformat: 컨테이너 포맷 (MP4, MOV, AVI)
  └─ AVFormatContext: 파일 정보
  └─ AVStream: 비디오/오디오 스트림

libavcodec: 코덱 (H.264, H.265, AAC)
  └─ AVCodecContext: 디코더/인코더 설정
  └─ AVPacket: 압축된 데이터
  └─ AVFrame: 압축 해제된 데이터 (픽셀)

libavutil: 유틸리티
  └─ AVDictionary: 옵션
  └─ av_malloc/av_free: 메모리 관리

libswscale: 이미지 변환 (RGB ↔ YUV, 리사이즈)
  └─ SwsContext: 변환 컨텍스트
```

---

### 1.2 헤더 파일

```cpp
// native/src/ffmpeg_utils.h
#ifndef FFMPEG_UTILS_H
#define FFMPEG_UTILS_H

extern "C" {
#include <libavformat/avformat.h>
#include <libavcodec/avcodec.h>
#include <libavutil/imgutils.h>
#include <libswscale/swscale.h>
}

#include <memory>
#include <string>
#include <stdexcept>

// RAII 래퍼 (다음 섹션)
class VideoDecoder;
class FrameConverter;

#endif  // FFMPEG_UTILS_H
```

---

### 1.3 FFmpeg 설치

```bash
# macOS
brew install ffmpeg

# Ubuntu/Debian
sudo apt install libavformat-dev libavcodec-dev libavutil-dev libswscale-dev

# 확인
pkg-config --modversion libavformat
# 6.0
```

---

### 1.4 binding.gyp 수정

```python
# native/binding.gyp
{
  "targets": [
    {
      "target_name": "native",
      "sources": [
        "src/module.cpp",
        "src/thumbnail.cpp",
        "src/ffmpeg_utils.cpp"
      ],
      "include_dirs": [
        "<!@(node -p \"require('node-addon-api').include\")",
        "<!@(pkg-config --cflags-only-I libavformat libavcodec libavutil libswscale | sed 's/-I//g')"
      ],
      "libraries": [
        "<!@(pkg-config --libs libavformat libavcodec libavutil libswscale)"
      ],
      "defines": [
        "NAPI_DISABLE_CPP_EXCEPTIONS"
      ],
      "cflags!": ["-fno-exceptions"],
      "cflags_cc!": ["-fno-exceptions"],
      "cflags_cc": ["-std=c++17"],
      "xcode_settings": {
        "GCC_ENABLE_CPP_EXCEPTIONS": "YES",
        "CLANG_CXX_LIBRARY": "libc++",
        "MACOSX_DEPLOYMENT_TARGET": "10.15",
        "OTHER_CPLUSPLUSFLAGS": ["-std=c++17"]
      }
    }
  ]
}
```

---

## Part 2: 비디오 디코딩

### 2.1 파일 열기

```cpp
// native/src/ffmpeg_utils.cpp
#include "ffmpeg_utils.h"

class VideoDecoder {
 public:
  VideoDecoder(const std::string& filename) {
    // AVFormatContext 할당
    formatCtx_ = avformat_alloc_context();
    if (!formatCtx_) {
      throw std::runtime_error("Failed to allocate format context");
    }
    
    // 파일 열기
    if (avformat_open_input(&formatCtx_, filename.c_str(), nullptr, nullptr) < 0) {
      throw std::runtime_error("Failed to open input file");
    }
    
    // 스트림 정보 읽기
    if (avformat_find_stream_info(formatCtx_, nullptr) < 0) {
      throw std::runtime_error("Failed to find stream info");
    }
    
    // 비디오 스트림 찾기
    videoStreamIdx_ = -1;
    for (unsigned int i = 0; i < formatCtx_->nb_streams; i++) {
      if (formatCtx_->streams[i]->codecpar->codec_type == AVMEDIA_TYPE_VIDEO) {
        videoStreamIdx_ = i;
        break;
      }
    }
    
    if (videoStreamIdx_ == -1) {
      throw std::runtime_error("No video stream found");
    }
    
    // 코덱 파라미터
    AVCodecParameters* codecpar = formatCtx_->streams[videoStreamIdx_]->codecpar;
    
    // 디코더 찾기
    const AVCodec* codec = avcodec_find_decoder(codecpar->codec_id);
    if (!codec) {
      throw std::runtime_error("Unsupported codec");
    }
    
    // 코덱 컨텍스트 할당
    codecCtx_ = avcodec_alloc_context3(codec);
    if (!codecCtx_) {
      throw std::runtime_error("Failed to allocate codec context");
    }
    
    // 파라미터 복사
    if (avcodec_parameters_to_context(codecCtx_, codecpar) < 0) {
      throw std::runtime_error("Failed to copy codec parameters");
    }
    
    // 디코더 열기
    if (avcodec_open2(codecCtx_, codec, nullptr) < 0) {
      throw std::runtime_error("Failed to open codec");
    }
  }
  
  ~VideoDecoder() {
    if (codecCtx_) {
      avcodec_free_context(&codecCtx_);
    }
    if (formatCtx_) {
      avformat_close_input(&formatCtx_);
    }
  }
  
  AVFormatContext* formatCtx() const { return formatCtx_; }
  AVCodecContext* codecCtx() const { return codecCtx_; }
  int videoStreamIdx() const { return videoStreamIdx_; }
  
 private:
  AVFormatContext* formatCtx_ = nullptr;
  AVCodecContext* codecCtx_ = nullptr;
  int videoStreamIdx_ = -1;
};
```

---

### 2.2 특정 시간으로 시크

```cpp
class VideoDecoder {
 public:
  // ... 기존 코드
  
  bool SeekToTime(double timestamp) {
    // 타임베이스 (시간 단위)
    AVRational timeBase = formatCtx_->streams[videoStreamIdx_]->time_base;
    
    // 초 → 타임스탬프 변환
    int64_t seekTarget = static_cast<int64_t>(timestamp / av_q2d(timeBase));
    
    // 시크 (BACKWARD: 이전 키프레임)
    if (av_seek_frame(formatCtx_, videoStreamIdx_, seekTarget, AVSEEK_FLAG_BACKWARD) < 0) {
      return false;
    }
    
    // 디코더 플러시
    avcodec_flush_buffers(codecCtx_);
    
    return true;
  }
};
```

---

### 2.3 프레임 디코딩

```cpp
class VideoDecoder {
 public:
  // ... 기존 코드
  
  AVFrame* DecodeFrameAt(double timestamp) {
    // 시크
    if (!SeekToTime(timestamp)) {
      return nullptr;
    }
    
    AVPacket* packet = av_packet_alloc();
    AVFrame* frame = av_frame_alloc();
    
    if (!packet || !frame) {
      if (packet) av_packet_free(&packet);
      if (frame) av_frame_free(&frame);
      return nullptr;
    }
    
    // 타임베이스
    AVRational timeBase = formatCtx_->streams[videoStreamIdx_]->time_base;
    
    // 패킷 읽기
    while (av_read_frame(formatCtx_, packet) >= 0) {
      if (packet->stream_index == videoStreamIdx_) {
        // 디코더에 전송
        if (avcodec_send_packet(codecCtx_, packet) == 0) {
          // 프레임 수신
          if (avcodec_receive_frame(codecCtx_, frame) == 0) {
            // 타임스탬프 확인
            double frameTime = frame->pts * av_q2d(timeBase);
            
            if (frameTime >= timestamp) {
              av_packet_free(&packet);
              return frame;  // 성공
            }
          }
        }
      }
      
      av_packet_unref(packet);
    }
    
    // 실패
    av_packet_free(&packet);
    av_frame_free(&frame);
    return nullptr;
  }
};
```

---

## Part 3: 썸네일 추출

### 3.1 RGB 변환

```cpp
class FrameConverter {
 public:
  FrameConverter(int srcWidth, int srcHeight, AVPixelFormat srcFormat,
                 int dstWidth, int dstHeight, AVPixelFormat dstFormat) {
    swsCtx_ = sws_getContext(
      srcWidth, srcHeight, srcFormat,
      dstWidth, dstHeight, dstFormat,
      SWS_BILINEAR,  // 보간 알고리즘
      nullptr, nullptr, nullptr
    );
    
    if (!swsCtx_) {
      throw std::runtime_error("Failed to create SwsContext");
    }
  }
  
  ~FrameConverter() {
    if (swsCtx_) {
      sws_freeContext(swsCtx_);
    }
  }
  
  AVFrame* Convert(AVFrame* srcFrame) {
    AVFrame* dstFrame = av_frame_alloc();
    if (!dstFrame) {
      return nullptr;
    }
    
    dstFrame->format = AV_PIX_FMT_RGB24;
    dstFrame->width = dstWidth_;
    dstFrame->height = dstHeight_;
    
    // 버퍼 할당
    if (av_frame_get_buffer(dstFrame, 0) < 0) {
      av_frame_free(&dstFrame);
      return nullptr;
    }
    
    // 변환
    sws_scale(
      swsCtx_,
      srcFrame->data, srcFrame->linesize,
      0, srcFrame->height,
      dstFrame->data, dstFrame->linesize
    );
    
    return dstFrame;
  }
  
 private:
  SwsContext* swsCtx_ = nullptr;
  int dstWidth_;
  int dstHeight_;
};
```

---

### 3.2 JPEG 인코딩

```cpp
#include <jpeglib.h>
#include <vector>

std::vector<uint8_t> EncodeJPEG(AVFrame* frame, int quality = 85) {
  // libjpeg 초기화
  jpeg_compress_struct cinfo;
  jpeg_error_mgr jerr;
  
  cinfo.err = jpeg_std_error(&jerr);
  jpeg_create_compress(&cinfo);
  
  // 메모리 출력 설정
  unsigned char* outbuffer = nullptr;
  unsigned long outsize = 0;
  jpeg_mem_dest(&cinfo, &outbuffer, &outsize);
  
  // 이미지 설정
  cinfo.image_width = frame->width;
  cinfo.image_height = frame->height;
  cinfo.input_components = 3;  // RGB
  cinfo.in_color_space = JCS_RGB;
  
  jpeg_set_defaults(&cinfo);
  jpeg_set_quality(&cinfo, quality, TRUE);
  
  // 압축 시작
  jpeg_start_compress(&cinfo, TRUE);
  
  // 라인별 인코딩
  while (cinfo.next_scanline < cinfo.image_height) {
    JSAMPROW row = frame->data[0] + cinfo.next_scanline * frame->linesize[0];
    jpeg_write_scanlines(&cinfo, &row, 1);
  }
  
  jpeg_finish_compress(&cinfo);
  
  // 결과 복사
  std::vector<uint8_t> result(outbuffer, outbuffer + outsize);
  
  // 정리
  free(outbuffer);
  jpeg_destroy_compress(&cinfo);
  
  return result;
}
```

---

### 3.3 통합

```cpp
// native/src/thumbnail.cpp (수정)
#include "thumbnail.h"
#include "ffmpeg_utils.h"

void ThumbnailWorker::Execute() {
  try {
    // 1. 비디오 열기
    VideoDecoder decoder(inputPath_);
    
    // 2. 프레임 디코딩
    AVFrame* frame = decoder.DecodeFrameAt(timestamp_);
    if (!frame) {
      SetError("Failed to decode frame");
      return;
    }
    
    // 3. RGB 변환
    FrameConverter converter(
      frame->width, frame->height, (AVPixelFormat)frame->format,
      320, 240, AV_PIX_FMT_RGB24
    );
    
    AVFrame* rgbFrame = converter.Convert(frame);
    av_frame_free(&frame);
    
    if (!rgbFrame) {
      SetError("Failed to convert frame");
      return;
    }
    
    // 4. JPEG 인코딩
    jpegData_ = EncodeJPEG(rgbFrame, 85);
    av_frame_free(&rgbFrame);
    
  } catch (const std::exception& e) {
    SetError(e.what());
  }
}
```

---

## Part 4: 메모리 관리 (RAII)

### 4.1 RAII란?

```
RAII = Resource Acquisition Is Initialization

원칙:
✅ 생성자에서 리소스 할당
✅ 소멸자에서 리소스 해제
✅ 예외 안전성

장점:
- 메모리 누수 방지
- 코드 간결화
- 자동 정리
```

---

### 4.2 unique_ptr with Custom Deleter

```cpp
// native/src/ffmpeg_utils.h
#include <memory>

// AVFrame Deleter
struct AVFrameDeleter {
  void operator()(AVFrame* frame) {
    if (frame) {
      av_frame_free(&frame);
    }
  }
};

// AVPacket Deleter
struct AVPacketDeleter {
  void operator()(AVPacket* packet) {
    if (packet) {
      av_packet_free(&packet);
    }
  }
};

// Alias
using AVFramePtr = std::unique_ptr<AVFrame, AVFrameDeleter>;
using AVPacketPtr = std::unique_ptr<AVPacket, AVPacketDeleter>;

// 헬퍼 함수
inline AVFramePtr MakeAVFrame() {
  return AVFramePtr(av_frame_alloc());
}

inline AVPacketPtr MakeAVPacket() {
  return AVPacketPtr(av_packet_alloc());
}
```

**사용**:
```cpp
AVFramePtr frame = MakeAVFrame();  // 자동 해제
if (!frame) {
  throw std::runtime_error("Failed to allocate frame");
}

// frame 사용
// ...

// 소멸자에서 자동으로 av_frame_free() 호출
```

---

### 4.3 VideoDecoder RAII 리팩토링

```cpp
class VideoDecoder {
 public:
  VideoDecoder(const std::string& filename) {
    // ... 초기화 (예외 발생 시 소멸자 호출)
  }
  
  ~VideoDecoder() {
    // RAII: 소멸자에서 자동 정리
    if (codecCtx_) {
      avcodec_free_context(&codecCtx_);
    }
    if (formatCtx_) {
      avformat_close_input(&formatCtx_);
    }
  }
  
  // 복사 금지 (리소스 중복 해제 방지)
  VideoDecoder(const VideoDecoder&) = delete;
  VideoDecoder& operator=(const VideoDecoder&) = delete;
  
  // 이동 허용
  VideoDecoder(VideoDecoder&& other) noexcept
    : formatCtx_(other.formatCtx_),
      codecCtx_(other.codecCtx_),
      videoStreamIdx_(other.videoStreamIdx_) {
    other.formatCtx_ = nullptr;
    other.codecCtx_ = nullptr;
  }
  
  AVFramePtr DecodeFrameAt(double timestamp) {
    if (!SeekToTime(timestamp)) {
      return nullptr;
    }
    
    auto packet = MakeAVPacket();
    auto frame = MakeAVFrame();
    
    if (!packet || !frame) {
      return nullptr;
    }
    
    AVRational timeBase = formatCtx_->streams[videoStreamIdx_]->time_base;
    
    while (av_read_frame(formatCtx_, packet.get()) >= 0) {
      if (packet->stream_index == videoStreamIdx_) {
        if (avcodec_send_packet(codecCtx_, packet.get()) == 0) {
          if (avcodec_receive_frame(codecCtx_, frame.get()) == 0) {
            double frameTime = frame->pts * av_q2d(timeBase);
            
            if (frameTime >= timestamp) {
              return frame;  // unique_ptr 이동
            }
          }
        }
      }
      
      av_packet_unref(packet.get());
    }
    
    return nullptr;
  }
  
 private:
  AVFormatContext* formatCtx_ = nullptr;
  AVCodecContext* codecCtx_ = nullptr;
  int videoStreamIdx_ = -1;
};
```

---

### 4.4 메모리 풀 (선택)

```cpp
// Arena60 MVP 2.0 패턴 적용
#include <queue>
#include <mutex>

class FramePool {
 public:
  explicit FramePool(size_t capacity) : capacity_(capacity) {}
  
  AVFramePtr Acquire() {
    std::lock_guard<std::mutex> lock(mutex_);
    
    if (!pool_.empty()) {
      AVFrame* frame = pool_.front();
      pool_.pop();
      return AVFramePtr(frame);
    }
    
    // 풀이 비어있으면 새로 할당
    return MakeAVFrame();
  }
  
  void Release(AVFrame* frame) {
    if (!frame) return;
    
    std::lock_guard<std::mutex> lock(mutex_);
    
    if (pool_.size() < capacity_) {
      av_frame_unref(frame);  // 데이터 초기화
      pool_.push(frame);
    } else {
      av_frame_free(&frame);  // 용량 초과 시 해제
    }
  }
  
  ~FramePool() {
    while (!pool_.empty()) {
      AVFrame* frame = pool_.front();
      pool_.pop();
      av_frame_free(&frame);
    }
  }
  
 private:
  size_t capacity_;
  std::queue<AVFrame*> pool_;
  std::mutex mutex_;
};

// 전역 풀
static FramePool g_framePool(10);  // 최대 10개 재사용
```

---

## 🎯 실전 체크리스트

### FFmpeg 설정
- [ ] FFmpeg 라이브러리 설치
- [ ] binding.gyp에 FFmpeg 링크
- [ ] 헤더 파일 include 확인

### 비디오 디코딩
- [ ] AVFormatContext 할당 및 파일 열기
- [ ] 비디오 스트림 찾기
- [ ] AVCodecContext 초기화
- [ ] 특정 시간으로 시크 (av_seek_frame)
- [ ] 프레임 디코딩 (avcodec_send_packet/receive_frame)

### 이미지 변환
- [ ] SwsContext 생성 (sws_getContext)
- [ ] YUV → RGB 변환 (sws_scale)
- [ ] 리사이즈 (320x240)

### JPEG 인코딩
- [ ] libjpeg 초기화
- [ ] RGB → JPEG 압축
- [ ] 품질 설정 (85)

### 메모리 관리
- [ ] RAII 패턴 (생성자/소멸자)
- [ ] unique_ptr with Custom Deleter
- [ ] 복사 생성자 삭제 (= delete)
- [ ] 메모리 누수 확인 (valgrind)

---

## 📚 면접 예상 질문

### 기초
1. **AVFormatContext란?**
   - 컨테이너 포맷 정보 (MP4, MOV 등)

2. **AVCodecContext란?**
   - 코덱 (디코더/인코더) 설정

3. **AVFrame vs AVPacket?**
   - AVPacket: 압축된 데이터
   - AVFrame: 압축 해제된 데이터 (픽셀)

4. **av_seek_frame의 역할은?**
   - 특정 시간으로 이동

5. **SwsContext란?**
   - 이미지 변환 컨텍스트 (포맷, 리사이즈)

### 심화
6. **RAII의 장점은?**
   - 자동 리소스 해제, 예외 안전성

7. **unique_ptr Custom Deleter 사용 이유는?**
   - FFmpeg 리소스 (AVFrame 등)는 특수 해제 함수 필요

8. **메모리 풀의 장점은?**
   - 할당/해제 오버헤드 감소
   - 성능 향상

9. **avcodec_send_packet/receive_frame 패턴은?**
   - 디코더에 패킷 전송 → 프레임 수신
   - 1:N 관계 (한 패킷에 여러 프레임)

10. **YUV vs RGB 차이는?**
    - YUV: 비디오 압축 포맷 (휘도 + 색차)
    - RGB: 디스플레이 포맷 (빨강 + 초록 + 파랑)

---

**다음 문서**: [96-webgl-video-rendering.md](96-webgl-video-rendering.md) - WebGL 비디오 렌더링
