# plan07 — 청소 상태 리셋 (전역 + 구역별)

## 목표

관리자가 다음 청소 주기를 시작할 수 있도록 제출 상태를 되돌린다. 대시보드에 **전역 리셋**, 구역 상세에 **이 구역만 리셋**.

## 핵심 제약

`0003` 에서 `submissions` 에 `unique (zone_id)` 가 걸렸으므로, **상태만 `PENDING` 으로 바꾸면 다음 제출이 unique 위반으로 실패한다.** 리셋은 반드시 제출 행 삭제 + 상태 되돌리기를 함께 해야 한다.

- `submission_items` 는 `on delete cascade` 로 함께 삭제된다.
- DB 에 남아 있는 `inspections` 행도 `on delete cascade` 로 함께 삭제된다(이미 제거된 기능이라 무해).
- **`assignee_name` / `assignee_congregation` 은 지우지 않는다.** 지정 제출자는 주기가 바뀌어도 유지된다.

## 1. `src/actions/reset.ts` (신규)

```ts
export async function resetAllZonesAction(prev: FormState, formData: FormData): Promise<FormState>
export async function resetZoneAction(prev: FormState, formData: FormData): Promise<FormState>  // formData: code
```

구현 주의:

- **필터 없는 delete 를 쓰지 말 것.** Supabase/PostgREST 는 `.delete()` 에 필터가 없으면 거부한다. 먼저 대상 구역을 조회해 `id`/`code`/`token` 을 확보하고 `.delete().in("zone_id", ids)` 로 삭제한다.
- 순서: **제출 삭제 → 상태 `PENDING` 으로 update**. update 가 실패하면 "리셋이 완료되지 않았습니다. 다시 시도해 주세요." 를 반환한다(재실행하면 정상 복구됨).
- `revalidatePath("/dashboard")` + 대상 구역마다 `/dashboard/zones/{code}`, `/c/{token}`.
- 성공 메시지: 전역 `"N개 구역을 미청소로 되돌렸습니다."` / 구역별 `"{label} 을 미청소로 되돌렸습니다."`
- 전역 리셋 시 구역이 0개면 `{ ok: false, message: "등록된 구역이 없습니다." }`.

## 2. `src/components/reset-form.tsx` (신규)

`"use client"`. `rotate-token-form.tsx` 의 관용구(`useActionState` + `SubmitButton` + `FormMessage`)를 그대로 따른다.

```ts
type Props = { scope: "all" } | { scope: "zone"; code: string };
```

**2단계 인라인 확인**(타이핑 확인은 주 단위 반복 작업에 과한 마찰이라 채택하지 않음):

1. 1단계: `variant="ghost"` 버튼 — 전역 `전체 리셋` / 구역별 `이 구역 리셋`
2. 누르면 같은 자리에서 경고 문구 + `variant="danger"` 확인 버튼 + `취소` 버튼으로 바뀐다
   - 전역: "모든 구역의 제출 기록을 지우고 미청소로 되돌립니다. 되돌릴 수 없습니다."
   - 구역별: "이 구역의 제출 기록을 지우고 미청소로 되돌립니다. 되돌릴 수 없습니다."
   - 두 경우 모두 "지정 제출자는 유지됩니다." 를 덧붙인다
3. 확인 버튼이 실제 `<form action={...}>` 의 submit. 취소는 1단계로 복귀
4. `window.confirm` 은 쓰지 않는다

## 3. 수정

- `src/app/dashboard/page.tsx` — 헤더 우측 빈 슬롯(`justify-between` 의 두 번째 자리)에 `<ResetForm scope="all" />`
- `src/app/dashboard/zones/[code]/page.tsx` — `CopyLinkButton` / `RotateTokenForm` 과 같은 줄에 `<ResetForm scope="zone" code={zone.code} />`

## 4. 범위 밖

- SQL 변경 없음(`0003` 으로 충분).
- `zone-checklist.tsx` / `zone-a-checklist.tsx` / `zone-b-checklist.tsx` 는 손대지 않는다.
- 리셋 이력 기록(누가 언제 리셋했는지)은 만들지 않는다.

## 5. 검증

- `npm run lint`, `npm run build` 통과
- 확인 단계를 거치지 않고 1클릭으로 삭제되는 경로가 없는지 직접 코드로 확인
