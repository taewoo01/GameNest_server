# 🎮 GameNest Server

![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat&logo=node.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white)
![Express](https://img.shields.io/badge/Express-5-000000?style=flat&logo=express&logoColor=white)
![Socket.IO](https://img.shields.io/badge/Socket.IO-4-010101?style=flat&logo=socket.io&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL-4479A1?style=flat&logo=mysql&logoColor=white)
![JWT](https://img.shields.io/badge/Auth-JWT-black?style=flat&logo=jsonwebtoken&logoColor=white)

**게임 정보 제공, 커뮤니티, 실시간 오픈채팅을 지원하는 GameNest 서비스의 백엔드 API 서버입니다.**

## 소개

GameNest_server는 게임 목록/상세 정보 조회, 찜·별점, 커뮤니티 게시판(글쓰기·좋아요·스크랩·댓글), Steam 뉴스 크롤링, 실시간 오픈채팅 기능을 REST API와 Socket.IO로 제공하는 백엔드 서버입니다.

프론트엔드는 별도 저장소(Vercel 배포, `https://game-nest-gilt.vercel.app`)에서 이 서버로 API/소켓 요청을 보내는 구조이며, `src/index.ts`·`src/app.ts`의 CORS 허용 목록과 `.env`의 `CLIENT_URL` 값으로 그 연동 관계를 확인할 수 있습니다. (git log 기준 첫 커밋: 2025-08-22)

## 주요 기능

| 기능 | 진입점 | 설명 |
|---|---|---|
| 회원가입 / 로그인 | `POST /auth/register`, `/auth/login` | bcrypt 해시 저장, 로그인 성공 시 JWT(1시간 만료) 발급 |
| 아이디 / 비밀번호 찾기 · 변경 | `POST /auth/find-id`, `/auth/find-password`, `PUT /auth/change-password`, `/auth/update-password-no-login` | 이메일·닉네임 기반 본인 확인 |
| 회원정보 수정 | `PATCH /auth/update` | 닉네임/이메일 변경 |
| 게임 목록 / 상세 / 카테고리 조회 | `GET /game/list`, `/game/:id/detail`, `/game/category/:type/:value` | 정렬 옵션(`sort`), `platform`/`mode`/`tag`/`developer` 기준 필터링 (JSON 컬럼은 `JSON_CONTAINS` 사용) |
| 게임 찜 토글 / 찜 목록 | `POST /game/:id/like`, `GET /game/likes` | 로그인 필요 |
| 게임 별점 등록·조회 | `POST`/`GET /game/:id/rating` | 유저별 별점 upsert, 평균 별점 계산 |
| 커뮤니티 게시글 CRUD | `GET /community`, `POST /community/write`, `GET /community/:id` | 조회 시 views 증가, 작성 시 HTML 태그 제거 |
| 커뮤니티 좋아요 / 스크랩 토글 | `POST /community/:id/action` | 로그인 필요 |
| 내가 쓴 글 / 내 스크랩 조회 | `GET /community/my-posts`, `GET /myScrap` | 로그인 필요 |
| 게임·커뮤니티 댓글 CRUD | `/gameComment/:id/comments`, `/communityComment/:id/comments` | 대댓글(`parent_id`) 지원, 트리 구조로 변환해 응답 |
| 내가 쓴 댓글 모아보기 | `GET /myComment` | 게임 댓글 + 커뮤니티 댓글을 합쳐 최신순 정렬 |
| Steam 뉴스 크롤링 | `GET /steam/news/all` | Steam RSS 피드를 파싱해 제목/썸네일/요약 반환 |
| 채팅 이력 조회 | `GET /chat/messages` | DB에 저장된 채팅 로그 조회 |
| 실시간 채팅 | Socket.IO `chat message` 이벤트 | JWT 인증 후 메시지 저장 + 전체 브로드캐스트 |

## 동작 방식

1. 클라이언트가 `/auth/login`으로 로그인하면 서버가 JWT(1시간 만료)를 발급합니다.
2. 이후 보호된 REST 엔드포인트는 `Authorization: Bearer <token>` 헤더를 `authenticateToken` 미들웨어(`src/middlewares/authenticateToken.ts`)로 검증합니다.
3. 실시간 채팅은 별도 인증 경로를 탑니다: Socket.IO 연결 시 `handshake.auth.token`을 `src/socket.ts`의 `io.use` 미들웨어에서 검증하고, DB에서 유저 정보를 조회해 소켓에 붙입니다.
4. 채팅 메시지 전송 시 `chat_messages` 테이블에 저장한 뒤 접속 중인 모든 클라이언트에 `chat message` 이벤트로 브로드캐스트합니다.

```
[REST]  로그인 요청 → JWT 발급 → 이후 API 요청에 Bearer 토큰 첨부 → authenticateToken 검증 → 컨트롤러 로직 → DB(mysql2) → 응답

[Socket] 클라이언트 접속(auth.token) → JWT 검증 → DB에서 유저 조회 → 연결 수락
           └─ "chat message" 수신 → DB 저장 → io.emit("chat message")로 전체 브로드캐스트
```

## 기술 스택

- **런타임 / 언어**: Node.js, TypeScript 5 (strict 모드)
- **웹 프레임워크**: Express 5
- **실시간 통신**: Socket.IO 4
- **데이터베이스**: MySQL (`mysql2/promise` 커넥션 풀, `src/db/pool.ts`)
- **인증**: JSON Web Token (`jsonwebtoken`), 비밀번호 해시(`bcrypt`)
- **외부 연동**: `rss-parser`(Steam 뉴스 RSS), `axios`
- **코드에서 import되지 않는(미사용) 의존성**: `pg`, `libretranslate`, `@vitalets/google-translate-api` — 실제 DB 접근은 `mysql2`만 사용됩니다.

## 프로젝트 구조

```
GameNest_server/
├── src/
│   ├── index.ts                  # 엔트리포인트 — HTTP 서버 생성, CORS, Socket.IO 초기화, listen
│   ├── app.ts                    # Express 앱 생성 및 라우터 등록
│   ├── socket.ts                 # Socket.IO 인증 미들웨어 + 채팅 이벤트 핸들러
│   ├── AuthenticatedRequest.ts   # 인증된 요청(req.user)을 위한 타입 확장
│   ├── config/
│   │   └── route.ts              # ⚠ 빈 파일 (미사용)
│   ├── constants/
│   │   ├── index.ts              # HASHED_NUMBER (bcrypt salt rounds)
│   │   ├── messages.ts           # 응답 메시지 문자열 모음
│   │   └── routes.ts             # 라우트 경로 상수 (ROUTES)
│   ├── controllers/
│   │   └── auth.controller.ts    # ⚠ 빈 파일 (미사용 — 실제 로직은 routes/auth.route.ts에 구현됨)
│   ├── db/
│   │   └── pool.ts               # mysql2 커넥션 풀 생성
│   ├── middlewares/
│   │   └── authenticateToken.ts  # JWT 검증 미들웨어
│   ├── routes/
│   │   ├── auth.route.ts         # 회원가입/로그인/아이디·비밀번호 찾기/정보수정
│   │   ├── game.route.ts         # 게임 목록/상세/찜/별점/카테고리
│   │   ├── community.route.ts    # 커뮤니티 게시글 CRUD/좋아요/스크랩
│   │   ├── communityComment.route.ts  # 커뮤니티 댓글 CRUD(대댓글)
│   │   ├── gameComment.route.ts  # 게임 댓글 CRUD(대댓글)
│   │   ├── myComment.route.ts    # 내가 쓴 댓글 모아보기
│   │   ├── myScrap.route.ts      # 내가 스크랩한 게시글 조회
│   │   ├── new.route.ts          # Steam 뉴스 RSS 크롤링
│   │   └── chat.route.ts         # 채팅 메시지 이력 조회
│   └── types/
│       ├── auth.types.ts         # User, DetailQuery 타입
│       ├── game.types.ts         # Game 타입
│       └── index.d.ts            # Express Request.user 전역 타입 확장
├── dist/                         # tsc 빌드 산출물 — ⚠ git에 커밋되어 있음 (참고 섹션 확인)
├── .env                          # 환경변수 — ⚠ git에 커밋되어 있음 (참고 섹션 확인)
├── package.json
├── package-lock.json
└── tsconfig.json
```

## 데이터베이스 테이블 (쿼리 기반 추정)

저장소에 마이그레이션/스키마 파일이 없어, 아래 표는 라우트에서 실행하는 SQL 쿼리를 근거로 추정한 테이블/컬럼입니다.

| 테이블 | 주요 컬럼 (쿼리에서 참조) | 용도 |
|---|---|---|
| `users` | id, user_login_id, user_password, user_nickname, user_email, user_created_at, user_updated_at | 회원 정보 |
| `games` | id, game_title, game_thumbnail, game_description, game_story, game_release_date, game_developer, game_publisher, game_platforms(JSON), game_modes(JSON), game_tags(JSON), game_media, game_created_at, game_updated_at | 게임 정보 |
| `likes` | user_id, game_id, created_at | 게임 찜 |
| `ratings` | user_id, game_id, rating, created_at | 게임 별점 |
| `community_posts` | id, user_id, title, content, category, views, created_at, updated_at | 커뮤니티 게시글 |
| `community_likes` | user_id, post_id | 게시글 좋아요 |
| `community_scraps` | user_id, post_id | 게시글 스크랩 |
| `game_comments` | id, user_id, game_id, content, parent_id, created_at, updated_at | 게임 댓글(대댓글 포함) |
| `community_comments` | id, user_id, post_id, content, parent_id, created_at, updated_at | 커뮤니티 댓글(대댓글 포함) |
| `chat_messages` | id, user_id, text, date | 오픈채팅 메시지 로그 |

## Socket.IO 이벤트

| 이벤트 | 방향 | payload | 설명 |
|---|---|---|---|
| 연결 인증 | client → server | `handshake.auth.token` (JWT) | 연결 시점에 토큰 검증, 실패 시 연결 거부 |
| `chat message` | client → server | `{ text: string }` | 채팅 메시지 전송 |
| `chat message` | server → all clients | `{ user_id, user, text, date }` | 새 메시지를 전체 접속자에게 브로드캐스트 |
| `disconnect` | client → server | - | 접속 종료 로그 |

## 시작하기

### 요구 사항

- Node.js
- MySQL 서버 (기본 접속 정보는 `.env` 참고)
- `.env` 파일: `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASS`, `DB_NAME`, `PORT`, `JWT_SECRET`, `CLIENT_URL`

### 설치 및 실행

```bash
npm install

# 개발 모드 (아래 "참고" 섹션의 스크립트 이슈 확인)
npx ts-node src/index.ts

# 빌드
npm run build

# 프로덕션 실행
npm start
```

| 명령어 | 설명 |
|---|---|
| `npm run dev` | `ts-node index.ts` 실행 — ⚠ 참고 섹션 확인 (실제로는 실패함) |
| `npm run build` | TypeScript 컴파일 (`src/` → `dist/`) |
| `npm start` | 빌드된 `dist/index.js` 실행 (프로덕션) |

## 참고

- **`.env`가 git에 커밋되어 있습니다.** `DB_PASS`, `JWT_SECRET` 등 민감 정보가 저장소에 그대로 노출되어 있고 `.gitignore` 파일도 없습니다. 실제 운영 전 시크릿 교체와 `.gitignore` 추가가 필요합니다.
- **`dist/` 빌드 산출물도 git에 커밋되어 있습니다.** 소스와 별도로 관리되고 있어 최신 소스와 불일치할 수 있습니다.
- **`npm run dev` 스크립트 경로 오류**: `package.json`의 `dev` 스크립트가 `ts-node index.ts`로 되어 있지만 실제 엔트리 파일은 `src/index.ts`입니다. 저장소 루트에는 `index.ts`가 없어 스크립트를 그대로 실행하면 파일을 찾지 못해 실패합니다. `ts-node src/index.ts`로 실행해야 합니다.
- **빈(미사용) 파일**: `src/controllers/auth.controller.ts`, `src/config/route.ts`는 내용이 비어 있습니다. 인증 관련 실제 로직은 `src/routes/auth.route.ts`에 라우터와 함께 구현되어 있습니다.
- **CORS 설정이 두 곳에 중복 정의**되어 있습니다. `src/app.ts`와 `src/index.ts` 양쪽에서 각각 `cors()` 미들웨어를 적용하며, 허용 origin 목록도 서로 다릅니다(`app.ts`는 하드코딩 + `127.0.0.1:3000` 포함, `index.ts`는 `CLIENT_URL` 환경변수 사용).
- **JWT payload와 미들웨어 불일치**: 로그인 시 발급되는 토큰에는 `{ id, user_id }`만 서명되어 `email`이 포함되지 않지만, `authenticateToken`은 `decoded.email`을 읽어 `req.user.email`에 저장합니다. 따라서 `req.user.email`은 항상 `undefined`입니다(코드베이스에서 이 값을 실제로 사용하는 곳은 없습니다).
- 의존성에 포함된 `pg`, `libretranslate`, `@vitalets/google-translate-api`는 `src/` 코드 어디에서도 사용되지 않습니다.
