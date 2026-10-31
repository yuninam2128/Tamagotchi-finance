// 3D 다마고치 (Tripo 모델 → gltf-transform 으로 63MB → 0.85MB 최적화, public/models/tamagotchi.glb).
// 모델의 LCD 는 텍스처에 구워져 있어서, 그 위에 캔버스 텍스처 판을 덮어 성장 단계·증상을 그린다.
import { OrbitControls, useGLTF } from '@react-three/drei'
import { Canvas, useFrame } from '@react-three/fiber'
import { Suspense, useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { drawLcd, LCD_H, LCD_W, type LcdState } from './lcd'

const MODEL_URL = '/models/tamagotchi.glb'
// 모델 좌표계에서 LCD 화면 위치·크기 (헤드리스 렌더로 맞춘 값)
const LCD_POS: [number, number, number] = [0, 0.356, 0.115]
const LCD_SIZE: [number, number] = [0.297, 0.268]
const MODEL_CENTER_Y = 0.49
// 캔버스는 위쪽 말풍선 뒤까지 올라가 있다. 줄(체인) 끝이 말풍선 뒤·화면 밖으로 넘어가 보이지 않도록
// 모델을 크게 잡고 캔버스 중심보다 조금 아래에 둔다.
const CAMERA_Y = 0.1

/** 비스듬히 천천히 몸을 돌리며(옆면이 보이게) 위아래로 둥둥 뜬다 */
function Sway({ children }: { children: React.ReactNode }) {
  const ref = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    const g = ref.current
    if (!g) return
    const t = clock.getElapsedTime()
    g.rotation.y = 0.12 + Math.sin(t * 0.35) * 0.16
    g.rotation.x = 0.03 + Math.sin(t * 0.5 + 1) * 0.02
    g.rotation.z = Math.sin(t * 0.4) * 0.02
    g.position.y = Math.sin(t * 0.9) * 0.02
  })
  return <group ref={ref}>{children}</group>
}

function Device({ lcd, onTap }: { lcd: LcdState; onTap?: () => void }) {
  const { scene } = useGLTF(MODEL_URL)
  const lcdRef = useRef(lcd)
  useEffect(() => {
    lcdRef.current = lcd
  }, [lcd])

  const { canvas, texture } = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = LCD_W
    canvas.height = LCD_H
    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    texture.magFilter = THREE.NearestFilter
    texture.minFilter = THREE.LinearFilter
    return { canvas, texture }
  }, [])

  const last = useRef(-1)
  useFrame(({ clock }) => {
    // 픽셀 애니메이션은 초당 8번이면 충분
    const t = clock.getElapsedTime()
    const frame = Math.floor(t * 8)
    if (frame === last.current) return
    last.current = frame
    drawLcd(canvas.getContext('2d')!, lcdRef.current, t)
    texture.needsUpdate = true
  })

  return (
    <group position={[0, -MODEL_CENTER_Y, 0]} onClick={(e) => (e.stopPropagation(), onTap?.())}>
      <primitive object={scene} />
      <mesh position={LCD_POS}>
        <planeGeometry args={LCD_SIZE} />
        <meshBasicMaterial map={texture} toneMapped={false} />
      </mesh>
    </group>
  )
}

export default function PetStage({ lcd, onTap, className = '' }: { lcd: LcdState; onTap?: () => void; className?: string }) {
  return (
    <div className={className} aria-label="지갑몬" role="img">
      <Canvas dpr={[1, 2]} camera={{ position: [0, CAMERA_Y, 2.15], fov: 32 }} gl={{ antialias: true, alpha: true }}>
        <ambientLight intensity={1.1} />
        <directionalLight position={[1, 2, 3]} intensity={2.2} />
        <directionalLight position={[-2, 1, -1]} intensity={1.2} color="#c8ff8a" />
        <Suspense fallback={null}>
          <Sway>
            <Device lcd={lcd} onTap={onTap} />
          </Sway>
        </Suspense>
        <OrbitControls
          enableZoom={false}
          enablePan={false}
          target={[0, CAMERA_Y, 0]}
          minPolarAngle={Math.PI / 2 - 0.25}
          maxPolarAngle={Math.PI / 2 + 0.15}
          minAzimuthAngle={-0.7}
          maxAzimuthAngle={0.7}
          rotateSpeed={0.6}
        />
      </Canvas>
    </div>
  )
}

useGLTF.preload(MODEL_URL)
