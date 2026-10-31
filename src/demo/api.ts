// 시연 모드용 가짜 서버. 실제 RPC 와 같은 모양으로 답하고, 상태는 이 탭의 sessionStorage 에만 둔다.
// 정답이 든 문제 은행 전체를 번들에 넣지 않으려고 시연용 문제 10개만 따로 둔다 (content/items.mjs 에서 옮김).
import type { AnswerResult, DailySet, DexEntry, Forecast, GameApi, Home, Item, League, LedgerRow, News, PetInfo, Promo, Skill, Source } from '../api/game'
import { addDays, ASSETS, kstToday, type Asset, type Pick } from '../domain/forecast'
import { FOCUS_MIN, LEGEND_MIN, STAT_KEYS, type StatKey, type Stats } from '../domain/stats'

const SKILLS: { id: string; stat: StatKey; name: string }[] = [
  { id: 'impersonation', stat: 'shield', name: '기관사칭' },
  { id: 'loan_bait', stat: 'shield', name: '대출빙자' },
  { id: 'messenger', stat: 'shield', name: '메신저·문자피싱' },
  { id: 'invest_scam', stat: 'shield', name: '투자리딩방' },
  { id: 'market_scam', stat: 'shield', name: '중고거래·고액알바' },
  { id: 'score', stat: 'credit', name: '신용점수' },
  { id: 'delinquency', stat: 'credit', name: '연체' },
  { id: 'revolving', stat: 'credit', name: '리볼빙' },
  { id: 'cash_advance', stat: 'credit', name: '현금서비스·카드론' },
  { id: 'loan_structure', stat: 'credit', name: '대출 구조' },
  { id: 'registry', stat: 'home', name: '등기부' },
  { id: 'move_in', stat: 'home', name: '전입·확정일자' },
  { id: 'guarantee', stat: 'home', name: '보증보험' },
  { id: 'closing', stat: 'home', name: '잔금·이사 순서' },
  { id: 'emergency', stat: 'flow', name: '비상금' },
  { id: 'fixed_cost', stat: 'flow', name: '고정비' },
  { id: 'savings_keep', stat: 'flow', name: '적금 유지' },
  { id: 'autopay', stat: 'flow', name: '자동이체' },
  { id: 'policy', stat: 'flow', name: '정책상품' },
]
const statOf = (skill: string) => SKILLS.find((s) => s.id === skill)!.stat

type DemoItem = { id: string; type: Item['type']; skill_id: string; body: Item['body']; answer: number; explanation: string }

// 해설 출처 (content/sources.mjs 와 같은 값)
const FINE: Source = { kind: 'ref', label: '금융감독원 금융소비자 정보포털 파인', url: 'https://fine.fss.or.kr' }
const SOURCES: Record<string, Source[]> = {
  'imp-01': [{ kind: 'source', label: '머니투데이, 검찰 사칭 보이스피싱 20대 노린다 (2024.4.2)', url: 'https://www.mt.co.kr/society/2024/04/02/2024040113355547136' }, FINE],
  'scr-01': [{ kind: 'source', label: '메가경제, 청년 대출자 10명 중 6명은 다중채무자', url: 'https://megaeconomy.co.kr/news/newsview.php?ncode=1065592521374545' }, FINE],
  'mov-01': [{ kind: 'source', label: '주택임대차보호법 제3조(대항력)', url: 'https://www.law.go.kr/법령/주택임대차보호법' }],
  'reg-01': [{ kind: 'ref', label: '대법원 인터넷등기소', url: 'https://www.iros.go.kr' }],
  'reg-05': [{ kind: 'ref', label: '대법원 인터넷등기소', url: 'https://www.iros.go.kr' }],
}
// 제휴 표기가 어떻게 보이는지 보여주는 가상의 예시 (실제 회사·상품 아님)
const PROMOS: Record<string, Promo> = {
  'auto-01': { partner: '예시은행', product: '청년 자동이체 적금 (시연 예시)', summary: '월급날 다음 날 자동으로 떼어 모으는 적금 예시야.', disclosure: '시연용 가상 상품이야.' },
  'reg-05': { partner: '예시보증', product: '전세보증금반환보증 (시연 예시)', summary: '집주인이 보증금을 못 돌려주면 보증기관이 먼저 돌려주는 상품 예시야.', disclosure: '시연용 가상 상품이야.' },
}

const quiz = (id: string, skill_id: string, prompt: string, choices: string[], explanation: string): DemoItem =>
  ({ id, type: 'quiz', skill_id, body: { prompt, choices }, answer: 0, explanation })
