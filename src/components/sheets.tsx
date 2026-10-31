import { useNavigate } from 'react-router'
import { useLedger, useMySkills, useNews, type Forecast } from '../api/game'
import { ASSETS, formatMove, type Asset } from '../domain/forecast'
import { FORM_LABEL, STAGES, STAT_META, statState, type StatKey, type Stats } from '../domain/stats'
import { ForecastStamps } from './ForecastStamps'
import { Button } from './ui/Button'
import { PixelBar } from './ui/PixelBar'
import { PixelIcon } from './ui/PixelIcon'
import { Sheet } from './ui/Sheet'

/** 스탯 상세: 하위 스킬별 숙련도 + 집중 치료 */
export function StatSheet({ stat, stats, onClose }: { stat: StatKey | null; stats: Stats; onClose: () => void }) {
  const { data: skills } = useMySkills()
  const navigate = useNavigate()
  const meta = stat ? STAT_META[stat] : null
  const value = stat ? stats[stat] : 0
  const state = statState(value)

  return (
    <Sheet open={!!stat} onClose={onClose} title={meta ? `${meta.label} ${value}` : ''}>
      {stat && meta && (
        <div className="grid gap-4">
          <p className="flex items-center gap-2 text-[13px] text-ink-2">
            <PixelIcon name={meta.icon} size={22} />
            {state === 'ok' ? '튼튼해. 복습일이 지나면 서서히 떨어지니까 꾸준히 와줘.' : meta.bubble}
          </p>
          <ul className="grid gap-3">
            {skills?.filter((s) => s.stat === stat).map((s) => (
              <li key={s.skill_id} className="grid gap-1">
                <span className="flex justify-between text-[12px]">
                  <span>{s.name}</span>
                  <span className="text-ink-3">{Math.round(s.mastery * 100)}</span>
                </span>
                <PixelBar value={s.mastery * 100} height={18} tone={s.mastery < 0.15 ? 'orange' : s.mastery < 0.5 ? 'gold' : 'lime'} label={s.name} />
              </li>
            ))}
          </ul>
          <Button onClick={() => navigate(`/session?treat=${stat}`)}>집중 치료 (3문제)</Button>
        </div>
      )}
    </Sheet>
  )
}

const REASON_LABEL: Record<string, string> = {
  answer: '문제 풀이',
  forecast_submit: '예보 참여',
  forecast_hit: '예보 적중',
  redemption: '포인트 교환',
}

export function PointsSheet({ open, points, onClose }: { open: boolean; points: number; onClose: () => void }) {
  const { data: rows } = useLedger()
  return (
    <Sheet open={open} onClose={onClose} title="포인트">
      <div className="grid gap-4">
        <p className="flex items-center gap-2 text-[22px] font-bold">
          <PixelIcon name="coin" size={28} />
          {points.toLocaleString('ko-KR')}P
        </p>
        <p className="rounded-[13px] border border-line p-3 text-[12px] leading-[1.6] text-ink-2">
          포인트 교환은 제휴 준비 중이야. 모은 포인트는 그대로 쌓여.
        </p>
        <ul className="grid max-h-[40dvh] gap-2 overflow-y-auto text-[12px]">
          {rows?.map((r) => (
            <li key={r.id} className="flex justify-between gap-3">
              <span className="text-ink-2">
                {new Date(r.ts).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })} · {REASON_LABEL[r.reason] ?? r.reason}
              </span>
              <span className={r.delta > 0 ? 'text-lime' : 'text-orange'}>
                {r.delta > 0 ? '+' : ''}
                {r.delta}
              </span>
            </li>
          ))}
          {rows && !rows.length && <li className="text-ink-3">아직 기록이 없어</li>}
        </ul>
      </div>
    </Sheet>
  )
}

export function NewsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data: news } = useNews()
  return (
    <Sheet open={open} onClose={onClose} title="지갑몬이 읽은 뉴스">
      <ul className="grid max-h-[60dvh] gap-3 overflow-y-auto">
        {news?.map((n) => (
          <li key={n.id}>
            <a href={n.link} target="_blank" rel="noreferrer" className="block rounded-[13px] bg-card p-3 text-card-ink">
              <span className="block text-[13px] leading-[1.6] font-bold">{n.title}</span>
              <span className="mt-1 block text-[11px] text-card-ink-2">
                {n.source} · {new Date(n.published_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </a>
          </li>
        ))}
        {news && !news.length && <li className="text-[13px] text-ink-3">뉴스를 불러오는 중이야</li>}
      </ul>
    </Sheet>
  )
}

/** 18시 결과 발표 */
export function ResultModal({ day, forecasts, onClose }: { day: string | null; forecasts: Forecast[]; onClose: () => void }) {
  const rows = forecasts.filter((f) => f.day === day && f.resolved_at)
  const picks = Object.fromEntries(rows.map((f) => [f.asset, f.pick])) as Partial<Record<Asset, 'up' | 'down'>>
  const hits = Object.fromEntries(rows.map((f) => [f.asset, f.hit])) as Partial<Record<Asset, boolean | null>>
  const gained = rows.reduce((s, f) => s + (f.hit ? 20 : 0), 0)

  return (
    <Sheet open={!!day && rows.length > 0} onClose={onClose} title="예보 결과 발표" center>
      <div className="grid gap-4">
        <ForecastStamps picks={picks} results={hits} />
        <ul className="grid gap-1 text-[12px]">
          {ASSETS.filter((a) => picks[a.key]).map((a) => {
            const f = rows.find((r) => r.asset === a.key)!
            return (
              <li key={a.key} className="flex justify-between">
                <span>{a.name}</span>
                <span className={f.hit ? 'text-lime' : 'text-orange'}>{f.move != null ? formatMove(f.move) : '휴장'}</span>
              </li>
            )
          })}
        </ul>
        <p className="text-center text-[15px] font-bold">
          {rows.filter((r) => r.hit).length}/{rows.length} 적중 {gained > 0 && <span className="text-lime">+{gained}P</span>}
        </p>
        <Button onClick={onClose}>확인</Button>
      </div>
    </Sheet>
  )
}

export function EvolveModal({ evolved, onClose }: { evolved: { stage: number; form: string | null } | null; onClose: () => void }) {
  const title = evolved ? (evolved.form ? `${FORM_LABEL[evolved.form]} 지갑몬` : STAGES[evolved.stage]?.name) : ''

  async function share() {
    const text = `내 지갑몬이 ${title}(으)로 자랐어! 같이 키우자`
    try {
      if (navigator.share) await navigator.share({ title: '지갑몬', text, url: location.origin })
      else await navigator.clipboard.writeText(`${text} ${location.origin}`)
    } catch {
      // 사용자가 공유를 취소한 경우
    }
  }

  return (
    <Sheet open={!!evolved} onClose={onClose} title="진화!" center>
      {evolved && (
        <div className="grid gap-4 text-center">
          <PixelIcon name="sparkle" size={40} className="mx-auto animate-pop" />
          <p className="text-[18px] font-bold text-lime">{title}</p>
          <p className="text-[13px] text-ink-2">{STAGES[evolved.stage]?.next ?? '가장 높은 스탯이 성체 모습을 정했어.'}</p>
          <Button onClick={share}>친구에게 자랑하기</Button>
          <Button variant="ghost" onClick={onClose}>
            닫기
          </Button>
        </div>
      )}
    </Sheet>
  )
}
