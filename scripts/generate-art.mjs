/**
 * Pixel-art sprite renderer.
 *
 * Character designs (scripts/art/characters.mjs) are rasterised onto a small
 * pixel grid with no anti-aliasing. Every part is shaded with a hand-style
 * colour ramp (cool, desaturated shadows; warm highlights), metal gets a
 * specular pixel band, overlapping parts are separated by darker inner lines
 * and the whole sprite gets a 1px outline. The sprite is then scaled up with
 * nearest-neighbour so it stays crisp everywhere.
 *
 * usage: node scripts/generate-art.mjs [slot ...] [outDir] [--sheet sheet.png]
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { deflateSync } from 'node:zlib'
import { CHARACTERS } from './art/characters.mjs'

const W = 200
const H = 240
const PX = 0.3 // sprite pixels per design unit → 60×72 sprites
const UP = 6 // nearest-neighbour upscale for the exported PNG
const SW = Math.round(W * PX)
const SH = Math.round(H * PX)

/* --------------------------------------------------------------- colour */

function hex(c) {
  const v = parseInt(c.slice(1), 16)
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255]
}

function rgbToHsl([r, g, b]) {
  r /= 255; g /= 255; b /= 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  if (max === min) return [0, 0, l]
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0)
  else if (max === g) h = (b - r) / d + 2
  else h = (r - g) / d + 4
  return [h * 60, s, l]
}

function hslToRgb([h, s, l]) {
  h = ((h % 360) + 360) % 360
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = l - c / 2
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x]
  return [r, g, b].map((v) => Math.round(Math.max(0, Math.min(1, v + m)) * 255))
}

/** Hue-shifted ramp in the classic pixel-art manner: shadows drift toward blue, highlights toward yellow. */
function ramp(base, metal) {
  const [h, s, l] = rgbToHsl(hex(base))
  const toward = (target, k) => {
    let d = target - h
    if (d > 180) d -= 360
    if (d < -180) d += 360
    return h + d * k
  }
  const steps = metal
    ? [[-0.3, 0.25, 0.85], [-0.15, 0.12, 0.95], [0, 0, 1], [0.16, 0.12, 0.85], [0.34, 0.25, 0.6]]
    : [[-0.28, 0.3, 1.05], [-0.14, 0.15, 1], [0, 0, 1], [0.13, 0.12, 0.9]]
  return steps.map(([dl, hk, sk]) => {
    const target = dl < 0 ? 245 : 50
    const hh = s < 0.06 ? h : toward(target, hk)
    return hslToRgb([hh, Math.min(1, s * sk), Math.max(0.03, Math.min(0.97, l + dl))])
  })
}

/* --------------------------------------------------------------- raster */

/** Pixel-centre polygon fill (even-odd), no anti-aliasing. */
function rasterise(poly) {
  const mask = new Uint8Array(SW * SH)
  const pts = poly.map(([x, y]) => [x * PX, y * PX])
  for (let y = 0; y < SH; y++) {
    const py = y + 0.5
    const xs = []
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const [xi, yi] = pts[i]
      const [xj, yj] = pts[j]
      if (yi > py !== yj > py) xs.push(xi + ((py - yi) * (xj - xi)) / (yj - yi))
    }
    xs.sort((a, b) => a - b)
    for (let k = 0; k + 1 < xs.length; k += 2) {
      for (let x = Math.max(0, Math.ceil(xs[k] - 0.5)); x <= Math.min(SW - 1, Math.floor(xs[k + 1] - 0.5)); x++) mask[y * SW + x] = 1
    }
  }
  // Very thin parts (blades, spears, antennae) can vanish between pixel
  // centres; fall back to plotting the polygon's outline so they survive.
  if (!mask.some(Boolean)) {
    for (let i = 0; i < pts.length; i++) {
      const [ax, ay] = pts[i]
      const [bx, by] = pts[(i + 1) % pts.length]
      const n = Math.ceil(Math.hypot(bx - ax, by - ay) * 2) + 1
      for (let t = 0; t <= n; t++) {
        const x = Math.floor(ax + ((bx - ax) * t) / n)
        const y = Math.floor(ay + ((by - ay) * t) / n)
        if (x >= 0 && y >= 0 && x < SW && y < SH) mask[y * SW + x] = 1
      }
    }
  }
  return mask
}

