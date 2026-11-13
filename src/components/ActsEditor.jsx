import { useState } from 'react'
import { sceneMinutes, uid } from '../utils.js'
import { useI18n } from '../i18n.jsx'
import { useUndo } from '../undo.jsx'

// Arrastar e soltar (HTML5 nativo):
// - segure a alça ⠿ de um ato para reordenar os atos
// - segure a alça ⠿ de uma cena para reordenar ou mover para outro ato
export default function ActsEditor({ film, onChange }) {
  const { t } = useI18n()
  const showUndo = useUndo()
  const [openActs, setOpenActs] = useState(() => new Set(film.acts.map((a) => a.id)))
  const [armed, setArmed] = useState(null) // id do item cuja alça foi pressionada
  const [dragging, setDragging] = useState(null) // { type: 'act' | 'scene', id, actId }
  const [over, setOver] = useState(null) // { type, actId, index }

  const setActs = (fn) => onChange((f) => ({ ...f, acts: fn(f.acts) }))

  /* ---------- Atos ---------- */
  const addAct = () => {
    const id = uid()
    setActs((acts) => [...acts, { id, title: t('act_default', { n: acts.length + 1 }), summary: '', scenes: [] }])
    setOpenActs((s) => new Set(s).add(id))
  }
  const updateAct = (id, patch) => setActs((acts) => acts.map((a) => (a.id === id ? { ...a, ...patch } : a)))
  const removeAct = (id) => {
    if (!window.confirm(t('act_delete_confirm'))) return
    const index = film.acts.findIndex((a) => a.id === id)
    const removed = film.acts[index]
    setActs((acts) => acts.filter((a) => a.id !== id))
    if (removed) {
      showUndo(t('undo_deleted', { name: removed.title || t('unnamed') }), () =>
        setActs((acts) => (acts.some((a) => a.id === id) ? acts : [...acts.slice(0, index), removed, ...acts.slice(index)]))
      )
    }
  }
  const moveActTo = (actId, toIndex) =>
    setActs((acts) => {
      const from = acts.findIndex((a) => a.id === actId)
      if (from < 0) return acts
      const next = [...acts]
      const [item] = next.splice(from, 1)
      next.splice(from < toIndex ? toIndex - 1 : toIndex, 0, item)
      return next
    })

  /* ---------- Cenas ---------- */
  const setScenes = (actId, fn) =>
    setActs((acts) => acts.map((a) => (a.id === actId ? { ...a, scenes: fn(a.scenes) } : a)))
  const addScene = (actId) =>
    setScenes(actId, (sc) => [...sc, { id: uid(), title: t('scene_default', { n: sc.length + 1 }), location: '', description: '', characterIds: [], duration: null }])
  const updateScene = (actId, sceneId, patch) =>
    setScenes(actId, (sc) => sc.map((s) => (s.id === sceneId ? { ...s, ...patch } : s)))
  const removeScene = (actId, sceneId) => {
    if (window.confirm(t('scene_delete_confirm'))) setScenes(actId, (sc) => sc.filter((s) => s.id !== sceneId))
  }

  const moveSceneTo = (fromActId, sceneId, toActId, toIndex) =>
    setActs((acts) => {
      const source = acts.find((a) => a.id === fromActId)
      const fromIndex = source?.scenes.findIndex((s) => s.id === sceneId) ?? -1
      if (fromIndex < 0) return acts
      const scene = source.scenes[fromIndex]
      let index = toIndex
      if (fromActId === toActId && fromIndex < toIndex) index -= 1
      return acts.map((a) => {
        let scenes = a.scenes
        if (a.id === fromActId) scenes = scenes.filter((s) => s.id !== sceneId)
        if (a.id === toActId) scenes = [...scenes.slice(0, index), scene, ...scenes.slice(index)]
        return scenes === a.scenes ? a : { ...a, scenes }
      })
    })

  /* ---------- Drag & drop ---------- */
  const endDrag = () => { setDragging(null); setOver(null); setArmed(null) }
  const isAfter = (e) => {
    const r = e.currentTarget.getBoundingClientRect()
    return e.clientY > r.top + r.height / 2
  }

  const dragStart = (e, payload) => {
    e.stopPropagation()
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', payload.id) // necessário no Firefox
    setDragging(payload)
  }

  const overAct = (e, actIndex) => {
    if (dragging?.type !== 'act') return
    e.preventDefault()
    setOver({ type: 'act', index: actIndex + (isAfter(e) ? 1 : 0) })
  }
  const overScene = (e, actId, sceneIndex) => {
    if (dragging?.type !== 'scene') return
    e.preventDefault()
    e.stopPropagation()
    setOver({ type: 'scene', actId, index: sceneIndex + (isAfter(e) ? 1 : 0) })
  }
  const overActEnd = (e, act) => {
    if (dragging?.type !== 'scene') return
    e.preventDefault()
    e.stopPropagation()
    setOver({ type: 'scene', actId: act.id, index: act.scenes.length })
  }

  const drop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (dragging && over) {
      if (dragging.type === 'act' && over.type === 'act') moveActTo(dragging.id, over.index)
      if (dragging.type === 'scene' && over.type === 'scene') {
        moveSceneTo(dragging.actId, dragging.id, over.actId, over.index)
        setOpenActs((s) => new Set(s).add(over.actId))
      }
    }
    endDrag()
  }

  const toggle = (id) =>
    setOpenActs((s) => {
      const n = new Set(s)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })

  /* ---------- Duração ---------- */
  const mapped = sceneMinutes(film)
  const actMinutes = (act) => act.scenes.reduce((s, sc) => s + (Number(sc.duration) || 0), 0)
  const coverage = film.runtime ? Math.round((mapped / film.runtime) * 100) : null

  const sceneLine = (actId, index) =>
    over?.type === 'scene' && over.actId === actId && over.index === index && <div className="drop-line" />

  return (
    <div className="stack">
      {(mapped > 0 || film.runtime) && (
        <div className="card runtime-strip">
          <span>
            {film.runtime
              ? t('script_coverage', { mapped, runtime: film.runtime, p: coverage })
              : t('script_mapped', { mapped })}
          </span>
          {film.runtime && (
            <div className="meter thin"><div className={`meter-fill ${coverage > 100 ? 'over' : ''}`} style={{ width: `${Math.min(100, coverage)}%` }} /></div>
          )}
          <small className="muted">{t('script_coverage_hint')}</small>
        </div>
      )}

      {film.acts.length === 0 && (
        <div className="empty">
          <p>{t('acts_empty')}</p>
          <p className="muted">{t('acts_empty_sub')}</p>
        </div>
      )}

      {film.acts.map((act, idx) => (
        <div key={act.id}>
          {over?.type === 'act' && over.index === idx && <div className="drop-line" />}
          <div
            className={`card act ${dragging?.id === act.id ? 'is-dragging' : ''}`}
            draggable={armed === act.id}
            onDragStart={(e) => dragStart(e, { type: 'act', id: act.id })}
            onDragEnd={endDrag}
            onDragOver={(e) => overAct(e, idx)}
            onDrop={drop}
          >
            <div className="act-head" onDragOver={(e) => overActEnd(e, act)} onDrop={drop}>
              <span
                className="handle"
                title={t('drag')}
                onMouseDown={() => setArmed(act.id)}
                onMouseUp={() => setArmed(null)}
              >⠿</span>
              <button className="icon" onClick={() => toggle(act.id)}>{openActs.has(act.id) ? '▾' : '▸'}</button>
              <input className="act-title" value={act.title} onChange={(e) => updateAct(act.id, { title: e.target.value })} />
              <span className="muted small nowrap">
                {t('act_scenes', { n: act.scenes.length })}
                {actMinutes(act) > 0 && ` · ${t('act_minutes', { m: actMinutes(act) })}`}
              </span>
              <button className="icon danger" onClick={() => removeAct(act.id)} title={t('act_delete')}>🗑</button>
            </div>

            {openActs.has(act.id) && (
              <div className="act-body">
                <textarea rows={2} value={act.summary} onChange={(e) => updateAct(act.id, { summary: e.target.value })} placeholder={t('act_summary_ph')} />

                {act.scenes.map((scene, sIdx) => (
                  <div key={scene.id}>
                    {sceneLine(act.id, sIdx)}
                    <div
                      className={`scene ${dragging?.id === scene.id ? 'is-dragging' : ''}`}
                      draggable={armed === scene.id}
                      onDragStart={(e) => dragStart(e, { type: 'scene', id: scene.id, actId: act.id })}
                      onDragEnd={endDrag}
                      onDragOver={(e) => overScene(e, act.id, sIdx)}
                      onDrop={drop}
                    >
                      <div className="scene-head">
                        <span
                          className="handle"
                          title={t('drag')}
                          onMouseDown={() => setArmed(scene.id)}
                          onMouseUp={() => setArmed(null)}
                        >⠿</span>
                        <span className="scene-num">{sIdx + 1}</span>
                        <input value={scene.title} onChange={(e) => updateScene(act.id, scene.id, { title: e.target.value })} placeholder={t('scene_title_ph')} />
                        <input value={scene.location} onChange={(e) => updateScene(act.id, scene.id, { location: e.target.value })} placeholder={t('scene_location_ph')} />
                        <label className="minutes" title={t('scene_minutes')}>
                          <input
                            type="number"
                            min="0"
                            value={scene.duration ?? ''}
                            onChange={(e) => updateScene(act.id, scene.id, { duration: e.target.value === '' ? null : Math.max(0, Number(e.target.value)) })}
                            placeholder={t('scene_minutes_ph')}
                          />
                          <span>{t('scene_minutes')}</span>
                        </label>
                        <button className="icon danger" onClick={() => removeScene(act.id, scene.id)} title={t('scene_delete')}>×</button>
                      </div>
                      <textarea rows={3} value={scene.description} onChange={(e) => updateScene(act.id, scene.id, { description: e.target.value })} placeholder={t('scene_desc_ph')} />
                      {film.characters.length > 0 && (
                        <div className="chips">
                          <span className="muted small">{t('scene_in')}</span>
                          {film.characters.map((c) => {
                            const on = scene.characterIds.includes(c.id)
                            return (
                              <button
                                key={c.id}
                                className={`chip ${on ? 'on' : ''}`}
                                onClick={() =>
                                  updateScene(act.id, scene.id, {
                                    characterIds: on ? scene.characterIds.filter((x) => x !== c.id) : [...scene.characterIds, c.id],
                                  })
                                }
                              >
                                {c.name || t('unnamed')}
                              </button>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                <div
                  className={`drop-zone ${dragging?.type === 'scene' ? 'active' : ''} ${over?.type === 'scene' && over.actId === act.id && over.index === act.scenes.length ? 'hover' : ''}`}
                  onDragOver={(e) => overActEnd(e, act)}
                  onDrop={drop}
                >
                  {dragging?.type === 'scene' ? (
                    t('drop_here')
                  ) : (
                    <button className="btn ghost" onClick={() => addScene(act.id)}>{t('scene_add')}</button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      ))}
      {over?.type === 'act' && over.index === film.acts.length && <div className="drop-line" />}

      <button className="btn primary self-start" onClick={addAct}>{t('act_add')}</button>
    </div>
  )
}
