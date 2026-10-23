import type {
  ArtId,
  DailyTargets,
  Difficulty,
  ExerciseId,
  ExerciseUnit,
  ItemId,
  Rank,
  ShadowGrade,
  ShadowId,
  StatKey,
} from './types'

export interface Bonuses {
  xpPct: number
  goldPct: number
  damagePct: number
  critChance: number
  runXpPct: number
  extractPct: number
  hpPct: number
  mpFlat: number
  fatigueReductionPct: number
}

export const ZERO_BONUSES: Bonuses = {
  xpPct: 0,
  goldPct: 0,
  damagePct: 0,
  critChance: 0,
  runXpPct: 0,
  extractPct: 0,
  hpPct: 0,
  mpFlat: 0,
  fatigueReductionPct: 0,
}

/* ------------------------------------------------------------------ stats */

export const STAT_KEYS: StatKey[] = ['str', 'agi', 'vit', 'int', 'per']

export const STATS: Record<StatKey, { label: string; name: string; effect: string }> = {
  str: { label: 'STR', name: 'Strength', effect: 'Damage dealt per rep inside Gates' },
  agi: { label: 'AGI', name: 'Agility', effect: 'Critical hit chance inside Gates' },
  vit: { label: 'VIT', name: 'Vitality', effect: 'Maximum HP and fatigue resistance' },
  int: { label: 'INT', name: 'Intelligence', effect: 'Maximum MP and shadow extraction rate' },
  per: { label: 'PER', name: 'Perception', effect: 'Gold found and item drop rate' },
}

/* -------------------------------------------------------------- exercises */

export interface ExerciseDef {
  id: ExerciseId
  name: string
  unit: ExerciseUnit
  /** XP per unit (rep, second or meter). */
  xpPer: number
  /** Stat trained by this exercise. */
  stat: StatKey
  /** Units of work needed for +1 automatic stat gain. */
  statEvery: number
  /** Fatigue per unit. */
  fatiguePer: number
  camera: boolean
  motion: boolean
  cue: string
}

export const EXERCISES: Record<ExerciseId, ExerciseDef> = {
  pushup: {
    id: 'pushup',
    name: 'Push-ups',
    unit: 'reps',
    xpPer: 1,
    stat: 'str',
    statEvery: 50,
    fatiguePer: 0.12,
    camera: true,
    motion: false,
    cue: 'Place the camera at floor level, side-on, so your whole body is in frame.',
  },
  situp: {
    id: 'situp',
    name: 'Sit-ups',
    unit: 'reps',
    xpPer: 1,
    stat: 'vit',
    statEvery: 50,
    fatiguePer: 0.1,
    camera: true,
    motion: false,
    cue: 'Camera side-on at floor level. Knees bent, keep shoulders and hips visible.',
  },
  squat: {
    id: 'squat',
    name: 'Squats',
    unit: 'reps',
    xpPer: 1,
    stat: 'str',
    statEvery: 60,
    fatiguePer: 0.1,
    camera: true,
    motion: true,
    cue: 'Stand side-on or facing the camera with hips, knees and ankles visible.',
  },
  jumpingJack: {
    id: 'jumpingJack',
    name: 'Jumping Jacks',
    unit: 'reps',
    xpPer: 0.5,
    stat: 'agi',
    statEvery: 120,
    fatiguePer: 0.05,
    camera: true,
    motion: true,
    cue: 'Face the camera with your full body in frame, arms and feet visible.',
  },
  plank: {
    id: 'plank',
    name: 'Plank',
    unit: 'seconds',
    xpPer: 0.2,
    stat: 'vit',
    statEvery: 300,
    fatiguePer: 0.04,
    camera: true,
    motion: false,
    cue: 'Camera side-on at floor level. Hold a straight line from shoulders to ankles.',
  },
  run: {
    id: 'run',
    name: 'Running',
    unit: 'meters',
    xpPer: 0.02,
    stat: 'agi',
    statEvery: 1000,
    fatiguePer: 0.004,
    camera: false,
    motion: false,
    cue: 'GPS tracks your route. Keep the app open with the screen on.',
  },
  meditation: {
    id: 'meditation',
    name: 'Meditation',
    unit: 'seconds',
    xpPer: 0.1,
    stat: 'int',
    statEvery: 600,
    fatiguePer: -0.05,
    camera: false,
    motion: false,
    cue: 'Sit comfortably. Follow the breathing rhythm of the mana circle.',
  },
}

