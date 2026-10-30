import { describe, expect, it } from 'vitest'
import { DUNGEONS } from '../game/data'
import { addDays, dayKey, weekStart } from '../game/date'
import {
  attemptExtraction,
  bmi,
  claimDailyReward,
  claimWeekly,
  deleteSession,
  emptyLog,
  kcalFor,
  logWeight,
  personalRecords,
  refreshDaily,
  weeklyGoals,
  completeDungeon,
  completePenalty,
  createPlayer,
  dailyTargets,
  logWork,
  maxHp,
  maybeIssueEmergency,
  tick,
  useItem,
  xpToNext,
} from '../game/engine'
import type { PlayerData } from '../game/types'

const NOON = new Date(2026, 4, 10, 12, 0, 0).getTime()
const DAY = 86_400_000

function finishDaily(p: PlayerData, now = NOON) {
  const t = dailyTargets(p)
  for (const ex of ['pushup', 'situp', 'squat', 'run'] as const) p = logWork(p, ex, t[ex], now).data
  return p
}

describe('levelling', () => {
  it('xp curve increases', () => {
    expect(xpToNext(1)).toBe(100)
    expect(xpToNext(10)).toBeGreaterThan(xpToNext(9))
  })

  it('levels up with stat points and a full heal', () => {
    let p = createPlayer('Jin', 'normal', NOON)
    p.hp = 10
    const r = logWork(p, 'pushup', 120, NOON)
    p = r.data
    expect(p.level).toBeGreaterThanOrEqual(2)
    expect(p.statPoints).toBe(5 * (p.level - 1))
    expect(p.hp).toBe(maxHp(p))
    expect(r.events.some((e) => e.type === 'levelUp')).toBe(true)
  })

  it('training raises the matching stat automatically', () => {
    const p = logWork(createPlayer('Jin', 'normal', NOON), 'pushup', 100, NOON).data
    expect(p.stats.str).toBe(12)
  })
})

describe('daily quest', () => {
  it('completes, starts a streak, and pays out once', () => {
    let p = finishDaily(createPlayer('Jin', 'beginner', NOON))
    expect(p.daily.completed).toBe(true)
    expect(p.streak.current).toBe(1)
    const gold = p.gold
    const r = claimDailyReward(p, NOON)
    p = r.data
    expect(p.gold).toBeGreaterThan(gold)
    expect(p.daily.rewardClaimed).toBe(true)
    expect(p.fatigue).toBe(0)
    expect(claimDailyReward(p, NOON).data.gold).toBe(p.gold)
  })

  it('Hunter difficulty matches the original quest', () => {
    const t = dailyTargets(createPlayer('Jin', 'hunter'))
    expect(t).toEqual({ pushup: 100, situp: 100, squat: 100, run: 10000 })
  })

  it('missing a day sends you to the Penalty Zone and breaks the streak', () => {
    let p = finishDaily(createPlayer('Jin', 'beginner', NOON))
    p = tick(p, NOON + DAY).data // day 2, not done
    expect(p.penalty.active).toBe(false)
    const r = tick(p, NOON + 2 * DAY)
    expect(r.data.penalty.active).toBe(true)
    expect(r.data.streak.current).toBe(0)
    expect(r.events.some((e) => e.type === 'penalty')).toBe(true)
    const cleared = completePenalty(r.data, NOON + 2 * DAY).data
    expect(cleared.penalty.active).toBe(false)
    expect(cleared.titles).toContain('adversity')
  })

  it('the awakening day never triggers a penalty', () => {
    const p = createPlayer('Jin', 'beginner', NOON)
    expect(tick(p, NOON + DAY).data.penalty.active).toBe(false)
  })

  it('Holy Water of Life averts the penalty', () => {
    let p = tick(createPlayer('Jin', 'beginner', NOON), NOON + DAY).data
    p.inventory.holyWater = 1
    const r = tick(p, NOON + 2 * DAY)
    expect(r.data.penalty.active).toBe(false)
    expect(r.data.inventory.holyWater).toBe(0)
  })

  it('consecutive days build the streak', () => {
    let p = createPlayer('Jin', 'beginner', NOON)
    for (let d = 0; d < 7; d++) {
      p = tick(p, NOON + d * DAY).data
      p = finishDaily(p, NOON + d * DAY)
    }
    expect(p.streak.current).toBe(7)
    expect(p.titles).toContain('persistent')
    expect(p.daily.date).toBe(addDays(dayKey(NOON), 6))
  })
})

