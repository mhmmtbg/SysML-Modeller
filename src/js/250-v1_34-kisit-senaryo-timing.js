/* ================= v1.34: CANLI KISIT DENETİMİ, SENARYO KAYDI/KOŞTURMA, ZAMAN DİYAGRAMI (@timing) ================= */
let SIM_NEXT = null, TIMING = null;
const xIds = ex => { try { return [...new Set(xTok(ex).filter(t => t.id && !(t.id in XF)).map(t => t.id))]; } catch(e){ return null; } };
/* ---------- kısıt toplama ---------- */
function simConstraints(){
  if(!SIM || !SIM.vars) return [];
  const V = SIM.vars, out = [], has = ex => { const ids = xIds(ex); return ids && ids.length && ids.every(i => V.has(i)); };
  const d = E(SIM.d);
  (d && d.simCons || []).forEach((ex, i) => { if(String(ex).trim()) out.push({id:'d' + i, label:ex, expr:ex, src:'Diyagram'}); });
  Object.values(M.els).forEach(e => {
    if(e.kind === 'Requirement' && String(e.simExpr || '').trim() && has(e.simExpr)) out.push({id:e.id, label:(e.reqId ? e.reqId + ' ' : '') + e.simExpr, expr:e.simExpr, src:'Gereksinim', el:e.id});
    if(e.kind === 'ConstraintBlock' && /[<>]|!=/.test(e.expr || '')) String(e.expr).split(/[;\n]+/).map(s => s.trim()).filter(s => /[<>]|!=/.test(s) && has(s)).forEach((s, i) => out.push({id:e.id + ':' + i, label:e.name + ': ' + s, expr:s, src:'Kısıt bloğu', el:e.id}));
    if(e.kind === 'StateInv'){ const s = String(e.name || '').replace(/^\{|\}$/g, '').trim(); if(s && /[<>=]/.test(s) && has(s)) out.push({id:e.id, label:'{' + s + '}', expr:s, src:'Durum değişmezi', el:e.id}); }
  });
  const ctx = E(SIM.ctx);
  if(ctx){
    const addTol = (v, key) => { const t = v.tol || {}, lo = numOf(t.lo), hi = numOf(t.hi); if((lo != null || hi != null) && V.has(key)) out.push({id:v.id + '@' + key, label:`${key} ∈ [${lo == null ? '−∞' : fmtNum(lo)}, ${hi == null ? '∞' : fmtNum(hi)}]`, expr:[lo != null ? `${key} >= ${lo}` : '', hi != null ? `${key} <= ${hi}` : ''].filter(Boolean).join(' && '), src:'Tolerans', el:v.id}); };
    kidsOf(ctx.id).forEach(k => { if(k.kind === 'Value') addTol(k, k.name); if(k.kind === 'Part' && k.type) kidsOf(k.type).filter(v => v.kind === 'Value').forEach(v => addTol(v, k.name + '.' + v.name)); });
  }
  return out;
}
function simCheck(){
  if(!SIM || !SIM.vars) return;
  if(!SIM.cons) SIM.cons = simConstraints();
  SIM.cst = SIM.cst || new Map(); SIM.viol = SIM.viol || [];
  SIM.cons.forEach(c => {
    const r = xGuard(c.expr, SIM.vars), st = SIM.cst.get(c.id) || {ok:true, n:0};
    if(r === false){ if(st.ok){ st.n++; SIM.viol.push({t:SIM.t || 0, step:SIM.step, id:c.id, label:c.label, vals:xIds(c.expr).map(k => k + '=' + fmtNum(SIM.vars.get(k))).join(', ')}); simLog('⚠ Kısıt ihlali: ' + c.label); if(SIM.trace) SIM.trace.push({t:SIM.t || 0, step:SIM.step, k:'viol', name:c.label}); } st.ok = false; }
    else if(r === true) st.ok = true;
    SIM.cst.set(c.id, st);
  });
}
{
  const _ss = simSample;
  simSample = function(){ _ss(); simCheck(); };
}
/* ---------- tohumlu rastgelelik ve kayıt ---------- */
const simRand = f => function(){ if(!SIM || !SIM.rng || Math.random === SIM.rng) return f.apply(this, arguments); const R0 = Math.random; Math.random = SIM.rng; try { return f.apply(this, arguments); } finally { Math.random = R0; } };
{
  const _st = simStart;
  simStart = function(){
    const nx = SIM_NEXT; SIM_NEXT = null;
    const rec = SIM && SIM.rec && !nx ? true : (nx && nx.rec);
    const sc = SIM && SIM.scen && !nx ? SIM.scen : null;
    _st.apply(this, arguments); if(!SIM) return;
    SIM.seed = nx && nx.seed != null ? nx.seed : Math.floor(Math.random() * 1e9); SIM.rng = tsRng(SIM.seed);
    SIM.cons = null; SIM.cst = new Map(); SIM.viol = [];
    if(rec) SIM.rec = []; if(sc) SIM.scen = sc;
    if(SIM.trace && SIM.kind === 'stm' && !SIM.trace.some(x => x.k === 'st')){ const leaves = [...SIM.act].filter(a => ![...SIM.act].some(b => b !== a && simAncestors(b).includes(a))); leaves.forEach(a => { const s = E(a); if(s && s.kind === 'State') SIM.trace.push({t:0, step:0, k:'st', name:s.name || ''}); }); }
    simCheck(); renderSimBar();
  };
  const _sn = simStepNow;
  simStepNow = simRand(function(auto){ if(SIM && SIM.rec && !SIM.replaying) SIM.rec.push({k:'step', a:!!auto}); return _sn.apply(this, arguments); });
  const _ssm = simStepStm; simStepStm = simRand(function(auto, tr){ const r = _ssm.apply(this, arguments); if(tr && SIM && SIM.vars) simSample(); return r; });
  if(typeof simStepAct === 'function'){ const _ssa = simStepAct; simStepAct = simRand(_ssa); }
}
function simRecStart(){ if(!SIM) return; SIM_NEXT = {rec:true}; simStart(); simLog('● Senaryo kaydı başladı (tohum ' + SIM.seed + ')'); renderSimBar(); }
function simRecStop(){
  if(!SIM || !SIM.rec) return;
  const d = E(SIM.d), steps = SIM.rec.slice(); SIM.rec = null;
  if(!steps.length){ toast('Kaydedilecek adım yok'); renderSimBar(); return; }
  const name = prompt('Senaryo adı:', 'Senaryo ' + ((d.scenarios || []).length + 1)); if(!name){ renderSimBar(); return; }
  snap(); d.scenarios = (d.scenarios || []).concat([{id:uid(), name, seed:SIM.seed, ctx:SIM.ctx, steps, created:new Date().toISOString(), res:simResult()}]); afterChange();
  toast('Senaryo kaydedildi: ' + name); renderSimBar();
}
function simResult(){ return SIM ? {t:SIM.t || 0, steps:SIM.step, viol:(SIM.viol || []).length, vl:(SIM.viol || []).slice(0, 20).map(v => v.label), done:!!SIM.done} : null; }
function simReplay(scId, opt){
  opt = opt || {};
  const d = cur(); if(!d) return null; const sc = (d.scenarios || []).find(s => s.id === scId); if(!sc) return null;
  if(!SIM){ simStart(); if(!SIM) return null; }
  simAutoOff(); SIM.ctx = sc.ctx || SIM.ctx;
  SIM_NEXT = {seed:sc.seed}; simStart(); if(!SIM) return null;
  SIM.replaying = true; SIM.scen = sc.id;
  try {
    sc.steps.forEach(s => {
      if(!SIM) return;
      if(s.k === 'step') simStepNow(s.a);
      else if(s.k === 'trig'){ const t = E(s.t); if(t) simStepStm(false, t); }
      else if(s.k === 'opt' && SIM.ask){ const o = SIM.ask.opts[s.i], A = SIM.ask; SIM.ask = null; if(o){ if(A.stm){ SIM.step++; simTake(o); } else simFireAct(A.n, o); } }
      else if(s.k === 'set'){ SIM.vars.set(s.v, s.val); simLog('✎ ' + s.v + ' = ' + fmtNum(s.val)); simSample(); }
    });
  } finally { if(SIM) SIM.replaying = false; }
  const r = simResult();
  if(!opt.quiet){ simLog('▶ Senaryo koşturuldu: ' + sc.name + ' — ' + (r.viol ? r.viol + ' kısıt ihlali' : 'ihlal yok')); renderSimBar(); renderDiagram(); }
  return r;
}
function simReplayAll(){
  const d = cur(); const L = (d && d.scenarios) || []; if(!L.length) return toast('Kayıtlı senaryo yok');
  const res = L.map(sc => ({sc, r:simReplay(sc.id, {quiet:true})}));
  snap(); res.forEach(({sc, r}) => { sc.last = Object.assign({at:new Date().toISOString()}, r); }); afterChange();
  if(SIM){ res.forEach(({sc, r}) => simLog(`▶ ${sc.name}: ${r && r.viol ? '✗ ' + r.viol + ' ihlal' : '✓ geçti'} (t=${fmtNum(r ? r.t : 0)} s, ${r ? r.steps : 0} adım)`)); renderSimBar(); renderDiagram(); }
  toast(`${res.filter(x => x.r && !x.r.viol).length}/${res.length} senaryo ihlalsiz`);
  return res;
}
/* ---------- simülasyon paneli: kısıtlar ve senaryolar ---------- */
function simConsHTML(){
  if(!SIM || !SIM.vars) return '';
  const C = SIM.cons || [], d = E(SIM.d), sc = (d && d.scenarios) || [];
  let h = `<div class="simk"><div class="simvh"><b>Kısıtlar (${C.length})</b> <span class="${(SIM.viol || []).length ? 'tsbad' : 'tsok'}">${(SIM.viol || []).length ? '⚠ ' + SIM.viol.length + ' ihlal' : '✓ ihlal yok'}</span> <input data-simcon="1" placeholder="+ kısıt, ör. T < 70" style="width:130px" class="noi18n"></div>`;
  h += C.length ? `<div class="simkl">${C.map(c => { const st = SIM.cst.get(c.id) || {ok:true, n:0}; return `<div class="${st.ok ? '' : 'tsbad'}" title="${esc(c.src)}">${st.ok ? '✓' : '✗'} <span class="noi18n">${esc(c.label)}</span>${st.n ? ` <span class="muted">(${st.n})</span>` : ''}${String(c.id).startsWith('d') && !E(c.id) ? ` <a class="lnk" data-simcondel="${c.id.slice(1)}">✕</a>` : ''}</div>`; }).join('')}</div>` : `<div class="muted" style="font-size:11px">Gereksinimin "Simülasyon kısıtı" alanı, eşitsizlik içeren kısıt blokları, durum değişmezleri ve toleranslı değerler otomatik denetlenir.</div>`;
  h += `<div class="simvh" style="margin-top:4px"><b>Senaryo</b> ${SIM.rec ? `<button class="vb pri" data-simsc="stop">■ Kaydı bitir (${SIM.rec.length})</button>` : `<button class="vb" data-simsc="rec" title="Simülasyonu baştan başlatıp adımları kaydeder">● Kaydet</button>`}
    ${sc.length ? `<select data-simscs="1" class="noi18n">${sc.map(s => `<option value="${s.id}"${SIM.scen === s.id ? ' selected' : ''}>${esc(s.name)}${s.last ? (s.last.viol ? ' ✗' : ' ✓') : ''}</option>`).join('')}</select><button class="vb" data-simsc="run">▶ Koştur</button><button class="vb" data-simsc="all">Tümünü koştur</button><button class="vb" data-simsc="del" title="Seçili senaryoyu sil">✕</button>` : ''}
    <button class="vb" data-simsc="timing" title="Durum geçişleri ve değişken dalga biçimleri">Zaman diyagramı</button></div></div>`;
  return h;
}
{
  const _rsb2 = renderSimBar;
  renderSimBar = function(){
    _rsb2.apply(this, arguments);
    const bar = $('#simbar'); if(!bar || !SIM || bar.style.display === 'none') return;
    const lg = bar.querySelector('.simlog'); if(lg) lg.insertAdjacentHTML('beforebegin', simConsHTML());
    if(!bar._v3){ bar._v3 = 1;
      bar.addEventListener('click', ev => {
        const b = ev.target.closest('[data-sim]'); if(b && SIM && SIM.rec && !SIM.replaying){ if(b.dataset.sim === 'trig') SIM.rec.push({k:'trig', t:b.dataset.t}); if(b.dataset.sim === 'opt') SIM.rec.push({k:'opt', i:+b.dataset.i}); }
        const s = ev.target.closest('[data-simsc]'); if(s && SIM){ const k = s.dataset.simsc, d = E(SIM.d), sel = (bar.querySelector('[data-simscs]') || {}).value;
          if(k === 'rec') simRecStart(); if(k === 'stop') simRecStop(); if(k === 'run' && sel) simReplay(sel); if(k === 'all') simReplayAll();
          if(k === 'del' && sel && confirm('Senaryo silinsin mi?')){ snap(); d.scenarios = d.scenarios.filter(x => x.id !== sel); afterChange(); renderSimBar(); }
          if(k === 'timing') timingFromSim(); }
        const cd = ev.target.closest('[data-simcondel]'); if(cd && SIM){ const d = E(SIM.d); snap(); d.simCons.splice(+cd.dataset.simcondel, 1); afterChange(); SIM.cons = null; simCheck(); renderSimBar(); }
      }, true);
      bar.addEventListener('change', ev => { const t = ev.target; if(!SIM) return;
        if(t.dataset.simv != null && SIM.rec && !SIM.replaying){ const v = numOf(t.value); if(v != null) SIM.rec.push({k:'set', v:t.dataset.simv, val:v}); }
        if(t.dataset.simcon){ const ex = t.value.trim(); if(!ex) return; try { xParse(xTok(ex)); } catch(e){ return toast('İfade hatası: ' + e.message); } const d = E(SIM.d); snap(); d.simCons = (d.simCons || []).concat([ex]); afterChange(); SIM.cons = null; simCheck(); renderSimBar(); }
        if(t.dataset.simscs) SIM.scen = t.value;
      }, true);
      bar.addEventListener('keydown', ev => { if(ev.target.dataset && ev.target.dataset.simcon){ ev.stopPropagation(); if(ev.key === 'Enter') ev.target.blur(); } });
    }
  };
}
/* gereksinim: simülasyon kısıtı alanı */
HOOKS.props.push(function(){
    const t = typeof propTarget === 'function' ? propTarget() : {}, el = t.el; if(!el || el.kind !== 'Requirement' || (typeof bulkTargets === 'function' && bulkTargets())) return;
    const P = $('#props'), html = `<div class="pf"><label>Simülasyon kısıtı</label><div><input data-f="simExpr" class="noi18n" value="${esc(el.simExpr || '')}" placeholder="ör. t <= 30 || hazır == 1" title="Simülasyonda her adımda denetlenen ifade (bağlam değişkenleri, t)"></div></div>`;
    const wu = P.querySelector('details.wu'); if(wu) wu.insertAdjacentHTML('beforebegin', html); else P.insertAdjacentHTML('beforeend', html);
  });
