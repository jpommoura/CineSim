import { useCallback, useEffect, useRef, useState } from 'react'
import { CloudError, pullAll, pushChanges, savePassword } from './cloud.js'
import { applyPushed, diffLocal, merge } from './sync.js'
import { normalizeFilm, useLocalStorage } from './utils.js'

const PUSH_DELAY = 1200 // ms depois da última edição
const RETRY_DELAY = 15000

// status: 'connecting' | 'saved' | 'saving' | 'offline' | 'local' | 'locked' | 'error'
//  - local:  sem API/banco configurado → funciona só com o armazenamento do navegador
//  - locked: precisa da senha do app
export function useCloudSync({ universes, films, setUniverses, setFilms }) {
  const [status, setStatus] = useState('connecting')
  const [authError, setAuthError] = useState(false)
  const [synced, setSynced] = useLocalStorage('cinesim:synced', { universes: {}, films: {} })

  const statusRef = useRef(status)
  statusRef.current = status
  const ready = useRef(false) // só envia depois da primeira sincronização completa
  const busy = useRef(false)
  const pendingPush = useRef(false)
  const state = useRef({ universes, films, synced })
  state.current = { universes, films, synced }

  const fail = useCallback((e) => {
    const kind = e instanceof CloudError ? e.kind : 'server'
    if (kind === 'auth') { ready.current = false; setStatus('locked') }
    else if (kind === 'unavailable') { ready.current = false; setStatus('local') }
    else if (kind === 'network') setStatus('offline')
    else setStatus('error')
    return kind
  }, [])

  // Baixa da nuvem e junta com o que está neste aparelho
  // Retorna 'ok' ou o tipo do erro
  const pull = useCallback(async () => {
    if (busy.current) return 'busy'
    busy.current = true
    try {
      const cloud = await pullAll()
      const { universes: lu, films: lf, synced: s } = state.current
      const mu = merge(lu, cloud.universes, s.universes)
      const mf = merge(lf.map(normalizeFilm), cloud.films.map(normalizeFilm), s.films)

      setUniverses(mu.result)
      setFilms(mf.result)

      const changes = {
        universes: { upserts: mu.upserts, deletes: mu.deletes },
        films: { upserts: mf.upserts, deletes: mf.deletes },
      }
      if (mu.upserts.length || mu.deletes.length || mf.upserts.length || mf.deletes.length) {
        setStatus('saving')
        await pushChanges(changes)
      }
      setSynced({ universes: mu.synced, films: mf.synced })
      ready.current = true
      setAuthError(false)
      setStatus('saved')
      return 'ok'
    } catch (e) {
      return fail(e)
    } finally {
      busy.current = false
    }
  }, [fail, setFilms, setSynced, setUniverses])

  // Envia o que mudou neste aparelho
  const push = useCallback(async () => {
    if (!ready.current) return
    if (busy.current) { pendingPush.current = true; return }
    busy.current = true
    pendingPush.current = false
    try {
      const { universes: lu, films: lf, synced: s } = state.current
      const du = diffLocal(lu, s.universes)
      const df = diffLocal(lf, s.films)
      if (!du.upserts.length && !du.deletes.length && !df.upserts.length && !df.deletes.length) {
        setStatus('saved')
        return
      }
      setStatus('saving')
      await pushChanges({ universes: du, films: df })
      setSynced((prev) => ({
        universes: applyPushed(prev.universes, du.upserts, du.deletes),
        films: applyPushed(prev.films, df.upserts, df.deletes),
      }))
      setStatus('saved')
    } catch (e) {
      if (fail(e) === 'network' || e?.kind === 'server') setTimeout(() => push(), RETRY_DELAY)
    } finally {
      busy.current = false
      if (pendingPush.current) setTimeout(() => push(), 0)
    }
  }, [fail, setSynced])

  // Primeira sincronização
  useEffect(() => { pull() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Envio automático depois de cada edição
  useEffect(() => {
    if (!ready.current) return
    const t = setTimeout(push, PUSH_DELAY)
    return () => clearTimeout(t)
  }, [universes, films, push])

  // Ao voltar pra aba/app (ex.: abriu no celular depois de editar no PC), puxa as novidades
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible' && !['local', 'locked'].includes(statusRef.current)) pull()
    }
    const onOnline = () => pull()
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('online', onOnline)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('online', onOnline)
    }
  }, [pull])

  const unlock = useCallback(async (password) => {
    savePassword(password)
    setStatus('connecting')
    const result = await pull()
    setAuthError(result === 'auth')
  }, [pull])

  const goOffline = useCallback(() => { ready.current = false; setStatus('local') }, [])

  return { status, authError, retry: pull, unlock, goOffline }
}
