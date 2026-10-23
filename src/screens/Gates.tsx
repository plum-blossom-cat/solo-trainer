import { AnimatePresence, motion } from 'framer-motion'
import { useState } from 'react'
import { Figure } from '../art/Figure'
import { sfx } from '../audio/sfx'
import { IconLock } from '../components/icons'
import { RankBadge, SystemWindow } from '../components/ui'
import { DIFFICULTY_SCALE, DUNGEONS, EXERCISES, ITEMS, RANKS, SHADOWS, formatAmount, instantDungeon, type DungeonDef } from '../game/data'
import { canEnter } from '../game/engine'
import { usePlayer, useStore } from '../game/store'

export function Portal({ color, size = 84, spin = 10 }: { color: string; size?: number; spin?: number }) {
  return (
    <div style={{ position: 'relative', width: size, height: size * 1.25, flexShrink: 0 }}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
          background: `conic-gradient(from 0deg, ${color}, #0b1026, ${color}aa, #020409, ${color})`,
          animation: `spin ${spin}s linear infinite`,
          filter: 'blur(2px)',
          boxShadow: `0 0 24px ${color}, inset 0 0 20px #000`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: '14%',
          borderRadius: '50%',
          background: `radial-gradient(ellipse at center, #000 30%, ${color}66 70%, transparent 75%)`,
          animation: `spin ${spin * 0.6}s linear infinite reverse`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: '-10%',
          borderRadius: '50%',
          background: `radial-gradient(ellipse, ${color}44, transparent 65%)`,
        }}
        className="pulse"
      />
    </div>
  )
}

export function scaledWaves(d: DungeonDef, difficulty: keyof typeof DIFFICULTY_SCALE) {
  return d.waves.map((w) => ({ ...w, amount: Math.max(5, Math.round(w.amount * DIFFICULTY_SCALE[difficulty])) }))
}

export function Gates() {
  const data = usePlayer()
  const enterGate = useStore((s) => s.enterGate)
  const [confirm, setConfirm] = useState<DungeonDef | null>(null)
  const keys = data.inventory.dungeonKey ?? 0
  const gates = [...(keys > 0 ? [instantDungeon(data.level)] : []), ...DUNGEONS]

  return (
    <>
      <SystemWindow title="Gates" bang={false}>
        <p className="small muted center" style={{ margin: 0 }}>
          Gates have opened across the city. Each monster falls to real reps. Bosses enrage when their timer expires.
          {data.job === 'None' ? ' Shadow Extraction unlocks after the Job Change Quest.' : ' Defeated bosses may be extracted as shadows.'}
        </p>
      </SystemWindow>

      {gates.map((d, i) => {
        const check = canEnter(data, d)
        const locked = data.level < d.minLevel
        const rankColor = RANKS.find((r) => r.rank === d.rank)?.color ?? d.color
        const clears = data.dungeonClears[d.id] ?? 0
        const boss = d.waves[d.waves.length - 1]
        const shadow = d.extraction ? SHADOWS[d.extraction] : null
        const ownedShadow = shadow?.unique && data.shadows.some((s) => s.type === shadow.id)
        return (
          <SystemWindow key={d.id} tone={d.jobChange ? 'purple' : d.requiresKey ? 'gold' : 'blue'} delay={0.05 * i} bang={false}>
            <div className="row" style={{ alignItems: 'flex-start', gap: 14, opacity: locked ? 0.55 : 1 }}>
              {locked ? (
                <div style={{ width: 84, height: 105, display: 'grid', placeItems: 'center', border: '1px dashed var(--line-soft)', borderRadius: '50%' }}>
                  <IconLock width={28} height={28} className="dim" />
                </div>
              ) : (
                <Portal color={d.color} />
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="row between" style={{ alignItems: 'flex-start' }}>
                  <div style={{ fontWeight: 700, fontSize: 18, lineHeight: 1.15 }}>{d.name}</div>
                  <RankBadge rank={d.rank === 'National' ? 'N' : d.rank} color={rankColor} size={34} />
                </div>
                <div className="small muted" style={{ margin: '4px 0 8px' }}>
                  {d.description}
                </div>
                <div className="row wrap" style={{ gap: 6 }}>
                  <span className="tag" style={{ color: 'var(--cyan)' }}>
                    Lv {d.minLevel}+
                  </span>
                  <span className="tag" style={{ color: 'var(--muted)' }}>
                    {d.waves.length} waves
                  </span>
                  <span className="tag" style={{ color: 'var(--red-2)' }}>
                    Boss: {boss.enemy}
                  </span>
                  {shadow && data.job !== 'None' && (
                    <span className="tag" style={{ color: '#c4b5fd' }}>
                      {ownedShadow ? 'Shadow owned' : `Shadow: ${shadow.name}`}
                    </span>
                  )}
                  {clears > 0 && (
                    <span className="tag" style={{ color: 'var(--green)' }}>
                      Cleared ×{clears}
                    </span>
                  )}
                </div>
                <div className="small" style={{ marginTop: 8 }}>
                  <span className="muted">Rewards: </span>
                  {d.xp * (d.requiresKey ? 2 : 1)} XP · {d.gold} Gold
                  {d.drops.length > 0 && ` · ${d.drops.map((x) => ITEMS[x.item].name).join(', ')}`}
                </div>
                <button
                  className={`btn small block ${d.jobChange ? 'purple' : d.requiresKey ? 'gold' : ''}`}
                  style={{ marginTop: 10 }}
                  disabled={!check.ok}
                  onClick={() => {
                    sfx.system()
                    setConfirm(d)
                  }}
                >
                  {check.ok ? (d.requiresKey ? `Use key (${keys})` : 'Enter Gate') : check.reason}
                </button>
              </div>
            </div>
          </SystemWindow>
        )
      })}

      <AnimatePresence>
        {confirm && (
          <motion.div className="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setConfirm(null)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div style={{ display: 'grid', placeItems: 'center', marginBottom: -30 }}>
                <Figure art={confirm.waves[confirm.waves.length - 1].art} size={150} />
              </div>
              <SystemWindow title={confirm.jobChange ? 'Secret Quest' : 'Gate Entry'} tone={confirm.jobChange ? 'purple' : 'blue'}>
                <div className="center" style={{ fontSize: 18, fontWeight: 700 }}>
                  You are about to enter a {confirm.rank}-Rank Gate.
                </div>
                <div className="center muted small" style={{ margin: '6px 0 12px' }}>
                  {confirm.name}
                </div>
                <div className="stack" style={{ gap: 6 }}>
                  {scaledWaves(confirm, data.difficulty).map((w, i) => (
                    <div key={i} className="row between small">
                      <span className={w.boss ? 'warn-text' : ''}>
                        {w.boss ? 'BOSS · ' : `Wave ${i + 1} · `}
                        {w.enemy}
                      </span>
                      <span className="muted">
                        {formatAmount(w.exercise, w.amount)} {EXERCISES[w.exercise].name.toLowerCase()}
                      </span>
                    </div>
                  ))}
                </div>
                <p className="small dim center">Retreating forfeits all rewards. Failing a boss costs 30% HP.</p>
                <div className="grid-2">
                  <button className="btn ghost" onClick={() => setConfirm(null)}>
                    Cancel
                  </button>
                  <button
                    className={`btn ${confirm.jobChange ? 'purple' : ''}`}
                    onClick={() => {
                      enterGate(confirm)
                      setConfirm(null)
                    }}
                  >
                    Enter
                  </button>
                </div>
              </SystemWindow>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
