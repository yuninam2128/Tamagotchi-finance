import type { ButtonHTMLAttributes } from 'react'

// Figma 홈 '계속 돌보기' 버튼: 검정 바탕 + 연두 1px 테두리 + 연두 글로우.
// solid 는 정답 확인처럼 강조가 필요한 곳(연두 바탕).
type Variant = 'glow' | 'solid' | 'ghost'

const VARIANT: Record<Variant, string> = {
  glow: 'border border-lime bg-black text-white shadow-glow',
  solid: 'border border-lime bg-lime text-black',
  ghost: 'border border-line bg-black text-ink-2',
}

export function Button({
  variant = 'glow',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      type="button"
      className={`h-[51px] w-full rounded-[13px] px-4 text-[15px] leading-[1.6] font-bold transition active:translate-y-px disabled:opacity-40 disabled:shadow-none ${VARIANT[variant]} ${className}`}
      {...props}
    />
  )
}
