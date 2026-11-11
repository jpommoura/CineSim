// API do CineSim — roda como função serverless no Vercel (e no `npm run dev` via plugin do Vite).
//
//   GET  /api/data[?after=<id>]  → { universes?, films, next }   (filmes paginados por tamanho)
//   POST /api/data               → { upserts: { films, universes }, deletes: { films, universes } }
//
// Variáveis de ambiente (nunca vão pro navegador):
//   MONGODB_URI   connection string do MongoDB Atlas
//   APP_PASSWORD  senha do app (enviada pelo navegador no header x-app-password)
//   MONGODB_DB    nome do banco (opcional, padrão "cinesim")

import { MongoClient } from 'mongodb'
import { timingSafeEqual } from 'node:crypto'

const MAX_PAGE_BYTES = 3_500_000 // o Vercel limita respostas e requisições a ~4,5 MB
const COLLECTIONS = ['universes', 'films']

/* ---------- Conexão (reaproveitada entre chamadas) ---------- */
let clientPromise = null

async function getDb() {
  if (!clientPromise) {
    // Timeout curto: o Vercel encerra a função em ~10 s, então é melhor falhar antes com um erro claro
    clientPromise = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 6000 }).connect().catch((e) => {
      clientPromise = null // permite tentar de novo na próxima chamada
      throw e
    })
  }
  const client = await clientPromise
  return client.db(process.env.MONGODB_DB || 'cinesim')
}

/* ---------- Utilidades HTTP ---------- */
function send(res, status, data) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  res.end(JSON.stringify(data))
}

async function readBody(req) {
  if (req.body !== undefined) return typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  const text = Buffer.concat(chunks).toString('utf8')
  return text ? JSON.parse(text) : {}
}

function passwordOk(given) {
  const a = Buffer.from(String(given || ''))
  const b = Buffer.from(String(process.env.APP_PASSWORD || ''))
  return a.length === b.length && timingSafeEqual(a, b)
}

// Traduz erros do MongoDB em códigos simples (sem expor detalhes sensíveis)
function classify(e) {
  const msg = String(e?.message || '')
  if (e?.code === 18 || /auth(entication)? failed|bad auth/i.test(msg)) return 'db_auth'
  if (e?.syscall === 'querySrv' || /querySrv/i.test(msg)) return 'db_dns'
  if (e?.name === 'MongoServerSelectionError' || /ENOTFOUND|ETIMEDOUT|ECONNREFUSED|timed out|whitelist|IP address/i.test(msg)) return 'db_unreachable'
  if (e?.name === 'MongoParseError' || /Invalid scheme|URI/i.test(msg)) return 'db_uri'
  return 'server_error'
}

const fromDb = ({ _id, ...doc }) => ({ ...doc, id: doc.id ?? _id })
const isId = (x) => typeof x === 'string' && x.length > 0 && x.length < 200

/* ---------- Lógica (separada da conexão pra poder testar) ---------- */
export async function handle(req, res, db) {
  if (req.method === 'GET') {
    const after = new URL(req.url, 'http://localhost').searchParams.get('after')
    const out = { films: [], next: null }
    if (!after) out.universes = (await db.collection('universes').find({}).toArray()).map(fromDb)

    // Filmes em ordem de _id, cortando a página quando passa do limite de tamanho
    const cursor = db.collection('films').find(after ? { _id: { $gt: after } } : {}).sort({ _id: 1 })
    let bytes = 0
    for await (const doc of cursor) {
      const size = JSON.stringify(doc).length
      if (out.films.length > 0 && bytes + size > MAX_PAGE_BYTES) {
        out.next = out.films[out.films.length - 1].id
        break
      }
      out.films.push(fromDb(doc))
      bytes += size
    }
    return send(res, 200, out)
  }

  if (req.method === 'POST') {
    let body
    try { body = await readBody(req) } catch { return send(res, 400, { error: 'invalid_json' }) }

    for (const name of COLLECTIONS) {
      const upserts = (body.upserts?.[name] || []).filter((d) => d && isId(d.id))
      const deletes = (body.deletes?.[name] || []).filter(isId)
      const ops = [
        ...upserts.map((doc) => ({ replaceOne: { filter: { _id: doc.id }, replacement: { ...doc, _id: doc.id }, upsert: true } })),
        ...deletes.map((id) => ({ deleteOne: { filter: { _id: id } } })),
      ]
      if (ops.length) await db.collection(name).bulkWrite(ops, { ordered: false })
    }
    return send(res, 200, { ok: true })
  }

  res.setHeader('Allow', 'GET, POST')
  return send(res, 405, { error: 'method_not_allowed' })
}

export default async function handler(req, res) {
  if (!process.env.MONGODB_URI || !process.env.APP_PASSWORD) {
    return send(res, 503, { error: 'not_configured' })
  }
  if (!passwordOk(req.headers['x-app-password'])) {
    return send(res, 401, { error: 'unauthorized' })
  }
  try {
    return await handle(req, res, await getDb())
  } catch (e) {
    console.error('[cinesim api]', e)
    return send(res, 500, { error: classify(e) })
  }
}
