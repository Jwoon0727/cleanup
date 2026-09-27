# plan06 — 제출 1회 확정 + 구역별 지정 제출자

## 목표

1. **제출 이력 / 재검사 제거**: 봉사자가 제출 버튼을 누르면 그것으로 끝. 관리자 검사(검사완료·재청소 요청), 재제출, N차 제출 이력을 모두 없앤다.
2. **구역별 지정 제출자**: 대시보드에서 구역마다 제출자 이름·회중을 지정한다. 봉사자 URL에서 지정된 이름·회중과 다르게 입력하면 `제출 권한이 없습니다.` 를 띄우고 제출을 막는다.

## 결정 사항 (사용자 확인 완료)

- 관리자 검사 기능은 **전부 제거**. 구역 상태는 `PENDING`(미청소) / `SUBMITTED`(청소완료) 2개.
- 봉사자 화면에 지정된 이름·회중은 **표시하지 않는다**. "이 구역은 지정된 봉사자만 제출할 수 있습니다." 안내만 노출. (이름을 보여주면 URL을 가진 누구나 그대로 따라 입력할 수 있어 권한 검사가 무의미해짐)
- 지정 제출자는 구역당 **1명**. 이름·회중 둘 다 비어 있으면 **미지정 = 누구나 제출 가능**(기존 동작 유지).
- 이름 비교는 공백 제거 + 대소문자 무시 후 정확히 일치. (`최 정운` == `최정운`)

## 1. DB — `supabase/migrations/0003_single_submission_and_assignee.sql` (신규)

```sql
-- 1) 구역별 지정 제출자. 둘 다 null 이면 미지정(누구나 제출 가능).
alter table public.zones
  add column if not exists assignee_name text,
  add column if not exists assignee_congregation text;

-- 2) 상태 단순화: PENDING / SUBMITTED
update public.zones set status = 'SUBMITTED' where status in ('APPROVED', 'RESUBMITTED');
update public.zones set status = 'PENDING'   where status = 'REWORK';
alter table public.zones drop constraint if exists zones_status_check;
alter table public.zones add  constraint zones_status_check
  check (status in ('PENDING', 'SUBMITTED'));

-- 3) 구역당 제출 1건. round 는 항상 1.
alter table public.submissions alter column round set default 1;

-- [주의] 아래 2줄은 기존 재제출(2차 이상) 이력을 삭제합니다.
delete from public.submissions where round > 1;
create unique index if not exists submissions_zone_id_key on public.submissions (zone_id);

-- 4) inspections 는 코드에서 더 이상 사용하지 않는다(테이블은 남겨 과거 기록 보존).
--    완전히 지우려면 아래 주석을 해제해 실행:
-- drop table if exists public.inspections;
```

`supabase/setup-all.sql` 도 신규 설치 기준에 맞춘다: `zones` 에 assignee 2개 컬럼 추가, `zones_status_check` 를 2개 값으로, `submissions.round` 기본값 1 + `unique (zone_id)`. `inspections` / `admins` 테이블 정의는 0002 마이그레이션이 참조하므로 그대로 둔다.

## 2. 삭제할 파일

- `src/actions/inspections.ts`
- `src/components/inspection-form.tsx`
- `src/components/submission-history.tsx`
- `src/components/rework-banner.tsx`

## 3. 수정할 파일

### `src/types/db.ts`
- `ZONE_STATUSES` → `["PENDING", "SUBMITTED"]`
- `InspectionResult`, `Inspection` 타입 삭제
- `Zone` 에 `assignee_name: string | null`, `assignee_congregation: string | null` 추가
- `Submission` 에서 `round` 제거
- `SubmissionDetail` = `Submission & { items: SubmissionItem[] }` (inspection 필드 제거)

### `src/lib/zone-status.ts`
- `ZONE_STATUS_META` 는 2개 상태만. `needsInspection` 플래그 제거
- `canVolunteerSubmit(status)` → `status === "PENDING"`
- `statusAfterSubmit`, `canInspect` 삭제

### `src/lib/assignee.ts` (신규)
```ts
/** 공백 제거 + 대소문자 무시 비교용 정규화 */
function normalize(value: string): string
/** 구역에 지정 제출자가 있는지 */
export function hasAssignee(zone: Zone): boolean
/** 입력한 회중·이름이 지정 제출자와 일치하는지. 미지정이면 항상 true */
export function isAssignedSubmitter(zone: Zone, input: { congregation: string; volunteerName: string }): boolean
```

### `src/lib/validation.ts`
- `inspectionSchema` 삭제
- `zoneAssigneeSchema` 추가: `assigneeCongregation`/`assigneeName` 각각 trim + max(100/50), 빈 문자열 허용. `refine` 으로 "둘 다 비었거나 둘 다 채워짐" 강제 (한쪽만 채우면 에러)

### `src/lib/dal.ts`
- `listSubmissions` → `getSubmission(zoneId): Promise<SubmissionDetail | null>` 로 교체 (submissions 1건 + submission_items 만 조회, inspections 조회 삭제)
- `getLatestSubmission`, `getActiveReworkMemo` 삭제

