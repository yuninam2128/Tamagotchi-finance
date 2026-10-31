import type { Session } from '@supabase/supabase-js'
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase } from './supabase'

type AuthState = { session: Session | null; loading: boolean }

const AuthContext = createContext<AuthState>({ session: null, loading: true })

// 가입 장벽을 없애려고 첫 방문은 익명 로그인으로 시작한다.
// 나중에 이메일/소셜 계정을 연결하면 같은 user id가 유지된다(linkIdentity).
export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ session: null, loading: true })

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (data.session) return setState({ session: data.session, loading: false })
      const { data: anon, error } = await supabase.auth.signInAnonymously()
      if (error) console.error('익명 로그인 실패', error)
      setState({ session: anon.session, loading: false })
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setState({ session, loading: false })
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react/only-export-components
export const useAuth = () => useContext(AuthContext)
