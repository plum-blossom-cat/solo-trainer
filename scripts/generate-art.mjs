/**
 * Character art renderer.
 *
 * Each character is a stack of shaped parts (scripts/art/characters.mjs).
 * Every part is rasterised, given a sculpted height field from its distance
 * transform (bevelled for armour, domed for flesh), bump-mapped with a
 * material texture (metal, cloth, fur, scales, stone, chitin, skin...) and lit
 * per pixel with diffuse, specular and rim light. Parts cast soft contact
 * shadows onto what lies beneath them. Output is a transparent PNG per slot.
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
const SCALE = 2.4 // output pixels per design unit
const SS = 2 // supersampling factor
const S = SCALE * SS
const WW = Math.round(W * S)
const HH = Math.round(H * S)

/* ---------------------------------------------------------------- noise */

function hash(x, y, seed) {
  let h = (x * 374761393 + y * 668265263 + seed * 2147483647) | 0
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}

function valueNoise(x, y, seed) {
  const xi = Math.floor(x)
  const yi = Math.floor(y)
  const xf = x - xi
  const yf = y - yi
  const u = xf * xf * (3 - 2 * xf)
  const v = yf * yf * (3 - 2 * yf)
  const a = hash(xi, yi, seed)
  const b = hash(xi + 1, yi, seed)
  const c = hash(xi, yi + 1, seed)
  const d = hash(xi + 1, yi + 1, seed)
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v
}

function fbm(x, y, seed, octaves = 4) {
  let sum = 0
  let amp = 0.5
  let f = 1
  for (let i = 0; i < octaves; i++) {
    sum += amp * valueNoise(x * f, y * f, seed + i * 17)
    f *= 2.03
    amp *= 0.5
  }
  return sum
}

/** Distance to the nearest cell centre and the edge between cells (for scales and plates). */
function voronoi(x, y, seed) {
  const xi = Math.floor(x)
  const yi = Math.floor(y)
  let d1 = 9
  let d2 = 9
  for (let j = -1; j <= 1; j++) {
    for (let i = -1; i <= 1; i++) {
      const cx = xi + i + hash(xi + i, yi + j, seed)
      const cy = yi + j + hash(xi + i, yi + j, seed + 7)
      const d = Math.hypot(x - cx, y - cy)
      if (d < d1) {
        d2 = d1
        d1 = d
      } else if (d < d2) d2 = d
    }
  }
  return { d1, edge: d2 - d1 }
}

/* ------------------------------------------------------------ materials */

/**
 * profile: height shape from the edge inward. bump(x, y) returns surface relief
 * in design units; tint(x, y) returns an albedo multiplier.
 */
