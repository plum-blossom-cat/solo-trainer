/**
 * Low-poly character art generator.
 *
 * Every character is built from shaped parts. Each part is filled with
 * jittered points, Delaunay-triangulated, and every triangle is shaded from
 * a pseudo 3D normal, so the result has a faceted, sculpted look. Output is
 * a transparent PNG per slot in src/art/images/.
 *
 * usage: node scripts/generate-art.mjs [outDir] [--sheet sheet.png]
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { deflateSync } from 'node:zlib'
import { CHARACTERS } from './art/characters.mjs'

const W = 200
const H = 240
const SCALE = 2 // output pixels per design unit
const SS = 3 // supersampling factor

/* --------------------------------------------------------------- random */

function rng(seed) {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/* -------------------------------------------------------------- geometry */

function inside(pt, poly) {
  let c = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i]
    const [xj, yj] = poly[j]
    if (yi > pt[1] !== yj > pt[1] && pt[0] < ((xj - xi) * (pt[1] - yi)) / (yj - yi) + xi) c = !c
  }
  return c
}

function distToPoly(p, poly) {
  let best = Infinity
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [ax, ay] = poly[j]
    const [bx, by] = poly[i]
    const dx = bx - ax
    const dy = by - ay
    const len = dx * dx + dy * dy || 1
    const t = Math.max(0, Math.min(1, ((p[0] - ax) * dx + (p[1] - ay) * dy) / len))
    best = Math.min(best, Math.hypot(p[0] - ax - t * dx, p[1] - ay - t * dy))
  }
  return best
}

/** Bowyer–Watson Delaunay triangulation. Returns index triples. */
function delaunay(pts) {
  const n = pts.length
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const [x, y] of pts) {
    minX = Math.min(minX, x); minY = Math.min(minY, y)
    maxX = Math.max(maxX, x); maxY = Math.max(maxY, y)
  }
  const d = Math.max(maxX - minX, maxY - minY) * 20
  const all = [...pts, [minX - d, minY - d], [minX + d * 2, minY - d], [minX - d, minY + d * 2]]
  let tris = [circum([n, n + 1, n + 2], all)]
  for (let i = 0; i < n; i++) {
    const [px, py] = all[i]
    const bad = []
    const keep = []
    for (const t of tris) ((px - t.cx) ** 2 + (py - t.cy) ** 2 < t.r2 ? bad : keep).push(t)
    const edges = new Map()
    for (const t of bad) {
      for (const [a, b] of [[t.v[0], t.v[1]], [t.v[1], t.v[2]], [t.v[2], t.v[0]]]) {
        const k = a < b ? `${a},${b}` : `${b},${a}`
        edges.set(k, edges.has(k) ? null : [a, b])
      }
    }
    for (const e of edges.values()) if (e) keep.push(circum([e[0], e[1], i], all))
    tris = keep
  }
  return tris.filter((t) => t.v.every((v) => v < n)).map((t) => t.v)
}

function circum(v, p) {
  const [ax, ay] = p[v[0]]
  const [bx, by] = p[v[1]]
  const [cx, cy] = p[v[2]]
  const dd = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by)) || 1e-9
  const ux = ((ax * ax + ay * ay) * (by - cy) + (bx * bx + by * by) * (cy - ay) + (cx * cx + cy * cy) * (ay - by)) / dd
  const uy = ((ax * ax + ay * ay) * (cx - bx) + (bx * bx + by * by) * (ax - cx) + (cx * cx + cy * cy) * (bx - ax)) / dd
  return { v, cx: ux, cy: uy, r2: (ax - ux) ** 2 + (ay - uy) ** 2 }
}

/** Splits a part polygon into many small triangles. */
function triangulate(poly, density, rand) {
  const pts = []
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i]
    const b = poly[(i + 1) % poly.length]
    const len = Math.hypot(b[0] - a[0], b[1] - a[1])
    const steps = Math.max(1, Math.round(len / density))
    for (let s = 0; s < steps; s++) pts.push([a[0] + ((b[0] - a[0]) * s) / steps, a[1] + ((b[1] - a[1]) * s) / steps])
  }
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const [x, y] of poly) {
    minX = Math.min(minX, x); minY = Math.min(minY, y)
    maxX = Math.max(maxX, x); maxY = Math.max(maxY, y)
  }
  for (let y = minY + density / 2; y < maxY; y += density * 0.87) {
    for (let x = minX + density / 2; x < maxX; x += density) {
      const p = [x + (rand() - 0.5) * density * 0.8, y + (rand() - 0.5) * density * 0.8]
      if (inside(p, poly) && distToPoly(p, poly) > density * 0.35) pts.push(p)
    }
  }
  const out = []
  for (const [i, j, k] of delaunay(pts)) {
    const a = pts[i], b = pts[j], c = pts[k]
    const cen = [(a[0] + b[0] + c[0]) / 3, (a[1] + b[1] + c[1]) / 3]
    if (!inside(cen, poly)) continue
    const mids = [[a, b], [b, c], [c, a]].map(([p, q]) => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2])
    if (mids.some((m) => !inside(m, poly) && distToPoly(m, poly) > 0.6)) continue
    out.push([a, b, c])
  }
  return out
}

