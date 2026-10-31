import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useInvalidateGame, useLedger, useMySkills, useNews, useSubmitForecast, type Forecast, type Graduation } from '../api/game'
import { ASSETS, formatMove, type Asset, type Pick } from '../domain/forecast'
import { REWARDS, signedWon, won, type Reward } from '../domain/money'
import { DEMO } from '../lib/demo'
import { FORM_LABEL, STAT_KEYS, STAGES, STAT_META, statState, type StatKey, type Stats } from '../domain/stats'
import { petTitle } from '../lib/shareCard'
import { ForecastStamps } from './ForecastStamps'
import { petSprite } from './pet/sprites'
import { ShareCardButton } from './ShareCardButton'
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
  redemption: '교환',
}

/** 지갑: 모은 돈 + 교환 목표 + 거래내역. 실제 교환은 아직 열지 않았고, 시연 모드에서만 쿠폰까지 받아볼 수 있다. */
export function WalletSheet({
  open,
  points,
  onClose,
  onRedeemed,
}: {
  open: boolean
  points: number
  onClose: () => void
  onRedeemed?: () => void // 시연: 교환권을 확인하면 다음 장면으로
}) {
  const { data: rows } = useLedger()
  const invalidate = useInvalidateGame()
  const [coupon, setCoupon] = useState<Reward | null>(null)

  async function redeem(r: Reward) {
    const { demoControls } = await import('../demo/api')
    demoControls.redeem(r.name, r.price)
    await invalidate()
    setCoupon(r)
  }

  const close = () => {
    setCoupon(null)
    onClose()
  }

  return (
    <Sheet open={open} onClose={close} title={coupon ? '교환 완료' : '내 지갑'}>
      {coupon ? (
        <Coupon
          reward={coupon}
          onDone={() => {
            close()
            onRedeemed?.()
          }}
        />
      ) : (
        <div className="grid gap-4">
          <p className="flex items-center gap-2 text-[26px] font-bold tabular-nums">
            <PixelIcon name="coin" size={32} />
            {won(points)}
          </p>
          <ul className="grid gap-3">
            {REWARDS.map((r) => {
              const left = r.price - points
              return (
                <li key={r.id} className="grid gap-1.5 rounded-[13px] bg-card p-3 text-card-ink">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="text-[13px] font-bold">{r.name}</span>
                    <span className="text-[12px] tabular-nums">{won(r.price)}</span>
                  </span>
                  <PixelBar value={Math.min(100, (points / r.price) * 100)} height={16} label={`${r.name}까지`} />
                  <span className="flex items-center justify-between gap-2 text-[11px] text-card-ink-2">
                    {left > 0 ? `${won(left)} 남았어` : '모았어!'}
                    {DEMO ? (
                      <button
                        type="button"
                        disabled={left > 0}
                        onClick={() => redeem(r)}
                        className="rounded-[8px] bg-black px-3 py-1.5 text-[12px] font-bold text-lime disabled:opacity-30"
                      >
                        교환하기
                      </button>
                    ) : (
                      <span>교환 준비 중</span>
                    )}
                  </span>
                </li>
              )
            })}
          </ul>
          {!DEMO && (
            <p className="text-[11px] leading-[1.6] text-ink-3">교환은 아직 열리지 않았어. 모은 돈은 지갑에 그대로 쌓여.</p>
          )}
          <section>
            <h3 className="mb-2 text-[12px] text-ink-2">거래내역</h3>
            <ul className="grid max-h-[30dvh] gap-2 overflow-y-auto text-[12px]">
              {rows?.map((r) => (
                <li key={r.id} className="flex justify-between gap-3 border-b border-line pb-2">
                  <span className="text-ink-2">
                    {new Date(r.ts).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })} · {REASON_LABEL[r.reason] ?? r.reason}
                    {r.reason === 'redemption' && r.ref_id ? ` (${r.ref_id})` : ''}
                  </span>
                  <span className={`tabular-nums ${r.delta > 0 ? 'text-lime' : 'text-orange'}`}>{signedWon(r.delta)}</span>
                </li>
              ))}
              {rows && !rows.length && <li className="text-ink-3">아직 기록이 없어</li>}
            </ul>
          </section>
        </div>
      )}
    </Sheet>
  )
}

