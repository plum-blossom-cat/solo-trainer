import { create } from 'zustand'
import { setSoundEnabled, setVoiceEnabled, sfx, speak } from '../audio/sfx'
import { EXERCISES, ITEMS, STATS, TITLES, type DungeonDef } from './data'
import * as engine from './engine'
import type { Result, SystemEvent } from './engine'
import type { Difficulty, ExerciseId, ItemId, PlayerData, Settings, ShadowId, StatKey } from './types'

const SAVE_KEY = 'solo-trainer/save/v1'

export type Route =
  | 'status'
  | 'quests'
  | 'train'
  | 'gates'
  | 'shadows'
  | 'inventory'
  | 'records'
  | 'settings'

export interface Notice {
  id: number
  title: string
  body?: string
  tone: 'system' | 'quest' | 'reward' | 'warn' | 'alert'
}

export interface TrainingIntent {
  exercise: ExerciseId
  target?: number
  label?: string
}

export type Overlay =
  | { kind: 'levelUp'; level: number }
  | { kind: 'jobChange'; job: string }
  | { kind: 'rankUp'; rank: string }

export interface AriseResult {
  shadow: ShadowId
  success: boolean
  attemptsLeft: number
}

interface Store {
  data: PlayerData | null
  route: Route
  training: TrainingIntent | null
  battle: DungeonDef | null
  notices: Notice[]
  overlays: Overlay[]
  /** Result of the latest extraction attempt, shown until dismissed. */
  arise: AriseResult | null
  navigate(route: Route): void
  startTraining(intent: TrainingIntent | null): void
  awaken(name: string, difficulty: Difficulty): void
  logWork(ex: ExerciseId, amount: number): void
  claimDaily(): void
  allocate(stat: StatKey, n?: number): void
  buy(item: ItemId, qty?: number): void
  use(item: ItemId): void
  equipTitle(id: string | null): void
  tick(): void
  enterGate(d: DungeonDef): void
  leaveGate(): void
  clearGate(d: DungeonDef): void
  failGate(): void
  extract(): AriseResult | null
  abandonExtraction(): void
  clearArise(): void
  clearPenalty(): void
  updateSettings(s: Partial<Settings>): void
  updateQuestConfig(c: Partial<Pick<PlayerData, 'difficulty' | 'customTargets' | 'scaleWithLevel' | 'name'>>): void
  importSave(json: string): boolean
  resetAll(): void
  notify(n: Omit<Notice, 'id'>): void
  dismissNotice(id: number): void
  shiftOverlay(): void
}

function load(): PlayerData | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY)
    return raw ? engine.migrate(JSON.parse(raw)) : null
  } catch {
    return null
  }
}

let saveTimer: ReturnType<typeof setTimeout> | null = null
function save(data: PlayerData | null) {
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    try {
      if (data) localStorage.setItem(SAVE_KEY, JSON.stringify(data))
      else localStorage.removeItem(SAVE_KEY)
    } catch {
      // Storage full or blocked; the session keeps working in memory.
    }
  }, 150)
}

let noticeId = 1

