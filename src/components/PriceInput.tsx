import { useLayoutEffect, useRef } from 'react'
import { fmtPriceInput } from '../lib/priceInput'

/** Zahlenfeld mit Tausenderpunkt beim Tippen, der Cursor bleibt an seiner Stelle. */
export function PriceInput({ value, onChange, placeholder, decimals = 2 }: { value: string; onChange: (v: string) => void; placeholder?: string; decimals?: number }) {
  const ref = useRef<HTMLInputElement>(null)
  const caret = useRef<number | null>(null)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el || caret.current === null || document.activeElement !== el) return
    let seen = 0
    let pos = value.length
    for (let i = 0; i <= value.length; i++) {
      if (seen === caret.current) {
        pos = i
        break
      }
      if (i < value.length && /[0-9,]/.test(value[i])) seen++
    }
    el.setSelectionRange(pos, pos)
    caret.current = null
  }, [value])
  return (
    <input
      ref={ref}
      value={value}
      placeholder={placeholder}
      inputMode="decimal"
      onChange={(e) => {
        const raw = e.target.value
        const at = e.target.selectionStart ?? raw.length
        caret.current = (fmtPriceInput(raw.slice(0, at), value, decimals).match(/[0-9,]/g) ?? []).length
        onChange(fmtPriceInput(raw, value, decimals))
      }}
    />
  )
}
