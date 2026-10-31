-- 핵심 스키마
--
-- 펫 스탯 = 약점 지표. 스탯 4개(방어·신용·주거·흐름)는 하위 스킬 숙련도의 평균이고,
-- 복습일이 지나면 숙련도가 서서히 감쇠한다. 배고픔(FEED)은 오늘 예보 참여 여부로 클라이언트가 계산한다.
--
-- 포인트는 실제 리워드로 바뀌므로 클라이언트가 직접 쓰지 못한다.
-- 채점·숙련도 갱신·포인트 적립은 전부 security definer RPC 안에서만 일어난다.

create type public.stat_kind as enum ('shield', 'credit', 'home', 'flow');
create type public.item_type as enum ('quiz', 'fraud', 'case');
create type public.asset_kind as enum ('kr', 'fx', 'coin');
create type public.redemption_status as enum ('pending', 'done', 'failed', 'canceled');

-- ───────────── 콘텐츠 ─────────────

create table public.skills (
  id text primary key,
  stat public.stat_kind not null,
  name text not null,
  sort smallint not null
);

create table public.items (
  id text primary key,
  type public.item_type not null,
  skill_id text not null references public.skills (id),
  difficulty smallint not null default 1 check (difficulty between 1 and 3),
  -- quiz/case: {prompt, choices[], scenario?} · fraud: {from, avatar, text, choices[]}
  body jsonb not null,
  answer smallint not null, -- body.choices 의 정답 인덱스
  explanation text not null,
  source_ref text,
  diagnostic boolean not null default false, -- 첫 진단에 쓰는 문제
  active boolean not null default true
);
create index items_skill_idx on public.items (skill_id) where active;

-- ───────────── 플레이어 ─────────────

create table public.players (
  uid uuid primary key references auth.users (id) on delete cascade,
  nick text check (char_length(nick) between 1 and 12),
  created_at timestamptz not null default now(),
  tier smallint not null default 0,
  league_code text,
  pet_stage smallint not null default 0, -- 0=알
  pet_form text, -- 성체 분기: shield|credit|home|flow|legend
  born_at timestamptz,
  baseline jsonb -- 첫 진단 직후 스탯 {shield,credit,home,flow}. null 이면 진단 전
);

create table public.player_skills (
  uid uuid not null references public.players (uid) on delete cascade,
  skill_id text not null references public.skills (id),
  mastery real not null check (mastery between 0 and 1),
  interval_days smallint not null,
  last_seen timestamptz not null,
  next_due date not null,
  primary key (uid, skill_id)
);

create table public.daily_sets (
  uid uuid not null references public.players (uid) on delete cascade,
  day date not null,
  item_ids text[] not null, -- 약점 문제 5개 (예보 3개는 고정이라 저장 안 함)
  extra_ids text[] not null default '{}', -- 오늘 추가로 받은 치료 문제
  reasons jsonb not null, -- {"shield":2,"flow":1,...} 스탯별 출제 수
  idx smallint not null default 0, -- item_ids 중 푼 개수
  primary key (uid, day)
);

create table public.attempts (
  id bigint generated always as identity primary key,
  uid uuid not null references public.players (uid) on delete cascade,
  item_id text not null references public.items (id),
  day date not null,
  choice smallint not null,
  correct boolean not null,
  ms integer,
  points integer not null default 0,
  created_at timestamptz not null default now(),
  unique (uid, day, item_id)
);
create index attempts_uid_item_idx on public.attempts (uid, item_id, day desc);

create table public.forecasts (
  uid uuid not null references public.players (uid) on delete cascade,
  day date not null,
  asset public.asset_kind not null,
  pick text not null check (pick in ('up', 'down')),
  move real, -- 18시 채점 후 등락률(%)
  hit boolean,
  points integer not null default 0,
  primary key (uid, day, asset)
);

