import { chromium } from 'playwright-core'
import fs from 'fs'
const [font, out, w, h] = process.argv.slice(2)
const data = fs.readFileSync(font).toString('base64')
const b = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' })
const p = await b.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: 1 })
await p.setContent(`<style>@font-face{font-family:G;src:url(data:font/woff2;base64,${data})}
html,body{margin:0;background:transparent}
#p{box-sizing:border-box;width:${w}px;height:${h}px;border-radius:${h * 0.42}px;background:#0b0d08;border:${h * 0.05}px solid #9dd949;
display:grid;place-items:center;font:${Math.round(h * 0.55 / 11) * 11}px/1 G;color:#9dd949;-webkit-font-smoothing:none;letter-spacing:${h*0.04}px}</style><div id="p">지갑몬</div>`)
await p.evaluate(() => document.fonts.ready)
await p.waitForTimeout(300)
await p.screenshot({ path: out, omitBackground: true })
await b.close()
