# FIVEGRID — 오목 · Gomoku · 五子棋

DB와 서버 API 없이 동작하는 **모바일 우선 정적 오목 웹사이트**입니다. 15×15 오목판, 3단계 AI, 로컬 2인 대국, 규칙 선택, 힌트·무르기, 한국어·영어·중국어 학습 콘텐츠를 모두 포함합니다.

- 배포 대상: Render Static Site
- 런타임: 브라우저 + 빌드 시 Node.js
- 데이터베이스: 없음
- 외부 패키지·CDN: 없음
- 사용자 설정·전적·코스 진도: 브라우저 `localStorage`
- 다국어: 한국어, 영어, 중국어 간체

## 핵심 기능

### 대국

- 15×15 Canvas 오목판
- AI 대국과 한 기기 로컬 2인 대국
- 초급·중급·고급 AI
- 즉시 승리와 즉시 패배 방어를 우선 처리하는 전술 탐색
- 고급 AI는 Web Worker에서 후보 수·알파베타 탐색을 실행하여 화면 멈춤 최소화
- 자유룰, 정확히 5목, 렌주 연습 룰
- 흑·백·무작위 진영 선택
- 힌트, 무르기, 새 게임, 착수음, 좌표 표시
- 승·패·무·연승 로컬 기록
- 마우스, 터치, 키보드 방향키·Enter 조작

### 학습

각 언어에 다음 페이지가 실제 정적 HTML URL로 생성됩니다.

- 홈
- 오목 대국
- 규칙
- 전략
- 초급 코스
- 중급 코스
- 고급 코스

각 코스는 5개 레슨, 실전 체크포인트, 로컬 진도 저장을 제공합니다.

### 모바일 UX

- Android Chrome·iPhone Safari용 반응형 레이아웃
- `viewport-fit=cover`와 safe-area 대응
- 터치 영역 44px 이상을 고려한 컨트롤
- 모바일에서 하단 고정형 대국 액션 바
- 보드 크기를 화면 폭에 맞춰 자동 조절
- 확대·스크롤 충돌을 줄이기 위한 Canvas 포인터 처리
- 가로 넘침 방지
- `prefers-reduced-motion` 접근성 지원
- 홈 화면 설치가 가능한 PWA 매니페스트와 서비스 워커

## URL 구조

| 언어 | 홈 | 대국 | 규칙 | 전략 | 코스 |
|---|---|---|---|---|---|
| 한국어 | `/ko/` | `/ko/play/` | `/ko/rules/` | `/ko/strategy/` | `/ko/course/beginner/` 등 |
| English | `/en/` | `/en/play/` | `/en/rules/` | `/en/strategy/` | `/en/course/beginner/` 등 |
| 简体中文 | `/zh/` | `/zh/play/` | `/zh/rules/` | `/zh/strategy/` | `/zh/course/beginner/` 등 |

루트 `/`는 언어 선택 허브입니다.

## SEO 구현

- 언어별 고유 URL과 서버 빌드 시 생성되는 완성 HTML
- 페이지별 고유 `<title>`·메타 설명
- 절대 canonical URL
- `hreflang="ko"`, `en`, `zh-Hans`, `x-default`
- Open Graph 메타데이터와 1200×630 공유 이미지
- `WebSite`, `WebPage`, `VideoGame`, `Article`, `Course`, `FAQPage`, `BreadcrumbList` JSON-LD
- 자동 생성 `sitemap.xml`과 `robots.txt`
- 의미론적 제목 구조·내부 링크·Breadcrumb
- 다국어별 자연스러운 규칙·전략·코스 본문

## 로컬 실행

Node.js 20 이상이 필요합니다.

```bash
npm run build
npm run dev
```

브라우저에서 다음 주소를 엽니다.

```text
http://localhost:4173
```

빌드 결과물은 `dist/`에 생성됩니다. 커스텀 도메인 기준으로 로컬 빌드할 때는 다음처럼 실행합니다.

