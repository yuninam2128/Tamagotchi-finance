import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import {
  useDailySet,
  useHome,
  useNews,
  useStartTreatment,
  useSubmitAnswer,
  useSubmitForecast,
  type AnswerResult,
  type Item,
} from '../api/game'
import { Explanation } from '../components/Explanation'
import { Bubble } from '../components/ui/Bubble'
import { Button } from '../components/ui/Button'
import { PixelBar } from '../components/ui/PixelBar'
import { PixelIcon } from '../components/ui/PixelIcon'
import { ASSETS, type Asset, type Pick } from '../domain/forecast'
import { signedWon } from '../domain/money'
import { lowestStat, reasonText, STAT_META, type StatKey } from '../domain/stats'
import { store } from '../lib/store'
import { shuffledOrder } from '../lib/shuffle'

type Step = { kind: 'forecast'; asset: Asset } | { kind: 'item'; item: Item }

export default function Session() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const treat = params.get('treat') as StatKey | null
  const { data: daily, isLoading } = useDailySet()
  const { data: news } = useNews()
  const treatment = useStartTreatment()

  // 시작할 때 한 번만 단계 목록을 만든다 (풀면서 서버 값이 바뀌어도 목록은 고정)
  const [steps, setSteps] = useState<Step[] | null>(null)
  useEffect(() => {
    if (steps || !daily) return
    if (treat) {
      if (treatment.isIdle) treatment.mutate(treat, { onSuccess: (items) => setSteps(items.map((item) => ({ kind: 'item', item }))) })
      return
    }
    const forecastSteps: Step[] = ASSETS.filter((a) => !daily.forecasts[a.key]).map((a) => ({ kind: 'forecast', asset: a.key }))
    const itemSteps: Step[] = [...daily.items, ...daily.extra].filter((i) => !i.done).map((item) => ({ kind: 'item', item }))
    setSteps([...forecastSteps, ...itemSteps])
  }, [daily, steps, treat, treatment])

  const [idx, setIdx] = useState(0)
  const [summary, setSummary] = useState({ points: 0, correct: 0, answered: 0, stats: {} as Partial<Record<StatKey, [number, number]>> })

  if (isLoading || !steps) return <Shell progress={0} onClose={() => navigate('/')}><p className="text-center text-ink-3">문제를 고르는 중…</p></Shell>

  const total = steps.length
  if (!total || idx >= total) {
    return <Finish summary={summary} treat={treat} empty={!total} onHome={() => navigate('/')} />
  }

  const step = steps[idx]
  const next = () => setIdx((i) => i + 1)
  const intro = idx === 0 && !treat && daily ? reasonText(daily.reasons) : null

  return (
    <Shell progress={(idx / total) * 100} onClose={() => navigate('/')}>
      {step.kind === 'forecast' ? (
        <ForecastStep
          key={step.asset}
          asset={step.asset}
          intro={intro}
          headline={news?.[idx % Math.max(1, news.length)]?.title}
          onDone={(points) => {
            setSummary((s) => ({ ...s, points: s.points + points }))
            next()
          }}
        />
      ) : (
        <ItemStep
          key={step.item.id}
          item={step.item}
          intro={intro}
          onDone={(r) => {
            setSummary((s) => ({
              points: s.points + r.points,
              correct: s.correct + (r.correct ? 1 : 0),
              answered: s.answered + 1,
              stats: { ...s.stats, [r.stat]: [s.stats[r.stat]?.[0] ?? r.before, r.after] },
            }))
            if (r.evolved) store.set('evolved', r.evolved)
            next()
          }}
        />
      )}
    </Shell>
  )
}

function Shell({ progress, onClose, children }: { progress: number; onClose: () => void; children: React.ReactNode }) {
  return (
    <main className="flex flex-1 flex-col gap-5 px-2 pt-[20px] pb-[calc(24px+env(safe-area-inset-bottom))]">
      <div className="flex items-center gap-3">
        <button type="button" onClick={onClose} aria-label="그만하기" className="px-1 text-[18px] leading-none text-ink-2">
          ✕
        </button>
        <PixelBar value={progress} height={22} className="flex-1" label="진행도" />
      </div>
      {children}
    </main>
  )
}

