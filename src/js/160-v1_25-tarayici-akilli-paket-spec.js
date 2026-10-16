/* ================= v1.25: MODEL TARAYICI SEKMELERİ, AKILLI PAKETLER, SPESİFİKASYON PENCERESİ ================= */
Object.assign(KIND, {SmartPackage:{tr:'Akıllı Paket', en:'SmartPackage', ic:'SP', col:'#2d7ff9'}});
Object.assign(BASE, {SmartPackage:'Akıllı paket'});
['Model', 'Package'].forEach(k => { if(OWN[k] && !OWN[k].includes('SmartPackage')) OWN[k].push('SmartPackage'); });
RANK.push('SmartPackage');
ST.ttab = ST.ttab || 'tree'; ST.tq = ST.tq || '';
/* ---------- akıllı paket kuralları ---------- */
const SP_FIELDS = [['name', 'Ad'], ['reqId', 'Gereksinim ID'], ['text', 'Gereksinim metni'], ['status', 'Gereksinim durumu'], ['level', 'Gereksinim seviyesi'], ['subsys', 'Alt sistem'], ['verif', 'Doğrulama yöntemi'], ['@verStatus', 'Doğrulama durumu (hesaplanan)'], ['result', 'Test sonucu'], ['tLevel', 'Doğrulama seviyesi (test)'], ['testItem', 'Test edilen birim'], ['resp', 'Sorumlu'], ['doc', 'Açıklama'], ['@kind', 'Eleman türü'], ['@stereo', 'Stereotip'], ['@owner', 'Sahip (yol)'], ['@notes', 'Açık inceleme notu sayısı'], ['@rpn', 'En yüksek RPN']];
const SP_OPS = [['has', 'içerir'], ['eq', '='], ['ne', '≠'], ['gt', '>'], ['lt', '<'], ['empty', 'boş'], ['nempty', 'dolu']];
function spFields(){ const r = SP_FIELDS.slice(); Object.values(M.els).filter(e => e.kind === 'Stereotype').sort(sortEls).forEach(st => stTags(st).forEach(t => r.push(['tv:' + st.id + '.' + t.key, `«${st.name}».${t.key}`]))); return r; }
function spVal(e, f, cx){
  if(!f) return '';
  if(f === '@verStatus') return e.kind === 'Requirement' ? verStatus(e, trace(e, cx && cx.idx ? cx.idx : undefined)) : '';
  if(f === '@kind') return KIND[e.kind] ? KIND[e.kind].tr : e.kind;
  if(f === '@stereo') return stNames(e).join(', ');
  if(f === '@owner') return pathOf(e.owner);
  if(f === '@notes') return String(typeof noteOpen === 'function' ? noteOpen(e) : 0);
  if(f === '@rpn'){ const fs = allFMs().filter(x => x.owner === e.id || isAnc(e.id, x.owner)); return fs.length ? String(Math.max(...fs.map(x => rpnOf(x) || 0))) : ''; }
  if(f.startsWith('tv:')){ const k = f.slice(3), i = k.indexOf('.'), st = E(k.slice(0, i)); return st && (e.st || []).includes(st.id) ? String(tagVal(e, st, k.slice(i + 1)) || '') : ''; }
  if(f === 'status' && e.kind === 'Requirement') return reqStatus(e);
  if(f === 'result' && e.kind === 'TestCase') return testResult(e);
  return e[f] == null ? '' : String(e[f]);
}
function spCond(e, c, cx){
  if(c.t === 'rel'){ const n = (c.dir !== 'in' ? (cx.rb.get(c.rk + '>' + e.id) || 0) : 0) + (c.dir !== 'out' ? (cx.rb.get(c.rk + '<' + e.id) || 0) : 0); return c.has === false ? !n : n > 0; }
  const v = spVal(e, c.f, cx), x = String(c.v == null ? '' : c.v), n1 = parseFloat(String(v).replace(',', '.')), n2 = parseFloat(x.replace(',', '.'));
  switch(c.op){
    case 'eq': return asciiTr(v) === asciiTr(x);
    case 'ne': return asciiTr(v) !== asciiTr(x);
    case 'gt': return !isNaN(n1) && !isNaN(n2) && n1 > n2;
    case 'lt': return !isNaN(n1) && !isNaN(n2) && n1 < n2;
    case 'empty': return !String(v).trim();
    case 'nempty': return !!String(v).trim();
    default: return asciiTr(v).includes(asciiTr(x));
  }
}
const SM_CACHE = new Map();
function smartMembers(sp){
  const key = JSON.stringify(sp.rule || {}) + '|' + MCHG + '|' + Object.keys(M.els).length;
  const c = SM_CACHE.get(sp.id); if(c && c.key === key && c.M === M) return c.list.filter(e => M.els[e.id] === e);
  const list = smartMembersCalc(sp); SM_CACHE.set(sp.id, {key, list, M}); return list;
}
function smartMembersCalc(sp){
  const R = sp.rule || {}, kinds = new Set(R.kinds || []), conds = R.conds || [], scope = R.scope && E(R.scope) ? R.scope : '';
  const all = Object.values(M.els), cx = {rb:new Map(), idx:conds.some(c => c.f === '@verStatus') ? relIdx() : null};
  if(conds.some(c => c.t === 'rel')) all.forEach(r => { if(r.src && r.tgt && KIND[r.kind] && KIND[r.kind].rel){ const a = r.kind + '>' + r.src, b = r.kind + '<' + r.tgt; cx.rb.set(a, (cx.rb.get(a) || 0) + 1); cx.rb.set(b, (cx.rb.get(b) || 0) + 1); } });
  return all.filter(e => {
    if(e.id === sp.id || e.kind === 'SmartPackage' || e.kind === 'Diagram' && !kinds.has('Diagram')) return false;
    if(kinds.size ? !kinds.has(e.kind) : (KIND[e.kind] && KIND[e.kind].rel)) return false;
    if(scope && e.id !== scope && !isAnc(scope, e.id)) return false;
    if(R.st && !(e.st || []).includes(R.st)) return false;
    const res = conds.map(c => spCond(e, c, cx));
    return !conds.length || (R.any ? res.some(Boolean) : res.every(Boolean));
  }).sort(sortEls);
}
function smartDialog(spId, ownerId){
  let sp = E(spId);
  const isNew = !sp, R0 = sp ? JSON.parse(JSON.stringify(sp.rule || {})) : {kinds:['Requirement'], conds:[], any:false};
  const R = Object.assign({kinds:[], conds:[], any:false, st:'', scope:''}, R0);
  const kindsAll = [...new Set(Object.values(M.els).map(e => e.kind))].filter(k => KIND[k] && !KIND[k].rel && k !== 'SmartPackage').sort((a, b) => KIND[a].tr.localeCompare(KIND[b].tr, 'tr'));
  const relKinds = Object.keys(KIND).filter(k => KIND[k].rel).sort((a, b) => KIND[a].tr.localeCompare(KIND[b].tr, 'tr'));
  const sts = Object.values(M.els).filter(e => e.kind === 'Stereotype').sort(sortEls), pks = Object.values(M.els).filter(e => e.kind === 'Package' || e.kind === 'Model').sort((a, b) => pathOf(a.id).localeCompare(pathOf(b.id), 'tr'));
  const box = $('#modalBox'); box.style.width = 'min(880px, 96vw)'; box.style.maxWidth = 'none';
  let name = sp ? sp.name : 'Akıllı paket';
  const condRow = (c, i) => c.t === 'rel'
    ? `<div class="spc" data-ci="${i}"><span class="muted">İlişki</span><select data-cf="has"><option value="1"${c.has !== false ? ' selected' : ''}>olan</option><option value="0"${c.has === false ? ' selected' : ''}>olmayan</option></select><select data-cf="rk">${relKinds.map(k => `<option value="${k}"${c.rk === k ? ' selected' : ''}>${esc(KIND[k].tr)}</option>`).join('')}</select><select data-cf="dir"><option value="any"${!c.dir || c.dir === 'any' ? ' selected' : ''}>her yönde</option><option value="out"${c.dir === 'out' ? ' selected' : ''}>giden</option><option value="in"${c.dir === 'in' ? ' selected' : ''}>gelen</option></select><button class="tdel" data-cdel="${i}" title="Koşulu sil">✕</button></div>`
    : `<div class="spc" data-ci="${i}"><select data-cf="f">${spFields().map(([k, t]) => `<option value="${esc(k)}"${c.f === k ? ' selected' : ''}>${esc(t)}</option>`).join('')}</select><select data-cf="op">${SP_OPS.map(([k, t]) => `<option value="${k}"${(c.op || 'has') === k ? ' selected' : ''}>${esc(t)}</option>`).join('')}</select><input data-cf="v" value="${esc(c.v || '')}" placeholder="değer"${['empty', 'nempty'].includes(c.op) ? ' disabled' : ''}><button class="tdel" data-cdel="${i}" title="Koşulu sil">✕</button></div>`;
  const draw = () => {
    const tmp = {id:'__sp', rule:R}, mem = smartMembers(tmp);
    box.innerHTML = `<h2>${isNew ? 'Yeni akıllı paket' : 'Akıllı paket'}</h2>
      <div class="rpgrid"><label>Ad <input id="spN" value="${esc(name)}"></label><label>Kapsam (paket) <select id="spS" class="noi18n"><option value="">Tüm model</option>${pks.map(p => `<option value="${p.id}"${R.scope === p.id ? ' selected' : ''}>${esc(pathOf(p.id))}</option>`).join('')}</select></label></div>
      <div class="sub"><span>Eleman türleri (boşsa tümü)</span></div><div class="spk">${kindsAll.map(k => `<label class="vchk"><input type="checkbox" data-sk="${k}"${R.kinds.includes(k) ? ' checked' : ''}> ${esc(KIND[k].tr)}</label>`).join('')}</div>
      <div class="rpgrid"><label>Stereotip <select id="spT" class="noi18n"><option value="">(fark etmez)</option>${sts.map(s => `<option value="${s.id}"${R.st === s.id ? ' selected' : ''}>«${esc(s.name)}»</option>`).join('')}</select></label><label>Koşullar <select id="spA"><option value="0"${!R.any ? ' selected' : ''}>hepsi sağlansın (VE)</option><option value="1"${R.any ? ' selected' : ''}>biri sağlansın (VEYA)</option></select></label></div>
      <div class="sub"><span>Koşullar</span><span><button class="pbtn" id="spAddF">+ Özellik koşulu</button> <button class="pbtn" id="spAddR">+ İlişki koşulu</button></span></div>
      <div id="spC">${R.conds.map(condRow).join('') || '<div class="muted" style="font-size:12px">Koşul yok — türe ve kapsama uyan tüm elemanlar.</div>'}</div>
      <div class="sub"><span>Önizleme: ${mem.length} eleman</span></div><div class="splst noi18n">${mem.slice(0, 60).map(e => `<div>${icon(e)} ${esc(rowLabel(e))} <span class="muted">${esc(pathOf(e.owner))}</span></div>`).join('')}${mem.length > 60 ? `<div class="muted">… ${mem.length - 60} eleman daha</div>` : ''}</div>
      <p style="text-align:right;margin:10px 0 0"><button class="pbtn" id="spX">Vazgeç</button> <button class="pbtn pri" id="spO">${isNew ? 'Oluştur' : 'Kaydet'}</button></p>`;
  };
  const read = () => { name = $('#spN').value; R.scope = $('#spS').value; R.st = $('#spT').value; R.any = $('#spA').value === '1'; R.kinds = [...box.querySelectorAll('[data-sk]')].filter(i => i.checked).map(i => i.dataset.sk); box.querySelectorAll('.spc').forEach(row => { const c = R.conds[+row.dataset.ci]; row.querySelectorAll('[data-cf]').forEach(i => { const k = i.dataset.cf; c[k] = k === 'has' ? i.value === '1' : i.value; }); }); };
  const close = () => { $('#modal').style.display = 'none'; box.style.width = ''; box.style.maxWidth = ''; box.onclick = null; box.onchange = null; box.oninput = null; box.onkeydown = null; };
  draw(); $('#modal').style.display = 'flex';
  box.onkeydown = ev => { ev.stopPropagation(); if(ev.key === 'Escape') close(); };
  box.onchange = () => { read(); draw(); };
  box.oninput = ev => { if(ev.target.dataset.cf === 'v'){ clearTimeout(box._t); box._t = setTimeout(() => { read(); const pos = ev.target.selectionStart, ci = ev.target.closest('.spc').dataset.ci; draw(); const i = box.querySelector(`.spc[data-ci="${ci}"] [data-cf="v"]`); if(i){ i.focus(); i.setSelectionRange(pos, pos); } }, 300); } };
  box.onclick = ev => {
    const b = ev.target.closest('button'); if(!b) return;
    if(b.id === 'spX') return close();
    if(b.id === 'spAddF'){ read(); R.conds.push({f:'name', op:'has', v:''}); return draw(); }
    if(b.id === 'spAddR'){ read(); R.conds.push({t:'rel', rk:'Verify', dir:'in', has:true}); return draw(); }
    if(b.dataset.cdel != null){ read(); R.conds.splice(+b.dataset.cdel, 1); return draw(); }
    if(b.id === 'spO'){ read(); snap(); if(!sp){ sp = mk('SmartPackage', ownerId || nearestPkg(ST.tsel || M.rootId) || M.rootId, {}); } sp.name = name.trim() || 'Akıllı paket'; sp.rule = JSON.parse(JSON.stringify(R)); ST.exp.add(sp.id); ST.exp.add(sp.owner); afterChange(); close(); toast(`"${sp.name}": ${smartMembers(sp).length} eleman`); }
  };
}
/* ---------- ağaç sekmeleri ve süzgeç ---------- */
function treeQuerySet(){
  const q = asciiTr(ST.tq || '').trim(); if(!q) return null;
  const hit = new Set(), keep = new Set();
  Object.values(M.els).forEach(e => { if(KIND[e.kind] && KIND[e.kind].rel) return; if(asciiTr([e.name, e.reqId, e.procNo, e.riskId, e.ncrId, e.sn, treeName(e)].join(' ')).includes(q)){ hit.add(e.id); let o = e; while(o){ keep.add(o.id); o = E(o.owner); } } });
  return {hit, keep};
}
function treeRow(e, depth, opts){
  opts = opts || {};
  return `<div class="tr${ST.tsel === e.id || ST.tmulti.has(e.id) ? ' sel' : ''}${opts.hit ? ' thit' : ''}${opts.virt ? ' tvirt' : ''}" data-id="${e.id}" draggable="${!opts.virt && e.id !== M.rootId}" style="padding-left:${depth * 14 + 4}px"><span class="tw"${opts.tog ? ` data-tog="${opts.tog}"` : ''}>${opts.has ? (opts.open ? '▾' : '▸') : ''}</span>${icon(e)}<span class="nm">${esc(treeName(e))}</span>${opts.sub ? `<span class="kd">${esc(opts.sub)}</span>` : ''}</div>`;
}
function treeTabsHTML(){
  const T = [['tree', 'tree', 'Hiyerarşi'], ['dia', 'diagram', 'Diyagramlar'], ['inh', 'layers', 'Kalıtım'], ['smart', 'star', 'Akıllı']];
  return T.map(([k, ic, t]) => `<button class="ttab${ST.ttab === k ? ' on' : ''}" data-ttab="${k}" title="${t}">${uiIc(ic, 14)}<span>${t}</span></button>`).join('');
}
function renderTreeAlt(){
  const Q = treeQuerySet(), match = e => !Q || Q.hit.has(e.id);
  let h = '';
  if(ST.ttab === 'dia'){
    const ds = Object.values(M.els).filter(e => e.kind === 'Diagram' && match(e));
    Object.keys(DT).forEach(t => { const L = ds.filter(d => d.dtype === t).sort((a, b) => a.name.localeCompare(b.name, 'tr')); if(!L.length) return; const gid = 'tdia:' + t, op = !ST.exp.has('x' + gid) || !!Q; h += `<div class="tr grp"><span class="tw" data-tog="x${gid}">${op ? '▾' : '▸'}</span><span class="ic" style="background:${DT[t].col}">${t}</span><span class="nm">${esc(DT[t].tr)} (${L.length})</span></div>`; if(op) L.forEach(d => { h += treeRow(d, 1, {sub:pathOf(d.owner)}); }); });
    if(!h) h = '<div class="muted tmsg">Diyagram yok.</div>';
  } else if(ST.ttab === 'inh'){
    const gens = Object.values(M.els).filter(r => r.kind === 'Generalization' && E(r.src) && E(r.tgt)), kids = new Map(), hasParent = new Set();
    gens.forEach(r => { if(!kids.has(r.tgt)) kids.set(r.tgt, []); kids.get(r.tgt).push(E(r.src)); hasParent.add(r.src); });
    const roots = [...kids.keys()].filter(id => !hasParent.has(id)).map(E).filter(Boolean).sort(sortEls);
    const seen = new Set(), rec = (e, dp) => { if(seen.has(e.id + ':' + dp) || dp > 12) return; seen.add(e.id + ':' + dp); const ch = (kids.get(e.id) || []).slice().sort(sortEls), op = !ST.exp.has('xinh:' + e.id) || !!Q; h += treeRow(e, dp, {has:ch.length > 0, open:op, tog:'xinh:' + e.id, sub:KIND[e.kind].tr, hit:Q && Q.hit.has(e.id)}); if(op) ch.forEach(c => rec(c, dp + 1)); };
    roots.forEach(r => rec(r, 0));
    const lone = Object.values(M.els).filter(e => ['Block', 'InterfaceBlock', 'Actor', 'UseCase', 'Signal', 'ValueType', 'Requirement', 'Stereotype'].includes(e.kind) && !kids.has(e.id) && !hasParent.has(e.id) && match(e));
    if(!roots.length) h += '<div class="muted tmsg">Generalization ilişkisi yok.</div>';
    if(lone.length){ const op = ST.exp.has('xinh:@lone') || !!Q; h += `<div class="tr grp"><span class="tw" data-tog="xinh:@lone">${op ? '▾' : '▸'}</span><span class="ic" style="background:#a0a9b6">·</span><span class="nm">Kalıtımı olmayan sınıflandırıcılar (${lone.length})</span></div>`; if(op) lone.sort(sortEls).forEach(e => { h += treeRow(e, 1, {sub:KIND[e.kind].tr}); }); }
  } else if(ST.ttab === 'smart'){
    const sps = Object.values(M.els).filter(e => e.kind === 'SmartPackage').sort(sortEls);
    h += `<div class="tmsg"><button class="pbtn" data-spnew="1">+ Akıllı paket</button></div>`;
    sps.forEach(sp => { const mem = smartMembers(sp).filter(match), op = !ST.exp.has('xsp:' + sp.id) || !!Q; h += treeRow(sp, 0, {has:true, open:op, tog:'xsp:' + sp.id, sub:String(mem.length)}); if(op) mem.forEach(e => { h += treeRow(e, 1, {virt:true, sub:pathOf(e.owner)}); }); });
    if(!sps.length) h += '<div class="muted tmsg">Akıllı paket yok. Akıllı paket, kurallara (tür, stereotip, özellik değeri, ilişki varlığı) uyan elemanları kendiliğinden toplar ve model değiştikçe güncellenir.</div>';
  }
  $('#tree').innerHTML = h;
}
(function(){
  const ph = document.querySelector('#left .ph');
  if(ph && !$('#ttabs')){ ph.insertAdjacentHTML('afterend', `<div id="ttabs"></div><div id="tqbox"><input id="tq" placeholder="Ağaçta süz (ad, ID)…" autocomplete="off"><button id="tqx" title="Süzgeci temizle">${uiIc('x', 12)}</button></div>`); }
  const paintTabs = () => { const t = $('#ttabs'); if(t) t.innerHTML = treeTabsHTML(); };
  paintTabs();
  $('#ttabs').addEventListener('click', ev => { const b = ev.target.closest('[data-ttab]'); if(!b) return; ST.ttab = b.dataset.ttab; paintTabs(); renderTree(); });
  $('#tq').addEventListener('input', ev => { ST.tq = ev.target.value; clearTimeout(ev.target._t); ev.target._t = setTimeout(renderTree, 150); });
  $('#tq').addEventListener('keydown', ev => { ev.stopPropagation(); if(ev.key === 'Escape'){ ev.target.value = ''; ST.tq = ''; renderTree(); } });
  $('#tqx').addEventListener('click', () => { $('#tq').value = ''; ST.tq = ''; renderTree(); });
  $('#tree').addEventListener('click', ev => { if(ev.target.closest('[data-spnew]')) smartDialog(null, M.rootId); });
})();

