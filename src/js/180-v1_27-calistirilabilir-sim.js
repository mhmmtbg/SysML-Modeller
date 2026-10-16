/* ================= v1.27: ÇALIŞTIRILABİLİR SYSML — İFADE MOTORU, CANLI DEĞİŞKENLER, SAAT, GRAFİK, YÜRÜTME İZİ ================= */
/* ---------- ifade motoru (güvenli, eval kullanmaz) ---------- */
const XF = {min:Math.min, max:Math.max, abs:Math.abs, sqrt:Math.sqrt, sin:Math.sin, cos:Math.cos, tan:Math.tan, exp:Math.exp, log:Math.log, ln:Math.log, log10:Math.log10, round:Math.round, floor:Math.floor, ceil:Math.ceil, pow:Math.pow, sign:Math.sign};
const XW = {and:'&&', ve:'&&', or:'||', veya:'||', not:'!', 'değil':'!', degil:'!'};
function xTok(src){
  const t = [], re = /\s*(?:(\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|([A-Za-zÇĞİÖŞÜçğıöşü_][\wÇĞİÖŞÜçğıöşü.]*)|(\*\*|>=|<=|==|!=|&&|\|\||\+=|-=|\+\+|--|[-+*/%^()<>=!,;]))/y;
  let m, i = 0; src = String(src);
  while(i < src.length){ re.lastIndex = i; m = re.exec(src); if(!m || m.index !== i){ if(/^\s+$/.test(src.slice(i))) break; throw new Error('Geçersiz karakter: "' + src[i] + '"'); } i = re.lastIndex; if(m[1]) t.push({n:+m[1]}); else if(m[2]){ const w = m[2]; if(XW[w.toLowerCase()]) t.push({o:XW[w.toLowerCase()]}); else if(/^(true|doğru|dogru)$/i.test(w)) t.push({n:1, b:true}); else if(/^(false|yanlış|yanlis)$/i.test(w)) t.push({n:0, b:false}); else t.push({id:w}); } else if(m[3]) t.push({o:m[3]}); }
  return t;
}
function xParse(tk){
  let p = 0; const peek = () => tk[p], isO = o => tk[p] && tk[p].o === o, eat = o => { if(!isO(o)) throw new Error('Beklenen: ' + o); p++; };
  const prim = () => { const t = tk[p++]; if(!t) throw new Error('İfade eksik'); if(t.n != null) return {k:'n', v:t.n}; if(t.id){ if(isO('(')){ p++; const args = []; if(!isO(')')){ args.push(or()); while(isO(',')){ p++; args.push(or()); } } eat(')'); return {k:'f', f:t.id, a:args}; } return {k:'v', id:t.id}; } if(t.o === '('){ const e = or(); eat(')'); return e; } if(t.o === '-' || t.o === '+'){ return {k:'u', o:t.o, a:pw()}; } if(t.o === '!'){ return {k:'u', o:'!', a:pw()}; } throw new Error('Beklenmeyen: ' + (t.o || t.id)); };
  const pw = () => { let l = prim(); if(isO('^') || isO('**')){ p++; l = {k:'b', o:'^', l, r:pw()}; } return l; };
  const mul = () => { let l = pw(); while(isO('*') || isO('/') || isO('%')){ const o = tk[p++].o; l = {k:'b', o, l, r:pw()}; } return l; };
  const add = () => { let l = mul(); while(isO('+') || isO('-')){ const o = tk[p++].o; l = {k:'b', o, l, r:mul()}; } return l; };
  const cmp = () => { let l = add(); while(isO('<') || isO('>') || isO('<=') || isO('>=') || isO('==') || isO('!=') || isO('=')){ let o = tk[p++].o; if(o === '=') o = '=='; l = {k:'b', o, l, r:add()}; } return l; };
  const and = () => { let l = cmp(); while(isO('&&')){ p++; l = {k:'b', o:'&&', l, r:cmp()}; } return l; };
  const or = () => { let l = and(); while(isO('||')){ p++; l = {k:'b', o:'||', l, r:and()}; } return l; };
  const e = or(); if(p < tk.length) throw new Error('Fazla ifade: ' + (tk[p].o || tk[p].id || tk[p].n));
  return e;
}
function xEval(a, V){
  switch(a.k){
    case 'n': return a.v;
    case 'v': { if(V.has(a.id)) return V.get(a.id); const k = [...V.keys()].find(x => x.toLocaleLowerCase('tr') === a.id.toLocaleLowerCase('tr')); if(k != null) return V.get(k); if(a.id === 't' && V.has('@t')) return V.get('@t'); const e = new Error('Tanımsız değişken: ' + a.id); e.unk = a.id; throw e; }
    case 'f': { const f = XF[a.f.toLowerCase()]; if(!f) throw new Error('Bilinmeyen fonksiyon: ' + a.f); return f(...a.a.map(x => xEval(x, V))); }
    case 'u': { const v = xEval(a.a, V); return a.o === '-' ? -v : a.o === '!' ? (v ? 0 : 1) : +v; }
    case 'b': {
      if(a.o === '&&') return xEval(a.l, V) && xEval(a.r, V) ? 1 : 0;
      if(a.o === '||') return xEval(a.l, V) || xEval(a.r, V) ? 1 : 0;
      const l = xEval(a.l, V), r = xEval(a.r, V);
      switch(a.o){ case '+': return l + r; case '-': return l - r; case '*': return l * r; case '/': return l / r; case '%': return l % r; case '^': return Math.pow(l, r); case '<': return l < r ? 1 : 0; case '>': return l > r ? 1 : 0; case '<=': return l <= r ? 1 : 0; case '>=': return l >= r ? 1 : 0; case '==': return Math.abs(l - r) < 1e-12 ? 1 : 0; case '!=': return Math.abs(l - r) >= 1e-12 ? 1 : 0; }
    }
  }
  throw new Error('İfade hatası');
}
const xExpr = (src, V) => xEval(xParse(xTok(src)), V);
/* atama ifadeleri: "a = 1; b += a * 2" (her deyim bağımsız; çözülemeyen deyim düz metin sayılır) */
function xStmts(code){ return String(code || '').split(/[;\n]+/).map(s => s.trim()).filter(Boolean); }
function xRun(code, V){
  const done = [], text = [];
  xStmts(code).forEach(st => {
    const m = st.match(/^([A-Za-zÇĞİÖŞÜçğıöşü_][\wÇĞİÖŞÜçğıöşü.]*)\s*(\+=|-=|\*=|\/=|=(?!=)|\+\+|--)\s*(.*)$/);
    if(!m){ text.push(st); return; }
    const k0 = m[1], k = [...V.keys()].find(x => x.toLocaleLowerCase('tr') === k0.toLocaleLowerCase('tr')) || k0;
    try {
      const cur0 = V.has(k) ? V.get(k) : 0; let v;
      if(m[2] === '++') v = cur0 + 1; else if(m[2] === '--') v = cur0 - 1; else { const r = xExpr(m[3], V); v = m[2] === '=' ? r : m[2] === '+=' ? cur0 + r : m[2] === '-=' ? cur0 - r : m[2] === '*=' ? cur0 * r : cur0 / r; }
      if(typeof v !== 'number' || isNaN(v)) throw new Error('Sayı değil'); V.set(k, v); done.push(k + ' = ' + fmtNum(v));
    } catch(e){ text.push(st); }
  });
  return {done, text};
}
/* guard: true / false / 'else' / null (çözülemedi → kullanıcıya sorulur) */
function xGuard(g, V){ g = String(g || '').trim(); if(!g) return true; if(/^(else|değilse|aksi)$/i.test(g)) return 'else'; try { return !!xExpr(g, V); } catch(e){ return null; } }
/* zaman olayları: after(10 s), after 5, 10 s sonra */
function xAfter(name){ const m = String(name || '').match(/(?:after|sonra)\s*\(?\s*([\d.]+)\s*(ms|s|sn|sa|h|dk|min)?\s*\)?/i) || String(name || '').match(/^\s*([\d.]+)\s*(ms|s|sn|dk|min|sa|h)\s*(?:sonra)?\s*$/i); if(!m) return null; const v = +m[1], u = (m[2] || 's').toLowerCase(); return u === 'ms' ? v / 1000 : (u === 'dk' || u === 'min') ? v * 60 : (u === 'sa' || u === 'h') ? v * 3600 : v; }

/* ---------- bağlam bloğu ve değişkenler ---------- */
function simCtxBlock(d){ let e = E(d.owner), g = 0; while(e && g++ < 30){ if(e.kind === 'Block') return e; if(e.kind === 'Action' || e.kind === 'Package' || e.kind === 'Model') break; e = E(e.owner); } const alloc = Object.values(M.els).find(r => r.kind === 'Allocate' && r.src === d.owner && E(r.tgt) && E(r.tgt).kind === 'Block'); return alloc ? E(alloc.tgt) : null; }
function simInitVars(blk){
  const V = new Map(); if(!blk) return V;
  const num = v => { const n = numOf(v.def); if(n != null) return n; if(/^(true|doğru)$/i.test(String(v.def || ''))) return 1; return 0; };
  kidsOf(blk.id).filter(v => v.kind === 'Value').forEach(v => V.set(v.name, num(v)));
  kidsOf(blk.id).filter(p => p.kind === 'Part' && E(p.type)).forEach(p => kidsOf(p.type).filter(v => v.kind === 'Value').forEach(v => V.set(p.name + '.' + v.name, num(v))));
  return V;
}
function simSample(){ if(!SIM || !SIM.vars) return; const o = {t:SIM.t, s:SIM.step}; SIM.vars.forEach((v, k) => { o[k] = v; }); SIM.series.push(o); if(SIM.series.length > 2000) SIM.series.shift(); }
function simExec(code, label){ if(!SIM || !SIM.vars || !code) return; const r = xRun(code, SIM.vars); if(r.done.length) simLog('  ⇒ ' + r.done.join(', ')); }
function simTr(o){ if(SIM && SIM.trace) SIM.trace.push(Object.assign({t:SIM.t, step:SIM.step}, o)); }
/* başlangıç: bağlam, değişkenler, saat */
if(typeof simStart === 'function'){
  const _simStart = simStart;
  simStart = function(){
    const keep = SIM && SIM.ctx ? {ctx:SIM.ctx, watch:SIM.watch, chart:SIM.chart} : null;
    _simStart.apply(this, arguments); if(!SIM) return;
    const d = E(SIM.d), blk = keep && E(keep.ctx) ? E(keep.ctx) : simCtxBlock(d);
    SIM.ctx = blk ? blk.id : ''; SIM.vars = simInitVars(blk); SIM.t = 0; SIM.enterT = new Map(); SIM.series = []; SIM.trace = []; SIM.watch = keep && keep.watch ? keep.watch : new Set([...SIM.vars.keys()].slice(0, 3)); SIM.chart = keep ? keep.chart : true;
    if(blk) simLog('Bağlam: ' + blk.name + ' · ' + SIM.vars.size + ' değişken');
    /* başlangıçta girilen durumların entry ifadeleri: _simStart sırasında SIM.vars yoktu, şimdi çalıştır */
    if(SIM.kind === 'stm') [...SIM.act].forEach(a => { const s = E(a); if(s){ SIM.enterT.set(a, 0); if(s.entry) simExec(s.entry); if(s.doAct) simExec(s.doAct); } });
    simSample(); renderSimBar();
  };
}
/* durum makinesi adımı: guard'lar, zaman olayları, tamamlanma geçişleri */
function simTimeTrans(av){ return av.map(t => ({t, d:xAfter(t.name)})).filter(x => x.d != null).map(x => ({t:x.t, at:(SIM.enterT.get(x.t.src) || 0) + x.d})); }
simStepStm = function(auto, tr){
  if(SIM.ask || SIM.done) return;
  const V = SIM.vars || new Map(), av = simAvail(); SIM.step++;
  const ok = t => { const g = xGuard(t.guard, V); return g === true || g === null; };
  let pick = tr && ok(tr) ? tr : null;
  if(tr && !pick){ simLog('✋ [' + tr.guard + '] sağlanmadı: ' + tr.name); SIM.step--; return; }
  if(!pick){
    /* tamamlanma ve değişim (yalnız guard) geçişleri */
    const comp = av.filter(t => !t.name && !isComposite(E(t.src)));
    const gTrue = comp.filter(t => xGuard(t.guard, V) === true && String(t.guard || '').trim()), plain = comp.filter(t => !String(t.guard || '').trim()), els = comp.filter(t => xGuard(t.guard, V) === 'else'), unk = comp.filter(t => xGuard(t.guard, V) === null);
    pick = gTrue[0] || plain[0] || (unk.length ? null : els[0]) || null;
    if(!pick && unk.length) pick = auto ? unk[Math.floor(Math.random() * unk.length)] : null;
  }
  if(!pick){
    const tt = simTimeTrans(av).filter(x => ok(x.t)).sort((a, b) => a.at - b.at);
    if(tt.length && (auto || !av.some(t => t.name && xAfter(t.name) == null))){ const x = tt[0]; if(x.at > SIM.t){ simLog(`⏱ t = ${fmtNum(x.at)} s`); simAdvanceTo(x.at); } pick = x.t; }
  }
  if(!pick && auto){ const ev = av.filter(t => t.name && xAfter(t.name) == null && ok(t)); pick = ev[Math.floor(Math.random() * ev.length)] || null; }
  if(!pick){ simLog(av.length ? 'Olay bekleniyor — aşağıdan bir tetik seçin' : '⏸ Etkin geçiş yok'); if(!av.length){ SIM.done = true; simAutoOff(); } SIM.step--; return; }
  simTake(pick);
};
/* aktivite: karar düğümü guard'ları ve zaman olayları */
if(typeof simFireAct === 'function'){
  const _simFireAct = simFireAct;
  simFireAct = function(n, choice){
    if(SIM && SIM.vars && n.kind === 'Decision' && !choice){ const outs = simOut(n.id), g = outs.map(f => xGuard(f.guard, SIM.vars)), i = g.indexOf(true); choice = i >= 0 ? outs[i] : outs[g.indexOf('else')] || undefined; }
    if(SIM && n.kind === 'AcceptTime'){ const dt = xAfter(n.name) || xAfter('after(' + (n.name || '1') + ')') || 1; simAdvanceTo(SIM.t + dt); simLog(`⏱ t = ${fmtNum(SIM.t)} s (+${fmtNum(dt)} s)`); }
    const r = _simFireAct(n, choice);
    if(SIM && SIM.vars && n.kind === 'Action'){ if(n.dur){ const dt = xAfter(n.dur) || numOf(n.dur) || 0; if(dt){ simAdvanceTo(SIM.t + dt); } } if(n.body) simExec(n.body); simTr({k:'act', name:n.name || '', lane:simLane(n.id)}); }
    if(SIM && n.kind === 'Decision' && choice) simTr({k:'dec', name:choice.guard || ''});
    return r;
  };
}
if(typeof simStepAct === 'function'){
  const _simStepAct = simStepAct;
  simStepAct = function(auto){
    if(SIM && SIM.vars && !SIM.ask){ const en = simEnabled(), n = en[0]; if(n && n.kind === 'Decision'){ const outs = simOut(n.id), g = outs.map(f => xGuard(f.guard, SIM.vars)); if(g.includes(true) || (!g.includes(null) && g.includes('else'))){ simFireAct(n); return; } } }
    return _simStepAct(auto);
  };
}
function simLane(nodeId){ const ds = Object.values(M.els).filter(d => d.kind === 'Diagram' && d.dtype === 'act'); for(const d of ds){ const s = d.shapes.find(x => x.el === nodeId); if(!s) continue; const L = d.shapes.find(p => E(p.el) && E(p.el).kind === 'Partition' && s.x >= p.x && s.x + s.w <= p.x + p.w && s.y >= p.y && s.y + s.h <= p.y + p.h); if(L){ const pe = E(L.el); return (pe.represents && E(pe.represents) ? E(pe.represents).name : pe.name) || ''; } } return ''; }
if(typeof simStepNow === 'function'){
  const _simStepNow = simStepNow;
  simStepNow = function(auto){ if(SIM && SIM.vars && SIM.kind === 'stm' && SIM.dt && !SIM.ask){ /* sabit adımda saat ilerler */ } _simStepNow(auto); if(SIM && SIM.vars){ simSample(); renderSimBar(); } };
}
/* ---------- canlı değişken paneli ve zaman serisi grafiği ---------- */
const SIM_COL = ['#2d7ff9', '#e0457b', '#2e9e6a', '#d18a00', '#7a4fbf', '#16a085'];
function simChartSVG(w, h){
  const S = SIM.series, keys = [...SIM.watch].filter(k => SIM.vars.has(k)); if(!keys.length || S.length < 1) return '<div class="muted" style="font-size:11px;padding:4px">Grafik için değişken işaretleyin</div>';
  const useT = S.some(o => o.t > 0), X = o => useT ? o.t : o.s, xs = S.map(X), x0 = Math.min(...xs), x1 = Math.max(...xs, x0 + 1);
  let y0 = Infinity, y1 = -Infinity; S.forEach(o => keys.forEach(k => { if(typeof o[k] === 'number'){ y0 = Math.min(y0, o[k]); y1 = Math.max(y1, o[k]); } })); if(!isFinite(y0)){ y0 = 0; y1 = 1; } if(y1 - y0 < 1e-9){ y0 -= 1; y1 += 1; }
  const L = 34, B = 16, px = x => L + (x - x0) / (x1 - x0) * (w - L - 6), py = y => 4 + (1 - (y - y0) / (y1 - y0)) * (h - B - 8);
  let s = `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" font-family="Segoe UI, Arial, sans-serif"><rect width="${w}" height="${h}" fill="#fff"/><line x1="${L}" y1="${h - B}" x2="${w - 4}" y2="${h - B}" stroke="#ccd"/><line x1="${L}" y1="4" x2="${L}" y2="${h - B}" stroke="#ccd"/>`;
  s += `<text x="${L - 3}" y="10" font-size="9" text-anchor="end" fill="#667">${esc(fmtNum(y1))}</text><text x="${L - 3}" y="${h - B}" font-size="9" text-anchor="end" fill="#667">${esc(fmtNum(y0))}</text><text x="${w - 6}" y="${h - 4}" font-size="9" text-anchor="end" fill="#667">${useT ? 't = ' + esc(fmtNum(x1)) + ' s' : 'adım ' + x1}</text>`;
  keys.forEach((k, i) => { let dpath = ''; S.forEach((o, j) => { if(typeof o[k] !== 'number') return; const x = px(X(o)), y = py(o[k]); dpath += j ? `H${x.toFixed(1)}V${y.toFixed(1)}` : `M${x.toFixed(1)} ${y.toFixed(1)}`; }); s += `<path d="${dpath}" fill="none" stroke="${SIM_COL[i % SIM_COL.length]}" stroke-width="1.6"/>`; });
  return s + '</svg>';
}
function simVarsHTML(){
  if(!SIM || !SIM.vars) return '';
  const blocks = Object.values(M.els).filter(e => e.kind === 'Block').sort(sortEls), keys = [...SIM.vars.keys()];
  let h = `<div class="simv"><div class="simvh"><b>⏱ t = ${esc(fmtNum(SIM.t || 0))} s</b><label>Bağlam <select data-simctx="1" class="noi18n"><option value="">(yok)</option>${blocks.map(b => `<option value="${b.id}"${b.id === SIM.ctx ? ' selected' : ''}>${esc(b.name)}</option>`).join('')}</select></label><button class="vb" data-sim="trace" title="Yürütme izinden sequence diyagramı üret">⤓ İz → Sequence</button><button class="vb" data-sim="csv" title="Değişken geçmişini Excel'e aktar">⤒ Excel</button></div>`;
  h += keys.length ? `<div class="simvt">${keys.map((k, i) => { const on = SIM.watch.has(k), ci = [...SIM.watch].filter(x => SIM.vars.has(x)).indexOf(k); return `<label class="simvr"><input type="checkbox" data-simw="${esc(k)}"${on ? ' checked' : ''}><i style="background:${on ? SIM_COL[ci % SIM_COL.length] : '#ccd'}"></i><span class="noi18n">${esc(k)}</span><input class="simvi" data-simv="${esc(k)}" value="${esc(fmtNum(SIM.vars.get(k)))}"></label>`; }).join('')}</div>` : '<div class="muted" style="font-size:11px;padding:2px 4px">Bağlam bloğunun value property\'si yok — değişkenler guard ve efektlerde atanınca oluşur</div>';
  if(SIM.chart) h += `<div class="simc">${simChartSVG(360, 120)}</div>`;
  return h + '</div>';
}
if(typeof renderSimBar === 'function'){
  const _rsb = renderSimBar;
  renderSimBar = function(){
    _rsb.apply(this, arguments);
    const bar = $('#simbar'); if(!bar || !SIM || bar.style.display === 'none') return;
    const lg = bar.querySelector('.simlog'); if(lg) lg.insertAdjacentHTML('beforebegin', simVarsHTML());
    if(!bar._v2){ bar._v2 = 1;
      bar.addEventListener('change', ev => { const t = ev.target; if(!SIM) return;
        if(t.dataset.simw != null){ t.checked ? SIM.watch.add(t.dataset.simw) : SIM.watch.delete(t.dataset.simw); renderSimBar(); }
        if(t.dataset.simv != null){ const v = numOf(t.value); if(v != null){ SIM.vars.set(t.dataset.simv, v); simLog('✎ ' + t.dataset.simv + ' = ' + fmtNum(v)); simSample(); renderSimBar(); } }
        if(t.dataset.simctx != null){ SIM.ctx = t.value; SIM.vars = simInitVars(E(t.value)); SIM.watch = new Set([...SIM.vars.keys()].slice(0, 3)); SIM.series = []; simSample(); renderSimBar(); } });
      bar.addEventListener('keydown', ev => { if(ev.target.dataset && ev.target.dataset.simv != null){ ev.stopPropagation(); if(ev.key === 'Enter') ev.target.blur(); } });
      bar.addEventListener('click', ev => { const b = ev.target.closest('[data-sim]'); if(!b || !SIM) return; if(b.dataset.sim === 'trace') simTraceToSeq(); if(b.dataset.sim === 'csv') simSeriesXlsx(); }, true);
    }
  };
}
/* durum makinesi yürütme izi: geçişler ve durumlar */
if(typeof simTake === 'function'){
  const _simTake = simTake;
  simTake = function(t, quiet){
    const src = E(t.src), tgt = E(t.tgt);
    if(SIM && SIM.vars && t.effect) simExec(t.effect);
    if(SIM) simTr({k:'tr', ev:t.name || '', guard:t.guard || '', eff:t.effect || '', from:src ? src.name || '' : '', to:tgt ? tgt.name || '' : '', tgtKind:tgt ? tgt.kind : ''});
    return _simTake(t, quiet);
  };
}
if(typeof simEnter === 'function'){
  const _simEnter = simEnter;
  simEnter = function(id){
    const e = E(id), before = SIM ? new Set(SIM.act) : null;
    if(SIM && SIM.vars && e && (e.kind === 'Choice' || e.kind === 'Junction')){
      const outs = Object.values(M.els).filter(r => r.kind === 'Transition' && r.src === id), g = outs.map(r => xGuard(r.guard, SIM.vars)), i = g.indexOf(true), el = g.indexOf('else');
      if(outs.length > 1 && (i >= 0 || (el >= 0 && !g.includes(null)))){ simTake(outs[i >= 0 ? i : el]); return; }
    }
    const r = _simEnter(id);
    if(SIM && SIM.vars && before){ [...SIM.act].filter(a => !before.has(a)).forEach(a => { SIM.enterT.set(a, SIM.t); const s = E(a); if(s){ if(s.entry) simExec(s.entry); if(s.doAct) simExec(s.doAct); simTr({k:'st', name:s.name || ''}); } }); }
    return r;
  };
}
if(typeof simExitTree === 'function'){
  const _simExitTree = simExitTree;
  simExitTree = function(id){ if(SIM && SIM.vars){ [...SIM.act].forEach(a => { if(a !== id && simAncestors(a).includes(id)){ const s = E(a); if(s && s.exit) simExec(s.exit); } }); } return _simExitTree(id); };
}
/* yürütme izinden sequence diyagramı */
function simTraceToSeq(){
  if(!SIM || !SIM.trace || !SIM.trace.length) return toast('Yürütme izi boş — önce birkaç adım ilerleyin');
  const d0 = E(SIM.d), blk = E(SIM.ctx), owner = blk ? blk.id : nearestPkg(d0.owner), tr = SIM.trace.slice(0, 120);
  snap();
  const sd = newDiagramCore(owner, 'sd', (blk ? blk.name : 'Simülasyon') + ' — Yürütme İzi ' + new Date().toLocaleTimeString('tr-TR', {hour:'2-digit', minute:'2-digit'}));
  const lanes = SIM.kind === 'act' ? [...new Set(tr.filter(x => x.k === 'act').map(x => x.lane || ''))] : [];
  const names = SIM.kind === 'stm' ? ['çevre', blk ? '' : 'sistem'] : (lanes.length > 1 || (lanes[0] && lanes[0] !== '') ? lanes.map(x => x || (blk ? blk.name : 'sistem')) : [blk ? '' : 'sistem']);
  const H = 120 + tr.length * 46, LL = new Map();
  names.forEach((n, i) => { const isCtx = SIM.kind === 'stm' ? i === 1 : true, l = mk('Lifeline', sd.owner, {name:n, type:isCtx && blk && (SIM.kind === 'stm' || !lanes.length || !lanes[i]) ? blk.id : null}); LL.set(i, addShape(sd, l.id, i * 240, 0, 160, H)); });
  const ctxL = SIM.kind === 'stm' ? LL.get(1) : LL.get(0), env = SIM.kind === 'stm' ? LL.get(0) : null;
  let y = 80;
  const msg = (k, a, b, n) => { const ed = connect(sd, k, a, b); E(ed.el).name = n; ed.y = y; y += 46; return ed; };
  tr.forEach(x => {
    if(x.k === 'tr' && x.ev){ msg('MsgAsync', env, ctxL, (x.t ? `[t=${fmtNum(x.t)} s] ` : '') + x.ev + (x.guard ? ' [' + x.guard + ']' : '')); if(x.eff) msg('MsgSync', ctxL, ctxL, x.eff); }
    else if(x.k === 'tr' && x.eff) msg('MsgSync', ctxL, ctxL, x.eff);
    else if(x.k === 'st'){ const si = mk('StateInv', sd.owner, {name:x.name}); addShape(sd, si.id, ctxL.x + 15, y - 14, 130, 28); y += 36; }
    else if(x.k === 'act'){ const li = SIM.kind === 'act' && lanes.length ? Math.max(0, lanes.indexOf(x.lane)) : 0, L = LL.get(li) || ctxL; msg('MsgSync', L, L, x.name || 'aksiyon'); }
    else if(x.k === 'dec'){ const si = mk('StateInv', sd.owner, {name:'[' + x.name + ']'}); addShape(sd, si.id, ctxL.x + 15, y - 14, 130, 28); y += 36; }
  });
  sd.shapes.forEach(s => { if(E(s.el).kind === 'Lifeline') s.h = Math.max(s.h, y + 40); });
  afterChange(); openD(sd.id); fit(); toast(`Yürütme izinden sequence diyagramı oluşturuldu (${tr.length} olay)`);
}
function simSeriesXlsx(){
  if(!SIM || !SIM.series.length) return toast('Kayıt yok');
  const keys = [...SIM.vars.keys()], rows = [['Adım', 't (s)'].concat(keys).map(v => ({v, s:1}))];
  SIM.series.forEach(o => rows.push([o.s, o.t].concat(keys.map(k => o[k] == null ? '' : o[k]))));
  download(buildXlsx([{name:'Simülasyon', rows, widths:[8, 10].concat(keys.map(() => 14)), header:true, freeze:[1, 2]}]), fileSafe(E(M.rootId).name) + ' - Simülasyon Kaydı.xlsx');
}
/* aksiyon ve durum alanları: davranış kodu ve süre */
const _nodeProps26 = nodePropsHTML;
nodePropsHTML = function(el){
  let h = _nodeProps26(el); const pf = (l, c) => `<div class="pf"><label>${l}</label><div>${c}</div></div>`;
  if(el.kind === 'Action') h += pf('Davranış kodu', `<textarea data-f="body" rows="3" placeholder="Simülasyonda çalışır; ör.&#10;P = V * I&#10;sayac += 1">${esc(el.body || '')}</textarea>`) + pf('Süre', `<input data-f="dur" value="${esc(el.dur || '')}" placeholder="ör. 2 s">`);
  return h;
};
DEMO_EXT.push(X => {
  const as = Object.values(M.els).find(e => e.kind === 'Block' && e.name === 'Araç Sistemi'); if(!as) return;
  mk('Value', as.id, {name:'bitSonuc', vtype:'Integer', def:'0'}); mk('Value', as.id, {name:'açılışSayısı', vtype:'Integer', def:'0'}); mk('Value', as.id, {name:'sıcaklık', vtype:'Real', unit:'°C', def:'25'});
  const S = n => Object.values(M.els).find(e => e.kind === 'State' && e.name === n), T = (a, b) => Object.values(M.els).find(r => r.kind === 'Transition' && E(r.src) && E(r.tgt) && E(r.src) === a && E(r.tgt) === b);
  const bit = S('Kendi Kendine Test'), hz = S('Hazır'), ar = S('Arıza'), kp = S('Kapalı');
  if(bit){ bit.entry = 'açılışSayısı += 1'; bit.doAct = 'BIT çalıştır; bitSonuc = sıcaklık < 70'; }
  Object.values(M.els).filter(r => r.kind === 'Transition' && r.guard === 'başarılı').forEach(r => { r.guard = 'bitSonuc == 1'; });
  Object.values(M.els).filter(r => r.kind === 'Transition' && r.guard === 'hata').forEach(r => { r.guard = 'else'; });
  if(hz && kp){ const sm = Object.values(M.els).find(e => e.kind === 'Diagram' && e.dtype === 'stm' && e.shapes.some(s => s.el === hz.id)); if(sm){ const a = sm.shapes.find(s => s.el === hz.id), b = sm.shapes.find(s => s.el === kp.id); if(a && b){ const ed = connect(sm, 'Transition', a, b); const r = E(ed.el); r.name = 'after(30 s)'; r.effect = 'sıcaklık = sıcaklık + 5'; } } }
});

