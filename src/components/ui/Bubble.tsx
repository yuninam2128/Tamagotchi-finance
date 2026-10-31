import type { ReactNode } from 'react'

// 펫 말풍선 — Figma 세션 화면의 흰 둥근 사각형(253×67)
export function Bubble({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`relative min-h-[67px] rounded-[13px] bg-card px-4 py-3 text-[13px] leading-[1.6] text-card-ink shadow-[0_0_10px_0_rgba(0,0,0,0.2)] ${className}`}
    >
      {children}
      <span aria-hidden className="absolute top-1/2 -right-[7px] size-[14px] -translate-y-1/2 rotate-45 bg-card" />
    </div>
  )
}
