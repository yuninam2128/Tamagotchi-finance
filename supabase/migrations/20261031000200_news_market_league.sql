-- 2차: 실시간 뉴스 캐시, 시세·예보 채점, 주간 랭킹·리그, 펫 진화, 푸시 구독

-- ───────────── 뉴스 ─────────────
-- Edge Function(news)이 RSS 를 받아 채우고, 클라이언트는 읽기만 한다.
create table public.news (
  id text primary key, -- 링크 해시
  title text not null,
  link text not null,
  source text,
  published_at timestamptz not null,
  fetched_at timestamptz not null default now()
);
create index news_published_idx on public.news (published_at desc);
alter table public.news enable row level security;
create policy "뉴스 조회" on public.news for select to authenticated using (true);

-- ───────────── 예보 채점 ─────────────
-- 예보는 고른 날(D) 다음 거래일의 결과로 채점한다. 고르는 시점에 결과를 알 수 없게 하기 위해서다.
--   코스피·환율: D 이후 첫 거래일 종가 vs 그 직전 거래일 종가 (한국은행 ECOS)
--   비트코인: D+1 18:00 가격 vs D 자정 가격 (업비트)
-- Edge Function(market)이 계산해 market_moves 에 넣고 resolve_forecasts 를 부른다.
create table public.market_moves (
  day date not null, -- 예보를 고른 날
  asset public.asset_kind not null,
  base_at date, -- 기준가 날짜
  target_at date, -- 결과 날짜
  base real not null,
  target real not null,
  move real not null, -- 등락률(%)
  fetched_at timestamptz not null default now(),
  primary key (day, asset)
);
alter table public.market_moves enable row level security;
create policy "시세 조회" on public.market_moves for select to authenticated using (true);

alter table public.forecasts add column resolved_at timestamptz;
alter table public.forecasts add column notified_at timestamptz; -- 결과 푸시를 보낸 시각

-- 오늘 고른 예보는 자정 전까지 바꿀 수 있고, 첫 제출에만 참여 포인트.
create or replace function public.submit_forecast(p_asset public.asset_kind, p_pick text)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_day date := public.kst_today();
  v_inserted boolean;
  v_points integer := 0;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;

  insert into public.forecasts (uid, day, asset, pick) values (v_uid, v_day, p_asset, p_pick)
  on conflict (uid, day, asset) do update set pick = excluded.pick where public.forecasts.resolved_at is null
  returning (xmax = 0) into v_inserted;

  if v_inserted then
    v_points := public.award_points(v_uid, v_day, 2, 'forecast_submit', p_asset::text);
    update public.forecasts set points = v_points where uid = v_uid and day = v_day and asset = p_asset;
  end if;
  return jsonb_build_object(
    'pick', (select pick from public.forecasts where uid = v_uid and day = v_day and asset = p_asset),
    'points', v_points
  );
end;
$$;

-- 시세가 들어온 예보를 채점한다. 적중 보너스는 하루 상한 밖.
create function public.resolve_forecasts(p_day date)
returns integer
language plpgsql security definer set search_path = ''
as $$
declare
  hit_bonus constant integer := 20;
  v_count integer := 0;
  v_hit boolean;
  rec record;
begin
  for rec in
    select f.uid, f.asset, f.pick, m.move, m.target_at
    from public.forecasts f
    join public.market_moves m on m.day = f.day and m.asset = f.asset
    where f.day = p_day and f.resolved_at is null
    for update of f
  loop
    v_hit := (rec.pick = 'up') = (rec.move >= 0);
    update public.forecasts
    set move = rec.move, hit = v_hit,
        points = points + case when v_hit then hit_bonus else 0 end,
        resolved_at = now()
    where uid = rec.uid and day = p_day and asset = rec.asset;

    if v_hit then
      -- 원장 날짜는 결과가 나온 날 (그 주 랭킹에 반영)
      insert into public.point_ledger (uid, day, delta, reason, ref_id)
      values (rec.uid, coalesce(rec.target_at, public.kst_today()), hit_bonus, 'forecast_hit', p_day || ':' || rec.asset);
    end if;
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

