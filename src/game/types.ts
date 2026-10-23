export type StatKey = 'str' | 'agi' | 'vit' | 'int' | 'per'

export type ExerciseId =
  | 'pushup'
  | 'situp'
  | 'squat'
  | 'jumpingJack'
  | 'plank'
  | 'run'
  | 'meditation'

/** How an exercise is measured. Reps are counted, the others are accumulated. */
export type ExerciseUnit = 'reps' | 'seconds' | 'meters'

export type Rank = 'E' | 'D' | 'C' | 'B' | 'A' | 'S' | 'National'

export type Difficulty = 'beginner' | 'normal' | 'hunter' | 'custom'

export type ItemId =
  | 'healingPotion'
  | 'manaPotion'
  | 'fatiguePotion'
  | 'randomBox'
  | 'dungeonKey'
  | 'holyWater'
  | 'venomFang'
  | 'demonRune'

export type ShadowId =
  | 'soldier'
  | 'lycan'
  | 'iron'
  | 'tank'
  | 'igris'
  | 'tusk'
  | 'kaisel'
  | 'beru'
  | 'bellion'

export type ShadowGrade =
  | 'Normal'
  | 'Elite'
  | 'Knight'
  | 'Elite Knight'
  | 'Commander'
  | 'Marshal'
  | 'Grand Marshal'

export type ArtId =
  | 'goblin'
  | 'hobgoblin'
  | 'wolf'
  | 'kasaka'
  | 'knight'
  | 'bear'
  | 'orc'
  | 'demon'
  | 'wyvern'
  | 'ant'
  | 'centipede'
  | 'statue'
  | 'soldier'
  | 'commander'

export interface DayLog {
  date: string
  pushup: number
  situp: number
  squat: number
  jumpingJack: number
  plank: number
  run: number
  meditation: number
  xp: number
  dailyComplete: boolean
  dungeons: number
}

export type DailyTargets = Record<'pushup' | 'situp' | 'squat' | 'run', number>

export interface DailyState {
  date: string
  progress: DailyTargets
  completed: boolean
  rewardClaimed: boolean
}

export interface EmergencyQuest {
  id: string
  title: string
  description: string
  exercise: ExerciseId
  target: number
  progress: number
  issuedAt: number
  deadline: number
  rewardXp: number
  rewardGold: number
  penaltyHp: number
  status: 'active' | 'complete' | 'failed'
}

export interface OwnedShadow {
  uid: string
  type: ShadowId
  name: string
  level: number
  extractedAt: number
}

export interface PendingExtraction {
  dungeonId: string
  shadow: ShadowId
  attemptsLeft: number
}

export interface Settings {
  sound: boolean
  voice: boolean
  reduceMotion: boolean
  showSkeleton: boolean
}

export interface PlayerData {
  version: number
  awakened: boolean
  name: string
  createdAt: number
  level: number
  xp: number
  totalXp: number
  gold: number
  stats: Record<StatKey, number>
  statPoints: number
  /** Training proficiency toward the next automatic stat gain. */
  statProgress: Record<StatKey, number>
  hp: number
  mp: number
  fatigue: number
  lastRegenAt: number
  job: string
  title: string | null
  titles: string[]
  inventory: Partial<Record<ItemId, number>>
  shadows: OwnedShadow[]
  pendingExtraction: PendingExtraction | null
  daily: DailyState
  difficulty: Difficulty
  customTargets: DailyTargets
  scaleWithLevel: boolean
  logs: Record<string, DayLog>
  streak: { current: number; best: number; lastDate: string | null }
  penalty: { active: boolean; since: string | null; cleared: number }
  emergency: EmergencyQuest | null
  lastEmergencyDate: string | null
  dungeonClears: Record<string, number>
  achievements: string[]
  settings: Settings
}
