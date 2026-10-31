-- 성장 사이클: 알 → 아기 → 새끼 → 성체 → (성체로 7일) 졸업 → 도감 → 새 알 고르기
-- 1세대: 진단으로 부화, 10일째 가장 높은 스탯이 모습을 정한다 (지금까지와 같음)
-- 2세대부터: 키울 스탯(알)을 고르고, 그 스탯이 60 이상이어야 그 모습으로 성체가 된다. 못 넘기면 새끼로 남는다.
-- 레전드 알: 네 모습을 모두 도감에 모으면 열리고, 모든 스탯 80 이상이어야 성체가 된다.

alter table public.players add column pet_gen smallint not null default 1;
alter table public.players add column pet_focus text check (pet_focus in ('shield', 'credit', 'home', 'flow', 'legend'));
alter table public.players add column pet_start date; -- 이번 세대 시작일 (활동일은 이날부터 센다)
alter table public.players add column adult_on date; -- 성체가 된 날
alter table public.players add column gen_stats jsonb; -- 이번 세대 시작 때 스탯 (졸업 카드의 성장폭)

update public.players
set pet_start = (born_at at time zone 'Asia/Seoul')::date, gen_stats = baseline
where baseline is not null;
update public.players set adult_on = public.kst_today() where pet_stage = 3;

-- 도감: 졸업한 지갑몬
create table public.pets (
  id bigint generated always as identity primary key,
  uid uuid not null references public.players (uid) on delete cascade,
  gen smallint not null,
  form text not null,
  days integer not null, -- 함께한 활동일
  stats_start jsonb,
  stats_end jsonb,
  born_on date,
  graduated_at timestamptz not null default now(),
  unique (uid, gen)
);
alter table public.pets enable row level security;
create policy "pets: 내 것만" on public.pets for select to authenticated using (uid = auth.uid());
grant select on public.pets to authenticated;

-- 이번 세대 활동일
create function public.pet_days(p_uid uuid, p_from date)
returns integer
language sql stable security definer set search_path = ''
as $$
  select count(distinct day)::integer from public.attempts where uid = p_uid and day >= coalesce(p_from, '-infinity'::date);
$$;

create or replace function public.update_pet(p_uid uuid)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  child_days constant integer := 3;
  adult_days constant integer := 10;
  focus_min constant integer := 60;
  legend_min constant integer := 80;
  v_player public.players;
  v_days integer;
  v_stage smallint;
  v_form text;
  v_min integer;
  v_focus_value integer;
begin
  select * into v_player from public.players where uid = p_uid for update;
  if v_player.baseline is null or v_player.pet_stage = 0 then return null; end if;

  v_days := public.pet_days(p_uid, coalesce(v_player.pet_start, (v_player.born_at at time zone 'Asia/Seoul')::date));
  v_stage := case when v_days >= adult_days then 3 when v_days >= child_days then 2 else 1 end;

  if v_stage = 3 then
    select min(value) into v_min from public.stat_values(p_uid);
    if v_player.pet_focus is null then
      select case when v_min >= legend_min then 'legend'
                  else (array_agg(stat::text order by value desc, stat))[1] end
      into v_form from public.stat_values(p_uid);
    elsif v_player.pet_focus = 'legend' then
      if v_min >= legend_min then v_form := 'legend'; else v_stage := 2; end if;
    else
      select value into v_focus_value from public.stat_values(p_uid) where stat::text = v_player.pet_focus;
      if v_focus_value >= focus_min then v_form := v_player.pet_focus; else v_stage := 2; end if;
    end if;
  end if;

  if v_stage <= v_player.pet_stage then return null; end if;

  update public.players
  set pet_stage = v_stage, pet_form = coalesce(v_form, pet_form),
      adult_on = case when v_stage = 3 then public.kst_today() else adult_on end
  where uid = p_uid;
  return jsonb_build_object('stage', v_stage, 'form', v_form);
end;
$$;

