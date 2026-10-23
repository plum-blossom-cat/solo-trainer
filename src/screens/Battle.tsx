import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Figure } from '../art/Figure'
import { sfx, speak } from '../audio/sfx'
import { RepSession } from '../components/session/RepSession'
import { Bar, SystemWindow } from '../components/ui'
import { EXERCISES, formatAmount, type DungeonDef } from '../game/data'
import { formatClock } from '../game/date'
import { computeBonuses, critChance, damagePerUnit } from '../game/engine'
import { usePlayer, useStore } from '../game/store'
import { scaledWaves } from './Gates'

type Phase = 'intro' | 'fight' | 'waveClear' | 'victory' | 'defeat'

interface Popup {
  id: number
  text: string
  crit: boolean
  x: number
}

let popupId = 0

export function Battle({ dungeon }: { dungeon: DungeonDef }) {
  const data = usePlayer()
  const logWork = useStore((s) => s.logWork)
  const clearGate = useStore((s) => s.clearGate)
  const failGate = useStore((s) => s.failGate)
  const leaveGate = useStore((s) => s.leaveGate)

  const waves = useMemo(() => scaledWaves(dungeon, data.difficulty), [dungeon, data.difficulty])
  const [index, setIndex] = useState(0)
  const wave = waves[index]
  const [hp, setHp] = useState(wave.amount)
  const hpRef = useRef(wave.amount)
  const [phase, setPhase] = useState<Phase>('intro')
  const [timeLeft, setTimeLeft] = useState(wave.timeLimit ?? 0)
  const [popups, setPopups] = useState<Popup[]>([])
  const [hurt, setHurt] = useState(false)
  const [shake, setShake] = useState(0)
  const [retreat, setRetreat] = useState(false)
  const settled = useRef(false)

  const b = computeBonuses(data)
  const dmg = damagePerUnit(data, b)
  const crit = critChance(data, b)

  // Intro banner for each wave.
  useEffect(() => {
    hpRef.current = wave.amount
    setHp(wave.amount)
    setTimeLeft(wave.timeLimit ?? 0)
    setPhase('intro')
    if (wave.boss) {
      sfx.warning()
      speak(`Boss. ${wave.enemy}.`)
    } else sfx.system()
    const id = setTimeout(() => setPhase('fight'), wave.boss ? 2400 : 1500)
    return () => clearTimeout(id)
  }, [index, wave])

  // Boss enrage timer.
  useEffect(() => {
    if (phase !== 'fight' || !wave.timeLimit) return
    const id = setInterval(() => setTimeLeft((t) => Math.max(0, t - 1)), 1000)
    return () => clearInterval(id)
  }, [phase, wave.timeLimit])

  useEffect(() => {
    if (phase === 'fight' && wave.timeLimit && timeLeft <= 0) {
      setPhase('defeat')
      if (!settled.current) {
        settled.current = true
        sfx.fail()
        failGate()
      }
    }
  }, [timeLeft, phase, wave.timeLimit, failGate])

  const onAmount = (delta: number) => {
    logWork(wave.exercise, delta)
    if (phase !== 'fight') return
    let total = 0
    let anyCrit = false
    for (let i = 0; i < delta; i++) {
      const isCrit = Math.random() < crit
      anyCrit ||= isCrit
      total += dmg * (isCrit ? 2 : 1)
    }
    sfx.hit(anyCrit)
    setHurt(true)
    setTimeout(() => setHurt(false), 120)
    if (anyCrit) setShake((s) => s + 1)
    const p: Popup = { id: popupId++, text: `${anyCrit ? 'CRITICAL ' : ''}-${total.toFixed(1)}`, crit: anyCrit, x: 30 + Math.random() * 40 }
    setPopups((ps) => [...ps.slice(-5), p])
    setTimeout(() => setPopups((ps) => ps.filter((x) => x.id !== p.id)), 1100)

    const prev = hpRef.current
    const next = Math.max(0, prev - total)
    hpRef.current = next
    setHp(next)
    if (next > 0 || prev <= 0) return
    if (index < waves.length - 1) {
      setPhase('waveClear')
      sfx.questComplete()
      setTimeout(() => setIndex((i) => i + 1), 1600)
    } else if (!settled.current) {
      settled.current = true
      setPhase('victory')
      sfx.levelUp()
      speak('Gate cleared.')
      setTimeout(() => clearGate(dungeon), 900)
    }
  }

  const ex = EXERCISES[wave.exercise]

  return (
    <div
      style={{
        minHeight: '100dvh',
        position: 'relative',
        zIndex: 2,
        overflowX: 'hidden',
        background: `radial-gradient(ellipse 90% 60% at 50% 25%, ${dungeon.color}33, transparent 70%), linear-gradient(#030712, #000)`,
      }}
    >
      <div className="main" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)' }}>
        <div className="row between">
          <div>
            <div className="caps small" style={{ color: dungeon.color }}>
              {dungeon.rank}-Rank Gate
            </div>
            <div style={{ fontWeight: 700, fontSize: 18 }}>{dungeon.name}</div>
          </div>
          <button className="btn small ghost" onClick={() => (phase === 'victory' || phase === 'defeat' ? leaveGate() : setRetreat(true))}>
            {phase === 'victory' || phase === 'defeat' ? 'Exit' : 'Retreat'}
          </button>
        </div>

        <div className="row" style={{ gap: 6, margin: '10px 0' }}>
          {waves.map((w, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                height: 4,
                borderRadius: 2,
                background: i < index || (i === index && phase === 'victory') ? 'var(--cyan)' : i === index ? dungeon.color : 'rgba(125,190,255,0.15)',
                boxShadow: i <= index ? `0 0 8px ${dungeon.color}` : undefined,
              }}
              title={w.enemy}
            />
          ))}
        </div>

        {/* Arena */}
        <motion.div
          key={shake}
          animate={shake ? { x: [0, -8, 7, -5, 3, 0] } : undefined}
          transition={{ duration: 0.35 }}
          style={{ position: 'relative', display: 'grid', placeItems: 'center', minHeight: 300 }}
        >
          <div style={{ width: 'min(360px, 100%)', marginBottom: 6 }}>
            <div className="row between small" style={{ marginBottom: 4 }}>
              <span className={wave.boss ? 'warn-text caps' : 'caps'} style={{ fontWeight: 700 }}>
                {wave.boss && 'Boss · '}
                {wave.enemy}
              </span>
              <span className="muted" style={{ fontVariantNumeric: 'tabular-nums' }}>
                {hp.toFixed(1)} / {wave.amount}
              </span>
            </div>
            <Bar kind="hp" thick value={hp} max={wave.amount} />
          </div>

          <AnimatePresence mode="wait">
            {phase !== 'victory' && !(phase === 'waveClear') ? (
              <motion.div
                key={`enemy-${index}`}
                initial={{ opacity: 0, scale: 0.8, filter: 'blur(8px)' }}
                animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                exit={{ opacity: 0, scale: 1.15, filter: 'blur(14px)', transition: { duration: 0.7 } }}
              >
                <Figure art={wave.art} size={wave.boss ? 220 : 180} hurt={hurt} />
              </motion.div>
            ) : (
              <motion.div key={`cleared-${index}`} initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} style={{ minHeight: 230, display: 'grid', placeItems: 'center' }}>
                <div className="display glow center" style={{ fontSize: phase === 'victory' ? 40 : 30, fontWeight: 900 }}>
                  {phase === 'victory' ? 'GATE CLEARED' : 'WAVE CLEARED'}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {popups.map((p) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 1, y: 0, scale: p.crit ? 1.4 : 1 }}
                animate={{ opacity: 0, y: -80, scale: 1 }}
                transition={{ duration: 1 }}
                className="display"
                style={{
                  position: 'absolute',
                  top: '40%',
                  left: `${p.x}%`,
                  translateX: '-50%',
                  fontWeight: 900,
                  fontSize: p.crit ? 26 : 20,
                  color: p.crit ? '#fde68a' : '#fecaca',
                  textShadow: p.crit ? '0 0 12px #f59e0b' : '0 0 10px #ef4444',
                  pointerEvents: 'none',
                  whiteSpace: 'nowrap',
                }}
              >
                {p.text}
              </motion.div>
            ))}
          </AnimatePresence>

          <AnimatePresence>
            {phase === 'intro' && (
              <motion.div
                initial={{ scaleX: 0, opacity: 0 }}
                animate={{ scaleX: 1, opacity: 1 }}
                exit={{ scaleX: 0, opacity: 0 }}
                style={{
                  position: 'absolute',
                  top: '42%',
                  left: 0,
                  right: 0,
                  padding: '10px 0',
                  background: wave.boss ? 'linear-gradient(90deg, transparent, rgba(127,29,29,0.9), transparent)' : 'linear-gradient(90deg, transparent, rgba(30,58,138,0.9), transparent)',
                  borderTop: `1px solid ${wave.boss ? '#f87171' : 'var(--line)'}`,
                  borderBottom: `1px solid ${wave.boss ? '#f87171' : 'var(--line)'}`,
                }}
                className="center"
              >
                <div className={`display ${wave.boss ? 'warn-text' : 'glow'}`} style={{ fontSize: 28, fontWeight: 900, letterSpacing: '0.2em' }}>
                  {wave.boss ? 'BOSS' : `WAVE ${index + 1}`}
                </div>
                <div className="caps small">{wave.enemy}</div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {phase === 'victory' || phase === 'defeat' ? (
          <SystemWindow title={phase === 'victory' ? 'Gate Cleared' : 'Gate Failed'} tone={phase === 'victory' ? 'blue' : 'red'}>
            <p className="center" style={{ marginTop: 0 }}>
              {phase === 'victory'
                ? 'All monsters have been defeated. Rewards have been issued.'
                : `${wave.enemy} has enraged. You were forced out of the Gate.`}
            </p>
            {phase === 'victory' && dungeon.extraction && data.job !== 'None' && (
              <p className="center purple-text small">A shadow lingers over the fallen boss…</p>
            )}
            <button className={`btn block ${phase === 'victory' ? '' : 'red'}`} onClick={leaveGate}>
              Continue
            </button>
          </SystemWindow>
        ) : (
          <SystemWindow
            title={`${ex.name}: ${formatAmount(wave.exercise, Math.ceil(hp / dmg))} ${ex.unit === 'reps' ? 'reps' : ''} to defeat`}
            bang={false}
            tone={wave.boss ? 'red' : 'blue'}
          >
            {wave.timeLimit ? (
              <div className="row between" style={{ marginBottom: 10 }}>
                <span className="small caps muted">Enrage timer</span>
                <span className={`display ${timeLeft < 30 ? 'warn-text pulse' : 'glow'}`} style={{ fontSize: 24, fontVariantNumeric: 'tabular-nums' }}>
                  {formatClock(timeLeft)}
                </span>
              </div>
            ) : null}
            <div className="small muted" style={{ marginBottom: 10 }}>
              Damage per {ex.unit === 'reps' ? 'rep' : 'second'}: <span className="glow">{dmg.toFixed(2)}</span> · Crit chance:{' '}
              <span className="glow">{(crit * 100).toFixed(1)}%</span>
            </div>
            <RepSession key={wave.exercise} exercise={wave.exercise} onAmount={onAmount} compact />
          </SystemWindow>
        )}
      </div>

      <AnimatePresence>
        {retreat && (
          <motion.div className="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="modal">
              <SystemWindow title="Retreat?" tone="red">
                <p className="center">Leaving now forfeits all rewards from this Gate. Your reps still count toward your quests.</p>
                <div className="grid-2">
                  <button className="btn ghost" onClick={() => setRetreat(false)}>
                    Stay
                  </button>
                  <button className="btn red" onClick={leaveGate}>
                    Retreat
                  </button>
                </div>
              </SystemWindow>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
