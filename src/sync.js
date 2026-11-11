// Lógica de sincronização (pura, sem rede).
//
// Cada aparelho guarda um "retrato" do que estava na nuvem na última sincronização:
// { [id]: hash }. Comparando local × nuvem × retrato dá pra saber quem mudou o quê
// (merge de 3 vias) sem precisar de data de modificação em cada item.

export function hashOf(obj) {
  const s = JSON.stringify(obj)
  let h = 0x811c9dc5 // FNV-1a 32 bits
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return (h >>> 0).toString(36) + ':' + s.length
}

// Junta a lista local com a da nuvem.
// Retorna a lista final, o que precisa ser enviado pra nuvem e o novo retrato.
export function merge(local, cloud, synced = {}) {
  const L = new Map(local.map((x) => [x.id, x]))
  const C = new Map(cloud.map((x) => [x.id, x]))
  const ids = new Set([...L.keys(), ...C.keys(), ...Object.keys(synced)])
  const keep = new Map()
  const upserts = []
  const deletes = []
  const next = {}

  for (const id of ids) {
    const l = L.get(id)
    const c = C.get(id)
    const s = synced[id]
    const hl = l && hashOf(l)
    const hc = c && hashOf(c)

    if (l && c) {
      if (hl === hc) { keep.set(id, l); next[id] = hl }                       // iguais
      else if (s === hc) { keep.set(id, l); upserts.push(l); next[id] = hl }  // só este aparelho mudou
      else if (s === hl) { keep.set(id, c); next[id] = hc }                   // só a nuvem mudou
      else { keep.set(id, l); upserts.push(l); next[id] = hl }                // os dois mudaram: vale o deste aparelho
    } else if (l) {
      if (s === undefined || s !== hl) { keep.set(id, l); upserts.push(l); next[id] = hl } // novo ou editado aqui
      // senão: foi apagado em outro aparelho → some daqui também
    } else if (c) {
      if (s === undefined || s !== hc) { keep.set(id, c); next[id] = hc }     // novo ou editado em outro aparelho
      else deletes.push(id)                                                    // apagado aqui → apaga na nuvem
    }
  }

  const result = [
    ...local.filter((x) => keep.has(x.id)).map((x) => keep.get(x.id)),
    ...cloud.filter((x) => !L.has(x.id) && keep.has(x.id)),
  ]
  return { result, upserts, deletes, synced: next }
}

// Mudanças locais desde a última sincronização
export function diffLocal(local, synced = {}) {
  const ids = new Set(local.map((x) => x.id))
  const upserts = local.filter((x) => synced[x.id] !== hashOf(x))
  const deletes = Object.keys(synced).filter((id) => !ids.has(id))
  return { upserts, deletes }
}

// Atualiza o retrato depois de um envio bem-sucedido
export function applyPushed(synced = {}, upserts, deletes) {
  const next = { ...synced }
  upserts.forEach((x) => { next[x.id] = hashOf(x) })
  deletes.forEach((id) => { delete next[id] })
  return next
}