-- 포인트 원장: 잔액은 항상 sum(delta). 행을 고치지 않고 추가만 한다.
create table public.point_ledger (
  id bigint generated always as identity primary key,
  uid uuid not null references public.players (uid) on delete cascade,
  ts timestamptz not null default now(),
  day date not null,
  delta integer not null,
  reason text not null, -- answer | forecast_submit | forecast_hit | redemption ...
  ref_id text
);
create index point_ledger_uid_day_idx on public.point_ledger (uid, day);

create table public.redemptions (
  id bigint generated always as identity primary key,
  uid uuid not null references public.players (uid) on delete cascade,
  partner text not null,
  amount integer not null check (amount > 0),
  status public.redemption_status not null default 'pending',
  ts timestamptz not null default now()
);

-- ───────────── 권한 ─────────────

alter table public.skills enable row level security;
alter table public.items enable row level security;
alter table public.players enable row level security;
alter table public.player_skills enable row level security;
alter table public.daily_sets enable row level security;
alter table public.attempts enable row level security;
alter table public.forecasts enable row level security;
alter table public.point_ledger enable row level security;
alter table public.redemptions enable row level security;

create policy "스킬 조회" on public.skills for select to authenticated using (true);
create policy "문제 조회" on public.items for select to authenticated using (active);
create policy "본인 조회" on public.players for select to authenticated using ((select auth.uid()) = uid);
create policy "본인 닉네임 수정" on public.players for update to authenticated
  using ((select auth.uid()) = uid) with check ((select auth.uid()) = uid);
create policy "본인 조회" on public.player_skills for select to authenticated using ((select auth.uid()) = uid);
create policy "본인 조회" on public.daily_sets for select to authenticated using ((select auth.uid()) = uid);
create policy "본인 조회" on public.attempts for select to authenticated using ((select auth.uid()) = uid);
create policy "본인 조회" on public.forecasts for select to authenticated using ((select auth.uid()) = uid);
create policy "본인 조회" on public.point_ledger for select to authenticated using ((select auth.uid()) = uid);
create policy "본인 조회" on public.redemptions for select to authenticated using ((select auth.uid()) = uid);

-- 정답·해설은 답을 낸 뒤 RPC 응답으로만 내려간다.
revoke all on public.items from anon, authenticated;
grant select (id, type, skill_id, difficulty, body, diagnostic, active) on public.items to authenticated;

-- 플레이어가 직접 바꿀 수 있는 건 닉네임뿐.
revoke all on public.players from anon, authenticated;
grant select on public.players to authenticated;
grant update (nick) on public.players to authenticated;

-- ───────────── 가입 트리거 ─────────────

create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.players (uid) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ───────────── 계산 함수 ─────────────

-- 하루 경계와 18시 발표는 모두 한국 시간 기준
create function public.kst_today()
returns date
language sql stable set search_path = ''
as $$ select (now() at time zone 'Asia/Seoul')::date $$;

-- 복습일이 지나면 반감기 = 3 × max(간격, 3)일 로 감쇠.
-- 간격 2일짜리 스킬을 일주일 쉬면 약 0.7배, 16일짜리는 같은 기간에 거의 안 줄어든다.
create function public.effective_mastery(p_mastery real, p_interval smallint, p_next_due date, p_today date)
returns real
language sql immutable set search_path = ''
as $$
  select case
    when p_mastery is null then 0
    when p_today <= p_next_due then p_mastery
    else (p_mastery * power(0.5, (p_today - p_next_due)::float8 / (3 * greatest(p_interval, 3))))::real
  end
$$;

-- 스탯 = 하위 스킬 유효 숙련도 평균 × 100 (안 푼 스킬은 0)
create function public.stat_values(p_uid uuid)
returns table (stat public.stat_kind, value smallint)
language sql stable security definer set search_path = ''
as $$
  select s.stat,
         round(100 * avg(public.effective_mastery(ps.mastery, ps.interval_days, ps.next_due, public.kst_today())))::smallint
  from public.skills s
  left join public.player_skills ps on ps.skill_id = s.id and ps.uid = p_uid
  group by s.stat
  order by s.stat
