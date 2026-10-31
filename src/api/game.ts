import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { addDays, kstToday, type Asset, type Pick } from '../domain/forecast'
import type { StatKey, Stats } from '../domain/stats'
import { useAuth } from '../lib/auth'
import { DEMO } from '../lib/demo'
import { supabase } from '../lib/supabase'

export type Home = {
  nick: string | null
  tier: number
  pet: { stage: number; form: string | null; born_at: string | null; gen: number; focus: string | null }
  baseline: Stats | null
  stats: Stats
  points: number
  today: string
}

export type QuizBody = { prompt: string; choices: string[]; scenario?: string }
export type FraudBody = { from: string; avatar: string; text: string; choices: string[] }
export type Item =
  | { id: string; type: 'quiz' | 'case'; skill_id: string; stat: StatKey; body: QuizBody; done: boolean }
  | { id: string; type: 'fraud'; skill_id: string; stat: StatKey; body: FraudBody; done: boolean }

export type DailySet = {
  day: string
  idx: number
  reasons: Partial<Record<StatKey, number>>
  items: Item[]
  extra: Item[]
  forecasts: Partial<Record<Asset, Pick>>
}

/** 해설 출처. source = 해설 속 통계·조항의 근거, ref = 더 알아보기(공식 안내) */
export type Source = { kind: 'source' | 'ref'; label: string; url?: string }
/** 제휴 상품 연결. 화면에 '제휴' 표시와 수수료 고지를 붙인다. */
export type Promo = { partner: string; product: string; summary: string; url?: string; disclosure?: string }

export type AnswerResult = {
  correct: boolean
  answer: number
  explanation: string
  sources: Source[]
  promo: Promo | null
  points: number
  stat: StatKey
  before: number
  after: number
  evolved: { stage: number; form: string | null } | null
}

export type Forecast = { day: string; asset: Asset; pick: Pick; move: number | null; hit: boolean | null; points: number; resolved_at: string | null }

export type LeagueRow = { rank: number; nick: string; score: number; stage: number; form: string | null; bot: boolean; me: boolean }
export type League = { tier: number; league_code: string | null; week_start: string; rows: LeagueRow[] }

export type News = { id: string; title: string; link: string; source: string | null; published_at: string }
export type LedgerRow = { id: number; ts: string; delta: number; reason: string; ref_id: string | null }

/** 도감 한 칸: 졸업한 지갑몬 */
export type DexEntry = { gen: number; form: string; days: number; stats_start: Stats | null; stats_end: Stats | null; graduated_at: string }
/** 이번 세대 지갑몬. need = 성체가 되려면 넘어야 하는 스탯 (2세대부터, 레전드 알은 stat='all') */
export type PetInfo = {
  gen: number
  stage: number
  form: string | null
  focus: string | null
  days: number
  adult_days: number
  grad_days: number
  can_graduate: boolean
  need: { stat: StatKey | 'all'; min: number; value: number } | null
  dex: DexEntry[]
}
export type Graduation = DexEntry & { born_on: string | null }

export type Skill = { skill_id: string; stat: StatKey; name: string; mastery: number; next_due: string | null }
export type DiagnosisItem = Omit<Item, 'stat' | 'done'>
export type DiagnosisResult = { baseline: Stats; results: { item_id: string; correct: boolean; answer: number; explanation: string }[] }

type RpcName = Parameters<typeof supabase.rpc>[0]

async function rpc<T>(fn: RpcName, args?: object): Promise<T> {
  const { data, error } = await supabase.rpc(fn, args as never)
  if (error) throw error
  return data as T
}

async function rows<T>(query: PromiseLike<{ data: unknown; error: unknown }>): Promise<T> {
  const { data, error } = await query
  if (error) throw error
  return data as T
}

const live = {
  home: () => rpc<Home>('get_home'),
  daily: () => rpc<DailySet>('get_daily_set'),
  skills: () => rpc<Skill[]>('get_my_skills'),
  forecasts: () =>
    rows<Forecast[]>(
      supabase.from('forecasts').select('day, asset, pick, move, hit, points, resolved_at').gte('day', addDays(kstToday(), -7)).order('day', { ascending: false }),
    ),
  league: () => rpc<League>('get_league'),
  ledger: () => rows<LedgerRow[]>(supabase.from('point_ledger').select('id, ts, delta, reason, ref_id').order('ts', { ascending: false }).limit(50)),
  news: () => rows<News[]>(supabase.from('news').select('id, title, link, source, published_at').order('published_at', { ascending: false }).limit(20)),
  diagnosisItems: () => rows<DiagnosisItem[]>(supabase.from('items').select('id, type, skill_id, body').eq('diagnostic', true).order('id')),
  submitAnswer: (v: { itemId: string; choice: number; ms?: number }) =>
    rpc<AnswerResult>('submit_answer', { p_item_id: v.itemId, p_choice: v.choice, p_ms: v.ms }),
  submitDiagnosis: (answers: { item_id: string; choice: number }[]) => rpc<DiagnosisResult>('submit_diagnosis', { p_answers: answers }),
  startTreatment: (stat: StatKey) => rpc<Item[]>('start_treatment', { p_stat: stat }),
  /** 오늘 고른 예보는 자정 전까지 다시 고를 수 있다 (다음 거래일 결과로 채점하므로) */
  submitForecast: (v: { asset: Asset; pick: Pick }) => rpc<{ pick: Pick; points: number }>('submit_forecast', { p_asset: v.asset, p_pick: v.pick }),
  pet: () => rpc<PetInfo>('get_pet'),
  graduate: () => rpc<Graduation>('graduate_pet'),
  chooseEgg: (focus: string) => rpc<{ stage: number; focus: string }>('choose_egg', { p_focus: focus }),
  setLeague: (code: string | null) => rpc<string | null>('set_league', code === null ? {} : { p_code: code }),
  setNick: async (nick: string) => {
    const { data } = await supabase.auth.getSession()
    const { error } = await supabase.from('players').update({ nick: nick.trim() || null }).eq('uid', data.session!.user.id)
    if (error) throw error
  },
}

