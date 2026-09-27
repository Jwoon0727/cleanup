# 청소 구역 관리 시스템 — 구현 계획

> **[2026-09-22 갱신]** 이 문서의 로그인 / 관리자 등록 관련 내용은 더 이상 유효하지 않습니다.
> 해당 기능은 [`plan02.md`](./plan02.md) 에 따라 전부 제거되었습니다. 아래는 당시 기록으로만 남깁니다.

- 작성일: 2026-09-21
- 요구사항 원본: [`plan01.md`](./plan01.md)
- 스택: Next.js 16.3.5 (App Router) / React 19.2.8 / Tailwind CSS 4 / TypeScript 5 / Supabase
- **상태: 구현 완료** (2026-09-21) — 단, `supabase/migrations/0002_align_schema.sql` 적용 필요

## 남은 작업 (사용자)

1. Supabase SQL Editor 에서 `supabase/migrations/0002_align_schema.sql` 실행
   - `submission_items.sort_order` 가 없으면 봉사자 제출이 실패합니다.
   - anon/authenticated 권한 회수(보안)도 이 스크립트에 포함되어 있습니다.
2. `/admin` 에서 첫 관리자 계정 등록 → `/` 에서 로그인
3. 대시보드에서 각 구역의 "봉사자 URL 복사" 로 링크 배포

### 결정된 사항
- `/admin` 은 **관리자 0명일 때만 개방**, 이후에는 로그인 필요
- 체크리스트 항목은 기존 `setup-all.sql` 시드(구역당 5개)를 그대로 사용

---

## 0. 이 버전 Next.js에서 반드시 지킬 것

`node_modules/next/dist/docs/` 확인 결과, 학습된 관행과 다른 부분:

| 항목 | 이 버전에서의 규칙 |
|------|-------------------|
| 미들웨어 | **`middleware.ts` 없음 → `proxy.ts`** (프로젝트 루트 또는 `src/`). `export function proxy(req)` 또는 default export |
| `cookies()` | **async** — `const store = await cookies()` |
| `params` / `searchParams` | **Promise** — `const { slug } = await params` |
| 페이지 타입 | 전역 헬퍼 `PageProps<'/zones/[token]'>`, `LayoutProps<'/'>` 사용 (현재 `layout.tsx`가 이미 사용 중) |
| 캐싱 | `cacheComponents`는 **옵트인**(현재 `next.config.ts` 비어 있음 → 기존 캐싱 모델). 이번 구현에서는 **켜지 않음** |
| 재검증 | Server Action 내부에서 `revalidatePath()` |
| 번들러 | `next dev --webpack` / `next build --webpack` (package.json에 고정됨) |

> 구현 착수 시 해당 파일을 다시 열어 확인할 것. 이 표는 요약이며 근거 문서가 우선.

---

## 1. 요구사항 정리

### 역할
- **관리자**: `/`에서 로그인 → `/dashboard`에서 A~H 구역 상태 확인, 체크리스트 검토, 검사완료/재청소 결정 + 메모 작성
- **봉사자**: **로그인 없이** 전달받은 구역 URL로 접속 → 체크리스트 작성 및 제출

### 화면
| 경로 | 접근 | 내용 |
|------|------|------|
| `/` | 공개 | 로그인 (이름 + 패스워드). 회원가입 없음 |
| `/admin` | 공개(조건부, §6 참고) | 관리자 이름·패스워드 등록 → 그 자격증명으로 `/` 로그인 가능 |
| `/dashboard` | 인증 필요 | A~H 구역 카드 + 상태 배지 + 구역 URL 복사 |
| `/dashboard/zones/[code]` | 인증 필요 | 제출된 체크리스트 열람, 검사완료/재청소 버튼, 메모 입력 |
| `/c/[token]` | 공개(토큰이 곧 인증) | 봉사자용 체크리스트 작성/제출, 재청소 요청 배너 |

### 구역 상태 머신

