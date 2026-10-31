// 하위 스킬. 스탯 = 이 스킬들 숙련도의 평균이다.
// id 는 문제·숙련도 기록이 참조하므로 한 번 배포하면 바꾸지 말 것.
export const skills = [
  // SHIELD 방어 — 기관사칭형 보이스피싱(20대 이하 피해자의 85%), 대출빙자, 투자리딩방
  { id: 'impersonation', stat: 'shield', name: '기관사칭' },
  { id: 'loan_bait', stat: 'shield', name: '대출빙자' },
  { id: 'messenger', stat: 'shield', name: '메신저·문자피싱' },
  { id: 'invest_scam', stat: 'shield', name: '투자리딩방' },
  { id: 'market_scam', stat: 'shield', name: '중고거래·고액알바' },

  // CREDIT 신용 — 대출 보유 20대의 60.7%가 저신용, 장기연체 증가
  { id: 'score', stat: 'credit', name: '신용점수' },
  { id: 'delinquency', stat: 'credit', name: '연체' },
  { id: 'revolving', stat: 'credit', name: '리볼빙' },
  { id: 'cash_advance', stat: 'credit', name: '현금서비스·카드론' },
  { id: 'loan_structure', stat: 'credit', name: '대출 구조' },

  // HOME 주거 — 전세사기 피해자의 75%가 20~30대
  { id: 'registry', stat: 'home', name: '등기부' },
  { id: 'move_in', stat: 'home', name: '전입·확정일자' },
  { id: 'guarantee', stat: 'home', name: '보증보험' },
  { id: 'closing', stat: 'home', name: '잔금·이사 순서' },

  // FLOW 흐름 — 청년도약계좌 중도해지율 15.9%, 20대 재무 점검 점수 33.2점
  { id: 'emergency', stat: 'flow', name: '비상금' },
  { id: 'fixed_cost', stat: 'flow', name: '고정비' },
  { id: 'savings_keep', stat: 'flow', name: '적금 유지' },
  { id: 'autopay', stat: 'flow', name: '자동이체' },
  { id: 'policy', stat: 'flow', name: '정책상품' },
]
