import { useMemo, useState } from 'react'
import { listedSeasons, newFilm, parseMoney, SORTS, sortFilms, useLocalStorage } from '../utils.js'
import { useI18n } from '../i18n.jsx'
import FilmCard from './FilmCard.jsx'

export default function FilmList({ films, universes, onCreate, onOpen }) {
  const { t, lang } = useI18n()
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [budget, setBudget] = useState('')
  const [universeId, setUniverseId] = useState('')
  const [kind, setKind] = useState('film')
  const [kinds, setKinds] = useLocalStorage('cinesim:kinds', ['film', 'series', 'season'])
  const toggleKind = (k) => setKinds((cur) => (cur.includes(k) ? cur.filter((x) => x !== k) : [...cur, k]))
  const [filterUniverse, setFilterUniverse] = useState('all')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useLocalStorage('cinesim:sort', 'created')

  const universeName = (id) => universes.find((u) => u.id === id)?.name

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    const entries = [...films, ...listedSeasons(films)]
    const filtered = entries.filter((f) => {
      const kind = f.seasonOf ? 'season' : f.kind || 'film'
      if (!kinds.includes(kind)) return false
      if (filterUniverse === 'none' && f.universeId) return false
      if (filterUniverse !== 'all' && filterUniverse !== 'none' && f.universeId !== filterUniverse) return false
      if (!q) return true
      return f.title.toLowerCase().includes(q) || f.tags.some((tag) => tag.toLowerCase().includes(q))
    })
    return sortFilms(filtered, sort, lang)
  }, [films, filterUniverse, kinds, search, sort, lang])

  const submit = (e) => {
    e.preventDefault()
    if (!title.trim()) return
    onCreate(newFilm({ title: title.trim(), budget: parseMoney(budget, lang), universeId, kind }))
    setTitle(''); setBudget(''); setUniverseId(''); setKind('film'); setShowForm(false)
  }

  return (
    <section>
      <div className="page-head">
        <div>
          <h1>{t('films_title')}</h1>
          <p className="muted">{t('films_count', { n: films.length })}</p>
        </div>
        <button className="btn primary" onClick={() => setShowForm((s) => !s)}>
          {showForm ? t('cancel') : t('film_new')}
        </button>
      </div>

      {showForm && (
        <form className="card form-grid" onSubmit={submit}>
          <div>
            <span className="label">{t('kind_label')}</span>
            <div className="kind-switch" role="group" aria-label={t('kind_label')}>
              {['film', 'series'].map((k) => (
                <button key={k} type="button" className={kind === k ? 'active' : ''} onClick={() => setKind(k)}>{t(`kind_${k}`)}</button>
              ))}
            </div>
          </div>
          <label>
            {t('film_title')}
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('film_title_ph')} autoFocus />
          </label>
          <label>
            {t('film_budget_opt')}
            <input value={budget} onChange={(e) => setBudget(e.target.value)} placeholder={t('film_budget_ph')} inputMode="decimal" />
          </label>
          <label>
            {t('film_universe_opt')}
            <select value={universeId} onChange={(e) => setUniverseId(e.target.value)}>
              <option value="">{t('none_option')}</option>
              {universes.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </label>
          <div className="form-actions">
            <button className="btn primary" type="submit" disabled={!title.trim()}>{t('film_create')}</button>
          </div>
        </form>
      )}

      <div className="filters">
        <input placeholder={t('search_ph')} value={search} onChange={(e) => setSearch(e.target.value)} />
        <select value={filterUniverse} onChange={(e) => setFilterUniverse(e.target.value)}>
          <option value="all">{t('filter_all')}</option>
          <option value="none">{t('filter_none')}</option>
          {universes.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label={t('sort_label')}>
          {SORTS.map((m) => <option key={m} value={m}>{t('sort_label')}: {t(`sort_${m}`)}</option>)}
        </select>
      </div>

      <div className="kind-checks" role="group" aria-label={t('kind_label')}>
        {['film', 'series', 'season'].map((k) => {
          const on = kinds.includes(k)
          return (
            <div
              key={k}
              className="check-row"
              role="checkbox"
              aria-checked={on}
              tabIndex={0}
              onClick={() => toggleKind(k)}
              onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); toggleKind(k) } }}
            >
              <span className={`check-box ${on ? 'on' : ''}`} aria-hidden>{on ? '✓' : ''}</span>
              <span>{t(`filter_check_${k}`)}</span>
            </div>
          )
        })}
      </div>

      {visible.length === 0 ? (
        <div className="empty">
          <p>{t('films_empty')}</p>
          <p className="muted">{t('films_empty_sub')}</p>
        </div>
      ) : (
        <div className="film-grid">
          {visible.map((f) => (
            <FilmCard key={f.id} film={f} universeName={universeName(f.universeId)} onOpen={onOpen} />
          ))}
        </div>
      )}
    </section>
  )
}
