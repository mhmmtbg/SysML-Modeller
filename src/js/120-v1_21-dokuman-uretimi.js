/* ================= v1.21: DOKÜMAN ÜRETİMİ — TEST PROSEDÜRÜ, TEST RAPORU, DOKÜMAN ŞABLONLARI ================= */
function docCfg(){ if(!M.docCfg) M.docCfg = {org:'', project:'', checker:'', approver:'', sign:false, revTable:true, tpl:{}, revs:{}, meta:{}}; const c = M.docCfg; c.tpl = c.tpl || {}; c.revs = c.revs || {}; c.meta = c.meta || {}; return c; }
const DOC_KINDS = {
  tp:{tr:'Test Prosedürü', sec:[['scope', 'Amaç ve kapsam'], ['refs', 'Referans dokümanlar'], ['reqs', 'Doğrulanan gereksinimler'], ['article', 'Test numunesi ve konfigürasyonu'], ['res', 'Test düzeneği ve kaynaklar'], ['profile', 'Test seviyeleri ve profiller'], ['pre', 'Ön koşullar ve güvenlik'], ['steps', 'Test adımları'], ['accept', 'Kabul kriterleri'], ['sign', 'Onay ve imza']], docNo:t => t.procNo || 'TP'},
  tr:{tr:'Test Raporu', sec:[['summary', 'Özet ve sonuç'], ['scope', 'Amaç ve kapsam'], ['refs', 'Referans dokümanlar'], ['article', 'Test numunesi ve konfigürasyonu'], ['res', 'Test düzeneği ve kaynaklar'], ['profile', 'Uygulanan test seviyeleri'], ['results', 'Adım sonuçları'], ['ncr', 'Uygunsuzluklar ve sapmalar'], ['verif', 'Gereksinim doğrulama durumu'], ['concl', 'Değerlendirme ve sonuç'], ['sign', 'Onay ve imza']], docNo:t => t.reportNo || (t.procNo ? t.procNo + '-R' : 'TR')},
  srs:{tr:'Gereksinim Spesifikasyonu'}, icd:{tr:'Arayüz Kontrol Dokümanı'}, report:{tr:'Model raporu (Sistem Tanım Dokümanı)'}
};
function docSecs(kind, tpl){
  const D = DOC_KINDS[kind], t = tpl || docCfg().tpl[kind] || {}, all = D.sec.map(x => x[0]);
  const order = (t.order || []).filter(k => all.includes(k)).concat(all.filter(k => !(t.order || []).includes(k))), off = new Set(t.off || []);
  return order.map(k => ({k, t:D.sec.find(x => x[0] === k)[1], on:!off.has(k)}));
}
/* Word çıktılarına ortak kapak bilgisi, revizyon geçmişi ve imza tablosu */
function docTplApply(o){
  if(!o || !o.kind) return o;
  const c = docCfg(), key = o.revKey || o.kind, m = c.meta[key] || {};
  const r = {org:c.org, project:c.project, checker:c.checker, approver:c.approver, sign:!!c.sign && !['tp', 'tr'].includes(o.kind), revs:c.revTable ? (c.revs[key] || []) : [], docNo:m.docNo, rev:m.rev};
  Object.keys(o).forEach(k => { if(o[k] !== '' && o[k] != null) r[k] = o[k]; });
  return r;
}
const resFill = r => r === 'Geçti' ? 'D5F0E0' : r === 'Kaldı' ? 'F8D7D3' : r === 'Koşullu' ? 'FFF1C9' : '';
function testDocBlocks(kind, tc, o){
  const B = [], H = (lv, x) => B.push({t:'h', lv, x}), Pp = (x, st) => B.push({t:'p', x, st}), TB = (head, rows, w) => B.push({t:'table', head, rows, w});
  let n = 0, fig = 0; const sec = t => H(1, `${++n}. ${t}`);
  const rs = testReqs(tc), arts = tcArticles(tc), res = tcRes(tc), pfs = (tc.profiles || []).map(E).filter(Boolean), steps = tcSteps(tc), ncrs = ncrsOfTest(tc.id).filter(x => x.test === tc.id), R = testResult(tc), c = docCfg();
  const ok = steps.filter(x => x.r === 'Geçti').length, bad = steps.filter(x => x.r === 'Kaldı').length;
  docSecs(kind, o && o.tpl).filter(s => s.on).forEach(s => { switch(s.k){
    case 'summary':
      sec(s.t);
      TB(['Alan', 'Değer'], [['Test', tcLabel(tc)], ['Sonuç', {x:R, c:resFill(R)}], ['Test tarihi', [fmtD(tc.pStart), fmtD(tc.pEnd)].filter(Boolean).join(' – ') + (tc.rDate ? ' (sonuç: ' + fmtD(tc.rDate) + ')' : '')], ['Test edilen birim', tc.testItem || ''], ['Numune', arts.map(taLabel).join(', ') || '—'], ['Doğrulama seviyesi / yöntem', [tc.tLevel, tc.tMethod].filter(Boolean).join(' / ')], ['Adımlar', steps.length ? `${ok} geçti, ${bad} kaldı, ${steps.length - ok - bad} sonuçsuz (toplam ${steps.length})` : '—'], ['Uygunsuzluk', ncrs.length ? ncrs.map(x => `${x.ncrId} (${x.nst || 'Açık'})`).join(', ') : 'Yok']], [32, 68]);
      break;
    case 'scope':
      sec(s.t);
      Pp(String(tc.purpose || '').trim() || `Bu doküman, ${tc.testItem || 'test edilen birim'} için "${nm(tc)}" testinin ${kind === 'tp' ? 'hazırlık, uygulama ve değerlendirme adımlarını' : 'uygulanmasını ve sonuçlarını'} tanımlar. Doğrulama seviyesi: ${tc.tLevel || '—'}; doğrulama yöntemi: ${tc.tMethod || 'Test'}.${rs.length ? ` Test, ${rs.length} gereksinimin doğrulanmasına katkı sağlar.` : ''}`);
      break;
    case 'refs': {
      sec(s.t);
      const refs = []; if(tc.std) refs.push([tc.std, 'Test standardı / yöntemi']);
      pfs.forEach(p => { if(p.std && !refs.some(r => r[0] === p.std)) refs.push([p.std, 'Test profili: ' + p.name]); });
      refs.push([E(M.rootId).name + ' Gereksinim Spesifikasyonu', 'Doğrulanan gereksinimlerin kaynağı']);
      if(kind === 'tr' && tc.procNo) refs.push([tc.procNo + ' — ' + nm(tc), 'Test prosedürü']);
      TB(['No', 'Doküman / standart', 'Açıklama'], refs.map((r, i) => ['[' + (i + 1) + ']', r[0], r[1]]), [8, 52, 40]);
      break;
    }
    case 'reqs':
      sec(s.t);
      if(rs.length) TB(['Gereksinim ID', 'Gereksinim metni', 'Doğrulama yöntemi'], rs.map(r => [r.reqId || '', (r.name ? r.name + ': ' : '') + (r.text || ''), r.verif || '']), [15, 67, 18]); else Pp('Bu teste bağlı gereksinim yoktur.', 'muted');
      break;
    case 'article':
      sec(s.t);
      if(arts.length) TB(['Numune', 'Seri no', 'Parça no', 'Konfigürasyon / sürüm'], arts.map(a => [a.name || '', a.sn || '', a.pn || '', a.cfg || '']), [28, 18, 18, 36]); else Pp(`Test edilen birim: ${tc.testItem || '—'}. Numune bilgisi tanımlanmamıştır.`, 'muted');
      break;
    case 'res':
      sec(s.t);
      if(res.length) TB(['Kaynak / cihaz', 'Tür', 'Konum', 'Kalibrasyon geçerlilik'], res.map(r => [r.name || '', r.rtype || '', r.loc || '', r.cal ? {x:fmtD(r.cal), c:tc.pEnd && r.cal < tc.pEnd ? 'F8D7D3' : ''} : '']), [34, 24, 24, 18]); else Pp('Test kaynağı atanmamıştır.', 'muted');
      break;
    case 'profile':
      sec(s.t);
      if(!pfs.length){ Pp('Bu teste bağlı test profili yoktur.', 'muted'); break; }
      pfs.forEach(p => {
        const m = pfMetrics(p), t = p.ptype || 'psd', D = PT[t];
        H(2, p.name + ' (' + D.tr + ')');
        Pp((p.std ? p.std + ' · ' : '') + m.rows.map(r => r[0] + ' ' + r[1]).join(' · '));
        if(m.ok){ const svg = pfChart([{p, tol:(t === 'psd' || t === 'srs') ? (numOf(p.tol) || (t === 'srs' ? 6 : 3)) : 0}], {w:760, h:380}); B.push({t:'img', r:{str:svg, w:760, h:380}, cap:`Şekil ${++fig} – ${p.name}`}); }
        TB([D.x, D.y, t === 'thermal' ? 'Değişim (°C/dk)' : 'Eğim (dB/oktav)'], pfPts(p).map((q, i) => [fmtNum(q[0]), String(q[1]), m.slopes[i] && m.slopes[i][2] != null ? fmtG(m.slopes[i][2]) : '']), [30, 35, 35]);
      });
      break;
    case 'pre':
      sec(s.t);
      String(tc.pre || '').trim() ? String(tc.pre).split(/\n+/).forEach(l => Pp(l)) : ['Numunenin görsel muayenesi yapılır ve hasar olmadığı kaydedilir.', 'Test öncesi fonksiyonel kontrol yapılır.', 'Ölçüm cihazlarının kalibrasyon geçerliliği kontrol edilir.', 'Test düzeneği ilgili güvenlik talimatlarına uygun hazırlanır.'].forEach((l, i) => Pp(`${i + 1}) ${l}`));
      break;
    case 'steps':
      sec(s.t);
      if(steps.length) TB(['#', 'İşlem / adım', 'Beklenen', 'Ölçülen', 'Sonuç'], steps.map((x, i) => [String(i + 1), x.a || '', x.exp || '', '', '']), [6, 42, 24, 16, 12]); else Pp('Test adımları tanımlanmamıştır (Test yürütme ekranından eklenebilir).', 'muted');
      break;
    case 'results':
      sec(s.t);
      if(steps.length) TB(['#', 'İşlem / adım', 'Beklenen', 'Ölçülen / gözlenen', 'Sonuç'], steps.map((x, i) => [String(i + 1), x.a || '', x.exp || '', x.meas || '', x.r ? {x:x.r, c:resFill(x.r)} : '']), [6, 36, 22, 22, 14]); else Pp('Adım sonucu kaydedilmemiştir.', 'muted');
      break;
    case 'accept':
      sec(s.t);
      if(String(tc.accept || '').trim()) String(tc.accept).split(/\n+/).forEach(l => Pp(l));
      else { Pp('Test, aşağıdaki koşulların tamamı sağlandığında başarılı kabul edilir:'); const L = steps.filter(x => x.exp).map((x, i) => `${i + 1}. adım: ${x.exp}`); (L.length ? L : ['Tüm adımlar beklenen sonuçları sağlar.']).concat(rs.length ? [`Doğrulanan gereksinimler (${rs.map(r => r.reqId || nm(r)).join(', ')}) karşılanır.`] : []).forEach(l => Pp('• ' + l)); }
      break;
    case 'ncr':
      sec(s.t);
      if(ncrs.length) TB(['NCR', 'Başlık / açıklama', 'Önem', 'Kök neden', 'Düzeltici faaliyet', 'Karar', 'Durum'], ncrs.map(x => [x.ncrId || '', (x.name || '') + (x.desc ? '\n' + x.desc : ''), x.sev || '', x.cause || '', x.ca || '', x.disp && x.disp !== '—' ? x.disp : '', x.nst || 'Açık']), [9, 30, 8, 16, 17, 10, 10]); else Pp('Test sırasında uygunsuzluk kaydedilmemiştir.');
      break;
    case 'verif':
      sec(s.t);
      if(rs.length) TB(['Gereksinim ID', 'Gereksinim', 'Bu testin sonucu', 'Gereksinim doğrulama durumu'], rs.map(r => [r.reqId || '', r.text || r.name || '', {x:R, c:resFill(R)}, verStatus(r)]), [15, 51, 15, 19]); else Pp('Bu teste bağlı gereksinim yoktur.', 'muted');
      break;
    case 'concl':
      sec(s.t);
      Pp(String(tc.concl || '').trim() || (R === 'Geçti' ? `"${nm(tc)}" testi${arts.length ? ' ' + arts.map(taLabel).join(', ') + ' numunesiyle' : ''} uygulanmış, tüm adımlar beklenen sonuçları sağlamıştır. Test BAŞARILI kabul edilmiştir.` : R === 'Kaldı' ? `"${nm(tc)}" testi BAŞARISIZ olmuştur. ${bad ? bad + ' adım beklenen sonucu sağlamamıştır. ' : ''}${ncrs.length ? 'Açılan uygunsuzluk kayıtları: ' + ncrs.map(x => x.ncrId).join(', ') + '. ' : ''}${ncrs.some(x => x.retest) ? 'Düzeltici faaliyet sonrası tekrar test planlanmıştır.' : ''}` : `Test sonucu: ${R}.`));
      break;
    case 'sign':
      sec(s.t);
      TB(['Görev', 'Ad Soyad', 'Tarih', 'İmza'], (kind === 'tr' ? [['Testi yapan', tc.resp || (o && o.author) || ''], ['Kontrol eden', c.checker || ''], ['Onaylayan', c.approver || ''], ['Müşteri temsilcisi / tanık', '']] : [['Hazırlayan', (o && o.author) || ''], ['Kontrol eden', c.checker || ''], ['Onaylayan', c.approver || '']]).map(r => r.concat(['', ''])), [26, 34, 16, 24]);
      break;
  } });
  return B;
}
function revRowsHTML(list){ return (list || []).map((r, i) => `<tr data-ri="${i}"><td><input data-rv="rev" value="${esc(r.rev || '')}" style="width:52px"></td><td><input type="date" data-rv="date" value="${esc(r.date || '')}"></td><td><input data-rv="desc" value="${esc(r.desc || '')}" style="width:100%"></td><td><input data-rv="by" value="${esc(r.by || '')}" style="width:110px"></td><td><button class="tdel" data-rvdel="${i}" title="Sil">✕</button></td></tr>`).join(''); }
function readRevs(box){ return [...box.querySelectorAll('tr[data-ri]')].map(tr => { const o = {}; tr.querySelectorAll('[data-rv]').forEach(i => o[i.dataset.rv] = i.value.trim()); return o; }).filter(r => r.rev || r.desc || r.date); }
const revTableHTML = (list, id) => `<table class="rt revt" id="${id}"><thead><tr><th>Rev.</th><th>Tarih</th><th>Açıklama</th><th>Hazırlayan</th><th></th></tr></thead><tbody>${revRowsHTML(list)}</tbody></table><button class="pbtn" data-rvadd="${id}" style="margin-top:4px">+ Revizyon</button>`;
function revAddRow(box, id){ const tb = box.querySelector('#' + id + ' tbody'), cur = readRevs(box.querySelector('#' + id)), last = cur[cur.length - 1]; const next = last && /^[A-Y]$/.test(last.rev) ? String.fromCharCode(last.rev.charCodeAt(0) + 1) : last && /^\d+$/.test(last.rev) ? String(+last.rev + 1) : cur.length ? '' : 'A'; tb.insertAdjacentHTML('beforeend', revRowsHTML([{rev:next, date:todayISO(), desc:cur.length ? '' : 'İlk yayın', by:userName()}]).replace(/data-ri="0"/, `data-ri="${tb.children.length}"`)); }
/* test prosedürü / raporu penceresi */
function docDialog(kind, tcId){
  const tests = allTests(); if(!tests.length) return toast('Önce bir test durumu oluşturun');
  let tc = E(tcId) && E(tcId).kind === 'TestCase' ? E(tcId) : (E(ST.tsel) && E(ST.tsel).kind === 'TestCase' ? E(ST.tsel) : tests[0]);
  const c = docCfg(), D = DOC_KINDS[kind];
  const box = $('#modalBox'); box.style.width = 'min(980px, 96vw)'; box.style.maxWidth = 'none';
  let secs = docSecs(kind);
  const draw = () => {
    const key = kind + ':' + tc.id, m = c.meta[key] || {};
    box.innerHTML = `<h2>${esc(DOC_KINDS[kind].tr)} (Word)</h2>
      <div class="icbar"><label>Test <select id="ddT" class="noi18n" style="max-width:420px">${tests.map(t => `<option value="${t.id}"${t.id === tc.id ? ' selected' : ''}>${esc(tcLabel(t))}</option>`).join('')}</select></label><label>Doküman <select id="ddK"><option value="tp"${kind === 'tp' ? ' selected' : ''}>Test Prosedürü</option><option value="tr"${kind === 'tr' ? ' selected' : ''}>Test Raporu</option></select></label></div>
      <div class="ddgrid"><div><div class="sub"><span>Bölümler (sıra ve seçim şablon olarak saklanır)</span></div><div class="ddsec">${secs.map((s, i) => `<div class="ddrow"><label class="vchk"><input type="checkbox" data-dsec="${i}"${s.on ? ' checked' : ''}> ${esc(s.t)}</label><span><button class="tdel" data-dsm="${i}|-1" title="Yukarı taşı">↑</button><button class="tdel" data-dsm="${i}|1" title="Aşağı taşı">↓</button></span></div>`).join('')}</div>
        <div class="sub"><span>Teste özel metinler</span></div><div class="ddtx">
        <label>Amaç ve kapsam<textarea data-dtx="purpose" rows="2" placeholder="Boş bırakılırsa otomatik metin kullanılır">${esc(tc.purpose || '')}</textarea></label>
        ${kind === 'tp' ? `<label>Ön koşullar ve güvenlik (her satır bir madde)<textarea data-dtx="pre" rows="3" placeholder="Boş bırakılırsa standart ön koşullar yazılır">${esc(tc.pre || '')}</textarea></label><label>Kabul kriterleri<textarea data-dtx="accept" rows="2" placeholder="Boş bırakılırsa adımların beklenen değerlerinden oluşturulur">${esc(tc.accept || '')}</textarea></label>` : `<label>Değerlendirme ve sonuç<textarea data-dtx="concl" rows="3" placeholder="Boş bırakılırsa test sonucundan otomatik oluşturulur">${esc(tc.concl || '')}</textarea></label>`}</div></div>
        <div><div class="sub"><span>Kapak</span></div><div class="rpgrid">
        <label>Doküman no <input data-dc="docNo" value="${esc(m.docNo || DOC_KINDS[kind].docNo(tc))}"></label><label>Revizyon <input data-dc="rev" value="${esc(m.rev || 'A')}"></label>
        <label>Hazırlayan <input data-dc="author" value="${esc(m.author || (kind === 'tr' && tc.resp) || userName())}"></label><label>Kontrol eden <input data-dg="checker" value="${esc(c.checker || '')}"></label>
        <label>Onaylayan <input data-dg="approver" value="${esc(c.approver || '')}"></label><label>Proje <input data-dg="project" value="${esc(c.project || '')}"></label>
        <label>Kuruluş <input data-dg="org" value="${esc(c.org || '')}"></label><label class="vchk" style="align-self:end"><input type="checkbox" id="ddL"${m.land ? ' checked' : ''}> Yatay sayfa</label></div>
        <div class="sub"><span>Revizyon geçmişi</span></div>${revTableHTML(c.revs[key] || [], 'ddRev')}</div></div>
      <p style="text-align:right;margin:12px 0 0"><span class="muted" id="ddst"></span> &nbsp; <button class="pbtn" id="ddC">Vazgeç</button> <button class="pbtn" id="ddS">Kaydet</button> <button class="pbtn pri" id="ddO">Word (.docx)</button></p>`;
  };
  const save = () => {
    const key = kind + ':' + tc.id; snap();
    box.querySelectorAll('[data-dtx]').forEach(t => { tc[t.dataset.dtx] = t.value.trim(); });
    box.querySelectorAll('[data-dg]').forEach(i => { c[i.dataset.dg] = i.value.trim(); });
    const m = {}; box.querySelectorAll('[data-dc]').forEach(i => m[i.dataset.dc] = i.value.trim()); m.land = $('#ddL').checked; c.meta[key] = m;
    c.revs[key] = readRevs(box.querySelector('#ddRev'));
    c.tpl[kind] = {order:secs.map(s => s.k), off:secs.filter(s => !s.on).map(s => s.k)};
    afterChange(); return m;
  };
  const close = () => { $('#modal').style.display = 'none'; box.style.width = ''; box.style.maxWidth = ''; box.onclick = null; box.onchange = null; box.onkeydown = null; };
  draw(); $('#modal').style.display = 'flex';
  box.onkeydown = ev => { ev.stopPropagation(); if(ev.key === 'Escape') close(); };
  box.onchange = ev => {
    const t = ev.target;
    if(t.id === 'ddT' || t.id === 'ddK'){ save(); if(t.id === 'ddT') tc = E(t.value); else { kind = t.value; secs = docSecs(kind); } return draw(); }
    if(t.dataset.dsec != null) secs[+t.dataset.dsec].on = t.checked;
  };
  box.onclick = async ev => {
    const t = ev.target, b = t.closest('button'); if(!b) return;
    if(b.id === 'ddC') return close();
    if(b.dataset.dsm){ const [i, d] = b.dataset.dsm.split('|').map(Number), j = i + d; if(j < 0 || j >= secs.length) return; box.querySelectorAll('[data-dsec]').forEach(x => { secs[+x.dataset.dsec].on = x.checked; }); [secs[i], secs[j]] = [secs[j], secs[i]]; const keep = save(); draw(); return keep; }
    if(b.dataset.rvadd){ revAddRow(box, b.dataset.rvadd); return; }
    if(b.dataset.rvdel != null){ b.closest('tr').remove(); return; }
    if(b.id === 'ddS'){ save(); toast('Doküman bilgileri kaydedildi'); return; }
    if(b.id === 'ddO'){
      const m = save(); $('#ddst').textContent = 'Hazırlanıyor…'; b.disabled = true;
      try {
        const o = {kind, revKey:kind + ':' + tc.id, title:nm(tc), subtitle:DOC_KINDS[kind].tr + (tc.testItem ? ' — ' + tc.testItem : ''), docNo:m.docNo, rev:m.rev, author:m.author, land:m.land, tpl:c.tpl[kind]};
        download(await buildDocx(testDocBlocks(kind, tc, o), o), fileSafe((m.docNo ? m.docNo + ' ' : '') + nm(tc) + ' - ' + DOC_KINDS[kind].tr) + '.docx');
        close(); toast(DOC_KINDS[kind].tr + ' oluşturuldu');
      } catch(e){ $('#ddst').textContent = 'Hata: ' + e.message; b.disabled = false; }
    }
  };
}
/* genel doküman şablonları (kapak, imza, revizyon geçmişi — SRS, ICD, model raporu) */
function docTemplatesDialog(){
  const c = docCfg(), box = $('#modalBox'); box.style.width = 'min(860px, 96vw)'; box.style.maxWidth = 'none';
  const K = ['srs', 'icd', 'report'];
  box.innerHTML = `<h2>Doküman şablonları</h2><p class="muted" style="font-size:12px;margin:-4px 0 8px">Bu bilgiler modelle birlikte kaydedilir ve Word çıktılarının kapağına eklenir: gereksinim spesifikasyonu, ICD, model raporu, test prosedürü ve test raporu.</p>
    <div class="rpgrid"><label>Kuruluş <input data-dg="org" value="${esc(c.org || '')}"></label><label>Proje <input data-dg="project" value="${esc(c.project || '')}"></label><label>Kontrol eden <input data-dg="checker" value="${esc(c.checker || '')}"></label><label>Onaylayan <input data-dg="approver" value="${esc(c.approver || '')}"></label></div>
    <div class="icbar" style="margin-top:6px"><label class="vchk"><input type="checkbox" id="dtS"${c.sign ? ' checked' : ''}> Kapakta imza tablosu (Hazırlayan / Kontrol / Onay)</label><label class="vchk"><input type="checkbox" id="dtR"${c.revTable !== false ? ' checked' : ''}> Kapakta revizyon geçmişi</label></div>
    ${K.map(k => `<details class="ddk"${k === 'srs' ? ' open' : ''}><summary>${esc(DOC_KINDS[k].tr)}</summary><div class="rpgrid"><label>Doküman no <input data-mk="${k}|docNo" value="${esc((c.meta[k] || {}).docNo || '')}"></label><label>Revizyon <input data-mk="${k}|rev" value="${esc((c.meta[k] || {}).rev || '')}"></label></div>${revTableHTML(c.revs[k] || [], 'dtRev_' + k)}</details>`).join('')}
    <p class="muted" style="font-size:12px">Test prosedürü ve raporunun bölüm sırası, doküman no'su ve revizyonları her test için <b>Test yürütme → Test prosedürü / Test raporu</b> penceresinden düzenlenir.</p>
    <p style="text-align:right;margin:10px 0 0"><button class="pbtn" id="dtC">Vazgeç</button> <button class="pbtn pri" id="dtO">Kaydet</button></p>`;
  $('#modal').style.display = 'flex';
  const close = () => { $('#modal').style.display = 'none'; box.style.width = ''; box.style.maxWidth = ''; box.onclick = null; box.onkeydown = null; };
  box.onkeydown = ev => { ev.stopPropagation(); if(ev.key === 'Escape') close(); };
  box.onclick = ev => {
    const b = ev.target.closest('button'); if(!b) return;
    if(b.id === 'dtC') return close();
    if(b.dataset.rvadd) return revAddRow(box, b.dataset.rvadd);
    if(b.dataset.rvdel != null) return b.closest('tr').remove();
    if(b.id === 'dtO'){
      snap(); box.querySelectorAll('[data-dg]').forEach(i => { c[i.dataset.dg] = i.value.trim(); }); c.sign = $('#dtS').checked; c.revTable = $('#dtR').checked;
      box.querySelectorAll('[data-mk]').forEach(i => { const [k, f] = i.dataset.mk.split('|'); c.meta[k] = c.meta[k] || {}; c.meta[k][f] = i.value.trim(); });
      K.forEach(k => { c.revs[k] = readRevs(box.querySelector('#dtRev_' + k)); });
      afterChange(); close(); toast('Doküman şablonları kaydedildi');
    }
  };
}
(function(){
  $('#view').addEventListener('click', ev => { const b = ev.target.closest('[data-tdoc]'); if(b) docDialog(b.dataset.tdoc, txTest() && txTest().id); });
  $('#props').addEventListener('click', ev => { const b = ev.target.closest('[data-pdoc]'); if(b){ const [k, id] = b.dataset.pdoc.split('|'); docDialog(k, id); } });
})();

