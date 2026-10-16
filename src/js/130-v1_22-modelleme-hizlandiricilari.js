/* ================= v1.22: MODELLEME HIZLANDIRICILARI ================= */
/* ---------- IBD üret / modelle eşitle ---------- */
function compParts(b){
  /* parçası olmayan Composition ilişkileri için part oluştur */
  let n = 0;
  Object.values(M.els).filter(r => r.kind === 'Composition' && r.src === b.id && !E(r.part) && E(r.tgt) && E(r.tgt).kind === 'Block').forEach(r => {
    const t = E(r.tgt); if(kidsOf(b.id).some(p => p.kind === 'Part' && p.type === t.id)) return;
    const p = mk('Part', b.id, {name:uniqName(lcFirst(t.name || 'part'), b.id), type:t.id, mult:r.mult || ''}); r.part = p.id; n++;
  });
  return n;
}
function syncIBD(d){
  const b = E(d.owner); if(!b || b.kind !== 'Block') return {parts:0, vals:0, ports:0, edges:0, created:0};
  const created = compParts(b), s0 = d.shapes.length, e0 = d.edges.length, have = new Set(d.shapes.map(s => s.el));
  const ch = kidsOf(b.id), parts = ch.filter(e => e.kind === 'Part' && !have.has(e.id)), vals = ch.filter(e => e.kind === 'Value' && !have.has(e.id));
  const top = d.shapes.filter(s => !s.parent);
  let y = top.length ? Math.max(...top.map(s => s.y + s.h)) + 60 : 40, x = 40;
  parts.forEach((p, i) => { const sh = addShape(d, p.id, x + (i % 3) * 320, y + Math.floor(i / 3) * 200, 200, 80); showPorts(d, sh); });
  if(parts.length) y += Math.ceil(parts.length / 3) * 200;
  vals.forEach((v, i) => addShape(d, v.id, x + (i % 4) * 190, y + Math.floor(i / 4) * 60, 160, 36));
  let ports = 0; d.shapes.filter(s => !s.parent && E(s.el) && E(s.el).kind === 'Part').forEach(sh => { ports += (showPorts(d, sh) || []).length; });
  d.shapes.slice().forEach(sh => autoEdges(d, sh));
  return {parts:parts.length, vals:vals.length, ports, edges:d.edges.length - e0, created, shapes:d.shapes.length - s0};
}
function ibdsOf(b){ return Object.values(M.els).filter(x => x.kind === 'Diagram' && x.dtype === 'ibd' && x.owner === b.id); }
function ibdsFromBDD(d){
  d = d || cur(); if(!d || d.kind !== 'Diagram' || d.dtype !== 'bdd') return toast('Önce bir BDD açın');
  const blocks = [...new Set(d.shapes.map(s => E(s.el)).filter(e => e && e.kind === 'Block'))].filter(b => kidsOf(b.id).some(p => p.kind === 'Part') || Object.values(M.els).some(r => r.kind === 'Composition' && r.src === b.id));
  if(!blocks.length) return toast('Bu BDD\'de part\'ı veya Composition ilişkisi olan blok yok');
  snap(); let nNew = 0, nUpd = 0, parts = 0;
  blocks.forEach(b => { const ex = ibdsOf(b); if(!ex.length){ const created = compParts(b); const nd = newDiagramCore(b.id, 'ibd', b.name + ' İç Yapısı'); parts += created; nNew++; ST.exp.add(b.id); return nd; } ex.forEach(x => { const r = syncIBD(x); parts += r.created; if(r.shapes || r.edges) nUpd++; }); });
  if(!nNew && !nUpd && !parts){ undoStack.pop(); return toast('IBD\'ler model ile güncel'); }
  afterChange(); toast(`${nNew} IBD oluşturuldu, ${nUpd} IBD güncellendi` + (parts ? `, ${parts} part eklendi` : ''));
}
function syncCurIBD(){
  const d = cur(); if(!d || d.dtype !== 'ibd') return toast('Önce bir IBD açın');
  snap(); const r = syncIBD(d);
  if(!r.shapes && !r.edges && !r.created){ undoStack.pop(); return toast('IBD model ile güncel'); }
  afterChange(); toast(`Eklenen: ${r.parts} part, ${r.vals} value, ${r.ports} port, ${r.edges} bağlantı` + (r.created ? ` · ${r.created} Composition için part oluşturuldu` : ''));
}
/* ---------- bağlam diyagramı ---------- */
function isAncAny(set, id){ for(const a of set) if(isAnc(a, id)) return true; return false; }
function contextExternals(sys){
  const out = new Map(), add = (e, why) => { if(!e || e.id === sys.id || !['Block', 'Actor', 'InterfaceBlock'].includes(e.kind)) return; if(!out.has(e.id)) out.set(e.id, {e, why:new Set(), direct:false}); out.get(e.id).why.add(why); };
  const els = Object.values(M.els), partsOfSys = new Set(els.filter(p => p.kind === 'Part' && p.type === sys.id).map(p => p.id));
  const ownerBlock = id => { let x = E(id); while(x && x.kind !== 'Block' && x.kind !== 'Actor' && x.kind !== 'InterfaceBlock') x = E(x.owner); return x; };
  els.forEach(r => {
    if(!KIND[r.kind] || !KIND[r.kind].rel) return;
    if(['Association', 'Dependency', 'Usage', 'Allocate', 'Trace', 'ItemFlow'].includes(r.kind)){ if(r.src === sys.id){ add(E(r.tgt), r.kind); if(out.has(r.tgt)) out.get(r.tgt).direct = true; } if(r.tgt === sys.id){ add(E(r.src), r.kind); if(out.has(r.src)) out.get(r.src).direct = true; } }
    if(r.kind === 'Connector'){
      const endIsSys = (el, pp) => partsOfSys.has(el) || partsOfSys.has(pp) || (E(el) && E(el).kind === 'Port' && E(el).owner === sys.id && !pp);
      const other = (el, pp) => { const p = E(pp) || E(el); if(!p) return null; if(p.kind === 'Part') return E(p.type); if(p.kind === 'Port') return ownerBlock(p.owner); return p; };
      if(endIsSys(r.src, r.sp)) add(other(r.tgt, r.tp), 'Bağlantı');
      else if(endIsSys(r.tgt, r.tp)) add(other(r.src, r.sp), 'Bağlantı');
    }
  });
  /* aktörler: kullanım senaryoları üzerinden */
  const subj = new Set(els.filter(x => x.kind === 'Subject' && (x.represents === sys.id || (x.name || '').trim() === (sys.name || '').trim())).map(x => x.id)), ucs = new Set();
  els.filter(u => u.kind === 'UseCase' && (subj.has(u.owner) || isAncAny(subj, u.id))).forEach(u => ucs.add(u.id));
  els.filter(x => x.kind === 'Diagram' && x.dtype === 'uc').forEach(dd => dd.shapes.forEach(sh => { const p = sh.parent && shapeOf(dd, sh.parent), u = E(sh.el); if(p && subj.has(p.el) && u && u.kind === 'UseCase') ucs.add(u.id); }));
  els.filter(r => r.kind === 'Association' && (ucs.has(r.src) || ucs.has(r.tgt))).forEach(r => { const a = E(ucs.has(r.src) ? r.tgt : r.src); if(a && a.kind === 'Actor') add(a, 'Kullanım senaryosu'); });
  /* sistemin kendi part tipleri dış eleman sayılmaz */
  kidsOf(sys.id).filter(p => p.kind === 'Part').forEach(p => out.delete(p.type));
  return [...out.values()].filter(x => !isAnc(sys.id, x.e.id));
}
function contextDiagram(sysId, link){
  const sys = E(sysId); if(!sys || sys.kind !== 'Block') return toast('Bağlam diyagramı için bir blok seçin');
  const ex = contextExternals(sys); if(!ex.length) return toast(`"${sys.name}" için dış eleman bulunamadı (aktör, ilişkili blok veya bağlantı)`);
  snap();
  const d = newDiagramCore(nearestPkg(sys.id), 'bdd', sys.name + ' Bağlam Diyagramı'), n = ex.length, R = Math.max(280, n * 55), cx = 60 + R + 130, cy = 60 + R * 0.7 + 60;
  const S = addShape(d, sys.id, cx - 120, cy - 60, 240, 120); S.fill = '#fde9c9';
  let made = 0;
  ex.forEach((x, i) => {
    const a = -Math.PI / 2 + i * 2 * Math.PI / n, w = x.e.kind === 'Actor' ? 70 : 190, h = x.e.kind === 'Actor' ? 100 : 70;
    addShape(d, x.e.id, Math.round(cx + Math.cos(a) * (R + 40) - w / 2), Math.round(cy + Math.sin(a) * R * 0.7 - h / 2), w, h);
    if(link !== false && !x.direct){ mk('Association', nearestPkg(sys.id), {src:sys.id, tgt:x.e.id, name:''}); made++; }
  });
  d.shapes.slice().forEach(sh => autoEdges(d, sh));
  ST.exp.add(d.owner); afterChange(); openD(d.id); revealInTree(d.id);
  toast(`Bağlam diyagramı: ${n} dış eleman` + (made ? ` · ${made} Association eklendi (bağlantı / senaryo kaynaklı)` : ''));
  return d;
}
function contextDialog(){
  const blocks = Object.values(M.els).filter(e => e.kind === 'Block').sort((a, b) => pathOf(a.id).localeCompare(pathOf(b.id), 'tr'));
  if(!blocks.length) return toast('Modelde blok yok');
  const sel = E(ST.tsel) && E(ST.tsel).kind === 'Block' ? ST.tsel : (E(ST.tsel) && E(ST.tsel).kind === 'Part' && E(E(ST.tsel).type) ? E(ST.tsel).type : blocks[0].id);
  quickForm('Bağlam diyagramı üret', [{k:'b', l:'Sistem bloğu', t:'select', v:sel, opts:blocks.map(b => [b.id, pathOf(b.id)])}, {k:'link', l:'Bağlantılar', t:'check', v:true, hint:'Doğrudan ilişkisi olmayan dış elemanlara Association ekle'}], v => { contextDiagram(v.b, v.link); }, 'Sistem bloğu ortada; aktörler, ilişkili bloklar ve IBD bağlantılarından bulunan dış elemanlar çevresine yerleştirilir.');
}