$$;

-- 하루 상한(예보 적중 보너스 제외) 안에서 포인트를 적립하고 실제 적립액을 돌려준다.
create function public.award_points(p_uid uuid, p_day date, p_raw integer, p_reason text, p_ref text)
returns integer
language plpgsql security definer set search_path = ''
as $$
declare
  daily_cap constant integer := 100;
  v_earned integer;
  v_points integer;
begin
  if p_raw <= 0 then return 0; end if;
  select coalesce(sum(delta), 0) into v_earned
  from public.point_ledger
  where uid = p_uid and day = p_day and reason in ('answer', 'forecast_submit');
  v_points := least(p_raw, greatest(0, daily_cap - v_earned));
  if v_points > 0 then
    insert into public.point_ledger (uid, day, delta, reason, ref_id) values (p_uid, p_day, v_points, p_reason, p_ref);
  end if;
  return v_points;
end;
$$;

-- 약점 문제 5개를 뽑는다. 첫 문제는 최약 스탯, 나머지는 가중치 (100 - 값) + 10 으로 뽑아 강한 스탯도 가끔 나온다.
-- 고른 스탯 안에서는 아직 오늘 안 나온 스킬 중 유효 숙련도가 가장 낮은 것,
-- 그 스킬 안에서는 가장 오래전에 푼(또는 안 푼) 문제를 고른다.
create function public.build_daily_set(p_uid uuid, p_day date)
returns public.daily_sets
language plpgsql security definer set search_path = ''
as $$
declare
  v_weights jsonb := '{}';
  v_total float8 := 0;
  v_r float8;
  v_stat public.stat_kind;
  v_skill text;
  v_item text;
  v_ids text[] := '{}';
  v_used_skills text[] := '{}';
  v_reasons jsonb := '{}';
  v_row public.daily_sets;
  rec record;
begin
  for rec in select * from public.stat_values(p_uid) loop
    v_weights := v_weights || jsonb_build_object(rec.stat, 110 - rec.value);
    v_total := v_total + 110 - rec.value;
  end loop;

  for n in 1..5 loop
    v_stat := null;
    if n = 1 then
      -- 첫 문제는 항상 가장 약한 스탯 (동점이면 무작위)
      select stat into v_stat from public.stat_values(p_uid) order by value, random() limit 1;
    else
      v_r := random() * v_total;
      for rec in select key, value::float8 as w from jsonb_each_text(v_weights) loop
        v_r := v_r - rec.w;
        if v_r <= 0 then v_stat := rec.key::public.stat_kind; exit; end if;
      end loop;
    end if;
    v_stat := coalesce(v_stat, 'shield');

    v_skill := null;
    select s.id into v_skill
    from public.skills s
    left join public.player_skills ps on ps.skill_id = s.id and ps.uid = p_uid
    where s.stat = v_stat
      and exists (select 1 from public.items i where i.skill_id = s.id and i.active and not (i.id = any (v_ids)))
    order by s.id = any (v_used_skills),
             public.effective_mastery(ps.mastery, ps.interval_days, ps.next_due, p_day),
             random()
    limit 1;
    continue when v_skill is null;

    select i.id into v_item
    from public.items i
    where i.skill_id = v_skill and i.active and not (i.id = any (v_ids))
    order by (select max(a.day) from public.attempts a where a.uid = p_uid and a.item_id = i.id) nulls first, random()
    limit 1;

    v_ids := v_ids || v_item;
    v_used_skills := v_used_skills || v_skill;
    v_reasons := v_reasons || jsonb_build_object(v_stat, coalesce((v_reasons ->> v_stat::text)::int, 0) + 1);
  end loop;

  insert into public.daily_sets (uid, day, item_ids, reasons)
  values (p_uid, p_day, v_ids, v_reasons)
  on conflict (uid, day) do nothing
  returning * into v_row;
  if not found then
    select * into v_row from public.daily_sets where uid = p_uid and day = p_day;
  end if;
  return v_row;
