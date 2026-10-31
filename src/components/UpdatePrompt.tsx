import { useRegisterSW } from 'virtual:pwa-register/react'

// 새 버전이 배포되면 사용자가 눌러서 갱신하도록 한다 (진행 중인 세션을 끊지 않기 위해 자동 새로고침은 안 함).
export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW()

  if (!needRefresh) return null

  return (
    <div role="status" className="fixed inset-x-4 bottom-[calc(16px+var(--sab))] z-50 mx-auto flex max-w-[428px] items-center gap-3 rounded-[13px] border border-lime bg-black p-3 text-[13px]">
      <span className="flex-1">새 버전이 있어요.</span>
      <button className="rounded-md px-3 py-2 text-ink-2" onClick={() => setNeedRefresh(false)}>
        나중에
      </button>
      <button className="rounded-[8px] bg-lime px-3 py-2 font-bold text-black" onClick={() => updateServiceWorker(true)}>
        업데이트
      </button>
    </div>
  )
}
