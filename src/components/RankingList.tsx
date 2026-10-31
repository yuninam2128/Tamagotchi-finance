import type { LeagueRow } from '../api/game'
import { FORM_LABEL, STAGES } from '../domain/stats'

// Figma '랭킹 레퍼': 짙은 바탕에 큰 순위 숫자 + 이름 + 오른쪽 점수
export function RankingList({ rows, compact = false }: { rows: LeagueRow[]; compact?: boolean }) {
  if (!rows.length) return <p className="py-6 text-center text-[13px] text-ink-2">아직 이번 주 기록이 없어</p>
  return (
    <ol className="grid gap-1">
      {rows.map((r) => (
        <li
          key={`${r.rank}-${r.nick}`}
          className={`flex items-center gap-3 rounded-[8px] px-3 ${compact ? 'py-1.5' : 'py-2.5'} ${r.me ? 'bg-lime/15 ring-1 ring-lime' : ''}`}
        >
          <span className={`w-9 font-bold tabular-nums ${compact ? 'text-[18px]' : 'text-[22px]'} ${r.rank <= 3 ? 'text-lime' : 'text-white'}`}>
            {String(r.rank).padStart(2, '0')}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px]">
              {r.me ? `${r.nick} (나)` : r.nick}
              {r.bot && <span className="ml-1.5 rounded-[3px] border border-ink-3 px-1 text-[10px] text-ink-3">봇</span>}
            </span>
            {!compact && (
              <span className="block text-[11px] text-ink-3">{r.form ? FORM_LABEL[r.form] : STAGES[r.stage]?.name ?? ''}</span>
            )}
          </span>
          <span className="text-[13px] tabular-nums text-ink-2">{r.score.toLocaleString('ko-KR')}P</span>
        </li>
      ))}
    </ol>
  )
}
