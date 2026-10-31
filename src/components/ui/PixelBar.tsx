// 두께감 있는 진행 바 (Figma '스킬 레퍼' 기준): 어두운 홈 + 연두 채움 + 위쪽 하이라이트 + 밝은 끝 캡.
type Tone = 'lime' | 'orange' | 'gold'

const FILL: Record<Tone, string> = {
  lime: 'bg-lime',
  orange: 'bg-orange',
  gold: 'bg-gold',
}

export function PixelBar({
  value,
  tone = 'lime',
  height = 20,
  label,
  className = '',
}: {
  value: number // 0~100
  tone?: Tone
  height?: number
  label?: string
  className?: string
}) {
  const v = Math.max(0, Math.min(100, value))
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(v)}
      aria-label={label}
      className={`relative overflow-hidden rounded-full border-2 border-[#0c1206] bg-track ${className}`}
      style={{ height }}
    >
      <div
        className={`relative h-full rounded-full transition-[width] duration-500 ${FILL[tone]}`}
        style={{ width: `${v}%`, minWidth: v > 0 ? height : 0 }}
      >
        {/* 위쪽 하이라이트 */}
        <span className="absolute inset-x-[6px] top-[3px] h-[3px] rounded-full bg-white/45" />
        {/* 끝 캡 */}
        {v > 0 && <span className="absolute top-[3px] right-[3px] bottom-[3px] w-[5px] rounded-full bg-white/80" />}
      </div>
    </div>
  )
}
