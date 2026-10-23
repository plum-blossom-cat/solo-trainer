import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import { Figure } from '../art/Figure'
import { sfx, speak } from '../audio/sfx'
import { RepSession } from '../components/session/RepSession'
import { Bar, SystemWindow, TypeText } from '../components/ui'
import { DIFFICULTY_SCALE, EXERCISES, PENALTY_QUEST, formatAmount } from '../game/data'
import { formatClock } from '../game/date'
import { usePlayer, useStore } from '../game/store'

type Phase = 'warning' | 'brief' | 'survive' | 'dead' | 'survived'

export function PenaltyZone() {
  const data = usePlayer()
  const logWork = useStore((s) => s.logWork)
  const clearPenalty = useStore((s) => s.clearPenalty)
  const navigate = useStore((s) => s.navigate)
  const waves = useMemo(
    () => PENALTY_QUEST.waves.map((w) => ({ ...w, amount: Math.max(10, Math.round(w.amount * DIFFICULTY_SCALE[data.difficulty])) })),
    [data.difficulty],
  )
  const [phase, setPhase] = useState<Phase>('warning')
  const [typed, setTyped] = useState(false)
  const [index, setIndex] = useState(0)
  const [done, setDone] = useState(0)
  const [timeLeft, setTimeLeft] = useState(PENALTY_QUEST.timeLimit)

  useEffect(() => {
    sfx.warning()
    speak('Warning. Moving to the penalty zone.')
  }, [])

  useEffect(() => {
    if (phase !== 'survive') return
    const id = setInterval(() => setTimeLeft((t) => t - 1), 1000)
    return () => clearInterval(id)
  }, [phase])

  useEffect(() => {
    if (phase === 'survive' && timeLeft <= 0) {
      sfx.fail()
      setPhase('dead')
    }
  }, [timeLeft, phase])

  const wave = waves[index]

  const onAmount = (delta: number) => {
    logWork(wave.exercise, delta)
    if (phase !== 'survive') return
    const next = done + delta
    if (next >= wave.amount) {
      if (index < waves.length - 1) {
        sfx.questComplete()
        setIndex(index + 1)
        setDone(0)
      } else {
        setDone(wave.amount)
        setPhase('survived')
        sfx.levelUp()
        speak('You have survived.')
      }
    } else {
      setDone(next)
    }
  }

  const restart = () => {
    setIndex(0)
    setDone(0)
    setTimeLeft(PENALTY_QUEST.timeLimit)
    setPhase('survive')
  }

  return (
    <div
      style={{
        minHeight: '100dvh',
        position: 'relative',
        zIndex: 2,
        background:
          'radial-gradient(ellipse 120% 50% at 50% 100%, rgba(180,83,9,0.35), transparent 70%), radial-gradient(ellipse at 50% 0%, rgba(127,29,29,0.5), #0a0303 70%)',
      }}
    >
      <div className="main" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 16px)' }}>
        <div className="row between">
          <div className="caps warn-text flicker" style={{ fontSize: 14 }}>
            ⚠ Penalty Zone
          </div>
          <button className="btn small ghost" onClick={() => navigate('settings')}>
            Settings
          </button>
        </div>

        <motion.div
          animate={{ x: [0, 40, -20, 0], y: [0, -6, 4, 0] }}
          transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
          style={{ display: 'grid', placeItems: 'center', margin: '8px 0 -20px' }}
        >
          <Figure art="centipede" size={phase === 'survived' ? 160 : 230} aura="#f97316" />
        </motion.div>

        <AnimatePresence mode="wait">
          {phase === 'warning' && (
            <motion.div key="w" exit={{ opacity: 0 }}>
              <SystemWindow title="Warning" tone="red">
                <p className="center" style={{ fontSize: 18, lineHeight: 1.5, minHeight: 80 }}>
                  <TypeText
                    text="You have failed to complete the Daily Quest. You will now be moved to the Penalty Zone for the duration of the penalty."
                    onDone={() => setTyped(true)}
                  />
                </p>
                <button className="btn red block" disabled={!typed} onClick={() => setPhase('brief')}>
                  Confirm
                </button>
              </SystemWindow>
            </motion.div>
          )}

          {phase === 'brief' && (
            <motion.div key="b" exit={{ opacity: 0 }}>
              <SystemWindow title="Penalty Quest" tone="red">
                <div className="center warn-text" style={{ fontWeight: 700, fontSize: 18 }}>
                  [{PENALTY_QUEST.title}]
                </div>
                <p className="center small muted">{PENALTY_QUEST.description}</p>
                <div className="stack" style={{ gap: 6, margin: '10px 0 14px' }}>
                  {waves.map((w, i) => (
                    <div key={i} className="row between">
                      <span>{EXERCISES[w.exercise].name}</span>
                      <span className="muted">{formatAmount(w.exercise, w.amount)}</span>
                    </div>
                  ))}
                  <div className="row between">
                    <span>Time limit</span>
                    <span className="warn-text">{formatClock(PENALTY_QUEST.timeLimit)}</span>
                  </div>
                </div>
                <button className="btn red block" onClick={restart}>
                  Survive
                </button>
              </SystemWindow>
            </motion.div>
          )}

          {phase === 'survive' && (
            <motion.div key="s" exit={{ opacity: 0 }}>
              <SystemWindow title={`Survive · ${index + 1}/${waves.length}`} tone="red">
                <div className="row between" style={{ marginBottom: 10 }}>
                  <span className="caps small muted">Time remaining</span>
                  <span className={`display ${timeLeft < 60 ? 'warn-text pulse' : 'warn-text'}`} style={{ fontSize: 26, fontVariantNumeric: 'tabular-nums' }}>
                    {formatClock(timeLeft)}
                  </span>
                </div>
                <Bar
                  kind="hp"
                  thick
                  value={done}
                  max={wave.amount}
                  label={EXERCISES[wave.exercise].name}
                  right={`${formatAmount(wave.exercise, done)} / ${formatAmount(wave.exercise, wave.amount)}`}
                />
                <div style={{ marginTop: 12 }}>
                  <RepSession key={wave.exercise} exercise={wave.exercise} onAmount={onAmount} compact />
                </div>
              </SystemWindow>
            </motion.div>
          )}

          {phase === 'dead' && (
            <motion.div key="d" exit={{ opacity: 0 }}>
              <SystemWindow title="You Died" tone="red">
                <p className="center">The centipedes overwhelmed you. The System has revived you at the edge of the desert.</p>
                <button className="btn red block" onClick={restart}>
                  Try again
                </button>
              </SystemWindow>
            </motion.div>
          )}

          {phase === 'survived' && (
            <motion.div key="v" exit={{ opacity: 0 }}>
              <SystemWindow title="Penalty Complete">
                <p className="center" style={{ fontSize: 18 }}>
                  You survived the Penalty Zone.
                </p>
                <p className="center small muted">Title acquired: [One Who Overcame Adversity]. Do not fail again.</p>
                <button className="btn block" onClick={clearPenalty}>
                  Return
                </button>
              </SystemWindow>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
