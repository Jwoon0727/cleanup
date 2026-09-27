# plan03 — 구역별 이미지 박스 추가

- 작성일: 2026-09-22
- 요구사항: "A~H 구역마다 다른 이미지를 체크리스트 위에 표시. 관리자가 업로드하는 게 아니라 박스만 만들어줘."
- 확정 사항 (사용자 선택):
  - 적용 페이지: **관리자 구역 상세 + 봉사자 체크리스트 둘 다**
  - 이미지 출처: **`public/zones/` 정적 파일** (DB 변경 없음, 업로드 UI 없음)

## 1. 신규 파일

### `src/components/zone-image.tsx` (서버 컴포넌트)

```
export function ZoneImage({ code, label }: { code: string; label: string })
```

동작:
- `public/zones/` 에서 `{CODE}.png` → `.jpg` → `.jpeg` → `.webp` 순으로 **존재하는 첫 파일**을 찾는다.
  - 파일명은 구역 코드 대문자 기준 (`A.png`, `B.png` … `H.png`)
  - 존재 확인은 `node:fs` 의 `existsSync` + `node:path` 로 서버에서 수행
    (`process.cwd()` 기준 `public/zones/...`). 서버 컴포넌트이므로 클라이언트 JS 불필요.
- 파일이 있으면: `next/image` 를 `fill` 모드로 렌더 (부모에 `relative` 필요)
  - `alt` 는 `` `${label} 구역 사진` ``
  - `sizes` 지정 (레이아웃상 최대 폭 기준, 예: `(max-width: 640px) 100vw, 640px`)
- 파일이 없으면: 같은 크기의 **회색 플레이스홀더 박스**
  - 문구: `{label} 이미지 없음` + 작은 안내 `public/zones/{CODE}.png`
  - 레이아웃이 흔들리지 않도록 이미지가 있을 때와 **동일한 박스 크기** 유지

스타일 (기존 카드와 통일할 것):
- 컨테이너: `relative aspect-video w-full overflow-hidden rounded-2xl ring-1 ring-brand-100`
- 이미지: `object-cover`
- 플레이스홀더 배경: `bg-zinc-100`, 문구는 `text-sm text-zinc-500`

### `public/zones/.gitkeep`
디렉터리를 만들고 빈 상태로 둔다. 사용자가 여기에 `A.png` ~ `H.png` 를 넣는다.

## 2. 수정 파일 (2개)

### `src/app/dashboard/zones/[code]/page.tsx`
헤더 블록(제목 / 상태배지 / 링크복사·토큰재발급) **바로 다음**,
`InspectionForm` (또는 상태 안내 문구) **앞**에 삽입:

```tsx
<ZoneImage code={zone.code} label={zone.label} />
```

### `src/app/c/[token]/page.tsx`
`<header>` 와 `ReworkBanner` **다음**, `ChecklistForm` **앞**에 삽입.

> 순서 주의: 재청소 요청 배너(`ReworkBanner`)는 경고이므로 **이미지보다 위**에 그대로 둔다.
> 최종 순서 = 헤더 → 재청소 배너 → 이미지 → 체크리스트

## 3. 건드리지 말 것

- DB 스키마 / `zones` 테이블 / 마이그레이션 — 이번 작업에 DB 변경은 **없다**
- `next.config.ts` — 로컬 `public/` 이미지만 쓰므로 `images.remotePatterns` 설정 불필요
- 체크리스트 제출 로직, 검사 로직, 상태 머신

## 4. 사전 확인

AGENTS.md 지시대로, 구현 전 `node_modules/next/dist/docs/` 에서 **`next/image`** 관련 가이드를 읽을 것.
이 버전(Next 16.3.5)의 `Image` props(`fill`, `sizes`, `priority`)가 학습 데이터와 다를 수 있다.

## 5. 검증

1. `npm run lint` — 0건
2. `npm run build` — 타입 에러 0건
3. 플레이스홀더 경로: 이미지 파일이 하나도 없는 현재 상태에서 빌드가 깨지지 않아야 한다
4. 실제 이미지 경로 확인: `public/zones/B.png` 에 아무 이미지나 넣고
   `/dashboard/zones/B` 와 해당 구역의 `/c/[token]` 에서 렌더되는지 확인
   (확인 후 테스트 이미지는 삭제)
