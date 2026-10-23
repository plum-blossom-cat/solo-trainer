import { AnimatePresence, motion } from 'framer-motion'
import { useState } from 'react'
import { Figure } from '../art/Figure'
import { sfx, speak } from '../audio/sfx'
import { SystemWindow, TypeText } from '../components/ui'
import { DAILY_PRESETS, formatAmount } from '../game/data'
import { useStore } from '../game/store'
import type { Difficulty } from '../game/types'

type Step = 'intro' | 'threat' | 'name' | 'difficulty' | 'welcome'

export function Awakening() {
  const awaken = useStore((s) => s.awaken)
  const [step, setStep] = useState<Step>('intro')
  const [typed, setTyped] = useState(false)
  const [name, setName] = useState('')
  const [difficulty, setDifficulty] = useState<Exclude<Difficulty, 'custom'>>('beginner')

  const go = (s: Step) => {
    sfx.system()
    setTyped(false)
    setStep(s)
  }

  return (
    <div style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', padding: 16, position: 'relative', zIndex: 2 }}>
      <div style={{ width: 'min(480px, 100%)' }}>
        <AnimatePresence mode="wait">
          {step === 'intro' && (
            <motion.div key="intro" exit={{ opacity: 0, scale: 0.96 }}>
              <SystemWindow title="Notification" delay={0.4}>
                <p style={{ fontSize: 19, lineHeight: 1.5, minHeight: 90, margin: '4px 0 18px' }} className="center">
                  <TypeText
                    text="You have acquired the qualifications to be a Player. Will you accept?"
                    onDone={() => setTyped(true)}
                  />
                </p>
                <motion.div className="grid-2" initial={{ opacity: 0 }} animate={{ opacity: typed ? 1 : 0 }}>
                  <button className="btn" disabled={!typed} onClick={() => go('name')}>
                    Accept
                  </button>
                  <button
                    className="btn ghost"
                    disabled={!typed}
                    onClick={() => {
                      sfx.warning()
                      setTyped(false)
                      setStep('threat')
                    }}
                  >
                    Decline
                  </button>
                </motion.div>
              </SystemWindow>
            </motion.div>
          )}

          {step === 'threat' && (
            <motion.div key="threat" exit={{ opacity: 0 }}>
              <SystemWindow title="Warning" tone="red">
                <p style={{ fontSize: 18, lineHeight: 1.5, minHeight: 80 }} className="center warn-text">
                  <TypeText
                    text="If you choose not to accept, your heart will stop in 0.02 seconds. Will you accept?"
                    onDone={() => setTyped(true)}
                  />
                </p>
                <button className="btn red block" disabled={!typed} onClick={() => go('name')}>
                  Accept
                </button>
              </SystemWindow>
            </motion.div>
          )}

          {step === 'name' && (
            <motion.div key="name" exit={{ opacity: 0 }}>
              <SystemWindow title="Player Registration">
                <form
                  className="stack"
                  onSubmit={(e) => {
                    e.preventDefault()
                    if (name.trim()) go('difficulty')
                  }}
                >
                  <p className="center muted" style={{ margin: 0 }}>
                    The System requires your name.
                  </p>
                  <div className="field">
                    <label htmlFor="pname">Name</label>
                    <input
                      id="pname"
                      className="input"
                      autoFocus
                      maxLength={24}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Sung Jinwoo"
                      autoComplete="nickname"
                    />
                  </div>
                  <button className="btn block" type="submit" disabled={!name.trim()}>
                    Confirm
                  </button>
                </form>
              </SystemWindow>
            </motion.div>
          )}

          {step === 'difficulty' && (
            <motion.div key="difficulty" exit={{ opacity: 0 }}>
              <SystemWindow title="Daily Quest Calibration">
                <p className="center muted" style={{ marginTop: 0 }}>
                  Choose the strength of your Daily Quest. You can change it later.
                </p>
                <div className="stack">
                  {(Object.keys(DAILY_PRESETS) as (keyof typeof DAILY_PRESETS)[]).map((k) => {
                    const p = DAILY_PRESETS[k]
                    const on = difficulty === k
                    return (
                      <button
                        key={k}
                        className="list-item"
                        style={{
                          cursor: 'pointer',
                          textAlign: 'left',
                          borderColor: on ? 'var(--line)' : undefined,
                          boxShadow: on ? 'var(--glow-soft)' : undefined,
                        }}
                        onClick={() => {
                          sfx.click()
                          setDifficulty(k)
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <div className="caps glow" style={{ fontSize: 16 }}>
                            {p.label}
                          </div>
                          <div className="small muted">{p.blurb}</div>
                          <div className="small" style={{ marginTop: 4 }}>
                            {p.pushup} push-ups · {p.situp} sit-ups · {p.squat} squats · {formatAmount('run', p.run)} run
                          </div>
                        </div>
                        <span style={{ fontSize: 22, opacity: on ? 1 : 0.2 }} className="glow">
                          ◆
                        </span>
                      </button>
                    )
                  })}
                </div>
                <button className="btn block" style={{ marginTop: 14 }} onClick={() => go('welcome')}>
                  Confirm
                </button>
              </SystemWindow>
            </motion.div>
          )}

          {step === 'welcome' && (
            <motion.div key="welcome" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="stack" style={{ alignItems: 'center' }}>
              <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1.2 }}>
                <Figure art="hunter" variant="hunter" size={200} />
              </motion.div>
              <SystemWindow title="Welcome" delay={0.6}>
                <p className="center" style={{ fontSize: 20, margin: '0 0 6px' }}>
                  <TypeText text={`Welcome, Player ${name.trim()}.`} onDone={() => setTyped(true)} />
                </p>
                <p className="center muted small" style={{ margin: '0 0 16px' }}>
                  Complete your Daily Quest every day. Failure will result in an appropriate penalty.
                </p>
                <button
                  className="btn block"
                  disabled={!typed}
                  onClick={() => {
                    sfx.levelUp()
                    speak(`Welcome, Player ${name.trim()}.`)
                    awaken(name, difficulty)
                  }}
                >
                  Begin
                </button>
              </SystemWindow>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
