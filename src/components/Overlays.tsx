import { AnimatePresence, motion } from 'framer-motion'
import { useEffect } from 'react'
import { Figure } from '../art/Figure'
import { RANKS } from '../game/data'
import { useStore, type Overlay } from '../game/store'

function Rays({ color }: { color: string }) {
  return (
    <motion.div
      aria-hidden
      style={{
        position: 'absolute',
        width: '160vmax',
        height: '160vmax',
        left: '50%',
        top: '50%',
        marginLeft: '-80vmax',
        marginTop: '-80vmax',
        background: `repeating-conic-gradient(from 0deg, ${color}22 0deg 6deg, transparent 6deg 18deg)`,
        maskImage: 'radial-gradient(circle, black 0%, transparent 55%)',
        WebkitMaskImage: 'radial-gradient(circle, black 0%, transparent 55%)',
      }}
      animate={{ rotate: 360 }}
      transition={{ duration: 40, repeat: Infinity, ease: 'linear' }}
    />
  )
}

function Burst({ color }: { color: string }) {
  return (
    <>
      {Array.from({ length: 28 }, (_, i) => {
        const a = (i / 28) * Math.PI * 2
        const d = 140 + (i % 5) * 40
        return (
          <motion.span
            key={i}
            aria-hidden
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: color,
              boxShadow: `0 0 12px ${color}, 0 0 24px ${color}`,
            }}
            initial={{ x: 0, y: 0, opacity: 1, scale: 1.4 }}
            animate={{ x: Math.cos(a) * d, y: Math.sin(a) * d, opacity: 0, scale: 0.2 }}
            transition={{ duration: 1.4, ease: 'easeOut', delay: 0.15 }}
          />
        )
      })}
    </>
  )
}

function Content({ o }: { o: Overlay }) {
  if (o.kind === 'levelUp') {
    return (
      <>
        <Rays color="#60a5fa" />
        <Burst color="#93c5fd" />
        <motion.div
          initial={{ scale: 2.4, opacity: 0, letterSpacing: '0.6em' }}
          animate={{ scale: 1, opacity: 1, letterSpacing: '0.14em' }}
          transition={{ duration: 0.6, ease: [0.2, 0.9, 0.2, 1] }}
          className="display glow"
          style={{ fontSize: 'clamp(44px, 12vw, 86px)', fontWeight: 900, color: '#e0f2fe', textAlign: 'center' }}
        >
          LEVEL UP!
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="caps glow"
          style={{ fontSize: 22, textAlign: 'center', marginTop: 8 }}
        >
          Level {o.level}
        </motion.div>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9 }} className="muted center" style={{ marginTop: 8 }}>
          +5 Ability Points · HP and MP fully restored
        </motion.div>
      </>
    )
  }
  if (o.kind === 'rankUp') {
    const color = RANKS.find((r) => r.rank === o.rank)?.color ?? '#fde68a'
    return (
      <>
        <Rays color="#fbbf24" />
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="caps gold-text center" style={{ fontSize: 18 }}>
          Hunter Rank Reassessed
        </motion.div>
        <motion.div
          initial={{ scale: 3, opacity: 0, rotate: -20 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 120, damping: 12, delay: 0.2 }}
          className="display center"
          style={{
            fontSize: o.rank.length > 1 ? 64 : 140,
            fontWeight: 900,
            color,
            textShadow: '0 0 20px #f59e0b, 0 0 60px #d97706',
          }}
        >
          {o.rank}
        </motion.div>
        <div className="caps center gold-text">Rank</div>
      </>
    )
  }
  return (
    <>
      <Rays color="#a855f7" />
      <motion.div initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1 }} style={{ display: 'grid', placeItems: 'center' }}>
        <Figure art="hunter" variant="shadow" aura="#a855f7" size={170} />
      </motion.div>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="caps purple-text center" style={{ fontSize: 16 }}>
        Job Change Complete
      </motion.div>
      <motion.div
        initial={{ opacity: 0, letterSpacing: '0.8em' }}
        animate={{ opacity: 1, letterSpacing: '0.12em' }}
        transition={{ delay: 0.8, duration: 0.8 }}
        className="display center"
        style={{ fontSize: 'clamp(30px, 9vw, 54px)', fontWeight: 900, color: '#f3e8ff', textShadow: '0 0 14px #a855f7, 0 0 40px #7c3aed' }}
      >
        {o.job}
      </motion.div>
    </>
  )
}

export function Overlays() {
  const overlays = useStore((s) => s.overlays)
  const shift = useStore((s) => s.shiftOverlay)
  const current = overlays[0]
  useEffect(() => {
    if (!current) return
    const id = setTimeout(shift, current.kind === 'jobChange' ? 5200 : 3400)
    return () => clearTimeout(id)
  }, [current, shift])

  return (
    <AnimatePresence>
      {current && (
        <motion.div
          key={JSON.stringify(current)}
          className="overlay"
          style={{ overflow: 'hidden' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={shift}
        >
          <div style={{ position: 'relative', display: 'grid', placeItems: 'center' }}>
            <Content o={current} />
            <div className="dim small center" style={{ marginTop: 24 }}>
              Tap to continue
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
