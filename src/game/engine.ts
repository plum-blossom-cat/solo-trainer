/**
 * The System's rules. Every function here is pure: it takes the current
 * PlayerData and returns the next one plus the events the UI should announce.
 */
import {
  DAILY_BONUS_SCALE,
  DAILY_PRESETS,
  EMERGENCY_TEMPLATES,
  EXERCISES,
  ITEMS,
  MAX_STACKED_SOLDIERS,
  RANKS,
  SHADOWS,
  SKILLS,
  STAT_KEYS,
  TITLES,
  ZERO_BONUSES,
  type Bonuses,
  type DungeonDef,
} from './data'
import { addDays, dayKey, daysBetween, weekStart, weekday } from './date'
import type {
  ActivityEntry,
  DailyState,
  DailyTargets,
  DayLog,
  Difficulty,
  ExerciseId,
  ItemId,
  OwnedShadow,
  PlayerData,
  Rank,
  ShadowGrade,
  StatKey,
} from './types'

export const SAVE_VERSION = 1
export const STAT_POINTS_PER_LEVEL = 5
export const DAILY_STAT_POINTS = 3
export const EXTRACTION_MP_COST = 30
export const EXTRACTION_ATTEMPTS = 3
export const JOB_CHANGE_LEVEL = 8

export type Rng = () => number

export type SystemEvent =
  | { type: 'levelUp'; level: number }
  | { type: 'statUp'; stat: StatKey; amount: number }
  | { type: 'dailyComplete' }
  | { type: 'dailyReward'; xp: number; gold: number }
  | { type: 'title'; id: string }
  | { type: 'item'; item: ItemId; qty: number }
  | { type: 'gold'; amount: number }
  | { type: 'xp'; amount: number }
  | { type: 'emergencyComplete'; title: string }
  | { type: 'emergencyFailed'; title: string; hp: number }
  | { type: 'emergencyIssued'; title: string }
  | { type: 'penalty' }
  | { type: 'penaltyAverted' }
  | { type: 'jobChange'; job: string }
  | { type: 'extraction'; success: boolean; shadow: string; attemptsLeft: number }
  | { type: 'skill'; name: string }
  | { type: 'weeklyComplete' }
  | { type: 'message'; text: string; tone?: 'info' | 'warn' | 'good' }

export interface Result {
  data: PlayerData
  events: SystemEvent[]
}

/* ------------------------------------------------------------- formulas */

export function xpToNext(level: number): number {
  return Math.round(50 * Math.pow(level, 1.4) + 50)
}

export function rankFor(level: number): { rank: Rank; color: string } {
  let current = RANKS[0]
  for (const r of RANKS) if (level >= r.minLevel) current = r
  return { rank: current.rank, color: current.color }
}

export function nextRank(level: number) {
  return RANKS.find((r) => r.minLevel > level) ?? null
}

function addBonus(into: Bonuses, b: Partial<Bonuses>, times = 1) {
  for (const k of Object.keys(b) as (keyof Bonuses)[]) into[k] += (b[k] ?? 0) * times
}

export function unlockedSkills(data: Pick<PlayerData, 'level' | 'job'>) {
  const hasJob = data.job !== 'None'
  return SKILLS.filter((s) => data.level >= s.level && (!s.requiresJob || hasJob))
}

export function computeBonuses(data: PlayerData): Bonuses {
  const b: Bonuses = { ...ZERO_BONUSES }
  for (const s of unlockedSkills(data)) addBonus(b, s.bonus)
  const title = TITLES.find((t) => t.id === data.title)
  if (title) addBonus(b, title.bonus)
  let soldiers = 0
  for (const sh of data.shadows) {
    const def = SHADOWS[sh.type]
    if (!def.unique) {
      if (soldiers >= MAX_STACKED_SOLDIERS) continue
      soldiers++
    }
    addBonus(b, def.bonus)
  }
  return b
}

export function maxHp(data: PlayerData, b = computeBonuses(data)): number {
  return Math.round((100 + data.stats.vit * 10 + data.level * 10) * (1 + b.hpPct / 100))
}

export function maxMp(data: PlayerData, b = computeBonuses(data)): number {
  return Math.round(10 + data.stats.int * 10 + data.level * 2 + b.mpFlat)
}

export function damagePerUnit(data: PlayerData, b = computeBonuses(data)): number {
  return (1 + data.stats.str * 0.02) * (1 + b.damagePct / 100)
}

export function critChance(data: PlayerData, b = computeBonuses(data)): number {
  return Math.min(0.5, data.stats.agi * 0.004 + b.critChance / 100)
}

const GRADE_BASE: Record<ShadowGrade, number> = {
  Normal: 0.7,
  Elite: 0.55,
  Knight: 0.5,
  'Elite Knight': 0.4,
  Commander: 0.35,
  Marshal: 0.3,
  'Grand Marshal': 0.25,
}

