// Figma 아이콘 뭉치(픽셀 아이콘 시트)에서 잘라낸 아이콘만 쓴다. 다른 아이콘 세트는 쓰지 않는다.
import arrowDown from '../../assets/icons/arrow-down.png'
import arrowUp from '../../assets/icons/arrow-up.png'
import asterisk from '../../assets/icons/asterisk.png'
import clover from '../../assets/icons/clover.png'
import coin from '../../assets/icons/coin.png'
import disc from '../../assets/icons/disc.png'
import gamepad from '../../assets/icons/gamepad.png'
import heart from '../../assets/icons/heart.png'
import sparkle from '../../assets/icons/sparkle.png'
import sword from '../../assets/icons/sword.png'
import waves from '../../assets/icons/waves.png'

export const ICONS = {
  'arrow-up': arrowUp,
  'arrow-down': arrowDown,
  asterisk,
  clover,
  coin,
  disc,
  gamepad,
  heart,
  sparkle,
  sword,
  waves,
} as const

export type IconName = keyof typeof ICONS

/** size = 높이(px). 너비는 원본 비율 */
export function PixelIcon({ name, size = 24, className = '' }: { name: IconName; size?: number; className?: string }) {
  return <img src={ICONS[name]} alt="" aria-hidden className={`pixel inline-block w-auto shrink-0 ${className}`} style={{ height: size }} />
}