export const REP_EXERCISES: ExerciseId[] = ['pushup', 'situp', 'squat', 'jumpingJack']

export function formatAmount(ex: ExerciseId, amount: number): string {
  const unit = EXERCISES[ex].unit
  if (unit === 'meters') return amount >= 1000 ? `${(amount / 1000).toFixed(2)} km` : `${Math.round(amount)} m`
  if (unit === 'seconds') {
    const s = Math.round(amount)
    return s >= 60 ? `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, '0')}s` : `${s}s`
  }
  return `${Math.floor(amount)}`
}

/* ------------------------------------------------------------------ ranks */

export const RANKS: { rank: Rank; minLevel: number; color: string }[] = [
  { rank: 'E', minLevel: 1, color: '#94a3b8' },
  { rank: 'D', minLevel: 10, color: '#4ade80' },
  { rank: 'C', minLevel: 20, color: '#38bdf8' },
  { rank: 'B', minLevel: 35, color: '#a78bfa' },
  { rank: 'A', minLevel: 50, color: '#f472b6' },
  { rank: 'S', minLevel: 70, color: '#fbbf24' },
  { rank: 'National', minLevel: 100, color: '#f87171' },
]

/* ------------------------------------------------------------ daily quest */

export const DAILY_PRESETS: Record<Exclude<Difficulty, 'custom'>, DailyTargets & { label: string; blurb: string }> = {
  beginner: { label: 'Beginner', blurb: 'For newly awakened hunters', pushup: 20, situp: 20, squat: 20, run: 2000 },
  normal: { label: 'Normal', blurb: 'A steady path to power', pushup: 50, situp: 50, squat: 50, run: 5000 },
  hunter: { label: 'Hunter', blurb: 'The original System quest', pushup: 100, situp: 100, squat: 100, run: 10000 },
}

/** Gate wave multipliers per difficulty. */
export const DIFFICULTY_SCALE: Record<Difficulty, number> = {
  beginner: 0.6,
  normal: 1,
  hunter: 1.5,
  custom: 1,
}

export const DAILY_BONUS_SCALE: Record<Difficulty, number> = {
  beginner: 0.5,
  normal: 1,
  hunter: 2,
  custom: 1,
}

/* ------------------------------------------------------------------ items */

export interface ItemDef {
  id: ItemId
  name: string
  description: string
  price: number | null
  rarity: 'Common' | 'Uncommon' | 'Rare' | 'Epic' | 'Legendary'
  glyph: string
  color: string
}

