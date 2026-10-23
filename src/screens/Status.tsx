import { motion } from 'framer-motion'
import { useState } from 'react'
import { Figure } from '../art/Figure'
import { sfx } from '../audio/sfx'
import { Bar, CountUp, RankBadge, Segmented, SystemWindow } from '../components/ui'
import { IconLock } from '../components/icons'
import { SKILLS, STAT_KEYS, STATS, TITLES, EXERCISES } from '../game/data'
import {
  computeBonuses,
  critChance,
  damagePerUnit,
  maxHp,
  maxMp,
  nextRank,
  rankFor,
  unlockedSkills,
  xpToNext,
} from '../game/engine'
import { usePlayer, useStore } from '../game/store'
import type { StatKey } from '../game/types'

export function Status() {
  const data = usePlayer()
  const allocate = useStore((s) => s.allocate)
  const equipTitle = useStore((s) => s.equipTitle)
  const [tab, setTab] = useState<'skills' | 'titles' | 'effects'>('skills')
  const b = computeBonuses(data)
  const r = rankFor(data.level)
  const nr = nextRank(data.level)
  const hpMax = maxHp(data, b)
  const mpMax = maxMp(data, b)
  const title = TITLES.find((t) => t.id === data.title)
  const unlocked = new Set(unlockedSkills(data).map((s) => s.id))

  const statFeeders = (k: StatKey) =>
    Object.values(EXERCISES)
      .filter((e) => e.stat === k)
      .map((e) => e.name)
      .join(', ')

  return (
    <>
      <SystemWindow title="Status">
        <div className="row" style={{ alignItems: 'flex-start', gap: 4 }}>
          <div style={{ width: 120, flexShrink: 0, marginLeft: -10, marginTop: -6 }}>
            <Figure art="hunter" variant={data.job === 'None' ? 'hunter' : 'shadow'} aura={data.job === 'None' ? undefined : '#7c3aed'} size={120} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }} className="stack">
            <div className="row between">
              <div>
                <div className="caps muted small">Level</div>
                <div className="display glow" style={{ fontSize: 44, fontWeight: 900, lineHeight: 1 }}>
                  <CountUp value={data.level} />
                </div>
              </div>
              <RankBadge rank={r.rank === 'National' ? 'NAT' : r.rank} color={r.color} size={50} />
            </div>
            <div className="small" style={{ lineHeight: 1.6 }}>
              <div>
                <span className="muted caps" style={{ fontSize: 11 }}>Name </span> {data.name}
              </div>
              <div>
                <span className="muted caps" style={{ fontSize: 11 }}>Job </span>
                <span className={data.job !== 'None' ? 'purple-text' : ''}>{data.job}</span>
              </div>
              <div>
                <span className="muted caps" style={{ fontSize: 11 }}>Title </span>
                <span className="gold-text">{title?.name ?? 'None'}</span>
              </div>
            </div>
          </div>
        </div>

        <div style={{ marginTop: 12 }}>
          <Bar
            value={data.xp}
            max={xpToNext(data.level)}
            label="EXP"
            right={`${Math.floor(data.xp).toLocaleString()} / ${xpToNext(data.level).toLocaleString()}`}
          />
          {nr && (
            <div className="small dim" style={{ marginTop: 4 }}>
              Rank {nr.rank} at Level {nr.minLevel}
            </div>
          )}
        </div>

        <div className="divider" />

        <div className="stack" style={{ gap: 8 }}>
          <Bar kind="hp" value={data.hp} max={hpMax} label="HP" right={`${Math.floor(data.hp)} / ${hpMax}`} />
          <Bar kind="mp" value={data.mp} max={mpMax} label="MP" right={`${Math.floor(data.mp)} / ${mpMax}`} />
          <Bar kind="fatigue" value={data.fatigue} max={100} label="Fatigue" right={`${Math.floor(data.fatigue)}`} />
        </div>

        <div className="divider" />

        <div className="stack" style={{ gap: 6 }}>
          {STAT_KEYS.map((k, i) => (
            <motion.div
              key={k}
              className="row"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 + i * 0.05 }}
              style={{ gap: 12 }}
            >
              <div style={{ width: 46 }} className="caps glow">
                {STATS[k].label}
              </div>
              <div className="display" style={{ width: 44, fontSize: 22, fontWeight: 700 }}>
                {data.stats[k]}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="small muted" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {STATS[k].effect}
                </div>
                <div className="dim" style={{ fontSize: 11, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  Trained by: {statFeeders(k) || 'Daily streaks'}
                </div>
              </div>
              {data.statPoints > 0 && (
                <button
                  className="btn small"
                  aria-label={`Add point to ${STATS[k].name}`}
                  style={{ minWidth: 40, padding: '4px 8px' }}
                  onClick={() => {
                    sfx.click()
                    allocate(k)
                  }}
                >
                  +
                </button>
              )}
            </motion.div>
          ))}
        </div>

        <div className="row between" style={{ marginTop: 12 }}>
          <span className="caps small muted">Available ability points</span>
          <span className={`display ${data.statPoints > 0 ? 'gold-text pulse' : 'dim'}`} style={{ fontSize: 22, fontWeight: 900 }}>
            {data.statPoints}
          </span>
        </div>
      </SystemWindow>

      <SystemWindow title="Abilities" bang={false} delay={0.1}>
        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            { value: 'skills', label: 'Skills' },
            { value: 'titles', label: 'Titles' },
            { value: 'effects', label: 'Effects' },
          ]}
        />
        <div style={{ marginTop: 12 }}>
          {tab === 'skills' &&
            SKILLS.map((s) => {
              const has = unlocked.has(s.id)
              return (
                <div key={s.id} className="list-item" style={{ opacity: has ? 1 : 0.5 }}>
                  <div style={{ flex: 1 }}>
                    <div className="row" style={{ gap: 8 }}>
                      <span className={has ? 'glow' : ''} style={{ fontWeight: 700 }}>
                        {s.name}
                      </span>
                      <span className="tag" style={{ color: s.kind === 'Active' ? 'var(--cyan)' : 'var(--muted)' }}>
                        {s.kind}
                      </span>
                    </div>
                    <div className="small muted">{s.description}</div>
                  </div>
                  {!has && (
                    <div className="small dim center" style={{ width: 64 }}>
                      <IconLock width={16} height={16} />
                      <div>
                        Lv {s.level}
                        {s.requiresJob ? '+Job' : ''}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}

          {tab === 'titles' &&
            TITLES.map((t) => {
              const has = data.titles.includes(t.id)
              const on = data.title === t.id
              return (
                <div key={t.id} className="list-item" style={{ opacity: has ? 1 : 0.45 }}>
                  <div style={{ flex: 1 }}>
                    <div className={on ? 'gold-text' : ''} style={{ fontWeight: 700 }}>
                      {has ? t.name : '???'}
                    </div>
                    <div className="small muted">{t.condition}</div>
                    <div className="small" style={{ color: 'var(--cyan)' }}>
                      {t.bonusText}
                    </div>
                  </div>
                  {has && (
                    <button className={`btn small ${on ? 'gold' : 'ghost'}`} onClick={() => equipTitle(on ? null : t.id)}>
                      {on ? 'Equipped' : 'Equip'}
                    </button>
                  )}
                </div>
              )
            })}

          {tab === 'effects' && (
            <div className="grid-2">
              {[
                ['Damage / rep', damagePerUnit(data, b).toFixed(2)],
                ['Crit chance', `${(critChance(data, b) * 100).toFixed(1)}%`],
                ['XP bonus', `+${b.xpPct}%`],
                ['Run XP bonus', `+${b.runXpPct}%`],
                ['Gold bonus', `+${(data.stats.per + b.goldPct).toFixed(0)}%`],
                ['Gate damage', `+${b.damagePct}%`],
                ['Extraction', `+${b.extractPct + Math.round(data.stats.int * 0.3)}%`],
                ['Fatigue resist', `${Math.min(80, b.fatigueReductionPct + data.stats.vit * 0.2).toFixed(0)}%`],
              ].map(([k, v]) => (
                <div key={k} className="list-item" style={{ margin: 0, flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
                  <span className="small muted caps" style={{ fontSize: 11 }}>
                    {k}
                  </span>
                  <span className="display glow" style={{ fontSize: 20 }}>
                    {v}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </SystemWindow>
    </>
  )
}
