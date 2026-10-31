// 다마고치 LCD 화면을 캔버스에 그린다. 성장 단계 그림 위에 스탯 증상을 LCD 도트로 얹는다.
import type { Symptom } from '../../domain/stats'
import { petImage } from './sprites'

export const LCD_W = 256
export const LCD_H = 232
const DOT = 4 // LCD 도트 하나 = 4px
const INK = '#16210f'
const BG = '#dcf3d3'

export type Mood = 'idle' | 'happy' | 'sick'

export type LcdState = {
  stage: number
  form?: string | null // 성체 모습
  symptoms: Symptom[]
  mood: Mood
  news: boolean // 새 뉴스가 들어오면 'NEWS' 깜빡임
}

/** 도트 단위 좌표로 픽셀 패턴을 찍는다. pattern 은 '#' = 켜진 도트 */
function sprite(ctx: CanvasRenderingContext2D, pattern: string[], gx: number, gy: number) {
  ctx.fillStyle = INK
  pattern.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) if (row[x] === '#') ctx.fillRect((gx + x) * DOT, (gy + y) * DOT, DOT, DOT)
  })
}

const BUG = ['#.#', '.#.', '###', '#.#']
const LINK = ['.##.', '#..#', '.##.']
const DROP = ['.#.', '###', '.#.']
const COIN = ['.##.', '#..#', '#..#', '.##.']
const CROSS = ['.#.', '###', '.#.']

/** t: 초 단위 시간 */
export function drawLcd(ctx: CanvasRenderingContext2D, s: LcdState, t: number) {
  const gw = LCD_W / DOT, gh = LCD_H / DOT
  const beat = Math.floor(t * 2) // 0.5초마다 한 칸
  ctx.imageSmoothingEnabled = false
  ctx.fillStyle = BG
  ctx.fillRect(0, 0, LCD_W, LCD_H)

  // 펫: 원작처럼 좌우로 한 칸씩 걷고, 기쁘면 통통 튄다. 아프면 가만히.
  const img = petImage(s.stage, s.form)
  if (img.complete && img.naturalWidth) {
    const dx = s.mood === 'sick' ? 0 : ((beat % 4) < 2 ? -1 : 1) * DOT * (s.stage === 0 ? 0.5 : 1)
    const dy = s.mood === 'happy' ? -(beat % 2) * DOT * 2 : 0
    const size = LCD_H * 1.1
    ctx.globalAlpha = s.mood === 'sick' ? 0.55 : 1
    ctx.drawImage(img, (LCD_W - size) / 2 + dx, (LCD_H - size) / 2 + dy, size, size)
    ctx.globalAlpha = 1
  }

  // 증상
  for (const sym of s.symptoms) {
    if (sym === 'bugs') {
      const p = beat % 2
      sprite(ctx, BUG, 8 + p, 10)
      sprite(ctx, BUG, gw - 14 - p, 30)
      sprite(ctx, BUG, 12, gh - 14 + p)
    } else if (sym === 'chain') {
      for (let x = 14; x < gw - 14; x += 4) sprite(ctx, LINK, x, Math.round(gh / 2) + 2)
    } else if (sym === 'leak') {
      for (const [x, o] of [[18, 0], [34, 5], [48, 2]]) sprite(ctx, DROP, x, 4 + ((beat + o) % 8) * 2)
    } else if (sym === 'wallet') {
      sprite(ctx, COIN, gw - 10, gh - 16 + (beat % 3) * 3)
      sprite(ctx, COIN, gw - 16, gh - 8)
    }
  }

  if (s.mood === 'sick' && beat % 2 === 0) sprite(ctx, CROSS, 3, 3)

  if (s.news && beat % 2 === 0) {
    ctx.fillStyle = INK
    ctx.font = 'bold 22px Galmuri11, monospace'
    ctx.textBaseline = 'top'
    ctx.fillText('NEWS', LCD_W - 66, 8)
  }

  // LCD 격자 느낌
  ctx.fillStyle = 'rgba(0,0,0,0.04)'
  for (let x = 0; x < LCD_W; x += DOT) ctx.fillRect(x, 0, 1, LCD_H)
  for (let y = 0; y < LCD_H; y += DOT) ctx.fillRect(0, y, LCD_W, 1)
}