export const ITEMS: Record<ItemId, ItemDef> = {
  healingPotion: {
    id: 'healingPotion',
    name: 'Healing Potion',
    description: 'Restores 50% of maximum HP.',
    price: 120,
    rarity: 'Common',
    glyph: '✚',
    color: '#f87171',
  },
  manaPotion: {
    id: 'manaPotion',
    name: 'Mana Potion',
    description: 'Restores all MP. Required fuel for Shadow Extraction.',
    price: 150,
    rarity: 'Common',
    glyph: '◆',
    color: '#60a5fa',
  },
  fatiguePotion: {
    id: 'fatiguePotion',
    name: 'Recovery Potion of Fatigue',
    description: 'Removes all accumulated fatigue.',
    price: 180,
    rarity: 'Uncommon',
    glyph: '❖',
    color: '#34d399',
  },
  randomBox: {
    id: 'randomBox',
    name: 'Random Box',
    description: 'Contains a random reward. Even the System does not know what is inside.',
    price: 300,
    rarity: 'Uncommon',
    glyph: '▣',
    color: '#fbbf24',
  },
  dungeonKey: {
    id: 'dungeonKey',
    name: 'Instant Dungeon Key',
    description: 'Opens an Instant Dungeon scaled to your level. Double XP inside.',
    price: 600,
    rarity: 'Rare',
    glyph: '⚿',
    color: '#a78bfa',
  },
  holyWater: {
    id: 'holyWater',
    name: 'Holy Water of Life',
    description: 'Protects your streak and spares you from one Penalty Zone.',
    price: 1500,
    rarity: 'Epic',
    glyph: '☤',
    color: '#67e8f9',
  },
  venomFang: {
    id: 'venomFang',
    name: "Kasaka's Venom Fang",
    description: 'Consume to permanently gain +2 STR.',
    price: null,
    rarity: 'Rare',
    glyph: '⟁',
    color: '#22d3ee',
  },
  demonRune: {
    id: 'demonRune',
    name: 'Rune Stone',
    description: 'Crush it to absorb its knowledge. Grants +3 ability points.',
    price: null,
    rarity: 'Epic',
    glyph: 'ᛟ',
    color: '#c084fc',
  },
}

/* ---------------------------------------------------------------- shadows */

export interface ShadowDef {
  id: ShadowId
  name: string
  grade: ShadowGrade
  art: ArtId
  aura: string
  unique: boolean
  lore: string
  bonus: Partial<Bonuses>
  bonusText: string
}

export const SHADOWS: Record<ShadowId, ShadowDef> = {
  soldier: {
    id: 'soldier',
    name: 'Shadow Soldier',
    grade: 'Normal',
    art: 'soldier',
    aura: '#7c3aed',
    unique: false,
    lore: 'A nameless soldier of the shadow army. Loyal unto eternity.',
    bonus: { damagePct: 1 },
    bonusText: '+1% Gate damage (stacks up to 20)',
  },
  lycan: {
    id: 'lycan',
    name: 'Fang',
    grade: 'Elite',
    art: 'wolf',
    aura: '#6366f1',
    unique: true,
    lore: 'Once a Steel-Fanged Lycan. Now it hunts for you.',
    bonus: { runXpPct: 10 },
    bonusText: '+10% Running XP',
  },
  iron: {
    id: 'iron',
    name: 'Iron',
    grade: 'Elite Knight',
    art: 'knight',
    aura: '#64748b',
    unique: true,
    lore: 'A loud, heavily armoured vanguard. Takes every hit meant for his liege.',
    bonus: { hpPct: 20 },
    bonusText: '+20% Max HP',
  },
  tank: {
    id: 'tank',
    name: 'Tank',
    grade: 'Elite',
    art: 'bear',
    aura: '#0ea5e9',
    unique: true,
    lore: 'The Ice Bear alpha, reborn. Unmoving as a glacier.',
    bonus: { fatigueReductionPct: 20 },
    bonusText: '-20% Fatigue gained',
  },
  igris: {
    id: 'igris',
    name: 'Igris',
    grade: 'Knight',
    art: 'commander',
    aura: '#dc2626',
    unique: true,
    lore: 'The Blood-Red Commander. Your first knight, and your most loyal.',
    bonus: { xpPct: 10, critChance: 5 },
    bonusText: '+10% XP, +5% crit chance',
  },
  tusk: {
    id: 'tusk',
    name: 'Tusk',
    grade: 'Elite Knight',
    art: 'orc',
    aura: '#16a34a',
    unique: true,
    lore: 'High Orc shaman. Speaks little, burns much.',
    bonus: { mpFlat: 50, extractPct: 5 },
    bonusText: '+50 Max MP, +5% extraction rate',
  },
  kaisel: {
    id: 'kaisel',
    name: 'Kaisel',
    grade: 'Elite Knight',
    art: 'wyvern',
    aura: '#0891b2',
    unique: true,
    lore: 'A sky wyvern who now carries the Monarch across the clouds.',
    bonus: { runXpPct: 20, goldPct: 10 },
    bonusText: '+20% Running XP, +10% gold',
  },
  beru: {
    id: 'beru',
    name: 'Beru',
    grade: 'Marshal',
    art: 'ant',
    aura: '#9333ea',
    unique: true,
    lore: 'The Ant King. Once a calamity, now a fanatically loyal Marshal.',
    bonus: { damagePct: 25, xpPct: 10 },
    bonusText: '+25% Gate damage, +10% XP',
  },
  bellion: {
    id: 'bellion',
    name: 'Bellion',
    grade: 'Grand Marshal',
    art: 'statue',
    aura: '#e11d48',
    unique: true,
    lore: 'The Grand Marshal of the Shadow Army. He has waited an eternity for his king.',
    bonus: { damagePct: 30, xpPct: 20, goldPct: 20 },
    bonusText: '+30% damage, +20% XP, +20% gold',
  },
}

