import { useState } from 'react'
import { useI18n } from '../i18n.jsx'

const ICONS = { connecting: '⟳', saved: '☁', saving: '⟳', offline: '⚠', local: '💾', locked: '🔒', error: '⚠' }

export function SyncStatus({ status, detail, onClick }) {
  const { t } = useI18n()
  const titleKey = { saved: 'sync_saved_title', offline: 'sync_offline_title', local: 'sync_local_title', error: 'sync_error_title', locked: 'sync_locked_title' }[status]
  const clickable = ['offline', 'error', 'locked'].includes(status)
  return (
    <button
      type="button"
      className={`sync-pill sync-${status}`}
      onClick={clickable ? onClick : undefined}
      title={status === 'error' && detail ? `${t(`sync_err_${detail}`)} ${t('sync_error_title')}` : titleKey ? t(titleKey) : undefined}
      aria-live="polite"
    >
      <span className={status === 'saving' || status === 'connecting' ? 'spin' : ''}>{ICONS[status]}</span>
      <span className="sync-label">{t(`sync_${status}`)}</span>
    </button>
  )
}

// Faixa com o motivo do erro (aparece abaixo do topo)
export function SyncErrorBanner({ status, detail, onRetry }) {
  const { t } = useI18n()
  if (status !== 'error') return null
  return (
    <div className="sync-banner">
      <span>⚠ {t(detail ? `sync_err_${detail}` : 'sync_error_title')}</span>
      <button className="btn small" onClick={onRetry}>{t('sync_retry')}</button>
    </div>
  )
}

export function PasswordModal({ error, onSubmit, onOffline }) {
  const { t } = useI18n()
  const [pw, setPw] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    if (!pw) return
    setLoading(true)
    await onSubmit(pw)
    setLoading(false)
  }

  return (
    <div className="modal-backdrop">
      <form className="card modal stack" onSubmit={submit}>
        <h2>🔒 {t('pw_title')}</h2>
        <p className="muted small">{t('pw_desc')}</p>
        <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder={t('pw_ph')} autoFocus autoComplete="current-password" />
        {error && <small className="danger">{t('pw_wrong')}</small>}
        <button className="btn primary" disabled={!pw || loading}>{loading ? '…' : t('pw_submit')}</button>
        <button type="button" className="link small" onClick={onOffline}>{t('pw_offline')}</button>
      </form>
    </div>
  )
}