/** 시연용 교환 쿠폰. 실제로 쓸 수 없다는 걸 분명히 적는다. */
function Coupon({ reward, onDone }: { reward: Reward; onDone: () => void }) {
  // 바코드 모양만 낸다 (상품명으로 고정된 무늬)
  const bars = Array.from({ length: 42 }, (_, i) => ((reward.id.charCodeAt(i % reward.id.length) * (i + 7)) % 4) + 1)
  const [until] = useState(() => new Date(Date.now() + 30 * 86400_000).toLocaleDateString('ko-KR'))
  return (
    <div className="grid gap-4">
      <div className="animate-pop rounded-[13px] bg-card p-5 text-center text-card-ink">
        <p className="text-[11px] text-card-ink-2">지갑몬 교환권</p>
        <p className="mt-1 text-[18px] font-bold">{reward.name}</p>
        <div className="mx-auto mt-4 flex h-[64px] w-fit items-stretch gap-[2px]" aria-hidden>
          {bars.map((w, i) => (
            <span key={i} className={i % 2 ? 'bg-transparent' : 'bg-black'} style={{ width: w * 2 }} />
          ))}
        </div>
        <p className="mt-2 text-[11px] tracking-[0.2em] tabular-nums">0000 0000 0000</p>
        <p className="mt-3 text-[11px] text-card-ink-2">유효기간 {until}까지</p>
      </div>
      <p className="text-center text-[11px] leading-[1.6] text-orange">시연용 쿠폰이라 실제로는 쓸 수 없어.</p>
      <Button onClick={onDone}>확인</Button>
    </div>
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

/** 홈 우표를 눌러 오늘 예보를 고르거나 바꾼다. 다음 거래일 결과로 채점하니 오늘 자정까지는 바꿔도 공정하다. */
export function ForecastPickSheet({ asset, current, onClose }: { asset: Asset | null; current: Pick | undefined; onClose: () => void }) {
  const a = ASSETS.find((x) => x.key === asset)
  const submit = useSubmitForecast()

  return (
    <Sheet open={!!a} onClose={onClose} title={a ? `${a.name} 예보` : ''}>
      {a && (
        <div className="grid gap-4">
          <p className="text-[15px] font-bold">{a.question}</p>
          <div className="grid grid-cols-2 gap-2">
            {(['up', 'down'] as const).map((p) => (
              <button
                key={p}
                type="button"
                disabled={submit.isPending}
                onClick={() => submit.mutate({ asset: a.key, pick: p }, { onSuccess: onClose })}
                aria-pressed={current === p}
                className={`flex h-[120px] flex-col items-center justify-center gap-2 rounded-[13px] bg-card text-card-ink transition ${
                  current === p ? 'shadow-glow ring-4 ring-lime' : ''
                }`}
              >
                <PixelIcon name={p === 'up' ? 'arrow-up' : 'arrow-down'} size={48} />
                <span className="text-[12px] font-bold">{p === 'up' ? a.up : a.down}</span>
              </button>
            ))}
          </div>
          <p className="text-center text-[12px] leading-[1.6] text-ink-2">
            {current ? '오늘 자정까지는 바꿀 수 있어.' : '고르면 참여 보상 +2원.'} 결과는 다음 거래일 기준, 18시에 발표해.
          </p>
          {submit.isError && <p className="text-center text-[12px] text-orange">저장하지 못했어. 다시 눌러줘.</p>}
        </div>
      )}
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
          {rows.filter((r) => r.hit).length}/{rows.length} 적중 {gained > 0 && <span className="text-lime">+{won(gained)}</span>}
        </p>
        <Button onClick={onClose}>확인</Button>
      </div>
    </Sheet>
  )
}

export function EvolveModal({ evolved, onClose }: { evolved: { stage: number; form: string | null } | null; onClose: () => void }) {
  const title = evolved ? petTitle(evolved.stage, evolved.form) : ''

  return (
    <Sheet open={!!evolved} onClose={onClose} title="진화!" center>
      {evolved && (
        <div className="grid gap-4 text-center">
          <div className="relative mx-auto">
            <img src={petSprite(evolved.stage, evolved.form)} alt={title} className="pixel animate-pop size-[168px] rounded-[20px] border-[6px] border-lime" />
            <PixelIcon name="sparkle" size={36} className="absolute -top-4 -right-4 animate-pop" />
          </div>
          <p className="text-[18px] font-bold text-lime">{title}</p>
          <p className="text-[13px] text-ink-2">{STAGES[evolved.stage]?.next ?? '가장 높은 스탯이 성체 모습을 정했어.'}</p>
          <ShareCardButton label="친구에게 자랑하기" />
          <Button variant="ghost" onClick={onClose}>
            닫기
          </Button>
        </div>
      )}
    </Sheet>
  )
}

/** 졸업식: 도감에 남기고 새 알로. 졸업 카드를 공유할 수 있다. */
export function GraduateModal({ graduation, onNext }: { graduation: Graduation | null; onNext: () => void }) {
  const g = graduation
  return (
    <Sheet open={!!g} onClose={onNext} title="졸업식" center>
      {g && (
        <div className="grid gap-4 text-center">
          <div className="relative mx-auto">
            <img src={petSprite(3, g.form)} alt={FORM_LABEL[g.form]} className="pixel animate-pop size-[150px] rounded-[20px] border-[6px] border-lime" />
            <PixelIcon name="sparkle" size={36} className="absolute -top-4 -left-4 animate-pop" />
            <PixelIcon name="sparkle" size={28} className="absolute -right-3 -bottom-3 animate-pop" />
          </div>
          <div>
            <p className="text-[18px] font-bold text-lime">{FORM_LABEL[g.form]} 지갑몬 졸업!</p>
            <p className="mt-1 text-[12px] text-ink-2">
              {g.gen}세대 · 함께한 {g.days}일
            </p>
          </div>
          {g.stats_start && g.stats_end && (
            <ul className="mx-auto grid w-full max-w-[260px] gap-1 text-[13px]">
              {STAT_KEYS.map((k) => (
                <li key={k} className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <PixelIcon name={STAT_META[k].icon} size={18} />
                    {STAT_META[k].label}
                  </span>
                  <span className={`tabular-nums ${g.stats_end![k] > g.stats_start![k] ? 'text-lime' : 'text-ink-2'}`}>
                    {g.stats_start![k]} → {g.stats_end![k]}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <p className="text-[12px] leading-[1.6] text-ink-2">도감에 남았어. 배운 건 다음 알에게 그대로 이어져.</p>
          <ShareCardButton label="졸업 카드 공유하기" graduation={g} />
          <Button variant="ghost" onClick={onNext}>
            새 알 고르러 가기
          </Button>
        </div>
      )}
    </Sheet>
  )
}
