/**
 * Accelerometer rep counting for when the camera is not an option: hold the
 * phone against your chest or keep it in a pocket. Each rep produces a spike
 * in acceleration magnitude; we count spikes with a refractory period.
 */
export type MotionExercise = 'squat' | 'jumpingJack'

const PROFILES: Record<MotionExercise, { threshold: number; release: number; refractoryMs: number }> = {
  jumpingJack: { threshold: 6, release: 2.5, refractoryMs: 320 },
  squat: { threshold: 2.2, release: 0.8, refractoryMs: 900 },
}

export interface MotionCounter {
  /** Feed a raw acceleration sample (m/s², including gravity). Returns total reps. */
  push(ax: number, ay: number, az: number, t: number): number
  readonly count: number
  /** Latest dynamic acceleration, for the live meter. */
  readonly level: number
  reset(): void
}

export function createMotionCounter(ex: MotionExercise): MotionCounter {
  const p = PROFILES[ex]
  let gravity: number | null = null
  let count = 0
  let armed = true
  let lastRep = -Infinity
  let level = 0
  return {
    get count() {
      return count
    },
    get level() {
      return level
    },
    reset() {
      gravity = null
      count = 0
      armed = true
      lastRep = -Infinity
      level = 0
    },
    push(ax, ay, az, t) {
      const mag = Math.hypot(ax, ay, az)
      // Gravity is estimated only while the phone is nearly still, so long
      // bursts of movement cannot drag the baseline along with them.
      if (gravity === null) gravity = mag
      const dyn = Math.abs(mag - gravity)
      if (dyn < 1.2) gravity += 0.05 * (mag - gravity)
      level = level + 0.3 * (dyn - level)
      if (armed && level > p.threshold && t - lastRep > p.refractoryMs) {
        count++
        lastRep = t
        armed = false
      } else if (!armed && level < p.release) {
        armed = true
      }
      return count
    },
  }
}

interface IOSMotionEvent {
  requestPermission?: () => Promise<'granted' | 'denied'>
}

export async function requestMotionPermission(): Promise<boolean> {
  const DME = (globalThis as unknown as { DeviceMotionEvent?: IOSMotionEvent }).DeviceMotionEvent
  if (!DME) return false
  if (typeof DME.requestPermission === 'function') {
    try {
      return (await DME.requestPermission()) === 'granted'
    } catch {
      return false
    }
  }
  return true
}
