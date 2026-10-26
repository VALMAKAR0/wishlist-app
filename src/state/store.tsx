import { createContext, useContext, useMemo, useReducer, type ReactNode } from 'react'
import { demoItems, demoPersons, demoReceived } from '../lib/demoData'
import { dayAgoTs, normalize } from '../lib/format'
import type { Item, Person, ReceivedList } from '../lib/types'

// V0.1: reiner Arbeitsspeicher. Der Zustand dient nur dazu, Animationen und Übergänge
// mit echtem Verhalten zu zeigen. Dauerhaftes Speichern kommt in V0.2.

interface State {
  items: Item[]
  persons: Person[]
  received: ReceivedList[]
  lastBackupAt: number | null
  changedSinceBackup: boolean
  dirty: boolean
}

type Action =
  | { type: 'addItem'; item: Item }
  | { type: 'updateItem'; id: string; patch: Partial<Item> }
  | { type: 'toggleBought'; id: string }
  | { type: 'trashItem'; id: string }
  | { type: 'restoreItem'; id: string }
  | { type: 'purgeItem'; id: string }
  | { type: 'emptyTrash' }
  | { type: 'addPerson'; person: Person }
  | { type: 'updatePerson'; id: string; patch: Partial<Person> }
  | { type: 'deletePerson'; id: string }
  | { type: 'deleteReceived'; id: string }
  | { type: 'wipe' }
  | { type: 'loadDemo' }
  | { type: 'ackBackupNudge' }

const demoState = (): State => ({
  items: demoItems(),
  persons: demoPersons(),
  received: demoReceived(),
  lastBackupAt: dayAgoTs(16),
  changedSinceBackup: true,
  dirty: false,
})

const emptyState = (): State => ({
  items: [],
  persons: [],
  received: [],
  lastBackupAt: null,
  changedSinceBackup: false,
  dirty: false,
})

function reducer(s: State, a: Action): State {
  const touch = <T extends Partial<State>>(patch: T): State => ({ ...s, ...patch, changedSinceBackup: true, dirty: true })
  switch (a.type) {
    case 'addItem':
      return touch({ items: [a.item, ...s.items] })
    case 'updateItem':
      return touch({ items: s.items.map((i) => (i.id === a.id ? { ...i, ...a.patch } : i)) })
    case 'toggleBought':
      return touch({
        items: s.items.map((i) =>
          i.id === a.id ? { ...i, bought: !i.bought, boughtAt: i.bought ? undefined : Date.now() } : i,
        ),
      })
    case 'trashItem':
      return touch({ items: s.items.map((i) => (i.id === a.id ? { ...i, deletedAt: Date.now() } : i)) })
    case 'restoreItem':
      return touch({ items: s.items.map((i) => (i.id === a.id ? { ...i, deletedAt: undefined } : i)) })
    case 'purgeItem':
      return touch({ items: s.items.filter((i) => i.id !== a.id) })
    case 'emptyTrash':
      return touch({ items: s.items.filter((i) => !i.deletedAt) })
    case 'addPerson':
      return touch({ persons: [...s.persons, a.person] })
    case 'updatePerson':
      return touch({ persons: s.persons.map((p) => (p.id === a.id ? { ...p, ...a.patch } : p)) })
    case 'deletePerson':
      return touch({
        persons: s.persons.filter((p) => p.id !== a.id),
        items: s.items.filter((i) => i.owner !== a.id),
        received: s.received.map((r) => (r.personId === a.id ? { ...r, personId: undefined } : r)),
      })
    case 'deleteReceived':
      return touch({ received: s.received.filter((r) => r.id !== a.id) })
    case 'wipe':
      return { ...emptyState(), dirty: true }
    case 'loadDemo':
      return demoState()
    case 'ackBackupNudge':
      return { ...s, changedSinceBackup: false }
  }
}

interface Store extends State {
  dispatch: (a: Action) => void
  /** Idee-Eintrag -> ist der Artikel bei der Person schon vorhanden? (unauffällig mitgesendet) */
  alreadyOwned: (idea: Item) => boolean
}

const Ctx = createContext<Store | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, demoState)

  const value = useMemo<Store>(() => {
    const ownedByPerson = new Map<string, { names: Set<string>; links: Set<string> }>()
    for (const list of state.received) {
      if (!list.personId) continue
      const entry = ownedByPerson.get(list.personId) ?? { names: new Set(), links: new Set() }
      for (const it of list.items) {
        if (!it.owned) continue
        entry.names.add(normalize(it.name))
        if (it.link) entry.links.add(it.link)
      }
      ownedByPerson.set(list.personId, entry)
    }
    return {
      ...state,
      dispatch,
      alreadyOwned: (idea) => {
        const e = ownedByPerson.get(idea.owner)
        if (!e || idea.bought) return false
        return e.names.has(normalize(idea.name)) || (!!idea.link && e.links.has(idea.link))
      },
    }
  }, [state])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useStore(): Store {
  const v = useContext(Ctx)
  if (!v) throw new Error('StoreProvider fehlt')
  return v
}

/** Abgeleitete Listen, damit die Screens schlank bleiben. */
export function useLists() {
  const { items, persons } = useStore()
  return useMemo(() => {
    const live = items.filter((i) => !i.deletedAt)
    const wishes = live.filter((i) => i.owner === 'me')
    return {
      wishesOpen: wishes.filter((i) => !i.bought),
      wishesDone: wishes.filter((i) => i.bought).sort((a, b) => (b.boughtAt ?? 0) - (a.boughtAt ?? 0)),
      trash: items.filter((i) => i.deletedAt).sort((a, b) => (a.deletedAt ?? 0) - (b.deletedAt ?? 0)),
      ideasOf: (personId: string) => live.filter((i) => i.owner === personId),
      personById: (id: string) => persons.find((p) => p.id === id),
    }
  }, [items, persons])
}
