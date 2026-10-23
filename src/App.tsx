import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, type ReactNode } from 'react'
import { Particles } from './components/Particles'
import { Overlays } from './components/Overlays'
import { Toasts } from './components/Toasts'
import {
  IconBag,
  IconChart,
  IconGate,
  IconGear,
  IconQuest,
  IconShadow,
  IconStatus,
  IconTrain,
} from './components/icons'
import { RankBadge } from './components/ui'
import { rankFor } from './game/engine'
import { useStore, type Route } from './game/store'
import { Awakening } from './screens/Awakening'
import { Battle } from './screens/Battle'
import { Extraction } from './screens/Extraction'
import { Gates } from './screens/Gates'
import { Inventory } from './screens/Inventory'
import { PenaltyZone } from './screens/PenaltyZone'
import { Quests } from './screens/Quests'
import { Records } from './screens/Records'
import { Settings } from './screens/Settings'
import { Shadows } from './screens/Shadows'
import { Status } from './screens/Status'
import { Train } from './screens/Train'

const TABS: { route: Route; label: string; icon: ReactNode }[] = [
  { route: 'status', label: 'Status', icon: <IconStatus /> },
  { route: 'quests', label: 'Quests', icon: <IconQuest /> },
  { route: 'train', label: 'Train', icon: <IconTrain /> },
  { route: 'gates', label: 'Gates', icon: <IconGate /> },
  { route: 'shadows', label: 'Army', icon: <IconShadow /> },
]

const SCREENS: Record<Route, () => ReactNode> = {
  status: () => <Status />,
  quests: () => <Quests />,
  train: () => <Train />,
  gates: () => <Gates />,
  shadows: () => <Shadows />,
  inventory: () => <Inventory />,
  records: () => <Records />,
  settings: () => <Settings />,
}

function TopBar() {
  const data = useStore((s) => s.data)!
  const route = useStore((s) => s.route)
  const navigate = useStore((s) => s.navigate)
  const r = rankFor(data.level)
  return (
    <header className="topbar">
      <RankBadge rank={r.rank === 'National' ? 'N' : r.rank} color={r.color} size={34} />
      <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
        <div className="brand">THE SYSTEM</div>
        <div className="small muted" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          Lv. {data.level} · {data.name}
        </div>
      </div>
      <span className="chip gold-text" title="Gold">
        ◈ {Math.floor(data.gold).toLocaleString()}
      </span>
      <button className={`icon-btn ${route === 'inventory' ? 'active' : ''}`} aria-label="Inventory" onClick={() => navigate('inventory')}>
        <IconBag />
      </button>
      <button className={`icon-btn ${route === 'records' ? 'active' : ''}`} aria-label="Records" onClick={() => navigate('records')}>
        <IconChart />
      </button>
      <button className={`icon-btn ${route === 'settings' ? 'active' : ''}`} aria-label="Settings" onClick={() => navigate('settings')}>
        <IconGear />
      </button>
    </header>
  )
}

function Nav() {
  const route = useStore((s) => s.route)
  const navigate = useStore((s) => s.navigate)
  const data = useStore((s) => s.data)!
  const badges: Partial<Record<Route, boolean>> = {
    status: data.statPoints > 0,
    quests: (data.daily.completed && !data.daily.rewardClaimed) || data.emergency?.status === 'active',
    shadows: !!data.pendingExtraction,
  }
  return (
    <nav className="nav" aria-label="Main">
      <div className="nav-inner">
        {TABS.map((t) => (
          <button key={t.route} className={route === t.route ? 'active' : ''} onClick={() => navigate(t.route)} aria-current={route === t.route}>
            {t.icon}
            {t.label}
            {badges[t.route] && <span className="badge" />}
          </button>
        ))}
      </div>
    </nav>
  )
}

export default function App() {
  const data = useStore((s) => s.data)
  const route = useStore((s) => s.route)
  const battle = useStore((s) => s.battle)
  const arise = useStore((s) => s.arise)
  const tick = useStore((s) => s.tick)
  const reduceMotion = data?.settings.reduceMotion ?? false

  useEffect(() => {
    if (!data) return
    tick()
    const id = setInterval(tick, 30_000)
    const onVis = () => document.visibilityState === 'visible' && tick()
    document.addEventListener('visibilitychange', onVis)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', onVis)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!data, tick])

  let body: ReactNode
  let withNav = false
  if (!data) {
    body = <Awakening />
  } else if (data.penalty.active && route !== 'settings') {
    body = <PenaltyZone />
  } else if (battle) {
    body = <Battle dungeon={battle} />
  } else if (data.pendingExtraction || arise) {
    body = <Extraction />
  } else {
    withNav = true
    body = (
      <>
        <TopBar />
        <main className="main">
          <AnimatePresence mode="wait">
            <motion.div
              key={route}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
            >
              {SCREENS[route]()}
            </motion.div>
          </AnimatePresence>
        </main>
        <Nav />
      </>
    )
  }

  const penalty = data?.penalty.active && route !== 'settings'
  return (
    <div className={`app ${withNav ? 'with-nav' : ''} ${reduceMotion ? 'reduce-motion' : ''}`}>
      <Particles color={penalty ? '248,113,113' : '96,165,250'} disabled={reduceMotion} />
      {body}
      <Toasts />
      <Overlays />
    </div>
  )
}
