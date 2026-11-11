import { useState } from 'react'
import { uid } from '../utils.js'
import { useI18n } from '../i18n.jsx'

// Lista de universos (aba "Universos" da página inicial)
export default function UniverseManager({ universes, films, setUniverses, onOpen }) {
  const { t } = useI18n()
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  const add = (e) => {
    e.preventDefault()
    if (!name.trim()) return
    setUniverses((prev) => [...prev, { id: uid(), name: name.trim(), description: description.trim() }])
    setName(''); setDescription(''); setShowForm(false)
  }

  return (
    <section>
      <div className="page-head">
        <div>
          <h1>{t('universes_title')}</h1>
          <p className="muted">{t('universes_sub')}</p>
        </div>
        <button className="btn primary" onClick={() => setShowForm((s) => !s)}>
          {showForm ? t('cancel') : t('universe_new')}
        </button>
      </div>

      {showForm && (
        <form className="card form-grid" onSubmit={add}>
          <label>{t('universe_name')}<input value={name} onChange={(e) => setName(e.target.value)} placeholder={t('universe_name_ph')} autoFocus /></label>
          <label>{t('universe_desc')}<input value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t('universe_desc_ph')} /></label>
          <div className="form-actions"><button className="btn primary" disabled={!name.trim()}>{t('universe_create')}</button></div>
        </form>
      )}

      {universes.length === 0 ? (
        <div className="empty"><p>{t('universe_empty')}</p></div>
      ) : (
        <div className="universe-grid">
          {universes.map((u) => {
            const list = films.filter((f) => f.universeId === u.id).sort((a, b) => a.createdAt - b.createdAt)
            const covers = list.flatMap((f) => f.characters.filter((c) => c.photo).map((c) => c.photo)).slice(0, 4)
            return (
              <button key={u.id} className="universe-card" onClick={() => onOpen(u.id)}>
                <div className="universe-cover">
                  {covers.length > 0
                    ? covers.map((src, i) => <img key={i} src={src} alt="" />)
                    : <span>{u.name.slice(0, 1).toUpperCase()}</span>}
                </div>
                <div className="film-card-body">
                  <h3>{u.name}</h3>
                  <p className="muted clamp">{u.description || '—'}</p>
                  <div className="stats">
                    <span>{t('universe_films', { n: list.length })}</span>
                    {list.length > 0 && <span className="clamp">{list.map((f) => f.title).join(' · ')}</span>}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </section>
  )
}
