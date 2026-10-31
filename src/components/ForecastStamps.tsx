import stamp1 from '../assets/icons/stamp-1.png'
import stamp2 from '../assets/icons/stamp-2.png'
import stamp3 from '../assets/icons/stamp-3.png'
import { ASSETS, type Asset, type Pick } from '../domain/forecast'
import { PixelIcon } from './ui/PixelIcon'

const STAMPS = [stamp1, stamp2, stamp3]

// Figma 홈(5:157) 우표 3칸: 오른다=상승 화살표, 내린다=하락 화살표, 아직 안 고름=별꽃
export function ForecastStamps({
  picks,
  results,
  onSelect,
}: {
  picks: Partial<Record<Asset, Pick>>
  results?: Partial<Record<Asset, boolean | null>> // 결과 모달에서 적중 여부 표시
  onSelect?: (asset: Asset) => void
}) {
  return (
    <ul className="grid grid-cols-3 gap-1">
      {ASSETS.map((a, i) => {
        const pick = picks[a.key]
        const hit = results?.[a.key]
        return (
          <li key={a.key}>
            <button
              type="button"
              onClick={() => onSelect?.(a.key)}
              disabled={!onSelect}
              className="relative mx-auto block aspect-[119/129] w-full max-w-[119px] disabled:cursor-default"
              aria-label={`${a.name} 예보: ${pick === 'up' ? '오른다' : pick === 'down' ? '내린다' : '아직 안 골랐어'}${
                hit == null ? '' : hit ? ', 적중' : ', 빗나감'
              }`}
            >
              <img src={STAMPS[i]} alt="" className="pixel absolute inset-0 size-full object-contain" />
              <span className="absolute inset-[17%] flex flex-col items-center justify-center gap-1">
                <PixelIcon
                  name={pick === 'up' ? 'arrow-up' : pick === 'down' ? 'arrow-down' : 'asterisk'}
                  size={pick ? 44 : 34}
                  className={`max-w-full object-contain ${hit === false ? 'opacity-40' : ''}`}
                />
                <span className="text-[10px] leading-[1.6] text-white">{a.short}</span>
              </span>
              {hit != null && (
                <span className={`absolute -top-1 -right-1 rounded-full px-1.5 text-[10px] font-bold text-black ${hit ? 'bg-lime' : 'bg-orange'}`}>
                  {hit ? '적중' : '빗나감'}
                </span>
              )}
            </button>
          </li>
        )
      })}
    </ul>
  )
}
