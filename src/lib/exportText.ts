import { listChar } from './icons'
import { Share } from '@capacitor/share'
import { isoLabel, longDate, priceText, toHref, withLocale } from './format'
import type { TFn } from './i18n'
import type { ReceivedCollection } from './types'
import { isNative } from './backupFiles'

const RULE = '──────────────'

/** Liste als Text im WhatsApp-Format (*fett*, _kursiv_, > Zitat). Links stehen direkt beim Wunsch. */
export function makeText(o: { from: string; lists: ReceivedCollection[]; t: TFn; now?: number }): string {
  const { t } = o
  const L = <T,>(f: () => T): T => withLocale(t.locale, f)
  const total = o.lists.reduce((n, c) => n + c.items.length, 0)
  const out: string[] = [`*${t('WUNSCHLISTE')}*`, `_${[o.from, t.n(total, 'Wunsch', 'Wünsche'), t('Stand {date}', { date: L(() => longDate(o.now ?? Date.now())) })].join(' · ')}_`]
  for (const c of o.lists) {
    out.push('', RULE, [`${listChar(c.emoji)} ${c.name}`, c.date ? L(() => isoLabel(c.date as string)) : '', t.n(c.items.length, 'Wunsch', 'Wünsche')].filter(Boolean).join(' · '), RULE)
    const items = c.items.map((it, n) => ({ it, n })).sort((a, b) => (b.it.prio ?? 0) - (a.it.prio ?? 0) || a.n - b.n)
    items.forEach(({ it }, n) => {
      const head = [`${n + 1}. *${it.name.replace(/\*/g, '')}*`, it.price === undefined ? '' : L(() => priceText(it.price as number, it.cur).main), it.prio ? '♥'.repeat(it.prio) : ''].filter(Boolean).join(' · ')
      out.push('', head)
      const meta = [it.kind, it.note].filter(Boolean).join(' · ')
      if (meta) out.push(`- ${meta.replace(/\s*\n\s*/g, ' ')}`)
      if (it.link) out.push(`> ${toHref(it.link)}`)
    })
  }
  return out.join('\n')
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    try {
      const ta = document.createElement('textarea')
      ta.value = text
      ta.style.cssText = 'position:fixed;opacity:0;top:0;left:0'
      document.body.appendChild(ta)
      ta.select()
      const ok = document.execCommand('copy')
      ta.remove()
      return ok
    } catch {
      return false
    }
  }
}

export const canShareText = () => isNative() || typeof navigator.share === 'function'

/** Text über das Teilen-Menü senden. */
export async function shareText(text: string, title: string): Promise<'shared' | 'cancelled'> {
  try {
    if (isNative()) await Share.share({ title, text })
    else await navigator.share({ title, text })
    return 'shared'
  } catch (e) {
    if (/cancel|abort/i.test(String((e as Error)?.message ?? (e as Error)?.name ?? e))) return 'cancelled'
    throw e
  }
}
