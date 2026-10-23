/**
 * Rep counters driven by pose landmarks. Each counter is a small state machine
 * with hysteresis: a rep only counts after a full range of motion, so jitter
 * around a threshold never double-counts.
 */
import { angle, bestSide, dist, inclination, LM, mid, sidePoints, visible, type Pt } from './geometry'

export type CountableExercise = 'pushup' | 'squat' | 'situp' | 'jumpingJack' | 'plank'

export interface CounterState {
  /** Total reps, or seconds held for the plank. */
  count: number
  /** 0 at the start position, 1 at full depth. Drives the depth gauge. */
  depth: number
  /** Whether the body is in a recognisable position for this exercise. */
  tracking: boolean
  feedback: string
  phase: 'start' | 'peak' | 'hold' | 'idle'
}

export interface RepCounter {
  readonly exercise: CountableExercise
  update(lm: Pt[] | null, timeMs: number): CounterState
  reset(): void
}

interface Measurement {
  ok: boolean
  value: number
  feedback?: string
}

interface AngleConfig {
  exercise: CountableExercise
  measure(lm: Pt[]): Measurement
  /** Metric value at the resting/start position (e.g. elbows locked). */
  start: number
  /** Metric value that must be reached for the rep to count. */
  peak: number
  /** Halfway point used to detect half reps. */
  partialFeedback: string
  minRepMs?: number
}

const SMOOTHING = 0.45

export function createAngleCounter(cfg: AngleConfig): RepCounter {
  let count = 0
  let phase: 'start' | 'peak' = 'start'
  let smoothed: number | null = null
  let lastRepAt = -Infinity
  let deepest = 0
  let feedback = 'Get into position'

  const decreasing = cfg.peak < cfg.start
  const depthOf = (v: number) => {
    const d = (cfg.start - v) / (cfg.start - cfg.peak)
    return Math.max(0, Math.min(1, d))
  }

  return {
    exercise: cfg.exercise,
    reset() {
      count = 0
      phase = 'start'
      smoothed = null
      lastRepAt = -Infinity
      deepest = 0
      feedback = 'Get into position'
    },
    update(lm, t) {
      if (!lm) {
        smoothed = null
        return { count, depth: 0, tracking: false, feedback: 'Step into the frame', phase: 'idle' }
      }
      const m = cfg.measure(lm)
      if (!m.ok) {
        return { count, depth: 0, tracking: false, feedback: m.feedback ?? 'Get into position', phase: 'idle' }
      }
      smoothed = smoothed === null ? m.value : smoothed + SMOOTHING * (m.value - smoothed)
      const v = smoothed
      const depth = depthOf(v)
      const atPeak = decreasing ? v <= cfg.peak : v >= cfg.peak
      const atStart = decreasing ? v >= cfg.start : v <= cfg.start

      if (phase === 'start') {
        deepest = Math.max(deepest, depth)
        if (atPeak) {
          phase = 'peak'
          feedback = 'Good! Now return'
        } else if (atStart && deepest > 0.45) {
          // Came back up without reaching full depth.
          feedback = cfg.partialFeedback
          deepest = 0
        } else if (atStart) {
          deepest = 0
          if (feedback !== cfg.partialFeedback) feedback = 'Ready'
        }
      } else if (atStart) {
        phase = 'start'
        deepest = 0
        if (t - lastRepAt >= (cfg.minRepMs ?? 350)) {
          count++
          lastRepAt = t
          feedback = 'Rep counted!'
        }
      }
      return { count, depth, tracking: true, feedback: m.feedback ?? feedback, phase }
    },
  }
}

/* ------------------------------------------------------------- push-up */

export function pushupCounter(): RepCounter {
  return createAngleCounter({
    exercise: 'pushup',
    start: 150,
    peak: 95,
    partialFeedback: 'Go lower — chest toward the floor',
    measure(lm) {
      const s = sidePoints(lm, bestSide(lm))
      if (!visible([s.shoulder, s.elbow, s.wrist, s.hip])) return { ok: false, value: 0, feedback: 'Show your arm and torso side-on' }
      if (inclination(s.shoulder, s.hip) > 45) return { ok: false, value: 0, feedback: 'Get into push-up position' }
      if (s.ankle && s.ankle.v > 0.5 && angle(s.shoulder, s.hip, s.ankle) < 140) {
        return { ok: true, value: angle(s.shoulder, s.elbow, s.wrist), feedback: 'Keep your body straight' }
      }
      return { ok: true, value: angle(s.shoulder, s.elbow, s.wrist) }
    },
  })
}

/* --------------------------------------------------------------- squat */

export function squatCounter(): RepCounter {
  return createAngleCounter({
    exercise: 'squat',
    start: 160,
    peak: 105,
    partialFeedback: 'Deeper — hips to knee level',
    minRepMs: 500,
    measure(lm) {
      const s = sidePoints(lm, bestSide(lm))
      if (!visible([s.hip, s.knee, s.ankle])) return { ok: false, value: 0, feedback: 'Show hips, knees and ankles' }
      if (s.shoulder && s.shoulder.v > 0.5 && inclination(s.shoulder, s.hip) < 35) {
        return { ok: false, value: 0, feedback: 'Stand up to squat' }
      }
      return { ok: true, value: angle(s.hip, s.knee, s.ankle) }
    },
  })
}

