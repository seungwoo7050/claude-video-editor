# WebGL 비디오 렌더링

**목표**: WebGL로 60 FPS 비디오 렌더링 및 필터 효과  
**난이도**: ⭐⭐⭐⭐☆ (상급)  
**예상 시간**: 7-8시간 (정독 + 실습)  
**선행 과정**: [90-react-typescript-vite.md](90-react-typescript-vite.md)

---

## 📋 목차

1. [WebGL 기초](#part-1-webgl-기초)
2. [비디오 텍스처](#part-2-비디오-텍스처)
3. [셰이더 프로그래밍](#part-3-셰이더-프로그래밍)
4. [성능 최적화](#part-4-성능-최적화)

---

## Part 1: WebGL 기초

### 1.1 WebGL이란?

```
WebGL = Web Graphics Library

특징:
✅ GPU 가속 그래픽 (OpenGL ES 2.0 기반)
✅ Canvas에서 3D/2D 렌더링
✅ 셰이더 프로그래밍 (GLSL)
✅ 60 FPS 고성능

vs Canvas 2D:
- WebGL: GPU 가속, 빠름, 복잡
- Canvas 2D: CPU 렌더링, 느림, 간단
```

---

### 1.2 기본 구조

```
WebGL 렌더링 파이프라인:

1. Vertex Shader (정점 셰이더)
   └─ 정점 위치 계산

2. Rasterization (래스터화)
   └─ 정점 → 픽셀 변환

3. Fragment Shader (프래그먼트 셰이더)
   └─ 픽셀 색상 계산

4. Frame Buffer
   └─ 최종 이미지
```

---

### 1.3 WebGL 컨텍스트

```typescript
// src/components/VideoPlayer.tsx
import { useEffect, useRef } from 'react';

export const VideoPlayer = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const glRef = useRef<WebGLRenderingContext | null>(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // WebGL 컨텍스트 가져오기
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) {
      console.error('WebGL not supported');
      return;
    }
    
    glRef.current = gl as WebGLRenderingContext;
    
    // 뷰포트 설정
    gl.viewport(0, 0, canvas.width, canvas.height);
    
    // 배경색 설정
    gl.clearColor(0, 0, 0, 1);  // 검정색
    gl.clear(gl.COLOR_BUFFER_BIT);
    
  }, []);
  
  return (
    <div>
      <canvas ref={canvasRef} width={1280} height={720} />
      <video ref={videoRef} style={{ display: 'none' }} />
    </div>
  );
};
```

---

### 1.4 셰이더 컴파일

```typescript
const createShader = (
  gl: WebGLRenderingContext,
  type: number,
  source: string
): WebGLShader | null => {
  const shader = gl.createShader(type);
  if (!shader) return null;
  
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  
  // 컴파일 에러 확인
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error('Shader compile error:', gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  
  return shader;
};

const createProgram = (
  gl: WebGLRenderingContext,
  vertexShader: WebGLShader,
  fragmentShader: WebGLShader
): WebGLProgram | null => {
  const program = gl.createProgram();
  if (!program) return null;
  
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  
  // 링크 에러 확인
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error('Program link error:', gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
    return null;
  }
  
  return program;
};
```

---

## Part 2: 비디오 텍스처

### 2.1 Vertex Shader (정점 셰이더)

```glsl
// 정점 위치 + 텍스처 좌표
attribute vec2 a_position;
attribute vec2 a_texCoord;

varying vec2 v_texCoord;

void main() {
  // 정점 위치 (-1 ~ 1 범위)
  gl_Position = vec4(a_position, 0.0, 1.0);
  
  // 텍스처 좌표 전달 (Fragment Shader로)
  v_texCoord = a_texCoord;
}
```

---

### 2.2 Fragment Shader (프래그먼트 셰이더)

```glsl
precision mediump float;

uniform sampler2D u_texture;  // 비디오 텍스처
varying vec2 v_texCoord;      // Vertex Shader에서 전달

void main() {
  // 텍스처에서 색상 샘플링
  gl_FragColor = texture2D(u_texture, v_texCoord);
}
```

---

### 2.3 정점 버퍼

```typescript
const setupBuffers = (gl: WebGLRenderingContext, program: WebGLProgram) => {
  // 정점 위치 (전체 화면 사각형)
  const positions = new Float32Array([
    -1, -1,  // 좌하단
     1, -1,  // 우하단
    -1,  1,  // 좌상단
     1,  1   // 우상단
  ]);
  
  const positionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
  
  const positionLocation = gl.getAttribLocation(program, 'a_position');
  gl.enableVertexAttribArray(positionLocation);
  gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
  
  // 텍스처 좌표
  const texCoords = new Float32Array([
    0, 1,  // 좌하단
    1, 1,  // 우하단
    0, 0,  // 좌상단
    1, 0   // 우상단
  ]);
  
  const texCoordBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, texCoords, gl.STATIC_DRAW);
  
  const texCoordLocation = gl.getAttribLocation(program, 'a_texCoord');
  gl.enableVertexAttribArray(texCoordLocation);
  gl.vertexAttribPointer(texCoordLocation, 2, gl.FLOAT, false, 0, 0);
};
```

---

### 2.4 비디오 텍스처 업데이트

```typescript
const createTexture = (gl: WebGLRenderingContext): WebGLTexture | null => {
  const texture = gl.createTexture();
  if (!texture) return null;
  
  gl.bindTexture(gl.TEXTURE_2D, texture);
  
  // 텍스처 파라미터
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  
  return texture;
};

const updateTexture = (
  gl: WebGLRenderingContext,
  texture: WebGLTexture,
  video: HTMLVideoElement
) => {
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,                    // mipmap level
    gl.RGBA,              // internal format
    gl.RGBA,              // format
    gl.UNSIGNED_BYTE,     // type
    video                 // source
  );
};
```

---

### 2.5 렌더 루프

```typescript
const VideoPlayer = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;
    
    const gl = canvas.getContext('webgl');
    if (!gl) return;
    
    // 셰이더 컴파일
    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
    if (!vertexShader || !fragmentShader) return;
    
    const program = createProgram(gl, vertexShader, fragmentShader);
    if (!program) return;
    
    gl.useProgram(program);
    
    // 버퍼 설정
    setupBuffers(gl, program);
    
    // 텍스처 생성
    const texture = createTexture(gl);
    if (!texture) return;
    
    // 렌더 루프
    const render = () => {
      if (!video.paused && !video.ended) {
        // 비디오 프레임 → 텍스처 업데이트
        updateTexture(gl, texture, video);
      }
      
      // 화면 클리어
      gl.clearColor(0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);
      
      // 사각형 그리기 (2개 삼각형)
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      
      // 다음 프레임 요청 (60 FPS)
      requestAnimationFrame(render);
    };
    
    render();
    
  }, []);
  
  return (
    <div>
      <canvas ref={canvasRef} width={1280} height={720} />
      <video ref={videoRef} src="/video.mp4" autoPlay muted loop style={{ display: 'none' }} />
    </div>
  );
};
```

---

## Part 3: 셰이더 프로그래밍

### 3.1 밝기 조절

```glsl
// Fragment Shader
precision mediump float;

uniform sampler2D u_texture;
uniform float u_brightness;  // -1.0 ~ 1.0

varying vec2 v_texCoord;

void main() {
  vec4 color = texture2D(u_texture, v_texCoord);
  
  // 밝기 조절
  color.rgb += u_brightness;
  
  gl_FragColor = color;
}
```

**JavaScript**:
```typescript
const brightnessLocation = gl.getUniformLocation(program, 'u_brightness');
gl.uniform1f(brightnessLocation, 0.2);  // 20% 밝게
```

---

### 3.2 대비 조절

```glsl
uniform float u_contrast;  // 0.0 ~ 2.0

void main() {
  vec4 color = texture2D(u_texture, v_texCoord);
  
  // 대비 조절
  color.rgb = (color.rgb - 0.5) * u_contrast + 0.5;
  
  gl_FragColor = color;
}
```

---

### 3.3 채도 조절

```glsl
uniform float u_saturation;  // 0.0 ~ 2.0

void main() {
  vec4 color = texture2D(u_texture, v_texCoord);
  
  // Grayscale (회색조)
  float gray = dot(color.rgb, vec3(0.299, 0.587, 0.114));
  
  // 채도 조절 (보간)
  color.rgb = mix(vec3(gray), color.rgb, u_saturation);
  
  gl_FragColor = color;
}
```

---

### 3.4 색상 반전

```glsl
uniform bool u_invert;

void main() {
  vec4 color = texture2D(u_texture, v_texCoord);
  
  if (u_invert) {
    color.rgb = 1.0 - color.rgb;
  }
  
  gl_FragColor = color;
}
```

---

### 3.5 블러 (Gaussian Blur)

```glsl
uniform sampler2D u_texture;
uniform vec2 u_resolution;  // 텍스처 크기

void main() {
  vec2 texel = 1.0 / u_resolution;
  
  // 5x5 가우시안 커널
  vec4 color = vec4(0.0);
  
  color += texture2D(u_texture, v_texCoord + vec2(-2.0, -2.0) * texel) * 0.003;
  color += texture2D(u_texture, v_texCoord + vec2(-1.0, -1.0) * texel) * 0.014;
  color += texture2D(u_texture, v_texCoord + vec2( 0.0,  0.0) * texel) * 0.225;
  color += texture2D(u_texture, v_texCoord + vec2( 1.0,  1.0) * texel) * 0.014;
  color += texture2D(u_texture, v_texCoord + vec2( 2.0,  2.0) * texel) * 0.003;
  
  gl_FragColor = color;
}
```

---

### 3.6 통합 셰이더

```glsl
precision mediump float;

uniform sampler2D u_texture;
uniform float u_brightness;
uniform float u_contrast;
uniform float u_saturation;
uniform bool u_invert;

varying vec2 v_texCoord;

void main() {
  vec4 color = texture2D(u_texture, v_texCoord);
  
  // 1. 밝기
  color.rgb += u_brightness;
  
  // 2. 대비
  color.rgb = (color.rgb - 0.5) * u_contrast + 0.5;
  
  // 3. 채도
  float gray = dot(color.rgb, vec3(0.299, 0.587, 0.114));
  color.rgb = mix(vec3(gray), color.rgb, u_saturation);
  
  // 4. 반전
  if (u_invert) {
    color.rgb = 1.0 - color.rgb;
  }
  
  // 범위 제한
  color = clamp(color, 0.0, 1.0);
  
  gl_FragColor = color;
}
```

---

## Part 4: 성능 최적화

### 4.1 FPS 측정

```typescript
const useFPS = () => {
  const [fps, setFPS] = useState(0);
  const frameCountRef = useRef(0);
  const lastTimeRef = useRef(Date.now());
  
  useEffect(() => {
    const updateFPS = () => {
      frameCountRef.current++;
      
      const now = Date.now();
      const elapsed = now - lastTimeRef.current;
      
      if (elapsed >= 1000) {  // 1초마다 업데이트
        setFPS(frameCountRef.current);
        frameCountRef.current = 0;
        lastTimeRef.current = now;
      }
      
      requestAnimationFrame(updateFPS);
    };
    
    updateFPS();
  }, []);
  
  return fps;
};

// 사용
const VideoPlayer = () => {
  const fps = useFPS();
  
  return (
    <div>
      <canvas ref={canvasRef} />
      <p>FPS: {fps}</p>
    </div>
  );
};
```

---

### 4.2 텍스처 재사용

```typescript
const VideoRenderer = () => {
  const textureRef = useRef<WebGLTexture | null>(null);
  
  useEffect(() => {
    const gl = glRef.current;
    if (!gl) return;
    
    // 텍스처 한 번만 생성
    if (!textureRef.current) {
      textureRef.current = createTexture(gl);
    }
    
    const render = () => {
      if (textureRef.current) {
        // 텍스처 재사용 (재생성 없음)
        updateTexture(gl, textureRef.current, video);
      }
      
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      requestAnimationFrame(render);
    };
    
    render();
    
    return () => {
      // 정리
      if (textureRef.current) {
        gl.deleteTexture(textureRef.current);
        textureRef.current = null;
      }
    };
  }, []);
};
```

---

### 4.3 조건부 렌더링

```typescript
const render = () => {
  // 비디오 재생 중일 때만 텍스처 업데이트
  if (video.paused || video.ended) {
    requestAnimationFrame(render);
    return;
  }
  
  // 비디오 프레임이 변경되었을 때만 업데이트
  if (video.readyState >= video.HAVE_CURRENT_DATA) {
    updateTexture(gl, texture, video);
  }
  
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  
  requestAnimationFrame(render);
};
```

---

### 4.4 성능 비교

```typescript
// 1. Canvas 2D
const render2D = () => {
  const ctx = canvas.getContext('2d');
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  
  // 필터 (느림)
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  
  for (let i = 0; i < data.length; i += 4) {
    data[i] += 50;  // 밝기 조절
  }
  
  ctx.putImageData(imageData, 0, 0);
};

// 2. WebGL (빠름)
const renderWebGL = () => {
  updateTexture(gl, texture, video);
  gl.uniform1f(brightnessLocation, 0.2);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
};
```

**벤치마크**:
```
해상도: 1920x1080

Canvas 2D: ~20 FPS
WebGL: ~60 FPS

속도 차이: 3배
```

---

## 🎯 실전 체크리스트

### WebGL 기초
- [ ] WebGL 컨텍스트 가져오기
- [ ] 셰이더 컴파일 및 프로그램 링크
- [ ] Vertex Buffer 생성
- [ ] Attribute/Uniform 설정

### 비디오 렌더링
- [ ] 비디오 요소 생성 및 로드
- [ ] 텍스처 생성 및 파라미터 설정
- [ ] 비디오 프레임 → 텍스처 업데이트
- [ ] drawArrays로 사각형 렌더링

### 셰이더 효과
- [ ] 밝기 조절
- [ ] 대비 조절
- [ ] 채도 조절
- [ ] 색상 반전
- [ ] 블러 (선택)

### 성능
- [ ] FPS 측정 (60 FPS 목표)
- [ ] 텍스처 재사용
- [ ] 조건부 렌더링
- [ ] requestAnimationFrame 사용

---

## 📚 면접 예상 질문

### 기초
1. **WebGL이란?**
   - GPU 가속 그래픽 API (OpenGL ES 2.0 기반)

2. **Vertex Shader vs Fragment Shader?**
   - Vertex: 정점 위치 계산
   - Fragment: 픽셀 색상 계산

3. **텍스처란?**
   - GPU에 업로드된 이미지 데이터

4. **Uniform vs Attribute?**
   - Uniform: 모든 정점에 동일한 값
   - Attribute: 정점마다 다른 값

5. **gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)의 의미는?**
   - 4개 정점으로 삼각형 띠 그리기 (2개 삼각형)

### 심화
6. **WebGL이 Canvas 2D보다 빠른 이유는?**
   - GPU 가속 (병렬 처리)

7. **60 FPS 유지 방법은?**
   - requestAnimationFrame
   - 불필요한 텍스처 업데이트 최소화
   - 셰이더 최적화

8. **텍스처 파라미터 (CLAMP_TO_EDGE, LINEAR)의 역할은?**
   - CLAMP_TO_EDGE: 경계 픽셀 반복
   - LINEAR: 선형 보간 (부드러운 확대)

9. **셰이더에서 mix() 함수란?**
   - 두 값 선형 보간 (lerp)

10. **WebGL에서 메모리 누수 방지 방법은?**
    - deleteTexture, deleteBuffer, deleteProgram 호출

---

**다음 단계**: VrewCraft Phase 2 (C++ Native Addon 통합)
