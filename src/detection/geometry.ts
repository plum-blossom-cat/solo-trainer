export interface Pt {
  x: number
  y: number
  /** Landmark visibility, 0..1. */
  v: number
}

/** MediaPipe BlazePose landmark indices. */
export const LM = {
  nose: 0,
  lShoulder: 11,
  rShoulder: 12,
  lElbow: 13,
  rElbow: 14,
  lWrist: 15,
  rWrist: 16,
  lHip: 23,
  rHip: 24,
  lKnee: 25,
  rKnee: 26,
  lAnkle: 27,
  rAnkle: 28,
} as const

export const SKELETON: [number, number][] = [
  [11, 12],
  [11, 13],
  [13, 15],
  [12, 14],
  [14, 16],
  [11, 23],
  [12, 24],
  [23, 24],
  [23, 25],
  [25, 27],
  [24, 26],
  [26, 28],
]

/** Angle ABC at vertex B, in degrees (0..180). */
export function angle(a: Pt, b: Pt, c: Pt): number {
  const abx = a.x - b.x
  const aby = a.y - b.y
  const cbx = c.x - b.x
  const cby = c.y - b.y
  const dot = abx * cbx + aby * cby
  const mag = Math.hypot(abx, aby) * Math.hypot(cbx, cby)
  if (mag === 0) return 180
  return (Math.acos(Math.max(-1, Math.min(1, dot / mag))) * 180) / Math.PI
}

export function dist(a: Pt, b: Pt): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

export function mid(a: Pt, b: Pt): Pt {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, v: Math.min(a.v, b.v) }
}

/** Inclination of segment AB from horizontal, in degrees (0 = flat, 90 = upright). */
export function inclination(a: Pt, b: Pt): number {
  const dx = Math.abs(a.x - b.x)
  const dy = Math.abs(a.y - b.y)
  return (Math.atan2(dy, dx) * 180) / Math.PI
}

export type Side = 'l' | 'r'

const SIDE_POINTS: Record<Side, number[]> = {
  l: [LM.lShoulder, LM.lElbow, LM.lWrist, LM.lHip, LM.lKnee, LM.lAnkle],
  r: [LM.rShoulder, LM.rElbow, LM.rWrist, LM.rHip, LM.rKnee, LM.rAnkle],
}

/** Pick the body side the camera sees best. */
export function bestSide(lm: Pt[]): Side {
  const score = (s: Side) => SIDE_POINTS[s].reduce((sum, i) => sum + (lm[i]?.v ?? 0), 0)
  return score('l') >= score('r') ? 'l' : 'r'
}

export function sidePoints(lm: Pt[], s: Side) {
  const [shoulder, elbow, wrist, hip, knee, ankle] = SIDE_POINTS[s].map((i) => lm[i])
  return { shoulder, elbow, wrist, hip, knee, ankle }
}

export function visible(points: (Pt | undefined)[], threshold = 0.5): boolean {
  return points.every((p) => p !== undefined && p.v >= threshold)
}
