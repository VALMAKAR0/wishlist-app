import { AnimatePresence } from 'motion/react'
import type { Item } from '../lib/types'
import { ItemCard } from '../components/ItemCard'
import { useStore } from '../state/store'
import { useUI } from '../state/ui'

/** Gemeinsame Aktionen für Wünsche und Geschenkideen: abhaken mit Konfetti, löschen mit Rückgängig. */
export function useItemActions() {
  const { dispatch } = useStore()
  const ui = useUI()

  return {
    toggle(item: Item, origin: { x: number; y: number }) {
      dispatch({ type: 'toggleBought', id: item.id })
      ui.haptic(item.bought ? 8 : 24)
      if (!item.bought) {
        ui.confetti(origin.x, origin.y)
        ui.toast({
          message: item.owner === 'me' ? 'Gekauft, ab ins Archiv' : 'Als gekauft markiert',
          emoji: '🎉',
          actionLabel: 'Rückgängig',
          onAction: () => dispatch({ type: 'toggleBought', id: item.id }),
        })
      }
    },
    trash(item: Item) {
      dispatch({ type: 'trashItem', id: item.id })
      ui.haptic(14)
      ui.toast({
        message: `„${item.name}“ im Papierkorb`,
        actionLabel: 'Rückgängig',
        onAction: () => dispatch({ type: 'restoreItem', id: item.id }),
      })
    },
  }
}

interface ItemListProps {
  items: Item[]
  onOpen: (item: Item) => void
  badgeFor?: (item: Item) => string | undefined
}

export function ItemList({ items, onOpen, badgeFor }: ItemListProps) {
  const actions = useItemActions()
  return (
    <ul className="group">
      <AnimatePresence initial>
        {items.map((item, i) => (
          <ItemCard
            key={item.id}
            item={item}
            index={i}
            badge={badgeFor?.(item)}
            onOpen={() => onOpen(item)}
            onToggle={(origin) => actions.toggle(item, origin)}
            onTrash={() => actions.trash(item)}
          />
        ))}
      </AnimatePresence>
    </ul>
  )
}
