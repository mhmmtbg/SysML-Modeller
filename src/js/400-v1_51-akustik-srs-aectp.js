/* ================= v1.51: ÇEVRESEL KALİFİKASYON DERİNLİĞİ — AKUSTİK, ZAMAN VERİSİNDEN SRS, AECTP-400 ŞABLONU, TEST PROSEDÜRÜ TASLAĞI =================
   Akustik profil türü (PT.acoustic) ve ölçüm değerlendirmesindeki OASPL denetimi 040 / 310 modüllerindedir (genel "add" bayrağı: dB değerli tür).
   Bu modül: (1) ivme–zaman verisinden şok tepki spektrumu (Smallwood ramp-invariant süzgeci, mutlak ivme), (2) STANAG 4370 / AECTP-400 şablonu
   (seviyeler ve yöntem numaraları bilerek [TBD] — uyarlanmış standarttan girilmelidir), (3) çevresel gereksinimden test prosedürü taslağı. */

/* ---------- 1) Zaman verisinden SRS ---------- */
/* 1/6 oktav merkez frekansları (taban 2, 1000 Hz'e hizalı) */
function sixthOct(f0, f1){ const out = []; for(let n = -60; n <= 30; n++){ const f = 1000 * Math.pow(2, n / 6); if(f >= f0 * 0.9439 && f <= f1 * 1.0595) out.push(+f.toPrecision(4)); } return out; }
/* t: saniye, a: ivme (g). Dönüş: {Q, fs, pts:[[fn, maximax]], pos, neg, warn[]} */
function srsCalc(t, a, opt){
  opt = opt || {}; const Q = numOf(opt.Q) || 10, z = 1 / (2 * Q), n = Math.min(t.length, a.length), warn = [];
  if(n < 8) return {err:'En az 8 örnek gerekli'};
  const d = []; for(let i = 1; i < n; i++) d.push(t[i] - t[i - 1]); d.sort((x, y) => x - y);
  const dt = d[d.length >> 1]; if(!(dt > 0)) return {err:'Zaman sütunu artan olmalı'};
  const fs = 1 / dt, f0 = numOf(opt.f0) || 10, f1 = Math.min(numOf(opt.f1) || 10000, fs / 2);
  if(d[0] < dt * 0.9 || d[d.length - 1] > dt * 1.1) warn.push('örnekleme aralığı düzgün değil (ortanca adım kullanıldı)');
  const fr = sixthOct(f0, f1).filter(f => f < fs / 2); if(!fr.length) return {err:'Frekans aralığı boş'};
  if(fs < 9.9 * fr[fr.length - 1]) warn.push(`örnekleme hızı (${fmtNum(Math.round(fs))} Hz) en yüksek frekansın 10 katından düşük — yüksek frekanslarda SRS hatalı olabilir`);
  const pad = Math.ceil(fs * 1 / fr[0]), pos = [], neg = [], pts = []; /* artık (residual) tepki için bir periyot sıfır eklenir */
  fr.forEach(fn => {
    const wn = 2 * Math.PI * fn, wd = wn * Math.sqrt(1 - z * z), T = dt, E0 = Math.exp(-z * wn * T), K = T * wd, C = E0 * Math.cos(K), S = E0 * Math.sin(K), Sp = S / K;
    const a1 = 2 * C, a2 = -E0 * E0, b0 = 1 - Sp, b1 = 2 * (Sp - C), b2 = E0 * E0 - Sp;
    let y1 = 0, y2 = 0, x1 = 0, x2 = 0, mx = 0, mn = 0;
    for(let i = 0; i < n + pad; i++){ const x = i < n ? a[i] : 0, y = a1 * y1 + a2 * y2 + b0 * x + b1 * x1 + b2 * x2; if(y > mx) mx = y; if(y < mn) mn = y; y2 = y1; y1 = y; x2 = x1; x1 = x; }
    pos.push([fn, mx]); neg.push([fn, -mn]); pts.push([fn, Math.max(mx, -mn)]);
  });
  return {Q, fs, pts, pos, neg, warn};
}
/* ölçüm dosyası: ilk sütun zaman, sonrakiler ivme (g) */
async function srsDialog(tid){
  const tc = E(tid); if(!tc || tc.kind !== 'TestCase') return toast('Önce bir test durumu seçin');
  let f; try { f = await pickBytes(); } catch(e){ return toast('Açılamadı: ' + e.message); } if(!f) return;
  let sheets; try { sheets = /\.xlsx$/i.test(f.name) ? await readXlsx(f.u8) : parseCSVSheets(decodeText(f.u8)); } catch(e){ return toast('Okunamadı: ' + e.message); }
  const P = measParseRows((sheets.find(s => s.rows.length > 8) || sheets[0] || {rows:[]}).rows);
  if(P.err || !P.series.length) return toast(P.err || 'İvme sütunu bulunamadı (ilk sütun zaman, sonrakiler ivme g olmalı)');
  const srsP = allProfiles().filter(p => p.ptype === 'srs'), own = (tc.profiles || []).map(E).filter(p => p && p.ptype === 'srs');
  const profs = own.concat(srsP.filter(p => !own.includes(p)));
  const ms = /\bms\b|msn|milisan/i.test(P.xName), q0 = numOf((profs[0] || {}).q) || 10;
  const box = $('#modalBox'); box.style.width = 'min(640px, 96vw)'; box.style.maxWidth = 'none';
  box.innerHTML = `<h2>Zaman verisinden SRS — <span class="noi18n">${esc(tc.name || '')}</span></h2><p class="muted noi18n">${esc(baseName(f.name))} · ${P.n} örnek · zaman sütunu: ${esc(P.xName)}</p>
    <div class="qf"><label>Zaman birimi<select id="srU"><option value="1"${ms ? '' : ' selected'}>s</option><option value="0.001"${ms ? ' selected' : ''}>ms</option></select></label>
    <label>Q (sönüm, ζ = 1/2Q)<input id="srQ" value="${q0}"></label>
    <label>Frekans aralığı (Hz)<span><input id="srF0" value="${esc(String(profs[0] ? pfPts(profs[0])[0][0] : 10))}" style="width:70px"> – <input id="srF1" value="${esc(String(profs[0] ? pfPts(profs[0]).slice(-1)[0][0] : 10000))}" style="width:80px"></span></label>
    <label>Spektrum<select id="srK"><option value="mx">Maximax (|+|, |−| en büyüğü)</option><option value="pos">Pozitif</option><option value="neg">Negatif</option></select></label>
    <label>Referans SRS profili<select id="srR">${profs.length ? profs.map(p => `<option value="${p.id}">${esc(p.name)} — ${esc(pfShort(p))}</option>`).join('') : '<option value="">(SRS profili yok — yalnız spektrum kaydedilir)</option>'}</select></label></div>
    <div class="sub"><span>İvme sütunları (her biri bir ölçüm / yön)</span></div>${P.series.map((s, i) => `<label class="vchk" style="display:block"><input type="checkbox" data-srs="${i}" checked> <input data-srn="${i}" value="${esc(s.name)}" class="noi18n" style="width:180px"> <span class="muted">${s.pts.length} örnek</span></label>`).join('')}
    <p class="muted" style="font-size:11px">Smallwood ramp-invariant süzgeci, mutlak ivme tepkisi; 1/6 oktav merkez frekansları. Örnekleme hızı en yüksek frekansın en az 10 katı olmalıdır.</p>
    <p style="text-align:right;margin:12px 0 0"><button class="pbtn" id="srC">Vazgeç</button> <button class="pbtn pri" id="srO">Hesapla ve ekle</button></p>`;
  $('#modal').style.display = 'flex';
  const close = () => { $('#modal').style.display = 'none'; box.style.width = ''; box.style.maxWidth = ''; box.onclick = null; };
  box.onclick = ev => {
    if(ev.target.id === 'srC') return close();
    if(ev.target.id !== 'srO') return;
    const u = +$('#srU').value, opt = {Q:numOf($('#srQ').value), f0:numOf($('#srF0').value), f1:numOf($('#srF1').value)}, kk = $('#srK').value, ref = $('#srR').value;
    const R = []; P.series.forEach((s, i) => { if(!box.querySelector(`[data-srs="${i}"]`).checked) return; const r = srsCalc(s.pts.map(q => q[0] * u), s.pts.map(q => q[1]), opt); R.push([i, s, r]); });
    const bad = R.find(x => x[2].err); if(bad) return toast(bad[1].name + ': ' + bad[2].err);
    snap(); const warns = new Set();
    R.forEach(([i, s, r]) => { r.warn.forEach(w => warns.add(w)); const nm1 = box.querySelector(`[data-srn="${i}"]`).value || s.name, pts = (kk === 'pos' ? r.pos : kk === 'neg' ? r.neg : r.pts).map(q => [q[0], +q[1].toPrecision(4)]);
      mk('Measurement', tc.id, {name:nm1 + ' (SRS)', axis:nm1, ref:ref || '', pts, src:baseName(f.name) + ` · SRS Q=${fmtNum(r.Q)} ${kk === 'pos' ? 'pozitif' : kk === 'neg' ? 'negatif' : 'maximax'} · fs=${fmtNum(Math.round(r.fs))} Hz`, date:todayISO(), allowOut:0, srs:{Q:r.Q, kind:kk, fs:r.fs, n:s.pts.length}}); });
    if(ref && !(tc.profiles || []).includes(ref)) tc.profiles = (tc.profiles || []).concat([ref]);
    afterChange(); close(); MSV.tc = tc.id; openD('@measure'); toast(R.length + ' SRS ölçümü eklendi' + (warns.size ? ' — uyarı: ' + [...warns].join('; ') : ''));
  };
}
{
  const V0 = VIEWS['@measure'], _b = V0.bar, _r = V0.render;
  V0.bar = function(){ return _b.apply(this, arguments).replace('<button class="vb" data-mea="apply"', '<button class="vb" data-mea="srs" title="İvme–zaman kaydından (CSV / Excel) şok tepki spektrumu hesaplar ve SRS profiline karşı değerlendirir">Zaman verisinden SRS…</button><button class="vb" data-mea="apply"'); };
  V0.render = function(){ const h = _r.apply(this, arguments); return h.replace('<button class="vb pri" data-mea="imp">Ölçüm aktar (CSV / Excel)…</button><br><br>', '<button class="vb pri" data-mea="imp">Ölçüm aktar (CSV / Excel)…</button> <button class="vb" data-mea="srs">Zaman verisinden SRS…</button><br><br>'); };
  $('#view').addEventListener('click', ev => { if(ST.cur !== '@measure') return; const a = ev.target.closest('[data-mea="srs"]'); if(a){ const tc = measCurTest(); srsDialog(tc && tc.id); } });
  V0.note += '<br><br><b>Zaman verisinden SRS</b>: ivme–zaman kaydından (ilk sütun zaman, sonrakiler ivme g) Q ayarlı şok tepki spektrumu (maximax / pozitif / negatif, 1/6 oktav) hesaplanır ve seçilen SRS profiline ±dB toleransla karşılaştırılır. <b>Akustik</b> ölçümlerde 1/3 oktav bant sapmasına ek olarak OASPL sapması denetlenir.';
}

