import { useEffect, useState } from 'react'
import { useAuth } from '../lib/auth'
import { enablePush, getPushState, type PushState } from '../lib/push'
import { PixelIcon } from './ui/PixelIcon'

// 돌봄·결과 알림 켜기. 이미 켰거나 지원하지 않으면 숨긴다.
export function PushCard() {
  const { session } = useAuth()
  const [state, setState] = useState<PushState | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    getPushState().then(setState).catch(() => setState('unsupported'))
  }, [])

  if (!state || state === 'on' || state === 'unsupported') return null

  return (
    <section className="flex items-center gap-3 rounded-[13px] border border-line p-3 text-[12px] leading-[1.6]">
      <PixelIcon name="sparkle" size={22} />
      <p className="flex-1 text-ink-2">
        {state === 'needs-install'
          ? '알림을 받으려면 공유 버튼 → 홈 화면에 추가로 설치해줘.'
          : state === 'denied'
            ? '알림이 차단돼 있어. 브라우저 설정에서 허용해줘.'
            : '18시 결과 발표랑 돌봄 시간을 알려줄게.'}
      </p>
      {state === 'off' && session && (
        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            setBusy(true)
            try {
              setState(await enablePush(session.user.id))
            } finally {
              setBusy(false)
            }
          }}
          className="shrink-0 rounded-[8px] border border-lime px-3 py-1.5 text-[12px] font-bold text-lime"
        >
          알림 켜기
        </button>
      )}
    </section>
  )
}
