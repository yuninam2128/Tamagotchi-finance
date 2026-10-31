import { useState } from 'react'
import { useHome, useLeague, type Graduation } from '../api/game'
import { sharePetCard } from '../lib/shareCard'
import { Button } from './ui/Button'

// 내 지갑몬 공유 카드(이미지). 친구 리그 코드가 있으면 카드에 같이 넣어 초대로 이어지게 한다.
export function ShareCardButton({
  label = '공유 카드 만들기',
  variant = 'glow',
  graduation,
}: {
  label?: string
  variant?: 'glow' | 'ghost'
  graduation?: Graduation // 있으면 졸업 카드
}) {
  const { data: home } = useHome()
  const { data: league } = useLeague()
  const [state, setState] = useState<'idle' | 'busy' | 'downloaded'>('idle')

  async function share() {
    if (!home) return
    setState('busy')
    try {
      const r = await sharePetCard(
        graduation
          ? {
              nick: home.nick, stage: 3, form: graduation.form, stats: graduation.stats_end ?? home.stats, code: league?.league_code ?? null,
              graduate: { gen: graduation.gen, days: graduation.days, from: graduation.stats_start },
            }
          : { nick: home.nick, stage: home.pet.stage, form: home.pet.form, stats: home.stats, code: league?.league_code ?? null },
      )
      setState(r === 'downloaded' ? 'downloaded' : 'idle')
    } catch {
      setState('idle')
    }
  }

  return (
    <Button variant={variant} disabled={!home || state === 'busy'} onClick={share}>
      {state === 'busy' ? '카드 만드는 중…' : state === 'downloaded' ? '이미지를 저장했어!' : label}
    </Button>
  )
}
