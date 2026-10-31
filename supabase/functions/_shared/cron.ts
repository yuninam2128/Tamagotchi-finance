import { createClient } from 'jsr:@supabase/supabase-js@2'

// 예약 작업(pg_cron)에서만 부르는 함수들. Vault 에 있는 cron_secret 과 같은 값을 헤더로 받는다.
export function isCron(req: Request) {
  const secret = Deno.env.get('CRON_SECRET')
  return !!secret && req.headers.get('x-cron-secret') === secret
}

export function adminClient() {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  })
}

export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
}

const KST_MS = 9 * 3600_000

/** 한국 날짜 'YYYY-MM-DD' */
export function kstDate(ms = Date.now()) {
  return new Date(ms + KST_MS).toISOString().slice(0, 10)
}

export function addDays(day: string, n: number) {
  const d = new Date(day + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

/** 한국 시각 day hh:00 의 epoch ms */
export function kstAt(day: string, hour: number) {
  return Date.parse(`${day}T${String(hour).padStart(2, '0')}:00:00+09:00`)
}
