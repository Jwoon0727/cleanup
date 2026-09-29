-- 구역별 청소부 요원(결과 연락받을 사람) 정보.
-- 봉사자 URL 하단 안내 문구에 표시된다. 둘 다 null 이면 기본 문구를 사용.
-- Supabase Dashboard > SQL Editor 에 붙여넣고 실행.

alter table public.zones
  add column if not exists contact_name text,
  add column if not exists contact_phone text;
