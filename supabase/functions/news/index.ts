// 실시간 경제 뉴스: Google 뉴스 RSS 를 15분마다 받아 news 테이블에 캐시한다.
import { adminClient, isCron, json } from '../_shared/cron.ts'

const QUERY = '경제 OR 금리 OR 환율 OR 코스피 OR 전세 OR 보이스피싱 OR 신용점수'
const RSS = `https://news.google.com/rss/search?q=${encodeURIComponent(QUERY + ' when:1d')}&hl=ko&gl=KR&ceid=KR:ko`
const KEEP_DAYS = 3

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' }
const decode = (s: string) =>
  s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&(#\d+|#x[0-9a-f]+|\w+);/gi, (m, e: string) =>
      e[0] === '#' ? String.fromCodePoint(e[1] === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10)) : ENTITIES[e] ?? m)
    .trim()

const tag = (xml: string, name: string) => {
  const m = xml.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`))
  return m ? decode(m[1]) : ''
}

async function sha1(s: string) {
  const buf = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(s))
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

Deno.serve(async (req) => {
  if (!isCron(req)) return json({ error: 'forbidden' }, 403)

  const res = await fetch(RSS, { headers: { 'user-agent': 'Mozilla/5.0 (jigapmon news bot)' } })
  if (!res.ok) return json({ error: `rss ${res.status}` }, 502)
  const xml = await res.text()

  const rows = await Promise.all(
    [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].slice(0, 40).map(async ([, item]) => {
      const source = tag(item, 'source')
      const link = tag(item, 'link')
      // Google 뉴스 제목은 "제목 - 언론사" 형식
      const title = tag(item, 'title').replace(new RegExp(`\\s*-\\s*${source.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`), '')
      return { id: await sha1(link), title, link, source: source || null, published_at: new Date(tag(item, 'pubDate')).toISOString() }
    }),
  )

  const db = adminClient()
  const { error } = await db.from('news').upsert(rows, { onConflict: 'id' })
  if (error) return json({ error: error.message }, 500)
  await db.from('news').delete().lt('published_at', new Date(Date.now() - KEEP_DAYS * 864e5).toISOString())

  return json({ saved: rows.length })
})
