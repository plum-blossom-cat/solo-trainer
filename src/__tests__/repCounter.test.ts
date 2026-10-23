import { describe, expect, it } from 'vitest'
import { LM, type Pt } from '../detection/geometry'
import { createCounter, jackOpenness } from '../detection/repCounter'
import { createMotionCounter } from '../detection/motionCounter'
import { createDistanceTracker } from '../detection/geo'

function blank(): Pt[] {
  return Array.from({ length: 33 }, () => ({ x: 0, y: 0, v: 0 }))
}

/** Side-on push-up pose with the given elbow angle (degrees). */
function pushupPose(elbow: number): Pt[] {
  const lm = blank()
  const rad = (elbow * Math.PI) / 180
  const shoulder = { x: 100, y: 100, v: 1 }
  const e = { x: 100, y: 130, v: 1 }
  lm[LM.lShoulder] = shoulder
  lm[LM.lElbow] = e
  lm[LM.lWrist] = { x: e.x + 30 * Math.sin(rad), y: e.y - 30 * Math.cos(rad), v: 1 }
  lm[LM.lHip] = { x: 200, y: 104, v: 1 }
  lm[LM.lKnee] = { x: 250, y: 106, v: 1 }
  lm[LM.lAnkle] = { x: 300, y: 108, v: 1 }
  return lm
}

/** Standing squat pose with the given knee angle (degrees). */
function squatPose(knee: number): Pt[] {
  const lm = blank()
  const rad = (knee * Math.PI) / 180
  const k = { x: 100, y: 200, v: 1 }
  const hip = { x: k.x + 50 * Math.sin(rad), y: k.y + 50 * Math.cos(rad), v: 1 }
  lm[LM.lKnee] = k
  lm[LM.lAnkle] = { x: 100, y: 260, v: 1 }
  lm[LM.lHip] = hip
  lm[LM.lShoulder] = { x: hip.x, y: hip.y - 60, v: 1 }
  return lm
}

function run(ex: Parameters<typeof createCounter>[0], frames: Pt[][], stepMs = 50) {
  const c = createCounter(ex)
  let t = 0
  let last = c.update(null, 0)
  for (const f of frames) {
    t += stepMs
    last = c.update(f, t)
  }
  return last
}

function sweep(pose: (v: number) => Pt[], from: number, to: number, steps = 8): Pt[][] {
  const out: Pt[][] = []
  for (let i = 0; i <= steps; i++) out.push(pose(from + ((to - from) * i) / steps))
  return out
}

describe('push-up counter', () => {
  it('counts full range reps', () => {
    const rep = [...sweep(pushupPose, 170, 80), ...sweep(pushupPose, 80, 170)]
    expect(run('pushup', [...rep, ...rep, ...rep]).count).toBe(3)
  })

  it('does not count half reps and tells the user to go lower', () => {
    const half = [...sweep(pushupPose, 170, 115), ...sweep(pushupPose, 115, 170)]
    const s = run('pushup', [...half, ...half])
    expect(s.count).toBe(0)
    expect(s.feedback).toMatch(/lower/i)
  })

  it('ignores jitter around the bottom threshold', () => {
    const frames = [
      ...sweep(pushupPose, 170, 80),
      ...[92, 98, 90, 99, 91, 97].map(pushupPose),
      ...sweep(pushupPose, 90, 170),
    ]
    expect(run('pushup', frames).count).toBe(1)
  })

  it('rejects upright bodies', () => {
    const upright = squatPose(170).map((p) => ({ ...p }))
    const s = run('pushup', [upright])
    expect(s.tracking).toBe(false)
  })
})

describe('squat counter', () => {
  it('counts deep squats', () => {
    const rep = [...sweep(squatPose, 175, 85), ...sweep(squatPose, 85, 175)]
    expect(run('squat', [...rep, ...rep], 80).count).toBe(2)
  })

  it('does not count shallow squats', () => {
    const rep = [...sweep(squatPose, 175, 130), ...sweep(squatPose, 130, 175)]
    expect(run('squat', [...rep, ...rep], 80).count).toBe(0)
  })
})

describe('jumping jack openness', () => {
  function jack(open: boolean): Pt[] {
    const lm = blank()
    lm[LM.lShoulder] = { x: 120, y: 100, v: 1 }
    lm[LM.rShoulder] = { x: 80, y: 100, v: 1 }
    lm[LM.lHip] = { x: 112, y: 180, v: 1 }
    lm[LM.rHip] = { x: 88, y: 180, v: 1 }
    lm[LM.lWrist] = open ? { x: 140, y: 40, v: 1 } : { x: 125, y: 190, v: 1 }
    lm[LM.rWrist] = open ? { x: 60, y: 40, v: 1 } : { x: 75, y: 190, v: 1 }
    lm[LM.lAnkle] = open ? { x: 150, y: 300, v: 1 } : { x: 108, y: 300, v: 1 }
    lm[LM.rAnkle] = open ? { x: 50, y: 300, v: 1 } : { x: 92, y: 300, v: 1 }
    return lm
  }
  it('scores open and closed positions', () => {
    expect(jackOpenness(jack(true)).value).toBeGreaterThan(0.85)
    expect(jackOpenness(jack(false)).value).toBeLessThan(0.2)
  })
  it('counts open → closed cycles', () => {
    const cycle = [jack(false), jack(false), jack(true), jack(true), jack(true), jack(false), jack(false), jack(false)]
    expect(run('jumpingJack', [...cycle, ...cycle, ...cycle], 100).count).toBe(3)
  })
})

describe('plank timer', () => {
  it('accumulates time only while the body is straight', () => {
    const straight = pushupPose(170)
    const piked = pushupPose(170)
    piked[LM.lHip] = { x: 200, y: 40, v: 1 }
    const frames = [...Array(20).fill(straight), ...Array(20).fill(piked)]
    const s = run('plank', frames, 100)
    expect(s.count).toBeGreaterThan(1.8)
    expect(s.count).toBeLessThan(2.1)
    expect(s.feedback).toMatch(/hips/i)
  })
})

describe('motion counter', () => {
  it('counts acceleration spikes with a refractory period', () => {
    const m = createMotionCounter('jumpingJack')
    let t = 0
    for (let i = 0; i < 100; i++) m.push(0, 9.8, 0, (t += 20))
    for (let rep = 0; rep < 5; rep++) {
      for (let i = 0; i < 10; i++) m.push(0, 9.8 + 14, 0, (t += 20))
      for (let i = 0; i < 20; i++) m.push(0, 9.8, 0, (t += 20))
    }
    expect(m.count).toBe(5)
  })
})

describe('GPS distance tracker', () => {
  it('accumulates distance and rejects teleports and bad fixes', () => {
    const tr = createDistanceTracker()
    // ~11 m per 0.0001° latitude
    let t = 0
    for (let i = 0; i <= 10; i++) tr.push({ lat: 51 + i * 0.0001, lon: 0, accuracy: 5, t: (t += 5000) })
    expect(tr.meters).toBeGreaterThan(105)
    expect(tr.meters).toBeLessThan(118)
    tr.push({ lat: 52, lon: 0, accuracy: 5, t: (t += 5000) })
    tr.push({ lat: 51.002, lon: 0, accuracy: 200, t: (t += 5000) })
    expect(tr.meters).toBeLessThan(118)
  })
})
