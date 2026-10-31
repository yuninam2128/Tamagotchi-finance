// 진화·졸업 공유 카드 (1080×1350, 인스타 피드 비율). 캔버스로 그려 이미지 파일로 공유한다.
import { petImage } from '../components/pet/sprites'
import { ro } from '../domain/money'
import { FORM_LABEL, STAGES, STAT_KEYS, STAT_META, type Stats } from '../domain/stats'

const W = 1080, H = 1350
const LIME = '#9dd949', MINT = '#dcf3d3', TRACK = '#1f2a14', ORANGE = '#f2762e'
const FONT = 'Galmuri11'

export type CardInput = {
  nick: string | null
  stage: number
  form: string | null
  stats: Stats
  code: string | null
  /** 졸업 카드: 세대, 함께한 날, 시작 스탯(성장폭 표시) */
  graduate?: { gen: number; days: number; from: Stats | null }
}

export function petTitle(stage: number, form: string | null) {
  return form ? `${FORM_LABEL[form]} 지갑몬` : `${STAGES[stage]?.name ?? '알'} 지갑몬`
}

function round(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, fill: string) {
  ctx.fillStyle = fill
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, r)
  ctx.fill()
}

export async function makeShareCard(p: CardInput): Promise<Blob> {
  await Promise.all([document.fonts.load(`bold 64px ${FONT}`), document.fonts.load(`28px ${FONT}`)])
  const img = petImage(p.stage, p.form)
  await img.decode().catch(() => undefined)

  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!

  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, W, H)
  const glow = ctx.createRadialGradient(W / 2, H, 0, W / 2, H, 900)
  glow.addColorStop(0, 'rgba(145,213,68,0.35)')
  glow.addColorStop(1, 'rgba(145,213,68,0)')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, W, H)

  // 머리: 서비스 이름 + 제목
  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = LIME
  ctx.font = `bold 52px ${FONT}`
  ctx.fillText('지갑몬', 72, 116)
  ctx.fillStyle = '#8a8a8a'
  ctx.font = `28px ${FONT}`
  ctx.textAlign = 'right'
  ctx.fillText('금융 다마고치', W - 72, 112)
  ctx.textAlign = 'left'

  const title = petTitle(p.stage, p.form)
  const g = p.graduate
  ctx.font = `bold 60px ${FONT}`
  ctx.fillStyle = '#fff'
  ctx.fillText(g ? `${g.days}일 함께한 ${g.gen}세대 지갑몬이` : `${p.nick ?? '내'}의 지갑몬이`, 72, 214)
  const withRo = ro(title)
  ctx.fillStyle = LIME
  ctx.fillText(title, 72, 290)
  ctx.fillStyle = '#fff'
  ctx.fillText(`${withRo.slice(title.length)} ${g ? '졸업했어!' : '자랐어!'}`, 72 + ctx.measureText(title).width, 290)

  // LCD 액자: 연두 테두리 → 검정 → 민트 화면 → 도트 생물
  const S = 580, x = (W - S) / 2, y = 350
  round(ctx, x, y, S, S, 56, LIME)
  round(ctx, x + 18, y + 18, S - 36, S - 36, 42, '#0b0d08')
  round(ctx, x + 34, y + 34, S - 68, S - 68, 30, MINT)
  if (img.naturalWidth) {
    ctx.imageSmoothingEnabled = false
    ctx.save()
    ctx.beginPath()
    ctx.roundRect(x + 34, y + 34, S - 68, S - 68, 30)
    ctx.clip()
    ctx.drawImage(img, x + 34, y + 34, S - 68, S - 68)
    ctx.restore()
  }

  // 스탯 2×2: 앱과 같은 두꺼운 바
  STAT_KEYS.forEach((k, i) => {
    const cx = 72 + (i % 2) * 488, cy = 1010 + Math.floor(i / 2) * 104, bw = 448
    const v = p.stats[k]
    ctx.font = `bold 30px ${FONT}`
    ctx.fillStyle = '#fff'
    ctx.fillText(STAT_META[k].label, cx, cy)
    ctx.textAlign = 'right'
    ctx.font = `28px ${FONT}`
    ctx.fillText(g?.from ? `${g.from[k]} → ${v}` : String(v), cx + bw, cy)
    ctx.textAlign = 'left'
    round(ctx, cx, cy + 16, bw, 30, 15, TRACK)
    if (v > 0) round(ctx, cx, cy + 16, Math.max(30, (bw * v) / 100), 30, 15, v < 50 ? ORANGE : LIME)
  })

  // 바닥: 초대 코드 + 주소
  ctx.font = `bold 32px ${FONT}`
  ctx.fillStyle = p.code ? LIME : '#fff'
  ctx.fillText(p.code ? `친구 리그 코드 ${p.code}` : '같이 키우자!', 72, 1278)
  ctx.font = `26px ${FONT}`
  ctx.fillStyle = '#8a8a8a'
  ctx.textAlign = 'right'
  ctx.fillText(location.host, W - 72, 1276)

  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('카드 생성 실패'))), 'image/png'))
}

/** 이미지로 공유. 파일 공유를 못 하는 브라우저면 이미지를 내려받는다. */
export async function sharePetCard(p: CardInput): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const blob = await makeShareCard(p)
  const file = new File([blob], 'jigapmon.png', { type: 'image/png' })
  const what = p.graduate ? `${p.graduate.days}일 함께한 지갑몬이 ${ro(petTitle(p.stage, p.form))} 졸업했어!` : `내 지갑몬이 ${ro(petTitle(p.stage, p.form))} 자랐어!`
  const text = `${what} 같이 키우자${p.code ? ` (리그 코드 ${p.code})` : ''} ${location.origin}`
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: '지갑몬', text })
      return 'shared'
    } catch {
      return 'cancelled'
    }
  }
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'jigapmon.png'
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  return 'downloaded'
}