/* ---------- bul ve değiştir ---------- */
const FR_GROUPS = [['name', 'Ad', ['name']], ['text', 'Gereksinim metni', ['text', 'srcText']], ['doc', 'Açıklama', ['doc']], ['ids', 'Kimlikler (ID, prosedür no, seri no…)', ['reqId', 'procNo', 'riskId', 'ncrId', 'icdId', 'sn', 'pn', 'reportNo']], ['tv', 'Etiket değerleri', []], ['other', 'Diğer metin alanları (test, NCR, FMEA, risk…)', ['std', 'resp', 'testItem', 'subsys', 'desc', 'cause', 'ca', 'act', 'ctrl', 'fn', 'effL', 'effN', 'effE', 'purpose', 'pre', 'accept', 'concl', 'loc', 'cfg', 'unit', 'guard', 'effect', 'entry', 'doAct', 'exit', 'expr', 'proto', 'conn', 'spec', 'items', 'srcNo', 'plevel']]];
const FR_LBL = {name:'Ad', text:'Metin', srcText:'Kaynak metin', doc:'Açıklama', reqId:'ID', procNo:'Prosedür no', riskId:'Risk ID', ncrId:'NCR no', icdId:'Arayüz ID', sn:'Seri no', pn:'Parça no', reportNo:'Rapor no'};
let FR = {f:'', r:'', cs:false, ww:false, g:{name:true, text:true, doc:true, ids:false, tv:false, other:false}, kind:'all', off:new Set()};
function frRegex(){ if(!FR.f) return null; const e = FR.f.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); try { return new RegExp(FR.ww ? `(?<![\\p{L}\\p{N}_])${e}(?![\\p{L}\\p{N}_])` : e, 'gu' + (FR.cs ? '' : 'i')); } catch(err){ return null; } }
function frHits(){
  const re = frRegex(); if(!re) return [];
  const out = [], test = v => { re.lastIndex = 0; return typeof v === 'string' && v && re.test(v); };
  Object.values(M.els).forEach(e => {
    if(e.kind === 'Diagram' && !FR.g.name) return;
    if(FR.kind !== 'all' && e.kind !== FR.kind) return;
    FR_GROUPS.forEach(([g, , fs]) => {
      if(!FR.g[g]) return;
      if(g === 'tv'){ Object.keys(e.tv || {}).forEach(k => { if(test(e.tv[k])) out.push({e, f:'tv:' + k, v:e.tv[k], lbl:'Etiket: ' + k.slice(k.indexOf('.') + 1)}); }); return; }
      fs.forEach(f => { if(test(e[f])) out.push({e, f, v:e[f], lbl:FR_LBL[f] || f}); });
      if(g === 'other') tcSteps(e).forEach((s, i) => ['a', 'exp', 'meas'].forEach(k => { if(test(s[k])) out.push({e, f:'step:' + i + ':' + k, v:s[k], lbl:`Adım ${i + 1}`}); }));
    });
  });
  return out;
}
const frKey = h => h.e.id + '|' + h.f;
function frReplaceVal(v){ const re = frRegex(); return v.replace(re, () => FR.r); }
function frMark(v){ const re = frRegex(); let o = '', last = 0; v = String(v); const s = v.length > 220 ? v.slice(0, 220) + '…' : v; s.replace(re, (m, ...a) => { const i = a[a.length - 2]; o += esc(s.slice(last, i)) + `<mark>${esc(m)}</mark>`; last = i + m.length; return m; }); return o + esc(s.slice(last)); }
function findReplaceDialog(){
  const box = $('#modalBox'); box.style.width = 'min(980px, 96vw)'; box.style.maxWidth = 'none';
  const kinds = [...new Set(Object.values(M.els).map(e => e.kind))].filter(k => KIND[k] && !KIND[k].rel).sort((a, b) => KIND[a].tr.localeCompare(KIND[b].tr, 'tr'));
  box.innerHTML = `<h2>Bul ve değiştir</h2>
    <div class="rpgrid"><label>Aranan <input id="frF" value="${esc(FR.f)}"></label><label>Yeni metin <input id="frR" value="${esc(FR.r)}"></label></div>
    <div class="icbar" style="flex-wrap:wrap;margin-top:6px"><label class="vchk"><input type="checkbox" id="frCs"${FR.cs ? ' checked' : ''}> Büyük/küçük harf duyarlı</label><label class="vchk"><input type="checkbox" id="frWw"${FR.ww ? ' checked' : ''}> Tam kelime</label>
      <label>Eleman türü <select id="frK"><option value="all">Tümü</option>${kinds.map(k => `<option value="${k}"${FR.kind === k ? ' selected' : ''}>${esc(KIND[k].tr)}</option>`).join('')}</select></label></div>
    <div class="icbar" style="flex-wrap:wrap">${FR_GROUPS.map(([g, t]) => `<label class="vchk"><input type="checkbox" data-frg="${g}"${FR.g[g] ? ' checked' : ''}> ${esc(t)}</label>`).join('')}</div>
    <div class="sub"><span id="frN"></span><span><button class="pbtn" id="frAll">Tümünü seç</button> <button class="pbtn" id="frNone">Hiçbiri</button></span></div><div id="frL" class="frl"></div>
    <p style="text-align:right;margin:10px 0 0"><button class="pbtn" id="frC">Kapat</button> <button class="pbtn pri" id="frO">Seçilenleri değiştir</button></p>`;
  $('#modal').style.display = 'flex';
  let hits = [];
  const draw = () => {
    FR.f = $('#frF').value; FR.r = $('#frR').value; FR.cs = $('#frCs').checked; FR.ww = $('#frWw').checked; FR.kind = $('#frK').value; box.querySelectorAll('[data-frg]').forEach(i => FR.g[i.dataset.frg] = i.checked);
    hits = frHits(); const L = hits.slice(0, 400), on = hits.filter(h => !FR.off.has(frKey(h))).length;
    $('#frN').textContent = FR.f ? `${hits.length} eşleşme · ${on} seçili` + (hits.length > 400 ? ' (ilk 400 gösteriliyor)' : '') : 'Aranacak metni yazın';
    $('#frL').innerHTML = L.length ? `<table class="rt"><thead><tr><th></th><th>Eleman</th><th>Alan</th><th>Mevcut</th><th>Yeni</th></tr></thead><tbody>${L.map((h, i) => `<tr><td><input type="checkbox" data-fri="${i}"${FR.off.has(frKey(h)) ? '' : ' checked'}></td><td class="noi18n"><span class="muted">${esc(KIND[h.e.kind].tr)}</span><br>${esc(h.e.reqId ? h.e.reqId + ' ' : '')}${esc(nm(h.e) || '')}</td><td>${esc(h.lbl)}</td><td class="noi18n">${frMark(h.v)}</td><td class="noi18n">${esc(frReplaceVal(String(h.v)).slice(0, 220))}</td></tr>`).join('')}</tbody></table>` : (FR.f ? '<div class="muted" style="padding:8px">Eşleşme yok.</div>' : '');
  };
  const close = () => { $('#modal').style.display = 'none'; box.style.width = ''; box.style.maxWidth = ''; box.onclick = null; box.oninput = null; box.onchange = null; box.onkeydown = null; };
  box.oninput = ev => { if(ev.target.id === 'frF' || ev.target.id === 'frR'){ FR.off.clear(); clearTimeout(box._tm); box._tm = setTimeout(draw, 150); } };
  box.onchange = ev => { const t = ev.target; if(t.dataset.fri != null){ const h = hits[+t.dataset.fri]; if(t.checked) FR.off.delete(frKey(h)); else FR.off.add(frKey(h)); $('#frN').textContent = `${hits.length} eşleşme · ${hits.filter(x => !FR.off.has(frKey(x))).length} seçili`; return; } if(t.id !== 'frF' && t.id !== 'frR') draw(); };
  box.onkeydown = ev => { ev.stopPropagation(); if(ev.key === 'Escape') close(); };
  box.onclick = ev => {
    const id = ev.target.id;
    if(id === 'frC') close();
    if(id === 'frAll'){ FR.off.clear(); draw(); }
    if(id === 'frNone'){ hits.forEach(h => FR.off.add(frKey(h))); draw(); }
    if(id === 'frO'){
      const sel = hits.filter(h => !FR.off.has(frKey(h))); if(!sel.length) return toast('Değiştirilecek eşleşme seçilmedi');
      snap(); let n = 0;
      sel.forEach(h => {
        if(h.f.startsWith('tv:')){ const k = h.f.slice(3); h.e.tv[k] = frReplaceVal(h.e.tv[k]); n++; return; }
        if(h.f.startsWith('step:')){ const [, i, k] = h.f.split(':'); const s = tcSteps(h.e)[+i]; if(s){ s[k] = frReplaceVal(s[k]); n++; } return; }
        const nv = frReplaceVal(String(h.e[h.f])); if(h.f === 'name' && !nv.trim()) return; h.e[h.f] = nv; n++;
      });
      afterChange(); FR.off.clear(); draw(); toast(`${n} alan değiştirildi (Ctrl+Z ile geri alınır)`);
    }
  };
  draw(); setTimeout(() => { const i = $('#frF'); i.focus(); i.select(); }, 30);
}

