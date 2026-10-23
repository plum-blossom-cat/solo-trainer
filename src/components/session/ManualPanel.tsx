import { motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { sfx } from '../../audio/sfx'
import { formatClock } from '../../game/date'
import type { ExerciseId } from '../../game/types'
import { EXERCISES } from '../../game/data'

/** Tap counter for reps, or a stopwatch for timed holds. */
export function ManualPanel({ exercise, onAmount }: { exercise: ExerciseId; onAmount: (d: number) => void }) {
  const unit = EXERCISES[exercise].unit
  return unit === 'seconds' ? <Stopwatch onAmount={onAmount} /> : <Tapper onAmount={onAmount} />
}

function Tapper({ onAmount }: { onAmount: (d: number) => void }) {
  const [count, setCount] = useState(0)
  const add = (n: number) => {
    sfx.rep()
    setCount((c) => c + n)
    onAmount(n)
  }
  return (
    <div className="stack" style={{ alignItems: 'center' }}>
      <motion.button
        key={count}
        whileTap={{ scale: 0.94 }}
        onClick={() => add(1)}
        aria-label="Add one rep"
        style={{
          width: 190,
          height: 190,
          borderRadius: '50%',
          border: '2px solid var(--line)',
          background: 'radial-gradient(circle, rgba(37,99,235,0.35), rgba(5,14,34,0.9) 70%)',
          boxShadow: '0 0 30px rgba(59,130,246,0.45), inset 0 0 30px rgba(96,165,250,0.3)',
          cursor: 'pointer',
          display: 'grid',
          placeItems: 'center',
        }}
      >
        <div>
          <motion.div
            initial={{ scale: 1.3 }}
            animate={{ scale: 1 }}
            className="display glow"
            style={{ fontSize: 64, fontWeight: 900, lineHeight: 1 }}
          >
            {count}
          </motion.div>
          <div className="caps small muted">Tap per rep</div>
        </div>
      </motion.button>
      <div className="grid-3" style={{ width: '100%' }}>
        {[5, 10, 25].map((n) => (
          <button key={n} className="btn ghost small" onClick={() => add(n)}>
            +{n}
          </button>
        ))}
      </div>
      <div className="dim small center">Honour system. The System is watching.</div>
    </div>
  )
}

function Stopwatch({ onAmount }: { onAmount: (d: number) => void }) {
  const [running, setRunning] = useState(false)
  const [secs, setSecs] = useState(0)
  const onAmountRef = useRef(onAmount)
  onAmountRef.current = onAmount
  useEffect(() => {
    if (!running) return
    let last = performance.now()
    let acc = 0
    const id = setInterval(() => {
      const t = performance.now()
      acc += (t - last) / 1000
      last = t
      const whole = Math.floor(acc)
      if (whole >= 1) {
        acc -= whole
        setSecs((s) => s + whole)
        onAmountRef.current(whole)
      }
    }, 250)
    return () => clearInterval(id)
  }, [running])
  return (
    <div className="stack" style={{ alignItems: 'center' }}>
      <div className="display glow" style={{ fontSize: 72, fontWeight: 900, fontVariantNumeric: 'tabular-nums' }}>
        {formatClock(secs)}
      </div>
      <button className={`btn block ${running ? 'ghost' : ''}`} onClick={() => setRunning((r) => !r)}>
        {running ? 'Pause' : secs ? 'Resume' : 'Start timer'}
      </button>
    </div>
  )
}