end;
$$;

-- 문제 목록을 클라이언트용 JSON 으로 (정답·해설 제외)
create function public.items_json(p_uid uuid, p_day date, p_ids text[])
returns jsonb
language sql stable security definer set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'id', i.id, 'type', i.type, 'skill_id', i.skill_id, 'stat', s.stat, 'body', i.body,
           'done', exists (select 1 from public.attempts a where a.uid = p_uid and a.day = p_day and a.item_id = i.id)
         ) order by o.ord), '[]'::jsonb)
  from unnest(p_ids) with ordinality as o (id, ord)
  join public.items i on i.id = o.id
  join public.skills s on s.id = i.skill_id
$$;

-- ───────────── 클라이언트 RPC ─────────────

create function public.get_home()
returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_player public.players;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  select * into v_player from public.players where uid = v_uid;
  return jsonb_build_object(
    'nick', v_player.nick,
    'tier', v_player.tier,
    'pet', jsonb_build_object('stage', v_player.pet_stage, 'form', v_player.pet_form, 'born_at', v_player.born_at),
    'baseline', v_player.baseline,
    'stats', (select jsonb_object_agg(stat, value) from public.stat_values(v_uid)),
    'points', (select coalesce(sum(delta), 0) from public.point_ledger where uid = v_uid),
    'today', public.kst_today()
  );
end;
$$;

-- 스탯 상세 시트용: 하위 스킬별 유효 숙련도
create function public.get_my_skills()
returns table (skill_id text, stat public.stat_kind, name text, sort smallint, mastery real, next_due date)
language sql stable security definer set search_path = ''
as $$
  select s.id, s.stat, s.name, s.sort,
         public.effective_mastery(ps.mastery, ps.interval_days, ps.next_due, public.kst_today()),
         ps.next_due
  from public.skills s
  left join public.player_skills ps on ps.skill_id = s.id and ps.uid = auth.uid()
  order by s.stat, s.sort
$$;

-- 첫 진단: 스탯별 정답률로 그 스탯의 모든 스킬 숙련도를 초기화하고 기준점을 저장한다.
-- p_answers: [{"item_id": "...", "choice": 0}, ...]
create function public.submit_diagnosis(p_answers jsonb)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_day date := public.kst_today();
  v_results jsonb;
  v_baseline jsonb;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if exists (select 1 from public.players where uid = v_uid and baseline is not null) then
    raise exception 'already diagnosed';
  end if;

  create temp table pg_temp._diag on commit drop as
  select i.id, i.skill_id, s.stat, i.answer, i.explanation, (a ->> 'choice')::smallint as choice,
         (a ->> 'choice')::smallint = i.answer as correct
  from jsonb_array_elements(p_answers) a
  join public.items i on i.id = a ->> 'item_id' and i.diagnostic
  join public.skills s on s.id = i.skill_id;

  -- 맞히면 0.5, 틀리면 0.15 에서 시작. 진단 문제가 없는 스탯도 0.15.
  insert into public.player_skills (uid, skill_id, mastery, interval_days, last_seen, next_due)
  select v_uid, s.id,
         coalesce((select avg(case when d.correct then 0.5 else 0.15 end) from pg_temp._diag d where d.stat = s.stat), 0.15),
         1, now(), v_day + 1
  from public.skills s
  on conflict (uid, skill_id) do nothing;

  select jsonb_object_agg(stat, value) into v_baseline from public.stat_values(v_uid);
  update public.players set baseline = v_baseline, born_at = now(), pet_stage = 1 where uid = v_uid;

  select coalesce(jsonb_agg(jsonb_build_object('item_id', id, 'correct', correct, 'answer', answer, 'explanation', explanation)), '[]')
  into v_results from pg_temp._diag;

  return jsonb_build_object('baseline', v_baseline, 'results', v_results);
end;
$$;

