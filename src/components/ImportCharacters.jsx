import { useEffect, useState } from 'react'
import { characterPhoto, normalizeRole, uid } from '../utils.js'
import { useI18n } from '../i18n.jsx'

// Janela pra copiar personagens (e opcionalmente seus atores) de outra obra pra esta
export default function ImportCharacters({ film, films, onChange, onClose }) {
  const { t } = useI18n()
  const sources = films.filter((f) => f.id !== film.id && f.characters.length)
  const [sourceId, setSourceId] = useState(sources[0]?.id || '')
  const [picked, setPicked] = useState([])
  const [withActor, setWithActor] = useState(true)

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const source = sources.find((f) => f.id === sourceId) || sources[0]
  const norm = (s) => (s || '').trim().toLowerCase()
  const isDup = (c) => film.characters.some((x) => norm(x.name) === norm(c.name))
  const available = source ? source.characters.filter((c) => !isDup(c)) : []

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
    onClose()
  }

  const Check = ({ on, disabled }) => (
    <span className={`check-box ${on ? 'on' : ''} ${disabled ? 'disabled' : ''}`} aria-hidden>{on ? '✓' : ''}</span>
  )

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="card import-modal" role="dialog" aria-modal="true">
        <div className="import-head">
          <h3>{t('import_chars_title')}</h3>
          <button className="icon" onClick={onClose} title={t('cancel')}>✕</button>
        </div>

        {!source ? (
          <p className="muted">{t('import_chars_none')}</p>
        ) : (
          <>
            <label>
              {t('import_chars_from')}
              <select value={source.id} onChange={(e) => { setSourceId(e.target.value); setPicked([]) }}>
                {sources.map((f) => (
                  <option key={f.id} value={f.id}>{(f.title || t('unnamed')) + ` (${f.characters.length})`}</option>
                ))}
              </select>
            </label>

            {available.length > 1 && (
              <button className="link small import-all" onClick={toggleAll}>
                {allPicked ? t('import_chars_none_sel') : t('import_chars_all')}
              </button>
            )}

            <div className="import-list">
              {source.characters.map((c) => {
                const dup = isDup(c)
                const on = picked.includes(c.id)
                const ph = characterPhoto(source, c, 'w185')
                const actor = source.actors.find((a) => a.characterId === c.id)
                return (
                  <div
                    key={c.id}
                    role="checkbox"
                    aria-checked={on}
                    aria-disabled={dup}
                    tabIndex={dup ? -1 : 0}
                    className={`import-row ${on ? 'on' : ''} ${dup ? 'dup' : ''}`}
                    onClick={() => !dup && toggle(c.id)}
                    onKeyDown={(e) => { if (!dup && (e.key === ' ' || e.key === 'Enter')) { e.preventDefault(); toggle(c.id) } }}
                  >
                    <Check on={on} disabled={dup} />
                    {ph ? <img className="import-photo" src={ph.src} alt="" /> : <span className="import-photo empty">{(c.name || '?').slice(0, 1).toUpperCase()}</span>}
                    <div className="import-info">
                      <div className="import-name">
                        <strong>{c.name || t('unnamed')}</strong>
                        <span className="tag">{t(`role_${normalizeRole(c.role)}`)}</span>
                        {dup && <span className="tag">{t('import_chars_dup')}</span>}
                      </div>
                      {c.description && <p className="small muted import-desc">{c.description}</p>}
                      <small className="muted">
                        {actor ? <>🎭 {t('played_by')} <strong>{actor.name || t('actor_unnamed')}</strong></> : t('no_actor')}
                      </small>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="import-foot">
              <div className="import-row plain" role="checkbox" aria-checked={withActor} tabIndex={0}
                onClick={() => setWithActor((v) => !v)}
                onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); setWithActor((v) => !v) } }}>
                <Check on={withActor} />
                <span className="small">{t('import_chars_actor')}</span>
              </div>
              <div className="edit-actions">
                <button className="btn small" onClick={onClose}>{t('cancel')}</button>
                <button className="btn primary small" disabled={!picked.length} onClick={importNow}>
                  {t('import_chars_btn', { n: picked.length })}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