export function extractionChance(data: PlayerData, grade: ShadowGrade, b = computeBonuses(data)): number {
  return Math.min(0.95, GRADE_BASE[grade] + data.stats.int * 0.003 + b.extractPct / 100)
}

export function goldMultiplier(data: PlayerData, b = computeBonuses(data)): number {
  return 1 + data.stats.per * 0.01 + b.goldPct / 100
}

export function dailyTargets(data: Pick<PlayerData, 'difficulty' | 'customTargets' | 'scaleWithLevel' | 'level'>): DailyTargets {
  const base = data.difficulty === 'custom' ? data.customTargets : DAILY_PRESETS[data.difficulty]
  const scale = data.scaleWithLevel ? Math.min(2, 1 + Math.floor((data.level - 1) / 10) * 0.1) : 1
  return {
    pushup: Math.round(base.pushup * scale),
    situp: Math.round(base.situp * scale),
    squat: Math.round(base.squat * scale),
    run: Math.round((base.run * scale) / 100) * 100,
  }
}

export const DAILY_KEYS: (keyof DailyTargets)[] = ['pushup', 'situp', 'squat', 'run']

/** A target of 0 removes that exercise from the Daily Quest. */
export function isDailyDone(progress: DailyTargets, targets: DailyTargets): boolean {
  const active = DAILY_KEYS.filter((k) => targets[k] > 0)
  return active.length > 0 && active.every((k) => progress[k] >= targets[k])
}

export function isDailyKey(ex: ExerciseId): ex is keyof DailyTargets {
  return ex === 'pushup' || ex === 'situp' || ex === 'squat' || ex === 'run'
}

export function isRestDay(data: Pick<PlayerData, 'settings'>, key: string): boolean {
  return data.settings.restDays.includes(weekday(key))
}

/** The most recent day before `key` on which the Daily Quest was mandatory. */
export function previousQuestDay(data: Pick<PlayerData, 'settings'>, key: string): string {
  let k = addDays(key, -1)
  for (let i = 0; i < 7 && isRestDay(data, k); i++) k = addDays(k, -1)
  return k
}

/* ---------------------------------------------------------------- setup */

export function emptyDaily(date: string): DailyState {
  return { date, progress: { pushup: 0, situp: 0, squat: 0, run: 0 }, completed: false, rewardClaimed: false }
}

export function emptyLog(date: string): DayLog {
  return {
    date,
    pushup: 0,
    situp: 0,
    squat: 0,
    jumpingJack: 0,
    plank: 0,
    run: 0,
    meditation: 0,
    xp: 0,
    dailyComplete: false,
    dungeons: 0,
  }
}

export function createPlayer(name: string, difficulty: Difficulty, now = Date.now()): PlayerData {
  const today = dayKey(now)
  const data: PlayerData = {
    version: SAVE_VERSION,
    awakened: true,
    name: name.trim() || 'Hunter',
    createdAt: now,
    level: 1,
    xp: 0,
    totalXp: 0,
    gold: 0,
    stats: { str: 10, agi: 10, vit: 10, int: 10, per: 10 },
    statPoints: 0,
    statProgress: { str: 0, agi: 0, vit: 0, int: 0, per: 0 },
    hp: 0,
    mp: 0,
    fatigue: 0,
    lastRegenAt: now,
    job: 'None',
    title: 'awakened',
    titles: ['awakened'],
    inventory: { healingPotion: 1, randomBox: 1 },
    shadows: [],
    pendingExtraction: null,
    daily: emptyDaily(today),
    difficulty,
    customTargets: { pushup: 30, situp: 30, squat: 30, run: 3000 },
    scaleWithLevel: false,
    logs: {},
    streak: { current: 0, best: 0, lastDate: null },
    penalty: { active: false, since: null, cleared: 0 },
    emergency: null,
    // The first day is a grace day: no Emergency Quests until tomorrow.
    lastEmergencyDate: today,
    dungeonClears: {},
    achievements: [],
    settings: {
      sound: true,
      voice: true,
      reduceMotion: false,
      showSkeleton: true,
      restDays: [],
      reminderEnabled: false,
      reminderTime: '19:00',
    },
    history: [],
    body: { heightCm: null, weights: [] },
    weekly: { week: weekStart(today), claimed: false },
    lastReminderDate: null,
  }
  data.hp = maxHp(data)
  data.mp = maxMp(data)
  return data
}

/* -------------------------------------------------------------- helpers */

function clone(data: PlayerData): PlayerData {
  return structuredClone(data)
}

function logFor(data: PlayerData, now: number): DayLog {
  const key = dayKey(now)
  if (!data.logs[key]) data.logs[key] = emptyLog(key)
  return data.logs[key]
}

function grantTitle(data: PlayerData, id: string, events: SystemEvent[]) {
  if (data.titles.includes(id)) return
  data.titles.push(id)
  events.push({ type: 'title', id })
}

