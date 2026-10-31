import type { Session } from '@supabase/supabase-js'
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { DEMO } from './demo'
import { supabase } from './supabase'

type AuthState = { session: Session | null; loading: boolean }

const AuthContext = createContext<AuthState>({ session: null, loading: true })

// 개발 모드(StrictMode)에서 effect 가 두 번 돌면 익명 계정이 두 개 생기고, 진단을 마친 계정과
// 저장된 계정이 달라져 새로고침 후 처음부터 시작하는 문제가 있었다. 로그인은 한 번만 한다.
let pending: Promise<Session | null> | null = null
function ensureSession() {
  pending ??= supabase.auth.getSession().then(async ({ data }) => {
    if (data.session) return data.session
    const { data: anon, error } = await supabase.auth.signInAnonymously()
    if (error) console.error('익명 로그인 실패', error)
    return anon.session
  })
  return pending
}

// 가입 장벽을 없애려고 첫 방문은 익명 로그인으로 시작한다.
// 나중에 이메일/소셜 계정을 연결하면 같은 user id가 유지된다(linkIdentity).
export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ session: null, loading: true })

  useEffect(() => {
    if (DEMO) return // 시연 모드는 서버에 계정을 만들지 않는다
    ensureSession().then((session) => setState({ session, loading: false }))

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      // 첫 방문엔 익명 로그인이 끝나기 전에 '세션 없음'이 먼저 온다. 그걸로 화면을 확정하지 않는다.
      if (session) setState({ session, loading: false })
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react/only-export-components
export const useAuth = () => useContext(AuthContext)
