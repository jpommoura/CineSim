import { useEffect, useRef, useState } from 'react'
import { castTotal, characterPhoto, normalizeRole, REFERENCE_BUDGET, resizeImage, ROLES, suggestFee, uid } from '../utils.js'
import { getCareerScore, tmdbEnabled } from '../tmdb.js'
import { useI18n } from '../i18n.jsx'
import ActorSearch from './ActorSearch.jsx'
import ImportCharacters from './ImportCharacters.jsx'

// Personagens e atores ficam em modo de visualização.
// "Editar" abre um rascunho; só vai pro filme ao clicar em "Salvar".
// Tira um personagem do "Em cena" de todas as cenas
const stripChar = (acts, id) =>
  acts.map((act) => ({
    ...act,
    scenes: act.scenes.map((s) => ({ ...s, characterIds: s.characterIds.filter((x) => x !== id) })),
  }))

export default function CastEditor({ film, films = [], onChange }) {
  const { t, money, lang } = useI18n()

  // rascunhos em edição: { [id]: { ...dados, isNew } }
  const [charDrafts, setCharDrafts] = useState({})
  const [actorDrafts, setActorDrafts] = useState({})
  const [errors, setErrors] = useState({})
  const [suggestions, setSuggestions] = useState({}) // { [actorId]: resultado | 'loading' }
  const [showImport, setShowImport] = useState(false)
  const [addMenu, setAddMenu] = useState(false)
  const addMenuRef = useRef(null)
  // fecha o menu da setinha ao clicar fora
  useEffect(() => {
    if (!addMenu) return
    const onDown = (e) => { if (!addMenuRef.current?.contains(e.target)) setAddMenu(false) }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [addMenu])

  /* ---------- Personagens ---------- */
  const newCharDrafts = Object.values(charDrafts).filter((d) => d.isNew)
  const charList = [...film.characters, ...newCharDrafts]

  const addCharacter = () => {
    const id = uid()
    setCharDrafts((d) => ({ ...d, [id]: { id, name: '', role: 'main', description: '', photo: null, isNew: true } }))
  }
  const editChar = (c) => setCharDrafts((d) => ({ ...d, [c.id]: { ...c, role: normalizeRole(c.role) } }))
  const patchCharDraft = (id, patch) => setCharDrafts((d) => ({ ...d, [id]: { ...d[id], ...patch } }))
  const closeCharDraft = (id) => {
    setCharDrafts((d) => { const n = { ...d }; delete n[id]; return n })
    setErrors((e) => ({ ...e, [id]: null }))
  }
  const saveChar = (id) => {
    const { isNew, ...data } = charDrafts[id]
    if (!data.name.trim()) { setErrors((e) => ({ ...e, [id]: t('name_required') })); return }
    data.name = data.name.trim()
    onChange((f) => ({
      ...f,
      characters: isNew ? [...f.characters, data] : f.characters.map((c) => (c.id === id ? data : c)),
    }))
    closeCharDraft(id)
  }
  const removeChar = (id) => {
    closeCharDraft(id)
    onChange((f) => ({
      ...f,
      characters: f.characters.filter((c) => c.id !== id),
      actors: f.actors.map((a) => (a.characterId === id ? { ...a, characterId: null } : a)),
      acts: stripChar(f.acts, id),
      episodes: (f.episodes || []).map((e) => ({ ...e, acts: stripChar(e.acts, id) })),
    }))
  }
  // Arrastar e soltar pra reordenar personagens
  const [dragId, setDragId] = useState(null)
  const [overId, setOverId] = useState(null)
  const moveChar = (fromId, toId) => {
    if (!fromId || fromId === toId) return
    onChange((f) => {
      const list = [...f.characters]
      const from = list.findIndex((c) => c.id === fromId)
      const to = list.findIndex((c) => c.id === toId)
      if (from < 0 || to < 0) return f
      const [item] = list.splice(from, 1)
      list.splice(to, 0, item)
      return { ...f, characters: list }
    })
  }
  const overRef = useRef(null)
  const endDrag = () => { setDragId(null); setOverId(null); overRef.current = null }

  // Arrasto feito "na mão" com eventos do mouse (mais confiável que o drag nativo do HTML)
  useEffect(() => {
    if (!dragId) return
    const onMove = (e) => {
      const el = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-char-id]')
      const id = el?.dataset.charId ?? null
      overRef.current = id
      setOverId(id)
    }
    const onUp = () => { moveChar(dragId, overRef.current); endDrag() }
    document.body.classList.add('is-dragging')
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => {
      document.body.classList.remove('is-dragging')
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
  }, [dragId]) // eslint-disable-line react-hooks/exhaustive-deps

  const onPhoto = async (id, file) => {
    if (!file) return
    try {
      patchCharDraft(id, { photo: await resizeImage(file) })
    } catch {
      alert(t('photo_error'))
    }
  }

  /* ---------- Atores ---------- */
  const newActorDrafts = Object.values(actorDrafts).filter((d) => d.isNew)
  const [actorSort, setActorSort] = useState('chars')
  const charIndex = (id) => {
    const i = film.characters.findIndex((c) => c.id === id)
    return i < 0 ? Number.MAX_SAFE_INTEGER : i // sem personagem vai pro fim
  }
  const SORTS = {
    chars: (a, b) => charIndex(a.characterId) - charIndex(b.characterId),
    fee_desc: (a, b) => (Number(b.fee) || 0) - (Number(a.fee) || 0),
    fee_asc: (a, b) => (Number(a.fee) || 0) - (Number(b.fee) || 0),
    name: (a, b) => (a.name || '').localeCompare(b.name || '', lang),
  }
  const actorList = [...[...film.actors].sort(SORTS[actorSort]), ...newActorDrafts]

  const addActor = () => {
    const id = uid()
    setActorDrafts((d) => ({ ...d, [id]: { id, name: '', fee: 0, characterId: null, tmdbId: null, photo: null, knownFor: [], careerScore: null, isNew: true } }))
  }
  const editActor = (a) => setActorDrafts((d) => ({ ...d, [a.id]: { ...a } }))
  const patchActorDraft = (id, patch) => setActorDrafts((d) => ({ ...d, [id]: { ...d[id], ...patch } }))
  const clearSuggestion = (id) => setSuggestions((s) => { const n = { ...s }; delete n[id]; return n })

  // Sugestão de cachê: papel do personagem + fama pela carreira (TMDB) + porte do filme (orçamento)
  const suggest = async (id) => {
    const draft = actorDrafts[id]
    const role = film.characters.find((c) => c.id === draft.characterId)?.role ?? 'supporting'
    let score = draft.careerScore ?? null
    if (draft.tmdbId && score == null && tmdbEnabled) {
      setSuggestions((s) => ({ ...s, [id]: 'loading' }))
      try {
        score = await getCareerScore(draft.tmdbId)
        patchActorDraft(id, { careerScore: score })
      } catch { /* sem dados: trata como desconhecido */ }
    }
    setSuggestions((s) => ({ ...s, [id]: suggestFee(role, score, film.budget) }))
  }

  const closeActorDraft = (id) => {
    clearSuggestion(id)
    setActorDrafts((d) => { const n = { ...d }; delete n[id]; return n })
    setErrors((e) => ({ ...e, [id]: null }))
  }
  const saveActor = (id) => {
    const { isNew, ...data } = actorDrafts[id]
    if (!data.name.trim()) { setErrors((e) => ({ ...e, [id]: t('name_required') })); return }
    data.name = data.name.trim()
    data.fee = Math.max(0, Number(data.fee) || 0)
    onChange((f) => ({
      ...f,
      actors: isNew ? [...f.actors, data] : f.actors.map((a) => (a.id === id ? data : a)),
    }))
    closeActorDraft(id)
  }
  const removeActor = (id) => {
    closeActorDraft(id)
    onChange((f) => ({ ...f, actors: f.actors.filter((a) => a.id !== id) }))
  }

  const keys = (save, cancel) => (e) => {
    if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') { e.preventDefault(); save() }
    if (e.key === 'Escape') cancel()
  }

  const actorOf = (charId) => film.actors.find((a) => a.characterId === charId)
  const charName = (id) => film.characters.find((c) => c.id === id)?.name
  const total = castTotal(film)
  const hasBudget = film.budget !== null

  return (
    <div className="stack">

      {/* ---------- Personagens ---------- */}
      <div className="section-head">
        <h2>{t('characters')}</h2>
        <div className="split-btn" ref={addMenuRef}>
          <button className="btn primary" onClick={addCharacter}>{t('character_add')}</button>
          <button className="btn primary split-caret" onClick={() => setAddMenu((v) => !v)} aria-label={t('import_chars_toggle')} aria-expanded={addMenu}>
            {addMenu ? '▴' : '▾'}
          </button>
          {addMenu && (
            <div className="split-menu">
              <button onClick={() => { setAddMenu(false); setShowImport(true) }}>{t('import_chars_toggle')}</button>
            </div>
          )}
        </div>
      </div>

      {showImport && <ImportCharacters film={film} films={films} onChange={onChange} onClose={() => setShowImport(false)} />}

      {charList.length === 0 && <p className="muted">{t('characters_empty')}</p>}

      <div className="char-grid">
        {charList.map((c) => {
          const draft = charDrafts[c.id]
          const actor = actorOf(c.id)

          if (draft) {
            const cancel = () => closeCharDraft(c.id)
            const save = () => saveChar(c.id)
            return (
              <div key={c.id} className="card char-card editing" onKeyDown={keys(save, cancel)}>
                <label className="photo">
                  {draft.photo ? (
                    <img src={draft.photo} alt="" />
                  ) : characterPhoto(film, { ...draft, photo: null }, 'w342') ? (
                    <>
                      <img className="fallback" src={characterPhoto(film, { ...draft, photo: null }, 'w342').src} alt="" />
                      <span className="photo-overlay">{t('photo_add')}<br /><small>{t('photo_opt')}</small></span>
                    </>
                  ) : (
                    <span>{t('photo_add')}<br /><small>{t('photo_opt')}</small></span>
                  )}
                  <input type="file" accept="image/*" hidden onChange={(e) => onPhoto(c.id, e.target.files[0])} />
                </label>
                {draft.photo && <button className="link small" onClick={() => patchCharDraft(c.id, { photo: null })}>{t('photo_remove')}</button>}
                <input value={draft.name} onChange={(e) => patchCharDraft(c.id, { name: e.target.value })} placeholder={t('character_name_ph')} autoFocus />
                {errors[c.id] && <small className="danger">{errors[c.id]}</small>}
                <select value={draft.role} onChange={(e) => patchCharDraft(c.id, { role: e.target.value })}>
                  {ROLES.map((r) => <option key={r} value={r}>{t(`role_${r}`)}</option>)}
                </select>
                <textarea rows={3} value={draft.description} onChange={(e) => patchCharDraft(c.id, { description: e.target.value })} placeholder={t('character_desc_ph')} />
                <div className="edit-actions">
                  <button className="btn primary small" onClick={save}>{t('save')}</button>
                  <button className="btn small" onClick={cancel}>{t('cancel')}</button>
                  {!draft.isNew && <button className="btn danger-ghost small push" onClick={() => removeChar(c.id)}>{t('delete')}</button>}
                </div>
              </div>
            )
          }

          return (
            <div
              key={c.id}
              data-char-id={c.id}
              className={`card char-card ${dragId === c.id ? 'dragging' : ''} ${overId === c.id && dragId && dragId !== c.id ? 'drag-over' : ''}`}
            >
              {film.characters.length > 1 && (
                <span
                  className="drag-handle"
                  title={t('drag_hint')}
                  aria-label={t('drag_hint')}
                  onPointerDown={(e) => { if (e.button !== 0) return; e.preventDefault(); setDragId(c.id); overRef.current = c.id; setOverId(c.id) }}
                >
                  <svg viewBox="0 0 10 16" width="10" height="16" aria-hidden><g fill="currentColor"><circle cx="2" cy="2" r="1.5"/><circle cx="8" cy="2" r="1.5"/><circle cx="2" cy="8" r="1.5"/><circle cx="8" cy="8" r="1.5"/><circle cx="2" cy="14" r="1.5"/><circle cx="8" cy="14" r="1.5"/></g></svg>
                </span>
              )}
              <div className="photo static">
                {(() => {
                  const ph = characterPhoto(film, c, 'w342')
                  if (!ph) return <span className="initial">{(c.name || '?').slice(0, 1).toUpperCase()}</span>
                  return (
                    <>
                      <img src={ph.src} alt={c.name} draggable={false} />
                      {ph.fromActor && <span className="photo-source" title={t('photo_from_actor_title')}>{t('photo_from_actor')}</span>}
                    </>
                  )
                })()}
              </div>
              <div>
                <h3>{c.name || t('unnamed')}</h3>
                <span className="tag">{t(`role_${normalizeRole(c.role)}`)}</span>
              </div>
              <p className={`small ${c.description ? '' : 'muted'}`}>{c.description || t('no_description')}</p>
              <div className="muted small">
                {actor ? <>🎭 {t('played_by')} <strong>{actor.name || t('actor_unnamed')}</strong></> : t('no_actor')}
              </div>
              <button className="btn small push-top" onClick={() => editChar(c)}>{t('edit')}</button>
            </div>
          )
        })}
      </div>

      {/* ---------- Atores ---------- */}
      <div className="section-head">
        <h2>{t('actors')}</h2>
        <div className="inline">
          {film.actors.length > 1 && (
            <select className="sort-select" value={actorSort} onChange={(e) => setActorSort(e.target.value)} aria-label={t('sort_label')}>
              {Object.keys(SORTS).map((k) => <option key={k} value={k}>{t(`sort_${k}`)}</option>)}
            </select>
          )}
          <button className="btn primary" onClick={addActor}>{t('actor_add')}</button>
        </div>
      </div>

      {!tmdbEnabled && <p className="muted small">💡 {t('tmdb_hint')}</p>}

      {actorList.length === 0 ? (
        <p className="muted">{t('actors_empty')}</p>
      ) : (
        <div className="card table-wrap">
          <table>
            <thead>
              <tr><th>{t('col_actor')}</th><th>{t('col_character')}</th><th>{t('col_fee')}</th><th></th></tr>
            </thead>
            <tbody>
              {actorList.map((a) => {
                const draft = actorDrafts[a.id]

                if (draft) {
                  const cancel = () => closeActorDraft(a.id)
                  const save = () => saveActor(a.id)
                  return (
                    <tr key={a.id} className="editing" onKeyDown={keys(save, cancel)}>
                      <td>
                        <ActorSearch
                          actor={draft}
                          onType={(name) => { patchActorDraft(a.id, { name, tmdbId: null, photo: null, knownFor: [], careerScore: null }); clearSuggestion(a.id) }}
                          onPick={(p) => { patchActorDraft(a.id, p); clearSuggestion(a.id) }}
                        />
                        {errors[a.id] && <small className="danger">{errors[a.id]}</small>}
                      </td>
                      <td>
                        <select value={draft.characterId || ''} onChange={(e) => { patchActorDraft(a.id, { characterId: e.target.value || null }); clearSuggestion(a.id) }}>
                          <option value="">{t('none_option')}</option>
                          {film.characters.map((c) => {
                            const taken = film.actors.some((x) => x.id !== a.id && x.characterId === c.id)
                            return (
                              <option key={c.id} value={c.id} disabled={taken}>
                                {(c.name || t('unnamed')) + (taken ? t('already_cast') : '')}
                              </option>
                            )
                          })}
                        </select>
                      </td>
                      <td>
                        <div className="inline">
                          <input type="number" min="0" step="100" value={draft.fee} onChange={(e) => patchActorDraft(a.id, { fee: e.target.value })} />
                          <button type="button" className="btn small" onClick={() => suggest(a.id)} title={t('fee_suggest_title')}>{t('fee_suggest')}</button>
                        </div>
                        {suggestions[a.id] === 'loading' && <span className="spinner" />}
                        {suggestions[a.id] && suggestions[a.id] !== 'loading' && (() => {
                          const sg = suggestions[a.id]
                          return (
                            <div className="fee-suggestion">
                              <strong>{t('fee_suggestion', { min: money(sg.min), max: money(sg.max) })}</strong>
                              <small className="muted">
                                {t('fee_basis', { role: t(`role_${sg.role}`), fame: t(`fame_${sg.fame}`) })}
                                {sg.score != null && ` (${t('fee_score', { s: sg.score.toLocaleString(lang === 'en' ? 'en-US' : 'pt-BR') })})`}
                                {hasBudget && film.budget > 0 && ` · ${t('fee_of_budget', { p: (sg.mid / film.budget) * 100 < 1 ? '<1' : Math.round((sg.mid / film.budget) * 100) })}`}
                              </small>
                              <small className="muted">
                                {sg.hasBudget
                                  ? t('fee_size_budget', { f: sg.size, ref: money(REFERENCE_BUDGET) })
                                  : t('fee_size_default', { ref: money(REFERENCE_BUDGET) })}
                              </small>
                              <small className="muted">{t('fee_breakdown', { floor: money(sg.floor), premium: money(sg.premium) })}</small>
                              {sg.capped && <small className="warn-text">{t('fee_capped')}</small>}
                              <button type="button" className="link small" onClick={() => { patchActorDraft(a.id, { fee: sg.mid }); clearSuggestion(a.id) }}>
                                {t('fee_apply', { v: money(sg.mid) })}
                              </button>
                            </div>
                          )
                        })()}
                      </td>
                      <td>
                        <div className="edit-actions nowrap">
                          <button className="btn primary small" onClick={save}>{t('save')}</button>
                          <button className="btn small" onClick={cancel}>{t('cancel')}</button>
                          {!draft.isNew && <button className="icon danger" onClick={() => removeActor(a.id)} title={t('remove')}>🗑</button>}
                        </div>
                      </td>
                    </tr>
                  )
                }

                return (
                  <tr key={a.id}>
                    <td>
                      <div className="person">
                        {a.photo ? <img className="avatar" src={a.photo} alt="" /> : <span className="avatar avatar-empty">🎭</span>}
                        <span>
                          <strong>{a.name || t('unnamed')}</strong>
                          {a.tmdbId && (
                            <a className="tmdb-link" href={`https://www.themoviedb.org/person/${a.tmdbId}`} target="_blank" rel="noreferrer" title={t('view_tmdb')}>↗</a>
                          )}
                        </span>
                      </div>
                    </td>
                    <td>{charName(a.characterId) || <span className="muted">—</span>}</td>
                    <td>{money(a.fee)}</td>
                    <td><button className="btn small" onClick={() => editActor(a)}>{t('edit')}</button></td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr><td colSpan={2}>{t('cast_total')}</td><td colSpan={2}><strong>{money(total)}</strong></td></tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}