### `src/actions/submissions.ts`
- `statusAfterSubmit` → `"SUBMITTED"` 고정
- round 계산(count 쿼리) 삭제 → insert 시 `round` 생략(DB 기본값 1)
- **zod 파싱 직후, 상태 선점(update) 전에** 권한 검사 삽입:
  ```ts
  if (!isAssignedSubmitter(zone, parsed.data)) {
    return { ok: false, message: "제출 권한이 없습니다." };
  }
  ```
- 이미 제출된 구역 메시지: "이미 제출이 완료된 구역입니다." (관리자 확인 문구 제거)

### `src/actions/zone-assignee.ts` (신규)
`setZoneAssigneeAction(prev, formData)` — `code` + `assigneeCongregation` + `assigneeName` 을 받아 `zoneAssigneeSchema` 검증 후 `zones` 업데이트. 둘 다 빈 값이면 `null` 로 저장(지정 해제). `revalidatePath("/dashboard")`, `/dashboard/zones/{code}`, `/c/{token}`.

### `src/components/zone-assignee-form.tsx` (신규)
`"use client"` + `useActionState`. 현재 지정값을 기본값으로 채운 회중/이름 input 2개 + 저장 버튼, 그리고 지정 해제 버튼(빈 값 제출). 기존 `FormMessage` / `SubmitButton` / `inputClass` 스타일 패턴을 따른다.

### `src/components/submission-summary.tsx` (신규)
제출 1건을 보여주는 카드: 제출자 이름·회중·제출 시각 + 체크 항목 목록. 제출이 없으면 "아직 제출된 체크리스트가 없습니다." (기존 `submission-history.tsx` 의 카드 1개 분량을 그대로 재사용, `N차 제출`·관리자 메모·검사 배지는 제외)

### `src/app/dashboard/zones/[code]/page.tsx`
- `InspectionForm`, `SubmissionHistory`, `canInspect`, `listSubmissions` import 제거
- `ZoneAssigneeForm` 섹션 추가 (제목: "지정 제출자")
- 검사 상태 안내 문단 삭제 → 상태는 상단 `StatusBadge` 로 충분
- "제출 이력" 섹션 → "제출 내역" + `SubmissionSummary`
- `ZoneAChecklist` / `ChecklistPreview` 분기는 그대로 유지

### `src/app/dashboard/page.tsx`
- `getLatestSubmission` → `getSubmission`
- 상단 요약 문구: `needsInspection` 집계 → **미제출 구역 수** ("아직 제출하지 않은 구역이 N곳 있습니다." / "모든 구역이 제출 완료되었습니다.")

### `src/components/zone-card.tsx`
- `needsInspection` 강조 → `PENDING` 일 때 강조(아직 안 된 곳이 눈에 띄게)
- 지정 제출자가 있으면 카드에 `지정 최정운 · 백석` 한 줄 표시 (관리자용 화면이므로 노출 OK)
- 버튼 문구 `검사하기` → `상세 보기` 고정

### `src/app/c/[token]/page.tsx`
- `ReworkBanner`, `getActiveReworkMemo` 제거, `getLatestSubmission` → `getSubmission`
- `ChecklistForm` 에 `hasAssignee={hasAssignee(zone)}` 전달
- 제출 완료 패널: `APPROVED` 분기 삭제, "제출 완료 / 체크리스트가 제출되었습니다. 수고하셨습니다!" + 회중·이름·시각

### `src/components/checklist-form.tsx`
- `hasAssignee: boolean` prop 추가 → "작성자" 섹션 상단에 안내 문구 표시:
  "이 구역은 지정된 봉사자만 제출할 수 있습니다. 지정된 회중·이름과 다르면 제출되지 않습니다."
- 권한 오류는 기존 `FormMessage` 로 그대로 표시됨 (추가 작업 없음)

## 4. 작업 순서

1. `node_modules/next/dist/docs/` 에서 server actions / `revalidatePath` / `PageProps` 관련 가이드 확인 (Next 16.3.5 는 학습 데이터와 다름)
2. 마이그레이션 SQL + `setup-all.sql`
3. 타입 → lib (`zone-status`, `assignee`, `validation`, `dal`)
4. actions (`submissions` 수정, `zone-assignee` 신규, `inspections` 삭제)
5. 컴포넌트 (신규 2개, 수정 2개, 삭제 4개)
6. 페이지 3개
7. `npm run lint` → `npm run build` 통과 확인

## 5. 검증

- `npm run lint`, `npm run build` 무경고 통과
- `grep -rn "inspection\|REWORK\|RESUBMITTED\|APPROVED\|round\|SubmissionHistory\|ReworkBanner" src/` 결과 0건 (잔재 없음)
- DB 적용은 사용자가 Supabase SQL Editor 에서 직접 실행 (에이전트는 실행하지 않음)

## 6. 범위 밖

- 루트의 `plan01~05.md` 문서는 옛 흐름(검사/재청소)을 설명하지만 수정하지 않는다.
- `admins` 테이블 / 관리자 인증은 이번 작업과 무관.
