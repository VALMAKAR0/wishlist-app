import { createContext, useContext, useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from 'react'
import { BootNotice } from '../components/BootNotice'
import { defaultList, demoItems, demoLists, demoPersons, demoReceived } from '../lib/demoData'
import { dayAgoTs } from '../lib/format'
import { similarNames } from '../lib/match'
import { gcImages } from '../lib/images'
import { checkPersist } from '../lib/persist'
import { loadData, saveData, type Loaded, type StoredData } from '../lib/storage'
import { purgeExpired } from '../lib/trash'
import type { Item, Owner, Person, ReceivedList, Wishlist } from '../lib/types'
import { useT, useUI } from './ui'

// Seit V0.2 wird der Zustand bei jeder Änderung in IndexedDB gespeichert (lib/storage.ts).

interface State {
  items: Item[]
  lists: Wishlist[]
  persons: Person[]
  received: ReceivedList[]
  lastBackupAt: number | null
  changedSinceBackup: boolean
  /** Backup-Hinweis: nur direkt nach dem Start der App sichtbar. */
  nudgeOpen: boolean
}

type Action =
  | { type: 'addItem'; item: Item }
  | { type: 'updateItem'; id: string; patch: Partial<Item> }
  | { type: 'toggleBought'; id: string }
  | { type: 'trashItem'; id: string }
  | { type: 'restoreItem'; id: string }
  | { type: 'purgeItem'; id: string }
  | { type: 'emptyTrash' }
  | { type: 'addList'; list: Wishlist }
  | { type: 'updateList'; id: string; patch: Partial<Wishlist> }
  | { type: 'deleteList'; id: string }
  | { type: 'addPerson'; person: Person; list: Wishlist }
  | { type: 'updatePerson'; id: string; patch: Partial<Person> }
  | { type: 'deletePerson'; id: string }
  | { type: 'deleteReceived'; id: string }
  | { type: 'wipe' }
  | { type: 'restore'; data: StoredData; at: number | null }
  | { type: 'backedUp'; at: number }
  | { type: 'loadDemo' }
  | { type: 'ackNudge' }

const demoState = (): State => ({
  items: demoItems(),
  lists: demoLists(),
  persons: demoPersons(),
  received: demoReceived(),
  lastBackupAt: dayAgoTs(16),
  changedSinceBackup: true,
  nudgeOpen: true,
})

const emptyState = (): State => ({
  items: [],
  lists: [defaultList('me', 'l-me-1')],
  persons: [],
  received: [],
  lastBackupAt: null,
  changedSinceBackup: false,
  nudgeOpen: false,
})

function reducer(s: State, a: Action): State {
  const touch = <T extends Partial<State>>(patch: T): State => ({ ...s, ...patch, changedSinceBackup: true })
  switch (a.type) {
    case 'addItem':
      return touch({ items: [a.item, ...s.items] })
    case 'updateItem':
      return touch({ items: s.items.map((i) => (i.id === a.id ? { ...i, ...a.patch } : i)) })
    case 'toggleBought':
      return touch({
        items: s.items.map((i) => (i.id === a.id ? { ...i, bought: !i.bought, boughtAt: i.bought ? undefined : Date.now() } : i)),
      })
    case 'trashItem':
      return touch({ items: s.items.map((i) => (i.id === a.id ? { ...i, deletedAt: Date.now() } : i)) })
    case 'restoreItem':
      return touch({
        items: s.items.map((i) => {
          if (i.id !== a.id) return i
          // Gibt es die Liste nicht mehr, wandert der Eintrag in die erste Liste des Eigentümers.
          const listId = s.lists.some((l) => l.id === i.listId) ? i.listId : (s.lists.find((l) => l.owner === i.owner)?.id ?? i.listId)
          return { ...i, deletedAt: undefined, listId }
        }),
      })
    case 'purgeItem':
      return touch({ items: s.items.filter((i) => i.id !== a.id) })
    case 'emptyTrash':
      return touch({ items: s.items.filter((i) => !i.deletedAt) })
    case 'addList':
      return touch({ lists: [...s.lists, a.list] })
    case 'updateList':
      return touch({ lists: s.lists.map((l) => (l.id === a.id ? { ...l, ...a.patch } : l)) })
    case 'deleteList':
      return touch({
        lists: s.lists.filter((l) => l.id !== a.id),
        items: s.items.map((i) => (i.listId === a.id && !i.deletedAt ? { ...i, deletedAt: Date.now() } : i)),
      })
    case 'addPerson':
      return touch({ persons: [...s.persons, a.person], lists: [...s.lists, a.list] })
    case 'updatePerson':
      return touch({ persons: s.persons.map((p) => (p.id === a.id ? { ...p, ...a.patch } : p)) })
    case 'deletePerson':
      return touch({
        persons: s.persons.filter((p) => p.id !== a.id),
        items: s.items.filter((i) => i.owner !== a.id),
        lists: s.lists.filter((l) => l.owner !== a.id),
        received: s.received.map((r) => (r.personId === a.id ? { ...r, personId: undefined } : r)),
      })
    case 'deleteReceived':
      return touch({ received: s.received.filter((r) => r.id !== a.id) })
    case 'wipe':
      return emptyState()
    case 'restore':
      return { ...s, items: a.data.items, lists: a.data.lists, persons: a.data.persons, received: a.data.received, lastBackupAt: a.at, changedSinceBackup: false, nudgeOpen: false }
    case 'backedUp':
      return { ...s, lastBackupAt: a.at, changedSinceBackup: false }
    case 'loadDemo':
      return demoState()
    case 'ackNudge':
      return { ...s, nudgeOpen: false }
  }
}

interface Store extends State {
  /** 'memory': Speichern ist auf diesem Gerät nicht möglich, die Daten gelten nur bis zum Schließen. */
  storage: 'ok' | 'memory'
  dispatch: (a: Action) => void
  /** Ist der Artikel bei der Person laut Hintergrund-Abgleich schon vorhanden? (strenger Abgleich für das Badge) */
  alreadyOwned: (idea: Item) => boolean
}

const Ctx = createContext<Store | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [boot, setBoot] = useState<Loaded | null>(null)

  useEffect(() => {
    let off = false
    void loadData().then((r) => {
      if (!off) setBoot(r)
    })
    return () => {
      off = true
    }
  }, [])

  if (!boot) return null
  if (boot.kind === 'newer') return <BootNotice version={boot.version} />
  return <StoreInner boot={boot}>{children}</StoreInner>
}