-- ───────────── 주간 랭킹·리그 ─────────────
-- 주간 점수 = 이번 주(월요일 시작, KST)에 쌓은 포인트. 같은 티어(리그 코드가 있으면 같은 코드)끼리 겨룬다.
-- 실제 플레이어가 10명 미만이면 봇으로 채운다 (bot: true 로 표시).
create function public.week_start(p_day date)
returns date
language sql immutable set search_path = ''
as $$ select p_day - ((extract(isodow from p_day)::int) - 1) $$;

create function public.get_league()
returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  min_rows constant integer := 10;
  bot_names constant text[] := array['우산없이출근', '환율요정', '금리박사', '코스피고양이', '적금왕', '갓생저축러',
                                     '달러수집가', '비상금지킴이', '등기부탐정', '리볼빙탈출'];
  v_uid uuid := auth.uid();
  v_me public.players;
  v_today date := public.kst_today();
  v_from date := public.week_start(public.kst_today());
  v_progress float8;
  v_rows jsonb;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  select * into v_me from public.players where uid = v_uid;
  -- 주가 지날수록 봇 점수도 오른다 (0~1)
  v_progress := least(1, ((v_today - v_from) + extract(hour from now() at time zone 'Asia/Seoul') / 24.0) / 7.0);

  with real_scores as (
    select p.uid, coalesce(p.nick, '익명 예보관') as nick, p.pet_stage as stage, p.pet_form as form, false as bot,
           coalesce((select sum(l.delta) from public.point_ledger l
                     where l.uid = p.uid and l.day >= v_from and l.delta > 0), 0)::int as score
    from public.players p
    where p.baseline is not null
      and p.tier = v_me.tier
      and (v_me.league_code is null or p.league_code = v_me.league_code)
  ), bots as (
    select null::uuid as uid, bot_names[i] as nick,
           1 + (abs(hashtext(bot_names[i])) % 3)::smallint as stage, null::text as form, true as bot,
           round((40 + abs(hashtext(bot_names[i] || v_from::text)) % (220 + 60 * v_me.tier)) * v_progress)::int as score
    from generate_subscripts(bot_names, 1) as i
    where v_me.league_code is null
      and i <= min_rows - (select count(*) from real_scores)
  ), ranked as (
    select *, rank() over (order by score desc) as rnk
    from (select * from real_scores union all select * from bots) s
  )
  select jsonb_agg(jsonb_build_object('rank', rnk, 'nick', nick, 'score', score, 'stage', stage, 'form', form,
                                      'bot', bot, 'me', uid is not distinct from v_uid)
                   order by rnk, uid is not distinct from v_uid desc, nick)
  into v_rows
  from ranked
  where rnk <= 30 or uid = v_uid;

  return jsonb_build_object(
    'tier', v_me.tier,
    'league_code', v_me.league_code,
    'week_start', v_from,
    'rows', coalesce(v_rows, '[]'::jsonb)
  );
end;
$$;

-- 친구 리그: 코드를 만들거나(p_code null) 들어가거나, '' 이면 나간다.
create function public.set_league(p_code text default null)
returns text
language plpgsql security definer set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_code text;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if p_code = '' then
    v_code := null;
  elsif p_code is null then
    v_code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
  else
    v_code := upper(trim(p_code));
    if v_code !~ '^[0-9A-Z]{6}$' then raise exception 'invalid league code'; end if;
    if not exists (select 1 from public.players where league_code = v_code) then raise exception 'league not found'; end if;
  end if;
  update public.players set league_code = v_code where uid = v_uid;
  return v_code;
end;
$$;

-- ───────────── 펫 진화 ─────────────
-- 알(0) → 진단하면 부화(1) → 활동일 3일 새끼(2) → 10일 성체(3). 성체는 가장 높은 스탯으로 형태가 갈린다.
create function public.update_pet(p_uid uuid)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  legend_min constant integer := 80;
  v_player public.players;
  v_days integer;
  v_stage smallint;
  v_form text;
begin
  select * into v_player from public.players where uid = p_uid for update;
  if v_player.baseline is null then return null; end if;

  select count(distinct day) into v_days from public.attempts where uid = p_uid;
  v_stage := case when v_days >= 10 then 3 when v_days >= 3 then 2 else 1 end;
  if v_stage <= v_player.pet_stage then return null; end if;

  if v_stage = 3 then
    select case when min(value) >= legend_min then 'legend'
                else (array_agg(stat::text order by value desc, stat))[1] end
    into v_form from public.stat_values(p_uid);
  end if;

  update public.players set pet_stage = v_stage, pet_form = coalesce(v_form, pet_form) where uid = p_uid;
  return jsonb_build_object('stage', v_stage, 'form', v_form);
