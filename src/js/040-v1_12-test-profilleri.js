/* ================= v1.12: ÇEVRESEL TEST PROFİLLERİ (PSD, SİNÜS, SRS, TERMAL) ================= */
const DEMO_EXT = []; /* örnek modele eklenti: f({S5, tPkg, rqPkg, open}) */
const VALIDATORS = []; /* model doğrulama eklentileri: f(add, els, idx) */
VALIDATORS.push((add, els) => {
  els.filter(e => e.kind === 'TestProfile').forEach(p => {
    const pts = pfPts(p), t = p.ptype || 'psd';
    if(pts.length < 2) add('hata', 'Eksik test profili', p, 'En az iki kırılma noktası gerekli');
    if(t !== 'thermal' && pts.some(q => q[0] <= 0 || q[1] <= 0)) add('uyarı', 'Test profili değeri', p, 'Frekans ve genlik sıfırdan büyük olmalı (log ölçek)');
    if(new Set(pts.map(q => q[0])).size < pts.length && t !== 'thermal') add('uyarı', 'Test profili değeri', p, 'Aynı frekansta birden fazla nokta var');
    if(!allTests().some(x => (x.profiles || []).includes(p.id))) add('bilgi', 'Kullanılmayan test profili', p, 'Hiçbir test durumuna bağlı değil');
  });
  els.filter(e => e.kind === 'TestCase' && /titre|vibra|şok|shock|sıcak|termal|thermal|akustik/i.test(e.name + ' ' + (e.std || '')) && !(e.profiles || []).length).forEach(tc => add('bilgi', 'Profilsiz çevresel test', tc, 'Çevresel test durumuna test profili bağlanmamış'));
});
const G0 = 9.80665;
const PT = {
  psd:{tr:'Rastgele titreşim (PSD)', sh:'PSD', x:'Frekans (Hz)', y:'ASD (g²/Hz)', xu:'Hz', yu:'g²/Hz', log:true, db:10, col:'#1f6fd1'},
  sine:{tr:'Sinüs süpürme', sh:'Sinüs', x:'Frekans (Hz)', y:'Genlik (g tepe)', xu:'Hz', yu:'g', log:true, db:20, col:'#7a4fbf'},
  srs:{tr:'Şok tepki spektrumu (SRS)', sh:'SRS', x:'Doğal frekans (Hz)', y:'Tepe ivme (g)', xu:'Hz', yu:'g', log:true, db:20, col:'#c0392b'},
  thermal:{tr:'Termal döngü', sh:'Termal', x:'Zaman (dk)', y:'Sıcaklık (°C)', xu:'dk', yu:'°C', log:false, col:'#d35400'}
};
const PF_DEF = {
  psd:{pts:[[20, 0.01], [80, 0.04], [350, 0.04], [2000, 0.007]], tol:3, dur:'60', axes:'X, Y, Z'},
  sine:{pts:[[5, 0.5], [50, 2], [500, 2]], rate:1, sweeps:2, axes:'X, Y, Z'},
  srs:{pts:[[100, 50], [2000, 2000], [10000, 2000]], q:10, tol:6, shocks:3, axes:'±X, ±Y, ±Z'},
  thermal:{pts:[[0, 25], [30, -40], [90, -40], [150, 71], [210, 71], [240, 25]], cycles:10}
};
Object.assign(KIND, {TestProfile:{tr:'Test Profili', en:'TestProfile', ic:'∿', col:'#0f8a8a', w:230, h:180}});
FILL.TestProfile = '#f2fbfb';
BASE.TestProfile = 'Profil';
['Model', 'Package'].forEach(k => { if(!OWN[k].includes('TestProfile')) OWN[k].push('TestProfile'); });
RANK.splice(RANK.indexOf('TestCase') + 1, 0, 'TestProfile');
DT.req.shapes.splice(DT.req.shapes.indexOf('TestCase') + 1, 0, 'TestProfile');
const allProfiles = () => Object.values(M.els).filter(e => e.kind === 'TestProfile').sort(sortEls);
const pfPts = p => (p.pts || []).map(q => [+q[0], +q[1]]).filter(q => isFinite(q[0]) && isFinite(q[1])).sort((a, b) => a[0] - b[0]);
const pfAxes = p => String(p.axes || '').split(/[,;\/]+/).map(x => x.trim()).filter(Boolean);
const fmtG = v => v == null || !isFinite(v) ? '—' : Math.abs(v) >= 100 ? v.toFixed(0) : Math.abs(v) >= 10 ? v.toFixed(1) : Math.abs(v) >= 1 ? v.toFixed(2) : v.toPrecision(3);
const fmtMin = m => { if(m == null || !isFinite(m)) return '—'; if(m < 1) return (m * 60).toFixed(0) + ' sn'; if(m < 120) return fmtNum(+m.toFixed(1)) + ' dk'; return fmtNum(+(m / 60).toFixed(2)) + ' sa'; };
/* log-log enterpolasyon (aralık dışı: null) */
function pfAt(pts, f, lin){
  if(!pts.length || f < pts[0][0] - 1e-9 || f > pts[pts.length - 1][0] + 1e-9) return null;
  for(let i = 0; i < pts.length - 1; i++){
    const [f1, a1] = pts[i], [f2, a2] = pts[i + 1];
    if(f >= f1 - 1e-9 && f <= f2 + 1e-9){
      if(f2 === f1) return Math.max(a1, a2);
      if(lin || a1 <= 0 || a2 <= 0 || f1 <= 0) return a1 + (a2 - a1) * (f - f1) / (f2 - f1);
      return a1 * Math.pow(f / f1, Math.log(a2 / a1) / Math.log(f2 / f1));
    }
  }
  return pts[pts.length - 1][1];
}
function psdArea(f1, a1, f2, a2){
  if(f2 <= f1 || a1 <= 0 || a2 <= 0) return 0;
  const n = Math.log(a2 / a1) / Math.log(f2 / f1);
  return Math.abs(n + 1) < 1e-9 ? a1 * f1 * Math.log(f2 / f1) : a1 * f1 / (n + 1) * (Math.pow(f2 / f1, n + 1) - 1);
}
const slopeDb = (q1, q2, db) => (q1[1] > 0 && q2[1] > 0 && q2[0] > q1[0]) ? db * Math.log10(q2[1] / q1[1]) / Math.log2(q2[0] / q1[0]) : null;
function logGrid(f0, f1, n){ const a = []; for(let i = 0; i <= n; i++) a.push(f0 * Math.pow(f1 / f0, i / n)); return a; }
function pfMetrics(p){
  const pts = pfPts(p), t = p.ptype || 'psd', M0 = {pts, ok:pts.length >= 2, rows:[], slopes:[]};
  if(!M0.ok){ M0.rows.push(['Uyarı', 'En az iki kırılma noktası girin']); return M0; }
  const ax = pfAxes(p), nax = Math.max(1, ax.length);
  if(t === 'psd'){
    let A = 0; for(let i = 0; i < pts.length - 1; i++) A += psdArea(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]);
    const grms = Math.sqrt(A);
    let dv = 0, vv = 0; const gr = logGrid(pts[0][0], pts[pts.length - 1][0], 600);
    for(let i = 0; i < gr.length - 1; i++){ const fm = Math.sqrt(gr[i] * gr[i + 1]), a = pfAt(pts, fm) || 0, df = gr[i + 1] - gr[i], w = 2 * Math.PI * fm; dv += a * G0 * G0 / Math.pow(w, 4) * df; vv += a * G0 * G0 / (w * w) * df; }
    const dur = numOf(p.dur);
    Object.assign(M0, {grms, main:fmtG(grms) + ' Grms', dpp:6 * Math.sqrt(dv) * 1000, vrms:Math.sqrt(vv), total:dur != null ? dur * nax : null});
    M0.rows.push(['Toplam seviye', fmtG(grms) + ' Grms'], ['Frekans aralığı', fmtNum(pts[0][0]) + ' – ' + fmtNum(pts[pts.length - 1][0]) + ' Hz'], ['En yüksek ASD', fmtG(Math.max(...pts.map(q => q[1]))) + ' g²/Hz'],
      ['Yer değiştirme (3σ, tepe-tepe)', fmtG(M0.dpp) + ' mm'], ['Hız (rms)', fmtG(M0.vrms * 1000) + ' mm/s'], ['Tolerans', '±' + fmtNum(numOf(p.tol) || 3) + ' dB'],
      ['Süre', (dur != null ? fmtMin(dur) + ' / eksen' : '—') + (ax.length ? ' · ' + ax.join(', ') : '')], ['Toplam test süresi', fmtMin(M0.total)]);
    for(let i = 0; i < pts.length - 1; i++) M0.slopes.push([pts[i][0], pts[i + 1][0], slopeDb(pts[i], pts[i + 1], 10), psdArea(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1])]);
  } else if(t === 'sine'){
    const rate = numOf(p.rate) || 1, sw = numOf(p.sweeps) || 1, oct = Math.log2(pts[pts.length - 1][0] / pts[0][0]);
    const per = oct / rate, disp = pts.map(([f, a]) => 2 * a * G0 / Math.pow(2 * Math.PI * f, 2) * 1000), vel = pts.map(([f, a]) => a * G0 / (2 * Math.PI * f) * 1000);
    Object.assign(M0, {main:fmtG(Math.max(...pts.map(q => q[1]))) + ' g tepe', total:per * sw * nax, dmax:Math.max(...disp)});
    M0.rows.push(['En yüksek genlik', fmtG(Math.max(...pts.map(q => q[1]))) + ' g'], ['Frekans aralığı', fmtNum(pts[0][0]) + ' – ' + fmtNum(pts[pts.length - 1][0]) + ' Hz (' + fmtNum(+oct.toFixed(2)) + ' oktav)'],
      ['En büyük yer değiştirme (tepe-tepe)', fmtG(M0.dmax) + ' mm'], ['En büyük hız (tepe)', fmtG(Math.max(...vel)) + ' mm/s'], ['Süpürme hızı', fmtNum(rate) + ' oktav/dk'],
      ['Bir süpürme süresi', fmtMin(per)], ['Süpürme sayısı', fmtNum(sw) + (ax.length ? ' · ' + ax.join(', ') : '')], ['Toplam test süresi', fmtMin(M0.total)]);
    for(let i = 0; i < pts.length - 1; i++) M0.slopes.push([pts[i][0], pts[i + 1][0], slopeDb(pts[i], pts[i + 1], 20), null]);
    M0.extra = pts.map((q, i) => [q[0], q[1], disp[i], vel[i]]);
  } else if(t === 'srs'){
    const mx = Math.max(...pts.map(q => q[1])), knee = (pts.find(q => q[1] >= mx * 0.999) || pts[0])[0];
    Object.assign(M0, {main:fmtG(mx) + ' g · ' + fmtNum(knee) + ' Hz köşe'});
    M0.rows.push(['En yüksek tepe ivme', fmtG(mx) + ' g'], ['Köşe (knee) frekansı', fmtNum(knee) + ' Hz'], ['Frekans aralığı', fmtNum(pts[0][0]) + ' – ' + fmtNum(pts[pts.length - 1][0]) + ' Hz'],
      ['Q (sönüm)', fmtNum(numOf(p.q) || 10) + ' (ζ = %' + fmtNum(+(50 / (numOf(p.q) || 10)).toFixed(2)) + ')'], ['Tolerans', '±' + fmtNum(numOf(p.tol) || 6) + ' dB'],
      ['Şok sayısı', fmtNum(numOf(p.shocks) || 3) + ' / yön' + (ax.length ? ' · ' + ax.join(', ') : '')], ['Toplam şok', fmtNum((numOf(p.shocks) || 3) * nax)]);
    for(let i = 0; i < pts.length - 1; i++) M0.slopes.push([pts[i][0], pts[i + 1][0], slopeDb(pts[i], pts[i + 1], 20), null]);
  } else {
    const T0 = pts.map(q => q[1]), dur = pts[pts.length - 1][0] - pts[0][0], cyc = numOf(p.cycles) || 1;
    let rmax = 0, dwH = 0, dwC = 0; const tmin = Math.min(...T0), tmax = Math.max(...T0);
    for(let i = 0; i < pts.length - 1; i++){
      const dt = pts[i + 1][0] - pts[i][0], dT = pts[i + 1][1] - pts[i][1];
      if(dt > 0 && Math.abs(dT) > 1e-9) rmax = Math.max(rmax, Math.abs(dT / dt));
      if(dt > 0 && Math.abs(dT) < 1e-9){ if(Math.abs(pts[i][1] - tmax) < 1e-9) dwH += dt; else if(Math.abs(pts[i][1] - tmin) < 1e-9) dwC += dt; }
      M0.slopes.push([pts[i][0], pts[i + 1][0], dt > 0 ? dT / dt : null, null]);
    }
    Object.assign(M0, {main:fmtNum(tmin) + ' / ' + fmtNum(tmax) + ' °C · ' + fmtNum(cyc) + ' döngü', total:dur * cyc, rmax, tmin, tmax});
    M0.rows.push(['Sıcaklık aralığı', fmtNum(tmin) + ' °C … ' + fmtNum(tmax) + ' °C (ΔT ' + fmtNum(tmax - tmin) + ' °C)'], ['En yüksek değişim hızı', fmtG(rmax) + ' °C/dk'],
      ['Sıcak bekleme', fmtMin(dwH)], ['Soğuk bekleme', fmtMin(dwC)], ['Bir döngü süresi', fmtMin(dur)], ['Döngü sayısı', fmtNum(cyc)], ['Toplam test süresi', fmtMin(dur * cyc)]);
  }
  return M0;
}
/* ---- grafik (SVG) ---- */
function niceLin(a, b, n){ const span = b - a || 1, st0 = Math.pow(10, Math.floor(Math.log10(span / n))), st = [1, 2, 2.5, 5, 10].map(k => k * st0).find(k => span / k <= n) || st0 * 10; const out = []; for(let v = Math.ceil(a / st) * st; v <= b + 1e-9; v += st) out.push(+v.toPrecision(10)); return {ticks:out, lo:Math.floor(a / st) * st, hi:Math.ceil(b / st) * st}; }
function pfChart(list, o){
  o = o || {}; const W = o.w || 640, H = o.h || 360, mini = !!o.mini;
  const valid = list.filter(x => pfPts(x.p).length >= 2); if(!valid.length) return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><rect width="${W}" height="${H}" fill="#fff"/><text x="${W / 2}" y="${H / 2}" text-anchor="middle" font-family="${FF}" font-size="12" fill="#889">Kırılma noktası yok</text></svg>`;
  const t = valid[0].p.ptype || 'psd', D = PT[t], lg = D.log;
  const L = mini ? 8 : 64, R = mini ? 6 : 16, Tp = mini ? 6 : 14, B = mini ? 8 : 44;
  let xs = [], ys = [];
  valid.forEach(x => { const pts = pfPts(x.p); pts.forEach(q => { xs.push(q[0]); ys.push(q[1]); }); if(x.tol){ const k = Math.pow(10, x.tol / D.db); pts.forEach(q => { ys.push(q[1] * k, q[1] / k); }); } });
  if(lg){ xs = xs.filter(v => v > 0); ys = ys.filter(v => v > 0); }
  let x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  let xt, yt;
  if(lg){ x0 = Math.pow(10, Math.floor(Math.log10(x0) + 1e-9)); x1 = Math.pow(10, Math.ceil(Math.log10(x1) - 1e-9)); y0 = Math.pow(10, Math.floor(Math.log10(y0) + 1e-9)); y1 = Math.pow(10, Math.ceil(Math.log10(y1) - 1e-9)); if(y1 / y0 < 10) y1 = y0 * 10; if(x1 / x0 < 10) x1 = x0 * 10; }
  else { const nx = niceLin(x0, x1, mini ? 3 : 8), ny = niceLin(Math.min(y0, 0), y1, mini ? 3 : 6); x0 = nx.lo; x1 = nx.hi; y0 = ny.lo; y1 = ny.hi; if(y1 - y0 < 1e-9) y1 = y0 + 1; xt = nx.ticks; yt = ny.ticks; }
  const PX = v => L + (lg ? Math.log10(v / x0) / Math.log10(x1 / x0) : (v - x0) / (x1 - x0)) * (W - L - R);
  const PY = v => H - B - (lg ? Math.log10(v / y0) / Math.log10(y1 / y0) : (v - y0) / (y1 - y0)) * (H - Tp - B);
  let g = `<rect width="${W}" height="${H}" fill="#fff"/>`;
  const fs = mini ? 8 : 11, txt = (x, y, s, a, extra) => `<text x="${x}" y="${y}" font-family="${FF}" font-size="${fs}" fill="#556" text-anchor="${a || 'middle'}"${extra || ''}>${esc(s)}</text>`;
  const lbl = v => v >= 1000 && v % 1000 === 0 ? (v / 1000) + 'k' : String(+v.toPrecision(6));
  if(lg){
    for(let d = x0; d < x1 * 1.0001; d *= 10){ for(let k = 1; k < 10; k++){ const v = d * k; if(v > x1 * 1.0001) break; const X = PX(v); g += `<line x1="${X}" y1="${Tp}" x2="${X}" y2="${H - B}" stroke="${k === 1 ? '#c9d2dc' : '#eef1f5'}" stroke-width="1"/>`; if(!mini && (k === 1 || (x1 / x0 <= 1000 && (k === 2 || k === 5)))) g += txt(X, H - B + 15, lbl(v)); } }
    for(let d = y0; d < y1 * 1.0001; d *= 10){ for(let k = 1; k < 10; k++){ const v = d * k; if(v > y1 * 1.0001) break; const Y = PY(v); g += `<line x1="${L}" y1="${Y}" x2="${W - R}" y2="${Y}" stroke="${k === 1 ? '#c9d2dc' : '#eef1f5'}" stroke-width="1"/>`; if(!mini && k === 1) g += txt(L - 6, Y + 4, String(+v.toPrecision(4)), 'end'); } }
  } else {
    xt.forEach(v => { const X = PX(v); g += `<line x1="${X}" y1="${Tp}" x2="${X}" y2="${H - B}" stroke="#eef1f5"/>`; if(!mini) g += txt(X, H - B + 15, lbl(v)); });
    yt.forEach(v => { const Y = PY(v); g += `<line x1="${L}" y1="${Y}" x2="${W - R}" y2="${Y}" stroke="${v === 0 ? '#9aa6b4' : '#eef1f5'}"/>`; if(!mini) g += txt(L - 6, Y + 4, lbl(v), 'end'); });
  }
  g += `<rect x="${L}" y="${Tp}" width="${W - L - R}" height="${H - Tp - B}" fill="none" stroke="#9aa6b4"/>`;
  if(!mini){ g += txt((L + W - R) / 2, H - 8, D.x); g += `<text transform="translate(14 ${(Tp + H - B) / 2}) rotate(-90)" font-family="${FF}" font-size="11" fill="#556" text-anchor="middle">${esc(D.y)}</text>`; }
  const path = pts => pts.map((q, i) => (i ? 'L' : 'M') + PX(q[0]).toFixed(1) + ' ' + PY(q[1]).toFixed(1)).join('');
  valid.forEach((x, i) => {
    const pts = pfPts(x.p).filter(q => !lg || (q[0] > 0 && q[1] > 0)), col = x.col || D.col;
    if(x.tol){ const k = Math.pow(10, x.tol / D.db); [k, 1 / k].forEach(m => { g += `<path d="${path(pts.map(q => [q[0], q[1] * m]))}" fill="none" stroke="${col}" stroke-width="1" stroke-dasharray="5 4" opacity=".7"/>`; }); }
    g += `<path d="${path(pts)}" fill="none" stroke="${col}" stroke-width="${mini ? 1.6 : 2.2}"${x.dash ? ' stroke-dasharray="7 4"' : ''}/>`;
    if(!mini) pts.forEach(q => { g += `<circle cx="${PX(q[0]).toFixed(1)}" cy="${PY(q[1]).toFixed(1)}" r="3" fill="#fff" stroke="${col}" stroke-width="1.5"/>`; });
  });
  if(!mini && (valid.length > 1 || valid[0].tol)){
    let ly = Tp + 8; const items = valid.map(x => [x.col || D.col, x.p.name + (x.label ? ' — ' + x.label : ''), x.dash]); if(valid[0].tol) items.push([valid[0].col || D.col, 'Tolerans ±' + fmtNum(valid[0].tol) + ' dB', 2]);
    const lw = Math.min(300, Math.max(...items.map(it => tw(it[1], false, 11))) + 40), lx = W - R - lw - 6;
    g += `<rect x="${lx}" y="${ly - 4}" width="${lw}" height="${items.length * 16 + 6}" fill="#fff" stroke="#d5dde8" rx="3" opacity=".95"/>`;
    items.forEach(([c, n, d]) => { g += `<line x1="${lx + 6}" y1="${ly + 7}" x2="${lx + 26}" y2="${ly + 7}" stroke="${c}" stroke-width="2"${d ? ' stroke-dasharray="' + (d === 2 ? '5 4' : '7 4') + '"' : ''}/>` + txt(lx + 32, ly + 11, n.length > 44 ? n.slice(0, 43) + '…' : n, 'start'); ly += 16; });
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${g}</svg>`;
}
/* ---- karşılaştırma ve zarf ---- */
function pfCompare(A, B){
  const a = pfPts(A), b = pfPts(B), t = A.ptype || 'psd', D = PT[t];
  if(t !== (B.ptype || 'psd')) return {err:'Profiller aynı türde olmalı'};
  if(a.length < 2 || b.length < 2) return {err:'İki profilde de en az iki nokta olmalı'};
  const lo = Math.max(a[0][0], b[0][0]), hi = Math.min(a[a.length - 1][0], b[b.length - 1][0]);
  if(hi <= lo) return {err:'Profillerin frekans/zaman aralıkları örtüşmüyor'};
  if(t === 'thermal'){
    const ma = pfMetrics(A), mb = pfMetrics(B);
    const rows = [['En düşük sıcaklık', ma.tmin, mb.tmin, ma.tmin <= mb.tmin], ['En yüksek sıcaklık', ma.tmax, mb.tmax, ma.tmax >= mb.tmax], ['Değişim hızı (°C/dk)', ma.rmax, mb.rmax, ma.rmax >= mb.rmax], ['Döngü sayısı', numOf(A.cycles) || 1, numOf(B.cycles) || 1, (numOf(A.cycles) || 1) >= (numOf(B.cycles) || 1)]];
    return {thermal:true, rows, covers:rows.every(r => r[3])};
  }
  const xs = [...new Set(a.map(q => q[0]).concat(b.map(q => q[0])).filter(f => f >= lo && f <= hi).concat(logGrid(lo, hi, 120)))].sort((u, v) => u - v);
  const pts = xs.map(f => { const va = pfAt(a, f), vb = pfAt(b, f); return [f, va, vb, va > 0 && vb > 0 ? D.db * Math.log10(va / vb) : null]; }).filter(q => q[3] != null);
  const mn = pts.reduce((m, q) => q[3] < m[3] ? q : m, pts[0]), mx = pts.reduce((m, q) => q[3] > m[3] ? q : m, pts[0]);
  const r = {pts, min:mn, max:mx, lo, hi, covers:mn[3] >= -1e-6, partial:lo > a[0][0] + 1e-9 || hi < a[a.length - 1][0] - 1e-9 || lo > b[0][0] + 1e-9 || hi < b[b.length - 1][0] - 1e-9};
  if(t === 'psd'){ r.ga = pfMetrics(A).grms; r.gb = pfMetrics(B).grms; }
  r.table = [...new Set(a.map(q => q[0]).concat(b.map(q => q[0])))].sort((u, v) => u - v).filter(f => f >= lo && f <= hi).map(f => { const va = pfAt(a, f), vb = pfAt(b, f); return [f, va, vb, va > 0 && vb > 0 ? D.db * Math.log10(va / vb) : null]; });
  return r;
}
function pfEnvelope(list){
  const t = list[0].ptype || 'psd', lin = t === 'thermal';
  const P = list.map(pfPts).filter(x => x.length >= 2); if(!P.length) return null;
  const lo = Math.min(...P.map(x => x[0][0])), hi = Math.max(...P.map(x => x[x.length - 1][0]));
  const xs = [...new Set(P.flatMap(x => x.map(q => q[0])).concat(lin ? [] : logGrid(lo, hi, 240)))].sort((u, v) => u - v);
  let pts = xs.map(f => [f, Math.max(...P.map(x => pfAt(x, f, lin)).filter(v => v != null))]).filter(q => isFinite(q[1]));
  /* log-log doğrusal ara noktaları sadeleştir (0,1 dB tolerans) */
  const db = PT[t].db || 10;
  for(let i = pts.length - 2; i > 0; i--){ const p0 = pts[i - 1], p2 = pts[i + 1], p1 = pts[i]; const est = pfAt([p0, p2], p1[0], lin); if(est > 0 && p1[1] > 0 && Math.abs(db * Math.log10(p1[1] / est)) < 0.1) pts.splice(i, 1); }
  return pts.map(q => [+q[0].toPrecision(5), +q[1].toPrecision(4)]);
}
/* ---- görünüm ---- */
let PF = {sel:null, cmp:'', env:new Set(), type:'all'};
function pfSel(){ let p = E(PF.sel); if(!p || p.kind !== 'TestProfile'){ p = allProfiles()[0] || null; PF.sel = p ? p.id : null; } return p; }
function pfTests(p){ return allTests().filter(t => (t.profiles || []).includes(p.id)); }
function pfReqs(p){ return Object.values(M.els).filter(r => (r.kind === 'Refine' || r.kind === 'Trace') && r.src === p.id && E(r.tgt) && E(r.tgt).kind === 'Requirement').map(r => E(r.tgt)); }
function newProfile(type, owner, props){
  const d0 = JSON.parse(JSON.stringify(PF_DEF[type] || PF_DEF.psd));
  const own = owner || (allProfiles()[0] ? allProfiles()[0].owner : findOrMkPkg(M.rootId, 'Test Profilleri'));
  return mk('TestProfile', own, Object.assign({name:uniqName(PT[type].sh + ' profili', own), ptype:type}, d0, props || {}));
}
function pfHTML(){
  const ps = allProfiles();
  if(!ps.length) return `<div class="vempty">Henüz test profili yok.<br><br>${Object.entries(PT).map(([k, v]) => `<button class="vb pri" data-pfa="new:${k}">+ ${esc(v.tr)}</button>`).join(' ')}<br><br><span class="muted">Profiller kırılma noktalarıyla tanımlanır; Grms, yer değiştirme, süre, eğimler otomatik hesaplanır.<br>Test durumlarına bağlanır, raporda ve VCRM'de görünür.</span></div>`;
  const p = pfSel(), t = p.ptype || 'psd', D = PT[t], Mx = pfMetrics(p);
  let h = '<div class="pfwrap"><div class="pflist">';
  Object.entries(PT).forEach(([k, v]) => {
    const list = ps.filter(x => (x.ptype || 'psd') === k); if(!list.length) return;
    h += `<div class="pfgh">${esc(v.tr)}</div>` + list.map(x => `<div class="pfli${x.id === p.id ? ' on' : ''}" data-pfs="${x.id}"><input type="checkbox" data-pfe="${x.id}" title="Zarf için seç"${PF.env.has(x.id) ? ' checked' : ''}><span class="pfn">${esc(x.name)}</span><span class="muted">${esc(pfMetrics(x).main || '')}</span></div>`).join('');
  });
  h += '</div><div class="pfmain">';
  const cmpC = ps.filter(x => x.id !== p.id && (x.ptype || 'psd') === t);
  const C = PF.cmp && E(PF.cmp) && cmpC.includes(E(PF.cmp)) ? E(PF.cmp) : null;
  h += `<div class="pfhead"><input class="pfname" data-pf="name" value="${esc(p.name)}"> <select data-pf="ptype">${Object.entries(PT).map(([k, v]) => `<option value="${k}"${k === t ? ' selected' : ''}>${esc(v.tr)}</option>`).join('')}</select>
    <label class="vchk">Karşılaştır: <select data-pfc="1"><option value="">(yok)</option>${cmpC.map(x => `<option value="${x.id}"${C && C.id === x.id ? ' selected' : ''}>${esc(x.name)}</option>`).join('')}</select></label></div>`;
  h += `<div class="pfgrid"><div class="pfchart">${pfChart([{p, tol:(t === 'psd' || t === 'srs') ? (numOf(p.tol) || (t === 'srs' ? 6 : 3)) : 0}].concat(C ? [{p:C, col:'#888', dash:1}] : []), {w:660, h:360})}</div>`;
  h += `<div class="pfside"><div class="cards" style="grid-template-columns:1fr 1fr;margin-bottom:8px"><div class="card" style="grid-column:1/3"><div class="cv" style="font-size:22px;color:${D.col}">${esc(Mx.main || '—')}</div><div class="ct">${esc(D.tr)}</div></div></div>`;
  h += `<table class="rt pfkv">${Mx.rows.map(([k, v]) => `<tr><td>${esc(k)}</td><td><b>${esc(v)}</b></td></tr>`).join('')}</table></div></div>`;
  /* parametreler */
  const prm = {psd:[['tol', 'Tolerans ±dB'], ['dur', 'Süre / eksen (dk)'], ['axes', 'Eksenler']], sine:[['rate', 'Süpürme hızı (oktav/dk)'], ['sweeps', 'Süpürme sayısı'], ['axes', 'Eksenler']], srs:[['q', 'Q'], ['tol', 'Tolerans ±dB'], ['shocks', 'Şok sayısı / yön'], ['axes', 'Yönler']], thermal:[['cycles', 'Döngü sayısı']]}[t];
  h += `<h3>Parametreler</h3><div class="pfprm">${prm.map(([k, l]) => `<label>${esc(l)} <input data-pf="${k}" value="${esc(p[k] == null ? '' : p[k])}"></label>`).join('')}<label>Seviye / amaç <input data-pf="plevel" list="pflv" value="${esc(p.plevel || '')}" placeholder="Kalifikasyon, Kabul, ESS…"><datalist id="pflv"><option>Kalifikasyon</option><option>Kabul</option><option>ESS</option><option>Görev profili</option><option>Fonksiyonel</option><option>Dayanıklılık</option></datalist></label><label>Standart / kaynak <input data-pf="std" value="${esc(p.std || '')}" placeholder="ör. MIL-STD-810H 514.8 Kat. 24"></label></div>`;
  /* kırılma noktaları */
  h += `<h3>Kırılma noktaları <button class="vb" data-pfa="addpt">+ Nokta</button> <button class="vb" data-pfa="paste">Excel'den yapıştır…</button></h3><table class="rt pfpt"><thead><tr><th>#</th><th>${esc(D.x)}</th><th>${esc(D.y)}</th>${t === 'thermal' ? '<th>Değişim (°C/dk)</th>' : '<th>Eğim (dB/oktav)</th>'}${t === 'psd' ? '<th>Bölüm g²</th>' : ''}${t === 'sine' ? '<th>Yer değ. (mm, t-t)</th><th>Hız (mm/s)</th>' : ''}<th></th></tr></thead><tbody>`;
  (p.pts || []).forEach((q, i) => {
    const sl = Mx.slopes[i], ex = Mx.extra && Mx.extra[i];
    h += `<tr><td class="rn">${i + 1}</td><td><input data-pp="${i}:0" value="${esc(q[0])}"></td><td><input data-pp="${i}:1" value="${esc(q[1])}"></td><td class="muted">${sl && sl[2] != null ? (sl[2] > 0 ? '+' : '') + fmtG(sl[2]) + (t === 'thermal' ? '' : ' →') : ''}</td>${t === 'psd' ? `<td class="muted">${sl && sl[3] != null ? fmtG(sl[3]) : ''}</td>` : ''}${t === 'sine' ? `<td class="muted">${ex ? fmtG(ex[2]) : ''}</td><td class="muted">${ex ? fmtG(ex[3]) : ''}</td>` : ''}<td><button class="tdel" data-pfa="delpt:${i}" title="Noktayı sil">✕</button></td></tr>`;
  });
  h += '</tbody></table>';
  /* karşılaştırma */
  if(C){
    const R = pfCompare(p, C);
    h += `<h3>Karşılaştırma: ${esc(p.name)} ↔ ${esc(C.name)}</h3>`;
    if(R.err) h += `<div class="gaps">${esc(R.err)}</div>`;
    else if(R.thermal) h += `<div class="pfverd ${R.covers ? 'ok' : 'bad'}">${R.covers ? '✓' : '✗'} ${esc(p.name)} ${R.covers ? '' : 'tüm ölçütlerde '}${esc(C.name)} profilini ${R.covers ? 'kapsıyor' : 'kapsamıyor'}</div><table class="rt"><thead><tr><th>Ölçüt</th><th>${esc(p.name)}</th><th>${esc(C.name)}</th><th></th></tr></thead><tbody>${R.rows.map(r => `<tr><td>${esc(r[0])}</td><td>${fmtG(r[1])}</td><td>${fmtG(r[2])}</td><td>${r[3] ? '✓' : '<span class="bad">✗</span>'}</td></tr>`).join('')}</tbody></table>`;
    else {
      h += `<div class="pfverd ${R.covers ? 'ok' : 'bad'}">${R.covers ? '✓' : '✗'} ${esc(p.name)}, ${esc(C.name)} profilini ${fmtNum(R.lo)}–${fmtNum(R.hi)} Hz aralığında ${R.covers ? 'kapsıyor' : 'kapsamıyor'} · en düşük marj <b>${(R.min[3] >= 0 ? '+' : '') + fmtG(R.min[3])} dB</b> @ ${fmtNum(+R.min[0].toPrecision(4))} Hz · en yüksek marj ${(R.max[3] >= 0 ? '+' : '') + fmtG(R.max[3])} dB @ ${fmtNum(+R.max[0].toPrecision(4))} Hz${R.ga ? ` · Grms oranı ${fmtG(R.ga)} / ${fmtG(R.gb)} = ${fmtG(20 * Math.log10(R.ga / R.gb))} dB` : ''}${R.partial ? ' · <span class="muted">frekans aralıkları tam örtüşmüyor; yalnız ortak aralık değerlendirildi</span>' : ''}</div>`;
      h += `<table class="rt"><thead><tr><th>${esc(D.x)}</th><th>${esc(p.name)}</th><th>${esc(C.name)}</th><th>Marj (dB)</th></tr></thead><tbody>${R.table.map(r => `<tr><td>${fmtNum(+r[0].toPrecision(5))}</td><td>${fmtG(r[1])}</td><td>${fmtG(r[2])}</td><td class="${r[3] < 0 ? 'bad' : ''}">${r[3] == null ? '—' : (r[3] >= 0 ? '+' : '') + fmtG(r[3])}</td></tr>`).join('')}</tbody></table>`;
    }
  }
  /* bağlantılar */
  const ts = pfTests(p), rs = pfReqs(p);
  h += `<h3>Kullanan test durumları <button class="vb" data-pfa="tests">+ / −</button></h3>` + (ts.length ? ts.map(x => `<span class="chip2"><a class="lnk" data-ago="${x.id}">${esc(nm(x))}${x.procNo ? ' · ' + esc(x.procNo) : ''}</a> ${resChip(testResult(x))}</span>`).join(' ') : '<span class="muted">Bağlı test yok</span>');
  h += `<h3>İlgili gereksinimler («refine») <button class="vb" data-pfa="reqs">+ / −</button></h3>` + (rs.length ? rs.map(r => `<span class="chip2"><a class="lnk" data-ago="${r.id}"><b>${esc(r.reqId || '')}</b> ${esc(r.name || '')}</a></span>`).join(' ') : '<span class="muted">Bağlı gereksinim yok</span>');
  h += `<h3>Açıklama</h3><textarea data-pf="doc" rows="3" style="width:100%;font:inherit">${esc(p.doc || '')}</textarea>`;
  return h + '</div></div>';
}
function pfBar(){
  return `<span class="vchk">Yeni:</span>${Object.entries(PT).map(([k, v]) => `<button class="vb" data-pfa="new:${k}">+ ${esc(v.sh)}</button>`).join('')}
    <span class="vsep"></span><button class="vb" data-pfa="env" title="Listede işaretli aynı türdeki profillerin zarfını (en yüksek değerlerini) yeni profil olarak oluşturur">⊓ Zarf oluştur (${PF.env.size})</button>
    <button class="vb" data-pfa="dup">⧉ Çoğalt</button><button class="vb" data-pfa="scale" title="Seviyeyi dB olarak ölçekle (ör. kabul = kalifikasyon − 3 dB)">± dB ölçekle</button><button class="vb" data-pfa="del">✕ Sil</button>
    <span class="vsep"></span><button class="vb" data-pfa="png">⤓ Grafik PNG</button><button class="vb" data-pfa="xl">⤒ Excel'e aktar</button>`;
}
function pfPaste(p){
  const box = $('#modalBox'); box.style.width = 'min(520px, 94vw)'; box.style.maxWidth = 'none';
  const D = PT[p.ptype || 'psd'];
  box.innerHTML = `<h2>Kırılma noktalarını yapıştır</h2><p class="muted" style="margin:0 0 6px">Excel'den iki sütunu (${esc(D.x)} · ${esc(D.y)}) kopyalayıp yapıştırın. Sekme, noktalı virgül veya boşlukla ayrılmış satırlar okunur; ondalık ayırıcı virgül de olabilir. Başlık satırı atlanır.</p>
    <textarea id="pfta" rows="12" style="width:100%;font:12px monospace"></textarea><label class="vchk"><input type="checkbox" id="pfrep" checked> Mevcut noktaların yerine koy</label>
    <p style="text-align:right;margin:10px 0 0"><span class="muted" id="pfst"></span> <button class="pbtn" id="pfc">Vazgeç</button> <button class="pbtn pri" id="pfo">Aktar</button></p>`;
  $('#modal').style.display = 'flex'; $('#pfta').focus();
  const close = () => { $('#modal').style.display = 'none'; box.style.width = ''; box.style.maxWidth = ''; box.onclick = null; };
  $('#pfta').onkeydown = ev => ev.stopPropagation();
  box.onclick = ev => {
    if(ev.target.id === 'pfc') close();
    if(ev.target.id === 'pfo'){
      const rows = $('#pfta').value.split(/\r?\n/).map(l => l.trim()).filter(Boolean).map(l => { const c = l.includes('\t') || l.includes(';') ? l.split(/[\t;]+/) : l.split(/\s+/); return c.map(x => parseFloat(String(x).replace(/\s/g, '').replace(',', '.'))); }).filter(c => c.length >= 2 && isFinite(c[0]) && isFinite(c[1])).map(c => [c[0], c[1]]);
      if(rows.length < 2) return $('#pfst').textContent = 'En az iki sayısal satır gerekli';
      snap(); p.pts = $('#pfrep').checked ? rows : (p.pts || []).concat(rows); p.pts.sort((a, b) => a[0] - b[0]); close(); afterChange(); toast(rows.length + ' nokta aktarıldı');
    }
  };
}
function pfXlsx(){
  const ps = allProfiles(); if(!ps.length) return toast('Profil yok');
  const sum = [[{v:'Profil', s:1}, {v:'Tür', s:1}, {v:'Seviye', s:1}, {v:'Standart', s:1}, {v:'Ana değer', s:1}, {v:'Toplam süre', s:1}, {v:'Kullanan testler', s:1}, {v:'Gereksinimler', s:1}]];
  ps.forEach(p => { const m = pfMetrics(p); sum.push([{v:p.name, s:6}, PT[p.ptype || 'psd'].tr, p.plevel || '', p.std || '', m.main || '', m.total != null ? fmtMin(m.total) : '', pfTests(p).map(nm).join('\n'), pfReqs(p).map(r => r.reqId || nm(r)).join(', ')]); });
  const det = [];
  ps.forEach(p => { const m = pfMetrics(p), D = PT[p.ptype || 'psd']; det.push([{v:p.name + ' — ' + D.tr, s:10}]); m.rows.forEach(r => det.push([r[0], {v:r[1], s:6}])); det.push([{v:D.x, s:1}, {v:D.y, s:1}, {v:p.ptype === 'thermal' ? 'Değişim (°C/dk)' : 'Eğim (dB/oktav)', s:1}]); pfPts(p).forEach((q, i) => det.push([q[0], q[1], m.slopes[i] && m.slopes[i][2] != null ? +m.slopes[i][2].toFixed(2) : ''])); det.push([]); });
  download(buildXlsx([{name:'Profiller', rows:sum, widths:[30, 24, 14, 26, 24, 14, 30, 20], header:true, freeze:[0, 1]}, {name:'Kırılma noktaları', rows:det, widths:[30, 22, 18]}]), fileSafe(E(M.rootId).name) + ' - Test Profilleri.xlsx');
}
function pfClone(p, name){ const c = JSON.parse(JSON.stringify(p)); delete c.id; delete c.owner; c.name = name; return c; }
function pfPick(title, cands, cur0, apply){ pickList(title, cands, cur0, apply); }
Object.assign(VIEWS, {'@profiles':{tr:'Test Profilleri', ic:'∿', note:'Rastgele titreşim (PSD), sinüs süpürme, şok tepki spektrumu (SRS) ve termal döngü profilleri.<br><br>Kırılma noktalarını tabloya girin veya Excel\'den yapıştırın; Grms, yer değiştirme, eğim (dB/oktav), süre ve tolerans bandı otomatik hesaplanır.<br><br>"Karşılaştır" ile iki profil arasındaki marjı, solda işaretleyip "Zarf oluştur" ile birden çok profilin zarfını alın.', render:pfHTML, bar:pfBar, status:() => allProfiles().length + ' test profili'}});
(function(){
  const V = $('#view');
  V.addEventListener('change', ev => {
    if(ST.cur !== '@profiles') return;
    const t = ev.target, p = pfSel(); if(!p) return;
    if(t.dataset.pfe){ t.checked ? PF.env.add(t.dataset.pfe) : PF.env.delete(t.dataset.pfe); renderViewBar(); return; }
    if(t.dataset.pfc != null){ PF.cmp = t.value; renderView(); return; }
    if(t.dataset.pf){ const k = t.dataset.pf; let v = t.value; if(k === 'name' && !v.trim()) return renderView(); snap(); if(k === 'ptype' && v !== p.ptype){ if(!confirm('Profil türü değişince kırılma noktaları türün varsayılanlarıyla değiştirilsin mi? (Hayır: noktalar korunur)')) p.ptype = v; else Object.assign(p, JSON.parse(JSON.stringify(PF_DEF[v])), {ptype:v}); } else p[k] = v; afterChange(); return; }
    if(t.dataset.pp){ const [i, j] = t.dataset.pp.split(':').map(Number), v = parseFloat(String(t.value).replace(',', '.')); if(!isFinite(v)) return toast('Sayı girin'); snap(); p.pts[i][j] = v; if(j === 0) p.pts.sort((a, b) => a[0] - b[0]); afterChange(); }
  });
  V.addEventListener('keydown', ev => { if(ST.cur === '@profiles' && ev.target.tagName === 'INPUT' && ev.key === 'Enter'){ ev.target.blur(); } if(ST.cur === '@profiles' && /INPUT|TEXTAREA|SELECT/.test(ev.target.tagName)) ev.stopPropagation(); });
  V.addEventListener('click', ev => {
    const op = ev.target.closest('[data-openpf]'); if(op){ PF.sel = op.dataset.openpf; PF.cmp = ''; openD('@profiles'); return; }
    if(ST.cur !== '@profiles') return;
    const t = ev.target, s = t.closest('[data-pfs]');
    if(s && !t.closest('[data-pfe]')){ PF.sel = s.dataset.pfs; PF.cmp = ''; ST.tsel = PF.sel; renderView(); renderProps(); return; }
    const a = t.closest('[data-pfa]'); if(!a) return;
    const act = a.dataset.pfa, p = pfSel();
    if(act.startsWith('new:')){ snap(); const np = newProfile(act.slice(4)); PF.sel = np.id; ST.tsel = np.id; ST.exp.add(np.owner); afterChange(); return; }
    if(!p) return;
    if(act === 'addpt'){ snap(); const q = p.pts || (p.pts = []), l = q[q.length - 1]; q.push(l ? [p.ptype === 'thermal' ? l[0] + 30 : +(l[0] * 2).toPrecision(4), l[1]] : [p.ptype === 'thermal' ? 0 : 20, p.ptype === 'thermal' ? 25 : 0.01]); afterChange(); }
    if(act.startsWith('delpt:')){ snap(); p.pts.splice(+act.slice(6), 1); afterChange(); }
    if(act === 'paste') pfPaste(p);
    if(act === 'dup'){ snap(); const c = mk('TestProfile', p.owner, pfClone(p, uniqName(p.name + ' kopya', p.owner))); PF.sel = c.id; afterChange(); }
    if(act === 'scale'){ const db = parseFloat(String(prompt('Seviye kaç dB değişsin? (ör. -3 kabul seviyesi, +6 marj)', '-3') || '').replace(',', '.')); if(!isFinite(db)) return; if(p.ptype === 'thermal') return toast('Termal profilde dB ölçekleme yok'); snap(); const k = Math.pow(10, db / PT[p.ptype || 'psd'].db); const c = mk('TestProfile', p.owner, pfClone(p, uniqName(p.name + ' (' + (db > 0 ? '+' : '') + db + ' dB)', p.owner))); c.pts = pfPts(p).map(q => [q[0], +(q[1] * k).toPrecision(4)]); PF.sel = c.id; PF.cmp = p.id; afterChange(); }
    if(act === 'del'){ if(!confirm(`"${p.name}" profili silinsin mi?`)) return; snap(); allTests().forEach(x => { if(x.profiles) x.profiles = x.profiles.filter(id => id !== p.id); }); delModel([p.id]); PF.sel = null; PF.env.delete(p.id); afterChange(); }
    if(act === 'env'){
      const L0 = [...PF.env].map(E).filter(Boolean); if(L0.length < 2) return toast('Soldaki listede en az iki profili işaretleyin');
      if(new Set(L0.map(x => x.ptype || 'psd')).size > 1) return toast('Zarf için aynı türde profiller seçin');
      const pts = pfEnvelope(L0); if(!pts) return; snap(); const np = newProfile(L0[0].ptype || 'psd', L0[0].owner, {name:uniqName('Zarf — ' + L0.map(x => x.name).join(' + ').slice(0, 60), L0[0].owner), pts, doc:'Zarf: ' + L0.map(x => x.name).join(', ')});
      ['tol', 'dur', 'axes', 'q', 'rate', 'sweeps', 'shocks', 'cycles'].forEach(k => { if(L0[0][k] != null) np[k] = L0[0][k]; }); PF.sel = np.id; PF.env.clear(); afterChange(); toast('Zarf profili oluşturuldu (' + pts.length + ' nokta)');
    }
    if(act === 'png'){ const svg = pfChart([{p, tol:(p.ptype === 'psd' || p.ptype === 'srs') ? (numOf(p.tol) || (p.ptype === 'srs' ? 6 : 3)) : 0}].concat(PF.cmp && E(PF.cmp) ? [{p:E(PF.cmp), col:'#888', dash:1}] : []), {w:900, h:500}); svgToPng({str:svg, w:900, h:500}, 2).then(b => download(new Blob([b], {type:'image/png'}), fileSafe(p.name) + '.png')); }
    if(act === 'xl') pfXlsx();
    if(act === 'tests') pfPick('Profili kullanan test durumları — ' + p.name, allTests(), pfTests(p).map(x => x.id), ids => { snap(); allTests().forEach(x => { const has = (x.profiles || []).includes(p.id), want = ids.includes(x.id); if(has && !want) x.profiles = x.profiles.filter(i => i !== p.id); if(!has && want) x.profiles = (x.profiles || []).concat([p.id]); }); afterChange(); });
    if(act === 'reqs') pfPick('Profilin detaylandırdığı gereksinimler — ' + p.name, allReqs(), pfReqs(p).map(x => x.id), ids => { snap(); const cur0 = pfReqs(p).map(x => x.id); cur0.filter(i => !ids.includes(i)).forEach(i => delRel('Refine', p.id, i)); ids.filter(i => !cur0.includes(i)).forEach(i => addRel('Refine', p.id, i)); afterChange(); });
  });
})();
/* test durumunun profillerini seçme */
function pickProfilesForTest(tid){
  const tc = E(tid); if(!tc) return;
  pickList('Test profilleri — ' + nm(tc), allProfiles(), tc.profiles || [], ids => { snap(); tc.profiles = ids; afterChange(); }, {label:'+ Yeni PSD profili', fn:() => { const np = newProfile('psd'); return np.id; }});
}
const pfShort = p => PT[p.ptype || 'psd'].sh + ' · ' + (pfMetrics(p).main || '');
/* örnek modele profiller */
DEMO_EXT.push(X => {
  const pk = findOrMkPkg(M.rootId, 'Test Profilleri');
  const q = mk('TestProfile', pk, {name:'Kalifikasyon rastgele titreşim', ptype:'psd', pts:[[20, 0.01], [80, 0.04], [350, 0.04], [2000, 0.007]], tol:3, dur:'60', axes:'X, Y, Z', plevel:'Kalifikasyon', std:'MIL-STD-810H 514.8 (NAVMAT P-9492 tabanlı)'});
  const e = mk('TestProfile', pk, {name:'ESS rastgele titreşim', ptype:'psd', pts:[[20, 0.005], [80, 0.02], [350, 0.02], [2000, 0.0035]], tol:3, dur:'10', axes:'Z', plevel:'ESS', std:'NAVMAT P-9492'});
  const s = mk('TestProfile', pk, {name:'Rezonans arama sinüs', ptype:'sine', pts:[[5, 0.25], [20, 0.5], [2000, 0.5]], rate:1, sweeps:2, axes:'X, Y, Z', plevel:'Fonksiyonel'});
  const k = mk('TestProfile', pk, {name:'Piroteknik şok SRS', ptype:'srs', pts:[[100, 50], [1600, 2000], [10000, 2000]], q:10, tol:6, shocks:3, axes:'±X, ±Y, ±Z', plevel:'Kalifikasyon', std:'MIL-STD-810H 517.3'});
  const th = mk('TestProfile', pk, {name:'Termal döngü (ESS)', ptype:'thermal', pts:[[0, 25], [13, -40], [73, -40], [92, 71], [152, 71], [167, 25]], cycles:10, plevel:'ESS'});
  const tc = mk('TestCase', X.tPkg, {name:'Rastgele titreşim kalifikasyon testi', tMethod:'Test', procNo:'TP-QT-514', tLevel:'Kalifikasyon', testItem:'Araç Sistemi', std:'MIL-STD-810H 514.8', resp:'Kalifikasyon', result:'Planlandı', profiles:[q.id, s.id]});
  addRel('Verify', tc.id, X.S5.id); addRel('Refine', q.id, X.S5.id);
  const tc2 = mk('TestCase', X.tPkg, {name:'Çevresel gerilim taraması (ESS)', tMethod:'Test', procNo:'TP-ESS-01', tLevel:'Kabul', testItem:'Kontrol Birimi', result:'Planlandı', profiles:[e.id, th.id]});
  addRel('Verify', tc2.id, X.S5.id);
  const d = newDiagramCore(pk, 'req', 'Titreşim Doğrulama');
  const rS = addShape(d, X.S5.id, 0, 0, 260, 110), rT = addShape(d, tc.id, 330, 20, 200, 70), rQ = addShape(d, q.id, 0, 190, 240, 190), rE = addShape(d, e.id, 300, 190, 240, 190);
  d.shapes.slice().forEach(sh => autoEdges(d, sh));
  X.open.push(d.id);
});

