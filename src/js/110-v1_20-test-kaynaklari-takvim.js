/* ================= v1.20: TEST KAYNAKLARI, BAĞIMLILIKLAR, KRİTİK YOL, ÇAKIŞMA ================= */
Object.assign(KIND, {TestResource:{tr:'Test Kaynağı', en:'TestResource', ic:'TK', col:'#8e6c3a'}});
Object.assign(BASE, {TestResource:'Kaynak'});
['Model', 'Package'].forEach(k => { if(OWN[k] && !OWN[k].includes('TestResource')) OWN[k].push('TestResource'); });
RANK.push('TestResource');
const RES_TYPES = ['Sarsıcı (titreşim)', 'İklim / termal oda', 'Termal vakum odası', 'Akustik oda', 'Şok düzeneği', 'EMI / EMC odası', 'Ölçüm / güç cihazı', 'Fikstür', 'Personel', 'Dış laboratuvar', 'Diğer'];
Object.assign(CP, {mode:'tests', deps:true, crit:true});
const DAY_MS = 864e5, pISO = s => Date.parse(s + 'T00:00:00Z'), isoOf = ms => new Date(ms).toISOString().slice(0, 10), addDaysISO = (s, n) => isoOf(pISO(s) + n * DAY_MS);
const allResources = () => Object.values(M.els).filter(e => e.kind === 'TestResource').sort((a, b) => COLL.compare(a.rtype || '', b.rtype || '') || COLL.compare(a.name || '', b.name || ''));
const tcRes = tc => (tc.res || []).map(E).filter(x => x && x.kind === 'TestResource');
const tcDeps = tc => (tc.deps || []).map(E).filter(x => x && x.kind === 'TestCase');
const tSpan = t => { const a = pISO(t.pStart), b = t.pEnd && !isNaN(pISO(t.pEnd)) ? Math.max(a, pISO(t.pEnd)) : a; return [a, b]; };
const dated = t => t.pStart && !isNaN(pISO(t.pStart));
function resPkg(){ const r = allResources()[0]; return r && E(r.owner) ? r.owner : findOrMkPkg(M.rootId, 'Test Kaynakları'); }
function resAdd(extra){ return mk('TestResource', resPkg(), Object.assign({name:uniqName('Kaynak', resPkg()), rtype:'Diğer', loc:''}, extra || {})); }
/* t2, t1'in (dolaylı) ardılı mı? — döngü engeli */
function isSucc(t1, t2){ const seen = new Set(), st = [t1]; while(st.length){ const x = st.pop(); allTests().forEach(s => { if((s.deps || []).includes(x) && !seen.has(s.id)){ seen.add(s.id); st.push(s.id); } }); } return seen.has(t2); }
/* çizelge analizi: çakışmalar, bağımlılık ihlalleri, kritik yol, bolluk */
function schedInfo(){
  const ts = allTests().filter(dated), conf = new Map(), rconf = new Map(), pairs = [], depBad = [], tf = new Map(), crit = new Set();
  const addC = (t, s) => { if(!conf.has(t.id)) conf.set(t.id, []); conf.get(t.id).push(s); };
  for(let i = 0; i < ts.length; i++) for(let j = i + 1; j < ts.length; j++){
    const a = ts[i], b = ts[j], [a1, a2] = tSpan(a), [b1, b2] = tSpan(b); if(!(a1 <= b2 && b1 <= a2)) continue;
    const ov = [Math.max(a1, b1), Math.min(a2, b2)];
    tcRes(a).filter(r => (b.res || []).includes(r.id)).forEach(r => { pairs.push({k:'Kaynak', x:r, a, b, ov}); addC(a, `Kaynak çakışması: ${r.name} — ${tcLabel(b)}`); addC(b, `Kaynak çakışması: ${r.name} — ${tcLabel(a)}`); if(!rconf.has(r.id)) rconf.set(r.id, new Set()); rconf.get(r.id).add(a.id).add(b.id); });
    tcArticles(a).filter(x => (b.articles || []).includes(x.id)).forEach(x => { pairs.push({k:'Numune', x, a, b, ov}); addC(a, `Numune çakışması: ${taLabel(x)} — ${tcLabel(b)}`); addC(b, `Numune çakışması: ${taLabel(x)} — ${tcLabel(a)}`); });
  }
  ts.forEach(t => tcDeps(t).filter(dated).forEach(p => { if(tSpan(t)[0] <= tSpan(p)[1]) depBad.push({p, t, d:Math.round((tSpan(p)[1] - tSpan(t)[0]) / DAY_MS) + 1}); }));
  if(ts.length){
    const end = Math.max(...ts.map(t => tSpan(t)[1])), LF = new Map(), succ = new Map();
    ts.forEach(t => tcDeps(t).filter(dated).forEach(p => { if(!succ.has(p.id)) succ.set(p.id, []); succ.get(p.id).push(t); }));
    const lf = (t, stack) => { if(LF.has(t.id)) return LF.get(t.id); if(stack.has(t.id)) return end; stack.add(t.id); const ss = succ.get(t.id) || []; let v = end; ss.forEach(s => { const [s1, s2] = tSpan(s); v = Math.min(v, lf(s, stack) - (s2 - s1) - DAY_MS); }); stack.delete(t.id); LF.set(t.id, v); return v; };
    ts.forEach(t => { const f = Math.round((lf(t, new Set()) - tSpan(t)[1]) / DAY_MS); tf.set(t.id, f); if(f <= 0) crit.add(t.id); });
    return {conf, rconf, pairs, depBad, tf, crit, end, start:Math.min(...ts.map(t => tSpan(t)[0]))};
  }
  return {conf, rconf, pairs, depBad, tf, crit, end:null, start:null};
}
/* kaydırma: bir testi n gün kaydır, ardılları bitiş→başlangıç kuralıyla it */
function slipPlan(tc, n){
  const shift = new Map(), cur = id => { const t = E(id), d = shift.get(id) || 0; return [pISO(t.pStart) + d * DAY_MS, tSpan(t)[1] + d * DAY_MS]; };
  if(!dated(tc)) return shift;
  shift.set(tc.id, n);
  const q = [tc.id], guard = new Set();
  while(q.length){
    const id = q.shift(); if(guard.has(id + ':' + (shift.get(id) || 0))) continue; guard.add(id + ':' + (shift.get(id) || 0));
    const [, e] = cur(id);
    allTests().filter(s => dated(s) && (s.deps || []).includes(id)).forEach(s => { const [s1] = cur(s.id); if(s1 <= e){ const need = Math.round((e - s1) / DAY_MS) + 1; shift.set(s.id, (shift.get(s.id) || 0) + need); q.push(s.id); } });
  }
  return shift;
}
function slipDialog(tc){
  if(!dated(tc)) return toast('Önce testin planlanan başlangıç tarihini girin');
  const box = $('#modalBox'); box.style.width = 'min(760px, 95vw)'; box.style.maxWidth = 'none';
  box.innerHTML = `<h2>Kayma etkisi — <span class="noi18n">${esc(tcLabel(tc))}</span></h2><div class="icbar"><label>Kaydırma (gün) <input id="slN" type="number" value="7" style="width:80px"></label><span class="muted" style="font-size:12px">Negatif değer öne çeker. Ardıl testler bitiş → başlangıç bağımlılığına göre ötelenir; takvim günü esas alınır.</span></div><div id="slL" style="max-height:52vh;overflow:auto;margin-top:8px"></div>
    <p style="text-align:right;margin:10px 0 0"><button class="pbtn" id="slC">Vazgeç</button> <button class="pbtn pri" id="slO">Uygula</button></p>`;
  $('#modal').style.display = 'flex';
  const before = schedInfo();
  const draw = () => {
    const n = parseInt($('#slN').value, 10) || 0, sh = slipPlan(tc, n), rows = [...sh].filter(([, d]) => d);
    const newEnd = Math.max(...allTests().filter(dated).map(t => tSpan(t)[1] + (sh.get(t.id) || 0) * DAY_MS));
    $('#slL').innerHTML = rows.length ? `<table class="rt"><thead><tr><th>Test</th><th>Mevcut plan</th><th>Yeni plan</th><th>Kayma</th></tr></thead><tbody>${rows.map(([id, d]) => { const t = E(id); return `<tr><td class="noi18n">${esc(tcLabel(t))}</td><td>${fmtD(t.pStart)} – ${fmtD(t.pEnd || t.pStart)}</td><td><b>${fmtD(addDaysISO(t.pStart, d))} – ${fmtD(addDaysISO(t.pEnd || t.pStart, d))}</b></td><td>${d > 0 ? '+' : ''}${d} gün</td></tr>`; }).join('')}</tbody></table><div style="margin-top:8px">Kampanya bitişi: <b>${fmtD(isoOf(before.end))}</b> → <b style="color:${newEnd > before.end ? '#c0392b' : '#2e9e6a'}">${fmtD(isoOf(newEnd))}</b> (${Math.round((newEnd - before.end) / DAY_MS) >= 0 ? '+' : ''}${Math.round((newEnd - before.end) / DAY_MS)} gün)</div>` : '<div class="muted">Kayma yok.</div>';
  };
  const close = () => { $('#modal').style.display = 'none'; box.style.width = ''; box.style.maxWidth = ''; box.onclick = null; box.oninput = null; box.onkeydown = null; };
  box.oninput = draw; draw();
  box.onkeydown = ev => { ev.stopPropagation(); if(ev.key === 'Escape') close(); if(ev.key === 'Enter'){ ev.preventDefault(); $('#slO').click(); } };
  box.onclick = ev => {
    if(ev.target.id === 'slC') close();
    if(ev.target.id !== 'slO') return;
    const n = parseInt($('#slN').value, 10) || 0, sh = slipPlan(tc, n); if(!n) return close();
    snap(); sh.forEach((d, id) => { const t = E(id); if(!d) return; t.pStart = addDaysISO(t.pStart, d); if(t.pEnd) t.pEnd = addDaysISO(t.pEnd, d); });
    close(); afterChange(); toast(`${[...sh.values()].filter(Boolean).length} testin tarihi kaydırıldı`);
  };
  setTimeout(() => { const i = $('#slN'); i.focus(); i.select(); }, 30);
}
/* gün aralığı içinde dolu gün sayısı */
function resLoad(r){ const ts = allTests().filter(t => dated(t) && (t.res || []).includes(r.id)), days = new Set(); ts.forEach(t => { const [a, b] = tSpan(t); for(let d = a; d <= b; d += DAY_MS) days.add(d); }); return {ts, days:days.size}; }
const calLate = (r, t) => r.cal && t.pEnd && r.cal < t.pEnd;

