// 해설 출처.
// - 통계·수치를 말하는 해설은 itemSources 에 출처를 단다 (처음 기획 리서치에 붙은 출처 그대로).
//   지금은 대부분 언론 보도라서, 정식 출시 전에 원자료(기관 보도자료·보고서)로 바꾸는 걸 권한다.
// - 그 밖의 해설은 skillRefs 의 공식 안내를 '참고'로 보여준다. 해설 문장을 그 기관이 쓴 것처럼 표시하지 않는다.
// - 숫자가 있는데 출처가 없으면 build-content 가 '출처 필요' 경고를 띄운다.

export const REFS = {
  literacy2024: { label: '한국은행·금융감독원, 2024 전국민 금융이해력 조사', url: 'https://eiec.kdi.re.kr/policy/materialView.do?num=266065' },
  impersonation20s: { label: '머니투데이, 검찰 사칭 보이스피싱 20대 노린다 (2024.4.2)', url: 'https://www.mt.co.kr/society/2024/04/02/2024040113355547136' },
  jeonseVictims: { label: '쿠키뉴스, 전세사기 피해자 3만명 넘었다…20~30대가 75% (2025.6.26)', url: 'https://www.kukinews.com/article/view/kuk202506260209' },
  youthCredit: { label: '메가경제, 청년 대출자 10명 중 6명은 다중채무자', url: 'https://megaeconomy.co.kr/news/newsview.php?ncode=1065592521374545' },
  leverage20s: { label: '세계비즈, 20대 청년층 빚투 증가 (2026.4.30)', url: 'https://m.segyebiz.com/newsView/20260430513296' },
  doyakCancel: { label: '쿠키뉴스, 청년도약계좌 중도해지율 (2025.8.20)', url: 'https://www.kukinews.com/article/view/kuk202508200201' },
  lease3: { label: '주택임대차보호법 제3조(대항력)', url: 'https://www.law.go.kr/법령/주택임대차보호법' },
  lease3_2: { label: '주택임대차보호법 제3조의2(보증금의 회수)', url: 'https://www.law.go.kr/법령/주택임대차보호법' },

  // 참고용 공식 안내
  fine: { label: '금융감독원 금융소비자 정보포털 파인', url: 'https://fine.fss.or.kr' },
  police: { label: '경찰청 사이버범죄 신고시스템', url: 'https://ecrm.police.go.kr' },
  iros: { label: '대법원 인터넷등기소', url: 'https://www.iros.go.kr' },
  gov24: { label: '정부24 (전입신고·확정일자)', url: 'https://www.gov.kr' },
  hug: { label: '주택도시보증공사(HUG) 전세보증금반환보증', url: 'https://www.khug.or.kr' },
  kinfa: { label: '서민금융진흥원', url: 'https://www.kinfa.or.kr' },
  ccrs: { label: '신용회복위원회', url: 'https://www.ccrs.or.kr' },
  kosaf: { label: '한국장학재단', url: 'https://www.kosaf.go.kr' },
}

/** 문제 id → 출처 (해설 속 통계·법 조항의 근거) */
export const itemSources = {
  'imp-01': ['impersonation20s'],
  'scr-01': ['youthCredit'],
  'del-03': ['youthCredit'],
  'lns-02': ['leverage20s'],
  'reg-02': ['jeonseVictims'],
  'mov-01': ['lease3'],
  'mov-02': ['lease3_2'],
  'emg-03': ['doyakCancel'],
  'pol-01': ['doyakCancel'],
  'fix-04': ['literacy2024'],
}

/** 숫자가 있어도 해설 속 계산 예시라 출처가 필요 없는 문제 */
export const calcOnly = ['lns-01', 'fix-03']

/** 스킬 → 더 알아보기 (공식 안내) */
export const skillRefs = {
  impersonation: ['fine', 'police'],
  loan_bait: ['fine'],
  messenger: ['police'],
  invest_scam: ['fine'],
  market_scam: ['police'],
  score: ['fine'],
  delinquency: ['ccrs', 'kosaf'],
  revolving: ['fine'],
  cash_advance: ['fine', 'kinfa'],
  loan_structure: ['fine'],
  registry: ['iros'],
  move_in: ['gov24'],
  guarantee: ['hug'],
  closing: ['iros'],
  emergency: ['fine'],
  fixed_cost: ['fine'],
  savings_keep: ['fine'],
  autopay: ['fine'],
  policy: ['kinfa'],
}
