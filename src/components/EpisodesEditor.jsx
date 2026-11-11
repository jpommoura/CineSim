import { useState } from 'react'
import { newEpisode, sortedEpisodes } from '../utils.js'
import { useI18n } from '../i18n.jsx'
import ActsEditor from './ActsEditor.jsx'

// Episódios de uma série, agrupados por temporada.
// Cada episódio tem título, sinopse, duração e os próprios atos e cenas (reaproveita o ActsEditor).
export default function EpisodesEditor({ film, onChange }) {
  const { t } = useI18n()
  const [openId, setOpenId] = useState(null)

  const episodes = sortedEpisodes(film)
  const seasons = [...new Set(episodes.map((e) => e.season))]
  const lastSeason = seasons.length ? Math.max(...seasons) : 1

  const setEpisodes = (fn) => onChange((f) => ({ ...f, episodes: fn(f.episodes || []) }))
  const updateEp = (id, patch) => setEpisodes((eps) => eps.map((e) => (e.id === id ? { ...e, ...patch } : e)))

  const addEpisode = (season) => {
    const inSeason = episodes.filter((e) => e.season === season)
    const number = inSeason.length ? Math.max(...inSeason.map((e) => e.number)) + 1 : 1
    const ep = newEpisode({ season, number, title: t('ep_default', { n: number }) })
    setEpisodes((eps) => [...eps, ep])
    return ep
  }
  const addSeason = () => {
    const ep = addEpisode(episodes.length ? lastSeason + 1 : 1)
    setOpenId(null)
    return ep
  }
  const removeEp = (id) => {
    if (window.confirm(t('ep_delete_confirm'))) setEpisodes((eps) => eps.filter((e) => e.id !== id))
  }

  // O ActsEditor trabalha com { acts, runtime, characters }; aqui ele edita só os atos do episódio
  const episodeAsFilm = (ep) => ({ ...film, acts: ep.acts, runtime: ep.runtime ?? film.runtime })
  const onEpisodeActs = (id) => (updater) =>
    onChange((f) => {
      const ep = (f.episodes || []).find((e) => e.id === id)
      if (!ep) return f
      const pseudo = { ...f, acts: ep.acts, runtime: ep.runtime ?? f.runtime }
      const next = typeof updater === 'function' ? updater(pseudo) : { ...pseudo, ...updater }
      return { ...f, episodes: f.episodes.map((e) => (e.id === id ? { ...e, acts: next.acts } : e)) }
    })

  const counts = (ep) => ({ acts: ep.acts.length, scenes: ep.acts.reduce((n, a) => n + a.scenes.length, 0) })
  const num = (v) => (v === '' ? null : Math.max(0, Number(v)))

  if (episodes.length === 0) {
    return (
      <div className="stack">
        <div className="empty">
          <p>{t('ep_empty')}</p>
          <p className="muted">{t('ep_empty_sub')}</p>
        </div>
        <button className="btn primary self-start" onClick={() => addEpisode(1)}>{t('ep_add')}</button>
      </div>
    )
  }

  return (
    <div className="stack">
      {seasons.map((season) => {
        const list = episodes.filter((e) => e.season === season)
        return (
          <section key={season} className="season stack">
            <div className="section-head">
              <h2>{t('season_label', { n: season })}</h2>
              <span className="muted small">{t('season_eps', { n: list.length })}</span>
            </div>

            {list.map((ep) => {
              const c = counts(ep)
              const open = openId === ep.id
              return (
                <div key={ep.id} className={`card episode ${open ? 'open' : ''}`}>
                  <div className="episode-head">
                    <span className="ep-code">S{String(ep.season).padStart(2, '0')}E{String(ep.number).padStart(2, '0')}</span>
                    <input
                      className="act-title"
                      value={ep.title}
                      onChange={(e) => updateEp(ep.id, { title: e.target.value })}
                      placeholder={t('ep_title_ph')}
                    />
                    <button className="icon danger" onClick={() => removeEp(ep.id)} title={t('ep_delete')}>🗑</button>
                  </div>

                  <div className="episode-fields">
                    <label>
                      {t('ep_season')}
                      <input type="number" min="1" value={ep.season} onChange={(e) => updateEp(ep.id, { season: Math.max(1, Number(e.target.value) || 1) })} />
                    </label>
                    <label>
                      {t('ep_number')}
                      <input type="number" min="1" value={ep.number} onChange={(e) => updateEp(ep.id, { number: Math.max(1, Number(e.target.value) || 1) })} />
                    </label>
                    <label>
                      {t('ep_runtime')}
                      <input
                        type="number"
                        min="1"
                        value={ep.runtime ?? ''}
                        onChange={(e) => updateEp(ep.id, { runtime: num(e.target.value) })}
                        placeholder={film.runtime ? String(film.runtime) : t('ep_runtime_ph')}
                      />
                    </label>
                  </div>

                  <textarea
                    rows={2}
                    value={ep.synopsis}
                    onChange={(e) => updateEp(ep.id, { synopsis: e.target.value })}
                    placeholder={t('ep_synopsis_ph')}
                  />

                  <div className="episode-foot">
                    <span className="muted small">{t('ep_counts', c)}</span>
                    <button className="btn small" onClick={() => setOpenId(open ? null : ep.id)}>
                      {open ? `▾ ${t('ep_close')}` : `▸ ${t('ep_open')}`}
                    </button>
                  </div>

                  {open && (
                    <div className="episode-acts">
                      <ActsEditor key={ep.id} film={episodeAsFilm(ep)} onChange={onEpisodeActs(ep.id)} />
                    </div>
                  )}
                </div>
              )
            })}

            <button className="btn ghost self-start" onClick={() => addEpisode(season)}>{t('ep_add')}</button>
          </section>
        )
      })}

      <button className="btn primary self-start" onClick={addSeason}>{t('season_add')}</button>
    </div>
  )
}
