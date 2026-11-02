import { useEffect, useId, type CSSProperties, type ReactNode } from 'react'
import { animate, motion, useMotionValue, useTransform } from 'motion/react'
import { Check } from 'lucide-react'
import { initial, priceText } from '../lib/format'
import { useImageUrl } from '../lib/images'

type HueStyle = CSSProperties & { '--h'?: number }

/** Cover mit Farbverlauf und Emoji. Mit Bild (gespeichert per ID oder direkt per Adresse) wird das Bild gezeigt. */
export function Cover({ emoji, hue, size = 56, radius, imageId, src }: { emoji: string; hue: number; size?: number; radius?: number; imageId?: string; src?: string | null }) {
  const stored = useImageUrl(imageId)
  const url = src ?? stored
  const style: HueStyle = { '--h': hue, width: size, height: size, borderRadius: radius ?? size * 0.3, fontSize: size * 0.48 }
  return (
    <div className="cover" data-img={!!url} style={style} aria-hidden>
      {url ? <img src={url} alt="" draggable={false} decoding="async" /> : <span>{emoji}</span>}
    </div>
  )
}

export function CountUp({
  value,
  format = (n) => String(Math.round(n)),
  duration = 0.9,
}: {
  value: number
  format?: (n: number) => string
  duration?: number
}) {
  const mv = useMotionValue(0)
  const text = useTransform(mv, format)
  useEffect(() => {
    const c = animate(mv, value, { duration, ease: [0.22, 1, 0.36, 1] })
    return () => c.stop()
  }, [value, duration, mv])
  return <motion.span>{text}</motion.span>
}

interface RingProps {
  value: number // 0..1
  size?: number
  stroke?: number
  hue?: number
  children?: ReactNode
  delay?: number
}

/** Fortschrittsring mit Verlauf, der beim Einblenden einläuft. */
export function Ring({ value, size = 64, stroke = 6, hue, children, delay = 0.1 }: RingProps) {
  const id = useId()
  const r = (size - stroke) / 2
  const c = size / 2
  const v = Math.max(0, Math.min(1, value))
  const style: HueStyle = { width: size, height: size, ...(hue !== undefined ? { '--h': hue } : {}) }
  return (
    <div className={`ring ${hue !== undefined ? 'ring--hue' : ''}`} style={style}>
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="var(--ring-a)" />
            <stop offset="1" stopColor="var(--ring-b)" />
          </linearGradient>
        </defs>
        <circle className="ring__track" cx={c} cy={c} r={r} strokeWidth={stroke} fill="none" />
        <motion.circle
          cx={c}
          cy={c}
          r={r}
          fill="none"
          stroke={`url(#${id})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          transform={`rotate(-90 ${c} ${c})`}
          initial={{ pathLength: 0 }}
          animate={{ pathLength: v }}
          transition={{ duration: 1.1, delay, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
      {children && <div className="ring__inner">{children}</div>}
    </div>
  )
}

export function Avatar({ name, hue, size = 52, ring }: { name: string; hue: number; size?: number; ring?: number }) {
  const style: HueStyle = { '--h': hue, width: size - 12, height: size - 12, fontSize: size * 0.4 }
  const face = (
    <div className="avatar" style={style} aria-hidden>
      {initial(name)}
    </div>
  )
  if (ring === undefined) {
    const s: HueStyle = { '--h': hue, width: size, height: size, fontSize: size * 0.42 }
    return (
      <div className="avatar" style={s} aria-hidden>
        {initial(name)}
      </div>
    )
  }
  return (
    <Ring value={ring} size={size} stroke={3.5} hue={hue}>
      {face}
    </Ring>
  )
}

interface SegmentedProps<T extends string> {
  /** Nur zur Wiedererkennung im Code, die Pille wird per CSS bewegt. */
  id?: string
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string; count?: number }[]
}

/** Gleich breite Segmente, die Pille gleitet per CSS-Transform (keine Layout-Animation, kann nicht hängen). */
export function Segmented<T extends string>({ value, onChange, options }: SegmentedProps<T>) {
  const active = Math.max(0, options.findIndex((o) => o.value === value))
  const style = { '--n': options.length, '--i': active } as CSSProperties
  return (
    <div className="segmented" role="tablist" style={style}>
      <span className="segmented__pill" aria-hidden />
      {options.map((o) => (
        <button key={o.value} role="tab" aria-selected={o.value === value} className="segmented__btn" data-active={o.value === value} onClick={() => onChange(o.value)}>
          <span className="segmented__label">
            {o.label}
            {o.count !== undefined && <em>{o.count}</em>}
          </span>
        </button>
      ))}
    </div>
  )
}

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button role="switch" aria-checked={checked} aria-label={label} className="switch" data-on={checked} onClick={() => onChange(!checked)}>
      <span className="switch__thumb">
        <Check size={12} strokeWidth={3.4} />
      </span>
    </button>
  )
}

export function Chip({ children, tone = 'neutral', icon }: { children: ReactNode; tone?: 'neutral' | 'accent' | 'good' | 'warn'; icon?: ReactNode }) {
  return (
    <span className={`chip chip--${tone}`}>
      {icon}
      {children}
    </span>
  )
}

export function EmptyState({ emoji, title, text, action }: { emoji: string; title: string; text: string; action?: ReactNode }) {
  return (
    <motion.div className="empty" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 220, damping: 24 }}>
      <div className="empty__orb">
        <motion.span animate={{ y: [0, -7, 0], rotate: [-4, 4, -4] }} transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}>
          {emoji}
        </motion.span>
      </div>
      <h3>{title}</h3>
      <p>{text}</p>
      {action}
    </motion.div>
  )
}

/** Vier-Zack-Stern als vorläufige Bildmarke. */
export function Logo({ size = 40 }: { size?: number }) {
  const id = useId()
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--accent)" />
          <stop offset="1" stopColor="var(--accent-2)" />
        </linearGradient>
      </defs>
      <motion.path
        d="M32 8c1.8 13 9.2 20.2 22.4 22C41.2 31.8 33.8 39 32 56c-1.8-17-9.2-24.2-22.4-26C22.8 28.2 30.2 21 32 8Z"
        fill={`url(#${id})`}
        stroke={`url(#${id})`}
        strokeWidth="2"
        strokeLinejoin="round"
        initial={{ pathLength: 0, fillOpacity: 0 }}
        animate={{ pathLength: 1, fillOpacity: 1 }}
        transition={{ pathLength: { duration: 0.9, ease: 'easeInOut' }, fillOpacity: { duration: 0.5, delay: 0.7 } }}
      />
      <motion.path
        d="M51 6c.6 4.2 3 6.6 7.2 7.2-4.2.6-6.6 3-7.2 7.2-.6-4.2-3-6.6-7.2-7.2C48 12.6 50.4 10.2 51 6Z"
        fill="var(--accent-2)"
        initial={{ scale: 0, rotate: -40 }}
        animate={{ scale: 1, rotate: 0 }}
        style={{ transformOrigin: '51px 13px' }}
        transition={{ delay: 0.9, type: 'spring', stiffness: 300, damping: 14 }}
      />
    </svg>
  )
}

/** Preis in seiner Währung, bei fremder Währung mit Umrechnung in die Hauptwährung dahinter. */
export function PriceTag({ price, cur }: { price: number; cur?: string }) {
  const p = priceText(price, cur)
  return (
    <span className="item__price">
      {p.main}
      {p.sub && <small className="item__conv"> {p.sub}</small>}
    </span>
  )
}