/* ---------- toplu düzenleme (diyagramda çoklu seçim) ---------- */
function bulkTargets(){ const d = cur(); if(!d || d.kind !== 'Diagram' || ST.sel.size < 2) return null; const L = [...ST.sel].map(id => shapeOf(d, id)).filter(Boolean).map(sh => ({sh, e:E(sh.el)})).filter(x => x.e); return L.length > 1 ? {d, L} : null; }
function bulkPropsHTML(T){
  const pf = (l, c) => `<div class="pf"><label>${l}</label><div>${c}</div></div>`, cnt = {};
  T.L.forEach(x => { cnt[x.e.kind] = (cnt[x.e.kind] || 0) + 1; });
  const kinds = Object.keys(cnt), only = k => kinds.length === 1 && kinds[0] === k, sts = Object.values(M.els).filter(e => e.kind === 'Stereotype').sort(sortEls);
  let h = `<div class="pt">Toplu düzenleme</div><div class="muted" style="margin:0 0 6px">${T.L.length} öğe seçili: ${kinds.map(k => cnt[k] + ' ' + esc(KIND[k].tr)).join(', ')}</div>`;
  h += `<div class="sub"><span>Görünüm</span></div>` + pf('Dolgu', `<input type="color" data-bk="fill" value="${T.L[0].sh.fill || '#ffffff'}"> <button class="pbtn" data-bkb="nofill">Varsayılan</button>`) + pf('Çizgi rengi', `<input type="color" data-bk="stroke" value="${T.L[0].sh.stroke || '#333333'}"> <button class="pbtn" data-bkb="nostroke">Varsayılan</button>`);
  if(sts.length) h += `<div class="sub"><span>Stereotip</span></div>` + pf('Stereotip', `<select data-bks="st" class="noi18n">${sts.map(s => `<option value="${s.id}">«${esc(s.name)}»</option>`).join('')}</select> <button class="pbtn" data-bkb="stadd">Ekle</button> <button class="pbtn" data-bkb="strem">Kaldır</button>`);
  if(only('Requirement')) h += `<div class="sub"><span>Gereksinim</span></div>` + pf('Durum', `<select data-bk="status"><option value="">—</option>${REQ_STATUS.map(s => `<option>${s}</option>`).join('')}</select>`) + pf('Doğrulama yöntemi', `<select data-bk="verifAdd"><option value="">—</option>${VERIF.map(([v]) => `<option>${v}</option>`).join('')}</select> <span class="muted">ekler</span>`);
  if(only('TestCase')) h += `<div class="sub"><span>Test durumu</span></div>` + pf('Sonuç', `<select data-bk="result"><option value="">—</option>${TEST_RESULT.map(s => `<option>${s}</option>`).join('')}</select>`) + pf('Doğrulama seviyesi', `<select data-bk="tLevel"><option value="">—</option>${TEST_LEVELS.map(s => `<option>${s}</option>`).join('')}</select>`) + pf('Sorumlu', `<input data-bk="resp" placeholder="Hepsine yaz">`);
  const pk = Object.values(M.els).filter(e => e.kind === 'Package' || e.kind === 'Model').sort((a, b) => pathOf(a.id).localeCompare(pathOf(b.id), 'tr'));
  const movable = T.L.filter(x => canOwn('Package', x.e.kind));
  if(movable.length) h += `<div class="sub"><span>Paket</span></div>` + pf('Taşı', `<select data-bks="pkg" class="noi18n">${pk.map(p => `<option value="${p.id}">${esc(pathOf(p.id))}</option>`).join('')}</select> <button class="pbtn" data-bkb="move">Taşı (${movable.length})</button>`);
  h += `<div class="sub"><span>Hizalama</span></div><div class="li"><button class="pbtn" data-bkb="samew">Aynı genişlik</button> <button class="pbtn" data-bkb="sameh">Aynı yükseklik</button></div>`;
  return h;
}
(function(){
  const P = $('#props');
  const apply = fn => { const T = bulkTargets(); if(!T) return; snap(); const n = fn(T); afterChange(); if(n != null) toast(`${n} öğe güncellendi`); };
  P.addEventListener('change', ev => {
    const t = ev.target; if(!t.dataset.bk || !bulkTargets()) return; ev.stopPropagation();
    const k = t.dataset.bk, v = t.value; if(v === '' && !['fill', 'stroke'].includes(k)) return;
    apply(T => {
      if(k === 'fill' || k === 'stroke'){ T.L.forEach(x => { x.sh[k] = v; }); return T.L.length; }
      if(k === 'verifAdd'){ T.L.forEach(x => { const s = new Set(String(x.e.verif || '').split(/[,;\/]+/).map(q => q.trim()).filter(Boolean)); s.add(v); x.e.verif = [...s].join(', '); }); return T.L.length; }
      T.L.forEach(x => { x.e[k] = v; if(k === 'result' && ['Geçti', 'Kaldı', 'Koşullu'].includes(v) && !x.e.rDate) x.e.rDate = todayISO(); }); return T.L.length;
    });
  }, true);
  P.addEventListener('click', ev => {
    const b = ev.target.closest('[data-bkb]'); if(!b || !bulkTargets()) return;
    const a = b.dataset.bkb, sv = s => (P.querySelector(`[data-bks="${s}"]`) || {}).value;
    apply(T => {
      if(a === 'nofill'){ T.L.forEach(x => delete x.sh.fill); return T.L.length; }
      if(a === 'nostroke'){ T.L.forEach(x => delete x.sh.stroke); return T.L.length; }
      if(a === 'stadd'){ const s = sv('st'); T.L.forEach(x => { x.e.st = Array.isArray(x.e.st) ? x.e.st : []; if(!x.e.st.includes(s)) x.e.st.push(s); }); return T.L.length; }
      if(a === 'strem'){ const s = sv('st'); T.L.forEach(x => { if(Array.isArray(x.e.st)) x.e.st = x.e.st.filter(q => q !== s); }); return T.L.length; }
      if(a === 'move'){ const p = sv('pkg'); let n = 0; T.L.forEach(x => { if(canOwn(E(p).kind, x.e.kind) && x.e.id !== p && !isAnc(x.e.id, p)){ x.e.owner = p; n++; } }); return n; }
      if(a === 'samew'){ const w = T.L[0].sh.w; T.L.forEach(x => { x.sh.w = w; }); return T.L.length; }
      if(a === 'sameh'){ const h = T.L[0].sh.h; T.L.forEach(x => { x.sh.h = h; }); return T.L.length; }
    });
  });
})();

