import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router'
import { useChooseEgg, useHome, usePet } from '../api/game'
import { Bubble } from '../components/ui/Bubble'
import { Button } from '../components/ui/Button'
import { PixelBar } from '../components/ui/PixelBar'
import { PixelIcon } from '../components/ui/PixelIcon'
import { eggInfo, FOCUS_MIN, FORM_LABEL, FORMS, LEGEND_MIN, STAT_KEYS, STAT_META, type StatKey } from '../domain/stats'
import { store } from '../lib/store'

// 졸업 뒤 새 알 고르기: 키울 힘을 고르고, 그 힘을 기준까지 올리면 그 모습으로 자란다
export default function Egg() {
  const navigate = useNavigate()
  const { data: home } = useHome()
  const { data: pet } = usePet()
  const choose = useChooseEgg()
  const [pick, setPick] = useState<string | null>(null)

  if (!home || !pet) return <main className="grid flex-1 place-items-center text-[13px] text-ink-3">불러오는 중…</main>
  if (home.pet.stage !== 0 || home.pet.gen < 2) return <Navigate to="/" replace />

  const collected = new Set(pet.dex.map((d) => d.form))
  const legendOpen = STAT_KEYS.every((k) => collected.has(k))
  // 추천: 아직 도감에 없는 모습 중 가장 약한 힘 (다 모았으면 레전드, 아니면 가장 약한 힘)
  const missing = STAT_KEYS.filter((k) => !collected.has(k))
  const pool = missing.length ? missing : legendOpen && !collected.has('legend') ? [] : STAT_KEYS
  const recommended: string = pool.length ? pool.reduce((a, b) => (home.stats[b] < home.stats[a] ? b : a)) : 'legend'
  const selected = pick ?? recommended

  const start = () =>
    choose.mutate(selected, {
      onSuccess: () => {
        store.set('evolved', { stage: 1, form: null })
        navigate('/', { replace: true })
      },
    })

  return (
    <main className="flex flex-1 flex-col gap-4 px-1.5 pt-6">
      <Bubble>
        {pet.gen}세대 알을 골라줘! 고른 힘을 키우면 그 모습으로 자라. 약한 힘일수록 도감 채우기에 좋아.
      </Bubble>
      <ul className="grid grid-cols-2 gap-2">
        {FORMS.map((f) => {
          const locked = f === 'legend' && !legendOpen
          const value = f === 'legend' ? Math.min(...STAT_KEYS.map((k) => home.stats[k])) : home.stats[f as StatKey]
          const min = f === 'legend' ? LEGEND_MIN : FOCUS_MIN
          const info = eggInfo(f)
          return (
            <li key={f} className={f === 'legend' ? 'col-span-2' : ''}>
              <button
                type="button"
                disabled={locked}
                onClick={() => setPick(f)}
                aria-pressed={selected === f}
                className={`grid w-full gap-2 rounded-[13px] bg-card p-3 text-left text-card-ink transition disabled:opacity-40 ${
                  selected === f ? 'shadow-glow ring-4 ring-lime' : ''
                }`}
              >
                <span className="flex items-center gap-2 text-[14px] font-bold whitespace-nowrap">
                  <PixelIcon name={f === 'legend' ? 'sparkle' : STAT_META[f as StatKey].icon} size={22} />
                  {info.egg}
                </span>
                {(f === recommended || collected.has(f)) && (
                  <span className="flex gap-1">
                    {f === recommended && <span className="rounded-[4px] bg-black px-1.5 py-0.5 text-[10px] font-bold text-lime">추천</span>}
                    {collected.has(f) && <span className="rounded-[4px] bg-line px-1.5 py-0.5 text-[10px] text-white">도감에 있음</span>}
                  </span>
                )}
                <span className="text-[11px] text-card-ink-2">
                  {locked ? '네 모습을 모두 모으면 열려' : `${info.rule} → ${FORM_LABEL[f]}`}
                </span>
                {!locked && (
                  <>
                    <PixelBar value={value} height={14} tone={value >= min ? 'lime' : 'gold'} label={`${info.egg} 지금 힘`} />
                    <span className="text-[11px] tabular-nums text-card-ink-2">
                      지금 {value} / {min}
                    </span>
                  </>
                )}
              </button>
            </li>
          )
        })}
      </ul>
      <div className="action-bar">
        {choose.isError && <p className="mb-2 text-center text-[12px] text-orange">알을 고르지 못했어. 다시 눌러줘.</p>}
        <Button className="shadow-glow-lg" disabled={choose.isPending} onClick={start}>
          {eggInfo(selected).egg}로 시작하기
        </Button>
      </div>
    </main>
  )
}
