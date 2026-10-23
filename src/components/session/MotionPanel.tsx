import { motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { sfx } from '../../audio/sfx'
import { createMotionCounter, requestMotionPermission, type MotionExercise } from '../../detection/motionCounter'

export function MotionPanel({ exercise, onAmount }: { exercise: MotionExercise; onAmount: (d: number) => void }) {
  const [running, setRunning] = useState(false)
  const [count, setCount] = useState(0)
  const [level, setLevel] = useState(0)
  const [error, setError] = useState('')
  const counter = useRef(createMotionCounter(exercise))
  const onAmountRef = useRef(onAmount)
  onAmountRef.current = onAmount

  useEffect(() => {
    counter.current = createMotionCounter(exercise)
    setCount(0)
  }, [exercise])

  useEffect(() => {
    if (!running) return
    let reported = counter.current.count
    let lastUi = 0
    const onMotion = (e: DeviceMotionEvent) => {
      const a = e.accelerationIncludingGravity
      if (!a || a.x === null || a.y === null || a.z === null) return
      const t = performance.now()
      const n = counter.current.push(a.x, a.y, a.z, t)
      if (n > reported) {
        onAmountRef.current(n - reported)
        reported = n
        sfx.rep()
        setCount(n)
      }
      if (t - lastUi > 100) {
        lastUi = t
        setLevel(counter.current.level)
      }
    }
    window.addEventListener('devicemotion', onMotion)
    return () => window.removeEventListener('devicemotion', onMotion)
  }, [running])

  const start = async () => {
    setError('')
    if (!(await requestMotionPermission())) {
      setError('Motion sensors are not available or permission was denied. This mode needs a phone.')
      return
    }
    setRunning(true)
  }

  return (
    <div className="stack" style={{ alignItems: 'center' }}>
      <div className="small muted center">
        {exercise === 'jumpingJack'
          ? 'Hold the phone firmly against your chest or keep it in a tight pocket. Each jump is detected from the impact.'
          : 'Hold the phone against your chest with both hands. Each full squat is detected from your vertical motion.'}
        <span className="dim"> (Experimental: the camera is more accurate.)</span>
      </div>
      <motion.div
        key={count}
        initial={{ scale: 1.3 }}
        animate={{ scale: 1 }}
        className="display glow"
        style={{ fontSize: 80, fontWeight: 900, lineHeight: 1 }}
      >
        {count}
      </motion.div>
      <div style={{ width: '100%' }} className="bar">
        <div className="fill" style={{ width: `${Math.min(100, level * 8)}%`, transition: 'width 0.1s' }} />
      </div>
      {error && <div className="small warn-text center">{error}</div>}
      <button className={`btn block ${running ? 'ghost' : ''}`} onClick={() => (running ? setRunning(false) : void start())}>
        {running ? 'Stop sensor' : 'Start motion sensor'}
      </button>
    </div>
  )
}
