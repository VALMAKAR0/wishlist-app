import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { EyeOff, Lock, Send } from 'lucide-react'
import type { ShareBought } from '../lib/types'
import { useLists } from '../state/store'
import { useUI } from '../state/ui'
import { Cover, CountUp, Segmented, Switch } from './Primitives'
import { Sheet } from './Sheet'

const MODE_TEXT: Record<ShareBought, { title: string; text: string }> = {
  hidden: {
    title: 'Unauffällig mitsenden',
    text: 'Gekaufte Artikel gehen im Hintergrund mit. In deiner Liste tauchen sie für andere nicht auf, aber wer dir etwas schenken will, wird unauffällig gewarnt, wenn du es schon hast.',
  },
  only: {
    title: 'Nur Gekauftes teilen',
    text: 'Es geht nur die Liste der Dinge mit, die du schon hast. Andere sehen keine Wünsche, werden aber vor doppelten Geschenken gewarnt.',
  },
  exclude: {
    title: 'Gekauftes ausschließen',
    text: 'Gekaufte Artikel bleiben ganz bei dir. Es gibt keinen Hinweis auf Doppelungen.',
  },
}

export function ShareSheet({ onClose }: { onClose: () => void }) {
  const { wishesOpen, wishesDone } = useLists()
  const ui = useUI()
  const [notes, setNotes] = useState(false)
  const [mode, setMode] = useState<ShareBought>('hidden')

  const visible = mode === 'only' ? [] : wishesOpen
  const hidden = mode === 'exclude' ? [] : wishesDone
  const noteCount = notes ? visible.filter((w) => w.note).length : 0
  const strip = (mode === 'only' ? wishesDone : wishesOpen).slice(0, 5)

  return (
    <Sheet
      title="Wunschliste teilen"
      subtitle="Du schickst einen Schnappschuss deiner Liste"
      onClose={onClose}
      footer={
        <button className="btn btn--primary btn--block" onClick={() => ui.planned('share-export')}>
          <Send size={18} /> Datei teilen
        </button>
      }
    >
      <div className="parcel">
        <div className="parcel__strip">
          <AnimatePresence initial={false}>
            {strip.map((w, i) => (
              <motion.div key={w.id} initial={{ opacity: 0, y: 14, scale: 0.8 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.7, width: 0, marginLeft: 0, pointerEvents: 'none' }} transition={{ type: 'spring', stiffness: 380, damping: 26, delay: i * 0.03 }} style={{ marginLeft: i ? -14 : 0, zIndex: 9 - i }}>
                <Cover emoji={w.emoji} hue={w.hue} size={52} />
              </motion.div>
            ))}
          </AnimatePresence>
          {strip.length === 0 && <span className="parcel__empty">Noch nichts zum Teilen</span>}
        </div>
        <div className="stats">
          <div className="stat">
            <b><CountUp value={visible.length} duration={0.5} /></b>
            <span>sichtbar</span>
          </div>
          <div className="stat">
            <b><CountUp value={hidden.length} duration={0.5} /></b>
            <span>unauffällig</span>
          </div>
          <div className="stat">
            <b><CountUp value={noteCount} duration={0.5} /></b>
            <span>Notizen</span>
          </div>
        </div>
      </div>

      <div className="setting">
        <div>
          <strong>Notizen mitsenden</strong>
          <p>Standardmäßig bleiben sie bei dir.</p>
        </div>
        <Switch checked={notes} onChange={setNotes} label="Notizen mitsenden" />
      </div>

      <div className="field">
        <span>Gekaufte Artikel</span>
        <Segmented
          id="share-bought"
          value={mode}
          onChange={setMode}
          options={[
            { value: 'hidden', label: 'Unauffällig' },
            { value: 'only', label: 'Nur gekauft' },
            { value: 'exclude', label: 'Ohne' },
          ]}
        />
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={mode} className="explain" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18 }}>
            <EyeOff size={18} />
            <div>
              <strong>{MODE_TEXT[mode].title}</strong>
              <p>{MODE_TEXT[mode].text}</p>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <p className="hint hint--lock">
        <Lock size={14} /> Geschenkideen für andere werden nie geteilt.
      </p>
    </Sheet>
  )
}
