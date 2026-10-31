// 예보 채점: 아직 채점 안 된 예보 날짜마다 시세 등락을 계산해 market_moves 에 넣고 resolve_forecasts 를 부른다.
//   코스피·환율(한국은행 ECOS): D 이후 첫 거래일 종가 vs 그 직전 거래일 종가
//   비트코인(업비트): D+1 18:00 가격 vs D 자정 가격
// 데이터가 아직 없으면 건너뛰고 다음 예약 실행 때 다시 시도한다.
import { addDays, adminClient, isCron, json, kstAt, kstDate } from '../_shared/cron.ts'

type Asset = 'kr' | 'fx' | 'coin'
type Move = { asset: Asset; base_at: string; target_at: string; base: number; target: number; move: number }

const ECOS_SERIES: Record<'kr' | 'fx', { stat: string; item: string }> = {
  kr: { stat: '802Y001', item: '0001000' }, // 주식시장(일) KOSPI지수
  fx: { stat: '731Y003', item: '0000003' }, // 원/달러(종가 15:30)
}

const ymd = (day: string) => day.replaceAll('-', '')
const fromYmd = (s: string) => `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`
const pct = (base: number, target: number) => Math.round(((target - base) / base) * 1e4) / 100

async function ecosMove(asset: 'kr' | 'fx', day: string): Promise<Move | null> {
  const key = Deno.env.get('ECOS_API_KEY')
  if (!key) return null
  const { stat, item } = ECOS_SERIES[asset]
  const url = `https://ecos.bok.or.kr/api/StatisticSearch/${key}/json/kr/1/60/${stat}/D/${ymd(addDays(day, -14))}/${ymd(addDays(day, 14))}/${item}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`ecos ${asset} ${res.status}`)
  const rows: { TIME: string; DATA_VALUE: string }[] = (await res.json()).StatisticSearch?.row ?? []
  const series = rows.map((r) => ({ day: fromYmd(r.TIME), value: Number(r.DATA_VALUE) })).sort((a, b) => a.day.localeCompare(b.day))
  const ti = series.findIndex((r) => r.day > day)
  if (ti <= 0) return null // 다음 거래일 종가가 아직 없음
  const base = series[ti - 1], target = series[ti]
  return { asset, base_at: base.day, target_at: target.day, base: base.value, target: target.value, move: pct(base.value, target.value) }
}

/** 업비트 60분봉에서 at(ms) 직전에 끝난 봉의 종가 */
async function upbitPriceAt(at: number) {
  const to = new Date(at).toISOString().slice(0, 19) + 'Z'
  const res = await fetch(`https://api.upbit.com/v1/candles/minutes/60?market=KRW-BTC&count=1&to=${to}`)
  if (!res.ok) throw new Error(`upbit ${res.status}`)
  const [candle] = await res.json()
  return candle?.trade_price as number | undefined
}

async function coinMove(day: string): Promise<Move | null> {
  const next = addDays(day, 1)
  const baseAt = kstAt(next, 0), targetAt = kstAt(next, 18)
  if (Date.now() < targetAt) return null
  const [base, target] = await Promise.all([upbitPriceAt(baseAt), upbitPriceAt(targetAt)])
  if (!base || !target) return null
  return { asset: 'coin', base_at: day, target_at: next, base, target, move: pct(base, target) }
}

Deno.serve(async (req) => {
  if (!isCron(req)) return json({ error: 'forbidden' }, 403)
  const db = adminClient()
  const today = kstDate()

  const { data: pending, error } = await db.from('forecasts').select('day, asset').is('resolved_at', null).lt('day', today)
  if (error) return json({ error: error.message }, 500)

  const byDay = new Map<string, Set<Asset>>()
  for (const f of pending ?? []) {
    if (!byDay.has(f.day)) byDay.set(f.day, new Set())
    byDay.get(f.day)!.add(f.asset as Asset)
  }

  const report: Record<string, unknown> = {}
  for (const [day, assets] of byDay) {
    const { data: known } = await db.from('market_moves').select('asset').eq('day', day)
    const have = new Set((known ?? []).map((m) => m.asset))
    const moves: Move[] = []
    for (const asset of assets) {
      if (have.has(asset)) continue
      try {
        const m = asset === 'coin' ? await coinMove(day) : await ecosMove(asset, day)
        if (m) moves.push(m)
      } catch (e) {
        report[`${day}:${asset}`] = String(e)
      }
    }
    if (moves.length) {
      const { error: insErr } = await db.from('market_moves').upsert(moves.map((m) => ({ day, ...m })), { onConflict: 'day,asset' })
      if (insErr) return json({ error: insErr.message }, 500)
    }
    const { data: resolved, error: rpcErr } = await db.rpc('resolve_forecasts', { p_day: day })
    if (rpcErr) return json({ error: rpcErr.message }, 500)
    report[day] = { moves: moves.map((m) => `${m.asset} ${m.move}%`), resolved }
  }
  return json(report)
})
