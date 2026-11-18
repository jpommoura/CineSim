import { characterPhoto, normalizeRole } from '../utils.js'
import { useI18n } from '../i18n.jsx'

// Detalhes próprios de uma temporada: sinopse, descrição, orçamento e elenco (com cachê da temporada).
// O elenco é escolhido entre os personagens da série; o ator vem de quem interpreta o personagem na série.
export default function SeasonDetails({ film, season, meta, episodes, onPatch }) {
  const { t, money } = useI18n()
  const cast = meta.cast || {} // { [characterId]: { fee } }
  const inSeason = film.characters.filter((c) => cast[c.id])
  const total = inSeason.reduce((sum, c) => sum + (Number(cast[c.id].fee) || 0), 0)
  const budget = meta.budget ?? null
  const over = budget !== null && total > budget

  const setCast = (next) => onPatch({ cast: next })
  const toggleChar = (id) => {
    const next = { ...cast }
    if (next[id]) delete next[id]
    else next[id] = { fee: 0 }
    setCast(next)
  }
  const setFee = (id, v) => setCast({ ...cast, [id]: { ...cast[id], fee: v === '' ? 0 : Math.max(0, Number(v) || 0) } })

  // Personagens marcados como "em cena" em algum episódio desta temporada
  const inScenes = new Set(episodes.flatMap((e) => e.acts.flatMap((a) => a.scenes.flatMap((s) => s.characterIds))))
  const missingFromScenes = film.characters.filter((c) => inScenes.has(c.id) && !cast[c.id])
  const addFromScenes = () => {
    const next = { ...cast }
    missingFromScenes.forEach((c) => { next[c.id] = { fee: 0 } })
    setCast(next)
  }

  const actorOf = (charId) => film.actors.find((a) => a.characterId === charId)
  const num = (v) => (v === '' ? null : Math.max(0, Number(v)))

  return (
    <div className="season-details stack">
      <div className="season-details-grid">
        <label>
          {t('synopsis')}
          <textarea rows={3} value={meta.synopsis || ''} onChange={(e) => onPatch({ synopsis: e.target.value })} placeholder={t('season_synopsis_ph', { n: season })} />
        </label>
        <label>
          {t('description')}
          <textarea rows={3} value={meta.description || ''} onChange={(e) => onPatch({ description: e.target.value })} placeholder={t('description_ph')} />
        </label>
      </div>

      <label className="season-budget">
        {t('season_budget')}
        <input type="number" min="0" step="1000" value={budget ?? ''} onChange={(e) => onPatch({ budget: num(e.target.value) })} placeholder={t('season_budget_ph')} />
      </label>

      <div className="section-head">
        <h3>{t('season_cast', { n: season })}</h3>
        {missingFromScenes.length > 0 && (
          <button className="btn small" onClick={addFromScenes}>{t('season_cast_from_scenes', { n: missingFromScenes.length })}</button>
        )}
      </div>

      {film.characters.length === 0 ? (
        <p className="muted small">{t('season_cast_empty')}</p>
      ) : (
        <div className="season-cast">
          {film.characters.map((c) => {
            const on = !!cast[c.id]
            const actor = actorOf(c.id)
            const ph = characterPhoto(film, c, 'w185')
            const toggle = () => toggleChar(c.id)
            return (
              <div key={c.id} className={`season-cast-row ${on ? 'on' : ''}`}>
                <div
                  className="check-row"
                  role="checkbox"
                  aria-checked={on}
                  tabIndex={0}
                  onClick={toggle}
                  onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); toggle() } }}
                >
                  <span className={`check-box ${on ? 'on' : ''}`} aria-hidden>{on ? '✓' : ''}</span>
                  {ph ? <img className="avatar" src={ph.src} alt="" /> : <span className="avatar avatar-empty">{(c.name || '?').slice(0, 1).toUpperCase()}</span>}
                  <span className="season-cast-name">
                    <strong>{c.name || t('unnamed')}</strong>
                    <small className="muted">
                      {t(`role_${normalizeRole(c.role)}`)} · {actor ? actor.name || t('actor_unnamed') : t('no_actor')}
                    </small>
                  </span>
                </div>
                {on && (
                  <label className="season-fee">
                    {t('season_fee')}
                    <input type="number" min="0" step="100" value={cast[c.id].fee ?? 0} onChange={(e) => setFee(c.id, e.target.value)} />
                  </label>
                )}
              </div>
            )
          })}
        </div>
      )}

      <div className={`season-total ${over ? 'danger' : ''}`}>
        {t('season_cast_total')}: <strong>{money(total)}</strong>
        {budget !== null && <> / {money(budget)}{over && ` · ${t('season_over')}`}</>}
      </div>
    </div>
  )
}