function addItem(data: PlayerData, item: ItemId, qty: number, events?: SystemEvent[]) {
  data.inventory[item] = (data.inventory[item] ?? 0) + qty
  if (events) events.push({ type: 'item', item, qty })
}

/** Adds XP (bonus multipliers are applied by the caller) and resolves level-ups. */
export function gainXp(data: PlayerData, amount: number, now: number, events: SystemEvent[]) {
  if (amount <= 0) return
  data.xp += amount
  data.totalXp += amount
  logFor(data, now).xp += amount
  const before = data.level
  while (data.xp >= xpToNext(data.level)) {
    data.xp -= xpToNext(data.level)
    data.level++
    data.statPoints += STAT_POINTS_PER_LEVEL
    events.push({ type: 'levelUp', level: data.level })
    for (const s of SKILLS) {
      if (s.level === data.level && (!s.requiresJob || data.job !== 'None')) events.push({ type: 'skill', name: s.name })
    }
  }
  if (data.level > before) {
    // Levelling up fully restores the hunter.
    data.hp = maxHp(data)
    data.mp = maxMp(data)
    if (data.level >= 100 && data.job === 'Necromancer') {
      data.job = 'Shadow Monarch'
      events.push({ type: 'jobChange', job: data.job })
    }
  }
}

function completeDaily(data: PlayerData, now: number, events: SystemEvent[]) {
  const today = dayKey(now)
  data.daily.completed = true
  data.daily.streakBefore = { ...data.streak }
  logFor(data, now).dailyComplete = true
  events.push({ type: 'dailyComplete' })
  // Rest days never break a streak: compare with the last mandatory day.
  const prev = previousQuestDay(data, today)
  data.streak.current = data.streak.lastDate && data.streak.lastDate >= prev ? data.streak.current + 1 : 1
  data.streak.lastDate = today
  data.streak.best = Math.max(data.streak.best, data.streak.current)
  if (data.difficulty === 'hunter') grantTitle(data, 'ironWill', events)
}

const SESSION_GAP_MS = 10 * 60_000
const MAX_HISTORY = 1000

/** Groups consecutive work on one exercise into a single session entry. */
function recordSession(data: PlayerData, ex: ExerciseId, amount: number, now: number) {
  const last = data.history[data.history.length - 1]
  if (last && last.exercise === ex && now - last.end < SESSION_GAP_MS && dayKey(last.start) === dayKey(now)) {
    last.amount += amount
    last.end = now
    return
  }
  data.history.push({ id: `${now.toString(36)}-${ex}-${data.history.length}`, exercise: ex, amount, start: now, end: now })
  if (data.history.length > MAX_HISTORY) data.history.splice(0, data.history.length - MAX_HISTORY)
}

function checkAchievements(data: PlayerData, events: SystemEvent[]) {
  if (data.streak.best >= 7) grantTitle(data, 'persistent', events)
  if (data.streak.best >= 100) grantTitle(data, 'centurion', events)
  const totalRun = Object.values(data.logs).reduce((s, l) => s + l.run, 0)
  if (totalRun >= 42195) grantTitle(data, 'speedster', events)
  const clears = Object.values(data.dungeonClears).reduce((s, n) => s + n, 0)
  if (clears >= 25) grantTitle(data, 'gatebreaker', events)
  const named = new Set(data.shadows.filter((s) => SHADOWS[s.type].unique).map((s) => s.type))
  if (named.size >= 5) grantTitle(data, 'shadowKing', events)
}

/* -------------------------------------------------------------- actions */

/** Record work done: reps, seconds or meters. Feeds daily quest, XP, stats, fatigue and emergency quests. */
export function logWork(input: PlayerData, ex: ExerciseId, amount: number, now = Date.now()): Result {
  const data = clone(input)
  const events: SystemEvent[] = []
  if (!(amount > 0)) return { data, events }
  const def = EXERCISES[ex]
  const b = computeBonuses(data)

  logFor(data, now)[ex] += amount
  recordSession(data, ex, amount, now)

  // Daily quest progress.
  if (isDailyKey(ex) && data.daily.date === dayKey(now)) {
    data.daily.progress[ex] += amount
    if (!data.daily.completed && isDailyDone(data.daily.progress, dailyTargets(data))) completeDaily(data, now, events)
  }

  // XP.
  const mult = 1 + b.xpPct / 100 + (ex === 'run' ? b.runXpPct / 100 : 0)
  gainXp(data, amount * def.xpPer * mult, now, events)

  // Automatic stat growth from training proficiency.
  data.statProgress[def.stat] += amount
  let gained = 0
  while (data.statProgress[def.stat] >= def.statEvery) {
    data.statProgress[def.stat] -= def.statEvery
    data.stats[def.stat]++
    gained++
  }
  if (gained) events.push({ type: 'statUp', stat: def.stat, amount: gained })

  // Fatigue.
  const resist = Math.min(0.8, b.fatigueReductionPct / 100 + data.stats.vit * 0.002)
  const delta = def.fatiguePer > 0 ? amount * def.fatiguePer * (1 - resist) : amount * def.fatiguePer
  data.fatigue = Math.min(100, Math.max(0, data.fatigue + delta))

  // Emergency quest.
  const em = data.emergency
  if (em && em.status === 'active' && em.exercise === ex && now <= em.deadline) {
    em.progress += amount
    if (em.progress >= em.target) {
      em.status = 'complete'
      events.push({ type: 'emergencyComplete', title: em.title })
      gainXp(data, em.rewardXp * (1 + b.xpPct / 100), now, events)
      const gold = Math.round(em.rewardGold * goldMultiplier(data, b))
      data.gold += gold
      events.push({ type: 'gold', amount: gold })
    }
  }

  checkAchievements(data, events)
  return { data, events }
}

