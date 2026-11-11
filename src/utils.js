import { useEffect, useState } from 'react'

export const uid = () =>
  (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now())

export const MAX_TAGS = 5

export const formatBRL = (v, lang = 'pt-BR') =>
  new Intl.NumberFormat(lang === 'en' ? 'en-US' : 'pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v) || 0)

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

export const newFilm = ({ title, budget, universeId }) => ({
  id: uid(),
  title,
  synopsis: '',
  description: '',
  universeId: universeId || null,
  tags: [],
  budget, // null = função de orçamento desligada
  acts: [],
  characters: [],
  actors: [],
  createdAt: Date.now(),
})

// Papéis dos personagens (guardados como chave; aceita valores antigos em português)
export const ROLES = ['protagonist', 'antagonist', 'main', 'supporting', 'extra']
const LEGACY_ROLES = { Protagonista: 'protagonist', Antagonista: 'antagonist', Principal: 'main', Coadjuvante: 'supporting', Figurante: 'extra' }
export const normalizeRole = (r) => LEGACY_ROLES[r] || (ROLES.includes(r) ? r : 'main')
