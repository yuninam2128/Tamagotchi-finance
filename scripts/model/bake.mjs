// 모델의 TAMAGOTCHI 로고를 지우고(텍스처 3장 + 메시 요철) 그 자리에 '지갑몬' 명판을 붙인다.
// 사용법 (scripts/model/README 참고):
//   node bake.mjs <최적화된.glb> <원본 텍스처 폴더> <명판.png> <출력.glb>
// 로고 위치(BOX)·명판 위치(PL)는 모델 좌표(높이 0~0.98)라서 모델을 바꾸면 front.mjs 로 앞면을 펼쳐 보고 다시 맞춘다.
import { NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer'
import sharp from 'sharp'
const [glbIn, texDir, platePath, glbOut] = process.argv.slice(2)
await MeshoptDecoder.ready; await MeshoptEncoder.ready
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder })
const doc = await io.read(glbIn)
const load = async (f) => { const r = await sharp(`${texDir}/${f}`).removeAlpha().raw().toBuffer({ resolveWithObject: true }); return { d: r.data, w: r.info.width } }
const base = await load('0-tamagotchi_3d_model_basecolor.jpg.jpeg')
const rm = await load('1-tamagotchi_3d_model_rm.jpg.jpeg')
const nrm = await load('2-tamagotchi_3d_model_normal.png.png')
const TW = base.w

function tm(p, m) { const [x, y, z] = p; return [m[0]*x+m[4]*y+m[8]*z+m[12], m[1]*x+m[5]*y+m[9]*z+m[13], m[2]*x+m[6]*y+m[10]*z+m[14]] }
const node = doc.getRoot().listNodes().find((n) => n.getMesh())
const M = node.getWorldMatrix()
const prim = node.getMesh().listPrimitives()[0]
const P = prim.getAttribute('POSITION'), UV = prim.getAttribute('TEXCOORD_0'), N = prim.getAttribute('NORMAL'), idx = prim.getIndices().getArray()
const pos = [], uv = [], nz = []
for (let i = 0; i < P.getCount(); i++) { pos.push(tm(P.getElement(i, []), M)); uv.push(UV.getElement(i, [])); const n = N.getElement(i, []); const w = [M[0]*n[0]+M[4]*n[1]+M[8]*n[2], M[1]*n[0]+M[5]*n[1]+M[9]*n[2], M[2]*n[0]+M[6]*n[1]+M[10]*n[2]]; nz.push(w[2] / (Math.hypot(...w) || 1)) }