function describe(e: SystemEvent): Omit<Notice, 'id'> | null {
  switch (e.type) {
    case 'statUp':
      return { title: `${STATS[e.stat].label} +${e.amount}`, body: `Your ${STATS[e.stat].name} has increased.`, tone: 'reward' }
    case 'dailyComplete':
      return { title: 'Daily Quest Complete', body: 'Preparations to become powerful: cleared. Claim your reward.', tone: 'quest' }
    case 'dailyReward':
      return {
        title: 'Rewards Received',
        body: `Full Recovery · +3 Ability Points · +${e.xp} XP · +${e.gold} Gold · Random Box`,
        tone: 'reward',
      }
    case 'title': {
      const t = TITLES.find((x) => x.id === e.id)
      return { title: 'Title Acquired', body: `[${t?.name ?? e.id}] — ${t?.bonusText ?? ''}`, tone: 'reward' }
    }
    case 'item':
      return { title: 'Item Acquired', body: `${ITEMS[e.item].name} ×${e.qty}`, tone: 'reward' }
    case 'gold':
      return { title: `+${e.amount.toLocaleString()} Gold`, tone: 'reward' }
    case 'xp':
      return { title: `+${e.amount.toLocaleString()} XP`, tone: 'reward' }
    case 'emergencyIssued':
      return { title: e.title, body: 'An Emergency Quest has arrived. Check your Quests.', tone: 'alert' }
    case 'emergencyComplete':
      return { title: 'Emergency Quest Cleared', body: e.title, tone: 'quest' }
    case 'emergencyFailed':
      return { title: 'Emergency Quest Failed', body: `${e.title}. Penalty: -${e.hp} HP.`, tone: 'warn' }
    case 'penalty':
      return { title: 'Warning', body: 'Failure to complete the Daily Quest. Moving to the Penalty Zone.', tone: 'alert' }
    case 'penaltyAverted':
      return { title: 'Holy Water of Life', body: 'The Penalty Zone has been averted. Your streak is safe.', tone: 'system' }
    case 'skill':
      return { title: 'Skill Acquired', body: `[${e.name}]`, tone: 'reward' }
    case 'extraction':
      return null
    case 'levelUp':
    case 'jobChange':
      return null
    case 'message':
      return { title: e.text, tone: e.tone === 'warn' ? 'warn' : e.tone === 'good' ? 'reward' : 'system' }
  }
}

