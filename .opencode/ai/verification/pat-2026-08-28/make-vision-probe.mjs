// PAT Phase 16 — deterministic vision probe image generator
import sharp from "sharp"

const svg = Buffer.from(
  `<svg width="400" height="200" xmlns="http://www.w3.org/2000/svg">
    <rect width="400" height="200" fill="white"/>
    <circle cx="200" cy="80" r="50" fill="red"/>
    <text x="200" y="170" font-size="28" text-anchor="middle" fill="black">PROBE-7391</text>
  </svg>`,
)
const info = await sharp(svg).png().toFile("C:/Users/USER/AppData/Local/Temp/opencode/vision-probe.png")
console.log("written", `${info.width}x${info.height}`)
