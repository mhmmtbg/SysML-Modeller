/* ================= v1.14: ARAYÜZ YÖNETİMİ — N² MATRİSİ, ICD, UYUMSUZLUK DENETİMİ ================= */
const IF_TYPES = ['', 'Elektriksel (güç)', 'Elektriksel (sinyal)', 'Veri / haberleşme', 'Mekanik', 'Termal', 'Akışkan / pnömatik', 'RF', 'Optik', 'Yazılım', 'İnsan / operatör'];
const allConns = () => Object.values(M.els).filter(e => e.kind === 'Connector' && E(e.src) && E(e.tgt));
function cEnd(c, w){
  const id = w ? c.tgt : c.src, pid = w ? c.tp : c.sp, x = E(id); if(!x) return null;
  const port = x.kind === 'Port' ? x : null, part = pid && E(pid) ? E(pid) : (x.kind === 'Part' ? x : (x.kind === 'Value' ? E(x.owner) : null));
  const boundary = !!port && !pid && port.owner === c.owner;
  const host = part || (port ? E(port.owner) : null);
  let dir = port ? portDir(port) : '';
  return {x, port, part, boundary, host, dir, label:part ? part.name + (port ? '.' + port.name : '') : port ? '⟨sınır⟩ ' + port.name : nm(x)};
}
function portFlows(port){
  if(!port || !port.type || !E(port.type)) return [];
  return kidsOf(port.type).filter(f => f.kind === 'FlowProp').map(f => { let d = f.dir || 'inout'; if(port.conj && d !== 'inout') d = d === 'in' ? 'out' : 'in'; return {f, name:f.name, dir:d, type:tName(f), unit:f.unit || (vtypeOf(f.vtype) ? unitOf(f) : '') || (f.type && E(f.type) ? '' : '')}; });
}
/* akış yönü: a→b (1), b→a (-1), çift yönlü / belirsiz (0) */
function cFlowDir(a, b){
  const eff = e => !e.dir ? '' : e.boundary ? (e.dir === 'in' ? 'out' : e.dir === 'out' ? 'in' : e.dir) : e.dir;
  const da = eff(a), db = eff(b), fwd = da === 'out' || db === 'in', bwd = da === 'in' || db === 'out';
  return fwd && !bwd ? 1 : bwd && !fwd ? -1 : 0;
}
function cItems(c){
  const a = cEnd(c, 0), b = cEnd(c, 1), out = [];
  String(c.items || '').split(/[,;\n]+/).map(x => x.trim()).filter(Boolean).forEach(n => out.push({name:n, src:'bağlantı'}));
  const seen = new Set(out.map(x => x.name));
  [a, b].forEach(e => e && portFlows(e.port).forEach(fl => { if(!seen.has(fl.name)){ seen.add(fl.name); out.push({name:fl.name, type:fl.type, unit:fl.unit, src:'arayüz'}); } }));
  return out;
}
function icdIssues(c){
  const a = cEnd(c, 0), b = cEnd(c, 1), out = []; if(!a || !b) return [['hata', 'Bağlantı ucu eksik']];
  const deleg = a.boundary !== b.boundary;
  if(a.port && b.port && a.dir && b.dir && a.dir !== 'inout' && b.dir !== 'inout'){
    if(!deleg && a.dir === b.dir) out.push(['hata', `Yön çelişkisi: iki uç da "${a.dir}"`]);
    if(deleg && a.dir !== b.dir) out.push(['hata', `Delegasyonda yönler aynı olmalı (${a.dir} / ${b.dir})`]);
  }
  if(a.port && !a.port.type) out.push(['bilgi', `${a.label}: port tipi (arayüz) tanımsız`]);
  if(b.port && !b.port.type) out.push(['bilgi', `${b.label}: port tipi (arayüz) tanımsız`]);
  const fa = portFlows(a.port), fb = portFlows(b.port);
  if(fa.length && fb.length){
    const mb = new Map(fb.map(x => [asciiTr(x.name), x]));
    fa.forEach(x => {
      const y = mb.get(asciiTr(x.name));
      if(!y){ out.push(['uyarı', `"${x.name}" akış özelliği karşı uçta yok`]); return; }
      if(!deleg && x.dir !== 'inout' && y.dir !== 'inout' && x.dir === y.dir) out.push(['hata', `"${x.name}" iki uçta da ${x.dir} — biri eşlenik (~) olmalı`]);
      if(deleg && x.dir !== 'inout' && y.dir !== 'inout' && x.dir !== y.dir) out.push(['hata', `"${x.name}" delegasyonda yön farklı`]);
      if(x.type && y.type && x.type !== y.type) out.push(['uyarı', `"${x.name}" tip uyumsuz: ${x.type} / ${y.type}`]);
      if(x.unit && y.unit && x.unit !== y.unit) out.push(['uyarı', `"${x.name}" birim uyumsuz: ${x.unit} / ${y.unit}`]);
    });
    const ma = new Set(fa.map(x => asciiTr(x.name))); fb.forEach(y => { if(!ma.has(asciiTr(y.name))) out.push(['uyarı', `"${y.name}" akış özelliği karşı uçta yok`]); });
  } else if(a.port && b.port && a.port.type && b.port.type && a.port.type !== b.port.type) out.push(['bilgi', `Port tipleri farklı: ${typeName(a.port.type)} / ${typeName(b.port.type)}`]);
  if(!String(c.ifType || '').trim()) out.push(['bilgi', 'Arayüz türü girilmemiş']);
  return out;
}
function nextIfId(){ let mx = 0; allConns().forEach(c => { const m = String(c.icdId || '').match(/(\d+)\s*$/); if(m) mx = Math.max(mx, +m[1]); }); return 'IF-' + String(mx + 1).padStart(3, '0'); }
function ensureIfIds(){ let n = 0; allConns().sort((a, b) => pathOf(a.owner).localeCompare(pathOf(b.owner), 'tr') || COLL.compare(a.name || '', b.name || '')).forEach(c => { if(!c.icdId){ c.icdId = nextIfId(); n++; } }); return n; }
function icdContexts(){ const s = new Set(allConns().map(c => c.owner)); return [...s].map(E).filter(Boolean).sort(sortEls); }
let IV = {ctx:'all', mode:'part', issues:false, q:'', type:''};
function icdConns(){
  let cs = allConns();
  if(IV.ctx !== 'all') cs = cs.filter(c => c.owner === IV.ctx);
  if(IV.type) cs = cs.filter(c => (c.ifType || '') === IV.type);
  if(IV.issues) cs = cs.filter(c => icdIssues(c).some(x => x[0] !== 'bilgi'));
  if(IV.q){ const q = asciiTr(IV.q); cs = cs.filter(c => asciiTr([c.icdId, c.name, c.proto, c.conn, c.spec, c.items, cEnd(c, 0).label, cEnd(c, 1).label, cItems(c).map(x => x.name).join(' ')].join(' ')).includes(q)); }
  return cs.sort((a, b) => COLL.compare(a.icdId || 'ZZ', b.icdId || 'ZZ') || COLL.compare(a.name || '', b.name || ''));
}
/* ---- N² ---- */
function n2Data(){
  const cs = IV.ctx === 'all' ? allConns() : allConns().filter(c => c.owner === IV.ctx);
  const byBlock = IV.ctx === 'all' || IV.mode === 'block';
  const keyOf = (e, c) => { if(!e) return null; if(e.boundary) return byBlock ? c.owner : '@dış'; if(byBlock){ const p = e.part; return p && p.type && E(p.type) ? p.type : (e.host ? e.host.id : null); } return e.part ? e.part.id : (e.host ? e.host.id : null); };
  const nodes = new Map(), cells = new Map();
  const addNode = k => { if(k && !nodes.has(k)) nodes.set(k, k === '@dış' ? {id:k, name:'Dış ortam (sınır portları)'} : {id:k, name:nm(E(k) || {}), el:E(k)}); };
  if(!byBlock && IV.ctx !== 'all') kidsOf(IV.ctx).filter(p => p.kind === 'Part').forEach(p => addNode(p.id));
  cs.forEach(c => {
    const a = cEnd(c, 0), b = cEnd(c, 1); const ka = keyOf(a, c), kb = keyOf(b, c); if(!ka || !kb) return; addNode(ka); addNode(kb);
    const d = cFlowDir(a, b), put = (i, j, bi) => { const k = i + '|' + j; if(!cells.has(k)) cells.set(k, []); cells.get(k).push({c, bi}); };
    if(ka === kb) return;
    if(d >= 0) put(ka, kb, d === 0); if(d <= 0) put(kb, ka, d === 0);
  });
  const order = [...nodes.values()].sort((x, y) => (x.id === '@dış') - (y.id === '@dış') || COLL.compare(x.name, y.name));
  return {nodes:order, cells, n:cs.length};
}
function n2HTML(){
  const D = n2Data();
  if(!D.nodes.length) return `<div class="vempty">Bağlantı (connector) bulunamadı.<br><br><span class="muted">IBD'de part/port'ları connector ile bağlayın; N² matrisi ve ICD bu bağlantılardan oluşur.</span></div>`;
  let h = `<div class="muted" style="margin:0 0 8px">Satır elemanının <b>çıkışı</b> sütun elemanına gider (ör. üst üçgen ileri, alt üçgen geri besleme). Çift yönlü / yönü tanımsız bağlantılar her iki hücrede ↔ ile gösterilir. Hücredeki öğeye tıklayınca bağlantı seçilir, çift tıklayınca IBD açılır.</div><div style="overflow:auto"><table class="n2"><tbody>`;
  D.nodes.forEach((r, i) => {
    h += '<tr>';
    D.nodes.forEach((cN, j) => {
      if(i === j){ h += `<td class="n2d"${r.el ? ` data-ago="${r.id}"` : ''}>${r.el && r.el.icon ? iconInline(iconOf(r.el).ic, 16, '#26364b') + ' ' : ''}${esc(r.name)}</td>`; return; }
      const L = D.cells.get(r.id + '|' + cN.id) || [];
      const bad = L.some(x => icdIssues(x.c).some(q => q[0] === 'hata')), warn = L.some(x => icdIssues(x.c).some(q => q[0] === 'uyarı'));
      h += `<td class="n2c${L.length ? ' on' : ''}${bad ? ' bad' : warn ? ' warn' : ''}${i < j ? ' up' : ' lo'}">${L.map(x => { const it = cItems(x.c); return `<div class="n2i" data-n2c="${x.c.id}" title="${esc((x.c.icdId ? x.c.icdId + ' · ' : '') + (x.c.name || '') + '\n' + cEnd(x.c, 0).label + ' → ' + cEnd(x.c, 1).label)}">${x.bi ? '↔ ' : ''}<b>${esc(x.c.icdId || x.c.name || 'bağlantı')}</b>${it.length ? ' ' + esc(it.map(q => q.name).join(', ')) : x.c.name && x.c.icdId ? ' ' + esc(x.c.name) : ''}</div>`; }).join('')}</td>`;
    });
    h += '</tr>';
  });
  return h + `</tbody></table></div><div class="vfoot">${D.nodes.length} eleman · ${D.n} bağlantı · <span class="n2lg up"></span> ileri <span class="n2lg lo"></span> geri <span class="n2lg warn"></span> uyarı <span class="n2lg bad"></span> hata</div>`;
}
function icdHTML(){
  const all = allConns(), cs = icdConns();
  if(!all.length) return `<div class="vempty">Henüz bağlantı (connector) yok.<br><br><span class="muted">IBD'de portları bağlayın; her bağlantı bir arayüz satırı olur.</span></div>`;
  const iss = all.map(c => icdIssues(c)), nE = iss.filter(x => x.some(q => q[0] === 'hata')).length, nW = iss.filter(x => x.some(q => q[0] === 'uyarı') && !x.some(q => q[0] === 'hata')).length;
  const unc = Object.values(M.els).filter(p => p.kind === 'Port' && E(p.owner) && E(p.owner).kind !== 'InterfaceBlock' && !all.some(c => c.src === p.id || c.tgt === p.id));
  let h = `<div class="cards"><div class="card"><div class="cv">${all.length}</div><div class="ct">Arayüz (connector)</div><div class="cs">${icdContexts().length} bağlamda</div></div><div class="card"><div class="cv" style="color:${nE ? '#c0392b' : '#2e9e6a'}">${nE}</div><div class="ct">Hatalı arayüz</div><div class="cs">yön / akış özelliği çelişkisi</div></div><div class="card"><div class="cv" style="color:${nW ? '#d18a00' : '#2e9e6a'}">${nW}</div><div class="ct">Uyarılı arayüz</div><div class="cs">tip, birim, eksik akış özelliği</div></div><div class="card"><div class="cv" style="color:${unc.length ? '#d18a00' : '#2e9e6a'}">${unc.length}</div><div class="ct">Bağlantısız port</div></div><div class="card"><div class="cv" style="color:${all.filter(c => !c.icdId).length ? '#d18a00' : '#2e9e6a'}">${all.filter(c => !c.icdId).length}</div><div class="ct">ID'siz arayüz</div></div></div>`;
  h += `<table class="rt fmt"><thead><tr><th class="rn">#</th><th>Arayüz ID</th><th>Arayüz adı</th><th>Kaynak</th><th>Yön</th><th>Hedef</th><th>Arayüz bloğu</th><th>Akış öğeleri</th><th>Ek taşınan öğeler</th><th>Arayüz türü</th><th>Protokol / standart</th><th>Konnektör</th><th>Özellikler (gerilim, hız, tolerans…)</th><th>Uyum</th><th>Bağlam</th></tr></thead><tbody>`;
  cs.forEach((c, i) => {
    const a = cEnd(c, 0), b = cEnd(c, 1), d = cFlowDir(a, b), is = icdIssues(c), tps = [...new Set([a.port, b.port].filter(p => p && p.type && E(p.type)).map(p => (p.conj ? '~' : '') + typeName(p.type)))];
    const fl = [...new Map(portFlows(a.port).concat(portFlows(b.port)).map(x => [x.name, x])).values()];
    const sv = is.some(q => q[0] === 'hata') ? 'qerr' : is.some(q => q[0] === 'uyarı') ? 'qwarn' : is.length ? 'qinfo' : 'qok';
    h += `<tr data-row="${c.id}" class="${ST.tsel === c.id ? 'sel' : ''}"><td class="rn">${i + 1}</td><td>${ce(c, 'icdId', 'rid')}</td><td>${ce(c, 'name')}</td>
      <td style="white-space:nowrap">${esc(a.label)}${a.dir ? `<div class="muted" style="font-size:10.5px">${esc(a.dir)}${a.port && a.port.conj ? ' · eşlenik' : ''}</div>` : ''}</td><td style="text-align:center;font-size:15px">${d > 0 ? '→' : d < 0 ? '←' : '↔'}</td>
      <td style="white-space:nowrap">${esc(b.label)}${b.dir ? `<div class="muted" style="font-size:10.5px">${esc(b.dir)}${b.port && b.port.conj ? ' · eşlenik' : ''}</div>` : ''}</td><td>${esc(tps.join(', ')) || '<span class="muted">—</span>'}</td>
      <td>${fl.map(x => `<div>${esc(x.dir)} <b>${esc(x.name)}</b>${x.type ? ' : ' + esc(x.type) : ''}${x.unit ? ' [' + esc(x.unit) + ']' : ''}</div>`).join('') || '<span class="muted">—</span>'}</td><td>${ce(c, 'items')}</td>
      <td><select class="fmsel" data-ix="${c.id}|ifType">${IF_TYPES.map(t => `<option value="${esc(t)}"${(c.ifType || '') === t ? ' selected' : ''}>${esc(t || '—')}</option>`).join('')}</select></td><td>${ce(c, 'proto')}</td><td>${ce(c, 'conn')}</td><td>${ce(c, 'spec', 'long')}</td>
      <td><span class="${sv}" title="${esc(is.map(q => '• ' + q[1]).join('\n'))}">${is.length ? (sv === 'qinfo' ? 'ℹ ' : '⚠ ') + is.length : '✓'}</span>${is.filter(q => q[0] !== 'bilgi').slice(0, 2).map(q => `<div class="${q[0] === 'hata' ? 'bad' : 'muted'}" style="font-size:11px">${esc(q[1])}</div>`).join('')}</td><td class="muted" style="font-size:11px">${esc(nm(E(c.owner) || {}))}</td></tr>`;
  });
  h += `</tbody></table><div class="vfoot">${cs.length} / ${all.length} arayüz · Kaynak/hedef yönleri port yönünden veya arayüz bloğunun akış özelliklerinden (eşlenik ~ ise ters) türetilir</div>`;
  if(unc.length) h += `<h3>Bağlantısız portlar (${unc.length})</h3><div>${unc.map(p => `<span class="chip2"><a class="lnk" data-ago="${p.id}">${esc(nm(E(p.owner) || {}))}.${esc(p.name)}</a></span>`).join(' ')}</div>`;
  return h;
}
function icdBar(n2){
  const ctxs = icdContexts();
  return `<label>Bağlam <select data-if="ctx"><option value="all">Tüm model${n2 ? ' (blok tiplerine göre)' : ''}</option>${ctxs.map(b => `<option value="${b.id}"${IV.ctx === b.id ? ' selected' : ''}>${esc(pathOf(b.id))}</option>`).join('')}</select></label>
    ${n2 ? `<label>Düzey <select data-if="mode"><option value="part"${IV.mode === 'part' ? ' selected' : ''}>Part (örnek)</option><option value="block"${IV.mode === 'block' ? ' selected' : ''}>Blok (tip)</option></select></label>` : `<input data-if="q" placeholder="Ara…" value="${esc(IV.q)}" style="width:150px"><label>Tür <select data-if="type"><option value="">Tümü</option>${IF_TYPES.filter(Boolean).map(t => `<option${IV.type === t ? ' selected' : ''}>${esc(t)}</option>`).join('')}</select></label><label class="vchk"><input type="checkbox" data-if="issues"${IV.issues ? ' checked' : ''}> Yalnız sorunlu</label><button class="vb" data-ifa="ids">ID'leri ata</button>`}
    <span class="vsep"></span><button class="vb" data-ifa="${n2 ? 'icd' : 'n2'}">${n2 ? 'ICD tablosu →' : 'N² matrisi →'}</button><button class="vb" data-ifa="xl">⤒ Excel'e aktar</button><button class="vb" data-ifa="docx">⤒ Word ICD</button>`;
}
function icdXlsx(){
  const cs = icdConns(), rows = [['Arayüz ID', 'Arayüz adı', 'Kaynak', 'Kaynak yön', 'Yön', 'Hedef', 'Hedef yön', 'Arayüz bloğu', 'Akış öğeleri', 'Ek taşınan öğeler', 'Arayüz türü', 'Protokol / standart', 'Konnektör', 'Özellikler', 'Uyum bulguları', 'Bağlam'].map(v => ({v, s:1}))];
  cs.forEach(c => { const a = cEnd(c, 0), b = cEnd(c, 1), d = cFlowDir(a, b), is = icdIssues(c); rows.push([{v:c.icdId || '', s:6}, c.name || '', a.label, a.dir || '', d > 0 ? '→' : d < 0 ? '←' : '↔', b.label, b.dir || '', [...new Set([a.port, b.port].filter(p => p && p.type && E(p.type)).map(p => (p.conj ? '~' : '') + typeName(p.type)))].join(', '), [...new Map(portFlows(a.port).concat(portFlows(b.port)).map(x => [x.name, x])).values()].map(x => `${x.dir} ${x.name}${x.type ? ' : ' + x.type : ''}${x.unit ? ' [' + x.unit + ']' : ''}`).join('\n'), c.items || '', c.ifType || '', c.proto || '', c.conn || '', c.spec || '', {v:is.map(q => q[0] + ': ' + q[1]).join('\n'), s:is.some(q => q[0] === 'hata') ? 4 : is.some(q => q[0] === 'uyarı') ? 5 : 2}, nm(E(c.owner) || {})]); });
  const D = n2Data(), n2 = [[{v:'N² — ' + (IV.ctx === 'all' ? 'Tüm model' : nm(E(IV.ctx))), s:10}], [{v:'', s:1}].concat(D.nodes.map(n => ({v:n.name, s:8})))];
  D.nodes.forEach(r => n2.push([{v:r.name, s:6}].concat(D.nodes.map(c0 => { if(r === c0) return {v:'■', s:1}; const L = D.cells.get(r.id + '|' + c0.id) || []; return L.length ? {v:L.map(x => (x.bi ? '↔ ' : '') + (x.c.icdId || x.c.name || '') + (cItems(x.c).length ? ': ' + cItems(x.c).map(q => q.name).join(', ') : '')).join('\n'), s:7} : {v:' ', s:2}; }))));
  download(buildXlsx([{name:'ICD', rows, widths:[10, 18, 26, 8, 5, 26, 8, 18, 34, 20, 16, 18, 14, 30, 40, 18], header:true, freeze:[1, 2], filter:1}, {name:'N2 Matrisi', rows:n2, widths:[26].concat(D.nodes.map(() => 22)), freeze:[2, 1], rowH:{1:60}}]), fileSafe(E(M.rootId).name) + ' - ICD.xlsx');
}
function icdBlocks(H, Pp, TB, B, sec){
  const cs = allConns(); if(!cs.length) return sec;
  H(1, `${++sec}. Arayüz kontrol dokümanı (ICD)`);
  Pp(`Modelde ${cs.length} arayüz (connector) tanımlıdır. Yönler port yönlerinden veya arayüz bloklarının akış özelliklerinden türetilmiştir.`);
  const ids = new Map(); icdContexts().forEach(b => ids.set(b.id, b));
  ids.forEach(b => {
    const L = cs.filter(c => c.owner === b.id).sort((x, y) => COLL.compare(x.icdId || 'ZZ', y.icdId || 'ZZ')); if(!L.length) return;
    H(2, nm(b) + ' arayüzleri');
    TB(['ID', 'Arayüz', 'Kaynak → Hedef', 'Arayüz bloğu / akış öğeleri', 'Tür', 'Protokol / konnektör', 'Özellikler'], L.map(c => { const a = cEnd(c, 0), b0 = cEnd(c, 1), d = cFlowDir(a, b0); const fl = [...new Map(portFlows(a.port).concat(portFlows(b0.port)).map(x => [x.name, x])).values()]; return [c.icdId || '', c.name || '', a.label + (d > 0 ? ' → ' : d < 0 ? ' ← ' : ' ↔ ') + b0.label, [...new Set([a.port, b0.port].filter(p => p && p.type && E(p.type)).map(p => typeName(p.type)))].join(', ') + (fl.length ? '\n' + fl.map(x => `${x.dir} ${x.name}${x.type ? ' : ' + x.type : ''}${x.unit ? ' [' + x.unit + ']' : ''}`).join('\n') : '') + (c.items ? '\n+ ' + c.items : ''), c.ifType || '', [c.proto, c.conn].filter(Boolean).join(' / '), c.spec || '']; }), [8, 13, 22, 23, 11, 12, 11]);
  });
  const bad = cs.filter(c => icdIssues(c).some(q => q[0] !== 'bilgi'));
  if(bad.length){ H(2, 'Arayüz uyum bulguları'); TB(['ID', 'Arayüz', 'Bulgu'], bad.flatMap(c => icdIssues(c).filter(q => q[0] !== 'bilgi').map(q => [c.icdId || '', c.name || '', q[0] + ': ' + q[1]])), [12, 25, 63]); }
  return sec;
}
async function icdDocx(){
  const B = [], H = (lv, x) => B.push({t:'h', lv, x}), Pp = (x, st) => B.push({t:'p', x, st}), TB = (head, rows, w) => B.push({t:'table', head, rows, w});
  icdBlocks(H, Pp, TB, B, 0);
  const D = n2Data(); if(D.nodes.length && D.nodes.length <= 12){ H(1, `${B.filter(b => b.t === 'h' && b.lv === 1).length + 1}. N² matrisi`); TB([''].concat(D.nodes.map(n => n.name)), D.nodes.map(r => [r.name].concat(D.nodes.map(c0 => r === c0 ? '■' : (D.cells.get(r.id + '|' + c0.id) || []).map(x => (x.bi ? '↔ ' : '') + (x.c.icdId || x.c.name || '') + (cItems(x.c).length ? ': ' + cItems(x.c).map(q => q.name).join(', ') : '')).join('\n')))), [16].concat(D.nodes.map(() => Math.floor(84 / D.nodes.length)))); }
  download(await buildDocx(B, {kind:'icd', title:E(M.rootId).name + ' Arayüz Kontrol Dokümanı', subtitle:'Arayüz Kontrol Dokümanı (ICD)', author:userName(), land:true}), fileSafe(E(M.rootId).name) + ' - ICD.docx');
}
Object.assign(VIEWS, {
  '@icd':{tr:'Arayüz Kontrol Tablosu (ICD)', ic:'ICD', note:'Her IBD bağlantısı (connector) bir arayüz satırıdır. Kaynak/hedef, yön, arayüz bloğu ve akış öğeleri modelden gelir; arayüz ID, tür, protokol, konnektör ve özellikleri tabloda yazın.<br><br><b>Uyum</b> sütunu yön çelişkisi, eksik/eşleşmeyen akış özelliği, tip ve birim uyumsuzluğunu gösterir.', render:icdHTML, bar:() => icdBar(false), status:() => allConns().length + ' arayüz'},
  '@n2':{tr:'N² Arayüz Matrisi', ic:'N²', note:'Köşegende elemanlar, hücrelerde satır elemanından sütun elemanına giden arayüzler (bağlantı ID\'si ve akış öğeleri).<br><br>Bağlam olarak bir blok seçince part düzeyinde, "Tüm model" seçilince blok tipleri düzeyinde gösterilir.', render:n2HTML, bar:() => icdBar(true), status:() => n2Data().nodes.length + ' eleman'}
});
(function(){
  const V = $('#view');
  V.addEventListener('change', ev => {
    if(ST.cur !== '@icd' && ST.cur !== '@n2') return;
    const t = ev.target;
    if(t.dataset.ix){ const [id, k] = t.dataset.ix.split('|'), c = E(id); if(c){ snap(); c[k] = t.value; afterChange(); } return; }
    if(t.dataset.if){ IV[t.dataset.if] = t.type === 'checkbox' ? t.checked : t.value; renderViewBar(); renderView(); }
  });
  V.addEventListener('input', ev => { const t = ev.target; if(t.dataset.if === 'q'){ IV.q = t.value; clearTimeout(t._tm); t._tm = setTimeout(renderView, 250); } });
  V.addEventListener('click', ev => {
    if(ST.cur !== '@icd' && ST.cur !== '@n2') return;
    const t = ev.target; let b;
    if((b = t.closest('[data-ifa]'))){ const a = b.dataset.ifa; if(a === 'icd') openD('@icd'); if(a === 'n2') openD('@n2'); if(a === 'xl') icdXlsx(); if(a === 'docx') icdDocx(); if(a === 'ids'){ snap(); const n = ensureIfIds(); afterChange(); toast(n ? n + ' arayüze ID atandı' : 'Tüm arayüzlerin ID\'si var'); } return; }
    if((b = t.closest('[data-n2c]'))){ const c = E(b.dataset.n2c); if(!c) return; if(ev.detail === 2){ const ds = diagramsShowing(c.id); if(ds.length) openD(ds[0].id); return; } ST.tsel = c.id; revealInTree(c.id); renderProps(); return; }
    if((b = t.closest('[data-ago]')) && b.dataset.ago){ revealInTree(b.dataset.ago); ST.tsel = b.dataset.ago; renderProps(); }
  });
})();
RPT_SECTIONS.push(['icd', 'Arayüz kontrol dokümanı (ICD)']);
VALIDATORS.push((add) => { allConns().forEach(c => icdIssues(c).filter(q => q[0] !== 'bilgi' && !/Yön çelişkisi|Delegasyonda yönler/.test(q[1])).forEach(q => add(q[0], 'Arayüz uyumsuzluğu', c, (c.icdId ? c.icdId + ': ' : '') + q[1]))); });
DEMO_EXT.push(() => {
  allConns().forEach(c => { if(c.name === 'güçHattı') Object.assign(c, {ifType:'Elektriksel (güç)', proto:'MIL-STD-704F', conn:'MIL-DTL-38999 J1', spec:'28 V DC, en çok 10 A'}); if(c.name === 'veriYolu') Object.assign(c, {ifType:'Veri / haberleşme', proto:'RS-422', conn:'D-sub 9 J2', spec:'115200 bit/s, 100 Hz güncelleme', items:'zaman damgası'}); });
  ensureIfIds();
});

