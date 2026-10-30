import { useState } from 'react'
import { SystemWindow } from '../components/ui'
import { EXERCISES, formatAmount } from '../game/data'
import { dayKey, parseDayKey } from '../game/date'
import { bmi, currentWeight, kcalFor, personalRecords } from '../game/engine'
import { usePlayer, useStore } from '../game/store'
import type { ActivityEntry } from '../game/types'

const fmtDate = (key: string) => parseDayKey(key).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
const fmtTime = (t: number) => new Date(t).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })

export function PersonalRecordsPanel() {
  const data = usePlayer()
  const prs = personalRecords(data)
  return (
    <SystemWindow title="Personal Records" bang={false}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
        <thead>
          <tr className="muted caps" style={{ fontSize: 11 }}>
            <th style={{ textAlign: 'left', padding: 4 }}>Exercise</th>
            <th style={{ textAlign: 'right', padding: 4 }}>Best session</th>
            <th style={{ textAlign: 'right', padding: 4 }}>Best day</th>
          </tr>
        </thead>
        <tbody>
          {prs.map((p) => (
            <tr key={p.exercise} style={{ borderTop: '1px solid var(--line-soft)' }}>
              <td style={{ padding: 4 }}>{EXERCISES[p.exercise].name}</td>
              <td style={{ textAlign: 'right', padding: 4 }} title={p.bestSession ? fmtDate(p.bestSession.date) : undefined}>
                {p.bestSession ? formatAmount(p.exercise, p.bestSession.amount) : '—'}
              </td>
              <td style={{ textAlign: 'right', padding: 4 }} title={p.bestDay ? fmtDate(p.bestDay.date) : undefined}>
                {p.bestDay ? formatAmount(p.exercise, p.bestDay.amount) : '—'}
              </td>
            </tr>
          ))}
          <tr style={{ borderTop: '1px solid var(--line-soft)' }}>
            <td style={{ padding: 4 }}>Daily Quest streak</td>
            <td style={{ textAlign: 'right', padding: 4 }}>{data.streak.current} now</td>
            <td style={{ textAlign: 'right', padding: 4 }}>{data.streak.best} best</td>
          </tr>
        </tbody>
      </table>
    </SystemWindow>
  )
}