export const useStore = create<Store>((set, get) => {
  /** Commits a new save and announces its events. */
  function commit(result: Result) {
    const before = get().data
    set({ data: result.data })
    save(result.data)
    announce(result.events, before, result.data)
  }

  function announce(events: SystemEvent[], before: PlayerData | null, after: PlayerData) {
    if (!events.length) return
    const notices: Notice[] = []
    const overlays: Overlay[] = []
    let sound: keyof typeof sfx | null = null
    let line: string | null = null

    // Merge repeated stat gains into one notice.
    const merged: SystemEvent[] = []
    for (const e of events) {
      const prev = merged.find((m) => m.type === 'statUp' && e.type === 'statUp' && m.stat === e.stat)
      if (prev && prev.type === 'statUp' && e.type === 'statUp') prev.amount += e.amount
      else merged.push({ ...e })
    }

    const levelUps = merged.filter((e) => e.type === 'levelUp')
    if (levelUps.length) {
      const top = levelUps[levelUps.length - 1]
      if (top.type === 'levelUp') overlays.push({ kind: 'levelUp', level: top.level })
      sound = 'levelUp'
      line = 'Level up.'
      if (before) {
        const r0 = engine.rankFor(before.level).rank
        const r1 = engine.rankFor(after.level).rank
        if (r0 !== r1) overlays.push({ kind: 'rankUp', rank: r1 })
      }
    }
    for (const e of merged) {
      if (e.type === 'jobChange') {
        overlays.push({ kind: 'jobChange', job: e.job })
        sound = 'arise'
      }
      const n = describe(e)
      if (n) notices.push({ ...n, id: noticeId++ })
      if (!sound) {
        if (e.type === 'dailyComplete' || e.type === 'emergencyComplete') {
          sound = 'questComplete'
          line = e.type === 'dailyComplete' ? 'Daily quest complete.' : 'Emergency quest complete.'
        } else if (e.type === 'penalty' || e.type === 'emergencyFailed' || e.type === 'emergencyIssued') {
          sound = 'warning'
          line = e.type === 'penalty' ? 'Moving to the penalty zone.' : e.type === 'emergencyIssued' ? 'Emergency quest.' : null
        } else if (e.type === 'gold') sound = 'coin'
        else if (n) sound = 'system'
      }
    }
    if (sound) sfx[sound]()
    if (line) speak(line)
    set((s) => ({ notices: [...s.notices, ...notices].slice(-6), overlays: [...s.overlays, ...overlays] }))
  }

  function withData(fn: (d: PlayerData) => Result | PlayerData) {
    const d = get().data
    if (!d) return
    const r = fn(d)
    if ('events' in r) commit(r)
    else commit({ data: r, events: [] })
  }

  const initial = load()
  if (initial) {
    setSoundEnabled(initial.settings.sound)
    setVoiceEnabled(initial.settings.voice)
  }

  return {
    data: initial,
    route: 'status',
    training: null,
    battle: null,
    notices: [],
    overlays: [],
    arise: null,

    navigate(route) {
      sfx.click()
      set({ route })
    },
    startTraining(intent) {
      set({ training: intent, route: 'train' })
    },
    awaken(name, difficulty) {
      const data = engine.createPlayer(name, difficulty)
      set({ data, route: 'status' })
      save(data)
    },
    logWork(ex, amount) {
      withData((d) => engine.logWork(d, ex, amount))
    },
    claimDaily() {
      withData((d) => engine.claimDailyReward(d))
    },
    allocate(stat, n = 1) {
      withData((d) => engine.allocateStat(d, stat, n))
    },
    buy(item, qty = 1) {
      withData((d) => engine.buyItem(d, item, qty))
    },
    use(item) {
      withData((d) => engine.useItem(d, item))
    },
    equipTitle(id) {
      withData((d) => engine.equipTitle(d, id))
    },
    tick() {
      withData((d) => {
        const r = engine.tick(d)
        const e = engine.maybeIssueEmergency(r.data)
        return { data: e.data, events: [...r.events, ...e.events] }
      })
    },
    enterGate(d) {
      const data = get().data
      if (!data || !engine.canEnter(data, d).ok) return
      sfx.gate()
      commit({ data: engine.enterDungeon(data, d), events: [] })
      set({ battle: d })
    },
    leaveGate() {
      set({ battle: null })
    },
    clearGate(d) {
      withData((data) => engine.completeDungeon(data, d))
    },
    failGate() {
      withData((data) => engine.failDungeon(data))
    },
    extract() {
      const d = get().data
      const pending = d?.pendingExtraction
      if (!d || !pending) return null
      const r = engine.attemptExtraction(d)
      commit(r)
      const e = r.events.find((x) => x.type === 'extraction')
      if (!e || e.type !== 'extraction') return null
      const arise: AriseResult = { shadow: pending.shadow, success: e.success, attemptsLeft: e.attemptsLeft }
      set({ arise })
      return arise
    },
    clearArise() {
      set({ arise: null })
    },
    abandonExtraction() {
      withData((d) => engine.abandonExtraction(d))
    },
    clearPenalty() {
      withData((d) => engine.completePenalty(d))
    },
    updateSettings(s) {
      withData((d) => {
        const settings = { ...d.settings, ...s }
        setSoundEnabled(settings.sound)
        setVoiceEnabled(settings.voice)
        return { ...d, settings }
      })
    },
    updateQuestConfig(c) {
      withData((d) => ({ ...d, ...c }))
    },
    importSave(json) {
      try {
        const data = engine.migrate(JSON.parse(json))
        if (!data) return false
        set({ data })
        save(data)
        return true
      } catch {
        return false
      }
    },
    resetAll() {
      set({ data: null, route: 'status', battle: null, training: null, notices: [], overlays: [], arise: null })
      save(null)
    },
    notify(n) {
      set((s) => ({ notices: [...s.notices, { ...n, id: noticeId++ }].slice(-6) }))
    },
    dismissNotice(id) {
      set((s) => ({ notices: s.notices.filter((n) => n.id !== id) }))
    },
    shiftOverlay() {
      set((s) => ({ overlays: s.overlays.slice(1) }))
    },
  }
})

/** Convenience hook for screens that only render once awakened. */
export function usePlayer(): PlayerData {
  const d = useStore((s) => s.data)
  if (!d) throw new Error('Player not awakened')
  return d
}

export function exerciseName(ex: ExerciseId) {
  return EXERCISES[ex].name
}