end;
$$;

-- submit_answer 에 진화 판정을 붙인다 (나머지는 1차와 동일)
create or replace function public.submit_answer(p_item_id text, p_choice smallint, p_ms integer default null)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_day date := public.kst_today();
  v_set public.daily_sets;
  v_item public.items;
  v_stat public.stat_kind;
  v_ps public.player_skills;
  v_correct boolean;
  v_base real;
  v_mastery real;
  v_interval smallint;
  v_before smallint;
  v_after smallint;
  v_points integer;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  select * into v_set from public.daily_sets where uid = v_uid and day = v_day for update;
  if not found or not (p_item_id = any (v_set.item_ids || v_set.extra_ids)) then
    raise exception 'item not in today''s set';
  end if;
  if exists (select 1 from public.attempts where uid = v_uid and day = v_day and item_id = p_item_id) then
    raise exception 'already answered';
  end if;

  select * into v_item from public.items where id = p_item_id;
  select stat into v_stat from public.skills where id = v_item.skill_id;
  select value into v_before from public.stat_values(v_uid) where stat = v_stat;
  v_correct := p_choice = v_item.answer;

  select * into v_ps from public.player_skills where uid = v_uid and skill_id = v_item.skill_id for update;
  v_base := public.effective_mastery(v_ps.mastery, v_ps.interval_days, v_ps.next_due, v_day);
  if v_correct then
    v_mastery := v_base + (1 - v_base) * 0.35;
    v_interval := least(60, greatest(1, coalesce(v_ps.interval_days, 0) * 2));
  else
    v_mastery := v_base * 0.6;
    v_interval := 1;
  end if;
  insert into public.player_skills (uid, skill_id, mastery, interval_days, last_seen, next_due)
  values (v_uid, v_item.skill_id, v_mastery, v_interval, now(), v_day + v_interval)
  on conflict (uid, skill_id) do update
    set mastery = excluded.mastery, interval_days = excluded.interval_days,
        last_seen = excluded.last_seen, next_due = excluded.next_due;

  v_points := public.award_points(v_uid, v_day, case when v_correct then 5 else 2 end, 'answer', p_item_id);
  insert into public.attempts (uid, item_id, day, choice, correct, ms, points)
  values (v_uid, p_item_id, v_day, p_choice, v_correct, p_ms, v_points);

  update public.daily_sets
  set idx = (select count(*) from public.attempts a where a.uid = v_uid and a.day = v_day and a.item_id = any (v_set.item_ids))
  where uid = v_uid and day = v_day;

  select value into v_after from public.stat_values(v_uid) where stat = v_stat;

  return jsonb_build_object(
    'correct', v_correct, 'answer', v_item.answer, 'explanation', v_item.explanation,
    'points', v_points, 'stat', v_stat, 'before', v_before, 'after', v_after,
    'evolved', public.update_pet(v_uid)
  );
end;
$$;

-- ───────────── 푸시 구독 ─────────────
create table public.push_subscriptions (
  endpoint text primary key,
  uid uuid not null references public.players (uid) on delete cascade,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);
create index push_subscriptions_uid_idx on public.push_subscriptions (uid);
alter table public.push_subscriptions enable row level security;
create policy "본인 조회" on public.push_subscriptions for select to authenticated using ((select auth.uid()) = uid);
create policy "본인 등록" on public.push_subscriptions for insert to authenticated with check ((select auth.uid()) = uid);
create policy "본인 삭제" on public.push_subscriptions for delete to authenticated using ((select auth.uid()) = uid);
revoke update on public.push_subscriptions from anon, authenticated;

-- ───────────── 함수 권한 ─────────────
revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function
  public.get_home(),
  public.get_my_skills(),
  public.submit_diagnosis(jsonb),
  public.get_daily_set(),
  public.submit_answer(text, smallint, integer),
  public.start_treatment(public.stat_kind),
  public.submit_forecast(public.asset_kind, text),
  public.get_league(),
  public.set_league(text)
to authenticated;
grant execute on function public.resolve_forecasts(date) to service_role;
