import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { MeditationPanel } from '../components/session/MeditationPanel'
import { RepSession } from '../components/session/RepSession'
import { RestTimer } from '../components/session/RestTimer'
import { RunTracker } from '../components/session/RunTracker'
import { Bar, SystemWindow } from '../components/ui'
import { isCountable } from '../detection/repCounter'
import { EXERCISES, STATS, formatAmount } from '../game/data'
import { dayKey } from '../game/date'
import { currentWeight, dailyTargets, kcalFor } from '../game/engine'
import { usePlayer, useStore } from '../game/store'
import type { ExerciseId } from '../game/types'

const ORDER: ExerciseId[] = ['pushup', 'situp', 'squat', 'jumpingJack', 'plank', 'run', 'meditation']

const GLYPH: Record<ExerciseId, string> = {
  pushup: '⇊',
  situp: '⤴',
  squat: '⇕',
  jumpingJack: '✶',
  plank: '━',
  run: '➤',
  meditation: '◎',
}

export function Train() {
  const data = usePlayer()
  const intent = useStore((s) => s.training)
  const logWork = useStore((s) => s.logWork)
  const startTraining = useStore((s) => s.startTraining)
  const [exercise, setExercise] = useState<ExerciseId>(intent?.exercise ?? 'pushup')
  const [session, setSession] = useState(0)

  useEffect(() => {
    if (intent) setExercise(intent.exercise)
  }, [intent])

  useEffect(() => setSession(0), [exercise])

  const def = EXERCISES[exercise]
  const today = data.logs[dayKey()]?.[exercise] ?? 0
  const targets = dailyTargets(data)
  const dailyKey = exercise === 'pushup' || exercise === 'situp' || exercise === 'squat' || exercise === 'run' ? exercise : null
  const target = intent && intent.exercise === exercise ? intent.target : undefined

  const onAmount = (delta: number) => {
    setSession((s) => s + delta)
    logWork(exercise, delta)
  }

  return (
    <>
      <SystemWindow title="Training" bang={false}>
        <div className="grid-3" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
          {ORDER.map((ex) => {
            const on = ex === exercise
            return (
              <button
                key={ex}
                onClick={() => {
                  setExercise(ex)
                  if (intent && intent.exercise !== ex) startTraining(null)
                }}
                className="list-item"
                style={{
                  margin: 0,
                  flexDirection: 'column',
                  gap: 2,
                  padding: '10px 4px',
                  cursor: 'pointer',
                  borderColor: on ? 'var(--line)' : undefined,
                  boxShadow: on ? 'var(--glow-soft)' : undefined,
                  background: on ? 'rgba(37,99,235,0.25)' : undefined,
                }}
              >
                <span style={{ fontSize: 20 }} className={on ? 'glow' : 'muted'}>
                  {GLYPH[ex]}
                </span>
                <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.04em' }} className={on ? 'glow' : 'muted'}>
                  {EXERCISES[ex].name}
                </span>
              </button>
            )
          })}
        </div>
      </SystemWindow>

      {intent?.label && intent.exercise === exercise && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className={`list-item ${intent.label.startsWith('Emergency') ? '' : ''}`}
          style={{ borderColor: intent.label.startsWith('Emergency') ? 'rgba(248,113,113,0.7)' : 'var(--line)' }}
        >
          <div style={{ flex: 1 }}>
            <div className="caps small" style={{ color: intent.label.startsWith('Emergency') ? 'var(--red-2)' : 'var(--cyan)' }}>
              {intent.label}
            </div>
            <div className="small muted">
              Target this session: {formatAmount(exercise, target ?? 0)} {def.unit === 'reps' ? def.name.toLowerCase() : ''}
            </div>
          </div>
          <button className="btn small ghost" onClick={() => startTraining(null)}>
            Free train
          </button>
        </motion.div>
      )}

      <SystemWindow title={def.name} bang={false} key={exercise}>
        {isCountable(exercise) && <RepSession exercise={exercise} onAmount={onAmount} />}
        {exercise === 'run' && <RunTracker onAmount={onAmount} target={target} />}
        {exercise === 'meditation' && <MeditationPanel onAmount={onAmount} />}

        <div className="divider" />

        <div className="grid-3 center">
          <div>
            <div className="display glow" style={{ fontSize: 22 }}>
              {formatAmount(exercise, session)}
            </div>
            <div className="small muted caps">Session</div>
          </div>
          <div>
            <div className="display glow" style={{ fontSize: 22 }}>
              {formatAmount(exercise, today)}
            </div>
            <div className="small muted caps">Today</div>
          </div>
          <div>
            <div className="display" style={{ fontSize: 22, color: 'var(--cyan)' }}>
              +{Math.round(session * def.xpPer)}
              <span className="small muted"> · ~{Math.round(kcalFor(exercise, session, currentWeight(data) ?? 70))} kcal</span>
            </div>
            <div className="small muted caps">XP · kcal</div>
          </div>
        </div>

        {target !== undefined && target > 0 && (
          <div style={{ marginTop: 12 }}>
            <Bar
              kind={session >= target ? 'done' : ''}
              value={session}
              max={target}
              label="Session goal"
              right={`${formatAmount(exercise, session)} / ${formatAmount(exercise, target)}`}
            />
          </div>
        )}

        {dailyKey && (
          <div style={{ marginTop: 12 }}>
            <Bar
              kind={data.daily.progress[dailyKey] >= targets[dailyKey] ? 'done' : ''}
              value={data.daily.progress[dailyKey]}
              max={targets[dailyKey]}
              label="Daily quest"
              right={`${formatAmount(exercise, data.daily.progress[dailyKey])} / ${formatAmount(exercise, targets[dailyKey])}`}
            />
          </div>
        )}

        <div style={{ marginTop: 12 }}>
          <Bar
            kind="gold"
            value={data.statProgress[def.stat]}
            max={def.statEvery}
            label={`${STATS[def.stat].label} proficiency`}
            right={`${formatAmount(exercise, data.statProgress[def.stat])} / ${formatAmount(exercise, def.statEvery)}`}
          />
        </div>
      </SystemWindow>

      {isCountable(exercise) && (
        <SystemWindow title="Rest Timer" bang={false}>
          <RestTimer />
        </SystemWindow>
      )}
    </>
  )
}