const startState = (boot: Loaded): State => {
  if (boot.kind !== 'ok') return emptyState()
  return { ...emptyState(), ...boot.data, items: purgeExpired(boot.data.items), nudgeOpen: true }
}

function StoreInner({ boot, children }: { boot: Loaded; children: ReactNode }) {
  const ui = useUI()
  const t = useT()
  const [state, dispatch] = useReducer(reducer, boot, startState)
  const memory = boot.kind === 'unavailable'
  // Wurde beim Start im Papierkorb aufgeräumt, wird der neue Stand gleich gespeichert.
  const skipFirst = useRef(!(boot.kind === 'ok' && state.items.length !== boot.data.items.length))
  const warned = useRef(false)

  useEffect(() => {
    if (boot.kind === 'unavailable') ui.toast({ message: t('Speichern ist hier gerade nicht möglich. Einträge gehen beim Schließen verloren.'), emoji: '⚠️' })
    if (boot.kind === 'unreadable') ui.toast({ message: t('Gespeicherte Daten waren nicht lesbar und wurden zur Sicherheit beiseitegelegt.'), emoji: '⚠️' })
  }, [])

  useEffect(() => {
    void checkPersist()
  }, [])

  useEffect(() => {
    if (boot.kind !== 'ok') return
    void gcImages(new Set(state.items.flatMap((i) => (i.imageId ? [i.imageId] : []))))
  }, [])

  useEffect(() => {
    if (memory) return
    if (skipFirst.current) {
      skipFirst.current = false
      return
    }
    void saveData({
      items: state.items,
      lists: state.lists,
      persons: state.persons,
      received: state.received,
      lastBackupAt: state.lastBackupAt,
      changedSinceBackup: state.changedSinceBackup,
    }).then((ok) => {
      if (ok || warned.current) return
      warned.current = true
      ui.toast({ message: t('Speichern hat nicht geklappt. Mach bald ein Backup.'), emoji: '⚠️' })
    })
  }, [memory, state.items, state.lists, state.persons, state.received, state.lastBackupAt, state.changedSinceBackup])

  const value = useMemo<Store>(() => {
    const ownedByPerson = new Map<string, { name: string; link?: string }[]>()
    for (const r of state.received) {
      if (!r.personId) continue
      const arr = ownedByPerson.get(r.personId) ?? []
      for (const l of r.lists) for (const it of l.items) if (it.owned) arr.push({ name: it.name, link: it.link })
      ownedByPerson.set(r.personId, arr)
    }
    return {
      ...state,
      storage: memory ? 'memory' : 'ok',
      dispatch,
      alreadyOwned: (idea) => {
        const owned = ownedByPerson.get(idea.owner)
        if (!owned || idea.bought) return false
        return owned.some((o) => similarNames(o.name, idea.name) || (!!idea.link && o.link === idea.link))
      },
    }
  }, [state, memory])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useStore(): Store {
  const v = useContext(Ctx)
  if (!v) throw new Error('StoreProvider fehlt')
  return v
}

/** Abgeleitete Auswertungen, damit die Screens schlank bleiben. */
export function useLists() {
  const { items, persons, lists } = useStore()
  return useMemo(() => {
    const live = items.filter((i) => !i.deletedAt)
    return {
      live,
      mine: live.filter((i) => i.owner === 'me'),
      trash: items.filter((i) => i.deletedAt).sort((a, b) => (a.deletedAt ?? 0) - (b.deletedAt ?? 0)),
      listsOf: (owner: Owner) => lists.filter((l) => l.owner === owner),
      itemsOf: (owner: Owner) => live.filter((i) => i.owner === owner),
      personById: (id: string) => persons.find((p) => p.id === id),
    }
  }, [items, persons, lists])
}
