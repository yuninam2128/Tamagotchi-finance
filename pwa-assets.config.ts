import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config'

// 앱 아이콘: public/logo.png (원본 design-src/jigapmon-logo.png 를 512px 로 줄인 것)
// 로고 자체에 여백이 넉넉해서 덧대는 여백 없이 로고 바탕색(민트)으로 채운다.
// 탭 아이콘 public/favicon.svg 는 작은 크기용으로 지갑·알만 잘라 따로 만들었다.
const MINT = '#dcfcda'

export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: {
    ...minimal2023Preset,
    transparent: { ...minimal2023Preset.transparent, padding: 0 },
    // 안드로이드는 원형으로 잘라서 글씨 모서리가 안 잘리게 조금 줄인다
    maskable: { ...minimal2023Preset.maskable, padding: 0.1, resizeOptions: { background: MINT } },
    apple: { ...minimal2023Preset.apple, padding: 0, resizeOptions: { background: MINT } },
  },
  images: ['public/logo.png'],
})
