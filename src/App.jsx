import { useState, useRef, useEffect, useLayoutEffect, useMemo, useCallback } from 'react'
import BF0 from './assets/butterfly.png'
import LG0 from './assets/logo.png'
import { DEF, G, ts, fmt, fmtd, parseSeq, mstate, isc, model, nmIdx, ZS, PY, IP } from './lib.js'
import { draw } from './draw.js'

const uid = () => Math.random().toString(36).slice(2, 9)
const SPOTS = [['93.9,90.8', 'Bottom right'], ['6.1,90.8', 'Bottom left'], ['93.9,9.2', 'Top right'], ['6.1,9.2', 'Top left'], ['50,90.8', 'Bottom center'], ['50,9.2', 'Top center'], ['50,50', 'Center']]
const ZSPOTS = [['50,50', 'Center'], ['0,0', 'Top left'], ['50,0', 'Top'], ['100,0', 'Top right'], ['0,50', 'Left'], ['100,50', 'Right'], ['0,100', 'Bottom left'], ['50,100', 'Bottom'], ['100,100', 'Bottom right']]

function Ed({ value, onChange, className, style }) {
  const r = useRef(null)
  useLayoutEffect(() => { const el = r.current; if (el && el.textContent !== value && document.activeElement !== el) el.textContent = value }, [value])
  return <span ref={r} className={className} style={style} contentEditable suppressContentEditableWarning spellCheck={false} onInput={e => onChange(e.currentTarget.textContent)} />
}

function Clip({ m, style, local, on, play, reg, onMeta }) {
  const r = useRef(null)
  const set = el => { r.current = el; reg(m.id, el) }
  useEffect(() => {
    const e = r.current
    if (!e || m.kind !== 'video') return
    if (!on) { if (!e.paused) e.pause(); return }
    const d = e.duration || 1, tg = local % d
    if (Math.abs(e.currentTime - tg) > 0.4) e.currentTime = tg
    if (play && e.paused) e.play().catch(() => {})
    if (!play && !e.paused) e.pause()
  })
  return m.kind === 'video'
    ? <video ref={set} src={m.url} muted playsInline loop preload="auto" style={style} onLoadedMetadata={e => onMeta(m.id, e.currentTarget)} />
    : <img ref={set} src={m.url} alt="" style={style} onLoad={e => onMeta(m.id, e.currentTarget)} />
}

function AudioTrack({ track, time, play, register, sync, onMeta }) {
  const audio = useRef(null)
  const setElement = useCallback(element => {
    audio.current = element
    register(track.id, element)
  }, [register, track.id])
  useEffect(() => { sync(track, audio.current, time, play) })
  return <audio ref={setElement} src={track.url} preload="auto" hidden onLoadedMetadata={e => onMeta(track.id, e.currentTarget.duration)} />
}

function Sec({ id, open, setOpen, title, children }) {
  const o = open === id
  return (
    <div className="sec">
      <button type="button" className="sech" onClick={() => setOpen(o ? '' : id)}><span>{title}</span><span>{o ? '▲' : '▼'}</span></button>
      {o && children}
    </div>
  )
}

function insBox(m, S, bgm) {
  if (bgm) { const bl = S.bgb; return { display: 'block', width: '100%', height: '100%', aspectRatio: 'auto', left: 0, top: 0, border: 'none', borderRadius: 0, boxShadow: 'none', filter: bl ? 'blur(1.2cqw)' : 'none', transform: bl ? 'scale(1.06)' : 'none' } }
  const g = '2.5cqw', o = { display: 'block', height: 'auto', aspectRatio: m.ar || '16/9', width: m.z + '%' }
  if (m.p === 'tr') { o.right = g; o.top = g }
  else if (m.p === 'tc') { o.left = '50%'; o.top = g; o.transform = 'translateX(-50%)' }
  else if (m.p === 'c') { o.left = '50%'; o.top = '50%'; o.transform = 'translate(-50%,-50%)' }
  else if (m.p === 'rm') { o.right = g; o.top = '50%'; o.transform = 'translateY(-50%)' }
  else if (m.p === 'lm') { o.left = g; o.top = '50%'; o.transform = 'translateY(-50%)' }
  else { o.left = '50%'; o.bottom = g; o.transform = 'translateX(-50%)' }
  return o
}