/* ---------- Gantt (test satırları / kaynak satırları, bağımlılık okları, kritik yol, çakışma) ---------- */
function ganttSVG(tests, o){
  o = o || {};
  const mode = o.mode || CP.mode || 'tests', showDeps = o.deps != null ? o.deps : CP.deps, showCrit = o.crit != null ? o.crit : CP.crit;
  const dts = tests.filter(dated);
  if(!dts.length) return `<div class="untr" style="margin-bottom:12px">Zaman çizelgesi için testlere <b>planlanan başlangıç</b> ve <b>bitiş</b> tarihi girin (aşağıdaki tablodan veya Özellikler panelinden).</div>`;
  const P = pISO, today = P(todayISO());
  let min = Infinity, max = -Infinity;
  dts.forEach(t => { const [a, b] = tSpan(t); min = Math.min(min, a); max = Math.max(max, b); if(t.rDate && !isNaN(P(t.rDate))){ min = Math.min(min, P(t.rDate)); max = Math.max(max, P(t.rDate)); } });
  if(today >= min - 45 * DAY_MS && today <= max + 45 * DAY_MS){ min = Math.min(min, today); max = Math.max(max, today); }
  min -= 3 * DAY_MS; max += 4 * DAY_MS;
  const days = Math.round((max - min) / DAY_MS);
  const pxd = CP.scale === 'gun' ? 26 : CP.scale === 'hafta' ? 9 : CP.scale === 'ay' ? 3 : Math.max(3, Math.min(26, 980 / days));
  const LW = 270, RH = 26, HH = 42, W = LW + days * pxd + 10, X = ms => LW + (ms - min) / DAY_MS * pxd, SC = schedInfo();
  const rows = [];
  if(mode === 'res'){
    allResources().forEach(r => rows.push({r, lbl:r.name || 'Kaynak', sub:r.rtype || '', bars:dts.filter(t => (t.res || []).includes(r.id))}));
    const none = dts.filter(t => !tcRes(t).length); if(none.length) rows.push({lbl:'(kaynak atanmamış)', sub:'', bars:none, none:true});
  } else {
    const groups = [], gk = t => CP.grp === 'none' ? '' : CP.grp === 'result' ? testResult(t) : (t[CP.grp] || '(belirtilmemiş)');
    const order = CP.grp === 'tLevel' ? TEST_LEVELS : CP.grp === 'result' ? TEST_RESULT : [];
    dts.forEach(t => { const k = gk(t); let g = groups.find(x => x.k === k); if(!g) groups.push(g = {k, items:[]}); g.items.push(t); });
    groups.sort((a, b) => { const ia = order.indexOf(a.k), ib = order.indexOf(b.k); return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || a.k.localeCompare(b.k, 'tr'); });
    groups.forEach(g => { if(CP.grp !== 'none') rows.push({g:g.k, n:g.items.length}); g.items.forEach(t => rows.push({t, lbl:nm(t) + (t.procNo ? ' · ' + t.procNo : ''), bars:[t]})); });
  }
  const H = HH + rows.length * RH + 6;
  let s = `<svg class="gantt" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" font-family="Segoe UI, Arial, sans-serif"><defs><marker id="gar" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L8 4L0 8z" fill="#5b6b80"/></marker><marker id="garr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L8 4L0 8z" fill="#c0392b"/></marker></defs>`;
  s += `<rect x="0" y="0" width="${W}" height="${H}" fill="#fff"/><rect x="0" y="0" width="${W}" height="${HH}" fill="#26364b"/>`;
  const AYLAR = typeof LANG !== 'undefined' && LANG === 'en' && !o.raw ? ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] : ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
  for(let d = 0; d <= days; d++){
    const ms = min + d * DAY_MS, dt = new Date(ms), x = X(ms), dom = dt.getUTCDate(), wd = dt.getUTCDay();
    if(pxd >= 9 && (wd === 0 || wd === 6)) s += `<rect x="${x}" y="${HH}" width="${pxd}" height="${H - HH}" fill="#f5f6f8"/>`;
    const dim = new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth() + 1, 0)).getUTCDate();
    if(dom === 1 || (d === 0 && (dim - dom + 1) * pxd > 70)){ s += `<line x1="${x}" y1="0" x2="${x}" y2="${H}" stroke="${d === 0 ? 'none' : '#cfd6df'}"/><text x="${x + 4}" y="15" fill="#fff" font-size="11.5" font-weight="600">${AYLAR[dt.getUTCMonth()]} ${dt.getUTCFullYear()}</text>`; }
    if(pxd >= 14) s += `<text x="${x + pxd / 2}" y="34" fill="#c9d3e0" font-size="10" text-anchor="middle">${dom}</text>`;
    else if(wd === 1 && pxd >= 5) s += `<line x1="${x}" y1="${HH}" x2="${x}" y2="${H}" stroke="#eef1f4"/><text x="${x + 2}" y="34" fill="#c9d3e0" font-size="9.5">${dom}</text>`;
  }
  s += `<text x="10" y="30" fill="#fff" font-size="12" font-weight="600">${mode === 'res' ? 'Test kaynağı' : 'Test durumu'}</text>`;
  let y = HH; const pos = {};
  rows.forEach(row => {
    if(row.g != null){ s += `<rect x="0" y="${y}" width="${W}" height="${RH}" fill="#eef2f8"/><text x="10" y="${y + 17}" font-size="12" font-weight="700" fill="#26364b">${esc(row.g)} <tspan fill="#8592a3" font-weight="400">(${row.n})</tspan></text>`; y += RH; return; }
    const gid = row.t ? row.t.id : row.r ? row.r.id : '', rc = row.r ? SC.rconf.get(row.r.id) : null;
    s += `<g${gid ? ` data-goto="${gid}"` : ''} style="cursor:pointer"><rect x="0" y="${y}" width="${W}" height="${RH}" fill="${ST.tsel === gid && gid ? '#e8f0fe' : 'transparent'}"/><line x1="0" y1="${y + RH}" x2="${W}" y2="${y + RH}" stroke="#eef1f4"/>`;
    const lbl = row.lbl + (row.sub ? ' · ' + row.sub : '');
    s += `<text x="${row.t && CP.grp !== 'none' ? 20 : 10}" y="${y + 17}" font-size="12" fill="${row.none ? '#8592a3' : '#26364b'}"${row.none ? ' font-style="italic"' : ' class="noi18n"'}>${esc(lbl.length > 38 ? lbl.slice(0, 37) + '…' : lbl)}<title>${esc(lbl)}</title></text>`;
    if(rc && rc.size) s += `<text x="${LW - 8}" y="${y + 17}" font-size="12" text-anchor="end" fill="#c0392b" font-weight="700">⚠<title>Kaynak çakışması</title></text>`;
    row.bars.forEach(t => {
      const [a, b] = tSpan(t), res = testResult(t), col = RES_COL[res], late = overdue(t), cr = showCrit && SC.crit.has(t.id) && !['Geçti'].includes(res);
      const bx = X(a), bw = Math.max(pxd, (b - a) / DAY_MS * pxd + pxd), cf = (SC.conf.get(t.id) || []).filter(c => mode !== 'res' || !row.r || c.includes(row.r.name)), lateCal = row.r && calLate(row.r, t);
      const stroke = late ? 'stroke="#c0392b" stroke-width="2.5" stroke-dasharray="4 2"' : cr ? 'stroke="#1e2733" stroke-width="2.4"' : '';
      const tip = `${nm(t)}\n${fmtD(t.pStart)} – ${fmtD(t.pEnd || t.pStart)}\nSonuç: ${res}${late ? ' (gecikmiş)' : ''}${SC.tf.has(t.id) ? '\nToplam bolluk: ' + SC.tf.get(t.id) + ' gün' + (SC.crit.has(t.id) ? ' (kritik yol)' : '') : ''}${cf.length ? '\n' + cf.join('\n') : ''}${lateCal ? '\nKalibrasyon geçerliliği test bitişinden önce doluyor' : ''}`;
      s += `<rect x="${bx}" y="${y + 5}" width="${bw}" height="${RH - 10}" rx="4" fill="${col}"${mode === 'res' && cf.length ? ' fill-opacity="0.75"' : ''} ${stroke}${mode === 'res' ? ` data-goto="${t.id}"` : ''}><title>${esc(tip)}</title></rect>`;
      const rt = mode === 'res' ? (t.procNo || nm(t)) : res + (late ? ' !' : '');
      if(bw > tw(rt, true, 10.5) + 10) s += `<text x="${bx + bw / 2}" y="${y + 17}" font-size="10.5" font-weight="700" fill="#fff" text-anchor="middle" pointer-events="none"${mode === 'res' ? ' class="noi18n"' : ''}>${esc(rt)}</text>`;
      else if(mode !== 'res') s += `<text x="${bx + bw + 4}" y="${y + 17}" font-size="10.5" fill="${col}" font-weight="700" pointer-events="none">${esc(rt)}</text>`;
      if(cf.length) s += `<path d="M${bx - 1} ${y + 1}l7 0-3.5 6z" fill="#c0392b" stroke="#fff" stroke-width=".8"><title>${esc(cf.join('\n'))}</title></path>`;
      if(lateCal) s += `<circle cx="${bx + bw - 3}" cy="${y + 5}" r="3.5" fill="#d18a00" stroke="#fff"><title>Kalibrasyon geçerliliği test bitişinden önce doluyor</title></circle>`;
      if(row.t){ pos[t.id] = {x1:bx, x2:bx + bw, y:y + RH / 2}; if(t.rDate && !isNaN(P(t.rDate))){ const rx = X(P(t.rDate)) + pxd / 2; s += `<path d="M${rx} ${y + 3}l5 5-5 5-5-5z" fill="#26364b" stroke="#fff"><title>Sonuç tarihi ${fmtD(t.rDate)}</title></path>`; } }
    });
    s += `</g>`; y += RH;
  });
  if(mode !== 'res' && showDeps){
    const bad = new Set(SC.depBad.map(x => x.p.id + '>' + x.t.id));
    dts.forEach(t => tcDeps(t).forEach(p => { const A = pos[p.id], Bp = pos[t.id]; if(!A || !Bp) return; const isBad = bad.has(p.id + '>' + t.id), xm = Math.max(A.x2 + 6, Math.min(Bp.x1 - 6, A.x2 + 6)); s += `<path d="M${A.x2} ${A.y}H${xm}V${Bp.y}H${Bp.x1 - 1}" fill="none" stroke="${isBad ? '#c0392b' : '#5b6b80'}" stroke-width="1.3"${isBad ? ' stroke-dasharray="4 2"' : ''} marker-end="url(#${isBad ? 'garr' : 'gar'})"><title>${esc(tcLabel(p) + ' → ' + tcLabel(t) + (isBad ? ' — bağımlılık ihlali: ardıl test öncül bitmeden başlıyor' : ''))}</title></path>`; }));
  }
  if(today >= min && today <= max){ const tx = X(today) + pxd / 2; s += `<line x1="${tx}" y1="${HH - 6}" x2="${tx}" y2="${H}" stroke="#c0392b" stroke-width="1.5" stroke-dasharray="5 3"/><rect x="${tx - 22}" y="${HH - 12}" width="44" height="13" rx="6" fill="#c0392b"/><text x="${tx}" y="${HH - 2}" font-size="9.5" fill="#fff" text-anchor="middle" font-weight="700">Bugün</text>`; }
  s += `<line x1="${LW - 0.5}" y1="0" x2="${LW - 0.5}" y2="${H}" stroke="#cfd6df"/></svg>`;
  if(o.raw) return {str:s, w:W, h:H};
  const undated = tests.length - dts.length;
  const leg = `<div class="gleg muted"><span><i style="border:2.4px solid #1e2733"></i>Kritik yol</span><span><i style="border:2px dashed #c0392b"></i>Gecikmiş</span><span><b style="color:#5b6b80">→</b> Bağımlılık</span><span><b style="color:#c0392b">⇢</b> Bağımlılık ihlali</span><span><b style="color:#c0392b">▼</b> Kaynak / numune çakışması</span><span><b style="color:#d18a00">●</b> Kalibrasyon</span></div>`;
  return `<div class="ganttw">${s}</div>${leg}${undated ? `<div class="muted" style="margin:4px 0 0">${undated} testin planlanan tarihi yok; çizelgede gösterilmiyor.</div>` : ''}`;
}
function schedCards(){
  const SC = schedInfo(), rc = SC.pairs.filter(x => x.k === 'Kaynak').length, ac = SC.pairs.filter(x => x.k === 'Numune').length;
  const C = (v, t, col, sub) => `<div class="card"><div class="cv" style="color:${col}">${v}</div><div class="ct">${t}</div>${sub ? `<div class="cs">${sub}</div>` : ''}</div>`;
  const calBad = allResources().filter(r => resLoad(r).ts.some(t => calLate(r, t))).length;
  return `<div class="cards">${C(SC.end ? fmtD(isoOf(SC.end)) : '—', 'Kampanya bitişi', '#26364b', SC.start ? Math.round((SC.end - SC.start) / DAY_MS) + 1 + ' gün' : '')}${C(SC.crit.size, 'Kritik yoldaki test', '#26364b')}${C(rc, 'Kaynak çakışması', rc ? '#c0392b' : '#2e9e6a')}${ac ? C(ac, 'Numune çakışması', '#c0392b') : ''}${C(SC.depBad.length, 'Bağımlılık ihlali', SC.depBad.length ? '#c0392b' : '#2e9e6a')}${calBad ? C(calBad, 'Kalibrasyonu dolan kaynak', '#d18a00') : ''}</div>`;
}
function conflictsHTML(SC){
  SC = SC || schedInfo();
  if(!SC.pairs.length && !SC.depBad.length) return '<div class="muted" style="padding:4px">Çakışma veya bağımlılık ihlali yok.</div>';
  let h = '<table class="rt"><thead><tr><th>Tür</th><th>Kaynak / numune</th><th>Test 1</th><th>Test 2</th><th>Çakışan aralık</th><th></th></tr></thead><tbody>';
  SC.pairs.forEach(x => { h += `<tr class="late"><td>${x.k === 'Kaynak' ? 'Kaynak çakışması' : 'Numune çakışması'}</td><td class="noi18n">${esc(x.k === 'Kaynak' ? x.x.name : taLabel(x.x))}</td><td class="noi18n"><a class="lnk" data-goto="${x.a.id}">${esc(tcLabel(x.a))}</a></td><td class="noi18n"><a class="lnk" data-goto="${x.b.id}">${esc(tcLabel(x.b))}</a></td><td>${fmtD(isoOf(x.ov[0]))} – ${fmtD(isoOf(x.ov[1]))}</td><td><button class="vb" data-cslip="${x.b.id}">⇥ Kaydır…</button></td></tr>`; });
  SC.depBad.forEach(x => { h += `<tr class="late"><td>Bağımlılık ihlali</td><td>—</td><td class="noi18n"><a class="lnk" data-goto="${x.p.id}">${esc(tcLabel(x.p))}</a> <span class="muted">(öncül)</span></td><td class="noi18n"><a class="lnk" data-goto="${x.t.id}">${esc(tcLabel(x.t))}</a></td><td>${x.d} gün erken başlıyor</td><td><button class="vb" data-cslip="${x.t.id}" data-cn="${x.d}">⇥ Kaydır…</button></td></tr>`; });
  return h + '</tbody></table>';
}
async function ganttPng(){
  const r = ganttSVG(campaignTests(), {raw:true}); if(!r || !r.str) return toast('Çizelgede tarihli test yok');
  const bl = await svgToPng(r, 2); download(new Blob([bl], {type:'image/png'}), fileSafe(E(M.rootId).name) + ' - Test Takvimi.png');
}
function planXlsx(){
  const SC = schedInfo(), H = a => a.map(v => ({v, s:1}));
  const T = [H(['Test', 'Prosedür no', 'Başlangıç', 'Bitiş', 'Süre (gün)', 'Kaynaklar', 'Önce gelen testler', 'Toplam bolluk (gün)', 'Kritik yol', 'Sonuç', 'Çakışmalar'])];
  allTests().forEach(t => { const d = dated(t); T.push([{v:nm(t), s:6}, t.procNo || '', fmtD(t.pStart), fmtD(t.pEnd), d ? Math.round((tSpan(t)[1] - tSpan(t)[0]) / DAY_MS) + 1 : '', tcRes(t).map(r => r.name).join(', '), tcDeps(t).map(tcLabel).join(', '), SC.tf.has(t.id) ? SC.tf.get(t.id) : '', SC.crit.has(t.id) ? {v:'Evet', s:5} : '', testResult(t), (SC.conf.get(t.id) || []).join('\n')]); });
  const R = [H(['Kaynak', 'Tür', 'Konum', 'Kalibrasyon geçerlilik', 'Test', 'Başlangıç', 'Bitiş', 'Uyarı'])];
  allResources().forEach(r => { const L = resLoad(r); if(!L.ts.length) R.push([{v:r.name, s:6}, r.rtype || '', r.loc || '', fmtD(r.cal), '', '', '', '']); L.ts.forEach(t => R.push([{v:r.name, s:6}, r.rtype || '', r.loc || '', fmtD(r.cal), tcLabel(t), fmtD(t.pStart), fmtD(t.pEnd), [(SC.rconf.get(r.id) || new Set()).has(t.id) ? 'Çakışma' : '', calLate(r, t) ? 'Kalibrasyon' : ''].filter(Boolean).join(', ')])); });
  const C = [H(['Tür', 'Kaynak / numune', 'Test 1', 'Test 2', 'Çakışan aralık'])];
  SC.pairs.forEach(x => C.push([x.k === 'Kaynak' ? 'Kaynak çakışması' : 'Numune çakışması', x.k === 'Kaynak' ? x.x.name : taLabel(x.x), tcLabel(x.a), tcLabel(x.b), fmtD(isoOf(x.ov[0])) + ' – ' + fmtD(isoOf(x.ov[1]))]));
  SC.depBad.forEach(x => C.push(['Bağımlılık ihlali', '', tcLabel(x.p), tcLabel(x.t), x.d + ' gün erken başlıyor']));
  download(buildXlsx([{name:'Test Planı', rows:T, widths:[32, 13, 11, 11, 9, 28, 30, 11, 9, 11, 50], header:true, freeze:[1, 1], filter:1}, {name:'Kaynak Planı', rows:R, widths:[26, 20, 18, 13, 34, 11, 11, 18], header:true, freeze:[1, 1], filter:1}, {name:'Çakışmalar', rows:C, widths:[20, 26, 34, 34, 24], header:true, freeze:[1, 0], filter:1}]), fileSafe(E(M.rootId).name) + ' - Test Planı ve Kaynaklar.xlsx');
}

