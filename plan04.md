# plan04 — 관리자 구역 상세에 체크항목 목록 추가

- 작성일: 2026-09-22
- 요구사항: "/dashboard/zones/[code] 에서 이미지 박스 밑에 '제출 이력'만 나오는데,
  그 구역에 **어떤 체크박스가 있는지**(봉사자 URL 에 뜨는 체크박스 목록 전체)가 보여야 한다."
- 확정 사항 (사용자 선택): **체크항목 목록을 추가하고, 기존 "제출 이력"은 그대로 유지**

## 1. 문제

현재 관리자 구역 상세에는 `SubmissionHistory`(제출 이력)만 있다.
제출이 한 건도 없는 구역(예: G구역, PENDING)에서는
"아직 제출된 체크리스트가 없습니다." 만 뜨고,
**그 구역의 체크항목이 무엇인지 관리자가 확인할 방법이 없다.**

체크항목 데이터는 이미 `checklist_items` 테이블에 있고,
`src/lib/dal.ts` 의 `getChecklistItems(zoneId)` 가 그대로 쓸 수 있다
(활성 항목만, `sort_order` 오름차순). **DB 변경 불필요.**

## 2. 신규 파일

### `src/components/checklist-preview.tsx` (서버 컴포넌트)

```
export function ChecklistPreview({ items }: { items: ChecklistItem[] })
```

- 봉사자 화면에 뜨는 체크항목을 **읽기 전용**으로 나열한다.
- **실제 체크박스(`<input type="checkbox">`)를 쓰지 말 것.** 관리자가 여기서 체크하는
  기능이 아니므로, 클릭 가능한 것처럼 보이면 안 된다.
  `submission-history.tsx` 와 동일한 방식으로 정사각형 `<span aria-hidden>` 글리프를 쓴다.
- 빈 상태: `items.length === 0` 이면
  "이 구역에는 체크리스트 항목이 등록되지 않았습니다." 안내를 렌더한다.

스타일 (기존 컴포넌트와 통일):
- 카드: `rounded-2xl bg-white p-5 ring-1 ring-brand-100`
- 헤더: `flex items-center justify-between` — 좌측 `<h2 className="text-base font-semibold text-zinc-900">체크항목</h2>`,
  우측 개수 `<span className="text-xs font-medium text-zinc-500 tabular-nums">{items.length}개</span>`
- 항목: `submission-history.tsx` 의 `<ul>` / `<li>` 패턴을 따르되 빈 네모로
  (`mt-0.5 flex h-4 w-4 shrink-0 rounded bg-brand-100`), 라벨은 `text-sm text-zinc-700`
- 카드 하단에 작은 안내문 1줄:
  `이 목록이 봉사자 URL 에 그대로 표시됩니다.` (`text-xs text-zinc-500`)

## 3. 수정 파일 (1개)

### `src/app/dashboard/zones/[code]/page.tsx`

- `getChecklistItems` 를 `@/lib/dal` 에서 import
- 기존 `listSubmissions` 호출과 **`Promise.all` 로 병렬 조회**할 것 (순차 await 금지)

```tsx
const [items, submissions] = await Promise.all([
  getChecklistItems(zone.id),
  listSubmissions(zone.id),
]);
```

- 삽입 위치: `InspectionForm`(또는 상태 안내 문구) **다음**, "제출 이력" `<section>` **앞**

```tsx
<ChecklistPreview items={items} />
```

최종 페이지 순서:
헤더 → 이미지 → 검사 폼/상태문구 → **체크항목** → 제출 이력

## 4. 건드리지 말 것

- `SubmissionHistory` / "제출 이력" 섹션 — **그대로 유지** (검사 근거이므로 삭제 금지)
- 봉사자 페이지 `/c/[token]` 및 `ChecklistForm` — 이번 작업 범위 밖
- DB 스키마 / 마이그레이션 — 변경 없음
- `getChecklistItems` 자체 — 이미 있는 것을 그대로 쓴다

## 5. 검증

1. `npm run lint` — 0건
2. `npm run build` — 타입 에러 0건
3. 실제 렌더 확인 (프로덕션 서버 기동 후):
   - 제출이 **없는** 구역(G 등): 체크항목 목록이 전부 보이고, 그 아래 제출 이력은
     "아직 제출된 체크리스트가 없습니다." 로 남아 있는지
   - 제출이 **있는** 구역: 체크항목 목록과 제출 이력이 **둘 다** 보이는지
   - 체크항목 목록이 해당 구역 봉사자 URL(`/c/[token]`)의 항목과 **개수·순서가 일치**하는지