create function public.get_daily_set()
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_day date := public.kst_today();
  v_set public.daily_sets;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  select * into v_set from public.daily_sets where uid = v_uid and day = v_day;
  if not found then v_set := public.build_daily_set(v_uid, v_day); end if;
  return jsonb_build_object(
    'day', v_set.day,
    'idx', v_set.idx,
    'reasons', v_set.reasons,
    'items', public.items_json(v_uid, v_day, v_set.item_ids),
    'extra', public.items_json(v_uid, v_day, v_set.extra_ids),
    'forecasts', (select coalesce(jsonb_object_agg(asset, pick), '{}') from public.forecasts where uid = v_uid and day = v_day)
  );
end;
$$;

-- 채점 + 간격 반복 갱신 + 포인트 적립. 오늘 세트(또는 치료 문제)에 있는 문제만, 하루 한 번만 받는다.
create function public.submit_answer(p_item_id text, p_choice smallint, p_ms integer default null)
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

  -- 간격 반복: 맞히면 숙련도 +35% of 남은 몫, 간격 2배(최대 60일). 틀리면 ×0.6, 간격 1일.
  -- 감쇠된 현재값에서 출발해야 복습을 미룬 대가가 남는다.
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
    'points', v_points, 'stat', v_stat, 'before', v_before, 'after', v_after
  );
end;
$$;

-- 집중 치료: 해당 스탯에서 숙련도가 가장 낮은 스킬 위주로 3문제를 오늘 세트에 추가한다.
create function public.start_treatment(p_stat public.stat_kind)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_day date := public.kst_today();
  v_set public.daily_sets;
  v_new text[];
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  select * into v_set from public.daily_sets where uid = v_uid and day = v_day for update;
  if not found then v_set := public.build_daily_set(v_uid, v_day); end if;

  select coalesce(array_agg(id), '{}') into v_new from (
    select i.id
    from public.items i
    join public.skills s on s.id = i.skill_id
    left join public.player_skills ps on ps.skill_id = s.id and ps.uid = v_uid
    where s.stat = p_stat and i.active
      and not (i.id = any (v_set.item_ids || v_set.extra_ids))
      and not exists (select 1 from public.attempts a where a.uid = v_uid and a.day = v_day and a.item_id = i.id)
    order by public.effective_mastery(ps.mastery, ps.interval_days, ps.next_due, v_day), random()
    limit 3
  ) t;

  update public.daily_sets set extra_ids = extra_ids || v_new where uid = v_uid and day = v_day;
  return public.items_json(v_uid, v_day, v_new);
end;
$$;

-- 예보 제출: 18시(KST) 전까지 바꿀 수 있고, 첫 제출에만 참여 포인트.
-- 채점(move/hit)은 장 마감 시세를 받아오는 Edge Function 이 service role 로 한다.
create function public.submit_forecast(p_asset public.asset_kind, p_pick text)
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
  if (now() at time zone 'Asia/Seoul')::time >= time '18:00' then raise exception 'forecast closed'; end if;

  insert into public.forecasts (uid, day, asset, pick) values (v_uid, v_day, p_asset, p_pick)
  on conflict (uid, day, asset) do update set pick = excluded.pick where public.forecasts.move is null
  returning (xmax = 0) into v_inserted;

  if v_inserted then
    v_points := public.award_points(v_uid, v_day, 2, 'forecast_submit', p_asset::text);
    update public.forecasts set points = v_points where uid = v_uid and day = v_day and asset = p_asset;
  end if;
  return jsonb_build_object('pick', p_pick, 'points', v_points);
end;
$$;

-- ───────────── 함수 권한 ─────────────

revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function
  public.get_home(),
  public.get_my_skills(),
  public.submit_diagnosis(jsonb),
  public.get_daily_set(),
  public.submit_answer(text, smallint, integer),
  public.start_treatment(public.stat_kind),
  public.submit_forecast(public.asset_kind, text)
to authenticated;