describe('gates and shadows', () => {
  it('job change unlocks extraction and Igris can be extracted', () => {
    let p = createPlayer('Jin', 'normal', NOON)
    p.level = 8
    const hall = DUNGEONS.find((d) => d.jobChange)!
    p = completeDungeon(p, hall, NOON, () => 0).data
    expect(p.job).toBe('Necromancer')
    expect(p.pendingExtraction?.shadow).toBe('igris')
    p = attemptExtraction(p, () => 0, NOON).data
    expect(p.shadows.map((s) => s.type)).toEqual(['igris'])
    expect(p.pendingExtraction).toBeNull()
  })

  it('extraction fails after three attempts', () => {
    let p = createPlayer('Jin', 'normal', NOON)
    p.job = 'Necromancer'
    p.mp = 1000
    p = completeDungeon(p, DUNGEONS[1], NOON, () => 0.99).data
    for (let i = 0; i < 3; i++) p = attemptExtraction(p, () => 0.99, NOON).data
    expect(p.pendingExtraction).toBeNull()
    expect(p.shadows).toHaveLength(0)
  })

  it('no extraction before the job change', () => {
    const p = completeDungeon(createPlayer('Jin', 'normal', NOON), DUNGEONS[0], NOON, () => 0).data
    expect(p.pendingExtraction).toBeNull()
  })
})

describe('emergency quests and items', () => {
  it('issues at most one emergency quest per day and pays out on completion', () => {
    let p = createPlayer('Jin', 'normal', NOON - DAY)
    const r = maybeIssueEmergency(p, NOON, () => 0)
    p = r.data
    expect(p.emergency?.status).toBe('active')
    expect(maybeIssueEmergency(p, NOON + 1000, () => 0).data.emergency?.id).toBe(p.emergency?.id)
    const em = p.emergency!
    const done = logWork(p, em.exercise, em.target, NOON + 60_000)
    expect(done.data.emergency?.status).toBe('complete')
  })

  it('failing an emergency quest costs HP', () => {
    let p = maybeIssueEmergency(createPlayer('Jin', 'normal', NOON - DAY), NOON, () => 0).data
    const hp = p.hp
    p = tick(p, NOON + 3 * 3_600_000).data
    expect(p.emergency?.status).toBe('failed')
    expect(p.hp).toBeLessThan(hp)
  })

  it('random box yields something', () => {
    const p = createPlayer('Jin', 'normal', NOON)
    const r = useItem(p, 'randomBox', () => 0)
    expect(r.data.inventory.randomBox).toBe(0)
    expect(r.data.gold).toBeGreaterThan(0)
  })
})