export const MAX_STACKED_SOLDIERS = 20

/* ----------------------------------------------------------------- skills */

export interface SkillDef {
  id: string
  name: string
  kind: 'Passive' | 'Active'
  level: number
  requiresJob?: boolean
  description: string
  bonus: Partial<Bonuses>
}

export const SKILLS: SkillDef[] = [
  {
    id: 'persistence',
    name: 'Persistence',
    kind: 'Passive',
    level: 1,
    description: 'The System recognises those who refuse to quit. +5% XP.',
    bonus: { xpPct: 5 },
  },
  {
    id: 'sprint',
    name: 'Sprint',
    kind: 'Active',
    level: 3,
    description: 'Mana flows into your legs. +15% Running XP.',
    bonus: { runXpPct: 15 },
  },
  {
    id: 'vitalStrike',
    name: 'Vital Strike',
    kind: 'Passive',
    level: 6,
    description: 'Find the weak point. +5% critical hit chance in Gates.',
    bonus: { critChance: 5 },
  },
  {
    id: 'shadowExtraction',
    name: 'Shadow Extraction',
    kind: 'Active',
    level: 8,
    requiresJob: true,
    description: 'Extract the shadows of fallen bosses to join your army. Costs 30 MP. "ARISE."',
    bonus: {},
  },
  {
    id: 'bloodlust',
    name: 'Bloodlust',
    kind: 'Active',
    level: 12,
    description: 'Intimidate your enemies. +10% Gate damage.',
    bonus: { damagePct: 10 },
  },
  {
    id: 'ironBody',
    name: 'Iron Body',
    kind: 'Passive',
    level: 18,
    description: 'Your body adapts. -15% fatigue gained.',
    bonus: { fatigueReductionPct: 15 },
  },
  {
    id: 'stealth',
    name: 'Stealth',
    kind: 'Active',
    level: 24,
    description: 'Move unseen. +10% gold and Emergency Quest windows +30 min.',
    bonus: { goldPct: 10 },
  },
  {
    id: 'rulersAuthority',
    name: "Ruler's Authority",
    kind: 'Active',
    level: 30,
    description: 'Telekinetic force of the Rulers. +15% Gate damage.',
    bonus: { damagePct: 15 },
  },
  {
    id: 'shadowExchange',
    name: 'Shadow Exchange',
    kind: 'Active',
    level: 40,
    requiresJob: true,
    description: 'Swap places with any of your shadows. +10% extraction rate.',
    bonus: { extractPct: 10 },
  },
  {
    id: 'dragonsFear',
    name: "Dragon's Fear",
    kind: 'Active',
    level: 55,
    description: 'A roar that paralyses lesser beings. +10% crit chance.',
    bonus: { critChance: 10 },
  },
  {
    id: 'monarchsDomain',
    name: "Monarch's Domain",
    kind: 'Passive',
    level: 75,
    requiresJob: true,
    description: 'Your shadows grow stronger within your domain. +25% XP.',
    bonus: { xpPct: 25 },
  },
]

