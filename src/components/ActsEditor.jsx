import { useState } from 'react'
import { uid } from '../utils.js'
import { useI18n } from '../i18n.jsx'

export default function ActsEditor({ film, onChange }) {
  const { t } = useI18n()
  const [openActs, setOpenActs] = useState(() => new Set(film.acts.map((a) => a.id)))

  const setActs = (fn) => onChange((f) => ({ ...f, acts: fn(f.acts) }))

  const addAct = () => {
    const id = uid()
    setActs((acts) => [...acts, { id, title: t('act_default', { n: acts.length + 1 }), summary: '', scenes: [] }])
    setOpenActs((s) => new Set(s).add(id))
  }
  const updateAct = (id, patch) => setActs((acts) => acts.map((a) => (a.id === id ? { ...a, ...patch } : a)))
  const removeAct = (id) => {
    if (window.confirm(t('act_delete_confirm'))) setActs((acts) => acts.filter((a) => a.id !== id))
  }
  const moveAct = (idx, dir) =>
    setActs((acts) => {
      const next = [...acts]
      const j = idx + dir
      if (j < 0 || j >= next.length) return acts
      ;[next[idx], next[j]] = [next[j], next[idx]]
      return next
    })

  const setScenes = (actId, fn) =>
    setActs((acts) => acts.map((a) => (a.id === actId ? { ...a, scenes: fn(a.scenes) } : a)))
  const addScene = (actId) =>
    setScenes(actId, (sc) => [...sc, { id: uid(), title: t('scene_default', { n: sc.length + 1 }), location: '', description: '', characterIds: [] }])
  const updateScene = (actId, sceneId, patch) =>
    setScenes(actId, (sc) => sc.map((s) => (s.id === sceneId ? { ...s, ...patch } : s)))
  const removeScene = (actId, sceneId) => setScenes(actId, (sc) => sc.filter((s) => s.id !== sceneId))

  const toggle = (id) =>
    setOpenActs((s) => {
      const n = new Set(s)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })

  return (
    <div className="stack">
      {film.acts.length === 0 && (
        <div className="empty">
          <p>{t('acts_empty')}</p>
          <p className="muted">{t('acts_empty_sub')}</p>
        </div>
      )}

      {film.acts.map((act, idx) => (
        <div key={act.id} className="card act">
          <div className="act-head">
            <button className="icon" onClick={() => toggle(act.id)}>{openActs.has(act.id) ? '▾' : '▸'}</button>
            <input className="act-title" value={act.title} onChange={(e) => updateAct(act.id, { title: e.target.value })} />
            <span className="muted small">{t('act_scenes', { n: act.scenes.length })}</span>
            <button className="icon" onClick={() => moveAct(idx, -1)} disabled={idx === 0} title={t('act_up')}>↑</button>
            <button className="icon" onClick={() => moveAct(idx, 1)} disabled={idx === film.acts.length - 1} title={t('act_down')}>↓</button>
            <button className="icon danger" onClick={() => removeAct(act.id)} title={t('act_delete')}>🗑</button>
          </div>

          {openActs.has(act.id) && (
            <div className="act-body">
              <textarea rows={2} value={act.summary} onChange={(e) => updateAct(act.id, { summary: e.target.value })} placeholder={t('act_summary_ph')} />

              {act.scenes.map((scene, sIdx) => (
                <div key={scene.id} className="scene">
                  <div className="scene-head">
                    <span className="scene-num">{sIdx + 1}</span>
                    <input value={scene.title} onChange={(e) => updateScene(act.id, scene.id, { title: e.target.value })} placeholder={t('scene_title_ph')} />
                    <input value={scene.location} onChange={(e) => updateScene(act.id, scene.id, { location: e.target.value })} placeholder={t('scene_location_ph')} />
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
              ))}

              <button className="btn ghost" onClick={() => addScene(act.id)}>{t('scene_add')}</button>
            </div>
          )}
        </div>
      ))}

      <button className="btn primary self-start" onClick={addAct}>{t('act_add')}</button>
    </div>
  )
}