/* ------------------------------------------------------------- shading */

function hex(c) {
  const v = parseInt(c.slice(1), 16)
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255]
}

const LIGHT = (() => {
  const l = [-0.55, -0.65, 0.75]
  const m = Math.hypot(...l)
  return l.map((v) => v / m)
})()

function shadeTriangles(part, rand) {
  const [r, g, b] = hex(part.color)
  const rim = part.rim ? hex(part.rim) : null
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const [x, y] of part.pts) {
    minX = Math.min(minX, x); minY = Math.min(minY, y)
    maxX = Math.max(maxX, x); maxY = Math.max(maxY, y)
  }
  const cx = (minX + maxX) / 2
  const cy = (minY + maxY) / 2
  const hw = Math.max(1, (maxX - minX) / 2)
  const hh = Math.max(1, (maxY - minY) / 2)
  const tris = triangulate(part.pts, part.d ?? 6, rand)
  return tris.map((t) => {
    const mx = (t[0][0] + t[1][0] + t[2][0]) / 3
    const my = (t[0][1] + t[1][1] + t[2][1]) / 3
    if (part.emit) return { t, rgb: [r, g, b], a: part.alpha ?? 1 }
    // Domed pseudo-normal with per-facet jitter gives the chiselled look.
    const j = part.facet ?? 0.35
    let nx = ((mx - cx) / hw) * (part.round ?? 0.8) + (rand() - 0.5) * j
    let ny = ((my - cy) / hh) * (part.round ?? 0.8) + (rand() - 0.5) * j
    let nz = 1
    const m = Math.hypot(nx, ny, nz)
    nx /= m; ny /= m; nz /= m
    const lambert = Math.max(0, nx * LIGHT[0] + ny * LIGHT[1] + nz * LIGHT[2])
    const spec = Math.pow(lambert, 18) * (part.gloss ?? 0.25)
    let k = (part.ambient ?? 0.38) + lambert * (part.diffuse ?? 0.75)
    let rgb = [r * k + 255 * spec, g * k + 255 * spec, b * k + 255 * spec]
    // Rim light on the far (right, lower) edge, tinted by the scene glow.
    if (rim) {
      const edge = Math.max(0, nx * 0.8 + ny * 0.2) ** 3 * (part.rimStrength ?? 0.6)
      rgb = rgb.map((v, i) => v * (1 - edge) + rim[i] * edge)
    }
    return { t, rgb: rgb.map((v) => Math.max(0, Math.min(255, v))), a: part.alpha ?? 1 }
  })
}

/* ---------------------------------------------------------- rasteriser */

