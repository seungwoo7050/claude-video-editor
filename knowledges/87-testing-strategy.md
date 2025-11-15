# 테스팅 전략 (VrewCraft)

**목표**: 전체 스택 테스트 (Unit, Integration, E2E, Performance)
**난이도**: ⭐⭐⭐⭐☆ (상급)
**예상 시간**: 6-8시간 (정독 + 실습)
**선행 과정**: [01-codebase-guide.md](01-codebase-guide.md)

---

## 📋 목차

1. [테스트 전략](#part-1-테스트-전략)
2. [Unit 테스트](#part-2-unit-테스트)
3. [Integration 테스트](#part-3-integration-테스트)
4. [E2E 테스트](#part-4-e2e-테스트)
5. [Performance 테스트](#part-5-performance-테스트)

---

## Part 1: 테스트 전략

### 1.1 테스트 피라미드

```
           /\
          /  \         E2E Tests (10%)
         /    \        - Playwright
        /------\       - 전체 시나리오
       /        \
      /          \     Integration Tests (30%)
     /            \    - API 테스트
    /--------------\   - DB 연동
   /                \
  /                  \ Unit Tests (60%)
 /____________________\ - 함수, 클래스
                        - 빠름, 격리
```

**VrewCraft 테스트 범위:**
- Unit: 비즈니스 로직, 유틸리티
- Integration: API, Database, FFmpeg
- E2E: 업로드 → 편집 → 다운로드
- Performance: 썸네일 p99, API 지연

---

### 1.2 테스트 도구

| 계층 | 도구 | 용도 |
|-----|------|------|
| **Frontend Unit** | Vitest, React Testing Library | 컴포넌트, Hook |
| **Backend Unit** | Jest | Service, Utility |
| **Integration** | Supertest, Jest | API, DB |
| **E2E** | Playwright | 전체 워크플로우 |
| **Performance** | k6, autocannon | 부하 테스트 |
| **Memory** | valgrind, Chrome DevTools | 메모리 누수 |

---

### 1.3 CI/CD 통합

```yaml
# .github/workflows/test.yml
name: Test Suite

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-22.04

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_DB: vrewcraft_test
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

      redis:
        image: redis:7-alpine
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: 20

      - name: Install dependencies
        run: |
          cd backend && npm ci
          cd ../frontend && npm ci

      - name: Run unit tests
        run: |
          cd backend && npm test -- --coverage
          cd ../frontend && npm test -- --coverage

      - name: Run integration tests
        run: cd backend && npm run test:integration

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./backend/coverage/lcov.info,./frontend/coverage/lcov.info
```

---

## Part 2: Unit 테스트

### 2.1 Backend Unit 테스트 (Jest)

**설정:**
```json
// backend/package.json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  },
  "devDependencies": {
    "@types/jest": "^29.5.0",
    "jest": "^29.5.0",
    "ts-jest": "^29.1.0"
  }
}
```

```javascript
// backend/jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**'
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  }
};
```

---

### 2.2 Service 테스트

```typescript
// backend/src/services/__tests__/video.service.test.ts
import { VideoService, Video } from '../video.service';
import { db } from '../../db/postgres';

// Mock DB
jest.mock('../../db/postgres');

describe('VideoService', () => {
  let videoService: VideoService;

  beforeEach(() => {
    videoService = new VideoService();
    jest.clearAllMocks();
  });

  describe('save', () => {
    it('should save video metadata', async () => {
      const mockVideo: Partial<Video> = {
        filename: 'test.mp4',
        originalName: 'test.mp4',
        filePath: '/uploads/test.mp4',
        fileSize: 1024000,
        mimeType: 'video/mp4',
        duration: 60.5,
      };

      const expectedResult = {
        id: 'uuid-123',
        ...mockVideo,
        uploadedAt: new Date(),
      };

      (db.query as jest.Mock).mockResolvedValue({
        rows: [expectedResult],
        rowCount: 1,
      });

      const result = await videoService.save(mockVideo);

      expect(result).toEqual(expectedResult);
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO videos'),
        expect.arrayContaining([mockVideo.filename])
      );
    });

    it('should handle database errors', async () => {
      (db.query as jest.Mock).mockRejectedValue(new Error('DB error'));

      await expect(
        videoService.save({} as Partial<Video>)
      ).rejects.toThrow('DB error');
    });
  });

  describe('findById', () => {
    it('should return video if exists', async () => {
      const mockVideo = {
        id: 'uuid-123',
        filename: 'test.mp4',
      };

      (db.query as jest.Mock).mockResolvedValue({
        rows: [mockVideo],
      });

      const result = await videoService.findById('uuid-123');

      expect(result).toEqual(mockVideo);
    });

    it('should return null if not found', async () => {
      (db.query as jest.Mock).mockResolvedValue({
        rows: [],
      });

      const result = await videoService.findById('nonexistent');

      expect(result).toBeNull();
    });
  });
});
```

---

### 2.3 Utility 테스트

```typescript
// backend/src/utils/__tests__/time.utils.test.ts
import { formatDuration, parseDuration } from '../time.utils';

describe('Time Utils', () => {
  describe('formatDuration', () => {
    it('should format seconds to mm:ss', () => {
      expect(formatDuration(0)).toBe('0:00');
      expect(formatDuration(30)).toBe('0:30');
      expect(formatDuration(90)).toBe('1:30');
      expect(formatDuration(3661)).toBe('61:01');
    });

    it('should handle decimal seconds', () => {
      expect(formatDuration(90.5)).toBe('1:30');
    });
  });

  describe('parseDuration', () => {
    it('should parse mm:ss to seconds', () => {
      expect(parseDuration('0:30')).toBe(30);
      expect(parseDuration('1:30')).toBe(90);
      expect(parseDuration('61:01')).toBe(3661);
    });

    it('should handle invalid input', () => {
      expect(parseDuration('invalid')).toBeNaN();
      expect(parseDuration('')).toBeNaN();
    });
  });
});
```

---

### 2.4 Frontend Unit 테스트 (Vitest)

**설정:**
```typescript
// frontend/vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
    coverage: {
      reporter: ['text', 'lcov'],
      exclude: ['node_modules/', 'src/setupTests.ts'],
    },
  },
});
```

```typescript
// frontend/src/setupTests.ts
import { expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';

afterEach(() => {
  cleanup();
});
```

---

### 2.5 React Component 테스트

```tsx
// frontend/src/components/__tests__/ProgressBar.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ProgressBar } from '../ProgressBar';

describe('ProgressBar', () => {
  it('should render progress percentage', () => {
    render(<ProgressBar percent={50} message="Processing..." />);

    expect(screen.getByText('50%')).toBeInTheDocument();
    expect(screen.getByText('Processing...')).toBeInTheDocument();
  });

  it('should show correct width', () => {
    const { container } = render(<ProgressBar percent={75} />);

    const bar = container.querySelector('.bg-blue-500');
    expect(bar).toHaveStyle({ width: '75%' });
  });

  it('should handle 0% and 100%', () => {
    const { rerender } = render(<ProgressBar percent={0} />);
    expect(screen.getByText('0%')).toBeInTheDocument();

    rerender(<ProgressBar percent={100} />);
    expect(screen.getByText('100%')).toBeInTheDocument();
  });
});
```

---

### 2.6 Custom Hook 테스트

```typescript
// frontend/src/hooks/__tests__/useWebSocket.test.ts
import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useWebSocket } from '../useWebSocket';

// Mock WebSocket
global.WebSocket = vi.fn().mockImplementation(() => ({
  send: vi.fn(),
  close: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  readyState: WebSocket.OPEN,
})) as any;

describe('useWebSocket', () => {
  it('should connect to WebSocket server', () => {
    const { result } = renderHook(() => useWebSocket('video-123'));

    expect(WebSocket).toHaveBeenCalledWith('ws://localhost:3002');
    expect(result.current.connected).toBe(false);
  });

  it('should update progress', async () => {
    const { result } = renderHook(() => useWebSocket('video-123'));

    // Simulate message
    const mockWs = (WebSocket as any).mock.results[0].value;
    mockWs.onmessage({ data: JSON.stringify({
      type: 'progress',
      videoId: 'video-123',
      data: { percent: 50, message: 'Processing' }
    })});

    await waitFor(() => {
      expect(result.current.progress).toEqual({
        percent: 50,
        message: 'Processing'
      });
    });
  });
});
```

---

## Part 3: Integration 테스트

### 3.1 API Integration 테스트

```typescript
// backend/src/__tests__/integration/upload.test.ts
import request from 'supertest';
import { app } from '../../server';
import { db } from '../../db/postgres';
import fs from 'fs/promises';
import path from 'path';

describe('Upload API', () => {
  beforeAll(async () => {
    // 테스트 DB 연결
    await db.query('DELETE FROM videos');
  });

  afterAll(async () => {
    await db.close();
  });

  describe('POST /api/upload', () => {
    it('should upload video successfully', async () => {
      const response = await request(app)
        .post('/api/upload')
        .attach('video', path.join(__dirname, '../fixtures/test.mp4'))
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        videoId: expect.any(String),
        url: expect.stringContaining('/videos/'),
      });

      // DB 검증
      const result = await db.query(
        'SELECT * FROM videos WHERE id = $1',
        [response.body.videoId]
      );
      expect(result.rows).toHaveLength(1);
    });

    it('should reject non-video files', async () => {
      const response = await request(app)
        .post('/api/upload')
        .attach('video', Buffer.from('test'), 'test.txt')
        .expect(400);

      expect(response.body.error).toContain('Invalid file type');
    });

    it('should reject files > 500MB', async () => {
      // 큰 파일 Mock (실제로는 생성하지 않음)
      const response = await request(app)
        .post('/api/upload')
        .field('fileSize', '600000000')
        .expect(400);

      expect(response.body.error).toContain('File too large');
    });
  });
});
```

---

### 3.2 Database Integration 테스트

```typescript
// backend/src/services/__tests__/integration/video.service.integration.test.ts
import { VideoService } from '../../video.service';
import { db } from '../../../db/postgres';

describe('VideoService Integration', () => {
  let videoService: VideoService;

  beforeAll(async () => {
    videoService = new VideoService();
    // 테스트 데이터 초기화
    await db.query('DELETE FROM videos');
  });

  afterAll(async () => {
    await db.close();
  });

  it('should save and retrieve video', async () => {
    const videoData = {
      filename: 'integration-test.mp4',
      originalName: 'test.mp4',
      filePath: '/uploads/integration-test.mp4',
      fileSize: 1024000,
      mimeType: 'video/mp4',
      duration: 60.5,
      codec: 'h264',
      resolution: '1920x1080',
    };

    // 1. 저장
    const saved = await videoService.save(videoData);
    expect(saved.id).toBeDefined();

    // 2. 조회
    const retrieved = await videoService.findById(saved.id);
    expect(retrieved).toMatchObject(videoData);

    // 3. 업데이트
    const updated = await videoService.updateMetadata(saved.id, {
      duration: 120.0,
    });
    expect(updated?.duration).toBe(120.0);

    // 4. 삭제
    const deleted = await videoService.delete(saved.id);
    expect(deleted).toBe(true);

    // 5. 확인
    const notFound = await videoService.findById(saved.id);
    expect(notFound).toBeNull();
  });
});
```

---

### 3.3 Redis Integration 테스트

```typescript
// backend/src/__tests__/integration/redis.test.ts
import { redis } from '../../db/redis';

describe('Redis Integration', () => {
  beforeAll(async () => {
    await redis.connect();
  });

  afterAll(async () => {
    await redis.disconnect();
  });

  beforeEach(async () => {
    // 테스트 키 삭제
    await redis.del('test:key');
  });

  it('should set and get string', async () => {
    await redis.set('test:key', 'value');
    const result = await redis.get('test:key');
    expect(result).toBe('value');
  });

  it('should expire key with TTL', async () => {
    await redis.set('test:key', 'value', 1); // 1초 TTL

    const ttl = await redis.ttl('test:key');
    expect(ttl).toBeLessThanOrEqual(1);

    await new Promise(resolve => setTimeout(resolve, 1100));

    const result = await redis.get('test:key');
    expect(result).toBeNull();
  });

  it('should store and retrieve buffer', async () => {
    const buffer = Buffer.from('test data');

    await redis.setBuffer('test:buffer', buffer);
    const retrieved = await redis.getBuffer('test:buffer');

    expect(retrieved).toEqual(buffer);
  });
});
```

---

## Part 4: E2E 테스트

### 4.1 Playwright 설정

```bash
npm install -D @playwright/test
npx playwright install
```

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',

  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
});
```

---

### 4.2 E2E 테스트 시나리오

```typescript
// e2e/video-editing.spec.ts
import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Video Editing Workflow', () => {
  test('should upload, trim, and download video', async ({ page }) => {
    // 1. 홈페이지 접속
    await page.goto('/');
    await expect(page.locator('h1')).toContainText('VrewCraft');

    // 2. 비디오 업로드
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(path.join(__dirname, 'fixtures/test.mp4'));

    // 업로드 완료 대기
    await expect(page.locator('.upload-success')).toBeVisible({ timeout: 10000 });

    // 3. 비디오 플레이어 확인
    const video = page.locator('video');
    await expect(video).toBeVisible();

    // 4. 타임라인에서 구간 선택
    const timeline = page.locator('canvas[data-testid="timeline"]');
    await timeline.click({ position: { x: 100, y: 50 } });
    await timeline.click({ position: { x: 300, y: 50 }, modifiers: ['Shift'] });

    // 5. Trim 버튼 클릭
    await page.locator('button', { hasText: 'Trim' }).click();

    // 6. 진행률 확인
    await expect(page.locator('.progress-bar')).toBeVisible();
    await expect(page.locator('.progress-bar')).toContainText('100%', { timeout: 30000 });

    // 7. 다운로드 링크 확인
    const downloadLink = page.locator('a[download]');
    await expect(downloadLink).toBeVisible();
    await expect(downloadLink).toContainText('Download');
  });

  test('should add subtitle', async ({ page }) => {
    await page.goto('/');

    // 비디오 업로드 (생략)

    // 자막 추가
    await page.locator('button', { hasText: 'Add Subtitle' }).click();

    // 자막 입력
    await page.locator('input[name="subtitle-text"]').fill('Hello World');
    await page.locator('input[name="subtitle-start"]').fill('5');
    await page.locator('input[name="subtitle-duration"]').fill('3');

    await page.locator('button', { hasText: 'Save' }).click();

    // 처리 완료 대기
    await expect(page.locator('.success-message')).toBeVisible({ timeout: 30000 });
  });
});
```

---

### 4.3 Visual Regression 테스트

```typescript
// e2e/visual.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Visual Regression', () => {
  test('should match timeline screenshot', async ({ page }) => {
    await page.goto('/');

    // 비디오 로드 대기
    await page.waitForLoadState('networkidle');

    // 스크린샷 비교
    await expect(page.locator('.timeline')).toHaveScreenshot('timeline.png');
  });

  test('should match video player screenshot', async ({ page }) => {
    await page.goto('/');

    await expect(page.locator('.video-player')).toHaveScreenshot('player.png');
  });
});
```

---

## Part 5: Performance 테스트

### 5.1 k6 Load Testing

```bash
npm install -g k6
```

```javascript
// performance/api-load-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

