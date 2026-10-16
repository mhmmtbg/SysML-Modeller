/* ================= v1.38: BİLGİ GÜVENLİĞİ — GİZLİLİK DERECESİ, KAPSAMLI VE TEMİZLENMİŞ DIŞA AKTARMA, DOKÜMAN KONTROLÜ ================= */
const SEC_LEVELS = [['', '(işaretsiz)', '#888'], ['TASNİF DIŞI', 'TASNİF DIŞI', '#2e7d32'], ['HİZMETE ÖZEL', 'HİZMETE ÖZEL', '#1f6fd1'], ['ÖZEL', 'ÖZEL', '#d18a00'], ['GİZLİ', 'GİZLİ', '#c0392b'], ['ÇOK GİZLİ', 'ÇOK GİZLİ', '#8e1b1b']];
const secCfg = () => (M && M.sec) || {};
function secLabel(){ const c = secCfg(); return [c.level || '', c.caveat || ''].filter(Boolean).join(' · '); }
const secColor = () => (SEC_LEVELS.find(x => x[0] === (secCfg().level || '')) || SEC_LEVELS[0])[2];
function secDocxHeader(wx){ return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:hdr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/><w:color w:val="${secColor().slice(1).toUpperCase()}"/><w:sz w:val="20"/></w:rPr><w:t xml:space="preserve">${wx(secLabel())}</w:t></w:r></w:p></w:hdr>`; }
/* SVG çıktılarına üst/alt bant (bir kez) */
function secSvg(r){
  const L = secLabel(); if(!r || !r.str || !L || r.str.includes('data-sec="1"')) return r;
  const m = r.str.match(/viewBox="([-\d.]+) ([-\d.]+) ([\d.]+) ([\d.]+)"/), B = 22, col = secColor();
  let x = 0, y = 0, w = r.w, h = r.h; if(m){ x = +m[1]; y = +m[2]; w = +m[3]; h = +m[4]; }
  const band = yy => `<rect x="${x}" y="${yy}" width="${w}" height="${B}" fill="#ffffff"/><text x="${x + w / 2}" y="${yy + 15}" text-anchor="middle" font-family="Segoe UI,Arial" font-size="12" font-weight="700" fill="${col}">${esc(L)}</text>`;
  let s = r.str.replace(/^<svg /, '<svg data-sec="1" ');
  if(m) s = s.replace(m[0], `viewBox="${x} ${y - B} ${w} ${h + 2 * B}"`).replace(/height="([\d.]+)"/, `height="${h + 2 * B}"`);
  else s = s.replace(/height="([\d.]+)"/, (q, hh) => `height="${+hh + 2 * B}"`).replace(/>/, `><g transform="translate(0 ${B})">`).replace(/<\/svg>$/, '</g></svg>');
  s = s.replace(/<\/svg>$/, band(m ? y - B : 0) + band(m ? y + h : h + B) + '</svg>');
  return Object.assign({}, r, {str:s, h:h + 2 * B});
}
/* HTML çıktılarına üst/alt şerit */
function secHtml(html){
  const L = secLabel(); if(!L || html.includes('data-sec-band')) return html;
  const band = `<div data-sec-band="1" style="text-align:center;font:700 13px/1.6 'Segoe UI',Arial,sans-serif;color:${secColor()};border:1px solid ${secColor()};padding:2px 6px;margin:4px 0">${esc(L)}</div>`;
  return html.replace(/<body([^>]*)>/, (q, a) => `<body${a}>${band}`).replace(/<\/body>/, band + '</body>');
}
{
  const _ds = diagramSVGStr; diagramSVGStr = function(){ return secSvg(_ds.apply(this, arguments)); };
  const _es = exportSVGString; exportSVGString = function(){ return secSvg(_es.apply(this, arguments)); };
  const _sp = svgToPng; svgToPng = function(r, scale){ return _sp(secSvg(r), scale); };
  const _rh = reviewHTML; reviewHTML = function(){ return secHtml(_rh.apply(this, arguments)); };
  const _vh = viewDocHTML; viewDocHTML = function(){ return secHtml(_vh.apply(this, arguments)); };
  const _bh = buildReportHTML; buildReportHTML = function(){ return secHtml(_bh.apply(this, arguments)); };
}
/* araç çubuğu rozeti */
function secBadge(){
  let b = document.getElementById('secBadge');
  if(!b){ const tb = $('#toolbar'); if(!tb) return; b = document.createElement('button'); b.id = 'secBadge'; b.dataset.ic = '0'; b.className = 'noi18n'; b.title = 'Gizlilik derecesi ve doküman bilgileri'; b.onclick = secDialog; tb.appendChild(b); }
  const L = secLabel(); b.textContent = L || 'Gizlilik: —'; b.style.cssText = `margin-left:6px;font-weight:700;border:1px solid ${L ? secColor() : 'transparent'};color:${L ? secColor() : '#9aa4b1'};background:#fff;border-radius:3px;padding:2px 8px`;
}
{ const _ut = updTitle; updTitle = function(){ _ut.apply(this, arguments); try { secBadge(); } catch(e){ appErr('secBadge', e); } }; }
{ const _ra = renderAll; renderAll = function(){ _ra.apply(this, arguments); try { secBadge(); } catch(e){ appErr('secBadge', e); } }; }
function secDialog(){
  const c = Object.assign({level:'', caveat:'', owner:'', docPrefix:''}, secCfg());
  const box = $('#modalBox'); box.style.width = 'min(560px, 94vw)'; box.style.maxWidth = 'none';
  box.innerHTML = `<h2>Gizlilik derecesi</h2><p class="muted" style="margin:-4px 0 8px;font-size:12px">Seçilen derece modelle kaydedilir ve tüm çıktılara işlenir: Word üst/alt bilgi, Excel üst/alt bilgi, diyagram PNG/SVG/PDF bantları, HTML raporlar, inceleme paketi, View dokümanı ve XMI.</p>
    <div class="qf"><label>Derece<select id="scL">${SEC_LEVELS.map(([k, l]) => `<option value="${k}"${c.level === k ? ' selected' : ''}>${l}</option>`).join('')}</select></label>
    <label>Ek ibare (isteğe bağlı)<input id="scC" value="${esc(c.caveat)}" placeholder="ör. Yalnız proje ekibi · NATO RESTRICTED"></label>
    <label>Sahibi / yetkili birim<input id="scO" value="${esc(c.owner)}" placeholder="ör. Sistem Mühendisliği Müdürlüğü"></label></div>
    <p style="text-align:right;margin:12px 0 0"><button class="pbtn" id="scX">Vazgeç</button> <button class="pbtn pri" id="scK">Kaydet</button></p>`;
  $('#modal').style.display = 'flex';
  const close = () => { $('#modal').style.display = 'none'; box.style.width = ''; box.style.maxWidth = ''; box.onclick = null; };
  box.onclick = ev => { if(ev.target.id === 'scX') close(); if(ev.target.id === 'scK'){ snap(); M.sec = {level:$('#scL').value, caveat:$('#scC').value.trim(), owner:$('#scO').value.trim()}; if(!M.sec.level && !M.sec.caveat) delete M.sec; afterChange(); close(); toast(secLabel() ? 'Gizlilik derecesi: ' + secLabel() : 'Gizlilik işareti kaldırıldı'); } };
}
/* ---------- kapsamlı ve temizlenmiş model kopyası ---------- */
function scopedModel(opt){
  opt = opt || {};
  const src = M, sel = new Set((opt.pkgs || []).filter(id => src.els[id]));
  const keep = new Set([src.rootId]);
  const inSel = id => { let e = src.els[id], g = 0; while(e && g++ < 200){ if(sel.has(e.id)) return true; e = src.els[e.owner]; } return false; };
  const all = !sel.size;
  for(const k in src.els){ const e = src.els[k]; if(all || inSel(k)){ keep.add(k); let o = src.els[e.owner]; while(o && !keep.has(o.id)){ keep.add(o.id); o = src.els[o.owner]; } } }
  const m = JSON.parse(JSON.stringify(src, clean)); const rep = {removed:0, refs:0, notes:0};
  for(const k in m.els){ const e = m.els[k]; if(KIND[e.kind] && KIND[e.kind].rel) continue; if(!keep.has(k)){ delete m.els[k]; rep.removed++; } }
  for(const k in m.els){ const e = m.els[k]; if(KIND[e.kind] && KIND[e.kind].rel && (!m.els[e.src] || !m.els[e.tgt] || !m.els[e.owner])){ delete m.els[k]; rep.removed++; } }
  const REF = ['type', 'classifier', 'signal', 'behavior', 'represents', 'part', 'sp', 'tp'];
  for(const k in m.els){ const e = m.els[k];
    REF.forEach(f => { if(e[f] && typeof e[f] === 'string' && !m.els[e[f]]){ delete e[f]; rep.refs++; } });
    if(e.kind === 'Diagram'){ e.shapes = e.shapes.filter(s => m.els[s.el]); const ids = new Set(e.shapes.map(s => s.id)); e.shapes.forEach(s => { if(s.parent && !ids.has(s.parent)) delete s.parent; }); e.edges = e.edges.filter(x => ids.has(x.s) && ids.has(x.t) && (!x.el || m.els[x.el])); }
    if(opt.noNotes && e.notes){ rep.notes += e.notes.length; delete e.notes; }
    else if(opt.anon && e.notes) e.notes.forEach(n => { n.u = 'İnceleyen'; (n.re || []).forEach(r => r.u = 'İnceleyen'); delete n.cu; });
    if(opt.anon){ delete e.author; delete e.resp; }
    if(opt.noDoc && e.doc) e.doc = '';
  }
  if(opt.noLog){ delete m.reqLog; delete m.repairLog; delete m.baselines; }
  if(opt.anon && m.reqLog) m.reqLog.forEach(x => { x.u = '—'; });
  delete m.mods; m.ui = {open:[], cur:null, exp:[m.rootId]};
  if(sel.size){ const r = m.els[m.rootId]; r.doc = ((r.doc || '') + `\n[Kapsamlı kopya: ${[...sel].map(id => src.els[id].name).join(', ')}]`).trim(); }
  return {m, rep};
}
function withModel(m, fn){ const keep = M, kST = {open:ST.open, cur:ST.cur, sel:ST.sel, tsel:ST.tsel}; M = m; bump(); MCHG++; try { return fn(); } finally { M = keep; Object.assign(ST, kST); bump(); MCHG++; } }
function scopeDialog(title, extra, onOk){
  const pk = kidsOf(M.rootId).filter(e => e.kind === 'Package').sort(sortEls);
  const box = $('#modalBox'); box.style.width = 'min(640px, 96vw)'; box.style.maxWidth = 'none';
  box.innerHTML = `<h2>${esc(title)}</h2>${secLabel() ? `<p style="color:${secColor()};font-weight:700">Gizlilik derecesi: ${esc(secLabel())}</p>` : ''}
    <div class="sub"><span>Kapsam (boş: tüm model)</span><span><a class="lnk" data-sca="1">tümü</a> · <a class="lnk" data-scn="1">hiçbiri</a></span></div>
    <div style="max-height:28vh;overflow:auto">${pk.map(p => `<label class="vchk" style="display:block;margin:2px 0"><input type="checkbox" data-scp="${p.id}"> <span class="noi18n">${esc(p.name)}</span> <span class="muted">(${Object.values(M.els).filter(e => isAnc(p.id, e.id)).length})</span></label>`).join('')}</div>
    <div class="sub"><span>Temizleme</span></div>
    <label class="vchk" style="display:block"><input type="checkbox" id="scNN"> İnceleme notlarını çıkar</label>
    <label class="vchk" style="display:block"><input type="checkbox" id="scAN"> Kullanıcı adlarını gizle (notlar, değişiklik günlüğü, sorumlular)</label>
    <label class="vchk" style="display:block"><input type="checkbox" id="scNL"> Değişiklik günlüğü, onarım geçmişi ve baseline'ları çıkar</label>
    <label class="vchk" style="display:block"><input type="checkbox" id="scND"> Eleman açıklamalarını (doc) çıkar</label>
    ${extra || ''}
    <p style="text-align:right;margin:12px 0 0"><span class="muted" id="scSt"></span> <button class="pbtn" id="scCx">Vazgeç</button> <button class="pbtn pri" id="scOk">Dışa aktar</button></p>`;
  $('#modal').style.display = 'flex';
  const close = () => { $('#modal').style.display = 'none'; box.style.width = ''; box.style.maxWidth = ''; box.onclick = null; };
  box.onclick = ev => {
    const t = ev.target;
    if(t.dataset && (t.dataset.sca || t.dataset.scn)){ box.querySelectorAll('[data-scp]').forEach(i => i.checked = !!t.dataset.sca); return; }
    if(t.id === 'scCx') return close();
    if(t.id === 'scOk'){ const opt = {pkgs:[...box.querySelectorAll('[data-scp]:checked')].map(i => i.dataset.scp), noNotes:$('#scNN').checked, anon:$('#scAN').checked, noLog:$('#scNL').checked, noDoc:$('#scND').checked}; box.querySelectorAll('[data-scx]').forEach(i => opt[i.dataset.scx] = i.value.trim()); close(); onOk(opt); }
  };
}
const docFields = `<div class="sub"><span>Doküman bilgileri</span></div><div class="qf"><label>Doküman no<input data-scx="docNo" placeholder="ör. SM-İNC-001"></label><label>Revizyon<input data-scx="rev" placeholder="ör. A"></label><label>Dağıtım (virgülle)<input data-scx="dist" placeholder="ör. Proje Yöneticisi, Müşteri Temsilcisi"></label></div>`;
function reviewExportScoped(){
  if(!Object.values(M.els).some(e => e.kind === 'Diagram')) return toast('Modelde diyagram yok');
  scopeDialog('Etkileşimli inceleme paketi', docFields, opt => {
    const {m, rep} = scopedModel(opt);
    const html = withModel(m, () => reviewHTML());
    const hdr = docCtlHTML(opt);
    const out = hdr ? html.replace(/<\/header>/, `</header><div style="grid-column:1/4;padding:3px 12px;font-size:12px;background:#f3f5f8;border-bottom:1px solid #d9dde3">${hdr}</div>`).replace('grid-template-rows:44px 1fr', 'grid-template-rows:44px auto 1fr') : html;
    download(new Blob([out], {type:'text/html'}), fileSafe(E(M.rootId).name) + ' - İnceleme Paketi' + (opt.docNo ? ' ' + fileSafe(opt.docNo) : '') + '.html');
    toast(`İnceleme paketi oluşturuldu${opt.pkgs.length ? ' (' + opt.pkgs.length + ' paket kapsamı, ' + rep.removed + ' eleman dışarıda)' : ''}`);
  });
}
function docCtlHTML(o){ const p = []; if(o.docNo) p.push('<b>Doküman no:</b> ' + esc(o.docNo)); if(o.rev) p.push('<b>Rev.:</b> ' + esc(o.rev)); p.push('<b>Tarih:</b> ' + esc(new Date().toLocaleDateString('tr-TR'))); if(o.dist) p.push('<b>Dağıtım:</b> ' + esc(o.dist)); if(secCfg().owner) p.push('<b>Sahibi:</b> ' + esc(secCfg().owner)); return o.docNo || o.rev || o.dist ? p.join(' &nbsp;·&nbsp; ') : ''; }
function xmiExportScoped(){ scopeDialog('XMI dışa aktar (UML 2.5 / SysML 1.6)', '', opt => { const {m, rep} = scopedModel(opt); withModel(m, () => xmiExport()); if(opt.pkgs.length) toast(`XMI: ${opt.pkgs.length} paket kapsamı, ${rep.removed} eleman dışarıda`); }); }
function scopedSave(){ scopeDialog('Kapsamlı / temizlenmiş kopya kaydet', '', opt => { const {m, rep} = scopedModel(opt); const txt = withModel(m, () => JSON.stringify(pack(), clean, 1)); download(new Blob([txt], {type:'application/json'}), fileSafe(E(M.rootId).name) + ' - kopya.sysml'); toast(`Kopya kaydedildi: ${Object.keys(m.els).length} eleman${rep.removed ? ', ' + rep.removed + ' dışarıda' : ''}${rep.refs ? ', ' + rep.refs + ' dış referans kaldırıldı' : ''}${rep.notes ? ', ' + rep.notes + ' not çıkarıldı' : ''}`); }); }
HOOKS.menu.tools.push(r => {
  r.forEach(x => { if(x && x.t === 'Etkileşimli inceleme paketi (HTML) dışa aktar'){ x.t = 'Etkileşimli inceleme paketi (HTML) dışa aktar…'; x.f = reviewExportScoped; } if(x && x.t === 'XMI olarak dışa aktar (UML 2.5 / SysML 1.6)'){ x.t = 'XMI olarak dışa aktar (UML 2.5 / SysML 1.6)…'; x.f = xmiExportScoped; } });
  const i = r.findIndex(x => x && x.t === 'Etkileşimli inceleme paketi (HTML) dışa aktar…');
  r.splice(i < 0 ? r.length : i + 1, 0, {t:'Kapsamlı / temizlenmiş kopya kaydet…', f:scopedSave});
  r.splice(1, 0, {t:'Gizlilik derecesi…' + (secLabel() ? ' (' + secLabel() + ')' : ''), f:secDialog});
});
/* ---------- View dokümanı: doküman kontrol alanları ---------- */
{
  const _pv = PROPS_EXT.View;
  PROPS_EXT.View = (el, pf) => pf('Doküman no', `<input data-f="docNo" class="noi18n" value="${esc(el.docNo || '')}" placeholder="ör. SM-VIEW-001">`) + pf('Revizyon', `<input data-f="rev" class="noi18n" value="${esc(el.rev || '')}" placeholder="ör. A">`) + pf('Dağıtım', `<input data-f="dist" class="noi18n" value="${esc(el.dist || '')}" placeholder="virgülle ayırın">`) + _pv(el, pf);
  const _vd = viewDocHTML;
  viewDocHTML = function(id){ const h = _vd.apply(this, arguments), V = E(id); const ctl = V ? docCtlHTML({docNo:V.docNo, rev:V.rev, dist:V.dist}) : ''; return ctl ? h.replace(/(<div class="meta">)/, `<div class="meta" style="border:1px solid #d9dde3;padding:6px 10px;margin-bottom:6px">${ctl}</div>$1`) : h; };
}
