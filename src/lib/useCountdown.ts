import { useEffect, useState } from 'react'
import { untilNextResolve } from '../domain/forecast'

/** 다음 예보 발표(18:00 KST)까지 남은 시간을 "14시간 52분" 형태로 돌려준다. */
export function useResolveCountdown() {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(id)
  }, [])

  return untilNextResolve(now)
}