export const options = {
  stages: [
    { duration: '30s', target: 10 },   // 10 VU까지 램프업
    { duration: '1m', target: 50 },    // 50 VU 유지
    { duration: '30s', target: 100 },  // 100 VU까지
    { duration: '1m', target: 0 },     // 종료
  ],
  thresholds: {
    http_req_duration: ['p(99)<200'],  // p99 < 200ms
    errors: ['rate<0.05'],              // 에러율 < 5%
  },
};

export default function () {
  // 썸네일 요청
  const response = http.get('http://localhost:3001/api/thumbnail?videoId=test&timestamp=10');

  check(response, {
    'status is 200': (r) => r.status === 200,
    'p99 < 200ms': (r) => r.timings.duration < 200,
  }) || errorRate.add(1);

  sleep(0.1);
}
```

**실행:**
```bash
k6 run performance/api-load-test.js

# 출력:
# http_req_duration..........: avg=45ms  min=10ms  max=180ms  p(99)=150ms
# http_reqs..................: 5000
# errors.....................: 0.02% (10/5000)
```

---

### 5.2 Thumbnail 성능 테스트

```javascript
// performance/thumbnail-benchmark.js
import http from 'k6/http';
import { check } from 'k6';

export const options = {
  vus: 100,                      // 100 동시 사용자
  duration: '1m',
  thresholds: {
    'http_req_duration{name:thumbnail}': ['p(99)<50'],  // p99 < 50ms
  },
};

