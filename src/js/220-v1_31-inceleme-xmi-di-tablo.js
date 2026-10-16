/* ================= v1.31: ETKİLEŞİMLİ İNCELEME PAKETİ (HTML), KOORDİNATLI XMI, GENEL TABLO İÇE AKTARMA ================= */
/* ---------- XMI diyagram yerleşimi (UML DI) ---------- */
const UMLDI_NS = 'http://www.omg.org/spec/UML/20131001/UMLDI', DC_NS = 'http://www.omg.org/spec/DD/20131001/DC';
function xmiDI(xid, X){
  const ds = Object.values(M.els).filter(e => e.kind === 'Diagram' && !isView(e.id)).sort(sortEls);
  return ds.map(d => {
    try { diagramSVG(d, true); } catch(e){ appErr('220:7', e); }
    const sh = d.shapes.filter(s => E(s.el)).map(s => `<ownedElement xmi:type="umldi:UMLShape" xmi:id="${xid(d.id)}_${xid(s.id)}" modelElement="${xid(s.el)}"${s.parent ? ` smParent="${xid(d.id)}_${xid(s.parent)}"` : ''}><bounds xmi:type="dc:Bounds" x="${Math.round(s.x)}" y="${Math.round(s.y)}" width="${Math.round(s.w)}" height="${Math.round(s.h)}"/></ownedElement>`).join('');
    const ids = new Set(d.shapes.map(s => s.id));
    const ed = d.edges.filter(e => ids.has(e.s) && ids.has(e.t)).map(e => `<ownedElement xmi:type="umldi:UMLEdge" xmi:id="${xid(d.id)}_${xid(e.id)}"${e.el && E(e.el) ? ` modelElement="${xid(e.el)}"` : ''} smKind="${X(edgeKind(e))}" source="${xid(d.id)}_${xid(e.s)}" target="${xid(d.id)}_${xid(e.t)}"${e.y != null ? ` smY="${Math.round(e.y)}"` : ''}>${(e._pts || []).map(p => `<waypoint xmi:type="dc:Point" x="${Math.round(p.x)}" y="${Math.round(p.y)}"/>`).join('')}</ownedElement>`).join('');
    return `<umldi:UMLDiagram xmi:id="${xid(d.id)}" name="${X(d.name || '')}" modelElement="${xid(d.owner)}" smDtype="${X(d.dtype)}">${sh}${ed}</umldi:UMLDiagram>`;
  }).join('\n');
}
function xmiImportDI(doc, R, topId, idOf){
  const dias = [...doc.getElementsByTagName('*')].filter(n => n.localName === 'UMLDiagram' || (n.localName === 'Diagram' && /umldi/i.test(n.namespaceURI || '')));
  let n = 0;
  dias.forEach(dn => {
    const dt = dn.getAttribute('smDtype') || 'bdd'; if(!DT[dt]) return;
    const owner = R(dn.getAttribute('modelElement')) || topId;
    const d = mk('Diagram', E(owner) ? owner : topId, {name:dn.getAttribute('name') || 'Diyagram', dtype:dt, shapes:[], edges:[], vx:60, vy:70, z:1});
    const smap = new Map(), kids = [...dn.getElementsByTagName('*')].filter(x => x.parentNode === dn);
    kids.filter(x => /UMLShape|Shape/.test(x.getAttribute('xmi:type') || x.localName)).forEach(sx => {
      const el = R(sx.getAttribute('modelElement')); if(!el || !E(el)) return;
      const b = [...sx.children].find(c => c.localName === 'bounds'); if(!b) return;
      const s = {id:uid(), el, x:+b.getAttribute('x') || 0, y:+b.getAttribute('y') || 0, w:+b.getAttribute('width') || 120, h:+b.getAttribute('height') || 60};
      smap.set(idOf(sx), s); s._p = sx.getAttribute('smParent'); d.shapes.push(s);
    });
    d.shapes.forEach(s => { if(s._p && smap.has(s._p)) s.parent = smap.get(s._p).id; delete s._p; });
    kids.filter(x => /UMLEdge|Edge/.test(x.getAttribute('xmi:type') || x.localName)).forEach(ex => {
      const a = smap.get(ex.getAttribute('source')), b = smap.get(ex.getAttribute('target')); if(!a || !b) return;
      const sk = ex.getAttribute('smKind') || '';
      let el = ex.getAttribute('modelElement') ? R(ex.getAttribute('modelElement')) : null;
      if(el && E(el) && !(KIND[E(el).kind] && KIND[E(el).kind].rel)) el = null;
      if(!el && sk && KIND[sk] && KIND[sk].rel){ const ea = E(a.el), eb = E(b.el), cand = Object.values(M.els).filter(r => r.kind === sk && ((r.src === a.el && r.tgt === b.el) || (r.src === b.el && r.tgt === a.el) || (ea && eb && ea.type && eb.type && ((r.src === ea.type && r.tgt === eb.type) || (r.src === eb.type && r.tgt === ea.type))))); const used = new Set(d.edges.map(x => x.el)); el = (cand.find(r => !used.has(r.id)) || {}).id || null; }
      if(!el && sk && KIND[sk] && KIND[sk].rel && sk !== 'Anchor'){ const ea = E(a.el), eb = E(b.el); if(!ea || !eb) return; const r = mk(sk, nearestPkg(d.owner), {src:a.el, tgt:b.el}); el = r.id; }
      const ed = {id:uid(), s:a.id, t:b.id}; if(el){ ed.el = el; const r = E(el); if(r.src !== a.el && r.src === b.el){ ed.s = b.id; ed.t = a.id; } } else ed.kind = sk || 'Anchor';
      if(ex.getAttribute('smY') != null) ed.y = +ex.getAttribute('smY');
      d.edges.push(ed);
    });
    if(d.shapes.length) n++; else delete M.els[d.id];
  });
  return n;
}
/* ---------- etkileşimli inceleme paketi (tek HTML) ---------- */
function reviewData(){
  const ds = Object.values(M.els).filter(e => e.kind === 'Diagram').sort((a, b) => pathOf(a.id).localeCompare(pathOf(b.id), 'tr'));
  const dias = [];
  ds.forEach(d => { const r = diagramSVGStr(d); if(!r) return; const m = r.str.match(/viewBox="([-\d.]+) ([-\d.]+) ([\d.]+) ([\d.]+)"/); dias.push({id:d.id, n:d.name || '', t:d.dtype, p:pathOf(d.owner), svg:r.str, vb:m ? m.slice(1).map(Number) : [0, 0, r.w, r.h], sh:d.shapes.filter(s => E(s.el)).map(s => [s.el, Math.round(s.x), Math.round(s.y), Math.round(s.w), Math.round(s.h)])}); });
  const els = {};
  const attrs = e => { const a = []; const P = (l, v) => { if(v != null && v !== '') a.push([l, String(v)]); };
    if(e.kind === 'Requirement'){ P('ID', e.reqId); P('Metin', e.text); P('Seviye', reqLevel(e)); P('Durum', reqStatus(e)); P('Doğrulama', e.verif); P('Doğrulama durumu', verStatus(e)); }
    if(e.kind === 'TestCase'){ P('Prosedür', e.procNo); P('Sonuç', testResult(e)); }
    if(e.type && E(e.type)) P('Tip', E(e.type).name); if(e.vtype) P('Değer tipi', e.vtype); if(e.def != null) P('Varsayılan', e.def); if(e.unit) P('Birim', e.unit); if(e.mult) P('Çokluk', e.mult); if(e.dir) P('Yön', e.dir);
    const st = stNames(e); if(st.length) P('Stereotip', st.join(', '));
    kidsOf(e.id).filter(k => k.kind === 'Value').forEach(v => P(v.name, (v.def == null ? '' : v.def) + (unitOf(v) ? ' ' + unitOf(v) : '')));
    return a; };
  Object.values(M.els).forEach(e => { if(e.kind === 'Diagram' || (KIND[e.kind] && KIND[e.kind].rel)) return; els[e.id] = {n:e.kind === 'Requirement' ? ((e.reqId || '') + ' ' + (e.name || '')).trim() : (e.name || ''), k:KIND[e.kind] ? KIND[e.kind].tr : e.kind, o:pathOf(e.owner), d:e.doc || '', a:attrs(e), r:[], nt:(e.notes || []).map(n => [n.u || '', n.txt || '', n.st || 'Açık'])}; });
  Object.values(M.els).forEach(r => { if(!(KIND[r.kind] && KIND[r.kind].rel) || !els[r.src] || !els[r.tgt]) return; const k = KIND[r.kind].tr.split(' (')[0]; els[r.src].r.push([k, '→', r.tgt]); els[r.tgt].r.push([k, '←', r.src]); });
  return {model:M.rootId, name:E(M.rootId).name, ver:APP_VER, date:new Date().toISOString(), dias, els};
}
function reviewHTML(){
  const D = reviewData(), json = JSON.stringify(D).replace(/</g, '\\u003c');
  return `<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(D.name)} — İnceleme</title>
<style>
:root{--bg:#f6f7f9;--pn:#fff;--ln:#d9dde3;--tx:#1d232b;--mu:#6b7480;--ac:#2d7ff9}
*{box-sizing:border-box}body{margin:0;font:13px/1.45 "Segoe UI",Arial,sans-serif;color:var(--tx);background:var(--bg);display:grid;grid-template-columns:260px 1fr 340px;grid-template-rows:44px 1fr;height:100vh}
header{grid-column:1/4;display:flex;align-items:center;gap:10px;padding:0 12px;background:#1f2a37;color:#fff}header b{font-size:14px}header .sp{flex:1}header input{padding:4px 6px;border:1px solid #556;border-radius:3px;width:150px}
button{font:inherit;border:1px solid var(--ln);background:#fff;border-radius:3px;padding:4px 9px;cursor:pointer}button.pri{background:var(--ac);border-color:var(--ac);color:#fff}
#nav{overflow:auto;border-right:1px solid var(--ln);background:var(--pn)}#nav input{width:calc(100% - 16px);margin:8px;padding:5px}
.di{padding:6px 10px;cursor:pointer;border-bottom:1px solid #eef0f3}.di:hover{background:#f0f4fa}.di.on{background:#e3edfd}.di small{display:block;color:var(--mu)}.tg{display:inline-block;min-width:30px;font-size:10px;padding:0 4px;border:1px solid var(--ln);border-radius:2px;margin-right:6px;text-align:center}
.ok{color:#1e7e34}.bad{color:#c0392b}
#main{overflow:auto;padding:12px}#main svg{background:#fff;border:1px solid var(--ln);max-width:100%;height:auto}#main h2{margin:0 0 8px;font-size:15px}
.hit{fill:transparent;stroke:transparent;cursor:pointer}.hit:hover{stroke:var(--ac);stroke-width:2}.hit.sel{stroke:var(--ac);stroke-width:3}
#side{overflow:auto;border-left:1px solid var(--ln);background:var(--pn);padding:10px}#side h3{margin:4px 0;font-size:14px}.mu{color:var(--mu)}
table{border-collapse:collapse;width:100%}td{border-bottom:1px solid #eef0f3;padding:3px 4px;vertical-align:top}td:first-child{color:var(--mu);width:38%}
.sec{margin:12px 0 4px;font-weight:600;border-bottom:1px solid var(--ln)}a{color:var(--ac);cursor:pointer;text-decoration:none}
.nt{border:1px solid var(--ln);border-radius:3px;padding:5px;margin:5px 0}.nt .v{font-size:11px;padding:0 5px;border-radius:2px;border:1px solid}
textarea{width:100%;font:inherit;padding:5px}select{font:inherit;padding:3px}
.vbar{display:flex;gap:6px;align-items:center;margin:0 0 8px}
</style></head><body>
<header><b>${esc(D.name)}</b><span>· İnceleme paketi</span><span class="sp"></span><label>İnceleyen <input id="who"></label><span id="cnt"></span><button id="exp" class="pri">Notları dışa aktar (JSON)</button></header>
<nav id="nav"><input id="q" placeholder="Diyagram veya eleman ara…"><div id="dl"></div></nav>
<main id="main"></main><aside id="side"><div class="mu">Diyagramda bir elemana tıklayın.</div></aside>
<script>
const D=${json};
const KEY='sysml-review-'+D.model;let N=[];try{N=JSON.parse(localStorage.getItem(KEY)||'[]')}catch(e){}
const $=s=>document.querySelector(s),es=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(N))}catch(e){}cnt()};
const who=$('#who');try{who.value=localStorage.getItem('sysml-review-who')||''}catch(e){}who.onchange=()=>{try{localStorage.setItem('sysml-review-who',who.value)}catch(e){}};
let cur=null,sel=null;
function cnt(){const o=N.filter(n=>n.v==='Onay').length,r=N.filter(n=>n.v==='Ret').length;$('#cnt').textContent=N.length+' not · '+o+' onay · '+r+' ret'}
function nav(){const q=$('#q').value.toLowerCase();$('#dl').innerHTML=D.dias.filter(d=>!q||(d.n+' '+d.p).toLowerCase().includes(q)||d.sh.some(s=>(D.els[s[0]]||{n:''}).n.toLowerCase().includes(q))).map(d=>{const v=N.filter(n=>n.el===d.id&&n.v!=='Yorum').slice(-1)[0];return '<div class="di'+(cur===d.id?' on':'')+'" data-d="'+d.id+'"><span class="tg">'+es(d.t)+'</span>'+es(d.n)+(v?' <b class="'+(v.v==='Onay'?'ok':'bad')+'">'+(v.v==='Onay'?'✓':'✕')+'</b>':'')+'<small>'+es(d.p)+'</small></div>'}).join('')}
function show(id,el){cur=id;const d=D.dias.find(x=>x.id===id);if(!d)return;const ov=d.sh.map(s=>'<rect class="hit'+(s[0]===el?' sel':'')+'" data-e="'+s[0]+'" x="'+s[1]+'" y="'+s[2]+'" width="'+s[3]+'" height="'+s[4]+'"/>').join('');
$('#main').innerHTML='<h2>'+es(d.n)+' <span class="mu">'+es(d.t)+' · '+es(d.p)+'</span></h2><div class="vbar"><button data-ap="Onay">✓ Diyagramı onayla</button><button data-ap="Ret">✕ Reddet</button><button data-dn="1">Diyagrama not…</button></div>'+d.svg.replace('</svg>',ov+'</svg>');nav();if(el)side(el);else sideD(d)}
function notesOf(id){return N.filter(n=>n.el===id).map(n=>'<div class="nt"><span class="v" style="color:'+(n.v==='Onay'?'#1e7e34':n.v==='Ret'?'#c0392b':'#555')+'">'+es(n.v)+'</span> <b>'+es(n.u)+'</b> <span class="mu">'+es(new Date(n.t).toLocaleString())+'</span> <a data-del="'+n.id+'">sil</a><div>'+es(n.txt)+'</div></div>').join('')}
function form(id){return '<div class="sec">Not / karar ekle</div><textarea id="tx" rows="3"></textarea><div style="display:flex;gap:6px;margin-top:4px"><select id="vv"><option>Yorum</option><option>Onay</option><option>Ret</option></select><button class="pri" data-add="'+id+'">Ekle</button></div>'}
function sideD(d){$('#side').innerHTML='<h3>'+es(d.n)+'</h3><div class="mu">Diyagram · '+d.sh.length+' eleman</div><div class="sec">Notlar</div>'+(notesOf(d.id)||'<div class="mu">Not yok</div>')+form(d.id)}
function side(id){sel=id;const e=D.els[id];if(!e)return;document.querySelectorAll('.hit').forEach(r=>r.classList.toggle('sel',r.dataset.e===id));
const inD=D.dias.filter(d=>d.sh.some(s=>s[0]===id));
$('#side').innerHTML='<h3>'+es(e.n)+'</h3><div class="mu">'+es(e.k)+' · '+es(e.o)+'</div>'+(e.d?'<p>'+es(e.d)+'</p>':'')+(e.a.length?'<div class="sec">Özellikler</div><table>'+e.a.map(a=>'<tr><td>'+es(a[0])+'</td><td>'+es(a[1])+'</td></tr>').join('')+'</table>':'')+
'<div class="sec">İzlenebilirlik ('+e.r.length+')</div>'+(e.r.length?'<table>'+e.r.map(r=>'<tr><td>'+es(r[0])+' '+r[1]+'</td><td><a data-go="'+r[2]+'">'+es((D.els[r[2]]||{}).n)+'</a> <span class="mu">'+es((D.els[r[2]]||{}).k)+'</span></td></tr>').join('')+'</table>':'<div class="mu">İlişki yok</div>')+
'<div class="sec">Gösterildiği diyagramlar</div>'+inD.map(d=>'<div><a data-sd="'+d.id+'" data-se="'+id+'">'+es(d.n)+'</a></div>').join('')+
(e.nt.length?'<div class="sec">Modeldeki notlar</div>'+e.nt.map(n=>'<div class="nt"><b>'+es(n[0])+'</b> <span class="mu">'+es(n[2])+'</span><div>'+es(n[1])+'</div></div>').join(''):'')+
'<div class="sec">İnceleme notları</div>'+(notesOf(id)||'<div class="mu">Not yok</div>')+form(id)}
document.addEventListener('click',ev=>{const t=ev.target,g=k=>t.closest('['+k+']');let b;
if(b=g('data-d'))return show(b.dataset.d);
if(b=g('data-e'))return side(b.dataset.e);
if(b=g('data-go')){const id=b.dataset.go,d=D.dias.find(x=>x.sh.some(s=>s[0]===id));if(d&&d.id!==cur)show(d.id,id);else side(id);return}
if(b=g('data-sd'))return show(b.dataset.sd,b.dataset.se);
if(b=g('data-add')){const tx=$('#tx').value.trim(),v=$('#vv').value;if(!tx&&v==='Yorum')return;N.push({id:'r'+Date.now().toString(36)+Math.random().toString(36).slice(2,6),el:b.dataset.add,txt:tx,v,u:who.value||'İnceleyen',t:new Date().toISOString()});save();return b.dataset.add===cur?sideD(D.dias.find(x=>x.id===cur)):side(b.dataset.add)}
if(b=g('data-del')){N=N.filter(n=>n.id!==b.dataset.del);save();return sel&&D.els[sel]&&!t.closest('.vbar')?side(sel):show(cur)}
if(b=g('data-ap')){N.push({id:'r'+Date.now().toString(36),el:cur,txt:'',v:b.dataset.ap,u:who.value||'İnceleyen',t:new Date().toISOString()});save();return show(cur)}
if(g('data-dn'))return sideD(D.dias.find(x=>x.id===cur));
if(t.id==='exp'){const blob=new Blob([JSON.stringify({kind:'sysml-review',model:D.model,name:D.name,reviewer:who.value,exported:new Date().toISOString(),notes:N},null,1)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=D.name+' - inceleme notları.json';document.body.appendChild(a);a.click();a.remove()}});
$('#q').oninput=nav;cnt();if(D.dias.length)show(D.dias[0].id);else nav();
<\/script></body></html>`;
}
function reviewExport(){
  if(!Object.values(M.els).some(e => e.kind === 'Diagram')) return toast('Modelde diyagram yok');
  download(new Blob([reviewHTML()], {type:'text/html'}), fileSafe(E(M.rootId).name) + ' - İnceleme Paketi.html');
  toast('İnceleme paketi oluşturuldu — tarayıcıda açılır, notlar JSON olarak geri alınır');
}
function reviewImportNotes(obj){
  if(!obj || !Array.isArray(obj.notes)) throw new Error('İnceleme notu dosyası değil');
  let n = 0, miss = 0, dup = 0; snap();
  obj.notes.forEach(x => {
    const e = E(x.el); if(!e){ miss++; return; }
    if((e.notes || []).some(q => q.id === x.id)){ dup++; return; }
    const pre = x.v && x.v !== 'Yorum' ? '[' + x.v + '] ' : '';
    e.notes = (e.notes || []).concat([{id:x.id, t:x.t || new Date().toISOString(), u:x.u || obj.reviewer || 'İnceleyen', txt:(pre + (x.txt || '')).trim() || pre.trim(), st:x.v === 'Onay' ? 'Kapalı' : 'Açık', src:'inceleme'}]); n++;
  });
  afterChange();
  return {n, miss, dup};
}
async function reviewImportDialog(){
  let f; try { f = await pickText('İnceleme notları (*.json)|*.json|Tüm dosyalar (*.*)|*.*', '.json'); } catch(e){ return toast('Açılamadı: ' + e.message); }
  if(!f) return;
  try { const r = reviewImportNotes(JSON.parse(f.text)); toast(`${r.n} not eklendi${r.dup ? ', ' + r.dup + ' zaten vardı' : ''}${r.miss ? ', ' + r.miss + ' eleman bulunamadı' : ''}`); openD('@reviews'); }
  catch(e){ toast('Hata: ' + e.message); }
}
HOOKS.menu.tools.push(it => {
    let i = it.findIndex(x => x && x.t === 'İnceleme notları'); if(i < 0) i = it.length - 1;
    it.splice(i + 1, 0, {t:'Etkileşimli inceleme paketi (HTML) dışa aktar', f:reviewExport}, {t:'İnceleme notlarını içe aktar (JSON)…', f:reviewImportDialog});
});
/* ---------- genel tablo: Excel/CSV gidiş-dönüş ---------- */
{
  const _gx = gtXlsx;
  gtXlsx = function(){
    const cols = gtCols(GT.kind), rows = [cols.map(c => ({v:c[1], s:1})).concat([{v:'Kimlik', s:1}])];
    gtRows().forEach(e => rows.push(cols.map(([k]) => { const v = gtVal(e, k), n = k === 'def' || k === 'res' ? numOf(v) : null; return n != null ? n : v; }).concat([e.id])));
    download(buildXlsx([{name:KIND[GT.kind].tr.slice(0, 28), rows, widths:cols.map(c => c[0] === 'text' || c[0] === 'doc' ? 50 : c[0] === 'owner' ? 36 : 18).concat([14]), header:true, freeze:[1, 1], filter:1}]), fileSafe(E(M.rootId).name + ' - ' + KIND[GT.kind].tr + ' tablosu') + '.xlsx');
  };
  const _gb2 = gtBar;
  gtBar = function(){ return _gb2().replace(`<button class="vb" data-an="gtxl">`, `<button class="vb" data-gtimp="1" title="Excel/CSV'den toplu ekleme ve güncelleme (Kimlik veya Ad + Sahibi ile eşleşir)">⤓ Excel/CSV'den aktar</button><button class="vb" data-an="gtxl">`); };
  VIEWS['@table'].bar = gtBar;
}
const gtNorm = s => asciiTr(String(s || '').trim()).replace(/\s+/g, ' ');
function gtOwnerFind(path, kind){
  const need = OWN_NEED(kind), p = gtNorm(path);
  if(!p) return null;
  const c = Object.values(M.els).filter(e => !KIND[e.kind].rel && e.kind !== 'Diagram' && need(e) && (gtNorm(pathOf(e.id)) === p || gtNorm(e.name) === p));
  return c.length ? c.sort((a, b) => (gtNorm(pathOf(a.id)) === p ? 0 : 1) - (gtNorm(pathOf(b.id)) === p ? 0 : 1))[0] : null;
}
const OWN_NEED = kind => e => { const L = Object.keys(OWN).filter(k => OWN[k].includes(kind)); return L.length ? L.includes(e.kind) : ['Package', 'Model'].includes(e.kind); };
function gtPlan(rows, kind){
  const hdr = rows[0].map(gtNorm), cols = gtCols(kind), ci = {};
  cols.forEach(([k, l]) => { const j = hdr.findIndex(h => h === gtNorm(l) || h === gtNorm(k)); if(j >= 0 && ci[k] == null) ci[k] = j; });
  const jid = hdr.findIndex(h => h === 'kimlik' || h === 'id kimlik' || h === 'uuid'), jown = ci.owner;
  if(ci.name == null) throw new Error('"Ad" sütunu bulunamadı');
  const all = Object.values(M.els).filter(e => e.kind === kind), plan = [];
  rows.slice(1).forEach((r, ri) => {
    const name = String(r[ci.name] || '').trim(); if(!name && !(jid >= 0 && r[jid])) return;
    let e = jid >= 0 && r[jid] && E(String(r[jid]).trim()) && E(String(r[jid]).trim()).kind === kind ? E(String(r[jid]).trim()) : null;
    if(!e){ const own = jown != null ? gtNorm(r[jown]) : ''; const c = all.filter(x => gtNorm(x.name) === gtNorm(name) && (!own || gtNorm(pathOf(x.owner)) === own)); if(c.length === 1) e = c[0]; }
    const ch = [];
    cols.forEach(([k, , ed]) => { if(ci[k] == null || k === 'owner' || (!ed && k !== 'type')) return; const v = String(r[ci[k]] == null ? '' : r[ci[k]]).trim(); const old = e ? gtVal(e, k) : ''; if(e ? v !== String(old) : v !== '') ch.push([k, v, old]); });
    if(e){ plan.push({row:ri + 2, e, ch, op:ch.length ? 'upd' : 'same'}); return; }
    const owner = jown != null ? gtOwnerFind(r[jown], kind) : null, def = GT.scope && E(GT.scope) && OWN_NEED(kind)(E(GT.scope)) ? E(GT.scope) : (OWN_NEED(kind)(E(M.rootId)) ? E(M.rootId) : null);
    const o = owner || def;
    plan.push({row:ri + 2, name, ch:ch.filter(c => c[0] !== 'name'), owner:o, op:o ? 'new' : 'err', err:o ? '' : 'Sahibi bulunamadı: ' + (jown != null ? r[jown] : '—')});
  });
  return {plan, mapped:Object.keys(ci)};
}
function gtApply(P, kind){
  snap(); let n = 0, u = 0;
  P.plan.forEach(p => {
    if(p.op === 'err' || p.op === 'same') return;
    let e = p.e; if(p.op === 'new'){ e = mk(kind, p.owner.id, {name:p.name}); n++; } else u++;
    p.ch.forEach(([k, v]) => { if(k === 'type'){ const b = Object.values(M.els).find(x => ['Block', 'InterfaceBlock', 'ValueType', 'Signal', 'ConstraintBlock'].includes(x.kind) && gtNorm(x.name) === gtNorm(v)); if(b) e.type = b.id; else if(!v) delete e.type; return; } gtSet(e, k, v); });
  });
  afterChange(); return {n, u};
}
async function gtImportDialog(){
  let f; try { f = await pickBytes(); } catch(e){ return toast('Açılamadı: ' + e.message); } if(!f) return;
  let sheets; try { sheets = /\.xlsx$/i.test(f.name) ? await readXlsx(f.u8) : parseCSVSheets(decodeText(f.u8)); } catch(e){ return toast('Okunamadı: ' + e.message); }
  const rows = (sheets.find(s => s.rows.length > 1) || {rows:[]}).rows.filter(r => r && r.some(x => String(x).trim()));
  if(rows.length < 2) return toast('Veri satırı yok');
  let P; try { P = gtPlan(rows, GT.kind); } catch(e){ return toast(e.message); }
  const c = k => P.plan.filter(p => p.op === k).length;
  const box = $('#modalBox'); box.style.width = 'min(820px, 96vw)'; box.style.maxWidth = 'none';
  box.innerHTML = `<h2>${esc(KIND[GT.kind].tr)} — Excel/CSV'den aktar</h2><p class="muted noi18n">${esc(baseName(f.name))}</p>
    <p>Eşleşen sütunlar: <b class="noi18n">${P.mapped.map(k => (gtCols(GT.kind).find(x => x[0] === k) || [0, k])[1]).join(', ')}</b></p>
    <p><b>${c('new')}</b> yeni · <b>${c('upd')}</b> güncellenecek · <b>${c('same')}</b> değişmedi${c('err') ? ` · <b class="bad">${c('err')}</b> hatalı` : ''}</p>
    <div style="max-height:46vh;overflow:auto"><table class="rt fmt"><thead><tr><th>Satır</th><th>İşlem</th><th>Eleman</th><th>Değişiklik</th></tr></thead><tbody>${P.plan.filter(p => p.op !== 'same').slice(0, 300).map(p => `<tr><td>${p.row}</td><td>${p.op === 'new' ? 'Yeni' : p.op === 'upd' ? 'Güncelle' : '<span class="bad">Hata</span>'}</td><td class="noi18n">${esc(p.e ? pathOf(p.e.id) : (p.owner ? pathOf(p.owner.id) + ' ▸ ' : '') + p.name)}</td><td class="noi18n">${p.err ? esc(p.err) : p.ch.map(([k, v, o]) => `<b>${esc((gtCols(GT.kind).find(x => x[0] === k) || [0, k])[1])}</b>: ${o ? '<s>' + esc(o) + '</s> → ' : ''}${esc(v)}`).join('<br>')}</td></tr>`).join('')}</tbody></table></div>
    <p class="muted" style="font-size:12px">Eşleşme: "Kimlik" sütunu (bu tablodan aktarılan Excel'de bulunur) veya Ad + Sahibi. Yeni elemanlar "Sahibi" sütunundaki pakete/bloğa, yoksa seçili kapsama eklenir.</p>
    <p style="text-align:right;margin:10px 0 0"><button class="pbtn" id="giC">Vazgeç</button> <button class="pbtn pri" id="giO"${c('new') + c('upd') ? '' : ' disabled'}>Uygula</button></p>`;
  $('#modal').style.display = 'flex';
  const close = () => { $('#modal').style.display = 'none'; box.style.width = ''; box.style.maxWidth = ''; box.onclick = null; };
  box.onclick = ev => { if(ev.target.id === 'giC') close(); if(ev.target.id === 'giO'){ const r = gtApply(P, GT.kind); close(); toast(`${r.n} eleman eklendi, ${r.u} güncellendi`); } };
}
function parseCSVSheets(t){ const r = parseCSV(t); return Array.isArray(r) && r[0] && r[0].rows ? r : [{name:'CSV', rows:r}]; }
(() => { $('#view').addEventListener('click', ev => { if(ev.target.closest('[data-gtimp]')) gtImportDialog(); }); })();