/* ----------------------------------------------------------------- titles */

export interface TitleDef {
  id: string
  name: string
  condition: string
  bonus: Partial<Bonuses>
  bonusText: string
}

export const TITLES: TitleDef[] = [
  { id: 'awakened', name: 'The Awakened', condition: 'Accept the System.', bonus: {}, bonusText: 'No effect' },
  {
    id: 'wolfSlayer',
    name: 'Wolf Slayer',
    condition: 'Clear the Wolf Forest Gate.',
    bonus: { damagePct: 5 },
    bonusText: '+5% Gate damage',
  },
  {
    id: 'adversity',
    name: 'One Who Overcame Adversity',
    condition: 'Survive the Penalty Zone.',
    bonus: { hpPct: 15, fatigueReductionPct: 10 },
    bonusText: '+15% Max HP, -10% fatigue',
  },
  {
    id: 'persistent',
    name: 'The Persistent',
    condition: 'Reach a 7-day Daily Quest streak.',
    bonus: { xpPct: 5 },
    bonusText: '+5% XP',
  },
  {
    id: 'ironWill',
    name: 'Iron Will',
    condition: 'Complete a Daily Quest on Hunter difficulty.',
    bonus: { xpPct: 8 },
    bonusText: '+8% XP',
  },
  {
    id: 'speedster',
    name: 'Marathoner',
    condition: 'Run a lifetime total of 42.2 km.',
    bonus: { runXpPct: 15 },
    bonusText: '+15% Running XP',
  },
  {
    id: 'gatebreaker',
    name: 'Gatebreaker',
    condition: 'Clear 25 Gates.',
    bonus: { goldPct: 15 },
    bonusText: '+15% gold',
  },
  {
    id: 'demonHunter',
    name: 'Demon Hunter',
    condition: "Clear the Demon King's Castle.",
    bonus: { damagePct: 10 },
    bonusText: '+10% Gate damage',
  },
  {
    id: 'necromancer',
    name: 'Heir of the Shadows',
    condition: 'Complete the Job Change Quest.',
    bonus: { extractPct: 10 },
    bonusText: '+10% extraction rate',
  },
  {
    id: 'shadowKing',
    name: 'King of Shadows',
    condition: 'Command 5 named shadows.',
    bonus: { xpPct: 10, damagePct: 10 },
    bonusText: '+10% XP, +10% damage',
  },
  {
    id: 'centurion',
    name: 'Centurion',
    condition: 'Reach a 100-day streak.',
    bonus: { xpPct: 15, goldPct: 15 },
    bonusText: '+15% XP, +15% gold',
  },
]

/* --------------------------------------------------------------- dungeons */

export interface WaveDef {
  enemy: string
  art: ArtId
  exercise: Exclude<ExerciseId, 'run' | 'meditation'>
  amount: number
  boss?: boolean
  /** Seconds. Bosses enrage when time runs out and the Gate fails. */
  timeLimit?: number
}

export interface DungeonDef {
  id: string
  name: string
  rank: Rank
  minLevel: number
  description: string
  color: string
  waves: WaveDef[]
  xp: number
  gold: number
  drops: { item: ItemId; chance: number }[]
  extraction?: ShadowId
  jobChange?: boolean
  requiresKey?: boolean
  title?: string
}

