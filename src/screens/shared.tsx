import { AnimatePresence } from 'motion/react'
import type { Item } from '../lib/types'
import { ItemCard } from '../components/ItemCard'
import { useStore } from '../state/store'
import { useT, useUI } from '../state/ui'

/** Gemeinsame Aktionen für Wünsche und Geschenkideen: abhaken mit Konfetti, löschen mit Rückgängig. */
export function useItemActions() {
  const { dispatch } = useStore()
  const ui = useUI()
  const t = useT()

  return {
    toggle(item: Item, origin: { x: number; y: number }) {
      dispatch({ type: 'toggleBought', id: item.id })
      ui.haptic(item.bought ? 8 : 24)
      if (!item.bought) {
        ui.confetti(origin.x, origin.y)
        ui.toast({
          message: item.owner === 'me' ? t('Gekauft, ab ins Archiv') : t('Als gekauft markiert'),
          emoji: '🎉',
          actionLabel: t('Rückgängig'),
          onAction: () => dispatch({ type: 'toggleBought', id: item.id }),
        })
      }
    },
    favorite(item: Item) {
      const was = item.prio
      const on = (was ?? 0) < 3
      dispatch({ type: 'updateItem', id: item.id, patch: { prio: on ? 3 : undefined } })
      ui.haptic(14)
      ui.toast({
        message: on ? t('„{name}“ ist jetzt Favorit', { name: item.name }) : t('„{name}“ ist kein Favorit mehr', { name: item.name }),
        emoji: on ? '💗' : undefined,
        actionLabel: t('Rückgängig'),
        onAction: () => dispatch({ type: 'updateItem', id: item.id, patch: { prio: was } }),
      })
    },
    trash(item: Item) {
      dispatch({ type: 'trashItem', id: item.id })
      ui.haptic(14)
      ui.toast({
        message: t('„{name}“ im Papierkorb', { name: item.name }),
        actionLabel: t('Rückgängig'),
        onAction: () => dispatch({ type: 'restoreItem', id: item.id }),
      })
    },
  }
}

interface ItemListProps {
  items: Item[]
  onOpen: (item: Item) => void
  badgeFor?: (item: Item) => string | undefined
  listLabelFor?: (item: Item) => { icon: string; hue: number } | undefined
  selected?: Set<string> | null
  onLongPress?: (item: Item) => void
  onMove?: (item: Item) => void
}

export function ItemList({ items, onOpen, badgeFor, listLabelFor, selected, onLongPress, onMove }: ItemListProps) {
  const actions = useItemActions()
  return (
    <ul className="group">
      <AnimatePresence initial mode="popLayout">
        {items.map((item, i) => (
          <ItemCard
            key={item.id}
            item={item}
            index={i}
            flow={items.length <= 60}
            badge={badgeFor?.(item)}
            listLabel={listLabelFor?.(item)}
            selectMode={!!selected}
            selected={selected?.has(item.id)}
            onLongPress={onLongPress ? () => onLongPress(item) : undefined}
            onOpen={() => onOpen(item)}
            onToggle={(origin) => actions.toggle(item, origin)}
            onTrash={() => actions.trash(item)}
            onMove={onMove ? () => onMove(item) : undefined}
            onFavorite={() => actions.favorite(item)}
          />
        ))}
      </AnimatePresence>
    </ul>
  )
}
