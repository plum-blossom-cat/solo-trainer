import { useMemo, useState } from 'react'
import { Segmented, SystemWindow } from '../components/ui'
import { formatAmount } from '../game/data'
import { addDays, dayKey, parseDayKey } from '../game/date'
import { emptyLog, lifetimeTotals } from '../game/engine'
import { usePlayer } from '../game/store'
import type { DayLog } from '../game/types'

type Metric = 'xp' | 'pushup' | 'situp' | 'squat' | 'run'

const METRICS: { value: Metric; label: string }[] = [
  { value: 'xp', label: 'XP' },
  { value: 'pushup', label: 'Push' },
  { value: 'situp', label: 'Sit' },
  { value: 'squat', label: 'Squat' },
  { value: 'run', label: 'Run' },
]

/** Ordinal ramp, validated against the app surface (#050b1a). */
const HEAT = ['#1d4ed8', '#3b82f6', '#7cb6fb', '#c7e6fe']
const BAR_COLOR = '#60a5fa'

function niceMax(v: number) {
  if (v <= 0) return 10
  const p = Math.pow(10, Math.floor(Math.log10(v)))
  const n = v / p
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p
}

function compact(v: number) {
  return v >= 1000 ? `${(v / 1000).toFixed(v % 1000 === 0 ? 0 : 1)}K` : `${Math.round(v)}`
}

function metricValue(l: DayLog, m: Metric) {
  return m === 'run' ? l.run / 1000 : l[m]
}

function formatMetric(v: number, m: Metric) {
  return m === 'run' ? `${v.toFixed(2)} km` : m === 'xp' ? `${Math.round(v).toLocaleString()} XP` : `${Math.round(v)}`
}

function BarChart({ days, metric }: { days: DayLog[]; metric: Metric }) {
  const [hover, setHover] = useState<number | null>(null)
  const W = 340
  const H = 190
  const pad = { l: 34, r: 4, t: 16, b: 22 }
  const values = days.map((d) => metricValue(d, metric))
  const max = niceMax(Math.max(...values))
  const band = (W - pad.l - pad.r) / days.length
  const bw = Math.min(24, band - 2)
  const y = (v: number) => pad.t + (H - pad.t - pad.b) * (1 - v / max)
  const ticks = [0, max / 2, max]
  const peak = values.indexOf(Math.max(...values))

  return (
    <div style={{ position: 'relative' }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={`Daily ${metric} for the last ${days.length} days`}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke="rgba(125,190,255,0.12)" strokeWidth="1" />
            <text x={pad.l - 6} y={y(t) + 4} textAnchor="end" fontSize="11" fill="#8aa4c8">
              {metric === 'run' ? t.toFixed(t < 10 ? 1 : 0) : compact(t)}
            </text>
          </g>
        ))}
        {days.map((d, i) => {
          const v = values[i]
          const x = pad.l + band * i + (band - bw) / 2
          const top = y(v)
          const h = Math.max(0, y(0) - top)
          const r = Math.min(4, h)
          const label = parseDayKey(d.date)
          return (
            <g key={d.date}>
              {h > 0 && (
                <path
                  d={`M${x},${y(0)} V${top + r} Q${x},${top} ${x + r},${top} H${x + bw - r} Q${x + bw},${top} ${x + bw},${top + r} V${y(0)} Z`}
                  fill={BAR_COLOR}
                  opacity={hover === null || hover === i ? 1 : 0.45}
                />
              )}
              {i === peak && v > 0 && (
                <text x={x + bw / 2} y={top - 5} textAnchor="middle" fontSize="11" fill="#e6f0ff" fontWeight="600">
                  {metric === 'run' ? v.toFixed(1) : compact(v)}
                </text>
              )}
              {(i % 2 === days.length % 2 || days.length <= 7) && (
                <text x={x + bw / 2} y={H - 8} textAnchor="middle" fontSize="10" fill="#8aa4c8">
                  {label.getDate()}
                </text>
              )}
              <rect
                x={pad.l + band * i}
                y={pad.t}
                width={band}
                height={H - pad.t - pad.b}
                fill="transparent"
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
                onTouchStart={() => setHover(i)}
              />
            </g>
          )
        })}
        <line x1={pad.l} x2={W - pad.r} y1={y(0)} y2={y(0)} stroke="rgba(125,190,255,0.3)" strokeWidth="1" />
      </svg>
      {hover !== null && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: `${((pad.l + band * hover + band / 2) / W) * 100}%`,
            transform: `translateX(${hover > days.length / 2 ? '-100%' : '0'})`,
            padding: '6px 10px',
            background: 'rgba(3,10,25,0.96)',
            border: '1px solid var(--line)',
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
          }}
          className="small"
        >
          <div className="muted">{parseDayKey(days[hover].date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</div>
          <div style={{ fontWeight: 700 }}>{formatMetric(values[hover], metric)}</div>
          {days[hover].dailyComplete && <div style={{ color: 'var(--green)' }}>✓ Daily quest cleared</div>}
        </div>
      )}
    </div>
  )
}