const fraud = (id: string, skill_id: string, from: string, avatar: string, text: string, explanation: string): DemoItem =>
  ({ id, type: 'fraud', skill_id, body: { from, avatar, text, choices: ['사기', '정상'] }, answer: 0, explanation })

const DIAGNOSIS: DemoItem[] = [
  fraud('imp-01', 'impersonation', '02-3480-XXXX', '검',
    '서울중앙지검 수사관입니다. 귀하 명의 대포통장이 발견돼 자산 보호를 위해 안전계좌로 이체가 필요합니다',
    '수사기관은 전화로 이체를 요구하지 않아. 20대 이하 보이스피싱 피해자의 85%가 이런 기관사칭형이야.'),
  fraud('msg-01', 'messenger', '엄마', '엄',
    '딸 폰 액정 깨져서 임시폰이야. 급하게 상품권 결제해야 하는데 카드번호랑 비밀번호 좀 보내줘',
    '가족을 사칭한 메신저 피싱이야. 원래 알던 번호로 전화해 목소리를 확인하기 전엔 절대 보내지 마.'),
  quiz('scr-01', 'score', '신용점수를 떨어뜨리는 것은?', ['카드값 연체', '체크카드 사용'],
    '연체·카드론·현금서비스는 점수를 낮춰. 대출이 있는 20대의 60.7%가 829점 이하 저신용이야.'),
  quiz('reg-01', 'registry', '전세 계약 전에 등기부등본에서 꼭 확인할 것은?', ['집주인이 누구인지와 근저당 같은 빚', '집의 인테리어 상태'],
    '등기부에서 실제 소유자와 근저당(집을 담보로 한 빚)을 확인해. 빚이 많으면 보증금을 못 돌려받을 위험이 커져.'),
  quiz('emg-01', 'emergency', '비상금은 보통 얼마 정도를 목표로 할까?', ['생활비 3~6개월분', '월급 1주일분'],
    '갑자기 일이 끊기거나 큰 지출이 생겨도 버틸 수 있는 기간이야. 한 번에 못 모으면 1개월분부터 시작해.'),
]

const DAILY: DemoItem[] = [
  quiz('reg-05', 'registry', '매매가 2억원짜리 빌라에 전세 1억 9천만원. 이 집은?', ['깡통전세 위험이 크다', '전세가가 높으니 좋은 집이다'],
    '전세가가 매매가에 가까우면 집값이 조금만 떨어져도 보증금을 다 돌려받지 못할 수 있어.'),
  fraud('imp-02', 'impersonation', '[Web발신]', '금',
    '[금융감독원] 고객님 계좌가 범죄에 연루되어 보호조치가 필요합니다. 아래 앱 설치 후 담당자 안내를 따르세요 http://fss-safe.app',
    '금융감독원은 개인에게 문자로 앱 설치나 계좌 보호조치를 안내하지 않아. 원격제어·악성 앱을 깔게 하는 전형적인 수법이야.'),
  quiz('mov-01', 'move_in', '이사하고 전입신고를 하면 대항력은 언제 생길까?', ['다음 날 0시', '신고 즉시'],
    '대항력은 이사와 전입신고를 마친 다음 날 0시부터 생겨. 그 사이 집주인이 받은 대출이 내 보증금보다 앞설 수 있어.'),
  quiz('rev-01', 'revolving', '리볼빙을 계속 쓰면?', ['수수료가 쌓여 빚이 불어난다', '이자 없이 미룰 수 있다'],
    '넘긴 금액에 연 15~19% 수준의 수수료가 붙어 원금이 잘 안 줄어.'),
  quiz('auto-01', 'autopay', '저축이 잘 되는 순서는?', ['월급날 저축 자동이체 → 남은 돈으로 생활', '생활하고 남은 돈을 저축'],
    '남는 돈을 저축하려 하면 대부분 남지 않아. 먼저 떼어두고 나머지로 생활하는 게 핵심이야.'),
]
const BANK = [...DAILY, ...DIAGNOSIS]

const NEWS_TITLES: [string, string][] = [
  ['코스피, 외국인 순매수에 2,600선 회복', '시연 경제'],
  ['원/달러 환율 1,380원대…달러 강세 주춤', '시연 경제'],
  ['비트코인, 하루 새 3% 넘게 올라', '시연 경제'],
  ['청년 정책 적금 중도해지율 15.9%…"유지 지원 필요"', '시연 경제'],
  ['전세사기 피해자 75%가 20~30대', '시연 경제'],
]

