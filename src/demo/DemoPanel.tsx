import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useInvalidateGame } from '../api/game'
import { Button } from '../components/ui/Button'
import { Sheet } from '../components/ui/Sheet'
import { STAGES } from '../domain/stats'
import { DEMO_REC, exitDemo } from '../lib/demo'
import { store } from '../lib/store'
import { demoControls } from './api'

// 시연 메뉴: 발표 화면·진화 장면·아픈 상태처럼 실제로는 기다려야 보이는 장면을 바로 띄운다
export default function DemoPanel() {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const invalidate = useInvalidateGame()

  // 홈은 처음 열릴 때 '안 본 결과'·'진화'를 읽으므로 새로 연다
  const reopenHome = () => {
    setOpen(false)
    navigate('/', { state: { demoTick: Date.now() } })
  }

  const run = async (fn: () => void, then: () => void = reopenHome) => {
    fn()
    await invalidate()
    then()
  }

  const nextStage = STAGES[(demoControls.stage + 1) % STAGES.length].name

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="시연 모드 · 메뉴"
        className={
          DEMO_REC
            ? 'fixed top-[calc(var(--sat)+4px)] left-1 z-40 size-6 rounded-full bg-lime/15'
            : 'relative z-20 mt-2 self-center rounded-full border border-lime bg-black px-3 py-1 text-[11px] text-lime'
        }
      >
        {!DEMO_REC && '시연 모드 · 메뉴'}
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title="시연 모드">
        <div className="grid gap-2">
          <p className="mb-1 text-[12px] leading-[1.6] text-ink-2">가짜 데이터로 움직여. 실제 계정·랭킹에는 남지 않아.</p>
          <Button onClick={() => run(() => store.set('seenResult', ''))}>18시 예보 결과 발표 보기</Button>
          <Button onClick={() => run(() => store.set('evolved', demoControls.evolve()))}>진화 장면 보기</Button>
          <Button onClick={() => run(demoControls.readyToGraduate)}>졸업 장면 보기</Button>
          <Button onClick={() => run(demoControls.resetToday, () => (setOpen(false), navigate('/session')))}>오늘 문제 처음부터 풀기</Button>
          <Button variant="ghost" onClick={() => (setOpen(false), navigate('/dex'))}>
            도감 보기
          </Button>
          <Button variant="ghost" onClick={() => run(demoControls.nextStage)}>
            성장 단계 넘기기 → {nextStage}
          </Button>
          <Button variant="ghost" onClick={() => run(demoControls.toggleSick)}>
            {demoControls.sick ? '아픈 상태 낫게 하기' : '아픈 상태 만들기 (주거)'}
          </Button>
          <Button
            variant="ghost"
            onClick={() =>
              run(
                () => (demoControls.restart(), store.set('seenResult', '9999-12-31')),
                () => (setOpen(false), navigate('/onboarding')),
              )
            }
          >
            알부터 다시 (진단 → 부화)
          </Button>
          <Button
            variant="ghost"
            onClick={() =>
              run(() => {
                demoControls.reset()
                store.set('seenNews', '')
              })
            }
          >
            시연 처음으로 (재촬영)
          </Button>
          <Button variant="ghost" onClick={exitDemo}>
            시연 끝내기
          </Button>
        </div>
      </Sheet>
    </>
  )
}