// 로고가 있는 앞면 영역 (모델 좌표)
const BOX = { x0: -0.21, x1: 0.21, y0: 0.548, y1: 0.67 }
// 앞에서 보이는 면만 고르기 위해 영역의 깊이 버퍼를 만든다 (겉면 아래에 겹친 면이 있다)
const M_ = 0.05, EB = { x0: BOX.x0 - M_, x1: BOX.x1 + M_, y0: BOX.y0 - 0.005, y1: BOX.y1 + M_ }
const ZS = 3000, ZW = Math.ceil((EB.x1 - EB.x0) * ZS), ZH = Math.ceil((EB.y1 - EB.y0) * ZS)
const zb = new Float32Array(ZW * ZH).fill(-1e9)
const tris = []
for (let t = 0; t < idx.length; t += 3) {
  const v = [idx[t], idx[t+1], idx[t+2]], ps = v.map((i) => pos[i])
  if (ps.every((p) => p[0] < EB.x0) || ps.every((p) => p[0] > EB.x1) || ps.every((p) => p[1] < EB.y0) || ps.every((p) => p[1] > EB.y1)) continue
  if (ps.every((p) => p[2] < 0)) continue
  tris.push(v)
  const xs = ps.map((p) => (p[0] - EB.x0) * ZS), ys = ps.map((p) => (EB.y1 - p[1]) * ZS)
  const d = (ys[1]-ys[2])*(xs[0]-xs[2]) + (xs[2]-xs[1])*(ys[0]-ys[2]); if (Math.abs(d) < 1e-12) continue
  for (let y = Math.max(0, Math.floor(Math.min(...ys))); y <= Math.min(ZH - 1, Math.ceil(Math.max(...ys))); y++)
    for (let x = Math.max(0, Math.floor(Math.min(...xs))); x <= Math.min(ZW - 1, Math.ceil(Math.max(...xs))); x++) {
      const l0 = ((ys[1]-ys[2])*(x+.5-xs[2]) + (xs[2]-xs[1])*(y+.5-ys[2])) / d, l1 = ((ys[2]-ys[0])*(x+.5-xs[2]) + (xs[0]-xs[2])*(y+.5-ys[2])) / d, l2 = 1-l0-l1
      if (l0 < 0 || l1 < 0 || l2 < 0) continue
      const z = l0*ps[0][2] + l1*ps[1][2] + l2*ps[2][2]
      if (z > zb[y*ZW+x]) zb[y*ZW+x] = z
    }
}
const front = (x, y, z) => {
  const zx = Math.min(ZW - 1, Math.max(0, Math.floor((x - EB.x0) * ZS))), zy = Math.min(ZH - 1, Math.max(0, Math.floor((EB.y1 - y) * ZS)))
  return z >= zb[zy*ZW+zx] - 0.003
}
const region = new Map() // texel index -> [x, y]
for (const v of tris) {
  const ps = v.map((i) => pos[i])
  const xs = v.map((i) => uv[i][0] * TW), ys = v.map((i) => uv[i][1] * TW)
  const d = (ys[1]-ys[2])*(xs[0]-xs[2]) + (xs[2]-xs[1])*(ys[0]-ys[2]); if (Math.abs(d) < 1e-9) continue
  for (let y = Math.floor(Math.min(...ys)); y <= Math.ceil(Math.max(...ys)); y++) for (let x = Math.floor(Math.min(...xs)); x <= Math.ceil(Math.max(...xs)); x++) {
    const l0 = ((ys[1]-ys[2])*(x+.5-xs[2]) + (xs[2]-xs[1])*(y+.5-ys[2])) / d, l1 = ((ys[2]-ys[0])*(x+.5-xs[2]) + (xs[0]-xs[2])*(y+.5-ys[2])) / d, l2 = 1-l0-l1
    const e = -0.02; if (l0 < e || l1 < e || l2 < e) continue // 섬 가장자리 틈 방지로 살짝 넓게
    const px = l0*ps[0][0] + l1*ps[1][0] + l2*ps[2][0], py = l0*ps[0][1] + l1*ps[1][1] + l2*ps[2][1], pz = l0*ps[0][2] + l1*ps[1][2] + l2*ps[2][2]
    if (px < BOX.x0 || px > BOX.x1 || py < BOX.y0 || py > BOX.y1 || !front(px, py, pz)) continue
    if (x < 0 || y < 0 || x >= TW || y >= TW) continue
    region.set(y * TW + x, [px, py])
  }
}
console.log('region texels', region.size)
const at = (img, i) => [img.d[i*3], img.d[i*3+1], img.d[i*3+2]]
const median = (arr) => [0, 1, 2].map((k) => { const s = arr.map((c) => c[k]).sort((a, b) => a - b); return s[s.length >> 1] })
const green = median([...region.keys()].map((i) => at(base, i)).filter(([r, g, b]) => g > 150 && g > r && g > b + 60))
console.log('body green', green)
const dist = (c) => Math.hypot(c[0]-green[0], c[1]-green[1], c[2]-green[2])
const mask = new Set([...region.keys()].filter((i) => dist(at(base, i)) > 38))
// 글자 가장자리 번짐까지 잡도록 영역 안에서 3텍셀 넓힌다
for (let r = 0; r < 5; r++) for (const i of [...mask]) for (const o of [1, -1, TW, -TW]) if (region.has(i + o)) mask.add(i + o)
// 지운 자리는 주변 몸통 색(그림자 포함)을 안쪽으로 번지게 채운다
const G = 700, GW = Math.ceil((BOX.x1 - BOX.x0) * G), GH = Math.ceil((BOX.y1 - BOX.y0) * G)
const cell = (x, y) => Math.min(GH - 1, Math.max(0, Math.floor((BOX.y1 - y) * G))) * GW + Math.min(GW - 1, Math.max(0, Math.floor((x - BOX.x0) * G)))
function inpaint(img) {
  const sum = new Float64Array(GW * GH * 3), cnt = new Uint32Array(GW * GH)
  for (const [i, [x, y]] of region) if (!mask.has(i)) { const c = cell(x, y); cnt[c]++; for (let k = 0; k < 3; k++) sum[c*3+k] += img.d[i*3+k] }
  const g = new Float64Array(GW * GH * 3), known = new Uint8Array(GW * GH)
  let mean = [0, 0, 0], n = 0
  for (let c = 0; c < GW * GH; c++) if (cnt[c]) { known[c] = 1; n++; for (let k = 0; k < 3; k++) { g[c*3+k] = sum[c*3+k] / cnt[c]; mean[k] += g[c*3+k] } }
  mean = mean.map((v) => v / n)
  for (let c = 0; c < GW * GH; c++) if (!known[c]) for (let k = 0; k < 3; k++) g[c*3+k] = mean[k]
  for (let it = 0; it < 400; it++) for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
    const c = y * GW + x; if (known[c]) continue
    for (let k = 0; k < 3; k++) {
      let s = 0, m = 0
      if (x > 0) { s += g[(c-1)*3+k]; m++ } if (x < GW-1) { s += g[(c+1)*3+k]; m++ }
      if (y > 0) { s += g[(c-GW)*3+k]; m++ } if (y < GH-1) { s += g[(c+GW)*3+k]; m++ }
      g[c*3+k] = s / m
    }
  }
  for (const i of mask) { const [x, y] = region.get(i), c = cell(x, y); for (let k = 0; k < 3; k++) img.d[i*3+k] = Math.round(g[c*3+k]) }
}
const put = (img, i, c) => { img.d[i*3] = c[0]; img.d[i*3+1] = c[1]; img.d[i*3+2] = c[2] }
inpaint(base)
// 노멀맵의 로고 요철은 색보다 넓게 퍼져 있다. 주변 몸통은 평평하므로 영역 전체를 평평하게, 거칠기는 몸통 값으로
const nrmFlat = [127, 127, 254]
const rmBody = median([...region.keys()].filter((i) => !mask.has(i)).map((i) => at(rm, i)))
for (const i of region.keys()) { put(nrm, i, nrmFlat); put(rm, i, rmBody) }
console.log('mask', mask.size)
// 로고는 메시에도 도드라져 있다. 정점마다 주변 앞면 정점으로 평면을 맞추되, 높이 튀는 점(글자 획)은 빼고 다시 맞춰 그 평면으로 누른다
{
  const inEB = (p) => p[0] > EB.x0 && p[0] < EB.x1 && p[1] > EB.y0 && p[1] < EB.y1
  const inBox = (p) => p[0] > BOX.x0 && p[0] < BOX.x1 && p[1] > BOX.y0 && p[1] < BOX.y1
  const fv = []
  pos.forEach((p, i) => { if (inEB(p) && front(p[0], p[1], p[2])) fv.push(i) })
  const R = 0.02, CS = R, grid = new Map(), key = (x, y) => `${Math.floor(x / CS)},${Math.floor(y / CS)}`
  for (const i of fv) { const k = key(pos[i][0], pos[i][1]); if (!grid.has(k)) grid.set(k, []); grid.get(k).push(i) }
  const near = (p) => { const out = [], gx = Math.floor(p[0] / CS), gy = Math.floor(p[1] / CS)
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (const j of grid.get(`${gx+dx},${gy+dy}`) ?? []) { const q = pos[j]; if (Math.hypot(q[0]-p[0], q[1]-p[1]) < R) out.push(j) } return out }
  const plane = (pts, cx, cy) => { // z = a + b(x-cx) + c(y-cy)
    let s = [0,0,0,0,0,0,0,0,0], t = [0,0,0]
    for (const q of pts) { const f = [1, q[0]-cx, q[1]-cy]; for (let r = 0; r < 3; r++) { t[r] += f[r]*q[2]; for (let c = 0; c < 3; c++) s[r*3+c] += f[r]*f[c] } }
    const m = [[s[0],s[1],s[2],t[0]],[s[3],s[4],s[5],t[1]],[s[6],s[7],s[8],t[2]]]
    for (let c = 0; c < 3; c++) { for (let r = 0; r < 3; r++) if (r !== c) { const f = m[r][c] / m[c][c]; for (let k = c; k < 4; k++) m[r][k] -= f * m[c][k] } }
    return [m[0][3]/m[0][0], m[1][3]/m[1][1], m[2][3]/m[2][2]]
  }
  const updates = []
  let maxd = 0
  for (const i of fv) {
    const p = pos[i]; if (!inBox(p)) continue
    let pts = near(p).map((j) => pos[j]); if (pts.length < 8) continue
    let pl = plane(pts, p[0], p[1])
    for (let it = 0; it < 3; it++) { // 평면보다 위로 튄 점 40% 를 빼고 다시
      const res = pts.map((q) => q[2] - (pl[0] + pl[1]*(q[0]-p[0]) + pl[2]*(q[1]-p[1])))
      const cut = [...res].sort((a, b) => a - b)[Math.floor(res.length * 0.6)]
      const kept = pts.filter((_, k) => res[k] <= cut); if (kept.length < 6) break
      pl = plane(kept, p[0], p[1])
    }
    const edge = Math.min(p[0] - BOX.x0, BOX.x1 - p[0], p[1] - BOX.y0, BOX.y1 - p[1]), w = Math.min(1, edge / 0.015)
    const z = p[2] * (1 - w) + pl[0] * w
    maxd = Math.max(maxd, Math.abs(z - p[2]))
    const sn = [-pl[1], -pl[2], 1], L = Math.hypot(...sn), on = N.getElement(i, [])
    const nn = [0, 1, 2].map((k) => on[k] * (1 - w) + (sn[k] / L) * w), NL = Math.hypot(...nn)
    updates.push([i, z, nn.map((v) => v / NL)])
  }
  const inv = 1 / M[0], ty = M[13]
  for (const [i, z, nn] of updates) { const p = pos[i]; P.setElement(i, [p[0] * inv, (p[1] - ty) * inv, z * inv]); N.setElement(i, nn) }
  console.log('front verts', fv.length, 'flattened', updates.length, 'max dz', maxd.toFixed(4))
}