/* ---------- spesifikasyon penceresi ---------- */
const SPEC_SKIP = new Set(['id', 'kind', 'owner', 'name', 'doc', 'st', 'tv', 'notes', 'steps', 'shapes', 'edges', 'vx', 'vy', 'z', 'attrs', 'rule', 'modOut', 'hide', 'items', 'pts', 'profiles', 'reqs', 'links', 'articles', 'res', 'deps', 'seps', 'lo', 'wp', 'ui', 'src', 'tgt', 'sp', 'tp', 'part', 'icon', 'iconCol', 'iconMode']);
const SPEC_LBL = {reqId:'Gereksinim ID', text:'Metin', status:'Durum', level:'Seviye', subsys:'Alt sistem', verif:'Doğrulama yöntemi', srcText:'Kaynak metin', srcNo:'Kaynak madde', prio:'Öncelik', procNo:'Prosedür no', tMethod:'Yöntem', tLevel:'Doğrulama seviyesi', testItem:'Test edilen birim', std:'Standart / referans', resp:'Sorumlu', pStart:'Planlanan başlangıç', pEnd:'Planlanan bitiş', result:'Sonuç', rDate:'Sonuç tarihi', reportNo:'Rapor no', type:'Tip', mult:'Çokluk', vtype:'Değer tipi', unit:'Birim', def:'Varsayılan', dir:'Yön', expr:'İfade', guard:'Koşul', effect:'Etki', entry:'entry', doAct:'do', exit:'exit', behavior:'Davranış', signal:'Sinyal', represents:'Temsil eder', dtype:'Diyagram türü', ptype:'Profil türü', plevel:'Seviye', tol:'Tolerans', icdId:'Arayüz ID', ifType:'Arayüz türü', proto:'Protokol', conn:'Konnektör', spec:'Özellikler', sn:'Seri no', pn:'Parça no', cfg:'Konfigürasyon', loc:'Konum', ast:'Durum', ncrId:'NCR no', sev:'Önem', cause:'Kök neden', ca:'Düzeltici faaliyet', disp:'Karar', nst:'Durum', due:'Hedef tarih', date:'Tarih', rtype:'Tür', cal:'Kalibrasyon geçerlilik', riskId:'Risk ID', desc:'Açıklama', cat:'Kategori', strat:'Strateji', act:'Önlem', fn:'Fonksiyon', effL:'Yerel etki', effN:'Üst seviye etki', effE:'Son etki', ctrl:'Mevcut kontroller', purpose:'Amaç', pre:'Ön koşullar', accept:'Kabul kriterleri', concl:'Değerlendirme', op:'Operatör', lits:'Değerler', tags:'Etiketler', fill:'Dolgu', qk:'Büyüklük türü', block:'Ürün (blok)', test:'Test', article:'Numune', fm:'Arıza modu', retest:'Tekrar test', rule:'Kural'};
const SPEC_ENUM = () => ({status:REQ_STATUS, level:['Sistem', 'Alt Sistem'], tMethod:VERIF.map(v => v[0]), tLevel:TEST_LEVELS, result:TEST_RESULT, dir:['in', 'out', 'inout'], nst:NCR_ST, sev:NCR_SEV, disp:NCR_DISP, ast:TA_ST, rtype:RES_TYPES, fst:FM_ST, rst:RK_ST, cat:RK_CAT, strat:RK_STR});
const SPEC_REF = {type:['Block', 'InterfaceBlock', 'ValueType', 'Enumeration', 'Signal', 'ConstraintBlock', 'Actor'], behavior:['Activity', 'StateMachine', 'Interaction'], signal:['Signal'], represents:['Block', 'Actor'], block:['Block'], test:['TestCase'], article:['TestArticle'], fm:['FailureMode'], retest:['TestCase']};
const SPEC_LONG = new Set(['text', 'srcText', 'desc', 'cause', 'ca', 'act', 'purpose', 'pre', 'accept', 'concl', 'expr', 'spec', 'effL', 'effN', 'effE', 'lits', 'tags']);
let SPEC = {id:null, tab:'gen', hist:[]};
function specTabs(e){
  const t = [['gen', 'info', 'Genel'], ['props', 'list', 'Özellikler']];
  if(OWN[e.kind] && kidsOf(e.id).some(c => !KIND[c.kind].rel)) t.push(['kids', 'box', 'Bölmeler / içerik']); else if(OWN[e.kind] && OWN[e.kind].length) t.push(['kids', 'box', 'Bölmeler / içerik']);
  if(!KIND[e.kind].rel) t.push(['rels', 'link', 'İlişkiler']);
  if((e.st || []).length || Object.values(M.els).some(x => x.kind === 'Stereotype')) t.push(['tags', 'tag', 'Stereotip ve etiketler']);
  t.push(['used', 'compass', 'Kullanıldığı yerler'], ['notes', 'note', 'Notlar']);
  return t;
}
function specFieldInput(e, k){
  const v = e[k] == null ? '' : e[k], en = SPEC_ENUM()[k];
  if(en) return `<select data-spf="${k}"><option value="">—</option>${en.concat(v && !en.includes(v) ? [v] : []).map(x => `<option${String(v) === String(x) ? ' selected' : ''}>${esc(x)}</option>`).join('')}</select>`;
  if(SPEC_REF[k]){ const L = Object.values(M.els).filter(x => SPEC_REF[k].includes(x.kind)).sort(sortEls); return `<select data-spf="${k}" class="noi18n"><option value="">(yok)</option>${L.map(x => `<option value="${x.id}"${x.id === v ? ' selected' : ''}>${esc(rowLabel(x))}</option>`).join('')}</select>`; }
  if(/^(pStart|pEnd|rDate|due|date|cal)$/.test(k)) return `<input type="date" data-spf="${k}" value="${esc(v)}">`;
  if(typeof v === 'boolean') return `<input type="checkbox" data-spf="${k}"${v ? ' checked' : ''}>`;
  if(typeof v === 'object') return `<span class="muted">${esc(JSON.stringify(v).slice(0, 80))}</span>`;
  return SPEC_LONG.has(k) || String(v).length > 60 ? `<textarea data-spf="${k}" rows="3">${esc(v)}</textarea>` : `<input data-spf="${k}" value="${esc(v)}">`;
}
function specBody(e){
  const T = SPEC.tab, row = (l, c) => `<div class="spr"><label>${l}</label><div>${c}</div></div>`;
  if(T === 'gen'){
    let h = row('Ad', `<input data-spf="name" value="${esc(e.name || '')}">`) + row('Tür', esc(KIND[e.kind].tr) + (e.kind === 'Diagram' ? ' · ' + esc(DT[e.dtype].tr) : '')) + row('Sahip', `<a class="lnk noi18n" data-spgo="${e.owner || ''}">${esc(pathOf(e.owner) || '—')}</a>`);
    if(KIND[e.kind].rel) h += row('Kaynak', `<a class="lnk noi18n" data-spgo="${e.src}">${esc(rowLabel(E(e.src) || {}))}</a>`) + row('Hedef', `<a class="lnk noi18n" data-spgo="${e.tgt}">${esc(rowLabel(E(e.tgt) || {}))}</a>`);
    h += row('Açıklama', `<textarea data-spf="doc" rows="5">${esc(e.doc || '')}</textarea>`) + row('Kimlik', `<code class="noi18n">${esc(e.id)}</code>`);
    if(typeof modOf === 'function' && modOf(e.id)) h += `<div class="robar">🔒 Salt okunur modül elemanı — değişiklikler geri alınır.</div>`;
    return h;
  }
  if(T === 'props'){
    const keys = Object.keys(e).filter(k => !SPEC_SKIP.has(k) && !k.startsWith('_'));
    const extra = {Requirement:['reqId', 'text', 'status', 'level', 'subsys', 'verif'], TestCase:['procNo', 'tMethod', 'tLevel', 'testItem', 'std', 'resp', 'pStart', 'pEnd', 'result', 'rDate', 'reportNo'], Part:['type', 'mult'], Value:['vtype', 'unit', 'def'], Port:['type', 'dir', 'mult'], FlowProp:['type', 'dir'], Action:['behavior']}[e.kind] || [];
    extra.forEach(k => { if(!keys.includes(k)) keys.push(k); });
    if(!keys.length) return '<div class="muted">Bu elemanın ek özelliği yok.</div>';
    return keys.sort((a, b) => (extra.indexOf(a) < 0 ? 99 : extra.indexOf(a)) - (extra.indexOf(b) < 0 ? 99 : extra.indexOf(b))).map(k => row(esc(SPEC_LBL[k] || k), specFieldInput(e, k))).join('') + (e.kind === 'Requirement' && e.attrs && Object.keys(e.attrs).length ? Object.keys(e.attrs).map(k => row(esc(((reqCfg().attrs || []).find(a => a.key === k) || {}).label || k), `<input data-spa="${esc(k)}" value="${esc(e.attrs[k] || '')}">`)).join('') : '');
  }
  if(T === 'kids'){
    const ch = kidsOf(e.id).filter(c => !KIND[c.kind].rel).sort(sortEls), groups = new Map();
    ch.forEach(c => { if(!groups.has(c.kind)) groups.set(c.kind, []); groups.get(c.kind).push(c); });
    let h = '';
    groups.forEach((L, k) => { h += `<div class="sub"><span>${esc(KIND[k].tr)} (${L.length})</span></div>` + L.map(c => `<div class="spk2"><span>${icon(c)}</span><input data-spk="${c.id}" value="${esc(c.name || '')}" class="noi18n"><span class="muted noi18n">${esc(c.kind === 'Part' || c.kind === 'Port' || c.kind === 'Value' ? treeName(c).replace(c.name || '', '') : '')}</span><button class="tdel" data-spgo="${c.id}" title="Spesifikasyonu aç">${uiIc('right', 12)}</button><button class="tdel" data-spdel="${c.id}" title="Sil">✕</button></div>`).join(''); });
    if(!h) h = '<div class="muted">İçerik yok.</div>';
    const ok = (OWN[e.kind] || []).filter(k => k !== 'Diagram');
    if(ok.length) h += `<div class="icbar" style="margin-top:10px"><select id="spAddK">${ok.map(k => `<option value="${k}">${esc(KIND[k].tr)}</option>`).join('')}</select><button class="pbtn" data-spadd="1">+ Ekle</button></div>`;
    return h;
  }
  if(T === 'rels'){
    const rs = Object.values(M.els).filter(r => KIND[r.kind] && KIND[r.kind].rel && (r.src === e.id || r.tgt === e.id)).sort((a, b) => a.kind.localeCompare(b.kind));
    let h = rs.length ? `<table class="rt"><thead><tr><th>İlişki</th><th>Yön</th><th>Diğer uç</th><th>Ad</th><th></th></tr></thead><tbody>${rs.map(r => { const out = r.src === e.id, o = E(out ? r.tgt : r.src); return `<tr><td>${esc(KIND[r.kind].tr)}</td><td>${out ? '→ giden' : '← gelen'}</td><td class="noi18n"><a class="lnk" data-spgo="${o ? o.id : ''}">${esc(o ? rowLabel(o) : '?')}</a></td><td><input data-sprn="${r.id}" value="${esc(r.name || '')}" class="noi18n" style="width:120px"></td><td><button class="tdel" data-spdel="${r.id}" title="İlişkiyi sil">✕</button></td></tr>`; }).join('')}</tbody></table>` : '<div class="muted">İlişki yok.</div>';
    const relKinds = Object.keys(KIND).filter(k => KIND[k].rel && !['Anchor', 'Connector', 'Binding', 'Transition', 'ControlFlow', 'ObjectFlow'].includes(k) && !isMsg(k)).sort((a, b) => KIND[a].tr.localeCompare(KIND[b].tr, 'tr'));
    h += `<div class="icbar" style="margin-top:10px">Yeni ilişki <select id="spRk">${relKinds.map(k => `<option value="${k}">${esc(KIND[k].tr)}</option>`).join('')}</select><select id="spRd"><option value="out">bu eleman → hedef</option><option value="in">kaynak → bu eleman</option></select><button class="pbtn" data-sprel="1">Eleman seç…</button></div>`;
    return h;
  }
  if(T === 'tags'){
    const sts = Object.values(M.els).filter(x => x.kind === 'Stereotype').sort(sortEls), mine = (e.st || []).map(E).filter(Boolean);
    let h = `<div class="icbar">${mine.map(s => `<span class="chip2">«${esc(s.name)}» <button class="tdel" data-sprm="${s.id}" title="Kaldır">✕</button></span>`).join('') || '<span class="muted">Stereotip uygulanmamış</span>'}</div>`;
    const av = sts.filter(s => !(e.st || []).includes(s.id)); if(av.length) h += `<div class="icbar"><select id="spSt" class="noi18n">${av.map(s => `<option value="${s.id}">«${esc(s.name)}»</option>`).join('')}</select><button class="pbtn" data-spst="1">+ Uygula</button></div>`;
    mine.forEach(st => { const tg = stTags(st); if(!tg.length) return; h += `<div class="sub"><span>«${esc(st.name)}» etiketleri</span></div>` + tg.map(t => row(esc(t.key) + (t.type ? ` <span class="muted">: ${esc(t.type)}</span>` : ''), `<input data-sptv="${esc(st.id + '.' + t.key)}" value="${esc((e.tv || {})[st.id + '.' + t.key] || '')}" placeholder="${esc(t.def || '')}" class="noi18n">`)).join(''); });
    return h;
  }
  if(T === 'used'){
    const G = whereUsed(e.id); if(!G.length) return '<div class="muted">Bu eleman başka bir yerde kullanılmıyor.</div>';
    return G.map(([t, L]) => `<div class="sub"><span>${esc(t)} (${L.length})</span></div>` + L.slice(0, 80).map(x => x._rel ? `<div class="li noi18n"><span class="muted">${x.out ? '→' : '←'} ${esc(KIND[x._rel.kind].tr)}</span> <a class="lnk" data-spgo="${x.other.id}">${esc(rowLabel(x.other))}</a></div>` : `<div class="li noi18n">${icon(x)} <a class="lnk" data-spgo="${x.id}">${esc(x.kind === 'Diagram' ? x.name : rowLabel(x))}</a>${x.kind === 'Diagram' ? ` <button class="tdel" data-spopen="${x.id}" title="Diyagramı aç">${uiIc('right', 12)}</button>` : ''}</div>`).join('')).join('');
  }
  if(T === 'notes'){
    const L = Array.isArray(e.notes) ? e.notes : [];
    return (L.map(n => `<div class="note${(n.st || 'Açık') === 'Açık' ? '' : ' done'}"><div class="nh noi18n"><b>${esc(n.u || '')}</b> <span class="muted">${n.t ? new Date(n.t).toLocaleString('tr-TR') : ''}</span> · ${esc(n.st || 'Açık')}</div><div class="noi18n">${esc(n.txt || '')}</div></div>`).join('') || '<div class="muted">Not yok.</div>') + `<textarea id="spNote" rows="3" style="width:100%;margin-top:8px" placeholder="Not / inceleme yorumu yazın…"></textarea><div style="text-align:right"><button class="pbtn pri" data-spnote="1">+ Not ekle</button></div>`;
  }
  return '';
}
function openSpec(id, keepTab){
  const e = E(id); if(!e) return;
  if(SPEC.id && SPEC.id !== id && $('#modal').style.display === 'flex' && $('#modalBox').classList.contains('specw')) SPEC.hist.push(SPEC.id);
  SPEC.id = id; if(!keepTab) SPEC.tab = 'gen';
  const box = $('#modalBox'); box.classList.add('specw'); box.style.width = 'min(980px, 96vw)'; box.style.maxWidth = 'none';
  const tabs = specTabs(e); if(!tabs.some(t => t[0] === SPEC.tab)) SPEC.tab = 'gen';
  box.innerHTML = `<div class="spechd"><span>${icon(e)}</span><h2 class="noi18n">${esc(rowLabel(e) || KIND[e.kind].tr)}</h2><span class="muted">${esc(KIND[e.kind].tr)} — Spesifikasyon</span></div>
    <div class="specw2"><div class="spectabs">${tabs.map(([k, ic, t]) => `<button class="${SPEC.tab === k ? 'on' : ''}" data-sptab="${k}">${uiIc(ic, 14)} ${esc(t)}</button>`).join('')}</div><div class="specbody">${specBody(e)}</div></div>
    <p style="display:flex;gap:6px;justify-content:space-between;margin:10px 0 0"><span><button class="pbtn" data-spback="1"${SPEC.hist.length ? '' : ' disabled'}>${uiIc('back', 13)} Geri</button> <button class="pbtn" data-sptree="1">Ağaçta göster</button>${KIND[e.kind].rel || e.kind === 'Diagram' ? '' : ' <button class="pbtn" data-spdia="1">Diyagramda göster</button>'}${e.kind === 'SmartPackage' ? ' <button class="pbtn" data-spsmart="1">Kuralları düzenle…</button>' : ''}</span><button class="pbtn pri" data-spclose="1">Kapat</button></p>`;
  $('#modal').style.display = 'flex';
}
function specClose(){ const box = $('#modalBox'); $('#modal').style.display = 'none'; box.classList.remove('specw'); box.style.width = ''; box.style.maxWidth = ''; SPEC.id = null; SPEC.hist = []; }
const specApply = fn => { const e = E(SPEC.id); if(!e) return; const body = document.querySelector('#modalBox .specbody'), sc = body ? body.scrollTop : 0; snap(); fn(e); afterChange(); openSpec(SPEC.id, true); const b2 = document.querySelector('#modalBox .specbody'); if(b2) b2.scrollTop = sc; };
(function(){
  const box = $('#modalBox');
  box.addEventListener('change', ev => {
    if(!box.classList.contains('specw')) return;
    const t = ev.target;
    if(t.dataset.spf){ const k = t.dataset.spf; let v = t.type === 'checkbox' ? t.checked : t.value; if(k === 'name' && !String(v).trim()) return; return specApply(e => { e[k] = (SPEC_REF[k] && !v) ? null : v; if(k === 'result' && ['Geçti', 'Kaldı', 'Koşullu'].includes(v) && !e.rDate) e.rDate = todayISO(); }); }
    if(t.dataset.spa){ return specApply(e => { e.attrs = e.attrs || {}; e.attrs[t.dataset.spa] = t.value; }); }
    if(t.dataset.spk){ const c = E(t.dataset.spk); if(c && t.value.trim()) return specApply(() => { c.name = t.value.trim(); }); }
    if(t.dataset.sprn){ const r = E(t.dataset.sprn); if(r) return specApply(() => { r.name = t.value; }); }
    if(t.dataset.sptv){ return specApply(e => { e.tv = e.tv || {}; e.tv[t.dataset.sptv] = t.value; }); }
  }, true);
  box.addEventListener('keydown', ev => { if(!box.classList.contains('specw')) return; ev.stopPropagation(); if(ev.key === 'Escape') specClose(); if(ev.key === 'Enter' && ev.target.tagName === 'INPUT'){ ev.preventDefault(); ev.target.blur(); } }, true);
  box.addEventListener('click', ev => {
    if(!box.classList.contains('specw')) return;
    const b = ev.target.closest('[data-sptab],[data-spgo],[data-spdel],[data-spadd],[data-sprel],[data-sprm],[data-spst],[data-spnote],[data-spback],[data-sptree],[data-spdia],[data-spclose],[data-spopen],[data-spsmart]'); if(!b) return;
    ev.stopPropagation();
    const e = E(SPEC.id); if(!e) return specClose();
    if(b.dataset.sptab){ SPEC.tab = b.dataset.sptab; return openSpec(e.id, true); }
    if(b.dataset.spgo){ if(E(b.dataset.spgo)) openSpec(b.dataset.spgo); return; }
    if(b.dataset.spback){ const p = SPEC.hist.pop(); if(p && E(p)){ SPEC.id = null; openSpec(p); } return; }
    if(b.dataset.spclose) return specClose();
    if(b.dataset.sptree){ revealInTree(e.id); ST.tsel = e.id; specClose(); renderTree(); renderProps(); return; }
    if(b.dataset.spdia){ const ds = diagramsShowing(e.id); if(!ds.length) return toast('Bu eleman hiçbir diyagramda gösterilmiyor'); specClose(); openD(ds[0].id); const d = cur(); ST.sel = new Set(d.shapes.filter(s => s.el === e.id).map(s => s.id)); ST.tsel = e.id; renderDiagram(); renderProps(); return; }
    if(b.dataset.spopen){ specClose(); openD(b.dataset.spopen); return; }
    if(b.dataset.spsmart){ specClose(); smartDialog(e.id); return; }
    if(b.dataset.spdel){ const x = E(b.dataset.spdel); if(x && confirm(`"${rowLabel(x) || KIND[x.kind].tr}" silinsin mi?`)) specApply(() => delModel([x.id])); return; }
    if(b.dataset.spadd){ const k = $('#spAddK').value; return specApply(e2 => { const c = mk(k, e2.id); ST.exp.add(e2.id); }); }
    if(b.dataset.sprm){ return specApply(e2 => { e2.st = (e2.st || []).filter(x => x !== b.dataset.sprm); }); }
    if(b.dataset.spst){ const s = $('#spSt').value; return specApply(e2 => { e2.st = (e2.st || []).concat([s]); }); }
    if(b.dataset.spnote){ const tx = $('#spNote').value.trim(); if(!tx) return; return specApply(e2 => { e2.notes = (e2.notes || []).concat([{id:uid(), t:new Date().toISOString(), u:userName(), txt:tx, st:'Açık', re:[]}]); }); }
    if(b.dataset.sprel){
      const k = $('#spRk').value, dir = $('#spRd').value, cands = Object.values(M.els).filter(x => x.id !== e.id && !KIND[x.kind].rel && x.kind !== 'Diagram').sort(sortEls), id0 = e.id;
      const back = () => openSpec(id0, true);
      pickList(`${KIND[k].tr} — ${dir === 'out' ? 'hedef' : 'kaynak'} seç`, cands, [], ids => { snap(); let n = 0; ids.forEach(x => { if(dir === 'out' ? addRel(k, id0, x) : addRel(k, x, id0)) n++; }); afterChange(); toast(`${n} ilişki eklendi`); setTimeout(back, 0); });
      return;
    }
  }, true);
  document.addEventListener('keydown', ev => {
    if(ev.key !== 'Enter' || ev.ctrlKey || ev.altKey || ev.metaKey || ev.shiftKey) return;
    const tag = (ev.target.tagName || '').toLowerCase(); if(tag === 'input' || tag === 'textarea' || tag === 'select' || ev.target.isContentEditable || $('#modal').style.display === 'flex' || (ctx && ctx.style.display === 'block')) return;
    if(isView(ST.cur) && !(ev.target.closest && ev.target.closest('#treeBox'))) return;
    const d = cur(); let id = ST.tsel;
    if(d && d.kind === 'Diagram' && ST.sel.size === 1){ const s = shapeOf(d, [...ST.sel][0]); if(s) id = s.el; else { const ed = d.edges.find(x => ST.sel.has(x.id)); if(ed && ed.el) id = ed.el; } }
    if(id && E(id)){ ev.preventDefault(); openSpec(id); }
  });
})();
/* özellik panelinin üstüne "Spesifikasyon" düğmesi */
HOOKS.props.push(function(){
    const P = $('#props'); if(P.querySelector('[data-openspec]')) return;
    const t = typeof propTarget === 'function' ? propTarget() : {}; const el = t.el; if(!el || !el.id || !E(el.id) || (typeof bulkTargets === 'function' && bulkTargets())) return;
    const pt = P.querySelector('.pt'); if(pt) pt.insertAdjacentHTML('beforeend', `<button class="pbtn spbtn" data-ic="0" data-openspec="${el.id}" title="Spesifikasyon penceresi (Enter)">${uiIc('settings', 13)}</button>`);
  });