/* ---------- lejant kuralları (renk = özelliğe göre) ---------- */
const LEG_PAL = ['#cfe2ff', '#d5f0e0', '#ffe5b4', '#f8d7d3', '#e5d4f5', '#d0f0f0', '#fff1a8', '#e2e3e5', '#fcd5e8', '#dfe9c6'];
const lighten = (hex, k) => { const m = String(hex).match(/^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i); if(!m) return hex; return '#' + [1, 2, 3].map(i => Math.round(parseInt(m[i], 16) + (255 - parseInt(m[i], 16)) * k).toString(16).padStart(2, '0')).join(''); };
function legendRules(){
  const r = [['', 'Elle (öğeleri kendiniz yazın)'], ['reqStatus', 'Gereksinim durumu'], ['verStatus', 'Doğrulama durumu (gereksinim)'], ['testResult', 'Test sonucu'], ['kind', 'Eleman türü'], ['stereo', 'Stereotip'], ['ncr', 'Açık NCR'], ['rpn', 'FMEA en yüksek RPN']];
  Object.values(M.els).filter(e => e.kind === 'Stereotype').sort(sortEls).forEach(st => stTags(st).forEach(t => r.push(['tv:' + st.id + '.' + t.key, `Etiket: «${st.name}».${t.key}`])));
  return r;
}
function ruleVal(rule, e){
  switch(rule){
    case 'reqStatus': return e.kind === 'Requirement' ? reqStatus(e) : null;
    case 'verStatus': return e.kind === 'Requirement' ? verStatus(e) : null;
    case 'testResult': return e.kind === 'TestCase' ? testResult(e) : null;
    case 'kind': return KIND[e.kind] && !['Legend', 'Comment', 'Diagram'].includes(e.kind) ? KIND[e.kind].tr : null;
    case 'stereo': { const s = (e.st || []).map(E).filter(Boolean); return s.length ? '«' + s[0].name + '»' : (['Block', 'Part', 'Requirement', 'Actor', 'InterfaceBlock'].includes(e.kind) ? '(stereotipsiz)' : null); }
    case 'ncr': { let ns = null; if(e.kind === 'Requirement') ns = ncrsOfReq(e, trace(e).verifyBy.filter(x => x.kind === 'TestCase')); else if(e.kind === 'TestCase') ns = ncrsOfTest(e.id); else if(e.kind === 'Block') ns = allNCRs().filter(n => E(n.article) && E(n.article).block === e.id); else if(e.kind === 'TestArticle') ns = ncrsOfArticle(e.id); return ns == null ? null : ns.some(ncrOpen) ? 'Açık NCR var' : 'Açık NCR yok'; }
    case 'rpn': { if(!['Block', 'Part', 'Activity', 'Action', 'InterfaceBlock'].includes(e.kind)) return null; const fs = allFMs().filter(f => f.owner === e.id || isAnc(e.id, f.owner)), m = Math.max(0, ...fs.map(f => rpnOf(f) || 0)); return !fs.length ? 'FMEA yok' : m >= FV.thr ? `RPN ≥ ${FV.thr}` : m >= FV.thr / 2 ? `RPN ${Math.ceil(FV.thr / 2)}–${FV.thr - 1}` : `RPN < ${Math.ceil(FV.thr / 2)}`; }
  }
  if(rule && rule.startsWith('tv:')){ const key = rule.slice(3), i = key.indexOf('.'), st = E(key.slice(0, i)); if(!st || !(e.st || []).includes(st.id)) return null; const v = tagVal(e, st, key.slice(i + 1)); return v === '' ? '(boş)' : String(v); }
  return null;
}
function ruleColor(rule, v, idx){
  const fix = rule === 'reqStatus' ? STATUS_COL : rule === 'verStatus' ? VST_COL : rule === 'testResult' ? RES_COL : null;
  if(fix && fix[v]) return lighten(fix[v], 0.72);
  if(rule === 'ncr') return v === 'Açık NCR var' ? '#f8d7d3' : '#d5f0e0';
  if(rule === 'rpn') return v === 'FMEA yok' ? '#eceff3' : v.includes('≥') ? '#f8d7d3' : v.includes('<') ? '#d5f0e0' : '#ffe5b4';
  if(rule === 'kind'){ const k = Object.keys(KIND).find(q => KIND[q].tr === v); if(k && KIND[k].col) return lighten(KIND[k].col, 0.75); }
  return LEG_PAL[idx % LEG_PAL.length];
}
let LEGC = {key:'', map:new Map(), items:new Map()};
function legendCalc(d){
  const legs = d.shapes.map(s => E(s.el)).filter(e => e && e.kind === 'Legend' && e.rule), key = d.id + ':' + REV + ':' + legs.map(l => l.id + l.rule).join(',');
  if(LEGC.key === key) return LEGC;
  const map = new Map(), items = new Map();
  legs.forEach(L => {
    const vals = [], vOf = new Map();
    d.shapes.forEach(s => { const e = E(s.el); if(!e || e.kind === 'Legend' || map.has(e.id)) return; const v = ruleVal(L.rule, e); if(v == null) return; vOf.set(e.id, v); if(!vals.includes(v)) vals.push(v); });
    const order = L.rule === 'reqStatus' ? REQ_STATUS : L.rule === 'verStatus' ? VER_ST : L.rule === 'testResult' ? TEST_RESULT : L.rule === 'ncr' ? ['Açık NCR var', 'Açık NCR yok'] : null;
    vals.sort((a, b) => order ? order.indexOf(a) - order.indexOf(b) : L.rule === 'rpn' ? 0 : String(a).localeCompare(String(b), 'tr', {numeric:true}));
    const col = new Map(vals.map((v, i) => [v, ruleColor(L.rule, v, i)]));
    vOf.forEach((v, id) => { if(!map.has(id)) map.set(id, col.get(v)); });
    items.set(L.id, vals.map(v => ({c:col.get(v), t:v + ' (' + [...vOf.values()].filter(x => x === v).length + ')'})));
  });
  LEGC = {key, map, items}; return LEGC;
}
const legendFill = (d, e) => d && d.shapes && d.kind === 'Diagram' && e && e.kind !== 'Legend' && d.shapes.some(s => s.el && E(s.el) && E(s.el).kind === 'Legend') ? legendCalc(d).map.get(e.id) || '' : '';
DEMO_EXT.push(X => {
  const d = Object.values(M.els).find(e => e.kind === 'Diagram' && e.dtype === 'req' && e.shapes.length > 3); if(!d) return;
  const L = mk('Legend', d.owner, {name:'Doğrulama durumu', rule:'verStatus'});
  const right = Math.max(...d.shapes.map(s => s.x + s.w)); addShape(d, L.id, right + 40, Math.min(...d.shapes.map(s => s.y)), 220, 80);
});

document.addEventListener('keydown', ev => { if((ev.ctrlKey || ev.metaKey) && (ev.key === 'h' || ev.key === 'H') && !ev.shiftKey && !ev.altKey){ ev.preventDefault(); ev.stopPropagation(); findReplaceDialog(); } }, true);

