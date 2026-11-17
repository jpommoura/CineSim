import { filmCounts, isSeries } from '../utils.js'
import { useI18n } from '../i18n.jsx'

// Card resumido: tipo, universo, temporadas/episódios (séries), anos e orçamento
export default function FilmCard({ film: f, universeName, onOpen }) {
  const { t, money } = useI18n()
  const c = filmCounts(f)
  const series = isSeries(f)
  const season = f.seasonOf ? f.seasonNumber : null // card de temporada (pseudo-obra)
  const cover = f.poster || f.characters.find((c) => c.photo)?.photo
  const hasYear = f.releaseYear != null
  const hasStory = f.storyOrder != null

  return (
    <button className="film-card" onClick={() => (season ? onOpen(f.seasonOf, 'episodios') : onOpen(f.id))}>
      <div className={`poster ${f.poster ? 'has-poster' : ''}`}>
        {cover ? <img src={cover} alt="" /> : <span>{f.title.slice(0, 1).toUpperCase()}</span>}
      </div>
      <div className="film-card-body">
        <div className="card-badges">
          <span className={`kind-badge ${season ? 'season' : series ? 'series' : ''}`}>{season ? t('kind_season') : series ? t('kind_series') : t('kind_film')}</span>
          {universeName && <span className="universe-badge">{universeName}</span>}
        </div>
        <h3>{f.title}</h3>
        <div className="stats">
          {season ? (
            <span>{t('season_eps', { n: f.seasonEpisodes })}</span>
          ) : (
            series && <span>{t('card_seasons_eps', { seasons: c.seasons, eps: c.episodes })}</span>
          )}
          {(hasYear || hasStory) && (
            <span>
              {[hasYear && t('card_release', { y: f.releaseYear }), hasStory && t('card_story', { y: f.storyOrder })]
                .filter(Boolean)
                .join(' · ')}
            </span>
          )}
          {!season && f.budget !== null && <span className="ok">{t('card_budget', { v: money(f.budget) })}</span>}
        </div>
      </div>
    </button>
  )
}
