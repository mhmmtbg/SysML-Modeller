/* ================= v1.29: METACHAIN (DOLAYLI İLİŞKİ ZİNCİRLERİ) — GENEL TABLO SÜTUNLARI VE MATRİS ================= */
const MC_STEPS = [
  ['rel:Satisfy:out', 'Karşıladığı gereksinim (Satisfy →)'], ['rel:Satisfy:in', 'Karşılayan eleman (← Satisfy)'],
  ['rel:Verify:out', 'Doğruladığı gereksinim (Verify →)'], ['rel:Verify:in', 'Doğrulayan test (← Verify)'],
  ['rel:DeriveReqt:out', 'Türetildiği üst gereksinim (Derive →)'], ['rel:DeriveReqt:in', 'Türetilen alt gereksinim (← Derive)'],
  ['rel:Refine:out', 'İyileştirdiği (Refine →)'], ['rel:Refine:in', 'İyileştiren (← Refine)'],
  ['rel:Trace:out', 'İzlediği (Trace →)'], ['rel:Trace:in', 'İzleyen (← Trace)'],
  ['rel:Allocate:out', 'Tahsis edildiği yapı (Allocate →)'], ['rel:Allocate:in', 'Tahsis edilen fonksiyon (← Allocate)'],
  ['rel:Generalization:out', 'Genel tip (Generalization →)'], ['rel:Generalization:in', 'Özelleşen tipler (← Generalization)'],
  ['rel:Connector:any', 'Bağlı elemanlar (connector)'], ['rel:*:any', 'Herhangi bir ilişki (iki yön)'],
  ['parts', 'Part tipleri (kompozisyon ↓)'], ['partOf', 'Kullanıldığı bloklar (kompozisyon ↑)'],
  ['type', 'Tipi'], ['tos', 'Tipi (yoksa kendisi)'], ['usage', 'Kendisi + bu tipteki kullanımlar'],
  ['owner', 'Sahibi'], ['owned', 'Sahip olduğu elemanlar']
];
const MC_KINDS = ['Requirement', 'Block', 'InterfaceBlock', 'Part', 'Port', 'Value', 'Activity', 'Action', 'UseCase', 'Actor', 'TestCase', 'State', 'StateMachine', 'Signal', 'ConstraintBlock', 'Instance', 'Package'];
const MC_PRESETS = [
  {name:'Karşılayan bloklar', from:'Requirement', steps:[{s:'rel:Satisfy:in'}, {s:'tos'}], kind:'Block', show:'names'},
  {name:'Alt gereksinimleri karşılayan bloklar', from:'Requirement', steps:[{s:'rel:DeriveReqt:in', rep:true}, {s:'rel:Satisfy:in'}, {s:'tos'}], kind:'Block', show:'names'},
  {name:'Doğrulayan test sonuçları', from:'Requirement', steps:[{s:'rel:Verify:in'}], kind:'TestCase', show:'attr:result'},
  {name:'Tahsis edilen fonksiyonlar', from:'Block', steps:[{s:'usage'}, {s:'rel:Allocate:in'}], kind:'', show:'names'},
  {name:'Karşıladığı gereksinimler (part kullanımları dahil)', from:'Block', steps:[{s:'usage'}, {s:'rel:Satisfy:out'}], kind:'Requirement', show:'names'},
  {name:'Alt yapıdaki tüm bloklar', from:'Block', steps:[{s:'parts', rep:true}], kind:'Block', show:'count'},
  {name:'Fonksiyon → yapı → gereksinim', from:'Activity', steps:[{s:'rel:Allocate:out'}, {s:'usage'}, {s:'rel:Satisfy:out'}], kind:'Requirement', show:'names'},
  {name:'Test → gereksinim → karşılayan blok', from:'TestCase', steps:[{s:'rel:Verify:out'}, {s:'rel:Satisfy:in'}, {s:'tos'}], kind:'Block', show:'names'}
];
const mcChains = () => (M.mchains = M.mchains || []);
const mcStepLabel = s => tr((MC_STEPS.find(x => x[0] === s.s) || [0, s.s])[1]) + (s.rep ? ' ' + tr('(kendisi + tüm seviyeler)') : '');
const mcDesc = c => (c.steps || []).map(mcStepLabel).join(' ▸ ') + (c.kind ? ' ▸ [' + (KIND[c.kind] ? tr(KIND[c.kind].tr) : c.kind) + ']' : '');
/* tek adım komşuları (ilişki dizini önbelleğiyle) */
let MC_IDX = null, MC_IDXK = '';
function mcIndex(){
  const key = MCHG + ':' + Object.keys(M.els).length;
  if(MC_IDX && MC_IDXK === key && MC_IDX.M === M) return MC_IDX;
  const out = new Map(), inn = new Map(), typed = new Map(), partsOf = new Map(), usedIn = new Map();
  const push = (m, k, v) => { let a = m.get(k); if(!a) m.set(k, a = []); a.push(v); };
  Object.values(M.els).forEach(e => {
    if(e.src && e.tgt && KIND[e.kind] && KIND[e.kind].rel){ push(out, e.src, e); push(inn, e.tgt, e); }
    if(e.type && E(e.type)) push(typed, e.type, e);
    if(e.kind === 'Part' && e.type && E(e.type) && E(e.owner)){ push(partsOf, e.owner, e.type); push(usedIn, e.type, e.owner); }
  });
  MC_IDX = {M, out, inn, typed, partsOf, usedIn}; MC_IDXK = key; return MC_IDX;
}
function mcNext(id, s, X){
  const e = E(id); if(!e) return [];
  const p = s.split(':');
  if(p[0] === 'rel'){
    const k = p[1], d = p[2], r = [];
    if(d !== 'in') (X.out.get(id) || []).forEach(x => { if((k === '*' || x.kind === k) && E(x.tgt)) r.push(x.tgt); });
    if(d !== 'out') (X.inn.get(id) || []).forEach(x => { if((k === '*' || x.kind === k) && E(x.src)) r.push(x.src); });
    if(k === 'Connector') return r.map(t => { const te = E(t); return te && te.kind === 'Port' && E(te.owner) && E(te.owner).kind === 'Part' ? te.owner : t; });
    return r;
  }
  if(s === 'type') return e.type && E(e.type) ? [e.type] : [];
  if(s === 'tos') return [e.type && E(e.type) ? e.type : id];
  if(s === 'usage') return [id].concat((X.typed.get(id) || []).filter(u => u.kind === 'Part' || u.kind === 'Port' || u.kind === 'Instance').map(u => u.id));
  if(s === 'parts') return (X.partsOf.get(id) || []).slice();
  if(s === 'partOf') return (X.usedIn.get(id) || []).slice();
  if(s === 'owner') return e.owner && E(e.owner) ? [e.owner] : [];
  if(s === 'owned') return kidsOf(id).filter(k => KIND[k.kind] && !KIND[k.kind].rel && k.kind !== 'Diagram').map(k => k.id);
  return [];
}
/* zincir: başlangıçtan ulaşılan elemanlar → ilk bulunan yol */
function mcReach(startId, c){
  const X = mcIndex();
  let cur = new Map([[startId, [startId]]]);
  for(const st of (c.steps || [])){
    const nxt = new Map();
    if(st.rep){
      const q = [...cur.entries()], seen = new Set(cur.keys()); cur.forEach((p, id) => nxt.set(id, p));
      while(q.length && seen.size < 5000){ const [id, path] = q.shift(); mcNext(id, st.s, X).forEach(t => { if(!seen.has(t)){ seen.add(t); const p2 = path.concat([t]); nxt.set(t, p2); q.push([t, p2]); } }); }
    } else cur.forEach((path, id) => mcNext(id, st.s, X).forEach(t => { if(!nxt.has(t)) nxt.set(t, path.concat([t])); }));
    cur = nxt; if(!cur.size) break;
  }
  if(c.kind) [...cur.keys()].forEach(k => { const e = E(k); if(!e || e.kind !== c.kind) cur.delete(k); });
  if((c.steps || []).length) cur.delete(startId);
  return cur;
}
const mcLabel = e => !e ? '?' : e.kind === 'Requirement' ? ((e.reqId || '') + ' ' + (e.name || '')).trim() : e.kind === 'Part' || e.kind === 'Port' ? (E(e.owner) ? E(e.owner).name + '.' : '') + (e.name || '') : (e.name || '');
const mcPath = p => p.map(id => mcLabel(E(id))).join(' → ');
function mcAttrVal(e, a){
  if(a === 'result' && e.kind === 'TestCase') return testResult(e);
  if(a === 'status' && e.kind === 'Requirement') return reqStatus(e);
  if(a === '@verStatus' && e.kind === 'Requirement') return verStatus(e);
  if(e[a] != null && typeof e[a] !== 'object') return String(e[a]);
  const v = kidsOf(e.id).find(k => k.kind === 'Value' && k.name === a); if(v) return v.res != null ? String(v.res) : String(v.def == null ? '' : v.def);
  return '';
}
function mcValue(e, c){
  const R = mcReach(e.id, c), els = [...R.keys()].map(E).filter(Boolean).sort(sortEls), sh = c.show || 'names';
  if(sh === 'count') return String(els.length);
  if(sh.startsWith('sum:')){ const a = sh.slice(4); let s = 0, any = false; els.forEach(x => { const n = numOf(mcAttrVal(x, a)); if(n != null){ s += n; any = true; } }); return any ? fmtNum(s) : ''; }
  if(sh.startsWith('attr:')){ const a = sh.slice(5); return els.map(x => mcLabel(x) + (mcAttrVal(x, a) ? ' = ' + mcAttrVal(x, a) : '')).join(', '); }
  return els.map(mcLabel).join(', ');
}
/* ---------- genel tabloya metachain sütunları ---------- */
{
  const _gc = gtCols;
  gtCols = function(kind){ const c = _gc(kind), d = c.findIndex(x => x[0] === 'doc'); const mc = mcChains().filter(x => x.from === kind).map(x => ['mc:' + x.id, '⛓ ' + (x.name || 'Metachain'), 0]); c.splice(d < 0 ? c.length : d, 0, ...mc); return c; };
  const _gv = gtVal;
  gtVal = function(e, k){ if(k.startsWith('mc:')){ const ch = mcChains().find(x => x.id === k.slice(3)); return ch ? mcValue(e, ch) : ''; } return _gv(e, k); };
  const _gh = gtHTML;
  gtHTML = function(){ let h = _gh(); mcChains().filter(x => x.from === GT.kind).forEach(x => { h = h.replace(`<th>${esc('⛓ ' + (x.name || 'Metachain'))}</th>`, `<th class="mcth" title="${esc(mcDesc(x))}">⛓ <span class="noi18n">${esc(x.name || 'Metachain')}</span> <a class="lnk" data-mce="${x.id}" title="Zinciri düzenle">✎</a></th>`); }); return h; };
  const _gb = gtBar;
  gtBar = function(){ const n = mcChains().filter(x => x.from === GT.kind).length; return _gb() + `<button class="vb" data-mcadd="table" title="Dolaylı ilişki zinciriyle hesaplanan sütun ekle">⛓ Metachain sütunu${n ? ' (' + n + ')' : ''}…</button>`; };
  VIEWS['@table'].render = gtHTML; VIEWS['@table'].bar = gtBar;
}
/* ---------- matriste dolaylı (metachain) hücreler ---------- */
{
  const _mh = matrixHTML;
  matrixHTML = function(){
    const ch = MX.ch && mcChains().find(x => x.id === MX.ch);
    if(!ch) return _mh();
    const rows0 = mset(MX.rows), cols = mset(MX.cols).filter(c => !rows0.includes(c) || MX.rows !== MX.cols);
    if(!rows0.length || !cols.length) return _mh();
    const rel = new Set(Object.values(M.els).filter(e => e.src && e.tgt && KIND[e.kind].rel).map(e => e.kind + '|' + e.src + '|' + e.tgt));
    const has = (r, c) => { const m = mxRel(r, c); return m && rel.has(m.join('|')); };
    const reach = new Map(rows0.map(r => [r.id, mcReach(r.id, Object.assign({}, ch, {kind:''}))]));
    const ind = (r, c) => reach.get(r.id).get(c.id);
    const cnt = (r, c) => has(r, c) || !!ind(r, c);
    const rowCnt = new Map(rows0.map(r => [r.id, cols.reduce((n, c) => n + (cnt(r, c) ? 1 : 0), 0)]));
    const rows = MX.empty ? rows0.filter(r => !rowCnt.get(r.id)) : rows0;
    const colCnt = cols.map(c => rows0.reduce((n, r) => n + (cnt(r, c) ? 1 : 0), 0));
    const lab = e => e.kind === 'Requirement' ? (e.reqId || '') + ' ' + (e.name || '') : elDesc(e);
    let nInd = 0;
    const P = mxPage(rows, cols);
    let h = P.pager + `<div class="mcnote">⛓ <b>Metachain:</b> <span class="noi18n">${esc(ch.name || '')}</span> — <span class="muted">${esc(mcDesc(ch))}</span> · <span class="mcleg on">↗</span> doğrudan ilişki, <span class="mcleg ind">◆</span> zincirle dolaylı</div><table class="mx"><thead><tr><th class="mxc"></th>`;
    P.cols.forEach((c, j) => { h += `<th class="mxh${colCnt[P.c0 + j] ? '' : ' zero'}" title="${esc(lab(c))}"><div><span>${esc(lab(c).slice(0, 42))}</span></div></th>`; });
    h += `<th class="mxh tot"><div><span>Toplam</span></div></th></tr></thead><tbody>`;
    P.rows.forEach(r => {
      const n = rowCnt.get(r.id);
      h += `<tr><th class="mxr${n ? '' : ' zero'}"><a class="lnk" data-goto="${r.id}">${esc(lab(r).slice(0, 60))}</a></th>`;
      P.cols.forEach(c => { const m = mxRel(r, c), d = has(r, c), p = ind(r, c); if(p && !d) nInd++; const t = (m ? KIND[m[0]].tr : '') + (p ? (m ? '\n' : '') + mcPath(p) : ''); h += `<td class="mxd${d ? ' on' : ''}${p && !d ? ' ind' : ''}${!m && !p ? ' na' : ''}"${m ? ` data-mx="${r.id}|${c.id}"` : ''} title="${esc(t)}">${d ? '↗' : p ? '◆' : ''}</td>`; });
      h += `<td class="mxt">${n}</td></tr>`;
    });
    h += `<tr><th class="mxr tot">Toplam</th>${colCnt.slice(P.c0, P.c0 + P.cols.length).map(n => `<td class="mxt${n ? '' : ' zero'}">${n}</td>`).join('')}<td></td></tr></tbody></table>`;
    const zr = rows0.filter(r => !rowCnt.get(r.id)).length;
    return h + `<div class="vfoot">${rows0.length} × ${cols.length} · Dolaylı hücre: <b>${nInd}</b> · Kapsanmayan satır: <b class="${zr ? 'bad' : ''}">${zr}</b> · ◆ hücrenin üzerine gelince yol görünür; ↗ hücreleri tıklayarak ilişki kurulur/kaldırılır.</div>`;
  };
  const _rvb = renderViewBar;
  renderViewBar = function(){
    _rvb();
    if(ST.cur !== '@matrix') return;
    const bar = $('#view .vbar'); if(!bar || bar.querySelector('[data-mch]')) return;
    const opts = [['', '— yok (yalnız doğrudan) —']].concat(mcChains().map(c => [c.id, (c.name || '') + ' (' + (KIND[c.from] ? KIND[c.from].tr : c.from) + ')']));
    bar.insertAdjacentHTML('beforeend', `<span class="vsep"></span><label>⛓ Dolaylı <select data-mch="1">${opts.map(o => `<option value="${o[0]}"${(MX.ch || '') === o[0] ? ' selected' : ''}>${esc(o[1])}</option>`).join('')}</select></label><button class="vb" data-mcadd="matrix" title="Yeni metachain tanımla">⛓ Yeni…</button>`);
  };
}
/* ---------- metachain düzenleyici ---------- */
function mcDialog(ch, ctx){
  const isNew = !ch;
  const W = isNew ? {id:uid(), name:'', from:ctx === 'table' ? GT.kind : (mset(MX.rows)[0] || {}).kind || 'Requirement', steps:[{s:'rel:Satisfy:in'}], kind:'', show:'names'} : JSON.parse(JSON.stringify(ch));
  const box = $('#modalBox'); box.style.width = 'min(760px, 96vw)'; box.style.maxWidth = 'none';
  const kopts = (v, all) => (all ? [['', '(tümü)']] : []).concat((all ? MC_KINDS : GT_KINDS.concat(MC_KINDS.filter(k => !GT_KINDS.includes(k)))).filter(k => KIND[k]).map(k => [k, KIND[k].tr])).map(([k, t]) => `<option value="${k}"${v === k ? ' selected' : ''}>${esc(t)}</option>`).join('');
  const draw = () => {
    const samp = Object.values(M.els).filter(e => e.kind === W.from).sort(sortEls).slice(0, 6);
    box.innerHTML = `<h2>${isNew ? 'Yeni metachain' : 'Metachain düzenle'}</h2><p class="muted" style="margin:-4px 0 8px;font-size:12px">Bir elemandan başlayıp ilişki adımlarını izleyerek dolaylı bağlı elemanları bulur. Genel tabloda sütun, izlenebilirlik matrisinde ◆ dolaylı hücre olarak kullanılır.</p>
      <div class="qf"><label>Hazır şablon<select id="mcPre"><option value="">—</option>${MC_PRESETS.map((p, i) => `<option value="${i}">${esc(p.name)} (${esc(KIND[p.from].tr)})</option>`).join('')}</select></label>
      <label>Ad<input id="mcN" value="${esc(W.name)}" placeholder="ör. Karşılayan bloklar"></label>
      <label>Başlangıç türü<select id="mcF">${kopts(W.from)}</select></label></div>
      <div class="sub"><span>Adımlar</span></div><div id="mcS">${W.steps.map((s, i) => `<div class="li mcstep"><b>${i + 1}.</b> <select data-mcs="${i}">${MC_STEPS.map(([k, t]) => `<option value="${k}"${s.s === k ? ' selected' : ''}>${esc(t)}</option>`).join('')}</select> <label class="vchk"><input type="checkbox" data-mcr="${i}"${s.rep ? ' checked' : ''}> kendisi + tüm seviyeler</label> <button class="vb" data-mcx="${i}" title="Adımı sil">✕</button></div>`).join('')}</div>
      <button class="vb" id="mcAdd">+ Adım</button>
      <div class="qf"><label>Sonuç türü süzgeci<select id="mcK">${kopts(W.kind, true)}</select></label>
      <label>Gösterim<select id="mcSh">${[['names', 'Ad listesi'], ['count', 'Sayı'], ['attr:result', 'Ad = test sonucu'], ['attr:status', 'Ad = durum'], ['attr:@verStatus', 'Ad = doğrulama durumu']].concat(budgetProps().map(p => ['sum:' + p, 'Σ ' + p])).map(([k, t]) => `<option value="${k}"${W.show === k ? ' selected' : ''}>${esc(t)}</option>`).join('')}</select></label></div>
      <div class="sub"><span>Önizleme</span></div><table class="rt fmt"><tbody>${samp.map(e => `<tr><td class="noi18n">${esc(mcLabel(e))}</td><td class="noi18n">${esc(mcValue(e, W)) || '<span class="muted">—</span>'}</td></tr>`).join('') || '<tr><td class="muted">Bu türde eleman yok</td></tr>'}</tbody></table>
      <p style="text-align:right;margin:12px 0 0">${isNew ? '' : '<button class="pbtn" id="mcDel" style="float:left">Sil</button>'}<button class="pbtn" id="mcC">Vazgeç</button> <button class="pbtn pri" id="mcO">${isNew ? 'Ekle' : 'Kaydet'}</button></p>`;
  };
  const close = () => { $('#modal').style.display = 'none'; box.style.width = ''; box.style.maxWidth = ''; box.onclick = null; box.onchange = null; box.onkeydown = null; };
  const read = () => { W.name = $('#mcN').value.trim(); };
  draw(); $('#modal').style.display = 'flex';
  box.onkeydown = ev => { ev.stopPropagation(); if(ev.key === 'Escape') close(); };
  box.onchange = ev => {
    const t = ev.target; read();
    if(t.id === 'mcPre' && t.value !== ''){ const p = MC_PRESETS[+t.value]; Object.assign(W, JSON.parse(JSON.stringify(p))); }
    if(t.id === 'mcF') W.from = t.value;
    if(t.id === 'mcK') W.kind = t.value;
    if(t.id === 'mcSh') W.show = t.value;
    if(t.dataset.mcs) W.steps[+t.dataset.mcs].s = t.value;
    if(t.dataset.mcr) W.steps[+t.dataset.mcr].rep = t.checked;
    draw();
  };
  box.onclick = ev => {
    const t = ev.target;
    if(t.id === 'mcC') return close();
    if(t.id === 'mcAdd'){ read(); W.steps.push({s:'tos'}); return draw(); }
    if(t.dataset && t.dataset.mcx){ read(); W.steps.splice(+t.dataset.mcx, 1); return draw(); }
    if(t.id === 'mcDel'){ snap(); M.mchains = mcChains().filter(x => x.id !== W.id); if(MX.ch === W.id) MX.ch = ''; afterChange(); close(); renderViewBar(); renderView(); return; }
    if(t.id === 'mcO'){
      read(); if(!W.steps.length) return toast('En az bir adım gerekli');
      if(!W.name) W.name = (MC_PRESETS.find(p => JSON.stringify(p.steps) === JSON.stringify(W.steps)) || {}).name || 'Metachain';
      snap(); const L = mcChains(), i = L.findIndex(x => x.id === W.id); if(i < 0) L.push(W); else L[i] = W;
      if(ctx === 'matrix') MX.ch = W.id; if(ctx === 'table') GT.kind = W.from;
      afterChange(); close(); const vb = $('#view .vbar'); if(vb) vb.innerHTML = ''; renderViewBar(); renderView(); toast('Metachain kaydedildi');
    }
  };
}
(() => {
  const V = $('#view');
  V.addEventListener('click', ev => {
    const a = ev.target.closest('[data-mcadd]'); if(a){ mcDialog(null, a.dataset.mcadd); return; }
    const e = ev.target.closest('[data-mce]'); if(e){ ev.stopPropagation(); const ch = mcChains().find(x => x.id === e.dataset.mce); if(ch) mcDialog(ch, 'table'); }
  });
  V.addEventListener('change', ev => { const t = ev.target; if(t.dataset && t.dataset.mch){ MX.ch = t.value; renderView(); } });
})();
const mcCss = document.createElement('style');
mcCss.textContent = `.mx td.ind{background:rgba(142,68,173,.12);color:#8e44ad;text-align:center}.mcnote{margin:6px 10px;font-size:12px}.mcleg{display:inline-block;min-width:16px;text-align:center;border:1px solid var(--line,#ddd);padding:0 3px}.mcleg.ind{color:#8e44ad;background:rgba(142,68,173,.12)}.mcth .lnk{font-weight:400}.mcstep{display:flex;gap:6px;align-items:center}.mcstep select{flex:1}`;
document.head.appendChild(mcCss);
/* örnek model: iki hazır zincir */
DEMO_EXT.push(X => {
  M.mchains = mcChains();
  const add = i => { const p = JSON.parse(JSON.stringify(MC_PRESETS[i])); p.id = uid(); M.mchains.push(p); return p; };
  add(1); add(3);
});

