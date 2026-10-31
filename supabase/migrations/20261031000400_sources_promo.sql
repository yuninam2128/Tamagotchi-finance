-- 해설 출처와 제휴 상품 표기.
-- sources: [{kind: 'source' | 'ref', label, url}] — source 는 해설 속 통계·조항의 근거, ref 는 더 알아보기(공식 안내)
-- promo: {partner, product, summary, url, disclosure?} — 제휴 상품 연결. 화면에 '제휴' 표시와 수수료 고지를 붙인다.
alter table public.items add column sources jsonb not null default '[]';
alter table public.items add column promo jsonb;
alter table public.items drop column source_ref;

-- 채점 결과에 출처·제휴 정보를 함께 돌려준다 (나머지는 20261031000200 과 같음)
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
    'sources', v_item.sources, 'promo', v_item.promo,
    'points', v_points, 'stat', v_stat, 'before', v_before, 'after', v_after,
    'evolved', public.update_pet(v_uid)
  );
end;
$$;
