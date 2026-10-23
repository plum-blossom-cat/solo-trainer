import type { PoseLandmarker } from '@mediapipe/tasks-vision'
import { motion } from 'framer-motion'
import { useCallback, useEffect, useRef, useState } from 'react'
import { sfx } from '../../audio/sfx'
import { SKELETON, type Pt } from '../../detection/geometry'
import { detectPose, loadPoseLandmarker } from '../../detection/poseDetector'
import { createCounter, type CountableExercise, type CounterState } from '../../detection/repCounter'
import { EXERCISES, formatAmount } from '../../game/data'
import { useStore } from '../../game/store'

type Phase = 'idle' | 'loading' | 'running' | 'error'

interface Props {
  exercise: CountableExercise
  /** Called with newly completed reps (or whole seconds for the plank). */
  onAmount: (delta: number) => void
  compact?: boolean
}

export function CameraCounter({ exercise, onAmount, compact = false }: Props) {
  const showSkeleton = useStore((s) => s.data?.settings.showSkeleton ?? true)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const rafRef = useRef(0)
  const counterRef = useRef(createCounter(exercise))
  const reportedRef = useRef(0)
  const onAmountRef = useRef(onAmount)
  onAmountRef.current = onAmount

  const [phase, setPhase] = useState<Phase>('idle')
  const [error, setError] = useState('')
  const [facing, setFacing] = useState<'user' | 'environment'>('user')
  const [state, setState] = useState<CounterState>({ count: 0, depth: 0, tracking: false, feedback: '', phase: 'idle' })
  const [pulse, setPulse] = useState(0)

  const stop = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
  }, [])

  useEffect(() => {
    counterRef.current = createCounter(exercise)
    reportedRef.current = 0
    setState({ count: 0, depth: 0, tracking: false, feedback: '', phase: 'idle' })
  }, [exercise])

  useEffect(() => stop, [stop])

  const draw = (lm: Pt[] | null, tracking: boolean) => {
    const canvas = canvasRef.current
    const video = videoRef.current
    if (!canvas || !video) return
    if (canvas.width !== video.videoWidth) {
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
    }
    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    if (!lm || !showSkeleton) return
    const color = tracking ? '96,165,250' : '248,113,113'
    const scale = canvas.width / 640
    ctx.lineCap = 'round'
    ctx.shadowColor = `rgb(${color})`
    ctx.shadowBlur = 14 * scale
    ctx.strokeStyle = `rgba(${color},0.9)`
    ctx.lineWidth = 4 * scale
    for (const [a, b] of SKELETON) {
      const p = lm[a]
      const q = lm[b]
      if (!p || !q || p.v < 0.35 || q.v < 0.35) continue
      ctx.beginPath()
      ctx.moveTo(p.x, p.y)
      ctx.lineTo(q.x, q.y)
      ctx.stroke()
    }
    ctx.fillStyle = '#e0f2fe'
    for (const i of [0, 11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28]) {
      const p = lm[i]
      if (!p || p.v < 0.35) continue
      ctx.beginPath()
      ctx.arc(p.x, p.y, 5 * scale, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  const loop = (landmarker: PoseLandmarker) => {
    let lastVideoTime = -1
    let lastUi = 0
    const step = () => {
      const video = videoRef.current
      if (!video || !streamRef.current) return
      if (video.readyState >= 2 && video.currentTime !== lastVideoTime) {
        lastVideoTime = video.currentTime
        const t = performance.now()
        let lm: Pt[] | null = null
        try {
          lm = detectPose(landmarker, video, t)
        } catch {
          lm = null
        }
        const s = counterRef.current.update(lm, t)
        draw(lm, s.tracking)
        const whole = Math.floor(s.count)
        if (whole > reportedRef.current) {
          const delta = whole - reportedRef.current
          reportedRef.current = whole
          onAmountRef.current(delta)
          if (exercise !== 'plank') {
            sfx.rep()
            setPulse((p) => p + 1)
          } else if (whole % 10 === 0) {
            sfx.rep()
          }
        }
        if (t - lastUi > 90) {
          lastUi = t
          setState(s)
        }
      }
      rafRef.current = requestAnimationFrame(step)
    }
    rafRef.current = requestAnimationFrame(step)
  }

  const start = async (face = facing) => {
    stop()
    setPhase('loading')
    setError('')
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('Camera API not available. Use HTTPS and a modern browser.')
      const [landmarker, stream] = await Promise.all([
        loadPoseLandmarker(),
        navigator.mediaDevices.getUserMedia({
          video: { facingMode: face, width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false,
        }),
      ])
      streamRef.current = stream
      const video = videoRef.current!
      video.srcObject = stream
      await video.play()
      setPhase('running')
      loop(landmarker)
    } catch (e) {
      stop()
      const msg = e instanceof Error ? e.message : String(e)
      setError(
        /denied|NotAllowed/i.test(msg)
          ? 'Camera permission was denied. Allow camera access in your browser settings, or use manual mode.'
          : `Could not start the detector: ${msg}`,
      )
      setPhase('error')
    }
  }

  const def = EXERCISES[exercise]
  const mirrored = facing === 'user'
  const height = compact ? 260 : 360

  return (
    <div className="stack">
      <div
        style={{
          position: 'relative',
          height,
          borderRadius: 4,
          overflow: 'hidden',
          border: '1px solid var(--line)',
          background: 'radial-gradient(ellipse at center, #0b1a3a, #020409)',
          boxShadow: 'inset 0 0 40px rgba(59,130,246,0.25)',
        }}
      >
        <video
          ref={videoRef}
          playsInline
          muted
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transform: mirrored ? 'scaleX(-1)' : undefined,
            opacity: phase === 'running' ? 0.75 : 0,
            filter: 'saturate(0.6) contrast(1.1) hue-rotate(-10deg)',
          }}
        />
        <canvas
          ref={canvasRef}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transform: mirrored ? 'scaleX(-1)' : undefined,
          }}
        />

        {phase === 'running' && (
          <>
            <div style={{ position: 'absolute', top: 10, left: 12, right: 12 }} className="row between">
              <span className="tag" style={{ color: state.tracking ? 'var(--cyan)' : 'var(--red-2)', background: 'rgba(0,0,0,0.5)' }}>
                {state.tracking ? 'Tracking' : 'Searching'}
              </span>
              <button
                className="btn small ghost"
                onClick={() => {
                  const f = facing === 'user' ? 'environment' : 'user'
                  setFacing(f)
                  void start(f)
                }}
              >
                Flip
              </button>
            </div>
            <div style={{ position: 'absolute', right: 12, top: 52, bottom: 60, width: 10 }} className="bar">
              <div
                className="fill"
                style={{ position: 'absolute', bottom: 0, width: '100%', height: `${state.depth * 100}%`, transition: 'height 0.1s' }}
              />
            </div>
            <motion.div
              key={pulse}
              initial={{ scale: 1.5, opacity: 0.6 }}
              animate={{ scale: 1, opacity: 1 }}
              className="display glow"
              style={{
                position: 'absolute',
                left: 16,
                bottom: 44,
                fontSize: compact ? 54 : 72,
                fontWeight: 900,
                lineHeight: 1,
              }}
            >
              {formatAmount(exercise, state.count)}
            </motion.div>
            <div
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                bottom: 0,
                padding: '8px 14px',
                background: 'linear-gradient(transparent, rgba(0,0,0,0.75))',
                fontWeight: 700,
                letterSpacing: '0.06em',
              }}
              className={state.tracking ? 'glow' : 'warn-text'}
            >
              {state.feedback || 'Get into position'}
            </div>
          </>
        )}

        {phase !== 'running' && (
          <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', padding: 20 }} className="center">
            {phase === 'loading' ? (
              <div className="stack" style={{ alignItems: 'center' }}>
                <div
                  style={{
                    width: 54,
                    height: 54,
                    borderRadius: '50%',
                    border: '3px solid rgba(96,165,250,0.2)',
                    borderTopColor: 'var(--cyan)',
                    animation: 'spin 0.9s linear infinite',
                    boxShadow: 'var(--glow-soft)',
                  }}
                />
                <div className="caps glow small">Initialising the System's eye…</div>
              </div>
            ) : (
              <div className="stack" style={{ alignItems: 'center', maxWidth: 360 }}>
                <div className="caps glow">AI rep detection</div>
                <div className="small muted">{def.cue}</div>
                {error && <div className="small warn-text">{error}</div>}
                <button className="btn" onClick={() => void start()}>
                  {phase === 'error' ? 'Retry camera' : 'Activate camera'}
                </button>
                <div className="dim" style={{ fontSize: 11 }}>
                  Video is processed on your device and never uploaded.
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      {phase === 'running' && (
        <button
          className="btn ghost small"
          onClick={() => {
            stop()
            setPhase('idle')
          }}
        >
          Stop camera
        </button>
      )}
    </div>
  )
}
