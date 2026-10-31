// 시연 모드: 주소에 ?demo 를 붙여 열면 서버 없이 가짜 데이터로 전체 흐름(정답·결과 발표·진화)을 보여준다.
// ?demo=rec 는 녹화용: 시연 메뉴 버튼이 구석의 흐린 점으로 바뀐다.
// 탭을 닫거나 ?demo=off 로 열면 꺼진다. 실제 계정·랭킹에는 아무것도 남지 않는다.
import { addDays, kstToday } from '../domain/forecast'

const KEY = 'jigapmon.demo'
const STATE_KEY = 'jigapmon.demo.state' // src/demo/api.ts 의 시연 상태

function detect() {
  const param = new URLSearchParams(location.search).get('demo')
  try {
    if (param === 'off') sessionStorage.removeItem(KEY)
    else if (param !== null) sessionStorage.setItem(KEY, param === 'rec' ? 'rec' : '1')
    return sessionStorage.getItem(KEY)
  } catch {
    return param !== null && param !== 'off' ? param || '1' : null
  }
}

const mode = detect()
export const DEMO = !!mode

// 새 시연을 시작할 때: 결과 팝업 없이 바로 홈 (결과 발표는 진화 뒤에 이어서 뜬다).
// 홈이 처음 그려질 때 읽는 값이라, 시연 데이터 모듈(지연 로딩)보다 먼저 정해 둔다.
if (mode) {
  try {
    if (!sessionStorage.getItem(STATE_KEY)) {
      localStorage.setItem('jigapmon.demo.seenResult', JSON.stringify(addDays(kstToday(), -1)))
      localStorage.removeItem('jigapmon.demo.evolved')
    }
  } catch {
    // 저장소를 못 쓰면 결과 팝업이 먼저 뜰 뿐
  }
}
/** 녹화용: 시연 메뉴를 거의 안 보이게 */
export const DEMO_REC = mode === 'rec'

export function exitDemo() {
  location.href = '/?demo=off'
}
