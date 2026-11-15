import { useState } from 'react'
import { Check, Plus } from 'lucide-react'
import { uid } from '../lib/format'
import { listTitle } from '../lib/lists'
import type { Item, Owner } from '../lib/types'
import { useStore } from '../state/store'
import { useT, useUI } from '../state/ui'
import { Sheet } from './Sheet'

interface Props {
  owner: Owner
  /** Die ausgewählten Einträge. */
  picked: Item[]
  onClose: () => void
  onDone: () => void
}

/** Zielliste wählen (oder neu anlegen) und die ausgewählten Einträge dorthin verschieben. Mit Rückgängig. */
export function MoveSheet({ owner, picked, onClose, onDone }: Props) {
  const t = useT()
  const ui = useUI()
  const { lists, items, dispatch } = useStore()
  const own = lists.filter((l) => l.owner === owner)
  const [target, setTarget] = useState<string>('')
  const [adding, setAdding] = useState(own.length < 2)
  const [name, setName] = useState('')

  const countIn = (id: string) => items.filter((i) => i.listId === id && !i.deletedAt).length
  const inTarget = (id: string) => picked.filter((i) => i.listId === id).length
  const allThere = (id: string) => inTarget(id) === picked.length
  const newName = name.trim()
  const clash = own.some((l) => !l.isDefault && l.name.trim().toLowerCase() === newName.toLowerCase())
  const ready = adding ? newName.length > 0 : !!target && !allThere(target)

  const run = () => {
    let dest = target
    let created = false
    if (adding) {
      const existing = own.find((l) => !l.isDefault && l.name.trim().toLowerCase() === newName.toLowerCase())
      if (existing) dest = existing.id
      else {
        dest = uid()
        created = true
        dispatch({ type: 'addList', list: { id: dest, owner, name: newName, emoji: '⭐', hue: Math.floor(Math.random() * 360), createdAt: Date.now() } })
      }
    }
    const list = created ? { name: newName, emoji: '⭐', isDefault: false } : own.find((l) => l.id === dest)
    const moves = picked.filter((i) => i.listId !== dest).map((i) => ({ id: i.id, listId: dest }))
    const back = picked.filter((i) => i.listId !== dest).map((i) => ({ id: i.id, listId: i.listId }))
    if (!moves.length || !list) return
    dispatch({ type: 'moveItems', moves })
    ui.haptic(14)
    ui.toast({
      message: t('{n} nach „{list}“ verschoben', { n: t.n(moves.length, 'Eintrag', 'Einträge'), list: listTitle(list as { name: string; isDefault?: boolean }, t) }),
      emoji: list.emoji,
      actionLabel: t('Rückgängig'),
      onAction: () => {
        dispatch({ type: 'moveItems', moves: back })
        if (created) dispatch({ type: 'deleteList', id: dest })
      },
    })
    onDone()
  }

  return (
    <Sheet
      title={t('Verschieben nach')}
      subtitle={t.n(picked.length, 'Eintrag ausgewählt', 'Einträge ausgewählt')}
      onClose={onClose}
      footer={
        <button className="btn btn--primary btn--block" data-testid="move-run" disabled={!ready} onClick={run}>
          {t('Verschieben')}
        </button>
      }
    >
      <div className="movelist" role="radiogroup" aria-label={t('Zielliste')}>
        {own.map((l) => {
          const here = inTarget(l.id)
          const full = allThere(l.id)
          return (
            <button
              key={l.id}
              type="button"
              role="radio"
              aria-checked={!adding && target === l.id}
              disabled={full}
              className="moverow"
              data-active={!adding && target === l.id}
              data-testid={`move-to-${l.id}`}
              onClick={() => {
                setAdding(false)
                setTarget(l.id)
              }}
            >
              <span className="moverow__emoji" aria-hidden>{l.emoji}</span>
              <span className="moverow__main">
                <strong>{listTitle(l, t)}</strong>
                <small>
                  {full ? t('Alle ausgewählten sind schon hier') : here ? t('{n} schon hier', { n: here }) + ' · ' + t.n(countIn(l.id), 'Eintrag', 'Einträge') : t.n(countIn(l.id), 'Eintrag', 'Einträge')}
                </small>
              </span>
              <span className="moverow__tick" aria-hidden><Check size={16} strokeWidth={3.2} /></span>
            </button>
          )
        })}
        <button type="button" className="moverow moverow--add" data-active={adding} data-testid="move-new" onClick={() => setAdding(true)}>
          <span className="moverow__emoji" aria-hidden><Plus size={18} /></span>
          <span className="moverow__main"><strong>{t('Neue Liste')}</strong></span>
          <span className="moverow__tick" aria-hidden><Check size={16} strokeWidth={3.2} /></span>
        </button>
      </div>

      {adding && (
        <label className="field">
          <span>{t('Name der neuen Liste')}</span>
          <input autoFocus={own.length > 1} data-testid="move-name" value={name} maxLength={40} placeholder={t('z. B. Weihnachten')} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && ready) run() }} />
          {clash && <small className="hint">{t('Diese Liste gibt es schon, die Einträge kommen dorthin.')}</small>}
        </label>
      )}
    </Sheet>
  )
}
