import { motion } from 'framer-motion'
import { useState } from 'react'
import { sfx } from '../audio/sfx'
import { Segmented, SystemWindow } from '../components/ui'
import { ITEMS, type ItemDef } from '../game/data'
import { usePlayer, useStore } from '../game/store'
import type { ItemId } from '../game/types'

const RARITY_COLOR: Record<ItemDef['rarity'], string> = {
  Common: '#94a3b8',
  Uncommon: '#4ade80',
  Rare: '#60a5fa',
  Epic: '#c084fc',
  Legendary: '#fbbf24',
}

function ItemIcon({ item, size = 48 }: { item: ItemDef; size?: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        flexShrink: 0,
        display: 'grid',
        placeItems: 'center',
        fontSize: size * 0.5,
        color: item.color,
        border: `1px solid ${RARITY_COLOR[item.rarity]}`,
        background: `radial-gradient(circle, ${item.color}33, rgba(3,10,25,0.9) 70%)`,
        boxShadow: `0 0 12px -2px ${item.color}, inset 0 0 10px -4px ${item.color}`,
        textShadow: `0 0 10px ${item.color}`,
      }}
    >
      {item.glyph}
    </div>
  )
}

export function Inventory() {
  const data = usePlayer()
  const buy = useStore((s) => s.buy)
  const use = useStore((s) => s.use)
  const [tab, setTab] = useState<'bag' | 'shop'>('bag')
  const owned = (Object.keys(ITEMS) as ItemId[]).filter((id) => (data.inventory[id] ?? 0) > 0)
  const shop = (Object.values(ITEMS) as ItemDef[]).filter((i) => i.price !== null)

  return (
    <SystemWindow title={tab === 'bag' ? 'Inventory' : 'Shop'} bang={false}>
      <Segmented
        value={tab}
        onChange={setTab}
        options={[
          { value: 'bag', label: 'Inventory' },
          { value: 'shop', label: 'Shop' },
        ]}
      />
      <div className="row between" style={{ margin: '12px 0' }}>
        <span className="caps small muted">Gold</span>
        <span className="display gold-text" style={{ fontSize: 22 }}>
          ◈ {Math.floor(data.gold).toLocaleString()}
        </span>
      </div>

      {tab === 'bag' &&
        (owned.length === 0 ? (
          <p className="center muted">Your inventory is empty. Clear Gates and quests to earn items.</p>
        ) : (
          owned.map((id, i) => {
            const item = ITEMS[id]
            const passive = id === 'dungeonKey' || id === 'holyWater'
            return (
              <motion.div key={id} className="list-item" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}>
                <ItemIcon item={item} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="row" style={{ gap: 8 }}>
                    <span style={{ fontWeight: 700 }}>{item.name}</span>
                    <span className="muted">×{data.inventory[id]}</span>
                  </div>
                  <div className="small" style={{ color: RARITY_COLOR[item.rarity] }}>
                    {item.rarity}
                  </div>
                  <div className="small muted">{item.description}</div>
                </div>
                {!passive && (
                  <button
                    className="btn small"
                    onClick={() => {
                      sfx.click()
                      use(id)
                    }}
                  >
                    {id === 'randomBox' ? 'Open' : 'Use'}
                  </button>
                )}
              </motion.div>
            )
          })
        ))}

      {tab === 'shop' &&
        shop.map((item, i) => {
          const afford = data.gold >= (item.price ?? Infinity)
          return (
            <motion.div key={item.id} className="list-item" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}>
              <ItemIcon item={item} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700 }}>{item.name}</div>
                <div className="small muted">{item.description}</div>
                <div className="small dim">Owned: {data.inventory[item.id] ?? 0}</div>
              </div>
              <button className="btn small gold" disabled={!afford} onClick={() => buy(item.id)}>
                ◈ {item.price}
              </button>
            </motion.div>
          )
        })}
    </SystemWindow>
  )
}