// 명판: 몸통 곡면을 따라가는 얇은 판을 로고 자리에 붙인다
{
  const PL = { x0: -0.19, x1: 0.19, y0: 0.553, y1: 0.66 }, NX = 64, NY = 20
  const zAt = (x, y) => { // 주변(반경 0.006)의 가장 앞 깊이 = 획 요철보다 위
    let m = -1e9; const r = Math.ceil(0.006 * ZS)
    const cx = Math.floor((x - EB.x0) * ZS), cy = Math.floor((EB.y1 - y) * ZS)
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { const gx = cx + dx, gy = cy + dy; if (gx >= 0 && gy >= 0 && gx < ZW && gy < ZH) m = Math.max(m, zb[gy * ZW + gx]) }
    return m
  }
  let hz = []
  for (let j = 0; j <= NY; j++) for (let i = 0; i <= NX; i++) hz.push(zAt(PL.x0 + (PL.x1 - PL.x0) * i / NX, PL.y1 - (PL.y1 - PL.y0) * j / NY))
  for (let it = 0; it < 6; it++) hz = hz.map((z, k) => { const i = k % (NX + 1), j = Math.floor(k / (NX + 1)); let s = 0, n = 0
    for (const [di, dj] of [[0,0],[1,0],[-1,0],[0,1],[0,-1]]) { const ii = i + di, jj = j + dj; if (ii < 0 || jj < 0 || ii > NX || jj > NY) continue; s += hz[jj * (NX + 1) + ii]; n++ } return Math.max(z, s / n) })
  const OFF = 0.0025, inv = 1 / M[0], ty = M[13]
  const P3 = hz.map((z, k) => { const i = k % (NX + 1), j = Math.floor(k / (NX + 1)); return [PL.x0 + (PL.x1 - PL.x0) * i / NX, PL.y1 - (PL.y1 - PL.y0) * j / NY, z + OFF] })
  const posArr = new Float32Array(P3.length * 3), nArr = new Float32Array(P3.length * 3), uvArr = new Float32Array(P3.length * 2)
  P3.forEach((p, k) => {
    const i = k % (NX + 1), j = Math.floor(k / (NX + 1))
    posArr.set([p[0] * inv, (p[1] - ty) * inv, p[2] * inv], k * 3)
    uvArr.set([i / NX, j / NY], k * 2)
    const L = P3[j * (NX + 1) + Math.max(0, i - 1)], R = P3[j * (NX + 1) + Math.min(NX, i + 1)], U = P3[Math.max(0, j - 1) * (NX + 1) + i], D = P3[Math.min(NY, j + 1) * (NX + 1) + i]
    const ax = [R[0]-L[0], R[1]-L[1], R[2]-L[2]], ay = [U[0]-D[0], U[1]-D[1], U[2]-D[2]]
    const n = [ax[1]*ay[2]-ax[2]*ay[1], ax[2]*ay[0]-ax[0]*ay[2], ax[0]*ay[1]-ax[1]*ay[0]], l = Math.hypot(...n)
    nArr.set(n.map((v) => v / l), k * 3)
  })
  const ind = []
  for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) { const a = j * (NX + 1) + i, b = a + 1, c = a + NX + 1, d = c + 1; ind.push(a, c, b, b, c, d) }
  const buf = doc.getRoot().listBuffers()[0]
  const acc = (arr, type) => doc.createAccessor().setArray(arr).setType(type).setBuffer(buf)
  const img = await sharp(platePath).ensureAlpha().webp({ quality: 92, alphaQuality: 100 }).toBuffer()
  const tex = doc.createTexture('jigapmon_plate').setImage(img).setMimeType('image/webp')
  const mat = doc.createMaterial('jigapmon_plate').setBaseColorTexture(tex).setMetallicFactor(0).setRoughnessFactor(0.45).setAlphaMode('MASK').setAlphaCutoff(0.5)
  mat.getBaseColorTextureInfo().setMagFilter(9728) // NEAREST: 도트 글자가 번지지 않게
  const prim2 = doc.createPrimitive().setMaterial(mat)
    .setAttribute('POSITION', acc(posArr, 'VEC3')).setAttribute('NORMAL', acc(nArr, 'VEC3')).setAttribute('TEXCOORD_0', acc(uvArr, 'VEC2'))
    .setIndices(acc(new Uint16Array(ind), 'SCALAR'))
  node.getMesh().addPrimitive(prim2)
  console.log('plate verts', P3.length, 'z range', Math.min(...hz).toFixed(3), Math.max(...hz).toFixed(3))
}
const enc = async (img, size, q) => sharp(img.d, { raw: { width: TW, height: TW, channels: 3 } }).resize(size, size).webp({ quality: q }).toBuffer()
const texs = doc.getRoot().listTextures()
texs[0].setImage(await enc(base, 1024, 88)).setMimeType('image/webp')
texs[1].setImage(await enc(rm, 1024, 80)).setMimeType('image/webp')
texs[2].setImage(await enc(nrm, 1024, 85)).setMimeType('image/webp')
await io.write(glbOut, doc)
console.log('written')