const MATERIALS = {
  metal: {
    profile: 'bevel', bevel: 0.32, depth: 0.55, ambient: 0.3, diffuse: 0.75, spec: 1.1, shine: 70, metallic: 0.85, rim: 0.55,
    bump: (x, y, s) => (valueNoise(x * 0.25, y * 6, s) - 0.5) * 0.08 + (fbm(x * 0.6, y * 0.6, s) - 0.5) * 0.12,
    tint: (x, y, s) => 0.9 + fbm(x * 0.15, y * 0.15, s) * 0.2,
  },
  cloth: {
    profile: 'dome', depth: 0.35, ambient: 0.32, diffuse: 0.8, spec: 0.1, shine: 8, metallic: 0, rim: 0.5,
    // Soft folds plus a fine weave.
    bump: (x, y, s) =>
      Math.sin(x * 0.35 + fbm(x * 0.05, y * 0.05, s) * 9) * 0.9 +
      (Math.sin(x * 4.2) * Math.sin(y * 4.2)) * 0.06,
    tint: (x, y, s) => 0.85 + fbm(x * 0.2, y * 0.2, s) * 0.3,
  },
  leather: {
    profile: 'dome', depth: 0.4, ambient: 0.32, diffuse: 0.8, spec: 0.35, shine: 18, metallic: 0, rim: 0.45,
    bump: (x, y, s) => (fbm(x * 1.4, y * 1.4, s) - 0.5) * 0.35,
    tint: (x, y, s) => 0.8 + fbm(x * 0.4, y * 0.4, s) * 0.35,
  },
  skin: {
    profile: 'dome', depth: 0.6, ambient: 0.34, diffuse: 0.8, spec: 0.3, shine: 22, metallic: 0, rim: 0.5,
    bump: (x, y, s) => (fbm(x * 0.9, y * 0.9, s) - 0.5) * 0.35 + (valueNoise(x * 3, y * 3, s) - 0.5) * 0.06,
    tint: (x, y, s) => 0.88 + fbm(x * 0.25, y * 0.25, s) * 0.25,
  },
  fur: {
    profile: 'dome', depth: 0.6, ambient: 0.34, diffuse: 0.78, spec: 0.12, shine: 10, metallic: 0, rim: 0.7,
    // Long, wavy strands.
    bump: (x, y, s) => {
      const w = fbm(x * 0.05, y * 0.05, s) * 6
      return (valueNoise(x * 2.6 + w, y * 0.45, s) - 0.5) * 0.9
    },
    tint: (x, y, s) => 0.78 + valueNoise(x * 2.6 + fbm(x * 0.05, y * 0.05, s) * 6, y * 0.45, s + 3) * 0.4,
  },
  scale: {
    profile: 'dome', depth: 0.6, ambient: 0.3, diffuse: 0.8, spec: 0.7, shine: 40, metallic: 0.2, rim: 0.6,
    bump: (x, y, s) => {
      const v = voronoi(x * 0.42, y * 0.42, s)
      return Math.min(1, v.edge * 3) * 0.55 - v.d1 * 0.25
    },
    tint: (x, y, s) => {
      const v = voronoi(x * 0.42, y * 0.42, s)
      return 0.7 + Math.min(1, v.edge * 4) * 0.35
    },
  },
  chitin: {
    profile: 'dome', depth: 0.7, ambient: 0.28, diffuse: 0.75, spec: 1.2, shine: 90, metallic: 0.3, rim: 0.8,
    bump: (x, y, s) => (fbm(x * 0.3, y * 0.3, s) - 0.5) * 0.25,
    tint: (x, y, s) => 0.85 + fbm(x * 0.2, y * 0.2, s) * 0.3,
  },
  stone: {
    profile: 'bevel', bevel: 0.4, depth: 0.5, ambient: 0.32, diffuse: 0.8, spec: 0.08, shine: 6, metallic: 0, rim: 0.35,
    bump: (x, y, s) => {
      const v = voronoi(x * 0.12, y * 0.12, s)
      const crack = v.edge < 0.05 ? -1.2 : 0
      return (fbm(x * 0.5, y * 0.5, s) - 0.5) * 1.1 + crack
    },
    tint: (x, y, s) => {
      const v = voronoi(x * 0.12, y * 0.12, s)
      return (0.75 + fbm(x * 0.35, y * 0.35, s) * 0.45) * (v.edge < 0.05 ? 0.55 : 1)
    },
  },
  bone: {
    profile: 'dome', depth: 0.6, ambient: 0.4, diffuse: 0.7, spec: 0.35, shine: 25, metallic: 0, rim: 0.4,
    bump: (x, y, s) => (fbm(x * 1.2, y * 1.2, s) - 0.5) * 0.2,
    tint: (x, y, s) => 0.85 + fbm(x * 0.6, y * 0.6, s) * 0.2,
  },
  membrane: {
    profile: 'dome', depth: 0.25, ambient: 0.35, diffuse: 0.75, spec: 0.3, shine: 20, metallic: 0, rim: 0.9,
    bump: (x, y, s) => (fbm(x * 0.25, y * 0.25, s) - 0.5) * 0.6,
    tint: (x, y, s) => 0.75 + fbm(x * 0.5, y * 0.5, s) * 0.45,
  },
}

const ORGANIC = new Set(['cloth', 'leather', 'skin', 'fur', 'scale', 'chitin', 'bone', 'membrane'])

/** Chaikin corner cutting: rounds a polygon's silhouette. */
function chaikin(poly, iterations) {
  let pts = poly
  for (let k = 0; k < iterations; k++) {
    const next = []
    for (let i = 0; i < pts.length; i++) {
      const [ax, ay] = pts[i]
      const [bx, by] = pts[(i + 1) % pts.length]
      next.push([ax * 0.75 + bx * 0.25, ay * 0.75 + by * 0.25], [ax * 0.25 + bx * 0.75, ay * 0.25 + by * 0.75])
    }
    pts = next
  }
  return pts
}

function materialName(part, char) {
  if (part.mat) return part.mat
  if (part.gloss !== undefined && part.gloss >= 0.8) return 'metal'
  return char.mat ?? 'cloth'
}

