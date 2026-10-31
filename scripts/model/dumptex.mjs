import { NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import fs from 'fs'
import { MeshoptDecoder } from 'meshoptimizer'
await MeshoptDecoder.ready
const [src, out] = process.argv.slice(2)
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder })
const doc = await io.read(src)
for (const [i, t] of doc.getRoot().listTextures().entries()) {
  const ext = t.getMimeType().split('/')[1]
  fs.writeFileSync(`${out}/${i}-${t.getName()}.${ext}`, t.getImage())
  console.log(i, t.getName(), t.getMimeType(), t.getSize())
}