/* --------------------------------------------------------------- sit-up */

export function situpCounter(): RepCounter {
  return createAngleCounter({
    exercise: 'situp',
    start: 115,
    peak: 70,
    partialFeedback: 'Sit all the way up',
    minRepMs: 600,
    measure(lm) {
      const s = sidePoints(lm, bestSide(lm))
      if (!visible([s.shoulder, s.hip, s.knee])) return { ok: false, value: 0, feedback: 'Show shoulders, hips and knees side-on' }
      return { ok: true, value: angle(s.shoulder, s.hip, s.knee) }
    },
  })
}

/* -------------------------------------------------------- jumping jack */

/**
 * Jumping jacks are measured as an "openness" score: arms raised overhead and
 * feet wider than the shoulders. 0 = closed, 1 = fully open.
 */
export function jackOpenness(lm: Pt[]): Measurement {
  const ls = lm[LM.lShoulder]
  const rs = lm[LM.rShoulder]
  const lw = lm[LM.lWrist]
  const rw = lm[LM.rWrist]
  const la = lm[LM.lAnkle]
  const ra = lm[LM.rAnkle]
  const lh = lm[LM.lHip]
  const rh = lm[LM.rHip]
  if (!visible([ls, rs, lw, rw, lh, rh], 0.4)) return { ok: false, value: 0, feedback: 'Face the camera, arms in frame' }
  const shoulderW = Math.max(1e-6, dist(ls, rs))
  const torso = Math.max(1e-6, dist(mid(ls, rs), mid(lh, rh)))
  if (inclination(mid(ls, rs), mid(lh, rh)) < 50) return { ok: false, value: 0, feedback: 'Stand up straight' }
  // Wrist height relative to shoulders, in torso lengths. Hands at hips ≈ -1, overhead ≈ +0.8.
  const shoulderY = (ls.y + rs.y) / 2
  const armLift = ((shoulderY - lw.y) + (shoulderY - rw.y)) / 2 / torso
  const arms = Math.max(0, Math.min(1, (armLift + 0.6) / 1.2))
  let legs = arms
  if (visible([la, ra], 0.4)) {
    const spread = dist(la, ra) / shoulderW
    legs = Math.max(0, Math.min(1, (spread - 0.9) / 0.9))
  }
  return { ok: true, value: arms * 0.65 + legs * 0.35 }
}

export function jumpingJackCounter(): RepCounter {
  return createAngleCounter({
    exercise: 'jumpingJack',
    start: 0.3,
    peak: 0.75,
    partialFeedback: 'Arms all the way overhead',
    minRepMs: 300,
    measure: jackOpenness,
  })
}

/* ---------------------------------------------------------------- plank */

export function plankCounter(): RepCounter {
  let held = 0
  let last: number | null = null
  return {
    exercise: 'plank',
    reset() {
      held = 0
      last = null
    },
    update(lm, t) {
      const dt = last === null ? 0 : Math.min(0.5, (t - last) / 1000)
      last = t
      if (!lm) return { count: held, depth: 0, tracking: false, feedback: 'Step into the frame', phase: 'idle' }
      const s = sidePoints(lm, bestSide(lm))
      const feet = s.ankle && s.ankle.v >= 0.4 ? s.ankle : s.knee
      if (!visible([s.shoulder, s.hip, feet], 0.4)) {
        return { count: held, depth: 0, tracking: false, feedback: 'Show your whole body side-on', phase: 'idle' }
      }
      if (inclination(s.shoulder, s.hip) > 40) {
        return { count: held, depth: 0, tracking: false, feedback: 'Get into plank position', phase: 'idle' }
      }
      const line = angle(s.shoulder, s.hip, feet)
      const straight = Math.max(0, Math.min(1, (line - 130) / 35))
      if (line < 155) {
        const hipsHigh = s.hip.y < (s.shoulder.y + feet.y) / 2
        return {
          count: held,
          depth: straight,
          tracking: true,
          feedback: hipsHigh ? 'Lower your hips' : 'Raise your hips — straight line',
          phase: 'idle',
        }
      }
      held += dt
      return { count: held, depth: straight, tracking: true, feedback: 'Hold it!', phase: 'hold' }
    },
  }
}

export function createCounter(ex: CountableExercise): RepCounter {
  switch (ex) {
    case 'pushup':
      return pushupCounter()
    case 'squat':
      return squatCounter()
    case 'situp':
      return situpCounter()
    case 'jumpingJack':
      return jumpingJackCounter()
    case 'plank':
      return plankCounter()
  }
}

export function isCountable(ex: string): ex is CountableExercise {
  return ex === 'pushup' || ex === 'squat' || ex === 'situp' || ex === 'jumpingJack' || ex === 'plank'
}
