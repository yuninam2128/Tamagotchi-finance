// 지갑몬이 모으는 돈. 1원 = 서버 포인트 1. 아직 현금 가치는 없고(교환 준비 중) 화면 단위만 원으로 쓴다.
export const won = (n: number) => `${n.toLocaleString('ko-KR')}원`
export const signedWon = (n: number) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${Math.abs(n).toLocaleString('ko-KR')}원`

/** 지갑 화면의 교환 목표. 브랜드 없이 일반 상품으로만 보여준다. */
export const REWARDS = [
  { id: 'icecream', name: '편의점 아이스크림', price: 1500 },
  { id: 'coffee', name: '편의점 아메리카노', price: 2000 },
  { id: 'movie', name: '영화 관람권', price: 10000 },
] as const
export type Reward = (typeof REWARDS)[number]

/** 받침에 맞는 조사: '철벽형이', '집지킴이가' */
export function iga(word: string) {
  const code = word.charCodeAt(word.length - 1) - 0xac00
  if (code < 0 || code > 11171) return `${word}(이)가`
  return `${word}${code % 28 === 0 ? '가' : '이'}`
}

/** 받침에 맞는 조사: '철벽형으로', '아기로' */
export function ro(word: string) {
  const code = word.charCodeAt(word.length - 1) - 0xac00
  if (code < 0 || code > 11171) return `${word}(으)로`
  const jong = code % 28
  return `${word}${jong === 0 || jong === 8 ? '로' : '으로'}` // 8 = ㄹ 받침
}
