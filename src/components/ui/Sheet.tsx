import { useEffect, useRef, type ReactNode } from 'react'

// 아래에서 올라오는 시트 / 가운데 모달. <dialog> 를 써서 포커스 가두기와 Esc 닫기를 브라우저에 맡긴다.
export function Sheet({
  open,
  onClose,
  title,
  children,
  center = false,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  center?: boolean
}) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      aria-label={title}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      className={`m-0 max-h-[85dvh] w-full max-w-none bg-transparent p-0 text-ink backdrop:bg-black/70 ${
        center ? 'm-auto max-w-[400px] px-4' : 'mt-auto'
      }`}
    >
      <div
        className={`animate-rise mx-auto max-w-[460px] border border-lime bg-black p-5 ${
          center ? 'rounded-[13px]' : 'rounded-t-[13px] border-b-0 pb-[calc(20px+env(safe-area-inset-bottom))]'
        }`}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-[15px] font-bold">{title}</h2>
          <button type="button" onClick={onClose} className="px-2 py-1 text-[13px] text-ink-2" aria-label="닫기">
            닫기
          </button>
        </div>
        {children}
      </div>
    </dialog>
  )
}
