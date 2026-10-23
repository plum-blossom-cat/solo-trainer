import { useEffect, useRef } from 'react'

/** Drifting mana motes behind every screen. */
export function Particles({ color = '96,165,250', density = 1, disabled = false }: { color?: string; density?: number; disabled?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas || disabled) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    let w = 0
    let h = 0
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    const resize = () => {
      w = canvas.clientWidth
      h = canvas.clientHeight
      canvas.width = w * dpr
      canvas.height = h * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    window.addEventListener('resize', resize)

    const count = Math.round(Math.min(70, (w * h) / 16000) * density)
    const motes = Array.from({ length: count }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: 0.6 + Math.random() * 1.8,
      vy: 0.12 + Math.random() * 0.4,
      vx: (Math.random() - 0.5) * 0.15,
      a: 0.2 + Math.random() * 0.6,
      p: Math.random() * Math.PI * 2,
    }))

    let raf = 0
    const draw = () => {
      ctx.clearRect(0, 0, w, h)
      for (const m of motes) {
        m.y -= m.vy
        m.x += m.vx + Math.sin((m.p += 0.01)) * 0.1
        if (m.y < -10) {
          m.y = h + 10
          m.x = Math.random() * w
        }
        const alpha = m.a * (0.6 + 0.4 * Math.sin(m.p * 3))
        const g = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, m.r * 4)
        g.addColorStop(0, `rgba(${color},${alpha})`)
        g.addColorStop(1, `rgba(${color},0)`)
        ctx.fillStyle = g
        ctx.beginPath()
        ctx.arc(m.x, m.y, m.r * 4, 0, Math.PI * 2)
        ctx.fill()
      }
      raf = requestAnimationFrame(draw)
    }
    draw()
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [color, density, disabled])

  return (
    <canvas
      ref={ref}
      aria-hidden
      style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', zIndex: 0, pointerEvents: 'none' }}
    />
  )
}
