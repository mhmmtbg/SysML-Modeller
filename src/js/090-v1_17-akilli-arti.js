/* ================= v1.17: AKILLI "+" — SEÇİLİ BLOĞA BÖLME ÖĞESİ VE İLİŞKİ EKLEME ================= */
const PLUS_KINDS = new Set(['Block', 'InterfaceBlock', 'Part', 'ConstraintBlock', 'Signal']);
function plusOK(d, e){ return !!(d && e && PLUS_KINDS.has(e.kind) && (e.kind !== 'Part' || d.dtype === 'ibd') && ['bdd', 'ibd', 'pkg', 'req', 'par'].includes(d.dtype)); }
function plusSVG(d, sh){
  const e = E(sh.el); if(!plusOK(d, e)) return '';
  const z = d.z, r = 9 / z, cx = sh.x + sh.w + 14 / z, cy = sh.y + 10 / z;
  return `<g data-plus="${sh.id}" style="cursor:pointer"><title>Ekle: part, değer, akış özelliği, port, ilişki…</title><circle cx="${cx}" cy="${cy}" r="${r}" fill="#2d7ff9" stroke="#fff" stroke-width="${1.5 / z}"/><path d="M${cx - r * 0.5} ${cy}h${r}M${cx} ${cy - r * 0.5}v${r}" stroke="#fff" stroke-width="${2 / z}" stroke-linecap="round"/></g>`;
}
/* boş yer bul (yeni bloğu kaynağın yakınına, çakışmadan) */
function freeSpot(d, sh, w, h, dir){
  const busy = d.shapes.filter(s => !s.parent), hit = (x, y) => busy.some(s => x < s.x + s.w + 30 && x + w + 30 > s.x && y < s.y + s.h + 30 && y + h + 30 > s.y);
  const start = dir === 'up' ? [sh.x, sh.y - h - 90] : dir === 'right' ? [sh.x + sh.w + 120, sh.y] : [sh.x, sh.y + sh.h + 90];
  for(let i = 0; i < 40; i++){ const x = snapv(start[0] + (dir === 'right' ? 0 : i * (w + 40))), y = snapv(start[1] + (dir === 'right' ? i * (h + 40) : 0)); if(!hit(x, y)) return [x, y]; }
  return [snapv(start[0]), snapv(start[1])];
}
/* küçük form penceresi */
function quickForm(title, fields, onOk, note){
  const box = $('#modalBox'); box.style.width = 'min(460px, 94vw)'; box.style.maxWidth = 'none';
  box.innerHTML = `<h2>${esc(title)}</h2>${note ? `<p class="muted" style="margin:-4px 0 8px;font-size:12px">${note}</p>` : ''}<div class="qf">${fields.map(f => `<label>${esc(f.l)}${f.t === 'check' ? `<span><input type="checkbox" data-qf="${f.k}"${f.v ? ' checked' : ''}> ${esc(f.hint || '')}</span>` : f.t === 'select' ? `<select data-qf="${f.k}">${f.opts.map(o => `<option value="${esc(o[0])}"${String(o[0]) === String(f.v || '') ? ' selected' : ''}>${esc(o[1])}</option>`).join('')}</select>` : `<input data-qf="${f.k}" value="${esc(f.v || '')}"${f.list ? ` list="ql_${f.k}"` : ''} placeholder="${esc(f.ph || '')}">${f.list ? `<datalist id="ql_${f.k}">${f.list.map(x => `<option value="${esc(x)}">`).join('')}</datalist>` : ''}`}</label>`).join('')}</div>
    <p style="text-align:right;margin:12px 0 0"><button class="pbtn" id="qfC">Vazgeç</button> <button class="pbtn pri" id="qfO">Ekle</button></p>`;
  $('#modal').style.display = 'flex';
  const close = () => { $('#modal').style.display = 'none'; box.style.width = ''; box.style.maxWidth = ''; box.onclick = null; box.onkeydown = null; };
  const vals = () => { const o = {}; box.querySelectorAll('[data-qf]').forEach(i => o[i.dataset.qf] = i.type === 'checkbox' ? i.checked : i.value.trim()); return o; };
  const ok = () => { const v = vals(); const err = onOk(v); if(err) return toast(err); close(); };
  box.onkeydown = ev => { ev.stopPropagation(); if(ev.key === 'Enter' && ev.target.tagName !== 'TEXTAREA'){ ev.preventDefault(); ok(); } if(ev.key === 'Escape') close(); };
  box.onclick = ev => { if(ev.target.id === 'qfC') close(); if(ev.target.id === 'qfO') ok(); };
  const f0 = box.querySelector('input[data-qf]'); if(f0){ f0.focus(); f0.select(); }
}
const blockList = (exclude) => Object.values(M.els).filter(e => (e.kind === 'Block' || e.kind === 'ConstraintBlock') && e.id !== exclude).sort((a, b) => pathOf(a.id).localeCompare(pathOf(b.id), 'tr'));
const ifList = () => Object.values(M.els).filter(e => e.kind === 'InterfaceBlock' || e.kind === 'Block' || e.kind === 'Signal').sort((a, b) => (a.kind === 'InterfaceBlock' ? 0 : 1) - (b.kind === 'InterfaceBlock' ? 0 : 1) || sortEls(a, b));
const vtList = () => ['Real', 'Integer', 'Boolean', 'String'].concat(Object.values(M.els).filter(e => VT_KINDS.includes(e.kind)).map(e => e.name).sort((a, b) => a.localeCompare(b, 'tr')));
const MULTS = ['', '1', '0..1', '1..*', '0..*', '*', '2', '3', '4'];
/* blok büyüyünce altındaki/yanındaki şekilleri kaydır (zincirleme) */
function pushOverlaps(d, src){
  if(!d || !d.shapes || !src) return 0;
  renderDiagram();
  const tops = d.shapes.filter(s => !s.parent && E(s.el) && !CONT.has(E(s.el).kind)), moveSub = (s, dy) => { s.y += dy; d.shapes.forEach(c => { if(c.parent === s.id){ c.y += dy; d.shapes.forEach(g => { if(g.parent === c.id) g.y += dy; }); } }); };
  let moved = 0; const act = new Set([src.id]);
  for(let it = 0; it < 60; it++){
    let any = false;
    tops.sort((a, b) => a.y - b.y || a.x - b.x);
    for(let i = 0; i < tops.length; i++) for(let j = 0; j < tops.length; j++){
      const A = tops[i], B = tops[j]; if(!act.has(A.id) || A === B || B.y < A.y || (B.y === A.y && j <= i)) continue;
      if(A.x < B.x + B.w + 10 && A.x + A.w + 10 > B.x && A.y + A.h + 20 > B.y && A.y < B.y + B.h){ moveSub(B, snapv(A.y + A.h + 40 - B.y)); act.add(B.id); moved++; any = true; }
    }
    if(!any) break;
  }
  return moved;
}
let PLUS_SH = null;
function plusFinish(newIds, focusId){ const d = cur(); bump(); if(d && PLUS_SH && d.shapes.includes(PLUS_SH)) pushOverlaps(d, PLUS_SH); afterChange(); if(focusId){ ST.tsel = focusId; revealInTree(focusId); renderProps(); } }
function qaPart(d, sh, shared){
  const b = E(sh.el), bl = blockList(b.id);
  quickForm((shared ? 'Reference (paylaşımlı part) ekle — ' : 'Part property ekle — ') + b.name, [
    {k:'name', l:'Ad', v:'', ph:'ör. güçBirimi (boş: tip adından)'},
    {k:'type', l:'Tip (blok)', t:'select', v:'__new', opts:[['__new', '+ Yeni blok oluştur'], ['', '(tipsiz)']].concat(bl.map(x => [x.id, pathOf(x.id)]))},
    {k:'tname', l:'Yeni bloğun adı', v:'', ph:'ör. Güç Birimi'},
    {k:'mult', l:'Çokluk', t:'select', v:'', opts:MULTS.map(m => [m, m || '(1)'])},
    {k:'rel', l:'Diyagram', t:'check', v:d.dtype === 'bdd', hint:(shared ? 'Aggregation' : 'Composition') + ' ilişkisiyle tip bloğunu diyagramda göster'}
  ], v => {
    if(v.type === '__new' && !v.tname) return 'Yeni bloğun adını girin veya listeden tip seçin';
    snap();
    let T = v.type && v.type !== '__new' ? E(v.type) : null;
    if(v.type === '__new') T = mk('Block', nearestPkg(b.id), {name:uniqName(v.tname, nearestPkg(b.id))});
    let p;
    if(T && v.rel && d.dtype === 'bdd'){
      let ts = d.shapes.find(s => s.el === T.id && !s.parent);
      if(!ts){ const [x, y] = freeSpot(d, sh, 170, 80, 'down'); ts = addShape(d, T.id, x, y, 170, 80); }
      const ed = connect(d, shared ? 'Aggregation' : 'Composition', sh, ts); p = E(E(ed.el).part);
      if(v.name) p.name = uniqName(v.name, b.id);
    } else {
      p = mk('Part', b.id, {name:uniqName(v.name || (T ? lcFirst(T.name) : 'part'), b.id), type:T ? T.id : null}); if(shared) p.shared = true;
    }
    if(v.mult) p.mult = v.mult;
    plusFinish([p.id], p.id); toast(`"${p.name}" ${shared ? 'reference' : 'part'} eklendi`);
  }, 'Tip seçerseniz part o bloğun örneği olur; "Diyagram" işaretliyse BDD\'de ilişki çizgisi de eklenir.');
}
function qaValue(d, sh){
  const e0 = E(sh.el), host = e0.kind === 'Part' && e0.type && E(e0.type) ? E(e0.type) : e0;
  quickForm('Value property ekle — ' + host.name, [
    {k:'name', l:'Ad', ph:'ör. kütle'}, {k:'vtype', l:'Tip', v:'Real', list:vtList()}, {k:'def', l:'Varsayılan değer', ph:'ör. 4.2'}, {k:'unit', l:'Birim', ph:'ör. kg (tipten gelirse boş bırakın)'}
  ], v => {
    if(!v.name) return 'Ad girin';
    snap(); const x = mk('Value', host.id, {name:uniqName(v.name, host.id), vtype:v.vtype || 'Real', def:v.def, unit:v.unit});
    if(d.dtype === 'ibd' && e0.kind !== 'Part' && host.id === d.owner){ const [px, py] = freeSpot(d, sh, 160, 36, 'down'); addShape(d, x.id, px, py, 160, 36); }
    plusFinish([x.id], x.id); toast(`"${x.name}" eklendi`);
  });
}
function qaFlow(d, sh){
  const e0 = E(sh.el), host = e0.kind === 'Part' && e0.type && E(e0.type) ? E(e0.type) : e0;
  quickForm('Flow property ekle — ' + host.name, [
    {k:'name', l:'Ad', ph:'ör. güç'}, {k:'dir', l:'Yön', t:'select', v:'out', opts:[['in', 'in'], ['out', 'out'], ['inout', 'inout']]},
    {k:'type', l:'Tip', v:'Real', list:vtList().concat(Object.values(M.els).filter(x => x.kind === 'Signal' || x.kind === 'Block').map(x => x.name))}, {k:'unit', l:'Birim', ph:'ör. V'}
  ], v => {
    if(!v.name) return 'Ad girin';
    snap(); const sig = Object.values(M.els).find(x => (x.kind === 'Signal' || x.kind === 'Block') && x.name === v.type);
    const x = mk('FlowProp', host.id, Object.assign({name:uniqName(v.name, host.id), dir:v.dir, unit:v.unit}, sig ? {type:sig.id} : {vtype:v.type || 'Real'}));
    plusFinish([x.id], x.id); toast(`"${x.name}" akış özelliği eklendi`);
  }, host.kind === 'InterfaceBlock' ? 'Bu arayüz bloğunu tip olarak kullanan portların yönü akış özelliklerinden türetilir.' : '');
}
function qaPort(d, sh){
  const e0 = E(sh.el), host = e0.kind === 'Part' && e0.type && E(e0.type) ? E(e0.type) : e0;
  if(e0.kind === 'Part' && !(e0.type && E(e0.type))) return toast('Önce part\'a bir tip (blok) verin; port tip bloğuna eklenir');
  quickForm('Port ekle — ' + host.name, [
    {k:'name', l:'Ad', ph:'ör. güçÇıkış'}, {k:'dir', l:'Yön', t:'select', v:'', opts:[['', '(arayüzden türet)'], ['in', 'in'], ['out', 'out'], ['inout', 'inout']]},
    {k:'type', l:'Tip (arayüz bloğu)', t:'select', v:'', opts:[['', '(tipsiz)']].concat(ifList().map(x => [x.id, x.name + ' ‹' + KIND[x.kind].tr + '›']))},
    {k:'conj', l:'Eşlenik (~)', t:'check', v:false, hint:'akış yönlerini ters çevir'}
  ], v => {
    if(!v.name) return 'Ad girin';
    snap(); const p = mk('Port', host.id, {name:uniqName(v.name, host.id), dir:v.dir, type:v.type || null}); if(v.conj) p.conj = true;
    if(d.dtype === 'ibd'){ if(e0.kind === 'Part'){ const ps = addShape(d, p.id, 0, 0, 16, 16, sh.id); snapPort(ps, sh, sh.x + sh.w, sh.y + sh.h / 2); } else if(host.id === d.owner){ addShape(d, p.id, snapv(sh.x) - 8, snapv(sh.y) - 8, 16, 16); } }
    plusFinish([p.id], p.id); toast(`"${p.name}" portu eklendi`);
  });
}
function qaRelNew(d, sh, kind, up){
  const b = E(sh.el), LBL = {Composition:'Composition → yeni parça bloğu', Aggregation:'Aggregation → yeni blok', Association:'Association → yeni blok', Generalization:up ? 'Generalization → yeni üst tip' : 'Generalization → yeni alt tip', Dependency:'Dependency → yeni blok', Allocate:'Allocate'}[kind];
  quickForm(LBL, [{k:'name', l:'Yeni bloğun adı', ph:'ör. Batarya'}].concat(kind === 'Composition' || kind === 'Aggregation' ? [{k:'pname', l:'Part adı', ph:'boş: blok adından'}, {k:'mult', l:'Çokluk', t:'select', v:'', opts:MULTS.map(m => [m, m || '(1)'])}] : kind === 'Association' ? [{k:'rname', l:'İlişki adı', ph:'isteğe bağlı'}] : []), v => {
    if(!v.name) return 'Blok adını girin';
    snap(); const own = nearestPkg(b.id), nb = mk(b.kind === 'InterfaceBlock' && kind === 'Generalization' ? 'InterfaceBlock' : 'Block', own, {name:uniqName(v.name, own)});
    const k0 = KIND[nb.kind], [x, y] = freeSpot(d, sh, k0.w || 170, k0.h || 80, kind === 'Generalization' && up ? 'up' : kind === 'Association' || kind === 'Dependency' ? 'right' : 'down');
    const ns = addShape(d, nb.id, x, y, k0.w || 170, k0.h || 80);
    const ed = kind === 'Generalization' ? (up ? connect(d, kind, sh, ns) : connect(d, kind, ns, sh)) : connect(d, kind, sh, ns), r = E(ed.el);
    if(r && r.part && E(r.part)){ const p = E(r.part); if(v.pname) p.name = uniqName(v.pname, b.id); if(v.mult) p.mult = v.mult; }
    if(r && v.rname) r.name = v.rname;
    ST.sel = new Set([ns.id]); plusFinish([nb.id], nb.id); toast(`"${nb.name}" oluşturuldu ve ${KIND[kind].tr} ile bağlandı`);
  });
}
function qaRelExisting(d, sh, kind, up){
  const b = E(sh.el), cands = Object.values(M.els).filter(x => x.id !== b.id && (kind === 'Dependency' ? ['Block', 'InterfaceBlock', 'ConstraintBlock', 'Signal', 'ValueType', 'Package', 'Actor', 'Requirement'].includes(x.kind) : kind === 'Generalization' ? x.kind === b.kind : ['Block', 'ConstraintBlock'].includes(x.kind))).sort((x, y) => pathOf(x.id).localeCompare(pathOf(y.id), 'tr'));
  if(!cands.length) return toast('Bağlanabilecek eleman yok');
  pickList(`${KIND[kind].tr}${kind === 'Generalization' ? (up ? ' — üst tip(ler) seçin' : ' — alt tip(ler) seçin') : ' — hedef eleman(lar)'} · ${b.name}`, cands, [], ids => {
    if(!ids.length) return;
    snap(); let n = 0, dup = 0;
    ids.forEach((id, i) => {
      const t = E(id);
      const exists = Object.values(M.els).some(r => r.kind === kind && ((r.src === b.id && r.tgt === id) || (kind === 'Generalization' && !up && r.src === id && r.tgt === b.id)));
      if(exists){ dup++; return; }
      let ts = d.shapes.find(s => s.el === id && !s.parent);
      if(!ts){ const k0 = KIND[t.kind], [x, y] = freeSpot(d, sh, k0.w || 170, k0.h || 80, kind === 'Generalization' && up ? 'up' : kind === 'Composition' || kind === 'Aggregation' || kind === 'Generalization' ? 'down' : 'right'); ts = addShape(d, id, x, y, k0.w || 170, k0.h || 80); }
      if(kind === 'Generalization' && !up) connect(d, kind, ts, sh); else connect(d, kind, sh, ts);
      n++;
    });
    plusFinish([], b.id); toast(`${n} ${KIND[kind].tr} ilişkisi eklendi${dup ? ` (${dup} zaten vardı)` : ''}`);
  });
}
function qaConnect(d, sh){
  const e0 = E(sh.el), sib = d.shapes.filter(s => !s.parent && s.id !== sh.id && E(s.el) && E(s.el).kind === 'Part');
  if(!sib.length) return toast('Bu IBD\'de bağlanacak başka part yok');
  pickList('Connector — ' + e0.name + ' → ', sib.map(s => E(s.el)), [], ids => {
    if(!ids.length) return; snap();
    ids.forEach(id => { const ts = sib.find(s => s.el === id); connect(d, 'Connector', sh, ts); });
    plusFinish([], e0.id); toast(ids.length + ' bağlantı eklendi — portlar arası bağlantı için portları sürükleyerek bağlayın');
  });
}
function plusItems(d, sh){
  const e = E(sh.el), it = [], rels = new Set(DT[d.dtype].rels), A = (t, f, dis) => it.push({t, f, dis});
  if(e.kind === 'Part'){
    it.push({h:'Part: ' + (e.name || '') + (e.type && E(e.type) ? ' : ' + E(e.type).name : '')});
    A('Port…', () => qaPort(d, sh), !(e.type && E(e.type))); A('Value property (tip bloğuna)…', () => qaValue(d, sh), !(e.type && E(e.type))); A('Flow property (tip bloğuna)…', () => qaFlow(d, sh), !(e.type && E(e.type)));
    it.push('-'); A('Connector → başka part…', () => qaConnect(d, sh));
    return it;
  }
  it.push({h:'Bölmeye ekle — ' + (e.name || KIND[e.kind].tr)});
  if(e.kind === 'Block'){ A('Part property…', () => qaPart(d, sh, false)); A('Reference property (paylaşımlı)…', () => qaPart(d, sh, true)); }
  if(['Block', 'InterfaceBlock', 'Signal', 'ConstraintBlock'].includes(e.kind) && e.kind !== 'ConstraintBlock') A('Value property…', () => qaValue(d, sh));
  if(e.kind === 'Block' || e.kind === 'InterfaceBlock') A('Flow property…', () => qaFlow(d, sh));
  if(e.kind === 'Block' || e.kind === 'InterfaceBlock') A('Port…', () => qaPort(d, sh));
  if(e.kind === 'ConstraintBlock') A('Parametre…', () => quickForm('Parametre ekle — ' + e.name, [{k:'name', l:'Ad', ph:'ör. P'}, {k:'vtype', l:'Tip', v:'Real', list:vtList()}], v => { if(!v.name) return 'Ad girin'; snap(); const x = mk('Param', e.id, {name:uniqName(v.name, e.id), vtype:v.vtype || 'Real'}); plusFinish([x.id], x.id); }));
  const RK = ['Composition', 'Aggregation', 'Association', 'Generalization', 'Dependency'].filter(k => rels.has(k) && (e.kind !== 'Signal' || k === 'Generalization' || k === 'Dependency') && (e.kind !== 'InterfaceBlock' || k !== 'Composition'));
  if(RK.length && d.dtype !== 'ibd'){
    it.push({h:'İlişki + yeni blok'});
    RK.forEach(k => { if(k === 'Generalization'){ A('Generalization → yeni alt tip…', () => qaRelNew(d, sh, k, false)); A('Generalization → yeni üst tip…', () => qaRelNew(d, sh, k, true)); } else A({Composition:'Composition → yeni parça bloğu…', Aggregation:'Aggregation → yeni blok…', Association:'Association → yeni blok…', Dependency:'Dependency → yeni blok…'}[k], () => qaRelNew(d, sh, k)); });
    it.push({h:'İlişki → var olan eleman'});
    RK.forEach(k => { if(k === 'Generalization'){ A('Generalization → var olan alt tipler…', () => qaRelExisting(d, sh, k, false)); A('Generalization → var olan üst tip…', () => qaRelExisting(d, sh, k, true)); } else A(KIND[k].tr + ' → var olan…', () => qaRelExisting(d, sh, k)); });
  }
  return it;
}
function plusMenu(d, sh, x, y){ PLUS_SH = sh; const it = plusItems(d, sh); if(it.length > 1) menu(x, y, it); }

