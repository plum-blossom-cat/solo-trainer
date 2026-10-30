/**
 * Original SVG silhouettes for the hunter, monsters and shadow soldiers.
 * Everything is drawn as dark shapes with glowing eyes so the same art reads
 * as an enemy (red eyes, cold rim light) or as a shadow (purple smoke).
 */
import { motion } from 'framer-motion'
import { useId, type ReactNode } from 'react'
import type { ArtId } from '../game/types'

export type FigureArt = ArtId | 'hunter'

interface ArtDef {
  body: ReactNode
  eyes: [number, number][]
  eyeR?: number
}

const ARTS: Record<FigureArt, ArtDef> = {
  hunter: {
    body: (
      <>
        {/* coat tails */}
        <path d="M78 96 L64 206 L86 214 L94 150 L106 150 L114 214 L136 206 L122 96 Z" />
        {/* legs */}
        <path d="M89 146 L85 228 L97 228 L100 166 L103 228 L115 228 L111 146 Z" />
        {/* torso */}
        <path d="M80 70 Q100 62 120 70 L126 104 L120 150 L80 150 L74 104 Z" />
        {/* collar */}
        <path d="M80 72 L74 58 L88 66 L100 56 L112 66 L126 58 L120 72 Z" />
        {/* arms */}
        <path d="M80 74 L66 112 L60 148 L69 151 L77 116 L88 92 Z" />
        <path d="M120 74 L134 112 L140 148 L131 151 L123 116 L112 92 Z" />
        {/* head + hair */}
        <path d="M86 50 Q84 26 100 24 Q118 24 116 48 L113 60 Q100 68 87 60 Z" />
        <path d="M84 40 L80 52 L88 44 L86 56 L94 42 L100 30 L108 42 L114 56 L113 44 L120 52 L116 38 Q112 20 98 21 Q84 22 84 40 Z" />
        {/* daggers */}
        <path className="blade" d="M63 150 L48 196 L52 197 L67 152 Z" />
        <path className="blade" d="M137 150 L152 196 L148 197 L133 152 Z" />
      </>
    ),
    eyes: [
      [94, 46],
      [106, 46],
    ],
    eyeR: 2.2,
  },
  soldier: {
    body: (
      <>
        <path d="M84 150 L80 228 L94 228 L100 170 L106 228 L120 228 L116 150 Z" />
        <path d="M78 76 L122 76 L128 116 L118 156 L82 156 L72 116 Z" />
        <path d="M78 78 L62 120 L64 150 L72 150 L74 122 L88 96 Z" />
        <path d="M122 78 L138 118 L142 134 L134 138 L126 122 L112 96 Z" />
        <path d="M84 60 Q84 34 100 32 Q116 34 116 60 L112 74 L88 74 Z" />
        <path d="M86 40 L100 18 L114 40 Z" />
        <path className="blade" d="M141 40 L145 40 L144 226 L142 226 Z" />
        <path className="blade" d="M143 22 L149 44 L137 44 Z" />
      </>
    ),
    eyes: [
      [94, 54],
      [106, 54],
    ],
  },
  goblin: {
    body: (
      <>
        <path d="M84 196 L80 228 L94 228 L98 204 Z M116 196 L120 228 L106 228 L102 204 Z" />
        <ellipse cx="100" cy="172" rx="30" ry="34" />
        <path d="M74 158 L56 188 L62 192 L80 172 Z" />
        <path d="M126 156 L148 140 L152 146 L132 170 Z" />
        <circle cx="100" cy="124" r="22" />
        <path d="M82 118 L48 100 L84 134 Z M118 118 L152 100 L116 134 Z" />
        <path d="M108 140 L114 150 L104 146 Z M92 140 L86 150 L96 146 Z" />
        <path d="M146 142 L170 100 L178 96 L182 104 L154 146 Z" />
      </>
    ),
    eyes: [
      [92, 122],
      [108, 122],
    ],
    eyeR: 3,
  },
  hobgoblin: {
    body: (
      <>
        <path d="M78 186 L72 228 L92 228 L98 196 Z M122 186 L128 228 L108 228 L102 196 Z" />
        <path d="M66 110 Q100 92 134 110 L140 160 Q100 206 60 160 Z" />
        <path d="M66 116 L42 168 L52 176 L76 140 Z" />
        <path d="M134 116 L160 160 L150 168 L126 140 Z" />
        <circle cx="100" cy="86" r="24" />
        <path d="M80 80 L40 58 L82 100 Z M120 80 L160 58 L118 100 Z" />
        <path d="M86 68 L80 40 L94 64 Z M114 68 L120 40 L106 64 Z" />
        <path d="M150 166 L172 110 L186 108 L188 122 L160 172 Z" />
      </>
    ),
    eyes: [
      [91, 84],
      [109, 84],
    ],
    eyeR: 3.2,
  },
  wolf: {
    body: (
      <>
        <path d="M60 136 Q90 108 150 116 Q182 122 186 150 Q186 176 160 180 L70 178 Q52 166 60 136 Z" />
        <path d="M66 140 L28 150 L24 160 L34 166 L62 168 L76 160 Z" />
        <path d="M60 130 L54 100 L74 126 Z M72 124 L72 96 L86 122 Z" />
        <path d="M70 120 L80 108 L90 116 L100 104 L110 114 L122 104 L130 116 L144 108 L150 120 Z" />
        <path d="M74 170 L66 228 L78 228 L88 176 Z M98 176 L94 228 L106 228 L110 178 Z" />
        <path d="M144 176 L140 228 L152 228 L158 176 Z M166 168 L172 228 L184 228 L180 160 Z" />
        <path d="M182 140 Q206 120 200 92 Q196 124 176 132 Z" />
        <path d="M30 160 L36 172 L42 162 L48 172 L54 164 Z" />
      </>
    ),
    eyes: [[50, 146]],
    eyeR: 3,
  },
  kasaka: {
    body: (
      <>
        <path
          d="M18 214 C 70 240 160 230 162 186 C 164 146 70 170 70 122 C 70 86 112 70 134 84"
          fill="none"
          strokeWidth="30"
          strokeLinecap="round"
          className="stroke-body"
        />
        <path d="M120 64 Q150 52 176 70 Q186 82 172 94 L132 102 Q116 90 120 64 Z" />
        <path d="M128 60 L118 40 L136 58 Z M146 56 L146 34 L156 58 Z M164 62 L174 44 L170 66 Z" />
        <path className="blade" d="M160 94 L164 112 L168 94 Z M172 92 L178 106 L178 90 Z" />
      </>
    ),
    eyes: [
      [160, 74],
      [146, 76],
    ],
    eyeR: 3.2,
  },
  knight: {
    body: (
      <>
        <path d="M80 150 L76 228 L96 228 L100 172 L104 228 L124 228 L120 150 Z" />
        <path d="M70 76 L130 76 L134 120 L122 160 L78 160 L66 120 Z" />
        <path d="M54 72 Q70 60 86 72 L84 96 L58 98 Z M146 72 Q130 60 114 72 L116 96 L142 98 Z" />
        <path d="M58 96 L50 148 L62 150 L72 110 Z" />
        <path d="M142 96 L150 140 L140 144 L130 110 Z" />
        <path d="M80 70 L80 36 Q100 24 120 36 L120 70 Z" />
        <path d="M26 104 L64 100 L66 168 L46 186 L28 168 Z" />
        <path className="blade" d="M146 132 L150 132 L150 44 L148 36 L146 44 Z" />
        <path d="M138 136 L158 136 L158 141 L138 141 Z" />
      </>
    ),
    eyes: [
      [93, 52],
      [107, 52],
    ],
    eyeR: 2,
  },
  commander: {
    body: (
      <>
        {/* plume */}
        <path className="plume" d="M100 22 Q76 6 54 26 Q36 46 26 92 Q50 52 70 46 Q86 42 96 40 Z" />
        {/* cape */}
        <path d="M76 74 L124 74 L148 206 Q100 196 52 206 Z" opacity="0.9" />
        <path d="M84 150 L80 228 L96 228 L100 172 L104 228 L120 228 L116 150 Z" />
        <path d="M76 74 L124 74 L128 116 L118 156 L82 156 L72 116 Z" />
        <path d="M62 74 Q74 62 88 72 L86 92 L64 94 Z M138 74 Q126 62 112 72 L114 92 L136 94 Z" />
        <path d="M66 92 L56 140 L66 144 L76 108 Z M134 92 L144 140 L134 144 L124 108 Z" />
        <path d="M84 68 L84 34 Q100 22 116 34 L116 68 Q100 76 84 68 Z" />
        <path className="blade" d="M58 140 L64 140 L62 228 L60 230 Z" />
        <path d="M50 138 L72 138 L72 143 L50 143 Z" />
      </>
    ),
    eyes: [
      [94, 48],
      [106, 48],
    ],
    eyeR: 2.2,
  },
  bear: {
    body: (
      <>
        <path d="M54 130 Q80 84 150 92 Q192 100 194 150 Q196 186 168 192 L78 192 Q44 176 54 130 Z" />
        <circle cx="52" cy="132" r="28" />
        <path d="M36 112 L34 96 L48 106 Z M60 106 L64 92 L72 108 Z" />
        <path d="M30 140 L14 148 L18 158 L40 154 Z" />
        <path d="M68 180 L62 228 L84 228 L90 186 Z M104 186 L102 228 L122 228 L124 188 Z" />
        <path d="M146 186 L144 228 L164 228 L166 186 Z M172 178 L178 228 L196 228 L190 170 Z" />
        <path d="M86 96 L94 82 L102 94 L112 80 L120 92 L130 80 L138 92 L150 84 L154 96 Z" />
      </>
    ),
    eyes: [
      [44, 128],
      [58, 126],
    ],
    eyeR: 3,
  },
  orc: {
    body: (
      <>
        <path d="M76 160 L68 228 L94 228 L100 180 L106 228 L132 228 L124 160 Z" />
        <path d="M60 84 Q100 66 140 84 L146 132 L128 168 L72 168 L54 132 Z" />
        <path d="M60 86 L36 142 L50 150 L70 112 Z" />
        <path d="M140 86 L160 134 L150 142 L130 112 Z" />
        <path d="M80 82 Q76 44 100 40 Q124 44 120 82 Q100 92 80 82 Z" />
        <path className="blade" d="M88 76 L84 62 L92 72 Z M112 76 L116 62 L108 72 Z" />
        <path d="M156 136 L162 136 L166 30 L160 30 Z" />
        <circle className="orb" cx="163" cy="24" r="10" />
        <path d="M152 18 L163 0 L174 18 Z" opacity="0.8" />
      </>
    ),
    eyes: [
      [92, 60],
      [108, 60],
    ],
    eyeR: 3,
  },
  demon: {
    body: (
      <>
        <path className="wing" d="M84 86 Q40 40 6 60 Q30 76 24 100 Q44 96 52 116 Q64 104 84 112 Z" />
        <path className="wing" d="M116 86 Q160 40 194 60 Q170 76 176 100 Q156 96 148 116 Q136 104 116 112 Z" />
        <path d="M86 150 L80 228 L96 228 L100 172 L104 228 L120 228 L114 150 Z" />
        <path d="M78 76 L122 76 L126 112 L116 156 L84 156 L74 112 Z" />
        <path d="M78 80 L62 130 L52 150 L60 154 L74 132 L90 98 Z" />
        <path d="M122 80 L138 130 L148 150 L140 154 L126 132 L110 98 Z" />
        <path d="M86 66 Q84 40 100 38 Q116 40 114 66 L106 76 L94 76 Z" />
        <path d="M88 48 Q70 40 66 18 Q80 34 92 40 Z M112 48 Q130 40 134 18 Q120 34 108 40 Z" />
      </>
    ),
    eyes: [
      [94, 56],
      [106, 56],
    ],
    eyeR: 2.4,
  },
  wyvern: {
    body: (
      <>
        <path className="wing" d="M92 112 L20 40 L30 76 L6 72 L28 104 L8 114 L60 130 Z" />
        <path className="wing" d="M108 112 L180 40 L170 76 L194 72 L172 104 L192 114 L140 130 Z" />
        <path d="M76 120 Q100 100 124 120 L130 168 Q100 190 70 168 Z" />
        <path d="M90 116 Q86 80 96 60 L106 60 Q112 82 110 116 Z" />
        <path d="M84 62 L100 34 L120 52 L112 66 Z" />
        <path d="M92 44 L80 28 L98 38 Z M106 40 L112 22 L114 44 Z" />
        <path d="M80 166 L72 216 L88 216 L94 176 Z M120 166 L128 216 L112 216 L106 176 Z" />
        <path d="M104 182 Q140 210 170 226 Q130 218 98 190 Z" />
      </>
    ),
    eyes: [[108, 52]],
    eyeR: 3,
  },
  ant: {
    body: (
      <>
        <path className="wing" d="M90 92 Q50 60 30 90 Q44 120 88 108 Z" opacity="0.55" />
        <path className="wing" d="M110 92 Q150 60 170 90 Q156 120 112 108 Z" opacity="0.55" />
        <path d="M88 150 L74 196 L84 228 L92 228 L86 198 L100 164 L114 198 L108 228 L116 228 L126 196 L112 150 Z" />
        <path d="M84 84 L116 84 L120 120 L110 156 L90 156 L80 120 Z" />
        <ellipse cx="100" cy="166" rx="16" ry="12" />
        <path d="M84 88 L60 118 L42 112 L38 118 L58 128 L88 104 Z" />
        <path d="M116 88 L140 118 L158 112 L162 118 L142 128 L112 104 Z" />
        <path className="blade" d="M42 112 L20 96 L36 118 Z M158 112 L180 96 L164 118 Z" />
        <path d="M86 72 Q84 48 100 46 Q116 48 114 72 L106 84 L94 84 Z" />
        <path d="M92 50 Q78 28 62 22 Q80 34 88 54 Z M108 50 Q122 28 138 22 Q120 34 112 54 Z" />
        <path d="M94 80 L90 92 L98 84 Z M106 80 L110 92 L102 84 Z" />
      </>
    ),
    eyes: [
      [93, 62],
      [107, 62],
    ],
    eyeR: 3,
  },
  centipede: {
    body: (
      <>
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => {
          const t = i / 9
          const x = 30 + t * 150
          const y = 200 - Math.sin(t * Math.PI * 1.2) * 110 + t * 20
          const r = 18 - t * 6
          return (
            <g key={i}>
              <ellipse cx={x} cy={y} rx={r} ry={r * 0.8} />
              <path d={`M${x - 4} ${y} L${x - 14} ${y + r + 12} M${x + 4} ${y} L${x + 14} ${y + r + 12}`} strokeWidth="3" className="stroke-body" fill="none" />
            </g>
          )
        })}
        <path d="M12 196 L-2 170 L18 186 Z M20 214 L2 230 L26 210 Z" />
      </>
    ),
    eyes: [
      [24, 194],
      [34, 192],
    ],
    eyeR: 3,
  },
  statue: {
    body: (
      <>
        <path d="M70 80 L130 80 L172 216 Q100 204 28 216 Z" opacity="0.9" />
        <path d="M80 150 L74 228 L96 228 L100 176 L104 228 L126 228 L120 150 Z" />
        <path d="M68 78 L132 78 L138 124 L124 160 L76 160 L62 124 Z" />
        <path d="M48 76 Q66 56 86 72 L84 100 L52 102 Z M152 76 Q134 56 114 72 L116 100 L148 102 Z" />
        <path d="M52 100 L42 150 L54 154 L68 112 Z M148 100 L158 150 L146 154 L132 112 Z" />
        <path d="M82 72 L82 38 Q100 26 118 38 L118 72 Q100 80 82 72 Z" />
        <path d="M80 40 L72 12 L88 32 L94 8 L100 30 L106 8 L112 32 L128 12 L120 40 Z" />
        <path className="blade" d="M40 148 Q20 190 36 226 Q26 186 48 152 Z" />
      </>
    ),
    eyes: [
      [93, 54],
      [107, 54],
    ],
    eyeR: 2.4,
  },
}

