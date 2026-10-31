// 시장 예보: 오늘 고르면 다음 거래일 결과로 채점, 매일 18시(KST) 발표.
export type Asset = 'kr' | 'fx' | 'coin'
export type Pick = 'up' | 'down'

export const ASSETS: { key: Asset; name: string; short: string; question: string; up: string; down: string }[] = [
  { key: 'kr', name: '코스피', short: '코스피', question: '다음 거래일 코스피는?', up: '오른다', down: '내린다' },
  { key: 'fx', name: '원/달러 환율', short: '환율', question: '다음 거래일 원/달러 환율은?', up: '오른다 (원화 약세)', down: '내린다 (원화 강세)' },
  { key: 'coin', name: '비트코인', short: '비트코인', question: '내일 18시 비트코인은?', up: '오른다', down: '내린다' },
]

export const RESOLVE_HOUR_KST = 18
const KST_MS = 9 * 3600_000

export function kstToday(ms = Date.now()) {
  return new Date(ms + KST_MS).toISOString().slice(0, 10)
}

export function addDays(day: string, n: number) {
  const d = new Date(day + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

/** 다음 18:00 KST 까지 남은 시간 */
export function untilNextResolve(now = Date.now()) {
  const kst = new Date(now + KST_MS)
  let target = Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth(), kst.getUTCDate(), RESOLVE_HOUR_KST) - KST_MS
  if (target <= now) target += 24 * 3600_000
  const mins = Math.ceil((target - now) / 60_000)
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return h > 0 ? `${h}시간 ${m}분` : `${m}분`
}

export function formatMove(move: number) {
  return `${move > 0 ? '+' : ''}${move.toFixed(2)}%`
}
