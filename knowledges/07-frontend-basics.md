# 프론트엔드 기초 (Frontend Basics)

**목표**: 백엔드 엔지니어가 알아야 할 프론트엔드 기초 지식  
**난이도**: ⭐⭐☆☆☆ (기초)  
**예상 시간**: 2-3시간 (정독)  
**선행 과정**: 없음

---

## 📋 목차

1. [웹 기초](#part-1-웹-기초)
2. [Browser Rendering](#part-2-browser-rendering)
3. [React 기초](#part-3-react-기초)
4. [이미지 포맷](#part-4-이미지-포맷)

---

## Part 1: 웹 기초

### 1.1 HTML, CSS, JavaScript 역할

```
HTML (구조)       CSS (스타일)      JavaScript (동작)
─────────────────────────────────────────────────────
<div>Hello</div>  color: red;      alert('Hello');
뼈대              옷                근육
```

**예제**:
```html
<!DOCTYPE html>
<html>
<head>
    <style>
        /* CSS: 스타일링 */
        .greeting {
            color: blue;
            font-size: 24px;
        }
    </style>
</head>
<body>
    <!-- HTML: 구조 -->
    <div class="greeting">Hello World</div>
    
    <script>
        // JavaScript: 동작
        document.querySelector('.greeting').addEventListener('click', () => {
            alert('Clicked!');
        });
    </script>
</body>
</html>
```

---

### 1.2 DOM (Document Object Model)

#### DOM Tree

```html
<html>
  <head>
    <title>Page</title>
  </head>
  <body>
    <div id="container">
      <p>Hello</p>
      <p>World</p>
    </div>
  </body>
</html>
```

**DOM Tree 구조**:
```
Document
  └─ html
      ├─ head
      │   └─ title ("Page")
      └─ body
          └─ div#container
              ├─ p ("Hello")
              └─ p ("World")
```

---

#### DOM 조작

```javascript
// 1. 요소 선택
const element = document.getElementById('container');
const elements = document.querySelectorAll('p');

// 2. 내용 변경
element.textContent = 'New Text';
element.innerHTML = '<strong>Bold Text</strong>';

// 3. 스타일 변경
element.style.color = 'red';
element.style.fontSize = '20px';

// 4. 클래스 추가/제거
element.classList.add('active');
element.classList.remove('hidden');
element.classList.toggle('visible');

// 5. 이벤트 리스너
element.addEventListener('click', (event) => {
    console.log('Clicked!', event.target);
});

// 6. 요소 생성/삽입
const newElement = document.createElement('p');
newElement.textContent = 'New Paragraph';
element.appendChild(newElement);

// 7. 요소 제거
element.removeChild(newElement);
```

---

### 1.3 AJAX (Asynchronous JavaScript And XML)

#### XMLHttpRequest (구식)

```javascript
const xhr = new XMLHttpRequest();
xhr.open('GET', 'https://api.example.com/users');
xhr.onload = function() {
    if (xhr.status === 200) {
        const users = JSON.parse(xhr.responseText);
        console.log(users);
    }
};
xhr.send();
```

---

#### Fetch API (현대적)

```javascript
// GET 요청
fetch('https://api.example.com/users')
    .then(response => response.json())
    .then(users => console.log(users))
    .catch(error => console.error(error));

// POST 요청
fetch('https://api.example.com/users', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
    },
    body: JSON.stringify({
        name: 'Alice',
        email: 'alice@example.com'
    })
})
.then(response => response.json())
.then(data => console.log(data));

// async/await (더 깔끔)
async function fetchUsers() {
    try {
        const response = await fetch('https://api.example.com/users');
        const users = await response.json();
        console.log(users);
    } catch (error) {
        console.error(error);
    }
}
```

---

### 1.4 CORS (Cross-Origin Resource Sharing)

#### 문제 상황

```
Frontend (http://localhost:3000)
   ↓ AJAX Request
Backend (http://localhost:8080)
   ↓ Response
❌ CORS Error!
```

**에러 메시지**:
```
Access to fetch at 'http://localhost:8080/api/users' from origin 'http://localhost:3000' 
has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present.
```

---

#### 해결 방법

**Backend (Spring Boot)**:
```java
@RestController
@CrossOrigin(origins = "http://localhost:3000")  // CORS 허용
public class UserController {
    
    @GetMapping("/api/users")
    public List<User> getUsers() {
        return userService.findAll();
    }
}

// 또는 Global 설정
@Configuration
public class WebConfig implements WebMvcConfigurer {
    
    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
                .allowedOrigins("http://localhost:3000")
                .allowedMethods("GET", "POST", "PUT", "DELETE")
                .allowedHeaders("*")
                .allowCredentials(true);
    }
}
```

**Response Header**:
```http
HTTP/1.1 200 OK
Access-Control-Allow-Origin: http://localhost:3000
Access-Control-Allow-Methods: GET, POST, PUT, DELETE
Access-Control-Allow-Headers: Content-Type, Authorization
Access-Control-Allow-Credentials: true
```

---

## Part 2: Browser Rendering

### 2.1 렌더링 파이프라인

```
1. HTML Parsing → DOM Tree
2. CSS Parsing → CSSOM Tree
3. DOM + CSSOM → Render Tree
4. Layout (Reflow) → 위치/크기 계산
5. Paint (Repaint) → 픽셀로 그리기
6. Composite → GPU 합성
```

**예제**:
```html
<html>
<head>
    <style>
        .box {
            width: 100px;
            height: 100px;
            background: red;
        }
    </style>
</head>
<body>
    <div class="box"></div>
</body>
</html>
```

**렌더링 과정**:
```
1. HTML Parsing
   └─ DOM: <html> → <head> → <style> → <body> → <div>

2. CSS Parsing
   └─ CSSOM: .box { width: 100px, height: 100px, background: red }

3. Render Tree
   └─ <div.box> (width: 100px, height: 100px, background: red)

4. Layout (Reflow)
   └─ 좌표 계산: (0, 0, 100, 100)

5. Paint (Repaint)
   └─ 빨간색 사각형 그리기

6. Composite
   └─ GPU로 화면에 표시
```

---

### 2.2 Reflow (Layout)

#### 정의
**Reflow**: 요소의 위치/크기를 다시 계산하는 과정

**트리거 (Reflow 발생)**:
```javascript
// ❌ Reflow 발생 (느림)
element.style.width = '200px';   // 크기 변경
element.style.height = '200px';
element.style.marginTop = '50px'; // 위치 변경
element.style.display = 'block';  // 표시/숨김

// Reflow 트리거하는 속성
const height = element.offsetHeight;  // 높이 조회
const width = element.clientWidth;    // 너비 조회
const rect = element.getBoundingClientRect();  // 좌표 조회
```

---

#### Reflow 최적화

**Bad** (여러 번 Reflow):
```javascript
// ❌ 3번 Reflow 발생
element.style.width = '100px';   // Reflow 1
element.style.height = '100px';  // Reflow 2
element.style.marginTop = '20px'; // Reflow 3
```

**Good** (1번 Reflow):
```javascript
// ✅ 1번만 Reflow (Class 변경)
.box {
    width: 100px;
    height: 100px;
    margin-top: 20px;
}

element.classList.add('box');  // Reflow 1번
```

**Better** (Reflow 회피):
```javascript
// ✅ transform 사용 (GPU 가속, Reflow 없음)
element.style.transform = 'translate(50px, 50px)';  // Composite만
element.style.opacity = '0.5';  // Composite만
```

---

#### Reflow vs Repaint

| 작업 | Reflow | Repaint | Composite |
|------|--------|---------|-----------|
| **위치/크기 변경** | ✅ | ✅ | ✅ |
| **색상 변경** | ❌ | ✅ | ✅ |
| **투명도/변환** | ❌ | ❌ | ✅ |
| **비용** | 매우 높음 | 높음 | 낮음 |

**예제**:
```javascript
// Reflow + Repaint + Composite (느림)
element.style.width = '200px';

// Repaint + Composite (보통)
element.style.backgroundColor = 'blue';

// Composite만 (빠름)
element.style.transform = 'scale(1.5)';
element.style.opacity = '0.8';
```

---

### 2.3 Virtual DOM (React 최적화)

#### 문제 상황

```javascript
// ❌ 실제 DOM 직접 조작 (느림)
for (let i = 0; i < 1000; i++) {
    const li = document.createElement('li');
    li.textContent = `Item ${i}`;
    ul.appendChild(li);  // 1000번 Reflow!
}
```

---

#### Virtual DOM 해결

```
1. Virtual DOM (JavaScript 객체)에 변경사항 반영
2. 이전 Virtual DOM과 비교 (Diffing)
3. 변경된 부분만 실제 DOM에 반영 (Reconciliation)
```

**예제 (React)**:
```jsx
// ✅ Virtual DOM 사용 (빠름)
function ItemList({ items }) {
    return (
        <ul>
            {items.map((item, i) => (
                <li key={i}>{item}</li>
            ))}
        </ul>
    );
}

// Virtual DOM에서 계산 → 실제 DOM 업데이트 최소화
```

**Diffing 알고리즘**:
```jsx
// Before
<ul>
    <li>Item 1</li>
    <li>Item 2</li>
    <li>Item 3</li>
</ul>

// After
<ul>
    <li>Item 1</li>
    <li>Item 2</li>
    <li>Item 3</li>
    <li>Item 4</li>  ← 추가됨
</ul>

// React: 마지막 <li>만 실제 DOM에 추가 (1번 Reflow)
```

---

## Part 3: React 기초

### 3.1 React란?

**정의**: Facebook이 만든 UI 라이브러리 (Component 기반)

**특징**:
- **Declarative**: 상태 기반 UI (선언적)
- **Component**: 재사용 가능한 UI 조각
- **Virtual DOM**: 빠른 렌더링
- **One-way Data Flow**: 단방향 데이터 흐름

---

### 3.2 Component

#### Function Component (현대적)

```jsx
// 함수형 컴포넌트
function Greeting({ name }) {
    return <h1>Hello, {name}!</h1>;
}

// 사용
<Greeting name="Alice" />
// 출력: <h1>Hello, Alice!</h1>
```

#### Class Component (구식)

```jsx
// 클래스형 컴포넌트
class Greeting extends React.Component {
    render() {
        return <h1>Hello, {this.props.name}!</h1>;
    }
}
```

---

### 3.3 Props (속성)

**부모 → 자식 데이터 전달**:
```jsx
function UserCard({ name, email, age }) {
    return (
        <div className="user-card">
            <h2>{name}</h2>
            <p>{email}</p>
            <p>Age: {age}</p>
        </div>
    );
}

// 사용
<UserCard name="Alice" email="alice@example.com" age={25} />
```

---

### 3.4 State (상태)

**useState Hook**:
```jsx
import { useState } from 'react';

function Counter() {
    const [count, setCount] = useState(0);  // 초기값 0
    
    return (
        <div>
            <p>Count: {count}</p>
            <button onClick={() => setCount(count + 1)}>
                Increment
            </button>
            <button onClick={() => setCount(count - 1)}>
                Decrement
            </button>
        </div>
    );
}
```

**State 업데이트 → 자동 리렌더링**:
```jsx
function TodoList() {
    const [todos, setTodos] = useState([]);
    const [input, setInput] = useState('');
    
    const addTodo = () => {
        setTodos([...todos, input]);  // 새 배열 생성 (불변성)
        setInput('');
    };
    
    return (
        <div>
            <input 
                value={input} 
                onChange={(e) => setInput(e.target.value)} 
            />
            <button onClick={addTodo}>Add</button>
            <ul>
                {todos.map((todo, i) => (
                    <li key={i}>{todo}</li>
                ))}
            </ul>
        </div>
    );
}
```

---

### 3.5 useEffect (Side Effect)

**API 호출, Timer 등**:
```jsx
import { useState, useEffect } from 'react';

function UserList() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    
    useEffect(() => {
        // Component Mount 시 실행
        fetch('https://api.example.com/users')
            .then(response => response.json())
            .then(data => {
                setUsers(data);
                setLoading(false);
            });
    }, []);  // 빈 배열 = Mount 시 1번만 실행
    
    if (loading) return <p>Loading...</p>;
    
    return (
        <ul>
            {users.map(user => (
                <li key={user.id}>{user.name}</li>
            ))}
        </ul>
    );
}
```

**의존성 배열**:
```jsx
// 1. Mount 시 1번만
useEffect(() => {
    console.log('Mounted');
}, []);

// 2. count 변경 시마다
useEffect(() => {
    console.log('Count changed:', count);
}, [count]);

// 3. 매 렌더링마다 (권장 안 함)
useEffect(() => {
    console.log('Every render');
});

// 4. Cleanup (Component Unmount 시)
useEffect(() => {
    const timer = setInterval(() => {
        console.log('Tick');
    }, 1000);
    
    return () => clearInterval(timer);  // Cleanup
}, []);
```

---

### 3.6 JSX (JavaScript XML)

**HTML-like 문법**:
```jsx
// JSX
const element = <h1>Hello, {name}!</h1>;

// Babel로 변환됨 (실제 JavaScript)
const element = React.createElement(
    'h1',
    null,
    'Hello, ',
    name,
    '!'
);
```

**JSX 규칙**:
```jsx
// 1. 단일 루트 요소
// ❌
return (
    <h1>Title</h1>
    <p>Content</p>
);

// ✅
return (
    <div>
        <h1>Title</h1>
        <p>Content</p>
    </div>
);

// 또는 Fragment
return (
    <>
        <h1>Title</h1>
        <p>Content</p>
    </>
);

// 2. className (class는 예약어)
<div className="container"></div>

// 3. 중괄호로 JavaScript 표현식
<p>{2 + 2}</p>  // 4
<p>{user.name}</p>

// 4. 조건부 렌더링
{isLoggedIn ? <UserProfile /> : <Login />}
{isVisible && <Modal />}

// 5. 리스트 렌더링 (key 필수)
{users.map(user => (
    <li key={user.id}>{user.name}</li>
))}
```

---

## Part 4: 이미지 포맷

### 4.1 PNG vs JPG

| 특성 | PNG | JPG |
|------|-----|-----|
| **압축** | 무손실 (Lossless) | 손실 (Lossy) |
| **투명도** | ✅ (Alpha Channel) | ❌ |
| **파일 크기** | 큰 편 | 작은 편 |
| **적합한 용도** | 로고, 아이콘, UI | 사진, 배경 |
| **색상 수** | 1677만 (24-bit) + 투명도 | 1677만 (24-bit) |
| **애니메이션** | ❌ (APNG는 가능) | ❌ |

---

#### PNG (Portable Network Graphics)

**특징**:
- **무손실 압축**: 원본 품질 유지
- **투명도 지원**: Alpha Channel (0-255)
- **사용 사례**: 로고, 아이콘, 버튼, UI 요소

**예제**:
```html
<!-- 투명 배경 로고 -->
<img src="logo.png" alt="Logo" />

<!-- 아이콘 (투명도 활용) -->
<img src="icon-check.png" alt="Check" />
```

**PNG-8 vs PNG-24**:
```
PNG-8:  256 colors, 작은 파일 크기
PNG-24: 1677만 colors, 큰 파일 크기
```

---

#### JPG (Joint Photographic Experts Group)

**특징**:
- **손실 압축**: 파일 크기 감소 (품질 저하)
- **투명도 없음**: 항상 사각형
- **사용 사례**: 사진, 배경 이미지

**압축 품질**:
```
Quality 100% → 1.5 MB (거의 무손실)
Quality 90%  → 500 KB (눈에 띄는 차이 없음)
Quality 70%  → 200 KB (약간 품질 저하)
Quality 50%  → 100 KB (눈에 띄는 품질 저하)
```

**예제**:
```html
<!-- 사진 -->
<img src="photo.jpg" alt="Photo" />

<!-- 배경 이미지 -->
<div style="background-image: url('background.jpg')"></div>
```

---

### 4.2 WebP (현대적 포맷)

**특징**:
- Google 개발
- **무손실/손실 압축** 모두 지원
- **투명도 지원**
- **애니메이션 지원**
- JPG보다 25-35% 작은 파일 크기

**브라우저 지원**:
```html
<picture>
    <source srcset="image.webp" type="image/webp">
    <source srcset="image.jpg" type="image/jpeg">
    <img src="image.jpg" alt="Fallback">
</picture>
```

---

### 4.3 SVG (Scalable Vector Graphics)

**특징**:
- **벡터 그래픽**: 확대해도 깨지지 않음
- **XML 기반**: 텍스트로 편집 가능
- **작은 파일 크기**: 단순한 도형일수록 유리
- **CSS/JS로 조작 가능**

**예제**:
```html
<!-- SVG 코드 -->
<svg width="100" height="100">
    <circle cx="50" cy="50" r="40" fill="red" />
</svg>

<!-- 외부 파일 -->
<img src="icon.svg" alt="Icon" />

<!-- CSS로 색상 변경 -->
<style>
    svg circle {
        fill: blue;
    }
    svg circle:hover {
        fill: green;
    }
</style>
```

**사용 사례**:
- 로고 (확대/축소 필요)
- 아이콘 (색상 변경 필요)
- 차트/그래프

---

### 4.4 GIF (Graphics Interchange Format)

**특징**:
- **애니메이션 지원**
- **투명도 지원** (1-bit, On/Off만)
- **256 colors** (제한적)
- **큰 파일 크기** (비효율적)

**사용 사례**:
- 간단한 애니메이션
- 이모지
- (요즘은 WebP나 MP4로 대체)

---

### 4.5 실무 선택 가이드

```
로고/아이콘 (투명도 필요)
├─ 단순 → SVG (벡터, 확대 가능)
└─ 복잡 → PNG (래스터, 고품질)

사진
├─ 웹용 → WebP (최신 브라우저)
├─ 호환성 → JPG (구형 브라우저)
└─ 최고 품질 → PNG (원본 보관)

애니메이션
├─ 짧은 루프 → WebP (효율적)
├─ 긴 영상 → MP4 (비디오 코덱)
└─ 구형 브라우저 → GIF (호환성)

UI 요소
├─ 아이콘 → SVG (CSS 조작 가능)
├─ 스크린샷 → PNG (텍스트 선명)
└─ 배경 → JPG (파일 크기 작음)
```

---

## 🎯 실무 체크리스트

### 웹 기초
- [ ] **DOM 조작**: `querySelector`, `addEventListener` 사용
- [ ] **AJAX**: Fetch API로 비동기 통신
- [ ] **CORS**: Backend에서 `Access-Control-Allow-Origin` 설정

### 렌더링 최적화
- [ ] **Reflow 최소화**: Class 변경, `transform` 사용
- [ ] **Repaint 회피**: `opacity`, `transform` (GPU 가속)
- [ ] **Virtual DOM**: React 사용 시 `key` 속성 필수

### React
- [ ] **Props**: 부모 → 자식 데이터 전달 (읽기 전용)
- [ ] **State**: `useState`로 상태 관리 (불변성)
- [ ] **useEffect**: API 호출, Timer (의존성 배열 주의)

### 이미지
- [ ] **PNG**: 로고, 아이콘 (투명도)
- [ ] **JPG**: 사진, 배경 (압축)
- [ ] **WebP**: 모던 브라우저 (30% 작음)
- [ ] **SVG**: 벡터 아이콘 (확대 가능)

---

## 📚 면접 예상 질문

### 기초
1. **React란?**
   - Facebook의 UI 라이브러리, Component 기반, Virtual DOM

2. **Web Browser의 Reflow란?**
   - 요소의 위치/크기를 다시 계산하는 과정 (비용 높음)

3. **PNG와 JPG의 차이점은?**
   - PNG: 무손실, 투명도 지원, 로고/아이콘
   - JPG: 손실 압축, 투명도 없음, 사진

4. **DOM이란?**
   - Document Object Model, HTML을 트리 구조로 표현

5. **CORS란?**
   - Cross-Origin Resource Sharing, 다른 도메인 간 리소스 공유

### 심화
6. **Virtual DOM의 장점은?**
   - Diffing 알고리즘으로 변경 부분만 실제 DOM 업데이트 (빠름)

7. **Reflow를 최소화하는 방법은?**
   - Class 변경, `transform` 사용, DocumentFragment 활용

8. **React에서 key 속성이 필요한 이유는?**
   - Diffing 알고리즘이 요소를 식별하기 위해 (재렌더링 최적화)

9. **useEffect의 의존성 배열 역할은?**
   - 빈 배열: Mount 시 1번
   - [state]: state 변경 시
   - 생략: 매 렌더링마다

10. **WebP의 장점은?**
    - JPG보다 25-35% 작은 파일 크기, 투명도/애니메이션 지원

---

**다음 문서**: [08-security-cryptography.md](08-security-cryptography.md) - 보안 & 암호학 (비대칭 암호화, JWT, 웹 보안)
