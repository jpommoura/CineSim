import { useI18n } from '../i18n.jsx'

// Peças compartilhadas entre a lista inicial e a lista de obras do universo

// Busca com X pra limpar (Esc também limpa)
export function SearchBox({ value, onChange }) {
  const { t } = useI18n()
  return (
    <div className="search-box">
      <input
        placeholder={t('search_ph')}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Escape') onChange('') }}
      />
      {value && (
        <button type="button" className="search-clear" onClick={() => onChange('')} title={t('search_clear')} aria-label={t('search_clear')}>✕</button>
      )}
    </div>
  )
}

export const KINDS = ['film', 'series', 'season']

// Checks amarelos: Filmes, Séries, Temporadas
export function KindChecks({ kinds, onToggle }) {
  const { t } = useI18n()
  return (
    <div className="kind-checks" role="group" aria-label={t('kind_label')}>
      {KINDS.map((k) => {
        const on = kinds.includes(k)
        return (
          <div
            key={k}
            className="check-row"
            role="checkbox"
            aria-checked={on}
            tabIndex={0}
            onClick={() => onToggle(k)}
            onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); onToggle(k) } }}
          >
            <span className={`check-box ${on ? 'on' : ''}`} aria-hidden>{on ? '✓' : ''}</span>
            <span>{t(`filter_check_${k}`)}</span>
          </div>
        )
      })}
    </div>
  )
}
