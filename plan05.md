# plan05 — 실시간 폴링(LiveRefresh / pulse) 전면 제거

- 작성일: 2026-09-22
- 요구사항: "계속 새로고침처럼 뭔가 잡히는 것 같다. 안 되게 해줘."
- 확정 사항 (사용자 선택): **관리자·봉사자 양쪽 모두 완전 제거**

## 0. 현재 동작과 제거의 결과

`LiveRefresh` 는 버그가 아니다. 지문(fingerprint)이 **바뀔 때만** `router.refresh()` 를
호출하고 값이 같으면 화면을 건드리지 않는다. 문제는 **요청 자체의 빈도**다.

- 관리자 화면: 3초마다 `/api/pulse` → 매 요청당 Supabase 쿼리 5개 (분당 약 100개)
- 봉사자 화면: 5초마다 `/api/pulse/{token}` → 매 요청당 쿼리 2~3개

제거하면 로그가 깨끗해지고 DB 부하가 0 이 되는 대신, **다음이 수동 새로고침 필요**가 된다:
- 봉사자 제출 → 관리자 대시보드의 청소완료 배지
- 관리자 재청소 요청 → 봉사자 화면의 노란 배너

사용자가 이 대가를 알고 선택했다. 기능을 "약하게" 남기지 말고 **완전히 제거**할 것.

## 1. 삭제할 파일 (4개)

| 파일 | 비고 |
|------|------|
| `src/components/live-refresh.tsx` | 폴링 클라이언트 컴포넌트 |
| `src/lib/pulse.ts` | `getAdminPulse` / `getZonePulse` |
| `src/app/api/pulse/route.ts` | 관리자 지문 엔드포인트 |
| `src/app/api/pulse/[token]/route.ts` | 봉사자 지문 엔드포인트 |

`src/app/api/` 아래에는 `pulse/` 밖에 없다 → **`src/app/api/` 디렉터리째 삭제**한다.
(확인 완료: `find src/app/api -type f` 결과가 위 2개 라우트뿐)

## 2. 수정할 파일 (2개)

### `src/app/dashboard/layout.tsx`
- `import { LiveRefresh } from "@/components/live-refresh";` 제거
- `<LiveRefresh endpoint="/api/pulse" intervalMs={3000} />` 제거
- 나머지 헤더/레이아웃은 그대로

### `src/app/c/[token]/page.tsx`
- `import { LiveRefresh } ...` 제거
- `<LiveRefresh endpoint={`/api/pulse/${zone.token}`} intervalMs={5000} />` 제거
- **삽입 순서 유지**: 헤더 → 재청소 배너 → 이미지 → 체크리스트

## 3. 건드리지 말 것

- `revalidatePath()` 호출 — Server Action 안의 재검증은 폴링과 무관하다. 그대로 둔다.
- 체크리스트 제출 / 검사 / 상태 머신 로직
- DB 스키마 — 변경 없음
- `ZoneImage`, `ChecklistPreview`, `SubmissionHistory` 등 최근 추가분

## 4. 검증

1. `npm run lint` — 0건
2. `npm run build` — 타입 에러 0건, **라우트 목록에서 `/api/pulse` 와
   `/api/pulse/[token]` 이 사라졌는지** 확인
3. `grep -rn "LiveRefresh\|pulse" src/` — 0건
4. 실제 확인: `npm run dev` 기동 후 `/dashboard` 와 구역 상세를 열어두고
   **서버 로그에 주기적 요청이 더 이상 찍히지 않는지** 확인 (이번 요구사항의 핵심)
5. 페이지가 정상 렌더되는지 (대시보드, 구역 상세, 봉사자 URL)
