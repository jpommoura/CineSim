import { useMemo, useState } from 'react'
import { castTotal, newFilm, normalizeRole, SORTS, sortFilms } from '../utils.js'
import { useI18n } from '../i18n.jsx'
import FilmCard from './FilmCard.jsx'

export default function UniverseDetail({ universe, films, onChange, onDelete, onBack, onOpenFilm, onCreateFilm, onUpdateFilm }) {
  const { t, money, lang } = useI18n()
  const [tab, setTab] = useState('details')
  const [newTitle, setNewTitle] = useState('')
  const [newKind, setNewKind] = useState('film')
  const [existingId, setExistingId] = useState('')
  const [sort, setSort] = useState('story')

  const list = sortFilms(films.filter((f) => f.universeId === universe.id), sort, lang)
  const others = films.filter((f) => f.universeId !== universe.id)

  const totals = useMemo(() => {
    const fees = list.reduce((s, f) => s + castTotal(f), 0)
    const withBudget = list.filter((f) => f.budget !== null)
    const budget = withBudget.reduce((s, f) => s + f.budget, 0)
    const chars = list.reduce((s, f) => s + f.characters.length, 0)
    return { fees, budget, hasBudget: withBudget.length > 0, chars }
  }, [list])

  // Elenco do universo: agrupa personagens com o mesmo nome em filmes diferentes
  const cast = useMemo(() => {
    const map = new Map()
    list.forEach((f) =>
      f.characters.forEach((c) => {
        const key = (c.name || '').trim().toLowerCase() || `__${c.id}`
        const actor = f.actors.find((a) => a.characterId === c.id)
        const entry = map.get(key) || { key, name: c.name, photo: null, role: c.role, appearances: [] }
        entry.photo = entry.photo || c.photo
        entry.appearances.push({ film: f, actor })
        map.set(key, entry)
      })
    )
    return [...map.values()].sort((a, b) => b.appearances.length - a.appearances.length)
  }, [list])

  const createFilm = (e) => {
    e.preventDefault()
    if (!newTitle.trim()) return
    onCreateFilm(newFilm({ title: newTitle.trim(), budget: null, universeId: universe.id, kind: newKind }))
    setNewTitle('')
  }

  const addExisting = () => {
    if (!existingId) return
    onUpdateFilm(existingId, { universeId: universe.id })
    setExistingId('')
  }

  const confirmDelete = () => {
    if (window.confirm(t('universe_delete_confirm', { name: universe.name }))) onDelete()
  }

  const TABS = [
    { id: 'details', label: t('tab_details') },
    { id: 'films', label: `${t('tab_films')} (${list.length})` },
    { id: 'cast', label: t('tab_cast_short') },
  ]

  return (
    <section>
      <button className="link" onClick={onBack}>{t('back_generic')}</button>

      <div className="page-head">
        <div className="title-wrap">
          <span className="eyebrow">{t('universe_label')}</span>
          <input className="title-input" value={universe.name} onChange={(e) => onChange({ name: e.target.value })} placeholder={t('u_name')} />
        </div>
        <button className="btn danger-ghost" onClick={confirmDelete}>{t('universe_delete')}</button>
      </div>

      <div className="tabs">
        {TABS.map((tb) => (
          <button key={tb.id} className={tab === tb.id ? 'active' : ''} onClick={() => setTab(tb.id)}>{tb.label}</button>
        ))}
      </div>

      {tab === 'details' && (
        <div className="two-col">
          <div className="card stack">
            <label>
              {t('universe_desc')}
              <textarea rows={8} value={universe.description} onChange={(e) => onChange({ description: e.target.value })} placeholder={t('universe_desc_ph')} />
            </label>
          </div>
          <div className="card stack">
            <div className="kpis two">
              <div><span className="muted small">{t('u_stats_films')}</span><strong>{list.length}</strong></div>
              <div><span className="muted small">{t('u_stats_chars')}</span><strong>{totals.chars}</strong></div>
              <div><span className="muted small">{t('u_stats_fees')}</span><strong>{money(totals.fees)}</strong></div>
              {totals.hasBudget && (
                <div><span className="muted small">{t('u_stats_budget')}</span><strong>{money(totals.budget)}</strong></div>
              )}
            </div>
            {list.length > 0 && (
              <ol className="timeline">
                {sortFilms(list, 'story', lang).map((f) => (
                  <li key={f.id}>
                    <button className="link" onClick={() => onOpenFilm(f.id)}>{f.title}</button>
                    {f.storyOrder != null && <span className="muted small"> · {f.storyOrder}</span>}
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      )}

      {tab === 'films' && (
        <div className="stack">
          <div className="card form-grid">
            <form className="inline" onSubmit={createFilm}>
              <select value={newKind} onChange={(e) => setNewKind(e.target.value)} aria-label={t('kind_label')} className="kind-select">
                <option value="film">{t('kind_film')}</option>
                <option value="series">{t('kind_series')}</option>
              </select>
              <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder={t('film_title_ph')} />
              <button className="btn primary" disabled={!newTitle.trim()}>{t('u_new_film')}</button>
            </form>
            {others.length > 0 && (
              <div className="inline">
                <select value={existingId} onChange={(e) => setExistingId(e.target.value)} aria-label={t('u_add_existing')}>
                  <option value="">{t('u_select_film')}</option>
                  {others.map((f) => <option key={f.id} value={f.id}>{f.title}</option>)}
                </select>
                <button className="btn" onClick={addExisting} disabled={!existingId}>{t('u_add')}</button>
              </div>
            )}
          </div>

          {list.length > 1 && (
            <div className="filters">
              <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label={t('sort_label')}>
                {SORTS.map((m) => <option key={m} value={m}>{t('sort_label')}: {t(`sort_${m}`)}</option>)}
              </select>
            </div>
          )}
          {list.length === 0 ? (
            <div className="empty"><p>{t('universe_no_films')}</p></div>
          ) : (
            <div className="film-grid">
              {list.map((f) => (
                <div key={f.id} className="card-with-action">
                  <FilmCard film={f} onOpen={onOpenFilm} />
                  <button className="link small" onClick={() => onUpdateFilm(f.id, { universeId: null })}>{t('u_remove_film')}</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'cast' && (
        <div className="stack">
          <p className="muted small">{t('u_cast_sub')}</p>
          {cast.length === 0 ? (
            <div className="empty"><p>{t('u_cast_empty')}</p></div>
          ) : (
            <div className="card table-wrap">
              <table>
                <thead>
                  <tr><th>{t('col_character')}</th><th>{t('col_actor')}</th><th>{t('col_films')}</th></tr>
                </thead>
                <tbody>
                  {cast.map((c) => (
                    <tr key={c.key}>
                      <td>
                        <div className="person">
                          {c.photo ? <img className="avatar" src={c.photo} alt="" /> : <span className="avatar avatar-empty">{(c.name || '?').slice(0, 1)}</span>}
                          <span>
                            <strong>{c.name || t('unnamed')}</strong>
                            <small className="muted"> {t(`role_${normalizeRole(c.role)}`)}</small>
                            {c.appearances.length > 1 && <span className="tag recurring">{t('recurring')}</span>}
                          </span>
                        </div>
                      </td>
                      <td>
                        {[...new Set(c.appearances.map((a) => a.actor?.name).filter(Boolean))].join(', ') || <span className="muted">{t('no_actor')}</span>}
                      </td>
                      <td>
                        {c.appearances.map((a, i) => (
                          <span key={a.film.id}>
                            {i > 0 && ', '}
                            <button className="link" onClick={() => onOpenFilm(a.film.id)}>{a.film.title}</button>
                          </span>
                        ))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