export const DUNGEONS: DungeonDef[] = [
  {
    id: 'goblin-den',
    name: 'Goblin Den',
    rank: 'E',
    minLevel: 1,
    description: 'A low-rank Gate crawling with goblins. A good place for a new hunter to learn.',
    color: '#60a5fa',
    waves: [
      { enemy: 'Goblin Scout', art: 'goblin', exercise: 'squat', amount: 10 },
      { enemy: 'Goblin Warrior', art: 'goblin', exercise: 'pushup', amount: 8 },
      { enemy: 'Hobgoblin Chief', art: 'hobgoblin', exercise: 'jumpingJack', amount: 25, boss: true, timeLimit: 240 },
    ],
    xp: 120,
    gold: 100,
    drops: [{ item: 'healingPotion', chance: 0.5 }],
    extraction: 'soldier',
  },
  {
    id: 'wolf-forest',
    name: 'Wolf Forest',
    rank: 'E',
    minLevel: 3,
    description: 'Steel-Fanged Lycans hunt in packs under a blood-red moon.',
    color: '#818cf8',
    waves: [
      { enemy: 'Steel-Fanged Lycan', art: 'wolf', exercise: 'squat', amount: 15 },
      { enemy: 'Lycan Pack', art: 'wolf', exercise: 'situp', amount: 12 },
      { enemy: 'Alpha Lycan', art: 'wolf', exercise: 'pushup', amount: 15, boss: true, timeLimit: 240 },
    ],
    xp: 180,
    gold: 150,
    drops: [{ item: 'healingPotion', chance: 0.4 }, { item: 'manaPotion', chance: 0.3 }],
    extraction: 'lycan',
    title: 'wolfSlayer',
  },
  {
    id: 'kasaka-nest',
    name: "Kasaka's Nest",
    rank: 'D',
    minLevel: 5,
    description: 'A damp cave. Something enormous and blue sleeps at the bottom.',
    color: '#22d3ee',
    waves: [
      { enemy: 'Kasaka Hatchlings', art: 'kasaka', exercise: 'jumpingJack', amount: 30 },
      { enemy: 'Venom Swarm', art: 'kasaka', exercise: 'plank', amount: 30 },
      { enemy: 'Blue Venom-Fanged Kasaka', art: 'kasaka', exercise: 'situp', amount: 20, boss: true, timeLimit: 240 },
    ],
    xp: 260,
    gold: 220,
    drops: [{ item: 'venomFang', chance: 0.5 }, { item: 'fatiguePotion', chance: 0.3 }],
    extraction: 'soldier',
  },
  {
    id: 'knights-hall',
    name: 'Job Change: Hall of Knights',
    rank: 'C',
    minLevel: 8,
    description:
      'A secret quest. Survive the knights of the ancient hall and defeat their commander to change your Job.',
    color: '#f87171',
    jobChange: true,
    waves: [
      { enemy: 'Ancient Knight', art: 'knight', exercise: 'pushup', amount: 15 },
      { enemy: 'Knight Battalion', art: 'knight', exercise: 'squat', amount: 20 },
      { enemy: 'Royal Guard', art: 'knight', exercise: 'plank', amount: 45 },
      { enemy: 'Blood-Red Commander Igris', art: 'commander', exercise: 'pushup', amount: 25, boss: true, timeLimit: 300 },
    ],
    xp: 500,
    gold: 400,
    drops: [{ item: 'demonRune', chance: 1 }],
    extraction: 'igris',
    title: 'necromancer',
  },
  {
    id: 'ice-forest',
    name: 'Red Gate: Frozen Forest',
    rank: 'C',
    minLevel: 12,
    description: 'A Red Gate. Once inside there is no exit until the boss falls. Bitterly cold.',
    color: '#7dd3fc',
    waves: [
      { enemy: 'Ice Elf Archers', art: 'demon', exercise: 'jumpingJack', amount: 40 },
      { enemy: 'Ice Elf Warband', art: 'demon', exercise: 'squat', amount: 25 },
      { enemy: 'Ice Bear Alpha', art: 'bear', exercise: 'situp', amount: 30, boss: true, timeLimit: 300 },
    ],
    xp: 420,
    gold: 360,
    drops: [{ item: 'fatiguePotion', chance: 0.5 }, { item: 'randomBox', chance: 0.25 }],
    extraction: 'tank',
  },
  {
    id: 'iron-vault',
    name: 'Iron Vault',
    rank: 'C',
    minLevel: 15,
    description: 'An armoured vanguard guards the vault. He will not fall easily.',
    color: '#94a3b8',
    waves: [
      { enemy: 'Armoured Sentry', art: 'knight', exercise: 'squat', amount: 30 },
      { enemy: 'Shield Wall', art: 'knight', exercise: 'pushup', amount: 20 },
      { enemy: 'Iron, the Vanguard', art: 'knight', exercise: 'plank', amount: 60, boss: true, timeLimit: 300 },
    ],
    xp: 520,
    gold: 420,
    drops: [{ item: 'healingPotion', chance: 0.6 }, { item: 'randomBox', chance: 0.3 }],
    extraction: 'iron',
  },
  {
    id: 'orc-fortress',
    name: 'High Orc Fortress',
    rank: 'B',
    minLevel: 20,
    description: 'High Orcs mass behind stone walls. Their shaman commands fire.',
    color: '#4ade80',
    waves: [
      { enemy: 'High Orc Warriors', art: 'orc', exercise: 'pushup', amount: 25 },
      { enemy: 'High Orc Berserkers', art: 'orc', exercise: 'squat', amount: 35 },
      { enemy: 'Orc War Drums', art: 'orc', exercise: 'jumpingJack', amount: 50 },
      { enemy: 'High Orc Shaman Tusk', art: 'orc', exercise: 'situp', amount: 40, boss: true, timeLimit: 360 },
    ],
    xp: 800,
    gold: 650,
    drops: [{ item: 'manaPotion', chance: 0.6 }, { item: 'randomBox', chance: 0.35 }],
    extraction: 'tusk',
  },
  {
    id: 'demon-castle',
    name: "Demon King's Castle",
    rank: 'A',
    minLevel: 28,
    description: 'One hundred floors of demons. At the top waits the Demon King.',
    color: '#c084fc',
    waves: [
      { enemy: 'Demon Soldiers', art: 'demon', exercise: 'pushup', amount: 30 },
      { enemy: 'Demon Nobles', art: 'demon', exercise: 'situp', amount: 35 },
      { enemy: 'Demon Knights', art: 'demon', exercise: 'squat', amount: 40 },
      { enemy: 'Demon King Baran', art: 'demon', exercise: 'pushup', amount: 40, boss: true, timeLimit: 420 },
    ],
    xp: 1200,
    gold: 1000,
    drops: [{ item: 'demonRune', chance: 0.8 }, { item: 'randomBox', chance: 0.5 }],
    extraction: 'soldier',
    title: 'demonHunter',
  },
  {
    id: 'wyvern-peak',
    name: 'Wyvern Peak',
    rank: 'A',
    minLevel: 35,
    description: 'Winds howl around a mountain spire. Wings blot out the sun.',
    color: '#2dd4bf',
    waves: [
      { enemy: 'Wyverns', art: 'wyvern', exercise: 'jumpingJack', amount: 60 },
      { enemy: 'Storm Wyverns', art: 'wyvern', exercise: 'squat', amount: 45 },
      { enemy: 'Sky Wyvern Kaisel', art: 'wyvern', exercise: 'plank', amount: 90, boss: true, timeLimit: 420 },
    ],
    xp: 1500,
    gold: 1200,
    drops: [{ item: 'dungeonKey', chance: 0.4 }, { item: 'randomBox', chance: 0.5 }],
    extraction: 'kaisel',
  },
  {
    id: 'jeju-island',
    name: 'Jeju Island',
    rank: 'S',
    minLevel: 45,
    description: 'An S-rank Gate that broke years ago. The ants have evolved. Their king awaits.',
    color: '#e879f9',
    waves: [
      { enemy: 'Soldier Ants', art: 'ant', exercise: 'squat', amount: 50 },
      { enemy: 'Royal Guard Ants', art: 'ant', exercise: 'pushup', amount: 40 },
      { enemy: 'Ant Queen', art: 'ant', exercise: 'situp', amount: 50 },
      { enemy: 'The Ant King', art: 'ant', exercise: 'jumpingJack', amount: 100, boss: true, timeLimit: 480 },
    ],
    xp: 2600,
    gold: 2200,
    drops: [{ item: 'demonRune', chance: 1 }, { item: 'holyWater', chance: 0.3 }],
    extraction: 'beru',
  },
  {
    id: 'monarch-domain',
    name: "Monarch's Domain",
    rank: 'National',
    minLevel: 70,
    description: 'Beyond the gate lies the realm of shadows. A colossal knight kneels at its heart.',
    color: '#fb7185',
    waves: [
      { enemy: 'Ancient Guardians', art: 'statue', exercise: 'pushup', amount: 60 },
      { enemy: 'Stone Colossi', art: 'statue', exercise: 'squat', amount: 80 },
      { enemy: 'Shadow Legion', art: 'soldier', exercise: 'situp', amount: 60 },
      { enemy: 'Grand Marshal Bellion', art: 'statue', exercise: 'plank', amount: 180, boss: true, timeLimit: 600 },
    ],
    xp: 6000,
    gold: 5000,
    drops: [{ item: 'demonRune', chance: 1 }, { item: 'holyWater', chance: 0.6 }],
    extraction: 'bellion',
  },
]

