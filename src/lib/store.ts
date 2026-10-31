// 기기별 편의 상태(본 뉴스, 본 결과, 화면 간 전달값). 사생활 모드 등에서 저장이 막혀도 앱은 동작해야 한다.
const PREFIX = 'jigapmon.'

export const store = {
  get<T>(key: string, fallback: T): T {
    try {
      const v = localStorage.getItem(PREFIX + key)
      return v == null ? fallback : (JSON.parse(v) as T)
    } catch {
      return fallback
    }
  },
  set(key: string, value: unknown) {
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(value))
    } catch {
      // 저장 불가 — 무시
    }
  },
  /** 한 번 읽고 지운다 (예: 세션 화면에서 진화 → 홈에서 팝업) */
  take<T>(key: string): T | null {
    const v = store.get<T | null>(key, null)
    try {
      localStorage.removeItem(PREFIX + key)
    } catch {
      // 무시
    }
    return v
  },
}
