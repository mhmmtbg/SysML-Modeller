/* ================= v1.39: ŞÜPHELİ BAĞLANTILAR, BİRİM/BOYUT ANALİZİ, ARAYÜZ TUTARLILIK KURALLARI ================= */
if(typeof UI_RULES !== 'undefined') UI_RULES.unshift([/gözden geçirildi|reviewed/i, 'check']);
/* ---------- şüpheli bağlantılar (suspect links) ---------- */
const SUS_KINDS = new Set(['Satisfy', 'Verify', 'DeriveReqt', 'Refine', 'Trace', 'Allocate']);
let SUS_FIELDS_C = null; const susFields = () => SUS_FIELDS_C || (SUS_FIELDS_C = new Set([...SUBST].map(k => { try { return fieldLabel(k); } catch(e){ return k; } })));
{
  const _trc = trackReqChanges;
  trackReqChanges = function(){
    const n0 = M && M.reqLog ? M.reqLog.length : 0;
    _trc.apply(this, arguments);
    if(!M || !M.reqLog) return;
    const fresh = M.reqLog.slice(n0).filter(x => susFields().has(x.f) && x.o !== '' && x.id);
    if(!fresh.length) return;
    const by = new Map(); fresh.forEach(x => { if(!by.has(x.id)) by.set(x.id, []); by.get(x.id).push(x); });
    let n = 0;
    Object.values(M.els).forEach(r => {
      if(!SUS_KINDS.has(r.kind)) return;
      [r.src, r.tgt].forEach(id => { const ch = by.get(id); if(!ch) return; const q = E(id); r.suspect = {t:ch[0].t, u:ch[0].u, rid:q ? q.reqId || q.name : '', f:ch.map(c => c.f).join(', '), o:ch.map(c => c.o).join(' | ').slice(0, 300), n:ch.map(c => c.n).join(' | ').slice(0, 300), by:id}; n++; });
    });
    if(n) toast(`${n} izlenebilirlik bağlantısı şüpheli olarak işaretlendi — Gereksinimler ▾ → Şüpheli bağlantılar`);
  };
}
const allSuspects = () => Object.values(M.els).filter(r => r.suspect && E(r.src) && E(r.tgt));
function suspectClear(ids, why){
  const L = M.suspectLog = M.suspectLog || []; let n = 0;
  ids.forEach(id => { const r = E(id); if(!r || !r.suspect) return; L.push({t:new Date().toISOString(), u:userName(), rel:id, kind:r.kind, src:nm(E(r.src)), tgt:nm(E(r.tgt)), cause:r.suspect.f, why:why || ''}); delete r.suspect; n++; });
  if(L.length > 2000) L.splice(0, L.length - 2000);
  return n;
}
function suspectHTML(){
  const L = allSuspects().sort((a, b) => String(b.suspect.t).localeCompare(String(a.suspect.t)));
  const lab = e => e ? (e.kind === 'Requirement' ? (e.reqId || '') + ' ' + (e.name || '') : nm(e)) : '?';
  let h = `<div class="cards"><div class="card"><div class="cv" style="color:${L.length ? '#d18a00' : '#2e9e6a'}">${L.length}</div><div class="ct">Şüpheli bağlantı</div></div><div class="card"><div class="cv">${(M.suspectLog || []).length}</div><div class="ct">Gözden geçirilmiş (kayıt)</div></div></div>`;
  if(!L.length) return h + `<div class="vempty">Şüpheli bağlantı yok.<br><br><span class="muted">Bir gereksinimin metni, adı, seviyesi, alt sistemi veya doğrulama yöntemi değiştiğinde ona bağlı Satisfy / Verify / Derive / Refine / Trace / Allocate ilişkileri burada listelenir; karşı taraftaki tasarım veya test gözden geçirilince onaylanır.</span></div>`;
  h += `<table class="rt"><thead><tr><th><input type="checkbox" data-susall="1"></th><th>İlişki</th><th>Kaynak</th><th>Hedef</th><th>Değişen</th><th>Eski → yeni</th><th>Zaman</th><th></th></tr></thead><tbody>`;
  L.forEach(r => { const s = r.suspect; h += `<tr><td><input type="checkbox" data-sussel="${r.id}"></td><td>${esc(KIND[r.kind].tr.split(' (')[0])}</td><td class="noi18n"><a class="lnk" data-goto="${r.src}">${esc(lab(E(r.src)))}</a></td><td class="noi18n"><a class="lnk" data-goto="${r.tgt}">${esc(lab(E(r.tgt)))}</a></td><td>${esc(s.f)}<div class="muted noi18n" style="font-size:11px">${esc(s.rid)}</div></td><td class="noi18n" style="max-width:360px"><s class="muted">${esc(s.o)}</s><br>${esc(s.n)}</td><td style="white-space:nowrap">${esc(String(s.t).slice(0, 16).replace('T', ' '))}<div class="muted" style="font-size:11px">${esc(s.u || '')}</div></td><td><button class="vb" data-susok="${r.id}">Gözden geçirildi</button></td></tr>`; });
  return h + `</tbody></table><div class="vfoot">${L.length} şüpheli bağlantı · Onaylanan her bağlantı kim/ne zaman/neden bilgisiyle kayda geçer.</div>`;
}
function suspectBar(){ return `<button class="vb pri" data-susa="sel">Seçilileri gözden geçirildi işaretle</button><button class="vb" data-susa="log">Gözden geçirme kaydı</button><button class="vb" data-susa="xl">⤒ Excel'e aktar</button>`; }
VIEWS['@suspect'] = {tr:'Şüpheli Bağlantılar', ic:'⚠', note:'Gereksinim değiştikten sonra gözden geçirilmesi gereken izlenebilirlik ilişkileri (suspect links).<br><br>Karşı taraftaki tasarım elemanı veya test kontrol edilince <b>Gözden geçirildi</b> ile onaylayın; onay kişi, zaman ve gerekçeyle kaydedilir.', render:suspectHTML, bar:suspectBar, status:() => allSuspects().length + ' şüpheli'};
function suspectXlsx(){
  const rows = [['Durum', 'İlişki', 'Kaynak', 'Hedef', 'Değişen alan', 'Eski', 'Yeni', 'Zaman', 'Kullanıcı', 'Gerekçe'].map(v => ({v, s:1}))];
  allSuspects().forEach(r => rows.push(['Şüpheli', KIND[r.kind].tr, nm(E(r.src)), nm(E(r.tgt)), r.suspect.f, r.suspect.o, r.suspect.n, r.suspect.t, r.suspect.u || '', '']));
  (M.suspectLog || []).forEach(x => rows.push(['Gözden geçirildi', x.kind, x.src, x.tgt, x.cause, '', '', x.t, x.u, x.why]));
  download(buildXlsx([{name:'Şüpheli Bağlantılar', rows, widths:[16, 12, 30, 30, 18, 40, 40, 20, 14, 30], header:true, freeze:[0, 1], filter:1}]), fileSafe(E(M.rootId).name) + ' - Şüpheli Bağlantılar.xlsx');
}
(() => {
  const V = $('#view');
  V.addEventListener('click', ev => {
    if(ST.cur !== '@suspect') return; const t = ev.target;
    const ok = t.closest('[data-susok]'); if(ok){ const why = prompt('Gözden geçirme notu (isteğe bağlı):', '') ; if(why === null) return; snap(); suspectClear([ok.dataset.susok], why); afterChange(); return; }
    const a = t.closest('[data-susa]'); if(!a) return;
    if(a.dataset.susa === 'sel'){ const ids = [...V.querySelectorAll('[data-sussel]:checked')].map(i => i.dataset.sussel); if(!ids.length) return toast('Önce satır seçin'); const why = prompt('Gözden geçirme notu (isteğe bağlı):', ''); if(why === null) return; snap(); const n = suspectClear(ids, why); afterChange(); toast(n + ' bağlantı gözden geçirildi'); }
    if(a.dataset.susa === 'xl') suspectXlsx();
    if(a.dataset.susa === 'log'){ const L = (M.suspectLog || []).slice().reverse(); const box = $('#modalBox'); box.style.width = 'min(860px, 96vw)'; box.style.maxWidth = 'none'; box.innerHTML = `<h2>Gözden geçirme kaydı</h2>${L.length ? `<div style="max-height:56vh;overflow:auto"><table class="rt fmt"><thead><tr><th>Zaman</th><th>Kullanıcı</th><th>İlişki</th><th>Değişen</th><th>Gerekçe</th></tr></thead><tbody>${L.map(x => `<tr><td style="white-space:nowrap">${esc(x.t.slice(0, 16).replace('T', ' '))}</td><td class="noi18n">${esc(x.u)}</td><td class="noi18n">${esc(x.src)} → ${esc(x.tgt)} <span class="muted">${esc(x.kind)}</span></td><td>${esc(x.cause)}</td><td class="noi18n">${esc(x.why)}</td></tr>`).join('')}</tbody></table></div>` : '<div class="vempty">Kayıt yok.</div>'}<p style="text-align:right"><button class="pbtn pri" id="slC">Kapat</button></p>`; $('#modal').style.display = 'flex'; box.onclick = ev2 => { if(ev2.target.id === 'slC'){ $('#modal').style.display = 'none'; box.style.width = ''; box.style.maxWidth = ''; box.onclick = null; } }; }
  });
  V.addEventListener('change', ev => { if(ST.cur === '@suspect' && ev.target.dataset.susall) V.querySelectorAll('[data-sussel]').forEach(i => i.checked = ev.target.checked); });
})();
HOOKS.menu.req.push(r => { const n = allSuspects().length; r.push({t:'Şüpheli bağlantılar' + (n ? ' (' + n + ')' : ''), f:() => openD('@suspect')}); });
VALIDATORS.push((add, els) => { els.filter(r => r.suspect && E(r.src) && E(r.tgt)).forEach(r => add('uyarı', 'Şüpheli bağlantı', r, `${r.suspect.rid}: ${r.suspect.f} değişti — ${nm(E(r.src))} → ${nm(E(r.tgt))} gözden geçirilmeli`)); });
HOOKS.props.push((t, P) => { const el = t.el; if(!el) return;
  if(el.suspect) P.insertAdjacentHTML('beforeend', `<div class="sub"><span>⚠ Şüpheli bağlantı</span></div><div class="li">${esc(el.suspect.f)} değişti (${esc(String(el.suspect.t).slice(0, 10))})</div><div class="li noi18n"><s class="muted">${esc(el.suspect.o)}</s><br>${esc(el.suspect.n)}</div><div class="pf"><label></label><div><button class="pbtn pri" data-susprop="${el.id}">Gözden geçirildi</button></div></div>`);
  else if(el.kind === 'Requirement'){ const n = Object.values(M.els).filter(r => r.suspect && (r.src === el.id || r.tgt === el.id)).length; if(n) P.insertAdjacentHTML('beforeend', `<div class="sub"><span>⚠ ${n} şüpheli bağlantı</span></div><div class="pf"><label></label><div><button class="pbtn" data-openview="@suspect">Şüpheli bağlantılar</button></div></div>`); }
});
$('#props').addEventListener('click', ev => { const b = ev.target.closest('[data-susprop]'); if(b){ snap(); suspectClear([b.dataset.susprop], ''); afterChange(); } });
{
  const _mx = matrixHTML;
  matrixHTML = function(){ let h = _mx.apply(this, arguments); allSuspects().forEach(r => [r.src + '|' + r.tgt, r.tgt + '|' + r.src].forEach(k => { h = h.split(`class="mxd on" data-mx="${k}"`).join(`class="mxd on sus" data-mx="${k}"`); })); return h; };
  const _de2 = drawEdge;
  drawEdge = function(d, ed, SM, pts, exp){ let s = _de2.apply(this, arguments); const r = ed.el ? E(ed.el) : null; if(r && r.suspect && pts && pts.length > 1){ const i = Math.floor((pts.length - 1) / 2), a = pts[i], b = pts[i + 1]; s = s.replace(/<\/g>$/, `<text x="${(a.x + b.x) / 2 + 8}" y="${(a.y + b.y) / 2 + 16}" font-size="13" fill="#d18a00" font-family="Segoe UI,Arial">⚠</text></g>`); } return s; };
}
/* ---------- birim ve boyut analizi (SI) ---------- */
const DIM_N = 8; /* m kg s A K mol cd para */
const DZ = () => [0, 0, 0, 0, 0, 0, 0, 0];
const SI_UNITS = (() => {
  const U = {}, d = (a, k) => { const v = DZ(); a.forEach((x, i) => v[i] = x); return {d:v, k}; };
  const def = (names, dims, k) => names.split(' ').forEach(n => { U[n] = d(dims, k); });
  def('m', [1], 1); def('mm', [1], 1e-3); def('cm', [1], 1e-2); def('km', [1], 1e3); def('µm um', [1], 1e-6); def('in', [1], 0.0254); def('ft', [1], 0.3048);
  def('kg', [0, 1], 1); def('g gr', [0, 1], 1e-3); def('mg', [0, 1], 1e-6); def('ton t', [0, 1], 1e3); def('lb', [0, 1], 0.4536);
  def('s sn', [0, 0, 1], 1); def('ms', [0, 0, 1], 1e-3); def('µs us', [0, 0, 1], 1e-6); def('min dk', [0, 0, 1], 60); def('h sa saat', [0, 0, 1], 3600); def('gün', [0, 0, 1], 86400);
  def('A', [0, 0, 0, 1], 1); def('mA', [0, 0, 0, 1], 1e-3); def('kA', [0, 0, 0, 1], 1e3);
  def('K', [0, 0, 0, 0, 1], 1); def('°C degC', [0, 0, 0, 0, 1], 1); def('mol', [0, 0, 0, 0, 0, 1], 1); def('cd', [0, 0, 0, 0, 0, 0, 1], 1);
  def('Hz', [0, 0, -1], 1); def('kHz', [0, 0, -1], 1e3); def('MHz', [0, 0, -1], 1e6); def('GHz', [0, 0, -1], 1e9); def('rpm', [0, 0, -1], 1 / 60);
  def('N', [1, 1, -2], 1); def('kN', [1, 1, -2], 1e3); def('Pa', [-1, 1, -2], 1); def('kPa', [-1, 1, -2], 1e3); def('MPa', [-1, 1, -2], 1e6); def('bar', [-1, 1, -2], 1e5); def('mbar', [-1, 1, -2], 100); def('psi', [-1, 1, -2], 6895);
  def('J', [2, 1, -2], 1); def('kJ', [2, 1, -2], 1e3); def('Wh', [2, 1, -2], 3600); def('kWh', [2, 1, -2], 3.6e6);
  def('W', [2, 1, -3], 1); def('mW', [2, 1, -3], 1e-3); def('kW', [2, 1, -3], 1e3); def('MW', [2, 1, -3], 1e6);
  def('V', [2, 1, -3, -1], 1); def('mV', [2, 1, -3, -1], 1e-3); def('kV', [2, 1, -3, -1], 1e3);
  def('Ω ohm Ohm', [2, 1, -3, -2], 1); def('kΩ', [2, 1, -3, -2], 1e3); def('MΩ', [2, 1, -3, -2], 1e6);
  def('C', [0, 0, 1, 1], 1); def('Ah', [0, 0, 1, 1], 3600); def('mAh', [0, 0, 1, 1], 3.6); def('F', [-2, -1, 4, 2], 1); def('µF uF', [-2, -1, 4, 2], 1e-6);
  def('L l', [3], 1e-3); def('ml mL', [3], 1e-6);
  def('rad sr % dB dBm adet çevrim cycle döngü bit', [], 1); def('°', [], Math.PI / 180); def('kbps', [0, 0, -1], 1e3); def('Mbps', [0, 0, -1], 1e6); def('bps', [0, 0, -1], 1);
  def('€ k€ TL $ USD EUR', [0, 0, 0, 0, 0, 0, 0, 1], 1);
  def('grms', [1, 0, -2], 9.80665); def('G', [1, 0, -2], 9.80665);
  return U;
})();
function unitDim(u){
  u = String(u || '').trim(); if(!u) return null;
  if(SI_UNITS[u]) return SI_UNITS[u].d.slice();
  const norm = u.replace(/²/g, '^2').replace(/³/g, '^3').replace(/·|\*/g, ' ').replace(/\s*\/\s*/g, ' / ');
  let sign = 1, dim = DZ(), ok = false;
  for(const tok of norm.split(/\s+/).filter(Boolean)){
    if(tok === '/'){ sign = -1; continue; }
    const m = tok.match(/^(.+?)(?:\^(-?\d+))?$/); const base = SI_UNITS[m[1]]; if(!base) return null;
    const p = (m[2] ? +m[2] : 1) * sign; base.d.forEach((x, i) => dim[i] += x * p); ok = true;
  }
  return ok ? dim : null;
}
const DIM_SYM = ['m', 'kg', 's', 'A', 'K', 'mol', 'cd', '¤'];
const dimStr = d => { if(!d) return '?'; const p = d.map((x, i) => x ? DIM_SYM[i] + (x !== 1 ? '^' + x : '') : '').filter(Boolean); return p.length ? p.join('·') : '1'; };
const dimEq = (a, b) => a && b && a.every((x, i) => Math.abs(x - b[i]) < 1e-9);
/* ifade ağacının boyutu: null = serbest (sayı veya birimsiz değişken) */
function exDim(n, env, issues){
  if('n' in n) return null;
  if('v' in n) return env.has(n.v) ? env.get(n.v) : null;
  if(n.f){ const as = n.args.map(a => exDim(a, env, issues)); if(['min', 'max', 'abs', 'round', 'floor', 'ceil'].includes(n.f)){ const k = as.filter(Boolean); if(k.length > 1 && !k.every(x => dimEq(x, k[0]))) issues.push(n.f + '() içinde farklı boyutlar'); return k[0] || null; } if(n.f === 'sqrt'){ return as[0] ? as[0].map(x => x / 2) : null; } as.forEach(x => { if(x && x.some(v => v)) issues.push(n.f + '() bağımsız değişkeni boyutsuz olmalı'); }); return DZ(); }
  const a = exDim(n.a, env, issues); if(n.o === 'neg') return a;
  const b = exDim(n.b, env, issues);
  if(n.o === '+' || n.o === '-'){ if(a && b && !dimEq(a, b)) issues.push(`toplama/çıkarmada [${dimStr(a)}] ile [${dimStr(b)}]`); return a || b; }
  /* sayı sabiti çarpan olarak boyutsuzdur; birimsiz değişken ise bilinmeyen boyut (serbest) kabul edilir */
  const lit = x => 'n' in x;
  if(n.o === '*'){ if((!a && !lit(n.a)) || (!b && !lit(n.b))) return null; return (a || DZ()).map((x, i) => x + (b || DZ())[i]); }
  if(n.o === '/'){ if((!a && !lit(n.a)) || (!b && !lit(n.b))) return null; return (a || DZ()).map((x, i) => x - (b || DZ())[i]); }
  if(n.o === '^'){ if(!a) return null; const p = 'n' in n.b ? n.b.n : null; return p == null ? a : a.map(x => x * p); }
  return null;
}
function unitIssues(){
  const out = [];
  /* parametrik: kısıt bloğu parametrelerinin birimleri (param vtype/birim veya bağlı değerin birimi) */
  Object.values(M.els).filter(c => c.kind === 'ConstraintProp' && c.type && E(c.type)).forEach(cp => {
    const cb = E(cp.type), params = kidsOf(cb.id).filter(p => p.kind === 'Param'), env = new Map(), src = new Map();
    params.forEach(p => {
      let u = p.unit || unitOf(p); let from = 'parametre';
      if(!u){ const bd = Object.values(M.els).find(r => r.kind === 'Binding' && ((r.src === p.id && r.sp === cp.id) || (r.tgt === p.id && r.tp === cp.id))); const oth = bd ? E(bd.src === p.id ? bd.tgt : bd.src) : null; if(oth && oth.kind === 'Value'){ u = unitOf(oth); from = oth.name; } }
      const dd = unitDim(u); if(dd){ env.set(p.name, dd); src.set(p.name, u + ' (' + from + ')'); }
    });
    let eqs; try { eqs = parseEqs(String(cb.expr || '').split(/[;\n]+/).filter(l => /(?<![<>!=])=(?!=)/.test(l)).join('\n')); } catch(e){ return; }
    eqs.forEach(q => { const iss = []; const dl = exDim(q.l, env, iss), dr = exDim(q.r, env, iss); if(dl && dr && !dimEq(dl, dr)) iss.push(`sol [${dimStr(dl)}] ≠ sağ [${dimStr(dr)}]`); iss.forEach(m => out.push({el:cp, msg:`${cb.name}: "${q.src}" — ${m}. Birimler: ${[...src].map(([k, v]) => k + '=' + v).join(', ')}`})); });
  });
  /* binding: değer ↔ parametre/değer birimleri */
  Object.values(M.els).filter(r => r.kind === 'Binding').forEach(r => {
    const a = E(r.src), b = E(r.tgt); if(!a || !b) return; const ua = a.unit || unitOf(a), ub = b.unit || unitOf(b); const da = unitDim(ua), db = unitDim(ub);
    if(da && db && !dimEq(da, db)) out.push({el:r, msg:`Bağlama: ${a.name} [${ua}] ↔ ${b.name} [${ub}] boyutları farklı`});
    else if(da && db && ua !== ub && SI_UNITS[ua] && SI_UNITS[ub] && SI_UNITS[ua].k !== SI_UNITS[ub].k) out.push({el:r, sev:'bilgi', msg:`Bağlama: ${a.name} [${ua}] ↔ ${b.name} [${ub}] aynı boyut, farklı ölçek (×${+(SI_UNITS[ua].k / SI_UNITS[ub].k).toPrecision(4)})`});
  });
  /* connector: aynı adlı akış özelliklerinin birimleri */
  Object.values(M.els).filter(r => r.kind === 'Connector').forEach(c => {
    const pa = E(c.src), pb = E(c.tgt); if(!pa || !pb || !pa.type || !pb.type || pa.type === pb.type) return;
    const fa = kidsOf(pa.type).filter(f => f.kind === 'FlowProp'), fb = kidsOf(pb.type).filter(f => f.kind === 'FlowProp');
    fa.forEach(x => { const y = fb.find(z => z.name === x.name); if(!y) return; const ux = x.unit || unitOf(x), uy = y.unit || unitOf(y), dx = unitDim(ux), dy = unitDim(uy); if(dx && dy && !dimEq(dx, dy)) out.push({el:c, msg:`Bağlantı: "${x.name}" ${E(pa.type).name}'de [${ux}], ${E(pb.type).name}'de [${uy}]`}); });
  });
  /* değer: birim tanınmıyor */
  return out;
}
VALIDATORS.push(add => { unitIssues().forEach(x => add(x.sev || 'uyarı', 'Birim uyumsuzluğu', x.el, x.msg)); });
/* ---------- arayüz tutarlılık kuralları ---------- */
function structOf(id){ const e = E(id); if(!e) return null; if(e.kind === 'Part') return e.type || null; if(e.kind === 'Block') return e.id; return null; }
function allocTargets(nodeId){
  const out = new Set();
  Object.values(M.els).forEach(r => { if(r.kind === 'Allocate' && r.src === nodeId){ const s = structOf(r.tgt); if(s) out.add(s); } });
  Object.values(M.els).filter(d => d.kind === 'Diagram' && d.dtype === 'act').forEach(d => { const sh = d.shapes.find(s => s.el === nodeId); if(!sh) return; d.shapes.forEach(p => { const pe = E(p.el); if(pe && pe.kind === 'Partition' && pe.represents && sh.x >= p.x && sh.x + sh.w <= p.x + p.w + 1 && sh.y >= p.y && sh.y + sh.h <= p.y + p.h + 1){ const s = structOf(pe.represents); if(s) out.add(s); } }); });
  return out;
}
function connectedPairs(){
  const S = new Set(), add = (a, b) => { if(a && b && a !== b){ S.add(a + '|' + b); S.add(b + '|' + a); } };
  Object.values(M.els).filter(r => r.kind === 'Connector').forEach(c => {
    const ends = [[c.src, c.sp], [c.tgt, c.tp]].map(([pid, prt]) => { const s = new Set(); const p = E(pid); if(p){ if(p.kind === 'Port' && E(p.owner)) s.add(structOf(p.owner) || p.owner); else { const x = structOf(pid); if(x) s.add(x); } } const q = structOf(prt); if(q) s.add(q); return s; });
    ends[0].forEach(a => ends[1].forEach(b => add(a, b)));
  });
  return S;
}
function ifaceRuleIssues(){
  const out = [], CP = connectedPairs();
  /* 1) taşınan öğe portların arayüzünde yok */
  Object.values(M.els).filter(c => c.kind === 'Connector' && (c.conv || []).length).forEach(c => {
    const pa = E(c.src), pb = E(c.tgt); const tys = [pa, pb].filter(p => p && p.kind === 'Port' && p.type && E(p.type)).map(p => E(p.type)); if(!tys.length) return;
    (c.conv || []).map(E).filter(Boolean).forEach(it => { const ok = tys.some(t => t.id === it.id || kidsOf(t.id).some(f => f.kind === 'FlowProp' && (f.type === it.id || f.name === it.name || (E(f.type) && E(f.type).name === it.name)))); if(!ok) out.push({el:c, rule:'Taşınan öğe arayüzde yok', msg:`"${it.name}" bağlantıda taşınıyor ama ${tys.map(t => t.name).join(' / ')} arayüzünde karşılığı (akış özelliği) yok`}); });
  });
  /* 2) eşlenik eksik: aynı arayüz, karışık yönlü akışlar, iki uç da aynı eşleniklikte */
  Object.values(M.els).filter(c => c.kind === 'Connector' && c.sp && c.tp).forEach(c => {
    const a = E(c.src), b = E(c.tgt); if(!a || !b || a.kind !== 'Port' || b.kind !== 'Port' || !a.type || a.type !== b.type || a.dir || b.dir) return;
    const ds = new Set(kidsOf(a.type).filter(f => f.kind === 'FlowProp').map(f => f.dir || 'inout')); if(!(ds.has('in') && ds.has('out'))) return;
    if(!!a.conj === !!b.conj) out.push({el:c, rule:'Eşlenik port eksik', msg:`${nm(a)} ve ${nm(b)} aynı arayüzü (${E(a.type).name}) aynı yönde kullanıyor; biri eşlenik (~) olmalı`});
  });
  /* 3) fonksiyon akışı ↔ yapı bağlantısı */
  Object.values(M.els).filter(f => f.kind === 'ObjectFlow').forEach(f => {
    const srcN = E(f.src), tgtN = E(f.tgt); const n1 = srcN && srcN.kind === 'Pin' ? srcN.owner : f.src, n2 = tgtN && tgtN.kind === 'Pin' ? tgtN.owner : f.tgt;
    const A = allocTargets(n1), B = allocTargets(n2); if(!A.size || !B.size) return;
    let miss = null; A.forEach(a => B.forEach(b => { if(a !== b && !CP.has(a + '|' + b) && !miss) miss = [a, b]; }));
    if(miss) out.push({el:f, rule:'Tahsisli akışa bağlantı yok', msg:`${nm(E(n1))} (${E(miss[0]).name}) → ${nm(E(n2))} (${E(miss[1]).name}) nesne akışı var, ama ${E(miss[0]).name} ile ${E(miss[1]).name} arasında connector yok`, pair:miss});
  });
  return out;
}
VALIDATORS.push(add => { ifaceRuleIssues().forEach(x => add('uyarı', x.rule, x.el, x.msg)); });
FIXERS['Eşlenik port eksik'] = {t:'Hedef portu eşlenik yap', f:c => { const b = E(c.tgt); if(!b) return false; b.conj = !b.conj; return true; }};
FIXERS['Tahsisli akışa bağlantı yok'] = {t:'Arayüz ve bağlantı oluştur', f:fl => {
  const x = ifaceRuleIssues().find(i => i.el.id === fl.id); if(!x) return false; const [a, b] = x.pair, A = E(a), B = E(b);
  const ctx = Object.values(M.els).find(c => c.kind === 'Block' && kidsOf(c.id).some(p => p.kind === 'Part' && p.type === a) && kidsOf(c.id).some(p => p.kind === 'Part' && p.type === b)); if(!ctx) return false;
  const obj = E(fl.src) && E(fl.src).kind === 'Object' ? E(fl.src) : (E(fl.tgt) && E(fl.tgt).kind === 'Object' ? E(fl.tgt) : null);
  const item = (fl.name || (obj && obj.name) || (E(fl.src) && E(fl.src).kind === 'Pin' ? E(fl.src).name : '') || 'veri').replace(/\s+/g, '');
  const ST0 = ST.batch; ST.batch = true; let r; try { r = ifaceCreate({k:'block:' + a, block:A}, {k:'block:' + b, block:B}, {name:A.name.replace(/\s+/g, '') + '_' + B.name.replace(/\s+/g, '') + 'Arayüzü', flows:item + ' : Real : out', reuse:true}); } finally { ST.batch = ST0; }
  return !!(r && r.conn);
}};
const susCss = document.createElement('style');
susCss.textContent = `.mx td.mxd.sus{background:rgba(209,138,0,.18);color:#a86400}.mx td.mxd.sus::after{content:" ⚠";font-size:10px}`;
document.head.appendChild(susCss);
