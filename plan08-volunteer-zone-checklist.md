# plan08 — 봉사자 URL 에 구역 전용 체크리스트 표시

## 문제

봉사자 URL(`/c/[token]`)에는 DB `checklist_items`(바닥 청소 완료 등 시드 5개)로 만든 **예전 체크리스트**가 뜬다. 대시보드 구역 상세에서 보이는 구역 전용 체크리스트(`ZoneAChecklist` / `ZoneBChecklist`)와 다르다.

## 목표

봉사자 URL 에서도 대시보드와 **똑같은 구역 전용 체크리스트**가 보이게 한다.

## 결정 사항 (사용자 확인 완료)

- **A·B 구역**: `ZoneAChecklist` / `ZoneBChecklist` 를 그대로 보여준다. 제출 게이트로는 쓰지 않는다 — 제출은 **회중·이름만** 채우면 활성. (탭이 `수시로 / 침례 후 / 대회 마친 후` 로 상황이 다르고 `도구 수량` 탭까지 있어 "전부 체크" 요구가 성립하지 않음. 체크 상태는 컴포넌트 기존 동작대로 봉사자 브라우저 localStorage 에만 남는다.)
- **C~H 구역**: 지금처럼 DB `checklist_items` + **전부 체크 게이트 유지**. 대시보드 구역 상세와 동일한 분기 구조.

## 1. `src/lib/zone-checklist-registry.ts` (신규)

A/B 판정을 페이지와 서버 액션이 **같은 한 곳**에서 읽게 한다. 이게 갈라지면 C~H 의 "전부 체크" 강제가 우회될 수 있다.

```ts
/** 구역 전용(하드코딩) 체크리스트를 가진 구역. DB checklist_items 를 쓰지 않는다. */
const OWN_CHECKLIST_CODES = new Set(["A", "B"]);

export function hasOwnChecklist(code: string): boolean {
  return OWN_CHECKLIST_CODES.has(code.toUpperCase());
}
```

순수 함수이므로 `server-only` 를 붙이지 않는다(서버 액션과 서버 컴포넌트 양쪽에서 import).

## 2. `src/actions/submissions.ts` 수정

`hasOwnChecklist(zone.code)` 로 분기한다.

- **true(A·B)**: `checklist_items` 조회와 전부-체크 검증을 건너뛰고, 상태 선점 → `submissions` insert 까지만 한다. `submission_items` 는 insert 하지 않는다.
- **false(C~H)**: 기존 로직 그대로. 항목 0개면 에러, 미체크 있으면 에러 — **이 강제를 절대 약화시키지 말 것.**
- 상태 선점(`.eq("status", zone.status)`)과 실패 시 롤백은 두 경로 공통으로 유지한다.
- 지정 제출자 권한 검사(`isAssignedSubmitter`) 위치는 그대로 — 파싱 직후, 상태 선점 전.

## 3. `src/components/checklist-form.tsx` 수정

새 컴포넌트를 만들지 말고 기존 폼을 재사용한다. `items` 가 빈 배열이면 **체크리스트 섹션을 렌더하지 않고** 전부-체크 게이트도 적용하지 않는다.

- `const allChecked = items.length === 0 || checkedCount === items.length;`
- 체크리스트 `<section>` 은 `items.length > 0` 일 때만 렌더
- 버튼 아래 안내 문구도 `items.length === 0` 이면 "회중과 이름을 입력해 주세요." 만 나오게
- `hasAssignee` 안내와 작성자 섹션은 두 경우 모두 그대로

## 4. `src/app/c/[token]/page.tsx` 수정

대시보드 구역 상세와 같은 분기 모양을 쓴다.

```
submittable 일 때:
  hasOwnChecklist(zone.code)
    ? <ZoneAChecklist/> 또는 <ZoneBChecklist/>  +  <ChecklistForm token items={[]} hasAssignee/>
    : items.length > 0
        ? <ChecklistForm token items={items} hasAssignee/>
        : "체크리스트 항목이 등록되지 않았습니다" 안내
```

- A 는 `ZoneAChecklist`, B 는 `ZoneBChecklist` (`zone.code.toUpperCase()` 로 판정)
- **이 3개 파일은 수정하지 않는다**: `zone-checklist.tsx`, `zone-a-checklist.tsx`, `zone-b-checklist.tsx`
- `getChecklistItems` 호출은 그대로 둔다(C~H 에 필요).

## 5. `src/components/submission-summary.tsx` 수정

A/B 구역은 `submission_items` 가 비어 있어 지금은 빈 `<ul>` 이 남는다. `submission.items.length === 0` 이면 목록 대신 한 줄 안내:

> 구역 전용 체크리스트를 사용하는 구역입니다. 체크 내역은 봉사자 브라우저에만 저장됩니다.

## 6. 범위 밖

- A/B 체크리스트 정의를 DB 로 옮기거나 서버에서 검증하는 작업.
- `ZoneChecklist` 의 footer 문구 수정.
- C~H 구역용 전용 체크리스트 추가.

## 7. 검증

- `npm run lint`, `npm run build` 통과
- C~H 경로에서 전부-체크 강제가 살아 있는지 코드로 확인 (서버 액션 분기)
- A/B 경로에서 `submission_items` insert 가 호출되지 않는지 확인
