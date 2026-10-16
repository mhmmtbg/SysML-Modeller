/* ================= v1.40: DENKLEM TAKIMI (NEWTON), PARAMETRİK EŞİTSİZLİKLER, SÜREKLİ ZAMAN SİMÜLASYONU (der) ================= */
/* ---------- eşitsizlikler ---------- */
function isIneq(x){ return /<|>|!=/.test(String(x)) && !/^\s*der\s*\(/.test(String(x)); }
function parseIneqs(expr){ return String(expr || '').split(/[;\n]+/).map(x => x.trim()).filter(x => x && isIneq(x)); }
/* ---------- bağlı denklem takımı: Gauss-Newton + satır arama ---------- */
function linSolve(A, b){
  const n = b.length, M2 = A.map((r, i) => r.concat([b[i]]));
  for(let c = 0; c < n; c++){
    let p = c; for(let r = c + 1; r < n; r++) if(Math.abs(M2[r][c]) > Math.abs(M2[p][c])) p = r;
    if(Math.abs(M2[p][c]) < 1e-14) return null;
    [M2[c], M2[p]] = [M2[p], M2[c]];
    for(let r = 0; r < n; r++){ if(r === c) continue; const f = M2[r][c] / M2[c][c]; if(f) for(let k = c; k <= n; k++) M2[r][k] -= f * M2[c][k]; }
  }
  return M2.map((r, i) => r[n] / r[i]);
}
function parNewton(eqs, find, known){
  /* bilinmeyenli denklemler ve bileşenler */
  const info = eqs.map(q => { const U = new Set(); q.vmap.forEach((k, name) => { const g = find(k); if(!known.has(g) && (exVars(q.eq.l).has(name) || exVars(q.eq.r).has(name))) U.add(g); }); return {q, U}; }).filter(x => x.U.size);
  if(!info.length) return false;
  const par = new Map(), f2 = k => { while(par.get(k) !== k) k = par.get(k); return k; };
  info.forEach(x => x.U.forEach(g => { if(!par.has(g)) par.set(g, g); }));
  info.forEach(x => { const a = [...x.U]; a.slice(1).forEach(g => { const r1 = f2(a[0]), r2 = f2(g); if(r1 !== r2) par.set(r1, r2); }); });
  const comps = new Map(); info.forEach(x => { const r = f2([...x.U][0]); if(!comps.has(r)) comps.set(r, []); comps.get(r).push(x); });
  let any = false;
  comps.forEach(list => {
    const U = [...new Set(list.flatMap(x => [...x.U]))]; if(U.length < 2 || U.length > 40 || list.length < U.length) return;
    const resid = xs => list.map(({q}) => { const env = new Map(); q.vmap.forEach((k, name) => { const g = find(k); if(known.has(g)) env.set(name, known.get(g)); else { const i = U.indexOf(g); if(i >= 0) env.set(name, xs[i]); } }); return exEval(q.eq.l, env) - exEval(q.eq.r, env); });
    const norm = r => Math.sqrt(r.reduce((s, v) => s + v * v, 0));
    for(const start of [1, 10, 0.1, -1, 100]){
      let x = U.map(() => start), ok = false;
      try {
        for(let it = 0; it < 120; it++){
          const r = resid(x), nr = norm(r); if(!isFinite(nr)) break;
          const sc = 1e-8 * Math.max(1, ...x.map(Math.abs)); if(nr < sc){ ok = true; break; }
          const J = list.map(() => []); U.forEach((_, j) => { const h = 1e-7 * Math.max(1, Math.abs(x[j])), x2 = x.slice(); x2[j] += h; const r2 = resid(x2); r2.forEach((v, i) => J[i][j] = (v - r[i]) / h); });
          const JtJ = U.map((_, a) => U.map((_, b) => J.reduce((s, row) => s + row[a] * row[b], 0))), Jtr = U.map((_, a) => J.reduce((s, row, i) => s + row[a] * r[i], 0));
          const dx = linSolve(JtJ, Jtr.map(v => -v)); if(!dx) break;
          let lam = 1, xn; for(let k = 0; k < 30; k++){ xn = x.map((v, i) => v + lam * dx[i]); const nn = norm(resid(xn)); if(isFinite(nn) && nn < nr) break; lam /= 2; }
          x = xn;
        }
        if(!ok){ const nf = norm(resid(x)); if(isFinite(nf) && nf < 1e-6 * Math.max(1, ...x.map(Math.abs))) ok = true; }
      } catch(e){ ok = false; }
      if(ok){ U.forEach((g, i) => known.set(g, x[i])); list.forEach(({q}) => { q.newton = true; q.solved = q.solved || 'denklem takımı'; }); any = true; break; }
    }
  });
  return any;
}
VALIDATORS.push(add => {
  parContexts().forEach(b => { let r; try { r = parSolve(b); } catch(e){ return; } (r.checks || []).filter(c => c.ok === false).forEach(c => add('uyarı', 'Parametrik kısıt ihlali', c.cp, `${c.src} sağlanmıyor (${c.env})`)); });
});
/* ---------- sürekli zaman: der(x) = ifade, RK4 ---------- */
const ODE_RE = /^\s*der\s*\(\s*([A-Za-zÇĞİÖŞÜçğıöşü_][\wÇĞİÖŞÜçğıöşü.]*)\s*\)\s*=\s*(.+?)\s*$/;
function parseOde(text){ return String(text || '').split(/[;\n]+/).map(l => l.match(ODE_RE)).filter(Boolean).map(m => ({v:m[1], e:m[2]})); }
function simOdes(){
  if(!SIM) return [];
  const out = new Map(), blk = E(SIM.ctx);
  if(blk && blk.ode) parseOde(blk.ode).forEach(o => out.set(o.v, o.e));
  if(blk) kidsOf(blk.id).filter(p => p.kind === 'Part' && p.type && E(p.type) && E(p.type).ode).forEach(p => parseOde(E(p.type).ode).forEach(o => out.set(p.name + '.' + o.v, o.e.replace(/([A-Za-zÇĞİÖŞÜçğıöşü_][\wÇĞİÖŞÜçğıöşü]*)/g, (w) => kidsOf(p.type).some(v => v.kind === 'Value' && v.name === w) ? p.name + '.' + w : w))));
  if(SIM.kind === 'stm') [...SIM.act].forEach(a => { const s = E(a); if(s && s.doAct) parseOde(s.doAct).forEach(o => out.set(o.v, o.e)); });
  return [...out].map(([v, e]) => ({v, e}));
}
function simAdvanceTo(t1){
  if(!SIM) return; const t0 = SIM.t || 0;
  if(!(t1 > t0)){ SIM.t = t1; return; }
  const odes = SIM.vars ? simOdes() : [];
  if(!odes.length){ SIM.t = t1; return; }
  const V = SIM.vars, H = SIM.odeH || 0.1, n = Math.min(50000, Math.max(1, Math.ceil((t1 - t0) / H))), h = (t1 - t0) / n;
  odes.forEach(o => { if(!V.has(o.v)) V.set(o.v, 0); });
  const f = (t, y) => { const E2 = new Map(V); odes.forEach((o, i) => E2.set(o.v, y[i])); E2.set('t', t); return odes.map(o => { try { const r = xExpr(o.e, E2); return isFinite(r) ? r : 0; } catch(e){ return 0; } }); };
  let y = odes.map(o => +V.get(o.v) || 0), t = t0;
  const every = Math.max(1, Math.floor(n / 40));
  for(let i = 0; i < n; i++){
    const k1 = f(t, y), k2 = f(t + h / 2, y.map((v, j) => v + h / 2 * k1[j])), k3 = f(t + h / 2, y.map((v, j) => v + h / 2 * k2[j])), k4 = f(t + h, y.map((v, j) => v + h * k3[j]));
    y = y.map((v, j) => v + h / 6 * (k1[j] + 2 * k2[j] + 2 * k3[j] + k4[j])); t += h;
    if((i + 1) % every === 0 && i < n - 1){ odes.forEach((o, j) => V.set(o.v, +y[j].toPrecision(12))); SIM.t = t; if(typeof simSample === 'function') simSample(); }
  }
  odes.forEach((o, j) => V.set(o.v, +y[j].toPrecision(12))); SIM.t = t1;
}
{
  const _sx = simExec;
  simExec = function(code, label){ const c = String(code || '').split(/[;\n]+/).filter(l => !ODE_RE.test(l)).join('; '); if(c.trim()) return _sx.call(this, c, label); };
}
function simDt(dt){ if(!SIM) return; dt = +dt || SIM.dtStep || 1; if(SIM.rec && !SIM.replaying) SIM.rec.push({k:'dt', dt}); simAdvanceTo((SIM.t || 0) + dt); simSample(); simLog(`⏱ t = ${fmtNum(SIM.t)} s (+${fmtNum(dt)} s, sürekli)`); renderSimBar(); renderDiagram(); }
{
  SIMBAR_HOOKS.push(bar => {
    if(!bar || !SIM || bar.style.display === 'none' || !SIM.vars) return;
    const odes = simOdes(), hd = bar.querySelector('.simv .simvh'); if(!hd) return;
    hd.insertAdjacentHTML('beforeend', `<span class="simode"><button class="vb" data-simdt="1" title="Zamanı Δt kadar ilerlet; der() denklemleri RK4 ile çözülür">⏱ +Δt</button><input data-simdtv="1" value="${esc(String(SIM.dtStep || 1))}" style="width:42px" title="Δt (s)"> s${odes.length ? ` <span class="muted noi18n" title="${esc(odes.map(o => 'der(' + o.v + ') = ' + o.e).join('\n'))}">∫ ${odes.length} der()</span>` : ''}</span>`);
    if(!bar._v4){ bar._v4 = 1;
      bar.addEventListener('click', ev => { if(ev.target.closest('[data-simdt]') && SIM) simDt(SIM.dtStep || 1); }, true);
      bar.addEventListener('change', ev => { const t = ev.target; if(t.dataset.simdtv != null && SIM){ const v = numOf(t.value); if(v > 0) SIM.dtStep = v; } }, true);
      bar.addEventListener('keydown', ev => { if(ev.target.dataset && ev.target.dataset.simdtv != null){ ev.stopPropagation(); if(ev.key === 'Enter') ev.target.blur(); } });
    }
  });
}
/* senaryo tekrarında Δt adımları */
{
  const _rp = simReplay;
  simReplay = function(scId, opt){
    const d = cur(), sc = d && (d.scenarios || []).find(s => s.id === scId);
    if(!sc || !sc.steps.some(s => s.k === 'dt')) return _rp.apply(this, arguments);
    /* Δt içeren senaryo: adımları sırayla uygula */
    const parts = []; let curP = [];
    sc.steps.forEach(s => { if(s.k === 'dt'){ parts.push(curP, s); curP = []; } else curP.push(s); }); parts.push(curP);
    const fake = Object.assign({}, sc, {steps:parts[0]}); d.scenarios = d.scenarios.map(x => x === sc ? fake : x);
    let r; try { r = _rp.call(this, scId, Object.assign({}, opt, {quiet:true})); } finally { d.scenarios = d.scenarios.map(x => x === fake ? sc : x); }
    if(!SIM) return r;
    SIM.replaying = true;
    try { for(let i = 1; i < parts.length; i += 2){ simAdvanceTo(SIM.t + parts[i].dt); simSample(); (parts[i + 1] || []).forEach(s => { if(s.k === 'step') simStepNow(s.a); else if(s.k === 'trig'){ const t = E(s.t); if(t) simStepStm(false, t); } else if(s.k === 'opt' && SIM.ask){ const o = SIM.ask.opts[s.i], A = SIM.ask; SIM.ask = null; if(o){ if(A.stm){ SIM.step++; simTake(o); } else simFireAct(A.n, o); } } else if(s.k === 'set'){ SIM.vars.set(s.v, s.val); simSample(); } }); } }
    finally { if(SIM) SIM.replaying = false; }
    r = simResult(); if(!(opt && opt.quiet)){ simLog('▶ Senaryo koşturuldu: ' + sc.name + ' — ' + (r.viol ? r.viol + ' kısıt ihlali' : 'ihlal yok')); renderSimBar(); renderDiagram(); }
    return r;
  };
}
/* blok özelliği: sürekli dinamik */
HOOKS.props.push((t, P) => { const el = t.el; if(!el || el.kind !== 'Block' || (typeof bulkTargets === 'function' && bulkTargets())) return;
  const html = `<div class="pf"><label>Sürekli dinamik</label><div><textarea data-f="ode" class="noi18n" rows="2" style="width:100%" placeholder="der(sıcaklık) = (25 - sıcaklık) / 60">${esc(el.ode || '')}</textarea><div class="muted" style="font-size:11px">Simülasyonda zaman ilerlerken RK4 ile çözülür; durumların do alanında da der() yazılabilir.</div></div></div>`;
  const wu = P.querySelector('details.wu'); if(wu) wu.insertAdjacentHTML('beforebegin', html); else P.insertAdjacentHTML('beforeend', html);
});
const odeCss = document.createElement('style'); odeCss.textContent = `.simode{margin-left:6px;white-space:nowrap}.simode .vb{padding:1px 6px}`; document.head.appendChild(odeCss);
/* ---------- örnek model ---------- */
DEMO_EXT.push(X => {
  const B = n => Object.values(M.els).find(e => e.kind === 'Block' && e.name === n);
  const as = B('Araç Sistemi'); if(as) as.ode = 'der(sıcaklık) = (25 - sıcaklık) / 60';
  const g = Object.values(M.els).find(e => e.kind === 'State' && e.name === 'Görevde'); if(g) g.doAct = ((g.doAct ? g.doAct + '\n' : '') + 'der(sıcaklık) = 0.5 - (sıcaklık - 25) / 60').trim();
  const gd = Object.values(M.els).find(e => e.kind === 'ConstraintBlock' && /Güç/.test(e.name)); if(gd && !/P\s*<=/.test(gd.expr || '')) gd.expr = (gd.expr || '') + '\nP <= 120';
  /* bağlı denklem takımı: pompa eğrisi ile hat eğrisinin kesişimi (çalışma noktası) */
  const pk = Object.values(M.els).find(e => e.kind === 'Package' && e.name === 'Yapı') || E(M.rootId);
  const cb = mk('ConstraintBlock', pk.id, {name:'Çalışma Noktası', expr:'H = H0 - k1 * Q^2\nH = k2 * Q^2', doc:'Pompa eğrisi ile hat direnci eğrisinin kesişimi; H ve Q birlikte (denklem takımı) çözülür.'});
  ['H', 'H0', 'k1', 'k2', 'Q'].forEach(n => mk('Param', cb.id, {name:n, vtype:'Real'}));
  const sb = mk('Block', pk.id, {name:'Soğutma Döngüsü', doc:'Denklem takımı örneği'});
  const vals = {H0:'40', k1:'0.02', k2:'0.05', H:'', Q:''}, V = {}; Object.entries(vals).forEach(([n, d]) => { V[n] = mk('Value', sb.id, {name:n, vtype:'Real', def:d, unit:n === 'Q' ? 'L/min' : n === 'H' || n === 'H0' ? 'm' : ''}); if(!d) delete V[n].def; });
  const cp = mk('ConstraintProp', sb.id, {name:'nokta', type:cb.id});
  kidsOf(cb.id).filter(p => p.kind === 'Param').forEach(p => mk('Binding', sb.id, {src:V[p.name].id, tgt:p.id, tp:cp.id, name:''}));
});
