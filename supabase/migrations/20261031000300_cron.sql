-- 예약 작업: Edge Function 을 pg_cron + pg_net 으로 부른다.
-- 프로젝트 URL 과 cron_secret 은 Vault 에 있다 (git 에 두지 않으려고 `supabase db query` 로 따로 넣음):
--   select vault.create_secret('https://<ref>.supabase.co', 'project_url');
--   select vault.create_secret('<랜덤>', 'cron_secret');   -- Edge Function 시크릿 CRON_SECRET 과 같은 값

create extension if not exists pg_cron;
create extension if not exists pg_net;

create schema if not exists private;

create function private.call_edge(p_path text)
returns bigint
language sql security definer set search_path = ''
as $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/' || p_path,
    headers := jsonb_build_object(
      'content-type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  )
$$;
revoke all on function private.call_edge(text) from public, anon, authenticated;

-- 시간은 UTC (KST = UTC+9)
select cron.schedule('news-refresh', '*/15 * * * *', $$ select private.call_edge('news') $$);
-- 18:05, 21:00, 다음날 09:00 KST — ECOS 종가가 늦게 올라오는 날을 위한 재시도
select cron.schedule('market-resolve-1805', '5 9 * * *', $$ select private.call_edge('market') $$);
select cron.schedule('market-resolve-2100', '0 12 * * *', $$ select private.call_edge('market') $$);
select cron.schedule('market-resolve-0900', '0 0 * * *', $$ select private.call_edge('market') $$);
-- 결과 알림은 채점 10분 뒤
select cron.schedule('push-result-1815', '15 9 * * *', $$ select private.call_edge('push?kind=result') $$);
select cron.schedule('push-result-2110', '10 12 * * *', $$ select private.call_edge('push?kind=result') $$);
select cron.schedule('push-result-0910', '10 0 * * *', $$ select private.call_edge('push?kind=result') $$);
-- 돌봄 알림 12:00, 20:00 KST
select cron.schedule('push-remind-1200', '0 3 * * *', $$ select private.call_edge('push?kind=remind') $$);
select cron.schedule('push-remind-2000', '0 11 * * *', $$ select private.call_edge('push?kind=remind') $$);