export type GameApi = typeof live

// 시연 모드에서만 가짜 데이터 모듈을 불러온다 (일반 사용자 번들에는 들어가지 않음)
const api = (): Promise<GameApi> => (DEMO ? import('../demo/api').then((m) => m.demoApi) : Promise.resolve(live))

export const keys = {
  home: ['home'] as const,
  daily: ['daily'] as const,
  skills: ['skills'] as const,
  forecasts: ['forecasts'] as const,
  league: ['league'] as const,
  pet: ['pet'] as const,
  ledger: ['ledger'] as const,
}

function useSessionReady() {
  const { session } = useAuth()
  return DEMO || !!session
}

export function useHome() {
  return useQuery({ queryKey: keys.home, queryFn: async () => (await api()).home(), enabled: useSessionReady() })
}

export function useDailySet(enabled = true) {
  const ready = useSessionReady()
  return useQuery({ queryKey: keys.daily, queryFn: async () => (await api()).daily(), enabled: ready && enabled })
}

export function useMySkills() {
  return useQuery({ queryKey: keys.skills, queryFn: async () => (await api()).skills(), enabled: useSessionReady() })
}

/** 오늘 고른 예보와 최근 7일 예보 결과 */
export function useForecasts() {
  return useQuery({ queryKey: keys.forecasts, queryFn: async () => (await api()).forecasts(), enabled: useSessionReady() })
}

export function usePet() {
  return useQuery({ queryKey: keys.pet, queryFn: async () => (await api()).pet(), enabled: useSessionReady() })
}

export function useGraduate() {
  const invalidate = useInvalidateGame()
  return useMutation({ mutationFn: async () => (await api()).graduate(), onSuccess: invalidate })
}

export function useChooseEgg() {
  const invalidate = useInvalidateGame()
  return useMutation({ mutationFn: async (focus: string) => (await api()).chooseEgg(focus), onSuccess: invalidate })
}

export function useLeague() {
  return useQuery({ queryKey: keys.league, queryFn: async () => (await api()).league(), enabled: useSessionReady() })
}

export function useLedger() {
  return useQuery({ queryKey: keys.ledger, queryFn: async () => (await api()).ledger(), enabled: useSessionReady() })
}

/** 실시간 뉴스: 서버가 15분마다 갱신하므로 5분마다 다시 읽는다 */
export function useNews() {
  return useQuery({ queryKey: ['news'], queryFn: async () => (await api()).news(), enabled: useSessionReady(), refetchInterval: 5 * 60_000 })
}

/** 첫 진단 문제 (정답 없이 본문만) */
export function useDiagnosisItems() {
  return useQuery({ queryKey: ['diagnosis-items'], queryFn: async () => (await api()).diagnosisItems(), enabled: useSessionReady(), staleTime: Infinity })
}

/** 답을 내면 스탯·포인트·세트 진행·랭킹이 함께 바뀐다 */
export function useInvalidateGame() {
  const qc = useQueryClient()
  return () => Promise.all(Object.values(keys).map((queryKey) => qc.invalidateQueries({ queryKey })))
}

export function useSubmitAnswer() {
  const invalidate = useInvalidateGame()
  return useMutation({ mutationFn: async (v: { itemId: string; choice: number; ms?: number }) => (await api()).submitAnswer(v), onSuccess: invalidate })
}

export function useSubmitDiagnosis() {
  const invalidate = useInvalidateGame()
  return useMutation({ mutationFn: async (answers: { item_id: string; choice: number }[]) => (await api()).submitDiagnosis(answers), onSuccess: invalidate })
}

export function useStartTreatment() {
  const invalidate = useInvalidateGame()
  return useMutation({ mutationFn: async (stat: StatKey) => (await api()).startTreatment(stat), onSuccess: invalidate })
}

export function useSubmitForecast() {
  const invalidate = useInvalidateGame()
  return useMutation({ mutationFn: async (v: { asset: Asset; pick: Pick }) => (await api()).submitForecast(v), onSuccess: invalidate })
}

export function useSetLeague() {
  const invalidate = useInvalidateGame()
  return useMutation({ mutationFn: async (code: string | null) => (await api()).setLeague(code), onSuccess: invalidate })
}

export function useSetNick() {
  const invalidate = useInvalidateGame()
  return useMutation({ mutationFn: async (nick: string) => (await api()).setNick(nick), onSuccess: invalidate })
}
