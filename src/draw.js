import { ts, hb, mstate, isc, numAt, titleAt, G, ZS, PF, actTexts, N } from './lib.js'

let gc = null, gk = null
function greyImg(IB) {
  if (!IB || !IB.naturalWidth) return IB
  if (gk === IB.src && gc) return gc
  const c = document.createElement('canvas'); c.width = IB.naturalWidth; c.height = IB.naturalHeight
  const x = c.getContext('2d'); x.drawImage(IB, 0, 0)
  const d = x.getImageData(0, 0, c.width, c.height), a = d.data
  for (let i = 0; i < a.length; i += 4) { const g = (a[i] + a[i + 1] + a[i + 2]) / 3, v = 150 + g / 255 * 70; a[i] = a[i + 1] = a[i + 2] = v; a[i + 3] *= 0.9 }
  x.putImageData(d, 0, 0); gc = c; gk = IB.src
  return c
}
function tx(c, str, x, y, font, fill, stroke, lw, al, sc, align) {
  c.save(); c.translate(x, y); c.scale(sc, sc); c.globalAlpha = al; c.font = font
  c.textAlign = align || 'center'; c.textBaseline = 'middle'; c.lineJoin = 'round'
  c.lineWidth = lw; c.strokeStyle = stroke; c.strokeText(str, 0, 0); c.fillStyle = fill; c.fillText(str, 0, 0); c.restore()
}
function rr(c, x, y, w, h, r) {
  c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r)
  c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath()
}
const dims = (m, e) => m.kind === 'video' ? [e.videoWidth, e.videoHeight] : [e.naturalWidth, e.naturalHeight]

function drawTexts(c, W, H, t, R) {
  const u = W / 100
  actTexts(R.TX, t).forEach(o => {
    const sz = ZS[o.z] * u, ln = o.t.split('\n'), y0 = H * PF[o.p] - (ln.length - 1) * sz * 0.6
    ln.forEach((l, i) => tx(c, l, W / 2, y0 + i * sz * 1.2, 'italic 500 ' + sz + 'px ' + R.S.font, R.S.col, '#fff', 0.9 * u * (ZS[o.z] / 4.5), 1, 1))
  })
}

function drawIns(c, W, H, t, bg, R) {
  const u = W / 100, g = 2.5 * u
  R.ins.forEach(m => {
    if ((m.p === 'bg') !== !!bg) return
    if (t < ts(m.a) || t >= ts(m.b)) return
    const e = R.els.get(m.id); if (!e) return
    const vd = m.kind === 'video', [iw, ih] = dims(m, e)
    if (!iw || (vd && e.readyState < 2)) return
    const sc = isc(m, t), FX = (m.fx == null ? 50 : m.fx) / 100, FY = (m.fy == null ? 50 : m.fy) / 100
    if (bg) {
      const r = Math.max(W / iw, H / ih), vw = W / r / sc, vh = H / r / sc, bl = R.S.bgb, k = bl ? 1.06 : 1
      c.save(); if (bl && 'filter' in c) c.filter = 'blur(' + (1.2 * u) + 'px)'
      c.translate(W / 2, H / 2); c.scale(k, k)
      const bw0 = W / r, bh0 = H / r
      c.drawImage(e, (iw - bw0) / 2 + (bw0 - vw) * FX, (ih - bh0) / 2 + (bh0 - vh) * FY, vw, vh, -W / 2, -H / 2, W, H)
      c.restore(); return
    }
    const w = W * m.z / 100, h = w * ih / iw; let x, y
    if (m.p === 'tr') { x = W - w - g; y = g } else if (m.p === 'tc') { x = (W - w) / 2; y = g }
    else if (m.p === 'c') { x = (W - w) / 2; y = (H - h) / 2 } else if (m.p === 'rm') { x = W - w - g; y = (H - h) / 2 }
    else if (m.p === 'lm') { x = g; y = (H - h) / 2 } else { x = (W - w) / 2; y = H - h - g }
    c.save(); c.shadowColor = 'rgba(42,22,70,.35)'; c.shadowBlur = 2 * u; c.shadowOffsetY = 0.6 * u; c.fillStyle = '#000'; rr(c, x, y, w, h, 1.2 * u); c.fill(); c.restore()
    c.save(); rr(c, x, y, w, h, 1.2 * u); c.clip(); c.drawImage(e, iw * (1 - 1 / sc) * FX, ih * (1 - 1 / sc) * FY, iw / sc, ih / sc, x, y, w, h); c.restore()
    c.save(); c.lineWidth = 0.8 * u; c.strokeStyle = '#fff'; rr(c, x, y, w, h, 1.2 * u); c.stroke(); c.restore()
  })
}