function rasterise(char) {
  const rand = rng(char.seed ?? 7)
  const S = SCALE * SS
  const w = W * S
  const h = H * S
  const buf = new Float32Array(w * h * 4)
  const glows = []
  for (const part of char.parts) {
    if (part.glow) glows.push(part)
    for (const { t, rgb, a } of shadeTriangles(part, rand)) {
      const p = t.map(([x, y]) => [x * S, y * S])
      const x0 = Math.max(0, Math.floor(Math.min(p[0][0], p[1][0], p[2][0])))
      const x1 = Math.min(w - 1, Math.ceil(Math.max(p[0][0], p[1][0], p[2][0])))
      const y0 = Math.max(0, Math.floor(Math.min(p[0][1], p[1][1], p[2][1])))
      const y1 = Math.min(h - 1, Math.ceil(Math.max(p[0][1], p[1][1], p[2][1])))
      const area = (p[1][0] - p[0][0]) * (p[2][1] - p[0][1]) - (p[2][0] - p[0][0]) * (p[1][1] - p[0][1])
      if (Math.abs(area) < 1e-6) continue
      const sgn = area > 0 ? 1 : -1
      for (let y = y0; y <= y1; y++) {
        for (let x = x0; x <= x1; x++) {
          const px = x + 0.5
          const py = y + 0.5
          let inTri = true
          for (let e = 0; e < 3 && inTri; e++) {
            const [ax, ay] = p[e]
            const [bx, by] = p[(e + 1) % 3]
            // Slight overlap closes hairline seams between neighbouring facets.
            if (sgn * ((bx - ax) * (py - ay) - (by - ay) * (px - ax)) < -0.9) inTri = false
          }
          if (!inTri) continue
          const o = (y * w + x) * 4
          const da = buf[o + 3]
          const oa = a + da * (1 - a)
          for (let c = 0; c < 3; c++) buf[o + c] = (rgb[c] * a + buf[o + c] * da * (1 - a)) / (oa || 1)
          buf[o + 3] = oa
        }
      }
    }
  }

  // Downsample.
  const ow = W * SCALE
  const oh = H * SCALE
  const out = new Float32Array(ow * oh * 4)
  for (let y = 0; y < oh; y++) {
    for (let x = 0; x < ow; x++) {
      let r = 0, g = 0, b = 0, al = 0
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const o = ((y * SS + sy) * w + (x * SS + sx)) * 4
          const a = buf[o + 3]
          r += buf[o] * a; g += buf[o + 1] * a; b += buf[o + 2] * a; al += a
        }
      }
      const o = (y * ow + x) * 4
      out[o + 3] = al / (SS * SS)
      if (al) { out[o] = r / al; out[o + 1] = g / al; out[o + 2] = b / al }
    }
  }

  // Additive glows for eyes, runes and flames.
  for (const part of glows) {
    const [r, g, b] = hex(part.glow)
    const cxs = part.pts.reduce((s, q) => s + q[0], 0) / part.pts.length
    const cys = part.pts.reduce((s, q) => s + q[1], 0) / part.pts.length
    const R = (part.glowR ?? 10) * SCALE
    const gx = cxs * SCALE
    const gy = cys * SCALE
    for (let y = Math.max(0, Math.floor(gy - R)); y < Math.min(oh, gy + R); y++) {
      for (let x = Math.max(0, Math.floor(gx - R)); x < Math.min(ow, gx + R); x++) {
        const dd = Math.hypot(x - gx, y - gy) / R
        if (dd >= 1) continue
        const k = (1 - dd) ** 2 * (part.glowStrength ?? 0.9)
        const o = (y * ow + x) * 4
        const a0 = out[o + 3]
        const a1 = Math.min(1, a0 + k)
        out[o] = (out[o] * a0 + r * k) / a1
        out[o + 1] = (out[o + 1] * a0 + g * k) / a1
        out[o + 2] = (out[o + 2] * a0 + b * k) / a1
        out[o + 3] = a1
        for (let c = 0; c < 3; c++) out[o + c] = Math.min(255, out[o + c])
      }
    }
  }
  return { w: ow, h: oh, px: out }
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

function png(w, h, rgba, background = null) {
  const raw = Buffer.alloc((w * 4 + 1) * h)
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4
      const o = y * (w * 4 + 1) + 1 + x * 4
      let a = rgba[i + 3]
      let rgb = [rgba[i], rgba[i + 1], rgba[i + 2]]
      if (background) {
        rgb = rgb.map((v, c) => v * a + background[c] * (1 - a))
        a = 1
      }
      raw[o] = Math.round(rgb[0]); raw[o + 1] = Math.round(rgb[1]); raw[o + 2] = Math.round(rgb[2])
      raw[o + 3] = Math.round(a * 255)
    }
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(w, 0)
  ihdr.writeUInt32BE(h, 4)
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

/* ---------------------------------------------------------------- main */

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)
const sheetIdx = args.indexOf('--sheet')
const sheetPath = sheetIdx >= 0 ? args.splice(sheetIdx, 2)[1] : null
const only = args.filter((a) => !a.startsWith('/') && !a.includes('/'))
const outDir = args.find((a) => a.includes('/')) ?? join(root, 'src/art/images')
mkdirSync(outDir, { recursive: true })

const rendered = []
for (const [slot, char] of Object.entries(CHARACTERS)) {
  if (only.length && !only.includes(slot)) continue
  const img = rasterise(char)
  writeFileSync(join(outDir, `${slot}.png`), png(img.w, img.h, img.px))
  const tris = char.parts.reduce((s, p) => s + triangulate(p.pts, p.d ?? 6, rng(1)).length, 0)
  console.log(`${slot}: ${tris} triangles`)
  rendered.push(img)
}

if (sheetPath && rendered.length) {
  // Contact sheet on the app's background colour, for reviewing the cast.
  const cols = Math.min(5, rendered.length)
  const rows = Math.ceil(rendered.length / cols)
  const cw = W * SCALE
  const ch = H * SCALE
  const sheet = new Float32Array(cols * cw * rows * ch * 4)
  rendered.forEach((img, i) => {
    const ox = (i % cols) * cw
    const oy = Math.floor(i / cols) * ch
    for (let y = 0; y < ch; y++) {
      for (let x = 0; x < cw; x++) {
        const s = (y * cw + x) * 4
        const d = ((oy + y) * cols * cw + ox + x) * 4
        for (let c = 0; c < 4; c++) sheet[d + c] = img.px[s + c]
      }
    }
  })
  writeFileSync(sheetPath, png(cols * cw, rows * ch, sheet, [5, 11, 26]))
  console.log(`sheet: ${sheetPath}`)
}
