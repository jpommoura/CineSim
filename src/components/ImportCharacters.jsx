import { useState } from 'react'
import { normalizeRole, uid } from '../utils.js'
import { useI18n } from '../i18n.jsx'

// Copia personagens (e opcionalmente seus atores) de outra obra pra esta
export default function ImportCharacters({ film, films, onChange }) {
  const { t } = useI18n()
  const sources = films.filter((f) => f.id !== film.id && f.characters.length)
  const [sourceId, setSourceId] = useState(sources[0]?.id || '')
  const [picked, setPicked] = useState([])
  const [withActor, setWithActor] = useState(true)
  const [done, setDone] = useState(0)

  if (!sources.length) {
    return <div className="card import-panel"><p className="muted small">{t('import_chars_none')}</p></div>
  }

  const source = sources.find((f) => f.id === sourceId) || sources[0]
  const norm = (s) => (s || '').trim().toLowerCase()
  const isDup = (c) => film.characters.some((x) => norm(x.name) === norm(c.name))
  const available = source.characters.filter((c) => !isDup(c))

  const toggle = (id) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))
  const allPicked = available.length > 0 && available.every((c) => picked.includes(c.id))
  const toggleAll = () => setPicked(allPicked ? [] : available.map((c) => c.id))

  const importNow = () => {
    const newChars = []
    const newActors = []
    source.characters
      .filter((c) => picked.includes(c.id))
      .forEach((c) => {
        const id = uid()
        newChars.push({ ...c, id, role: normalizeRole(c.role) })
        const actor = withActor && source.actors.find((a) => a.characterId === c.id)
        if (actor) newActors.push({ ...actor, id: uid(), characterId: id })
      })
    onChange((f) => ({
      ...f,
      characters: [...f.characters, ...newChars],
      actors: [...f.actors, ...newActors],
    }))
    setDone(newChars.length)
    setPicked([])
  }

  return (
    <div className="card import-panel stack">
      <label>
        {t('import_chars_from')}
        <select value={source.id} onChange={(e) => { setSourceId(e.target.value); setPicked([]); setDone(0) }}>
          {sources.map((f) => (
            <option key={f.id} value={f.id}>{(f.title || t('unnamed')) + ` (${f.characters.length})`}</option>
          ))}
        </select>
      </label>

      <div className="import-list">
        {source.characters.map((c) => {
          const dup = isDup(c)
          return (
            <label key={c.id} className={`import-item ${dup ? 'muted' : ''}`}>
              <input type="checkbox" disabled={dup} checked={picked.includes(c.id)} onChange={() => toggle(c.id)} />
              <span>{c.name || t('unnamed')}</span>
              <span className="tag">{t(`role_${normalizeRole(c.role)}`)}</span>
              {dup && <small>{t('import_chars_dup')}</small>}
            </label>
          )
        })}
      </div>

      <label className="import-item">
        <input type="checkbox" checked={withActor} onChange={(e) => setWithActor(e.target.checked)} />
        <span>{t('import_chars_actor')}</span>
      </label>

      <div className="edit-actions">
        {available.length > 1 && (
          <button className="btn small" onClick={toggleAll}>{allPicked ? t('import_chars_none_sel') : t('import_chars_all')}</button>
        )}
        <button className="btn primary small" disabled={!picked.length} onClick={importNow}>
          {t('import_chars_btn', { n: picked.length })}
        </button>
        {done > 0 && <small className="muted">{t('import_chars_done', { n: done })}</small>}
      </div>
    </div>
  )
}
