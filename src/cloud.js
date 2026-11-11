// Comunicação com a API /api/data (MongoDB)

const PW_KEY = 'cinesim:password'
const MAX_BATCH_BYTES = 3_000_000 // o Vercel aceita requisições de até ~4,5 MB

export const getPassword = () => {
  try { return localStorage.getItem(PW_KEY) || '' } catch { return '' }
}
export const savePassword = (pw) => {
  try { localStorage.setItem(PW_KEY, pw) } catch { /* sem armazenamento: vale só nesta sessão */ }
}

// kind: 'unavailable' (sem API/banco configurado) | 'auth' | 'network' | 'server'
export class CloudError extends Error {
  constructor(kind, detail = '') {
    super(kind)
    this.kind = kind
    this.detail = detail // ex.: 'db_auth', 'db_unreachable', 'timeout'
  }
}

async function call(method, query = '', body) {
  let res
  try {
    res = await fetch('/api/data' + query, {
      method,
      headers: { 'Content-Type': 'application/json', 'x-app-password': getPassword() },
      body: body ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new CloudError('network')
  }
  if (res.status === 401) throw new CloudError('auth')
  if (res.status === 404 || res.status === 503) throw new CloudError('unavailable')
  if (res.status === 504 || res.status === 502) throw new CloudError('server', 'timeout')
  // Sem a API, o servidor devolve o index.html em vez de JSON
  if (!(res.headers.get('content-type') || '').includes('application/json')) throw new CloudError('unavailable')
  if (!res.ok) {
    let detail = res.status === 504 ? 'timeout' : ''
    try { detail = (await res.json()).error || detail } catch { /* resposta sem JSON */ }
    throw new CloudError('server', detail)
  }
  return res.json()
}

// Baixa tudo (filmes vêm em páginas)
export async function pullAll() {
  let universes = []
  const films = []
  let after = ''
  do {
    const data = await call('GET', after ? `?after=${encodeURIComponent(after)}` : '')
    if (data.universes) universes = data.universes
    films.push(...data.films)
    after = data.next || ''
  } while (after)
  return { universes, films }
}

// Envia mudanças em lotes que cabem no limite de tamanho
export async function pushChanges(changes) {
  const items = []
  for (const name of ['universes', 'films']) {
    changes[name].upserts.forEach((doc) => items.push({ name, kind: 'upserts', value: doc, size: JSON.stringify(doc).length }))
    changes[name].deletes.forEach((id) => items.push({ name, kind: 'deletes', value: id, size: id.length + 4 }))
  }
  if (!items.length) return

  const empty = () => ({ upserts: { universes: [], films: [] }, deletes: { universes: [], films: [] } })
  let batch = empty()
  let bytes = 0
  for (const it of items) {
    if (bytes > 0 && bytes + it.size > MAX_BATCH_BYTES) {
      await call('POST', '', batch)
      batch = empty()
      bytes = 0
    }
    batch[it.kind][it.name].push(it.value)
    bytes += it.size
  }
  await call('POST', '', batch)
}