```
                  ┌──────────────────────── 재청소 요청 (메모) ────────┐
                  ▼                                                     │
[PENDING] ──제출──> [SUBMITTED]  ──관리자 검사──> [APPROVED]  (검사완료) │
 미청소             청소완료 배지          │                             │
                                          └──> [REWORK]  ───────────────┘
                                               재청소 요청
                                                  │
                                                  │ 봉사자 재제출
                                                  ▼
                                            [RESUBMITTED]
                                            청소완료 재요청 배지
                                                  │
                                       관리자 검사 (APPROVED / REWORK 반복)
```

- `SUBMITTED` / `RESUBMITTED` → 대시보드에 배지 표시
- `REWORK` → 봉사자 URL 상단에 **노란색 배너 + 관리자 메모** 표시
- 재제출 시 회중·이름 재입력 필수

### 제출 게이트 (봉사자)
- 모든 체크리스트 항목 체크 **AND** 회중 입력 **AND** 이름 입력 → 그 전까지 제출 버튼 비활성
- 클라이언트 검증은 UX용일 뿐, **서버(Server Action)에서 동일 규칙 재검증**이 진실의 원천

---

## 2. 데이터 모델 (Supabase / PostgreSQL)

```sql
-- 관리자
admins (
  id            uuid pk default gen_random_uuid(),
  name          text unique not null,
  password_hash text not null,           -- bcrypt
  created_at    timestamptz default now()
)

-- 구역 A~H
zones (
  id          uuid pk,
  code        text unique not null,      -- 'A' ~ 'H'
  label       text not null,             -- 표시명
  token       text unique not null,      -- 봉사자 URL 비밀값 (§3)
  status      text not null default 'PENDING',
                                         -- PENDING|SUBMITTED|APPROVED|REWORK|RESUBMITTED
  created_at  timestamptz default now()
)

-- 구역별 체크리스트 항목(템플릿)
checklist_items (
  id         uuid pk,
  zone_id    uuid fk -> zones(id) on delete cascade,
  label      text not null,
  sort_order int  not null,
  is_active  boolean default true
)

-- 봉사자 제출 (라운드마다 1행 = 이력 보존)
submissions (
  id             uuid pk,
  zone_id        uuid fk -> zones(id) on delete cascade,
  round          int  not null,          -- 1차, 재청소 후 2차...
  congregation   text not null,          -- 회중
  volunteer_name text not null,          -- 이름
  submitted_at   timestamptz default now()
)

-- 제출 시점의 항목별 체크 상태 스냅샷
submission_items (
  id                 uuid pk,
  submission_id      uuid fk -> submissions(id) on delete cascade,
  checklist_item_id  uuid fk -> checklist_items(id),
  label_snapshot     text not null,      -- 템플릿이 바뀌어도 이력 유지
  checked            boolean not null
)

-- 관리자 검사 결과
inspections (
  id            uuid pk,
  submission_id uuid fk -> submissions(id) on delete cascade,
  admin_id      uuid fk -> admins(id),
  result        text not null,           -- 'APPROVED' | 'REWORK'
  memo          text,                    -- 재청소 사유 등
  created_at    timestamptz default now()
)
```

**설계 근거**
- `submissions`를 라운드별로 남겨 재청소 이력이 덮어써지지 않음
- `label_snapshot`으로 체크리스트 수정 후에도 과거 제출 내용이 정확히 재현됨
- `zones.status`는 파생 가능하지만, 대시보드 조회 단순화를 위해 비정규화 저장 (모든 전이는 Server Action 한 곳에서만 수행)
- 봉사자에게 보여줄 메모 = 해당 구역의 가장 최근 `inspections.result = 'REWORK'` 행

### RLS 정책
- **모든 테이블 RLS 활성화 + anon/authenticated 전부 deny**
- DB 접근은 전부 서버 측(Server Action / Route Handler)에서 **service role key**로만 수행
- 근거: 봉사자는 로그인이 없어 브라우저에서 Supabase를 직접 호출하면 anon 키로 타 구역 데이터까지 노출됨. 클라이언트에 Supabase 클라이언트를 두지 않는다.
- `SUPABASE_SERVICE_ROLE_KEY`는 서버 전용 — `NEXT_PUBLIC_` 접두사 금지, 사용하는 모듈 최상단에 `import 'server-only'`