export function claimDailyReward(input: PlayerData, now = Date.now()): Result {
  const data = clone(input)
  const events: SystemEvent[] = []
  if (!data.daily.completed || data.daily.rewardClaimed) return { data, events }
  const b = computeBonuses(data)
  data.daily.rewardClaimed = true
  const xp = Math.round((100 + 15 * data.level) * DAILY_BONUS_SCALE[data.difficulty] * (1 + b.xpPct / 100))
  const gold = Math.round((100 + 10 * data.level) * goldMultiplier(data, b))
  data.gold += gold
  data.statPoints += DAILY_STAT_POINTS
  events.push({ type: 'dailyReward', xp, gold })
  gainXp(data, xp, now, events)
  data.hp = maxHp(data)
  data.mp = maxMp(data)
  data.fatigue = 0
  addItem(data, 'randomBox', 1)
  // Every 7th consecutive day sharpens the senses.
  if (data.streak.current > 0 && data.streak.current % 7 === 0) {
    data.stats.per += 1
    events.push({ type: 'statUp', stat: 'per', amount: 1 })
  }
  checkAchievements(data, events)
  return { data, events }
}

/** Time-based regeneration of HP, MP and fatigue. */
export function regenerate(input: PlayerData, now = Date.now()): PlayerData {
  const hours = (now - input.lastRegenAt) / 3_600_000
  if (hours < 1 / 60) return input
  const data = clone(input)
  const b = computeBonuses(data)
  data.hp = Math.min(maxHp(data, b), data.hp + maxHp(data, b) * 0.08 * hours)
  data.mp = Math.min(maxMp(data, b), data.mp + maxMp(data, b) * 0.15 * hours)
  data.fatigue = Math.max(0, data.fatigue - 10 * hours)
  data.lastRegenAt = now
  return data
}

/**
 * Called on launch and periodically. Handles day rollover (penalties, streaks,
 * new daily quest) and emergency quest expiry.
 */
export function tick(input: PlayerData, now = Date.now()): Result {
  let data = regenerate(input, now)
  const events: SystemEvent[] = []
  const today = dayKey(now)

  if (data.emergency?.status === 'active' && now > data.emergency.deadline) {
    data = clone(data)
    const em = data.emergency!
    em.status = 'failed'
    const hpLoss = Math.round(maxHp(data) * em.penaltyHp)
    data.hp = Math.max(1, data.hp - hpLoss)
    events.push({ type: 'emergencyFailed', title: em.title, hp: hpLoss })
  }

  if (data.daily.date !== today) {
    data = clone(data)
    // The awakening day is a grace day: no penalty for a quest you barely had time for.
    const graceDay = data.daily.date === dayKey(data.createdAt)
    const lastWasMandatory = !data.daily.completed && !graceDay && !isRestDay(data, data.daily.date)
    // Days skipped entirely (the app was never opened) count as missed too, unless they were rest days.
    let skipped = false
    const gap = Math.min(8, daysBetween(data.daily.date, today))
    for (let i = 1; i < gap; i++) if (!isRestDay(data, addDays(data.daily.date, i))) skipped = true
    if (lastWasMandatory || skipped) {
      if ((data.inventory.holyWater ?? 0) > 0) {
        data.inventory.holyWater! -= 1
        // The water preserves the streak as if the missed day had been completed.
        if (data.streak.current > 0) data.streak.lastDate = previousQuestDay(data, today)
        events.push({ type: 'penaltyAverted' })
      } else if (!data.penalty.active) {
        data.penalty = { ...data.penalty, active: true, since: today }
        events.push({ type: 'penalty' })
      }
    }
    if (data.streak.lastDate && data.streak.lastDate < previousQuestDay(data, today)) data.streak.current = 0
    data.daily = emptyDaily(today)
    if (data.emergency && data.emergency.status !== 'active' && dayKey(data.emergency.issuedAt) !== today) {
      data.emergency = null
    }
  }

  if (data.weekly.week !== weekStart(today)) {
    if (data === input) data = clone(data)
    data.weekly = { week: weekStart(today), claimed: false }
  }

  return { data, events }
}

