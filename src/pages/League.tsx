import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useHome, useLeague, useSetLeague, useSetNick } from '../api/game'
import { RankingList } from '../components/RankingList'
import { ShareCardButton } from '../components/ShareCardButton'
import { PixelIcon } from '../components/ui/PixelIcon'

const TIERS = ['브론즈', '실버', '골드', '플래티넘', '다이아']

// 주간 랭킹 (Figma '랭킹 레퍼' 스타일) + 친구 리그 코드 + 닉네임
export default function League() {
  const navigate = useNavigate()
  const { data: league } = useLeague()
  const { data: home } = useHome()
  const setLeague = useSetLeague()
  const setNick = useSetNick()
  const [code, setCode] = useState('')
  const [nick, setNickValue] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const share = async () => {
    if (!league?.league_code) return
    const text = `지갑몬 친구 리그에 들어와! 코드: ${league.league_code} ${location.origin}`
    try {
      if (navigator.share) await navigator.share({ title: '지갑몬 리그', text })
      else {
        await navigator.clipboard.writeText(text)
        setCopied(true)
      }
    } catch {
      // 공유 취소
    }
  }

  return (
    <main className="flex flex-1 flex-col gap-5 px-1.5 pt-[20px] pb-[45px]">
      <header className="flex items-center gap-3">
        <button type="button" onClick={() => navigate('/')} className="px-1 text-[18px] text-ink-2" aria-label="뒤로">
          ←
        </button>
        <h1 className="flex-1 text-[18px] font-bold">랭킹</h1>
        <PixelIcon name="gamepad" size={26} />
      </header>

      <section className="rounded-[13px] bg-rank p-3">
        <p className="mb-3 flex justify-between px-2 text-[12px] text-ink-2">
          <span>
            {league?.league_code ? `친구 리그 ${league.league_code}` : `${TIERS[league?.tier ?? 0]} 리그`} · 이번 주
          </span>
          <span>매주 월요일 초기화</span>
        </p>
        <RankingList rows={league?.rows ?? []} />
      </section>

      <ShareCardButton label="내 지갑몬 카드 공유하기" variant="ghost" />

      <section className="grid gap-2">
        <h2 className="pl-[14px] text-[15px] font-bold">친구 리그</h2>
        {league?.league_code ? (
          <div className="flex gap-2">
            <button type="button" onClick={share} className="h-[51px] flex-1 rounded-[13px] border border-lime text-[14px] font-bold">
              {copied ? '복사했어!' : '초대하기'}
            </button>
            <button
              type="button"
              onClick={() => setLeague.mutate('')}
              className="h-[51px] rounded-[13px] border border-line px-4 text-[14px] text-ink-2"
            >
              나가기
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 6))}
              placeholder="리그 코드"
              aria-label="리그 코드"
              className="h-[51px] min-w-0 flex-1 rounded-[13px] border border-line bg-black px-4 text-[15px] tracking-widest placeholder:tracking-normal placeholder:text-ink-3 focus:border-lime focus:outline-none"
            />
            <button
              type="button"
              disabled={code.length !== 6 || setLeague.isPending}
              onClick={() => setLeague.mutate(code)}
              className="h-[51px] rounded-[13px] border border-line px-4 text-[14px] disabled:opacity-40"
            >
              참여
            </button>
            <button
              type="button"
              disabled={setLeague.isPending}
              onClick={() => setLeague.mutate(null)}
              className="h-[51px] rounded-[13px] border border-lime px-4 text-[14px] font-bold"
            >
              만들기
            </button>
          </div>
        )}
        {setLeague.isError && <p className="pl-[14px] text-[12px] text-orange">코드를 다시 확인해줘.</p>}
      </section>

      <section className="grid gap-2">
        <h2 className="pl-[14px] text-[15px] font-bold">내 이름</h2>
        <div className="flex gap-2">
          <input
            value={nick ?? home?.nick ?? ''}
            onChange={(e) => setNickValue(e.target.value.slice(0, 12))}
            placeholder="익명 예보관"
            aria-label="닉네임"
            className="h-[51px] min-w-0 flex-1 rounded-[13px] border border-line bg-black px-4 text-[15px] placeholder:text-ink-3 focus:border-lime focus:outline-none"
          />
          <button
            type="button"
            disabled={nick === null || setNick.isPending}
            onClick={() => nick !== null && setNick.mutate(nick, { onSuccess: () => setNickValue(null) })}
            className="h-[51px] rounded-[13px] border border-line px-4 text-[14px] disabled:opacity-40"
          >
            저장
          </button>
        </div>
      </section>
    </main>
  )
}