export default function () {
  const timestamp = Math.floor(Math.random() * 60);  // 0-60초

  const response = http.get(
    `http://localhost:3001/api/thumbnail?videoId=benchmark&timestamp=${timestamp}`,
    { tags: { name: 'thumbnail' } }
  );

  check(response, {
    'status is 200': (r) => r.status === 200,
    'content-type is jpeg': (r) => r.headers['Content-Type'] === 'image/jpeg',
    'p99 < 50ms': (r) => r.timings.duration < 50,
  });
}
```

---

### 5.3 메모리 누수 테스트

```bash
# valgrind로 Native Addon 검사
valgrind --leak-check=full \
  --show-leak-kinds=all \
  --track-origins=yes \
  node backend/dist/server.js

# 출력:
# LEAK SUMMARY:
#    definitely lost: 0 bytes in 0 blocks
#    indirectly lost: 0 bytes in 0 blocks
#    possibly lost: 0 bytes in 0 blocks
# ✅ 메모리 누수 없음
```

**Node.js 메모리 프로파일링:**
```bash
node --expose-gc --inspect backend/dist/server.js

# Chrome DevTools → Memory 탭
# Heap Snapshot 촬영 (전/후 비교)
```

---

### 5.4 성능 벤치마크 스크립트

```typescript
// scripts/benchmark.ts
import { performance } from 'perf_hooks';
import native from '../native/build/Release/native';