---

## 3. 구역 URL 설계 ("복잡한 URL")

- 형식: `/c/[token]`
- `token` = `crypto.randomBytes(24).toString('base64url')` (약 32자, 192비트) — 추측 불가
- 예: `/c/8xK2mQ7vR4nT9wL1pY6bZ3cF5dH0jS`
- 토큰이 곧 접근 권한이므로:
  - `<meta name="robots" content="noindex,nofollow">` + `robots.txt`에서 `/c/` 차단
  - 서버 응답 헤더 `Referrer-Policy: no-referrer` (외부 링크로 토큰 유출 방지)
  - 유출 대비 **토큰 재발급(rotate) 기능**을 대시보드에 제공
- `A`~`H`라는 예측 가능한 값은 관리자 전용 경로(`/dashboard/zones/[code]`)에만 사용

---

## 4. 인증 / 세션

- 비밀번호: **bcrypt** 해시 저장 (`bcryptjs`)
- 세션: **`jose`로 서명한 JWT를 httpOnly 쿠키**에 저장
  - `httpOnly: true, secure: true(prod), sameSite: 'lax', path: '/', maxAge: 7d`
  - 서명 키 `SESSION_SECRET` (env)
- `src/lib/session.ts` — `import 'server-only'` + `createSession` / `verifySession` / `deleteSession`
- `src/lib/dal.ts` — 데이터 접근 계층. 모든 관리자용 조회 함수 진입부에서 세션 검증 (`React.cache`로 요청 단위 메모이즈)
- `proxy.ts` — `/dashboard/*` 낙관적 리다이렉트용 **보조** 장치일 뿐, **권한의 최종 판정은 DAL/Server Action에서**
  ```
  matcher: ['/dashboard/:path*']
  ```

> 문서 명시: Proxy는 전체 세션 관리/인가 솔루션으로 쓰지 말 것. 최적화용 optimistic check만.

---

## 5. 파일 구조 (신규/수정)

```
proxy.ts                                  [신규] /dashboard 낙관적 가드
next.config.ts                            [수정] 보안 헤더(Referrer-Policy 등)
.env.local.example                        [신규] 필요한 env 목록
src/
├── app/
│   ├── page.tsx                          [교체] 로그인 화면 (현재 CNA 기본 페이지)
│   ├── layout.tsx                         [수정] metadata(title) 정도
│   ├── admin/page.tsx                    [신규] 관리자 등록
│   ├── dashboard/
│   │   ├── layout.tsx                    [신규] 세션 검증 + 헤더/로그아웃
│   │   ├── page.tsx                      [신규] A~H 구역 카드 + 배지
│   │   └── zones/[code]/page.tsx         [신규] 체크리스트 검토 + 검사완료/재청소
│   ├── c/[token]/
│   │   ├── page.tsx                      [신규] 봉사자 체크리스트
│   │   └── not-found.tsx                 [신규] 잘못된 토큰
│   └── globals.css                       [수정] 필요 시 상태 색 토큰
├── actions/
│   ├── auth.ts                           [신규] login / logout / registerAdmin
│   ├── submissions.ts                    [신규] submitChecklist (봉사자)
│   └── inspections.ts                    [신규] approveZone / requestRework
├── components/
│   ├── login-form.tsx                    [신규] 'use client' + useActionState
│   ├── zone-card.tsx                     [신규] 상태 배지 + URL 복사
│   ├── status-badge.tsx                  [신규] 5개 상태 표현
│   ├── checklist-form.tsx                [신규] 'use client' 전체체크 게이트
│   └── rework-banner.tsx                 [신규] 노란 배너 + 메모
├── lib/
│   ├── supabase.ts                       [신규] service-role 서버 클라이언트
│   ├── session.ts                        [신규] JWT 쿠키 세션
│   ├── dal.ts                            [신규] 인증 포함 데이터 접근
│   ├── zone-status.ts                    [신규] 상태 전이 규칙 단일 소스
│   └── validation.ts                     [신규] zod 스키마
└── types/db.ts                           [신규] 테이블 타입
supabase/migrations/0001_init.sql         [신규] 스키마 + RLS
supabase/seed.sql                         [신규] A~H 구역 + 기본 체크리스트
```

