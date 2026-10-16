/* ================= v1.26: SYSML 1.6 NOTASYON VE SEMANTİK DERİNLİK ================= */
var SHAPE_EXT = SHAPE_EXT || {};
Object.assign(KIND, {
  Instance:{tr:'Örnek (Instance)', en:'InstanceSpecification', ic:'In', col:'#3b6ea5', w:200, h:70},
  StateInv:{tr:'Durum Değişmezi', en:'StateInvariant', ic:'{}', col:'#16a085', w:130, h:30},
  DurCons:{tr:'Süre Kısıtı', en:'DurationConstraint', ic:'↕', col:'#16a085', w:90, h:80},
  TimeCons:{tr:'Zaman Kısıtı', en:'TimeConstraint', ic:'⏱', col:'#16a085', w:120, h:24}
});
Object.assign(BASE, {Instance:'örnek', StateInv:'durum', DurCons:'{d ≤ 1 s}', TimeCons:'{t ≤ 5 s}'});
['Model', 'Package'].forEach(k => { if(OWN[k] && !OWN[k].includes('Instance')) OWN[k].push('Instance'); });
OWN.Instance = ['Instance'];
if(OWN.Interaction) ['StateInv', 'DurCons', 'TimeCons'].forEach(k => { if(!OWN.Interaction.includes(k)) OWN.Interaction.push(k); });
if(OWN.Port){ if(!OWN.Port.includes('Port')) OWN.Port.push('Port'); } else OWN.Port = ['Port'];
RANK.push('Instance', 'StateInv', 'DurCons', 'TimeCons');
if(!DT.bdd.shapes.includes('Instance')) DT.bdd.shapes.splice(DT.bdd.shapes.indexOf('Comment'), 0, 'Instance');
['StateInv', 'DurCons', 'TimeCons'].forEach(k => { if(!DT.sd.shapes.includes(k)) DT.sd.shapes.splice(DT.sd.shapes.indexOf('Comment') < 0 ? DT.sd.shapes.length : DT.sd.shapes.indexOf('Comment'), 0, k); });
MANI_PREF.sd = ['MsgSync', 'MsgAsync', 'MsgReply'];
Object.assign(FILL, {Instance:'#eef4fb', StateInv:'#ffffff'});