describe('fitness tracking', () => {
  it('groups reps into sessions and removing one reverses its effects', () => {
    let p = createPlayer('Jin', 'normal', NOON)
    for (let i = 0; i < 10; i++) p = logWork(p, 'pushup', 1, NOON + i * 5000).data
    p = logWork(p, 'squat', 5, NOON + 60_000).data
    expect(p.history).toHaveLength(2)
    expect(p.history[0]).toMatchObject({ exercise: 'pushup', amount: 10 })
    const r = deleteSession(p, p.history[0].id)
    expect(r.data.history).toHaveLength(1)
    expect(r.data.daily.progress.pushup).toBe(0)
    expect(r.data.logs[dayKey(NOON)].pushup).toBe(0)
  })

  it('undoing a session un-completes the daily quest and restores the streak', () => {
    let p = finishDaily(createPlayer('Jin', 'beginner', NOON))
    expect(p.streak.current).toBe(1)
    const pushups = p.history.find((e) => e.exercise === 'pushup')!
    p = deleteSession(p, pushups.id).data
    expect(p.daily.completed).toBe(false)
    expect(p.streak.current).toBe(0)
  })

  it('refuses to undo a session once the daily reward is claimed', () => {
    let p = claimDailyReward(finishDaily(createPlayer('Jin', 'beginner', NOON)), NOON).data
    const r = deleteSession(p, p.history[0].id)
    expect(r.data).toBe(p)
    expect(r.events[0]).toMatchObject({ type: 'message' })
  })

  it('a target of 0 drops that exercise from the daily quest', () => {
    let p = createPlayer('Jin', 'custom', NOON)
    p.customTargets = { pushup: 10, situp: 0, squat: 0, run: 0 }
    p = logWork(p, 'pushup', 10, NOON).data
    expect(p.daily.completed).toBe(true)
  })

  it('lowering the targets completes the quest on the spot', () => {
    let p = logWork(createPlayer('Jin', 'hunter', NOON), 'pushup', 25, NOON).data
    p = { ...p, difficulty: 'custom', customTargets: { pushup: 20, situp: 0, squat: 0, run: 0 } }
    expect(refreshDaily(p, NOON).data.daily.completed).toBe(true)
  })

  it('rest days carry no penalty and do not break the streak', () => {
    // NOON is a Sunday (2026-05-10); make Monday a rest day.
    let p = finishDaily(createPlayer('Jin', 'beginner', NOON - DAY), NOON - DAY)
    p.settings.restDays = [1]
    p = tick(p, NOON).data
    p = finishDaily(p, NOON) // Sunday
    p = tick(p, NOON + DAY).data // Monday: rest
    const tuesday = tick(p, NOON + 2 * DAY)
    expect(tuesday.data.penalty.active).toBe(false)
    const done = finishDaily(tuesday.data, NOON + 2 * DAY)
    expect(done.streak.current).toBe(3)
  })

  it('days skipped without opening the app still count as missed', () => {
    let p = finishDaily(createPlayer('Jin', 'beginner', NOON - DAY), NOON - DAY)
    p = tick(p, NOON).data
    p = finishDaily(p, NOON)
    expect(tick(p, NOON + 3 * DAY).data.penalty.active).toBe(true)
  })

  it('weekly quest pays out once when every goal is met', () => {
    let p = createPlayer('Jin', 'beginner', NOON)
    const goals = weeklyGoals(p, NOON)
    for (const g of goals) if (g.exercise) p = logWork(p, g.exercise, g.target, NOON).data
    for (let d = 0; d < 5; d++) p.logs[addDays(weekStart(dayKey(NOON)), d)] = { ...emptyLog(addDays(weekStart(dayKey(NOON)), d)), dailyComplete: true }
    const r = claimWeekly(p, NOON)
    expect(r.data.weekly.claimed).toBe(true)
    expect(r.data.inventory.dungeonKey).toBe(1)
    expect(claimWeekly(r.data, NOON).data).toBe(r.data)
  })

  it('tracks body weight, BMI and calories', () => {
    let p = createPlayer('Jin', 'normal', NOON)
    p = logWeight(p, 80, NOON)
    p = logWeight(p, 79.5, NOON)
    expect(p.body.weights).toHaveLength(1)
    p = { ...p, body: { ...p.body, heightCm: 180 } }
    expect(bmi(p)).toBeCloseTo(24.5, 1)
    expect(kcalFor('run', 1000, 70)).toBeCloseTo(73.5, 1)
    expect(kcalFor('pushup', 10, 140)).toBeCloseTo(10, 5)
  })

  it('personal records find the best session and the best day', () => {
    let p = createPlayer('Jin', 'normal', NOON)
    p = logWork(p, 'pushup', 30, NOON).data
    p = logWork(p, 'pushup', 10, NOON + 30 * 60_000).data
    const pr = personalRecords(p).find((r) => r.exercise === 'pushup')!
    expect(pr.bestSession?.amount).toBe(30)
    expect(pr.bestDay?.amount).toBe(40)
  })
})
