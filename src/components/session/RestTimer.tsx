import { useEffect, useRef, useState } from 'react'
import { sfx, speak } from '../../audio/sfx'
import { formatClock } from '../../game/date'

const PRESETS = [30, 60, 90, 120]

/** Countdown between sets, with a chime when rest is over. */
export function RestTimer() {
  const [endsAt, setEndsAt] = useState<number | null>(null)
  const [left, setLeft] = useState(0)
  const total = useRef(0)

  useEffect(() => {
    if (endsAt === null) return
    const id = setInterval(() => {
      const s = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000))
      setLeft(s)
      if (s === 0) {
        clearInterval(id)
        setEndsAt(null)
        sfx.questComplete()
        speak('Rest complete. Next set.')
        if ('vibrate' in navigator) navigator.vibrate?.([200, 100, 200])
      }
    }, 250)
    return () => clearInterval(id)
  }, [endsAt])

  const start = (secs: number) => {
    total.current = secs
    setLeft(secs)
    setEndsAt(Date.now() + secs * 1000)
  }

  return (
    <div className="stack" style={{ gap: 8 }}>
      <div className="row between">
        <span className="caps small muted">Rest between sets</span>
        {endsAt !== null && (
          <span className="display glow" style={{ fontSize: 22, fontVariantNumeric: 'tabular-nums' }} aria-live="polite">
            {formatClock(left)}
          </span>
        )}
      </div>
      {endsAt !== null ? (
        <>
          <div className="bar">
            <div className="fill" style={{ width: `${(left / Math.max(1, total.current)) * 100}%`, transition: 'width 0.25s linear' }} />
          </div>
          <div className="grid-2">
            <button className="btn ghost small" onClick={() => setEndsAt((e) => (e ?? Date.now()) + 15_000)}>
              +15s
            </button>
            <button className="btn ghost small" onClick={() => setEndsAt(null)}>
              Skip
            </button>
          </div>
        </>
      ) : (
        <div className="grid-3" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
          {PRESETS.map((s) => (
            <button key={s} className="btn ghost small" onClick={() => start(s)}>
              {s < 60 ? `${s}s` : `${Math.floor(s / 60)}m${s % 60 ? ` ${s % 60}s` : ''}`}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
