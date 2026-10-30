import { useRef, useState } from 'react'
import { SystemWindow, Toggle } from '../components/ui'
import { DAILY_PRESETS, formatAmount } from '../game/data'
import { dailyTargets } from '../game/engine'
import { usePlayer, useStore } from '../game/store'
import type { DailyTargets, Difficulty } from '../game/types'

const DIFFS: { value: Difficulty; label: string }[] = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'normal', label: 'Normal' },
  { value: 'hunter', label: 'Hunter' },
  { value: 'custom', label: 'Custom' },
]

export function Settings() {
  const data = usePlayer()
  const updateSettings = useStore((s) => s.updateSettings)
  const updateQuestConfig = useStore((s) => s.updateQuestConfig)
  const importSave = useStore((s) => s.importSave)
  const resetAll = useStore((s) => s.resetAll)
  const notify = useStore((s) => s.notify)
  const navigate = useStore((s) => s.navigate)
  const [name, setName] = useState(data.name)
  const [confirmReset, setConfirmReset] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const targets = dailyTargets(data)

  const toggles: { key: 'sound' | 'voice' | 'showSkeleton' | 'reduceMotion'; label: string; hint: string }[] = [
    { key: 'sound', label: 'Sound effects', hint: 'System chimes, hits and level-up fanfare' },
    { key: 'voice', label: 'System voice', hint: 'Spoken announcements via speech synthesis' },
    { key: 'showSkeleton', label: 'Show pose skeleton', hint: 'Draw tracked joints over the camera feed' },
    { key: 'reduceMotion', label: 'Reduce motion', hint: 'Fewer particles and animations' },
  ]

  const setCustom = (k: keyof DailyTargets, v: string) => {
    const n = Math.max(0, Math.min(k === 'run' ? 50000 : 1000, Math.round(Number(v) || 0)))
    const next = { ...data.customTargets, [k]: n }
    if (Object.values(next).every((x) => x === 0)) {
      notify({ title: 'The Daily Quest needs at least one exercise', tone: 'warn' })
      return
    }
    updateQuestConfig({ customTargets: next })
  }

  const toggleRestDay = (d: number) => {
    const on = data.settings.restDays.includes(d)
    if (!on && data.settings.restDays.length >= 3) {
      notify({ title: 'At most 3 rest days per week', tone: 'warn' })
      return
    }
    updateSettings({ restDays: on ? data.settings.restDays.filter((x) => x !== d) : [...data.settings.restDays, d].sort() })
  }

  const setReminder = async (enabled: boolean) => {
    if (enabled && 'Notification' in window && Notification.permission === 'default') {
      try {
        await Notification.requestPermission()
      } catch {
        // Permission prompts can be blocked; the in-app reminder still works.
      }
    }
    updateSettings({ reminderEnabled: enabled })
  }

  const notificationsBlocked = 'Notification' in window && Notification.permission === 'denied'

  const exportSave = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `solo-trainer-${data.name.replace(/\W+/g, '_')}-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <>
      {data.penalty.active && (
        <button className="btn red block" style={{ marginTop: 12 }} onClick={() => navigate('status')}>
          Return to the Penalty Zone
        </button>
      )}

      <SystemWindow title="Player" bang={false}>
        <form
          className="row"
          onSubmit={(e) => {
            e.preventDefault()
            if (name.trim()) {
              updateQuestConfig({ name: name.trim() })
              notify({ title: 'Name updated', tone: 'system' })
            }
          }}
        >
          <input className="input" value={name} maxLength={24} onChange={(e) => setName(e.target.value)} aria-label="Player name" />
          <button className="btn small" type="submit" disabled={!name.trim() || name.trim() === data.name}>
            Save
          </button>
        </form>
      </SystemWindow>

      <SystemWindow title="Daily Quest" bang={false}>
        <div className="seg" style={{ marginBottom: 12 }}>
          {DIFFS.map((d) => (
            <button key={d.value} className={data.difficulty === d.value ? 'on' : ''} onClick={() => updateQuestConfig({ difficulty: d.value })}>
              {d.label}
            </button>
          ))}
        </div>
        {data.difficulty === 'custom' ? (
          <div className="grid-2">
            {(['pushup', 'situp', 'squat', 'run'] as (keyof DailyTargets)[]).map((k) => (
              <div className="field" key={k}>
                <label htmlFor={`c-${k}`}>{k === 'run' ? 'Run (meters)' : k === 'pushup' ? 'Push-ups' : k === 'situp' ? 'Sit-ups' : 'Squats'}</label>
                <input
                  id={`c-${k}`}
                  className="input"
                  type="number"
                  inputMode="numeric"
                  defaultValue={data.customTargets[k]}
                  onBlur={(e) => setCustom(k, e.target.value)}
                />
              </div>
            ))}
          </div>
        ) : (
          <p className="small muted" style={{ margin: 0 }}>
            {DAILY_PRESETS[data.difficulty].blurb}.
          </p>
        )}
        <div className="row between" style={{ marginTop: 14 }}>
          <div>
            <div style={{ fontWeight: 600 }}>Scale with level</div>
            <div className="small muted">+10% targets every 10 levels (max ×2)</div>
          </div>
          <Toggle label="Scale with level" on={data.scaleWithLevel} onChange={(v) => updateQuestConfig({ scaleWithLevel: v })} />
        </div>
        <div className="small" style={{ marginTop: 12, color: 'var(--cyan)' }}>
          Current:{' '}
          {[
            targets.pushup && `${targets.pushup} push-ups`,
            targets.situp && `${targets.situp} sit-ups`,
            targets.squat && `${targets.squat} squats`,
            targets.run && formatAmount('run', targets.run),
          ]
            .filter(Boolean)
            .join(' · ')}
        </div>
        <div className="small dim" style={{ marginTop: 4 }}>
          Changes apply to today's quest immediately. In Custom, set a target to 0 to drop that exercise.
        </div>

        <div className="divider" />
        <div style={{ fontWeight: 600 }}>Rest days</div>
        <div className="small muted" style={{ marginBottom: 8 }}>
          No mandatory quest and no penalty on these days. Streaks carry over them.
        </div>
        <div className="seg">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((label, d) => (
            <button
              key={d}
              className={data.settings.restDays.includes(d) ? 'on' : ''}
              aria-pressed={data.settings.restDays.includes(d)}
              aria-label={['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][d]}
              onClick={() => toggleRestDay(d)}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="divider" />
        <div className="row between">
          <div>
            <div style={{ fontWeight: 600 }}>Daily reminder</div>
            <div className="small muted">A System notice if today's quest is still open</div>
          </div>
          <Toggle label="Daily reminder" on={data.settings.reminderEnabled} onChange={(v) => void setReminder(v)} />
        </div>
        {data.settings.reminderEnabled && (
          <div className="row" style={{ marginTop: 10 }}>
            <label htmlFor="reminder-time" className="small muted caps">
              Time
            </label>
            <input
              id="reminder-time"
              type="time"
              className="input"
              style={{ maxWidth: 140 }}
              value={data.settings.reminderTime}
              onChange={(e) => e.target.value && updateSettings({ reminderTime: e.target.value })}
            />
          </div>
        )}
        {data.settings.reminderEnabled && (
          <div className="small dim" style={{ marginTop: 6 }}>
            {notificationsBlocked
              ? 'Notifications are blocked in your browser, so the reminder appears inside the app only.'
              : 'Shown while the app is open or running in the background. Install the app for the most reliable reminders.'}
          </div>
        )}
      </SystemWindow>

      <SystemWindow title="System" bang={false}>
        <div className="stack" style={{ gap: 14 }}>
          {toggles.map((t) => (
            <div key={t.key} className="row between">
              <div>
                <div style={{ fontWeight: 600 }}>{t.label}</div>
                <div className="small muted">{t.hint}</div>
              </div>
              <Toggle label={t.label} on={data.settings[t.key]} onChange={(v) => updateSettings({ [t.key]: v })} />
            </div>
          ))}
        </div>
      </SystemWindow>

      <SystemWindow title="Save Data" bang={false}>
        <p className="small muted" style={{ marginTop: 0 }}>
          Progress is stored on this device only. Export a backup to move it to another device.
        </p>
        <div className="grid-2">
          <button className="btn ghost" onClick={exportSave}>
            Export
          </button>
          <button className="btn ghost" onClick={() => fileRef.current?.click()}>
            Import
          </button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={async (e) => {
            const f = e.target.files?.[0]
            if (!f) return
            const ok = importSave(await f.text())
            notify(ok ? { title: 'Save data restored', tone: 'reward' } : { title: 'Invalid save file', tone: 'warn' })
            e.target.value = ''
          }}
        />
        <div className="divider" />
        {confirmReset ? (
          <div className="stack">
            <div className="warn-text center">This erases your hunter permanently. Are you sure?</div>
            <div className="grid-2">
              <button className="btn ghost" onClick={() => setConfirmReset(false)}>
                Cancel
              </button>
              <button className="btn red" onClick={resetAll}>
                Erase
              </button>
            </div>
          </div>
        ) : (
          <button className="btn red block" onClick={() => setConfirmReset(true)}>
            Reset player
          </button>
        )}
      </SystemWindow>

      <p className="center dim small">
        Solo Trainer is a fan-made training app inspired by Solo Leveling. Train safely and within your limits.
      </p>
    </>
  )
}
