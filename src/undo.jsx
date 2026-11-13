import { createContext, useCallback, useContext, useRef, useState } from 'react'
import { useI18n } from './i18n.jsx'

// "Desfazer" depois de excluir algo.
// Quem exclui chama showUndo(mensagem, restaurar) e uma faixa aparece por alguns segundos.

export const UNDO_MS = 6000

const UndoContext = createContext(() => {})
export const UndoProvider = UndoContext.Provider
export const useUndo = () => useContext(UndoContext)

export function useUndoState() {
  const [toast, setToast] = useState(null) // { id, message, restore }
  const timer = useRef(null)

  const dismiss = useCallback(() => {
    clearTimeout(timer.current)
    setToast(null)
  }, [])

  const showUndo = useCallback((message, restore) => {
    clearTimeout(timer.current)
    const id = Date.now()
    setToast({ id, message, restore })
    timer.current = setTimeout(() => setToast((t) => (t?.id === id ? null : t)), UNDO_MS)
  }, [])

  const undo = useCallback(() => {
    setToast((t) => {
      if (t) setTimeout(t.restore, 0) // restaura fora do setState
      return null
    })
    clearTimeout(timer.current)
  }, [])

  return { toast, showUndo, undo, dismiss }
}

export function UndoToast({ toast, onUndo, onDismiss }) {
  const { t } = useI18n()
  if (!toast) return null
  return (
    <div className="undo-toast" role="status" key={toast.id}>
      <span>{toast.message}</span>
      <button className="btn small primary" onClick={onUndo}>{t('undo')}</button>
      <button className="icon" onClick={onDismiss} aria-label={t('close')}>×</button>
      <span className="undo-bar" style={{ animationDuration: `${UNDO_MS}ms` }} />
    </div>
  )
}