export default function App() {
  const [S, setS] = useState(DEF)
  const [TX, setTX] = useState([{ id: uid(), t: 'Get ready!', a: '0:00', b: '0:03', p: 'bottom', z: 'M' }])
  const [NM, setNM] = useState([{ id: uid(), t: 'Your Exercise Name', a: '0:03', b: '0:18' }, { id: uid(), t: 'Your Exercise Name', a: '0:23', b: '0:38' }])
  const [NB, setNB] = useState([])
  const [media, setMedia] = useState([])
  const [ins, setIns] = useState([])
  const [audioTracks, setAudioTracks] = useState([])
  const [bf, setBf] = useState(BF0)
  const [lg, setLg] = useState(LG0)
  const [el, setEl] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [run, setRun] = useState(0)
  const [rec, setRec] = useState(false)
  const [zoom, setZoom] = useState(100)
  const [menuOpen, setMenuOpen] = useState(false)
  const [secOpen, setSecOpen] = useState('time')
  const sp = { open: secOpen, setOpen: setSecOpen }
  const [msg, setMsg] = useState('Download records the overlay in real time (about the length of the timeline). Keep this tab open and visible. Tick “Green screen” first for a CapCut-ready file (Cutout → Chroma key), or add your videos and photos to get them baked in.')
  const [dlBtn, setDlBtn] = useState('Download video')
  const [saved, setSaved] = useState(null)
  const els = useRef(new Map())
  const audioEls = useRef(new Map())
  const audioGraph = useRef(null)
  const audioNodes = useRef(new Map())
  const IB = useRef(new Image()), IL = useRef(new Image())
  const elRef = useRef(0), durRef = useRef(0), R = useRef({})

  const set = (k, v) => setS(s => ({ ...s, [k]: v }))
  const reg = (id, e) => { if (e) els.current.set(id, e); else els.current.delete(id) }
  const connectAudio = useCallback((id, element) => {
    if (!element || !audioGraph.current || audioNodes.current.has(id)) return
    const { context, destination } = audioGraph.current
    const source = context.createMediaElementSource(element)
    const gain = context.createGain()
    source.connect(gain)
    gain.connect(context.destination)
    gain.connect(destination)
    audioNodes.current.set(id, { element, source, gain })
  }, [])
  const regAudio = useCallback((id, element) => {
    if (element) {
      audioEls.current.set(id, element)
      connectAudio(id, element)
    } else {
      audioEls.current.delete(id)
      const node = audioNodes.current.get(id)
      if (node) {
        node.source.disconnect()
        node.gain.disconnect()
        audioNodes.current.delete(id)
      }
    }
  }, [connectAudio])
  const ensureAudioGraph = () => {
    if (!audioGraph.current) {
      const AudioContext = window.AudioContext || window.webkitAudioContext
      if (!AudioContext) throw new Error('Audio playback and recording are not supported by this browser.')
      const context = new AudioContext()
      const destination = context.createMediaStreamDestination()
      audioGraph.current = { context, destination }
    }
    audioEls.current.forEach((element, id) => connectAudio(id, element))
    return audioGraph.current
  }
  const syncAudio = (track, element, time, play) => {
    if (!element) return
    const node = audioNodes.current.get(track.id)
    const start = ts(track.a), end = ts(track.b), local = Math.max(0, time - start)
    const active = play && time >= start && time < end && (!Number.isFinite(element.duration) || local < element.duration)
    if (node) {
      const fadeIn = Math.max(0, +track.fadeIn || 0), fadeOut = Math.max(0, +track.fadeOut || 0)
      const inLevel = fadeIn ? Math.min(1, local / fadeIn) : 1
      const outLevel = fadeOut ? Math.min(1, Math.max(0, (end - time) / fadeOut)) : 1
      node.gain.gain.setTargetAtTime(active ? (+track.volume / 100) * Math.min(inLevel, outLevel) : 0, node.gain.context.currentTime, 0.02)
    }
    if (!active) {
      if (!element.paused) element.pause()
      return
    }
    if (Math.abs(element.currentTime - local) > 0.25) element.currentTime = local
    if (element.paused) element.play().catch(() => setMsg('Could not play an audio track. Check that the selected file is a supported audio format.'))
  }

  const { segs, dur: segDur } = useMemo(() => parseSeq(S.seq), [S.seq])
  let dur = segDur
  ins.forEach(m => { dur = Math.max(dur, ts(m.b)) })
  media.forEach(m => { dur = Math.max(dur, ts(m.b)) })
  audioTracks.forEach(m => { dur = Math.max(dur, ts(m.b)) })
  const t = Math.min(el, dur - 0.001)
  const g = G(S), M = model(t, S, segs, NM, NB, TX)
  elRef.current = el; durRef.current = dur
  R.current = { S, segs, TX, NM, NB, media, ins, els: els.current, IB: IB.current, IL: IL.current }

  useEffect(() => { IB.current = new Image(); IB.current.src = bf; R.current.IB = IB.current }, [bf])
  useEffect(() => { IL.current = new Image(); IL.current.src = lg; R.current.IL = IL.current }, [lg])

  useEffect(() => {
    if (!playing) return
    const t0 = performance.now() - elRef.current * 1000
    let raf
    const loop = now => {
      const e = (now - t0) / 1000
      if (e >= durRef.current) { setEl(durRef.current); setPlaying(false); return }
      setEl(e); raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [playing, run])

  const onPlay = async () => {
    if (playing) { setPlaying(false); return }
    if (audioTracks.length) {
      try { await ensureAudioGraph().context.resume() }
      catch (e) { setMsg('Could not start audio playback: ' + e.message); return }
    }
    if (el >= dur) { elRef.current = 0; setEl(0) }
    setPlaying(true)
  }
  const onRestart = () => { elRef.current = 0; setEl(0); setRun(r => r + 1) }

  // ---- files ----
  const addFiles = files => {
    const start0 = media.reduce((m, o) => Math.max(m, ts(o.b)), 0)
    let start = start0; const add = []
    Array.from(files).forEach(f => {
      const vid = f.type.startsWith('video/'), img = f.type.startsWith('image/'); if (!vid && !img) return
      add.push({ id: uid(), name: f.name, kind: vid ? 'video' : 'image', url: URL.createObjectURL(f), a: fmtd(start), b: fmtd(start + 5), fit: 'contain', start, meta: false })
      start += 5
    })
    setMedia(m => [...m, ...add])
  }
  const addIns = (files, pp) => {
    const add = []
    Array.from(files).forEach(f => {
      const vid = f.type.startsWith('video/'), img = f.type.startsWith('image/'); if (!vid && !img) return
      add.push({ id: uid(), name: f.name, kind: vid ? 'video' : 'image', url: URL.createObjectURL(f), a: pp === 'bg' ? '0:00' : '0:03', b: pp === 'bg' ? '0:05' : '0:08', p: pp || 'tr', z: 25, zm: 1, mo: 'none', mz: 0.25, fx: 50, fy: 50, ar: '16/9', meta: false })
    })
    setIns(m => [...m, ...add])
  }
  const addAudio = files => {
    const add = Array.from(files)
      .filter(f => f.type.startsWith('audio/'))
      .map(f => ({ id: uid(), name: f.name, url: URL.createObjectURL(f), a: '0:00', b: '0:30', volume: 70, fadeIn: 1, fadeOut: 1, meta: false }))
    setAudioTracks(list => [...list, ...add])
  }
  const onAudioMeta = (id, duration) => setAudioTracks(list => list.map(track => {
    if (track.id !== id || track.meta) return track
    return { ...track, meta: true, b: Number.isFinite(duration) ? fmtd(ts(track.a) + duration) : track.b }
  }))
  const onMediaMeta = (id, e) => setMedia(list => list.map(m => {
    if (m.id !== id || m.meta) return m
    return m.kind === 'video' && isFinite(e.duration) ? { ...m, meta: true, b: fmtd(m.start + e.duration) } : { ...m, meta: true }
  }))
  const onInsMeta = (id, e) => setIns(list => list.map(m => {
    if (m.id !== id || m.meta) return m
    if (m.kind === 'video') return { ...m, meta: true, ar: e.videoWidth ? e.videoWidth + '/' + e.videoHeight : m.ar, b: isFinite(e.duration) ? fmtd(ts(m.a) + Math.min(e.duration, 60)) : m.b }
    return { ...m, meta: true, ar: e.naturalWidth ? e.naturalWidth + '/' + e.naturalHeight : m.ar }
  }))
  const upd = (setter, id, patch) => setter(l => l.map(o => o.id === id ? { ...o, ...patch } : o))
  const del = (setter, id) => setter(l => l.filter(o => o.id !== id))
  const rmMedia = m => { URL.revokeObjectURL(m.url); del(setMedia, m.id) }
  const rmIns = m => { URL.revokeObjectURL(m.url); del(setIns, m.id) }
  const rmAudio = track => { URL.revokeObjectURL(track.url); del(setAudioTracks, track.id) }
  const pickImg = (setter, fallback) => e => { const f = e.target.files[0]; if (f && f.type.startsWith('image/')) setter(URL.createObjectURL(f)); e.target.value = ''; return fallback }
  const pad = (kx, ky, d) => setS(s => {
    const x = +s[kx] || 0, y = +s[ky] || 0, n = { ...s }
    if (d === 'l') n[kx] = Math.max(0, x - 1); if (d === 'r') n[kx] = Math.min(100, x + 1)
    if (d === 'u') n[ky] = Math.max(0, y - 1); if (d === 'd') n[ky] = Math.min(100, y + 1)
    return n
  })
  const spot = (kx, ky, v) => { if (!v) return; const [x, y] = v.split(','); setS(s => ({ ...s, [kx]: +x, [ky]: +y })) }
  const fillNames = () => { let k = 0; setNM(segs.filter(q => q.k === 'main').map(q => ({ id: uid(), t: 'Exercise ' + (++k), a: fmtd(q.a), b: fmtd(q.b) }))) }
  const fillReps = () => {
    const rp = Math.max(1, +S.rep || 3), out = []
    segs.forEach(q => { if (q.k === 'main') { let k = 0; for (let x = q.a; x < q.b - 0.01; x += rp) { k++; out.push({ id: uid(), v: String(k), a: fmtd(x), b: fmtd(Math.min(q.b, x + rp)) }) } } })
    setNB(out); set('nm', 'time')
  }
  const stepFix = d => { const n = parseInt(S.nfix, 10); setS(s => ({ ...s, nfix: String((isNaN(n) ? 0 : n) + d), nm: 'fixed' })) }

  // ---- record ----
  const download = async () => {
    if (!window.MediaRecorder || !HTMLCanvasElement.prototype.captureStream) { setMsg('This browser cannot record video. Use Chrome, Edge or Firefox on a computer.'); return }
    setPlaying(false); setSaved(null); setEl(0)
    const [W, H] = S.rs.split('x').map(Number), cv = document.createElement('canvas'); cv.width = W; cv.height = H
    const c = cv.getContext('2d'), key = S.key, total = durRef.current, ch = []
    let stream
    try {
      stream = cv.captureStream(30)
      if (audioTracks.length) {
        const graph = ensureAudioGraph()
        await graph.context.resume()
        graph.destination.stream.getAudioTracks().forEach(track => stream.addTrack(track))
      }
    } catch (e) {
      setMsg(e.message || 'Could not prepare audio recording in this browser.')
      return
    }
    try { await document.fonts.load('700 40px Orbitron'); await document.fonts.load('italic 500 40px ' + S.font) } catch (e) {}
    const mt = ['video/mp4;codecs=avc1', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'].filter(m => MediaRecorder.isTypeSupported(m))[0] || ''
    const ext = mt.includes('mp4') ? 'mp4' : 'webm', VB = W >= 3000 ? 4e7 : W >= 1900 ? 16e6 : 12e6
    const mr = new MediaRecorder(stream, mt ? { mimeType: mt, videoBitsPerSecond: VB } : { videoBitsPerSecond: VB })
    mr.ondataavailable = e => { if (e.data.size) ch.push(e.data) }
    mr.onstop = () => {
      const blob = new Blob(ch, { type: mt || 'video/webm' }), name = 'butterfly-overlay-' + Math.round(total) + 's' + (key ? '-greenscreen' : '') + '.' + ext
      setSaved({ blob, name }); setDlBtn('Download video'); saveFile(blob, name)
    }
    setRec(true)
    const st = performance.now(); mr.start()
    const loop = now => {
      const tt = (now - st) / 1000
      if (tt >= total) {
        setEl(total - 0.001); draw(c, W, H, total - 0.001, key, R.current)
        setTimeout(() => { mr.stop(); setRec(false) }, 150); return
      }
      setEl(tt); draw(c, W, H, tt, key, R.current)
      setDlBtn('Recording ' + Math.ceil(tt) + ' / ' + Math.round(total) + ' s')
      requestAnimationFrame(loop)
    }
    requestAnimationFrame(loop)
  }
  const saveFile = (blob, name) => {
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name
    document.body.appendChild(a); a.click(); a.remove()
    setMsg('Download started: ' + name + '. If nothing appeared, press “Save recording”. In CapCut: import it, put it above your clip, then Cutout → Chroma key if it is a green-screen file.')
  }

  // ---- small field helpers (plain functions so inputs keep focus) ----
  const nIn = (k, label, min, max, step) => <label key={k}>{label}<input type="number" value={S[k]} min={min} max={max} step={step} onChange={e => set(k, e.target.value)} /></label>
  const chk = (k, label) => <label className="chk"><input type="checkbox" checked={S[k]} onChange={e => set(k, e.target.checked)} /> {label}</label>
  const padUI = (kx, ky) => <label>Move<div className="pad">{[['l', '◀'], ['u', '▲'], ['d', '▼'], ['r', '▶']].map(([d, s]) => <button key={d} type="button" onClick={() => pad(kx, ky, d)}>{s}</button>)}</div></label>
  const spotUI = (kx, ky) => <label>Quick spot<select value="" onChange={e => spot(kx, ky, e.target.value)}><option value="">Choose…</option>{SPOTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>

  const playNow = playing || rec
  const dip = media.some(m => mstate(m, t, media, S).dip)
  const cornerSide = g.cbp === 'tr' ? { right: '1.6cqw', left: 'auto' } : { left: '1.6cqw', right: 'auto' }
  const activeNm = nmIdx(NM, t)
  const nxScale = 1 + g.hbs * M.h

  const renderIns = bgm => ins.filter(m => (m.p === 'bg') === bgm).map(m => {
    const on = t >= ts(m.a) && t < ts(m.b)
    return (
      <div key={m.id} className="ibox" style={on ? insBox(m, S, bgm) : { display: 'none' }}>
        <Clip m={m} on={on} play={playNow} local={Math.max(0, t - ts(m.a))} reg={reg} onMeta={onInsMeta}
          style={{ transformOrigin: (m.fx == null ? 50 : m.fx) + '% ' + (m.fy == null ? 50 : m.fy) + '%', transform: 'scale(' + isc(m, t) + ')' }} />
      </div>
    )
  })

  return (
    <div className="wrap">
      <div className="top">
        <button className="menub" onClick={() => setMenuOpen(o => !o)}>{menuOpen ? '✕ Menu' : '☰ Menu'}</button>
        <span className="clk">{fmt(t)} / {fmt(dur)}</span>
        {menuOpen && (
          <div className="menu">
            <div className="quick">
              <button onClick={onPlay}>{playing ? '⏸ Pause' : '▶ Play'}</button>
              <button className="o" onClick={onRestart}>↺ Restart</button>
              <label className="fb">＋ Add videos / photos<input type="file" accept="video/*,image/*" multiple onChange={e => { addFiles(e.target.files); e.target.value = '' }} /></label>
              <label className="fb">＋ Add audio<input type="file" accept="audio/*" multiple onChange={e => { addAudio(e.target.files); e.target.value = '' }} /></label>
              <button onClick={download} disabled={rec}>{rec ? dlBtn : audioTracks.length ? '⬇ Download video + audio' : '⬇ Download video'}</button>
              {saved && <button className="o" onClick={() => saveFile(saved.blob, saved.name)}>Save recording</button>}
            </div>
            <Sec id="view" {...sp} title="🔍 View & status"><div className="secb2">
              <div className="wide row" style={{ alignItems: 'center' }}>
                <span className="clk">View zoom</span>
                <button className="o" type="button" onClick={() => setZoom(z => Math.max(50, z - 10))}>−</button>
                <input type="range" min="50" max="200" step="10" value={zoom} onChange={e => setZoom(+e.target.value)} style={{ flex: 1, maxWidth: 240 }} />
                <button className="o" type="button" onClick={() => setZoom(z => Math.min(200, z + 10))}>+</button>
                <span className="clk">{zoom}%</span>
                <button className="o" type="button" onClick={() => setZoom(100)}>Fit</button>
              </div>
              <p className="s wide" style={{ margin: 0 }}>{msg}</p>
            </div></Sec>
            <Sec id="time" {...sp} title="⏱ Timeline & counting"><div className="secb2">
<label className="wide">Timeline (mid:N = middle butterfly N→0, main:S = corner butterfly 0→S)<input type="text" value={S.seq} onChange={e => set('seq', e.target.value)} /></label>

        <label>Bottom-left butterfly &amp; title appear after (seconds)<input type="number" min="0" step="0.5" value={S.hold} onChange={e => set('hold', e.target.value)} /></label>
        <label>Bottom-left butterfly number<select value={S.nm} onChange={e => set('nm', e.target.value)}><option value="auto">Auto count (reps)</option><option value="fixed">Fixed / manual</option><option value="time">By time (list below)</option><option value="hide">Hidden</option></select></label>
        <label>Fixed number (manual)<div className="row" style={{ flexWrap: 'nowrap', gap: 4 }}>
          <button className="o" type="button" onClick={() => stepFix(-1)}>−</button>
          <input type="text" value={S.nfix} onChange={e => setS(s => ({ ...s, nfix: e.target.value, nm: 'fixed' }))} />
          <button className="o" type="button" onClick={() => stepFix(1)}>+</button></div></label>
        <label>Auto count starts at<input type="number" value={S.nst} onChange={e => set('nst', e.target.value)} /></label>

        <div className="wide">
          <div style={{ fontSize: 12, color: 'var(--mut)', marginBottom: 6 }}>Bottom-left number by time (used when “By time” is selected). Type any number or text, start and end in m:ss.</div>
          {NB.map(o => (
            <div className="mrow" key={o.id} style={{ gridTemplateColumns: '80px 70px 70px 36px' }}>
              <input type="text" placeholder="No." value={o.v} onChange={e => upd(setNB, o.id, { v: e.target.value })} />
              <input type="text" value={o.a} onChange={e => upd(setNB, o.id, { a: e.target.value })} />
              <input type="text" value={o.b} onChange={e => upd(setNB, o.id, { b: e.target.value })} />
              <button className="o" onClick={() => del(setNB, o.id)}>✕</button>
            </div>
          ))}
          <div className="row">
            <button className="o" type="button" onClick={() => { const last = NB[NB.length - 1], st = last ? ts(last.b) : 0, n = last && !isNaN(+last.v) ? +last.v + 1 : 1; setNB(l => [...l, { id: uid(), v: String(n), a: fmtd(st), b: fmtd(st + 3) }]); set('nm', 'time') }}>+ Add number</button>
            <button className="o" type="button" onClick={fillReps}>Fill rep counts from timeline</button>
          </div>
        </div>

        <label>Seconds per rep<input type="number" min="1" value={S.rep} onChange={e => set('rep', e.target.value)} /></label>
        <label>Text font<select value={S.font} onChange={e => set('font', e.target.value)}>
          <option value="Lora,Georgia,serif">Italic serif (Lora)</option><option value="'Playfair Display',Georgia,serif">Italic serif (Playfair)</option>
          <option value="'Dancing Script',cursive">Script</option><option value="system-ui,sans-serif">Sans</option><option value="Orbitron,monospace">Digital</option></select></label>
        <label>Text color<input type="color" value={S.col} onChange={e => set('col', e.target.value)} /></label>

        </div></Sec>
            <Sec id="media" {...sp} title="🎬 Videos & photos"><div className="secb2">
<div className="wide">
          <div style={{ fontSize: 12, color: 'var(--mut)', marginBottom: 6 }}>Videos and photos (add one or many with “Add videos / photos”). Each shows between its start and end time (m:ss). Fit = whole picture, Fill = cover the frame.</div>
          {media.map(o => (
            <div className="mrow" key={o.id}>
              <span title={o.name}>{(o.kind === 'video' ? '🎬 ' : '🖼 ') + o.name}</span>
              <input type="text" title="Start m:ss" value={o.a} onChange={e => upd(setMedia, o.id, { a: e.target.value })} />
              <input type="text" title="End m:ss" value={o.b} onChange={e => upd(setMedia, o.id, { b: e.target.value })} />
              <select value={o.fit} onChange={e => upd(setMedia, o.id, { fit: e.target.value })}><option value="contain">Fit</option><option value="cover">Fill</option></select>
              <button className="o" title="Remove" onClick={() => rmMedia(o)}>✕</button>
            </div>
          ))}
          <div className="row" style={{ marginTop: 8 }}>
            <label>Transition between clips<select value={S.trt} onChange={e => set('trt', e.target.value)}><option value="fade">Crossfade (smooth)</option><option value="dip">Dip to black</option><option value="slide">Slide</option><option value="cut">Cut (none)</option></select></label>
            <label>Transition length (seconds)<input type="number" value={S.trd} min="0.1" max="3" step="0.1" style={{ width: 110 }} onChange={e => set('trd', e.target.value)} /></label>
          </div>
        </div>

        </div></Sec>
            <Sec id="audio" {...sp} title="🎵 Music & audio"><div className="secb2">
              <div className="wide">
                <p className="s">Add music or voice tracks. Set each track’s timeline start/end, volume, and fades. Tracks can overlap; audio is included in preview and downloaded video.</p>
                {audioTracks.map(track => (
                  <div className="acard" key={track.id}>
                    <div className="ihead"><span title={track.name}>🎵 {track.name}</span><button className="o" type="button" onClick={() => rmAudio(track)}>✕ Remove</button></div>
                    <div className="igrid">
                      <label>Start (m:ss)<input type="text" value={track.a} onChange={e => upd(setAudioTracks, track.id, { a: e.target.value })} /></label>
                      <label>End (m:ss)<input type="text" value={track.b} onChange={e => upd(setAudioTracks, track.id, { b: e.target.value })} /></label>
                      <label>Volume ({track.volume}%)<input type="range" min="0" max="100" step="1" value={track.volume} onChange={e => upd(setAudioTracks, track.id, { volume: +e.target.value })} /></label>
                      <label>Fade in (seconds)<input type="number" min="0" max="30" step="0.5" value={track.fadeIn} onChange={e => upd(setAudioTracks, track.id, { fadeIn: +e.target.value })} /></label>
                      <label>Fade out (seconds)<input type="number" min="0" max="30" step="0.5" value={track.fadeOut} onChange={e => upd(setAudioTracks, track.id, { fadeOut: +e.target.value })} /></label>
                    </div>
                  </div>
                ))}
                <label className="fb">＋ Add music / audio<input type="file" accept="audio/*" multiple onChange={e => { addAudio(e.target.files); e.target.value = '' }} /></label>
              </div>
            </div></Sec>
            <Sec id="ins" {...sp} title="🖼 Small & background clips"><div className="secb2">
<div className="wide">
          <div style={{ fontSize: 12, color: 'var(--mut)', marginBottom: 6 }}>Small video / photo on top of the main video (picture-in-picture), or a full-screen background behind it (Position = Background). Each one has its own zoom settings.</div>
          {ins.map(o => (
            <div className="icard" key={o.id}>
              <div className="ihead"><span title={o.name}>{(o.kind === 'video' ? '🎬 ' : '🖼 ') + o.name + (o.p === 'bg' ? '  (background)' : '  (small)')}</span><button className="o" type="button" onClick={() => rmIns(o)}>✕ Remove</button></div>
              <div className="igrid">
                <label>Start (m:ss)<input type="text" value={o.a} onChange={e => upd(setIns, o.id, { a: e.target.value })} /></label>
                <label>End (m:ss)<input type="text" value={o.b} onChange={e => upd(setIns, o.id, { b: e.target.value })} /></label>
                <label>Position<select value={o.p} onChange={e => upd(setIns, o.id, { p: e.target.value })}>{Object.entries(IP).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
                {o.p !== 'bg' && <label>Size (% wide)<select value={o.z} onChange={e => upd(setIns, o.id, { z: +e.target.value })}>{[15, 20, 25, 30, 40, 50].map(k => <option key={k} value={k}>{k}%</option>)}</select></label>}
                <label>Zoom<select value={o.zm} onChange={e => upd(setIns, o.id, { zm: +e.target.value })}>{[[1, '100% (none)'], [1.25, '125%'], [1.5, '150%'], [2, '200%'], [2.5, '250%'], [3, '300%'], [4, '400%']].map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
                <label>Zoom motion<select value={o.mo} onChange={e => upd(setIns, o.id, { mo: e.target.value })}><option value="none">No motion</option><option value="in">Slow zoom in</option><option value="out">Slow zoom out</option></select></label>
                <label>Motion amount<select value={o.mz} onChange={e => upd(setIns, o.id, { mz: +e.target.value })}>{[[0.15, 'Gentle'], [0.25, 'Normal'], [0.5, 'Strong'], [1, 'Max']].map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
                <label>Zoom into: left–right %<input type="number" min="0" max="100" step="1" value={o.fx} onChange={e => upd(setIns, o.id, { fx: e.target.value === '' ? 50 : +e.target.value })} /></label>
                <label>Zoom into: up–down %<input type="number" min="0" max="100" step="1" value={o.fy} onChange={e => upd(setIns, o.id, { fy: e.target.value === '' ? 50 : +e.target.value })} /></label>
                <label>Quick zoom spot<select value="" onChange={e => { if (!e.target.value) return; const [x, y] = e.target.value.split(','); upd(setIns, o.id, { fx: +x, fy: +y }) }}><option value="">Choose…</option>{ZSPOTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
              </div>
            </div>
          ))}
          <div className="row">
            <label className="fb">Add small video / photo<input type="file" accept="video/*,image/*" multiple onChange={e => { addIns(e.target.files); e.target.value = '' }} /></label>
            <label className="fb">Add as background video / photo<input type="file" accept="video/*,image/*" multiple onChange={e => { addIns(e.target.files, 'bg'); e.target.value = '' }} /></label>
            {chk('bgb', 'Blur background')}
          </div>
        </div>

        </div></Sec>
            <Sec id="text" {...sp} title="✏️ Titles & texts"><div className="secb2">
<div className="wide">
          <div style={{ fontSize: 12, color: 'var(--mut)', marginBottom: 6 }}>Exercise name by time (m:ss). While a row is active it replaces the bottom-left title; outside every row, the title you typed on the video shows.</div>
          {NM.map(o => (
            <div className="mrow" key={o.id} style={{ gridTemplateColumns: '2fr 70px 70px 36px' }}>
              <input type="text" placeholder="Exercise name" value={o.t} onChange={e => upd(setNM, o.id, { t: e.target.value })} />
              <input type="text" value={o.a} onChange={e => upd(setNM, o.id, { a: e.target.value })} />
              <input type="text" value={o.b} onChange={e => upd(setNM, o.id, { b: e.target.value })} />
              <button className="o" onClick={() => del(setNM, o.id)}>✕</button>
            </div>
          ))}
          <div className="row">
            <button className="o" onClick={() => { const last = NM[NM.length - 1], st = last ? ts(last.b) : 0; setNM(l => [...l, { id: uid(), t: '', a: fmtd(st), b: fmtd(st + 15) }]) }}>+ Add exercise name</button>
            <button className="o" onClick={fillNames}>Fill from timeline</button>
          </div>
        </div>

        <div className="wide">
          <div style={{ fontSize: 12, color: 'var(--mut)', marginBottom: 6 }}>Text by time (minutes:seconds, e.g. 0:05 or 1:30). Each text shows only between its start and end.</div>
          {TX.map(o => (
            <div className="trow" key={o.id}>
              <input type="text" placeholder="Text" value={o.t} onChange={e => upd(setTX, o.id, { t: e.target.value })} />
              <input type="text" value={o.a} onChange={e => upd(setTX, o.id, { a: e.target.value })} />
              <input type="text" value={o.b} onChange={e => upd(setTX, o.id, { b: e.target.value })} />
              <select value={o.p} onChange={e => upd(setTX, o.id, { p: e.target.value })}><option value="top">Top</option><option value="center">Center</option><option value="bottom">Bottom</option></select>
              <select value={o.z} onChange={e => upd(setTX, o.id, { z: e.target.value })}><option value="S">Small</option><option value="M">Medium</option><option value="L">Large</option></select>
              <button className="o" onClick={() => del(setTX, o.id)}>✕</button>
            </div>
          ))}
          <div className="row">
            <button className="o" onClick={() => { const last = TX[TX.length - 1]; setTX(l => [...l, { id: uid(), t: '', a: last ? last.b : '0:00', b: last ? fmt(ts(last.b) + 3) : '0:03', p: 'bottom', z: 'M' }]) }}>+ Add text</button>
            <span className="clk">{fmt(t)} / {fmt(dur)}</span>
          </div>
        </div>

        </div></Sec>
            <Sec id="bf" {...sp} title="🦋 Butterflies & colors"><div className="secb2">
<div className="sub"><h4>🦋 Butterfly picture (all counters)</h4><div className="bdg">
              <label className="fb">Upload your butterfly<input type="file" accept="image/*" onChange={pickImg(setBf)} /></label>
              <button className="o" type="button" onClick={() => setBf(BF0)}>Reset</button></div></div>
            <div className="sub"><h4>Middle butterfly (countdown)</h4><div className="bdg">{chk('mbo', 'Show')}{nIn('mbs', 'Size', 8, 60, 1)}{nIn('mbn', 'Number size', 2, 20, 0.2)}</div></div>
            <div className="sub"><h4>Top corner butterfly (exercise count)</h4><div className="bdg">{chk('cbo', 'Show')}
              <label>Side<select value={S.cbp} onChange={e => set('cbp', e.target.value)}><option value="tl">Top left</option><option value="tr">Top right</option></select></label>
              {nIn('cbs', 'Size', 4, 30, 0.5)}{nIn('cbn', 'Number size', 1, 10, 0.1)}</div></div>
            <div className="sub"><h4>Bottom-left butterfly &amp; title</h4><div className="bdg">{chk('blo', 'Show butterfly')}{nIn('bls', 'Butterfly size', 3, 20, 0.5)}{nIn('bnn', 'Number size', 1, 8, 0.1)}{nIn('blt', 'Title size', 1.5, 8, 0.1)}</div></div>
            <div className="sub"><h4>Counting number colors</h4><div className="bdg">
              <label>Number color<input type="color" value={S.ncf} onChange={e => set('ncf', e.target.value)} /></label>
              <label>Outline color<input type="color" value={S.nco} onChange={e => set('nco', e.target.value)} /></label></div></div></div></Sec>
            <Sec id="logo" {...sp} title="🏷 Logo & “Next”"><div className="secb2">
<div className="sub"><h4>Logo</h4><div className="bdg">
              <label className="fb">Upload your logo<input type="file" accept="image/*" onChange={pickImg(setLg)} /></label>
              <button className="o" type="button" onClick={() => setLg(LG0)}>Reset</button>
              {nIn('lgs', 'Size', 3, 25, 0.2)}{nIn('lgo', 'Opacity %', 10, 100, 5)}{nIn('lgx', 'Left–right %', 0, 100, 0.5)}{nIn('lgy', 'Up–down %', 0, 100, 0.5)}
              {padUI('lgx', 'lgy')}{spotUI('lgx', 'lgy')}</div></div>
            <div className="sub"><h4>“Next” text &amp; heartbeat</h4><div className="bdg">
              {chk('nxo', 'Show “Next”')}{nIn('nxs', 'Text size', 1.5, 12, 0.1)}{nIn('nxx', 'Left–right %', 0, 100, 0.5)}{nIn('nxy', 'Up–down %', 0, 100, 0.5)}
              {padUI('nxx', 'nxy')}{spotUI('nxx', 'nxy')}{chk('nxbo', 'Sky blue background')}
              <label>Background color<input type="color" value={S.nxb} onChange={e => set('nxb', e.target.value)} /></label>
              <label>Heartbeat<select value={S.hbs} onChange={e => set('hbs', e.target.value)}><option value="0">Off</option><option value="0.12">Soft</option><option value="0.22">Normal</option><option value="0.4">Strong</option></select></label></div>
              <div style={{ fontSize: 11, color: 'var(--mut)', marginTop: 6 }}>Shows while the middle butterfly counts. Place it anywhere with the arrows or the numbers, separately from the logo.</div></div>
            </div></Sec>
            <Sec id="dl" {...sp} title="⬇ Download settings"><div className="secb2">
<label>Download size<select value={S.rs} onChange={e => set('rs', e.target.value)}><option value="1280x720">720p (HD)</option><option value="1920x1080">1080p (Full HD)</option><option value="3840x2160">4K (Ultra HD) - big file, needs a fast computer</option></select></label>
        {chk('key', 'Green screen (overlay only)')}
        {chk('lgc', 'Show logo')}
      </div></Sec>
          </div>
        )}
      </div>
      {audioTracks.map(track => <AudioTrack key={track.id} track={track} time={t} play={playNow} register={regAudio} sync={syncAudio} onMeta={onAudioMeta} />)}

      <div className={'stage' + (S.key ? ' key' : '')} style={{ zoom: zoom / 100 }}>
        <div className="bgl">{renderIns(true)}</div>
        <div className="mlayer" style={{ background: dip ? '#000' : 'transparent' }}>
          {media.map(m => {
            const q = mstate(m, t, media, S)
            const lt = Math.min(Math.max(t - ts(m.a), 0), Math.max(0, ts(m.b) - ts(m.a)))
            return <Clip key={m.id} m={m} on={q.on} play={playNow} local={lt} reg={reg} onMeta={onMediaMeta}
              style={{ display: q.on ? 'block' : 'none', objectFit: m.fit, opacity: q.al, transform: 'translateX(' + q.dx * 100 + '%)' }} />
          })}
        </div>
        <div className="ilayer">{renderIns(false)}</div>
        {!media.length && <div className="ph">Add your videos or photos (optional)<br />or press Play to preview</div>}

        <div className="tl" style={{ display: !M.mid && g.cbo ? 'block' : 'none', width: g.cbs + 'cqw', height: g.cbs + 'cqw', ...cornerSide }}>
          <span className="bf" style={{ width: '100%', height: '100%', '--p': M.pr * 100 + '%' }}><img className="g" src={bf} alt="" /><img className="c" src={bf} alt="" /></span>
          <b className="num" style={{ fontSize: g.cbn + 'cqw' }}>{M.cornerNum}</b>
        </div>

        <div className="big" style={{ display: M.mid && g.mbo ? 'block' : 'none', width: g.mbs + 'cqw', height: g.mbs + 'cqw', transform: 'translate(-50%,-50%) scale(' + M.pulse + ')' }}>
          <span className="bf"><img src={bf} alt="" /></span>
          <b className="num wn" style={{ fontSize: g.mbn + 'cqw', '--nf': S.ncf, '--no': S.nco }}>{M.bigNum}</b>
        </div>

        <div className="bl" style={{ visibility: M.showBL ? 'visible' : 'hidden' }}>
          <span className="bf" style={{ display: g.blo ? 'block' : 'none', width: g.bls + 'cqw', height: g.bls + 'cqw' }}>
            <img src={bf} alt="" />
            <b className="num wn" style={{ fontSize: g.bnn + 'cqw', display: M.num === '' ? 'none' : 'flex', '--nf': S.ncf, '--no': S.nco }}>{M.num}</b>
          </span>
          <Ed className="ed" style={{ fontSize: g.blt + 'cqw', color: S.col, fontFamily: S.font }} value={M.title}
            onChange={v => activeNm >= 0 ? upd(setNM, NM[activeNm].id, { t: v }) : set('ttl', v)} />
        </div>

        <div className="txl">
          {M.texts.map(o => <div key={o.id} style={{ fontSize: ZS[o.z] + 'cqw', top: PY[o.p], transform: 'translate(-50%,-50%)', color: S.col, fontFamily: S.font }}>{o.t}</div>)}
        </div>

        <div className="br">
          <img src={lg} alt="" style={{ position: 'absolute', left: g.lgx + '%', top: g.lgy + '%', translate: '-50% -50%', width: g.lgs + 'cqw', height: g.lgs + 'cqw', opacity: g.lgo, display: !M.mid && S.lgc ? 'block' : 'none', objectFit: 'contain' }} />
          <Ed className="ed nx" value={S.nxText} onChange={v => set('nxText', v)}
            style={{ position: 'absolute', left: g.nxx + '%', top: g.nxy + '%', translate: '-50% -50%', pointerEvents: 'auto', whiteSpace: 'nowrap', fontSize: g.nxs + 'cqw', fontFamily: S.font, color: S.col,
              background: g.nxbo ? g.nxb : 'transparent', display: M.mid && g.nxo ? 'block' : 'none', transform: 'scale(' + nxScale + ')', opacity: 0.7 + 0.3 * M.h }} />
        </div>
      </div>

    </div>
  )
}
