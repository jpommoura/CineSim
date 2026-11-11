import { useEffect, useRef, useState } from 'react'
import { searchPeople, tmdbEnabled } from '../tmdb.js'
import { useI18n } from '../i18n.jsx'

// Campo de nome do ator com sugestões do TMDB.
// Digitar livremente continua funcionando (ator fictício / desconhecido).
export default function ActorSearch({ actor, onPick, onType }) {
  const { t, lang } = useI18n()
  const [results, setResults] = useState([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const boxRef = useRef(null)

  useEffect(() => {
    if (!tmdbEnabled || query.trim().length < 2) { setResults([]); return }
    const ctrl = new AbortController()
    const t = setTimeout(async () => {
      setLoading(true); setError('')
      try {
        setResults(await searchPeople(query.trim(), ctrl.signal, lang))
        setOpen(true)
      } catch (e) {
        if (e.name !== 'AbortError') setError(e.i18nKey ? t(e.i18nKey, e.vars) : e.message)
      } finally {
        setLoading(false)
      }
    }, 400) // debounce
    return () => { clearTimeout(t); ctrl.abort() }
  }, [query, lang]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const close = (e) => boxRef.current && !boxRef.current.contains(e.target) && setOpen(false)
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  return (
    <div className="actor-search" ref={boxRef}>
      <div className="actor-field">
        {actor.photo ? <img className="avatar" src={actor.photo} alt="" /> : <span className="avatar avatar-empty">🎭</span>}
        <input
          value={actor.name}
          placeholder={tmdbEnabled ? t('actor_search_ph') : t('actor_name_ph')}
          onChange={(e) => { onType(e.target.value); setQuery(e.target.value) }}
          onFocus={() => results.length && setOpen(true)}
        />
        {loading && <span className="spinner" />}
        {actor.tmdbId && (
          <a className="tmdb-link" href={`https://www.themoviedb.org/person/${actor.tmdbId}`} target="_blank" rel="noreferrer" title={t('view_tmdb')}>↗</a>
        )}
      </div>
      {error && <small className="danger">{error}</small>}

      {open && results.length > 0 && (
        <ul className="suggestions">
          {results.map((p) => (
            <li key={p.tmdbId}>
              <button
                type="button"
                onClick={() => { onPick(p); setOpen(false); setResults([]) }}
              >
                {p.photo ? <img src={p.photo} alt="" /> : <span className="avatar avatar-empty">🎭</span>}
                <span>
                  <strong>{p.name}</strong>
                  {p.knownFor.length > 0 && <small className="muted">{p.knownFor.join(' · ')}</small>}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
