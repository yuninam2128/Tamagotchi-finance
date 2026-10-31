// 지갑몬 그림. src/assets/pets/ 에 이름 규칙대로 파일을 넣으면 코드 수정 없이 잡힌다.
//   stage-0~3.png        알 · 아기 · 새끼 · 성체(기본)
//   form-<모습>.png      성체 모습별 (shield 철벽형 · credit 신용왕 · home 집지킴이 · flow 저축왕 · legend 레전드)
// 그림 규격: 384×384 PNG, 민트 바탕(#dcf3d3) + 검정 도트, 48×48칸(한 칸 8px) 격자. 생물은 가운데 약 26칸 안에.
const files = import.meta.glob<string>('../../assets/pets/*.png', { eager: true, import: 'default' })
const byName = Object.fromEntries(Object.entries(files).map(([path, url]) => [path.split('/').pop()!.replace('.png', ''), url]))

export function petSprite(stage: number, form?: string | null): string {
  const s = Math.max(0, Math.min(3, stage))
  if (s === 3 && form && byName[`form-${form}`]) return byName[`form-${form}`]
  return byName[`stage-${s}`]
}

const cache = new Map<string, HTMLImageElement>()
/** 캔버스에 그릴 이미지 (한 번 불러오면 재사용) */
export function petImage(stage: number, form?: string | null): HTMLImageElement {
  const src = petSprite(stage, form)
  let img = cache.get(src)
  if (!img) {
    img = new Image()
    img.src = src
    cache.set(src, img)
  }
  return img
}