function materialFor(part, char) {
  if (part.mat) return MATERIALS[part.mat]
  if (part.gloss !== undefined && part.gloss >= 0.8) return MATERIALS.metal
  return MATERIALS[char.mat ?? 'cloth']
}

/* -------------------------------------------------------------- raster */

function hex(c) {
  const v = parseInt(c.slice(1), 16)
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255]
}

function bounds(poly) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity
  for (const [x, y] of poly) {
    x0 = Math.min(x0, x); y0 = Math.min(y0, y)
    x1 = Math.max(x1, x); y1 = Math.max(y1, y)
  }
  return { x0, y0, x1, y1 }
}

/** Scanline fill of a polygon into a local mask (pixel centres, even-odd). */
function fillMask(poly, pad) {
  const b = bounds(poly)
  const ox = Math.max(0, Math.floor(b.x0 * S) - pad)
  const oy = Math.max(0, Math.floor(b.y0 * S) - pad)
  const w = Math.min(WW, Math.ceil(b.x1 * S) + pad) - ox
  const h = Math.min(HH, Math.ceil(b.y1 * S) + pad) - oy
  const mask = new Uint8Array(Math.max(0, w * h))
  const pts = poly.map(([x, y]) => [x * S - ox, y * S - oy])
  for (let y = 0; y < h; y++) {
    const py = y + 0.5
    const xs = []
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const [xi, yi] = pts[i]
      const [xj, yj] = pts[j]
      if (yi > py !== yj > py) xs.push(xi + ((py - yi) * (xj - xi)) / (yj - yi))
    }
    xs.sort((a, b2) => a - b2)
    for (let k = 0; k + 1 < xs.length; k += 2) {
      const a = Math.max(0, Math.ceil(xs[k] - 0.5))
      const e = Math.min(w - 1, Math.floor(xs[k + 1] - 0.5))
      for (let x = a; x <= e; x++) mask[y * w + x] = 1
    }
  }
  return { mask, ox, oy, w, h }
}

/** Exact Euclidean distance transform (Felzenszwalb–Huttenlocher), distance to the nearest outside pixel. */
function edt(mask, w, h) {
  const INF = 1e12
  const f = new Float64Array(Math.max(w, h))
  const d = new Float64Array(Math.max(w, h))
  const v = new Int32Array(Math.max(w, h))
  const z = new Float64Array(Math.max(w, h) + 1)
  const grid = new Float64Array(w * h)
  for (let i = 0; i < w * h; i++) grid[i] = mask[i] ? INF : 0
  const pass = (n) => {
    let k = 0
    v[0] = 0
    z[0] = -INF
    z[1] = INF
    for (let q = 1; q < n; q++) {
      let s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k])
      while (s <= z[k]) {
        k--
        s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k])
      }
      k++
      v[k] = q
      z[k] = s
      z[k + 1] = INF
    }
    k = 0
    for (let q = 0; q < n; q++) {
      while (z[k + 1] < q) k++
      d[q] = (q - v[k]) ** 2 + f[v[k]]
    }
  }
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) f[y] = grid[y * w + x]
    pass(h)
    for (let y = 0; y < h; y++) grid[y * w + x] = d[y]
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) f[x] = grid[y * w + x]
    pass(w)
    for (let x = 0; x < w; x++) grid[y * w + x] = Math.sqrt(d[x])
  }
  return grid
}

function boxBlur(src, w, h, r) {
  const tmp = new Float32Array(w * h)
  const out = new Float32Array(w * h)
  for (let y = 0; y < h; y++) {
    let acc = 0
    for (let x = -r; x <= r; x++) acc += src[y * w + Math.min(w - 1, Math.max(0, x))]
    for (let x = 0; x < w; x++) {
      tmp[y * w + x] = acc / (2 * r + 1)
      acc += src[y * w + Math.min(w - 1, x + r + 1)] - src[y * w + Math.max(0, x - r)]
    }
  }
  for (let x = 0; x < w; x++) {
    let acc = 0
    for (let y = -r; y <= r; y++) acc += tmp[Math.min(h - 1, Math.max(0, y)) * w + x]
    for (let y = 0; y < h; y++) {
      out[y * w + x] = acc / (2 * r + 1)
      acc += tmp[Math.min(h - 1, y + r + 1) * w + x] - tmp[Math.max(0, y - r) * w + x]
    }
  }
  return out
}

const LIGHT = norm([-0.5, -0.75, 0.85])
const BACK = norm([0.75, 0.25, 0.35])
const HALF = norm([LIGHT[0], LIGHT[1], LIGHT[2] + 1])