/**
 * Rendered images in src/art/images/<art>.png (made by scripts/generate-art.mjs)
 * replace the matching silhouette automatically.
 */
const IMAGES: Partial<Record<FigureArt, string>> = Object.fromEntries(
  Object.entries(
    import.meta.glob<string>('./images/*.{png,webp,jpg,jpeg}', { eager: true, query: '?url', import: 'default' }),
  ).map(([path, url]) => [path.replace(/^.*\/|\.\w+$/g, ''), url]),
)

export interface FigureProps {
  art: FigureArt
  variant?: 'enemy' | 'shadow' | 'hunter'
  aura?: string
  size?: number
  animate?: boolean
  flip?: boolean
  hurt?: boolean
}

export function Figure({ art, variant = 'enemy', aura, size = 200, animate = true, flip = false, hurt = false }: FigureProps) {
  const uid = useId().replace(/:/g, '')
  const def = ARTS[art]
  const auraColor = aura ?? (variant === 'shadow' ? '#8b5cf6' : variant === 'hunter' ? '#3b82f6' : '#ef4444')
  const eyeColor = variant === 'enemy' ? '#ff3b3b' : variant === 'hunter' ? '#9be7ff' : '#c4b5fd'
  const bodyTop = variant === 'shadow' ? '#1a1030' : variant === 'hunter' ? '#14213d' : '#1b2233'
  const bodyBottom = variant === 'shadow' ? '#020005' : '#03050a'

  return (
    <motion.div
      style={{ position: 'relative', width: size, height: size * 1.2 }}
      animate={animate ? { y: [0, -4, 0] } : undefined}
      transition={animate ? { duration: 3.6, repeat: Infinity, ease: 'easeInOut' } : undefined}
    >
      {/* aura */}
      <div
        style={{
          position: 'absolute',
          inset: '8% 12% 0',
          borderRadius: '50%',
          background: `radial-gradient(ellipse at 50% 60%, ${auraColor}55, transparent 65%)`,
          filter: 'blur(8px)',
        }}
      />
      {variant === 'shadow' && <Smoke color={auraColor} />}
      {IMAGES[art] ? (
        <img
          src={IMAGES[art]}
          alt=""
          aria-hidden
          draggable={false}
          style={{
            position: 'relative',
            display: 'block',
            width: size,
            height: size * 1.2,
            objectFit: 'contain',
            objectPosition: 'center bottom',
            transform: flip ? 'scaleX(-1)' : undefined,
            // Shadows are the same creature reborn: drained of colour and tinted by their aura.
            filter: [
              variant === 'shadow' ? 'grayscale(0.7) brightness(0.5) sepia(0.7) hue-rotate(220deg) saturate(2.4)' : '',
              `drop-shadow(0 0 ${variant === 'enemy' ? 5 : 9}px ${auraColor})`,
              hurt ? 'brightness(2.2)' : '',
            ].join(' '),
            transition: 'filter 0.12s',
          }}
        />
      ) : (
      <svg
        viewBox="0 0 200 240"
        width={size}
        height={size * 1.2}
        style={{
          position: 'relative',
          overflow: 'visible',
          transform: flip ? 'scaleX(-1)' : undefined,
          filter: `drop-shadow(0 0 ${variant === 'enemy' ? 4 : 8}px ${auraColor}) ${hurt ? 'brightness(2.2)' : ''}`,
          transition: 'filter 0.12s',
        }}
        aria-hidden
      >
        <defs>
          <linearGradient id={`g${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={bodyTop} />
            <stop offset="1" stopColor={bodyBottom} />
          </linearGradient>
          <radialGradient id={`e${uid}`}>
            <stop offset="0" stopColor="#fff" />
            <stop offset="0.35" stopColor={eyeColor} />
            <stop offset="1" stopColor={eyeColor} stopOpacity="0" />
          </radialGradient>
        </defs>
        <ellipse cx="100" cy="230" rx="60" ry="7" fill={auraColor} opacity="0.25" />
        <g
          fill={`url(#g${uid})`}
          stroke={auraColor}
          strokeOpacity={variant === 'enemy' ? 0.35 : 0.7}
          strokeWidth="1.2"
          strokeLinejoin="round"
          className={`fig f${uid}`}
        >
          {def.body}
        </g>
        <style>{`
          .f${uid} .stroke-body { stroke: ${bodyTop}; stroke-opacity: 1; }
          .f${uid} .blade { fill: ${variant === 'enemy' ? '#94a3b8' : auraColor}; fill-opacity: 0.85; }
          .f${uid} .plume { fill: ${variant === 'enemy' ? '#7f1d1d' : auraColor}; fill-opacity: 0.85; }
          .f${uid} .orb { fill: ${variant === 'enemy' ? '#f97316' : auraColor}; }
          .f${uid} .wing { fill-opacity: 0.8; }
        `}</style>
        {def.eyes.map(([x, y], i) => (
          <g key={i}>
            <circle cx={x} cy={y} r={(def.eyeR ?? 2.5) * 3.2} fill={`url(#e${uid})`} opacity="0.85">
              {animate && <animate attributeName="opacity" values="0.6;1;0.6" dur="2.4s" repeatCount="indefinite" />}
            </circle>
            <circle cx={x} cy={y} r={def.eyeR ?? 2.5} fill="#fff" />
          </g>
        ))}
      </svg>
      )}
    </motion.div>
  )
}

/** Rising shadow smoke for extracted soldiers. */
function Smoke({ color }: { color: string }) {
  const puffs = Array.from({ length: 9 }, (_, i) => i)
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      {puffs.map((i) => (
        <motion.span
          key={i}
          style={{
            position: 'absolute',
            bottom: '2%',
            left: `${18 + ((i * 37) % 64)}%`,
            width: 26 + (i % 3) * 10,
            height: 26 + (i % 3) * 10,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${color}66, transparent 70%)`,
            filter: 'blur(4px)',
          }}
          animate={{ y: [0, -120 - (i % 4) * 30], opacity: [0, 0.9, 0], scale: [0.6, 1.4] }}
          transition={{ duration: 2.6 + (i % 3) * 0.6, repeat: Infinity, delay: i * 0.35, ease: 'easeOut' }}
        />
      ))}
    </div>
  )
}
