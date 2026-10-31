// 펫 스탯 = 약점 지표. 값은 서버(stat_values)가 계산하고, 여기는 표시 규칙만 둔다.
import type { IconName } from '../components/ui/PixelIcon'

export type StatKey = 'shield' | 'credit' | 'home' | 'flow'
export type Stats = Record<StatKey, number>

export const STAT_KEYS: StatKey[] = ['shield', 'credit', 'home', 'flow']

/** 이 값 미만이면 '아픔' 상태. 죽지 않고 치료 세션으로 회복한다. */
export const SICK_BELOW = 15
/** 이 값 미만이면 LCD 증상이 보인다. */
export const SYMPTOM_BELOW = 50

export type Symptom = 'bugs' | 'chain' | 'leak' | 'wallet'

export const STAT_META: Record<StatKey, {
  label: string
  icon: IconName
  symptom: Symptom // LCD 증상
  bubble: string // 가장 약할 때 말풍선
  cause: string // "오늘 ○○ 방어 문제가 2개야"
  form: string // 이 스탯이 가장 높을 때 성체 칭호
}> = {
  shield: { label: '방어', icon: 'sword', symptom: 'bugs', bubble: '벌레가 붙었어… 요즘 사기 문자 공부 안 했지?', cause: '벌레가 많아서', form: '철벽형' },
  credit: { label: '신용', icon: 'heart', symptom: 'chain', bubble: '몸이 사슬에 묶였어… 신용 관리 좀 같이 하자.', cause: '사슬이 무거워서', form: '신용왕' },
  home: { label: '주거', icon: 'clover', symptom: 'leak', bubble: '지붕에서 비가 새… 집 계약 공부가 필요해.', cause: '지붕이 새서', form: '집지킴이' },
  flow: { label: '흐름', icon: 'waves', symptom: 'wallet', bubble: '지갑에 구멍이 났어… 돈이 줄줄 새고 있어.', cause: '지갑이 새서', form: '저축왕' },
}

export const FORM_LABEL: Record<string, string> = {
  ...Object.fromEntries(STAT_KEYS.map((k) => [k, STAT_META[k].form])),
  legend: '레전드',
}

/** 알(0) → 부화(1) → 새끼(2) → 성체(3). 진화 조건은 서버 update_pet 과 같다. */
export const STAGES = [
  { name: '알', next: '5문제 진단을 마치면 부화해' },
  { name: '아기', next: '3일 돌보면 자라' },
  { name: '새끼', next: '10일 돌보면 성체가 돼' },
  { name: '성체', next: null },
] as const

export type StatState = 'sick' | 'symptom' | 'ok'

export function statState(value: number): StatState {
  if (value < SICK_BELOW) return 'sick'
  if (value < SYMPTOM_BELOW) return 'symptom'
  return 'ok'
}

export function lowestStat(stats: Stats): StatKey {
  return STAT_KEYS.reduce((min, k) => (stats[k] < stats[min] ? k : min), STAT_KEYS[0])
}

/** LCD 에 그릴 증상: 증상 구간에 있는 스탯 전부 */
export function activeSymptoms(stats: Stats): Symptom[] {
  return STAT_KEYS.filter((k) => statState(stats[k]) !== 'ok').map((k) => STAT_META[k].symptom)
}

/** 가장 약한 스탯이 증상 구간이면 그 증상 말, 아니면 null */
export function symptomBubble(stats: Stats): string | null {
  const k = lowestStat(stats)
  return statState(stats[k]) === 'ok' ? null : STAT_META[k].bubble
}

/** "오늘 벌레가 많아서 방어 문제가 2개야" — 가장 많이 나온 스탯 기준 */
export function reasonText(reasons: Partial<Record<StatKey, number>>): string | null {
  const top = STAT_KEYS.filter((k) => reasons[k]).sort((a, b) => reasons[b]! - reasons[a]!)[0]
  if (!top) return null
  if (reasons[top]! < 2) return `오늘은 고르게 ${Object.values(reasons).reduce((a, b) => a + (b ?? 0), 0)}문제야`
  return `오늘 ${STAT_META[top].cause} ${STAT_META[top].label} 문제가 ${reasons[top]}개야`
}
