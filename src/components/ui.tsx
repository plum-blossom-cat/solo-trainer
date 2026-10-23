import { motion } from 'framer-motion'
import { useEffect, useState, type CSSProperties, type ReactNode } from 'react'

type Tone = 'blue' | 'red' | 'purple' | 'gold'

export function SystemWindow({
  title,
  tone = 'blue',
  children,
  className = '',
  bang = true,
  delay = 0,
  style,
}: {
  title?: ReactNode
  tone?: Tone
  children: ReactNode
  className?: string
  bang?: boolean
  delay?: number
  style?: CSSProperties
}) {
  return (
    <motion.section
      className={`sys ${tone === 'blue' ? '' : tone} ${className}`}
      style={style}
      initial={{ opacity: 0, scaleY: 0.02, scaleX: 0.6 }}
      animate={{ opacity: 1, scaleY: 1, scaleX: 1 }}
      transition={{ duration: 0.45, delay, ease: [0.2, 0.9, 0.2, 1] }}
    >
      <span className="corner tl" />
      <span className="corner tr" />
      <span className="corner bl" />
      <span className="corner br" />
      {title && (
        <div className="sys-head">
          <span className="label">
            {bang && <span className="bang">!</span>}
            {title}
          </span>
        </div>
      )}
      <div style={{ position: 'relative' }}>{children}</div>
    </motion.section>
  )
}

export function Bar({
  value,
  max,
  kind = '',
  thick = false,
  label,
  right,
}: {
  value: number
  max: number
  kind?: '' | 'hp' | 'mp' | 'fatigue' | 'gold' | 'done'
  thick?: boolean
  label?: ReactNode
  right?: ReactNode
}) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0
  return (
    <div>
      {(label || right) && (
        <div className="row between small" style={{ marginBottom: 4 }}>
          <span className="caps" style={{ letterSpacing: '0.12em' }}>
            {label}
          </span>
          <span className="muted">{right}</span>
        </div>
      )}
      <div className={`bar ${kind} ${thick ? 'thick' : ''}`}>
        <div className="fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

/** Text that types itself out like a System message. */
export function TypeText({ text, speed = 28, onDone }: { text: string; speed?: number; onDone?: () => void }) {
  const [n, setN] = useState(0)
  useEffect(() => {
    setN(0)
    const id = setInterval(() => {
      setN((v) => {
        if (v >= text.length) {
          clearInterval(id)
          onDone?.()
          return v
        }
        return v + 1
      })
    }, speed)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, speed])
  return (
    <span>
      {text.slice(0, n)}
      <span className="flicker" style={{ opacity: n < text.length ? 1 : 0 }}>
        ▌
      </span>
    </span>
  )
}

export function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      className={`toggle ${on ? 'on' : ''}`}
      onClick={() => onChange(!on)}
    />
  )
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
}) {
  return (
    <div className="seg" role="tablist">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={o.value === value}
          className={o.value === value ? 'on' : ''}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function RankBadge({ rank, color, size = 42 }: { rank: string; color: string; size?: number }) {
  return (
    <span
      className="rank-badge"
      style={{ color, minWidth: size, height: size, fontSize: rank.length > 1 ? size * 0.28 : size * 0.48 }}
    >
      {rank}
    </span>
  )
}

/** Animated count-up number. */
export function CountUp({ value, duration = 600 }: { value: number; duration?: number }) {
  const [shown, setShown] = useState(value)
  useEffect(() => {
    const from = shown
    const start = performance.now()
    let raf = 0
    const step = (t: number) => {
      const k = Math.min(1, (t - start) / duration)
      setShown(Math.round(from + (value - from) * (1 - Math.pow(1 - k, 3))))
      if (k < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])
  return <>{shown.toLocaleString()}</>
}
