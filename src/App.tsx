import { lazy, Suspense } from 'react'
import { Route, Routes, useLocation } from 'react-router'
import { UpdatePrompt } from './components/UpdatePrompt'
import { DEMO } from './lib/demo'
import Dex from './pages/Dex'
import Egg from './pages/Egg'
import Home from './pages/Home'
import League from './pages/League'
import Onboarding from './pages/Onboarding'
import Session from './pages/Session'

const DemoPanel = lazy(() => import('./demo/DemoPanel'))

export default function App() {
  const location = useLocation()
  // 시연 메뉴가 홈을 다시 열 때만 바뀌는 값
  const homeKey = (location.state as { demoTick?: number } | null)?.demoTick ?? 'home'
  return (
    <div className="mx-auto flex min-h-dvh max-w-[460px] flex-col px-4">
      {DEMO && (
        <Suspense fallback={null}>
          <DemoPanel />
        </Suspense>
      )}
      <Routes>
        <Route path="/" element={<Home key={homeKey} />} />
        <Route path="/onboarding" element={<Onboarding />} />
        {/* ?treat= 가 바뀌면 새 세션으로 다시 시작 */}
        <Route path="/session" element={<Session key={location.search} />} />
        <Route path="/league" element={<League />} />
        <Route path="/egg" element={<Egg />} />
        <Route path="/dex" element={<Dex />} />
        <Route path="*" element={<Home />} />
      </Routes>
      <UpdatePrompt />
    </div>
  )
}
