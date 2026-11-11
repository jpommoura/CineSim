// Integração com a API do TMDB (https://developer.themoviedb.org)
// Coloque sua chave no arquivo .env (veja .env.example)

const BASE = 'https://api.themoviedb.org/3'
export const IMG = (path, size = 'w185') => (path ? `https://image.tmdb.org/t/p/${size}${path}` : null)

const KEY = import.meta.env.VITE_TMDB_KEY?.trim()
export const tmdbEnabled = Boolean(KEY)

// Aceita tanto o "API Read Access Token" (v4, começa com eyJ) quanto a "API Key" (v3)
// Erros são lançados com uma chave de tradução (ver i18n.jsx)
const fail = (key, vars) => Object.assign(new Error(key), { i18nKey: key, vars })

async function request(path, params = {}, signal) {
  if (!KEY) throw fail('tmdb_no_key')
  const url = new URL(BASE + path)
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  const headers = { accept: 'application/json' }
  if (KEY.startsWith('eyJ')) headers.Authorization = `Bearer ${KEY}`
  else url.searchParams.set('api_key', KEY)

  const res = await fetch(url, { headers, signal })
  if (res.status === 401) throw fail('tmdb_invalid')
  if (res.status === 429) throw fail('tmdb_rate')
  if (!res.ok) throw fail('tmdb_error', { status: res.status })
  return res.json()
}

// Busca pessoas (atores/atrizes) pelo nome
export async function searchPeople(query, signal, lang = 'en') {
  const language = lang === 'en' ? 'en-US' : 'pt-BR'
  const data = await request('/search/person', { query, include_adult: 'false', language }, signal)
  return data.results
    .filter((p) => p.known_for_department === 'Acting' || !p.known_for_department)
    .slice(0, 8)
    .map((p) => ({
      tmdbId: p.id,
      name: p.name,
      photo: IMG(p.profile_path),
      knownFor: (p.known_for || []).map((k) => k.title || k.name).filter(Boolean).slice(0, 3),
    }))
}

// Fama pela carreira: soma os votos dos filmes em que a pessoa atuou,
// com peso maior para papéis de destaque (ordem nos créditos).
// Estável e não depende de a pessoa estar "em alta" no momento.
export async function getCareerScore(id, signal) {
  const data = await request(`/person/${id}/movie_credits`, {}, signal)
  const weight = (order) => (order == null ? 0.3 : order <= 2 ? 1 : order <= 6 ? 0.6 : 0.2)
  const seen = new Set()
  const contributions = (data.cast || [])
    .filter((m) => !seen.has(m.id) && seen.add(m.id))
    .map((m) => (m.vote_count || 0) * weight(m.order))
    .sort((a, b) => b - a)
    .slice(0, 25) // os 25 trabalhos mais relevantes
  return Math.round(contributions.reduce((sum, v) => sum + v, 0))
}
