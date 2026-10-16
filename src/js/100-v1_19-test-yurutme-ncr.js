/* ================= v1.19: TEST YÜRÜTME, TEST NUMUNELERİ VE UYGUNSUZLUK (NCR) ================= */
var RPT_EXT = RPT_EXT || [];   /* rapor eklentileri: f(o, H, Pp, TB, B, sec, figRef) → sec */
var REQ_Q_EXT = REQ_Q_EXT || []; /* kalite raporu eklentileri: f(r, out) */
var GO_EXT = GO_EXT || {};     /* çift tık / git: tür → f(e) */
var PROPS_EXT = PROPS_EXT || {}; /* özellik paneli: tür → f(el, pf) → html */
Object.assign(KIND, {
  TestArticle:{tr:'Test Numunesi', en:'TestArticle', ic:'TN', col:'#16a085'},
  NCR:{tr:'Uygunsuzluk (NCR)', en:'NCR', ic:'NC', col:'#c0392b'}
});
Object.assign(BASE, {TestArticle:'Numune', NCR:'Uygunsuzluk'});
['Model', 'Package'].forEach(k => ['TestArticle', 'NCR'].forEach(x => { if(OWN[k] && !OWN[k].includes(x)) OWN[k].push(x); }));
RANK.push('TestArticle', 'NCR');
const TA_ST = ['Hazır', 'Testte', 'Beklemede', 'Arızalı', 'Tamirde', 'Hurda', 'Teslim edildi'];
const TA_COL = {'Hazır':'#2e9e6a', 'Testte':'#5d8fc9', 'Beklemede':'#95a5a6', 'Arızalı':'#c0392b', 'Tamirde':'#d18a00', 'Hurda':'#7f8c8d', 'Teslim edildi':'#16a085'};
const NCR_ST = ['Açık', 'İnceleniyor', 'Düzeltici faaliyet', 'Tekrar test', 'Kapandı'];
const NCR_SEV = ['Kritik', 'Majör', 'Minör'];
const NCR_DISP = ['—', 'Tamir', 'Yeniden işle', 'Olduğu gibi kullan', 'Hurda', 'Tekrar test', 'Tasarım değişikliği'];
const NCR_SEV_COL = {'Kritik':'#c0392b', 'Majör':'#e67e22', 'Minör':'#c9a227'};
const STEP_RES = ['', 'Geçti', 'Kaldı'];
const allArticles = () => Object.values(M.els).filter(e => e.kind === 'TestArticle').sort((a, b) => COLL.compare(a.name || '', b.name || '') || COLL.compare(String(a.sn || ''), String(b.sn || '')));
let NCR_C = null, NCR_REV = -1, NCR_M = null;
const allNCRs = () => { if(NCR_REV !== REV || NCR_M !== M || !NCR_C){ NCR_C = Object.values(M.els).filter(e => e.kind === 'NCR').sort((a, b) => COLL.compare(String(a.ncrId || ''), String(b.ncrId || ''))); NCR_REV = REV; NCR_M = M; } return NCR_C.slice(); };
const ncrOpen = n => (n.nst || 'Açık') !== 'Kapandı';
const taLabel = a => a ? (a.name || 'Numune') + (a.sn ? ' · SN ' + a.sn : '') : '';
const nmx = e => e && KIND[e.kind] ? nm(e) : '';
const tcLabel = t => t ? (t.procNo ? t.procNo + ' · ' : '') + nm(t) : '';
const tcArticles = tc => (tc.articles || []).map(E).filter(x => x && x.kind === 'TestArticle');
const tcSteps = tc => Array.isArray(tc.steps) ? tc.steps : [];
function stepsResult(tc){ const s = tcSteps(tc); if(!s.length || s.some(x => !x.r)) return ''; return s.some(x => x.r === 'Kaldı') ? 'Kaldı' : 'Geçti'; }
function applyStepsResult(tc){ const r = stepsResult(tc); if(r && testResult(tc) !== r){ tc.result = r; if(!tc.rDate) tc.rDate = todayISO(); return r; } return ''; }
const ncrsOfTest = id => allNCRs().filter(n => n.test === id || n.retest === id);
const ncrsOfArticle = id => allNCRs().filter(n => n.article === id);
const articleTests = id => allTests().filter(t => (t.articles || []).includes(id));
function ncrsOfReq(r, tests){ const ts = new Set((tests || []).map(x => x.id)); return allNCRs().filter(n => (n.reqs || []).includes(r.id) || (n.test && ts.has(n.test))); }
const ncrChip = n => `<span class="chip2 ncrc${ncrOpen(n) ? ' op' : ''}" title="${esc((n.name || '') + ' — ' + (n.nst || 'Açık'))}"><a class="lnk" data-ago="${n.id}">${esc(n.ncrId || 'NCR')}</a></span>`;
const sevChip = s => `<span class="stc" style="background:${NCR_SEV_COL[s] || '#95a5a6'}">${esc(s || '—')}</span>`;
function nextNcrId(){ let mx = 0; allNCRs().forEach(n => { const m = String(n.ncrId || '').match(/(\d+)\s*$/); if(m) mx = Math.max(mx, +m[1]); }); return 'NCR-' + String(mx + 1).padStart(3, '0'); }
function ncrPkg(){ const n = allNCRs()[0]; return n && E(n.owner) ? n.owner : findOrMkPkg(M.rootId, 'Uygunsuzluklar'); }
function taPkg(){ const a = allArticles()[0]; return a && E(a.owner) ? a.owner : findOrMkPkg(M.rootId, 'Test Numuneleri'); }
function ncrAdd(extra){ const o = Object.assign({ncrId:nextNcrId(), name:'', desc:'', date:todayISO(), sev:'Majör', disp:'—', nst:'Açık', reqs:[]}, extra || {}); const n = mk('NCR', ncrPkg(), o); n.name = o.name; return n; }
function taAdd(extra){ return mk('TestArticle', taPkg(), Object.assign({name:uniqName('Numune', taPkg()), sn:'', ast:'Hazır'}, extra || {})); }
const idSel = (attr, list, cur, lbl, empty) => `<select class="fmsel noi18n" ${attr}><option value="">${empty || '—'}</option>${list.map(x => `<option value="${x.id}"${x.id === cur ? ' selected' : ''}>${esc(lbl(x))}</option>`).join('')}</select>`;
const strSel = (attr, list, cur, cols) => `<select class="fmsel" ${attr}${cols && cols[cur] ? ` style="color:${cols[cur]};font-weight:600"` : ''}>${list.map(x => `<option value="${esc(x)}"${cur === x ? ' selected' : ''}>${esc(x)}</option>`).join('')}</select>`;
/* tekrar test: testi adımlarıyla (sonuçsuz) kopyala */
function cloneRetest(tc){
  const t2 = mk('TestCase', tc.owner, {name:nm(tc) + ' (tekrar)', procNo:tc.procNo || '', tMethod:tc.tMethod || 'Test', tLevel:tc.tLevel || '', testItem:tc.testItem || '', std:tc.std || '', resp:tc.resp || '', result:'Planlandı', profiles:(tc.profiles || []).slice(), articles:(tc.articles || []).slice(), steps:tcSteps(tc).map(s => ({id:uid(), a:s.a || '', exp:s.exp || ''}))});
  testReqs(tc).forEach(r => addRel('Verify', t2.id, r.id));
  return t2;
}

