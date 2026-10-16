/* ================= v1.35: VIEW & VIEWPOINT, «conform» / «expose», VIEW DOKÜMANI ================= */
Object.assign(KIND, {
  View:{tr:'Görünüm (View)', en:'View', ic:'Vw', col:'#2d6a9f', w:190, h:90},
  Viewpoint:{tr:'Bakış Açısı (Viewpoint)', en:'Viewpoint', ic:'Vp', col:'#6a4c93', w:220, h:120},
  Conform:{tr:'Conform', rel:1},
  Expose:{tr:'Expose', rel:1}
});
Object.assign(BASE, {View:'Görünüm', Viewpoint:'Bakış açısı'});
Object.assign(ER, {Conform:{dash:1, tgt:'open', st:'«conform»'}, Expose:{dash:1, tgt:'open', st:'«expose»'}});
Object.assign(FILL, {View:'#eef4fb', Viewpoint:'#f4effa'});
['Model', 'Package'].forEach(k => { if(OWN[k]) ['View', 'Viewpoint'].forEach(x => { if(!OWN[k].includes(x)) OWN[k].push(x); }); });
OWN.View = ['View'];
RANK.push('Viewpoint', 'View');
['pkg', 'bdd'].forEach(dt => { const S = DT[dt].shapes, i = S.indexOf('Comment'); ['Viewpoint', 'View'].forEach(k => { if(!S.includes(k)) S.splice(i < 0 ? S.length : S.indexOf('Comment'), 0, k); }); const R = DT[dt].rels, j = R.indexOf('Anchor'); ['Conform', 'Expose'].forEach(k => { if(!R.includes(k)) R.splice(j < 0 ? R.length : R.indexOf('Anchor'), 0, k); }); });
if(typeof MANI_PREF !== 'undefined') MANI_PREF.pkg = ['Conform', 'Expose', 'Dependency', 'Import'];
{
  const _va = validate;
  validate = function(kind, a, b, d){
    if(kind === 'Conform') return a.kind === 'View' && b.kind === 'Viewpoint' ? '' : '«conform» bir görünümden (View) bakış açısına (Viewpoint) çizilmeli.';
    if(kind === 'Expose') return a.kind === 'View' && b.kind !== 'View' && b.kind !== 'Viewpoint' ? '' : '«expose» bir görünümden (View) sergilenen paket, diyagram veya elemana çizilmeli.';
    if(a && b && (a.kind === 'View' || a.kind === 'Viewpoint' || b.kind === 'Viewpoint') && kind !== 'Dependency' && kind !== 'Anchor') return 'Görünüm / bakış açısı yalnızca «conform», «expose» veya Dependency ile bağlanır.';
    return _va.apply(this, arguments);
  };
}
Object.assign(PAL_EXT, {
  View:'<svg width="26" height="18" viewBox="0 0 26 18"><path d="M2 5V2h9v3" fill="#eef4fb" stroke="#333" stroke-width="1.1"/><rect x="2" y="5" width="22" height="11" fill="#eef4fb" stroke="#333" stroke-width="1.1"/><circle cx="13" cy="10.5" r="2.4" fill="none" stroke="#333"/></svg>',
  Viewpoint:'<svg width="26" height="18" viewBox="0 0 26 18"><rect x="2" y="2" width="22" height="14" fill="#f4effa" stroke="#333" stroke-width="1.1"/><path d="M6 9q7-6 14 0q-7 6-14 0z" fill="none" stroke="#333"/><circle cx="13" cy="9" r="1.6" fill="#333"/></svg>',
  Conform:'<svg width="26" height="18" viewBox="0 0 26 18"><line x1="2" y1="9" x2="22" y2="9" stroke="#333" stroke-dasharray="3 2"/><path d="M18 5l5 4-5 4" fill="none" stroke="#333"/></svg>',
  Expose:'<svg width="26" height="18" viewBox="0 0 26 18"><line x1="2" y1="9" x2="22" y2="9" stroke="#333" stroke-dasharray="3 2"/><path d="M18 5l5 4-5 4" fill="none" stroke="#333"/><circle cx="6" cy="9" r="2" fill="#fff" stroke="#333"/></svg>'
});
const VP_FIELDS = [['stakeholders', 'Paydaşlar'], ['concerns', 'Kaygılar (concerns)'], ['purpose', 'Amaç'], ['languages', 'Diller'], ['method', 'Yöntem']];
const viewConform = v => Object.values(M.els).filter(r => r.kind === 'Conform' && r.src === v.id && E(r.tgt)).map(r => E(r.tgt));
const viewExposed = v => Object.values(M.els).filter(r => r.kind === 'Expose' && r.src === v.id && E(r.tgt)).map(r => E(r.tgt));
/* ---------- şekiller ---------- */
SHAPE_EXT.View = (sh, e, d, x, y, SW, fill) => {
  const ex = viewExposed(e), vp = viewConform(e), lines = ex.map(t => (t.kind === 'Diagram' ? '▣ ' : t.kind === 'Package' ? '▤ ' : '') + (t.name || ''));
  const need = snapv(56 + Math.max(1, lines.length) * 15 + (vp.length ? 15 : 0)); if(sh.h < need) sh.h = need;
  const wn = Math.max(tw(e.name || '', true) + 30, ...lines.map(t => tw(t, false, 11) + 24)); if(sh.w < wn) sh.w = Math.ceil(wn / G) * G;
  const tabW = Math.min(90, sh.w * 0.45);
  let s = `<path d="M${x},${y + 14} V${y} H${x + tabW} V${y + 14}" fill="${fill}" ${SW}/><rect x="${x}" y="${y + 14}" width="${sh.w}" height="${sh.h - 14}" fill="${fill}" ${SW}/>`;
  s += T('«view»', x + sh.w / 2, y + 30, {italic:1, size:11}) + T(e.name || '', x + sh.w / 2, y + 45, {bold:1});
  let yy = y + 52;
  if(vp.length){ s += T('conform: ' + vp.map(v => v.name).join(', '), x + sh.w / 2, yy + 11, {size:10, fill:'#555'}); yy += 15; }
  if(lines.length){ s += `<line x1="${x}" y1="${yy}" x2="${x + sh.w}" y2="${yy}" stroke="${STROKE}" stroke-width="1"/>`; lines.forEach((t, i) => { s += T(t, x + 8, yy + 14 + i * 15, {anchor:'start', size:11}); }); }
  return s;
};
SHAPE_EXT.Viewpoint = (sh, e, d, x, y, SW, fill) => {
  const rows = VP_FIELDS.filter(([k]) => String(e[k] || '').trim()).map(([k, l]) => l.replace(/ \(.*\)$/, '') + ' = "' + (String(e[k]).replace(/\s+/g, ' ').length > 42 ? String(e[k]).replace(/\s+/g, ' ').slice(0, 40) + '…' : String(e[k]).replace(/\s+/g, ' ')) + '"');
  const need = snapv(50 + rows.length * 15 + 8); if(sh.h < need) sh.h = need;
  const wn = Math.max(tw(e.name || '', true) + 30, ...rows.map(t => tw(t, false, 11) + 20)); if(sh.w < wn) sh.w = Math.min(380, Math.ceil(wn / G) * G);
  let s = `<rect x="${x}" y="${y}" width="${sh.w}" height="${sh.h}" fill="${fill}" ${SW}/>` + T('«viewpoint»', x + sh.w / 2, y + 16, {italic:1, size:11}) + T(e.name || '', x + sh.w / 2, y + 31, {bold:1});
  if(rows.length){ s += `<line x1="${x}" y1="${y + 40}" x2="${x + sh.w}" y2="${y + 40}" stroke="${STROKE}" stroke-width="1"/>`; rows.forEach((t, i) => { s += T(t, x + 7, y + 55 + i * 15, {anchor:'start', size:11}); }); }
  return s;
};
/* ---------- özellikler ---------- */
PROPS_EXT.Viewpoint = (el, pf) => VP_FIELDS.map(([k, l]) => pf(l, `<textarea data-f="${k}" rows="${k === 'concerns' || k === 'purpose' ? 3 : 2}" class="noi18n" style="width:100%">${esc(el[k] || '')}</textarea>`)).join('') + pf('Uyan görünümler', viewsOf(el).map(v => `<a class="lnk noi18n" data-goto="${v.id}">${esc(v.name)}</a>`).join(', ') || '<span class="muted">—</span>');
const viewsOf = vp => Object.values(M.els).filter(r => r.kind === 'Conform' && r.tgt === vp.id && E(r.src)).map(r => E(r.src));
PROPS_EXT.View = (el, pf) => {
  const vp = viewConform(el), ex = viewExposed(el);
  const cands = Object.values(M.els).filter(e => e.kind === 'Package' || e.kind === 'Diagram').sort((a, b) => pathOf(a.id).localeCompare(pathOf(b.id), 'tr'));
  const vps = Object.values(M.els).filter(e => e.kind === 'Viewpoint').sort(sortEls);
  return pf('Bakış açısı', `<select data-vwvp="${el.id}"><option value="">—</option>${vps.map(v => `<option value="${v.id}"${vp[0] && vp[0].id === v.id ? ' selected' : ''}>${esc(v.name)}</option>`).join('')}</select>`)
    + pf('Sergilenen', (ex.map(t => `<div class="li noi18n">${t.kind === 'Diagram' ? '▣' : t.kind === 'Package' ? '▤' : icon(t)} <a class="lnk" data-goto="${t.id}">${esc(pathOf(t.id))}</a> <a class="lnk" data-vwrm="${t.id}">✕</a></div>`).join('') || '<span class="muted">—</span>') + `<select data-vwadd="${el.id}"><option value="">+ Paket / diyagram sergile…</option>${cands.filter(c => !ex.includes(c)).map(c => `<option value="${c.id}">${c.kind === 'Diagram' ? '▣ ' : '▤ '}${esc(pathOf(c.id))}</option>`).join('')}</select>`)
    + pf('', `<button class="pbtn pri" data-vwdoc="${el.id}">View dokümanı üret (HTML)</button>`);
};
(() => {
  const P = $('#props');
  P.addEventListener('change', ev => {
    const t = ev.target;
    if(t.dataset.vwvp){ const v = E(t.dataset.vwvp); snap(); Object.values(M.els).filter(r => r.kind === 'Conform' && r.src === v.id).forEach(r => delete M.els[r.id]); if(t.value) mk('Conform', nearestPkg(v.id), {src:v.id, tgt:t.value, name:''}); afterChange(); }
    if(t.dataset.vwadd && t.value){ const v = E(t.dataset.vwadd); snap(); mk('Expose', nearestPkg(v.id), {src:v.id, tgt:t.value, name:''}); afterChange(); }
  });
  P.addEventListener('click', ev => {
    const rm = ev.target.closest('[data-vwrm]'); if(rm){ const t = propTarget(); if(!t || !t.el) return; snap(); Object.values(M.els).filter(r => r.kind === 'Expose' && r.src === t.el.id && r.tgt === rm.dataset.vwrm).forEach(r => delete M.els[r.id]); afterChange(); return; }
    const b = ev.target.closest('[data-vwdoc]'); if(b) viewDocExport(b.dataset.vwdoc);
  });
})();
/* ---------- View dokümanı (HTML) ---------- */
function viewDocHTML(viewId){
  const V = E(viewId); if(!V) return '';
  const fig = {n:0}, tab = {n:0}, seenD = new Set();
  const H = (lv, t, id) => `<h${lv}${id ? ` id="${id}"` : ''}>${esc(t)}</h${lv}>`;
  const tbl = (head, rows) => `<p class="cap">Tablo ${++tab.n}</p><table><thead><tr>${head.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${r.map(c => `<td>${esc(c == null ? '' : c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
  const dia = d => { if(seenD.has(d.id)) return ''; seenD.add(d.id); const r = diagramSVGStr(d); if(!r) return ''; return `<figure>${r.str.replace(/^<svg /, '<svg style="max-width:100%;height:auto" ')}<figcaption>Şekil ${++fig.n} – ${esc(d.name)} (${esc(d.dtype)})</figcaption></figure>`; };
  const elTable = els => {
    let h = '';
    const reqs = els.filter(e => e.kind === 'Requirement');
    if(reqs.length) h += tbl(['ID', 'Ad', 'Metin', 'Doğrulama', 'Durum'], reqs.sort((a, b) => String(a.reqId || '').localeCompare(String(b.reqId || ''), 'tr', {numeric:true})).map(r => [r.reqId || '', r.name || '', r.text || '', r.verif || '', reqStatus(r)]));
    const blocks = els.filter(e => e.kind === 'Block' || e.kind === 'InterfaceBlock');
    if(blocks.length) h += tbl(['Blok', 'Tür', 'Part', 'Port', 'Değerler', 'Açıklama'], blocks.sort(sortEls).map(b => { const k = kidsOf(b.id); return [b.name || '', KIND[b.kind].tr, k.filter(x => x.kind === 'Part').map(p => p.name + (p.type && E(p.type) ? ' : ' + E(p.type).name : '')).join(', '), k.filter(x => x.kind === 'Port').map(p => p.name).join(', '), k.filter(x => x.kind === 'Value').map(v => v.name + (v.def != null && v.def !== '' ? ' = ' + v.def : '') + (unitOf(v) ? ' ' + unitOf(v) : '')).join(', '), b.doc || '']; }));
    const tests = els.filter(e => e.kind === 'TestCase');
    if(tests.length) h += tbl(['Test', 'Yöntem', 'Sonuç', 'Doğruladığı'], tests.sort(sortEls).map(t => [t.name || '', t.tMethod || '', testResult(t), Object.values(M.els).filter(r => r.kind === 'Verify' && r.src === t.id && E(r.tgt)).map(r => E(r.tgt).reqId || E(r.tgt).name).join(', ')]));
    const others = els.filter(e => !['Requirement', 'Block', 'InterfaceBlock', 'TestCase', 'Package', 'Diagram'].includes(e.kind) && !(KIND[e.kind] && KIND[e.kind].rel) && NAMED.has(e.kind) && e.doc);
    if(others.length) h += tbl(['Eleman', 'Tür', 'Açıklama'], others.sort(sortEls).map(e => [e.name || '', KIND[e.kind].tr, e.doc || '']));
    return h;
  };
  const exposedBody = (t, lv) => {
    if(t.kind === 'Diagram') return dia(t);
    if(t.kind === 'Package' || t.kind === 'Model'){
      const all = Object.values(M.els).filter(e => isAnc(t.id, e.id));
      const ds = all.filter(e => e.kind === 'Diagram').sort((a, b) => pathOf(a.id).localeCompare(pathOf(b.id), 'tr'));
      return (t.doc ? `<p>${esc(t.doc)}</p>` : '') + ds.map(dia).join('') + elTable(all.filter(e => e.kind !== 'Diagram'));
    }
    return (t.doc ? `<p>${esc(t.doc)}</p>` : '') + elTable([t]) + Object.values(M.els).filter(d => d.kind === 'Diagram' && d.owner === t.id).map(dia).join('');
  };
  let toc = [], body = '', sec = 0;
  const viewSec = (v, lv, num) => {
    const vp = viewConform(v)[0], ex = viewExposed(v);
    toc.push([lv, num + ' ' + v.name, 'v' + v.id]);
    let h = H(Math.min(lv + 1, 4), num + ' ' + (v.name || ''), 'v' + v.id);
    if(v.doc) h += `<p>${esc(v.doc)}</p>`;
    if(vp){ h += `<div class="vp"><b>Bakış açısı: ${esc(vp.name)}</b>${VP_FIELDS.filter(([k]) => String(vp[k] || '').trim()).map(([k, l]) => `<div><span>${esc(l)}:</span> ${esc(vp[k])}</div>`).join('')}</div>`; }
    ex.forEach((t, i) => { const n2 = num + '.' + (i + 1); toc.push([lv + 1, n2 + ' ' + (t.name || ''), 'x' + v.id + t.id]); h += H(Math.min(lv + 2, 5), n2 + ' ' + (t.name || '') + (t.kind === 'Diagram' ? '' : ' — ' + KIND[t.kind].tr), 'x' + v.id + t.id) + exposedBody(t, lv + 2); });
    kidsOf(v.id).filter(c => c.kind === 'View').sort(sortEls).forEach((c, i) => { h += viewSec(c, lv + 1, num + '.' + (ex.length + i + 1)); });
    if(!ex.length && !kidsOf(v.id).some(c => c.kind === 'View')) h += `<p class="muted">Bu görünüm hiçbir paket veya diyagram sergilemiyor («expose» ekleyin).</p>`;
    return h;
  };
  body = viewSec(V, 1, '1');
  const vp = viewConform(V)[0], root = E(M.rootId);
  return `<!doctype html><html lang="tr"><head><meta charset="utf-8"><title>${esc(V.name)} — ${esc(root.name)}</title><style>
body{font:14px/1.5 "Segoe UI",Arial,sans-serif;color:#1d232b;max-width:1100px;margin:24px auto;padding:0 20px}h1{font-size:24px;margin:0 0 4px}h2{font-size:19px;border-bottom:2px solid #2d6a9f;padding-bottom:3px;margin-top:28px}h3{font-size:16px;margin-top:22px}h4,h5{font-size:14px}
.meta{color:#6b7480;margin-bottom:16px}.vp{border:1px solid #d9dde3;border-left:4px solid #6a4c93;padding:8px 12px;margin:10px 0;background:#faf8fd}.vp span{color:#6b7480}
table{border-collapse:collapse;width:100%;margin:6px 0 14px;font-size:13px}th,td{border:1px solid #d9dde3;padding:4px 6px;text-align:left;vertical-align:top}th{background:#26364b;color:#fff}
figure{margin:12px 0;text-align:center}figure svg{border:1px solid #e3e6ea}figcaption,.cap{font-size:12px;color:#555;margin-top:4px}.cap{margin-bottom:2px}
nav ul{list-style:none;padding-left:14px;margin:2px 0}nav a{color:#2d6a9f;text-decoration:none}.muted{color:#888}
@media print{body{margin:0}h2{page-break-before:auto}figure{page-break-inside:avoid}}
</style></head><body><h1>${esc(V.name)}</h1><div class="meta">${esc(root.name)} · View dokümanı · ${esc(new Date().toLocaleDateString('tr-TR'))}${vp ? ' · Bakış açısı: ' + esc(vp.name) : ''} · SysML Modelleyici ${esc(APP_VER)}</div>
<nav><b>İçindekiler</b><ul>${toc.map(([lv, t, id]) => `<li style="margin-left:${(lv - 1) * 14}px"><a href="#${id}">${esc(t)}</a></li>`).join('')}</ul></nav>${body}</body></html>`;
}
function viewDocExport(viewId){
  const V = E(viewId); if(!V || V.kind !== 'View') return toast('Bir görünüm (View) seçin');
  download(new Blob([viewDocHTML(viewId)], {type:'text/html'}), fileSafe(V.name || 'View') + ' - View Dokümanı.html');
  toast('View dokümanı üretildi: ' + (V.name || ''));
}
VALIDATORS.push((add, els) => {
  els.filter(e => e.kind === 'View').forEach(v => { if(!viewConform(v).length) add('bilgi', 'Bakış açısız görünüm', v, 'Görünüm hiçbir bakış açısına «conform» değil'); if(!viewExposed(v).length && !kidsOf(v.id).some(c => c.kind === 'View')) add('uyarı', 'Boş görünüm', v, 'Görünüm hiçbir paket/diyagram sergilemiyor («expose» yok)'); });
  els.filter(e => e.kind === 'Viewpoint').forEach(v => { if(!String(v.stakeholders || '').trim() || !String(v.concerns || '').trim()) add('bilgi', 'Eksik bakış açısı', v, 'Paydaş ve kaygı (concern) alanları doldurulmalı'); });
});
HOOKS.menu.tools.push(r => { const vs = Object.values(M.els).filter(e => e.kind === 'View' && !(E(e.owner) && E(e.owner).kind === 'View')).sort(sortEls); if(vs.length){ const i = r.findIndex(x => x && x.t === 'Etkileşimli inceleme paketi (HTML) dışa aktar'); r.splice(i < 0 ? r.length : i + 1, 0, ...vs.slice(0, 6).map(v => ({t:'View dokümanı: ' + v.name, f:() => viewDocExport(v.id)}))); } });
/* örnek model: paydaş görünümü */
DEMO_EXT.push(X => {
  const pk = E(findOrMkPkg(M.rootId, 'Görünümler'));
  const vp = mk('Viewpoint', pk.id, {name:'Müşteri Bakış Açısı', stakeholders:'Müşteri, proje yöneticisi', concerns:'Sistem gereksinimleri karşılanıyor mu? Doğrulama durumu nedir?', purpose:'Tasarım gözden geçirme toplantısında gereksinim ve yapı durumunu sunmak', languages:'SysML', method:'Gereksinim paketi ve sistem yapısı diyagramları sergilenir'});
  const v = mk('View', pk.id, {name:'Müşteri İnceleme Görünümü', doc:'Kritik tasarım gözden geçirmesi (CDR) için hazırlanan görünüm.'});
  const rp = Object.values(M.els).find(e => e.kind === 'Package' && e.name === 'Gereksinimler'), sd = Object.values(M.els).find(e => e.kind === 'Diagram' && e.name === 'Sistem Yapısı');
  if(sd) mk('Expose', pk.id, {src:v.id, tgt:sd.id, name:''});
  const d = newDiagramCore(pk.id, 'pkg', 'Görünümler');
  const a = addShape(d, vp.id, 40, 40, 300, 130), b = addShape(d, v.id, 500, 40, 220, 110);
  connect(d, 'Conform', b, a);
  if(rp){ const c = addShape(d, rp.id, 500, 260, 160, 70); connect(d, 'Expose', b, c); }
});

