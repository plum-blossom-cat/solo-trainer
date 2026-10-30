/** Local-calendar date key, YYYY-MM-DD. The System resets at local midnight. */
export function dayKey(time: number | Date = Date.now()): string {
  const d = new Date(time)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function parseDayKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(key: string, days: number): string {
  const d = parseDayKey(key)
  d.setDate(d.getDate() + days)
  return dayKey(d)
}

/** Whole calendar days from a to b (b - a). */
export function daysBetween(a: string, b: string): number {
  const ms = parseDayKey(b).getTime() - parseDayKey(a).getTime()
  return Math.round(ms / 86_400_000)
}

export function msUntilMidnight(now = Date.now()): number {
  const d = new Date(now)
  const next = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)
  return next.getTime() - now
}

export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  return [h, m, s].map((n) => String(n).padStart(2, '0')).join(':')
}

export function formatClock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds))
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

/** 0 = Sunday … 6 = Saturday. */
export function weekday(key: string): number {
  return parseDayKey(key).getDay()
}

/** Monday of the week containing `key`. */
export function weekStart(key: string): string {
  return addDays(key, -((weekday(key) + 6) % 7))
}