/* ---------- 2) STANAG 4370 / AECTP-400 şablonu (seviyeler [TBD]) ---------- */
/* Yöntem numaraları ve seviyeler doğrulanmadığı için yazılmaz; profil noktaları yalnız şekil yer tutucusudur (tbd:true). */
const TPL_AECTP = [
  {k:'vib', t:'Titreşim', ptype:'psd', pts:[[20, 0.01], [2000, 0.01]], prm:{tol:3, dur:'[TBD]', axes:'X, Y, Z'}, plevel:'Kalifikasyon',
    text:std => `Sistem, ${std} kapsamında [TBD] Hz ile [TBD] Hz arasında [TBD] Grms seviyesindeki rastgele titreşim profiline eksen başına [TBD] dk maruz kaldığında işlevsel performansını koruyacaktır.`},
  {k:'aco', t:'Akustik gürültü', ptype:'acoustic', pts:[[100, 130], [10000, 130]], prm:{tol:3, oaTol:1.5, dur:'[TBD]'}, plevel:'Kalifikasyon',
    text:std => `Sistem, ${std} kapsamında [TBD] Hz ile [TBD] Hz arasında [TBD] dB OASPL (ref 20 µPa) seviyesindeki akustik gürültü ortamına [TBD] dk maruz kaldığında işlevsel performansını koruyacaktır.`},
  {k:'shk', t:'Şok', ptype:'srs', pts:[[100, 100], [1000, 100]], prm:{q:10, tol:6, shocks:3, axes:'±X, ±Y, ±Z'}, plevel:'Kalifikasyon',
    text:std => `Sistem, ${std} kapsamında yön başına [TBD] kez uygulanan, [TBD] g tepe ivmeli ve [TBD] Hz köşe frekanslı şok tepki spektrumuna maruz kaldığında yapısal ve işlevsel bütünlüğünü koruyacaktır.`}
];
function aectpApply(target, o){
  o = o || {}; snap();
  const ed = String(o.ed || '').trim(), std = 'AECTP-400' + (ed ? ' ' + ed : '') + ' Yöntem [TBD]';
  const pk = mk('Package', target, {name:uniqName('Çevresel Kalifikasyon (STANAG 4370 / AECTP-400)', target)});
  const tpk = o.tests !== false ? mk('Package', pk.id, {name:'Kalifikasyon Testleri'}) : null, ppk = mk('Package', pk.id, {name:'Test Profilleri'});
  TPL_AECTP.filter(x => !o.only || o.only.includes(x.k)).forEach((x, i) => {
    const r = mk('Requirement', pk.id, {level:'Sistem', reqId:nextReqId('Sistem'), name:'AECTP-400 – ' + x.t, text:x.text(std), verif:'Test', attrs:{}});
    const p = mk('TestProfile', ppk.id, Object.assign({name:x.t + ' profili (TBD)', ptype:x.ptype, pts:x.pts.map(q => q.slice()), std, plevel:x.plevel, tbd:true}, x.prm));
    addRel('Refine', p.id, r.id);
    if(tpk){ const tc = mk('TestCase', tpk.id, {name:x.t + ' testi', procNo:'QT-AECTP-' + String(i + 1).padStart(2, '0'), tMethod:'Test', tLevel:'Kalifikasyon', testItem:o.item || '', std, result:'Planlandı', profiles:[p.id]}); addRel('Verify', tc.id, r.id); }
  });
  ST.exp.add(target); ST.exp.add(pk.id); afterChange(); revealInTree(pk.id);
  return 'AECTP-400 şablonu eklendi — yöntem numaralarını ve [TBD] seviyeleri uyarlanmış standarttan doldurun; profiller TASLAK işaretlidir';
}
{
  const _td = templateDialog;
  templateDialog = function(){
    _td.apply(this, arguments);
    const box = $('#modalBox'), r810 = box.querySelector('input[name=tpl][value="810"]'); if(!r810) return;
    r810.closest('label').insertAdjacentHTML('afterend', `<label class="pli"><input type="radio" name="tpl" value="aectp"> <b>STANAG 4370 / AECTP-400 mekanik çevre</b><em>Titreşim, akustik gürültü ve şok için gereksinim + test profili (Refine) + kalifikasyon testi. Yöntem numaraları ve seviyeler [TBD] gelir — uyarlanmış standarttan (baskıya göre) girilmelidir; profiller TASLAK işaretlidir.</em><span style="display:block;margin:4px 0 0 22px">Baskı / sürüm <input id="tpEd" placeholder="ör. Ed. ? Ver. ?" style="width:140px"></span></label>`);
    const ok = box.querySelector('#tpO'); ok.addEventListener('click', ev => {
      const sel = box.querySelector('input[name=tpl]:checked'); if(!sel || sel.value !== 'aectp') return;
      ev.stopImmediatePropagation(); ev.preventDefault();
      const msg = aectpApply($('#tpP').value, {tests:$('#tpT').checked, item:$('#tpI').value.trim(), ed:$('#tpEd').value}); $('#modal').style.display = 'none'; box.onclick = null; toast(msg);
    }, true);
  };
}
/* taslak profiller: metriklerde ve görünümde açık uyarı; çevre türetme kuralı taslak profilden gereksinim üretmez */
{
  const _pm = pfMetrics;
  pfMetrics = function(p){ const m = _pm.apply(this, arguments); if(p && p.tbd && m && m.rows && !m.rows.some(r => r[0] === 'Durum')) m.rows.unshift(['Durum', 'TASLAK — seviyeler [TBD], uyarlanmış standarttan girilmeli']); return m; };
  const V0 = VIEWS['@profiles'], _r = V0.render;
  V0.render = function(){ const h = _r.apply(this, arguments), p = pfSel(); if(!p || !p.tbd) return h; return `<div class="pfwarn" style="border:1px solid #e0b252;background:#fff6dc;padding:6px 10px;margin:0 0 8px;border-radius:4px">Bu profil <b>TASLAK</b>: kırılma noktaları yalnız şekil yer tutucusudur, standarttan alınmamıştır. Seviyeleri ve yöntem numarasını uyarlanmış standarttan girdikten sonra işareti kaldırın. <button class="vb" data-pftbd="${p.id}">Seviyeler girildi — taslak işaretini kaldır</button></div>` + h; };
  V0.note += '<br><br><b>Akustik gürültü</b>: 1/3 oktav SPL (dB, ref 20 µPa), frekans log / seviye doğrusal eksen; OASPL standart 1/3 oktav bantlarının enerji toplamıdır. Tolerans toplamsal ±dB, ayrıca ±dB OASPL toleransı.';
  $('#view').addEventListener('click', ev => { const b = ev.target.closest('[data-pftbd]'); if(!b) return; const p = E(b.dataset.pftbd); if(!p) return; snap(); delete p.tbd; if(/\(TBD\)$/.test(p.name || '')) p.name = p.name.replace(/\s*\(TBD\)$/, ''); afterChange(); toast('Taslak işareti kaldırıldı'); });
  VALIDATORS.push((add, els) => els.filter(p => p.kind === 'TestProfile' && p.tbd).forEach(p => add('uyarı', 'Taslak test profili (TBD)', p, 'Seviyeler standarttan girilmemiş — profil yer tutucu değerlerle duruyor')));
}