```bash
SITE_URL=https://www.example.com npm run build
```

## 테스트

```bash
npm test
```

테스트 항목:

- 22개 정적 HTML 경로 생성
- 내부 링크와 정적 자산 존재 여부
- canonical·hreflang·메타 설명·구조화 데이터
- sitemap URL 중복 및 개수
- 매니페스트·서비스 워커용 자산
- AI 중앙 첫 수, 즉시 승리, 즉시 방어
- JavaScript 문법 검사

## Render Static Site 배포

### 방법 1: Blueprint 사용

1. 이 프로젝트를 GitHub 저장소에 올립니다.
2. Render 대시보드에서 **New → Blueprint**를 선택합니다.
3. 저장소를 연결합니다.
4. 루트의 `render.yaml`을 기준으로 Static Site가 생성됩니다.
5. 기본 `onrender.com` 주소는 Render의 `RENDER_EXTERNAL_URL`을 빌드 시 자동 사용합니다. 커스텀 도메인을 연결할 때만 `SITE_URL`을 최종 HTTPS 주소로 추가하고 다시 배포합니다.

`render.yaml`에 이미 다음 값이 포함되어 있습니다.

```yaml
runtime: static
buildCommand: npm run build
staticPublishPath: ./dist
```

### 방법 2: 직접 Static Site 생성

- Build Command: `npm run build`
- Publish Directory: `dist`
- 환경변수 `NODE_VERSION`: `24.14.1`
- 커스텀 도메인 사용 시에만 환경변수 `SITE_URL`: 실제 사이트의 최종 HTTPS 주소

기본 Render 주소는 자동 감지됩니다. 커스텀 도메인을 연결한 뒤에는 `SITE_URL`을 같은 도메인으로 추가해야 canonical, hreflang, sitemap, Open Graph URL이 정확하게 생성됩니다.

## 폴더 구조

```text
fivegrid-omok/
├─ render.yaml
├─ package.json
├─ scripts/
│  ├─ build.mjs          # 정적 HTML·SEO·PWA 파일 생성
│  ├─ serve.mjs          # 로컬 미리보기 서버
│  └─ test.mjs           # 빌드·SEO·AI 자동 검사
└─ src/
   ├─ config.mjs         # 언어·경로·사이트 설정
   ├─ content.mjs        # 한국어·영어·중국어 콘텐츠
   ├─ templates.mjs      # 페이지 템플릿·구조화 데이터
   └─ public/assets/
      ├─ styles.css
      ├─ site.js
      ├─ omok-game.js
      ├─ omok-ai-worker.js
      ├─ course-progress.js
      └─ 아이콘·공유 이미지
```

## 브랜드·도메인 변경

- 사이트명: `src/config.mjs`의 `SITE_NAME`
- 기본 URL: `src/config.mjs`의 `DEFAULT_SITE_URL`
- 색상·레이아웃: `src/public/assets/styles.css`
- 다국어 문구: `src/content.mjs`
- Render 서비스명: `render.yaml`의 `name`

변경 후 아래 명령으로 검증합니다.

```bash
npm test
npm run build
```

## 렌주 룰 관련 주의

이 프로젝트의 렌주 모드는 흑의 장목·쌍삼·쌍사 금수를 판정하는 **실전 연습용 구현**입니다. 복합 금수 예외까지 모두 다루는 대회 공인 심판 엔진을 목표로 하지 않습니다. 공식 대회나 판정 서비스에 사용할 경우 Renju International Federation의 최신 규정을 기준으로 별도의 완전한 금수 판정 엔진과 테스트 세트를 추가해야 합니다.

## 개인정보·서버 비용

계정, 로그인, 서버 저장, 분석 SDK가 없습니다. 대국 설정·전적·코스 진도는 사용자의 브라우저에만 저장되며, 브라우저 데이터를 지우면 함께 초기화됩니다. 정적 파일만 배포하므로 별도 애플리케이션 서버나 데이터베이스 비용이 필요하지 않습니다.