// 시연 시작 상태: 3세대 '신용 알'을 키우는 중. 10일은 넘었지만 신용이 58이라 새끼에 머물러 있다.
// 오늘 문제의 신용 문제(리볼빙)를 맞히면 60이 되어 신용왕으로 진화한다. 주거는 약해서 증상이 보인다.
const START_MASTERY: Record<StatKey, number> = { shield: 0.62, credit: 0.575, home: 0.3, flow: 0.48 }
const START_DEX: DexEntry[] = [
  { gen: 1, form: 'shield', days: 19, stats_start: { shield: 40, credit: 40, home: 20, flow: 40 }, stats_end: { shield: 71, credit: 44, home: 22, flow: 41 }, graduated_at: '2026-09-02T09:00:00Z' },
  { gen: 2, form: 'home', days: 23, stats_start: { shield: 69, credit: 44, home: 21, flow: 40 }, stats_end: { shield: 64, credit: 47, home: 63, flow: 45 }, graduated_at: '2026-10-05T09:00:00Z' },
]

type State = {
  nick: string | null
  stage: number
  form: string | null
  baseline: Stats | null
  mastery: Record<string, number>
  points: number
  week: number
  done: string[]
  picks: Partial<Record<Asset, Pick>>
  ledger: LedgerRow[]
  gen: number
  focus: string | null
  days: number // 이번 세대 활동일
  adultDays: number
  genStats: Stats | null
  dex: DexEntry[]
}

const KEY = 'jigapmon.demo.state'

// 한 달쯤 매일 돌봐서 모은 돈 (하루 예보 3 · 문제 5 · 적중 1~3개, 서버와 같은 금액).
// 오늘 문제를 다 풀면 커피 교환(2,000원)에 닿도록 잡았다.
const START_POINTS = 1980
function history(now: number): LedgerRow[] {
  const rows: LedgerRow[] = []
  let left = START_POINTS, id = 1
  for (let d = 1; left > 0; d++) {
    const day = now - d * 86400_000
    const plan: [number, string][] = [[2, 'forecast_submit'], [2, 'forecast_submit'], [2, 'forecast_submit'], [5, 'answer'], [5, 'answer'], [5, 'answer'], [2, 'answer'], [5, 'answer']]
    for (let h = 0; h < (d % 3) + 1; h++) plan.push([20, 'forecast_hit'])
    for (const [delta, reason] of plan) {
      const v = Math.min(delta, left)
      if (v <= 0) break
      rows.push({ id: id++, ts: new Date(day + rows.length * 60_000).toISOString(), delta: v, reason, ref_id: null })
      left -= v
    }
  }
  return rows.sort((a, b) => b.ts.localeCompare(a.ts))
}

function fresh(): State {
  const mastery = Object.fromEntries(SKILLS.map((s, i) => [s.id, Math.max(0.05, START_MASTERY[s.stat] + ((i % 3) - 1) * 0.08)]))
  const now = Date.now()
  return {
    nick: '시연몬',
    stage: 2,
    form: null,
    baseline: { shield: 40, credit: 40, home: 20, flow: 40 },
    mastery,
    points: START_POINTS,
    week: 186,
    done: [],
    picks: {},
    ledger: history(now),
    gen: 3,
    focus: 'credit',
    days: 12,
    adultDays: 0,
    genStats: { shield: 64, credit: 47, home: 31, flow: 45 },
    dex: START_DEX,
  }
}

function load(): State {
  try {
    const v = sessionStorage.getItem(KEY)
    if (v) return JSON.parse(v) as State
  } catch {
    // 저장소를 못 쓰면 메모리에서만 진행
  }
  return fresh()
}

let state = load()

function save() {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    // 무시
  }
}

function stats(): Stats {
  return Object.fromEntries(
    STAT_KEYS.map((k) => {
      const ms = SKILLS.filter((s) => s.stat === k).map((s) => state.mastery[s.id])
      return [k, Math.round((ms.reduce((a, b) => a + b, 0) / ms.length) * 100)]
    }),
  ) as Stats
}

/** 이번 세대 성체 모습: 1세대는 가장 높은 힘, 그 뒤로는 고른 알 */
function adultForm(): string {
  return state.focus ?? topStat()
}

function focusReady() {
  if (!state.focus) return true
  const s = stats()
  return state.focus === 'legend' ? STAT_KEYS.every((k) => s[k] >= LEGEND_MIN) : s[state.focus as StatKey] >= FOCUS_MIN
}

function topStat(): string {
  const s = stats()
  if (STAT_KEYS.every((k) => s[k] >= 80)) return 'legend'
  return STAT_KEYS.reduce((a, b) => (s[b] > s[a] ? b : a))
}

