import { Route, Routes, useLocation } from 'react-router'
import { UpdatePrompt } from './components/UpdatePrompt'
import Home from './pages/Home'
import League from './pages/League'
import Onboarding from './pages/Onboarding'
import Session from './pages/Session'

export default function App() {
  const location = useLocation()
  return (
    <div className="mx-auto flex min-h-dvh max-w-[460px] flex-col px-4">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/onboarding" element={<Onboarding />} />
        {/* ?treat= 가 바뀌면 새 세션으로 다시 시작 */}
        <Route path="/session" element={<Session key={location.search} />} />
        <Route path="/league" element={<League />} />
        <Route path="*" element={<Home />} />
      </Routes>
      <UpdatePrompt />
    </div>
  )
}
