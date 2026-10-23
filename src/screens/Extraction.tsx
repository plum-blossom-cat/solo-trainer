import { AnimatePresence, motion } from 'framer-motion'
import { useState } from 'react'
import { Figure } from '../art/Figure'
import { sfx, speak } from '../audio/sfx'
import { Bar, SystemWindow } from '../components/ui'
import { SHADOWS } from '../game/data'
import { EXTRACTION_MP_COST, extractionChance, maxMp } from '../game/engine'
import { useStore } from '../game/store'

/** The ARISE sequence after a boss falls. */
export function Extraction() {
  const data = useStore((s) => s.data)!
  const arise = useStore((s) => s.arise)
  const extract = useStore((s) => s.extract)
  const abandon = useStore((s) => s.abandonExtraction)
  const clearArise = useStore((s) => s.clearArise)
  const use = useStore((s) => s.use)
  const [casting, setCasting] = useState(false)

  const pending = data.pendingExtraction
  const shadowId = arise?.shadow ?? pending?.shadow
  if (!shadowId) return null
  const def = SHADOWS[shadowId]
  const chance = extractionChance(data, def.grade)
  const showResult = !!arise && !casting
  const potions = data.inventory.manaPotion ?? 0

  const cast = () => {
    if (casting || data.mp < EXTRACTION_MP_COST) return
    setCasting(true)
    sfx.arise()
    speak('Arise.')
    setTimeout(() => {
      extract()
      setCasting(false)
    }, 2200)
  }

  const next = () => {
    clearArise()
  }

  return (
    <div
      style={{
        minHeight: '100dvh',
        position: 'relative',
        zIndex: 2,
        display: 'grid',
        placeItems: 'center',
        padding: 16,
        background: 'radial-gradient(ellipse 80% 60% at 50% 40%, rgba(88,28,135,0.45), #000 75%)',
        overflow: 'hidden',
      }}
    >
      {/* rising darkness */}
      <AnimatePresence>
        {casting && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 5, background: 'radial-gradient(ellipse at center, rgba(20,5,40,0.75), rgba(0,0,0,0.92))' }}
          >
            {Array.from({ length: 24 }, (_, i) => (
              <motion.span
                key={i}
                style={{
                  position: 'absolute',
                  bottom: -40,
                  left: `${(i * 41) % 100}%`,
                  width: 60 + (i % 4) * 30,
                  height: 60 + (i % 4) * 30,
                  borderRadius: '50%',
                  background: 'radial-gradient(circle, rgba(124,58,237,0.6), rgba(0,0,0,0) 70%)',
                  filter: 'blur(6px)',
                }}
                animate={{ y: [0, -window.innerHeight * 0.9], opacity: [0, 1, 0] }}
                transition={{ duration: 1.8 + (i % 5) * 0.2, delay: (i % 8) * 0.08, ease: 'easeOut' }}
              />
            ))}
            <motion.div
              initial={{ scale: 0.3, opacity: 0 }}
              animate={{ scale: [0.3, 1.15, 1], opacity: [0, 1, 1] }}
              transition={{ duration: 0.9, delay: 0.3 }}
              style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}
            >
              <motion.div
                animate={{ x: [0, -3, 3, -2, 2, 0] }}
                transition={{ duration: 0.3, repeat: 5, delay: 0.9 }}
                className="display"
                style={{
                  fontSize: 'clamp(60px, 20vw, 140px)',
                  fontWeight: 900,
                  color: '#f5f3ff',
                  letterSpacing: '0.12em',
                  textShadow: '0 0 20px #a855f7, 0 0 60px #7c3aed, 0 0 120px #4c1d95',
                }}
              >
                ARISE
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{ width: 'min(460px, 100%)', position: 'relative', zIndex: 2 }} className="stack">
        <div style={{ display: 'grid', placeItems: 'center', minHeight: 270 }}>
          <AnimatePresence mode="wait">
            {showResult && arise.success ? (
              <motion.div
                key="risen"
                initial={{ opacity: 0, y: 80, scale: 0.6, filter: 'blur(10px)' }}
                animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
                transition={{ duration: 1.4, ease: [0.2, 0.9, 0.2, 1] }}
              >
                <Figure art={def.art} variant="shadow" aura={def.aura} size={230} />
              </motion.div>
            ) : (
              <motion.div
                key="corpse"
                animate={{ opacity: showResult ? 0.15 : 0.55 }}
                style={{ filter: 'grayscale(0.8) brightness(0.6)', transform: 'rotate(-80deg) translateX(-30px)' }}
              >
                <Figure art={def.art} size={200} animate={false} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {showResult ? (
          <SystemWindow title={arise.success ? 'Extraction Successful' : 'Extraction Failed'} tone={arise.success ? 'purple' : 'red'}>
            {arise.success ? (
              <>
                <div className="center display purple-text" style={{ fontSize: 30, fontWeight: 900 }}>
                  {def.name}
                </div>
                <div className="center small muted">
                  {def.grade} · {def.bonusText}
                </div>
                <p className="center small" style={{ fontStyle: 'italic' }}>
                  “{def.lore}”
                </p>
                <button className="btn purple block" onClick={next}>
                  Welcome to the army
                </button>
              </>
            ) : (
              <>
                <p className="center" style={{ marginTop: 0 }}>
                  The shadow resisted your command.{' '}
                  {arise.attemptsLeft > 0 ? `${arise.attemptsLeft} attempt${arise.attemptsLeft > 1 ? 's' : ''} remaining.` : 'The shadow has dissipated.'}
                </p>
                <button className="btn red block" onClick={next}>
                  {arise.attemptsLeft > 0 ? 'Try again' : 'Continue'}
                </button>
              </>
            )}
          </SystemWindow>
        ) : (
          <SystemWindow title="Shadow Extraction" tone="purple">
            <p className="center" style={{ marginTop: 0 }}>
              You can extract the shadow of <span className="purple-text">{def.name}</span>.
            </p>
            <div className="grid-3 center small" style={{ marginBottom: 12 }}>
              <div>
                <div className="display purple-text" style={{ fontSize: 22 }}>
                  {Math.round(chance * 100)}%
                </div>
                <div className="muted caps" style={{ fontSize: 11 }}>
                  Chance
                </div>
              </div>
              <div>
                <div className="display purple-text" style={{ fontSize: 22 }}>
                  {pending?.attemptsLeft ?? 0}
                </div>
                <div className="muted caps" style={{ fontSize: 11 }}>
                  Attempts
                </div>
              </div>
              <div>
                <div className="display purple-text" style={{ fontSize: 22 }}>
                  {EXTRACTION_MP_COST}
                </div>
                <div className="muted caps" style={{ fontSize: 11 }}>
                  MP cost
                </div>
              </div>
            </div>
            <Bar kind="mp" value={data.mp} max={maxMp(data)} label="MP" right={`${Math.floor(data.mp)} / ${maxMp(data)}`} />
            <div className="stack" style={{ marginTop: 14 }}>
              <button className="btn purple block" disabled={casting || data.mp < EXTRACTION_MP_COST} onClick={cast} style={{ fontSize: 20, minHeight: 56 }}>
                Arise
              </button>
              {data.mp < EXTRACTION_MP_COST && (
                <button className="btn ghost block" disabled={potions === 0} onClick={() => use('manaPotion')}>
                  Drink Mana Potion ({potions})
                </button>
              )}
              <button className="btn ghost small" disabled={casting} onClick={abandon}>
                Leave the shadow
              </button>
            </div>
          </SystemWindow>
        )}
      </div>
    </div>
  )
}