/** Re-checks the Daily Quest after its targets change (e.g. a lower difficulty). */
export function refreshDaily(input: PlayerData, now = Date.now()): Result {
  const events: SystemEvent[] = []
  if (input.daily.completed || input.daily.date !== dayKey(now) || !isDailyDone(input.daily.progress, dailyTargets(input))) {
    return { data: input, events }
  }
  const data = clone(input)
  completeDaily(data, now, events)
  checkAchievements(data, events)
  return { data, events }
}

/** Removes a logged session (a mistaken tap, a bad GPS run) and reverses its effects. */
export function deleteSession(input: PlayerData, id: string): Result {
  const index = input.history.findIndex((e) => e.id === id)
  if (index < 0) return { data: input, events: [] }
  const data = clone(input)
  const entry = data.history[index]
  const key = dayKey(entry.start)
  const def = EXERCISES[entry.exercise]
  const log = data.logs[key]

  if (isDailyKey(entry.exercise) && data.daily.date === key) {
    const progress = { ...data.daily.progress }
    progress[entry.exercise] = Math.max(0, progress[entry.exercise] - entry.amount)
    if (data.daily.completed && !isDailyDone(progress, dailyTargets(data))) {
      if (data.daily.rewardClaimed) {
        return {
          data: input,
          events: [{ type: 'message', text: "Today's Daily Quest rewards were already claimed, so this session can't be removed.", tone: 'warn' }],
        }
      }
      data.daily.completed = false
      if (data.daily.streakBefore) data.streak = { ...data.daily.streakBefore }
      if (log) log.dailyComplete = false
    }
    data.daily.progress = progress
  }

  if (log) log[entry.exercise] = Math.max(0, log[entry.exercise] - entry.amount)
  // Remove the base XP; level-ups and stat points already earned are kept.
  const xp = entry.amount * def.xpPer
  data.xp = Math.max(0, data.xp - xp)
  data.totalXp = Math.max(0, data.totalXp - xp)
  if (log) log.xp = Math.max(0, log.xp - xp)
  data.statProgress[def.stat] = Math.max(0, data.statProgress[def.stat] - entry.amount)

  const em = data.emergency
  if (em && em.status === 'active' && em.exercise === entry.exercise && entry.end >= em.issuedAt) {
    em.progress = Math.max(0, em.progress - entry.amount)
  }
  data.history.splice(index, 1)
  return { data, events: [{ type: 'message', text: 'Session removed.' }] }
}

/* --------------------------------------------------------------- weekly */

export interface WeeklyGoal {
  label: string
  progress: number
  target: number
  exercise?: ExerciseId
}

const WEEKLY_SCALE: Record<Difficulty, number> = { beginner: 0.5, normal: 1, hunter: 2, custom: 1 }

export function weeklyGoals(data: PlayerData, now = Date.now()): WeeklyGoal[] {
  const start = weekStart(dayKey(now))
  const days = Array.from({ length: 7 }, (_, i) => data.logs[addDays(start, i)]).filter(Boolean)
  const sum = (k: 'jumpingJack' | 'plank') => days.reduce((s, l) => s + l[k], 0)
  const scale = WEEKLY_SCALE[data.difficulty]
  return [
    { label: 'Clear the Daily Quest', progress: days.filter((l) => l.dailyComplete).length, target: Math.min(5, 7 - data.settings.restDays.length) },
    { label: 'Jumping Jacks', progress: sum('jumpingJack'), target: Math.round(150 * scale), exercise: 'jumpingJack' },
    { label: 'Plank', progress: sum('plank'), target: Math.round(300 * scale), exercise: 'plank' },
  ]
}

export function weeklyReward(data: PlayerData) {
  return { xp: 300 + data.level * 40, gold: 500 + data.level * 20 }
}

export function claimWeekly(input: PlayerData, now = Date.now()): Result {
  const goals = weeklyGoals(input, now)
  if (input.weekly.claimed || !goals.every((g) => g.progress >= g.target)) return { data: input, events: [] }
  const data = clone(input)
  const events: SystemEvent[] = [{ type: 'weeklyComplete' }]
  const b = computeBonuses(data)
  const r = weeklyReward(data)
  data.weekly.claimed = true
  const gold = Math.round(r.gold * goldMultiplier(data, b))
  data.gold += gold
  events.push({ type: 'gold', amount: gold })
  const xp = Math.round(r.xp * (1 + b.xpPct / 100))
  events.push({ type: 'xp', amount: xp })
  gainXp(data, xp, now, events)
  addItem(data, 'dungeonKey', 1, events)
  checkAchievements(data, events)
  return { data, events }
}

