import { AnimatePresence, motion } from 'framer-motion'
import { useEffect } from 'react'
import { useStore, type Notice } from '../game/store'

function Toast({ n }: { n: Notice }) {
  const dismiss = useStore((s) => s.dismissNotice)
  useEffect(() => {
    const id = setTimeout(() => dismiss(n.id), n.tone === 'alert' ? 7000 : 4200)
    return () => clearTimeout(id)
  }, [n.id, n.tone, dismiss])
  return (
    <motion.div
      layout
      className={`toast ${n.tone}`}
      initial={{ opacity: 0, scaleY: 0.05, scaleX: 0.7 }}
      animate={{ opacity: 1, scaleY: 1, scaleX: 1 }}
      exit={{ opacity: 0, scaleY: 0.05, transition: { duration: 0.2 } }}
      transition={{ duration: 0.3, ease: [0.2, 0.9, 0.2, 1] }}
      onClick={() => dismiss(n.id)}
      role="status"
    >
      <div className="t-title">
        <span className="tag" style={{ fontSize: 10 }}>
          {n.tone === 'alert' || n.tone === 'warn' ? 'Warning' : n.tone === 'reward' ? 'Reward' : n.tone === 'quest' ? 'Quest' : 'System'}
        </span>
        {n.title}
      </div>
      {n.body && <div className="t-body">{n.body}</div>}
    </motion.div>
  )
}

export function Toasts() {
  const notices = useStore((s) => s.notices)
  return (
    <div className="toasts" aria-live="polite">
      <AnimatePresence initial={false}>
        {notices.slice(-4).map((n) => (
          <Toast key={n.id} n={n} />
        ))}
      </AnimatePresence>
    </div>
  )
}
