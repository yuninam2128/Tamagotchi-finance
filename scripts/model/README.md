# 3D 모델·앱 아이콘 가공 스크립트

앱 빌드와는 상관없는 일회성 도구라서 의존성을 프로젝트에 넣지 않았다. 빈 폴더에서 한 번 설치해 쓴다.

```bash
npm i @gltf-transform/core @gltf-transform/extensions @gltf-transform/cli meshoptimizer sharp playwright-core
```

`plate.mjs`·(필요하면) 다른 렌더링은 설치된 Chrome 을 `C:/Program Files/Google/Chrome/Application/chrome.exe` 에서 찾는다.

## 모델을 바꿀 때

1. 최적화: 원본 `design-src/tamagotchi-3d-model.glb` → 0.85MB
   ```bash
   npx @gltf-transform/cli optimize design-src/tamagotchi-3d-model.glb opt.glb \
     --compress meshopt --texture-compress webp --texture-size 1024 --simplify-ratio 0.06 --simplify-error 0.0005
   ```
2. 원본 텍스처 꺼내기: `node dumptex.mjs design-src/tamagotchi-3d-model.glb tex/`
3. 명판 그림: `node plate.mjs src/assets/fonts/Galmuri11-Bold.woff2 plate.png 1024 288`
4. 로고 지우고 명판 붙이기: `node bake.mjs opt.glb tex/ plate.png public/models/tamagotchi.glb`

다른 모델이면 로고 위치가 달라진다. `node front.mjs <glb> <베이스컬러 텍스처> front.png` 로 앞면을 펼친 그림을 보고
`bake.mjs` 의 `BOX`(지울 영역)·`PL`(명판 영역)과 `PetStage.tsx` 의 `LCD_POS`·`LCD_SIZE` 를 다시 맞춘다.
그림 좌표 → 모델 좌표는 스크립트가 출력하는 `scale px/unit`, `x0`, `ytop` 으로 바꾼다.

## 앱 아이콘

`node icon.mjs src/assets/pets/stage-2.png public/favicon.svg 8.533` 로 성장 2단계 생물을 도트 SVG 로 옮긴 뒤
`npm run pwa:icons` 로 PNG 아이콘을 다시 만든다. 마지막 숫자는 원본 그림의 도트 한 칸 크기(px)다.
