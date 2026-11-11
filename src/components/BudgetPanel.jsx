import { useState } from 'react'
import { castTotal, parseMoney } from '../utils.js'
import { useI18n } from '../i18n.jsx'

export default function BudgetPanel({ film, onChange }) {
  const { t, lang, money } = useI18n()
  const [draft, setDraft] = useState(film.budget ?? '')
  const total = castTotal(film)
  const hasBudget = film.budget !== null

  const save = () => onChange({ budget: parseMoney(draft, lang) })
  const disable = () => { setDraft(''); onChange({ budget: null }) }

  const share = hasBudget && film.budget > 0 ? (total / film.budget) * 100 : 0 // % do orçamento de produção gasto com elenco
  const pct = Math.min(100, share)
  const over = hasBudget && total > film.budget
  const heavy = hasBudget && !over && share > 30
  const ranking = [...film.actors].sort((a, b) => b.fee - a.fee)
  const charName = (id) => film.characters.find((c) => c.id === id)?.name

  return (
    <div className="two-col">
      <div className="card stack">
        <h2>{t('budget_title')}</h2>
        <p className="muted">{hasBudget ? t('budget_on') : t('budget_off')}</p>
        <div className="inline">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={t('budget_ph')}
            inputMode="decimal"
            onKeyDown={(e) => e.key === 'Enter' && save()}
          />
          <button className="btn primary" onClick={save}>{hasBudget ? t('budget_update') : t('budget_enable')}</button>
        </div>
        {hasBudget && <button className="link small self-start" onClick={disable}>{t('budget_disable')}</button>}

        {hasBudget && (
          <>
            <div className="meter has-marks">
              <div className={`meter-fill ${over ? 'over' : heavy ? 'warn' : ''}`} style={{ width: `${pct}%` }} />
              <span className="meter-mark" style={{ left: '15%' }} />
              <span className="meter-mark" style={{ left: '30%' }} />
            </div>
            <div className="kpis">
              <div><span className="muted small">{t('budget_label')}</span><strong>{money(film.budget)}</strong></div>
              <div><span className="muted small">{t('budget_spent', { p: Math.round(share) })}</span><strong>{money(total)}</strong></div>
              <div>
                <span className="muted small">{over ? t('budget_over') : t('budget_left')}</span>
                <strong className={over ? 'danger' : 'ok'}>{money(Math.abs(film.budget - total))}</strong>
              </div>
            </div>
            {over && <p className="danger small">{t('budget_warning')}</p>}
            {heavy && <p className="warn-text small">{t('budget_share_warn')}</p>}
            <p className="muted small">{t('budget_share_hint')}</p>
          </>
        )}
      </div>

      <div className="card stack">
        <h2>{t('fees_by_actor')}</h2>
        {ranking.length === 0 ? (
          <p className="muted">{t('fees_empty')}</p>
        ) : (
          ranking.map((a) => {
            const share = total > 0 ? (a.fee / total) * 100 : 0
            const cn = charName(a.characterId)
            return (
              <div key={a.id} className="fee-row">
                <div className="fee-label">
                  <span>{a.name || t('unnamed')}{cn && <span className="muted"> {t('as_character', { name: cn })}</span>}</span>
                  <strong>{money(a.fee)}</strong>
                </div>
                <div className="meter thin"><div className="meter-fill" style={{ width: `${share}%` }} /></div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
