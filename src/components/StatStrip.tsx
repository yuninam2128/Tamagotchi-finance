import { STAT_KEYS, STAT_META, statState, type StatKey, type Stats } from '../domain/stats'
import { PixelBar } from './ui/PixelBar'
import { PixelIcon } from './ui/PixelIcon'

const TONE = { sick: 'orange', symptom: 'gold', ok: 'lime' } as const

// 방어·신용·주거·흐름. 누르면 스탯 상세 시트(하위 스킬 숙련도 + 집중 치료)를 연다.
export function StatStrip({ stats, onSelect }: { stats: Stats; onSelect: (stat: StatKey) => void }) {
  return (
    <ul className="grid grid-cols-2 gap-x-4 gap-y-3">
      {STAT_KEYS.map((k) => {
        const value = stats[k]
        const state = statState(value)
        return (
          <li key={k}>
            <button
              type="button"
              onClick={() => onSelect(k)}
              className="flex w-full items-center gap-2 text-left"
              aria-label={`${STAT_META[k].label} ${value}${state === 'sick' ? ', 아픔' : ''}. 자세히 보기`}
            >
              <PixelIcon name={STAT_META[k].icon} size={26} className="w-[30px] object-contain" />
              <span className="grid flex-1 gap-1">
                <span className="flex justify-between text-[11px] leading-none">
                  <span className="font-bold">{STAT_META[k].label}</span>
                  <span className={state === 'sick' ? 'text-orange' : 'text-ink-2'}>{state === 'sick' ? '아픔' : value}</span>
                </span>
                <PixelBar value={value} tone={TONE[state]} height={18} />
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