### 추가 의존성
```
@supabase/supabase-js   DB 클라이언트
bcryptjs                비밀번호 해시 (+ @types/bcryptjs)
jose                    JWT 서명/검증 (Edge 호환)
zod                     입력 검증
```

---

## 6. 결정이 필요한 사항 (구현 전 확인)

1. **`/admin` 보호 방식** — 요구사항대로면 누구나 `/admin`에서 관리자 계정을 만들 수 있어 사실상 무방비입니다.
   제안(기본값으로 삼을 안): **최초 1회만 개방**. 관리자가 0명일 때만 등록 가능하고, 이후 `/admin`은 로그인한 관리자만 접근해 추가 계정 생성/비밀번호 변경. 그대로(항상 개방) 가시려면 말씀해 주세요.
2. **체크리스트 항목 내용** — A~H 각 구역의 실제 점검 항목 문구가 필요합니다. 주시기 전까지는 구역당 플레이스홀더 5개로 시드하고, 대시보드에서 편집 가능하게 둡니다.
3. **관리자 수** — 여러 명인지 1명인지. 스키마는 다중을 전제로 설계했습니다.
4. **배포 대상** — Vercel 가정. 다르면 env/헤더 설정이 달라집니다.

> 1~4번 답이 없어도 위 기본값으로 진행 가능합니다. 막히는 항목은 없습니다.

---

## 7. 구현 단계

각 단계는 독립적으로 검증 가능하도록 끊었습니다.

| # | 단계 | 산출물 | 완료 기준 |
|---|------|--------|-----------|
| 1 | 기반 세팅 | 의존성 설치, `.env.local.example`, `src/lib/supabase.ts`, `types/db.ts` | `npm run build` 통과 |
| 2 | DB 스키마 | `0001_init.sql`, `seed.sql`, RLS deny-all | Supabase에 적용, A~H 8행 + 토큰 생성 확인 |
| 3 | 세션/인증 | `session.ts`, `dal.ts`, `actions/auth.ts`, `proxy.ts` | 비로그인 `/dashboard` → `/` 리다이렉트 |
| 4 | `/admin` 등록 | `admin/page.tsx` + registerAdmin | 등록한 계정으로 `/` 로그인 성공 |
| 5 | `/` 로그인 | `page.tsx` 교체, `login-form.tsx` | 성공 시 `/dashboard`, 실패 시 에러 메시지 |
| 6 | 대시보드 | `dashboard/page.tsx`, `zone-card`, `status-badge` | A~H 카드 + 상태 배지 + URL 복사 동작 |
| 7 | 봉사자 화면 | `c/[token]/page.tsx`, `checklist-form` | 전체 체크+회중+이름 전까지 제출 불가 |
| 8 | 제출 처리 | `actions/submissions.ts` | 제출 → 대시보드에 "청소완료" 배지 (revalidatePath) |
| 9 | 검사 화면 | `dashboard/zones/[code]/page.tsx` | 제출된 체크리스트 + 작성자(회중/이름) 열람 |
| 10 | 검사완료/재청소 | `actions/inspections.ts`, `rework-banner` | 재청소 → 봉사자 URL 상단 노란 배너 + 메모 |
| 11 | 재제출 | 상태 전이 `REWORK → RESUBMITTED` | 대시보드에 "청소완료 재요청" 배지 |
| 12 | 마감 | 보안 헤더, noindex, 토큰 재발급, 에러/로딩 UI, 반응형 점검 | `npm run lint` + `npm run build` 통과, 전체 시나리오 수동 확인 |

의존관계: 1 → 2 → 3 → (4,5) → 6 → 7 → 8 → 9 → 10 → 11 → 12

---

## 8. 검증 시나리오 (단계 12에서 수동 확인)

