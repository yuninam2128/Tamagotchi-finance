// 시연 모드: 주소에 ?demo 를 붙여 열면 서버 없이 가짜 데이터로 전체 흐름(정답·결과 발표·진화)을 보여준다.
// ?demo=rec 는 녹화용: 시연 메뉴 버튼이 구석의 흐린 점으로 바뀐다.
// 탭을 닫거나 ?demo=off 로 열면 꺼진다. 실제 계정·랭킹에는 아무것도 남지 않는다.
const KEY = 'jigapmon.demo'

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
/** 녹화용: 시연 메뉴를 거의 안 보이게 */
export const DEMO_REC = mode === 'rec'

export function exitDemo() {
  location.href = '/?demo=off'
}
