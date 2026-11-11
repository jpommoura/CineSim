import { castTotal } from '../utils.js'
import { useI18n } from '../i18n.jsx'

export default function FilmCard({ film: f, universeName, onOpen }) {
  const { t, money } = useI18n()
  const total = castTotal(f)
  const over = f.budget !== null && total > f.budget
  const scenes = f.acts.reduce((n, a) => n + a.scenes.length, 0)
  const cover = f.characters.find((c) => c.photo)?.photo

  return (
    <button className="film-card" onClick={() => onOpen(f.id)}>
      <div className="poster">
        {cover ? <img src={cover} alt="" /> : <span>{f.title.slice(0, 1).toUpperCase()}</span>}
      </div>
      <div className="film-card-body">
        {universeName && <span className="universe-badge">{universeName}</span>}
        <h3>{f.title}</h3>
        <p className="muted clamp">{f.synopsis || t('no_synopsis')}</p>
        <div className="tags">
          {f.tags.map((tag) => <span key={tag} className="tag">{tag}</span>)}
        </div>
        <div className="stats">
          <span>{t('film_stats', { acts: f.acts.length, scenes, chars: f.characters.length })}</span>
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
