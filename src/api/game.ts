import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { addDays, kstToday, type Asset, type Pick } from '../domain/forecast'
import type { StatKey, Stats } from '../domain/stats'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'

export type Home = {
  nick: string | null
  tier: number
  pet: { stage: number; form: string | null; born_at: string | null }
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

export type AnswerResult = {
  correct: boolean
  answer: number
  explanation: string
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

type RpcName = Parameters<typeof supabase.rpc>[0]

async function rpc<T>(fn: RpcName, args?: object): Promise<T> {
  const { data, error } = await supabase.rpc(fn, args as never)
  if (error) throw error
  return data as T
}

export const keys = {
  home: ['home'] as const,
  daily: ['daily'] as const,
  skills: ['skills'] as const,
  forecasts: ['forecasts'] as const,
  league: ['league'] as const,
  ledger: ['ledger'] as const,
}

function useSessionReady() {
  return !!useAuth().session
}

export function useHome() {
  return useQuery({ queryKey: keys.home, queryFn: () => rpc<Home>('get_home'), enabled: useSessionReady() })
}

export function useDailySet(enabled = true) {
  const ready = useSessionReady()
  return useQuery({ queryKey: keys.daily, queryFn: () => rpc<DailySet>('get_daily_set'), enabled: ready && enabled })
}

export function useMySkills() {
  return useQuery({
    queryKey: keys.skills,
    queryFn: () => rpc<{ skill_id: string; stat: StatKey; name: string; mastery: number; next_due: string | null }[]>('get_my_skills'),
    enabled: useSessionReady(),
  })
}

/** 오늘 고른 예보와 최근 7일 예보 결과 */
export function useForecasts() {
  return useQuery({
    queryKey: keys.forecasts,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('forecasts')
        .select('day, asset, pick, move, hit, points, resolved_at')
        .gte('day', addDays(kstToday(), -7))
        .order('day', { ascending: false })
      if (error) throw error
      return data as Forecast[]
    },
    enabled: useSessionReady(),
  })
}

export function useLeague() {
  return useQuery({ queryKey: keys.league, queryFn: () => rpc<League>('get_league'), enabled: useSessionReady() })
}

export function useLedger() {
  return useQuery({
    queryKey: keys.ledger,
    queryFn: async () => {
      const { data, error } = await supabase.from('point_ledger').select('id, ts, delta, reason, ref_id').order('ts', { ascending: false }).limit(50)
      if (error) throw error
      return data as LedgerRow[]
    },
    enabled: useSessionReady(),
  })
}

/** 실시간 뉴스: 서버가 15분마다 갱신하므로 5분마다 다시 읽는다 */
export function useNews() {
  return useQuery({
    queryKey: ['news'],
    queryFn: async () => {
      const { data, error } = await supabase.from('news').select('id, title, link, source, published_at').order('published_at', { ascending: false }).limit(20)
      if (error) throw error
      return data as News[]
    },
    enabled: useSessionReady(),
    refetchInterval: 5 * 60_000,
  })
}

/** 첫 진단 문제 (정답 없이 본문만) */
export function useDiagnosisItems() {
  return useQuery({
    queryKey: ['diagnosis-items'],
    queryFn: async () => {
      const { data, error } = await supabase.from('items').select('id, type, skill_id, body').eq('diagnostic', true).order('id')
      if (error) throw error
      return data as unknown as Omit<Item, 'stat' | 'done'>[]
    },
    enabled: useSessionReady(),
    staleTime: Infinity,
  })
}

/** 답을 내면 스탯·포인트·세트 진행·랭킹이 함께 바뀐다 */
function useInvalidateGame() {
  const qc = useQueryClient()
  return () => Promise.all(Object.values(keys).map((queryKey) => qc.invalidateQueries({ queryKey })))
}

export function useSubmitAnswer() {
  const invalidate = useInvalidateGame()
  return useMutation({
    mutationFn: (v: { itemId: string; choice: number; ms?: number }) =>
      rpc<AnswerResult>('submit_answer', { p_item_id: v.itemId, p_choice: v.choice, p_ms: v.ms }),
    onSuccess: invalidate,
  })
}

export function useSubmitDiagnosis() {
  const invalidate = useInvalidateGame()
  return useMutation({
    mutationFn: (answers: { item_id: string; choice: number }[]) =>
      rpc<{ baseline: Stats; results: { item_id: string; correct: boolean; answer: number; explanation: string }[] }>(
        'submit_diagnosis', { p_answers: answers }),
    onSuccess: invalidate,
  })
}

export function useStartTreatment() {
  const invalidate = useInvalidateGame()
  return useMutation({
    mutationFn: (stat: StatKey) => rpc<Item[]>('start_treatment', { p_stat: stat }),
    onSuccess: invalidate,
  })
}

export function useSubmitForecast() {
  const invalidate = useInvalidateGame()
  return useMutation({
    mutationFn: (v: { asset: Asset; pick: Pick }) => rpc<{ pick: Pick; points: number }>('submit_forecast', { p_asset: v.asset, p_pick: v.pick }),
    onSuccess: invalidate,
  })
}

export function useSetLeague() {
  const invalidate = useInvalidateGame()
  return useMutation({ mutationFn: (code: string | null) => rpc<string | null>('set_league', code === null ? {} : { p_code: code }), onSuccess: invalidate })
}

export function useSetNick() {
  const invalidate = useInvalidateGame()
  const { session } = useAuth()
  return useMutation({
    mutationFn: async (nick: string) => {
      const { error } = await supabase.from('players').update({ nick: nick.trim() || null }).eq('uid', session!.user.id)
      if (error) throw error
    },
    onSuccess: invalidate,
  })
}
