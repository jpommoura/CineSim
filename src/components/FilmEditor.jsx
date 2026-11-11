import { useState } from 'react'
import TagInput from './TagInput.jsx'
import ActsEditor from './ActsEditor.jsx'
import CastEditor from './CastEditor.jsx'
import BudgetPanel from './BudgetPanel.jsx'
import { useI18n } from '../i18n.jsx'

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
