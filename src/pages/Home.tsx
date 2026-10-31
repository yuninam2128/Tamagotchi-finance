import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router'
import { useDailySet, useForecasts, useHome, useLeague, useNews } from '../api/game'
import { ForecastStamps } from '../components/ForecastStamps'
import { Pet } from '../components/pet/Pet'
import type { Mood } from '../components/pet/lcd'
import { PushCard } from '../components/PushCard'
import { RankingList } from '../components/RankingList'
import { EvolveModal, NewsSheet, PointsSheet, ResultModal, StatSheet } from '../components/sheets'
import { StatStrip } from '../components/StatStrip'
import { Bubble } from '../components/ui/Bubble'
import { Button } from '../components/ui/Button'
import { PixelIcon } from '../components/ui/PixelIcon'
import { activeSymptoms, STAT_KEYS, statState, symptomBubble, type StatKey } from '../domain/stats'
import { store } from '../lib/store'
import { useResolveCountdown } from '../lib/useCountdown'

export default function Home() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const remaining = useResolveCountdown()
  const { data: home, isLoading } = useHome()
  const { data: daily } = useDailySet(!!home?.baseline)
  const { data: forecasts = [] } = useForecasts()
  const { data: league } = useLeague()
  const { data: news } = useNews()

  const [sheet, setSheet] = useState<null | 'points' | 'news'>(null)
  const [stat, setStat] = useState<StatKey | null>(null)
  const [tapped, setTapped] = useState(false)
  const [newsIdx, setNewsIdx] = useState(0)
  const [seenNews, setSeenNews] = useState(() => store.get('seenNews', ''))
  const [seenResult, setSeenResult] = useState(() => store.get('seenResult', ''))
  const [evolved, setEvolved] = useState(() => store.take<{ stage: number; form: string | null }>('evolved'))

  // 뉴스 말풍선은 6초마다 다음 헤드라인
  useEffect(() => {
    const id = setInterval(() => setNewsIdx((i) => i + 1), 6000)
    return () => clearInterval(id)
  }, [])


  const tapPet = () => {
    setTapped(true)
    setTimeout(() => setTapped(false), 1800)
  }

  const lcd = useMemo(() => {
    const stats = home?.stats
    const sick = !!stats && STAT_KEYS.some((k) => statState(stats[k]) === 'sick')
    const mood: Mood = tapped ? 'happy' : sick ? 'sick' : 'idle'
    return { stage: home?.pet.stage ?? 0, symptoms: stats ? activeSymptoms(stats) : [], mood, news: !!news?.[0] && news[0].id !== seenNews }
  }, [home, tapped, news, seenNews])

  if (isLoading) return <main className="grid flex-1 place-items-center text-[13px] text-ink-3">불러오는 중…</main>
  if (home && !home.baseline) return <Navigate to="/onboarding" replace />
  if (!home) return <main className="grid flex-1 place-items-center p-6 text-center text-[13px] text-ink-2">연결에 실패했어. 잠시 후 다시 열어줘.</main>

  // 아직 안 본 예보 결과가 있으면 띄운다 (푸시 알림에서 ?result=1 로 들어와도)
  const latestResult = forecasts.find((f) => f.resolved_at)?.day ?? null
  const resultDay = latestResult && (params.get('result') || seenResult < latestResult) ? latestResult : null

  const todayPicks = daily?.forecasts ?? {}
  const pickedCount = Object.keys(todayPicks).length
  const remainingItems = (daily?.items.filter((i) => !i.done).length ?? 0) + (3 - pickedCount)
  const headline = news?.length ? news[newsIdx % news.length] : null
  const symptom = symptomBubble(home.stats)
  // 증상이 있으면 증상과 뉴스를 번갈아 말한다
  const sayNews = !symptom || newsIdx % 2 === 1

  const openNews = () => {
    setSheet('news')
    if (news?.[0]) {
      store.set('seenNews', news[0].id)
      setSeenNews(news[0].id)
    }
  }

  return (
    <main className="flex flex-1 flex-col gap-4 px-1.5 pb-[45px]">
      <header className="flex items-center gap-3 pt-[14px]">
        <button type="button" onClick={openNews} className="min-w-0 flex-1 text-left" aria-label="뉴스 보기">
          <Bubble className="mr-2">
            {sayNews && headline ? (
              <>
                <span className="block text-[10px] text-card-ink-2">실시간 뉴스 · {headline.source}</span>
                <span className="line-clamp-2">{headline.title}</span>
              </>
            ) : (
              symptom ?? '오늘도 와줘서 고마워!'
            )}
          </Bubble>
        </button>
        <button type="button" onClick={() => setSheet('points')} className="-mr-4 flex shrink-0 flex-col items-center" aria-label={`포인트 ${home.points}`}>
          <PixelIcon name="coin" size={64} />
          <span className="text-[11px] tabular-nums">{home.points.toLocaleString('ko-KR')}P</span>
        </button>
      </header>

      <Pet lcd={lcd} onTap={tapPet} className="-mx-4 h-[300px]" />

      <StatStrip stats={home.stats} onSelect={setStat} />

      <section aria-label="오늘의 예보" className="grid gap-2">
        <ForecastStamps picks={todayPicks} onSelect={() => navigate('/session')} />
        <p className="text-center text-[15px] leading-[1.6]">{remaining} 뒤 발표됩니다.</p>
      </section>

      <Button
        onClick={() => navigate('/session')}
        className={remainingItems > 0 ? 'shadow-glow-lg' : ''}
        variant={remainingItems > 0 ? 'glow' : 'ghost'}
      >
        {remainingItems > 0 ? `계속 돌보기 (${remainingItems})` : '오늘 돌봄 완료! 복습하기'}
      </Button>

      <section className="grid gap-2">
        <h2 className="flex items-baseline justify-between pl-[14px] text-[15px] leading-[1.6] font-bold">
          랭킹
          <Link to="/league" className="text-[12px] font-normal text-ink-2">
            전체 보기
          </Link>
        </h2>
        <Link to="/league" className="block rounded-[13px] bg-rank p-2" aria-label="랭킹 전체 보기">
          <RankingList rows={pickRows(league?.rows ?? [])} compact />
        </Link>
      </section>

      <PushCard />

      <StatSheet stat={stat} stats={home.stats} onClose={() => setStat(null)} />
      <PointsSheet open={sheet === 'points'} points={home.points} onClose={() => setSheet(null)} />
      <NewsSheet open={sheet === 'news'} onClose={() => setSheet(null)} />
      <ResultModal
        day={resultDay}
        forecasts={forecasts}
        onClose={() => {
          if (resultDay) {
            store.set('seenResult', resultDay)
            setSeenResult(resultDay)
          }
          if (params.get('result')) setParams({}, { replace: true })
        }}
      />
      <EvolveModal evolved={evolved} onClose={() => setEvolved(null)} />
    </main>
  )
}

/** 홈 카드는 상위 4명 + 나 */
function pickRows<T extends { rank: number; me: boolean }>(rows: T[]) {
  const top = rows.slice(0, 4)
  const me = rows.find((r) => r.me)
  return me && !top.includes(me) ? [...top, me] : top
}
