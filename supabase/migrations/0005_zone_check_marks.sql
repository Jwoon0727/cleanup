-- 봉사자 URL 체크리스트의 체크·수량 입력을 구역 단위로 공유(실시간 동기화)하기 위한 저장소.
-- 한 칸(체크 항목 1개, 도구 수량 1개, 반납 확인 1개)이 한 행이다.
--   key 형식: c:<탭>::<그룹>::<항목> (체크) / q:<도구id> (수량) / r:<도구id> (반납 확인)
-- Supabase Dashboard > SQL Editor 에 붙여넣고 실행.

create table if not exists public.zone_check_marks (
  zone_id uuid not null references public.zones (id) on delete cascade,
  key text not null,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (zone_id, key)
);

-- 다른 테이블과 동일하게 RLS deny-all. 접근은 서버(service role)에서만.
alter table public.zone_check_marks enable row level security;
