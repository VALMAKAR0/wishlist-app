import { iconOf } from '../lib/icons'

/** Eigenes Symbol als Vektor, in Weiß mit dunklen Akzenten für farbige Flächen. */
export function Glyph({ value, size = 24 }: { value?: string; size?: number }) {
  const ic = iconOf(value)
  if (!ic) return null
  const tf = ic.rot || ic.scale ? `translate(24 24) rotate(${ic.rot ?? 0}) scale(${ic.scale ?? 1}) translate(-24 -24)` : undefined
  return (
    <svg className="glyph" viewBox="0 0 48 48" width={size} height={size} aria-hidden focusable="false">
      <g transform={tf}>
        {ic.shapes.map(([d, k, w], i) => (
          <path key={i} d={d} className={`gl-${k}`} strokeWidth={w} />
        ))}
      </g>
    </svg>
  )
}