async function benchmarkThumbnailExtraction() {
  const iterations = 1000;
  const durations: number[] = [];

  console.log(`Running ${iterations} iterations...`);

  for (let i = 0; i < iterations; i++) {
    const start = performance.now();

    await native.extractThumbnail('test-video.mp4', 10);

    const duration = performance.now() - start;
    durations.push(duration);
  }

  durations.sort((a, b) => a - b);

  const p50 = durations[Math.floor(iterations * 0.50)];
  const p95 = durations[Math.floor(iterations * 0.95)];
  const p99 = durations[Math.floor(iterations * 0.99)];
  const avg = durations.reduce((a, b) => a + b) / iterations;

  console.log('\nResults:');
  console.log(`  p50: ${p50.toFixed(2)}ms`);
  console.log(`  p95: ${p95.toFixed(2)}ms`);
  console.log(`  p99: ${p99.toFixed(2)}ms ← Target: < 50ms`);
  console.log(`  avg: ${avg.toFixed(2)}ms`);

  if (p99 < 50) {
    console.log('\n✅ Performance target met!');
  } else {
    console.log('\n❌ Performance target NOT met');
    process.exit(1);
  }
}

benchmarkThumbnailExtraction();
```

**실행:**
```bash
ts-node scripts/benchmark.ts

