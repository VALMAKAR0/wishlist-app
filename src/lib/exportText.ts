import { Share } from '@capacitor/share'
import { isoLabel, longDate, priceText, toHref } from './format'
import type { TFn } from './i18n'
import type { ReceivedCollection } from './types'
import { isNative } from './backupFiles'

const RULE = '──────────────'

/** Liste als gut lesbarer Text (WhatsApp, Notizen, Mail). Links stehen direkt beim Wunsch. */
export function makeText(o: { from: string; lists: ReceivedCollection[]; t: TFn; now?: number }): string {
  const { t } = o
  const total = o.lists.reduce((n, c) => n + c.items.length, 0)
  const out: string[] = [`🎁 ${t('Wunschliste von {name}', { name: o.from })}`, `${t.n(total, 'Wunsch', 'Wünsche')} · ${t('Stand {date}', { date: longDate(o.now ?? Date.now()) })}`]
  for (const c of o.lists) {
    out.push('', RULE, [`${c.emoji} ${c.name}`, c.date ? isoLabel(c.date) : '', t.n(c.items.length, 'Wunsch', 'Wünsche')].filter(Boolean).join(' · '), RULE)
    const items = c.items.map((it, n) => ({ it, n })).sort((a, b) => (b.it.prio ?? 0) - (a.it.prio ?? 0) || a.n - b.n)
    items.forEach(({ it }, n) => {
      const head = [`${n + 1}. ${it.name}`, it.price === undefined ? '' : priceText(it.price, it.cur).main, it.prio ? '♥'.repeat(it.prio) : ''].filter(Boolean).join(' · ')
      out.push('', head)
      const meta = [it.kind, it.note].filter(Boolean).join(' · ')
      if (meta) out.push(`   ${meta.replace(/\s*\n\s*/g, ' ')}`)
      if (it.link) out.push(`   🔗 ${toHref(it.link)}`)
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
