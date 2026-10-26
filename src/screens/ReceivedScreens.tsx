import { useEffect } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Download, Link2, Plus, Trash2, Link as LinkIcon } from 'lucide-react'
import { AddButton, Page } from '../components/Page'
import { Avatar, Chip, Cover, EmptyState } from '../components/Primitives'
import { agoLabel, eur, plural } from '../lib/format'
import { useNav } from '../state/nav'
import { useStore } from '../state/store'
import { useUI } from '../state/ui'

export function ReceivedScreen() {
  const { received, persons } = useStore()
  const { open } = useNav()
  const ui = useUI()

  return (
    <Page
      title="Erhaltene Listen"
      eyebrow="Von anderen"
      subtitle={received.length ? plural(received.length, 'Liste', 'Listen') : 'Wunschlisten, die dir andere geschickt haben'}
      actions={<AddButton label="Import" onClick={() => ui.planned('import-list')} />}
    >
      {received.length > 0 ? (
        <ul className="group">
          <AnimatePresence>
            {received.map((r, i) => {
              const visible = r.items.filter((x) => !x.owned)
              const linked = persons.find((p) => p.id === r.personId)
              return (
                <motion.li key={r.id} initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.92, height: 0, marginBottom: 0, overflow: 'hidden', pointerEvents: 'none' }} transition={{ type: 'spring', stiffness: 280, damping: 26, delay: i * 0.07 }}>
                  <motion.button className="list-card spot" onClick={() => open({ type: 'received', id: r.id })} whileTap={{ scale: 0.98 }} whileHover={{ y: -2 }}>
                    <Avatar name={r.from} hue={r.hue} size={44} />
                    <div className="list-card__main">
                      <strong>{r.from}</strong>
                      <span>
                        {plural(visible.length, 'Wunsch', 'Wünsche')} · erhalten {agoLabel(r.receivedAt)}
                      </span>
                      <div className="chips">
                        {linked ? <Chip tone="accent" icon={<LinkIcon size={12} />}>Verknüpft mit Ideen für {linked.name}</Chip> : <Chip>Nicht verknüpft</Chip>}
                      </div>
                    </div>
                    <div className="stack-covers" aria-hidden>
                      {visible.slice(0, 3).map((x, k) => (
                        <span key={x.id} style={{ marginLeft: k ? -10 : 0, zIndex: 5 - k }}>
                          <Cover emoji={x.emoji} hue={x.hue} size={28} />
                        </span>
                      ))}
                    </div>
                  </motion.button>
                </motion.li>
              )
            })}
          </AnimatePresence>
        </ul>
      ) : (
        <EmptyState
          emoji="📬"
          title="Noch keine Listen erhalten"
          text="Wenn dir jemand seine Wunschliste schickt, speicherst du sie hier. Sie bleibt von deinen eigenen Daten getrennt."
          action={
            <button className="btn btn--primary" onClick={() => ui.planned('import-list')}>
              <Download size={17} /> Liste importieren
            </button>
          }
        />
      )}
    </Page>
  )
}

export function ReceivedDetailScreen({ id }: { id: string }) {
  const { received, persons, dispatch } = useStore()
  const { back } = useNav()
  const ui = useUI()
  const list = received.find((r) => r.id === id)

  useEffect(() => {
    if (!list) back()
  }, [list, back])
  if (!list) return null

  // Unauffällig mitgesendete Artikel (owned) werden hier nie angezeigt.
  const visible = list.items.filter((i) => !i.owned)
  const linked = persons.find((p) => p.id === list.personId)

  const remove = () =>
    ui.confirm({
      title: `Liste von ${list.from} löschen?`,
      text: 'Die Liste wird von diesem Gerät entfernt. Du kannst sie später erneut importieren, wenn du die Datei noch hast.',
      confirmLabel: 'Löschen',
      tone: 'danger',
      onConfirm: () => {
        dispatch({ type: 'deleteReceived', id })
        ui.toast({ message: `Liste von ${list.from} gelöscht` })
      },
    })

  return (
    <Page
      title={list.from}
      eyebrow="Erhaltene Liste"
      subtitle={`${plural(visible.length, 'Wunsch', 'Wünsche')} · erhalten ${agoLabel(list.receivedAt)}`}
      onBack={back}
      actions={
        <button className="icon-btn" onClick={remove} aria-label="Liste löschen">
          <Trash2 size={16} />
        </button>
      }
    >
      <motion.aside className="note-card" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        <Link2 size={18} />
        <p>
          {linked
            ? `Mit Geschenkideen für ${linked.name} verknüpft. Wenn eine Idee dort schon vorhanden ist, siehst du das direkt bei der Idee.`
            : 'Nicht verknüpft. Verknüpfe sie mit einer Person, damit dich doppelte Geschenkideen unauffällig warnen.'}
        </p>
      </motion.aside>

      <ul className="group">
        {visible.map((it, i) => (
          <motion.li key={it.id} className="item item--static" initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 28, delay: 0.2 + i * 0.06 }}>
            <Cover emoji={it.emoji} hue={it.hue} size={44} />
            <div className="item__main">
              <span className="item__name">{it.name}</span>
              <div className="item__meta">
                {it.price !== undefined && <span className="item__price">{eur(it.price)}</span>}
                {it.link && <Link2 size={14} />}
              </div>
              {it.note && <p className="item__note">{it.note}</p>}
            </div>
            <button className="icon-btn" onClick={() => ui.planned('received-to-idea')} aria-label="Als Geschenkidee übernehmen">
              <Plus size={17} />
            </button>
          </motion.li>
        ))}
      </ul>
    </Page>
  )
}
