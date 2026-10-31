// 웹 푸시 발송. ?kind=remind (오늘 아직 안 돌본 사람) | result (예보 결과가 나온 사람)
import webpush from 'npm:web-push@3.6.7'
import { adminClient, isCron, json, kstDate } from '../_shared/cron.ts'

type Sub = { endpoint: string; uid: string; p256dh: string; auth: string }

const REMIND = [
  '지갑몬이 배고파해. 오늘 문제 풀러 갈까?',
  '오늘 예보 아직 안 했어! 내일 결과로 포인트 받자.',
  '지갑몬이 기다리고 있어. 5분이면 돼.',
]

Deno.serve(async (req) => {
  if (!isCron(req)) return json({ error: 'forbidden' }, 403)
  webpush.setVapidDetails(Deno.env.get('VAPID_SUBJECT')!, Deno.env.get('VAPID_PUBLIC_KEY')!, Deno.env.get('VAPID_PRIVATE_KEY')!)

  const kind = new URL(req.url).searchParams.get('kind')
  const db = adminClient()
  const today = kstDate()
  const startedAt = new Date().toISOString()
  const messages = new Map<string, { title: string; body: string; url: string }>()

  if (kind === 'remind') {
    const [{ data: subs }, { data: active }] = await Promise.all([
      db.from('push_subscriptions').select('uid'),
      db.from('attempts').select('uid').eq('day', today),
    ])
    const done = new Set((active ?? []).map((a) => a.uid))
    for (const { uid } of subs ?? []) {
      if (done.has(uid)) continue
      messages.set(uid, { title: '지갑몬', body: REMIND[Math.floor(Math.random() * REMIND.length)], url: '/' })
    }
  } else if (kind === 'result') {
    const { data } = await db.from('forecasts').select('uid, hit').not('resolved_at', 'is', null).is('notified_at', null)
      .lte('resolved_at', startedAt)
    const byUid = new Map<string, { hits: number; total: number }>()
    for (const f of data ?? []) {
      const s = byUid.get(f.uid) ?? { hits: 0, total: 0 }
      s.total++
      if (f.hit) s.hits++
      byUid.set(f.uid, s)
    }
    for (const [uid, s] of byUid) {
      messages.set(uid, { title: '예보 결과 발표', body: `${s.total}개 중 ${s.hits}개 적중! 결과 확인하러 가자.`, url: '/?result=1' })
    }
  } else {
    return json({ error: 'kind must be remind|result' }, 400)
  }

  let sent = 0, removed = 0
  if (messages.size) {
    const { data: subs } = await db.from('push_subscriptions').select('*').in('uid', [...messages.keys()])
    await Promise.all((subs as Sub[] ?? []).map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(messages.get(s.uid)), { TTL: 3600 * 6 })
        sent++
      } catch (e) {
        const status = (e as { statusCode?: number }).statusCode
        if (status === 404 || status === 410) {
          await db.from('push_subscriptions').delete().eq('endpoint', s.endpoint)
          removed++
        }
      }
    }))
  }

  // 결과 알림은 구독이 없어도 한 번 처리한 것으로 표시해 다음 실행 때 다시 세지 않는다.
  if (kind === 'result') {
    await db.from('forecasts').update({ notified_at: new Date().toISOString() })
      .is('notified_at', null).not('resolved_at', 'is', null).lte('resolved_at', startedAt)
  }
  return json({ kind, targets: messages.size, sent, removed })
})