/** 펫 말풍선 + 코인 (Figma 세션 상단) */
function Speech({ children, gain = 0 }: { children: React.ReactNode; gain?: number }) {
  return (
    <div className="flex items-center gap-3">
      <Bubble className="flex-1">{children}</Bubble>
      <span className="relative ml-1">
        <PixelIcon key={gain} name="coin" size={56} className={gain > 0 ? 'animate-pop' : ''} />
        {gain > 0 && (
          <span className="animate-rise absolute -top-5 left-1/2 -translate-x-1/2 text-[13px] font-bold whitespace-nowrap text-lime">
            {signedWon(gain)}
          </span>
        )}
      </span>
    </div>
  )
}

function ForecastStep({ asset, intro, headline, onDone }: { asset: Asset; intro: string | null; headline?: string; onDone: (points: number) => void }) {
  const a = ASSETS.find((x) => x.key === asset)!
  const [pick, setPick] = useState<Pick | null>(null)
  const submit = useSubmitForecast()

  return (
    <>
      <Speech>
        {intro ?? '오늘 고르면 다음 거래일 결과로 채점해. 발표는 18시!'}
        {headline && <span className="mt-1 block text-[11px] text-card-ink-2">뉴스: {headline}</span>}
      </Speech>
      <h1 className="mt-6 text-center text-[20px] leading-[1.4] font-bold">{a.question}</h1>
      <div className="grid grid-cols-2 gap-2">
        {(['up', 'down'] as const).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setPick(p)}
            aria-pressed={pick === p}
            className={`flex aspect-[154/150] flex-col items-center justify-center gap-3 rounded-[13px] bg-card text-card-ink transition ${
              pick === p ? 'shadow-glow ring-4 ring-lime' : ''
            }`}
          >
            <PixelIcon name={p === 'up' ? 'arrow-up' : 'arrow-down'} size={64} />
            <span className="text-[12px] font-bold">{p === 'up' ? a.up : a.down}</span>
          </button>
        ))}
      </div>
      <div className="mt-auto">
        <Button
          disabled={!pick || submit.isPending}
          onClick={() => pick && submit.mutate({ asset, pick }, { onSuccess: (r) => onDone(r.points) })}
        >
          {submit.isError ? '다시 시도' : '계속하기'}
        </Button>
      </div>
    </>
  )
}