export const INSTANT_DUNGEON_ID = 'instant'

/** The key-only Instant Dungeon scales with the hunter. */
export function instantDungeon(level: number): DungeonDef {
  const s = 1 + Math.floor(level / 5) * 0.15
  const r = (n: number) => Math.round(n * s)
  return {
    id: INSTANT_DUNGEON_ID,
    name: 'Instant Dungeon',
    rank: level >= 50 ? 'A' : level >= 20 ? 'B' : 'C',
    minLevel: 1,
    description: 'A private dungeon summoned by key. Scales with your level and grants double XP.',
    color: '#a78bfa',
    requiresKey: true,
    waves: [
      { enemy: 'Shadowed Ghouls', art: 'soldier', exercise: 'squat', amount: r(20) },
      { enemy: 'Cursed Knights', art: 'knight', exercise: 'pushup', amount: r(15) },
      { enemy: 'Gatekeeper', art: 'statue', exercise: 'jumpingJack', amount: r(40), boss: true, timeLimit: 300 },
    ],
    xp: r(300),
    gold: r(300),
    drops: [{ item: 'randomBox', chance: 0.6 }, { item: 'manaPotion', chance: 0.4 }],
    extraction: 'soldier',
  }
}

/* ------------------------------------------------------- emergency quests */

export interface EmergencyTemplate {
  title: string
  description: string
  exercise: ExerciseId
  base: number
  minutes: number
}

