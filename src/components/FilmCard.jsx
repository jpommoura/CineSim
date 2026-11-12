import { castTotal, characterPhoto, filmCounts, isSeries } from '../utils.js'
import { useI18n } from '../i18n.jsx'

export default function FilmCard({ film: f, universeName, onOpen }) {
  const { t, money } = useI18n()
  const total = castTotal(f)
  const over = f.budget !== null && total > f.budget
  const c = filmCounts(f)
  const series = isSeries(f)
  const cover = f.poster || f.characters.map((c) => characterPhoto(f, c, 'w342')?.src).find(Boolean)

  return (
    <button className="film-card" onClick={() => onOpen(f.id)}>
      <div className={`poster ${f.poster ? 'has-poster' : ''}`}>
        {cover ? <img src={cover} alt="" /> : <span>{f.title.slice(0, 1).toUpperCase()}</span>}
      </div>
      <div className="film-card-body">
        <div className="card-badges">
          <span className={`kind-badge ${series ? 'series' : ''}`}>{series ? t('kind_series') : t('kind_film')}</span>
          {universeName && <span className="universe-badge">{universeName}</span>}
        </div>
        <h3>{f.title}</h3>
        <p className="muted clamp">{f.synopsis || t('no_synopsis')}</p>
        <div className="tags">
          {f.tags.map((tag) => <span key={tag} className="tag">{tag}</span>)}
        </div>
        <div className="stats">
          <span>
            {series
              ? t('series_stats', { seasons: c.seasons, eps: c.episodes, chars: f.characters.length })
              : t('film_stats', { acts: c.acts, scenes: c.scenes, chars: f.characters.length })}
          </span>
          {(f.releaseYear || f.runtime) && (
            <span>{[f.releaseYear, f.runtime && t('runtime_card', { m: f.runtime })].filter(Boolean).join(' · ')}</span>
          )}
          {f.budget !== null && (
            <span className={over ? 'danger' : 'ok'}>
              {money(total)} / {money(f.budget)}
            </span>
          )}
        </div>
      </div>
    </button>
  )
}