function ItemStep({ item, intro, onDone }: { item: Item; intro: string | null; onDone: (r: AnswerResult) => void }) {
  const [choice, setChoice] = useState<number | null>(null)
  const [result, setResult] = useState<AnswerResult | null>(null)
  const submit = useSubmitAnswer()
  const started = useRef(0)
  useEffect(() => {
    started.current = Date.now()
  }, [])
  // 사기/정상 버튼은 순서를 고정하고, 나머지 보기는 섞는다
  const order = useMemo(() => (item.type === 'fraud' ? [0, 1] : shuffledOrder(item.body.choices.length, item.id)), [item])
  const meta = STAT_META[item.stat]

  const check = () =>
    choice !== null &&
    submit.mutate({ itemId: item.id, choice, ms: Date.now() - started.current }, { onSuccess: setResult })

  const optionClass = (i: number) => {
    if (!result) return choice === i ? 'shadow-glow ring-4 ring-lime' : ''
    if (i === result.answer) return 'bg-lime'
    if (i === choice) return 'bg-orange'
    return 'opacity-50'
  }

  return (
    <>
      <Speech gain={result?.points}>
        {result ? (
          <>
            <span className="font-bold">{result.correct ? '정답!' : '아쉬워!'}</span> {meta.label} {result.before}→{result.after}
            {result.points > 0 && <span className="text-lime-dark"> {signedWon(result.points)} 벌었어</span>}
          </>
        ) : (
          intro ?? `이 문제를 풀면 +${meta.label}`
        )}
      </Speech>

      <span className="flex items-center gap-1.5 text-[11px] text-lime">
        <PixelIcon name={meta.icon} size={16} />+{meta.label}
      </span>

      {item.type === 'fraud' ? (
        <>
          <h1 className="text-[20px] leading-[1.4] font-bold">이 메시지, 사기일까?</h1>
          <div className="flex gap-3 rounded-[13px] bg-card p-4 text-card-ink">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-black text-[13px] font-bold text-lime">{item.body.avatar}</span>
            <div className="min-w-0">
              <p className="text-[11px] text-card-ink-2">{item.body.from}</p>
              <p className="text-[13px] leading-[1.6] break-words">{item.body.text}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {order.map((i) => (
              <button
                key={i}
                type="button"
                disabled={!!result}
                onClick={() => setChoice(i)}
                aria-pressed={choice === i}
                className={`h-[67px] rounded-[13px] bg-card text-[15px] font-bold text-card-ink transition disabled:cursor-default ${optionClass(i)}`}
              >
                {item.body.choices[i]}
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          {item.type === 'case' && item.body.scenario && <p className="text-[13px] leading-[1.6] text-ink-2">{item.body.scenario}</p>}
          <h1 className="text-[20px] leading-[1.4] font-bold">{item.body.prompt}</h1>
          <div className="grid gap-2.5">
            {order.map((i) => (
              <button
                key={i}
                type="button"
                disabled={!!result}
                onClick={() => setChoice(i)}
                aria-pressed={choice === i}
                className={`min-h-[67px] rounded-[13px] bg-card px-4 py-3 text-left text-[14px] leading-[1.5] text-card-ink transition disabled:cursor-default ${optionClass(i)}`}
              >
                {item.body.choices[i]}
              </button>
            ))}
          </div>
        </>
      )}

      {result && <Explanation text={result.explanation} sources={result.sources ?? []} promo={result.promo ?? null} />}

      <div className="mt-auto pt-2">
        {result ? (
          <Button onClick={() => onDone(result)}>계속하기</Button>
        ) : (
          <Button disabled={choice === null || submit.isPending} onClick={check}>
            {submit.isError ? '다시 시도' : '정답 확인'}
          </Button>
        )}
      </div>
    </>
  )
}

function Finish({
  summary,
  treat,
  empty,
  onHome,
}: {
  summary: { points: number; correct: number; answered: number; stats: Partial<Record<StatKey, [number, number]>> }
  treat: StatKey | null
  empty: boolean
  onHome: () => void
}) {
  const navigate = useNavigate()
  const { data: home } = useHome()
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-5 px-4 text-center">
      <PixelIcon name="sparkle" size={44} className="animate-pop" />
      <h1 className="text-[20px] font-bold">{empty ? '오늘 돌봄은 다 끝났어!' : treat ? '치료 끝!' : '오늘 돌봄 완료!'}</h1>
      {!empty && (
        <p className="text-[13px] text-ink-2">
          {summary.answered}문제 중 {summary.correct}개 정답 · <span className="text-lime">{signedWon(summary.points)} 벌었어</span>
        </p>
      )}
      <ul className="grid w-full max-w-[280px] gap-2">
        {Object.entries(summary.stats).map(([k, [from, to]]) => (
          <li key={k} className="flex items-center justify-between text-[13px]">
            <span className="flex items-center gap-2">
              <PixelIcon name={STAT_META[k as StatKey].icon} size={20} />
              {STAT_META[k as StatKey].label}
            </span>
            <span className={to >= from ? 'text-lime' : 'text-orange'}>
              {from} → {to}
            </span>
          </li>
        ))}
      </ul>
      <p className="text-[12px] text-ink-3">예보 결과는 18시에 발표돼.</p>
      <div className="grid w-full gap-2">
        <Button onClick={onHome}>홈으로</Button>
        {empty && (
          <Button variant="ghost" onClick={() => home && navigate(`/session?treat=${lowestStat(home.stats)}`)}>
            약한 스탯 집중 치료하러 가기
          </Button>
        )}
      </div>
    </main>
  )
}
