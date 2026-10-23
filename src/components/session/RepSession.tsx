import { useState } from 'react'
import type { CountableExercise } from '../../detection/repCounter'
import { EXERCISES } from '../../game/data'
import { IconCamera, IconHand, IconPhone } from '../icons'
import { CameraCounter } from './CameraCounter'
import { ManualPanel } from './ManualPanel'
import { MotionPanel } from './MotionPanel'

export type InputMode = 'camera' | 'motion' | 'manual'

const LAST_MODE_KEY = 'solo-trainer/input-mode'

function initialMode(): InputMode {
  try {
    const m = localStorage.getItem(LAST_MODE_KEY)
    if (m === 'camera' || m === 'motion' || m === 'manual') return m
  } catch {
    // ignore
  }
  return 'camera'
}

/** Rep/hold input for a countable exercise: camera AI, phone motion or manual. */
export function RepSession({
  exercise,
  onAmount,
  compact = false,
}: {
  exercise: CountableExercise
  onAmount: (delta: number) => void
  compact?: boolean
}) {
  const def = EXERCISES[exercise]
  const [mode, setModeState] = useState<InputMode>(initialMode)
  const setMode = (m: InputMode) => {
    setModeState(m)
    try {
      localStorage.setItem(LAST_MODE_KEY, m)
    } catch {
      // ignore
    }
  }
  const effective: InputMode = mode === 'motion' && !def.motion ? 'camera' : mode

  const modes: { id: InputMode; label: string; icon: JSX.Element; show: boolean }[] = [
    { id: 'camera', label: 'AI Camera', icon: <IconCamera width={18} />, show: def.camera },
    { id: 'motion', label: 'Motion', icon: <IconPhone width={18} />, show: def.motion },
    { id: 'manual', label: def.unit === 'seconds' ? 'Timer' : 'Manual', icon: <IconHand width={18} />, show: true },
  ]

  return (
    <div className="stack">
      <div className="seg">
        {modes
          .filter((m) => m.show)
          .map((m) => (
            <button key={m.id} className={effective === m.id ? 'on' : ''} onClick={() => setMode(m.id)}>
              <span className="row" style={{ justifyContent: 'center', gap: 6 }}>
                {m.icon}
                {m.label}
              </span>
            </button>
          ))}
      </div>
      {effective === 'camera' && <CameraCounter exercise={exercise} onAmount={onAmount} compact={compact} />}
      {effective === 'motion' && (exercise === 'squat' || exercise === 'jumpingJack') && (
        <MotionPanel exercise={exercise} onAmount={onAmount} />
      )}
      {effective === 'manual' && <ManualPanel exercise={exercise} onAmount={onAmount} />}
    </div>
  )
}
