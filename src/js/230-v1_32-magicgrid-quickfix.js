/* ================= v1.32: MAGICGRID MİMARİ PANOSU, PAKET İSKELETİ, AKTİF DOĞRULAMA VE OTOMATİK ONARIM ================= */
const MG_COLS = [['bb', 'Kara Kutu', 'Problem alanı — sistem dışarıdan'], ['wb', 'Beyaz Kutu', 'Problem alanı — sistem içeriden'], ['sol', 'Çözüm Mimarisi', 'Fiziksel çözüm'], ['ver', 'Doğrulama', 'V&V']];
const MG_ROWS = [['req', 'Gereksinimler'], ['beh', 'Davranış'], ['str', 'Yapı'], ['par', 'Parametreler']];
const MG_SKEL = [
  ['1 Problem Alanı', [['1.1 Kara Kutu', ['Paydaş İhtiyaçları', 'Kullanım Senaryoları', 'Sistem Bağlamı', 'Etkinlik Ölçütleri (MoE)']], ['1.2 Beyaz Kutu', ['Fonksiyonel Analiz', 'Mantıksal Alt Sistemler', 'Alt Sistem MoE']]]],
  ['2 Çözüm Alanı', [['2.1 Sistem Gereksinimleri', []], ['2.2 Alt Sistem Gereksinimleri', []], ['2.3 Fiziksel Mimari', []], ['2.4 Davranış', []], ['2.5 Parametrik Analiz', []]]],
  ['3 Doğrulama ve Geçerleme', [['3.1 Test Durumları', []], ['3.2 Test Kampanyası', []]]]
];
if(typeof UI_RULES !== 'undefined') UI_RULES.unshift([/otomatik düzelt|auto[- ]?fix|quick fix|^düzelt|iskelet|skeleton/i, 'wand']);
const mgPct = (a, b) => b ? Math.round(100 * a / b) : 0;
function mgData(){
  const els = Object.values(M.els), K = k => els.filter(e => e.kind === k), idx = relIdx(), R = k => idx[k] || [];
  const reqs = allReqs().filter(r => typeof activeReq !== 'function' || activeReq(r)), sys = reqs.filter(r => reqLevel(r) === 'Sistem'), sub = reqs.filter(r => reqLevel(r) !== 'Sistem');
  const derivedParents = new Set(R('DeriveReqt').map(r => r.tgt)), satisfied = new Set(R('Satisfy').map(r => r.tgt)), verified = new Set(R('Verify').map(r => r.tgt));
  const ucs = K('UseCase'), acts = K('Actor'), assoc = R('Association');
  const ucOk = ucs.filter(u => String(u.scn || '').trim() || kidsOf(u.id).some(k => ['Activity', 'Interaction', 'StateMachine'].includes(k.kind)) || els.some(d => d.kind === 'Diagram' && d.owner === u.id));
  const actOk = acts.filter(a => assoc.some(r => r.src === a.id || r.tgt === a.id));
  const blocks = K('Block'), typed = new Set(K('Part').filter(p => p.type).map(p => p.type));
  const roots = blocks.filter(b => !typed.has(b.id) && kidsOf(b.id).some(p => p.kind === 'Part'));
  const moe = roots.flatMap(b => kidsOf(b.id).filter(v => v.kind === 'Value')), moeOk = moe.filter(v => numOf(v.def) != null || v.res != null);
  const actsF = K('Activity'), allocSrc = new Set(R('Allocate').map(r => r.src));
  const actOk2 = actsF.filter(a => allocSrc.has(a.id) || kidsOf(a.id).some(n => allocSrc.has(n.id)) || els.some(p => p.kind === 'Partition' && p.owner === a.id && p.represents));
  const logical = blocks.filter(b => typed.has(b.id)), logOk = logical.filter(b => kidsOf(b.id).some(p => p.kind === 'Port'));
  const cprops = K('ConstraintProp'), binds = R('Binding'), cpOk = cprops.filter(c => binds.some(r => r.sp === c.id || r.tp === c.id || kidsOf(c.type || '').some(p => r.src === p.id || r.tgt === p.id)));
  const ports = K('Port'), portOk = ports.filter(p => p.type && E(p.type));
  const conns = R('Connector'), connOk = conns.filter(c => (c.conv && c.conv.length) || (E(c.src) && E(c.src).type) || c.name);
  const stms = K('StateMachine'), lru = logical, lruBeh = lru.filter(b => kidsOf(b.id).some(k => ['StateMachine', 'Activity', 'Interaction'].includes(k.kind)));
  let parOk = 0, parN = 0; parContexts().forEach(b => { try { const r = parSolve(b); parN += r.eqs.length; parOk += r.eqs.filter(q => /çözüldü|sağlanıyor/.test(q.status || '')).length; } catch(e){ appErr('230:28', e); } });
  const tests = allTests ? allTests() : K('TestCase'), done = tests.filter(t => /Geçti|Başarılı|Kabul/i.test(testResult(t) || ''));
  const cell = (pct, info, go, hint) => ({pct:Math.max(0, Math.min(100, pct)), info, go, hint});
  return {
    bb:{
      req:cell(sys.length ? mgPct(sys.filter(r => String(r.srcNo || r.srcText || '').trim() || R('DeriveReqt').some(x => x.src === r.id)).length, sys.length) : 0, `${sys.length} sistem gereksinimi · ${sys.filter(r => String(r.srcNo || '').trim()).length} müşteri isterine bağlı`, '@reqtable', 'Paydaş ihtiyaçlarını (müşteri ister no) gereksinimlere bağlayın'),
      beh:cell(ucs.length ? mgPct(ucOk.length, ucs.length) : 0, `${ucs.length} kullanım senaryosu · ${ucOk.length} senaryolu`, null, 'Use case\'lere ana senaryo veya davranış diyagramı ekleyin'),
      str:cell(acts.length ? Math.round((mgPct(actOk.length, acts.length) + (roots.length ? 100 : 0)) / 2) : (roots.length ? 50 : 0), `${roots.length} sistem bloğu · ${acts.length} aktör (${actOk.length} bağlı)`, null, 'Sistem bağlam bloğu ve aktör ilişkilerini kurun (Bağlam diyagramı üret)'),
      par:cell(moe.length ? mgPct(moeOk.length, moe.length) : 0, `${moe.length} MoE değeri · ${moeOk.length} sayısal`, '@budget', 'Sistem bloğuna etkinlik ölçütü (MoE) value property\'leri ekleyin')
    },
    wb:{
      req:cell(sys.length ? mgPct(sys.filter(r => derivedParents.has(r.id) || satisfied.has(r.id)).length, sys.length) : 0, `${sys.filter(r => derivedParents.has(r.id)).length}/${sys.length} sistem gereksinimi alt sisteme türetilmiş`, '@coverage', 'Sistem gereksinimlerini alt sistem gereksinimlerine türetin'),
      beh:cell(actsF.length ? mgPct(actOk2.length, actsF.length) : 0, `${actsF.length} fonksiyon (aktivite) · ${actOk2.length} tahsisli`, '@alloc', 'Fonksiyonları mantıksal alt sistemlere tahsis edin (Allocate / kulvar)'),
      str:cell(logical.length ? mgPct(logOk.length, logical.length) : 0, `${logical.length} alt sistem bloğu · ${logOk.length} arayüzlü (port)`, '@n2', 'Alt sistem bloklarına port ve arayüz tanımlayın'),
      par:cell(cprops.length ? mgPct(cpOk.length, cprops.length) : 0, `${K('ConstraintBlock').length} kısıt bloğu · ${cpOk.length}/${cprops.length} bağlı kısıt özelliği`, null, 'Kısıt bloklarını parametrik diyagramda bağlayın')
    },
    sol:{
      req:cell(sub.length ? mgPct(sub.filter(r => satisfied.has(r.id)).length, sub.length) : 0, `${sub.length} alt sistem gereksinimi · ${sub.filter(r => satisfied.has(r.id)).length} karşılanmış`, '@matrix', 'Alt sistem gereksinimlerini bloklarla karşılayın (Satisfy)'),
      beh:cell(lru.length ? mgPct(lruBeh.length, lru.length) : (stms.length ? 50 : 0), `${stms.length} durum makinesi · ${lruBeh.length}/${lru.length} bileşen davranışlı`, null, 'Bileşenlere durum makinesi veya sequence ekleyin'),
      str:cell(ports.length + conns.length ? mgPct(portOk.length + connOk.length, ports.length + conns.length) : 0, `${portOk.length}/${ports.length} tipli port · ${connOk.length}/${conns.length} tanımlı bağlantı`, '@icd', 'Portları arayüz bloklarına tipleyin, bağlantılara taşınan öğe ekleyin'),
      par:cell(parN ? mgPct(parOk, parN) : 0, `${parN} denklem · ${parOk} çözülmüş/sağlanan`, '@tradestudy', 'Parametrik hesapla; trade study ile alternatifleri değerlendirin')
    },
    ver:{
      req:cell(reqs.length ? mgPct(reqs.filter(r => verified.has(r.id)).length, reqs.length) : 0, `${reqs.filter(r => verified.has(r.id)).length}/${reqs.length} gereksinim test ile doğrulanıyor`, '@vcrm', 'Her gereksinime doğrulayan test durumu bağlayın'),
      beh:cell(tests.length ? mgPct(tests.filter(t => (t.steps || []).length || (typeof tcSteps === 'function' && tcSteps(t).length)).length, tests.length) : 0, `${tests.length} test · adımlı prosedür`, '@testrun', 'Test prosedür adımlarını tanımlayın'),
      str:cell(tests.length ? mgPct(tests.filter(t => typeof tcArticles === 'function' && tcArticles(t).length).length, tests.length) : 0, `test numunesi atanmış testler`, '@articles', 'Testlere numune (test article) atayın'),
      par:cell(tests.length ? mgPct(done.length, tests.length) : 0, `${done.length}/${tests.length} test başarılı`, '@campaign', 'Test kampanyasını yürütün, sonuçları kaydedin')
    }
  };
}
function mgColor(p){ return p >= 80 ? '#2e9e6a' : p >= 50 ? '#d18a00' : p > 0 ? '#c0392b' : '#9aa4b1'; }
function magicgridHTML(){
  const D = mgData(); let tot = 0, n = 0;
  let h = `<div class="mgw"><table class="mg"><thead><tr><th></th>${MG_COLS.map(c => `<th><b>${esc(c[1])}</b><div class="muted">${esc(c[2])}</div></th>`).join('')}</tr></thead><tbody>`;
  MG_ROWS.forEach(([rk, rl]) => {
    h += `<tr><th class="mgr">${esc(rl)}</th>`;
    MG_COLS.forEach(([ck]) => { const c = D[ck][rk]; tot += c.pct; n++; h += `<td class="mgc"${c.go ? ` data-mggo="${c.go}"` : ''} title="${esc(c.hint)}"><div class="mgp" style="color:${mgColor(c.pct)}">%${c.pct}</div><div class="mgb"><i style="width:${c.pct}%;background:${mgColor(c.pct)}"></i></div><div class="mgi">${esc(c.info)}</div>${c.pct < 80 ? `<div class="muted mgh">→ ${esc(c.hint)}</div>` : ''}</td>`; });
    h += '</tr>';
  });
  h += `</tbody></table>`;
  const colAvg = MG_COLS.map(([ck, cl]) => [cl, Math.round(MG_ROWS.reduce((s, [rk]) => s + D[ck][rk].pct, 0) / MG_ROWS.length)]);
  h += `<div class="mgsum"><b>Genel olgunluk: %${Math.round(tot / n)}</b> · ${colAvg.map(([l, p]) => `${esc(l)} <b style="color:${mgColor(p)}">%${p}</b>`).join(' · ')}</div>`;
  h += `<div class="muted" style="margin-top:6px">Hücreye tıklayarak ilgili görünümü açın. Yüzdeler modeldeki kanıtlardan (izlenebilirlik, tahsis, tipleme, çözüm ve test sonuçları) hesaplanır.</div></div>`;
  return h;
}
function magicgridBar(){ return `<button class="vb pri" data-mga="skel">MagicGrid paket iskeleti kur</button><button class="vb" data-mga="xl">⤒ Excel'e aktar</button>`; }
function mgSkeleton(){
  snap(); let n = 0;
  const ensure = (owner, name) => { let p = kidsOf(owner).find(e => e.kind === 'Package' && e.name === name); if(!p){ p = mk('Package', owner, {name}); n++; } return p; };
  MG_SKEL.forEach(([a, subs]) => { const pa = ensure(M.rootId, a); subs.forEach(([b, leaf]) => { const pb = ensure(pa.id, b); leaf.forEach(c => ensure(pb.id, c)); }); });
  afterChange(); ST.exp.add(M.rootId); renderTree(); toast(n ? `${n} paket oluşturuldu (mevcut olanlar korundu)` : 'MagicGrid iskeleti zaten var');
  return n;
}
function mgXlsx(){
  const D = mgData(), rows = [[''].concat(MG_COLS.map(c => c[1])).map(v => ({v, s:1}))];
  MG_ROWS.forEach(([rk, rl]) => { rows.push([{v:rl, s:1}].concat(MG_COLS.map(([ck]) => D[ck][rk].pct / 100))); rows.push([''].concat(MG_COLS.map(([ck]) => D[ck][rk].info))); });
  download(buildXlsx([{name:'MagicGrid', rows, widths:[18, 34, 34, 34, 34], header:true}]), fileSafe(E(M.rootId).name) + ' - MagicGrid.xlsx');
}
VIEWS['@magicgrid'] = {tr:'MagicGrid Mimari Panosu', ic:'MG', note:'MagicGrid yöntemine göre modelin olgunluğu: <b>Kara Kutu</b> (paydaş ihtiyaçları, kullanım senaryoları, bağlam, MoE), <b>Beyaz Kutu</b> (fonksiyonel analiz, mantıksal alt sistemler), <b>Çözüm Mimarisi</b> ve <b>Doğrulama</b> sütunlarında Gereksinim / Davranış / Yapı / Parametre hücrelerinin tamamlanma yüzdesi.<br><br><b>MagicGrid paket iskeleti kur</b> standart paket yapısını oluşturur.', render:magicgridHTML, bar:magicgridBar, status:() => 'MagicGrid'};
(() => { $('#view').addEventListener('click', ev => { if(ST.cur !== '@magicgrid') return; const a = ev.target.closest('[data-mga]'); if(a){ if(a.dataset.mga === 'skel') mgSkeleton(); if(a.dataset.mga === 'xl') mgXlsx(); return; } const g = ev.target.closest('[data-mggo]'); if(g && VIEWS[g.dataset.mggo]) openD(g.dataset.mggo); }); })();
{
  HOOKS.menu.analysis.push(r => { r.splice(1, 0, {t:'MagicGrid mimari panosu', f:() => openD('@magicgrid')}); });
  HOOKS.menu.tools.push(r => { const i = r.findIndex(x => x && x.h === 'Modelleme yardımcıları'); r.splice(i < 0 ? r.length : i + 1, 0, {t:'MagicGrid mimari panosu', f:() => openD('@magicgrid')}, {t:'MagicGrid paket iskeleti kur', f:mgSkeleton}); });
}
const mgCss = document.createElement('style');
mgCss.textContent = `.mgw{padding:12px 14px}table.mg{border-collapse:collapse;width:100%;table-layout:fixed}table.mg th,table.mg td{border:1px solid var(--line,#d9dde3);padding:8px;vertical-align:top}table.mg thead th{background:var(--panel2,#f3f5f8);text-align:left}table.mg th.mgr{width:120px;background:var(--panel2,#f3f5f8);text-align:left}.mgc{cursor:pointer}.mgc:hover{background:rgba(45,127,249,.06)}.mgp{font-size:22px;font-weight:600}.mgb{height:5px;background:#e3e6ea;margin:3px 0 5px}.mgb i{display:block;height:100%}.mgi{font-size:12px}.mgh{font-size:11px;margin-top:3px}.mgsum{margin-top:10px;font-size:13px}`;
document.head.appendChild(mgCss);
/* ---------- otomatik onarım (Quick Fix) ---------- */
const capFirst = s => { s = String(s || '').trim(); return s ? s.charAt(0).toLocaleUpperCase('tr') + s.slice(1) : s; };
function actDiagram(aid){ return Object.values(M.els).find(d => d.kind === 'Diagram' && d.owner === aid && (d.dtype === 'act' || d.dtype === 'stm')); }
function fixAddNode(owner, kind, link){
  const d = actDiagram(owner.id), n = mk(kind, owner.id, {name:''});
  const isSm = owner.kind === 'StateMachine', fk = isSm ? 'Transition' : 'ControlFlow';
  if(d){
    const shs = d.shapes.filter(s => E(s.el) && E(s.el).owner === owner.id);
    const x0 = shs.length ? Math.min(...shs.map(s => s.x)) : 40, y0 = shs.length ? Math.min(...shs.map(s => s.y)) : 40, y1 = shs.length ? Math.max(...shs.map(s => s.y + s.h)) : 200;
    const sh = addShape(d, n.id, kind === 'Initial' ? x0 : x0, kind === 'Initial' ? Math.max(0, y0 - 70) : y1 + 50);
    link.forEach(id => { const o = d.shapes.find(s => s.el === id); if(o) connect(d, fk, kind === 'Initial' ? sh : o, kind === 'Initial' ? o : sh); });
  } else link.forEach(id => mk(fk, owner.id, kind === 'Initial' ? {src:n.id, tgt:id} : {src:id, tgt:n.id}));
  return n;
}
const FIXERS = {
  'Kopuk ilişki':{t:'İlişkiyi sil', f:e => { Object.values(M.els).forEach(d => { if(d.kind === 'Diagram') d.edges = d.edges.filter(x => x.el !== e.id); }); delete M.els[e.id]; return true; }},
  'Sahipsiz eleman':{t:'Köke taşı', f:e => { e.owner = M.rootId; return true; }},
  'İsimsiz eleman':{t:'Ad ver', f:e => { e.name = defName(e.kind, e.owner); return true; }},
  'Kopuk çağrı':{t:'Çağrıyı kaldır', f:e => { delete e.behavior; return true; }},
  'Tipsiz part':{t:'Blok oluştur ve tiple', f:e => { const nm0 = capFirst(e.name) || 'Yeni Blok', ex = Object.values(M.els).find(b => b.kind === 'Block' && b.name === nm0); e.type = (ex || mk('Block', nearestPkg(e.owner), {name:nm0})).id; return true; }},
  'Tipsiz port':{t:'Arayüz bloğu oluştur ve tiple', f:e => { const nm0 = capFirst(e.name) + 'Arayüzü', ex = Object.values(M.els).find(b => b.kind === 'InterfaceBlock' && b.name === nm0); e.type = (ex || mk('InterfaceBlock', nearestPkg(e.owner), {name:nm0})).id; return true; }},
  'Tipsiz değer':{t:'Tipi ata', f:e => { const d = String(e.def == null ? '' : e.def).trim(); e.vtype = /^(true|false|doğru|yanlış)$/i.test(d) ? 'Boolean' : /^-?\d+$/.test(d) ? 'Integer' : d && numOf(d) == null ? 'String' : 'Real'; return true; }},
  'Başlangıç düğümü yok':{t:'Başlangıç düğümü ekle', f:a => { const fl = (relIdx().ControlFlow || []).concat(relIdx().ObjectFlow || []); const nodes = kidsOf(a.id).filter(n => ['Action', 'SendSignal', 'AcceptEvent', 'Decision', 'Fork', 'Merge'].includes(n.kind)); const first = nodes.filter(n => !fl.some(f => f.tgt === n.id)); fixAddNode(a, 'Initial', (first.length ? first : nodes).slice(0, 1).map(n => n.id)); return true; }},
  'Bitiş düğümü yok':{t:'Bitiş düğümü ekle', f:a => { const fl = (relIdx().ControlFlow || []).concat(relIdx().ObjectFlow || []); const nodes = kidsOf(a.id).filter(n => ['Action', 'SendSignal', 'AcceptEvent', 'Merge', 'Join'].includes(n.kind)); const last = nodes.filter(n => !fl.some(f => f.src === n.id)); fixAddNode(a, 'Final', (last.length ? last : nodes.slice(-1)).map(n => n.id)); return true; }},
  'Başlangıç durumu yok':{t:'Başlangıç durumu ekle', f:sm => { const st = kidsOf(sm.id).filter(n => n.kind === 'State').sort(sortEls); fixAddNode(sm, 'Initial', st.slice(0, 1).map(s => s.id)); return true; }},
  'Port yön uyumsuzluğu':{t:'Yönü düzelt', f:c => {
    const a = E(c.src), b = E(c.tgt); if(!a || !b) return false; const da = portDir(a), db = portDir(b); if(!da || !db) return false;
    if(c.sp && c.tp){ if(!b.dir && b.type) b.conj = !b.conj; else b.dir = da === 'in' ? 'out' : 'in'; }
    else { const inner = c.sp ? a : b, outer = c.sp ? b : a; if(!inner.dir && inner.type) inner.conj = !inner.conj; else inner.dir = portDir(outer); }
    return true; }}
};
function fixOne(x){ const fx = FIXERS[x.rule], e = E(x.id); if(!fx || !e) return false; try { return fx.f(e) !== false; } catch(err){ console.warn(err); return false; } }
function fixAll(){
  let n = 0, pass = 0;
  snap(); ST.batch = true;
  try { while(pass++ < 3){ const L = validateModel().filter(x => FIXERS[x.rule] && E(x.id)); if(!L.length) break; let k = 0; L.forEach(x => { if(fixOne(x)) k++; }); n += k; if(!k) break; } }
  finally { ST.batch = false; }
  afterChange(); toast(n ? `${n} bulgu otomatik düzeltildi` : 'Otomatik düzeltilebilir bulgu yok'); return n;
}
{
  validationHTML = function(){
    const all = validateModel(), list = all.filter(x => (VD.sev === 'all' || x.sev === VD.sev) && (VD.rule === 'all' || x.rule === VD.rule));
    const nf = all.filter(x => FIXERS[x.rule] && E(x.id)).length;
    let h = '<div class="cards">' + ['hata', 'uyarı', 'bilgi'].map(s => `<div class="card"><div class="cv" style="color:${SEV_COL[s]}">${all.filter(x => x.sev === s).length}</div><div class="ct">${s === 'hata' ? 'Hata' : s === 'uyarı' ? 'Uyarı' : 'Bilgi'}</div></div>`).join('') + `<div class="card"><div class="cv" style="color:#2d7ff9">${nf}</div><div class="ct">Otomatik düzeltilebilir</div></div><div class="card"><div class="cv">${Object.values(M.els).filter(e => !KIND[e.kind].rel).length}</div><div class="ct">Denetlenen eleman</div></div></div>`;
    if(!all.length) return h + '<div class="vempty">Bulgu yok — model tüm kuralları geçti 🎉</div>';
    h += `<table class="rt"><thead><tr><th class="rn">#</th><th>Önem</th><th>Kural</th><th>Eleman</th><th>Açıklama</th><th>Düzelt</th></tr></thead><tbody>` + list.map((x, i) => {
      const e = E(x.id), fx = FIXERS[x.rule] && e;
      return `<tr data-vrow="${x.id || ''}" style="cursor:pointer"><td class="rn">${i + 1}</td><td><span class="stc" style="background:${SEV_COL[x.sev]}">${x.sev}</span></td><td style="white-space:nowrap">${esc(x.rule)}</td><td>${e ? `${icon(e)} <b>${esc(nm(e))}</b><div class="muted" style="font-size:11px">${esc(pathOf(e.owner))}</div>` : '—'}</td><td>${esc(x.msg)}</td><td style="white-space:nowrap">${fx ? `<button class="vb" data-qfix="${i}" title="${esc(FIXERS[x.rule].t)}">${esc(FIXERS[x.rule].t)}</button>` : ''}</td></tr>`;
    }).join('') + '</tbody></table>';
    VD._list = list;
    return h + `<div class="vfoot">${list.length} / ${all.length} bulgu</div>`;
  };
  const _vb = validationBar;
  validationBar = function(){ return _vb() + `<span class="vsep"></span><button class="vb pri" data-qfixall="1" title="Kopuk ilişkiler, tipsiz part/port/değerler, eksik başlangıç/bitiş düğümleri, port yönleri…">Tümünü otomatik düzelt</button>`; };
  VIEWS['@validation'].render = validationHTML;
  document.addEventListener('click', ev => {
    if(ST.cur !== '@validation') return;
    const b = ev.target.closest('[data-qfix]'), all = ev.target.closest('[data-qfixall]');
    if(all){ ev.stopPropagation(); fixAll(); renderView(); return; }
    if(!b) return; ev.stopPropagation();
    const x = (VD._list || [])[+b.dataset.qfix]; if(!x) return;
    snap(); const ok = fixOne(x); afterChange(); renderView(); toast(ok ? 'Düzeltildi: ' + x.rule : 'Düzeltilemedi');
  }, true);
}