/* ----------------------------------------------------------------- body */

export function logWeight(input: PlayerData, kg: number, now = Date.now()): PlayerData {
  if (!(kg >= 20 && kg <= 400)) return input
  const data = clone(input)
  const date = dayKey(now)
  const weights = data.body.weights.filter((w) => w.date !== date)
  weights.push({ date, kg: Math.round(kg * 10) / 10 })
  weights.sort((a, b) => (a.date < b.date ? -1 : 1))
  data.body.weights = weights.slice(-730)
  return data
}

export function currentWeight(data: Pick<PlayerData, 'body'>): number | null {
  const w = data.body.weights
  return w.length ? w[w.length - 1].kg : null
}

export function bmi(data: Pick<PlayerData, 'body'>): number | null {
  const kg = currentWeight(data)
  const h = data.body.heightCm
  return kg && h ? kg / (h / 100) ** 2 : null
}

/** Rough calorie estimate. Rep costs are calibrated for a 70 kg adult and scale with body weight. */
const KCAL_PER_UNIT_70KG: Record<ExerciseId, number> = {
  pushup: 0.5,
  situp: 0.35,
  squat: 0.45,
  jumpingJack: 0.2,
  plank: 0.074, // MET 3.8, per second
  run: 0.0735, // ~1.05 kcal per kg per km, per metre
  meditation: 0,
}

export function kcalFor(ex: ExerciseId, amount: number, kg = 70): number {
  return amount * KCAL_PER_UNIT_70KG[ex] * (kg / 70)
}

export function dayKcal(log: DayLog | undefined, kg = 70): number {
  if (!log) return 0
  return (Object.keys(KCAL_PER_UNIT_70KG) as ExerciseId[]).reduce((s, ex) => s + kcalFor(ex, log[ex], kg), 0)
}

/* -------------------------------------------------------------- records */

export interface PersonalRecord {
  exercise: ExerciseId
  bestDay: { amount: number; date: string } | null
  bestSession: { amount: number; date: string } | null
}

export function personalRecords(data: PlayerData): PersonalRecord[] {
  const list: ExerciseId[] = ['pushup', 'situp', 'squat', 'jumpingJack', 'plank', 'run']
  return list.map((ex) => {
    let bestDay: PersonalRecord['bestDay'] = null
    for (const l of Object.values(data.logs)) if (l[ex] > 0 && (!bestDay || l[ex] > bestDay.amount)) bestDay = { amount: l[ex], date: l.date }
    let bestSession: PersonalRecord['bestSession'] = null
    for (const e of data.history) {
      if (e.exercise === ex && (!bestSession || e.amount > bestSession.amount)) bestSession = { amount: e.amount, date: dayKey(e.start) }
    }
    return { exercise: ex, bestDay, bestSession }
  })
}

export function sessionsFor(data: PlayerData): ActivityEntry[] {
  return [...data.history].reverse()
}

export function maybeIssueEmergency(input: PlayerData, now = Date.now(), rng: Rng = Math.random): Result {
  const today = dayKey(now)
  const hour = new Date(now).getHours()
  const events: SystemEvent[] = []
  if (
    input.penalty.active ||
    isRestDay(input, today) ||
    input.lastEmergencyDate === today ||
    input.emergency?.status === 'active' ||
    hour < 7 ||
    hour >= 22
  ) {
    return { data: input, events }
  }
  const data = clone(input)
  data.lastEmergencyDate = today
  // Roughly every other day the System sends an Emergency Quest.
  if (rng() > 0.55) return { data, events }
  const t = EMERGENCY_TEMPLATES[Math.floor(rng() * EMERGENCY_TEMPLATES.length)]
  const scale = 1 + Math.floor(data.level / 5) * 0.1
  const extraMinutes = unlockedSkills(data).some((s) => s.id === 'stealth') ? 30 : 0
  data.emergency = {
    id: `${today}-${t.exercise}`,
    title: `Emergency Quest: ${t.title}`,
    description: t.description,
    exercise: t.exercise,
    target: Math.round(t.base * scale),
    progress: 0,
    issuedAt: now,
    deadline: now + (t.minutes + extraMinutes) * 60_000,
    rewardXp: 60 + data.level * 8,
    rewardGold: 80 + data.level * 10,
    penaltyHp: 0.3,
    status: 'active',
  }
  events.push({ type: 'emergencyIssued', title: data.emergency.title })
  return { data, events }
}

export function allocateStat(input: PlayerData, stat: StatKey, n = 1): PlayerData {
  if (input.statPoints < n || n <= 0) return input
  const data = clone(input)
  data.statPoints -= n
  data.stats[stat] += n
  return data
}

