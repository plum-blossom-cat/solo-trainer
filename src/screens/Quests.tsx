import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { Bar, SystemWindow } from '../components/ui'
import { IconCheck } from '../components/icons'
import { DAILY_BONUS_SCALE, EXERCISES, formatAmount } from '../game/data'
import { dayKey, formatCountdown, msUntilMidnight } from '../game/date'
import { dailyTargets, isRestDay, JOB_CHANGE_LEVEL, weeklyGoals, weeklyReward } from '../game/engine'
import { usePlayer, useStore } from '../game/store'
import type { DailyTargets } from '../game/types'

function useNow(interval = 1000) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), interval)
    return () => clearInterval(id)
  }, [interval])
  return now
}

const DAILY_ORDER: (keyof DailyTargets)[] = ['pushup', 'situp', 'squat', 'run']

export function Quests() {
  const data = usePlayer()
  const claim = useStore((s) => s.claimDaily)
  const claimWeekly = useStore((s) => s.claimWeekly)
  const startTraining = useStore((s) => s.startTraining)
  const navigate = useStore((s) => s.navigate)
  const now = useNow()
  const targets = dailyTargets(data)
  const { daily } = data
  const em = data.emergency
  const left = msUntilMidnight(now)
  const restDay = isRestDay(data, dayKey(now))
  const goals = weeklyGoals(data, now)
  const weeklyDone = goals.every((g) => g.progress >= g.target)
  const weekly = weeklyReward(data)

  return (
    <>
      {em && (
        <SystemWindow title={em.status === 'active' ? 'Emergency Quest' : em.status === 'complete' ? 'Quest Cleared' : 'Quest Failed'} tone={em.status === 'complete' ? 'blue' : 'red'}>
          <div className="center" style={{ fontWeight: 700, fontSize: 18 }}>
            {em.title}
          </div>
          <p className="center muted small" style={{ margin: '4px 0 12px' }}>
            {em.description}
          </p>
          <Bar
            kind={em.status === 'complete' ? 'done' : 'hp'}
            thick
            value={em.progress}
            max={em.target}
            label={EXERCISES[em.exercise].name}
            right={`${formatAmount(em.exercise, em.progress)} / ${formatAmount(em.exercise, em.target)}`}
          />
          {em.status === 'active' && (
            <>
              <div className="row between" style={{ marginTop: 12 }}>
                <span className="small muted">Time limit</span>
                <span className="display warn-text" style={{ fontSize: 22 }}>
                  {formatCountdown(em.deadline - now)}
                </span>
              </div>
              <div className="small muted" style={{ margin: '6px 0 12px' }}>
                Reward: {em.rewardXp} XP · {em.rewardGold} Gold &nbsp;|&nbsp; Failure: -{Math.round(em.penaltyHp * 100)}% HP
              </div>
              <button
                className="btn red block"
                onClick={() => startTraining({ exercise: em.exercise, target: em.target - em.progress, label: em.title })}
              >
                Accept the challenge
              </button>
            </>
          )}
        </SystemWindow>
      )}

      <SystemWindow title="Quest Info" delay={em ? 0.1 : 0}>
        <div className="center caps" style={{ fontSize: 14, color: 'var(--cyan)' }}>
          [Daily Quest: Preparations to become powerful]
        </div>
        <div className="center caps small" style={{ margin: '10px 0 14px', letterSpacing: '0.3em' }}>
          Goals
        </div>

        <div className="stack" style={{ gap: 14 }}>
          {DAILY_ORDER.filter((k) => targets[k] > 0).map((k, i) => {
            const done = daily.progress[k] >= targets[k]
            return (
              <motion.div key={k} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 + i * 0.07 }}>
                <div className="row between">
                  <span style={{ fontWeight: 600, fontSize: 17 }}>{EXERCISES[k].name}</span>
                  <span className="row" style={{ gap: 8 }}>
                    <span className={done ? 'glow' : 'muted'} style={{ fontVariantNumeric: 'tabular-nums' }}>
                      [{formatAmount(k, Math.min(daily.progress[k], targets[k]))}/{formatAmount(k, targets[k])}]
                    </span>
                    {done ? (
                      <span style={{ color: 'var(--green)', display: 'grid' }}>
                        <IconCheck width={20} height={20} />
                      </span>
                    ) : (
                      <button
                        className="btn small ghost"
                        onClick={() =>
                          startTraining({ exercise: k, target: targets[k] - daily.progress[k], label: 'Daily Quest' })
                        }
                      >
                        Go
                      </button>
                    )}
                  </span>
                </div>
                <div style={{ marginTop: 6 }}>
                  <Bar kind={done ? 'done' : ''} value={daily.progress[k]} max={targets[k]} />
                </div>
              </motion.div>
            )
          })}
        </div>

        <div className="divider" />

        {daily.completed ? (
          daily.rewardClaimed ? (
            <div className="center glow caps" style={{ padding: '6px 0' }}>
              Quest complete. Rewards received.
            </div>
          ) : (
            <div className="stack">
              <div className="center caps glow">Quest complete!</div>
              <div className="small muted center">
                Rewards: Full Recovery · +3 Ability Points · +{Math.round((100 + 15 * data.level) * DAILY_BONUS_SCALE[data.difficulty])} XP · Gold · Random Box
              </div>
              <button className="btn gold block pulse" onClick={claim}>
                Claim rewards
              </button>
            </div>
          )
        ) : (
          <>
            <div className="row between">
              <span className="small muted caps">Time remaining</span>
              <span className="display glow" style={{ fontSize: 22, fontVariantNumeric: 'tabular-nums' }}>
                {formatCountdown(left)}
              </span>
            </div>
            {restDay ? (
              <p className="small center" style={{ margin: '12px 0 0', color: 'var(--green)' }}>
                Rest day. Recovery is part of training: today's quest is optional and carries no penalty.
              </p>
            ) : (
              <p className="small warn-text center" style={{ margin: '12px 0 0' }}>
                WARNING: Failure to complete the daily quest will result in an appropriate <b>penalty</b>.
              </p>
            )}
          </>
        )}
      </SystemWindow>

      <SystemWindow title="Weekly Quest" bang={false} delay={0.12}>
        <div className="center caps small" style={{ color: 'var(--cyan)', marginBottom: 12 }}>
          [Weekly Quest: Forge an unbreakable body]
        </div>
        <div className="stack" style={{ gap: 12 }}>
          {goals.map((g) => {
            const done = g.progress >= g.target
            const shown = Math.min(g.progress, g.target)
            const ratio = g.exercise ? `${formatAmount(g.exercise, shown)}/${formatAmount(g.exercise, g.target)}` : `${shown}/${g.target} days`
            return (
              <div key={g.label}>
                <div className="row between">
                  <span style={{ fontWeight: 600 }}>{g.label}</span>
                  <span className="row" style={{ gap: 8 }}>
                    <span className={done ? 'glow' : 'muted'}>
                      [{ratio}]
                    </span>
                    {!done && g.exercise && (
                      <button className="btn small ghost" onClick={() => startTraining({ exercise: g.exercise!, target: g.target - g.progress, label: 'Weekly Quest' })}>
                        Go
                      </button>
                    )}
                  </span>
                </div>
                <div style={{ marginTop: 6 }}>
                  <Bar kind={done ? 'done' : ''} value={g.progress} max={g.target} />
                </div>
              </div>
            )
          })}
        </div>
        <div className="divider" />
        {data.weekly.claimed ? (
          <div className="center glow caps">Weekly rewards received. A new quest arrives on Monday.</div>
        ) : weeklyDone ? (
          <button className="btn gold block pulse" onClick={claimWeekly}>
            Claim weekly rewards
          </button>
        ) : (
          <div className="small muted center">
            Rewards: +{weekly.xp} XP · {weekly.gold} Gold · Instant Dungeon Key. Resets every Monday.
          </div>
        )}
      </SystemWindow>

      <SystemWindow title="Streak" bang={false} delay={0.15}>
        <div className="grid-3 center">
          <div>
            <div className="display glow" style={{ fontSize: 30, fontWeight: 900 }}>
              {data.streak.current}
            </div>
            <div className="small muted caps">Current</div>
          </div>
          <div>
            <div className="display gold-text" style={{ fontSize: 30, fontWeight: 900 }}>
              {data.streak.best}
            </div>
            <div className="small muted caps">Best</div>
          </div>
          <div>
            <div className="display warn-text" style={{ fontSize: 30, fontWeight: 900 }}>
              {data.penalty.cleared}
            </div>
            <div className="small muted caps">Penalties</div>
          </div>
        </div>
        <p className="small dim center" style={{ marginBottom: 0 }}>
          Every 7th consecutive day grants +1 PER. Holy Water of Life protects a streak once.
        </p>
      </SystemWindow>

      {data.job === 'None' && (
        <SystemWindow title="Secret Quest" tone="purple" delay={0.2}>
          <div className="center purple-text" style={{ fontWeight: 700, fontSize: 18 }}>
            Job Change Quest
          </div>
          <p className="center small muted">
            {data.level >= JOB_CHANGE_LEVEL
              ? 'The qualifications have been met. Enter the Hall of Knights and defeat its commander to change your Job and unlock Shadow Extraction.'
              : `Reach Level ${JOB_CHANGE_LEVEL} to unlock a hidden quest. Something waits in the shadows.`}
          </p>
          {data.level >= JOB_CHANGE_LEVEL && (
            <button className="btn purple block" onClick={() => navigate('gates')}>
              Go to the Gates
            </button>
          )}
        </SystemWindow>
      )}
    </>
  )
}
