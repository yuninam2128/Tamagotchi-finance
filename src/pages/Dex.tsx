import { useNavigate } from 'react-router'
import { usePet, type DexEntry } from '../api/game'
import { petSprite } from '../components/pet/sprites'
import { PixelBar } from '../components/ui/PixelBar'
import { PixelIcon } from '../components/ui/PixelIcon'
import { eggInfo, FORM_LABEL, FORMS, STAT_KEYS, STAT_META, type StatKey } from '../domain/stats'

// 도감: 졸업한 지갑몬. 모습별 한 칸, 같은 모습을 여러 번 졸업시키면 가장 최근 세대를 보여준다.
export default function Dex() {
  const navigate = useNavigate()
  const { data: pet } = usePet()
  const byForm = new Map<string, DexEntry>()
  for (const d of pet?.dex ?? []) byForm.set(d.form, d)
  const count = FORMS.filter((f) => byForm.has(f)).length

  return (
    <main className="flex flex-1 flex-col gap-5 px-1.5 pt-[20px] pb-[45px]">
      <header className="flex items-center gap-3">
        <button type="button" onClick={() => navigate('/')} className="px-1 text-[18px] text-ink-2" aria-label="뒤로">
          ←
        </button>
        <h1 className="flex-1 text-[18px] font-bold">도감</h1>
        <span className="text-[13px] tabular-nums text-lime">
          {count}/{FORMS.length}
        </span>
      </header>
      <PixelBar value={(count / FORMS.length) * 100} height={22} label="도감 진행도" />

      <ul className="grid grid-cols-2 gap-2">
        {FORMS.map((f) => {
          const d = byForm.get(f)
          return (
            <li key={f} className={`rounded-[13px] p-3 ${d ? 'bg-card text-card-ink' : 'border border-line'} ${f === 'legend' ? 'col-span-2' : ''}`}>
              {d ? (
                <div className={`grid gap-2 ${f === 'legend' ? 'grid-cols-[120px_1fr] items-center' : ''}`}>
                  <img src={petSprite(3, f)} alt={FORM_LABEL[f]} className="pixel aspect-square w-full rounded-[10px]" />
                  <div className="grid gap-1">
                    <p className="text-[14px] font-bold">{FORM_LABEL[f]}</p>
                    <p className="text-[11px] text-card-ink-2">
                      {d.gen}세대 · 함께한 {d.days}일
                    </p>
                    <Growth entry={d} focus={f} />
                  </div>
                </div>
              ) : (
                <div className="grid min-h-[150px] place-items-center gap-1 text-center">
                  <span className="text-[34px] font-bold text-ink-3">?</span>
                  <p className="text-[12px] font-bold text-ink-2">{FORM_LABEL[f]}</p>
                  <p className="text-[11px] leading-[1.5] text-ink-3">
                    {eggInfo(f).egg}로 키워서
                    <br />
                    {eggInfo(f).rule}
                  </p>
                </div>
              )}
            </li>
          )
        })}
      </ul>
      <p className="text-center text-[12px] leading-[1.6] text-ink-3">
        성체로 7일을 돌보면 졸업해서 도감에 남아.
        <br />
        배운 숙련도는 다음 알에게 그대로 이어져.
      </p>
    </main>
  )
}

/** 이 세대에서 가장 많이 자란 힘 (모습의 힘을 먼저) */
function Growth({ entry, focus }: { entry: DexEntry; focus: string }) {
  if (!entry.stats_start || !entry.stats_end) return null
  const keys: StatKey[] = focus === 'legend' ? STAT_KEYS : [focus as StatKey]
  return (
    <ul className="grid gap-0.5 text-[11px] tabular-nums">
      {keys.map((k) => (
        <li key={k} className="flex items-center gap-1.5">
          <PixelIcon name={STAT_META[k].icon} size={14} />
          {STAT_META[k].label} {entry.stats_start![k]} → {entry.stats_end![k]}
        </li>
      ))}
    </ul>
  )
}