export const EMERGENCY_TEMPLATES: EmergencyTemplate[] = [
  {
    title: 'Ambush',
    description: 'Hostile presence detected. Prepare your legs for battle.',
    exercise: 'squat',
    base: 30,
    minutes: 60,
  },
  {
    title: 'Break Through',
    description: 'A wall stands between you and your goal. Push through it.',
    exercise: 'pushup',
    base: 20,
    minutes: 60,
  },
  {
    title: 'Evasion Drill',
    description: 'Projectiles incoming. Stay light on your feet.',
    exercise: 'jumpingJack',
    base: 50,
    minutes: 45,
  },
  {
    title: 'Hold the Line',
    description: 'The gate is collapsing. Hold your position.',
    exercise: 'plank',
    base: 60,
    minutes: 45,
  },
  {
    title: 'Core Awakening',
    description: 'Mana is pooling in your core. Stabilise it.',
    exercise: 'situp',
    base: 30,
    minutes: 60,
  },
]

/* ---------------------------------------------------------------- penalty */

export const PENALTY_QUEST = {
  title: 'Penalty Quest: Survive',
  description:
    'You failed to complete the Daily Quest. You have been moved to the Penalty Zone. Survive the Giant Venomous Sand Centipedes.',
  waves: [
    { exercise: 'squat' as const, amount: 40 },
    { exercise: 'jumpingJack' as const, amount: 60 },
    { exercise: 'situp' as const, amount: 30 },
  ],
  timeLimit: 15 * 60,
}
