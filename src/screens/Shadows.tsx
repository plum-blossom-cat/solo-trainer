import { AnimatePresence, motion } from 'framer-motion'
import { useState } from 'react'
import { Figure } from '../art/Figure'
import { SystemWindow } from '../components/ui'
import { DUNGEONS, MAX_STACKED_SOLDIERS, SHADOWS, type ShadowDef } from '../game/data'
import { JOB_CHANGE_LEVEL } from '../game/engine'
import { usePlayer } from '../game/store'
import type { ShadowId } from '../game/types'

const GRADE_COLOR: Record<string, string> = {
  Normal: '#94a3b8',
  Elite: '#60a5fa',
  Knight: '#f87171',
  'Elite Knight': '#fb923c',
  Commander: '#f472b6',
  Marshal: '#c084fc',
  'Grand Marshal': '#fbbf24',
}

export function Shadows() {
  const data = usePlayer()
  const [selected, setSelected] = useState<ShadowDef | null>(null)
  const owned = (id: ShadowId) => data.shadows.filter((s) => s.type === id)
  const named = (Object.values(SHADOWS) as ShadowDef[]).filter((s) => s.unique)
  const soldiers = owned('soldier')

  if (data.job === 'None') {
    return (
      <SystemWindow title="Shadow Army" tone="purple">
        <div style={{ display: 'grid', placeItems: 'center', opacity: 0.6 }}>
          <Figure art="soldier" variant="shadow" size={150} />
        </div>
        <p className="center">
          You do not yet possess the power to command the dead.
        </p>
        <p className="center small muted">
          Reach Level {JOB_CHANGE_LEVEL} and clear the Job Change Gate (Hall of Knights) to awaken as a Necromancer and unlock Shadow Extraction.
        </p>
      </SystemWindow>
    )
  }

  return (
    <>
      <SystemWindow title="Shadow Army" tone="purple" bang={false}>
        <div className="grid-3 center">
          <div>
            <div className="display purple-text" style={{ fontSize: 28, fontWeight: 900 }}>
              {data.shadows.length}
            </div>
            <div className="small muted caps">Shadows</div>
          </div>
          <div>
            <div className="display purple-text" style={{ fontSize: 28, fontWeight: 900 }}>
              {new Set(data.shadows.filter((s) => SHADOWS[s.type].unique).map((s) => s.type)).size}/{named.length}
            </div>
            <div className="small muted caps">Named</div>
          </div>
          <div>
            <div className="display purple-text" style={{ fontSize: 28, fontWeight: 900 }}>
              {Math.min(soldiers.length, MAX_STACKED_SOLDIERS)}%
            </div>
            <div className="small muted caps">Legion dmg</div>
          </div>
        </div>
      </SystemWindow>

      <div className="grid-2">
        {named.map((s, i) => {
          const has = owned(s.id)[0]
          const source = DUNGEONS.find((d) => d.extraction === s.id)
          return (
            <motion.button
              key={s.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="sys purple"
              style={{ margin: 0, padding: 10, cursor: has ? 'pointer' : 'default', textAlign: 'center' }}
              onClick={() => has && setSelected(s)}
            >
              <div style={{ display: 'grid', placeItems: 'center', height: 150, filter: has ? undefined : 'brightness(0.15) grayscale(1)' }}>
                <Figure art={s.art} variant="shadow" aura={s.aura} size={120} animate={!!has} />
              </div>
              <div style={{ fontWeight: 700, fontSize: 17 }} className={has ? 'purple-text' : 'dim'}>
                {has ? s.name : '???'}
              </div>
              <div className="small" style={{ color: has ? GRADE_COLOR[s.grade] : 'var(--dim)' }}>
                {has ? `${s.grade} · Lv ${has.level}` : source ? `${source.name}` : ''}
              </div>
            </motion.button>
          )
        })}
      </div>

      <SystemWindow title="Shadow Soldiers" tone="purple" bang={false}>
        {soldiers.length === 0 ? (
          <p className="center small muted" style={{ margin: 0 }}>
            Extract nameless soldiers from the Goblin Den, Kasaka's Nest, the Demon King's Castle and Instant Dungeons. Each grants +1% Gate damage (up to {MAX_STACKED_SOLDIERS}).
          </p>
        ) : (
          <div className="row wrap" style={{ justifyContent: 'center', gap: 0 }}>
            {soldiers.slice(0, 30).map((s) => (
              <div key={s.uid} title={s.name} style={{ marginInline: -14 }}>
                <Figure art="soldier" variant="shadow" size={64} animate={false} />
              </div>
            ))}
            {soldiers.length > 30 && <div className="small muted">+{soldiers.length - 30}</div>}
          </div>
        )}
      </SystemWindow>

      <AnimatePresence>
        {selected && (
          <motion.div className="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelected(null)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div style={{ display: 'grid', placeItems: 'center', marginBottom: -20 }}>
                <Figure art={selected.art} variant="shadow" aura={selected.aura} size={220} />
              </div>
              <SystemWindow title={selected.name} tone="purple" bang={false}>
                <div className="center" style={{ color: GRADE_COLOR[selected.grade], fontWeight: 700 }}>
                  {selected.grade}
                </div>
                <p className="center" style={{ fontStyle: 'italic' }}>
                  “{selected.lore}”
                </p>
                <div className="list-item">
                  <span className="caps small muted">Army bonus</span>
                  <span style={{ marginLeft: 'auto' }} className="purple-text">
                    {selected.bonusText}
                  </span>
                </div>
                <button className="btn purple block" style={{ marginTop: 12 }} onClick={() => setSelected(null)}>
                  Return to the shadows
                </button>
              </SystemWindow>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