const isMetal = (part) => part.mat === 'metal' || (part.gloss !== undefined && part.gloss >= 0.8)

function renderSprite(char) {
  const px = new Array(SW * SH).fill(null) // [r,g,b] or null
  const owner = new Int32Array(SW * SH).fill(-1)
  const glows = []

  char.parts.forEach((part, index) => {
    const mask = rasterise(part.pts)
    if (part.glow) glows.push({ part, mask })
    const alpha = part.alpha ?? 1
    if (part.emit) {
      const c = hex(part.color)
      for (let i = 0; i < mask.length; i++) {
        if (!mask[i]) continue
        px[i] = alpha < 1 && px[i] ? px[i].map((v, k) => Math.round(v * (1 - alpha) + c[k] * alpha)) : c
        owner[i] = index
      }
      return
    }

    const metal = isMetal(part) || (char.mat === 'metal' && !part.mat)
    const r = ramp(part.color, metal)
    const top = r.length - 1
    // Shape extents for a domed light falloff across the part.
    let x0 = SW, y0 = SH, x1 = 0, y1 = 0
    for (let i = 0; i < mask.length; i++) if (mask[i]) {
      const x = i % SW, y = (i / SW) | 0
      x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y)
    }
    const cx = (x0 + x1) / 2
    const cy = (y0 + y1) / 2
    const hw = Math.max(1, (x1 - x0) / 2)
    const hh = Math.max(1, (y1 - y0) / 2)
    const inPart = (x, y) => x >= 0 && y >= 0 && x < SW && y < SH && mask[y * SW + x]

    for (let y = 0; y < SH; y++) {
      for (let x = 0; x < SW; x++) {
        const i = y * SW + x
        if (!mask[i]) continue
        // Light from the upper left: a domed falloff plus crisp edge shading.
        const nx = (x - cx) / hw
        const ny = (y - cy) / hh
        let lit = 0.55 - nx * 0.38 - ny * 0.32
        const upLeft = !inPart(x - 1, y) || !inPart(x, y - 1)
        const downRight = !inPart(x + 1, y) || !inPart(x, y + 1)
        if (upLeft) lit += 0.3
        if (downRight) lit -= 0.35
        // Two-pixel bands keep the shading readable instead of noisy.
        let level = Math.round(Math.max(0, Math.min(1, lit)) * (top - (metal ? 0 : 0.4)))
        if (metal && level === top && !upLeft) level = top - 1
        level = Math.max(0, Math.min(top, level))
        let c = r[level]
        // Inner line where this part overlaps another, so shapes stay distinct.
        const neighbours = [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]
        if (neighbours.some(([nx2, ny2]) => !inPart(nx2, ny2) && nx2 >= 0 && ny2 >= 0 && nx2 < SW && ny2 < SH && px[ny2 * SW + nx2] && owner[ny2 * SW + nx2] !== index)) {
          c = r[0].map((v) => Math.round(v * 0.7))
        }
        px[i] = alpha < 1 && px[i] ? px[i].map((v, k) => Math.round(v * (1 - alpha) + c[k] * alpha)) : c
        owner[i] = index
      }
    }
  })

  // 1px outline around the whole sprite, tinted by the darkest neighbour.
  const outline = hex(char.outline ?? '#06060c')
  const out = px.slice()
  for (let y = 0; y < SH; y++) {
    for (let x = 0; x < SW; x++) {
      const i = y * SW + x
      if (px[i]) continue
      const n = [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]].some(([a, b]) => a >= 0 && b >= 0 && a < SW && b < SH && px[b * SW + a])
      if (n) out[i] = outline
    }
  }

  // Glowing eyes and runes: a soft one-pixel halo of the glow colour.
  const halo = new Array(SW * SH).fill(null)
  for (const { part, mask } of glows) {
    const g = hex(part.glow)
    for (let i = 0; i < mask.length; i++) {
      if (!mask[i]) continue
      const x = i % SW, y = (i / SW) | 0
      for (const [a, b] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1], [x + 1, y + 1], [x - 1, y - 1], [x + 1, y - 1], [x - 1, y + 1]]) {
        if (a < 0 || b < 0 || a >= SW || b >= SH || mask[b * SW + a]) continue
        halo[b * SW + a] = g
      }
    }
  }
  return { out, halo }
}