/* ---------- 3) Çevresel gereksinimden test prosedürü taslağı ---------- */
const envProfilesOf = r => { const idx = relIdx(); return [...new Set((idx.Refine || []).filter(x => x.tgt === r.id && E(x.src) && E(x.src).kind === 'TestProfile').map(x => x.src))].map(E); };
const envReqs = () => allReqs().filter(r => activeReq(r) && envProfilesOf(r).length);
function envSteps(pfs, tc){
  const S = [], st = (a, exp) => S.push({a, exp}), item = tc.testItem || 'numune';
  const mech = pfs.filter(p => ['psd', 'sine', 'srs'].includes(p.ptype || 'psd')), aco = pfs.filter(p => p.ptype === 'acoustic'), th = pfs.filter(p => p.ptype === 'thermal');
  if(mech.length) st(`${item} test fikstürüne çalışma konumunda bağlanır; bağlantı elemanı torkları kaydedilir. Kontrol ivmeölçer(ler)i fikstür–numune arayüzüne, izleme ivmeölçerleri [TBD] noktalarına yerleştirilir.`, 'Bağlantı, tork ve sensör konumları kayıt altına alınmıştır');
  if(aco.length) st(`${item} yankılı / ilerleyen dalga odasına [TBD] konumda yerleştirilir; kontrol mikrofonları numuneden [TBD] m uzaklıkta, en az [TBD] noktada konumlandırılır.`, 'Numune ve mikrofon konumları kayıt altına alınmıştır');
  if(th.length) st(`${item} iklimlendirme kabinine yerleştirilir; kontrol ve izleme termokuplları [TBD] noktalara bağlanır.`, 'Termokupl konumları kayıt altına alınmıştır');
  st('Test öncesi görsel muayene ve fonksiyonel test yapılır.', 'Hasar yok; fonksiyonel test başarılı');
  pfs.forEach(p => {
    const t = p.ptype || 'psd', m = Object.assign({}, pfMetrics(p)); if(p.tbd) m.main = '[TBD] seviye';
    const ax = pfAxes(p), tol = numOf(p.tol) != null ? numOf(p.tol) : ({psd:3, sine:1, srs:6, thermal:3, acoustic:3})[t], nm0 = '"' + p.name + '"';
    if(t === 'psd' || t === 'sine'){
      st(`${nm0} profili için düşük seviyede (ör. tam seviyenin −6 dB altında) denetim ayarı (eşitleme) koşusu yapılır.`, 'Denetim döngüsü kararlı; kontrol spektrumu tolerans içinde');
      (ax.length ? ax : ['[TBD]']).forEach(a => {
        st(`${a} ekseninde ${nm0} uygulanır: ${m.main || ''}${t === 'psd' && p.dur ? ', süre ' + p.dur + ' dk' : ''}${t === 'sine' ? ', ' + fmtNum(numOf(p.rate) || 1) + ' oktav/dk, ' + fmtNum(numOf(p.sweeps) || 1) + ' süpürme' : ''}.`, `Kontrol ${t === 'psd' ? 'ASD' : 'genliği'} ±${fmtNum(tol)} dB bandında${t === 'psd' ? ', Grms sapması izin verilen sınır içinde' : ''}; ölçüm kaydı alınmıştır`);
        st(`${a} ekseni sonrası görsel muayene ve ara fonksiyonel kontrol yapılır.`, 'Hasar yok; ara fonksiyonel kontrol başarılı');
      });
    } else if(t === 'srs'){
      (ax.length ? ax : ['[TBD]']).forEach(a => st(`${a} yönünde ${nm0} şoku ${fmtNum(numOf(p.shocks) || 3)} kez uygulanır (${m.main || ''}, Q=${fmtNum(numOf(p.q) || 10)}).`, `Ölçülen SRS ±${fmtNum(tol)} dB bandında; her şokun ivme–zaman kaydı alınmıştır`));
      st('Şoklar sonrası görsel muayene ve ara fonksiyonel kontrol yapılır.', 'Hasar yok; ara fonksiyonel kontrol başarılı');
    } else if(t === 'acoustic'){
      st(`${nm0} için düşük seviyede (ör. tam seviyenin −6 dB altında) denetim ayarı koşusu yapılır.`, 'Kontrol spektrumu kararlı');
      st(`${nm0} uygulanır: ${m.main || ''}${p.dur ? ', süre ' + p.dur + ' dk' : ''}. Kontrol, mikrofon ortalaması üzerinden yapılır.`, `1/3 oktav bant seviyeleri ±${fmtNum(tol)} dB, OASPL ±${fmtNum(numOf(p.oaTol) || 1.5)} dB içinde; ölçüm kaydı alınmıştır`);
    } else {
      st(`${nm0} uygulanır: ${m.main || ''}, ${fmtNum(numOf(p.cycles) || 1)} döngü. Belirlenen platolarda fonksiyonel kontrol yapılır.`, `Sıcaklık ±${fmtNum(tol)} °C içinde; plato fonksiyonel kontrolleri başarılı`);
    }
  });
  st('Test sonrası görsel muayene ve fonksiyonel test yapılır; sonuçlar test öncesi ölçümlerle karşılaştırılır.', 'Hasar yok; fonksiyonel test başarılı ve test öncesiyle tutarlı');
  st('Ölçüm kayıtları (CSV / Excel) Ölçüm Değerlendirme ekranına aktarılır ve karar teste yazılır.', 'Ölçüm kararı: Geçti');
  return S;
}
function envTpDraft(rid, noDoc){
  const r = E(rid); if(!r || r.kind !== 'Requirement') return toast('Bir gereksinim seçin');
  const pfs = envProfilesOf(r); if(!pfs.length) return toast('Bu gereksinimi inceleyen (Refine) test profili yok');
  snap();
  const idx = relIdx(); let tc = (idx.Verify || []).filter(v => v.tgt === r.id).map(v => E(v.src)).find(t => t && t.kind === 'TestCase' && (t.tMethod || 'Test') === 'Test');
  if(!tc) tc = mkTestFor(r, {name:(r.reqId ? r.reqId + ' ' : '') + (pfs.length === 1 ? pfs[0].name.replace(/\s*\(TBD\)$/, '') : 'çevre') + ' testi', tMethod:'Test', tLevel:envTestLevel(pfs[0].plevel), profiles:pfs.map(p => p.id), std:pfs.map(p => p.std).find(Boolean) || ''}, new Map());
  tc.profiles = [...new Set((tc.profiles || []).concat(pfs.map(p => p.id)))];
  const filled = [];
  if(!tcSteps(tc).length){ tc.steps = envSteps(pfs, tc); filled.push(tc.steps.length + ' adım'); }
  if(!String(tc.pre || '').trim()){
    const mech = pfs.some(p => ['psd', 'sine', 'srs'].includes(p.ptype || 'psd')), aco = pfs.some(p => p.ptype === 'acoustic');
    tc.pre = ['1) Numunenin görsel muayenesi yapılır ve hasar olmadığı kaydedilir.', '2) Test öncesi fonksiyonel kontrol yapılır.', '3) Ölçüm zincirinin (' + [mech ? 'ivmeölçer' : '', aco ? 'mikrofon' : '', pfs.some(p => p.ptype === 'thermal') ? 'termokupl' : ''].filter(Boolean).join(', ') + ', veri toplama) kalibrasyon geçerliliği kontrol edilir.', mech ? '4) Fikstür rezonans taraması yapılır; fikstür tepkisinin test aralığında kabul edilebilir olduğu doğrulanır.' : '4) Test ortamının hazır olduğu doğrulanır.', '5) Denetim stratejisi (kontrol noktası sayısı, ortalama / uç denetimi) [TBD] olarak belirlenir.'].join('\n');
    filled.push('hazırlık');
  }
  if(!String(tc.accept || '').trim()){
    tc.accept = ['Test, aşağıdaki koşulların tamamı sağlandığında başarılı kabul edilir:', '1) Uygulanan çevre koşulları her profil için tolerans bandı içindedir (Ölçüm Değerlendirme kararı: Geçti).', '2) Test sırasında ve sonrasında yapısal hasar, gevşeme veya kalıcı deformasyon gözlenmemiştir.', '3) Test sonrası fonksiyonel test başarılıdır ve sonuçlar test öncesiyle tutarlıdır.', '4) Gereksinim: ' + (r.reqId ? r.reqId + ' — ' : '') + (r.text || r.name || '')].join('\n');
    filled.push('kabul ölçütleri');
  }
  if(!tc.std){ const s = pfs.map(p => p.std).find(Boolean); if(s) tc.std = s; }
  afterChange();
  if(!noDoc && typeof docDialog === 'function') docDialog('tp', tc.id);
  toast(`"${tc.name}" test prosedürü taslağı: ${filled.length ? filled.join(', ') + ' dolduruldu' : 'mevcut içerik korundu'}`);
  return tc;
}
function envTpDialog(){
  const L = envReqs(), box = $('#modalBox'); box.style.width = 'min(760px, 96vw)'; box.style.maxWidth = 'none';
  box.innerHTML = `<h2>Çevresel gereksinimden test prosedürü taslağı</h2><p class="muted">Test profiliyle incelenen (Refine) gereksinimler. Taslak; profil türüne göre düzenek, eksen / yön başına uygulama, ara ve son fonksiyonel kontrol adımları, hazırlık ve kabul ölçütleriyle doldurulur (dolu alanlar korunur) ve Word test prosedürü açılır.</p>${L.length ? `<table class="rt fmt"><thead><tr><th>ID</th><th>Gereksinim</th><th>Profil</th><th></th></tr></thead><tbody>${L.map(r => `<tr><td class="noi18n"><b>${esc(r.reqId || '')}</b></td><td class="noi18n">${esc(r.text || r.name || '')}</td><td class="noi18n">${envProfilesOf(r).map(p => esc(pfShort(p))).join('<br>')}</td><td><button class="vb" data-etp="${r.id}">Taslak…</button></td></tr>`).join('')}</tbody></table>` : '<div class="vempty">Test profiliyle incelenen gereksinim yok. Test Profilleri ekranından profil oluşturup gereksinime Refine ile bağlayın ya da gereksinim türetme sihirbazındaki "Çevresel profil" kuralını kullanın.</div>'}<p style="text-align:right;margin:10px 0 0"><button class="pbtn" id="etC">Kapat</button></p>`;
  $('#modal').style.display = 'flex';
  box.onclick = ev => { const b = ev.target.closest('button'); if(!b) return; if(b.id === 'etC'){ $('#modal').style.display = 'none'; box.onclick = null; box.style.width = ''; box.style.maxWidth = ''; } if(b.dataset.etp){ $('#modal').style.display = 'none'; box.onclick = null; box.style.width = ''; box.style.maxWidth = ''; envTpDraft(b.dataset.etp); } };
}
HOOKS.menu.req.push(r => r.push({t:'Çevresel gereksinimden test prosedürü taslağı…', f:envTpDialog}));
HOOKS.props.push((t, P) => { const el = t.el; if(!el || el.kind !== 'Requirement' || (typeof bulkTargets === 'function' && bulkTargets()) || !envProfilesOf(el).length) return; P.insertAdjacentHTML('beforeend', `<div class="pf"><label>Çevre testi</label><div><button class="vb" data-envtp="${el.id}">Test prosedürü taslağı (Word)…</button></div></div>`); });
document.addEventListener('click', ev => { const b = ev.target.closest && ev.target.closest('[data-envtp]'); if(b) envTpDraft(b.dataset.envtp); });
if(typeof MENU_GROUPS !== 'undefined') MENU_GROUPS.req.cls.unshift(['Doğrulama ve test', /test prosedürü taslağı/]);

/* ---------- 4) çevresel gereksinim cümlesi: akustik ---------- */
{
  const _ec = envClause;
  envClause = function(p){
    if(p && p.tbd) return null; /* taslak profilden gereksinim cümlesi üretilmez */
    if(!p || p.ptype !== 'acoustic') return _ec.apply(this, arguments);
    const m = pfMetrics(p); if(!m.ok) return null; const pts = m.pts, dur = numOf(p.dur);
    return `${trNum(pts[0][0])} Hz ile ${trNum(pts[pts.length - 1][0])} Hz arasında ${trNum(+m.oaspl.toFixed(1))} dB OASPL (ref 20 µPa) seviyesindeki "${p.name}" ${/akustik|gürültü|acoustic/i.test(p.name) ? 'profiline' : 'akustik gürültü ortamına'}${dur != null ? ' ' + trNum(dur) + ' dk' : ''} maruz kaldığında`;
  };
}
