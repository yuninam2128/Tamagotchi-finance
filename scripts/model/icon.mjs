import sharp from 'sharp'
import fs from 'fs'
const [src, out] = process.argv.slice(2)
const { data, info } = await sharp(src).raw().toBuffer({ resolveWithObject: true })
const W = info.width, C = info.channels
const dark = (x, y) => data[(y * W + x) * C] < 100
// 가장 짧은 검정 가로 연속 길이 = 도트 크기
const runs = []
for (let y = 0; y < W; y++) { let r = 0; for (let x = 0; x <= W; x++) { if (x < W && dark(x, y)) r++; else { if (r) runs.push(r); r = 0 } } }
const counts = {}; runs.forEach((r) => (counts[r] = (counts[r] || 0) + 1))
console.log('runs', Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 6))
const D = +process.argv[4]
if (!D) process.exit()
// 도트 격자의 시작점: 첫 검정 픽셀 위치 기준
let ox = W, oy = W
for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) if (dark(x, y)) { ox = Math.min(ox, x); oy = Math.min(oy, y) }
ox %= D; oy %= D
const cells = []
for (let gy = 0; (gy + 1) * D + oy <= W; gy++) for (let gx = 0; (gx + 1) * D + ox <= W; gx++) { let n = 0, d = 0
  for (let y = Math.ceil(oy + gy * D); y < oy + (gy + 1) * D && y < W; y++) for (let x = Math.ceil(ox + gx * D); x < ox + (gx + 1) * D && x < W; x++) { n++; if (dark(x, y)) d++ }
  if (n && d / n >= 0.4) cells.push([gx, gy]) }
const xs = cells.map((c) => c[0]), ys = cells.map((c) => c[1])
const minx = Math.min(...xs), maxx = Math.max(...xs), miny = Math.min(...ys), maxy = Math.max(...ys)
console.log('grid', D, 'bbox', minx, miny, maxx, maxy, 'cells', cells.length)
const gw = maxx - minx + 1, gh = maxy - miny + 1
// 512 아이콘: 검정 바탕, 가운데 LCD(민트) + 연두 테두리, 생물은 LCD 안 60%
const S = 512, lcd = 360, lx = (S - lcd) / 2, ly = (S - lcd) / 2
const dot = Math.floor((lcd * 0.8) / Math.max(gw, gh))
const px = lx + (lcd - gw * dot) / 2, py = ly + (lcd - gh * dot) / 2
const rects = cells.map(([x, y]) => `<rect x="${px + (x - minx) * dot}" y="${py + (y - miny) * dot}" width="${dot}" height="${dot}"/>`).join('')
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${S} ${S}" shape-rendering="crispEdges">
  <!-- 지갑몬 아이콘: 성장 2단계 생물(src/assets/pets/stage-2.png)을 도트로 옮김. scripts 없이 손으로 고치지 말고 다시 생성 -->
  <rect width="${S}" height="${S}" fill="#000"/>
  <rect x="${lx - 22}" y="${ly - 22}" width="${lcd + 44}" height="${lcd + 44}" rx="40" fill="#9dd949"/>
  <rect x="${lx - 10}" y="${ly - 10}" width="${lcd + 20}" height="${lcd + 20}" rx="30" fill="#0b0d08"/>
  <rect x="${lx}" y="${ly}" width="${lcd}" height="${lcd}" rx="20" fill="#d9f5dc"/>
  <g fill="#0b0d08">${rects}</g>
</svg>
`
fs.writeFileSync(out, svg)
