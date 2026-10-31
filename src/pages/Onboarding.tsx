import { useMemo, useState } from 'react'
import { Navigate, useNavigate } from 'react-router'
import { useDiagnosisItems, useHome, useSetNick, useSubmitDiagnosis, type FraudBody, type QuizBody } from '../api/game'
import { Pet } from '../components/pet/Pet'
import { Bubble } from '../components/ui/Bubble'
import { Button } from '../components/ui/Button'
import { PixelBar } from '../components/ui/PixelBar'
import { PixelIcon } from '../components/ui/PixelIcon'
import { STAT_KEYS, STAT_META, type Stats } from '../domain/stats'
import { shuffledOrder } from '../lib/shuffle'

// 첫 진단: 알 발견 → 5문제 → 부화(기준점 저장) → 닉네임
export default function Onboarding() {
  const navigate = useNavigate()
  const { data: home } = useHome()
  const { data: items } = useDiagnosisItems()
  const diagnose = useSubmitDiagnosis()
  const setNick = useSetNick()
  const [phase, setPhase] = useState<'intro' | 'quiz' | 'hatch'>('intro')
  const [idx, setIdx] = useState(0)
  const [answers, setAnswers] = useState<{ item_id: string; choice: number }[]>([])
  const [choice, setChoice] = useState<number | null>(null)
  const [baseline, setBaseline] = useState<Stats | null>(null)
  const [nick, setNickValue] = useState('')

  const item = items?.[idx]
  const order = useMemo(
    () => (!item ? [] : item.type === 'fraud' ? [0, 1] : shuffledOrder(item.body.choices.length, item.id)),
    [item],
  )

  if (home?.baseline && phase !== 'hatch') return <Navigate to="/" replace />

  if (phase === 'intro') {
    return (
      <main className="flex flex-1 flex-col gap-4 px-2 pt-6">
        <Bubble className="z-10">알을 발견했어! 5문제로 지갑몬의 성격을 정해볼게. 모르면 찍어도 괜찮아.</Bubble>
        <Pet lcd={{ stage: 0, symptoms: [], mood: 'idle', news: false }} className="-mx-4 -mt-[120px] h-[460px]" />
        <p className="text-center text-[13px] leading-[1.7] text-ink-2">
          사기 방어 · 신용 · 주거 · 돈 흐름
          <br />
          네 개의 힘으로 자라는 금융 다마고치야
        </p>
        <div className="action-bar">
          <Button className="shadow-glow-lg" disabled={!items?.length} onClick={() => setPhase('quiz')}>
            진단 시작
          </Button>
        </div>
      </main>
    )
  }

  if (phase === 'quiz' && item) {
    const next = () => {
      const all = [...answers, { item_id: item.id, choice: choice! }]
      setAnswers(all)
      setChoice(null)
      if (idx + 1 < items!.length) return setIdx(idx + 1)
      diagnose.mutate(all, {
        onSuccess: (r) => {
          setBaseline(r.baseline)
          setPhase('hatch')
        },
      })
    }
    const body = item.body as QuizBody & FraudBody
    return (
      <main className="flex flex-1 flex-col gap-5 px-2 pt-[20px]">
        <PixelBar value={(idx / items!.length) * 100} height={22} label="진단 진행도" />
        <p className="text-[12px] text-lime">진단 {idx + 1} / {items!.length}</p>
        {item.type === 'fraud' ? (
          <>
            <h1 className="text-[20px] leading-[1.4] font-bold">이 메시지, 사기일까?</h1>
            <div className="flex gap-3 rounded-[13px] bg-card p-4 text-card-ink">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-black text-[13px] font-bold text-lime">{body.avatar}</span>
              <div className="min-w-0">
                <p className="text-[11px] text-card-ink-2">{body.from}</p>
                <p className="text-[13px] leading-[1.6] break-words">{body.text}</p>
              </div>
            </div>
          </>
        ) : (
          <>
            {body.scenario && <p className="text-[13px] leading-[1.6] text-ink-2">{body.scenario}</p>}
            <h1 className="text-[20px] leading-[1.4] font-bold">{body.prompt}</h1>
          </>
        )}
        <div className={item.type === 'fraud' ? 'grid grid-cols-2 gap-2' : 'grid gap-2.5'}>
          {order.map((i) => (
            <button
              key={i}
              type="button"
              onClick={() => setChoice(i)}
              aria-pressed={choice === i}
              className={`min-h-[67px] rounded-[13px] bg-card px-4 py-3 text-[14px] leading-[1.5] text-card-ink transition ${
                item.type === 'fraud' ? 'text-center font-bold' : 'text-left'
              } ${choice === i ? 'shadow-glow ring-4 ring-lime' : ''}`}
            >
              {body.choices[i]}
            </button>
          ))}
        </div>
        <div className="action-bar">
          <Button disabled={choice === null || diagnose.isPending} onClick={next}>
            {diagnose.isPending ? '부화 중…' : diagnose.isError ? '다시 시도' : idx + 1 < items!.length ? '다음' : '결과 보기'}
          </Button>
        </div>
      </main>
    )
  }

  // 부화
  return (
    <main className="flex flex-1 flex-col gap-4 px-2 pt-6">
      <Bubble className="z-10">
        <span className="font-bold">부화했어!</span> 지금 힘은 이 정도야. 약한 쪽부터 같이 키워보자.
      </Bubble>
      <Pet lcd={{ stage: 1, symptoms: [], mood: 'happy', news: false }} className="-mx-4 -mt-[120px] h-[400px]" />
      <ul className="grid gap-3">
        {STAT_KEYS.map((k) => (
          <li key={k} className="flex items-center gap-2">
            <PixelIcon name={STAT_META[k].icon} size={22} className="w-[28px] object-contain" />
            <span className="w-9 text-[12px] font-bold">{STAT_META[k].label}</span>
            <PixelBar value={baseline?.[k] ?? 0} height={18} className="flex-1" />
            <span className="w-7 text-right text-[12px] text-ink-2">{baseline?.[k] ?? 0}</span>
          </li>
        ))}
      </ul>
      <label className="grid gap-1.5 text-[12px] text-ink-2">
        랭킹에 보일 이름 (나중에 바꿀 수 있어)
        <input
          value={nick}
          onChange={(e) => setNickValue(e.target.value.slice(0, 12))}
          placeholder="익명 예보관"
          className="h-[51px] rounded-[13px] border border-line bg-black px-4 text-[15px] text-white placeholder:text-ink-3 focus:border-lime focus:outline-none"
        />
      </label>
      <div className="action-bar">
        <Button
          className="shadow-glow-lg"
          disabled={setNick.isPending}
          onClick={async () => {
            if (nick.trim()) await setNick.mutateAsync(nick).catch(() => undefined)
            navigate('/', { replace: true })
          }}
        >
          지갑몬 돌보러 가기
        </Button>
      </div>
    </main>
  )
}
