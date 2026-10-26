import { useEffect, useMemo, useRef } from 'react'
import { animate, motion, useMotionValue, useTransform } from 'motion/react'
import { Check, Sparkles } from 'lucide-react'
import { planned, type PlannedId } from '../lib/plannedFeatures'
import type { Burst, ConfirmOpts, ToastOpts } from '../state/ui'
import { Dialog } from './Dialog'
import { Presence, useClosing } from './Presence'

const platformLabel = { beide: 'Android und iPhone', android: 'Nur Android', iphone: 'Nur iPhone' } as const

function PlannedDialog({ id, onClose }: { id: PlannedId; onClose: () => void }) {
  const f = planned[id]
  return (
    <Dialog label={f.title} onClose={onClose} className="dialog--planned">
      <div className="orb" aria-hidden>
        <span className="orb__ring" />
        <span className="orb__emoji">{f.emoji}</span>
        <Sparkles className="orb__spark orb__spark--a" size={16} />
        <Sparkles className="orb__spark orb__spark--b" size={12} />
      </div>
      <div className="chip chip--accent">Geplant für {f.version}</div>
      <h2 className="dialog__title">{f.title}</h2>
      <p className="dialog__text">{f.text}</p>
      <p className="dialog__meta">{platformLabel[f.platform]}</p>
      <button className="btn btn--primary btn--block" onClick={onClose} autoFocus>
        Alles klar
      </button>
    </Dialog>
  )
}

function ConfirmDialog({ c, onClose }: { c: ConfirmOpts; onClose: () => void }) {
  const progress = useMotionValue(0)
  const width = useTransform(progress, (v) => `${v * 100}%`)
  const ctrl = useRef<ReturnType<typeof animate> | null>(null)
  const done = useRef(false)

  const finish = () => {
    if (done.current) return
    done.current = true
    c.onConfirm()
    onClose()
  }
  const start = () => {
    ctrl.current?.stop()
    ctrl.current = animate(progress, 1, { duration: 1.1, ease: 'linear', onComplete: finish })
  }
  const stop = () => {
    if (done.current) return
    ctrl.current?.stop()
    animate(progress, 0, { duration: 0.25 })
  }

  return (
    <Dialog label={c.title} onClose={onClose}>
      <h2 className="dialog__title">{c.title}</h2>
      <p className="dialog__text">{c.text}</p>
      <div className="dialog__actions">
        <button className="btn btn--ghost" onClick={onClose}>
          Abbrechen
        </button>
        {c.hold ? (
          <button
            className="btn btn--danger btn--hold"
            onPointerDown={start}
            onPointerUp={stop}
            onPointerLeave={stop}
            onPointerCancel={stop}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && !e.repeat && start()}
            onKeyUp={stop}
          >
            <motion.span className="btn__fill" style={{ width }} />
            <span className="btn__label">{c.confirmLabel}</span>
            <span className="btn__hint">gedrückt halten</span>
          </button>
        ) : (
          <button className={`btn ${c.tone === 'danger' ? 'btn--danger' : 'btn--primary'}`} onClick={finish}>
            {c.confirmLabel}
          </button>
        )}
      </div>
    </Dialog>
  )
}

function Toast({ t, onClose }: { t: ToastOpts & { id: number }; onClose: () => void }) {
  const closing = useClosing()
  const closeRef = useRef(onClose)
  closeRef.current = onClose
  useEffect(() => {
    const timer = setTimeout(() => closeRef.current(), 5200)
    return () => clearTimeout(timer)
  }, [t.id])

  return (
    <motion.div
      className="toast"
      role="status"
      data-closing={closing}
      initial={{ y: -40, opacity: 0, scale: 0.92 }}
      animate={closing ? { y: -24, opacity: 0, scale: 0.96 } : { y: 0, opacity: 1, scale: 1 }}
      transition={closing ? { duration: 0.18 } : { type: 'spring', stiffness: 420, damping: 30 }}
    >
      <span className="toast__check">{t.emoji ?? <Check size={14} />}</span>
      <span className="toast__msg">{t.message}</span>
      {t.actionLabel && (
        <button
          className="toast__action"
          onClick={() => {
            t.onAction?.()
            onClose()
          }}
        >
          {t.actionLabel}
        </button>
      )}
      <motion.span className="toast__timer" initial={{ scaleX: 1 }} animate={{ scaleX: 0 }} transition={{ duration: 5.2, ease: 'linear' }} />
    </motion.div>
  )
}

const CONFETTI_HUES = [14, 48, 340, 190, 150, 280]

function ConfettiBurst({ b }: { b: Burst }) {
  const parts = useMemo(
    () =>
      Array.from({ length: 26 }, (_, i) => {
        const angle = (Math.PI * 2 * i) / 26 + Math.random() * 0.5
        const power = 70 + Math.random() * 110
        return {
          dx: Math.cos(angle) * power,
          dy: Math.sin(angle) * power - 40,
          rot: (Math.random() - 0.5) * 720,
          hue: CONFETTI_HUES[i % CONFETTI_HUES.length],
          w: 5 + Math.random() * 6,
          h: 8 + Math.random() * 8,
          delay: Math.random() * 0.06,
          round: i % 3 === 0,
        }
      }),
    [],
  )
  return (
    <div className="confetti" style={{ left: b.x, top: b.y }} aria-hidden>
      {parts.map((p, i) => (
        <motion.span
          key={i}
          className="confetti__bit"
          style={{
            width: p.w,
            height: p.round ? p.w : p.h,
            borderRadius: p.round ? '50%' : 2,
            background: `oklch(0.78 0.17 ${p.hue})`,
          }}
          initial={{ x: 0, y: 0, opacity: 1, scale: 0.4, rotate: 0 }}
          animate={{
            x: p.dx,
            y: [0, p.dy, p.dy + 150],
            opacity: [1, 1, 0],
            scale: [0.4, 1, 0.9],
            rotate: p.rot,
          }}
          transition={{ duration: 1.25, delay: p.delay, ease: 'easeOut', times: [0, 0.45, 1] }}
        />
      ))}
    </div>
  )
}

interface OverlaysProps {
  plannedId: PlannedId | null
  onClosePlanned: () => void
  confirm: ConfirmOpts | null
  onCloseConfirm: () => void
  toast: (ToastOpts & { id: number }) | null
  onCloseToast: () => void
  bursts: Burst[]
}

export function Overlays(p: OverlaysProps) {
  return (
    <>
      <Presence show={!!p.plannedId}>{p.plannedId && <PlannedDialog id={p.plannedId} onClose={p.onClosePlanned} />}</Presence>
      <Presence show={!!p.confirm}>{p.confirm && <ConfirmDialog c={p.confirm} onClose={p.onCloseConfirm} />}</Presence>
      <div className="toast-host">
        <Presence show={!!p.toast} exitMs={260} portal={false}>
          {p.toast && <Toast key={p.toast.id} t={p.toast} onClose={p.onCloseToast} />}
        </Presence>
      </div>
      {p.bursts.map((b) => (
        <ConfettiBurst key={b.id} b={b} />
      ))}
    </>
  )
}
