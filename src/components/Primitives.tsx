import { useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { AnimatePresence, animate, motion, useMotionValue, useTransform } from 'motion/react'
import { Check, ChevronDown, Heart } from 'lucide-react'
import { initial, priceText } from '../lib/format'
import { useImageUrl } from '../lib/images'
import { iconOf, listIcon } from '../lib/icons'
import { Glyph } from './Glyph'

type HueStyle = CSSProperties & { '--h'?: number }

/** Schon einmal geladene Bilder erscheinen ohne Einblenden, damit Listen beim Zurückkehren nicht flackern. */
const loadedUrls = new Set<string>()

/** Wichtigkeit als ein bis drei kleine Herzen. */
export function PrioMark({ prio, size = 11, label }: { prio?: number; size?: number; label?: string }) {
  if (!prio) return null
  return (
    <span className="prio" data-p={prio} aria-label={label} title={label}>
      {Array.from({ length: prio }, (_, i) => (
        <Heart key={i} size={size} fill="currentColor" strokeWidth={0} />
      ))}
    </span>
  )
}

/** Auswahl der Wichtigkeit: nochmal auf dieselbe Stufe tippen nimmt sie zurück. */
export function PrioPicker({ value, onChange, labels }: { value?: number; onChange: (v: 1 | 2 | 3 | undefined) => void; labels: [string, string, string, string] }) {
  return (
    <div className="priopick" role="radiogroup" aria-label={labels[0]}>
      {([1, 2, 3] as const).map((n) => (
        <button key={n} type="button" role="radio" aria-checked={value === n} className="priopick__btn" data-on={(value ?? 0) >= n} data-testid={`prio-${n}`} aria-label={labels[n]} onClick={() => onChange(value === n ? undefined : n)}>
          <motion.span animate={(value ?? 0) >= n ? { scale: [1, 1.3, 1] } : { scale: 1 }} transition={{ duration: 0.3 }}>
            <Heart size={20} fill={(value ?? 0) >= n ? 'currentColor' : 'none'} strokeWidth={2} />
          </motion.span>
        </button>
      ))}
      <span className="priopick__label">{value ? labels[value] : ''}</span>
    </div>
  )
}

/** Cover mit Farbverlauf und Emoji. Mit Bild (gespeichert per ID oder direkt per Adresse) wird das Bild gezeigt. */
export function Cover({ emoji, hue, size = 56, radius, imageId, src }: { emoji: string; hue: number; size?: number; radius?: number; imageId?: string; src?: string | null }) {
  const stored = useImageUrl(imageId)
  const url = src ?? stored
  const style: HueStyle = { '--h': hue, width: size, height: size, borderRadius: radius ?? size * 0.3, fontSize: size * 0.48 }
  const waiting = url === undefined
  const seen = !!url && loadedUrls.has(url)
  return (
    <div className="cover" data-img={!!url} data-ic={!!iconOf(emoji) || undefined} data-wait={waiting || undefined} style={style} aria-hidden>
      {url ? (
        <img
          src={url}
          alt=""
          draggable={false}
          decoding="async"
          data-in={seen || undefined}
          onLoad={(e) => {
            loadedUrls.add(url)
            e.currentTarget.dataset.in = 'true'
          }}
          onError={(e) => {
            e.currentTarget.dataset.in = 'true'
          }}
        />
      ) : waiting ? null : (
        <span>{iconOf(emoji) ? <Glyph value={emoji} size={size * 0.64} /> : emoji}</span>
      )}
    </div>
  )
}

/** Symbol einer Liste: kleine Farbfläche mit eigenem Vektorsymbol. Alte Emoji-Listen werden dem passenden Symbol zugeordnet. */
export function ListMark({ icon, hue, size = 24 }: { icon?: string; hue?: number; size?: number }) {
  return <Cover emoji={listIcon(icon)} hue={hue ?? 260} size={size} radius={Math.max(5, size * 0.28)} />
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
          strokeLinecap="butt"
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
          <stop offset="1" stopColor="var(--accent)" />
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

export interface DropOption {
  value: string
  label: string
  icon?: ReactNode
}

/** Schließt ein aufgeklapptes Menü beim Tippen daneben. */
function useOutside(open: boolean, close: () => void) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const down = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close()
    }
    document.addEventListener('pointerdown', down, true)
    const id = window.setTimeout(() => ref.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }), 220)
    return () => {
      window.clearTimeout(id)
      document.removeEventListener('pointerdown', down, true)
    }
  }, [open, close])
  return ref
}

function DropList({ options, value, onPick, label }: { options: DropOption[]; value?: string; onPick: (v: string) => void; label: string }) {
  return (
    <motion.div className="dd__list" role="listbox" aria-label={label} initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ type: 'spring', stiffness: 380, damping: 34 }}>
      <div className="dd__in">
        {options.map((o) => (
          <button key={o.value} type="button" role="option" aria-selected={o.value === value} className="dd__opt" onClick={() => onPick(o.value)}>
            {o.icon}
            <span>{o.label}</span>
            {o.value === value && <Check size={16} strokeWidth={3} />}
          </button>
        ))}
      </div>
    </motion.div>
  )
}

/** Auswahl als Aufklappmenü: eine Zeile mit dem aktuellen Wert, darunter die Möglichkeiten. */
export function Dropdown({ value, options, onChange, label, testId }: { value: string; options: DropOption[]; onChange: (v: string) => void; label: string; testId?: string }) {
  const [open, setOpen] = useState(false)
  const ref = useOutside(open, () => setOpen(false))
  const cur = options.find((o) => o.value === value)
  return (
    <div className="dd" ref={ref} data-open={open}>
      <button type="button" className="dd__btn" aria-haspopup="listbox" aria-expanded={open} aria-label={label} data-testid={testId} onClick={() => setOpen((a) => !a)}>
        {cur?.icon}
        <span>{cur?.label ?? ''}</span>
        <ChevronDown size={18} className="dd__chev" />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <DropList
            options={options}
            value={value}
            label={label}
            onPick={(v) => {
              onChange(v)
              setOpen(false)
            }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

/** Eingabefeld mit Aufklappmenü für Vorschläge: freier Text bleibt möglich. */
export function Combo({ value, onChange, options, placeholder, label, testId }: { value: string; onChange: (v: string, picked: boolean) => void; options: string[]; placeholder?: string; label: string; testId?: string }) {
  const [open, setOpen] = useState(false)
  const ref = useOutside(open, () => setOpen(false))
  return (
    <div className="dd dd--combo" ref={ref} data-open={open}>
      <div className="dd__inrow">
        <input value={value} onChange={(e) => onChange(e.target.value, false)} placeholder={placeholder} />
        {options.length > 0 && (
          <button type="button" className="dd__tog" aria-haspopup="listbox" aria-expanded={open} aria-label={label} data-testid={testId} onClick={() => setOpen((a) => !a)}>
            <ChevronDown size={18} className="dd__chev" />
          </button>
        )}
      </div>
      <AnimatePresence initial={false}>
        {open && options.length > 0 && (
          <DropList
            options={options.map((o) => ({ value: o, label: o }))}
            value={value}
            label={label}
            onPick={(v) => {
              onChange(v, true)
              setOpen(false)
            }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