/** Workout sessions grouped by day, each removable to correct mistakes. */
export function HistoryPanel() {
  const data = usePlayer()
  const deleteSession = useStore((s) => s.deleteSession)
  const [confirm, setConfirm] = useState<string | null>(null)
  const [limit, setLimit] = useState(40)
  const kg = currentWeight(data) ?? 70
  const entries = [...data.history].reverse().slice(0, limit)
  const groups: { day: string; items: ActivityEntry[] }[] = []
  for (const e of entries) {
    const day = dayKey(e.start)
    const g = groups[groups.length - 1]
    if (g && g.day === day) g.items.push(e)
    else groups.push({ day, items: [e] })
  }

  return (
    <SystemWindow title="Workout History" bang={false}>
      {groups.length === 0 ? (
        <p className="center muted" style={{ margin: 0 }}>
          No sessions yet. Everything you train is logged here, and you can remove a session if it was recorded by mistake.
        </p>
      ) : (
        <div className="stack" style={{ gap: 14 }}>
          {groups.map((g) => (
            <div key={g.day}>
              <div className="caps small muted" style={{ marginBottom: 6 }}>
                {g.day === dayKey() ? 'Today' : fmtDate(g.day)}
              </div>
              {g.items.map((e) => (
                <div key={e.id} className="list-item" style={{ padding: '8px 10px' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600 }}>
                      {EXERCISES[e.exercise].name} · {formatAmount(e.exercise, e.amount)}
                    </div>
                    <div className="small muted">
                      {fmtTime(e.start)}
                      {e.end - e.start > 60_000 ? `–${fmtTime(e.end)}` : ''} · ~{Math.round(kcalFor(e.exercise, e.amount, kg))} kcal
                    </div>
                  </div>
                  {confirm === e.id ? (
                    <span className="row" style={{ gap: 6 }}>
                      <button className="btn small ghost" onClick={() => setConfirm(null)}>
                        Keep
                      </button>
                      <button
                        className="btn small red"
                        onClick={() => {
                          deleteSession(e.id)
                          setConfirm(null)
                        }}
                      >
                        Remove
                      </button>
                    </span>
                  ) : (
                    <button className="btn small ghost" aria-label={`Remove ${EXERCISES[e.exercise].name} session`} onClick={() => setConfirm(e.id)}>
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
          ))}
          {data.history.length > limit && (
            <button className="btn ghost small" onClick={() => setLimit((l) => l + 40)}>
              Show more
            </button>
          )}
          <p className="small dim center" style={{ margin: 0 }}>
            Removing a session takes back its reps and base XP. Levels and stats already earned are kept.
          </p>
        </div>
      )}
    </SystemWindow>
  )
}

function WeightChart({ weights }: { weights: { date: string; kg: number }[] }) {
  const [hover, setHover] = useState<number | null>(null)
  const pts = weights.slice(-60)
  if (pts.length < 2) return null
  const W = 340
  const H = 150
  const pad = { l: 34, r: 30, t: 12, b: 20 }
  const min = Math.floor(Math.min(...pts.map((p) => p.kg)) - 1)
  const max = Math.ceil(Math.max(...pts.map((p) => p.kg)) + 1)
  const t0 = parseDayKey(pts[0].date).getTime()
  const t1 = parseDayKey(pts[pts.length - 1].date).getTime()
  const x = (d: string) => pad.l + ((parseDayKey(d).getTime() - t0) / Math.max(1, t1 - t0)) * (W - pad.l - pad.r)
  const y = (kg: number) => pad.t + (1 - (kg - min) / (max - min)) * (H - pad.t - pad.b)
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${x(p.date).toFixed(1)},${y(p.kg).toFixed(1)}`).join(' ')
  const last = pts[pts.length - 1]
  const shown = hover !== null ? pts[hover] : null
  return (
    <div style={{ position: 'relative' }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Body weight trend">
        {[min, (min + max) / 2, max].map((v) => (
          <g key={v}>
            <line x1={pad.l} x2={W - pad.r} y1={y(v)} y2={y(v)} stroke="rgba(125,190,255,0.12)" />
            <text x={pad.l - 6} y={y(v) + 4} textAnchor="end" fontSize="11" fill="#8aa4c8">
              {v.toFixed(0)}
            </text>
          </g>
        ))}
        <path d={line} fill="none" stroke="#60a5fa" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        <circle cx={x(last.date)} cy={y(last.kg)} r="4" fill="#60a5fa" stroke="#050b1a" strokeWidth="2" />
        <text x={x(last.date) + 6} y={y(last.kg) - 8} fontSize="11" fill="#e6f0ff" textAnchor="end">
          {last.kg} kg
        </text>
        {pts.map((p, i) => (
          <rect
            key={p.date}
            x={x(p.date) - 6}
            y={pad.t}
            width={12}
            height={H - pad.t - pad.b}
            fill="transparent"
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
            onTouchStart={() => setHover(i)}
          />
        ))}
        {shown && <circle cx={x(shown.date)} cy={y(shown.kg)} r="4" fill="#60a5fa" stroke="#050b1a" strokeWidth="2" />}
      </svg>
      <div className="small center" style={{ minHeight: 18 }}>
        {shown ? (
          <>
            <span className="muted">{fmtDate(shown.date)}: </span>
            {shown.kg} kg
          </>
        ) : (
          <span className="dim">Hover or tap the line for details</span>
        )}
      </div>
    </div>
  )
}

export function BodyPanel() {
  const data = usePlayer()
  const logWeight = useStore((s) => s.logWeight)
  const setHeight = useStore((s) => s.setHeight)
  const [kg, setKg] = useState('')
  const [cm, setCm] = useState(data.body.heightCm ? String(data.body.heightCm) : '')
  const weight = currentWeight(data)
  const index = bmi(data)
  const first = data.body.weights[0]
  const change = weight !== null && first ? weight - first.kg : null
  const value = parseFloat(kg)

  return (
    <SystemWindow title="Body" bang={false}>
      <div className="grid-3 center" style={{ marginBottom: 12 }}>
        <div>
          <div className="display glow" style={{ fontSize: 24 }}>
            {weight ?? '—'}
          </div>
          <div className="small muted caps">kg</div>
        </div>
        <div>
          <div className="display glow" style={{ fontSize: 24 }}>
            {change === null ? '—' : `${change > 0 ? '+' : ''}${change.toFixed(1)}`}
          </div>
          <div className="small muted caps">Change</div>
        </div>
        <div>
          <div className="display glow" style={{ fontSize: 24 }}>
            {index ? index.toFixed(1) : '—'}
          </div>
          <div className="small muted caps">BMI</div>
        </div>
      </div>

      <WeightChart weights={data.body.weights} />

      <form
        className="row"
        style={{ marginTop: 10, alignItems: 'flex-end' }}
        onSubmit={(e) => {
          e.preventDefault()
          if (value >= 20 && value <= 400) {
            logWeight(value)
            setKg('')
          }
        }}
      >
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor="weight">Today's weight (kg)</label>
          <input id="weight" className="input" type="number" inputMode="decimal" step="0.1" value={kg} onChange={(e) => setKg(e.target.value)} placeholder={weight ? String(weight) : '70.0'} />
        </div>
        <button className="btn" type="submit" disabled={!(value >= 20 && value <= 400)}>
          Log
        </button>
      </form>

      <form
        className="row"
        style={{ marginTop: 10, alignItems: 'flex-end' }}
        onSubmit={(e) => {
          e.preventDefault()
          setHeight(parseFloat(cm) || null)
        }}
      >
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor="height">Height (cm)</label>
          <input id="height" className="input" type="number" inputMode="numeric" value={cm} onChange={(e) => setCm(e.target.value)} placeholder="175" />
        </div>
        <button className="btn ghost" type="submit">
          Save
        </button>
      </form>
      <p className="small dim" style={{ marginBottom: 0 }}>
        Your weight makes the calorie estimates more accurate. Logging twice on one day replaces that day's entry.
      </p>
    </SystemWindow>
  )
}
