import { useEffect, useState } from 'react'

export const uid = () =>
  (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now())

export const MAX_TAGS = 5

// Valores em dólar (USD); só o formato dos números muda com o idioma
export const formatMoney = (v, lang = 'en') =>
  new Intl.NumberFormat(lang === 'en' ? 'en-US' : 'pt-BR', { style: 'currency', currency: 'USD' }).format(Number(v) || 0)

// Converte "1.500.000,50" (pt-BR) ou "1,500,000.50" (en) em número; vazio => null
export const parseMoney = (str, lang = 'pt-BR') => {
  if (str === null || str === undefined) return null
  const s = String(str).trim()
  if (!s) return null
  let normalized
  if (lang === 'en') normalized = s.replace(/,/g, '')
  else if (s.includes(',')) normalized = s.replace(/\./g, '').replace(',', '.')
  else if (/^\D*\d{1,3}(\.\d{3})+$/.test(s)) normalized = s.replace(/\./g, '') // "2.500.000"
  else normalized = s
  const n = Number(normalized.replace(/[^\d.-]/g, ''))
  return Number.isFinite(n) ? n : null
}

export const castTotal = (film) =>
  film.actors.reduce((sum, a) => sum + (Number(a.fee) || 0), 0)

// Reduz a imagem para não estourar o localStorage
export const resizeImage = (file, max = 320) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = reject
    reader.onload = () => {
      const img = new Image()
      img.onerror = reject
      img.onload = () => {
        const scale = Math.min(1, max / Math.max(img.width, img.height))
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(img.width * scale)
        canvas.height = Math.round(img.height * scale)
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/jpeg', 0.82))
      }
      img.src = reader.result
    }
    reader.readAsDataURL(file)
  })

export function useLocalStorage(key, initial) {
  const [value, setValue] = useState(() => {
    try {
      const raw = localStorage.getItem(key)
      return raw ? JSON.parse(raw) : initial
    } catch {
      return initial
    }
  })
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch (e) {
      console.warn('Não foi possível salvar no localStorage', e)
    }
  }, [key, value])
  return [value, setValue]
}

// kind: 'film' | 'series'. Filmes usam `acts`; séries usam `episodes` (cada um com seus atos).
export const newFilm = ({ title, budget, universeId, kind = 'film' }) => ({
  id: uid(),
  kind,
  title,
  synopsis: '',
  description: '',
  universeId: universeId || null,
  tags: [],
  budget, // orçamento de produção (sem marketing); null = função de orçamento desligada
  poster: null,
  runtime: null,
  releaseYear: null,
  storyOrder: null,
  acts: [],
  episodes: [],
  characters: [],
  actors: [],
  createdAt: Date.now(),
})

export const newEpisode = ({ season = 1, number = 1, title = '' }) => ({
  id: uid(),
  season,
  number,
  title,
  synopsis: '',
  runtime: null,
  acts: [],
})

// Papéis dos personagens (guardados como chave; aceita valores antigos em português)
export const ROLES = ['protagonist', 'antagonist', 'main', 'supporting', 'extra']
const LEGACY_ROLES = { Protagonista: 'protagonist', Antagonista: 'antagonist', Principal: 'main', Coadjuvante: 'supporting', Figurante: 'extra' }
export const normalizeRole = (r) => LEGACY_ROLES[r] || (ROLES.includes(r) ? r : 'main')

// Garante que filmes antigos ou importados tenham todos os campos
const normalizeActs = (acts) =>
  (acts || []).map((a) => ({
    summary: '',
    ...a,
    scenes: (a.scenes || []).map((s) => ({ location: '', description: '', characterIds: [], duration: null, ...s })),
  }))

export const normalizeFilm = (f) => ({
  kind: 'film',
  synopsis: '',
  description: '',
  universeId: null,
  tags: [],
  budget: null,
  poster: null,
  runtime: null,
  releaseYear: null,
  storyOrder: null,
  characters: [],
  actors: [],
  createdAt: Date.now(),
  ...f,
  acts: normalizeActs(f.acts),
  episodes: (f.episodes || []).map((e) => ({ season: 1, number: 1, title: '', synopsis: '', runtime: null, ...e, acts: normalizeActs(e.acts) })),
})

export const isSeries = (f) => f.kind === 'series'

// Episódios em ordem (temporada, número)
export const sortedEpisodes = (f) =>
  [...(f.episodes || [])].sort((a, b) => a.season - b.season || a.number - b.number)

// Contagens que valem pra filme e série
export const filmCounts = (f) => {
  const allActs = isSeries(f) ? (f.episodes || []).flatMap((e) => e.acts) : f.acts
  return {
    acts: allActs.length,
    scenes: allActs.reduce((n, a) => n + a.scenes.length, 0),
    episodes: (f.episodes || []).length,
    seasons: new Set((f.episodes || []).map((e) => e.season)).size,
  }
}

/* ---------- Backup (exportar / importar) ---------- */
export const buildBackup = (universes, films) => ({
  app: 'cinesim',
  version: 1,
  exportedAt: new Date().toISOString(),
  universes,
  films,
})

export const downloadJSON = (data, filename) => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = Object.assign(document.createElement('a'), { href: url, download: filename })
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

// Retorna { universes, films } ou null se o arquivo for inválido
export const parseBackup = (text) => {
  let data
  try { data = JSON.parse(text) } catch { return null }
  if (!data || !Array.isArray(data.films) || !Array.isArray(data.universes)) return null
  const okFilm = (f) => f && typeof f.id === 'string' && typeof f.title === 'string'
  const okUni = (u) => u && typeof u.id === 'string' && typeof u.name === 'string'
  if (!data.films.every(okFilm) || !data.universes.every(okUni)) return null
  return {
    universes: data.universes.map((u) => ({ description: '', ...u })),
    films: data.films.map(normalizeFilm),
  }
}

