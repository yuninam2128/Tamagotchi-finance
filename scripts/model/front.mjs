// 텍스처를 앞면 정사영으로 다시 펼쳐 로고 위치(모델 좌표)를 찾는다
import { NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { MeshoptDecoder } from 'meshoptimizer'
function transformMat4(o, p, m) {
  const [x, y, z] = p, w = m[3] * x + m[7] * y + m[11] * z + m[15] || 1
  o[0] = (m[0] * x + m[4] * y + m[8] * z + m[12]) / w; o[1] = (m[1] * x + m[5] * y + m[9] * z + m[13]) / w; o[2] = (m[2] * x + m[6] * y + m[10] * z + m[14]) / w
  return o
}
import sharp from 'sharp'
const [glb, texPath, out] = process.argv.slice(2)
await MeshoptDecoder.ready
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder })
const doc = await io.read(glb)
const tex = await sharp(texPath).raw().toBuffer({ resolveWithObject: true })
const TW = tex.info.width, TC = tex.info.channels
const node = doc.getRoot().listNodes().find((n) => n.getMesh())
const M = node.getWorldMatrix()
const prim = node.getMesh().listPrimitives()[0]
const P = prim.getAttribute('POSITION'), UV = prim.getAttribute('TEXCOORD_0'), N = prim.getAttribute('NORMAL'), I = prim.getIndices()
const pos = [], uv = [], nz = []
for (let i = 0; i < P.getCount(); i++) { const p = P.getElement(i, []); transformMat4(p, p, M); pos.push(p); uv.push(UV.getElement(i, [])); nz.push(N.getElement(i, [])[2]) }
let min = [1e9, 1e9, 1e9], max = [-1e9, -1e9, -1e9]
for (const p of pos) for (let k = 0; k < 3; k++) { min[k] = Math.min(min[k], p[k]); max[k] = Math.max(max[k], p[k]) }
console.log('bbox', min.map((v) => v.toFixed(3)), max.map((v) => v.toFixed(3)))
// 앞면 그림: x,y 를 픽셀로, 가장 앞(z 큰) 점 색
const W = 800, sc = W / (max[0] - min[0]), H = Math.ceil((max[1] - min[1]) * sc)
const img = Buffer.alloc(W * H * 3), zb = new Float32Array(W * H).fill(-1e9)
const idx = I.getArray()
for (let t = 0; t < idx.length; t += 3) {
  const [a, b, c] = [idx[t], idx[t + 1], idx[t + 2]]
  const pa = pos[a], pb = pos[b], pc = pos[c]
  const xs = [pa, pb, pc].map((p) => (p[0] - min[0]) * sc), ys = [pa, pb, pc].map((p) => (max[1] - p[1]) * sc)
  const x0 = Math.max(0, Math.floor(Math.min(...xs))), x1 = Math.min(W - 1, Math.ceil(Math.max(...xs)))
  const y0 = Math.max(0, Math.floor(Math.min(...ys))), y1 = Math.min(H - 1, Math.ceil(Math.max(...ys)))
  const d = (ys[1] - ys[2]) * (xs[0] - xs[2]) + (xs[2] - xs[1]) * (ys[0] - ys[2])
  if (Math.abs(d) < 1e-9) continue
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const l0 = ((ys[1] - ys[2]) * (x + .5 - xs[2]) + (xs[2] - xs[1]) * (y + .5 - ys[2])) / d
    const l1 = ((ys[2] - ys[0]) * (x + .5 - xs[2]) + (xs[0] - xs[2]) * (y + .5 - ys[2])) / d
    const l2 = 1 - l0 - l1
    if (l0 < 0 || l1 < 0 || l2 < 0) continue
    const z = l0 * pa[2] + l1 * pb[2] + l2 * pc[2]
    if (z <= zb[y * W + x]) continue
    zb[y * W + x] = z
    const u = l0 * uv[a][0] + l1 * uv[b][0] + l2 * uv[c][0], v = l0 * uv[a][1] + l1 * uv[b][1] + l2 * uv[c][1]
    const tx = Math.min(TW - 1, Math.max(0, Math.floor(u * TW))), ty = Math.min(TW - 1, Math.max(0, Math.floor(v * TW)))
    for (let k = 0; k < 3; k++) img[(y * W + x) * 3 + k] = tex.data[(ty * TW + tx) * TC + k]
  }
}
await sharp(img, { raw: { width: W, height: H, channels: 3 } }).png().toFile(out)
console.log('front', W, H, 'scale px/unit', sc.toFixed(1), 'x0', min[0].toFixed(3), 'ytop', max[1].toFixed(3))
