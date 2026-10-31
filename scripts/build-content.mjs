// content/*.mjs → Supabase 마이그레이션(upsert SQL) 생성
// 사용: npm run content:sql   (콘텐츠를 고칠 때마다 새 마이그레이션이 하나 생긴다)
import { writeFileSync } from 'node:fs'
import { items } from '../content/items.mjs'
import { skills } from '../content/skills.mjs'

const MIN_PER_SKILL = 3
const errors = []
const skillIds = new Set(skills.map((s) => s.id))
const seen = new Set()
for (const it of items) {
  if (seen.has(it.id)) errors.push(`중복 id: ${it.id}`)
  seen.add(it.id)
  if (!skillIds.has(it.skill)) errors.push(`${it.id}: 없는 스킬 ${it.skill}`)
  if (!(it.answer >= 0 && it.answer < it.body.choices.length)) errors.push(`${it.id}: 정답 인덱스 범위 밖`)
}
for (const s of skills) {
  const n = items.filter((it) => it.skill === s.id && it.active !== false).length
  if (n < MIN_PER_SKILL) errors.push(`${s.id}: 문제 ${n}개 (최소 ${MIN_PER_SKILL})`)
}
if (errors.length) {
  console.error(errors.join('\n'))
  process.exit(1)
}

const lit = (v) => (v == null ? 'null' : `'${String(v).replaceAll("'", "''")}'`)

const skillRows = skills.map((s, i) => `  (${lit(s.id)}, ${lit(s.stat)}, ${lit(s.name)}, ${i})`).join(',\n')
const itemRows = items
  .map((it) =>
    `  (${[lit(it.id), lit(it.type), lit(it.skill), it.difficulty ?? 1, `${lit(JSON.stringify(it.body))}::jsonb`,
      it.answer, lit(it.explanation), lit(it.source), it.diag === true, it.active !== false].join(', ')})`)
  .join(',\n')

const sql = `-- 자동 생성: scripts/build-content.mjs (직접 수정하지 말 것)
-- 스킬 ${skills.length}개, 문제 ${items.length}개

insert into public.skills (id, stat, name, sort) values
${skillRows}
on conflict (id) do update set stat = excluded.stat, name = excluded.name, sort = excluded.sort;

insert into public.items (id, type, skill_id, difficulty, body, answer, explanation, source_ref, diagnostic, active) values
${itemRows}
on conflict (id) do update set
  type = excluded.type, skill_id = excluded.skill_id, difficulty = excluded.difficulty, body = excluded.body,
  answer = excluded.answer, explanation = excluded.explanation, source_ref = excluded.source_ref,
  diagnostic = excluded.diagnostic, active = excluded.active;

-- 파일에서 빠진 문제는 비활성화 (풀이 기록이 참조하므로 지우지 않는다)
update public.items set active = false
where id not in (${items.map((it) => lit(it.id)).join(', ')});
`

const stamp = new Date().toISOString().replace(/\D/g, '').slice(0, 14)
const out = process.argv[2] ?? `supabase/migrations/${stamp}_content.sql`
writeFileSync(out, sql)
console.log(`${out} — 스킬 ${skills.length}개, 문제 ${items.length}개`)