/* simülasyon saatini de değişken olarak sun: t */
{
  const _sc2 = simCheck;
  simCheck = function(){ if(SIM && SIM.vars){ const had = SIM.vars.has('t'); if(!had){ SIM.vars.set('t', SIM.t || 0); try { _sc2(); } finally { SIM.vars.delete('t'); } return; } } _sc2(); };
}
/* ---------- zaman diyagramı (@timing) ---------- */
function timingFromSim(){
  if(!SIM) return toast('Simülasyon çalışmıyor');
  const d = E(SIM.d), sc = SIM.scen && d && (d.scenarios || []).find(s => s.id === SIM.scen);
  TIMING = {name:(d ? d.name : '') + (sc ? ' — ' + sc.name : ''), kind:SIM.kind, series:SIM.series.map(o => Object.assign({}, o)), trace:(SIM.trace || []).slice(), viol:(SIM.viol || []).slice(), vars:[...SIM.vars.keys()], watch:new Set(SIM.watch), d:SIM.d};
  openD('@timing');
}
function timingSVG(T, W){
  W = W || 1000;
  const S = T.series, stT = T.trace.filter(o => o.k === 'st' || o.k === 'act').map(o => o.t), dupT = stT.length !== new Set(stT).size;
  const useT = T.axis === 't' ? true : T.axis === 'step' ? false : (S.some(o => o.t > 0) && !dupT), X = o => useT ? o.t : o.s;
  const xs = S.map(X).concat(T.trace.map(o => useT ? o.t : o.step)), x0 = Math.min(0, ...xs), x1 = Math.max(x0 + 1, ...xs);
  const L = 150, R = 20, pw = W - L - R, px = x => L + (x - x0) / (x1 - x0) * pw;
  const keys = T.vars.filter(k => S.some(o => typeof o[k] === 'number')).filter(k => !T.watch || !T.watch.size || T.watch.has(k) || T.vars.length <= 6);
  const lanes = [];
  const sts = T.trace.filter(o => o.k === (T.kind === 'act' ? 'act' : 'st'));
  if(sts.length) lanes.push({k:'state'});
  keys.forEach(k => lanes.push({k:'var', v:k}));
  const LH = 56, top = 26, H = top + lanes.length * LH + 34;
  let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" font-family="Segoe UI,Arial" font-size="11"><rect width="100%" height="100%" fill="#fff"/><text x="8" y="16" font-size="12" font-weight="600" fill="#222">${esc(T.name || 'Zaman diyagramı')}</text>`;
  for(let k = 0; k <= 8; k++){ const v = x0 + (x1 - x0) * k / 8, x = px(v); s += `<line x1="${x}" y1="${top}" x2="${x}" y2="${H - 30}" stroke="#eef0f3"/><text x="${x}" y="${H - 16}" text-anchor="middle" fill="#555">${esc(String(+v.toPrecision(4)))}</text>`; }
  s += `<text x="${L + pw / 2}" y="${H - 3}" text-anchor="middle" fill="#333">${useT ? 'zaman (s)' : 'adım'}</text>`;
  lanes.forEach((ln, i) => {
    const y = top + i * LH, yb = y + LH - 10, yt = y + 8;
    s += `<rect x="${L}" y="${y}" width="${pw}" height="${LH - 4}" fill="none" stroke="#d9dde3"/><line x1="0" y1="${y + LH - 4}" x2="${W}" y2="${y + LH - 4}" stroke="#f0f2f5"/>`;
    if(ln.k === 'state'){
      s += `<text x="${L - 8}" y="${y + LH / 2}" text-anchor="end" fill="#222" font-weight="600">${T.kind === 'act' ? 'Aksiyon' : 'Durum'}</text>`;
      const seg = sts.map((o, j) => ({a:useT ? o.t : o.step, b:j + 1 < sts.length ? (useT ? sts[j + 1].t : sts[j + 1].step) : x1, n:o.name}));
      const names = [...new Set(seg.map(g => g.n))], lv = n => names.length < 2 ? 0.5 : names.indexOf(n) / (names.length - 1);
      let dd = ''; seg.forEach((g, j) => { const yy = yb - lv(g.n) * (yb - yt); dd += (j ? `V${yy.toFixed(1)}` : `M${px(g.a).toFixed(1)} ${yy.toFixed(1)}`) + `H${px(g.b).toFixed(1)}`; });
      s += `<path d="${dd}" fill="none" stroke="#7a4fbf" stroke-width="2"/>`;
      seg.forEach(g => { const yy = yb - lv(g.n) * (yb - yt), w = px(g.b) - px(g.a); if(w > 30) s += `<text x="${px(g.a) + 4}" y="${yy - 4}" fill="#4a2f80">${esc(g.n)}</text>`; });
    } else {
      const vals = S.filter(o => typeof o[ln.v] === 'number').map(o => o[ln.v]), lo = Math.min(...vals), hi = Math.max(...vals), rng = hi - lo || 1;
      const col = SIM_COL[(i - (lanes[0].k === 'state' ? 1 : 0)) % SIM_COL.length];
      s += `<text x="${L - 8}" y="${y + LH / 2 - 4}" text-anchor="end" fill="#222" font-weight="600">${esc(ln.v)}</text><text x="${L - 8}" y="${y + LH / 2 + 9}" text-anchor="end" fill="#777">${esc(fmtNum(lo))} … ${esc(fmtNum(hi))}</text>`;
      let dd = ''; S.forEach((o, j) => { if(typeof o[ln.v] !== 'number') return; const x = px(X(o)), yy = yb - (o[ln.v] - lo) / rng * (yb - yt); dd += dd ? `H${x.toFixed(1)}V${yy.toFixed(1)}` : `M${x.toFixed(1)} ${yy.toFixed(1)}`; });
      if(dd) dd += `H${px(x1).toFixed(1)}`;
      s += `<path d="${dd}" fill="none" stroke="${col}" stroke-width="2"/>`;
    }
  });
  T.viol.forEach(v => { const x = px(useT ? v.t : v.step); s += `<line x1="${x}" y1="${top}" x2="${x}" y2="${H - 30}" stroke="#c0392b" stroke-dasharray="4 3"/><text x="${x + 3}" y="${top + 10}" fill="#c0392b">⚠</text>`; });
  return {str:s + '</svg>', w:W, h:H};
}
function timingHTML(){
  if(!TIMING) return `<div class="vempty">Zaman diyagramı için bir aktivite veya durum makinesi diyagramında simülasyonu başlatıp çalıştırın, ardından simülasyon panelindeki <b>Zaman diyagramı</b> düğmesine basın.<br><br><span class="muted">Durum (veya aksiyon) geçişleri ve izlenen değişkenlerin dalga biçimleri ortak zaman ekseninde gösterilir; kısıt ihlalleri kırmızı çizgiyle işaretlenir.</span></div>`;
  const T = TIMING, W = Math.max(700, Math.min(1600, ($('#view') || {}).clientWidth - 40 || 1000));
  let h = `<div class="tsw"><div class="tschart">${timingSVG(T, W).str}</div>`;
  h += `<div class="li">Gösterilen değişkenler: ${T.vars.map(k => `<label class="vchk"><input type="checkbox" data-tmw="${esc(k)}"${T.watch.has(k) ? ' checked' : ''}> <span class="noi18n">${esc(k)}</span></label>`).join(' ')}</div>`;
  if(T.viol.length) h += `<div class="sub"><span>Kısıt ihlalleri (${T.viol.length})</span></div><table class="rt fmt"><thead><tr><th>t</th><th>Adım</th><th>Kısıt</th><th>Değerler</th></tr></thead><tbody>${T.viol.map(v => `<tr><td>${fmtNum(v.t)}</td><td>${v.step}</td><td class="noi18n">${esc(v.label)}</td><td class="noi18n">${esc(v.vals || '')}</td></tr>`).join('')}</tbody></table>`;
  return h + '</div>';
}
function timingBar(){ return TIMING ? `<span class="muted noi18n">${esc(TIMING.name)}</span><span class="vsep"></span><label>Eksen <select data-tmax="1">${[['', 'Otomatik'], ['t', 'Zaman (s)'], ['step', 'Adım']].map(([k, l]) => `<option value="${k}"${(TIMING.axis || '') === k ? ' selected' : ''}>${l}</option>`).join('')}</select></label><button class="vb" data-tma="png">PNG</button><button class="vb" data-tma="xl">⤒ Excel</button>${TIMING.d && E(TIMING.d) ? `<button class="vb" data-tma="back">Diyagrama dön</button>` : ''}` : ''; }
VIEWS['@timing'] = {tr:'Zaman Diyagramı', ic:'TD', note:'Son simülasyon koşusunun <b>zaman diyagramı</b>: üstte durum (veya aksiyon) geçişleri, altta izlenen değişkenlerin dalga biçimleri (waveform), kırmızı çizgiler kısıt ihlalleri.<br><br>Simülasyon panelindeki <b>Zaman diyagramı</b> düğmesiyle açılır; senaryo koşturduktan sonra da kullanılabilir.', render:timingHTML, bar:timingBar, status:() => TIMING ? TIMING.series.length + ' örnek' : '—'};
(() => {
  const V = $('#view');
  V.addEventListener('change', ev => { if(ST.cur !== '@timing' || !TIMING) return; const t = ev.target; if(t.dataset.tmax != null){ TIMING.axis = t.value; renderView(); return; } if(t.dataset.tmw != null){ t.checked ? TIMING.watch.add(t.dataset.tmw) : TIMING.watch.delete(t.dataset.tmw); renderView(); } });
  V.addEventListener('click', async ev => { if(ST.cur !== '@timing' || !TIMING) return; const b = ev.target.closest('[data-tma]'); if(!b) return; const a = b.dataset.tma;
    if(a === 'back') openD(TIMING.d);
    if(a === 'png'){ const bl = await svgToPng(timingSVG(TIMING, 1200), 2); download(new Blob([bl], {type:'image/png'}), fileSafe(TIMING.name || 'Zaman') + ' - Zaman Diyagramı.png'); }
    if(a === 'xl'){ const keys = TIMING.vars, rows = [['t', 'adım', 'durum'].concat(keys).map(v => ({v, s:1}))]; const st = TIMING.trace.filter(o => o.k === 'st' || o.k === 'act'); TIMING.series.forEach(o => { const cs = st.filter(x => (x.step || 0) <= o.s).pop(); rows.push([o.t, o.s, cs ? cs.name : ''].concat(keys.map(k => o[k] == null ? '' : o[k]))); }); const S2 = [{name:'Zaman', rows, widths:[10, 8, 18].concat(keys.map(() => 14)), header:true, freeze:[1, 1]}]; if(TIMING.viol.length) S2.push({name:'İhlaller', rows:[['t', 'Adım', 'Kısıt', 'Değerler'].map(v => ({v, s:1}))].concat(TIMING.viol.map(v => [v.t, v.step, v.label, v.vals])), widths:[10, 8, 40, 40], header:true}); download(buildXlsx(S2), fileSafe(TIMING.name || 'Zaman') + ' - Zaman Diyagramı.xlsx'); }
  });
})();
HOOKS.menu.analysis.push(r => { const i = r.findIndex(x => x && x.t && /Simülasyonu kapat|Simülasyon başlat/.test(x.t)); r.splice(i < 0 ? r.length : i + 1, 0, {t:'Zaman diyagramı (son simülasyon)', f:() => { if(SIM) timingFromSim(); else openD('@timing'); }}); });
const simkCss = document.createElement('style');
simkCss.textContent = `.simk{border-top:1px solid var(--line,#e3e6ea);padding:4px 0;font-size:12px}.simkl{max-height:84px;overflow:auto}.simk .vb{padding:1px 6px}.simk select{max-width:160px}`;
document.head.appendChild(simkCss);
/* örnek model: hazır olma gereksinimine simülasyon kısıtı, durum makinesine diyagram kısıtı */
DEMO_EXT.push(X => {
  const r = Object.values(M.els).find(e => e.kind === 'Requirement' && e.reqId === 'SYS-002'); if(r) r.simExpr = 't <= 30';
  const sd = Object.values(M.els).find(e => e.kind === 'Diagram' && e.dtype === 'stm'); if(sd) sd.simCons = ['sıcaklık < 70'];
});