const toItem = (d: DemoItem): Item => ({ id: d.id, type: d.type, skill_id: d.skill_id, stat: statOf(d.skill_id), body: d.body, done: state.done.includes(d.id) }) as Item

const wait = <T,>(v: T) => new Promise<T>((r) => setTimeout(() => r(structuredClone(v)), 150))

let ledgerId = 10_000
function earn(delta: number, reason: string) {
  state.points += delta
  state.week += delta
  state.ledger.unshift({ id: ledgerId++, ts: new Date().toISOString(), delta, reason, ref_id: null })
}

export const demoApi: GameApi = {
  home: () =>
    wait<Home>({ nick: state.nick, tier: 2, pet: { stage: state.stage, form: state.form, born_at: null, gen: state.gen, focus: state.focus }, baseline: state.baseline, stats: stats(), points: state.points, today: kstToday() }),

  daily: () =>
    wait<DailySet>({ day: kstToday(), idx: 0, reasons: { home: 2 }, items: DAILY.map(toItem), extra: [], forecasts: state.picks }),

  skills: () => wait<Skill[]>(SKILLS.map((s) => ({ skill_id: s.id, stat: s.stat, name: s.name, mastery: state.mastery[s.id], next_due: null }))),

  forecasts: () => {
    const today = kstToday()
    const yesterday = addDays(today, -1)
    const resolved: Forecast[] = [
      { day: yesterday, asset: 'kr', pick: 'up', move: 1.24, hit: true, points: 22, resolved_at: new Date().toISOString() },
      { day: yesterday, asset: 'fx', pick: 'down', move: 0.31, hit: false, points: 2, resolved_at: new Date().toISOString() },
      { day: yesterday, asset: 'coin', pick: 'up', move: 2.05, hit: true, points: 22, resolved_at: new Date().toISOString() },
    ]
    const open: Forecast[] = ASSETS.filter((a) => state.picks[a.key]).map((a) => ({
      day: today, asset: a.key, pick: state.picks[a.key]!, move: null, hit: null, points: 2, resolved_at: null,
    }))
    return wait([...open, ...resolved])
  },

  league: () => {
    const others: [string, number, number, boolean][] = [
      ['돈모아몬', 412, 3, false], ['절약왕', 365, 3, true], ['짠테크', 290, 2, true], ['코인말고적금', 244, 2, true],
      ['월급루팡', 150, 2, true], ['전세지킴이', 132, 1, true], ['통장쪼개기', 98, 1, true], ['새내기몬', 61, 1, true], ['알부자', 30, 0, true],
    ]
    const rows = [...others.map(([nick, score, stage, bot]) => ({ nick, score, stage, form: null, bot, me: false })),
      { nick: state.nick ?? '나', score: state.week, stage: state.stage, form: state.form, bot: false, me: true }]
      .sort((a, b) => b.score - a.score)
      .map((r, i) => ({ ...r, rank: i + 1 }))
    return wait<League>({ tier: 2, league_code: null, week_start: kstToday(), rows })
  },

  ledger: () => wait(state.ledger),

  news: () =>
    wait<News[]>(NEWS_TITLES.map(([title, source], i) => ({ id: `demo-${i}`, title, link: 'https://news.google.com', source, published_at: new Date(Date.now() - i * 1200_000).toISOString() }))),

  diagnosisItems: () => wait(DIAGNOSIS.map(({ id, type, skill_id, body }) => ({ id, type, skill_id, body }) as Omit<Item, 'stat' | 'done'>)),

  submitAnswer: ({ itemId, choice }) => {
    const item = BANK.find((i) => i.id === itemId)!
    const stat = statOf(item.skill_id)
    const before = stats()[stat]
    const correct = choice === item.answer
    const m = state.mastery[item.skill_id]
    state.mastery[item.skill_id] = correct ? m + 0.35 * (1 - m) : m * 0.6
    if (!state.done.includes(itemId)) state.done.push(itemId)
    const points = correct ? 5 : 2 // 서버 submit_answer 와 같은 금액
    earn(points, 'answer')

    // 오늘 문제를 다 풀었고 고른 알의 힘이 기준을 넘으면 진화 (실제로는 활동 10일 + 기준)
    let evolved: AnswerResult['evolved'] = null
    if (state.stage === 2 && DAILY.every((d) => state.done.includes(d.id)) && focusReady()) {
      state.stage = 3
      state.form = adultForm()
      state.adultDays = 0
      evolved = { stage: state.stage, form: state.form }
    }
    save()
    return wait<AnswerResult>({
      correct, answer: item.answer, explanation: item.explanation, sources: SOURCES[itemId] ?? [FINE], promo: PROMOS[itemId] ?? null,
      points, stat, before, after: stats()[stat], evolved,
    })
  },

  submitDiagnosis: (answers) => {
    const results = answers.map(({ item_id, choice }) => {
      const item = DIAGNOSIS.find((i) => i.id === item_id)!
      const correct = choice === item.answer
      state.mastery[item.skill_id] = correct ? 0.5 : 0.15
      return { item_id, correct, answer: item.answer, explanation: item.explanation }
    })
    state.baseline = stats()
    state.stage = 1
    save()
    return wait({ baseline: state.baseline, results })
  },

  startTreatment: (stat) => {
    const items = BANK.filter((i) => statOf(i.skill_id) === stat).slice(0, 3)
    state.done = state.done.filter((id) => !items.some((i) => i.id === id))
    save()
    return wait(items.map(toItem))
  },

  submitForecast: ({ asset, pick }) => {
    const first = !state.picks[asset]
    state.picks[asset] = pick
    if (first) earn(2, 'forecast_submit')
    save()
    return wait({ pick, points: first ? 2 : 0 })
  },

  pet: () => {
    const s = stats()
    const need = !state.focus
      ? null
      : state.focus === 'legend'
        ? { stat: 'all' as const, min: LEGEND_MIN, value: Math.min(...STAT_KEYS.map((k) => s[k])) }
        : { stat: state.focus as StatKey, min: FOCUS_MIN, value: s[state.focus as StatKey] }
    return wait<PetInfo>({
      gen: state.gen, stage: state.stage, form: state.form, focus: state.focus, days: state.days,
      adult_days: state.adultDays, grad_days: 7, can_graduate: state.stage === 3 && state.adultDays >= 7, need, dex: state.dex,
    })
  },

  graduate: () => {
    const entry: DexEntry = {
      gen: state.gen, form: state.form ?? adultForm(), days: state.days + state.adultDays,
      stats_start: state.genStats, stats_end: stats(), graduated_at: new Date().toISOString(),
    }
    state.dex = [...state.dex, entry]
    Object.assign(state, { stage: 0, form: null, focus: null, gen: state.gen + 1, days: 0, adultDays: 0, genStats: null })
    save()
    return wait({ ...entry, born_on: null })
  },

  chooseEgg: (focus) => {
    Object.assign(state, { focus, stage: 1, days: 0, adultDays: 0, genStats: stats() })
    save()
    return wait({ stage: 1, focus })
  },

  setLeague: (code) => wait(code === null ? 'DEMO42' : code || null),

  setNick: (nick) => {
    state.nick = nick.trim() || null
    save()
    return wait(undefined)
  },
}

