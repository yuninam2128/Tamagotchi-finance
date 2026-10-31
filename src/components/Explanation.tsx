import type { Promo, Source } from '../api/game'

// 정답 확인 뒤 해설 + 출처 + (있으면) 제휴 상품.
// 출처: 해설 속 수치·조항의 근거는 '출처', 공식 안내는 '더 알아보기'로 나눠 보여준다.
export function Explanation({ text, sources, promo }: { text: string; sources: Source[]; promo: Promo | null }) {
  const cited = sources.filter((s) => s.kind === 'source')
  const refs = sources.filter((s) => s.kind === 'ref')
  return (
    <div className="animate-rise grid gap-2">
      <div className="rounded-[13px] border border-lime p-4 text-[13px] leading-[1.7]">
        {text}
        {(cited.length > 0 || refs.length > 0) && (
          <dl className="mt-3 grid gap-1 border-t border-line pt-2 text-[11px] leading-[1.6] text-ink-3">
            {cited.length > 0 && <SourceRow term="출처" items={cited} />}
            {refs.length > 0 && <SourceRow term="더 알아보기" items={refs} />}
          </dl>
        )}
      </div>
      {promo && <PromoCard promo={promo} />}
    </div>
  )
}

function SourceRow({ term, items }: { term: string; items: Source[] }) {
  return (
    <div className="flex gap-2">
      <dt className="shrink-0 text-ink-2">{term}</dt>
      <dd className="min-w-0">
        {items.map((s, i) => (
          <span key={s.label}>
            {i > 0 && ' · '}
            {s.url ? (
              <a href={s.url} target="_blank" rel="noreferrer" className="underline decoration-line underline-offset-2">
                {s.label}
              </a>
            ) : (
              s.label
            )}
          </span>
        ))}
      </dd>
    </div>
  )
}

/** 제휴 상품: 광고임을 먼저 밝히고, 수수료를 받는다는 사실을 함께 고지한다 */
function PromoCard({ promo }: { promo: Promo }) {
  return (
    <aside aria-label="제휴 상품" className="rounded-[13px] bg-card p-4 text-card-ink">
      <p className="mb-1 flex items-center gap-2 text-[11px] text-card-ink-2">
        <span className="rounded-[4px] bg-black px-1.5 py-0.5 font-bold text-lime">제휴</span>
        {promo.partner}
      </p>
      <p className="text-[14px] font-bold">{promo.product}</p>
      <p className="mt-1 text-[12px] leading-[1.6]">{promo.summary}</p>
      {promo.url && (
        <a href={promo.url} target="_blank" rel="noreferrer sponsored" className="mt-3 block rounded-[10px] bg-black py-2.5 text-center text-[13px] font-bold text-lime">
          상품 자세히 보기
        </a>
      )}
      <p className="mt-3 text-[10px] leading-[1.6] text-card-ink-2">
        지갑몬은 이 상품의 가입 연결로 {promo.partner}에서 수수료를 받을 수 있어. 가입 전에 상품설명서와 약관을 꼭 확인해.
        {promo.disclosure && ` ${promo.disclosure}`}
      </p>
    </aside>
  )
}