/* ---------- Test yürütme ---------- */
let TX = {tc:null};
function txTest(){
  let t = E(TX.tc);
  if(!t || t.kind !== 'TestCase'){ const s = E(ST.tsel); t = s && s.kind === 'TestCase' ? s : allTests()[0]; TX.tc = t ? t.id : null; }
  return t;
}
const ce2 = (i, k, s) => `<div class="ce2" contenteditable="true" data-si="${i}" data-sk="${k}">${esc(s[k] || '')}</div>`;
function ncrMini(list){
  return `<table class="rt"><thead><tr><th>ID</th><th>Başlık</th><th>Önem</th><th>Karar / işlem</th><th>Durum</th><th>Tekrar test</th></tr></thead><tbody>` + list.map(n => { const rt = E(n.retest); return `<tr data-row="${n.id}"><td style="white-space:nowrap">${ncrChip(n)}</td><td class="noi18n">${esc(n.name || '')}${n.desc ? `<div class="muted">${esc(n.desc.slice(0, 140))}</div>` : ''}</td><td>${sevChip(n.sev)}</td><td>${esc(n.disp && n.disp !== '—' ? n.disp : '')}</td><td>${esc(n.nst || 'Açık')}</td><td>${rt ? `<a class="lnk noi18n" data-txgo="${rt.id}">${esc(tcLabel(rt))}</a> ${resChip(testResult(rt))}` : '<span class="muted">—</span>'}</td></tr>`; }).join('') + '</tbody></table>';
}
function testrunHTML(){
  const tc = txTest();
  if(!tc) return `<div class="vempty">Henüz test durumu yok.<br><br><button class="vb pri" data-xa="addTest">+ Test durumu ekle</button></div>`;
  const steps = tcSteps(tc), sr = stepsResult(tc), done = steps.filter(s => s.r).length, fail = steps.filter(s => s.r === 'Kaldı').length, ncrs = ncrsOfTest(tc.id), res = testResult(tc), opn = ncrs.filter(ncrOpen).length;
  let h = `<div class="cards"><div class="card"><div class="cv" style="color:${RES_COL[res]}">${esc(res)}</div><div class="ct">Test sonucu</div><div class="cs">${sr ? 'Adımlardan hesaplandı' : steps.length ? 'Adımlar tamamlanmadı' : 'Adım yok'}</div></div>
    <div class="card"><div class="cv">${done} / ${steps.length}</div><div class="ct">Tamamlanan adım</div><div class="cbar"><i style="width:${steps.length ? Math.round(done / steps.length * 100) : 0}%;background:#2e9e6a"></i></div></div>
    <div class="card"><div class="cv" style="color:${fail ? '#c0392b' : '#2e9e6a'}">${fail}</div><div class="ct">Başarısız adım</div></div>
    <div class="card"><div class="cv" style="color:${opn ? '#c0392b' : '#2e9e6a'}">${opn}</div><div class="ct">Açık NCR</div><div class="cs">toplam ${ncrs.length}</div></div></div>`;
  const rs = testReqs(tc), pfs = (tc.profiles || []).map(E).filter(Boolean), arts = tcArticles(tc);
  h += `<div class="trinfo"><div class="trtitle noi18n">${esc(tcLabel(tc))}</div>` + [['Doğrulama seviyesi', tc.tLevel], ['Test edilen birim', tc.testItem], ['Standart / referans', tc.std], ['Plan', [fmtD(tc.pStart), fmtD(tc.pEnd)].filter(Boolean).join(' – ')], ['Sonuç tarihi', fmtD(tc.rDate)], ['Sorumlu', tc.resp], ['Rapor no', tc.reportNo]].map(([k, v]) => `<div><span class="muted">${k}</span><b class="noi18n">${esc(v || '—')}</b></div>`).join('') + `</div>`;
  h += `<div class="trrow"><span class="trl">Numuneler</span><div class="tcell">${arts.map(a => `<span class="chip2 noi18n"><a class="lnk" data-ago="${a.id}">${esc(taLabel(a))}</a></span>`).join('') || '<span class="muted">—</span>'}<button class="tadd" data-tx="arts" title="Numune seç / ekle">+</button></div></div>`;
  h += `<div class="trrow"><span class="trl">Gereksinimler</span><div class="tcell">${rs.map(r => `<span class="chip2" title="${esc(r.text || r.name || '')}"><a class="lnk" data-ago="${r.id}">${esc(r.reqId || nm(r))}</a></span>`).join('') || '<span class="muted">—</span>'}<button class="tadd" data-tcreq="${tc.id}" title="Gereksinim bağla / çıkar">+</button></div></div>`;
  h += `<div class="trrow"><span class="trl">Test profilleri</span><div class="tcell">${pfs.map(p => `<span class="chip2 noi18n" title="${esc(pfShort(p))}"><a class="lnk" data-openpf="${p.id}">∿ ${esc(p.name)}</a></span>`).join('') || '<span class="muted">—</span>'}</div></div>`;
  h += `<h3>Prosedür adımları</h3><table class="rt fmt trst"><thead><tr><th class="rn">#</th><th>İşlem / adım</th><th>Beklenen</th><th>Ölçülen / gözlenen</th><th>Sonuç</th><th>NCR</th><th></th></tr></thead><tbody>`;
  steps.forEach((s, i) => {
    const sn = ncrs.filter(n => s.id && n.stepId === s.id);
    h += `<tr class="${s.r === 'Kaldı' ? 'late' : ''}"><td class="rn">${i + 1}</td><td>${ce2(i, 'a', s)}</td><td>${ce2(i, 'exp', s)}</td><td>${ce2(i, 'meas', s)}</td>
      <td><select class="fmsel" data-sx="${i}"${s.r ? ` style="color:${RES_COL[s.r]};font-weight:600"` : ''}>${STEP_RES.map(x => `<option value="${x}"${(s.r || '') === x ? ' selected' : ''}>${x || '—'}</option>`).join('')}</select></td>
      <td><div class="tcell">${sn.map(ncrChip).join('')}<button class="tadd" data-tx="ncrstep" data-i="${i}" title="Bu adım için NCR aç">+</button></div></td>
      <td class="ra" style="white-space:nowrap"><button class="tdel" data-tx="up" data-i="${i}" title="Yukarı taşı">↑</button><button class="tdel" data-tx="down" data-i="${i}" title="Aşağı taşı">↓</button><button class="tdel" data-tx="del" data-i="${i}" title="Adımı sil">✕</button></td></tr>`;
  });
  h += `</tbody></table>`;
  if(!steps.length) h += `<div class="muted" style="padding:8px 4px">Henüz adım yok. "+ Adım" ile ekleyin ya da Excel'den kopyaladığınız satırları "Adımları yapıştır" ile alın (sütunlar: işlem, beklenen, ölçülen, sonuç).</div>`;
  h += `<h3>Bu testin uygunsuzlukları <span class="muted">(${ncrs.length})</span></h3>` + (ncrs.length ? ncrMini(ncrs) : '<div class="muted" style="padding:4px">Kayıt yok.</div>');
  return h + `<div class="vfoot">Tüm adımlara sonuç girilince test sonucu adımlardan hesaplanır (bir adım Kaldı ise Kaldı). Hücreye tıklayıp yazın; Enter sonraki satıra geçer.</div>`;
}
function testrunBar(){
  const tc = txTest();
  return `<label>Test <select class="noi18n" data-txf="tc" style="max-width:360px">${allTests().map(t => `<option value="${t.id}"${tc && t.id === tc.id ? ' selected' : ''}>${esc(tcLabel(t))}</option>`).join('')}</select></label>
    <button class="vb pri" data-tx="add">+ Adım</button><button class="vb" data-tx="paste">⎘ Adımları yapıştır</button><button class="vb" data-tx="ncr">+ NCR</button>
    <span class="vsep"></span><button class="vb" data-tx="clear">Adım sonuçlarını temizle</button><button class="vb" data-tx="retest">↻ Tekrar test oluştur</button><button class="vb" data-tdoc="tp">📄 Test prosedürü</button><button class="vb" data-tdoc="tr">📄 Test raporu</button><button class="vb" data-tx="camp">Test kampanyası</button><button class="vb" data-tx="xl">⤒ Excel'e aktar</button>`;
}
function pasteStepsDialog(tc){
  const box = $('#modalBox'); box.style.width = 'min(720px, 94vw)'; box.style.maxWidth = 'none';
  box.innerHTML = `<h2>Adımları yapıştır — ${esc(nm(tc))}</h2><p class="muted" style="font-size:12px;margin:-4px 0 8px">Excel'den veya Word tablosundan satırları kopyalayıp yapıştırın. Sütunlar sırasıyla: işlem / adım, beklenen, ölçülen, sonuç (sonraki sütunlar isteğe bağlı). Başlık satırı otomatik atlanır.</p>
    <textarea id="psT" rows="12" style="width:100%;font-family:Consolas,monospace;font-size:12px"></textarea>
    <label class="vchk" style="margin-top:6px"><input type="checkbox" id="psR"> Mevcut adımları değiştir (işaretsizse sona eklenir)</label>
    <p style="text-align:right;margin:10px 0 0"><button class="pbtn" id="psC">Vazgeç</button> <button class="pbtn pri" id="psO">Ekle</button></p>`;
  $('#modal').style.display = 'flex';
  const close = () => { $('#modal').style.display = 'none'; box.style.width = ''; box.style.maxWidth = ''; box.onclick = null; };
  box.onclick = ev => {
    if(ev.target.id === 'psC') close();
    if(ev.target.id !== 'psO') return;
    const rows = $('#psT').value.split(/\r?\n/).map(l => l.split('\t').map(x => x.trim())).filter(r => r.some(Boolean));
    if(rows.length && /^(işlem|islem|adım|adim|step|action|no|#)/i.test(rows[0][0]) && rows.length > 1) rows.shift();
    const st = rows.map(r => { if(/^\d+[.)]?$/.test(r[0]) && r.length > 1) r = r.slice(1); return {id:uid(), a:r[0] || '', exp:r[1] || '', meas:r[2] || '', r:normResult(r[3] || '') === 'Kaldı' ? 'Kaldı' : normResult(r[3] || '') === 'Geçti' ? 'Geçti' : ''}; }).filter(s => s.a || s.exp);
    if(!st.length) return toast('Yapıştırılan metinde adım bulunamadı');
    snap(); tc.steps = ($('#psR').checked ? [] : tcSteps(tc)).concat(st); const r = applyStepsResult(tc);
    close(); afterChange(); toast(`${st.length} adım eklendi` + (r ? ' · test sonucu: ' + r : ''));
  };
  setTimeout(() => $('#psT').focus(), 30);
}

/* ---------- NCR kaydı ---------- */
let NCV = {st:'open', sev:'all', q:''};
function ncrRows(){
  let rs = allNCRs();
  if(NCV.st === 'open') rs = rs.filter(ncrOpen); else if(NCV.st !== 'all') rs = rs.filter(n => (n.nst || 'Açık') === NCV.st);
  if(NCV.sev !== 'all') rs = rs.filter(n => (n.sev || 'Majör') === NCV.sev);
  if(NCV.q){ const q = asciiTr(NCV.q); rs = rs.filter(n => asciiTr([n.ncrId, n.name, n.desc, n.cause, n.ca, n.resp, tcLabel(E(n.test)), taLabel(E(n.article))].join(' ')).includes(q)); }
  return rs;
}
function ncrHTML(){
  const all = allNCRs();
  if(!all.length) return `<div class="vempty">Uygunsuzluk kaydı boş.<br><br><button class="vb pri" data-nx="add">+ NCR ekle</button><br><br><span class="muted">Test yürütme ekranında bir adımın yanındaki + ile o adıma bağlı NCR açılabilir.</span></div>`;
  const op = all.filter(ncrOpen), late = op.filter(n => n.due && n.due < todayISO()), crit = op.filter(n => n.sev === 'Kritik'), rt = op.filter(n => n.nst === 'Tekrar test' || n.disp === 'Tekrar test');
  const C = (v, t, col, s) => `<div class="card"><div class="cv" style="color:${col}">${v}</div><div class="ct">${t}</div>${s ? `<div class="cs">${s}</div>` : ''}</div>`;
  let h = `<div class="cards">${C(op.length, 'Açık NCR', op.length ? '#c0392b' : '#2e9e6a', 'toplam ' + all.length)}${C(crit.length, 'Kritik (açık)', crit.length ? '#c0392b' : '#2e9e6a')}${C(rt.length, 'Tekrar test bekleyen', rt.length ? '#d18a00' : '#2e9e6a')}${C(late.length, 'Hedef tarihi geçmiş', late.length ? '#c0392b' : '#2e9e6a')}${C(all.length - op.length, 'Kapandı', '#2e9e6a')}</div>`;
  const rs = ncrRows(), tests = allTests(), arts = allArticles(), fms = allFMs();
  h += `<table class="rt fmt"><thead><tr><th class="rn">#</th><th>NCR no</th><th>Başlık</th><th>Açıklama</th><th>Tarih</th><th>Test</th><th>Numune</th><th>Önem</th><th>Kök neden</th><th>Düzeltici faaliyet</th><th>Karar / işlem</th><th>Sorumlu</th><th>Hedef tarih</th><th>Durum</th><th>Gereksinimler</th><th>Arıza modu</th><th>Tekrar test</th><th></th></tr></thead><tbody>`;
  rs.forEach((n, i) => {
    const late1 = n.due && n.due < todayISO() && ncrOpen(n), rt1 = E(n.retest);
    h += `<tr data-row="${n.id}" class="${ST.tsel === n.id ? 'sel' : ''}"><td class="rn">${i + 1}</td><td>${ce(n, 'ncrId', 'rid')}</td><td>${ce(n, 'name')}</td><td>${ce(n, 'desc', 'long')}</td>
      <td><input type="date" class="fmsel" data-nf="${n.id}|date" value="${esc(n.date || '')}"></td>
      <td>${idSel(`data-nf="${n.id}|test"`, tests, n.test, tcLabel)}</td><td>${idSel(`data-nf="${n.id}|article"`, arts, n.article, taLabel)}</td>
      <td>${strSel(`data-nf="${n.id}|sev"`, NCR_SEV, n.sev || 'Majör', NCR_SEV_COL)}</td><td>${ce(n, 'cause', 'long')}</td><td>${ce(n, 'ca', 'long')}</td><td>${strSel(`data-nf="${n.id}|disp"`, NCR_DISP, n.disp || '—')}</td><td>${ce(n, 'resp')}</td>
      <td><input type="date" class="fmsel${late1 ? ' late' : ''}" data-nf="${n.id}|due" value="${esc(n.due || '')}"></td><td>${strSel(`data-nf="${n.id}|nst"`, NCR_ST, n.nst || 'Açık')}</td>
      <td><div class="tcell">${(n.reqs || []).map(E).filter(Boolean).map(r => `<span class="chip2" title="${esc(r.text || '')}"><a class="lnk" data-ago="${r.id}">${esc(r.reqId || nm(r))}</a></span>`).join('')}<button class="tadd" data-nreq="${n.id}" title="Gereksinim bağla / çıkar">+</button></div></td>
      <td>${idSel(`data-nf="${n.id}|fm"`, fms, n.fm, f => nmx(fmHost(f)) + ': ' + (f.name || ''))}</td>
      <td style="white-space:nowrap">${idSel(`data-nf="${n.id}|retest"`, tests.filter(t => t.id !== n.test), n.retest, tcLabel)}${rt1 ? ' ' + resChip(testResult(rt1)) : n.test ? ` <button class="tadd" data-nretest="${n.id}" title="Testi adımlarıyla kopyalayıp tekrar test oluştur">↻</button>` : ''}</td>
      <td><button class="tdel" data-ndel="${n.id}" title="Sil">✕</button></td></tr>`;
  });
  return h + `</tbody></table><div class="vfoot">${rs.length} / ${all.length} NCR · Hücrelere tıklayıp yazın; Enter alt satıra geçer. "Tekrar test" kararında NCR, tekrar test geçmeden kapatılırsa model doğrulaması uyarır.</div>`;
}
function ncrBar(){
  return `<button class="vb pri" data-nx="add">+ NCR</button><input data-nvf="q" placeholder="Ara…" value="${esc(NCV.q)}" style="width:160px">
    <label>Durum <select data-nvf="st"><option value="open"${NCV.st === 'open' ? ' selected' : ''}>Açık olanlar</option><option value="all"${NCV.st === 'all' ? ' selected' : ''}>Tümü</option>${NCR_ST.map(s => `<option${NCV.st === s ? ' selected' : ''}>${s}</option>`).join('')}</select></label>
    <label>Önem <select data-nvf="sev"><option value="all">Tümü</option>${NCR_SEV.map(s => `<option${NCV.sev === s ? ' selected' : ''}>${s}</option>`).join('')}</select></label>
    <span class="vsep"></span><button class="vb" data-nx="run">Test yürütme</button><button class="vb" data-nx="arts">Test numuneleri</button><button class="vb" data-nx="xl">⤒ Excel'e aktar</button>`;
}

/* ---------- Test numuneleri ---------- */
let TAV = {sel:null};
function articleHistory(a){
  const ev = [];
  articleTests(a.id).forEach(t => ev.push({d:t.rDate || t.pStart || '', k:'t', e:t}));
  ncrsOfArticle(a.id).forEach(n => ev.push({d:n.date || '', k:'n', e:n}));
  return ev.sort((x, y) => String(x.d || '9999').localeCompare(String(y.d || '9999')));
}
function articlesHTML(){
  const all = allArticles();
  if(!all.length) return `<div class="vempty">Henüz test numunesi yok.<br><br><button class="vb pri" data-ax="add">+ Numune ekle</button><br><br><span class="muted">Numune: test edilen fiziksel ürün (seri no, parça no, konfigürasyon). Test yürütme ekranında testlere bağlanır; numunenin test ve NCR geçmişi burada izlenir.</span></div>`;
  const C = (v, t, col) => `<div class="card"><div class="cv" style="color:${col}">${v}</div><div class="ct">${t}</div></div>`;
  const withNcr = all.filter(a => ncrsOfArticle(a.id).some(ncrOpen));
  let h = `<div class="cards">${C(all.length, 'Numune', '#26364b')}${C(all.filter(a => a.ast === 'Testte').length, 'Testte', TA_COL['Testte'])}${C(all.filter(a => ['Arızalı', 'Tamirde'].includes(a.ast)).length, 'Arızalı / tamirde', '#c0392b')}${C(withNcr.length, 'Açık NCR\'lı numune', withNcr.length ? '#c0392b' : '#2e9e6a')}</div>`;
  const blocks = Object.values(M.els).filter(e => e.kind === 'Block').sort((a, b) => COLL.compare(a.name || '', b.name || ''));
  h += `<table class="rt fmt"><thead><tr><th class="rn">#</th><th>Numune adı</th><th>Seri no</th><th>Parça no</th><th>Ürün (blok)</th><th>Konfigürasyon / sürüm</th><th>Konum</th><th>Durum</th><th>Testler</th><th>NCR</th><th></th></tr></thead><tbody>`;
  all.forEach((a, i) => {
    const ts = articleTests(a.id), ns = ncrsOfArticle(a.id);
    h += `<tr data-row="${a.id}" class="${(TAV.sel || ST.tsel) === a.id ? 'sel' : ''}"><td class="rn">${i + 1}</td><td>${ce(a, 'name')}</td><td>${ce(a, 'sn', 'rid')}</td><td>${ce(a, 'pn')}</td>
      <td>${idSel(`data-af="${a.id}|block"`, blocks, a.block, b => b.name || '')}</td><td>${ce(a, 'cfg')}</td><td>${ce(a, 'loc')}</td><td>${strSel(`data-af="${a.id}|ast"`, TA_ST, a.ast || 'Hazır', TA_COL)}</td>
      <td><div class="tcell">${ts.map(t => `<span class="chip2" title="${esc(nm(t) + ': ' + testResult(t))}"><i class="rdot" style="background:${RES_COL[testResult(t)]}"></i><a class="lnk" data-txgo="${t.id}">${esc(t.procNo || nm(t))}</a></span>`).join('') || '<span class="muted">—</span>'}</div></td>
      <td><div class="tcell">${ns.map(ncrChip).join('') || '<span class="muted">—</span>'}</div></td><td><button class="tdel" data-adel="${a.id}" title="Sil">✕</button></td></tr>`;
  });
  h += `</tbody></table>`;
  const s = E(TAV.sel) && E(TAV.sel).kind === 'TestArticle' ? E(TAV.sel) : E(ST.tsel) && E(ST.tsel).kind === 'TestArticle' ? E(ST.tsel) : all[0];
  const hist = articleHistory(s);
  h += `<h3>Numune geçmişi — <span class="noi18n">${esc(taLabel(s))}</span></h3>` + (hist.length ? `<div class="tahist">${hist.map(x => x.k === 't' ? `<div class="the"><span class="thd">${esc(fmtD(x.d) || '—')}</span><span class="thk">Test</span><a class="lnk noi18n" data-txgo="${x.e.id}">${esc(tcLabel(x.e))}</a> ${resChip(testResult(x.e))}</div>` : `<div class="the"><span class="thd">${esc(fmtD(x.d) || '—')}</span><span class="thk ncr">NCR</span>${ncrChip(x.e)} <span class="noi18n">${esc(x.e.name || '')}</span> ${sevChip(x.e.sev)} <span class="muted">${esc(x.e.nst || 'Açık')}</span></div>`).join('')}</div>` : '<div class="muted" style="padding:4px">Bu numuneyle yapılmış test veya NCR yok.</div>');
  return h + `<div class="vfoot">Satıra tıklayınca numunenin geçmişi aşağıda gösterilir. Numuneyi bir teste bağlamak için Test yürütme ekranındaki "Numuneler" satırını kullanın.</div>`;
}
function articlesBar(){ return `<button class="vb pri" data-ax="add">+ Numune</button><span class="vsep"></span><button class="vb" data-nx="run">Test yürütme</button><button class="vb" data-nx="ncr">Uygunsuzluk kaydı</button><button class="vb" data-nx="xl">⤒ Excel'e aktar</button>`; }

/* ---------- Excel ---------- */
function ncrXlsx(){
  const H = a => a.map(v => ({v, s:1}));
  const N = [H(['NCR no', 'Başlık', 'Açıklama', 'Tarih', 'Test', 'Prosedür adımı', 'Numune', 'Önem', 'Kök neden', 'Düzeltici faaliyet', 'Karar', 'Sorumlu', 'Hedef tarih', 'Durum', 'Kapanış tarihi', 'Gereksinimler', 'Arıza modu', 'Tekrar test', 'Tekrar test sonucu'])];
  allNCRs().forEach(n => { const t = E(n.test), rt = E(n.retest), f = E(n.fm), si = t && n.stepId ? tcSteps(t).findIndex(s => s.id === n.stepId) : -1;
    N.push([{v:n.ncrId || '', s:6}, n.name || '', n.desc || '', fmtD(n.date), tcLabel(t), si >= 0 ? (si + 1) + '. ' + (tcSteps(t)[si].a || '') : '', taLabel(E(n.article)), {v:n.sev || 'Majör', s:n.sev === 'Kritik' ? 4 : n.sev === 'Majör' ? 5 : 2}, n.cause || '', n.ca || '', n.disp && n.disp !== '—' ? n.disp : '', n.resp || '', fmtD(n.due), {v:n.nst || 'Açık', s:ncrOpen(n) ? 5 : 3}, fmtD(n.closed), (n.reqs || []).map(E).filter(Boolean).map(r => r.reqId || nm(r)).join(', '), f ? nmx(fmHost(f)) + ': ' + (f.name || '') : '', tcLabel(rt), rt ? testResult(rt) : '']); });
  const A = [H(['Numune adı', 'Seri no', 'Parça no', 'Ürün (blok)', 'Konfigürasyon / sürüm', 'Konum', 'Durum', 'Testler (sonuç)', 'NCR'])];
  allArticles().forEach(a => A.push([{v:a.name || '', s:6}, a.sn || '', a.pn || '', nmx(E(a.block)), a.cfg || '', a.loc || '', a.ast || 'Hazır', articleTests(a.id).map(t => tcLabel(t) + ' (' + testResult(t) + ')').join('\n'), ncrsOfArticle(a.id).map(n => (n.ncrId || '') + ' ' + (n.nst || 'Açık')).join('\n')]));
  const S = [H(['Test', 'Prosedür no', 'Adım', 'İşlem / adım', 'Beklenen', 'Ölçülen / gözlenen', 'Sonuç', 'NCR'])];
  allTests().forEach(t => tcSteps(t).forEach((s, i) => S.push([nm(t), t.procNo || '', i + 1, s.a || '', s.exp || '', s.meas || '', s.r ? {v:s.r, s:s.r === 'Geçti' ? 3 : 4} : '', allNCRs().filter(n => n.stepId && n.stepId === s.id).map(n => n.ncrId).join(', ')])));
  download(buildXlsx([{name:'Uygunsuzluklar (NCR)', rows:N, widths:[11, 28, 44, 11, 30, 28, 22, 9, 30, 32, 16, 14, 11, 16, 11, 18, 26, 30, 12], header:true, freeze:[1, 2], filter:1}, {name:'Test Numuneleri', rows:A, widths:[24, 12, 14, 20, 22, 16, 13, 40, 22], header:true, freeze:[1, 1], filter:1}, {name:'Test Adımları', rows:S, widths:[30, 14, 6, 40, 30, 30, 9, 12], header:true, freeze:[1, 3], filter:1}]), fileSafe(E(M.rootId).name) + ' - Test Yürütme ve NCR.xlsx');
}

Object.assign(VIEWS, {
  '@testrun':{tr:'Test Yürütme', ic:'▶', note:'Seçili test durumunun prosedür adımları: işlem, beklenen, ölçülen ve adım sonucu. Tüm adımlara sonuç girilince test sonucu adımlardan hesaplanır.<br><br>Testin numunelerini ve gereksinimlerini buradan bağlayın; başarısız adım için <b>+</b> ile NCR açın.<br><br>Excel\'den kopyalanan adımlar "Adımları yapıştır" ile alınabilir.', render:testrunHTML, bar:testrunBar, status:() => { const t = txTest(); return t ? tcSteps(t).length + ' adım' : ''; }},
  '@ncr':{tr:'Uygunsuzluk Kaydı (NCR)', ic:'NC', note:'Test sırasında bulunan uygunsuzluklar: test, adım, numune, önem, kök neden, düzeltici faaliyet, karar ve durum.<br><br>Gereksinim ve arıza moduyla ilişkilendirin. "Tekrar test" kararında ↻ ile test adımlarıyla birlikte kopyalanıp tekrar test oluşturulur.<br><br>Açık NCR\'lar VCRM\'de ve kalite raporunda gösterilir.', render:ncrHTML, bar:ncrBar, status:() => allNCRs().filter(ncrOpen).length + ' açık NCR'},
  '@articles':{tr:'Test Numuneleri', ic:'TN', note:'Test edilen fiziksel ürünler: seri no, parça no, konfigürasyon, konum ve durum.<br><br>Her numunenin hangi testlerden geçtiği ve NCR\'ları tek listede izlenir.', render:articlesHTML, bar:articlesBar, status:() => allArticles().length + ' numune'}
});
GO_EXT.NCR = e => { ST.tsel = e.id; NCV.st = ncrOpen(e) ? 'open' : 'all'; NCV.q = ''; NCV.sev = 'all'; openD('@ncr'); };
GO_EXT.TestArticle = e => { ST.tsel = e.id; TAV.sel = e.id; openD('@articles'); };
function openTestRun(id){ TX.tc = id; ST.tsel = id; openD('@testrun'); if(ST.cur === '@testrun'){ renderViewBar(); renderView(); } }

(function(){
  const V = $('#view'), MY = () => ['@testrun', '@ncr', '@articles'].includes(ST.cur);
  const upd = (fn) => { snap(); fn(); afterChange(); };
  V.addEventListener('click', ev => {
    if(!MY()) return;
    const t = ev.target, q = s => t.closest(s); let b;
    if((b = q('[data-txgo]'))){ openTestRun(b.dataset.txgo); return; }
    if((b = q('[data-tx]'))){
      const a = b.dataset.tx, tc = txTest(), i = +b.dataset.i; if(!tc && a !== 'camp') return;
      if(a === 'add'){ upd(() => { tc.steps = tcSteps(tc).concat([{id:uid(), a:'', exp:'', meas:'', r:''}]); }); setTimeout(() => { const c = V.querySelectorAll('.ce2[data-sk="a"]'); if(c.length) c[c.length - 1].focus(); }, 30); }
      if(a === 'paste') pasteStepsDialog(tc);
      if(a === 'ncr' || a === 'ncrstep'){ const s = a === 'ncrstep' ? tcSteps(tc)[i] : null; if(s && !s.id) s.id = uid(); snap(); const n = ncrAdd({test:tc.id, stepId:s ? s.id : '', article:(tc.articles || [])[0] || '', reqs:testReqs(tc).map(r => r.id), name:s ? (s.a || '').slice(0, 60) : '', desc:s ? `Adım ${i + 1}: ${s.a || ''}${s.exp ? ' · Beklenen: ' + s.exp : ''}${s.meas ? ' · Ölçülen: ' + s.meas : ''}` : ''}); ST.tsel = n.id; NCV.st = 'open'; NCV.q = ''; afterChange(); openD('@ncr'); pendingFocus = [n.id, 'name']; renderView(); toast(`${n.ncrId} açıldı`); }
      if(a === 'up' && i > 0) upd(() => { const s = tc.steps; [s[i - 1], s[i]] = [s[i], s[i - 1]]; });
      if(a === 'down' && i < tcSteps(tc).length - 1) upd(() => { const s = tc.steps; [s[i + 1], s[i]] = [s[i], s[i + 1]]; });
      if(a === 'del'){ const s = tcSteps(tc)[i]; if(s && (!(s.a || s.exp || s.meas) || confirm(`${i + 1}. adım silinsin mi?`))) upd(() => { tc.steps.splice(i, 1); applyStepsResult(tc); }); }
      if(a === 'clear' && tcSteps(tc).some(s => s.r || s.meas) && confirm('Bu testin adım sonuçları ve ölçülen değerleri temizlensin mi? (Tekrar test için)')) upd(() => { tc.steps.forEach(s => { s.r = ''; s.meas = ''; }); });
      if(a === 'retest'){ snap(); const t2 = cloneRetest(tc); afterChange(); openTestRun(t2.id); toast(`"${nm(t2)}" oluşturuldu`); }
      if(a === 'arts') pickList('Numuneler — ' + nm(tc), allArticles().map(x => Object.assign(Object.create(x), {name:taLabel(x)})), tc.articles || [], ids => upd(() => { tc.articles = ids; }), {label:'+ Yeni numune', fn:() => { const x = taAdd({name:tc.testItem || 'Numune'}); return x.id; }});
      if(a === 'camp') openD('@campaign');
      if(a === 'xl') ncrXlsx();
      return;
    }
    if((b = q('[data-nx]'))){ const a = b.dataset.nx; if(a === 'add'){ snap(); const n = ncrAdd(); ST.tsel = n.id; NCV.st = 'open'; pendingFocus = [n.id, 'name']; afterChange(); const bd = $('#view .vbody'); if(bd) bd.scrollTop = bd.scrollHeight; } if(a === 'run') openD('@testrun'); if(a === 'arts') openD('@articles'); if(a === 'ncr') openD('@ncr'); if(a === 'xl') ncrXlsx(); return; }
    if((b = q('[data-ax]'))){ snap(); const a2 = taAdd(); ST.tsel = a2.id; TAV.sel = a2.id; pendingFocus = [a2.id, 'sn']; afterChange(); return; }
    if((b = q('[data-nreq]'))){ const n = E(b.dataset.nreq); pickList('Gereksinimler — ' + (n.ncrId || ''), allReqs(), n.reqs || [], ids => upd(() => { n.reqs = ids; })); return; }
    if((b = q('[data-nretest]'))){ const n = E(b.dataset.nretest), tc = E(n.test); if(!tc) return; snap(); const t2 = cloneRetest(tc); n.retest = t2.id; if(n.nst === 'Açık' || n.nst === 'İnceleniyor') n.nst = 'Tekrar test'; if(!n.disp || n.disp === '—') n.disp = 'Tekrar test'; afterChange(); toast(`Tekrar test oluşturuldu: ${nm(t2)}`); return; }
    if((b = q('[data-ndel]'))){ const n = E(b.dataset.ndel); if(n && confirm(`${n.ncrId || 'NCR'} silinsin mi?`)){ snap(); delModel([n.id]); afterChange(); } return; }
    if((b = q('[data-adel]'))){ const a = E(b.dataset.adel); if(a && confirm(`"${taLabel(a)}" numunesi silinsin mi?`)){ snap(); allTests().forEach(t => { if((t.articles || []).includes(a.id)) t.articles = t.articles.filter(x => x !== a.id); }); allNCRs().forEach(n => { if(n.article === a.id) n.article = ''; }); delModel([a.id]); afterChange(); } return; }
    if((b = q('[data-ago]')) && b.dataset.ago){ revealInTree(b.dataset.ago); ST.tsel = b.dataset.ago; renderProps(); return; }
    const row = q('tr[data-row]');
    if(row && !q('.ce') && !q('.ce2') && !q('select') && !q('input') && !q('button')){ ST.tsel = row.dataset.row; if(ST.cur === '@articles'){ TAV.sel = row.dataset.row; renderView(); } renderTree(); renderProps(); markSelRow(); }
  });
  V.addEventListener('change', ev => {
    if(!MY()) return;
    const t = ev.target;
    if(t.dataset.txf === 'tc'){ TX.tc = t.value; ST.tsel = t.value; renderView(); renderProps(); return; }
    if(t.dataset.nvf){ NCV[t.dataset.nvf] = t.value; renderView(); return; }
    if(t.dataset.sx != null){ const tc = txTest(), s = tcSteps(tc)[+t.dataset.sx]; if(!s) return; snap(); s.r = t.value; const r = applyStepsResult(tc); afterChange(); if(r) toast('Test sonucu adımlardan güncellendi: ' + r); return; }
    const fx = t.dataset.nf || t.dataset.af;
    if(fx){
      const [id, k] = fx.split('|'), e = E(id); if(!e || (e[k] || '') === t.value) return;
      snap(); e[k] = t.value;
      if(k === 'nst'){
        if(t.value === 'Kapandı'){ e.closed = todayISO(); const rt = E(e.retest); if(e.disp === 'Tekrar test' && !(rt && testResult(rt) === 'Geçti')) toast('Uyarı: karar "Tekrar test" ama tekrar test henüz geçmedi'); if(!String(e.cause || '').trim()) toast('Uyarı: kök neden girilmedi'); }
        else e.closed = '';
      }
      if(k === 'test' && t.value && !(e.reqs || []).length) e.reqs = testReqs(E(t.value)).map(r => r.id);
      afterChange();
    }
  });
  V.addEventListener('input', ev => { const t = ev.target; if(MY() && t.dataset.nvf === 'q'){ NCV.q = t.value; clearTimeout(t._tm); t._tm = setTimeout(renderView, 250); } });
  V.addEventListener('focusout', ev => {
    const t = ev.target; if(!t.classList || !t.classList.contains('ce2') || ST.cur !== '@testrun') return;
    const tc = txTest(), s = tc && tcSteps(tc)[+t.dataset.si]; if(!s) return;
    const v = t.innerText.replace(/ /g, ' ').replace(/\s*\n\s*/g, ' ').trim(), k = t.dataset.sk; if((s[k] || '') === v) return;
    snap(); s[k] = v; if(!s.id) s.id = uid();
    setTimeout(() => { const a = document.activeElement; afterChange(); if(a && a.classList && a.classList.contains('ce2')){ const n = V.querySelector(`.ce2[data-si="${a.dataset.si}"][data-sk="${a.dataset.sk}"]`); if(n) n.focus(); } }, 0);
  });
  V.addEventListener('keydown', ev => {
    const t = ev.target; if(!t.classList || !t.classList.contains('ce2')) return;
    if(ev.key === 'Enter' && !ev.shiftKey){ ev.preventDefault(); const i = +t.dataset.si, k = t.dataset.sk, n = V.querySelector(`.ce2[data-si="${i + 1}"][data-sk="${k}"]`); if(n) n.focus(); else t.blur(); }
    if(ev.key === 'Escape'){ const s = tcSteps(txTest())[+t.dataset.si]; t.textContent = s ? s[t.dataset.sk] || '' : ''; t.blur(); }
    ev.stopPropagation();
  });
  $('#props').addEventListener('click', ev => {
    const b = ev.target.closest('[data-tcrun]'); if(b){ openTestRun(b.dataset.tcrun); return; }
    const g = ev.target.closest('[data-gox]'); if(g){ const e = E(g.dataset.gox); if(e && GO_EXT[e.kind]) GO_EXT[e.kind](e); }
  });
})();

/* ---------- özellik paneli ---------- */
PROPS_EXT.TestArticle = (el, pf) => {
  const blocks = Object.values(M.els).filter(e => e.kind === 'Block').sort((a, b) => COLL.compare(a.name || '', b.name || ''));
  let h = pf('Seri no', `<input data-f="sn" value="${esc(el.sn || '')}">`) + pf('Parça no', `<input data-f="pn" value="${esc(el.pn || '')}">`) + pf('Ürün (blok)', `<select data-f="block" class="noi18n"><option value="">—</option>${blocks.map(b => `<option value="${b.id}"${b.id === el.block ? ' selected' : ''}>${esc(b.name || '')}</option>`).join('')}</select>`) + pf('Konfigürasyon / sürüm', `<input data-f="cfg" value="${esc(el.cfg || '')}">`) + pf('Konum', `<input data-f="loc" value="${esc(el.loc || '')}">`) + pf('Durum', `<select data-f="ast">${TA_ST.map(s => `<option${(el.ast || 'Hazır') === s ? ' selected' : ''}>${s}</option>`).join('')}</select>`);
  const hist = articleHistory(el);
  h += `<div class="sub"><span>Geçmiş (${hist.length})</span></div>` + (hist.length ? hist.map(x => `<div class="li"><span class="muted">${esc(fmtD(x.d) || '—')}</span> ${x.k === 't' ? `<a class="lnk noi18n" data-tcrun="${x.e.id}">${esc(tcLabel(x.e))}</a> ${resChip(testResult(x.e))}` : `${ncrChip(x.e)} <span class="noi18n">${esc(x.e.name || '')}</span>`}</div>`).join('') : '<div class="muted" style="font-size:12px">Test veya NCR yok</div>');
  return h + pf('', `<button class="pbtn" data-gox="${el.id}">Numune listesinde aç</button>`);
};
PROPS_EXT.NCR = (el, pf) => {
  const t = E(el.test), rt = E(el.retest);
  return pf('NCR no', esc(el.ncrId || '')) + pf('Önem', sevChip(el.sev || 'Majör')) + pf('Durum', esc(el.nst || 'Açık')) + pf('Test', t ? `<a class="lnk noi18n" data-tcrun="${t.id}">${esc(tcLabel(t))}</a>` : '—') + pf('Numune', `<span class="noi18n">${esc(taLabel(E(el.article)) || '—')}</span>`) + pf('Açıklama', `<span class="noi18n">${esc(el.desc || '—')}</span>`) + pf('Kök neden', `<span class="noi18n">${esc(el.cause || '—')}</span>`) + pf('Düzeltici faaliyet', `<span class="noi18n">${esc(el.ca || '—')}</span>`) + pf('Karar / işlem', esc(el.disp && el.disp !== '—' ? el.disp : '—')) + pf('Tekrar test', rt ? `<a class="lnk noi18n" data-tcrun="${rt.id}">${esc(tcLabel(rt))}</a> ${resChip(testResult(rt))}` : '—') + pf('', `<button class="pbtn" data-gox="${el.id}">NCR kaydında aç</button>`);
};
function testExecProps(el){
  const arts = tcArticles(el), st = tcSteps(el), ns = ncrsOfTest(el.id), done = st.filter(s => s.r).length;
  return `<div class="sub"><span>Yürütme</span><span><button data-pdoc="tp|${el.id}" title="Test prosedürü (Word)">📄 TP</button> <button data-pdoc="tr|${el.id}" title="Test raporu (Word)">📄 TR</button> <button data-tcrun="${el.id}">▶ Aç</button></span></div><div class="li">Adımlar: ${done} / ${st.length}${st.some(s => s.r === 'Kaldı') ? ` <span style="color:#c0392b">· ${st.filter(s => s.r === 'Kaldı').length} başarısız</span>` : ''}</div><div class="li">Numuneler: <span class="noi18n">${arts.length ? arts.map(a => esc(taLabel(a))).join(', ') : '—'}</span></div>${ns.length ? `<div class="li">NCR: ${ns.map(ncrChip).join(' ')}</div>` : ''}`;
}

/* ---------- VCRM, kalite, doğrulama, kullanıldığı yerler ---------- */
function reqNcrCell(r, tests){ const ns = ncrsOfReq(r, tests).filter(ncrOpen); return ns.length ? ns.map(ncrChip).join('') : '<span class="muted">—</span>'; }
function reqNcrTxt(r, tests){ return ncrsOfReq(r, tests).filter(ncrOpen).map(n => (n.ncrId || '') + ' (' + (n.sev || '') + ')').join('\n'); }
REQ_Q_EXT.push((r, out) => { if(reqStatus(r) !== 'Onaylı') return; const ns = ncrsOfReq(r, trace(r).verifyBy.filter(x => x.kind === 'TestCase')).filter(ncrOpen); if(ns.length) out.push([ns.some(n => n.sev === 'Kritik') ? 'hata' : 'uyarı', `Onaylı gereksinimde açık NCR: ${ns.map(n => n.ncrId).join(', ')}`]); });
VALIDATORS.push((add, els) => {
  els.filter(e => e.kind === 'NCR').forEach(n => {
    if(!String(n.name || '').trim()) add('uyarı', 'NCR eksik', n, 'Başlık boş');
    if(!n.test) add('bilgi', 'NCR testi yok', n, 'Hangi testte bulunduğu belirtilmemiş');
    if(!ncrOpen(n) && !String(n.cause || '').trim()) add('uyarı', 'NCR kök nedensiz kapandı', n, 'Kapalı NCR için kök neden girilmemiş');
    const rt = E(n.retest);
    if(!ncrOpen(n) && n.disp === 'Tekrar test' && !(rt && testResult(rt) === 'Geçti')) add('uyarı', 'NCR tekrar testsiz kapandı', n, 'Karar "Tekrar test" fakat tekrar test geçmedi veya bağlı değil');
    if(ncrOpen(n) && n.due && n.due < todayISO()) add('uyarı', 'NCR tarihi geçti', n, 'Hedef tarih geçti: ' + fmtD(n.due));
    if(ncrOpen(n) && n.sev === 'Kritik' && !String(n.ca || '').trim()) add('uyarı', 'Kritik NCR', n, 'Düzeltici faaliyet tanımlanmamış');
  });
  els.filter(e => e.kind === 'TestCase').forEach(t => {
    const s = tcSteps(t), sr = stepsResult(t);
    if(sr && testResult(t) !== sr) add('uyarı', 'Test sonucu tutarsız', t, `Adımlardan "${sr}" çıkıyor, test sonucu "${testResult(t)}"`);
    if(testResult(t) === 'Kaldı' && !ncrsOfTest(t.id).length) add('bilgi', 'Başarısız test için NCR yok', t, 'Kaldı sonuçlu testin uygunsuzluk kaydı yok');
    if(s.some(x => x.r === 'Kaldı') && !ncrsOfTest(t.id).length && testResult(t) !== 'Kaldı') add('bilgi', 'Başarısız adım için NCR yok', t, 'Başarısız adım var, NCR açılmamış');
  });
  els.filter(e => e.kind === 'TestArticle').forEach(a => { if(!String(a.sn || '').trim()) add('bilgi', 'Numune seri no yok', a, 'Seri numarası girilmemiş'); });
});
/* rapor bölümü */
RPT_SECTIONS.push(['testexec', 'Test yürütme, numuneler ve uygunsuzluklar']);
RPT_EXT.push((o, H, Pp, TB, B, sec) => {
  if(!o.testexec) return sec;
  const arts = allArticles(), ncrs = allNCRs(), tws = allTests().filter(t => tcSteps(t).length);
  if(!arts.length && !ncrs.length && !tws.length) return sec;
  H(1, `${++sec}. Test yürütme ve uygunsuzluklar`);
  if(arts.length){ H(2, 'Test numuneleri'); TB(['Numune', 'Seri no', 'Parça no', 'Konfigürasyon', 'Durum', 'Testler'], arts.map(a => [a.name || '', a.sn || '', a.pn || '', a.cfg || '', a.ast || 'Hazır', articleTests(a.id).map(t => (t.procNo || nm(t)) + ' (' + testResult(t) + ')').join(', ')]), [18, 10, 12, 16, 10, 34]); }
  tws.forEach(t => { H(2, 'Prosedür adımları — ' + tcLabel(t)); Pp(`Sonuç: ${testResult(t)}${t.rDate ? ' (' + fmtD(t.rDate) + ')' : ''}${tcArticles(t).length ? ' · Numune: ' + tcArticles(t).map(taLabel).join(', ') : ''}`); TB(['#', 'İşlem / adım', 'Beklenen', 'Ölçülen', 'Sonuç'], tcSteps(t).map((s, i) => [String(i + 1), s.a || '', s.exp || '', s.meas || '', s.r || '']), [5, 37, 23, 23, 12]); });
  if(ncrs.length){ H(2, 'Uygunsuzluk kayıtları (NCR)'); TB(['NCR', 'Başlık / açıklama', 'Test', 'Önem', 'Kök neden', 'Düzeltici faaliyet', 'Karar', 'Durum'], ncrs.map(n => [n.ncrId || '', (n.name || '') + (n.desc ? '\n' + n.desc : ''), tcLabel(E(n.test)), n.sev || '', n.cause || '', n.ca || '', n.disp && n.disp !== '—' ? n.disp : '', n.nst || 'Açık']), [9, 25, 16, 8, 14, 14, 8, 8]); }
  return sec;
});
/* örnek model */
DEMO_EXT.push(X => {
  const T = n => Object.values(M.els).find(e => e.kind === 'TestCase' && e.name === n), B = n => Object.values(M.els).find(e => e.kind === 'Block' && e.name === n);
  const tg = T('Güç birimi birim testi'), tb = T('Besleme gerilimi testi'), tv = T('Rastgele titreşim kalifikasyon testi'), te = T('Çevresel gerilim taraması (ESS)');
  const a1 = taAdd({name:'Güç Birimi EM', sn:'GB-0001', pn:'GB-1001', block:(B('Güç Birimi') || {}).id || '', cfg:'Rev B / yazılım yok', loc:'Test Laboratuvarı', ast:'Tamirde'});
  const a2 = taAdd({name:'Araç Sistemi QM', sn:'AS-0001', pn:'KB-2002', block:(B('Araç Sistemi') || {}).id || '', cfg:'Kalifikasyon modeli, SW v1.2', loc:'Çevre Test Merkezi', ast:'Hazır'});
  const a3 = taAdd({name:'Kontrol Birimi EM', sn:'KB-0003', pn:'KB-2002', block:(B('Kontrol Birimi') || {}).id || '', cfg:'Rev A, SW v1.1', loc:'Entegrasyon', ast:'Testte'});
  if(tg){ tg.articles = [a1.id]; tg.steps = [{id:uid(), a:'28 V girişi uygula, akımı ölç', exp:'Akım ≤ 2,5 A', meas:'1,9 A', r:'Geçti'}, {id:uid(), a:'5 V çıkışı ölç (yüksüz)', exp:'5,00 V ± %2', meas:'5,03 V', r:'Geçti'}, {id:uid(), a:'12 V çıkışı ölç (tam yük)', exp:'12,0 V ± %3', meas:'11,8 V', r:'Geçti'}]; }
  let s3;
  if(tb){ tb.articles = [a1.id]; tb.steps = [{id:uid(), a:'Girişi 22 V\'a düşür', exp:'Çıkışlar tolerans içinde', meas:'5,01 V / 11,9 V', r:'Geçti'}, {id:uid(), a:'Girişi 32 V\'a çıkar', exp:'Çıkışlar tolerans içinde', meas:'5,02 V / 12,1 V', r:'Geçti'}, s3 = {id:uid(), a:'50 ms 18 V düşüş (dropout)', exp:'Kontrol birimi resetlenmez', meas:'Reset gözlendi', r:'Kaldı'}]; tb.result = 'Kaldı'; }
  if(tv){ tv.articles = [a2.id]; tv.steps = [{id:uid(), a:'Numuneyi fikstüre bağla, kontrol ivmeölçerlerini yerleştir', exp:'Montaj torku uygulandı', meas:'', r:''}, {id:uid(), a:'Rezonans araması (0,5 g sinüs, 5–2000 Hz)', exp:'İlk rezonans > 150 Hz', meas:'', r:''}, {id:uid(), a:'Rastgele titreşim, her eksende 1 saat', exp:'Profil ±3 dB içinde', meas:'', r:''}, {id:uid(), a:'Test sonrası fonksiyonel kontrol', exp:'BIT hatasız', meas:'', r:''}]; }
  if(te) te.articles = [a3.id];
  if(tb && s3){
    const n1 = ncrAdd({ncrId:'NCR-001', name:'Giriş düşüşünde kontrol birimi resetleniyor', desc:'Adım 3: 50 ms 18 V düşüşte kontrol birimi resetlendi; SYS-001 tutma süresi karşılanmadı.', test:tb.id, stepId:s3.id, article:a1.id, sev:'Majör', cause:'Çıkış kondansatörü tutma süresi için yetersiz', ca:'Çıkış kapasitesinin 470 µF\'a çıkarılması', disp:'Tekrar test', resp:'Donanım', due:todayISO(), nst:'Tekrar test', reqs:testReqs(tb).map(r => r.id)});
    const fm = allFMs().find(f => f.name === 'Çıkışta aşırı dalgalanma'); if(fm) n1.fm = fm.id;
    const t2 = cloneRetest(tb); n1.retest = t2.id;
  }
  if(tg) ncrAdd({ncrId:'NCR-002', name:'Etiket konumu çizimle uyumsuz', desc:'Seri no etiketi çizimdeki konumda değil.', test:tg.id, article:a1.id, sev:'Minör', cause:'Montaj talimatında konum belirtilmemiş', ca:'Montaj talimatı güncellendi', disp:'Olduğu gibi kullan', resp:'Üretim', nst:'Kapandı', closed:todayISO(), reqs:[]});
  X.open.push('@ncr');
});