export function draw(c, W, H, t, key, R) {
  const { S, segs, IB, IL } = R, g = G(S), u = W / 100
  let s = segs[segs.length - 1]
  for (let i = 0; i < segs.length; i++) if (t >= segs[i].a && t < segs[i].b) { s = segs[i]; break }
  const e = t - s.a, mid = s.k === 'mid', ttl = S.col, fam = S.font
  let rep = mid ? 1 : Math.floor(e / Math.max(1, +S.rep || 3)) + 1
  c.fillStyle = key ? '#00ff00' : '#fff'; c.fillRect(0, 0, W, H)
  if (!key) drawIns(c, W, H, t, true, R)
  if (!key) {
    let ds = false
    const sts = R.media.map(m => { const q = mstate(m, t, R.media, S); if (q.dip) ds = true; return q })
    if (ds) { c.fillStyle = '#000'; c.fillRect(0, 0, W, H) }
    R.media.forEach((m, i) => {
      const q = sts[i]; if (!q.on) return
      const el = R.els.get(m.id); if (!el) return
      const vd = m.kind === 'video', [iw, ih] = dims(m, el)
      if (!iw || (vd && el.readyState < 2)) return
      const r = m.fit === 'cover' ? Math.max(W / iw, H / ih) : Math.min(W / iw, H / ih), w = iw * r, hh = ih * r
      c.globalAlpha = q.al; c.drawImage(el, (W - w) / 2 + q.dx * W, (H - hh) / 2, w, hh); c.globalAlpha = 1
    })
    drawIns(c, W, H, t, false, R)
  }
  const h = hb(t)
  if (mid) {
    if (g.mbo && IB.naturalWidth) {
      const sz = g.mbs * u * (1 + 0.04 * Math.sin((e % 1) * Math.PI))
      c.globalAlpha = 0.95; c.drawImage(IB, W / 2 - sz / 2, H / 2 - sz / 2, sz, sz); c.globalAlpha = 1
      tx(c, String(Math.max(0, Math.floor(s.v - e + 0.5))), W / 2, H / 2, '700 ' + g.mbn * u + 'px Orbitron,monospace', g.ncf, g.nco, 0.6 * u, 1, 1)
    }
  } else if (g.cbo && IB.naturalWidth) {
    const q = g.cbs * u, x0 = g.cbp === 'tr' ? W - q - 1.6 * u : 1.6 * u, y0 = 1.6 * u, pr = Math.min(1, e / s.v)
    c.drawImage(greyImg(IB), x0, y0, q, q)
    c.save(); c.beginPath(); c.rect(x0, y0 + q * (1 - pr), q, q * pr); c.clip(); c.drawImage(IB, x0, y0, q, q); c.restore()
    tx(c, String(Math.min(s.v, Math.floor(e + 0.5))), x0 + q / 2, y0 + q / 2 + 0.4 * u, '700 ' + g.cbn * u + 'px Orbitron,monospace', ttl, '#fff', 0.7 * u, 1, 1)
  }
  const m = g.bls * u, bx = 1.2 * u, by = H - 1.2 * u - m, hd = t < (+S.hold || 0)
  if (!hd && g.blo && IB.naturalWidth) c.drawImage(IB, bx, by, m, m)
  const b = numAt(S, R.NB, t, rep)
  if (b !== '' && !hd && g.blo) tx(c, b, bx + m / 2, by + m / 2, '700 ' + g.bnn * u + 'px Orbitron,monospace', g.ncf, g.nco, 0.5 * u, 1, 1)
  if (!hd) tx(c, titleAt(S, R.NM, t), bx + (g.blo ? m + 1 * u : 0), by + m / 2, 'italic 500 ' + g.blt * u + 'px ' + fam, ttl, '#fff', 0.9 * u, 1, 1, 'left')
  const cx = W * g.lgx / 100, cy = H * g.lgy / 100, ncx = W * g.nxx / 100, ncy = H * g.nxy / 100
  if (mid) {
    if (g.nxo) {
      const nt = S.nxText, nfs = g.nxs * u, nsc = 1 + g.hbs * h, nal = 0.7 + 0.3 * h
      if (g.nxbo && nt) {
        c.save(); c.translate(ncx, ncy); c.scale(nsc, nsc); c.globalAlpha = nal; c.font = 'italic 500 ' + nfs + 'px ' + fam
        const ntw = c.measureText(nt).width, npw = ntw + nfs * 1.1, nph = nfs * 1.7
        c.fillStyle = g.nxb; rr(c, -npw / 2, -nph / 2, npw, nph, nph / 2); c.fill(); c.restore()
      }
      tx(c, nt, ncx, ncy, 'italic 500 ' + nfs + 'px ' + fam, ttl, g.nxbo ? g.nxb : '#fff', 0.9 * u, nal, nsc)
    }
  } else if (S.lgc && IL.naturalWidth) {
    const L = g.lgs * u; c.globalAlpha = g.lgo; c.drawImage(IL, cx - L / 2, cy - L / 2, L, L); c.globalAlpha = 1
  }
  drawTexts(c, W, H, t, R)
}
