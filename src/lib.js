export const ts = x => {
  x = String(x).trim()
  if (x.includes(':')) { const a = x.split(':'); return (parseFloat(a[0]) || 0) * 60 + (parseFloat(a[1]) || 0) }
  return parseFloat(x) || 0
}
export const fmt = x => { x = Math.max(0, x); const m = Math.floor(x / 60), r = Math.floor(x % 60); return m + ':' + (r < 10 ? '0' : '') + r }
export const fmtd = x => { const m = Math.floor(x / 60), r = x - m * 60, q = r.toFixed(1).replace(/\.0$/, ''); return m + ':' + (r < 10 ? '0' : '') + q }
export const cl = x => Math.max(0, Math.min(1, x))
export const N = (v, d) => { const n = parseFloat(v); return isNaN(n) ? d : n }

export const DEF = {
  mbo: true, mbs: 20, mbn: 6.2, cbo: true, cbp: 'tl', cbs: 9, cbn: 3.2,
  blo: true, bls: 6.5, bnn: 2.1, blt: 3,
  lgs: 7.6, lgo: 100, lgx: 93.9, lgy: 90.8, lgc: true,
  nxo: true, nxs: 4.2, nxx: 93.9, nxy: 90.8, nxbo: true, nxb: '#87ceeb', hbs: '0.22', nxText: 'Next',
  ncf: '#ffffff', nco: '#2a1646',
  seq: 'mid:3,main:15,mid:5,main:15', trt: 'fade', trd: 0.6, bgb: true,
  hold: 3, nm: 'auto', nfix: '1', nst: 1, rep: 3,
  font: 'Lora,Georgia,serif', col: '#2a1646', key: false, rs: '1280x720', ttl: 'Your Exercise Name',
}

export function G(S) {
  return {
    mbo: S.mbo, mbs: N(S.mbs, 20), mbn: N(S.mbn, 6.2), cbo: S.cbo, cbp: S.cbp, cbs: N(S.cbs, 9), cbn: N(S.cbn, 3.2),
    blo: S.blo, bls: N(S.bls, 6.5), blt: N(S.blt, 3), bnn: N(S.bnn, 2.1),
    lgs: N(S.lgs, 7.6), lgo: N(S.lgo, 100) / 100, lgx: N(S.lgx, 93.9), lgy: N(S.lgy, 90.8),
    nxx: N(S.nxx, 93.9), nxy: N(S.nxy, 90.8), nxo: S.nxo, nxbo: S.nxbo, nxb: S.nxb, nxs: N(S.nxs, 4.2), hbs: N(S.hbs, 0.22),
    ncf: S.ncf, nco: S.nco,
  }
}

export function parseSeq(str) {
  let o = [], t = 0
  String(str).split(',').forEach(p => {
    const a = p.split(':'), k = (a[0] || '').trim(), v = parseFloat(a[1])
    if ((k === 'mid' || k === 'main') && v > 0) { o.push({ k, v, a: t, b: t + v }); t += v }
  })
  if (!o.length) { o = [{ k: 'mid', v: 3, a: 0, b: 3 }, { k: 'main', v: 15, a: 3, b: 18 }]; t = 18 }
  return { segs: o, dur: t }
}

export const hb = t => {
  const p = (t % 0.85) / 0.85, g = (c, w) => Math.exp(-Math.pow((p - c) / w, 2))
  return Math.min(1, g(0.08, 0.05) + 0.75 * g(0.28, 0.05))
}

export const ZS = { S: 3, M: 4.5, L: 7 }
export const PY = { top: '10%', center: '50%', bottom: '80%' }
export const PF = { top: 0.1, center: 0.5, bottom: 0.8 }
export const IP = { bg: 'Background (full)', tr: 'Top right', tc: 'Top center', c: 'Center', rm: 'Right middle', lm: 'Left middle', bc: 'Bottom center' }

export const actTexts = (TX, t) => TX.filter(o => o.t.trim() && t >= ts(o.a) && t < ts(o.b))
export const nmIdx = (NM, t) => { for (let i = 0; i < NM.length; i++) { const o = NM[i]; if (o.t.trim() && t >= ts(o.a) && t < ts(o.b)) return i } return -1 }
export const titleAt = (S, NM, t) => { const i = nmIdx(NM, t); return i < 0 ? S.ttl : NM[i].t }
export const nbAt = (NB, t) => { for (const o of NB) if (String(o.v).trim() !== '' && t >= ts(o.a) && t < ts(o.b)) return String(o.v).trim(); return '' }
export function numAt(S, NB, t, rep) {
  const m = S.nm
  if (m === 'hide') return ''
  if (m === 'fixed') return String(S.nfix).trim()
  if (m === 'time') return nbAt(NB, t)
  return String(rep + (parseInt(S.nst, 10) || 1) - 1)
}

export function mstate(m, t, media, S) {
  const a = ts(m.a), b = ts(m.b), ty = S.trt, D = Math.max(0.1, +S.trd || 0.6), h = D / 2
  const o = { on: t >= a && t < b, al: 1, dx: 0, dip: false }
  if (ty === 'cut') return o
  const pv = media.some(q => q !== m && Math.abs(ts(q.b) - a) < 0.3)
  const nx = media.some(q => q !== m && Math.abs(ts(q.a) - b) < 0.3)
  if (ty === 'dip') {
    if (pv && t >= a && t < a + h) { o.al = cl((t - a) / h); o.dip = true }
    if (nx && t >= b - h && t < b) { o.al = Math.min(o.al, cl((b - t) / h)); o.dip = true }
    return o
  }
  o.on = t >= a - (pv ? h : 0) && t < b + (nx ? h : 0)
  if (ty === 'fade') { if (pv) o.al = cl((t - (a - h)) / D) }
  else { if (pv) o.dx += 1 - cl((t - (a - h)) / D); if (nx) o.dx -= cl((t - (b - h)) / D) }
  return o
}

export function isc(m, t) {
  const a = ts(m.a), b = ts(m.b), k = b > a ? Math.min(1, Math.max(0, (t - a) / (b - a))) : 0
  const z = m.zm || 1, q = +m.mz || 0.25
  return m.mo === 'in' ? z * (1 + q * k) : m.mo === 'out' ? z * (1 + q * (1 - k)) : z
}

// Everything the preview and the exporter both need to know about time t
export function model(t, S, segs, NM, NB, TX) {
  let s = segs[segs.length - 1]
  for (let i = 0; i < segs.length; i++) if (t >= segs[i].a && t < segs[i].b) { s = segs[i]; break }
  const e = t - s.a, mid = s.k === 'mid'
  const rep = mid ? 1 : Math.floor(e / Math.max(1, +S.rep || 3)) + 1
  return {
    s, e, mid, rep,
    bigNum: Math.max(0, Math.floor(s.v - e + 0.5)),
    pulse: 1 + 0.04 * Math.sin((e % 1) * Math.PI),
    cornerNum: Math.min(s.v, Math.floor(e + 0.5)),
    pr: Math.min(1, e / s.v),
    num: numAt(S, NB, t, rep),
    title: titleAt(S, NM, t),
    texts: actTexts(TX, t),
    h: hb(t),
    showBL: t >= (+S.hold || 0),
  }
}
