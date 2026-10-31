import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router'
import { useDailySet, useForecasts, useGraduate, useHome, useInvalidateGame, useLeague, useNews, usePet } from '../api/game'
import { ForecastStamps } from '../components/ForecastStamps'
import { Pet } from '../components/pet/Pet'
import type { Mood } from '../components/pet/lcd'
import { PushCard } from '../components/PushCard'
import { RankingList } from '../components/RankingList'
import { petSprite } from '../components/pet/sprites'
import { EvolveModal, ForecastPickSheet, GraduateModal, NewsSheet, ResultModal, StatSheet, WalletSheet } from '../components/sheets'
import { StatStrip } from '../components/StatStrip'
import { Bubble } from '../components/ui/Bubble'
import { Button } from '../components/ui/Button'
import { PixelIcon } from '../components/ui/PixelIcon'
import type { Asset } from '../domain/forecast'
import { iga, won } from '../domain/money'
import { activeSymptoms, FORM_LABEL, FORMS, STAT_KEYS, STAT_META, statState, symptomBubble, type StatKey } from '../domain/stats'
import { DEMO } from '../lib/demo'
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
  const { data: pet } = usePet()
  const graduate = useGraduate()

  const [sheet, setSheet] = useState<null | 'points' | 'news'>(null)
  const [stat, setStat] = useState<StatKey | null>(null)
  const [pickAsset, setPickAsset] = useState<Asset | null>(null)
  const [tapped, setTapped] = useState(false)
  const [newsIdx, setNewsIdx] = useState(0)
  const [seenNews, setSeenNews] = useState(() => store.get('seenNews', ''))
  const [seenResult, setSeenResult] = useState(() => store.get('seenResult', ''))
  const [evolved, setEvolved] = useState(() => store.take<{ stage: number; form: string | null }>('evolved'))
  const [timeSkip, setTimeSkip] = useState(false)
  const invalidate = useInvalidateGame()

  // 시연 흐름: 성체 진화를 보고 나면 18시 결과 발표가 이어서 뜬다
  const closeEvolve = () => {
    const adult = evolved?.stage === 3
    setEvolved(null)
    if (DEMO && adult) setTimeout(() => setSeenResult(''), 500)
  }
  // 시연 흐름: 교환권을 확인하면 '7일 뒤'로 건너뛰어 졸업 준비 상태가 된다
  const skipWeek = async () => {
    setTimeSkip(true)
    const { demoControls } = await import('../demo/api')
    demoControls.readyToGraduate()
    await invalidate()
    setTimeout(() => setTimeSkip(false), 2200)
  }

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
    return { stage: home?.pet.stage ?? 0, form: home?.pet.form, symptoms: stats ? activeSymptoms(stats) : [], mood, news: !!news?.[0] && news[0].id !== seenNews }
  }, [home, tapped, news, seenNews])

  if (isLoading) return <main className="grid flex-1 place-items-center text-[13px] text-ink-3">불러오는 중…</main>
  if (home && !home.baseline) return <Navigate to="/onboarding" replace />
  // 졸업한 뒤엔 새 알 고르기 (졸업식 팝업을 보는 동안은 머문다)
  if (home && home.pet.stage === 0 && home.pet.gen > 1 && !graduate.isPending && !graduate.data) return <Navigate to="/egg" replace />
  if (!home) return <main className="grid flex-1 place-items-center p-6 text-center text-[13px] text-ink-2">연결에 실패했어. 잠시 후 다시 열어줘.</main>

  // 아직 안 본 예보 결과가 있으면 띄운다 (푸시 알림에서 ?result=1 로 들어와도)
  const latestResult = forecasts.find((f) => f.resolved_at)?.day ?? null
  const resultDay = latestResult && (params.get('result') || seenResult < latestResult) ? latestResult : null

  const todayPicks = daily?.forecasts ?? {}
  const pickedCount = Object.keys(todayPicks).length
  const remainingItems = (daily?.items.filter((i) => !i.done).length ?? 0) + (3 - pickedCount)
  const headline = news?.length ? news[newsIdx % news.length] : null
  // 고른 알의 힘이 모자라 새끼에 머물러 있으면 그 얘기를 먼저 한다
  const need = pet?.need && home.pet.stage < 3 && pet.need.value < pet.need.min ? pet.need : null
  const goal =
    need && pet?.focus
      ? `${iga(FORM_LABEL[pet.focus])} 되려면 ${need.stat === 'all' ? '모든 힘' : STAT_META[need.stat].label} ${need.min}이 필요해. 지금 ${need.value}!`
      : null
  const blocked = !!goal && (pet?.days ?? 0) >= 10
  const symptom = (blocked ? goal : symptomBubble(home.stats)) ?? goal
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
    <main className="flex flex-1 flex-col gap-4 px-1.5 pb-[calc(45px+var(--sab))]">
      <header className="relative z-10 flex items-center gap-3 pt-[14px]">
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
        <button type="button" onClick={() => setSheet('points')} className="-mr-4 flex shrink-0 flex-col items-center" aria-label={`지갑 ${won(home.points)}`}>
          <PixelIcon name="coin" size={64} />
          <span className="text-[11px] tabular-nums">{won(home.points)}</span>
        </button>
      </header>

      <Pet lcd={lcd} onTap={tapPet} className="-mx-4 -mt-[120px] h-[420px]" />

      {/* 졸업할 때가 되면 지갑몬 바로 아래에 (스크롤 없이 보이게) */}
      {pet?.can_graduate && (
        <section className="grid gap-2 rounded-[13px] border border-lime p-3 text-center">
          <p className="text-[13px] leading-[1.6]">
            성체로 {pet.grad_days}일을 함께했어!
            <br />
            이제 졸업해서 도감에 남길 수 있어.
          </p>
          <Button className="shadow-glow-lg" disabled={graduate.isPending} onClick={() => graduate.mutate()}>
            졸업식 하기
          </Button>
        </section>
      )}

      <StatStrip stats={home.stats} onSelect={setStat} />

      <section aria-label="오늘의 예보" className="grid gap-2">
        <ForecastStamps picks={todayPicks} onSelect={setPickAsset} />
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

      <section className="grid gap-2">
        <h2 className="flex items-baseline justify-between pl-[14px] text-[15px] leading-[1.6] font-bold">
          도감 {pet ? `${new Set(pet.dex.map((d) => d.form)).size}/${FORMS.length}` : ''}
          <Link to="/dex" className="text-[12px] font-normal text-ink-2">
            전체 보기
          </Link>
        </h2>
        <Link to="/dex" className="grid grid-cols-5 gap-1.5 rounded-[13px] border border-line p-2" aria-label="도감 보기">
          {FORMS.map((f) =>
            pet?.dex.some((d) => d.form === f) ? (
              <img key={f} src={petSprite(3, f)} alt={FORM_LABEL[f]} className="pixel aspect-square w-full rounded-[8px]" />
            ) : (
              <span key={f} className="grid aspect-square place-items-center rounded-[8px] bg-rank text-[18px] text-ink-3">
                ?
              </span>
            ),
          )}
        </Link>
        {pet && pet.stage > 0 && (
          <p className="pl-[14px] text-[12px] text-ink-3">
            {pet.gen}세대 ·{' '}
            {pet.stage < 3
              ? pet.days < 10
                ? `성체까지 ${10 - pet.days}일`
                : '힘을 키우면 바로 성체가 돼'
              : pet.can_graduate
                ? '졸업할 수 있어'
                : `졸업까지 ${pet.grad_days - pet.adult_days}일`}
          </p>
        )}
      </section>

      {!DEMO && <PushCard />}

      <StatSheet stat={stat} stats={home.stats} onClose={() => setStat(null)} />
      <ForecastPickSheet asset={pickAsset} current={pickAsset ? todayPicks[pickAsset] : undefined} onClose={() => setPickAsset(null)} />
      <WalletSheet open={sheet === 'points'} points={home.points} onClose={() => setSheet(null)} onRedeemed={DEMO ? skipWeek : undefined} />
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
      <EvolveModal evolved={evolved} onClose={closeEvolve} />
      {timeSkip && (
        <div className="animate-rise fixed inset-0 z-50 grid place-items-center bg-black text-center" role="status">
          <div>
            <p className="text-[32px] font-bold text-lime">7일 뒤</p>
            <p className="mt-2 text-[13px] text-ink-2">성체 지갑몬과 매일 함께했어</p>
          </div>
        </div>
      )}
      <GraduateModal graduation={graduate.data ?? null} onNext={() => navigate('/egg')} />
    </main>
  )
}

/** 홈 카드는 상위 4명 + 나 */
function pickRows<T extends { rank: number; me: boolean }>(rows: T[]) {
  const top = rows.slice(0, 4)
  const me = rows.find((r) => r.me)
  return me && !top.includes(me) ? [...top, me] : top
}