// Mescla por id (o que vem do backup substitui itens com o mesmo id)
export const mergeById = (current, incoming) => {
  const map = new Map(current.map((x) => [x.id, x]))
  incoming.forEach((x) => map.set(x.id, x))
  return [...map.values()]
}

/* ---------- Sugestão de cachê ---------- */
// Modelo em 3 camadas (valores em USD — ajuste à vontade):
//
//   cachê = piso do papel + adicional de fama        (limitado pelo orçamento)
//
// 1) PAPEL → define a categoria e o piso (pesa mais pra ator desconhecido).
//    Pisos inspirados no mínimo sindical × semanas de filmagem típicas.
// 2) FAMA → é o maior multiplicador: um adicional por cima do piso (pesa mais pra ator estabelecido).
//    O papel muda pouco esse adicional — um coadjuvante muito famoso também ganha milhões.
// 3) ORÇAMENTO → contexto e teto: ajusta o tamanho do adicional (cresce devagar)
//    e nenhum cachê passa de 25% do orçamento de produção.

// Piso por papel (filme de porte médio, US$ 50 mi)
const ROLE_FLOOR = { protagonist: 150_000, antagonist: 120_000, main: 80_000, supporting: 40_000, extra: 2_000 }
// Quanto do adicional de fama cada papel leva (diferença pequena)
const ROLE_PREMIUM = { protagonist: 1, antagonist: 0.9, main: 0.75, supporting: 0.5, extra: 0.1 }

// Adicional de fama (protagonista, filme de US$ 50 mi). Pontuação calculada em tmdb.js
const FAME = [
  { key: 'star', min: 250_000, premium: 10_000_000 },
  { key: 'high', min: 40_000, premium: 1_200_000 },
  { key: 'medium', min: 8_000, premium: 500_000 },
  { key: 'low', min: 0, premium: 100_000 },
]
const FAME_UNKNOWN = { key: 'unknown', premium: 0 } // ator fictício / sem dados no TMDB

export const REFERENCE_BUDGET = 50_000_000 // filme de porte médio
const SIZE_EXPONENT = 0.3 // quão forte o orçamento influencia (0 = nada, 1 = proporcional)
const SIZE_MIN = 0.25
const SIZE_MAX = 1.5
const MAX_SHARE_OF_BUDGET = 0.25 // teto de um único cachê

export const fameTier = (careerScore) =>
  careerScore == null ? FAME_UNKNOWN : FAME.find((f) => careerScore >= f.min)

export const sizeFactor = (productionBudget) => {
  if (productionBudget == null || productionBudget <= 0) return 1
  const f = Math.pow(productionBudget / REFERENCE_BUDGET, SIZE_EXPONENT)
  return Math.min(SIZE_MAX, Math.max(SIZE_MIN, f))
}

const roundNice = (v) => {
  const step = v >= 10_000_000 ? 250_000 : v >= 1_000_000 ? 50_000 : v >= 100_000 ? 10_000 : v >= 10_000 ? 1_000 : 100
  return Math.max(step, Math.round(v / step) * step)
}

export const suggestFee = (role, careerScore, productionBudget) => {
  const r = normalizeRole(role)
  const fame = fameTier(careerScore)
  const size = sizeFactor(productionBudget)
  const floor = ROLE_FLOOR[r] * size
  const premium = fame.premium * ROLE_PREMIUM[r] * size
  let mid = floor + premium
  const cap = productionBudget > 0 ? productionBudget * MAX_SHARE_OF_BUDGET : Infinity
  const capped = mid > cap
  if (capped) mid = cap
  return {
    capped,
    role: r,
    fame: fame.key,
    score: careerScore,
    size: Math.round(size * 100) / 100,
    hasBudget: productionBudget != null && productionBudget > 0,
    floor: roundNice(floor),
    premium: premium > 0 ? roundNice(premium) : 0,
    mid: roundNice(mid),
    min: roundNice(mid * 0.8),
    max: roundNice(mid * 1.2),
  }
}

/* ---------- Duração ---------- */
export const sceneMinutes = (film) =>
  film.acts.reduce((sum, a) => sum + a.scenes.reduce((s, sc) => s + (Number(sc.duration) || 0), 0), 0)

/* ---------- Ordenação de filmes ---------- */
const byNum = (key) => (a, b) => {
  const x = a[key], y = b[key]
  if (x == null && y == null) return a.createdAt - b.createdAt
  if (x == null) return 1
  if (y == null) return -1
  return x - y || a.createdAt - b.createdAt
}

export const SORTS = ['created', 'title', 'release', 'story']

export const sortFilms = (list, mode, lang = 'en') => {
  const arr = [...list]
  if (mode === 'title') return arr.sort((a, b) => a.title.localeCompare(b.title, lang))
  if (mode === 'release') return arr.sort(byNum('releaseYear'))
  if (mode === 'story') return arr.sort(byNum('storyOrder'))
  return arr.sort((a, b) => b.createdAt - a.createdAt)
}

/* ---------- Foto do personagem ---------- */
// Sem foto própria, o personagem usa a foto do ator que o interpreta (vinda do TMDB).
// size: troca o tamanho da imagem do TMDB (w185 → w342) pra ficar nítida em cards maiores.
export const characterPhoto = (film, c, size) => {
  if (c.photo) return { src: c.photo, fromActor: false }
  const actor = film.actors.find((a) => a.characterId === c.id && a.photo)
  if (!actor) return null
  const src = size ? actor.photo.replace(/\/w\d+\//, `/${size}/`) : actor.photo
  return { src, fromActor: true }
}