function norm(v) {
  const m = Math.hypot(...v)
  return v.map((x) => x / m)
}

function render(char) {
  const color = new Float32Array(WW * HH * 3)
  const alpha = new Float32Array(WW * HH)
  const glows = []
  const seed = char.seed ?? 7

  char.parts.forEach((part, index) => {
    if (part.glow) glows.push(part)
    const pad = Math.round(4 * S)
    // Organic parts get rounded silhouettes; armour and blades keep crisp corners
    // except for a slight softening.
    const matName = materialName(part, char)
    const smooth = part.smooth ?? (part.emit ? 0 : ORGANIC.has(matName) ? 3 : 1)
    const pts = part.pts.length > 3 || smooth > 1 ? chaikin(part.pts, smooth) : part.pts
    const { mask, ox, oy, w, h } = fillMask(pts, pad)
    if (!w || !h) return
    const base = hex(part.color)
    const partAlpha = part.alpha ?? 1

    // Soft contact shadow cast down-right onto everything already drawn.
    if (!part.emit && partAlpha > 0.5) {
      const sh = new Float32Array(w * h)
      const off = Math.round(1.6 * S)
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) if (mask[y * w + x]) {
          const tx = x + off
          const ty = y + Math.round(off * 1.3)
          if (tx < w && ty < h) sh[ty * w + tx] = 1
        }
      }
      const blurred = boxBlur(sh, w, h, Math.max(1, Math.round(1.8 * S)))
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const k = blurred[y * w + x] * 0.5
          if (!k || mask[y * w + x]) continue
          const gi = (oy + y) * WW + ox + x
          if (!alpha[gi]) continue
          for (let c = 0; c < 3; c++) color[gi * 3 + c] *= 1 - k
        }
      }
    }

    if (part.emit) {
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          if (!mask[y * w + x]) continue
          const gi = (oy + y) * WW + ox + x
          composite(color, alpha, gi, base, partAlpha)
        }
      }
      return
    }

    const mat = materialFor(part, char)
    const dist = edt(mask, w, h)
    let maxD = 1
    for (let i = 0; i < dist.length; i++) if (dist[i] > maxD) maxD = dist[i]
    const depth = (part.depth ?? mat.depth) * maxD
    const bevelR = Math.max(2, (part.bevel ?? mat.bevel ?? 1) * maxD)
    const pseed = seed * 131 + index * 7
    const bumpScale = (part.bump ?? 1) * S * 0.6

    // Height field: a profile from the edge inward, blurred so the medial-axis
    // creases of a distance field melt into smooth, sculpted forms.
    const profile = new Float32Array(w * h)
    for (let i = 0; i < w * h; i++) {
      if (!mask[i]) continue
      const dd = dist[i]
      if (mat.profile === 'bevel') {
        const t = Math.min(1, dd / bevelR)
        profile[i] = Math.sqrt(1 - (1 - t) * (1 - t)) * (bevelR / maxD) * 0.9 + (dd / maxD) * 0.1
      } else {
        const t = dd / maxD
        profile[i] = Math.sqrt(1 - (1 - t) * (1 - t))
      }
    }
    const blurR = Math.max(1, Math.round(maxD * (mat.profile === 'bevel' ? 0.12 : 0.3)))
    const soft = boxBlur(boxBlur(profile, w, h, blurR), w, h, blurR)
    const height = new Float32Array(w * h)
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x
        if (!mask[i]) continue
        const ux = (ox + x) / S
        const uy = (oy + y) / S
        height[i] = soft[i] * depth + mat.bump(ux, uy, pseed) * bumpScale * Math.min(1, dist[i] / (S * 1.2))
      }
    }

    const [lr, lg, lb] = part.rim ? hex(part.rim) : [210, 225, 255]
    const ambient = part.ambient ?? mat.ambient
    const specK = mat.spec * (part.spec ?? 1)
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const i = y * w + x
        if (!mask[i]) continue
        const hx = (mask[i + 1] ? height[i + 1] : height[i]) - (mask[i - 1] ? height[i - 1] : height[i])
        const hy = (mask[i + w] ? height[i + w] : height[i]) - (mask[i - w] ? height[i - w] : height[i])
        const n = norm([-hx * 0.5, -hy * 0.5, 1])
        const ndl = Math.max(0, n[0] * LIGHT[0] + n[1] * LIGHT[1] + n[2] * LIGHT[2])
        const ndh = Math.max(0, n[0] * HALF[0] + n[1] * HALF[1] + n[2] * HALF[2])
        const rimT = Math.max(0, n[0] * BACK[0] + n[1] * BACK[1] + n[2] * BACK[2]) ** 2 * (1 - n[2]) * 2
        const spec = Math.pow(ndh, mat.shine) * specK
        const ux = (ox + x) / S
        const uy = (oy + y) / S
        const tint = mat.tint(ux, uy, pseed)
        // Edge occlusion: crevices along the silhouette stay darker.
        const occ = 0.72 + 0.28 * Math.min(1, dist[i] / (S * 1.5))
        const lit = (ambient + ndl * mat.diffuse) * occ
        const rgb = [0, 1, 2].map((c) => {
          const alb = base[c] * tint
          const specCol = 255 * (1 - mat.metallic) + alb * 1.6 * mat.metallic
          const rimCol = [lr, lg, lb][c]
          return alb * lit + specCol * spec + rimCol * rimT * mat.rim * (part.rimStrength ?? 0.6)
        })
        composite(color, alpha, (oy + y) * WW + ox + x, rgb, partAlpha)
      }
    }
  })

  // Downsample.
  const ow = Math.round(W * SCALE)
  const oh = Math.round(H * SCALE)
  const out = new Float32Array(ow * oh * 4)
  for (let y = 0; y < oh; y++) {
    for (let x = 0; x < ow; x++) {
      let r = 0, g = 0, b = 0, al = 0
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const gi = (y * SS + sy) * WW + x * SS + sx
          const a = alpha[gi]
          r += color[gi * 3] * a; g += color[gi * 3 + 1] * a; b += color[gi * 3 + 2] * a; al += a
        }
      }
      const o = (y * ow + x) * 4
      out[o + 3] = al / (SS * SS)
      if (al) {
        out[o] = Math.min(255, r / al)
        out[o + 1] = Math.min(255, g / al)
        out[o + 2] = Math.min(255, b / al)
      }
    }
  }

  // Additive halos for eyes, runes and flames.
  for (const part of glows) {
    const [r, g, b] = hex(part.glow)
    const cx = (part.pts.reduce((s, q) => s + q[0], 0) / part.pts.length) * SCALE
    const cy = (part.pts.reduce((s, q) => s + q[1], 0) / part.pts.length) * SCALE
    const R = (part.glowR ?? 10) * SCALE
    for (let y = Math.max(0, Math.floor(cy - R)); y < Math.min(oh, cy + R); y++) {
      for (let x = Math.max(0, Math.floor(cx - R)); x < Math.min(ow, cx + R); x++) {
        const dd = Math.hypot(x - cx, y - cy) / R
        if (dd >= 1) continue
        const k = (1 - dd) ** 2.2 * (part.glowStrength ?? 0.9)
        const o = (y * ow + x) * 4
        const a0 = out[o + 3]
        const a1 = Math.min(1, a0 + k)
        out[o] = Math.min(255, (out[o] * a0 + r * k) / a1)
        out[o + 1] = Math.min(255, (out[o + 1] * a0 + g * k) / a1)
        out[o + 2] = Math.min(255, (out[o + 2] * a0 + b * k) / a1)
        out[o + 3] = a1
      }
    }
  }
  return { w: ow, h: oh, px: out }
}

function composite(color, alpha, gi, rgb, a) {
  const da = alpha[gi]
  const oa = a + da * (1 - a)
  for (let c = 0; c < 3; c++) color[gi * 3 + c] = (Math.max(0, rgb[c]) * a + color[gi * 3 + c] * da * (1 - a)) / (oa || 1)
  alpha[gi] = oa
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
const only = args.filter((a) => !a.includes('/'))
const outDir = args.find((a) => a.includes('/')) ?? join(root, 'src/art/images')
mkdirSync(outDir, { recursive: true })

const rendered = []
for (const [slot, char] of Object.entries(CHARACTERS)) {
  if (only.length && !only.includes(slot)) continue
  const img = render(char)
  writeFileSync(join(outDir, `${slot}.png`), png(img.w, img.h, img.px))
  console.log(`${slot}: ${char.parts.length} parts`)
  rendered.push(img)
}

if (sheetPath && rendered.length) {
  // Contact sheet on the app's background colour, for reviewing the cast.
  const cols = Math.min(5, rendered.length)
  const rows = Math.ceil(rendered.length / cols)
  const cw = rendered[0].w
  const ch = rendered[0].h
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