export function buyItem(input: PlayerData, item: ItemId, qty = 1): Result {
  const price = ITEMS[item].price
  if (price === null || input.gold < price * qty) {
    return { data: input, events: [{ type: 'message', text: 'Not enough gold.', tone: 'warn' }] }
  }
  const data = clone(input)
  data.gold -= price * qty
  const events: SystemEvent[] = []
  addItem(data, item, qty, events)
  return { data, events }
}

const RANDOM_BOX_TABLE: { weight: number; item?: ItemId; gold?: [number, number] }[] = [
  { weight: 38, gold: [200, 800] },
  { weight: 15, item: 'healingPotion' },
  { weight: 15, item: 'manaPotion' },
  { weight: 12, item: 'fatiguePotion' },
  { weight: 10, item: 'dungeonKey' },
  { weight: 7, item: 'demonRune' },
  { weight: 3, item: 'holyWater' },
]

export function useItem(input: PlayerData, item: ItemId, rng: Rng = Math.random): Result {
  const events: SystemEvent[] = []
  if ((input.inventory[item] ?? 0) <= 0) return { data: input, events }
  if (item === 'dungeonKey' || item === 'holyWater') {
    events.push({
      type: 'message',
      text: item === 'dungeonKey' ? 'Use the key from the Gates screen.' : 'Holy Water activates automatically when needed.',
    })
    return { data: input, events }
  }
  const data = clone(input)
  data.inventory[item]! -= 1
  const b = computeBonuses(data)
  switch (item) {
    case 'healingPotion':
      data.hp = Math.min(maxHp(data, b), data.hp + maxHp(data, b) * 0.5)
      events.push({ type: 'message', text: 'HP restored.', tone: 'good' })
      break
    case 'manaPotion':
      data.mp = maxMp(data, b)
      events.push({ type: 'message', text: 'MP fully restored.', tone: 'good' })
      break
    case 'fatiguePotion':
      data.fatigue = 0
      events.push({ type: 'message', text: 'Fatigue has been removed.', tone: 'good' })
      break
    case 'venomFang':
      data.stats.str += 2
      events.push({ type: 'statUp', stat: 'str', amount: 2 })
      break
    case 'demonRune':
      data.statPoints += 3
      events.push({ type: 'message', text: 'Gained 3 ability points.', tone: 'good' })
      break
    case 'randomBox': {
      const total = RANDOM_BOX_TABLE.reduce((s, e) => s + e.weight, 0)
      let roll = rng() * total
      const entry = RANDOM_BOX_TABLE.find((e) => (roll -= e.weight) < 0) ?? RANDOM_BOX_TABLE[0]
      if (entry.gold) {
        const [lo, hi] = entry.gold
        const gold = Math.round((lo + rng() * (hi - lo)) * goldMultiplier(data, b))
        data.gold += gold
        events.push({ type: 'gold', amount: gold })
      } else if (entry.item) {
        addItem(data, entry.item, 1, events)
      }
      break
    }
  }
  return { data, events }
}

export function equipTitle(input: PlayerData, id: string | null): PlayerData {
  if (id !== null && !input.titles.includes(id)) return input
  return { ...input, title: id }
}

/* ---------------------------------------------------------------- gates */

export function canEnter(data: PlayerData, d: DungeonDef): { ok: boolean; reason?: string } {
  if (data.penalty.active) return { ok: false, reason: 'Clear the Penalty Quest first.' }
  if (data.level < d.minLevel) return { ok: false, reason: `Requires Level ${d.minLevel}.` }
  if (d.requiresKey && (data.inventory.dungeonKey ?? 0) <= 0) return { ok: false, reason: 'Requires an Instant Dungeon Key.' }
  if (d.jobChange && data.job !== 'None') return { ok: false, reason: 'Job already changed.' }
  if (data.hp < maxHp(data) * 0.1) return { ok: false, reason: 'HP too low. Rest or drink a potion.' }
  return { ok: true }
}

export function enterDungeon(input: PlayerData, d: DungeonDef): PlayerData {
  if (!d.requiresKey) return input
  const data = clone(input)
  data.inventory.dungeonKey = Math.max(0, (data.inventory.dungeonKey ?? 0) - 1)
  return data
}

export function completeDungeon(input: PlayerData, d: DungeonDef, now = Date.now(), rng: Rng = Math.random): Result {
  const data = clone(input)
  const events: SystemEvent[] = []
  const b = computeBonuses(data)
  data.dungeonClears[d.id] = (data.dungeonClears[d.id] ?? 0) + 1
  logFor(data, now).dungeons += 1

  const xpMult = (1 + b.xpPct / 100) * (d.requiresKey ? 2 : 1)
  const xp = Math.round(d.xp * xpMult)
  events.push({ type: 'xp', amount: xp })
  gainXp(data, xp, now, events)
  const gold = Math.round(d.gold * goldMultiplier(data, b))
  data.gold += gold
  events.push({ type: 'gold', amount: gold })

  for (const drop of d.drops) {
    if (rng() < Math.min(1, drop.chance * (1 + data.stats.per * 0.005))) addItem(data, drop.item, 1, events)
  }
  if (d.title) grantTitle(data, d.title, events)

  if (d.jobChange && data.job === 'None') {
    data.job = 'Necromancer'
    events.push({ type: 'jobChange', job: data.job })
  }

  for (const s of data.shadows) s.level = Math.min(data.level, s.level + 1)

  if (d.extraction && data.job !== 'None') {
    const def = SHADOWS[d.extraction]
    const owned = data.shadows.some((s) => s.type === d.extraction)
    if (!def.unique || !owned) {
      data.pendingExtraction = { dungeonId: d.id, shadow: d.extraction, attemptsLeft: EXTRACTION_ATTEMPTS }
    }
  }

  checkAchievements(data, events)
  return { data, events }
}

