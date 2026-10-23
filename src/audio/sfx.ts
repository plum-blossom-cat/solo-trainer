/**
 * Synthesised System sounds — no audio files needed. Everything is built from
 * oscillators and noise with WebAudio so it works offline.
 */
let ctx: AudioContext | null = null
let enabled = true
let voiceEnabled = true

export function setSoundEnabled(on: boolean) {
  enabled = on
}

export function setVoiceEnabled(on: boolean) {
  voiceEnabled = on
}

function ac(): AudioContext | null {
  if (!enabled || typeof window === 'undefined') return null
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctor) return null
  if (!ctx) ctx = new Ctor()
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

function tone(freq: number, start: number, dur: number, type: OscillatorType = 'sine', gain = 0.15, slideTo?: number) {
  const c = ac()
  if (!c) return
  const t = c.currentTime + start
  const osc = c.createOscillator()
  const g = c.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, t)
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur)
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(gain, t + 0.015)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  osc.connect(g).connect(c.destination)
  osc.start(t)
  osc.stop(t + dur + 0.05)
}

function noise(start: number, dur: number, gain = 0.2, freq = 400) {
  const c = ac()
  if (!c) return
  const t = c.currentTime + start
  const len = Math.floor(c.sampleRate * dur)
  const buf = c.createBuffer(1, len, c.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len)
  const src = c.createBufferSource()
  src.buffer = buf
  const f = c.createBiquadFilter()
  f.type = 'lowpass'
  f.frequency.setValueAtTime(freq, t)
  const g = c.createGain()
  g.gain.setValueAtTime(gain, t)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  src.connect(f).connect(g).connect(c.destination)
  src.start(t)
}

export const sfx = {
  /** The classic System notification chime. */
  system() {
    tone(880, 0, 0.18, 'sine', 0.12)
    tone(1318.5, 0.09, 0.35, 'sine', 0.1)
  },
  click() {
    tone(1400, 0, 0.05, 'square', 0.03)
  },
  rep() {
    tone(660, 0, 0.08, 'triangle', 0.12)
    tone(990, 0.04, 0.1, 'sine', 0.08)
  },
  hit(crit = false) {
    noise(0, crit ? 0.25 : 0.12, crit ? 0.35 : 0.2, crit ? 1800 : 900)
    tone(crit ? 220 : 160, 0, 0.15, 'sawtooth', 0.06, 60)
  },
  levelUp() {
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5]
    notes.forEach((n, i) => tone(n, i * 0.08, 0.5, 'triangle', 0.12))
    tone(2093, 0.45, 0.9, 'sine', 0.06)
  },
  questComplete() {
    ;[659.25, 830.6, 987.8, 1318.5].forEach((n, i) => tone(n, i * 0.1, 0.4, 'sine', 0.1))
  },
  warning() {
    tone(220, 0, 0.25, 'sawtooth', 0.1)
    tone(207.65, 0.28, 0.25, 'sawtooth', 0.1)
    tone(196, 0.56, 0.45, 'sawtooth', 0.1)
  },
  gate() {
    tone(55, 0, 1.6, 'sawtooth', 0.08, 110)
    noise(0, 1.4, 0.15, 300)
    tone(440, 0.6, 0.8, 'sine', 0.05, 880)
  },
  arise() {
    tone(41.2, 0, 2.2, 'sawtooth', 0.14, 30)
    tone(82.4, 0.05, 1.8, 'square', 0.04, 55)
    noise(0.1, 1.8, 0.25, 220)
    tone(329.6, 0.9, 1.2, 'sine', 0.05, 164.8)
  },
  fail() {
    tone(196, 0, 0.3, 'square', 0.06, 98)
  },
  coin() {
    tone(1568, 0, 0.08, 'square', 0.04)
    tone(2093, 0.07, 0.15, 'square', 0.04)
  },
}

/** Speaks a line in a low, flat "System" voice where speech synthesis is available. */
export function speak(text: string) {
  if (!enabled || !voiceEnabled || typeof window === 'undefined' || !('speechSynthesis' in window)) return
  try {
    const u = new SpeechSynthesisUtterance(text)
    u.rate = 0.95
    u.pitch = 0.6
    u.volume = 0.8
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(u)
  } catch {
    // Speech is decorative; ignore failures.
  }
}
