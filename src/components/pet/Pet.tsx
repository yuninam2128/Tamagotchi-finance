// three.js 번들(~700KB)은 홈이 뜬 다음에 받도록 지연 로딩한다.
import { lazy, Suspense } from 'react'
import type { LcdState } from './lcd'

const PetStage = lazy(() => import('./PetStage'))

export function Pet({ lcd, onTap, className = '' }: { lcd: LcdState; onTap?: () => void; className?: string }) {
  return (
    <Suspense fallback={<div className={`grid place-items-center text-[13px] text-ink-3 ${className}`}>지갑몬을 깨우는 중…</div>}>
      <PetStage lcd={lcd} onTap={onTap} className={className} />
    </Suspense>
  )
}