/** 시연 메뉴에서 쓰는 조작 */
export const demoControls = {
  get stage() {
    return state.stage
  },
  topStat,
  /** 진화 장면용: 성체로 올리고 모습을 정한다 */
  evolve() {
    state.stage = 3
    state.form = adultForm()
    state.adultDays = 0
    save()
    return { stage: state.stage, form: state.form }
  },
  /** 졸업 장면용: 성체로 7일을 채운 상태로 */
  readyToGraduate() {
    state.stage = 3
    state.form = adultForm()
    state.days = Math.max(state.days, 10)
    state.adultDays = 7
    save()
  },
  nextStage() {
    state.stage = state.stage >= 3 ? 1 : state.stage + 1
    state.form = state.stage === 3 ? adultForm() : null
    save()
  },
  get sick() {
    return stats().home < 15
  },
  /** 주거 스탯을 '아픔' 구간으로 내리거나 되돌린다 */
  toggleSick() {
    const sick = stats().home < 15
    for (const s of SKILLS.filter((x) => x.stat === 'home')) state.mastery[s.id] = sick ? 0.3 : 0.06
    save()
  },
  /** 오늘 문제·예보를 처음 상태로 */
  resetToday() {
    state.done = []
    state.picks = {}
    if (state.stage === 3) {
      state.stage = 2
      state.form = null
      state.adultDays = 0
    }
    save()
  },
  /** 지갑에서 교환 (시연용 쿠폰) */
  redeem(name: string, price: number) {
    state.points -= price
    state.ledger.unshift({ id: ledgerId++, ts: new Date().toISOString(), delta: -price, reason: 'redemption', ref_id: name })
    save()
  },
  /** 시연 시작 상태로 (재촬영용) */
  reset() {
    state = fresh()
    save()
  },
  /** 알부터: 진단 → 부화 */
  restart() {
    state = { ...fresh(), stage: 0, baseline: null, nick: null, gen: 1, focus: null, days: 0, genStats: null, dex: [] }
    save()
  },
}
