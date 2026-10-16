/* ================= v1.41: ÖLÇÜM VERİSİYLE TEST KANITI — CSV/EXCEL ÖLÇÜM, TOLERANS BANDI, GRMS, VCRM, KAPANIŞ RAPORU ================= */
Object.assign(KIND, {Measurement:{tr:'Ölçüm', en:'Measurement', ic:'Öl', col:'#16a085'}});
Object.assign(BASE, {Measurement:'Ölçüm'});
OWN.TestCase = (OWN.TestCase || []).concat(OWN.TestCase && OWN.TestCase.includes('Measurement') ? [] : ['Measurement']);
RANK.push('Measurement');
const allMeas = () => Object.values(M.els).filter(e => e.kind === 'Measurement');
const measOf = tid => kidsOf(tid).filter(e => e.kind === 'Measurement').sort(sortEls);
const measPts = m => (m.pts || []).map(q => [+q[0], +q[1]]).filter(q => isFinite(q[0]) && isFinite(q[1])).sort((a, b) => a[0] - b[0]);
function measTol(m, ref){ const t = (ref && ref.ptype) || 'psd'; const v = numOf(m.tol); if(v != null) return v; const r = numOf(ref && ref.tol); if(r != null) return r; return {psd:3, sine:1, srs:6, thermal:3}[t] || 3; }
/* değerlendirme: ölçülen eğri referans profilin tolerans bandında mı */
function measEval(m){
  const ref = E(m.ref); if(!ref || ref.kind !== 'TestProfile') return {err:'Referans profil seçilmemiş'};
  const t = ref.ptype || 'psd', D = PT[t], rp = pfPts(ref), mp = measPts(m);
  if(rp.length < 2) return {err:'Referans profilde en az iki nokta olmalı'};
  if(mp.length < 2) return {err:'Ölçümde en az iki nokta olmalı'};
  const lin = t === 'thermal', tol = measTol(m, ref), allow = numOf(m.allowOut) != null ? numOf(m.allowOut) : 0;
  const lo = Math.max(rp[0][0], mp[0][0]), hi = Math.min(rp[rp.length - 1][0], mp[mp.length - 1][0]);
  if(hi <= lo) return {err:'Ölçüm ile referansın ' + (lin ? 'zaman' : 'frekans') + ' aralıkları örtüşmüyor'};
  const span = lin ? rp[rp.length - 1][0] - rp[0][0] : Math.log(rp[rp.length - 1][0] / rp[0][0]), cov = (lin ? hi - lo : Math.log(hi / lo)) / (span || 1);
  const pts = mp.filter(q => q[0] >= lo - 1e-9 && q[0] <= hi + 1e-9).map(q => { const r = pfAt(rp, q[0], lin); const dev = r == null ? null : lin ? q[1] - r : (q[1] > 0 && r > 0 ? D.db * Math.log10(q[1] / r) : null); return [q[0], q[1], r, dev, dev != null && Math.abs(dev) > tol + 1e-9]; }).filter(q => q[3] != null);
  if(pts.length < 2) return {err:'Karşılaştırılabilir nokta yok'};
  let outW = 0, totW = 0;
  for(let i = 0; i < pts.length - 1; i++){ const w = lin ? pts[i + 1][0] - pts[i][0] : Math.log(pts[i + 1][0] / pts[i][0]); totW += w; if(pts[i][4] || pts[i + 1][4]) outW += w * ((pts[i][4] ? 0.5 : 0) + (pts[i + 1][4] ? 0.5 : 0)); }
  const outPct = totW ? 100 * outW / totW : 0, devs = pts.map(q => q[3]);
  const r = {t, tol, allow, pts, outPct, maxDev:Math.max(...devs), minDev:Math.min(...devs), cov:Math.min(1, cov), lo, hi, unit:lin ? '°C' : 'dB'};
  if(t === 'psd'){ const gm = pfMetrics({ptype:'psd', pts:mp.filter(q => q[0] >= lo && q[0] <= hi)}).grms, gr = pfMetrics({ptype:'psd', pts:rp.filter(q => q[0] >= lo && q[0] <= hi).concat([[lo, pfAt(rp, lo)], [hi, pfAt(rp, hi)]]).filter(q => q[1] != null)}).grms; r.grmsM = gm; r.grmsR = gr; r.grmsDev = gr ? 100 * (gm - gr) / gr : null; r.grmsTol = numOf(m.grmsTol) != null ? numOf(m.grmsTol) : 10; }
  const fails = [];
  if(outPct > allow + 1e-9) fails.push(`tolerans dışı %${outPct.toFixed(1)} (izin %${fmtNum(allow)})`);
  if(r.grmsDev != null && Math.abs(r.grmsDev) > r.grmsTol) fails.push(`Grms sapması %${r.grmsDev.toFixed(1)} (izin ±%${fmtNum(r.grmsTol)})`);
  if(r.cov < 0.9) fails.push(`kapsam %${(r.cov * 100).toFixed(0)} (< %90)`);
  r.ok = !fails.length; r.fails = fails;
  return r;
}
function testMeasVerdict(tid){ const L = measOf(tid); if(!L.length) return null; const R = L.map(measEval); if(R.some(x => x.err)) return {v:'', n:L.length, err:R.filter(x => x.err).length}; return {v:R.every(x => x.ok) ? 'Geçti' : 'Kaldı', n:L.length, fail:R.filter(x => !x.ok).length}; }
/* ---------- CSV / Excel ölçüm içe aktarma ---------- */
function measParseRows(rows){
  const num = v => { const s = String(v == null ? '' : v).trim().replace(/\s/g, ''); if(!s) return null; const n = parseFloat(s.replace(',', '.')); return isFinite(n) && /^[-+]?[\d.,]+(e[-+]?\d+)?$/i.test(s) ? n : null; };
  const R = rows.filter(r => r && r.some(x => String(x).trim()));
  let h0 = 0; while(h0 < R.length && !(num(R[h0][0]) != null && R[h0].slice(1).some(x => num(x) != null))) h0++;
  if(h0 >= R.length) return {err:'Sayısal veri satırı bulunamadı'};
  const hdr = h0 > 0 ? R[h0 - 1] : [], data = R.slice(h0).filter(r => num(r[0]) != null);
  const ncol = Math.max(...data.map(r => r.length));
  const series = [];
  for(let c = 1; c < ncol; c++){ const pts = data.map(r => [num(r[0]), num(r[c])]).filter(q => q[0] != null && q[1] != null); if(pts.length >= 2) series.push({name:String(hdr[c] || ('Sütun ' + (c + 1))).trim(), pts}); }
  return {xName:String(hdr[0] || 'x').trim(), series, n:data.length};
}
async function measImportDialog(tid){
  const tc = E(tid); if(!tc || tc.kind !== 'TestCase') return toast('Önce bir test durumu seçin');
  let f; try { f = await pickBytes(); } catch(e){ return toast('Açılamadı: ' + e.message); } if(!f) return;
  let sheets; try { sheets = /\.xlsx$/i.test(f.name) ? await readXlsx(f.u8) : parseCSVSheets(decodeText(f.u8)); } catch(e){ return toast('Okunamadı: ' + e.message); }
  const P = measParseRows((sheets.find(s => s.rows.length > 2) || sheets[0] || {rows:[]}).rows);
  if(P.err || !P.series.length) return toast(P.err || 'Ölçüm sütunu bulunamadı (ilk sütun x, sonrakiler değer olmalı)');
  const profs = (tc.profiles || []).map(E).filter(Boolean).concat(allProfiles().filter(p => !(tc.profiles || []).includes(p.id)));
  if(!profs.length) return toast('Modelde test profili yok — önce referans profil tanımlayın');
  const box = $('#modalBox'); box.style.width = 'min(640px, 96vw)'; box.style.maxWidth = 'none';
  box.innerHTML = `<h2>Ölçüm aktar — <span class="noi18n">${esc(tc.name || '')}</span></h2><p class="muted noi18n">${esc(baseName(f.name))} · ${P.n} satır · x: ${esc(P.xName)}</p>
    <div class="qf"><label>Referans profil<select id="meR">${profs.map((p, i) => `<option value="${p.id}">${esc(pfShort(p))} — ${esc(p.name)}${i < (tc.profiles || []).length ? ' ★' : ''}</option>`).join('')}</select></label>
    <label>İzin verilen tolerans dışı bant (%)<input id="meA" value="0"></label></div>
    <div class="sub"><span>Aktarılacak sütunlar (her biri bir ölçüm / eksen)</span></div>${P.series.map((s, i) => `<label class="vchk" style="display:block"><input type="checkbox" data-mes="${i}" checked> <input data-men="${i}" value="${esc(s.name)}" class="noi18n" style="width:180px"> <span class="muted">${s.pts.length} nokta</span></label>`).join('')}
    <p style="text-align:right;margin:12px 0 0"><button class="pbtn" id="meC">Vazgeç</button> <button class="pbtn pri" id="meO">Aktar</button></p>`;
  $('#modal').style.display = 'flex';
  const close = () => { $('#modal').style.display = 'none'; box.style.width = ''; box.style.maxWidth = ''; box.onclick = null; };
  box.onclick = ev => {
    if(ev.target.id === 'meC') return close();
    if(ev.target.id !== 'meO') return;
    const ref = $('#meR').value, allow = numOf($('#meA').value) || 0; snap(); let n = 0;
    P.series.forEach((s, i) => { if(!box.querySelector(`[data-mes="${i}"]`).checked) return; mk('Measurement', tc.id, {name:box.querySelector(`[data-men="${i}"]`).value || s.name, ref, axis:box.querySelector(`[data-men="${i}"]`).value || s.name, pts:s.pts, src:baseName(f.name), date:todayISO(), allowOut:allow}); n++; });
    if(!(tc.profiles || []).includes(ref)) tc.profiles = (tc.profiles || []).concat([ref]);
    afterChange(); close(); MSV.tc = tc.id; openD('@measure'); toast(n + ' ölçüm aktarıldı');
  };
}
/* ---------- görünüm ---------- */
let MSV = {tc:null};
const measTests = () => allTests().filter(t => (t.profiles || []).length || measOf(t.id).length);
function measCurTest(){ let t = E(MSV.tc); if(!t || t.kind !== 'TestCase'){ t = measTests()[0] || allTests()[0] || null; MSV.tc = t ? t.id : null; } return t; }
function measureHTML(){
  const tc = measCurTest();
  if(!tc) return `<div class="vempty">Modelde test durumu yok.</div>`;
  const L = measOf(tc.id), V = testMeasVerdict(tc.id);
  let h = `<div class="tsw"><h3 class="noi18n">${esc(tc.name || '')}</h3><div class="cards"><div class="card"><div class="cv">${L.length}</div><div class="ct">Ölçüm</div></div><div class="card"><div class="cv" style="color:${V && V.v === 'Geçti' ? '#2e9e6a' : V && V.v === 'Kaldı' ? '#c0392b' : '#888'}">${V ? (V.v || '—') : '—'}</div><div class="ct">Ölçüm kararı</div></div><div class="card"><div class="cv" style="color:${RES_COL[testResult(tc)] || '#888'}">${esc(testResult(tc))}</div><div class="ct">Test sonucu</div><div class="cs">${esc(tc.resultSrc || '')}</div></div></div>`;
  if(!L.length) return h + `<div class="vempty">Bu testte ölçüm yok.<br><br><button class="vb pri" data-mea="imp">Ölçüm aktar (CSV / Excel)…</button><br><br><span class="muted">İlk sütun frekans (Hz) veya zaman (dk), sonraki sütunlar ölçülen değerler (ör. X, Y, Z eksenleri ASD g²/Hz). Her sütun bir ölçüm olarak eklenir ve seçilen referans profilin tolerans bandına göre değerlendirilir.</span></div></div>`;
  L.forEach(m => {
    const r = measEval(m), ref = E(m.ref);
    h += `<div class="sub"><span class="noi18n">${esc(m.name || '')} <span class="muted">${esc(m.src || '')} · ${esc(m.date || '')}</span></span><span>${r.err ? `<span class="tsbad">${esc(r.err)}</span>` : r.ok ? '<b class="tsok">✓ Tolerans içinde</b>' : '<b class="tsbad">✗ Tolerans dışı</b>'} <a class="lnk" data-medel="${m.id}">✕</a></span></div>`;
    if(r.err){ h += `<div class="li">Referans: <select data-meref="${m.id}">${allProfiles().map(p => `<option value="${p.id}"${p.id === m.ref ? ' selected' : ''}>${esc(p.name)}</option>`).join('')}</select></div>`; return; }
    h += `<div class="tsgrid"><div class="tschart">${pfChart([{p:ref, tol:r.tol, label:'Referans'}, {p:{ptype:ref.ptype, pts:measPts(m), name:m.name}, col:'#c0392b', label:'Ölçülen'}], {w:560, h:300})}</div><div><table class="rt fmt"><tbody>
      <tr><th>Referans</th><td class="noi18n">${esc(ref.name)} <span class="muted">${esc(pfShort(ref))}</span></td></tr>
      <tr><th>Tolerans</th><td>±<input class="fmsel" data-metol="${m.id}" value="${esc(String(r.tol))}" style="width:46px"> ${r.unit} · izin verilen dışarıda kalma %<input class="fmsel" data-meallow="${m.id}" value="${esc(String(r.allow))}" style="width:40px"></td></tr>
      <tr><th>Sapma (en az / en çok)</th><td>${r.minDev.toFixed(2)} / ${r.maxDev.toFixed(2)} ${r.unit}</td></tr>
      <tr><th>Tolerans dışı bant</th><td class="${r.outPct > r.allow ? 'tsbad' : 'tsok'}">%${r.outPct.toFixed(1)}</td></tr>
      <tr><th>Kapsam</th><td>%${(r.cov * 100).toFixed(0)} (${fmtNum(r.lo)} – ${fmtNum(r.hi)})</td></tr>
      ${r.grmsM != null ? `<tr><th>Grms (ölçülen / referans)</th><td>${fmtG(r.grmsM)} / ${fmtG(r.grmsR)} · <span class="${Math.abs(r.grmsDev) > r.grmsTol ? 'tsbad' : 'tsok'}">%${r.grmsDev.toFixed(1)}</span> (izin ±%<input class="fmsel" data-megt="${m.id}" value="${esc(String(r.grmsTol))}" style="width:40px">)</td></tr>` : ''}
      ${r.fails.length ? `<tr><th>Nedenler</th><td class="tsbad">${r.fails.map(esc).join('<br>')}</td></tr>` : ''}
      </tbody></table></div></div>`;
  });
  return h + '</div>';
}
function measureBar(){
  const ts = allTests(), tc = measCurTest();
  return `<label>Test <select data-mef="tc" class="noi18n">${ts.map(t => `<option value="${t.id}"${tc && t.id === tc.id ? ' selected' : ''}>${esc(tcLabel ? tcLabel(t) : t.name)}${measOf(t.id).length ? ' (' + measOf(t.id).length + ')' : ''}</option>`).join('')}</select></label><button class="vb pri" data-mea="imp">Ölçüm aktar (CSV / Excel)…</button><button class="vb" data-mea="apply" title="Ölçüm kararını test sonucuna yazar (VCRM'e yansır)">Sonucu teste yaz</button><span class="vsep"></span><button class="vb" data-mea="xl">⤒ Excel</button><button class="vb" data-mea="rep">Doğrulama kapanış raporu (Word)</button>`;
}
VIEWS['@measure'] = {tr:'Ölçüm Değerlendirme', ic:'Öl', note:'Test sırasında alınan ölçüm verisi (CSV/Excel) referans test profiline karşı değerlendirilir: <b>tolerans bandı</b> (±dB veya ±°C), tolerans dışı bant yüzdesi, kapsam ve rastgele titreşimde <b>Grms</b> sapması.<br><br><b>Sonucu teste yaz</b> kararı test sonucuna işler; VCRM ve doğrulama durumu buna göre güncellenir. <b>Doğrulama kapanış raporu</b> tüm gereksinimlerin doğrulama kanıtını Word olarak üretir.', render:measureHTML, bar:measureBar, status:() => allMeas().length + ' ölçüm'};
GO_EXT.Measurement = e => { MSV.tc = e.owner; ST.tsel = e.id; openD('@measure'); };
function measApply(tid){
  const tc = E(tid), V = testMeasVerdict(tid); if(!tc || !V || !V.v) return toast('Değerlendirilebilir ölçüm yok');
  snap(); tc.result = V.v; tc.rDate = todayISO(); tc.resultSrc = `Ölçüm değerlendirmesi: ${V.n} ölçüm${V.fail ? ', ' + V.fail + ' tolerans dışı' : ''} (${todayISO()})`; afterChange(); toast('Test sonucu: ' + V.v);
}
function measXlsx(){
  const S = []; allMeas().forEach(m => { const r = measEval(m), tc = E(m.owner); if(r.err) return; S.push({name:((tc ? tc.name : '') + ' ' + (m.name || '')).slice(0, 28), rows:[['x', 'Ölçülen', 'Referans', 'Sapma (' + r.unit + ')', 'Tolerans dışı'].map(v => ({v, s:1}))].concat(r.pts.map(q => [q[0], q[1], q[2], +q[3].toFixed(3), q[4] ? 'EVET' : ''])), widths:[12, 14, 14, 14, 12], header:true, freeze:[0, 1]}); });
  if(!S.length) return toast('Değerlendirilmiş ölçüm yok');
  const sum = [['Test', 'Ölçüm', 'Referans', 'Tolerans', 'Dışarıda %', 'Grms sapma %', 'Karar'].map(v => ({v, s:1}))].concat(allMeas().map(m => { const r = measEval(m); return [nm(E(m.owner) || {}), m.name, E(m.ref) ? E(m.ref).name : '', r.err ? '' : r.tol, r.err ? '' : +r.outPct.toFixed(2), r.grmsDev != null ? +r.grmsDev.toFixed(2) : '', r.err ? r.err : r.ok ? 'Geçti' : 'Kaldı']; }));
  download(buildXlsx([{name:'Özet', rows:sum, widths:[30, 16, 30, 10, 12, 14, 12], header:true}].concat(S)), fileSafe(E(M.rootId).name) + ' - Ölçüm Değerlendirme.xlsx');
}
/* ---------- doğrulama kapanış raporu (Word) ---------- */
async function closureReport(){
  const B = [], H = (lv, x) => B.push({t:'h', lv, x}), Pp = (x, st) => B.push({t:'p', x, st}), TB = (head, rows, w) => B.push({t:'table', head, rows, w});
  const idx = relIdx(), reqs = allReqs().filter(r => typeof activeReq !== 'function' || activeReq(r)).sort((a, b) => String(a.reqId).localeCompare(String(b.reqId), 'tr', {numeric:true}));
  const rows = reqs.map(r => { const t = trace(r, idx), tests = t.verifyBy.filter(x => x.kind === 'TestCase'); const ms = tests.map(x => testMeasVerdict(x.id)).filter(Boolean); const open = ncrsOfReq(r, tests).filter(ncrOpen).length; const vs = verStatus(r, t); return {r, tests, ms, open, vs, closed:vs === 'Doğrulandı' && !open}; });
  const nC = rows.filter(x => x.closed).length;
  H(1, '1. Özet');
  Pp(`${reqs.length} gereksinimden ${nC} tanesi doğrulanmış ve kapatılmıştır (%${reqs.length ? Math.round(100 * nC / reqs.length) : 0}). ${rows.filter(x => x.vs === 'Kaldı').length} gereksinimde başarısız doğrulama, ${rows.filter(x => x.vs === 'Faaliyet yok').length} gereksinimde doğrulama faaliyeti yok; ${rows.reduce((s, x) => s + x.open, 0)} açık uygunsuzluk (NCR) bulunmaktadır.`);
  H(1, '2. Doğrulama matrisi');
  TB(['ID', 'Gereksinim', 'Yöntem', 'Doğrulayan test / sonuç', 'Ölçüm kararı', 'Açık NCR', 'Durum'], rows.map(x => [x.r.reqId || '', x.r.name || '', x.r.verif || '', x.tests.map(t => (t.name || '') + ': ' + testResult(t)).join('; ') || '—', x.ms.map(v => v.v || '?').join(', ') || '—', String(x.open), x.closed ? 'KAPANDI' : x.vs]), [9, 20, 9, 26, 10, 8, 10]);
  const mt = allTests().filter(t => measOf(t.id).length);
  if(mt.length){
    H(1, '3. Ölçüm kanıtları'); let fig = 0;
    mt.forEach(tc => {
      H(2, tc.name || 'Test');
      if(tc.resultSrc) Pp('Test sonucu: ' + testResult(tc) + ' — ' + tc.resultSrc);
      measOf(tc.id).forEach(m => { const r = measEval(m), ref = E(m.ref); if(r.err){ Pp(m.name + ': ' + r.err); return; }
        const svg = pfChart([{p:ref, tol:r.tol, label:'Referans'}, {p:{ptype:ref.ptype, pts:measPts(m), name:m.name}, col:'#c0392b', label:'Ölçülen'}], {w:640, h:320});
        B.push({t:'img', r:{str:svg, w:640, h:320}, cap:`Şekil ${++fig} – ${tc.name} · ${m.name}`});
        TB(['Ölçüt', 'Değer'], [['Referans', ref.name], ['Tolerans', '±' + r.tol + ' ' + r.unit], ['Sapma', r.minDev.toFixed(2) + ' / ' + r.maxDev.toFixed(2) + ' ' + r.unit], ['Tolerans dışı bant', '%' + r.outPct.toFixed(1) + ' (izin %' + r.allow + ')'], ['Kapsam', '%' + (r.cov * 100).toFixed(0)]].concat(r.grmsM != null ? [['Grms', fmtG(r.grmsM) + ' / ' + fmtG(r.grmsR) + ' (%' + r.grmsDev.toFixed(1) + ')']] : []).concat([['Karar', r.ok ? 'GEÇTİ' : 'KALDI — ' + r.fails.join('; ')]]), [35, 65]);
      });
    });
  }
  const open = rows.filter(x => !x.closed);
  if(open.length){ H(1, (mt.length ? '4' : '3') + '. Açık kalan gereksinimler'); TB(['ID', 'Gereksinim', 'Durum', 'Açık NCR'], open.map(x => [x.r.reqId || '', x.r.name || '', x.vs, String(x.open)]), [12, 50, 22, 16]); }
  const bl = await buildDocx(B, {title:'Doğrulama Kapanış Raporu', subtitle:'Doğrulama Kapanış Raporu', kind:'report', revKey:'closure'});
  download(bl, fileSafe(E(M.rootId).name) + ' - Doğrulama Kapanış Raporu.docx');
  return {B, closed:nC, total:reqs.length};
}
(() => {
  const V = $('#view');
  V.addEventListener('click', ev => {
    if(ST.cur !== '@measure') return; const t = ev.target;
    const a = t.closest('[data-mea]'); if(a){ const k = a.dataset.mea, tc = measCurTest(); if(k === 'imp') measImportDialog(tc && tc.id); if(k === 'apply' && tc) measApply(tc.id); if(k === 'xl') measXlsx(); if(k === 'rep') closureReport(); return; }
    const d = t.closest('[data-medel]'); if(d){ if(!confirm('Ölçüm silinsin mi?')) return; snap(); delete M.els[d.dataset.medel]; afterChange(); }
  });
  V.addEventListener('change', ev => {
    if(ST.cur !== '@measure') return; const t = ev.target;
    if(t.dataset.mef === 'tc'){ MSV.tc = t.value; renderView(); return; }
    const set = (id, f, v) => { const m = E(id); if(!m) return; snap(); m[f] = v; afterChange(); };
    if(t.dataset.metol) set(t.dataset.metol, 'tol', numOf(t.value)); if(t.dataset.meallow) set(t.dataset.meallow, 'allowOut', numOf(t.value) || 0); if(t.dataset.megt) set(t.dataset.megt, 'grmsTol', numOf(t.value)); if(t.dataset.meref) set(t.dataset.meref, 'ref', t.value);
  });
  V.addEventListener('keydown', ev => { if(ST.cur === '@measure' && ev.target.matches && ev.target.matches('input')){ ev.stopPropagation(); if(ev.key === 'Enter') ev.target.blur(); } });
})();
HOOKS.menu.req.push(r => r.push({t:'Ölçüm değerlendirme ve kapanış raporu', f:() => openD('@measure')}));
PROPS_EXT.Measurement = (el, pf) => { const r = measEval(el); return pf('Referans', E(el.ref) ? `<a class="lnk" data-goto="${el.ref}">${esc(E(el.ref).name)}</a>` : '—') + pf('Nokta', String(measPts(el).length)) + pf('Kaynak', esc(el.src || '')) + pf('Karar', r.err ? esc(r.err) : r.ok ? '<b class="tsok">Tolerans içinde</b>' : '<b class="tsbad">Tolerans dışı</b>') + pf('', `<button class="pbtn" data-goto="${el.id}">Ölçüm değerlendirmede aç</button>`); };
HOOKS.props.push((t, P) => { const el = t.el; if(!el || el.kind !== 'TestCase' || (typeof bulkTargets === 'function' && bulkTargets())) return; const V2 = testMeasVerdict(el.id); P.insertAdjacentHTML('beforeend', `<div class="sub"><span>Ölçüm kanıtı</span></div><div class="pf"><label>Ölçüm</label><div>${V2 ? V2.n + ' ölçüm · karar: <b>' + esc(V2.v || '—') + '</b>' : '<span class="muted">yok</span>'} <button class="pbtn" data-openmeas="${el.id}">Ölçüm değerlendirme</button></div></div>`); });
$('#props').addEventListener('click', ev => { const b = ev.target.closest('[data-openmeas]'); if(b){ MSV.tc = b.dataset.openmeas; openD('@measure'); } });
VALIDATORS.push((add, els) => {
  els.filter(t => t.kind === 'TestCase').forEach(t => { const V2 = testMeasVerdict(t.id); if(!V2 || !V2.v) return; const res = testResult(t); if((res === 'Geçti' || res === 'Kaldı') && res !== V2.v) add('uyarı', 'Ölçüm kararı ile sonuç farklı', t, `Test sonucu "${res}", ölçüm değerlendirmesi "${V2.v}"`); });
  els.filter(m => m.kind === 'Measurement').forEach(m => { const r = measEval(m); if(r.err) add('uyarı', 'Değerlendirilemeyen ölçüm', m, r.err); });
});
/* ---------- örnek model: titreşim testine ölçülmüş PSD ---------- */
DEMO_EXT.push(X => {
  const hasPsd = t => (t.profiles || []).some(p => E(p) && E(p).ptype === 'psd'); const tc = allTests().find(t => hasPsd(t) && /titreşim/i.test(t.name || '')) || allTests().find(hasPsd); if(!tc) return;
  const ref = (tc.profiles || []).map(E).find(p => p && p.ptype === 'psd'), rp = pfPts(ref); if(rp.length < 2) return;
  const grid = logGrid(rp[0][0], rp[rp.length - 1][0], 60);
  let seed = 7; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const mkM = (axis, gain, bump) => mk('Measurement', tc.id, {name:axis + ' ekseni', axis, ref:ref.id, pts:grid.map(f => [+f.toPrecision(5), +(pfAt(rp, f) * Math.pow(10, (gain + (rnd() - 0.5) * 1.2 + (bump && f > 400 && f < 520 ? bump : 0)) / 10)).toPrecision(4)]), src:'kontrol_ivmeolcer.csv', date:todayISO(), allowOut:0});
  mkM('X', 0.2, 0); mkM('Y', -0.3, 0); mkM('Z', 0.1, 3.8);
});
