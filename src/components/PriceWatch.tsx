import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Check, CircleHelp, Info, ListChecks, Loader2, RefreshCw, TrendingDown, TrendingUp, X } from 'lucide-react'
import { isNative } from '../lib/backupFiles'
import { agoLabel, curOf, longDate, money } from '../lib/format'
import { linkFailExtra, linkFailText, type PriceCandidate } from '../lib/linkImport'
import { acceptSuggestion, applyCheck, chooseCandidate, confirmPrice, priceDelta, readFound, rejectSuggestion, unconfirmPrice, type Outcome } from '../lib/priceCheck'
import type { Item } from '../lib/types'
import { useStore } from '../state/store'
import { useT, useUI } from '../state/ui'
import { PriceChart } from './PriceChart'
import { PriceChooser } from './PriceChooser'
import { Presence } from './Presence'
import { Switch } from './Primitives'

type Msg = { text: string; tone: 'ok' | 'warn' }

/** Preisbeobachtung im Eintrag: prüfen, Vorschlag bestätigen, Verlauf ansehen, abschalten. */
export function PriceWatch({ item, link, onPrice }: { item: Item; link: string; onPrice: (price: number, cur: string) => void }) {
  const t = useT()
  const ui = useUI()
  const { dispatch } = useStore()
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<Msg | null>(null)
  const [cands, setCands] = useState<PriceCandidate[] | null>(null)
  const [more, setMore] = useState(false)
  const on = item.priceTrack !== false
  const cur = curOf(item)
  const patch = (p: Partial<Item>) => dispatch({ type: 'updateItem', id: item.id, patch: p })
  const native = isNative()
  const hasLink = !!link.trim()
  const delta = priceDelta(item)
  const log = item.priceLog ?? []

  const describe = (o: Outcome): Msg => {
    switch (o.kind) {
      case 'none':
        return { text: t('Auf der Seite wurde kein Preis gefunden.'), tone: 'warn' }
      case 'currency':
        return { text: t('Die Seite nennt den Preis in {c}, der Eintrag in {d}. Nichts geändert.', { c: o.currency, d: cur }), tone: 'warn' }
      case 'same':
        return { text: t('Preis unverändert.'), tone: 'ok' }
      case 'ignored':
        return { text: t('Unverändert, der Vorschlag wurde von dir abgelehnt.'), tone: 'ok' }
      case 'set':
        return { text: t('Preis eingetragen: {p}', { p: money(o.price, cur) }), tone: 'ok' }
      case 'changed':
        return { text: o.to < o.from ? t('Preis gesunken auf {p}', { p: money(o.to, cur) }) : t('Preis gestiegen auf {p}', { p: money(o.to, cur) }), tone: 'ok' }
      case 'suggest':
        return { text: t('Neuer Preis gefunden, bitte bestätigen.'), tone: 'warn' }
      case 'lost':
        return { text: t('Die gewählte Stelle ist auf der Seite nicht mehr zu finden. Wähle den Preis neu.'), tone: 'warn' }
    }
  }

  const check = async () => {
    if (busy || !hasLink) return
    setBusy(true)
    setMsg(null)
    try {
      const read = await readFound(link.trim(), item.priceSpot)
      const r = applyCheck(item, read.found, Date.now())
      patch(r.patch)
      if (r.outcome.kind === 'set') onPrice(r.outcome.price, cur)
      if (r.outcome.kind === 'changed') onPrice(r.outcome.to, cur)
      setMsg(describe(r.outcome))
      ui.haptic(r.outcome.kind === 'changed' || r.outcome.kind === 'suggest' ? 18 : 10)
    } catch (e) {
      const x = linkFailExtra(e)
      setMsg({ text: t(linkFailText(e)) + (x.status ? ` (HTTP ${x.status})` : x.why ? ` ${t(x.why)}` : ''), tone: 'warn' })
      ui.haptic(40)
    } finally {
      setBusy(false)
    }
  }

  const choose = async () => {
    if (busy || !hasLink) return
    setBusy(true)
    setMsg(null)
    try {
      const read = await readFound(link.trim())
      if (!read.candidates.length) setMsg({ text: t('Auf der Seite wurden keine Preise gefunden.'), tone: 'warn' })
      else setCands(read.candidates)
    } catch (e) {
      const x = linkFailExtra(e)
      setMsg({ text: t(linkFailText(e)) + (x.status ? ` (HTTP ${x.status})` : x.why ? ` ${t(x.why)}` : ''), tone: 'warn' })
      ui.haptic(40)
    } finally {
      setBusy(false)
    }
  }

  const pick = (c: PriceCandidate) => {
    patch(chooseCandidate(item, c, Date.now()))
    onPrice(c.price, c.currency)
    setCands(null)
    setMsg({ text: t('Stelle gemerkt. Der Preis wird künftig von dort gelesen.'), tone: 'ok' })
    ui.haptic(18)
  }

  const accept = () => {
    const s = item.priceSuggest
    if (!s) return
    patch(acceptSuggestion(item, Date.now()))
    onPrice(s.price, cur)
    setMsg({ text: t('Preis übernommen, er gilt jetzt als sicher.'), tone: 'ok' })
  }

  const stateShort = item.priceSpot
    ? t('Sicher · Stelle „{l}“', { l: item.priceSpot.label })
    : item.priceState === 'guess'
      ? t('Geraten · bitte bestätigen')
      : item.priceState === 'sure'
        ? item.priceGuessOk
          ? t('Sicher · Stelle bestätigt')
          : t('Sicher · von der Seite gelesen')
        : item.priceState === 'user'
          ? t('Von dir eingetragen')
          : ''
  const stateLong = item.priceSpot
    ? t('Du hast die Stelle „{l}“ gewählt, von dort wird der Preis gelesen.', { l: item.priceSpot.label })
    : item.priceState === 'guess'
      ? t('Aus dem Seitentext geraten. Stimmt er, bestätige ihn: Dann gilt er als sicher und neue Preise von dieser Stelle werden automatisch übernommen.')
      : item.priceState === 'sure'
        ? item.priceGuessOk
          ? t('Du hast die Stelle auf der Seite bestätigt, neue Preise von dort werden automatisch übernommen.')
          : t('Von der Seite gelesen oder von dir bestätigt. Neue Preise von dieser Stelle werden automatisch übernommen.')
        : item.priceState === 'user'
          ? t('Von dir eingetragen. Neue Preise der Seite kommen nur als Vorschlag.')
          : ''
  const flat = log.length >= 2 && log.every((p) => Math.abs(p.p - log[0].p) < 0.005)

  return (
    <section className="pw" data-testid="price-watch" data-on={on}>
      <div className="pw__head">
        <div>
          <strong>{t('Preis beobachten')}</strong>
          {!on && <p>{t('Aus: Dieser Eintrag wird nie geprüft, es gibt kein Etikett.')}</p>}
        </div>
        <Switch checked={on} onChange={(v) => patch({ priceTrack: v ? undefined : false, priceSuggest: v ? item.priceSuggest : undefined })} label={t('Preis beobachten')} />
      </div>

      {on && (
        <>
          {item.price !== undefined && stateShort && (
            <div className="pw__statebar">
              <p className="pw__state" data-state={item.priceState}>{stateShort}</p>
              <button type="button" className="pw__info" data-on={more} aria-label={t('Mehr dazu')} aria-expanded={more} onClick={() => setMore((m) => !m)}>
                <Info size={15} />
              </button>
            </div>
          )}
          {more && (
            <p className="pw__more">
              {stateLong} {t('Die App prüft den Preis auf Wunsch und, wenn eingeschaltet, einmal täglich im Hintergrund. Aus jeder Messung entsteht ein Punkt im Verlauf.')}
            </p>
          )}
          {item.price !== undefined && (item.priceGuessOk || item.priceSpot) && (
            <button type="button" className="btn btn--small btn--ghost" data-testid="price-unconfirm" onClick={() => { patch(unconfirmPrice(item, Date.now())); setMsg({ text: t('Zurückgenommen. Der Preis gilt wieder als unsicher, wähle die richtige Stelle neu.'), tone: 'ok' }) }}>
              <X size={14} /> {t('Bestätigung zurücknehmen')}
            </button>
          )}
          {item.price !== undefined && item.priceState === 'guess' && (
            <button type="button" className="btn btn--small btn--ghost" onClick={() => patch(confirmPrice(item, Date.now()))}>
              <Check size={14} /> {t('Der Preis stimmt')}
            </button>
          )}

          <AnimatePresence initial={false}>
            {item.priceSuggest && (
              <motion.div className="pw__sug" data-testid="price-suggest" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                <CircleHelp size={18} />
                <div>
                  <strong>{t('Neuer Preis: {p}', { p: money(item.priceSuggest.price, cur) })}</strong>
                  <p>
                    {item.price !== undefined ? t('Bisher {p}.', { p: money(item.price, cur) }) : ''} {item.priceSuggest.guess ? t('Aus dem Seitentext geraten.') : t('Von der Seite gelesen.')} {t('Stimmt das?')}
                  </p>
                  <div className="pw__acts">
                    <button type="button" className="btn btn--small btn--primary" onClick={accept}>
                      {t('Ja, übernehmen')}
                    </button>
                    <button type="button" className="btn btn--small btn--ghost" onClick={() => patch(rejectSuggestion(item))}>
                      <X size={14} /> {t('Nein, ignorieren')}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {delta !== null && (
            <p className="pw__delta" data-dir={delta < 0 ? 'down' : 'up'}>
              {delta < 0 ? <TrendingDown size={15} /> : <TrendingUp size={15} />}
              {delta < 0 ? t('Seit dem Hinzufügen um {p} gesunken', { p: money(-delta, cur) }) : t('Seit dem Hinzufügen um {p} gestiegen', { p: money(delta, cur) })}
            </p>
          )}

          {log.length >= 2 ? (
            <>
              <PriceChart points={log} base={item.priceBase} cur={cur} />
              {flat && <p className="pw__hint">{t('Unverändert seit {d}, {n} Messpunkte.', { d: longDate(log[0].t), n: log.length })}</p>}
            </>
          ) : (
            <p className="pw__hint">{t('Noch kein Verlauf: Das Diagramm erscheint ab dem zweiten Messpunkt, einer pro Tag.')}</p>
          )}

          <div className="pw__foot">
            <button type="button" className="btn btn--small btn--ghost" onClick={() => void check()} disabled={busy || !native || !hasLink} data-testid="price-check">
              {busy ? <Loader2 size={14} className="spin" /> : <RefreshCw size={14} />} {t('Preis jetzt prüfen')}
            </button>
            <button type="button" className="btn btn--small btn--ghost" onClick={() => void choose()} disabled={busy || !native || !hasLink} data-testid="price-choose">
              <ListChecks size={14} /> {item.priceSpot ? t('Andere Stelle wählen') : t('Preis-Stelle wählen')}
            </button>
            <span className="pw__when">
              {!native ? t('Nur in der Android-App') : !hasLink ? t('Ohne Link nicht möglich') : item.priceCheckedAt ? `${t('Zuletzt geprüft')}: ${agoLabel(item.priceCheckedAt, t)}` : t('Noch nie geprüft')}
            </span>
          </div>
          {msg && (
            <p className="pw__msg" data-tone={msg.tone} role="status">
              {msg.text}
            </p>
          )}
        </>
      )}
      <Presence show={!!cands}>{cands && <PriceChooser candidates={cands} current={item.price} spot={item.priceSpot} cur={cur} onPick={pick} onClose={() => setCands(null)} />}</Presence>
    </section>
  )
}
