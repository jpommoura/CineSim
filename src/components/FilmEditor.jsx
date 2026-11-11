import { useState } from 'react'
import TagInput from './TagInput.jsx'
import ActsEditor from './ActsEditor.jsx'
import CastEditor from './CastEditor.jsx'
import BudgetPanel from './BudgetPanel.jsx'
import { useI18n } from '../i18n.jsx'
import { resizeImage } from '../utils.js'

const TABS = [
  { id: 'geral', label: 'tab_general' },
  { id: 'roteiro', label: 'tab_script' },
  { id: 'elenco', label: 'tab_cast' },
  { id: 'orcamento', label: 'tab_budget' },
]

export default function FilmEditor({ film, universes, onChange, onDelete, onBack, onOpenUniverse }) {
  const { t } = useI18n()
  const [tab, setTab] = useState('geral')
  const universe = universes.find((u) => u.id === film.universeId)

  const numOrNull = (v) => (v === '' ? null : Number(v))

  const onPoster = async (file) => {
    if (!file) return
    try {
      onChange({ poster: await resizeImage(file, 600) })
    } catch {
      alert(t('photo_error'))
    }
  }

  const confirmDelete = () => {
    if (window.confirm(t('film_delete_confirm', { title: film.title }))) onDelete()
  }

  return (
    <section>
      <button className="link" onClick={onBack}>{t('back_generic')}</button>

      <div className="page-head">
        <div className="title-wrap">
          {universe ? (
            <button className="eyebrow link" onClick={() => onOpenUniverse(universe.id)} title={t('universe_open')}>
              {t('universe_label')}: {universe.name} →
            </button>
          ) : (
            <span className="eyebrow">{t('film_label')}</span>
          )}
          <input
            className="title-input"
            value={film.title}
            onChange={(e) => onChange({ title: e.target.value })}
            placeholder={t('film_title_input')}
          />
        </div>
        <button className="btn danger-ghost" onClick={confirmDelete}>{t('film_delete')}</button>
      </div>

      <div className="tabs">
        {TABS.map((tb) => (
          <button key={tb.id} className={tab === tb.id ? 'active' : ''} onClick={() => setTab(tb.id)}>
            {t(tb.label)}
          </button>
        ))}
      </div>

      {tab === 'geral' && (
        <div className="two-col">
          <div className="card stack">
            <label>
              {t('synopsis')}
              <textarea rows={4} value={film.synopsis} onChange={(e) => onChange({ synopsis: e.target.value })} placeholder={t('synopsis_ph')} />
            </label>
            <label>
              {t('description')}
              <textarea rows={8} value={film.description} onChange={(e) => onChange({ description: e.target.value })} placeholder={t('description_ph')} />
            </label>
          </div>
          <div className="card stack">
            <div className="poster-field">
              <span className="label">{t('poster')}</span>
              <label className="poster-upload">
                {film.poster ? <img src={film.poster} alt={t('poster')} /> : <span>{t('poster_add')}<br /><small>{t('photo_opt')}</small></span>}
                <input type="file" accept="image/*" hidden onChange={(e) => onPoster(e.target.files[0])} />
              </label>
              {film.poster && (
                <button className="link small" onClick={() => onChange({ poster: null })}>{t('poster_remove')}</button>
              )}
            </div>
            <div className="field-row">
              <label>
                {t('runtime')}
                <input type="number" min="1" value={film.runtime ?? ''} onChange={(e) => onChange({ runtime: numOrNull(e.target.value) })} placeholder={t('runtime_ph')} />
              </label>
              <label>
                {t('release_year')}
                <input type="number" value={film.releaseYear ?? ''} onChange={(e) => onChange({ releaseYear: numOrNull(e.target.value) })} placeholder={t('release_year_ph')} />
              </label>
            </div>
            <label>
              {t('story_order')}
              <input type="number" step="any" value={film.storyOrder ?? ''} onChange={(e) => onChange({ storyOrder: numOrNull(e.target.value) })} placeholder={t('story_order_ph')} />
              <small className="muted">{t('story_order_hint')}</small>
            </label>
            <label>
              {t('universe')}
              <select value={film.universeId || ''} onChange={(e) => onChange({ universeId: e.target.value || null })}>
                <option value="">{t('none_option')}</option>
                {universes.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
              {universes.length === 0 && <small className="muted">{t('universe_hint')}</small>}
            </label>
            <div>
              <span className="label">{t('tags')}</span>
              <TagInput tags={film.tags} onChange={(tags) => onChange({ tags })} />
            </div>
          </div>
        </div>
      )}

      {tab === 'roteiro' && <ActsEditor film={film} onChange={onChange} />}
      {tab === 'elenco' && <CastEditor film={film} onChange={onChange} />}
      {tab === 'orcamento' && <BudgetPanel film={film} onChange={onChange} />}
    </section>
  )
}