/* akıllı paketler: ağaçta sanal içerik ve özellik paneli */
PROPS_EXT.SmartPackage = (el, pf) => { const m = smartMembers(el); return pf('Eleman', String(m.length)) + pf('', `<button class="pbtn" data-spedit="${el.id}">Kuralları düzenle…</button>`) + `<div class="sub"><span>İçerik (${m.length})</span></div>` + m.slice(0, 40).map(x => `<div class="li noi18n">${icon(x)} <a class="lnk" data-goto="${x.id}">${esc(rowLabel(x))}</a></div>`).join(''); };
$('#props').addEventListener('click', ev => { const b = ev.target.closest('[data-spedit]'); if(b) smartDialog(b.dataset.spedit); });
GO_EXT.SmartPackage = e => smartDialog(e.id);
DEMO_EXT.push(X => {
  const pk = findOrMkPkg(M.rootId, 'Görünümler');
  mk('SmartPackage', pk, {name:'Doğrulanmamış sistem gereksinimleri', rule:{kinds:['Requirement'], conds:[{f:'level', op:'eq', v:'Sistem'}, {f:'@verStatus', op:'ne', v:'Doğrulandı'}], any:false, st:'', scope:''}});
  mk('SmartPackage', pk, {name:'Testi olmayan gereksinimler', rule:{kinds:['Requirement'], conds:[{t:'rel', rk:'Verify', dir:'in', has:false}], any:false, st:'', scope:''}});
  mk('SmartPackage', pk, {name:'LRU blokları', rule:{kinds:['Block'], conds:[], any:false, st:(Object.values(M.els).find(e => e.kind === 'Stereotype' && e.name === 'LRU') || {}).id || '', scope:''}});
});

