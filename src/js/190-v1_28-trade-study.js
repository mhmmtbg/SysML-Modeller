/* ================= v1.28: TRADE STUDY, DUYARLILIK SÜPÜRMESİ, TORNADO, MONTE CARLO ================= */
Object.assign(KIND, {TradeStudy:{tr:'Trade Study', en:'TradeStudy', ic:'TS', col:'#8e44ad'}});
Object.assign(BASE, {TradeStudy:'Trade study'});
['Model', 'Package'].forEach(k => { if(OWN[k] && !OWN[k].includes('TradeStudy')) OWN[k].push('TradeStudy'); });
RANK.push('TradeStudy');
if(typeof UI_RULES !== 'undefined') UI_RULES.unshift([/trade study|monte carlo|duyarlılık|sensitivity|pareto|radar|tornado|süpürme|sweep/i, 'chart']);
const TS_COL = ['#1f6fd1', '#c0392b', '#27ae60', '#d35400', '#8e44ad', '#16a085', '#7f8c8d', '#b7950b', '#2c3e50', '#e84393'];
let TSV = {ts:null, tab:'ts', px:0, py:1, sw:null, tor:null, mc:null};
const allTS = () => Object.values(M.els).filter(e => e.kind === 'TradeStudy').sort(sortEls);
const tsCur = () => { let t = E(TSV.ts); if(!t || t.kind !== 'TradeStudy') t = allTS()[0] || null; TSV.ts = t ? t.id : null; return t; };
/* ---------- alternatifler ve ham değerler (bütçe motoru + parametrik sonuçlar + instance slotları) ---------- */
function tsAltName(a){ return !a ? '?' : a.kind === 'Instance' ? (a.name || '') + ' : ' + ((instClassifier(a) || {}).name || '?') : (a.name || ''); }
function tsAltCands(){ return Object.values(M.els).filter(e => e.kind === 'Block' || (e.kind === 'Instance' && !(E(e.owner) && E(e.owner).kind === 'Instance'))).sort((a, b) => pathOf(a.id).localeCompare(pathOf(b.id), 'tr')); }
function tsRaw(a, prop){
  if(!a || !prop) return null;
  if(a.kind === 'Instance') return instRollup(a, prop);
  if(a.kind === 'Block'){
    const v = kidsOf(a.id).find(c => c.kind === 'Value' && c.name === prop);
    if(v && v.res != null && isFinite(+v.res)) return +v.res;
    const r = rollup(a.id, prop); return r.total == null ? null : r.total;
  }
  return null;
}
function tsProps(ts){
  const s = new Set();
  const addB = (b, g) => { if(!b || g > 8) return; kidsOf(b.id).forEach(c => { if(c.kind === 'Value' && c.name) s.add(c.name); if(c.kind === 'Part' && c.type && E(c.type)) addB(E(c.type), g + 1); }); };
  (ts && ts.alts || []).map(E).filter(Boolean).forEach(a => { if(a.kind === 'Block') addB(a, 0); else instTree(a).forEach(({i}) => instSlots(i).forEach(v => s.add(v.name))); });
  if(!s.size) budgetProps().forEach(p => s.add(p));
  return [...s].sort((a, b) => a.localeCompare(b, 'tr'));
}
/* ---------- puanlama: min-maks normalleştirme, ağırlıklı toplam, eleme sınırı ---------- */
function tsEval(ts, wMul){
  const alts = (ts.alts || []).map(E).filter(Boolean), crit = (ts.crit || []).filter(c => c.prop);
  const raw = alts.map(a => crit.map(c => tsRaw(a, c.prop)));
  const W = crit.map((c, j) => Math.max(0, numOf(c.w) == null ? 1 : numOf(c.w)) * (wMul && wMul[j] != null ? wMul[j] : 1));
  const Ws = W.reduce((s, x) => s + x, 0);
  const util = alts.map(() => []), elim = alts.map(() => []);
  crit.forEach((c, j) => {
    const xs = raw.map(r => r[j]).filter(x => x != null), lo = xs.length ? Math.min(...xs) : 0, hi = xs.length ? Math.max(...xs) : 0, lim = numOf(c.lim);
    alts.forEach((a, i) => {
      const x = raw[i][j];
      if(x == null){ util[i][j] = 0; return; }
      let u = hi === lo ? 1 : (x - lo) / (hi - lo); if(c.dir === 'min' && hi !== lo) u = 1 - u;
      util[i][j] = u;
      if(lim != null && (c.dir === 'min' ? x > lim : x < lim)) elim[i].push(c.name || c.prop);
    });
  });
  const score = util.map(u => Ws ? 100 * u.reduce((s, x, j) => s + x * W[j], 0) / Ws : 0);
  const order = alts.map((_, i) => i).sort((a, b) => (elim[a].length ? 1 : 0) - (elim[b].length ? 1 : 0) || score[b] - score[a]);
  return {alts, crit, raw, util, score, order, W, Ws, elim, miss:raw.map(r => r.filter(x => x == null).length)};
}
/* ağırlık duyarlılığı: her kriterin ağırlığı ×0…×3 taranır, kazananın değişmediği aralık bulunur */
function tsWeightSens(ts){
  const R = tsEval(ts); if(R.alts.length < 2 || !R.crit.length) return [];
  const win = R.order[0];
  return R.crit.map((c, j) => {
    let lo = null, hi = null, other = null;
    for(let k = 0; k <= 60; k++){ const m = k / 20, w = R.crit.map((_, q) => q === j ? m : 1), r = tsEval(ts, w); if(r.order[0] === win){ if(lo == null) lo = m; hi = m; } else if(other == null) other = r.alts[r.order[0]]; }
    return {c, lo, hi, other, robust:lo === 0 && hi === 3};
  });
}
/* Pareto: iki kriterde baskın olunmayan alternatifler */
function tsPareto(R, a, b){
  const val = (i, j) => { const x = R.raw[i][j]; return x == null ? null : (R.crit[j].dir === 'min' ? -x : x); };
  return R.alts.map((_, i) => {
    const xi = val(i, a), yi = val(i, b); if(xi == null || yi == null) return false;
    return !R.alts.some((_, k) => { if(k === i) return false; const xk = val(k, a), yk = val(k, b); return xk != null && yk != null && xk >= xi && yk >= yi && (xk > xi || yk > yi); });
  });
}
/* ---------- grafikler (sade SVG: gölge yok) ---------- */
const tsF = v => fmtNum(v), tsA = v => v == null || !isFinite(v) ? '—' : String(+(+v).toPrecision(4));
function tsRadarSVG(R){
  const N = R.crit.length, W = 460, H = 380, cx = 230, cy = 190, rad = 140;
  if(N < 3) return {str:`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="60"><text x="10" y="34" font-family="Segoe UI,Arial" font-size="13" fill="#666">Radar grafiği için en az 3 kriter gerekli.</text></svg>`, w:W, h:60};
  const ang = j => -Math.PI / 2 + 2 * Math.PI * j / N, P = (j, r) => [cx + Math.cos(ang(j)) * r, cy + Math.sin(ang(j)) * r];
  let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H + 20 + 18 * Math.ceil(R.alts.length / 2)}" font-family="Segoe UI,Arial" font-size="11"><rect width="100%" height="100%" fill="#fff"/>`;
  [0.25, 0.5, 0.75, 1].forEach(f => { s += `<polygon points="${R.crit.map((_, j) => P(j, rad * f).join(',')).join(' ')}" fill="none" stroke="#d5d9e0"/>`; });
  R.crit.forEach((c, j) => { const [x, y] = P(j, rad), [lx, ly] = P(j, rad + 16); s += `<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" stroke="#c9ced6"/><text x="${lx}" y="${ly + 4}" text-anchor="${Math.abs(lx - cx) < 8 ? 'middle' : lx > cx ? 'start' : 'end'}" fill="#333">${esc(c.name || c.prop)}${c.dir === 'min' ? ' ↓' : ' ↑'}</text>`; });
  R.alts.forEach((a, i) => { const col = TS_COL[i % TS_COL.length]; s += `<polygon points="${R.crit.map((_, j) => P(j, rad * Math.max(0.02, R.util[i][j])).join(',')).join(' ')}" fill="${col}" fill-opacity="0.10" stroke="${col}" stroke-width="2"/>`; });
  R.alts.forEach((a, i) => { const col = TS_COL[i % TS_COL.length], x = 20 + (i % 2) * 220, y = H + 8 + Math.floor(i / 2) * 18; s += `<rect x="${x}" y="${y}" width="12" height="12" fill="${col}"/><text x="${x + 18}" y="${y + 10}" fill="#222">${esc(tsAltName(a))} — ${R.score[i].toFixed(1)}</text>`; });
  const h = H + 20 + 18 * Math.ceil(R.alts.length / 2);
  return {str:s + '</svg>', w:W, h};
}
function tsAxis(lo, hi){ if(lo === hi){ lo -= 1; hi += 1; } const pad = (hi - lo) * 0.08; return [lo - pad, hi + pad]; }
function tsParetoSVG(R, a, b){
  const W = 460, H = 380, L = 64, T = 20, Rr = 20, Bt = 50, pw = W - L - Rr, ph = H - T - Bt;
  if(R.crit.length < 2 || a === b) return {str:`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="60"><text x="10" y="34" font-family="Segoe UI,Arial" font-size="13" fill="#666">Pareto için iki farklı kriter seçin.</text></svg>`, w:W, h:60};
  const pts = R.alts.map((_, i) => [R.raw[i][a], R.raw[i][b], i]).filter(p => p[0] != null && p[1] != null), pf = tsPareto(R, a, b);
  if(!pts.length) return {str:`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="60"><text x="10" y="34" font-family="Segoe UI,Arial" font-size="13" fill="#666">Seçili kriterlerde değer yok.</text></svg>`, w:W, h:60};
  const [x0, x1] = tsAxis(Math.min(...pts.map(p => p[0])), Math.max(...pts.map(p => p[0]))), [y0, y1] = tsAxis(Math.min(...pts.map(p => p[1])), Math.max(...pts.map(p => p[1])));
  const X = v => L + (v - x0) / (x1 - x0) * pw, Y = v => T + ph - (v - y0) / (y1 - y0) * ph;
  let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" font-family="Segoe UI,Arial" font-size="11"><rect width="100%" height="100%" fill="#fff"/><rect x="${L}" y="${T}" width="${pw}" height="${ph}" fill="none" stroke="#c9ced6"/>`;
  for(let k = 0; k <= 4; k++){ const vx = x0 + (x1 - x0) * k / 4, vy = y0 + (y1 - y0) * k / 4; s += `<line x1="${X(vx)}" y1="${T}" x2="${X(vx)}" y2="${T + ph}" stroke="#eef0f3"/><text x="${X(vx)}" y="${T + ph + 14}" text-anchor="middle" fill="#555">${tsA(vx)}</text><line x1="${L}" y1="${Y(vy)}" x2="${L + pw}" y2="${Y(vy)}" stroke="#eef0f3"/><text x="${L - 4}" y="${Y(vy) + 4}" text-anchor="end" fill="#555">${tsA(vy)}</text>`; }
  const ca = R.crit[a], cb = R.crit[b], ua = budgetUnit(ca.prop), ub = budgetUnit(cb.prop);
  s += `<text x="${L + pw / 2}" y="${H - 14}" text-anchor="middle" fill="#222">${esc(ca.name || ca.prop)}${ua ? ' (' + esc(ua) + ')' : ''} ${ca.dir === 'min' ? '← iyi' : 'iyi →'}</text><text transform="translate(14 ${T + ph / 2}) rotate(-90)" text-anchor="middle" fill="#222">${esc(cb.name || cb.prop)}${ub ? ' (' + esc(ub) + ')' : ''} ${cb.dir === 'min' ? '← iyi' : 'iyi →'}</text>`;
  const front = pts.filter(p => pf[p[2]]).sort((p, q) => p[0] - q[0]);
  if(front.length > 1) s += `<polyline points="${front.map(p => X(p[0]) + ',' + Y(p[1])).join(' ')}" fill="none" stroke="#27ae60" stroke-width="2" stroke-dasharray="6 4"/>`;
  pts.forEach(p => { const i = p[2], col = TS_COL[i % TS_COL.length], on = pf[i]; s += `<circle cx="${X(p[0])}" cy="${Y(p[1])}" r="${on ? 7 : 5}" fill="${on ? col : '#fff'}" stroke="${col}" stroke-width="2"/><text x="${X(p[0]) + (X(p[0]) > L + pw * 0.7 ? -9 : 9)}" y="${Y(p[1]) - 7}" text-anchor="${X(p[0]) > L + pw * 0.7 ? 'end' : 'start'}" fill="#222">${esc(tsAltName(R.alts[i]))}</text>`; });
  return {str:s + '</svg>', w:W, h:H};
}
function tsLineSVG(xs, series, o){
  o = o || {}; const W = o.w || 640, H = o.h || 320, L = 70, T = 16, Rr = 16, Bt = 46 + 16 * Math.ceil(series.length / 2), pw = W - L - Rr, ph = H - T - Bt;
  const ys = series.flatMap(s => s.y.filter(v => v != null && isFinite(v)));
  if(!xs.length || !ys.length) return {str:`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="60"><text x="10" y="34" font-family="Segoe UI,Arial" font-size="13" fill="#666">Hesaplanabilen çıktı yok.</text></svg>`, w:W, h:60};
  const [x0, x1] = [Math.min(...xs), Math.max(...xs)], [y0, y1] = tsAxis(Math.min(...ys), Math.max(...ys)), X = v => L + (x1 === x0 ? 0.5 : (v - x0) / (x1 - x0)) * pw, Y = v => T + ph - (v - y0) / (y1 - y0) * ph;
  let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" font-family="Segoe UI,Arial" font-size="11"><rect width="100%" height="100%" fill="#fff"/><rect x="${L}" y="${T}" width="${pw}" height="${ph}" fill="none" stroke="#c9ced6"/>`;
  for(let k = 0; k <= 5; k++){ const vx = x0 + (x1 - x0) * k / 5, vy = y0 + (y1 - y0) * k / 5; s += `<line x1="${X(vx)}" y1="${T}" x2="${X(vx)}" y2="${T + ph}" stroke="#eef0f3"/><text x="${X(vx)}" y="${T + ph + 14}" text-anchor="middle" fill="#555">${tsA(vx)}</text><line x1="${L}" y1="${Y(vy)}" x2="${L + pw}" y2="${Y(vy)}" stroke="#eef0f3"/><text x="${L - 4}" y="${Y(vy) + 4}" text-anchor="end" fill="#555">${tsA(vy)}</text>`; }
  if(o.xl) s += `<text x="${L + pw / 2}" y="${T + ph + 30}" text-anchor="middle" fill="#222">${esc(o.xl)}</text>`;
  if(o.mark != null && o.mark >= x0 && o.mark <= x1) s += `<line x1="${X(o.mark)}" y1="${T}" x2="${X(o.mark)}" y2="${T + ph}" stroke="#999" stroke-dasharray="4 3"/><text x="${X(o.mark) + 3}" y="${T + 11}" fill="#777">nominal</text>`;
  if(o.lim != null && o.lim >= y0 && o.lim <= y1) s += `<line x1="${L}" y1="${Y(o.lim)}" x2="${L + pw}" y2="${Y(o.lim)}" stroke="#c0392b" stroke-dasharray="6 4"/><text x="${L + pw - 4}" y="${Y(o.lim) - 4}" text-anchor="end" fill="#c0392b">sınır ${tsF(o.lim)}</text>`;
  series.forEach((sr, k) => { const col = TS_COL[k % TS_COL.length]; let d = '', pen = false; xs.forEach((x, i) => { const y = sr.y[i]; if(y == null || !isFinite(y)){ pen = false; return; } d += (pen ? 'L' : 'M') + X(x).toFixed(1) + ' ' + Y(y).toFixed(1) + ' '; pen = true; }); s += `<path d="${d}" fill="none" stroke="${col}" stroke-width="2"/>`; const lx = L + (k % 2) * (pw / 2), ly = T + ph + 34 + Math.floor(k / 2) * 16; s += `<rect x="${lx}" y="${ly}" width="14" height="3" fill="${col}"/><text x="${lx + 20}" y="${ly + 5}" fill="#222">${esc(sr.name)}</text>`; });
  return {str:s + '</svg>', w:W, h:H};
}
function tsTornadoSVG(T){
  const rows = T.rows.slice(0, 12), W = 640, rh = 24, L = 220, Rr = 20, H = 40 + rows.length * rh + 30, pw = W - L - Rr;
  if(!rows.length) return {str:`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="60"><text x="10" y="34" font-family="Segoe UI,Arial" font-size="13" fill="#666">Çıktıyı etkileyen girdi bulunamadı.</text></svg>`, w:W, h:60};
  const vs = rows.flatMap(r => [r.lo, r.hi, T.base]), [x0, x1] = tsAxis(Math.min(...vs), Math.max(...vs)), X = v => L + (v - x0) / (x1 - x0) * pw;
  let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" font-family="Segoe UI,Arial" font-size="11"><rect width="100%" height="100%" fill="#fff"/><text x="${L}" y="16" fill="#222">${esc(T.outName)} — girdiler ±%${T.pct}</text>`;
  rows.forEach((r, i) => { const y = 30 + i * rh, a = Math.min(r.lo, r.hi), b = Math.max(r.lo, r.hi); s += `<text x="${L - 6}" y="${y + 15}" text-anchor="end" fill="#333">${esc(r.name)}</text><rect x="${X(Math.min(a, T.base))}" y="${y + 4}" width="${Math.max(1, X(T.base) - X(Math.min(a, T.base)))}" height="${rh - 8}" fill="#1f6fd1" fill-opacity="0.75"/><rect x="${X(T.base)}" y="${y + 4}" width="${Math.max(1, X(Math.max(b, T.base)) - X(T.base))}" height="${rh - 8}" fill="#d35400" fill-opacity="0.75"/>`; });
  s += `<line x1="${X(T.base)}" y1="26" x2="${X(T.base)}" y2="${30 + rows.length * rh}" stroke="#222"/><text x="${X(T.base)}" y="${H - 8}" text-anchor="middle" fill="#222">nominal ${tsF(T.base)}</text><text x="${L}" y="${H - 8}" fill="#555">${tsA(x0)}</text><text x="${W - Rr}" y="${H - 8}" text-anchor="end" fill="#555">${tsA(x1)}</text>`;
  return {str:s + '</svg>', w:W, h:H};
}
function tsHistSVG(R, lim){
  const W = 640, H = 300, L = 60, T = 16, Rr = 34, Bt = 40, pw = W - L - Rr, ph = H - T - Bt, mx = Math.max(...R.bins.map(b => b.n), 1);
  const x0 = R.bins[0].a, x1 = R.bins[R.bins.length - 1].b, X = v => L + (x1 === x0 ? 0.5 : (v - x0) / (x1 - x0)) * pw;
  let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" font-family="Segoe UI,Arial" font-size="11"><rect width="100%" height="100%" fill="#fff"/><rect x="${L}" y="${T}" width="${pw}" height="${ph}" fill="none" stroke="#c9ced6"/>`;
  R.bins.forEach(b => { const h = b.n / mx * ph, bad = lim != null && (R.limDir === 'min' ? b.b <= lim : b.a >= lim); s += `<rect x="${X(b.a) + 0.5}" y="${T + ph - h}" width="${Math.max(1, X(b.b) - X(b.a) - 1)}" height="${h}" fill="${bad ? '#c0392b' : '#1f6fd1'}" fill-opacity="0.75"/>`; });
  for(let k = 0; k <= 5; k++){ const v = x0 + (x1 - x0) * k / 5; s += `<text x="${X(v)}" y="${T + ph + 14}" text-anchor="middle" fill="#555">${tsA(v)}</text>`; }
  s += `<text x="${L - 4}" y="${T + 10}" text-anchor="end" fill="#555">${mx}</text><text x="${L - 4}" y="${T + ph}" text-anchor="end" fill="#555">0</text>`;
  const mk2 = (v, c, t) => { if(v >= x0 && v <= x1) s += `<line x1="${X(v)}" y1="${T}" x2="${X(v)}" y2="${T + ph}" stroke="${c}" stroke-dasharray="5 3"/><text x="${X(v) + 3}" y="${T + 12}" fill="${c}">${t}</text>`; };
  mk2(R.mean, '#222', 'μ'); mk2(R.p5, '#777', 'P5'); mk2(R.p95, '#777', 'P95'); if(lim != null) mk2(lim, '#c0392b', 'sınır');
  s += `<text x="${L + pw / 2}" y="${H - 6}" text-anchor="middle" fill="#222">${esc(R.outName)} — ${R.n} örnek</text>`;
  return {str:s + '</svg>', w:W, h:H};
}
/* ---------- girdi/çıktı adayları ve geçici değer uygulama ---------- */
function tsInputs(){ return Object.values(M.els).filter(v => v.kind === 'Value' && E(v.owner) && E(v.owner).kind === 'Block' && numOf(v.def) != null).sort((a, b) => pathOf(a.id).localeCompare(pathOf(b.id), 'tr')); }
const tsInLabel = v => v ? (E(v.owner) ? E(v.owner).name + '.' : '') + v.name + (unitOf(v) ? ' [' + unitOf(v) + ']' : '') : '?';
function tsOutputs(){
  const out = [], seen = new Set();
  parContexts().forEach(b => { let r; try { r = parSolve(b); } catch(e){ return; } r.vals.filter(x => !x.given).forEach(x => { const k = 'par|' + b + '|' + x.v.id + '|' + (x.ctx || ''); if(seen.has(k)) return; seen.add(k); const c = x.ctx && E(x.ctx) ? E(x.ctx).name + '.' : ''; out.push({k, l:E(b).name + ' ▸ ' + c + x.v.name + (unitOf(x.v) ? ' [' + unitOf(x.v) + ']' : '') + ' (parametrik)'}); }); });
  const typed = new Set(Object.values(M.els).filter(p => p.kind === 'Part' && p.type).map(p => p.type));
  const props = budgetProps().filter(p => Object.values(M.els).some(v => v.kind === 'Value' && v.name === p && !/^(Boolean|String)$/.test(v.vtype || '')));
  Object.values(M.els).filter(b => b.kind === 'Block' && !typed.has(b.id) && kidsOf(b.id).some(p => p.kind === 'Part')).sort(sortEls).forEach(b => props.forEach(p => { if(rollup(b.id, p).total != null) out.push({k:'bud|' + b.id + '|' + p, l:b.name + ' ▸ Σ ' + p + (budgetUnit(p) ? ' [' + budgetUnit(p) + ']' : '') + ' (bütçe)'}); }));
  return out;
}
const tsOutLabel = k => { const o = tsOutputs().find(x => x.k === k); return o ? o.l : (k || '—'); };
function tsWithInputs(ov, f){
  const saved = [];
  try { Object.keys(ov).forEach(id => { const v = E(id); if(v){ saved.push([v, v.def]); v.def = String(+(+ov[id]).toPrecision(12)); } }); return f(); }
  finally { saved.forEach(([v, d]) => { v.def = d; }); }
}
function tsOuts(keys){
  const memo = new Map();
  return keys.map(key => {
    const p = String(key || '').split('|');
    try {
      if(p[0] === 'par'){ if(!memo.has(p[1])) memo.set(p[1], parSolve(p[1])); const x = memo.get(p[1]).vals.find(q => q.v.id === p[2] && (q.ctx || '') === (p[3] || '')); return x && x.val != null && isFinite(x.val) ? x.val : null; }
      if(p[0] === 'bud'){ const t = rollup(p[1], p.slice(2).join('|')).total; return t == null ? null : t; }
    } catch(e){ return null; }
    return null;
  });
}
/* ---------- süpürme ve tornado ---------- */
function tsSweep(sw){
  const v = E(sw && sw.inp), a = numOf(sw && sw.from), b = numOf(sw && sw.to), outs = (sw && sw.outs || []).filter(Boolean);
  if(!v || a == null || b == null || !outs.length) return null;
  const n = Math.max(2, Math.min(500, Math.round(numOf(sw.n) || 21))), xs = [], ys = outs.map(() => []);
  for(let i = 0; i < n; i++){ const x = a + (b - a) * i / (n - 1); const r = tsWithInputs({[v.id]:x}, () => tsOuts(outs)); xs.push(+x.toPrecision(12)); r.forEach((y, k) => ys[k].push(y)); }
  const nom = numOf(v.def), base = tsOuts(outs);
  const slope = outs.map((k, q) => { if(nom == null) return null; const h = Math.abs(nom) * 1e-4 || 1e-4, up = tsWithInputs({[v.id]:nom + h}, () => tsOuts([k]))[0], dn = tsWithInputs({[v.id]:nom - h}, () => tsOuts([k]))[0]; return up == null || dn == null ? null : (up - dn) / (2 * h); });
  return {inp:v, xs, ys, outs, nom, base, slope, elast:slope.map((s, q) => s == null || !base[q] || !nom ? null : s * nom / base[q])};
}
function tsTornado(outKey, pct){
  pct = pct || 10; const base = tsOuts([outKey])[0]; if(base == null) return {rows:[], base:null, pct, outName:tsOutLabel(outKey)};
  const rows = [];
  tsInputs().forEach(v => { const n = numOf(v.def); if(!n) return; const lo = tsWithInputs({[v.id]:n * (1 - pct / 100)}, () => tsOuts([outKey]))[0], hi = tsWithInputs({[v.id]:n * (1 + pct / 100)}, () => tsOuts([outKey]))[0]; if(lo == null || hi == null) return; const sw = Math.abs(hi - lo); if(sw > 1e-12 * Math.max(1, Math.abs(base))) rows.push({v, name:tsInLabel(v), lo, hi, sw}); });
  rows.sort((a, b) => b.sw - a.sw);
  return {rows, base, pct, outName:tsOutLabel(outKey), out:outKey};
}
/* ---------- Monte Carlo (tekrarlanabilir tohum) ---------- */
function tsRng(seed){ let a = (seed >>> 0) || 1; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const TS_DIST = [['uni', 'Düzgün (min–maks)'], ['norm', 'Normal (±3σ = min–maks)'], ['tri', 'Üçgen (min–nominal–maks)']];
function tsTol(v){ const t = v.tol || {}; return {lo:numOf(t.lo), hi:numOf(t.hi), dist:t.dist || 'uni'}; }
function tsDraw(rnd, t, nom){
  const lo = t.lo, hi = t.hi;
  if(t.dist === 'norm'){ const mu = (lo + hi) / 2, sd = (hi - lo) / 6; let u = 0; while(u === 0) u = rnd(); return mu + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rnd()); }
  if(t.dist === 'tri'){ const c = nom != null && nom >= lo && nom <= hi ? nom : (lo + hi) / 2, u = rnd(), F = (c - lo) / ((hi - lo) || 1); return u < F ? lo + Math.sqrt(u * (hi - lo) * (c - lo)) : hi - Math.sqrt((1 - u) * (hi - lo) * (hi - c)); }
  return lo + (hi - lo) * rnd();
}
function tsMonteCarlo(mc){
  const out = mc && mc.out; if(!out) return null;
  const ins = tsInputs().filter(v => { const t = tsTol(v); return t.lo != null && t.hi != null && t.hi >= t.lo; });
  const n = Math.max(10, Math.min(20000, Math.round(numOf(mc.n) || 1000))), rnd = tsRng(Math.round(numOf(mc.seed) || 1)), ys = [], X = ins.map(() => []);
  for(let s = 0; s < n; s++){
    const ov = {}; ins.forEach((v, k) => { const x = tsDraw(rnd, tsTol(v), numOf(v.def)); ov[v.id] = x; X[k].push(x); });
    ys.push(tsWithInputs(ov, () => tsOuts([out]))[0]);
  }
  const ok = ys.map((y, i) => [y, i]).filter(p => p[0] != null && isFinite(p[0])), Y = ok.map(p => p[0]);
  if(!Y.length) return {n, valid:0, ins, outName:tsOutLabel(out), err:'Çıktı hesaplanamadı'};
  const srt = Y.slice().sort((a, b) => a - b), q = p => srt[Math.min(srt.length - 1, Math.max(0, Math.round(p * (srt.length - 1))))];
  const mean = Y.reduce((s, y) => s + y, 0) / Y.length, sd = Math.sqrt(Y.reduce((s, y) => s + (y - mean) * (y - mean), 0) / Math.max(1, Y.length - 1));
  const nb = 30, mn = srt[0], mxv = srt[srt.length - 1], wd = (mxv - mn) / nb || 1, bins = [];
  for(let k = 0; k < nb; k++) bins.push({a:mn + k * wd, b:mn + (k + 1) * wd, n:0});
  Y.forEach(y => { bins[Math.min(nb - 1, Math.floor((y - mn) / wd))].n++; });
  const lim = numOf(mc.lim), limDir = mc.limDir || 'max', fail = lim == null ? null : Y.filter(y => limDir === 'min' ? y < lim : y > lim).length / Y.length;
  const corr = ins.map((v, k) => { const xs = ok.map(p => X[k][p[1]]), mx = xs.reduce((s, x) => s + x, 0) / xs.length; let sxy = 0, sxx = 0, syy = 0; xs.forEach((x, i) => { sxy += (x - mx) * (Y[i] - mean); sxx += (x - mx) * (x - mx); syy += (Y[i] - mean) * (Y[i] - mean); }); return {v, r:sxx && syy ? sxy / Math.sqrt(sxx * syy) : 0}; }).sort((a, b) => Math.abs(b.r) - Math.abs(a.r));
  return {n, valid:Y.length, ins, mean, sd, min:mn, max:mxv, p5:q(0.05), p50:q(0.5), p95:q(0.95), bins, lim, limDir, fail, corr, outName:tsOutLabel(out), ys:Y, out};
}
/* ---------- görünüm ---------- */
function tsNew(owner){
  snap();
  const t = mk('TradeStudy', owner || nearestPkg(ST.tsel || M.rootId), {alts:[], crit:[]});
  afterChange(); TSV.ts = t.id; TSV.tab = 'ts'; ST.tsel = t.id; openD('@tradestudy'); renderViewBar(); renderView();
  return t;
}
const tsSel = (k, v, opts, cls) => `<select data-tsf="${k}" class="${cls || ''}">${opts.map(o => `<option value="${esc(o[0])}"${String(o[0]) === String(v) ? ' selected' : ''}>${esc(o[1])}</option>`).join('')}</select>`;
function tradeHTML(){
  const ts = tsCur();
  if(!ts) return `<div class="vempty">Henüz trade study yok.<br><br><button class="vb pri" data-tsa="new">Yeni trade study…</button><br><br><span class="muted">Tasarım alternatiflerini (bloklar veya örnek konfigürasyonları) ağırlıklı MOE/MOP kriterleriyle karşılaştırın. Değerler bütçe motorundan (part ağacı toplamı), parametrik çözücünün sonuçlarından ve örnek slotlarından alınır.</span></div>`;
  if(TSV.tab === 'sw') return tsSweepHTML(ts);
  if(TSV.tab === 'mc') return tsMcHTML(ts);
  const R = tsEval(ts), props = tsProps(ts), used = new Set(ts.alts || []);
  let h = `<div class="tsw"><h3 class="noi18n">${esc(ts.name || '')}</h3><div class="tsgrid"><div><div class="sub"><span>Alternatifler (${R.alts.length})</span></div>`;
  h += R.alts.map((a, i) => `<div class="li"><span class="tsdot" style="background:${TS_COL[i % TS_COL.length]}"></span> <a class="lnk noi18n" data-goto="${a.id}">${esc(tsAltName(a))}</a> <span class="muted">${a.kind === 'Instance' ? 'örnek' : 'blok'}</span> <button class="vb" data-tsa="altdel" data-i="${i}" title="Alternatifi çıkar">✕</button></div>`).join('');
  h += `<div class="li">${tsSel('altadd', '', [['', '+ Alternatif ekle…']].concat(tsAltCands().filter(e => !used.has(e.id)).map(e => [e.id, pathOf(e.id) + (e.kind === 'Instance' ? ' (örnek)' : '')])))}</div></div>`;
  h += `<div><div class="sub"><span>Kriterler (MOE / MOP)</span></div><div style="overflow-x:auto"><table class="rt fmt tsc"><thead><tr><th>Kriter</th><th>Özellik</th><th>Ağırlık</th><th>Yön</th><th>Sınır</th><th></th></tr></thead><tbody>`;
  (ts.crit || []).forEach((c, j) => { h += `<tr><td><input class="fmsel noi18n" data-tsc="${j}|name" value="${esc(c.name || '')}" style="width:120px"></td><td>${tsSel('', c.prop || '', [['', '—']].concat(props.map(p => [p, p + (budgetUnit(p) ? ' [' + budgetUnit(p) + ']' : '')])), 'tscp').replace('data-tsf=""', `data-tsc="${j}|prop"`)}</td><td><input class="fmsel" data-tsc="${j}|w" value="${esc(c.w == null ? '1' : String(c.w))}" style="width:50px"></td><td>${tsSel('', c.dir || 'max', [['max', 'büyük iyi ↑'], ['min', 'küçük iyi ↓']]).replace('data-tsf=""', `data-tsc="${j}|dir"`)}</td><td><input class="fmsel" data-tsc="${j}|lim" value="${esc(c.lim == null ? '' : String(c.lim))}" placeholder="—" title="Eleme sınırı: bunu sağlamayan alternatif elenir" style="width:60px"></td><td><button class="vb" data-tsa="crdel" data-i="${j}" title="Kriteri sil">✕</button></td></tr>`; });
  h += `</tbody></table></div><button class="vb" data-tsa="cradd">+ Kriter</button> <span class="muted">Ağırlıklar toplamı ${R.Ws ? fmtNum(R.Ws) : '0'}; puanlar ağırlıklara göre normalleştirilir.</span></div></div>`;
  if(R.alts.length && R.crit.length){
    h += `<div class="sub"><span>Sonuç matrisi</span></div><table class="rt fmt"><thead><tr><th>#</th><th>Alternatif</th>${R.crit.map((c, j) => `<th class="noi18n">${esc(c.name || c.prop)}<div class="muted">${esc(c.prop)}${budgetUnit(c.prop) ? ' [' + esc(budgetUnit(c.prop)) + ']' : ''} · w=${fmtNum(R.W[j])} ${c.dir === 'min' ? '↓' : '↑'}</div></th>`).join('')}<th>Puan</th></tr></thead><tbody>`;
    R.order.forEach((i, rk) => { const a = R.alts[i], el = R.elim[i].length; h += `<tr data-row="${a.id}" class="${rk === 0 && !el ? 'tswin' : ''}${el ? ' tsel' : ''}"><td>${el ? '—' : rk + 1}</td><td class="noi18n"><span class="tsdot" style="background:${TS_COL[i % TS_COL.length]}"></span> <b>${esc(tsAltName(a))}</b>${el ? `<div class="muted">elendi: ${esc(R.elim[i].join(', '))}</div>` : ''}</td>${R.crit.map((c, j) => { const x = R.raw[i][j]; return `<td>${x == null ? '<span class="muted">değer yok</span>' : tsF(x)}<div class="tsbar"><i style="width:${(R.util[i][j] * 100).toFixed(0)}%"></i></div></td>`; }).join('')}<td><b>${R.score[i].toFixed(1)}</b></td></tr>`; });
    h += '</tbody></table>';
    const nc = R.crit.length, px = Math.min(TSV.px, nc - 1), py = Math.min(TSV.py, nc - 1);
    h += `<div class="tsgrid"><div><div class="sub"><span>Radar (normalleştirilmiş fayda)</span></div><div class="tschart">${tsRadarSVG(R).str}</div></div><div><div class="sub"><span>Pareto</span></div><div class="li">X ${tsSel('px', px, R.crit.map((c, j) => [j, c.name || c.prop]))} Y ${tsSel('py', py, R.crit.map((c, j) => [j, c.name || c.prop]))}</div><div class="tschart">${tsParetoSVG(R, px, py).str}</div><div class="muted">Dolu noktalar Pareto cephesinde (başka hiçbir alternatif her iki kriterde de daha iyi değil).</div></div></div>`;
    const ws = tsWeightSens(ts);
    if(ws.length && !R.elim[R.order[0]].length) h += `<div class="sub"><span>Ağırlık duyarlılığı — kazanan: ${esc(tsAltName(R.alts[R.order[0]]))}</span></div><table class="rt fmt"><thead><tr><th>Kriter</th><th>Kazananın korunduğu ağırlık çarpanı</th><th>Değişirse öne geçen</th></tr></thead><tbody>${ws.map(w => `<tr><td class="noi18n">${esc(w.c.name || w.c.prop)}</td><td>${w.lo == null ? '—' : '×' + fmtNum(w.lo) + ' – ×' + fmtNum(w.hi)} ${w.robust ? '<span class="pill ok">sağlam</span>' : ''}</td><td class="noi18n">${w.other ? esc(tsAltName(w.other)) : '—'}</td></tr>`).join('')}</tbody></table>`;
  } else h += `<div class="vempty">Karşılaştırma için en az bir alternatif ve bir kriter ekleyin.</div>`;
  return h + '</div>';
}
function tsSweepHTML(ts){
  const sw = ts.sw || {}, ins = tsInputs(), outs = tsOutputs();
  let h = `<div class="tsw"><h3>Parametrik süpürme (duyarlılık)</h3>`;
  if(!ins.length || !outs.length) return h + `<div class="vempty">Süpürme için sayısal varsayılan değeri olan value property'ler ve hesaplanan bir çıktı (parametrik kısıt veya bütçe toplamı) gerekir.</div></div>`;
  h += `<div class="li">Girdi ${tsSel('swinp', sw.inp || '', [['', '—']].concat(ins.map(v => [v.id, tsInLabel(v) + ' = ' + v.def])))} Başlangıç <input class="fmsel" data-tsf="swfrom" value="${esc(sw.from == null ? '' : sw.from)}" style="width:70px"> Bitiş <input class="fmsel" data-tsf="swto" value="${esc(sw.to == null ? '' : sw.to)}" style="width:70px"> Adım <input class="fmsel" data-tsf="swn" value="${esc(sw.n == null ? '21' : sw.n)}" style="width:50px"></div>`;
  h += `<div class="li">Çıktılar: ${(sw.outs || []).map((k, i) => `<span class="pill noi18n" style="border-color:${TS_COL[i % TS_COL.length]}">${esc(tsOutLabel(k))} <a class="lnk" data-tsa="swodel" data-i="${i}">✕</a></span>`).join(' ')} ${tsSel('swoadd', '', [['', '+ Çıktı ekle…']].concat(outs.filter(o => !(sw.outs || []).includes(o.k)).map(o => [o.k, o.l])))} <button class="vb pri" data-tsa="swrun">Süpür</button></div>`;
  const R = TSV.sw && TSV.sw.ts === ts.id ? TSV.sw.r : null;
  if(R){
    h += `<div class="tschart">${tsLineSVG(R.xs, R.outs.map((k, q) => ({name:tsOutLabel(k), y:R.ys[q]})), {xl:tsInLabel(R.inp), mark:R.nom}).str}</div>`;
    h += `<table class="rt fmt"><thead><tr><th>Çıktı</th><th>Nominalde</th><th>Eğim (dÇ/dG)</th><th>Esneklik (%/%)</th><th>Aralıkta min</th><th>Aralıkta maks</th></tr></thead><tbody>${R.outs.map((k, q) => { const ys = R.ys[q].filter(y => y != null); return `<tr><td class="noi18n">${esc(tsOutLabel(k))}</td><td>${tsF(R.base[q])}</td><td>${tsF(R.slope[q])}</td><td>${R.elast[q] == null ? '—' : R.elast[q].toFixed(3)}</td><td>${ys.length ? tsF(Math.min(...ys)) : '—'}</td><td>${ys.length ? tsF(Math.max(...ys)) : '—'}</td></tr>`; }).join('')}</tbody></table>`;
  }
  const tout = (sw.outs || [])[0];
  h += `<div class="sub"><span>Tornado — tüm girdiler ±%<input class="fmsel" data-tsf="torpct" value="${esc(String(ts.torPct || 10))}" style="width:40px"></span></div><div class="li">Çıktı ${tsSel('torout', ts.torOut || tout || '', [['', '—']].concat(outs.map(o => [o.k, o.l])))} <button class="vb" data-tsa="torrun">Tornado hesapla</button></div>`;
  const T = TSV.tor && TSV.tor.ts === ts.id ? TSV.tor.r : null;
  if(T) h += `<div class="tschart">${tsTornadoSVG(T).str}</div><div class="muted">Mavi: girdi −%${T.pct}, turuncu: girdi +%${T.pct}. Uzun çubuklar çıktıyı en çok etkileyen girdilerdir.</div>`;
  return h + '</div>';
}
function tsMcHTML(ts){
  const mc = ts.mc || {}, outs = tsOutputs(), ins = tsInputs();
  let h = `<div class="tsw"><h3>Monte Carlo — toleranslı değerlerle istatistiksel dağılım</h3>`;
  if(!outs.length) return h + `<div class="vempty">Hesaplanan bir çıktı (parametrik kısıt veya bütçe toplamı) gerekir.</div></div>`;
  h += `<div class="li">Çıktı ${tsSel('mcout', mc.out || '', [['', '—']].concat(outs.map(o => [o.k, o.l])))} Örnek sayısı <input class="fmsel" data-tsf="mcn" value="${esc(mc.n == null ? '1000' : mc.n)}" style="width:60px"> Tohum <input class="fmsel" data-tsf="mcseed" value="${esc(mc.seed == null ? '1' : mc.seed)}" style="width:40px"> Sınır <input class="fmsel" data-tsf="mclim" value="${esc(mc.lim == null ? '' : mc.lim)}" placeholder="—" style="width:70px"> ${tsSel('mclimdir', mc.limDir || 'max', [['max', 'üst sınır (aşmamalı)'], ['min', 'alt sınır (altına düşmemeli)']])} <button class="vb pri" data-tsa="mcrun">Çalıştır</button></div>`;
  let rel = ins;
  if(mc.out){ const T = tsTornado(mc.out, 10), ids = new Set(T.rows.map(r => r.v.id)); rel = ins.filter(v => ids.has(v.id) || v.tol); }
  h += `<div class="sub"><span>Toleranslar (${rel.length} etkili girdi)</span></div><table class="rt fmt"><thead><tr><th>Girdi</th><th>Nominal</th><th>Min</th><th>Maks</th><th>Dağılım</th><th></th></tr></thead><tbody>${rel.map(v => { const t = v.tol || {}; return `<tr><td class="noi18n">${esc(tsInLabel(v))}</td><td>${esc(v.def)}</td><td><input class="fmsel" data-tst="${v.id}|lo" value="${esc(t.lo == null ? '' : t.lo)}" style="width:70px"></td><td><input class="fmsel" data-tst="${v.id}|hi" value="${esc(t.hi == null ? '' : t.hi)}" style="width:70px"></td><td>${tsSel('', t.dist || 'uni', TS_DIST).replace('data-tsf=""', `data-tst="${v.id}|dist"`)}</td><td><button class="vb" data-tsa="tolpct" data-v="${v.id}" title="Nominalin ±%5'i">±5%</button></td></tr>`; }).join('')}</tbody></table>`;
  const R = TSV.mc && TSV.mc.ts === ts.id ? TSV.mc.r : null;
  if(R && R.err) h += `<div class="vempty">${esc(R.err)}</div>`;
  else if(R){
    h += `<div class="tschart">${tsHistSVG(R, R.lim).str}</div><table class="rt fmt"><tbody><tr><th>Ortalama μ</th><td>${tsF(R.mean)}</td><th>Std. sapma σ</th><td>${tsF(R.sd)}</td><th>Min</th><td>${tsF(R.min)}</td><th>Maks</th><td>${tsF(R.max)}</td></tr><tr><th>P5</th><td>${tsF(R.p5)}</td><th>Medyan</th><td>${tsF(R.p50)}</td><th>P95</th><td>${tsF(R.p95)}</td><th>Geçerli örnek</th><td>${R.valid} / ${R.n}</td></tr>${R.fail != null ? `<tr><th>Sınırı ihlal olasılığı</th><td colspan="7"><b class="${R.fail > 0.05 ? 'tsbad' : 'tsok'}">%${(R.fail * 100).toFixed(2)}</b> (${R.limDir === 'min' ? 'çıktı < ' : 'çıktı > '}${tsF(R.lim)})</td></tr>` : ''}</tbody></table>`;
    if(R.corr.length) h += `<div class="sub"><span>Varyansa katkı (korelasyon)</span></div><table class="rt fmt"><thead><tr><th>Girdi</th><th>r</th><th>r²</th></tr></thead><tbody>${R.corr.map(c => `<tr><td class="noi18n">${esc(tsInLabel(c.v))}</td><td>${c.r.toFixed(3)}</td><td><div class="tsbar"><i style="width:${(c.r * c.r * 100).toFixed(0)}%"></i></div></td></tr>`).join('')}</tbody></table>`;
    else h += `<div class="muted">Toleransı tanımlı girdi yok: çıktı sabit. Yukarıdaki tabloda min/maks girin.</div>`;
  }
  return h + '</div>';
}
function tradeBar(){
  const ts = tsCur(), all = allTS();
  const tab = (k, t) => `<button class="vb${TSV.tab === k ? ' pri' : ''}" data-tsa="tab" data-k="${k}">${t}</button>`;
  return `${all.length ? `<label>Çalışma ${tsSel('ts', ts ? ts.id : '', all.map(t => [t.id, t.name || '']), 'noi18n')}</label>` : ''}<button class="vb" data-tsa="new">Yeni…</button><span class="vsep"></span>${tab('ts', 'Trade study')}${tab('sw', 'Duyarlılık süpürmesi')}${tab('mc', 'Monte Carlo')}<span class="vsep"></span><button class="vb" data-tsa="calc" title="Kısıt denklemlerini çözüp sonuçları değerlere yaz">Parametrik hesapla</button><button class="vb" data-tsa="xl">Excel</button><button class="vb" data-tsa="png">PNG</button>`;
}
VIEWS['@tradestudy'] = {tr:'Trade Study ve Duyarlılık', ic:'TS', note:'Tasarım alternatiflerini (bloklar veya örnek konfigürasyonları) <b>ağırlıklı MOE/MOP kriterleriyle</b> karşılaştırın: değerler bütçe motoru, parametrik çözücü ve örnek slotlarından gelir; Radar ve Pareto grafikleri, eleme sınırları ve ağırlık duyarlılığı.<br><br><b>Duyarlılık süpürmesi:</b> bir girdiyi aralıkta tarayıp çıktı eğrisini çizer; <b>Tornado</b> tüm girdileri ±% değiştirir.<br><br><b>Monte Carlo:</b> min/maks toleranslı girdilerden örnekleyerek dağılım, yüzdelikler ve sınır ihlal olasılığını hesaplar.', render:tradeHTML, bar:tradeBar, status:() => allTS().length + ' trade study'};
GO_EXT.TradeStudy = e => { TSV.ts = e.id; TSV.tab = 'ts'; ST.tsel = e.id; openD('@tradestudy'); };
PROPS_EXT.TradeStudy = (el, pf) => { const R = tsEval(el), w = R.alts.length && R.crit.length && !R.elim[R.order[0]].length ? R.alts[R.order[0]] : null; return pf('Alternatif', String(R.alts.length)) + pf('Kriter', String(R.crit.length)) + pf('Önde', w ? `<span class="noi18n">${esc(tsAltName(w))}</span> (${R.score[R.order[0]].toFixed(1)})` : '—') + pf('', `<button class="pbtn" data-goto="${el.id}">Trade study'yi aç</button>`); };
HOOKS.menu.analysis.push(r => { let i = r.findIndex(x => x && x.t && /^Bütçe/.test(x.t)); if(i < 0) i = r.length - 1; r.splice(i + 1, 0, {t:'Trade study (alternatif karşılaştırma)', f:() => { TSV.tab = 'ts'; openD('@tradestudy'); }}, {t:'Duyarlılık süpürmesi ve tornado', f:() => { TSV.tab = 'sw'; openD('@tradestudy'); }}, {t:'Monte Carlo tolerans analizi', f:() => { TSV.tab = 'mc'; openD('@tradestudy'); }}); });
/* ---------- dışa aktarım ---------- */
function tsXlsx(){
  const ts = tsCur(); if(!ts) return toast('Trade study yok');
  const S = [], R = tsEval(ts);
  if(R.alts.length && R.crit.length){
    const rows = [['Sıra', 'Alternatif'].concat(R.crit.map(c => (c.name || c.prop) + ' (' + c.prop + (budgetUnit(c.prop) ? ', ' + budgetUnit(c.prop) : '') + ')')).concat(['Puan', 'Elendi']).map(v => ({v, s:1}))];
    rows.push(['', 'Ağırlık'].concat(R.W).concat(['', '']));
    rows.push(['', 'Yön'].concat(R.crit.map(c => c.dir === 'min' ? 'küçük iyi' : 'büyük iyi')).concat(['', '']));
    R.order.forEach((i, rk) => rows.push([R.elim[i].length ? '' : rk + 1, tsAltName(R.alts[i])].concat(R.raw[i].map(x => x == null ? '' : x)).concat([+R.score[i].toFixed(2), R.elim[i].join(', ')])));
    S.push({name:'Trade Study', rows, widths:[6, 30].concat(R.crit.map(() => 16)).concat([10, 20]), header:true, freeze:[1, 2]});
  }
  const sw = TSV.sw && TSV.sw.ts === ts.id ? TSV.sw.r : null;
  if(sw) S.push({name:'Süpürme', rows:[[tsInLabel(sw.inp)].concat(sw.outs.map(tsOutLabel)).map(v => ({v, s:1}))].concat(sw.xs.map((x, i) => [x].concat(sw.ys.map(y => y[i] == null ? '' : y[i])))), widths:[22].concat(sw.outs.map(() => 30)), header:true, freeze:[1, 1]});
  const T = TSV.tor && TSV.tor.ts === ts.id ? TSV.tor.r : null;
  if(T && T.rows.length) S.push({name:'Tornado', rows:[['Girdi', '−%' + T.pct, '+%' + T.pct, 'Salınım'].map(v => ({v, s:1}))].concat(T.rows.map(r => [r.name, r.lo, r.hi, r.sw])), widths:[34, 16, 16, 16], header:true, freeze:[1, 1]});
  const mc = TSV.mc && TSV.mc.ts === ts.id ? TSV.mc.r : null;
  if(mc && !mc.err){
    S.push({name:'Monte Carlo', rows:[['İstatistik', 'Değer'].map(v => ({v, s:1})), ['Çıktı', mc.outName], ['Örnek', mc.valid], ['Ortalama', mc.mean], ['Std. sapma', mc.sd], ['Min', mc.min], ['P5', mc.p5], ['Medyan', mc.p50], ['P95', mc.p95], ['Maks', mc.max]].concat(mc.fail != null ? [['Sınır', mc.lim], ['İhlal olasılığı', mc.fail]] : []).concat([[''], ['Aralık başı', 'Aralık sonu', 'Adet'].map(v => ({v, s:1}))]).concat(mc.bins.map(b => [b.a, b.b, b.n])), widths:[22, 22, 12], header:true});
    S.push({name:'MC Örnekler', rows:[['#', mc.outName].map(v => ({v, s:1}))].concat(mc.ys.map((y, i) => [i + 1, y])), widths:[8, 22], header:true, freeze:[1, 0]});
  }
  if(!S.length) return toast('Dışa aktarılacak sonuç yok');
  download(buildXlsx(S), fileSafe(ts.name || 'Trade Study') + '.xlsx');
}
async function tsPng(){
  const ts = tsCur(); if(!ts) return toast('Trade study yok');
  let r = null, nm2 = '';
  if(TSV.tab === 'ts'){ const R = tsEval(ts); if(R.crit.length >= 3) r = tsRadarSVG(R), nm2 = 'Radar'; else r = tsParetoSVG(R, TSV.px, TSV.py), nm2 = 'Pareto'; }
  else if(TSV.tab === 'sw'){ const R = TSV.sw && TSV.sw.ts === ts.id ? TSV.sw.r : null; if(R) r = tsLineSVG(R.xs, R.outs.map((k, q) => ({name:tsOutLabel(k), y:R.ys[q]})), {xl:tsInLabel(R.inp), mark:R.nom}), nm2 = 'Süpürme'; }
  else { const R = TSV.mc && TSV.mc.ts === ts.id ? TSV.mc.r : null; if(R && !R.err) r = tsHistSVG(R, R.lim), nm2 = 'Monte Carlo'; }
  if(!r) return toast('Önce hesaplama yapın');
  const bl = await svgToPng(r, 2); download(new Blob([bl], {type:'image/png'}), fileSafe(ts.name || 'Trade Study') + ' - ' + nm2 + '.png');
}
/* ---------- olaylar ---------- */
(() => {
  const V = $('#view'), on = () => ST.cur === '@tradestudy';
  const save = f => { const ts = tsCur(); if(!ts) return; snap(); f(ts); afterChange(); renderView(); };
  V.addEventListener('keydown', ev => { if(on() && ev.target.matches && ev.target.matches('input,select')){ ev.stopPropagation(); if(ev.key === 'Enter') ev.target.blur(); } });
  V.addEventListener('change', ev => {
    if(!on()) return; const t = ev.target, ts = tsCur();
    if(t.dataset.tsc){ const [j, f] = t.dataset.tsc.split('|'); save(s => { const c = s.crit[+j]; if(!c) return; const v = t.value.trim(); if(f === 'w' || f === 'lim') c[f] = v === '' ? (f === 'w' ? 1 : null) : (numOf(v) == null ? c[f] : numOf(v)); else c[f] = v; if(f === 'prop' && !c.name) c.name = v; }); return; }
    if(t.dataset.tst){ const [id, f] = t.dataset.tst.split('|'), v = E(id); if(!v) return; snap(); const tol = Object.assign({}, v.tol || {}); const x = t.value.trim(); if(f === 'dist') tol.dist = x; else if(x === '') delete tol[f]; else if(numOf(x) != null) tol[f] = numOf(x); if(tol.lo == null && tol.hi == null) delete v.tol; else v.tol = tol; afterChange(); renderView(); return; }
    const k = t.dataset.tsf; if(!k) return;
    if(k === 'ts'){ TSV.ts = t.value; renderViewBar(); renderView(); return; }
    if(k === 'px' || k === 'py'){ TSV[k] = +t.value; renderView(); return; }
    if(!ts) return;
    if(k === 'altadd' && t.value) return save(s => { s.alts = (s.alts || []).concat([t.value]); if(!(s.crit || []).length){ s.crit = tsProps(s).slice(0, 4).map(p => ({id:uid(), name:p, prop:p, w:1, dir:/kütle|maliyet|güç|tüketim|mass|cost|power|hacim|ağırlık/i.test(p) ? 'min' : 'max'})); } });
    if(k === 'swinp') return save(s => { const v = E(t.value), n = v ? numOf(v.def) : null; s.sw = Object.assign({}, s.sw || {}, {inp:t.value}); if(n != null){ s.sw.from = +(n * 0.5).toPrecision(6); s.sw.to = +(n * 1.5).toPrecision(6); } });
    if(k === 'swfrom' || k === 'swto' || k === 'swn') return save(s => { s.sw = Object.assign({}, s.sw || {}); s.sw[k.slice(2)] = numOf(t.value); });
    if(k === 'swoadd' && t.value) return save(s => { s.sw = Object.assign({}, s.sw || {}); s.sw.outs = (s.sw.outs || []).concat([t.value]); });
    if(k === 'torpct') return save(s => { s.torPct = Math.max(1, Math.min(90, numOf(t.value) || 10)); });
    if(k === 'torout') return save(s => { s.torOut = t.value; });
    if(k.startsWith('mc')) return save(s => { s.mc = Object.assign({}, s.mc || {}); const f = {mcout:'out', mcn:'n', mcseed:'seed', mclim:'lim', mclimdir:'limDir'}[k]; s.mc[f] = f === 'out' || f === 'limDir' ? t.value : numOf(t.value); });
  });
  document.addEventListener('click', ev => {
    if(!on()) return; const b = ev.target.closest('[data-tsa]'); if(!b) return;
    const a = b.dataset.tsa, ts = tsCur();
    if(a === 'new') return quickForm('Yeni trade study', [{k:'name', l:'Ad', v:'Alternatif değerlendirmesi'}, {k:'own', l:'Paket', t:'select', v:nearestPkg(ST.tsel || M.rootId), opts:Object.values(M.els).filter(e => e.kind === 'Package' || e.kind === 'Model').sort(sortEls).map(e => [e.id, pathOf(e.id) || e.name])}], v => { const t = tsNew(v.own); t.name = v.name || t.name; renderTree(); renderView(); });
    if(a === 'tab'){ TSV.tab = b.dataset.k; renderViewBar(); renderView(); return; }
    if(a === 'xl') return tsXlsx();
    if(a === 'png') return tsPng();
    if(a === 'calc'){ parSolveAll(true); renderView(); toast('Parametrik değerler güncellendi'); return; }
    if(!ts) return;
    if(a === 'altdel') return save(s => { s.alts.splice(+b.dataset.i, 1); });
    if(a === 'cradd') return save(s => { s.crit = (s.crit || []).concat([{id:uid(), name:'', prop:'', w:1, dir:'max'}]); });
    if(a === 'crdel') return save(s => { s.crit.splice(+b.dataset.i, 1); });
    if(a === 'swodel') return save(s => { s.sw.outs.splice(+b.dataset.i, 1); });
    if(a === 'swrun'){ const r = tsSweep(ts.sw); if(!r) return toast('Girdi, aralık ve en az bir çıktı seçin'); TSV.sw = {ts:ts.id, r}; renderView(); return; }
    if(a === 'torrun'){ const k = ts.torOut || (ts.sw && ts.sw.outs || [])[0]; if(!k) return toast('Çıktı seçin'); TSV.tor = {ts:ts.id, r:tsTornado(k, ts.torPct || 10)}; renderView(); return; }
    if(a === 'mcrun'){ if(!(ts.mc && ts.mc.out)) return toast('Çıktı seçin'); const t0 = performance.now(), r = tsMonteCarlo(ts.mc); TSV.mc = {ts:ts.id, r}; renderView(); toast(`${r.n} örnek ${Math.round(performance.now() - t0)} ms`); return; }
    if(a === 'tolpct'){ const v = E(b.dataset.v), n = v ? numOf(v.def) : null; if(n == null) return; snap(); v.tol = Object.assign({dist:'norm'}, v.tol || {}, {lo:+(n * 0.95).toPrecision(8), hi:+(n * 1.05).toPrecision(8)}); afterChange(); renderView(); return; }
  });
})();
const tsCss = document.createElement('style');
tsCss.textContent = `.tsw{padding:10px 14px}.tsw h3{margin:4px 0 8px;font-size:15px}.tsgrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(380px,1fr));gap:14px;align-items:start}.tsdot{display:inline-block;width:10px;height:10px;border-radius:2px;vertical-align:middle}.tsbar{height:4px;background:var(--line,#e3e6ea);margin-top:3px;min-width:60px}.tsbar i{display:block;height:100%;background:#1f6fd1}tr.tswin td{background:rgba(39,174,96,.10)}tr.tsel td{color:#999}.tschart{overflow:auto;margin:6px 0}.tschart svg{max-width:100%;height:auto;border:1px solid var(--line,#e3e6ea)}.tsbad{color:#c0392b}.tsok{color:#27ae60}.tsw .li{margin:4px 0}`;
document.head.appendChild(tsCss);
/* ---------- doğrulama ve rapor ---------- */
VALIDATORS.push((add, els) => {
  els.filter(e => e.kind === 'TradeStudy').forEach(t => {
    const R = tsEval(t);
    if(R.alts.length < 2) add('uyarı', 'Trade study alternatifi', t, 'Karşılaştırma için en az iki alternatif gerekli');
    if(!R.crit.length) add('uyarı', 'Trade study kriteri', t, 'Kriter tanımlı değil');
    else if(!R.Ws) add('hata', 'Trade study ağırlığı', t, 'Kriter ağırlıklarının toplamı sıfır');
    R.alts.forEach((a, i) => { if(R.miss[i]) add('uyarı', 'Trade study eksik değer', t, `${tsAltName(a)}: ${R.miss[i]} kriterde değer yok`); });
  });
});
RPT_SECTIONS.push(['trade', 'Trade study ve alternatif değerlendirmesi']);
RPT_EXT.push((o, H, Pp, TB, B, sec, figRef) => {
  if(!o.trade) return sec;
  const ts = allTS().filter(t => (t.alts || []).length && (t.crit || []).length); if(!ts.length) return sec;
  H(1, `${++sec}. Trade study ve alternatif değerlendirmesi`);
  ts.forEach(t => {
    const R = tsEval(t); H(2, t.name || 'Trade study');
    if(t.doc) Pp(t.doc);
    TB(['Kriter', 'Özellik', 'Ağırlık', 'Yön', 'Sınır'], R.crit.map((c, j) => [c.name || c.prop, c.prop + (budgetUnit(c.prop) ? ' [' + budgetUnit(c.prop) + ']' : ''), fmtNum(R.W[j]), c.dir === 'min' ? 'küçük iyi' : 'büyük iyi', c.lim == null ? '—' : String(c.lim)]), [24, 24, 12, 18, 12]);
    TB(['Sıra', 'Alternatif'].concat(R.crit.map(c => c.name || c.prop)).concat(['Puan']), R.order.map((i, rk) => [R.elim[i].length ? 'elendi' : String(rk + 1), tsAltName(R.alts[i])].concat(R.raw[i].map(x => x == null ? '—' : tsF(x))).concat([R.score[i].toFixed(1)])), [8, 26].concat(R.crit.map(() => 14)).concat([10]));
    const w = R.alts[R.order[0]]; if(w && !R.elim[R.order[0]].length) Pp(`Önerilen alternatif: ${tsAltName(w)} (${R.score[R.order[0]].toFixed(1)} puan).`);
    if(R.crit.length >= 3 && typeof figRef === 'function') B.push({t:'img', r:tsRadarSVG(R), cap:`Şekil ${figRef()} – ${t.name || 'Trade study'} radar grafiği`});
  });
  return sec;
});
/* ---------- örnek model ---------- */
DEMO_EXT.push(X => {
  const pk = mk('Package', M.rootId, {name:'Güç Kaynağı Alternatifleri'});
  const alt = (n, v) => { const b = mk('Block', pk.id, {name:n}); Object.entries(v).forEach(([k, d]) => mk('Value', b.id, {name:k, vtype:'Real', def:String(d), unit:{kütle:'kg', maliyet:'k€', kapasite:'Wh', çevrimÖmrü:'çevrim'}[k] || ''})); return b; };
  const a1 = alt('Li-ion Paket', {kütle:3.1, maliyet:42, kapasite:900, çevrimÖmrü:1500}), a2 = alt('LiFePO4 Paket', {kütle:4.4, maliyet:35, kapasite:820, çevrimÖmrü:4000}), a3 = alt('NiMH Paket', {kütle:5.6, maliyet:22, kapasite:600, çevrimÖmrü:900});
  mk('TradeStudy', pk.id, {name:'Batarya seçimi', doc:'Görev süresi ve kütle bütçesi açısından batarya teknolojisi seçimi.', alts:[a1.id, a2.id, a3.id], crit:[
    {id:uid(), name:'Kütle', prop:'kütle', w:3, dir:'min', lim:5.5}, {id:uid(), name:'Maliyet', prop:'maliyet', w:2, dir:'min'}, {id:uid(), name:'Kapasite', prop:'kapasite', w:4, dir:'max'}, {id:uid(), name:'Ömür', prop:'çevrimÖmrü', w:1, dir:'max'}]});
});