/* ---------- çizim: yeni şekiller ---------- */
const instClassifier = i => E(i.classifier);
function instSlots(i){ const b = instClassifier(i); if(!b) return []; const vs = []; const seen = new Set(); const walk = (bb, g) => { if(!bb || g > 6) return; kidsOf(bb.id).filter(v => v.kind === 'Value').forEach(v => { if(!seen.has(v.name)){ seen.add(v.name); vs.push(v); } }); Object.values(M.els).filter(r => r.kind === 'Generalization' && r.src === bb.id).forEach(r => walk(E(r.tgt), g + 1)); }; walk(b, 0); return vs; }
const slotVal = (i, v) => { const s = i.slots || {}; return s[v.id] != null && s[v.id] !== '' ? s[v.id] : (s[v.name] != null ? s[v.name] : ''); };
SHAPE_EXT.Instance = (sh, e, d, x, y, SW, fill) => {
  const b = instClassifier(e), title = (e.name || '') + ' : ' + (b ? b.name : '?'), kd = kidsOf(e.id).some(c => c.kind === 'Instance'), sl = instSlots(e).map(v => { const val = slotVal(e, v), ru = val === '' && kd ? instRollup(e, v.name) : null; return v.name + ' = ' + (val === '' ? (ru != null ? 'Σ ' + fmtNum(ru) : (v.def != null && v.def !== '' ? v.def : '—')) : val) + (v.unit ? ' ' + v.unit : ''); });
  const need = snapv(30 + Math.max(1, sl.length) * 15 + (sl.length ? 10 : 0)); if(sh.h < need) sh.h = need;
  const wneed = Math.max(tw(title, true) + 24, ...sl.map(t => tw(t, false, 11) + 20)); if(sh.w < wneed) sh.w = Math.ceil(wneed / G) * G;
  let s = `<rect x="${x}" y="${y}" width="${sh.w}" height="${sh.h}" fill="${fill}" ${SW}/>` + T(title, x + sh.w / 2, y + 18, {bold:1}) + `<line x1="${x + sh.w / 2 - tw(title, true) / 2}" y1="${y + 21}" x2="${x + sh.w / 2 + tw(title, true) / 2}" y2="${y + 21}" stroke="#333" stroke-width="1"/>`;
  if(sl.length){ s += `<line x1="${x}" y1="${y + 28}" x2="${x + sh.w}" y2="${y + 28}" stroke="${STROKE}" stroke-width="1"/>`; sl.forEach((t, i) => { s += T(t, x + 8, y + 43 + i * 15, {anchor:'start', size:11}); }); }
  return s;
};
SHAPE_EXT.StateInv = (sh, e, d, x, y, SW) => `<rect x="${x}" y="${y}" width="${sh.w}" height="${sh.h}" rx="${Math.min(14, sh.h / 2)}" fill="#fff" ${SW}/>` + T('{' + (e.name || '') + '}', x + sh.w / 2, y + sh.h / 2 + 4, {size:11.5});
SHAPE_EXT.DurCons = (sh, e, d, x, y, SW) => { const cx = x + 10; return `<rect x="${x}" y="${y}" width="${sh.w}" height="${sh.h}" fill="transparent" stroke="none"/><path d="M${cx + 6} ${y}H${cx}V${y + sh.h}H${cx + 6}" fill="none" stroke="${STROKE}" stroke-width="1.2" stroke-dasharray="4 2"/><path d="M${cx - 4} ${y + 6}l4-6 4 6M${cx - 4} ${y + sh.h - 6}l4 6 4-6" fill="none" stroke="${STROKE}" stroke-width="1.1"/>` + T(e.name || '', cx + 8, y + sh.h / 2 + 4, {anchor:'start', size:11.5}); };
SHAPE_EXT.TimeCons = (sh, e, d, x, y, SW) => `<rect x="${x}" y="${y}" width="${sh.w}" height="${sh.h}" fill="transparent" stroke="none"/><line x1="${x}" y1="${y + sh.h / 2}" x2="${x + 14}" y2="${y + sh.h / 2}" stroke="${STROKE}" stroke-width="1.4"/>` + T(e.name || '', x + 18, y + sh.h / 2 + 4, {anchor:'start', size:11.5});
function shapeExtras(sh, e, d, x, y){
  let s = '';
  if(e.kind === 'Lifeline' && e.destroyed){ const cx = x + sh.w / 2, by = y + sh.h; s += `<path d="M${cx - 9} ${by - 9}l18 18M${cx + 9} ${by - 9}l-18 18" stroke="${STROKE}" stroke-width="2"/>`; }
  if(e.kind === 'Object' && e.okind) s += T('«' + e.okind + '»', x + sh.w / 2, y + 11, {italic:1, size:9.5, fill:'#555'});
  if((e.kind === 'Pin' || e.kind === 'ActParam' || e.kind === 'Object') && e.stream) s += T('{stream}', x + sh.w / 2, y + sh.h + 12, {size:10, fill:'#555', halo:1});
  if(e.kind === 'Port' && kidsOf(e.id).some(c => c.kind === 'Port')) s += `<rect x="${x + 3}" y="${y + 3}" width="${sh.w - 6}" height="${sh.h - 6}" fill="none" stroke="${STROKE}" stroke-width=".9"/>`;
  return s;
}
/* ---------- bağlantı süsleri: taşınan öğeler (item flow), uç rol/çokluk, yönlülük, found/lost ---------- */
const convOf = r => (r.conv || []).map(E).filter(Boolean);
function edgeExtras(d, ed, r, kind, pts, ec){
  let s = '';
  const n = pts.length; if(n < 2) return s;
  if(['Connector', 'Association', 'ObjectFlow', 'Composition', 'Aggregation'].includes(kind) && (convOf(r).length || r.fdir)){
    let li = 0, lm = -1; for(let i = 0; i < n - 1; i++){ const L = Math.hypot(pts[i].x - pts[i + 1].x, pts[i].y - pts[i + 1].y); if(L > lm){ lm = L; li = i; } }
    const a = pts[li], b = pts[li + 1], L = Math.hypot(b.x - a.x, b.y - a.y) || 1, ux = (b.x - a.x) / L, uy = (b.y - a.y) / L, mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2, nx = -uy, ny = ux;
    const tri = (sg, off) => { const cx = mx + ux * off, cy = my + uy * off, P = (t, q) => (cx + ux * t * sg + nx * q).toFixed(1) + ',' + (cy + uy * t * sg + ny * q).toFixed(1); return `<polygon points="${P(7, 0)} ${P(-5, 6)} ${P(-5, -6)}" fill="${ec}"/>`; };
    const dir = r.fdir || 's>t';
    if(dir === 's>t' || dir === 'both') s += tri(1, dir === 'both' ? 9 : 0);
    if(dir === 't>s' || dir === 'both') s += tri(-1, dir === 'both' ? -9 : 0);
    const names = convOf(r).map(x => x.name);
    if(names.length){ const vert = Math.abs(ux) < Math.abs(uy), t = '«flow» ' + names.join(', '); s += vert ? T(t, mx - 10, my + 4, {anchor:'end', size:10.5, italic:1, halo:1, fill:'#1f6b7a'}) : T(t, mx, my + 18, {size:10.5, italic:1, halo:1, fill:'#1f6b7a'}); }
  }
  if(['Association', 'Composition', 'Aggregation'].includes(kind)){
    const lab = (p, q, txt, side) => { if(!txt) return ''; const dx = p.x - q.x, dy = p.y - q.y, L = Math.hypot(dx, dy) || 1, lx = p.x - dx / L * 18 + (-dy / L) * 11 * side, ly = p.y - dy / L * 18 + (dx / L) * 11 * side; return T(txt, lx, ly + 4, {anchor:Math.abs(dy) > Math.abs(dx) ? (side > 0 ? 'start' : 'end') : 'middle', size:10.5, halo:1, fill:'#333'}); };
    const sTxt = [r.srcRole, r.srcMult ? '[' + r.srcMult + ']' : ''].filter(Boolean).join(' ');
    s += lab(pts[0], pts[1], sTxt, -1);
    if(kind === 'Association'){ const tTxt = [r.tgtRole, r.tgtMult ? '[' + r.tgtMult + ']' : ''].filter(Boolean).join(' '); s += lab(pts[n - 1], pts[n - 2], tTxt, -1); }
    if(kind === 'Association' && (r.nav === 'tgt' || r.nav === 'both')) s += head('open', pts[n - 1], pts[n - 2], 1, ec);
    if(kind === 'Association' && (r.nav === 'src' || r.nav === 'both')) s += head('open', pts[0], pts[1], 1, ec);
  }
  return s;
}
/* found / lost mesaj: aynı yaşam çizgisinde, uçta dolu daire */
function flPts(r, pts){
  if(!r || !r.fl || !pts.length) return null;
  const x = pts[0].x, y = pts[0].y;
  return r.fl === 'found' ? [{x:x - 130, y}, {x, y}] : [{x, y}, {x:x + 130, y}];
}
const flDot = (r, pts, ec) => { const p = r.fl === 'found' ? pts[0] : pts[pts.length - 1]; return `<circle cx="${p.x}" cy="${p.y}" r="5" fill="${ec}"/>`; };
/* ---------- yeni özellik paneli alanları ---------- */
const MULTS2 = ['', '1', '0..1', '0..*', '1..*', '*'];
function relPropsHTML(el){
  const k = el.kind; let h = '';
  const pf = (l, c) => `<div class="pf"><label>${l}</label><div>${c}</div></div>`, ml = f => `<input data-f="${f}" list="mlist" value="${esc(el[f] || '')}" placeholder="ör. 0..*" style="width:90px">`;
  if(['Association', 'Composition', 'Aggregation'].includes(k)){
    h += `<div class="sub"><span>Uçlar</span></div><datalist id="mlist">${MULTS2.slice(1).map(m => `<option value="${m}">`).join('')}</datalist>`;
    h += pf(k === 'Association' ? 'Kaynak rolü' : 'Bütün rolü', `<input data-f="srcRole" value="${esc(el.srcRole || '')}">`) + pf(k === 'Association' ? 'Kaynak çokluğu' : 'Bütün çokluğu', ml('srcMult'));
    if(k === 'Association') h += pf('Hedef rolü', `<input data-f="tgtRole" value="${esc(el.tgtRole || '')}">`) + pf('Hedef çokluğu', ml('tgtMult')) + pf('Yönlülük', `<select data-f="nav"><option value="">Yönsüz</option><option value="tgt"${el.nav === 'tgt' ? ' selected' : ''}>Hedefe yönlü</option><option value="src"${el.nav === 'src' ? ' selected' : ''}>Kaynağa yönlü</option><option value="both"${el.nav === 'both' ? ' selected' : ''}>İki yönlü</option></select>`);
  }
  if(['Connector', 'Association', 'ObjectFlow'].includes(k)){
    const cv = convOf(el);
    h += `<div class="sub"><span>Taşınan öğeler (item flow)</span><button data-conv="${el.id}">+ / −</button></div>` + (cv.length ? cv.map(x => `<div class="li noi18n">${icon(x)} ${esc(x.name)} <span class="muted">${esc(KIND[x.kind].tr)}</span></div>`).join('') : '<div class="muted" style="font-size:12px">Taşınan öğe yok</div>');
    h += pf('Akış yönü', `<select data-f="fdir"><option value="">—</option><option value="s>t"${el.fdir === 's>t' ? ' selected' : ''}>kaynak → hedef</option><option value="t>s"${el.fdir === 't>s' ? ' selected' : ''}>hedef → kaynak</option><option value="both"${el.fdir === 'both' ? ' selected' : ''}>iki yönlü</option></select>`);
  }
  if(isMsg(k)) h += pf('Mesaj ucu', `<select data-f="fl"><option value="">Normal</option><option value="found"${el.fl === 'found' ? ' selected' : ''}>Bulunan (found) — kaynağı bilinmeyen</option><option value="lost"${el.fl === 'lost' ? ' selected' : ''}>Kayıp (lost) — hedefe ulaşmayan</option></select>`);
  return h;
}
function nodePropsHTML(el){
  const pf = (l, c) => `<div class="pf"><label>${l}</label><div>${c}</div></div>`; let h = '';
  if(el.kind === 'Object') h += pf('Nesne türü', `<select data-f="okind"><option value="">Nesne düğümü</option><option value="datastore"${el.okind === 'datastore' ? ' selected' : ''}>«datastore» (kalıcı veri deposu)</option><option value="centralBuffer"${el.okind === 'centralBuffer' ? ' selected' : ''}>«centralBuffer» (ara tampon)</option></select>`);
  if(['Pin', 'ActParam', 'Object'].includes(el.kind)) h += pf('{stream}', `<label class="vchk"><input type="checkbox" data-f="stream"${el.stream ? ' checked' : ''}> sürekli akış (streaming)</label>`);
  if(el.kind === 'Lifeline') h += pf('Yok etme', `<label class="vchk"><input type="checkbox" data-f="destroyed"${el.destroyed ? ' checked' : ''}> yaşam çizgisi sonunda yok edilir (✕)</label>`);
  if(el.kind === 'UseCase') h += pf('Ana senaryo', `<textarea data-f="scn" rows="6" placeholder="Her satır bir adım; ör.&#10;Operatör: Sistemi başlatır&#10;Sistem: Kendi kendine test yapar&#10;Sistem → Operatör: Hazır durumunu bildirir">${esc(el.scn || '')}</textarea>`) + pf('', `<button class="pbtn" data-ucgen="act|${el.id}">Aktivite senaryosu üret</button> <button class="pbtn" data-ucgen="sd|${el.id}">Sequence senaryosu üret</button>`);
  if(el.kind === 'Port') h += `<div class="sub"><span>İç içe portlar (${kidsOf(el.id).filter(c => c.kind === 'Port').length})</span><button data-subport="${el.id}">+ Alt port</button></div>` + kidsOf(el.id).filter(c => c.kind === 'Port').map(c => `<div class="li noi18n"><a class="lnk" data-goto="${c.id}">${esc(portLabel(c))}</a></div>`).join('');
  if(el.kind === 'Block') h += pf('', `<button class="pbtn" data-instgen="${el.id}">Örnek ağacı üret (instantiate)</button>`);
  return h;
}
PROPS_EXT.Instance = (el, pf) => {
  const bs = Object.values(M.els).filter(e => e.kind === 'Block').sort(sortEls);
  let h = pf('Sınıflandırıcı', `<select data-f="classifier" class="noi18n"><option value="">(yok)</option>${bs.map(b => `<option value="${b.id}"${b.id === el.classifier ? ' selected' : ''}>${esc(b.name)}</option>`).join('')}</select>`);
  const sl = instSlots(el); h += `<div class="sub"><span>Slotlar (${sl.length})</span></div>` + (sl.length ? sl.map(v => pf(esc(v.name) + (v.unit ? ' [' + esc(v.unit) + ']' : ''), `<input data-slot="${el.id}|${v.id}" value="${esc(slotVal(el, v))}" placeholder="${esc(v.def || '')}">`)).join('') : '<div class="muted" style="font-size:12px">Sınıflandırıcının value property\'si yok</div>');
  return h + pf('', `<button class="pbtn" data-openview="@instances">Örneklem tablosunda aç</button>`);
};
HOOKS.props.push(function(){
    const t = typeof propTarget === 'function' ? propTarget() : {}, el = t.el; if(!el || !el.id || !E(el.id) || (typeof bulkTargets === 'function' && bulkTargets())) return;
    const extra = (KIND[el.kind] && KIND[el.kind].rel ? relPropsHTML(el) : nodePropsHTML(el)); if(!extra) return;
    const P = $('#props'), wu = P.querySelector('details.wu'); if(wu) wu.insertAdjacentHTML('beforebegin', extra); else P.insertAdjacentHTML('beforeend', extra);
  });
