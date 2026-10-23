export interface GeoFix {
  lat: number
  lon: number
  accuracy: number
  t: number
}

const R = 6_371_000

export function haversine(a: GeoFix, b: GeoFix): number {
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLon = toRad(b.lon - a.lon)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)))
}

/**
 * Accumulates distance from GPS fixes while rejecting noise: inaccurate fixes,
 * tiny jitter while standing still, and teleports faster than a sprinter.
 */
export function createDistanceTracker(opts = { maxAccuracy: 35, minStep: 3, maxSpeed: 11 }) {
  let last: GeoFix | null = null
  let meters = 0
  return {
    get meters() {
      return meters
    },
    reset() {
      last = null
      meters = 0
    },
    push(fix: GeoFix): number {
      if (fix.accuracy > opts.maxAccuracy) return meters
      if (!last) {
        last = fix
        return meters
      }
      const d = haversine(last, fix)
      const dt = (fix.t - last.t) / 1000
      if (dt <= 0) return meters
      if (d / dt > opts.maxSpeed) return meters
      if (d < Math.max(opts.minStep, fix.accuracy * 0.25)) return meters
      meters += d
      last = fix
      return meters
    },
  }
}