# 출력:
#   p50: 22.35ms
#   p95: 38.42ms
#   p99: 45.12ms ← Target: < 50ms
#   avg: 25.67ms
# ✅ Performance target met!
```

---

## 🎯 실전 체크리스트

### Unit 테스트
- [ ] Jest/Vitest 설정
- [ ] Service 테스트 (70% 커버리지)
- [ ] React Component 테스트
- [ ] Custom Hook 테스트
- [ ] Utility 함수 테스트

### Integration 테스트
- [ ] API 테스트 (Supertest)
- [ ] Database 테스트
- [ ] Redis 테스트
- [ ] FFmpeg 통합 테스트

### E2E 테스트
- [ ] Playwright 설정
- [ ] 업로드 → 편집 → 다운로드 시나리오
- [ ] 자막 추가 시나리오
- [ ] Visual Regression 테스트

### Performance 테스트
- [ ] k6 Load Testing (p99 < 200ms)
- [ ] 썸네일 벤치마크 (p99 < 50ms)
- [ ] 메모리 누수 검사 (valgrind)
- [ ] 성능 리그레션 방지

### CI/CD
- [ ] GitHub Actions 워크플로우
- [ ] 커버리지 리포트 (Codecov)
- [ ] 자동 테스트 실행 (PR)

---

## 📚 면접 예상 질문

### 기초
1. **테스트 피라미드란?**
   - Unit (많음), Integration (중간), E2E (적음)

2. **Unit 테스트 vs Integration 테스트?**
   - Unit: 격리, 빠름
   - Integration: 실제 연동, 느림

3. **Mocking이란?**
   - 의존성을 가짜로 대체

4. **Test Coverage 의미는?**
   - 코드 중 테스트된 비율

5. **E2E 테스트 도구는?**
   - Playwright, Cypress

### 심화
6. **TDD vs BDD 차이는?**
   - TDD: Test-Driven Development (테스트 먼저)
   - BDD: Behavior-Driven Development (행위 먼저)

7. **Snapshot 테스트란?**
   - UI 변경 감지 (이전 스냅샷과 비교)

8. **메모리 누수 탐지 방법은?**
   - valgrind, Chrome DevTools, Heap Snapshot

9. **Load Testing vs Stress Testing?**
   - Load: 정상 부하
   - Stress: 한계까지

10. **테스트 커버리지 100%가 좋은가?**
    - 아니요. 의미 있는 테스트가 중요

---

**작성자**: VrewCraft Team
**최종 업데이트**: 2025-01-15
**버전**: 1.0.0