/* ---------- örnek (instance) ağacı ---------- */
function multCount(m){ m = String(m || '').trim(); if(!m) return 1; const r = m.match(/^(\d+)\s*\.\.\s*(\d+|\*)$/); if(r) return r[2] === '*' ? Math.max(1, +r[1]) : +r[2]; if(/^\d+$/.test(m)) return +m; return 1; }
function instantiate(blockId, ownerId){
  const b = E(blockId); if(!b) return null; let n = 0;
  const mkI = (blk, owner, name, part, depth, path) => {
    const i = mk('Instance', owner, {name, classifier:blk.id, part:part ? part.id : '', slots:{}}); n++;
    instSlots(i).forEach(v => { if(v.def != null && v.def !== '') i.slots[v.id] = v.def; });
    if(depth > 7 || path.has(blk.id) || n > 400) return i;
    const P = new Set(path); P.add(blk.id);
    kidsOf(blk.id).filter(p => p.kind === 'Part' && E(p.type) && E(p.type).kind === 'Block').forEach(p => { const c = Math.min(20, multCount(p.mult)); for(let k = 0; k < c; k++) mkI(E(p.type), i.id, (p.name || lcFirst(E(p.type).name)) + (c > 1 ? '[' + (k + 1) + ']' : ''), p, depth + 1, P); });
    return i;
  };
  const root = mkI(b, ownerId || findOrMkPkg(M.rootId, 'Örnekler'), uniqName(lcFirst(b.name) + '1', ownerId || findOrMkPkg(M.rootId, 'Örnekler')), null, 0, new Set());
  return {root, n};
}
let IV2 = {root:null};
const instRoots = () => Object.values(M.els).filter(e => e.kind === 'Instance' && !(E(e.owner) && E(e.owner).kind === 'Instance')).sort(sortEls);
function instTree(root){ const out = []; const rec = (i, dp) => { out.push({i, dp}); kidsOf(i.id).filter(c => c.kind === 'Instance').sort((a, b) => COLL.compare(a.name || '', b.name || '')).forEach(c => rec(c, dp + 1)); }; rec(root, 0); return out; }
function instRollup(i, vname){ const own = instSlots(i).find(v => v.name === vname); const v0 = own ? numOf(slotVal(i, own)) : null; const kids = kidsOf(i.id).filter(c => c.kind === 'Instance'); if(!kids.length) return v0; let sum = 0, any = false; kids.forEach(c => { const x = instRollup(c, vname); if(x != null){ sum += x; any = true; } }); return any ? sum : v0; }
function instancesHTML(){
  const roots = instRoots();
  if(!roots.length) return `<div class="vempty">Henüz örnek (instance) yok.<br><br><button class="vb pri" data-ix="gen">Bloktan örnek ağacı üret…</button><br><br><span class="muted">Bir bloğun kompozisyon (part) ağacından tek tıkla örnek ağacı üretilir; her örneğin slotlarına (value property değerleri) değer girilir ve sayısal değerler üst örneklere toplanır.</span></div>`;
  let r = E(IV2.root); if(!r || r.kind !== 'Instance') r = roots[0]; IV2.root = r.id;
  const rows = instTree(r), cols = []; rows.forEach(({i}) => instSlots(i).forEach(v => { if(!cols.includes(v.name)) cols.push(v.name); }));
  let h = `<table class="rt fmt"><thead><tr><th>Örnek</th><th>Sınıflandırıcı</th>${cols.map(c => `<th class="noi18n">${esc(c)}</th>`).join('')}</tr></thead><tbody>`;
  rows.forEach(({i, dp}) => {
    const sl = instSlots(i), kidsI = kidsOf(i.id).some(c => c.kind === 'Instance');
    h += `<tr data-row="${i.id}" class="${ST.tsel === i.id ? 'sel' : ''}"><td class="noi18n" style="padding-left:${8 + dp * 18}px;white-space:nowrap">${dp ? '└ ' : ''}<b>${esc(i.name || '')}</b></td><td class="noi18n">${esc((instClassifier(i) || {}).name || '—')}</td>`;
    cols.forEach(c => { const v = sl.find(x => x.name === c); if(!v){ h += '<td class="muted">·</td>'; return; } const own = slotVal(i, v), ru = kidsI ? instRollup(i, c) : null; h += `<td><input class="fmsel" data-slot="${i.id}|${v.id}" value="${esc(own)}" placeholder="${esc(ru != null && own === '' ? 'Σ ' + fmtNum(ru) : (v.def || ''))}" style="width:90px">${kidsI && ru != null ? `<div class="muted" style="font-size:10.5px">Σ ${esc(fmtNum(ru))}${v.unit ? ' ' + esc(v.unit) : ''}</div>` : ''}</td>`; });
    h += '</tr>';
  });
  return h + `</tbody></table><div class="vfoot">${rows.length} örnek · Boş slotlar alt örneklerin toplamını (Σ) gösterir; sayısal değerler yukarı toplanır. Değer girildikçe kaydedilir.</div>`;
}
function instancesBar(){ const roots = instRoots(); return `<label>Kök örnek <select data-ixf="root" class="noi18n">${roots.map(r => `<option value="${r.id}"${r.id === IV2.root ? ' selected' : ''}>${esc(r.name + ' : ' + ((instClassifier(r) || {}).name || '?'))}</option>`).join('')}</select></label><button class="vb pri" data-ix="gen">Bloktan örnek ağacı üret…</button><span class="vsep"></span><button class="vb" data-ix="xl">⤒ Excel'e aktar</button>`; }
function instGenDialog(bid){
  const bs = Object.values(M.els).filter(e => e.kind === 'Block' && kidsOf(e.id).some(p => p.kind === 'Part')).sort(sortEls); if(!bs.length) return toast('Part\'ı olan blok yok');
  quickForm('Örnek ağacı üret (instantiate)', [{k:'b', l:'Blok', t:'select', v:bid || bs[0].id, opts:bs.map(b => [b.id, pathOf(b.id)])}], v => { snap(); const r = instantiate(v.b); afterChange(); IV2.root = r.root.id; openD('@instances'); renderViewBar(); renderView(); toast(`${r.n} örnek oluşturuldu`); }, 'Bloğun part ağacı çokluklarıyla (ör. [2]) örnek ağacına dönüştürülür; slotlar varsayılan değerlerle doldurulur.');
}
function instXlsx(){
  const r = E(IV2.root); if(!r) return toast('Örnek yok');
  const rows = instTree(r), cols = []; rows.forEach(({i}) => instSlots(i).forEach(v => { if(!cols.includes(v.name)) cols.push(v.name); }));
  const X = [['Örnek', 'Sınıflandırıcı'].concat(cols).map(v => ({v, s:1}))];
  rows.forEach(({i, dp}) => { const sl = instSlots(i), kd = kidsOf(i.id).some(c => c.kind === 'Instance'); X.push([' '.repeat(dp * 3) + (i.name || ''), (instClassifier(i) || {}).name || ''].concat(cols.map(c => { const v = sl.find(x => x.name === c); if(!v) return ''; const o = slotVal(i, v); if(o !== '') return isNaN(numOf(o)) || numOf(o) == null ? o : numOf(o); const ru = kd ? instRollup(i, c) : null; return ru == null ? '' : {v:ru, s:5}; }))); });
  download(buildXlsx([{name:'Örneklem Tablosu', rows:X, widths:[34, 22].concat(cols.map(() => 13)), header:true, freeze:[1, 1]}]), fileSafe(E(M.rootId).name) + ' - Örneklem Tablosu.xlsx');
}
VIEWS['@instances'] = {tr:'Örneklem Tablosu (Instance)', ic:'In', note:'Örnek (instance) ağacı: her satır bir örnek, sütunlar value property slotlarıdır.<br><br>Bir bloğun part ağacından <b>tek tıkla</b> örnek ağacı üretin; farklı konfigürasyonlar için birden çok kök örnek oluşturup değerlerini karşılaştırın. Boş slotlar alt örneklerin toplamını (Σ) gösterir.', render:instancesHTML, bar:instancesBar, status:() => instRoots().length + ' kök örnek'};
GO_EXT.Instance = e => { let r = e; while(E(r.owner) && E(r.owner).kind === 'Instance') r = E(r.owner); IV2.root = r.id; ST.tsel = e.id; openD('@instances'); };
/* ---------- kullanım senaryosundan senaryo diyagramı ---------- */
function ucSteps(uc){ return String(uc.scn || '').split(/\n+/).map(l => l.replace(/^\s*\d+[.)]\s*/, '').trim()).filter(Boolean); }
function ucParticipants(uc){
  const els = Object.values(M.els), acts = els.filter(r => r.kind === 'Association' && (r.src === uc.id || r.tgt === uc.id)).map(r => E(r.src === uc.id ? r.tgt : r.src)).filter(x => x && x.kind === 'Actor');
  let sys = null; const sh = els.filter(d => d.kind === 'Diagram' && d.dtype === 'uc').map(d => { const s = d.shapes.find(x => x.el === uc.id); return s && s.parent ? E(shapeOf(d, s.parent).el) : null; }).find(Boolean);
  if(sh) sys = els.find(b => b.kind === 'Block' && b.name === sh.name) || null;
  return {acts, sys, sysName:sh ? sh.name : 'Sistem'};
}
function ucGenerate(uc, kind){
  let steps = ucSteps(uc); const P = ucParticipants(uc);
  if(!steps.length) steps = [(P.acts[0] ? P.acts[0].name : 'Aktör') + ': ' + uc.name + ' işlemini başlatır', P.sysName + ': isteği işler', P.sysName + ' → ' + (P.acts[0] ? P.acts[0].name : 'Aktör') + ': sonucu bildirir'];
  const al = n => n && /^(sistem|system)$/i.test(n) ? P.sysName : n;
  const parse = l => { let m = l.match(/^(.+?)\s*(?:→|->)\s*(.+?)\s*:\s*(.+)$/); if(m) return {a:al(m[1].trim()), b:al(m[2].trim()), t:m[3].trim()}; m = l.match(/^([^:]{1,40}):\s*(.+)$/); if(m) return {a:al(m[1].trim()), b:null, t:m[2].trim()}; return {a:null, b:null, t:l}; };
  snap();
  if(kind === 'act'){
    const d = newDiagramCore(uc.id, 'act', uc.name + ' Senaryosu'), x = 200;
    let prev = addShape(d, mk('Initial', d.owner).id, x + 58, 20, 24, 24), y = 80;
    steps.forEach(l => { const s = parse(l), a = mk('Action', d.owner, {name:(s.a && !/^sistem$/i.test(s.a) && s.a !== P.sysName ? s.a + ': ' : '') + s.t}); const sh = addShape(d, a.id, x, y, 140, 50); connect(d, 'ControlFlow', prev, sh); prev = sh; y += 90; });
    const fin = addShape(d, mk('Final', d.owner).id, x + 57, y, 26, 26); connect(d, 'ControlFlow', prev, fin);
    afterChange(); openD(d.id); fit(); toast(`${steps.length} adımlı aktivite senaryosu oluşturuldu`); return d;
  }
  const d = newDiagramCore(uc.id, 'sd', uc.name + ' Sırası'), names = [];
  const sysN = P.sysName;
  P.acts.forEach(a => names.push(a.name)); steps.forEach(l => { const s = parse(l); [s.a, s.b].forEach(n => { if(n && !names.includes(n)) names.push(n); }); }); if(!names.includes(sysN)) names.splice(P.acts.length, 0, sysN);
  const LL = new Map(); names.forEach((n, i) => { const act = P.acts.find(a => a.name === n), blk = n === sysN ? P.sys : Object.values(M.els).find(b => b.kind === 'Block' && b.name === n); LL.set(n, addShape(d, mk('Lifeline', d.owner, {name:act || blk ? '' : n, type:act ? act.id : blk ? blk.id : null}).id, i * 220, 0, 150, 120 + steps.length * 50)); });
  let y = 80;
  steps.forEach(l => { const s = parse(l); let a = s.a && LL.has(s.a) ? s.a : (P.acts[0] ? P.acts[0].name : names[0]), b = s.b && LL.has(s.b) ? s.b : (a === sysN ? (P.acts[0] ? P.acts[0].name : sysN) : sysN); if(s.a === sysN && !s.b) b = sysN; const ed = connect(d, a === b ? 'MsgSync' : (s.b ? 'MsgAsync' : 'MsgSync'), LL.get(a), LL.get(b)); E(ed.el).name = s.t; ed.y = y; y += 50; });
  afterChange(); openD(d.id); fit(); toast(`${steps.length} mesajlı sequence senaryosu oluşturuldu`); return d;
}
/* ---------- olay işleyiciler ---------- */
(function(){
  const P = $('#props');
  P.addEventListener('click', ev => {
    const c = ev.target.closest('[data-conv]'); if(c){ const r = E(c.dataset.conv); const cands = Object.values(M.els).filter(e => ['Signal', 'Block', 'ValueType', 'InterfaceBlock', 'FlowProp', 'Enumeration'].includes(e.kind)).sort(sortEls); pickList('Taşınan öğeler — ' + (KIND[r.kind].tr), cands, r.conv || [], ids => { snap(); r.conv = ids; if(ids.length && !r.fdir) r.fdir = 's>t'; afterChange(); }); return; }
    const g = ev.target.closest('[data-ucgen]'); if(g){ const [k, id] = g.dataset.ucgen.split('|'); ucGenerate(E(id), k); return; }
    const sp = ev.target.closest('[data-subport]'); if(sp){ snap(); const p = E(sp.dataset.subport), c2 = mk('Port', p.id, {name:uniqName('p', p.id)}); ST.exp.add(p.id); afterChange(); toast('Alt port eklendi: ' + c2.name); return; }
    const ig = ev.target.closest('[data-instgen]'); if(ig){ instGenDialog(ig.dataset.instgen); return; }
  });
  const setSlot = (t) => { const [id, vid] = t.dataset.slot.split('|'), i = E(id); if(!i) return; const v = t.value.trim(); if(((i.slots || {})[vid] || '') === v) return; snap(); i.slots = i.slots || {}; if(v === '') delete i.slots[vid]; else i.slots[vid] = v; afterChange(); };
  P.addEventListener('change', ev => { if(ev.target.dataset.slot) setSlot(ev.target); });
  const V = $('#view');
  V.addEventListener('change', ev => { if(ST.cur !== '@instances') return; const t = ev.target; if(t.dataset.slot) setSlot(t); if(t.dataset.ixf === 'root'){ IV2.root = t.value; renderView(); } });
  V.addEventListener('keydown', ev => { if(ST.cur === '@instances' && ev.target.dataset && ev.target.dataset.slot){ ev.stopPropagation(); if(ev.key === 'Enter') ev.target.blur(); } });
  V.addEventListener('click', ev => { if(ST.cur !== '@instances') return; const b = ev.target.closest('[data-ix]'); if(b){ if(b.dataset.ix === 'gen') instGenDialog(); if(b.dataset.ix === 'xl') instXlsx(); return; } const row = ev.target.closest('tr[data-row]'); if(row && !ev.target.closest('input')){ ST.tsel = row.dataset.row; renderTree(); renderProps(); markSelRow(); } });
})();
/* N² / ICD: taşınan öğeler akış öğelerine katılır */
if(typeof cItems === 'function'){
  const _cItems = cItems;
  cItems = function(c){ const out = _cItems(c), seen = new Set(out.map(x => x.name)); convOf(c).forEach(x => { if(!seen.has(x.name)){ seen.add(x.name); out.push({name:x.name, type:KIND[x.kind].tr, src:'taşınan öğe'}); } }); return out; };
}
/* örnek model */
DEMO_EXT.push(X => {
  const B = n => Object.values(M.els).find(e => e.kind === 'Block' && e.name === n), sig = Object.values(M.els).find(e => e.kind === 'Signal');
  const con = Object.values(M.els).find(r => r.kind === 'Connector' && E(r.src) && E(r.tgt)); if(con && sig){ con.conv = [sig.id]; con.fdir = 's>t'; }
  const as = B('Araç Sistemi'); if(as){ const r = instantiate(as.id); if(r) r.root.name = 'araç1'; }
  const uc = Object.values(M.els).find(e => e.kind === 'UseCase' && e.name === 'Sistemi Başlat'); if(uc) uc.scn = 'Operatör: Sistemi başlatır\nSistem: Kendi kendine test yapar\nSistem → Operatör: Hazır durumunu bildirir';
  X.open.push('@instances');
});