-- 지갑몬 상태: 세대·목표·졸업 가능 여부·도감
create function public.get_pet()
returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  grad_days constant integer := 7;
  v_uid uuid := auth.uid();
  v_p public.players;
  v_adult_days integer := 0;
  v_need jsonb;
  v_dex jsonb;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  select * into v_p from public.players where uid = v_uid;

  if v_p.adult_on is not null then
    select count(distinct day)::integer into v_adult_days from public.attempts where uid = v_uid and day > v_p.adult_on;
  end if;

  -- 성체가 되려면 넘어야 하는 스탯 (2세대부터)
  if v_p.pet_focus = 'legend' then
    v_need := jsonb_build_object('stat', 'all', 'min', 80, 'value', (select min(value) from public.stat_values(v_uid)));
  elsif v_p.pet_focus is not null then
    v_need := jsonb_build_object('stat', v_p.pet_focus, 'min', 60,
      'value', (select value from public.stat_values(v_uid) where stat::text = v_p.pet_focus));
  end if;

  select coalesce(jsonb_agg(jsonb_build_object('gen', gen, 'form', form, 'days', days, 'stats_start', stats_start,
           'stats_end', stats_end, 'graduated_at', graduated_at) order by gen), '[]')
  into v_dex from public.pets where uid = v_uid;

  return jsonb_build_object(
    'gen', v_p.pet_gen, 'stage', v_p.pet_stage, 'form', v_p.pet_form, 'focus', v_p.pet_focus,
    'days', case when v_p.pet_stage = 0 then 0
                 else public.pet_days(v_uid, coalesce(v_p.pet_start, (v_p.born_at at time zone 'Asia/Seoul')::date)) end,
    'adult_days', v_adult_days, 'grad_days', grad_days,
    'can_graduate', v_p.pet_stage = 3 and v_adult_days >= grad_days,
    'need', v_need,
    'dex', v_dex
  );
end;
$$;

-- 졸업: 도감에 남기고 다음 세대 알로
create function public.graduate_pet()
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_pet jsonb;
  v_row public.pets;
  v_p public.players;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  v_pet := public.get_pet();
  if not (v_pet ->> 'can_graduate')::boolean then raise exception 'not ready to graduate'; end if;
  select * into v_p from public.players where uid = v_uid for update;

  insert into public.pets (uid, gen, form, days, stats_start, stats_end, born_on)
  values (v_uid, v_p.pet_gen, v_p.pet_form, (v_pet ->> 'days')::integer, coalesce(v_p.gen_stats, v_p.baseline),
          (select jsonb_object_agg(stat, value) from public.stat_values(v_uid)),
          coalesce(v_p.pet_start, (v_p.born_at at time zone 'Asia/Seoul')::date))
  returning * into v_row;

  update public.players
  set pet_stage = 0, pet_form = null, pet_focus = null, pet_gen = pet_gen + 1, pet_start = null, adult_on = null, gen_stats = null
  where uid = v_uid;

  return to_jsonb(v_row) - 'uid' - 'id';
end;
$$;

-- 새 알 고르기 (2세대부터). 고르면 바로 부화한다.
create function public.choose_egg(p_focus text)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_p public.players;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  select * into v_p from public.players where uid = v_uid for update;
  if v_p.pet_stage <> 0 or v_p.pet_gen < 2 then raise exception 'no egg to choose'; end if;
  if p_focus not in ('shield', 'credit', 'home', 'flow', 'legend') then raise exception 'unknown egg'; end if;
  if p_focus = 'legend' and (select count(distinct form) from public.pets where uid = v_uid and form <> 'legend') < 4 then
    raise exception 'legend egg locked';
  end if;

  update public.players
  set pet_focus = p_focus, pet_stage = 1, pet_start = public.kst_today(), born_at = now(),
      gen_stats = (select jsonb_object_agg(stat, value) from public.stat_values(v_uid))
  where uid = v_uid;
  return jsonb_build_object('stage', 1, 'focus', p_focus);
end;
$$;

-- 홈에 세대·알 정보 추가 (나머지는 init 과 같음)
create or replace function public.get_home()
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
    'pet', jsonb_build_object('stage', v_player.pet_stage, 'form', v_player.pet_form, 'born_at', v_player.born_at,
                              'gen', v_player.pet_gen, 'focus', v_player.pet_focus),
    'baseline', v_player.baseline,
    'stats', (select jsonb_object_agg(stat, value) from public.stat_values(v_uid)),
    'points', (select coalesce(sum(delta), 0) from public.point_ledger where uid = v_uid),
    'today', public.kst_today()
  );
end;
$$;

revoke execute on function public.pet_days(uuid, date) from public, anon, authenticated;
revoke execute on function public.get_pet(), public.graduate_pet(), public.choose_egg(text) from public, anon;
grant execute on function public.get_pet(), public.graduate_pet(), public.choose_egg(text) to authenticated;