function Heatmap({ logs }: { logs: Record<string, DayLog> }) {
  const [hover, setHover] = useState<DayLog | null>(null)
  const weeks = 12
  const today = parseDayKey(dayKey())
  // Start on the Sunday `weeks` weeks ago so columns are calendar weeks.
  const start = addDays(dayKey(today), -(weeks - 1) * 7 - today.getDay())
  const cells: DayLog[] = []
  for (let i = 0; i < weeks * 7; i++) {
    const k = addDays(start, i)
    cells.push(logs[k] ?? emptyLog(k))
  }
  const reps = (l: DayLog) => l.pushup + l.situp + l.squat + l.jumpingJack + l.run / 100 + l.plank / 10
  const max = Math.max(1, ...cells.map(reps))
  const level = (l: DayLog) => {
    const r = reps(l)
    if (r <= 0) return -1
    return Math.min(3, Math.floor((r / max) * 4))
  }
  const todayKey = dayKey()
  const size = 14
  const gap = 2

  return (
    <div>
      <div>
        <svg
          viewBox={`0 0 ${weeks * (size + gap)} ${7 * (size + gap)}`}
          width="100%"
          role="img"
          aria-label="Training activity for the last 12 weeks"
          style={{ display: 'block', maxWidth: 420, margin: '0 auto' }}
        >
          {cells.map((c, i) => {
            const col = Math.floor(i / 7)
            const row = i % 7
            const lv = level(c)
            const future = c.date > todayKey
            return (
              <g key={c.date} onMouseEnter={() => setHover(c)} onMouseLeave={() => setHover(null)} onTouchStart={() => setHover(c)}>
                <rect
                  x={col * (size + gap)}
                  y={row * (size + gap)}
                  width={size}
                  height={size}
                  rx="3"
                  fill={future ? 'transparent' : lv < 0 ? 'rgba(125,190,255,0.08)' : HEAT[lv]}
                  stroke={c.date === todayKey ? '#e0f2fe' : 'none'}
                  strokeWidth="1.5"
                />
                {c.dailyComplete && (
                  <circle cx={col * (size + gap) + size / 2} cy={row * (size + gap) + size / 2} r="2.2" fill="#050b1a" />
                )}
              </g>
            )
          })}
        </svg>
      </div>
      <div className="row between small muted" style={{ marginTop: 8, flexWrap: 'wrap', gap: 8 }}>
        <span className="row" style={{ gap: 4 }}>
          Less
          {HEAT.map((c) => (
            <span key={c} style={{ width: 12, height: 12, borderRadius: 3, background: c, display: 'inline-block' }} />
          ))}
          More
        </span>
        <span className="row" style={{ gap: 6 }}>
          <span style={{ width: 12, height: 12, borderRadius: 3, background: HEAT[2], display: 'inline-grid', placeItems: 'center' }}>
            <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#050b1a' }} />
          </span>
          Daily quest cleared
        </span>
      </div>
      <div className="small center" style={{ minHeight: 20, marginTop: 6 }}>
        {hover ? (
          <>
            <span className="muted">{parseDayKey(hover.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}: </span>
            {hover.pushup} push · {hover.situp} sit · {hover.squat} squat · {hover.jumpingJack} jacks · {formatAmount('run', hover.run)}
          </>
        ) : (
          <span className="dim">Hover or tap a day for details</span>
        )}
      </div>
    </div>
  )
}

export function Records() {
  const data = usePlayer()
  const [metric, setMetric] = useState<Metric>('xp')
  const [view, setView] = useState<'chart' | 'table'>('chart')
  const totals = lifetimeTotals(data)
  const days = useMemo(() => {
    const out: DayLog[] = []
    for (let i = 13; i >= 0; i--) {
      const k = addDays(dayKey(), -i)
      out.push(data.logs[k] ?? emptyLog(k))
    }
    return out
  }, [data.logs])

  const tiles: [string, string][] = [
    ['Push-ups', totals.pushup.toLocaleString()],
    ['Sit-ups', totals.situp.toLocaleString()],
    ['Squats', totals.squat.toLocaleString()],
    ['Jumping jacks', totals.jumpingJack.toLocaleString()],
    ['Plank', formatAmount('plank', totals.plank)],
    ['Distance', formatAmount('run', totals.run)],
    ['Meditation', formatAmount('meditation', totals.meditation)],
    ['Total XP', Math.round(data.totalXp).toLocaleString()],
    ['Dailies cleared', String(totals.dailies)],
    ['Gates cleared', String(totals.gates)],
  ]

  return (
    <>
      <SystemWindow title="Hunter Records" bang={false}>
        <div className="grid-2">
          {tiles.map(([k, v]) => (
            <div key={k} className="list-item" style={{ margin: 0, flexDirection: 'column', alignItems: 'flex-start', gap: 0 }}>
              <span className="display glow" style={{ fontSize: 22, fontWeight: 700 }}>
                {v}
              </span>
              <span className="small muted caps" style={{ fontSize: 11 }}>
                {k}
              </span>
            </div>
          ))}
        </div>
      </SystemWindow>

      <SystemWindow title="Last 14 days" bang={false} delay={0.05}>
        <div className="stack">
          <Segmented value={metric} onChange={setMetric} options={METRICS} />
          <div className="row between">
            <span className="small muted">{METRICS.find((m) => m.value === metric)?.label} per day{metric === 'run' ? ' (km)' : ''}</span>
            <Segmented
              value={view}
              onChange={setView}
              options={[
                { value: 'chart', label: 'Chart' },
                { value: 'table', label: 'Table' },
              ]}
            />
          </div>
          {view === 'chart' ? (
            <BarChart days={days} metric={metric} />
          ) : (
            <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr className="muted caps" style={{ fontSize: 11 }}>
                  <th style={{ textAlign: 'left', padding: 4 }}>Day</th>
                  <th style={{ textAlign: 'right', padding: 4 }}>Push</th>
                  <th style={{ textAlign: 'right', padding: 4 }}>Sit</th>
                  <th style={{ textAlign: 'right', padding: 4 }}>Squat</th>
                  <th style={{ textAlign: 'right', padding: 4 }}>Run</th>
                  <th style={{ textAlign: 'right', padding: 4 }}>XP</th>
                  <th style={{ textAlign: 'center', padding: 4 }}>Daily</th>
                </tr>
              </thead>
              <tbody>
                {[...days].reverse().map((d) => (
                  <tr key={d.date} style={{ borderTop: '1px solid var(--line-soft)' }}>
                    <td style={{ padding: 4 }}>{parseDayKey(d.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</td>
                    <td style={{ textAlign: 'right', padding: 4 }}>{d.pushup}</td>
                    <td style={{ textAlign: 'right', padding: 4 }}>{d.situp}</td>
                    <td style={{ textAlign: 'right', padding: 4 }}>{d.squat}</td>
                    <td style={{ textAlign: 'right', padding: 4 }}>{(d.run / 1000).toFixed(1)}</td>
                    <td style={{ textAlign: 'right', padding: 4 }}>{Math.round(d.xp)}</td>
                    <td style={{ textAlign: 'center', padding: 4, color: d.dailyComplete ? 'var(--green)' : 'var(--dim)' }}>
                      {d.dailyComplete ? '✓' : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}
        </div>
      </SystemWindow>

      <SystemWindow title="Activity" bang={false} delay={0.1}>
        <Heatmap logs={data.logs} />
      </SystemWindow>
    </>
  )
}