var PAL_EXT = {
  Instance:'<svg width="26" height="18" viewBox="0 0 26 18"><rect x="2" y="2" width="22" height="14" fill="#eef4fb" stroke="#333" stroke-width="1.1"/><line x1="6" y1="7" x2="20" y2="7" stroke="#333" stroke-width="1"/><line x1="2" y1="10" x2="24" y2="10" stroke="#333" stroke-width=".8"/></svg>',
  StateInv:'<svg width="26" height="18" viewBox="0 0 26 18"><rect x="2" y="4" width="22" height="10" rx="5" fill="#fff" stroke="#333" stroke-width="1.1"/><text x="13" y="12" font-size="7" text-anchor="middle">{ }</text></svg>',
  DurCons:'<svg width="26" height="18" viewBox="0 0 26 18"><path d="M12 2H8v14h4" fill="none" stroke="#333" stroke-width="1.1" stroke-dasharray="2 1"/><path d="M5 5l3-3 3 3M5 13l3 3 3-3" fill="none" stroke="#333"/><text x="14" y="12" font-size="7">d</text></svg>',
  TimeCons:'<svg width="26" height="18" viewBox="0 0 26 18"><line x1="3" y1="9" x2="11" y2="9" stroke="#333" stroke-width="1.4"/><text x="13" y="12" font-size="7">{t}</text></svg>'
};