1. 최초 상태에서 `/admin` 접속 → 이름/패스워드 등록 → 재접속 시 차단되는지
2. `/`에서 그 계정으로 로그인 → `/dashboard` 진입
3. 비로그인 시크릿 창에서 `/dashboard` → `/`로 리다이렉트
4. A구역 URL 복사 → 시크릿 창에서 접속 → 로그인 없이 체크리스트 표시
5. 일부만 체크 → 제출 버튼 비활성 / 회중·이름 비워도 비활성
6. 전부 체크 + 회중/이름 입력 → 제출 성공
7. 대시보드 A구역 **청소완료** 배지 확인
8. 관리자가 A구역 상세 진입 → 체크 내역·회중·이름 열람
9. 메모 작성 후 **재청소** → 봉사자 URL 상단 노란 배너 + 메모 문구 확인
10. 봉사자 재제출 → 대시보드 **청소완료 재요청** 배지 확인
11. 관리자 **검사완료** → 상태 확정, 이력(1차/2차 제출) 모두 조회 가능
12. 타인의 토큰을 임의로 바꿔 접속 → 404

---

## 9. 리스크

| 리스크 | 대응 |
|--------|------|
| 구역 URL 유출 = 누구나 제출 가능 | 토큰 192비트 + noindex + `Referrer-Policy: no-referrer` + 재발급 기능 |
| service role key 클라이언트 노출 | `import 'server-only'`, `NEXT_PUBLIC_` 금지, 클라이언트에 Supabase 클라이언트 미배치 |
| `/admin` 무방비 개방 | §6-1 최초 1회 개방 + 이후 인증 필요 |
| 동시 제출/중복 제출 | 상태 전이를 Server Action 한 곳으로 집중, 제출 시 현재 status 조건부 UPDATE |
| Next 16 관행 차이 (proxy/async params) | §0 표 준수, 구현 시 번들 문서 재확인 |
| 봉사자 실수 제출 | 제출 후 라운드 이력 보존 → 관리자가 재청소로 되돌릴 수 있음 |

---

## 9-1. 실시간 갱신 (새로고침 불필요)

`revalidatePath()` 는 서버 캐시만 무효화할 뿐 다른 사람의 브라우저에는 아무것도
전달하지 않는다. 그래서 화면 쪽에서 변화를 감지하는 장치를 둔다.

```
[봉사자 제출] ──> DB 상태 변경
                        │
     관리자 브라우저 ───┴──> GET /api/pulse (3초마다, 지문만 비교)
                              값이 바뀐 순간에만 router.refresh()
                              → 서버 컴포넌트 재렌더 → 배지 갱신
```

- `src/lib/pulse.ts` — 구역 상태 / 최신 제출 / 최신 검사로 짧은 지문(sha1 16자)을 만든다
- `src/app/api/pulse/route.ts` — 관리자용(세션 필요, 미인증 401)
- `src/app/api/pulse/[token]/route.ts` — 봉사자용(해당 구역 1곳만, 토큰이 곧 권한)
- `src/components/live-refresh.tsx` — 폴링 + 변경 시에만 `router.refresh()`

설계상 지키는 것:
- **지문이 그대로면 화면을 건드리지 않는다.** 작성 중인 체크박스·입력값이 날아가지 않는다.
- 탭이 백그라운드면 폴링을 멈추고, 다시 보이거나 네트워크가 복구되면 즉시 확인한다.
- 요청이 겹치지 않도록 in-flight 가드를 둔다.
- 폴링 실패는 무시하고 다음 주기에 재시도한다(일시적 DB 오류로 화면이 죽지 않게).

주기: 관리자 3초 / 봉사자 5초.

> 진짜 push 방식(Supabase Realtime)은 브라우저에 anon 키를 노출하고 `zones` 에
> SELECT 정책을 열어야 하는데, 그러면 봉사자 URL 토큰까지 읽히게 된다.
> 토큰을 별도 테이블로 분리하기 전까지는 폴링이 맞는 선택이다.

---

## 10. 범위 밖 (이번에 하지 않음)

- 봉사자 계정/로그인
- 이메일·문자 알림
- 사진 업로드
- 통계·리포트 화면
- 다국어