/* ---------- Test kaynakları görünümü ---------- */
function resourcesHTML(){
  const all = allResources(), SC = schedInfo();
  if(!all.length) return `<div class="vempty">Henüz test kaynağı yok.<br><br><button class="vb pri" data-rsx="add">+ Kaynak ekle</button><br><br><span class="muted">Kaynak: sarsıcı, iklim odası, akustik oda, ölçüm cihazı, fikstür, personel gibi testlerin paylaştığı imkânlar. Testlere atanınca aynı anda iki testte kullanılan kaynaklar çakışma olarak işaretlenir.</span></div>`;
  let h = schedCards();
  h += `<table class="rt fmt"><thead><tr><th class="rn">#</th><th data-en="Resource">Kaynak</th><th>Tür</th><th>Konum</th><th>Kalibrasyon geçerlilik</th><th>Testler</th><th>Dolu gün</th><th>Çakışma</th><th></th></tr></thead><tbody>`;
  all.forEach((r, i) => {
    const L = resLoad(r), rc = SC.rconf.get(r.id), cl = L.ts.some(t => calLate(r, t));
    h += `<tr data-row="${r.id}" class="${ST.tsel === r.id ? 'sel' : ''}"><td class="rn">${i + 1}</td><td>${ce(r, 'name')}</td><td>${strSel(`data-rsf="${r.id}|rtype"`, RES_TYPES.includes(r.rtype) || !r.rtype ? RES_TYPES : RES_TYPES.concat([r.rtype]), r.rtype || 'Diğer')}</td><td>${ce(r, 'loc')}</td>
      <td><input type="date" class="fmsel${cl ? ' late' : ''}" data-rsf="${r.id}|cal" value="${esc(r.cal || '')}"${cl ? ' title="Bir testin bitişinden önce doluyor"' : ''}></td>
      <td><div class="tcell">${L.ts.map(t => `<span class="chip2${rc && rc.has(t.id) ? ' ncrc op' : ''}" title="${esc(fmtD(t.pStart) + ' – ' + fmtD(t.pEnd || t.pStart))}"><a class="lnk" data-goto="${t.id}">${esc(t.procNo || nm(t))}</a></span>`).join('') || '<span class="muted">—</span>'}</div></td>
      <td>${L.days || '—'}</td><td>${rc && rc.size ? `<b style="color:#c0392b">⚠ ${rc.size}</b>` : '<span class="muted">—</span>'}</td><td><button class="tdel" data-rsdel="${r.id}" title="Sil">✕</button></td></tr>`;
  });
  h += `</tbody></table><h3>Kaynak takvimi</h3>` + ganttSVG(allTests(), {mode:'res'});
  h += `<h3>Çakışmalar ve bağımlılık ihlalleri</h3>` + conflictsHTML(SC);
  return h + `<div class="vfoot">Kaynakları testlere test kampanyası tablosundaki "Kaynaklar" sütunundan veya test durumunun Özellikler panelinden atayın.</div>`;
}
function resourcesBar(){ return `<button class="vb pri" data-rsx="add">+ Kaynak</button><span class="vsep"></span><button class="vb" data-rsx="camp">Test kampanyası</button><button class="vb" data-rsx="xl">⤒ Plan Excel</button>`; }
VIEWS['@resources'] = {tr:'Test Kaynakları', ic:'TK', note:'Testlerin paylaştığı imkânlar: sarsıcı, iklim odası, akustik oda, ölçüm cihazı, fikstür, personel.<br><br>Aynı kaynağı veya numuneyi aynı günlerde kullanan testler <b>çakışma</b> olarak işaretlenir; kalibrasyon geçerliliği test bitişinden önce dolan kaynaklar uyarılır.<br><br>⇥ Kaydır ile testin ve ardıllarının nasıl kayacağını önizleyin.', render:resourcesHTML, bar:resourcesBar, status:() => allResources().length + ' kaynak'};
GO_EXT.TestResource = e => { ST.tsel = e.id; openD('@resources'); };
function pickResForTest(tc){ pickList('Kaynaklar — ' + nm(tc), allResources().map(r => Object.assign(Object.create(r), {name:r.name + (r.rtype ? ' (' + r.rtype + ')' : '')})), tc.res || [], ids => { snap(); tc.res = ids; afterChange(); }, {label:'+ Yeni kaynak', fn:() => resAdd().id}); }
function pickDepsForTest(tc){ const c = allTests().filter(t => t.id !== tc.id && !isSucc(tc.id, t.id)); pickList('Önce gelen testler — ' + nm(tc), c.map(t => Object.assign(Object.create(t), {name:tcLabel(t)})), (tc.deps || []).filter(id => c.some(t => t.id === id)), ids => { snap(); tc.deps = ids; afterChange(); }); }
(function(){
  const V = $('#view');
  V.addEventListener('click', ev => {
    const t = ev.target, q = s => t.closest(s); let b;
    if((b = q('[data-cres]'))){ pickResForTest(E(b.dataset.cres)); return; }
    if((b = q('[data-cdep]'))){ pickDepsForTest(E(b.dataset.cdep)); return; }
    if((b = q('[data-cslip]'))){ const tc = E(b.dataset.cslip); slipDialog(tc); if(b.dataset.cn){ const i = $('#slN'); if(i){ i.value = b.dataset.cn; i.dispatchEvent(new Event('input', {bubbles:true})); } } return; }
    if((b = q('[data-cpa]'))){ const a = b.dataset.cpa; if(a === 'png') ganttPng(); if(a === 'pxl') planXlsx(); if(a === 'res') openD('@resources'); return; }
    if(ST.cur !== '@resources') return;
    if((b = q('[data-rsx]'))){ const a = b.dataset.rsx; if(a === 'add'){ snap(); const r = resAdd(); ST.tsel = r.id; pendingFocus = [r.id, 'name']; afterChange(); } if(a === 'camp') openD('@campaign'); if(a === 'xl') planXlsx(); return; }
    if((b = q('[data-rsdel]'))){ const r = E(b.dataset.rsdel); if(r && confirm(`"${r.name}" kaynağı silinsin mi?`)){ snap(); allTests().forEach(x => { if((x.res || []).includes(r.id)) x.res = x.res.filter(y => y !== r.id); }); delModel([r.id]); afterChange(); } return; }
    const row = q('tr[data-row]'); if(row && !q('.ce') && !q('select') && !q('input') && !q('button') && !q('a')){ ST.tsel = row.dataset.row; renderTree(); renderProps(); markSelRow(); }
  });
  V.addEventListener('change', ev => {
    const t = ev.target;
    if(t.dataset.cpx){ CP[t.dataset.cpx] = t.type === 'checkbox' ? t.checked : t.value; renderView(); return; }
    if(t.dataset.rsf){ const [id, k] = t.dataset.rsf.split('|'), e = E(id); if(!e || (e[k] || '') === t.value) return; snap(); e[k] = t.value; afterChange(); }
  });
  $('#props').addEventListener('click', ev => {
    const a = ev.target.closest('[data-cres]'); if(a){ pickResForTest(E(a.dataset.cres)); return; }
    const d = ev.target.closest('[data-cdep]'); if(d){ pickDepsForTest(E(d.dataset.cdep)); return; }
    const sl = ev.target.closest('[data-cslip]'); if(sl) slipDialog(E(sl.dataset.cslip));
  });
})();
function testPlanProps(el){
  const rs = tcRes(el), ds = tcDeps(el), SC = schedInfo(), cf = SC.conf.get(el.id) || [];
  let h = `<div class="sub"><span>Kaynaklar (${rs.length})</span><button data-cres="${el.id}">+ / −</button></div>` + (rs.length ? rs.map(r => `<div class="li"><a class="lnk noi18n" data-goto="${r.id}">${esc(r.name)}</a> <span class="muted">${esc(r.rtype || '')}</span>${calLate(r, el) ? ' <span style="color:#d18a00" title="Kalibrasyon geçerliliği test bitişinden önce doluyor">● kalibrasyon</span>' : ''}</div>`).join('') : '<div class="muted" style="font-size:12px">Kaynak atanmamış</div>');
  h += `<div class="sub"><span>Önce gelen testler (${ds.length})</span><button data-cdep="${el.id}">+ / −</button></div>` + (ds.length ? ds.map(p => `<div class="li noi18n"><a class="lnk" data-goto="${p.id}">${esc(tcLabel(p))}</a></div>`).join('') : '<div class="muted" style="font-size:12px">Yok</div>');
  if(SC.tf.has(el.id)) h += `<div class="li">Toplam bolluk: <b>${SC.tf.get(el.id)} gün</b>${SC.crit.has(el.id) ? ' · <b>kritik yol</b>' : ''} <button class="pbtn" data-cslip="${el.id}">⇥ Kaydır…</button></div>`;
  if(cf.length) h += `<div class="gaps" style="background:#fdf2f2;border-color:#f1c4c4;color:#8a2a2a">${cf.map(esc).join('<br>')}</div>`;
  return h;
}
PROPS_EXT.TestResource = (el, pf) => {
  const L = resLoad(el);
  let h = pf('Tür', `<select data-f="rtype">${(RES_TYPES.includes(el.rtype) || !el.rtype ? RES_TYPES : RES_TYPES.concat([el.rtype])).map(x => `<option${(el.rtype || 'Diğer') === x ? ' selected' : ''}>${esc(x)}</option>`).join('')}</select>`) + pf('Konum', `<input data-f="loc" value="${esc(el.loc || '')}">`) + pf('Kalibrasyon geçerlilik', `<input type="date" data-f="cal" value="${esc(el.cal || '')}">`);
  h += `<div class="sub"><span>Testler (${L.ts.length}) · ${L.days} gün</span></div>` + (L.ts.map(t => `<div class="li"><span class="muted">${fmtD(t.pStart)}</span> <a class="lnk noi18n" data-goto="${t.id}">${esc(tcLabel(t))}</a></div>`).join('') || '<div class="muted" style="font-size:12px">Atanmış test yok</div>');
  return h + pf('', `<button class="pbtn" data-gox="${el.id}">Kaynak listesinde aç</button>`);
};
VALIDATORS.push((add) => {
  const SC = schedInfo();
  SC.pairs.forEach(x => add('uyarı', x.k === 'Kaynak' ? 'Kaynak çakışması' : 'Numune çakışması', x.b, `${x.k === 'Kaynak' ? x.x.name : taLabel(x.x)}: ${tcLabel(x.a)} ile ${fmtD(isoOf(x.ov[0]))} – ${fmtD(isoOf(x.ov[1]))} arasında çakışıyor`));
  SC.depBad.forEach(x => add('uyarı', 'Bağımlılık ihlali', x.t, `Öncül "${tcLabel(x.p)}" bitmeden başlıyor (${x.d} gün)`));
  allResources().forEach(r => resLoad(r).ts.filter(t => calLate(r, t)).forEach(t => add('uyarı', 'Kalibrasyon', r, `Kalibrasyon geçerliliği (${fmtD(r.cal)}) "${tcLabel(t)}" bitişinden önce doluyor`)));
});
RPT_SECTIONS.push(['plan', 'Test planı, kaynaklar ve çakışmalar']);
RPT_EXT.push((o, H, Pp, TB, B, sec, figRef) => {
  if(!o.plan || !allTests().some(dated)) return sec;
  const SC = schedInfo();
  H(1, `${++sec}. Test planı ve kaynaklar`);
  Pp(`Kampanya ${fmtD(isoOf(SC.start))} – ${fmtD(isoOf(SC.end))} (${Math.round((SC.end - SC.start) / DAY_MS) + 1} gün). Kritik yoldaki testler: ${allTests().filter(t => SC.crit.has(t.id)).map(tcLabel).join(', ') || '—'}.`);
  const g = ganttSVG(allTests(), {raw:true, mode:'tests'}); B.push({t:'img', r:g, cap:`Şekil ${figRef()} – Test takvimi`});
  if(allResources().length){ const r = ganttSVG(allTests(), {raw:true, mode:'res'}); B.push({t:'img', r, cap:`Şekil ${figRef()} – Kaynak takvimi`}); TB(['Kaynak', 'Tür', 'Konum', 'Kalibrasyon', 'Testler', 'Dolu gün'], allResources().map(x => { const L = resLoad(x); return [x.name || '', x.rtype || '', x.loc || '', fmtD(x.cal), L.ts.map(t => t.procNo || nm(t)).join(', '), String(L.days)]; }), [20, 16, 14, 11, 30, 9]); }
  if(SC.pairs.length || SC.depBad.length){ H(2, 'Çakışmalar ve bağımlılık ihlalleri'); TB(['Tür', 'Kaynak / numune', 'Test 1', 'Test 2', 'Aralık'], SC.pairs.map(x => [x.k === 'Kaynak' ? 'Kaynak çakışması' : 'Numune çakışması', x.k === 'Kaynak' ? x.x.name : taLabel(x.x), tcLabel(x.a), tcLabel(x.b), fmtD(isoOf(x.ov[0])) + ' – ' + fmtD(isoOf(x.ov[1]))]).concat(SC.depBad.map(x => ['Bağımlılık ihlali', '', tcLabel(x.p), tcLabel(x.t), x.d + ' gün erken'])), [16, 18, 25, 25, 16]); }
  return sec;
});
DEMO_EXT.push(X => {
  const T = n => Object.values(M.els).find(e => e.kind === 'TestCase' && e.name === n), td = todayISO();
  const r1 = resAdd({name:'Elektrodinamik sarsıcı', rtype:'Sarsıcı (titreşim)', loc:'Çevre Test Merkezi', cal:addDaysISO(td, 200)});
  const r2 = resAdd({name:'İklim odası', rtype:'İklim / termal oda', loc:'Çevre Test Merkezi', cal:addDaysISO(td, 120)});
  const r3 = resAdd({name:'Güç kaynağı ve elektronik yük', rtype:'Ölçüm / güç cihazı', loc:'Test Laboratuvarı', cal:addDaysISO(td, 2)});
  resAdd({name:'EMC odası', rtype:'EMI / EMC odası', loc:'Dış laboratuvar', cal:addDaysISO(td, 300)});
  const set = (t, o) => { if(t) Object.assign(t, o); };
  const ess = T('Çevresel gerilim taraması (ESS)'), qt = T('Rastgele titreşim kalifikasyon testi'), bs = T('Besleme gerilimi testi'), gb = T('Güç birimi birim testi'), rt = T('Besleme gerilimi testi (tekrar)'), emc = T('EMC kalifikasyon testi'), sb = T('Sensör veri hızı ölçümü');
  set(gb, {res:[r3.id]}); set(bs, {res:[r3.id], deps:gb ? [gb.id] : []});
  set(rt, {pStart:addDaysISO(td, 3), pEnd:addDaysISO(td, 4), res:[r3.id], deps:bs ? [bs.id] : []});
  set(ess, {pStart:addDaysISO(td, 14), pEnd:addDaysISO(td, 17), res:[r1.id, r2.id]});
  set(qt, {pStart:addDaysISO(td, 16), pEnd:addDaysISO(td, 20), res:[r1.id], deps:ess ? [ess.id] : []});
  const emcR = allResources().find(r => r.name === 'EMC odası'); set(emc, {res:emcR ? [emcR.id] : [], deps:sb ? [sb.id] : []});
});