/* ----------------------------------------------------------------- PNG */

const CRC = new Uint32Array(256).map((_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})

function crc32(buf) {
  let c = 0xffffffff
  for (const b of buf) c = CRC[(c ^ b) & 255] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const td = Buffer.concat([Buffer.from(type), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(td))
  return Buffer.concat([len, td, crc])
}

/** Encodes an RGBA byte buffer. */
function png(w, h, rgba) {
  const raw = Buffer.alloc((w * 4 + 1) * h)
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0
    rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4)
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(w, 0)
  ihdr.writeUInt32BE(h, 4)
  ihdr[8] = 8; ihdr[9] = 6
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

/** Scales the sprite up with nearest-neighbour into RGBA bytes. */
function toRgba({ out, halo }, scale, background = null) {
  const w = SW * scale
  const h = SH * scale
  const buf = Buffer.alloc(w * h * 4)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = ((y / scale) | 0) * SW + ((x / scale) | 0)
      const o = (y * w + x) * 4
      const c = out[i]
      if (c) {
        buf[o] = c[0]; buf[o + 1] = c[1]; buf[o + 2] = c[2]; buf[o + 3] = 255
      } else if (halo[i]) {
        const a = 0.45
        const bg = background ?? halo[i]
        for (let k = 0; k < 3; k++) buf[o + k] = Math.round(halo[i][k] * a + bg[k] * (background ? 1 - a : 0))
        buf[o + 3] = background ? 255 : Math.round(a * 255)
      } else if (background) {
        buf[o] = background[0]; buf[o + 1] = background[1]; buf[o + 2] = background[2]; buf[o + 3] = 255
      }
    }
  }
  return { w, h, buf }
}

/* ---------------------------------------------------------------- main */

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)
const sheetIdx = args.indexOf('--sheet')
const sheetPath = sheetIdx >= 0 ? args.splice(sheetIdx, 2)[1] : null
const only = args.filter((a) => !a.includes('/'))
const outDir = args.find((a) => a.includes('/')) ?? join(root, 'src/art/images')
mkdirSync(outDir, { recursive: true })

const sprites = []
for (const [slot, char] of Object.entries(CHARACTERS)) {
  if (only.length && !only.includes(slot)) continue
  const sprite = renderSprite(char)
  const img = toRgba(sprite, UP)
  writeFileSync(join(outDir, `${slot}.png`), png(img.w, img.h, img.buf))
  console.log(`${slot}: ${SW}×${SH} sprite`)
  sprites.push(sprite)
}

if (sheetPath && sprites.length) {
  // Contact sheet on the app's background colour, for reviewing the cast.
  const scale = 5
  const cols = Math.min(5, sprites.length)
  const rows = Math.ceil(sprites.length / cols)
  const cw = SW * scale
  const ch = SH * scale
  const sheet = Buffer.alloc(cols * cw * rows * ch * 4)
  sprites.forEach((s, n) => {
    const img = toRgba(s, scale, [5, 11, 26])
    const ox = (n % cols) * cw
    const oy = Math.floor(n / cols) * ch
    for (let y = 0; y < ch; y++) img.buf.copy(sheet, ((oy + y) * cols * cw + ox) * 4, y * cw * 4, (y + 1) * cw * 4)
  })
  writeFileSync(sheetPath, png(cols * cw, rows * ch, sheet))
  console.log(`sheet: ${sheetPath}`)
}
