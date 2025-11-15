# N-API Native Addon

**목표**: C++ Native Addon으로 Node.js 확장 (FFmpeg C API 준비)  
**난이도**: ⭐⭐⭐⭐⭐ (고급)  
**예상 시간**: 8-10시간 (정독 + 실습)  
**선행 과정**: [91-nodejs-express-backend.md](91-nodejs-express-backend.md)

---

## 📋 목차

1. [N-API 기초](#part-1-n-api-기초)
2. [C++ ↔ JavaScript 타입](#part-2-c-javascript-타입)
3. [AsyncWorker](#part-3-asyncworker)
4. [실전: 썸네일 추출](#part-4-실전-썸네일-추출)

---

## Part 1: N-API 기초

### 1.1 N-API란?

```
N-API = Node.js Native API

특징:
✅ C/C++로 Node.js 확장
✅ ABI 안정성 (Node.js 버전 독립)
✅ 고성능 작업 (이미지 처리, 비디오 디코딩)
✅ 네이티브 라이브러리 통합 (FFmpeg, OpenCV)

vs JavaScript:
- N-API: 빠름, 복잡, 메모리 관리 수동
- JavaScript: 느림, 간단, GC 자동
```

---

### 1.2 프로젝트 구조

```
native/
├── binding.gyp          # 빌드 설정
├── package.json
├── src/
│   ├── module.cpp       # 진입점
│   ├── thumbnail.cpp    # 썸네일 추출
│   └── thumbnail.h
├── include/
│   └── napi.h           # node-addon-api 헤더
└── build/
    └── Release/
        └── native.node  # 빌드 결과
```

---

### 1.3 설치

```bash
# 프로젝트 초기화
cd native
npm init -y

# node-addon-api 설치
npm install node-addon-api

# node-gyp 설치 (전역)
npm install -g node-gyp

# Xcode Command Line Tools (macOS)
xcode-select --install

# Python 3 (node-gyp 의존성)
brew install python@3
```

---

### 1.4 binding.gyp 설정

```python
# native/binding.gyp
{
  "targets": [
    {
      "target_name": "native",
      "sources": [
        "src/module.cpp",
        "src/thumbnail.cpp"
      ],
      "include_dirs": [
        "<!@(node -p \"require('node-addon-api').include\")"
      ],
      "defines": [
        "NAPI_DISABLE_CPP_EXCEPTIONS"
      ],
      "cflags!": ["-fno-exceptions"],
      "cflags_cc!": ["-fno-exceptions"],
      "xcode_settings": {
        "GCC_ENABLE_CPP_EXCEPTIONS": "YES",
        "CLANG_CXX_LIBRARY": "libc++",
        "MACOSX_DEPLOYMENT_TARGET": "10.15"
      },
      "msvs_settings": {
        "VCCLCompilerTool": {
          "ExceptionHandling": 1
        }
      }
    }
  ]
}
```

---

### 1.5 기본 모듈 작성

```cpp
// native/src/module.cpp
#include <napi.h>

// JavaScript에서 호출할 함수
Napi::String SayHello(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  // "Hello from C++!" 문자열 반환
  return Napi::String::New(env, "Hello from C++!");
}

// 모듈 초기화
Napi::Object Init(Napi::Env env, Napi::Object exports) {
  // sayHello 함수 등록
  exports.Set(
    Napi::String::New(env, "sayHello"),
    Napi::Function::New(env, SayHello)
  );
  
  return exports;
}

// 매크로 (진입점)
NODE_API_MODULE(native, Init)
```

---

### 1.6 빌드 및 사용

```bash
# 빌드
cd native
node-gyp configure
node-gyp build

# 테스트
node -e "const native = require('./build/Release/native'); console.log(native.sayHello());"
# 출력: Hello from C++!
```

```javascript
// test.js
const native = require('./build/Release/native');

console.log(native.sayHello());
// Hello from C++!
```

---

## Part 2: C++ ↔ JavaScript 타입

### 2.1 기본 타입 변환

```cpp
#include <napi.h>

// JavaScript → C++
Napi::Value Add(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  // 인자 개수 확인
  if (info.Length() < 2) {
    Napi::TypeError::New(env, "Expected 2 arguments").ThrowAsJavaScriptException();
    return env.Null();
  }
  
  // 타입 확인
  if (!info[0].IsNumber() || !info[1].IsNumber()) {
    Napi::TypeError::New(env, "Arguments must be numbers").ThrowAsJavaScriptException();
    return env.Null();
  }
  
  // JavaScript Number → C++ double
  double a = info[0].As<Napi::Number>().DoubleValue();
  double b = info[1].As<Napi::Number>().DoubleValue();
  
  // C++ double → JavaScript Number
  return Napi::Number::New(env, a + b);
}
```

**JavaScript**:
```javascript
const native = require('./build/Release/native');

console.log(native.add(10, 20));  // 30
console.log(native.add(1.5, 2.3));  // 3.8
```

---

### 2.2 문자열

```cpp
// String 파라미터
Napi::Value Greet(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  if (info.Length() < 1 || !info[0].IsString()) {
    Napi::TypeError::New(env, "Expected string argument").ThrowAsJavaScriptException();
    return env.Null();
  }
  
  // JavaScript String → C++ std::string
  std::string name = info[0].As<Napi::String>().Utf8Value();
  
  // C++ std::string → JavaScript String
  std::string message = "Hello, " + name + "!";
  return Napi::String::New(env, message);
}
```

**JavaScript**:
```javascript
console.log(native.greet("World"));  // Hello, World!
```

---

### 2.3 배열

```cpp
// Array 반환
Napi::Value GetArray(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  // JavaScript Array 생성
  Napi::Array arr = Napi::Array::New(env, 3);
  
  // 요소 설정
  arr.Set(0u, Napi::Number::New(env, 10));
  arr.Set(1u, Napi::Number::New(env, 20));
  arr.Set(2u, Napi::Number::New(env, 30));
  
  return arr;
}

// Array 파라미터
Napi::Value SumArray(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  if (info.Length() < 1 || !info[0].IsArray()) {
    Napi::TypeError::New(env, "Expected array argument").ThrowAsJavaScriptException();
    return env.Null();
  }
  
  Napi::Array arr = info[0].As<Napi::Array>();
  double sum = 0;
  
  // 배열 순회
  for (uint32_t i = 0; i < arr.Length(); i++) {
    Napi::Value val = arr.Get(i);
    if (val.IsNumber()) {
      sum += val.As<Napi::Number>().DoubleValue();
    }
  }
  
  return Napi::Number::New(env, sum);
}
```

**JavaScript**:
```javascript
console.log(native.getArray());  // [10, 20, 30]
console.log(native.sumArray([1, 2, 3, 4, 5]));  // 15
```

---

### 2.4 객체

```cpp
// Object 반환
Napi::Value GetVideoInfo(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  // JavaScript Object 생성
  Napi::Object obj = Napi::Object::New(env);
  
  // 속성 설정
  obj.Set("width", Napi::Number::New(env, 1920));
  obj.Set("height", Napi::Number::New(env, 1080));
  obj.Set("duration", Napi::Number::New(env, 120.5));
  obj.Set("codec", Napi::String::New(env, "H.264"));
  
  return obj;
}

// Object 파라미터
Napi::Value ProcessVideo(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  if (info.Length() < 1 || !info[0].IsObject()) {
    Napi::TypeError::New(env, "Expected object argument").ThrowAsJavaScriptException();
    return env.Null();
  }
  
  Napi::Object options = info[0].As<Napi::Object>();
  
  // 속성 읽기
  std::string inputPath = options.Get("input").As<Napi::String>().Utf8Value();
  double timestamp = options.Get("timestamp").As<Napi::Number>().DoubleValue();
  
  // ... 처리 로직
  
  return Napi::Boolean::New(env, true);
}
```

**JavaScript**:
```javascript
console.log(native.getVideoInfo());
// { width: 1920, height: 1080, duration: 120.5, codec: 'H.264' }

native.processVideo({
  input: 'video.mp4',
  timestamp: 10.5
});
```

---

### 2.5 Buffer

```cpp
// Buffer 반환
Napi::Value GetBuffer(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  // 데이터 준비
  uint8_t data[] = {0xFF, 0xD8, 0xFF, 0xE0};  // JPEG 헤더
  size_t length = sizeof(data);
  
  // Buffer 생성 (복사)
  return Napi::Buffer<uint8_t>::Copy(env, data, length);
}

// Buffer 파라미터
Napi::Value GetBufferSize(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  if (info.Length() < 1 || !info[0].IsBuffer()) {
    Napi::TypeError::New(env, "Expected buffer argument").ThrowAsJavaScriptException();
    return env.Null();
  }
  
  Napi::Buffer<uint8_t> buffer = info[0].As<Napi::Buffer<uint8_t>>();
  return Napi::Number::New(env, buffer.Length());
}
```

**JavaScript**:
```javascript
const buf = native.getBuffer();
console.log(buf);  // <Buffer ff d8 ff e0>

const size = native.getBufferSize(Buffer.from([1, 2, 3]));
console.log(size);  // 3
```

---

## Part 3: AsyncWorker

### 3.1 AsyncWorker란?

```
AsyncWorker = 비동기 작업 헬퍼

목적:
✅ CPU 집약적 작업을 백그라운드에서 실행
✅ Node.js 이벤트 루프 차단 방지
✅ Promise 지원

작동 방식:
1. Execute(): 워커 스레드에서 실행 (C++)
2. OnOK(): 메인 스레드에서 실행 (결과 반환)
3. OnError(): 메인 스레드에서 실행 (에러 처리)
```

---

### 3.2 기본 AsyncWorker

```cpp
// native/src/async_example.cpp
#include <napi.h>
#include <thread>
#include <chrono>

class SleepWorker : public Napi::AsyncWorker {
 public:
  SleepWorker(Napi::Env env, int seconds)
    : Napi::AsyncWorker(env),
      deferred(Napi::Promise::Deferred::New(env)),
      seconds_(seconds) {}
  
  // Promise 반환
  Napi::Promise GetPromise() {
    return deferred.Promise();
  }
  
 protected:
  // 워커 스레드에서 실행
  void Execute() override {
    std::this_thread::sleep_for(std::chrono::seconds(seconds_));
    result_ = "Slept for " + std::to_string(seconds_) + " seconds";
  }
  
  // 메인 스레드에서 실행 (성공)
  void OnOK() override {
    deferred.Resolve(Napi::String::New(Env(), result_));
  }
  
  // 메인 스레드에서 실행 (실패)
  void OnError(const Napi::Error& e) override {
    deferred.Reject(e.Value());
  }
  
 private:
  Napi::Promise::Deferred deferred;
  int seconds_;
  std::string result_;
};

// JavaScript에서 호출
Napi::Value Sleep(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  if (info.Length() < 1 || !info[0].IsNumber()) {
    Napi::TypeError::New(env, "Expected number argument").ThrowAsJavaScriptException();
    return env.Null();
  }
  
  int seconds = info[0].As<Napi::Number>().Int32Value();
  
  // Worker 생성 및 시작
  SleepWorker* worker = new SleepWorker(env, seconds);
  worker->Queue();
  
  return worker->GetPromise();
}
```

**JavaScript**:
```javascript
const native = require('./build/Release/native');

async function test() {
  console.log('Start');
  const result = await native.sleep(3);
  console.log(result);  // Slept for 3 seconds
  console.log('End');
}

test();
```

---

### 3.3 Progress 리포팅

```cpp
class ProgressWorker : public Napi::AsyncWorker {
 public:
  ProgressWorker(Napi::Env env, Napi::Function callback)
    : Napi::AsyncWorker(env),
      deferred(Napi::Promise::Deferred::New(env)),
      callback_(Napi::Persistent(callback)) {}
  
  Napi::Promise GetPromise() {
    return deferred.Promise();
  }
  
 protected:
  void Execute() override {
    for (int i = 0; i <= 100; i += 10) {
      // Progress 전송
      SendProgress(i);
      
      std::this_thread::sleep_for(std::chrono::milliseconds(500));
    }
  }
  
  void OnOK() override {
    deferred.Resolve(Napi::String::New(Env(), "Complete"));
  }
  
  void OnProgress(int progress) override {
    Napi::Env env = Env();
    callback_.Value().Call({Napi::Number::New(env, progress)});
  }
  
 private:
  Napi::Promise::Deferred deferred;
  Napi::FunctionReference callback_;
};

Napi::Value ProcessWithProgress(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  if (info.Length() < 1 || !info[0].IsFunction()) {
    Napi::TypeError::New(env, "Expected callback function").ThrowAsJavaScriptException();
    return env.Null();
  }
  
  Napi::Function callback = info[0].As<Napi::Function>();
  
  ProgressWorker* worker = new ProgressWorker(env, callback);
  worker->Queue();
  
  return worker->GetPromise();
}
```

**JavaScript**:
```javascript
native.processWithProgress((progress) => {
  console.log(`Progress: ${progress}%`);
}).then(() => {
  console.log('Done!');
});

// Progress: 0%
// Progress: 10%
// ...
// Progress: 100%
// Done!
```

---

## Part 4: 실전: 썸네일 추출

### 4.1 헤더 파일

```cpp
// native/src/thumbnail.h
#ifndef THUMBNAIL_H
#define THUMBNAIL_H

#include <napi.h>
#include <string>
#include <vector>

class ThumbnailWorker : public Napi::AsyncWorker {
 public:
  ThumbnailWorker(
    Napi::Env env,
    const std::string& inputPath,
    double timestamp
  );
  
  Napi::Promise GetPromise();
  
 protected:
  void Execute() override;
  void OnOK() override;
  void OnError(const Napi::Error& e) override;
  
 private:
  Napi::Promise::Deferred deferred_;
  std::string inputPath_;
  double timestamp_;
  std::vector<uint8_t> jpegData_;
};

// JavaScript 인터페이스
Napi::Value ExtractThumbnail(const Napi::CallbackInfo& info);

#endif  // THUMBNAIL_H
```

---

### 4.2 구현

```cpp
// native/src/thumbnail.cpp
#include "thumbnail.h"
#include <stdexcept>

ThumbnailWorker::ThumbnailWorker(
  Napi::Env env,
  const std::string& inputPath,
  double timestamp
) : Napi::AsyncWorker(env),
    deferred_(Napi::Promise::Deferred::New(env)),
    inputPath_(inputPath),
    timestamp_(timestamp) {}

Napi::Promise ThumbnailWorker::GetPromise() {
  return deferred_.Promise();
}

void ThumbnailWorker::Execute() {
  // TODO: FFmpeg C API로 썸네일 추출 (다음 문서)
  // 지금은 간단히 시뮬레이션
  
  if (inputPath_.empty()) {
    SetError("Input path is empty");
    return;
  }
  
  // 가짜 JPEG 데이터
  jpegData_ = {0xFF, 0xD8, 0xFF, 0xE0};
  
  std::this_thread::sleep_for(std::chrono::milliseconds(100));
}

void ThumbnailWorker::OnOK() {
  Napi::Env env = Env();
  
  // Buffer 생성
  Napi::Buffer<uint8_t> buffer = Napi::Buffer<uint8_t>::Copy(
    env,
    jpegData_.data(),
    jpegData_.size()
  );
  
  deferred_.Resolve(buffer);
}

void ThumbnailWorker::OnError(const Napi::Error& e) {
  deferred_.Reject(e.Value());
}

Napi::Value ExtractThumbnail(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  // 인자 확인
  if (info.Length() < 2) {
    Napi::TypeError::New(env, "Expected 2 arguments").ThrowAsJavaScriptException();
    return env.Null();
  }
  
  if (!info[0].IsString() || !info[1].IsNumber()) {
    Napi::TypeError::New(env, "Invalid argument types").ThrowAsJavaScriptException();
    return env.Null();
  }
  
  std::string inputPath = info[0].As<Napi::String>().Utf8Value();
  double timestamp = info[1].As<Napi::Number>().DoubleValue();
  
  // Worker 시작
  ThumbnailWorker* worker = new ThumbnailWorker(env, inputPath, timestamp);
  worker->Queue();
  
  return worker->GetPromise();
}
```

---

### 4.3 모듈 등록

```cpp
// native/src/module.cpp
#include <napi.h>
#include "thumbnail.h"

Napi::Object Init(Napi::Env env, Napi::Object exports) {
  exports.Set(
    Napi::String::New(env, "extractThumbnail"),
    Napi::Function::New(env, ExtractThumbnail)
  );
  
  return exports;
}

NODE_API_MODULE(native, Init)
```

---

### 4.4 TypeScript 타입 정의

```typescript
// native/index.d.ts
export function extractThumbnail(
  inputPath: string,
  timestamp: number
): Promise<Buffer>;
```

---

### 4.5 사용

```typescript
// backend/src/services/thumbnail.service.ts
import native from '../../native/build/Release/native';
import fs from 'fs/promises';
import path from 'path';

export class ThumbnailService {
  async extract(videoPath: string, timestamp: number): Promise<string> {
    // Native addon 호출
    const buffer = await native.extractThumbnail(videoPath, timestamp);
    
    // JPEG 파일 저장
    const filename = `thumb_${Date.now()}.jpg`;
    const outputPath = path.join('thumbnails', filename);
    
    await fs.writeFile(outputPath, buffer);
    
    return outputPath;
  }
}
```

---

## 🎯 실전 체크리스트

### 프로젝트 설정
- [ ] node-addon-api 설치
- [ ] binding.gyp 작성
- [ ] node-gyp 빌드 성공

### 기본 타입
- [ ] Number 변환 (C++ ↔ JS)
- [ ] String 변환 (std::string ↔ JS)
- [ ] Array 생성 및 순회
- [ ] Object 생성 및 속성 접근
- [ ] Buffer 생성 및 데이터 전달

### AsyncWorker
- [ ] AsyncWorker 클래스 작성
- [ ] Execute() 구현 (워커 스레드)
- [ ] OnOK()/OnError() 구현 (메인 스레드)
- [ ] Promise 반환

### 에러 처리
- [ ] 타입 검증 (IsNumber, IsString, etc.)
- [ ] 예외 처리 (ThrowAsJavaScriptException)
- [ ] SetError() 사용

---

## 📚 면접 예상 질문

### 기초
1. **N-API란?**
   - Node.js Native API (C/C++ 확장)

2. **N-API를 사용하는 이유는?**
   - 고성능 작업, 네이티브 라이브러리 통합

3. **binding.gyp란?**
   - 빌드 설정 파일 (node-gyp)

4. **AsyncWorker의 역할은?**
   - 백그라운드 작업 (이벤트 루프 차단 방지)

5. **Execute()는 어느 스레드에서 실행되나?**
   - 워커 스레드 (백그라운드)

### 심화
6. **ABI 안정성이란?**
   - Application Binary Interface
   - Node.js 버전이 바뀌어도 재빌드 불필요

7. **Napi::Buffer vs Napi::Array?**
   - Buffer: 바이너리 데이터 (uint8_t[])
   - Array: JavaScript 배열

8. **NAPI_DISABLE_CPP_EXCEPTIONS를 사용하는 이유는?**
   - 성능 향상 (예외 처리 오버헤드 제거)

9. **메모리 관리는 누가 하나?**
   - Napi::Value: V8 GC
   - C++ 객체: 수동 관리 (delete, unique_ptr)

10. **AsyncWorker에서 OnOK()는 언제 호출되나?**
    - Execute() 성공 후, 메인 스레드에서

---

**다음 문서**: [95-ffmpeg-c-api.md](95-ffmpeg-c-api.md) - FFmpeg C API
