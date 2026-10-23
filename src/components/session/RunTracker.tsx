import { useEffect, useRef, useState } from 'react'
import { sfx } from '../../audio/sfx'
import { createDistanceTracker } from '../../detection/geo'
import { formatAmount } from '../../game/data'
import { formatClock } from '../../game/date'
import { Segmented } from '../ui'

interface WakeLockSentinelLike {
  release(): Promise<void>
}

/** GPS run tracker with a manual fallback for treadmills. */
export function RunTracker({ onAmount, target }: { onAmount: (meters: number) => void; target?: number }) {
  const [mode, setMode] = useState<'gps' | 'manual'>('gps')
  return (
    <div className="stack">
      <Segmented
        value={mode}
        onChange={setMode}
        options={[
          { value: 'gps', label: 'GPS' },
          { value: 'manual', label: 'Treadmill / manual' },
        ]}
      />
      {mode === 'gps' ? <Gps onAmount={onAmount} target={target} /> : <ManualDistance onAmount={onAmount} />}
    </div>
  )
}

function Gps({ onAmount, target }: { onAmount: (m: number) => void; target?: number }) {
  const [running, setRunning] = useState(false)
  const [meters, setMeters] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const [accuracy, setAccuracy] = useState<number | null>(null)
  const [error, setError] = useState('')
  const tracker = useRef(createDistanceTracker())
  const logged = useRef(0)
  const onAmountRef = useRef(onAmount)
  onAmountRef.current = onAmount

  useEffect(() => {
    if (!running) return
    if (!('geolocation' in navigator)) {
      setError('GPS is not available on this device.')
      setRunning(false)
      return
    }
    let wake: WakeLockSentinelLike | null = null
    const nav = navigator as Navigator & { wakeLock?: { request(type: 'screen'): Promise<WakeLockSentinelLike> } }
    nav.wakeLock?.request('screen').then((w) => (wake = w)).catch(() => undefined)

    const startedAt = Date.now() - elapsed * 1000
    const timer = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 500)
    const watch = navigator.geolocation.watchPosition(
      (pos) => {
        setAccuracy(Math.round(pos.coords.accuracy))
        const m = tracker.current.push({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          t: pos.timestamp,
        })
        setMeters(m)
        // Log in 25 m chunks so the daily quest fills while you run.
        const pending = m - logged.current
        if (pending >= 25) {
          logged.current = m
          onAmountRef.current(Math.round(pending))
          if (Math.floor(m / 1000) > Math.floor((m - pending) / 1000)) sfx.system()
        }
      },
      (err) => setError(err.code === err.PERMISSION_DENIED ? 'Location permission denied.' : err.message),
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 20000 },
    )
    return () => {
      clearInterval(timer)
      navigator.geolocation.clearWatch(watch)
      void wake?.release()
      const pending = tracker.current.meters - logged.current
      if (pending >= 1) {
        logged.current = tracker.current.meters
        onAmountRef.current(Math.round(pending))
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running])

  const pace = meters > 50 ? elapsed / (meters / 1000) : 0

  return (
    <div className="stack">
      <div className="grid-3 center">
        <div>
          <div className="display glow" style={{ fontSize: 30, fontWeight: 900 }}>
            {(meters / 1000).toFixed(2)}
          </div>
          <div className="small muted caps">km</div>
        </div>
        <div>
          <div className="display glow" style={{ fontSize: 30, fontWeight: 900, fontVariantNumeric: 'tabular-nums' }}>
            {formatClock(elapsed)}
          </div>
          <div className="small muted caps">Time</div>
        </div>
        <div>
          <div className="display glow" style={{ fontSize: 30, fontWeight: 900 }}>
            {pace ? formatClock(pace) : '--:--'}
          </div>
          <div className="small muted caps">/km</div>
        </div>
      </div>
      {target !== undefined && target > 0 && (
        <div className="small muted center">Quest remaining: {formatAmount('run', Math.max(0, target - meters))}</div>
      )}
      <div className="small dim center">
        {accuracy !== null ? `GPS accuracy ±${accuracy} m` : 'Keep the screen on. Distance is filtered for GPS noise.'}
      </div>
      {error && <div className="small warn-text center">{error}</div>}
      <button className={`btn block ${running ? 'red' : ''}`} onClick={() => setRunning((r) => !r)}>
        {running ? 'Pause run' : meters ? 'Resume run' : 'Start run'}
      </button>
    </div>
  )
}

function ManualDistance({ onAmount }: { onAmount: (m: number) => void }) {
  const [km, setKm] = useState('')
  const value = parseFloat(km)
  const valid = value > 0 && value <= 100
  return (
    <form
      className="stack"
      onSubmit={(e) => {
        e.preventDefault()
        if (!valid) return
        onAmount(Math.round(value * 1000))
        sfx.questComplete()
        setKm('')
      }}
    >
      <div className="field">
        <label htmlFor="km">Distance (km)</label>
        <input
          id="km"
          className="input"
          type="number"
          inputMode="decimal"
          step="0.01"
          min="0"
          value={km}
          onChange={(e) => setKm(e.target.value)}
          placeholder="2.5"
        />
      </div>
      <button className="btn block" type="submit" disabled={!valid}>
        Log distance
      </button>
    </form>
  )
}