export function failDungeon(input: PlayerData): Result {
  const data = clone(input)
  const loss = Math.round(maxHp(data) * 0.3)
  data.hp = Math.max(1, data.hp - loss)
  return { data, events: [{ type: 'message', text: `The Gate rejected you. Lost ${loss} HP.`, tone: 'warn' }] }
}

export function attemptExtraction(input: PlayerData, rng: Rng = Math.random, now = Date.now()): Result {
  const pending = input.pendingExtraction
  if (!pending) return { data: input, events: [] }
  if (input.mp < EXTRACTION_MP_COST) {
    return { data: input, events: [{ type: 'message', text: 'Not enough MP. Drink a Mana Potion.', tone: 'warn' }] }
  }
  const data = clone(input)
  const events: SystemEvent[] = []
  const def = SHADOWS[pending.shadow]
  data.mp -= EXTRACTION_MP_COST
  const chance = extractionChance(data, def.grade)
  const success = rng() < chance
  const attemptsLeft = success ? 0 : pending.attemptsLeft - 1
  if (success) {
    const count = data.shadows.filter((s) => s.type === pending.shadow).length
    const shadow: OwnedShadow = {
      uid: `${pending.shadow}-${now}-${Math.floor(rng() * 1e6)}`,
      type: pending.shadow,
      name: def.unique ? def.name : `${def.name} #${count + 1}`,
      level: 1,
      extractedAt: now,
    }
    data.shadows.push(shadow)
    data.pendingExtraction = null
  } else {
    data.pendingExtraction = attemptsLeft > 0 ? { ...pending, attemptsLeft } : null
  }
  events.push({ type: 'extraction', success, shadow: def.name, attemptsLeft })
  checkAchievements(data, events)
  return { data, events }
}

export function abandonExtraction(input: PlayerData): PlayerData {
  return { ...input, pendingExtraction: null }
}

/* -------------------------------------------------------------- penalty */

export function completePenalty(input: PlayerData, now = Date.now()): Result {
  const data = clone(input)
  const events: SystemEvent[] = []
  if (!data.penalty.active) return { data, events }
  data.penalty = { active: false, since: null, cleared: data.penalty.cleared + 1 }
  grantTitle(data, 'adversity', events)
  gainXp(data, 50 + data.level * 5, now, events)
  events.push({ type: 'message', text: 'You survived the Penalty Zone.', tone: 'good' })
  return { data, events }
}

/* ------------------------------------------------------------ save data */

export function migrate(raw: unknown): PlayerData | null {
  if (!raw || typeof raw !== 'object') return null
  const d = raw as Partial<PlayerData>
  if (typeof d.level !== 'number' || !d.stats || !d.daily) return null
  const fresh = createPlayer(d.name ?? 'Hunter', d.difficulty ?? 'normal', d.createdAt ?? Date.now())
  const merged: PlayerData = {
    ...fresh,
    ...d,
    stats: { ...fresh.stats, ...d.stats },
    statProgress: { ...fresh.statProgress, ...d.statProgress },
    settings: { ...fresh.settings, ...d.settings },
    history: Array.isArray(d.history) ? d.history : [],
    body: { ...fresh.body, ...d.body },
    weekly: d.weekly ?? fresh.weekly,
    version: SAVE_VERSION,
  } as PlayerData
  for (const k of STAT_KEYS) if (typeof merged.stats[k] !== 'number') merged.stats[k] = 10
  return merged
}

export function lifetimeTotals(data: PlayerData) {
  const totals = { pushup: 0, situp: 0, squat: 0, jumpingJack: 0, plank: 0, run: 0, meditation: 0, dailies: 0, gates: 0 }
  for (const l of Object.values(data.logs)) {
    totals.pushup += l.pushup
    totals.situp += l.situp
    totals.squat += l.squat
    totals.jumpingJack += l.jumpingJack
    totals.plank += l.plank
    totals.run += l.run
    totals.meditation += l.meditation
    totals.dailies += l.dailyComplete ? 1 : 0
    totals.gates += l.dungeons
  }
  return totals
}
