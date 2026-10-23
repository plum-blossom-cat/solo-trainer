import { motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { sfx } from '../../audio/sfx'
import { formatClock } from '../../game/date'

const CYCLE = [
  { label: 'Inhale', secs: 4, scale: 1.25 },
  { label: 'Hold', secs: 4, scale: 1.25 },
  { label: 'Exhale', secs: 6, scale: 0.8 },
]

/** Box-breathing guide that trains INT. */
export function MeditationPanel({ onAmount }: { onAmount: (secs: number) => void }) {
  const [running, setRunning] = useState(false)
  const [secs, setSecs] = useState(0)
  const onAmountRef = useRef(onAmount)
  onAmountRef.current = onAmount

  useEffect(() => {
    if (!running) return
    let pending = 0
    const id = setInterval(() => {
      setSecs((s) => s + 1)
      pending++
      if (pending >= 5) {
        onAmountRef.current(pending)
        pending = 0
      }
    }, 1000)
    return () => {
      clearInterval(id)
      if (pending) onAmountRef.current(pending)
    }
  }, [running])

  const total = CYCLE.reduce((s, c) => s + c.secs, 0)
  let t = secs % total
  let stage = CYCLE[0]
  for (const c of CYCLE) {
    if (t < c.secs) {
      stage = c
      break
    }
    t -= c.secs
  }

  useEffect(() => {
    if (running && t === 0) sfx.click()
  }, [running, t])

  return (
    <div className="stack" style={{ alignItems: 'center' }}>
      <div style={{ position: 'relative', width: 220, height: 220, display: 'grid', placeItems: 'center' }}>
        <motion.div
          animate={{ scale: running ? stage.scale : 1 }}
          transition={{ duration: running ? stage.secs : 0.5, ease: 'easeInOut' }}
          style={{
            position: 'absolute',
            width: 150,
            height: 150,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(96,165,250,0.5), rgba(37,99,235,0.15) 60%, transparent 72%)',
            boxShadow: '0 0 40px rgba(59,130,246,0.6), inset 0 0 30px rgba(147,197,253,0.4)',
            border: '1px solid var(--line)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            border: '1px dashed rgba(125,190,255,0.35)',
            animation: 'spin 24s linear infinite',
          }}
        />
        <div className="center" style={{ position: 'relative' }}>
          <div className="caps glow">{running ? stage.label : 'Ready'}</div>
          <div className="display" style={{ fontSize: 30, fontVariantNumeric: 'tabular-nums' }}>
            {formatClock(secs)}
          </div>
        </div>
      </div>
      <div className="small muted center">Circulate your mana. Every 10 minutes of meditation grants +1 INT.</div>
      <button className={`btn block ${running ? 'ghost' : ''}`} onClick={() => setRunning((r) => !r)}>
        {running ? 'Pause' : secs ? 'Resume' : 'Begin meditation'}
      </button>
    </div>
  )
}
