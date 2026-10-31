# 지갑몬

20대를 위한 금융 다마고치 PWA. 매일 5분, 3D 다마고치 속 지갑몬을 키우면서 사기 방어 · 신용 · 주거(전세) · 돈 흐름을 익힌다.

- 프론트: Vite + React + TypeScript, Tailwind v4, React Router, TanStack Query, three.js(@react-three/fiber)
- 백엔드: Supabase — 익명 로그인, Postgres + RLS, RPC, Edge Functions(news · market · push), pg_cron
- PWA: vite-plugin-pwa `injectManifest` (직접 작성한 `src/sw.ts`: 프리캐시 + 웹 푸시)
- 디자인: [Figma](https://www.figma.com/design/qaeCbnXAk1AkZESxDA30Dj) — 토큰은 `src/index.css`의 `@theme`, 아이콘은 Figma 아이콘 시트에서 잘라낸 `src/assets/icons/`만 쓴다
- 폰트: 갈무리11 (OFL, `src/assets/fonts/`)
- 이전 프로토타입(구 이름 돈감): `docs/prototype/dongam-prototype.html`

## 시작하기

```bash
npm install
cp .env.example .env.local   # Supabase URL / publishable key / VAPID 공개키
npm run dev
```

## 게임 구조

- **펫 스탯 = 약점 지표**: 방어·신용·주거·흐름. 각 스탯은 하위 스킬(19개) 숙련도 평균이고 복습일이 지나면 감쇠한다. 50 미만이면 LCD 에 증상(벌레·사슬·비샘·지갑 구멍), 15 미만이면 '아픔' → 집중 치료로 회복.
- **하루 8문제**: 시장 예보 3 + 약점 문제 5 (첫 문제는 최약 스탯, 나머지는 약할수록 높은 가중치).
- **예보**: 오늘 고르면 *다음 거래일* 결과로 채점, 매일 18시 발표. 코스피·환율은 한국은행 ECOS 종가, 비트코인은 업비트(다음날 18시 vs 당일 자정). 고르는 시점에 결과를 알 수 없게 하려는 규칙이다.
- **성장**: 알 → (진단 5문제) 부화 → 활동 3일 새끼 → 10일 성체. 성체 칭호는 가장 높은 스탯(철벽형·신용왕·집지킴이·저축왕, 전부 80↑ 레전드).
- **랭킹**: 주간 포인트, 같은 티어끼리. 실제 플레이어가 10명 미만이면 '봇' 표시가 붙은 봇으로 채운다. 친구 리그 코드.
- **보안**: 채점·숙련도·포인트는 전부 security definer RPC 에서 처리. 클라이언트는 정답 컬럼을 읽을 수 없고 포인트 원장에 쓸 수 없다.

## 서버

| 위치 | 내용 |
| --- | --- |
| `supabase/migrations/` | 스키마·RPC(000), 문제 콘텐츠(100), 뉴스·채점·랭킹·진화·푸시(200), 예약 작업(300) |
| `supabase/functions/news` | Google 뉴스 RSS → `news` 테이블 (15분마다) |
| `supabase/functions/market` | ECOS·업비트 시세 → `market_moves` → `resolve_forecasts` (18:05, 21:00, 09:00 KST) |
| `supabase/functions/push` | 웹 푸시: 결과 알림(채점 10분 뒤), 돌봄 알림(12:00, 20:00 KST) |

예약 작업은 pg_cron → `private.call_edge()` → Edge Function. 함수는 `x-cron-secret` 헤더로만 호출된다.

### 시크릿

`supabase/functions/.env` (git 제외)에 두고 `npx supabase secrets set --env-file supabase/functions/.env` 로 올린다.

| 키 | 용도 |
| --- | --- |
| `ECOS_API_KEY` | 한국은행 ECOS 인증키 |
| `CRON_SECRET` | 예약 작업 인증. Vault `cron_secret` 과 같은 값 |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | 웹 푸시 키. 공개키는 `.env.local` 의 `VITE_VAPID_PUBLIC_KEY` 에도 |
| `VAPID_SUBJECT` | 푸시 서비스 연락처. 배포 후 `https://<도메인>` 이나 실제 메일로 바꿀 것 |

Vault 에는 `project_url`, `cron_secret` 두 값이 있다 (`npx supabase db query --linked "select vault.create_secret(...)"`).

## 스크립트

| 명령 | 설명 |
| --- | --- |
| `npm run dev` | 개발 서버 |
| `npm run build` | 타입체크 + 프로덕션 빌드 (서비스워커 생성) |
| `npm run preview` | 빌드 결과 미리보기 (PWA 설치·푸시 테스트) |
| `npm run lint` | oxlint |
| `npm run pwa:icons` | `public/favicon.svg`로 PWA 아이콘 생성 |
| `npm run db:push` | 마이그레이션을 원격에 반영 |
| `npm run db:types` | 원격 스키마로 TS 타입 생성 |
| `npm run content:sql` | `content/`의 스킬·문제를 검증하고 upsert 마이그레이션 생성 |

문제 추가·수정: `content/items.mjs` 편집 → `npm run content:sql` → `npm run db:push`.
엣지 함수 배포: `npx supabase functions deploy news market push --use-api`.

## 에셋

- 3D 모델: `design-src/tamagotchi-3d-model.glb`(원본 63MB, git 제외) → `public/models/tamagotchi.glb`(0.85MB)
  ```bash
  npx @gltf-transform/cli optimize design-src/tamagotchi-3d-model.glb public/models/tamagotchi.glb \
    --compress meshopt --texture-compress webp --texture-size 1024 --simplify-ratio 0.06 --simplify-error 0.0005
  ```
  모델의 LCD 는 텍스처에 구워져 있어서, `PetStage.tsx` 가 그 위에 캔버스 판(`LCD_POS`, `LCD_SIZE`)을 덮어 성장 단계·증상을 그린다. 모델을 바꾸면 이 두 값을 다시 맞춰야 한다.
- 성장 단계 그림: `design-src/*.png` → `src/assets/pets/stage-0~3.png`
- 아이콘: Figma 아이콘 시트에서 잘라 `src/assets/icons/` (픽셀이라 `image-rendering: pixelated`)
