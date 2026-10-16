/*
 * SysML Modelleyici — otomatik regresyon testi
 *
 * Çalıştırma (geliştirme makinesinde; uygulamanın kendisi için gerekmez):
 *   npm i -D playwright   (veya global kurulu playwright)
 *   node tests/regression.js [app/sysml-modeler.html]
 *
 * Başsız Chromium'da uygulamayı açar; her diyagram türünü ve görünümü dener,
 * kaydet → aç gidiş-dönüşünü, bozuk dosya onarımını, dışa aktarımları (SVG, PNG,
 * Excel, ReqIF, XMI), XMI gidiş-dönüşünü, parametrik çözücüyü,
 * simülasyonu, şablonları ve büyük model performansını denetler.
 * Hata varsa çıkış kodu 1 olur.
 */
'use strict';
const path = require('path');
let chromium;
for (const m of ['playwright', '/opt/node22/lib/node_modules/playwright']) { try { ({ chromium } = require(m)); break; } catch (e) {} }
if (!chromium) { console.error('playwright bulunamadı: npm i -D playwright'); process.exit(2); }

const FILE = path.resolve(process.argv[2] || path.join(__dirname, '..', 'app', 'sysml-modeler.html'));
const results = [];
const ok = (name, cond, info) => { results.push({ name, ok: !!cond, info }); console.log((cond ? '  ✓ ' : '  ✗ ') + name + (info != null ? '  — ' + (typeof info === 'string' ? info : JSON.stringify(info)) : '')); };

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1500, height: 900 } });
  const errs = [];
  page.on('pageerror', e => errs.push(e.message + ' @ ' + (e.stack || '').split('\n')[1]));
  page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  page.on('dialog', d => d.accept());
  await page.goto('file://' + FILE);
  await page.waitForTimeout(600);
  // indirmeleri yakala
  await page.evaluate(() => { window.__dl = []; download = (blob, name) => { window.__dl.push({ name, size: blob.size, blob }); }; });
  const run = (fn, arg) => page.evaluate(fn, arg);

  console.log('1) Örnek model ve tüm görünümler');
  const views = await run(() => {
    const out = { diagrams: 0, types: new Set(), errors: [] };
    Object.values(M.els).filter(e => e.kind === 'Diagram').forEach(d => { try { openD(d.id); fit(); out.diagrams++; out.types.add(d.dtype); } catch (e) { out.errors.push(d.name + ': ' + e.message); } });
    Object.keys(VIEWS).forEach(v => { try { openD(v); } catch (e) { out.errors.push(v + ': ' + e.message); } });
    return { diagrams: out.diagrams, types: [...out.types].sort().join(','), views: Object.keys(VIEWS).length, errors: out.errors };
  });
  ok('örnek modeldeki diyagramlar açılıyor', views.diagrams > 5 && !views.errors.length, views);

  console.log('2) Her diyagram türünde paletten eleman ve ilişki oluşturma');
  const create = await run(() => {
    const res = {};
    const pkg = mk('Package', M.rootId, { name: 'Test Paketi' });
    Object.keys(DT).forEach(dt => {
      try {
        const d = newDiagramCore(pkg.id, dt, 'T-' + dt); openD(d.id);
        const shapes = DT[dt].shapes.filter(k => !KIND[k] || !KIND[k].pseudo);
        let placed = 0;
        shapes.forEach((k, i) => { try { placeNew(k, { x: 80 + (i % 4) * 260, y: 80 + Math.floor(i / 4) * 200 }, null); placed++; } catch (e) {} });
        renderDiagram();
        res[dt] = placed + '/' + shapes.length + ' şekil, ' + cur().shapes.length + ' görünür';
      } catch (e) { res[dt] = 'HATA ' + e.message; }
    });
    return res;
  });
  ok('tüm diyagram türlerinde eleman yerleşiyor', !Object.values(create).some(v => /HATA/.test(v)), create);

  console.log('3) Kaydet → aç gidiş-dönüşü');
  const rt = await run(() => {
    const txt = serialize(); const n0 = Object.keys(M.els).length;
    const m = parseModelText(txt); if (!m) return { ok: false, why: 'parse' };
    loadModel(m); afterLoad();
    const txt2 = serialize();
    return { ok: Object.keys(M.els).length === n0 && JSON.parse(txt2).v === FMT_VER, n0, n1: Object.keys(M.els).length, v: JSON.parse(txt2).v };
  });
  ok('JSON gidiş-dönüşünde eleman kaybı yok, biçim sürümü yazılıyor', rt.ok, rt);
  const html = await run(() => { saveHTML(); const f = window.__dl.pop(); return f ? f.blob.text().then(t => ({ name: f.name, ok: !!parseModelText(t) })) : null; });
  ok('gömülü HTML olarak kaydet → tekrar okunabiliyor', html && html.ok, html && html.name);

  console.log('4) Eski / bozuk dosya onarımı');
  const repair = await run(() => {
    const m = JSON.parse(serialize()); delete m.v;
    const anyBlock = Object.values(m.els).find(e => e.kind === 'Block');
    m.els.orphan = { id: 'orphan', kind: 'Block', owner: 'yok', name: 'Sahipsiz' };
    m.els.badrel = { id: 'badrel', kind: 'Satisfy', owner: m.rootId, src: 'yok1', tgt: anyBlock.id };
    m.els.future = { id: 'future', kind: 'GelecekTuru', owner: m.rootId, name: 'X' };
    m.els.loopA = { id: 'loopA', kind: 'Package', owner: 'loopB', name: 'A' }; m.els.loopB = { id: 'loopB', kind: 'Package', owner: 'loopA', name: 'B' };
    const d = Object.values(m.els).find(e => e.kind === 'Diagram'); d.shapes.push({ id: 'ghost', el: 'yok', x: 0, y: 0, w: 10, h: 10 }); d.edges.push({ id: 'ge', s: 'ghost', t: d.shapes[0].id, kind: 'Dependency' });
    const notes = migrateModel(m); loadModel(m); afterLoad();
    Object.values(M.els).filter(e => e.kind === 'Diagram').forEach(x => { openD(x.id); });
    return { notes, orphanOwner: E('orphan').owner === M.rootId, badrel: !E('badrel'), future: E('future').kind, v: M.v };
  });
  ok('eski/bozuk dosya onarılıp açılıyor', repair.orphanOwner && repair.badrel && repair.future === 'Comment' && repair.v === 2, repair);

  console.log('5) Dışa aktarımlar');
  const ex = await run(async () => {
    const d = Object.values(M.els).find(e => e.kind === 'Diagram' && e.shapes.length > 3); openD(d.id);
    const r = {};
    const svg = exportSVGString(); r.svg = !!(svg && svg.str.length > 500);
    r.png = await new Promise(res => { try { toPNG(b => res(b && b.size > 1000)); } catch (e) { res('HATA ' + e.message); } setTimeout(() => res('zaman aşımı'), 8000); });
    const xb = buildXlsx([{ name: 'S1', rows: [['a', 'b'], [1, 2]] }]); r.xlsx = !!(xb && (xb.size || xb.length) > 100);
    exportReqIF(); const rq = window.__dl.pop(); r.reqif = !!(rq && /reqif/i.test(rq.name) && rq.size > 200);
    const xmi = xmiExport(); r.xmiLen = (xmi || '').length;
    return r;
  });
  ok('SVG / PNG / Excel / ReqIF / XMI çıktıları üretiliyor', ex.svg && ex.png === true && ex.xlsx && ex.reqif && ex.xmiLen > 1000, ex);

  console.log('6) XMI gidiş-dönüşü');
  const xr = await run(() => {
    const before = Object.values(M.els).filter(e => ['Block', 'Requirement', 'Part', 'Port'].includes(e.kind)).length;
    const txt = xmiExport(); const n0 = Object.keys(M.els).length;
    const r = xmiImport(txt, 'XMI testi', {});
    const added = Object.keys(M.els).length - n0;
    return { before, added, r: r && typeof r === 'object' ? Object.keys(r).slice(0, 5) : String(r) };
  });
  ok('dışa aktarılan XMI geri içe aktarılıyor', xr.added >= xr.before, xr);

  console.log('7) Analiz: parametrik çözücü, bütçe, tahsis, simülasyon');
  const an = await run(() => {
    const r = {};
    const ps = parSolveAll(false); r.param = ps.length + ' bağlam, ' + ps.reduce((a, x) => a + x.vals.filter(v => v.val != null).length, 0) + ' değer';
    r.solveFor = Math.abs(solveFor(parseEqs('F = m * a')[0], new Map([['F', 10], ['m', 2]]), 'a') - 5) < 1e-6;
    openD('@budget'); r.budget = document.querySelector('#view .vbody').textContent.length > 50;
    openD('@alloc'); r.alloc = document.querySelector('#view .vbody').textContent.length > 20;
    const act = Object.values(M.els).find(e => e.kind === 'Diagram' && e.dtype === 'act' && e.shapes.length > 3);
    if (act) { openD(act.id); simStart(); for (let i = 0; i < 12 && SIM && !SIM.done; i++) simStepNow(false); r.simAct = SIM ? SIM.log.length : 0; simStop(); }
    const stm = Object.values(M.els).find(e => e.kind === 'Diagram' && e.dtype === 'stm' && e.shapes.length > 3);
    if (stm) { openD(stm.id); simStart(); simStepNow(false); r.simStm = SIM ? SIM.log.length : 0; simStop(); }
    return r;
  }).catch(e => ({ error: e.message }));
  ok('analiz ve simülasyon çalışıyor', !an.error && an.budget && an.alloc && an.simAct > 1 && an.simStm > 0, an);

  console.log('8) Şablonlar');
  const tp = await run(() => { const n0 = Object.keys(M.els).length; applyTemplate('810', M.rootId, { tests: true, item: 'Birim' }); const n1 = Object.keys(M.els).length; openD('@vcrm'); return { added: n1 - n0 }; });
  ok('MIL-STD-810H şablonu eklenebiliyor', tp.added > 20, tp);

  console.log('8a) Türkçe gereksinim yazım kuralı (-ecek / -acak)');
  const qr = await run(() => {
    const q = t => reqQuality({ id: 'q', reqId: 'Q', text: t }, null).map(x => x[1]).join(' | ');
    return { ok1: q('Sistem 28 V ile çalışacaktır.'), ok2: q('Sistem kütlesi 45 kg\'ı aşmayacak.'), mali: q('Sistem 28 V ile çalışmalıdır.'), yok: q('Sistem 28 V ile çalışır.'), cift: q('Sistem veriyi kaydedecek ve iletecektir.'), par: q('Sistem koşullarda çalışacaktır (bkz. Tablo 3).') };
  });
  ok('"-ecektir/-acaktır" kabul, "-malıdır" ve eksik ek uyarı, çoklu ister tespiti', !qr.ok1 && !qr.ok2 && /ecektir/.test(qr.mali) && /bitmiyor/.test(qr.yok) && /Birden fazla/.test(qr.cift) && !qr.par, qr);

  console.log('8b) Gereksinim dışa aktarma sütun seçimi');
  const exs = await run(async () => {
    const x = expCfg(); x.cols = ['reqId', 'text', 'status']; x.scope = 'Sistem'; x.sheets = { mx: false, cov: false, q: false, vc: false };
    window.__dl = []; exportReqsXlsx(); const f = window.__dl.pop();
    const sh = await readXlsx(new Uint8Array(await f.blob.arrayBuffer())); const s0 = Array.isArray(sh) ? sh[0] : sh;
    exportReqIF(); const rq = await window.__dl.pop().blob.text();
    await exportReqsDocx(); const dx = window.__dl.pop();
    return { sheets: Array.isArray(sh) ? sh.length : 1, head: (s0.rows || [])[0], rows: (s0.rows || []).length, reqifHasName: /ReqIF\.Name/.test(rq), reqifStatus: /AD-STATUS/.test(rq), docx: dx && dx.size > 3000 };
  }).catch(e => ({ error: e.message }));
  ok('Excel yalnız seçilen sütun/sayfalarla, ReqIF seçime uygun, Word spesifikasyonu üretiliyor', !exs.error && exs.sheets === 1 && JSON.stringify(exs.head) === JSON.stringify(['Gereksinim ID', 'Gereksinim Metni', 'Durum']) && !exs.reqifHasName && exs.reqifStatus && exs.docx, exs);

  console.log('8c) Test profilleri');
  const pf = await run(() => {
    const p = newProfile('psd', M.rootId, { pts: [[20, 0.01], [80, 0.04], [350, 0.04], [2000, 0.007]] });
    const flat = newProfile('psd', M.rootId, { pts: [[20, 0.04], [2000, 0.04]] });
    const sine = newProfile('sine', M.rootId, { pts: [[5, 0.25], [2000, 0.25]], rate: 1, sweeps: 1, axes: 'X' });
    const th = newProfile('thermal', M.rootId, { pts: [[0, 25], [10, -40], [70, -40], [90, 70], [150, 70], [160, 25]], cycles: 2 });
    const c = pfCompare(flat, p), env = pfEnvelope([p, flat]);
    const ms = pfMetrics(sine), mt = pfMetrics(th);
    openD('@profiles');
    const d = Object.values(M.els).find(e => e.kind === 'Diagram' && e.dtype === 'req'); const sh = addShape(d, p.id, 900, 900); openD(d.id); renderDiagram();
    return { navmat: +pfMetrics(p).grms.toFixed(2), flat: +pfMetrics(flat).grms.toFixed(3), covers: c.covers, minMargin: +c.min[3].toFixed(2), envMax: Math.max(...env.map(q => q[1])), envPts: env.length,
      sineDpp: +ms.dmax.toFixed(2), sineMin: +ms.total.toFixed(2), thRate: mt.rmax, thTotal: mt.total, svg: pfChart([{ p }]).length > 1000, onDiagram: !!document.querySelector(`[data-sid="${sh.id}"]`) };
  });
  ok('Grms, karşılaştırma, zarf, sinüs, termal hesapları ve diyagram şekli doğru', pf.navmat === 6.06 && pf.flat === 8.899 && pf.covers === true && pf.minMargin === 0 && pf.envMax === 0.04 && pf.sineDpp === 4.97 && pf.sineMin === 8.64 && pf.thRate === 6.5 && pf.thTotal === 320 && pf.svg && pf.onDiagram, pf);

  console.log('8d) FMEA / FMECA ve risk');
  const fr = await run(async () => {
    const b = Object.values(M.els).find(e => e.kind === 'Block');
    const f = mk('FailureMode', b.id, { name: 'Test modu', S: 9, O: 4, D: 5, S2: 9, O2: 2, D2: 3, lam: '2', alpha: '0.5', beta: '1', top: '100', fst: 'Açık' });
    const r = rkAdd({ P: 4, I: 5, P2: 2, I2: 3 });
    openD('@fmea'); const fmeaRows = document.querySelectorAll('#view tr[data-row]').length;
    openD('@risk'); const cells = document.querySelectorAll('#view [data-rkc]').length;
    window.__dl = []; fmeaXlsx(); const x = window.__dl.pop(); const sh = await readXlsx(new Uint8Array(await x.blob.arrayBuffer()));
    const o = { sec: {}, dia: [], risk: true }; const B = buildReport(o);
    const v = validateModel().filter(q => q.id === f.id || q.id === r.id).map(q => q.rule);
    return { rpn: rpnOf(f), rpn2: rpnOf(f, true), cm: cmOf(f), cat: sevCat(9), score: rkScore(r), lvl: rkLevel(rkScore(r)), res: rkLevel(rkScore(r, true)), rid: r.riskId, fmeaRows, cells, sheets: sh.length, reportImgs: B.filter(q => q.t === 'img').length, reportHas: B.some(q => q.t === 'h' && /FMEA/.test(q.x)), v };
  }).catch(e => ({ error: e.message }));
  ok('RPN, Cm, şiddet sınıfı, risk skoru/seviyesi, matris, Excel, rapor, doğrulama', !fr.error && fr.rpn === 180 && fr.rpn2 === 54 && fr.cm === 100 && fr.cat === 'I' && fr.score === 20 && fr.lvl === 'Çok yüksek' && fr.res === 'Orta' && /^R-\d{3}$/.test(fr.rid) && fr.fmeaRows >= 5 && fr.cells === 50 && fr.sheets === 3 && fr.reportImgs === 1 && fr.reportHas && fr.v.includes('FMEA önlemsiz yüksek RPN'), fr);

  console.log('8e) N² ve ICD, arayüz uyumsuzluğu');
  const ic = await run(async () => {
    const pk = mk('Package', M.rootId, { name: 'ICD testi' });
    const ctx = mk('Block', pk.id, { name: 'Bağlam' }), A = mk('Block', pk.id, { name: 'A' }), Bb = mk('Block', pk.id, { name: 'B' });
    const ib = mk('InterfaceBlock', pk.id, { name: 'IF' }); mk('FlowProp', ib.id, { name: 'akım', dir: 'out', vtype: 'Real', unit: 'A' });
    const ib2 = mk('InterfaceBlock', pk.id, { name: 'IF2' }); mk('FlowProp', ib2.id, { name: 'akım', dir: 'in', vtype: 'Real', unit: 'mA' });
    const pa = mk('Port', A.id, { name: 'o', type: ib.id }), pb = mk('Port', Bb.id, { name: 'i', type: ib2.id }), pa2 = mk('Port', A.id, { name: 'x', dir: 'out' }), pb2 = mk('Port', Bb.id, { name: 'y', dir: 'out' });
    const a = mk('Part', ctx.id, { name: 'a', type: A.id }), b = mk('Part', ctx.id, { name: 'b', type: Bb.id });
    const c1 = mk('Connector', ctx.id, { src: pa.id, tgt: pb.id, sp: a.id, tp: b.id, name: 'c1' }), c2 = mk('Connector', ctx.id, { src: pa2.id, tgt: pb2.id, sp: a.id, tp: b.id, name: 'c2' });
    IV.ctx = ctx.id; IV.mode = 'part'; const D = n2Data(); openD('@n2'); openD('@icd');
    const n = ensureIfIds(); window.__dl = []; icdXlsx(); const x = window.__dl.pop(); const sh = await readXlsx(new Uint8Array(await x.blob.arrayBuffer()));
    await icdDocx(); const dx = window.__dl.pop(); IV.ctx = 'all';
    return { i1: icdIssues(c1).map(q => q[0] + ':' + q[1]), i2: icdIssues(c2).map(q => q[0]), dir1: cFlowDir(cEnd(c1, 0), cEnd(c1, 1)), nodes: D.nodes.length, ab: (D.cells.get(a.id + '|' + b.id) || []).length, ba: (D.cells.get(b.id + '|' + a.id) || []).length, ids: n, sheets: sh.length, docx: dx && dx.size > 3000, val: validateModel().filter(q => q.id === c1.id).length };
  }).catch(e => ({ error: e.message }));
  ok('N² hücreleri, yön, birim uyumsuzluğu, yön çelişkisi, ICD Excel/Word', !ic.error && ic.i1.some(q => /birim uyumsuz/.test(q)) && ic.i2.includes('hata') && ic.dir1 === 1 && ic.nodes === 2 && ic.ab === 2 && ic.ba === 1 && ic.ids >= 2 && ic.sheets === 2 && ic.docx && ic.val >= 1, ic);

  console.log('8f) Şartnameden gereksinim çıkarma, model karşılaştırma, inceleme notları');
  const p9 = await run(async () => {
    const txt = '3 Gereksinimler\n3.1 Güç\n3.1.1 Sistem 28 V DC ile çalışacaktır. Sistem ters kutup korumasına sahip olacaktır.\n[TŞ-014] Sistem 30 s içinde hazır olacaktır.\nTŞ-020\tSistem -40 °C ile +71 °C arasında çalışacaktır.\tTest\nBu bölüm bilgi amaçlıdır.';
    const c1 = extractReqs(textBlocks(txt), 't.txt');
    const bl = await buildDocx([{ t: 'h', lv: 1, x: 'Gereksinimler' }, { t: 'p', x: 'Sistem 28 V ile çalışacaktır.' }, { t: 'table', head: ['No', 'Gereksinim'], rows: [['TŞ-1', 'Sistem 45 kg\'ı aşmayacaktır.']], w: [30, 70] }], { title: 'Ş' });
    const c2 = extractReqs(await docxBlocks(new Uint8Array(await bl.arrayBuffer())), 'x.docx');
    const O = JSON.parse(JSON.stringify(M)); const r1 = Object.values(O.els).find(e => e.kind === 'Requirement'); r1.text = 'Değişmiş metin olacaktır.'; O.els._nb = { id: '_nb', kind: 'Block', owner: O.rootId, name: 'YeniBlok', doc: '' };
    cmpLoad(O, 'o.sysml'); const st = CMP.rows.map(r => r.st).sort().join(','); CMP.rows.forEach(r => CMP.sel.add(r)); cmpApply();
    const applied = E(r1.id).text === 'Değişmiş metin olacaktır.' && Object.values(M.els).some(e => e.name === 'YeniBlok');
    const tgt = Object.values(M.els).find(e => e.kind === 'Block'); ST.tsel = tgt.id; renderProps(); document.getElementById('noteTx').value = 'Kontrol edilsin'; noteAct('add|' + tgt.id);
    const open1 = noteOpen(tgt); noteAct('tog|' + tgt.id + '|' + (tgt.notes.length - 1)); const open2 = noteOpen(tgt); openD('@reviews');
    return { c1: c1.map(c => c.srcNo), c2: c2.map(c => c.srcNo + '|' + c.text), st, applied, open1, open2 };
  }).catch(e => ({ error: e.message }));
  ok('Metin/Word çıkarımı (bölüm no, ister no, tablo), fark + uygulama, not aç/kapat', !p9.error && JSON.stringify(p9.c1) === JSON.stringify(['Md. 3.1.1/1', 'Md. 3.1.1/2', 'TŞ-014', 'TŞ-020']) && p9.c2.length === 2 && p9.c2[1].startsWith('TŞ-1|') && /Değişen/.test(p9.st) && /Eklenen/.test(p9.st) && p9.applied && p9.open1 >= 1 && p9.open2 === p9.open1 - 1, p9);

  console.log('8g) Komut paleti, tema, durum geçiş tablosu, kullanıldığı yerler');
  await page.keyboard.press('Control+k'); await page.waitForTimeout(100); await page.keyboard.type('risk kayd'); await page.waitForTimeout(100); await page.keyboard.press('Enter'); await page.waitForTimeout(200);
  const p10 = await run(() => {
    const viaPalette = ST.cur;
    const items = paletteItems().length;
    const sm = stmList()[0]; STV.sm = sm.id; STV.mode = 'table'; openD('@stt'); const rowsT = document.querySelectorAll('#view tr[data-row]').length; STV.mode = 'matrix'; renderView();
    const b = Object.values(M.els).find(e => e.kind === 'Block' && kidsOf(e.id).some(c => c.kind === 'Port'));
    const wu = whereUsed(b.id).map(g => g[0]); ST.tsel = b.id; renderProps(); const hasWU = !!document.querySelector('#props details.wu');
    ACT.theme(); const dark = document.body.classList.contains('dark'); ACT.theme();
    return { viaPalette, items, rowsT, wu, hasWU, dark, light: !document.body.classList.contains('dark') };
  });
  ok('Ctrl+K ile görünüm açılıyor, geçiş tablosu ve matris, kullanıldığı yerler, tema geçişi', p10.viaPalette === '@risk' && p10.items > 60 && p10.rowsT >= 5 && p10.wu.includes('Gösterildiği diyagramlar') && p10.hasWU && p10.dark && p10.light, p10);

  console.log('8h) Seçili bloğun "+" düğmesiyle ekleme');
  const pb = await run(() => { const pk = mk('Package', M.rootId, { name: 'Plus testi' }); const b = mk('Block', pk.id, { name: 'Ana' }); const d = newDiagramCore(pk.id, 'bdd', 'Plus BDD'); const sh = addShape(d, b.id, 100, 100, 170, 80); openD(d.id); ST.sel = new Set([sh.id]); renderDiagram(); return { sid: sh.id, bid: b.id }; });
  const clickPlus = async () => { const bb = await page.locator('[data-plus]').boundingBox(); await page.mouse.click(bb.x + bb.width / 2, bb.y + bb.height / 2); await page.waitForTimeout(120); };
  await clickPlus(); await page.click('#ctx .mi:has-text("Part property")'); await page.fill('[data-qf="tname"]', 'Alt Blok'); await page.selectOption('[data-qf="mult"]', '2'); await page.click('#qfO'); await page.waitForTimeout(120);
  await run(s0 => { ST.sel = new Set([s0]); renderDiagram(); }, pb.sid); await clickPlus(); await page.click('#ctx .mi:has-text("Value property")'); await page.fill('[data-qf="name"]', 'kütle'); await page.fill('[data-qf="def"]', '3'); await page.keyboard.press('Enter'); await page.waitForTimeout(120);
  await run(s0 => { ST.sel = new Set([s0]); renderDiagram(); }, pb.sid); await clickPlus(); await page.click('#ctx .mi:has-text("Generalization → yeni üst tip")'); await page.fill('[data-qf="name"]', 'Temel'); await page.click('#qfO'); await page.waitForTimeout(120);
  const pr = await run(id => { const k = kidsOf(id); const rels = Object.values(M.els).filter(r => KIND[r.kind].rel && (r.src === id || r.tgt === id)).map(r => r.kind + ':' + nm(E(r.src)) + '→' + nm(E(r.tgt))); const d = cur(); const ov = d.shapes.filter(a => !a.parent).some(a => d.shapes.filter(b2 => !b2.parent && b2 !== a).some(b2 => a.x < b2.x + b2.w && a.x + a.w > b2.x && a.y < b2.y + b2.h && a.y + a.h > b2.y)); return { kids: k.map(x => x.kind + ':' + x.name + (x.mult ? '[' + x.mult + ']' : '')), rels, shapes: d.shapes.length, edges: d.edges.length, overlap: ov }; }, pb.bid);
  ok('Part (yeni blok + Composition), value, yeni üst tip; çakışma yok', pr.kids.some(k => /^Part:.*\[2\]$/.test(k)) && pr.kids.includes('Value:kütle') && pr.rels.some(r => r.startsWith('Composition:Ana→Alt Blok')) && pr.rels.some(r => r === 'Generalization:Ana→Temel') && pr.shapes === 3 && pr.edges === 2 && !pr.overlap, pr);

  console.log('8j) Test yürütme, numune ve NCR');
  const tx0 = await run(() => { const tc = newTest({ name: 'Yürütme testi', procNo: 'TP-X-1' }); const rq = allReqs()[0]; addRel('Verify', tc.id, rq.id); rq.status = 'Onaylı'; const a = taAdd({ name: 'Numune X', sn: 'X-01' }); tc.articles = [a.id]; openTestRun(tc.id); return { tc: tc.id, rq: rq.id, a: a.id }; });
  for (let i = 0; i < 2; i++) { await page.click('#view [data-tx="add"]'); await page.waitForTimeout(80); }
  await page.click('#view .ce2[data-si="0"][data-sk="a"]'); await page.keyboard.type('Gerilim uygula'); await page.keyboard.press('Enter'); await page.waitForTimeout(80);
  await page.keyboard.type('Akımı ölç'); await page.click('#view h3'); await page.waitForTimeout(100);
  await page.selectOption('#view [data-sx="0"]', 'Geçti'); await page.waitForTimeout(80);
  const mid = await run(id => testResult(E(id)), tx0.tc);
  await page.selectOption('#view [data-sx="1"]', 'Kaldı'); await page.waitForTimeout(80);
  await page.click('#view [data-tx="ncrstep"][data-i="1"]'); await page.waitForTimeout(150);
  const tx = await run(async o => {
    const tc = E(o.tc), n = allNCRs().find(x => x.test === o.tc);
    const r = { steps: tcSteps(tc).map(s => s.a + ':' + s.r), res: testResult(tc), mid: null, ncr: n && n.ncrId, ncrReqs: n && n.reqs.length, ncrArt: n && n.article === o.a, view: ST.cur, stepLinked: n && n.stepId === tcSteps(tc)[1].id };
    openD('@vcrm'); r.vcrm = [...document.querySelectorAll(`#view tr[data-row="${o.rq}"] .ncrc`)].map(x => x.textContent);
    r.q = reqQuality(E(o.rq)).map(x => x[1]).filter(x => /NCR/.test(x));
    const t2 = cloneRetest(tc); n.retest = t2.id; n.disp = 'Tekrar test'; n.nst = 'Kapandı';
    r.v1 = validateModel().filter(q => q.id === n.id).map(q => q.rule);
    t2.steps.forEach(s => s.r = 'Geçti'); applyStepsResult(t2); n.cause = 'x';
    r.v2 = validateModel().filter(q => q.id === n.id).map(q => q.rule); r.t2 = [t2.steps.length, testResult(t2), testReqs(t2).length];
    openD('@articles'); r.hist = articleHistory(E(o.a)).length;
    window.__dl = []; ncrXlsx(); const x = window.__dl.pop(); const sh = await readXlsx(new Uint8Array(await x.blob.arrayBuffer())); r.sheets = sh.map(s => s.name + ':' + s.rows.length);
    const B = buildReport({ sec: {}, dia: [], testexec: true }); r.rep = B.some(q => q.t === 'h' && /Test yürütme/.test(q.txt || q.t2 || JSON.stringify(q)));
    return r;
  }, tx0).catch(e => ({ error: e.message }));
  tx.mid = mid;
  ok('Adımlar düzenleniyor, sonuç adımlardan, NCR adımdan açılıyor, VCRM/kalite, tekrar test, Excel, rapor', !tx.error && tx.mid === 'Planlandı' && tx.steps.join('|') === 'Gerilim uygula:Geçti|Akımı ölç:Kaldı' && tx.res === 'Kaldı' && /^NCR-\d{3}$/.test(tx.ncr) && tx.ncrReqs === 1 && tx.ncrArt && tx.stepLinked && tx.view === '@ncr' && tx.vcrm.length === 1 && tx.q.length === 1 && tx.v1.length >= 2 && !tx.v2.length && tx.t2.join() === '2,Geçti,1' && tx.hist >= 2 && tx.sheets.length === 3 && tx.rep, tx);

  console.log('8k) Test kaynakları, bağımlılık, kritik yol, kayma');
  const pl = await run(async () => {
    const td = '2030-01-10', A = newTest({ name: 'Plan A', procNo: 'PA', pStart: td, pEnd: addDaysISO(td, 4) }), Bt = newTest({ name: 'Plan B', procNo: 'PB', pStart: addDaysISO(td, 3), pEnd: addDaysISO(td, 6) }), Cc = newTest({ name: 'Plan C', procNo: 'PC', pStart: addDaysISO(td, 2), pEnd: addDaysISO(td, 3) });
    const r = resAdd({ name: 'Sarsıcı X', rtype: 'Sarsıcı (titreşim)', cal: addDaysISO(td, 5) });
    A.res = [r.id]; Bt.res = [r.id]; Bt.deps = [A.id];
    const S = schedInfo(), o = {};
    o.pair = S.pairs.filter(x => x.x === r).map(x => x.a.procNo + '/' + x.b.procNo); o.dep = S.depBad.filter(x => x.t === Bt).map(x => x.d); o.critB = S.crit.has(Bt.id); o.tfC = S.tf.get(Cc.id);
    o.cyc = isSucc(A.id, Bt.id) && !isSucc(Bt.id, A.id);
    const sh = slipPlan(A, 2); o.slip = [sh.get(A.id), sh.get(Bt.id) || 0];
    const v = validateModel().map(q => q.rule); o.val = ['Kaynak çakışması', 'Bağımlılık ihlali', 'Kalibrasyon'].map(k => v.includes(k));
    CP.mode = 'res'; openD('@campaign'); o.resRows = document.querySelectorAll('#view svg.gantt [data-goto="' + r.id + '"]').length; CP.mode = 'tests'; renderView();
    o.arrows = document.querySelectorAll('#view svg.gantt path[marker-end]').length;
    openD('@resources'); o.view = !!document.querySelector('#view tr[data-row="' + r.id + '"]');
    window.__dl = []; planXlsx(); const x = window.__dl.pop(); const shs = await readXlsx(new Uint8Array(await x.blob.arrayBuffer())); o.sheets = shs.length;
    const g = ganttSVG(allTests(), { raw: true }); o.png = new Blob([await svgToPng(g, 1)]).size > 1000;
    snap(); slipPlan(A, 2).forEach((d, id) => { const t = E(id); t.pStart = addDaysISO(t.pStart, d); t.pEnd = addDaysISO(t.pEnd, d); });
    o.after = schedInfo().depBad.filter(q => q.t === Bt).length;
    [A, Bt, Cc, r].forEach(e => delModel([e.id]));
    return o;
  }).catch(e => ({ error: e.message }));
  ok('Kaynak/bağımlılık çakışması, bolluk, döngü engeli, kayma, kaynak satırları, Excel, PNG', !pl.error && pl.pair.join() === 'PA/PB' && pl.dep.join() === '2' && pl.critB && pl.tfC > 0 && pl.cyc && pl.slip.join() === '2,4' && pl.val.every(Boolean) && pl.resRows >= 1 && pl.arrows >= 1 && pl.view && pl.sheets === 3 && pl.png && pl.after === 0, pl);

  console.log('8l) Test prosedürü / raporu ve doküman şablonları');
  const dc = await run(async () => {
    const tc = allTests().find(t => tcSteps(t).length) || newTest({ name: 'Doküman testi', steps: [{ id: uid(), a: 'Adım', exp: 'Beklenen', meas: '1', r: 'Geçti' }] });
    const c = docCfg(); c.checker = 'K'; c.approver = 'O'; c.sign = true; c.revs.srs = [{ rev: 'A', date: '2026-01-01', desc: 'İlk', by: 'X' }]; c.meta.srs = { docNo: 'SRS-9', rev: 'B' };
    c.tpl.tp = { order: ['steps', 'scope'], off: ['refs', 'sign'] };
    const r = {}, secs = docSecs('tp'); r.order = secs.slice(0, 2).map(x => x.k).join(); r.off = secs.filter(x => !x.on).map(x => x.k).join();
    const B = testDocBlocks('tp', tc, {}); r.h1 = B.filter(b => b.t === 'h' && b.lv === 1).map(b => b.x);
    const Btr = testDocBlocks('tr', tc, {}); r.tr = Btr.some(b => b.t === 'table' && b.head.includes('Ölçülen / gözlenen'));
    const ap = docTplApply({ kind: 'srs', title: 'x', docNo: '' }); r.ap = [ap.docNo, ap.rev, ap.checker, ap.sign, ap.revs.length].join();
    window.__dl = []; const o = { kind: 'tp', title: nm(tc) }; const bl = await buildDocx(B, o); const t = new TextDecoder().decode(new Uint8Array(await bl.arrayBuffer()));
    r.zip = bl.size > 2000;
    exportReqsDocx && (await exportReqsDocx()); const x = window.__dl.pop(); r.srs = !!x && /Gereksinimler\.docx$/.test(x.name);
    delete c.tpl.tp; c.sign = false;
    docDialog('tr', tc.id); r.dlg = !!document.querySelector('#modalBox #ddRev') && document.querySelectorAll('#modalBox [data-dsec]').length === 11; $('#modal').style.display = 'none';
    return r;
  }).catch(e => ({ error: e.message }));
  ok('Bölüm sırası/seçimi şablondan, TP/TR blokları, kapak bilgisi birleşimi, Word, pencere', !dc.error && dc.order === 'steps,scope' && dc.off === 'refs,sign' && dc.h1[0] === '1. Test adımları' && dc.h1.length === 8 && dc.tr && dc.ap === 'SRS-9,B,K,true,1' && dc.zip && dc.srs && dc.dlg, dc);

  console.log('8m) IBD eşitleme, bağlam diyagramı, bul-değiştir, toplu düzenleme, lejant kuralı');
  const mh = await run(() => {
    const o = {}, pk = mk('Package', M.rootId, { name: 'Hız testi' });
    const A = mk('Block', pk.id, { name: 'Sistem H' }), Bk = mk('Block', pk.id, { name: 'Alt H' }), X = mk('Block', pk.id, { name: 'Dış H' }), act = mk('Actor', pk.id, { name: 'Kullanıcı H' });
    const bdd = newDiagramCore(pk.id, 'bdd', 'H BDD'); addShape(bdd, A.id, 40, 40); addShape(bdd, Bk.id, 40, 240);
    mk('Composition', pk.id, { src: A.id, tgt: Bk.id, name: '' }); mk('Association', pk.id, { src: A.id, tgt: X.id, name: '' });
    const sb = mk('Subject', pk.id, { name: 'Sistem H' }), uc = mk('UseCase', sb.id, { name: 'Kullan H' }); mk('Association', pk.id, { src: act.id, tgt: uc.id, name: '' });
    openD(bdd.id); ibdsFromBDD(bdd); const ibd = ibdsOf(A)[0]; o.ibd = !!ibd && ibd.shapes.some(s => E(s.el).kind === 'Part' && E(s.el).type === Bk.id);
    const ex = contextExternals(A).map(x => x.e.name).sort(); o.ext = ex.join();
    mk('Part', A.id, { name: 'ek', type: X.id }); openD(ibd.id); const r = syncIBD(ibd); o.sync = r.parts; o.ext2 = contextExternals(A).length;
    const cd = contextDiagram(A.id, true); o.ctx = cd && cd.shapes.length;
    FR = Object.assign(FR, { f: 'H BDD', r: 'H-BDD', cs: true, ww: false, kind: 'all', off: new Set() }); FR.g.name = true;
    const hits = frHits(); o.hits = hits.length; hits.forEach(h => { h.e[h.f] = frReplaceVal(h.e[h.f]); }); o.ren = bdd.name;
    openD(bdd.id); ST.sel = new Set(bdd.shapes.map(s => s.id)); renderProps(); o.bulk = /Toplu düzenleme/.test($('#props').textContent);
    const T = bulkTargets(); T.L.forEach(x => { x.sh.fill = '#123456'; }); o.fill = bdd.shapes.every(s => s.fill === '#123456');
    const rq = allReqs()[0], rd = newDiagramCore(pk.id, 'req', 'H REQ'); addShape(rd, rq.id, 40, 40); const L = mk('Legend', rd.owner, { name: 'L', rule: 'reqStatus' }); addShape(rd, L.id, 400, 40, 200, 80);
    const c = legendCalc(rd); o.leg = c.items.get(L.id).length === 1 && !!legendFill(rd, rq);
    ST.sel.clear(); delModel([pk.id]);
    return o;
  }).catch(e => ({ error: e.message }));
  ok('IBD üretim/eşitleme, bağlam dış elemanları, bul-değiştir, toplu düzenleme, lejant kuralı', !mh.error && mh.ibd && mh.sync === 1 && mh.ext === 'Dış H,Kullanıcı H' && mh.ext2 === 1 && mh.ctx === 2 && mh.hits === 1 && mh.ren === 'H-BDD' && mh.bulk && mh.fill && mh.leg, mh);

  console.log('8n) Modüller: dışa aktarma, salt okunur ekleme, koruma, güncelleme');
  const md = await run(async () => {
    const o = {};
    /* kaynak model: paket + blok + gereksinim */
    const src = JSON.parse(JSON.stringify(M));
    const pk = mk('Package', M.rootId, { name: 'Ortak Arayüzler' }), b1 = mk('Block', pk.id, { name: 'Ortak Blok' }), rq = mk('Requirement', pk.id, { name: 'Ortak', text: 'Sistem 5 V ile çalışacaktır.' });
    const mod1 = buildModule(pk); o.n1 = Object.keys(mod1.els).length;
    b1.name = 'Ortak Blok v2'; mk('Block', pk.id, { name: 'Yeni Blok' }); pk.modOut = { rev: 1 }; const mod2 = buildModule(pk); o.rev2 = mod2.rev;
    /* hedef model: kaynağı içermeyen kopya */
    loadModel(src); afterLoad();
    await importModule('', { m: mod1, path: '', fname: 'ortak.sysmod' });
    o.ro = isRO(b1.id) && !!M.mods[pk.id];
    const my = mk('Block', M.rootId, { name: 'Benim' }); mk('Association', M.rootId, { src: my.id, tgt: b1.id, name: '' }); afterChange();
    o.link = Object.values(M.els).some(r => r.kind === 'Association' && r.tgt === b1.id);
    snap(); E(b1.id).name = 'Değiştirdim'; mk('Block', pk.id, { name: 'İçeri' }); afterChange();
    o.guard = E(b1.id).name === 'Ortak Blok' && !kidsOf(pk.id).some(x => x.name === 'İçeri') && Object.values(M.els).some(x => x.name === 'İçeri' && x.owner === M.rootId);
    E(b1.id).notes = [{ id: 'n1', t: new Date().toISOString(), u: 'X', txt: 'not', st: 'Açık' }]; afterChange(); o.notes = (E(b1.id).notes || []).length === 1;
    await moduleUpdate(pk.id, { m: mod2, path: '', fname: 'ortak.sysmod' }, true);
    o.cmp = ST.cur === '@compare' && CMP && CMP.rows.length >= 2;
    CMP.rows.forEach(r => CMP.sel.add(r)); try { cmpApply(); } catch (e) { o.cmpErr = e.message; }
    o.after = E(b1.id) && E(b1.id).name === 'Ortak Blok v2' && kidsOf(pk.id).some(x => x.name === 'Yeni Blok') && M.mods[pk.id].rev === 2;
    o.keep = Object.values(M.els).some(r => r.kind === 'Association' && r.tgt === b1.id);
    snap(); E(b1.id).name = 'Yine'; afterChange(); o.guard2 = E(b1.id).name === 'Ortak Blok v2';
    undo(); o.undo = E(b1.id).name === 'Ortak Blok v2';
    await moduleUpdate(pk.id, { m: mod1, path: '', fname: 'ortak.sysmod' }, false); o.direct = E(b1.id).name === 'Ortak Blok' && M.mods[pk.id].rev === 1 && !kidsOf(pk.id).some(x => x.name === 'Yeni Blok');
    openD('@modules'); o.view = /Ortak Arayüzler/.test(document.querySelector('#view').textContent);
    ST.tsel = b1.id; renderProps(); o.props = !!document.querySelector('#props .robar') && document.querySelector('#props input[data-f="name"]') && document.querySelector('#props input[data-f="name"]').disabled;
    window.confirm = () => true; moduleDetach(pk.id); E(b1.id).name = 'Serbest'; afterChange(); o.detach = E(b1.id).name === 'Serbest' && !M.mods[pk.id];
    delModel([pk.id, my.id]); afterChange();
    return o;
  }).catch(e => ({ error: e.message + ' ' + (e.stack || '').split('\n')[1] }));
  ok('Modül dışa aktarma, salt okunur ekleme, koruma, not, karşılaştırarak ve doğrudan güncelleme, kopma', !md.error && md.n1 === 3 && md.rev2 === 2 && md.ro && md.link && md.guard && md.notes && md.cmp && md.after && md.keep && md.guard2 && md.undo && md.direct && md.view && md.props && md.detach, md);

  console.log('8o) Simgeler, sürükleyerek ilişki, manipülatör, hizalama kılavuzu');
  const ic0 = await run(() => { const pk = mk('Package', M.rootId, { name: 'Sürükle' }), a = mk('Block', pk.id, { name: 'SA' }), b = mk('Block', pk.id, { name: 'SB' }), c = mk('Block', pk.id, { name: 'SC' }); const d = newDiagramCore(pk.id, 'bdd', 'Sürükle BDD'); const A = addShape(d, a.id, 60, 60, 160, 80), B = addShape(d, b.id, 420, 60, 160, 80), C = addShape(d, c.id, 420, 300, 160, 80); openD(d.id); d.vx = 60; d.vy = 70; d.z = 1; ST.sel = new Set([A.id]); renderAll(); return { A: A.id, B: B.id, C: C.id, d: d.id, pk: pk.id }; });
  const dragTo = async (sel, tgt) => { const h = await page.locator(sel).first().boundingBox(), t = await page.locator(`[data-sid="${tgt}"]`).first().boundingBox(); await page.mouse.move(h.x + h.width / 2, h.y + h.height / 2); await page.mouse.down(); await page.mouse.move(t.x + t.width / 2, t.y + t.height / 2, { steps: 6 }); await page.mouse.up(); await page.waitForTimeout(150); };
  await dragTo('[data-mani="*"]', ic0.B);
  const menuItems = await run(() => [...document.querySelectorAll('#ctx .mi')].map(m => m.textContent.trim() + (m.querySelector('svg') ? '#' : '')));
  await page.click('#ctx .mi:has-text("Association")'); await page.waitForTimeout(120);
  await run(a => { ST.sel = new Set([a]); renderDiagram(); }, ic0.A);
  await dragTo('[data-mani="Generalization"]', ic0.C);
  const icr = await run(async o => {
    const rels = Object.values(M.els).filter(r => KIND[r.kind] && KIND[r.kind].rel && (r.src === E(shapeOf(E(o.d), o.A).el).id)).map(r => r.kind + ':' + nm(E(r.tgt)));
    const d = E(o.d), A = shapeOf(d, o.A), B = shapeOf(d, o.B); A.y = 63; const g = smartGuides(d, new Set([o.A]), 0, 0);
    menu(10, 10, toolsMenuItems()); const withIc = [...document.querySelectorAll('#ctx .mi')].every(m => m.querySelector('svg')); hideMenu();
    const tb = [...document.querySelectorAll('#toolbar button[data-act]')].filter(b => b.dataset.act !== 'lang').every(b => b.querySelector('svg.uic'));
    openD('@vcrm'); await new Promise(r => setTimeout(r, 30)); const vb = [...document.querySelectorAll('#view .vbar button.vb')].every(b => b.querySelector('svg'));
    delModel([o.pk]); return { rels, guide: g.dy === -3 && g.lines.length === 1, withIc, tb, vb };
  }, ic0);
  ok('Tutamaktan sürükleyip tür seçerek, manipülatörle doğrudan ilişki; kılavuz; menü/araç çubuğu/görünüm simgeleri', menuItems.some(x => /Association#/.test(x)) && icr.rels.includes('Association:SB') && icr.rels.includes('Generalization:SC') && icr.guide && icr.withIc && icr.tb && icr.vb, Object.assign({ menuItems }, icr));

  console.log('8p) Model tarayıcı sekmeleri, süzgeç, akıllı paket, spesifikasyon penceresi');
  const sp1 = await run(async () => {
    const o = {}, pk = mk('Package', M.rootId, { name: 'Tarayıcı' }), g = mk('Block', pk.id, { name: 'Genel Blok' }), c1 = mk('Block', pk.id, { name: 'Özel Blok' }); mk('Generalization', pk.id, { src: c1.id, tgt: g.id, name: '' });
    const d = newDiagramCore(pk.id, 'bdd', 'Tarayıcı BDD');
    ST.ttab = 'dia'; renderTree(); o.dia = !!document.querySelector(`#tree [data-id="${d.id}"]`);
    ST.ttab = 'inh'; renderTree(); const rows = [...document.querySelectorAll('#tree .tr[data-id]')].map(r => r.dataset.id); o.inh = rows.indexOf(g.id) >= 0 && rows.indexOf(c1.id) > rows.indexOf(g.id);
    ST.ttab = 'tree'; ST.tq = 'Özel Blok'; renderTree(); o.q = document.querySelectorAll('#tree .tr.thit').length === 1 && !!document.querySelector(`#tree [data-id="${c1.id}"]`) && !document.querySelector(`#tree [data-id="${d.id}"]`); ST.tq = ''; renderTree();
    const sp = mk('SmartPackage', pk.id, { name: 'Testsiz', rule: { kinds: ['Requirement'], conds: [{ t: 'rel', rk: 'Verify', dir: 'in', has: false }], any: false, st: '', scope: '' } });
    const n0 = smartMembers(sp).length, rq = mk('Requirement', pk.id, { name: 'Yeni ist', text: 'Sistem çalışacaktır.' }); o.dyn = smartMembers(sp).length === n0 + 1;
    const tc = newTest({ name: 'Ist testi' }); addRel('Verify', tc.id, rq.id); o.dyn2 = smartMembers(sp).length === n0;
    sp.rule.conds = [{ f: 'name', op: 'has', v: 'yeni' }]; o.cond = smartMembers(sp).map(x => x.id).join() === rq.id;
    ST.ttab = 'smart'; renderTree(); o.smartTab = !!document.querySelector(`#tree .tr.tvirt[data-id="${rq.id}"]`); ST.ttab = 'tree'; renderTree();
    ST.tsel = c1.id; openD('@vcrm'); document.querySelector('#treeBox').focus(); document.querySelector('#treeBox').dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    o.spec = $('#modalBox').classList.contains('specw') && SPEC.id === c1.id;
    const inp = document.querySelector('#modalBox [data-spf="name"]'); inp.value = 'Özel Blok 2'; inp.dispatchEvent(new Event('change', { bubbles: true })); o.ren = E(c1.id).name === 'Özel Blok 2';
    document.querySelector('#modalBox [data-sptab="kids"]').click(); document.querySelector('#spAddK').value = 'Value'; document.querySelector('#modalBox [data-spadd]').click(); o.kid = kidsOf(c1.id).some(x => x.kind === 'Value');
    document.querySelector('#modalBox [data-sptab="rels"]').click(); o.rels = /Generalization|Genel Blok/.test(document.querySelector('#modalBox .specbody').textContent);
    document.querySelector('#modalBox [data-sptab="used"]').click(); o.used = document.querySelector('#modalBox .specbody').textContent.length > 0;
    specClose(); delModel([pk.id, tc.id]); afterChange();
    return o;
  }).catch(e => ({ error: e.message + ' ' + (e.stack || '').split('\n')[1] }));
  ok('Diyagram/kalıtım/akıllı sekmeleri, süzgeç, dinamik akıllı paket, Enter ile spesifikasyon, düzenleme', !sp1.error && Object.values(sp1).every(v => v === true), sp1);

  console.log('8q) SysML notasyonu: item flow, uç etiketleri, iç içe port, instance, sequence/aktivite notasyonu, UC senaryosu');
  const sx = await run(() => {
    const o = {}, pk = mk('Package', M.rootId, { name: 'Notasyon' }), A = mk('Block', pk.id, { name: 'NA' }), B = mk('Block', pk.id, { name: 'NB' }), sg = mk('Signal', pk.id, { name: 'Komut' });
    mk('Value', B.id, { name: 'kütle', vtype: 'Real', def: '2' }); mk('Part', A.id, { name: 'nb', type: B.id, mult: '3' }); mk('Value', A.id, { name: 'kütle', vtype: 'Real' });
    const d = newDiagramCore(pk.id, 'bdd', 'N BDD'), SA = addShape(d, A.id, 40, 40), SB = addShape(d, B.id, 400, 40);
    const ed = connect(d, 'Association', SA, SB), r = E(ed.el); r.srcRole = 'yönetici'; r.tgtMult = '0..*'; r.nav = 'tgt'; r.conv = [sg.id]; r.fdir = 's>t';
    openD(d.id); const svg = document.querySelector('#svg').innerHTML; o.adorn = svg.includes('yönetici') && svg.includes('[0..*]') && svg.includes('«flow» Komut');
    const I = instantiate(A.id, pk.id); o.inst = I.n === 4 && kidsOf(I.root.id).filter(c => c.kind === 'Instance').length === 3 && instRollup(I.root, 'kütle') === 6;
    IV2.root = I.root.id; openD('@instances'); o.table = document.querySelectorAll('#view tr[data-row]').length === 4;
    const p1 = mk('Port', B.id, { name: 'dış' }); mk('Port', p1.id, { name: 'iç' }); o.nested = canOwn('Port', 'Port') && kidsOf(p1.id).length === 1;
    const con = mk('Connector', pk.id, { src: A.id, tgt: B.id, name: '', conv: [sg.id] }); o.icd = cItems(con).some(x => x.name === 'Komut');
    const uc = mk('UseCase', pk.id, { name: 'Ölç', scn: 'Operatör: Ölçümü başlatır\nSistem: Ölçer\nSistem → Operatör: Sonucu bildirir' }), act = mk('Actor', pk.id, { name: 'Operatör' }); mk('Association', pk.id, { src: act.id, tgt: uc.id, name: '' });
    const ad = ucGenerate(uc, 'act'); o.ucAct = ad.shapes.filter(s => E(s.el).kind === 'Action').length === 3 && ad.edges.length === 4;
    const sd = ucGenerate(uc, 'sd'); o.ucSd = sd.edges.length === 3 && sd.shapes.length === 2;
    const L = sd.shapes[0], m1 = connect(sd, 'MsgAsync', L, L); E(m1.el).fl = 'found'; E(L.el).destroyed = true; addShape(sd, mk('StateInv', sd.owner, { name: 'hazır' }).id, 20, 200, 130, 30); openD(sd.id);
    const s2 = document.querySelector('#svg').innerHTML; o.seq = s2.includes('{hazır}') && /<circle[^>]*r="5"/.test(s2);
    const ob = mk('Object', pk.id, { name: 'kayıt', okind: 'datastore', stream: true }); const ad2 = newDiagramCore(pk.id, 'act', 'N ACT'); addShape(ad2, ob.id, 40, 40, 130, 44); openD(ad2.id); const s3 = document.querySelector('#svg').innerHTML; o.obj = s3.includes('«datastore»') && s3.includes('{stream}');
    delModel([pk.id]); afterChange(); return o;
  }).catch(e => ({ error: e.message + ' ' + (e.stack || '').split('\n')[1] }));
  ok('Uç rol/çokluk/yön ve item flow çizimi, instance ağacı ve toplama, iç içe port, ICD, UC senaryoları, found/değişmez/destroy, datastore/stream', !sx.error && Object.values(sx).every(v => v === true), sx);

  console.log('8r) Çalıştırılabilir simülasyon: ifade motoru, guard, zaman olayı, değişkenler, iz');
  const sm1 = await run(() => {
    const o = {};
    o.expr = xExpr('(2 + 3) * 4 - 10 / 5', new Map()) === 18 && xExpr('V >= 24 ve T < 70', new Map([['V', 28], ['T', 80]])) === 0 && xExpr('max(1, abs(-7))', new Map()) === 7;
    let bad = false; try { xExpr('2 +', new Map()); } catch (e) { bad = true; } o.err = bad;
    const V = new Map([['V', 24], ['I', 2]]); const r = xRun('P = V * I; ışığı yak; n++', V); o.run = V.get('P') === 48 && V.get('n') === 1 && r.text.length === 1;
    o.guard = xGuard('else', V) === 'else' && xGuard('P > 40', V) === true && xGuard('hazır', V) === null;
    o.after = xAfter('after(2 dk)') === 120 && xAfter('5 s') === 5;
    const pk = mk('Package', M.rootId, { name: 'Sim' }), B = mk('Block', pk.id, { name: 'Isıtıcı' }); mk('Value', B.id, { name: 'T', vtype: 'Real', def: '20' });
    const smE = mk('StateMachine', B.id, { name: 'Isıtıcı SM' }), d = newDiagramCore(smE.id, 'stm', 'Isıtıcı SM');
    const S = (k, n, x, y, ex) => addShape(d, mk(k, d.owner, Object.assign(n ? { name: n } : {}, ex || {})).id, x, y);
    const i0 = S('Initial', null, 40, 20), on = S('State', 'Isıtıyor', 20, 80, { doAct: 'T = T + 10' }), off = S('State', 'Bekliyor', 260, 80);
    connect(d, 'Transition', i0, on); const t1 = E(connect(d, 'Transition', on, off).el); t1.guard = 'T >= 40'; const t2 = E(connect(d, 'Transition', off, on).el); t2.name = 'after(5 s)'; t2.effect = 'T = T - 25';
    const t3 = E(connect(d, 'Transition', on, on).el); t3.name = 'after(1 s)';
    openD(d.id); simStart(); for (let i = 0; i < 6; i++) simStepNow(true);
    o.ctx = SIM.ctx === B.id; o.vars = SIM.vars.get('T'); o.t = SIM.t; o.series = SIM.series.length >= 6; o.trace = SIM.trace.some(x => x.k === 'tr') && SIM.trace.some(x => x.k === 'st');
    renderSimBar(); o.panel = !!document.querySelector('#simbar .simv') && !!document.querySelector('#simbar .simc svg');
    const n0 = Object.values(M.els).filter(e => e.kind === 'Interaction').length; simTraceToSeq(); o.seq = Object.values(M.els).filter(e => e.kind === 'Interaction').length === n0 + 1 && cur().dtype === 'sd' && cur().edges.length >= 2;
    simStop(); delModel([pk.id]); afterChange();
    return o;
  }).catch(e => ({ error: e.message + ' ' + (e.stack || '').split('\n')[1] }));
  ok('İfade/deyim/guard/zaman ayrıştırma; bağlam değişkenleri, do ve efekt, after() ile saat; panel, grafik, yürütme izinden sequence', !sm1.error && sm1.expr && sm1.err && sm1.run && sm1.guard && sm1.after && sm1.ctx && typeof sm1.vars === 'number' && sm1.t > 0 && sm1.series && sm1.trace && sm1.panel && sm1.seq, sm1);

  console.log('8s) Trade study, duyarlılık süpürmesi, tornado, Monte Carlo');
  const tsx = await run(() => {
    const o = {};
    const pk = mk('Package', M.rootId, { name: 'TS' }), A = n => { const b = mk('Block', pk.id, { name: n }); return b; };
    const a = A('A'), b = A('B'), c = A('C');
    [[a, 10, 5], [b, 20, 3], [c, 15, 9]].forEach(([x, m, p]) => { mk('Value', x.id, { name: 'kütle', def: String(m) }); mk('Value', x.id, { name: 'perf', def: String(p) }); });
    const ts = mk('TradeStudy', pk.id, { name: 'T1', alts: [a.id, b.id, c.id], crit: [{ name: 'Kütle', prop: 'kütle', w: 1, dir: 'min' }, { name: 'Perf', prop: 'perf', w: 1, dir: 'max' }] });
    let R = tsEval(ts); o.rank = R.alts[R.order[0]] === c && Math.abs(R.score[0] - 66.6667) < 0.01 && R.score[1] === 0 && R.score[2] === 75;
    ts.crit[0].w = 4; R = tsEval(ts); o.weight = R.alts[R.order[0]] === a;
    ts.crit[0].lim = 12; R = tsEval(ts); o.elim = R.elim[2].length === 1 && R.alts[R.order[0]] === a;
    ts.crit[0].lim = null; const pf = tsPareto(R, 0, 1); o.pareto = pf[0] && !pf[1] && pf[2];
    o.ws = tsWeightSens(ts).length === 2;
    o.radar = tsRadarSVG(R).str.includes('Radar') || tsRadarSVG(R).h === 60;
    TSV.ts = ts.id; TSV.tab = 'ts'; openD('@tradestudy'); o.view = !!document.querySelector('#view .tschart svg') && document.querySelectorAll('#view tr.tswin').length === 1;
    const out = tsOutputs().find(x => x.k.startsWith('par'));
    const sw = out && tsSweep({ inp: tsInputs().find(v => tsTornado(out.k).rows.some(r => r.v.id === v.id)).id, from: 1, to: 5, n: 5, outs: [out.k] });
    o.sweep = !!sw && sw.xs.length === 5 && sw.ys[0].every(y => y != null) && sw.ys[0][4] > sw.ys[0][0];
    const defs = JSON.stringify(Object.values(M.els).filter(e => e.kind === 'Value').map(e => e.def));
    const tor = tsTornado(out.k, 10); o.tor = tor.rows.length >= 2;
    const v0 = tor.rows[0].v, n0 = numOf(v0.def); v0.tol = { lo: n0 * 0.9, hi: n0 * 1.1, dist: 'uni' };
    const mc = tsMonteCarlo({ out: out.k, n: 500, seed: 7, lim: tor.base, limDir: 'max' }), mc2 = tsMonteCarlo({ out: out.k, n: 500, seed: 7 });
    o.mc = mc.valid === 500 && mc.sd > 0 && mc.p5 < mc.p95 && mc.fail > 0.3 && mc.fail < 0.7 && mc.mean === mc2.mean && mc.bins.reduce((s, x) => s + x.n, 0) === 500;
    o.restore = JSON.stringify(Object.values(M.els).filter(e => e.kind === 'Value').map(e => e.def)) === defs;
    delete v0.tol; delModel([pk.id]); afterChange(); return o;
  }).catch(e => ({ error: e.message + ' ' + (e.stack || '').split('\n')[1] }));
  ok('Ağırlıklı puan, eleme sınırı, Pareto, ağırlık duyarlılığı; görünüm; süpürme, tornado, tekrarlanabilir Monte Carlo; değerler geri yüklenir', !tsx.error && Object.values(tsx).every(v => v === true), tsx);

  console.log('8t) Metachain: dolaylı ilişki zinciri, genel tablo sütunu, matris');
  const mcx = await run(() => {
    const o = {};
    const pk = mk('Package', M.rootId, { name: 'MC' });
    const R1 = mk('Requirement', pk.id, { name: 'Üst', level: 'Sistem' }), R2 = mk('Requirement', pk.id, { name: 'Alt', level: 'Alt sistem', subsys: 'X' });
    const A = mk('Block', pk.id, { name: 'A' }), B = mk('Block', pk.id, { name: 'B' }), C = mk('Block', pk.id, { name: 'C' });
    const pB = mk('Part', A.id, { name: 'b', type: B.id }); mk('Part', B.id, { name: 'c', type: C.id });
    mk('DeriveReqt', pk.id, { src: R2.id, tgt: R1.id }); mk('Satisfy', pk.id, { src: pB.id, tgt: R2.id });
    const f1 = mk('Activity', pk.id, { name: 'F1' }); mk('Allocate', pk.id, { src: f1.id, tgt: pB.id });
    afterChange();
    const ch = { id: 'mcT', name: 'Bloklar', from: 'Requirement', steps: [{ s: 'rel:DeriveReqt:in', rep: true }, { s: 'rel:Satisfy:in' }, { s: 'tos' }], kind: 'Block', show: 'names' };
    o.reach = mcValue(R1, ch) === 'B' && mcValue(R2, ch) === 'B';
    const p = mcReach(R1.id, ch).get(B.id); o.path = /Üst → \S+ Alt → A\.b → B$/.test(mcPath(p)) || mcPath(p);
    o.parts = mcValue(A, { steps: [{ s: 'parts', rep: true }], kind: 'Block', show: 'count' }) === '2';
    o.alloc = mcValue(B, { steps: [{ s: 'usage' }, { s: 'rel:Allocate:in' }], show: 'names' }) === 'F1';
    o.back = mcValue(f1, { steps: [{ s: 'rel:Allocate:out' }, { s: 'usage' }, { s: 'rel:Satisfy:out' }, { s: 'rel:DeriveReqt:out', rep: true }], kind: 'Requirement', show: 'count' }) === '2';
    snap(); mcChains().push(ch); afterChange();
    GT.kind = 'Requirement'; GT.scope = pk.id; openD('@table'); renderViewBar(); renderView();
    const tx = document.querySelector('#view .vbody').textContent; o.col = /⛓/.test(tx) && !!document.querySelector('#view [data-mce="mcT"]') && !!document.querySelector('#view [data-mcadd]');
    o.cell = [...document.querySelectorAll('#view tr[data-gtr]')].some(tr => tr.dataset.gtr === R1.id && tr.textContent.includes('B'));
    MX.rows = 'all'; MX.cols = 'blocks'; MX.ch = 'mcT'; openD('@matrix'); renderViewBar(); renderView();
    o.mx = !!document.querySelector('#view select[data-mch]') && document.querySelectorAll('#view td.mxd.ind').length >= 2;
    const s0 = JSON.stringify(M); M = JSON.parse(s0); afterLoad(); o.persist = (M.mchains || []).some(c => c.id === 'mcT');
    M.mchains = M.mchains.filter(c => c.id !== 'mcT'); MX.ch = ''; GT.scope = ''; GT.kind = 'Block'; delModel([E(pk.id) ? pk.id : Object.values(M.els).find(e => e.name === 'MC').id]); afterChange();
    return o;
  }).catch(e => ({ error: e.message + ' ' + (e.stack || '').split('\n')[1] }));
  ok('Zincir adımları (türetme, karşılama, tip, kompozisyon, tahsis), yol, tablo sütunu, matriste dolaylı hücre, kayıtta saklanır', !mcx.error && Object.values(mcx).every(v => v === true), mcx);

  console.log('8u) Çizgi atlamaları, ağaç stili, katmanlar, seçmeli bölme elemanları');
  const lj = await run(() => {
    const o = {};
    const pk = mk('Package', M.rootId, { name: 'LJ' }), d = newDiagramCore(pk.id, 'bdd', 'LJ');
    const B = (n, x, y) => addShape(d, mk('Block', pk.id, { name: n }).id, x, y, 160, 80);
    const a = B('A', 0, 0), b = B('B', 400, 0), c = B('C', 0, 300), dd = B('D', 400, 300);
    connect(d, 'Association', a, dd); connect(d, 'Association', b, c);
    openD(d.id); const svg = () => document.querySelector('#svg').innerHTML;
    o.jump = / A5,5 0 0 [01] /.test(svg());
    d.jumps = false; renderDiagram(); o.nojump = !/ A5,5 /.test(svg()); d.jumps = true;
    const g = B('Genel', 200, 600), s1 = B('Özel1', 0, 850), s2 = B('Özel2', 400, 850);
    const e1 = connect(d, 'Generalization', s1, g), e2 = connect(d, 'Generalization', s2, g);
    d.tree = true; renderDiagram();
    o.tree = e1._pts.length === 4 && e2._pts.length === 4 && e1._pts[1].y === e2._pts[1].y && e1._pts[3].x === e2._pts[3].x && e1._pts[3].y === g.y + g.h;
    d.layers = [{ id: 'L1', name: 'Gizli', vis: true }]; c.layer = 'L1'; renderDiagram(); const n0 = (svg().match(/>C</g) || []).length;
    d.layers[0].vis = false; renderDiagram(); o.layer = n0 > 0 && !(svg().match(/>C</g) || []).length && d.shapes.includes(c) && d.edges.length === 4;
    const ex = diagramSVGStr(d); o.layerExp = !/>C</.test(ex.str);
    const be = E(a.el); const v1 = mk('Value', be.id, { name: 'görünür', def: '1' }), v2 = mk('Value', be.id, { name: 'saklı', def: '2' });
    renderDiagram(); const t1 = svg(); a.hideEls = [v2.id]; renderDiagram(); const t2 = svg();
    o.comp = t1.includes('saklı') && !t2.includes('saklı') && t2.includes('görünür') && kidsOf(be.id).length === 2;
    o.menu = layoutMenuItems().some(x => x.t && /Katmanlar/.test(x.t)) && layoutMenuItems().some(x => x.t && /Ağaç stili/.test(x.t));
    delModel([pk.id]); afterChange(); return o;
  }).catch(e => ({ error: e.message + ' ' + (e.stack || '').split('\n')[1] }));
  ok('Kesişimde köprü (aç/kapa), genelleme ağacı ortak gövde, gizli katman ekranda ve dışa aktarımda yok, bölmede seçili elemanlar', !lj.error && Object.values(lj).every(v => v === true), lj);

  console.log('8v) İnceleme paketi, koordinatlı XMI, genel tablodan Excel/CSV aktarma');
  const rv = await run(() => {
    const o = {};
    const dl = download; download = () => {}; const xml = xmiExport(); download = dl;
    o.diOut = /umldi:UMLDiagram /.test(xml) && /dc:Bounds/.test(xml);
    const src = Object.values(M.els).find(e => e.kind === 'Diagram' && e.name === 'Sistem Yapısı');
    const res = xmiImport(xml, 'rt', { diagrams: true });
    const cp = Object.values(M.els).find(e => e.kind === 'Diagram' && e.name === 'Sistem Yapısı' && isAnc(res.pkg, e.id));
    o.diIn = res.dias >= 8 && !!cp && cp.shapes.length === src.shapes.length && cp.edges.length === src.edges.length && cp.shapes.every((s, i) => s.x === Math.round(src.shapes[i].x) && s.y === Math.round(src.shapes[i].y));
    delModel([res.pkg]); afterChange();
    const h = reviewHTML(); o.html = h.length > 10000 && h.includes('Notları dışa aktar') && h.includes('"dias"');
    const b = Object.values(M.els).find(e => e.kind === 'Block');
    const r1 = reviewImportNotes({ notes: [{ id: 'rv1', el: b.id, txt: 'kontrol', v: 'Ret', u: 'A', t: new Date().toISOString() }, { id: 'rv2', el: 'yok', txt: 'x', v: 'Yorum' }] });
    const r2 = reviewImportNotes({ notes: [{ id: 'rv1', el: b.id, txt: 'kontrol', v: 'Ret' }] });
    o.notes = r1.n === 1 && r1.miss === 1 && r2.dup === 1 && b.notes.some(n => n.txt === '[Ret] kontrol' && n.st === 'Açık');
    b.notes = b.notes.filter(n => n.id !== 'rv1'); if(!b.notes.length) delete b.notes;
    const pk = mk('Package', M.rootId, { name: 'İçeAktar' }); GT.kind = 'Block'; GT.scope = pk.id;
    const x1 = mk('Block', pk.id, { name: 'Mevcut', doc: 'eski' });
    const P = gtPlan([['Ad', 'Sahibi', 'Açıklama', 'Kimlik'], ['Mevcut', pathOf(pk.id), 'yeni açıklama', x1.id], ['Yeni Blok', pathOf(pk.id), 'd', ''], ['Hatalı', 'Yok ▸ Böyle', '', '']], 'Block');
    o.plan = P.plan.map(p => p.op).join(',') === 'upd,new,new';
    const A = gtApply(P, 'Block'); o.apply = A.n === 2 && A.u === 1 && x1.doc === 'yeni açıklama' && kidsOf(pk.id).some(e => e.name === 'Yeni Blok');
    GT.scope = ''; delModel([pk.id]); afterChange();
    o.bar = gtBar().includes('data-gtimp');
    return o;
  }).catch(e => ({ error: e.message + ' ' + (e.stack || '').split('\n')[1] }));
  ok('XMI diyagram yerleşimi gidiş-dönüş, inceleme HTML ve not geri alma, tablo içe aktarma (Kimlik / Ad+Sahibi eşleşmesi)', !rv.error && Object.values(rv).every(v => v === true), rv);

  console.log('8w) MagicGrid panosu, paket iskeleti, otomatik onarım');
  const mg = await run(() => {
    const o = {};
    const D = mgData(); o.cells = ['bb', 'wb', 'sol', 'ver'].every(c => ['req', 'beh', 'str', 'par'].every(r => D[c][r].pct >= 0 && D[c][r].pct <= 100)) && D.bb.req.pct > 0;
    openD('@magicgrid'); o.view = document.querySelectorAll('#view td.mgc').length === 16;
    const n = mgSkeleton(), n2 = mgSkeleton(); o.skel = n >= 15 && n2 === 0 && kidsOf(M.rootId).some(e => e.name === '1 Problem Alanı');
    const pk = mk('Package', M.rootId, { name: 'QF' }), B = mk('Block', pk.id, { name: 'X' });
    const pt = mk('Part', B.id, { name: 'motor' }), po = mk('Port', B.id, { name: 'güç' }), v = mk('Value', B.id, { name: 'n', def: '3' });
    const a = mk('Activity', pk.id, { name: 'F' }), a1 = mk('Action', a.id, { name: 'a1' }), a2 = mk('Action', a.id, { name: 'a2' }); mk('ControlFlow', a.id, { src: a1.id, tgt: a2.id });
    const br = mk('Satisfy', pk.id, { src: 'yok', tgt: B.id });
    const C = mk('Block', pk.id, { name: 'C' }), p1 = mk('Port', B.id, { name: 'o1', dir: 'out' }), p2 = mk('Port', C.id, { name: 'o2', dir: 'out' }), q1 = mk('Part', pk.id, {}), cn = mk('Connector', pk.id, { src: p1.id, tgt: p2.id, sp: 'x', tp: 'y' });
    afterChange();
    o.fix = fixAll() >= 7 && E(pt.type) && E(pt.type).name === 'Motor' && E(po.type).kind === 'InterfaceBlock' && v.vtype === 'Integer' && !E(br.id) && kidsOf(a.id).some(k => k.kind === 'Initial') && kidsOf(a.id).some(k => k.kind === 'Final') && p2.dir === 'in';
    o.clean = !validateModel().some(x => FIXERS[x.rule] && E(x.id) && (isAnc(pk.id, x.id)));
    openD('@validation'); o.btn = !!document.querySelector('#view [data-qfixall]');
    const qf = Object.values(M.els).find(e => e.name === 'QF'); if(qf) delModel([qf.id]); MG_SKEL.forEach(([n0]) => { const p = kidsOf(M.rootId).find(e => e.name === n0); if(p) delModel([p.id]); }); afterChange();
    return o;
  }).catch(e => ({ error: e.message + ' ' + (e.stack || '').split('\n')[1] }));
  ok('16 hücreli pano, idempotent iskelet, kopuk/tipsiz/başlangıç-bitiş/port yönü otomatik onarım', !mg.error && Object.values(mg).every(v => v === true), mg);

  console.log('8x) Hızlı arayüz sihirbazı ve IBD derin part\'lar');
  const iw = await run(() => {
    const o = {};
    const pk = mk('Package', M.rootId, { name: 'IW' }), Ctx = mk('Block', pk.id, { name: 'Ctx' }), A = mk('Block', pk.id, { name: 'A' }), B = mk('Block', pk.id, { name: 'B' }), S = mk('Block', pk.id, { name: 'S' });
    const pa = mk('Part', Ctx.id, { name: 'a', type: A.id }), pb = mk('Part', Ctx.id, { name: 'b', type: B.id }); mk('Part', A.id, { name: 's1', type: S.id }); mk('Part', A.id, { name: 's2', type: S.id });
    const d = newDiagramCore(Ctx.id, 'ibd', 'Ctx IBD'); syncIBD(d); openD(d.id);
    const sa = d.shapes.find(s => s.el === pa.id), sb = d.shapes.find(s => s.el === pb.id);
    const C = ifaceCandidates(), r = ifaceCreate(C.find(c => c.sh === sa), C.find(c => c.sh === sb), { name: 'AB', flows: 'x : Real : out\ny : Real : in', reuse: true });
    o.iface = r.ib.kind === 'InterfaceBlock' && kidsOf(r.ib.id).filter(f => f.kind === 'FlowProp').length === 2 && r.pA.type === r.ib.id && r.pB.conj && !r.pA.conj && r.conn && r.conn.sp === pa.id && r.conn.tp === pb.id && (r.conn.conv || []).includes(r.ib.id);
    o.drawn = d.edges.some(e => e.el === r.conn.id);
    o.dirOk = !validateModel().some(x => x.rule === 'Port yön uyumsuzluğu' && x.id === r.conn.id);
    const r2 = ifaceCreate({ k: 'block:' + A.id, block: A }, { k: 'block:' + B.id, block: B }, { name: 'AB', flows: 'x : Real : out', reuse: true });
    o.reuse = r2.ib.id === r.ib.id && r2.flows === 0 && r2.conn && r2.conn.owner === Ctx.id;
    const n = deepExpand(d, sa, 1), kids = d.shapes.filter(s => s.parent === sa.id && E(s.el).kind === 'Part');
    o.deep = n >= 2 && kids.length === 2 && kids.every(k => k.x >= sa.x && k.y >= sa.y && k.x + k.w <= sa.x + sa.w && k.y + k.h <= sa.y + sa.h) && sa.deep === 1;
    const n0 = d.shapes.length; o.collapse = deepCollapse(d, sa) >= 2 && d.shapes.length < n0 && !d.shapes.some(s => s.parent === sa.id && E(s.el).kind === 'Part') && d.shapes.some(s => s.parent === sa.id && E(s.el).kind === 'Port');
    o.menu = toolsMenuItems().some(x => x.t && /Hızlı arayüz/.test(x.t));
    delModel([pk.id]); afterChange(); return o;
  }).catch(e => ({ error: e.message + ' ' + (e.stack || '').split('\n')[1] }));
  ok('Arayüz bloğu + akış özellikleri + eşlenik port + connector (IBD\'de ve bağlam bloğunda), yeniden kullanım, derin part aç/kapa', !iw.error && Object.values(iw).every(v => v === true), iw);

  console.log('8y) Canlı kısıt denetimi, senaryo kaydı/koşturma, zaman diyagramı');
  const sc = await run(() => {
    const o = {};
    const pk = mk('Package', M.rootId, { name: 'SC' }), B = mk('Block', pk.id, { name: 'Fırın' }), Tv = mk('Value', B.id, { name: 'T', vtype: 'Real', def: '20' }); Tv.tol = { lo: 0, hi: 55 };
    const rq = mk('Requirement', pk.id, { name: 'Süre', simExpr: 't <= 3' });
    const smE = mk('StateMachine', B.id, { name: 'Fırın SM' }), d = newDiagramCore(smE.id, 'stm', 'Fırın SM');
    const S = (k, n, x, y, ex) => addShape(d, mk(k, d.owner, Object.assign(n ? { name: n } : {}, ex || {})).id, x, y);
    const i0 = S('Initial', null, 40, 20), on = S('State', 'Isıt', 20, 80, { doAct: 'T = T + 10' }), off = S('State', 'Soğut', 260, 80);
    connect(d, 'Transition', i0, on); E(connect(d, 'Transition', on, off).el).name = 'dur'; E(connect(d, 'Transition', off, on).el).name = 'başla'; E(connect(d, 'Transition', on, on).el).name = 'after(1 s)';
    d.simCons = ['T < 1000'];
    openD(d.id); simStart();
    o.cons = SIM.cons.length >= 3 && SIM.cons.some(c => c.src === 'Diyagram') && SIM.cons.some(c => c.src === 'Tolerans') && SIM.cons.some(c => c.src === 'Gereksinim');
    simRecStart(); for (let i = 0; i < 9; i++) simStepNow(true);
    const T1 = SIM.vars.get('T'), t1 = SIM.t, v1 = SIM.viol.map(v => v.label).join('|'), tr1 = SIM.trace.filter(x => x.k === 'tr').map(x => x.to).join('>');
    o.viol = SIM.viol.length >= 1 && /t <= 3|T ∈/.test(v1);
    const _p = window.prompt; window.prompt = () => 'K1'; simRecStop(); window.prompt = _p;
    o.saved = (d.scenarios || []).length === 1 && d.scenarios[0].steps.length === 9 && d.scenarios[0].seed != null;
    simStepNow(true); simStepNow(true);
    const r = simReplay(d.scenarios[0].id, { quiet: true });
    o.replay = SIM.vars.get('T') === T1 && SIM.t === t1 && SIM.trace.filter(x => x.k === 'tr').map(x => x.to).join('>') === tr1 && r.viol === SIM.viol.length;
    const all = simReplayAll(); o.all = all.length === 1 && d.scenarios[0].last && d.scenarios[0].last.viol >= 1;
    renderSimBar(); o.panel = !!document.querySelector('#simbar .simk') && !!document.querySelector('#simbar [data-simsc="timing"]');
    timingFromSim(); o.timing = ST.cur === '@timing' && !!document.querySelector('#view .tschart svg') && /⚠/.test(document.querySelector('#view .tschart').innerHTML);
    const sv = timingSVG(TIMING, 900); o.lanes = (sv.str.match(/<path /g) || []).length >= 2;
    openD(d.id); simStop(); delModel([pk.id]); afterChange(); TIMING = null;
    return o;
  }).catch(e => ({ error: e.message + ' ' + (e.stack || '').split('\n')[1] }));
  ok('Gereksinim/tolerans/diyagram kısıtları canlı denetlenir, senaryo tohumla aynen tekrarlanır, toplu koşu, zaman diyagramı', !sc.error && Object.values(sc).every(v => v === true), sc);

  console.log('8z) View & Viewpoint, conform/expose, View dokümanı');
  const vw = await run(() => {
    const o = {};
    const pk = mk('Package', M.rootId, { name: 'VW' }), d = newDiagramCore(pk.id, 'pkg', 'VW');
    o.pal = DT.pkg.shapes.includes('View') && DT.pkg.shapes.includes('Viewpoint') && DT.pkg.rels.includes('Conform') && DT.pkg.rels.includes('Expose') && DT.bdd.shapes.includes('View');
    const vp = mk('Viewpoint', pk.id, { name: 'VP', stakeholders: 'Müşteri', concerns: 'Kütle' }), v = mk('View', pk.id, { name: 'V1' }), sub = mk('View', v.id, { name: 'V1.1' });
    const a = addShape(d, vp.id, 0, 0, 200, 100), b = addShape(d, v.id, 300, 0, 180, 90);
    o.valid = validate('Conform', v, vp) === '' && validate('Conform', vp, v) !== '' && validate('Expose', v, E(M.rootId)) === '' && validate('Satisfy', v, vp) !== '';
    connect(d, 'Conform', b, a);
    const sd = Object.values(M.els).find(e => e.kind === 'Diagram' && e.name === 'Sistem Yapısı'), rp = Object.values(M.els).find(e => e.kind === 'Package' && e.name === 'Gereksinimler');
    mk('Expose', pk.id, { src: v.id, tgt: sd.id }); mk('Expose', pk.id, { src: v.id, tgt: rp.id }); mk('Expose', pk.id, { src: sub.id, tgt: sd.id });
    openD(d.id); const svg = document.querySelector('#svg').innerHTML;
    o.shapes = svg.includes('«view»') && svg.includes('«viewpoint»') && svg.includes('«conform»') && svg.includes('Paydaşlar');
    o.rel = viewConform(v)[0] === vp && viewExposed(v).length === 2;
    const h = viewDocHTML(v.id);
    o.doc = /<h1>V1<\/h1>/.test(h) && h.includes('Bakış açısı: VP') && (h.match(/<figure>/g) || []).length >= 2 && h.includes('<table>') && h.includes('V1.1') && h.includes('İçindekiler');
    ST.sel = new Set([b.id]); ST.tsel = v.id; renderProps(); o.props = !!document.querySelector('#props [data-vwdoc]') && !!document.querySelector('#props [data-vwadd]');
    const ts = allTS()[0]; if(ts){ ST.sel = new Set(); ST.tsel = ts.id; renderProps(); o.tsProps = /Önde|Leading/.test(document.querySelector('#props').textContent); }
    const empty = mk('View', pk.id, { name: 'Boş' }); o.validator = validateModel().some(x => x.rule === 'Boş görünüm' && x.id === empty.id);
    delModel([pk.id]); afterChange(); return o;
  }).catch(e => ({ error: e.message + ' ' + (e.stack || '').split('\n')[1] }));
  ok('Palet, «conform»/«expose» kuralları, view/viewpoint şekilleri, iç içe view, HTML doküman (şekil+tablo+içindekiler), özellikler, doğrulama', !vw.error && Object.values(vw).every(v => v === true), vw);

  console.log('9a) Mimari: kanca kayıtları, genel özellik dağıtımı, hata yalıtımı');
  const hk = await run(() => {
    const o = {};
    o.reg = HOOKS.props.length >= 6 && HOOKS.menu.tools.length >= 3 && HOOKS.menu.analysis.length >= 3 && HOOKS.menu.layout.length >= 1;
    const bad = () => { throw new Error('deneme hatası'); }; HOOKS.props.unshift(bad); HOOKS.menu.tools.unshift(bad);
    const n0 = (window.APP_ERRS || []).length;
    const sp = Object.values(M.els).find(e => e.kind === 'SmartPackage'); ST.sel = new Set(); ST.tsel = sp.id; renderProps();
    o.isolated = !!document.querySelector('#props [data-spedit]') && toolsMenuItems().some(x => x.t && /MagicGrid/.test(x.t)) && window.APP_ERRS.length >= n0 + 2;
    HOOKS.props.shift(); HOOKS.menu.tools.shift();
    o.generic = !!document.querySelector('#props [data-spedit]');
    PROPS_EXT.__Deneme = (el, pf) => pf('X', 'genel-dağıtım'); KIND.__Deneme = {tr:'Deneme', ic:'D', col:'#999'}; const e = mk('__Deneme', M.rootId, {name:'d'}); ST.tsel = e.id; renderProps(); o.newKind = document.querySelector('#props').textContent.includes('genel-dağıtım'); delete M.els[e.id]; delete PROPS_EXT.__Deneme; delete KIND.__Deneme; ST.tsel = null; afterChange();
    return o;
  }).catch(e => ({ error: e.message + ' ' + (e.stack || '').split('\n')[1] }));
  ok('Kanca kayıtları dolu; hatalı kanca diğerlerini bozmaz ve günlüğe yazılır; yeni tür yalnız PROPS_EXT ile panelde görünür', !hk.error && Object.values(hk).every(v => v === true), hk);

  console.log('9b) Kalite: hata günlüğü, dosya denetimi, verimli geri al');
  const ql = await run(async () => {
    const o = {};
    appErr('deneme', new Error('örnek hata')); errLogDialog(); o.log = document.querySelector('#modalBox').textContent.includes('örnek hata'); $('#modal').style.display = 'none';
    const m = JSON.parse(JSON.stringify(pack(), clean)); const k = Object.keys(m.els).find(k => m.els[k].kind === 'Block'); m.els[k].name += ' (dış değişiklik)';
    const keep = JSON.parse(JSON.stringify(pack(), clean));
    loadModel(m); afterLoad(); await new Promise(r => setTimeout(r, 150));
    o.dialog = $('#modal').style.display === 'flex' && /Dosya denetimi/.test($('#modalBox').textContent) && /Sağlama/.test($('#modalBox').textContent); $('#modal').style.display = 'none';
    o.hist = (M.repairLog || []).length >= 1 && toolsMenuItems().some(x => x.t && /Dosya denetim geçmişi/.test(x.t));
    loadModel(keep); afterLoad(); await new Promise(r => setTimeout(r, 150)); o.clean = $('#modal').style.display !== 'flex';
    snap(); const b = mk('Block', M.rootId, { name: 'GeriAl' }); afterChange(); document.querySelector('[data-act="undo"]').click(); o.undoBtn = !E(b.id);
    return o;
  }).catch(e => ({ error: e.message + ' ' + (e.stack || '').split('\n')[1] }));
  ok('Hata günlüğü penceresi, dışarıda değiştirilmiş dosya uyarısı ve kalıcı denetim geçmişi, araç çubuğundan geri al', !ql.error && Object.values(ql).every(v => v === true), ql);

  console.log('9c) Bilgi güvenliği: gizlilik derecesi, kapsamlı/temizlenmiş dışa aktarma, doküman kontrolü');
  const sc2 = await run(async () => {
    const o = {}; window.__dl = []; const dl0 = download; download = (blob, name) => window.__dl.push({ blob, name });
    M.sec = { level: 'GİZLİ' }; afterChange();
    o.badge = /GİZLİ/.test(document.getElementById('secBadge').textContent);
    o.menu = toolsMenuItems().some(x => x.t && /Gizlilik derecesi/.test(x.t)) && toolsMenuItems().some(x => x.t && /Kapsamlı \/ temizlenmiş/.test(x.t));
    const d = Object.values(M.els).find(e => e.kind === 'Diagram'); openD(d.id); const ex = exportSVGString(); o.svg = ex.str.includes('data-sec="1"');
    xmiExport(); o.xmi = /GİZLİLİK DERECESİ: GİZLİ/.test(await window.__dl.pop().blob.text());
    const rp = Object.values(M.els).find(e => e.kind === 'Package' && e.name === 'Gereksinimler');
    reviewExportScoped(); document.querySelector(`#modalBox [data-scp="${rp.id}"]`).checked = true; document.querySelector('#modalBox #scNN').checked = true; document.querySelector('#modalBox [data-scx="docNo"]').value = 'İNC-7'; document.querySelector('#modalBox #scOk').click();
    const f = window.__dl.pop(); const h = await f.blob.text(); o.review = /İNC-7/.test(f.name) && h.includes('İNC-7') && h.includes('data-sec-band') && !h.includes('Araç Sistemi İç Yapısı');
    scopedSave(); document.querySelector('#modalBox #scAN').checked = true; document.querySelector('#modalBox #scOk').click(); const cp = JSON.parse(await window.__dl.pop().blob.text()); o.copy = cp.sec && cp.sec.level === 'GİZLİ' && Object.values(cp.els).every(e => !(e.notes || []).some(n => n.u && n.u !== 'İnceleyen'));
    delete M.sec; afterChange(); o.off = !/GİZLİ/.test(document.getElementById('secBadge').textContent) && !exportSVGString().str.includes('data-sec');
    download = dl0; return o;
  }).catch(e => ({ error: e.message + ' ' + (e.stack || '').split('\n')[1] }));
  ok('Rozet ve menü, SVG/XMI işaretleri, paket kapsamlı ve not temizlenmiş inceleme paketi (doküman no), anonim kopya, işaret kaldırma', !sc2.error && Object.values(sc2).every(v => v === true), sc2);

  console.log('8i) İngilizce arayüz (TR | EN)');
  await run(() => { setLang('en'); openD('@reqtable'); });
  await page.waitForTimeout(150);
  const en1 = await run(() => ({ reqView: document.querySelector('#view .vbar').textContent }));
  await run(() => openD('@fmea')); await page.waitForTimeout(150);
  const en = await run(en1 => {
    const q = s => (document.querySelector(s) || {}).textContent;
    const r = Object.assign({}, en1, { save: q('[data-act="save"]'), req: q('[data-act="reqMenu"]'), btn: q('[data-act="lang"]'), fmeaHead: [...document.querySelectorAll('#view th')].map(t => t.textContent).join('|') });
    const names0 = Object.values(M.els).map(e => e.name).join('|');
    const pk = mk('Package', M.rootId, {}); const b = mk('Block', pk.id, {}); r.newName = b.name;
    r.tr = tr('Kaydet'); r.tpl = tr('Hata: x');
    r.namesSame = Object.values(M.els).filter(e => e.id !== pk.id && e.id !== b.id).map(e => e.name).join('|') === names0;
    setLang('tr');
    r.saveTR = q('[data-act="save"]'); r.reqTR = q('[data-act="reqMenu"]'); r.btnTR = q('[data-act="lang"]');
    r.newNameTR = mk('Block', pk.id, {}).name;
    return r;
  }, en1);
  ok('EN: araç çubuğu/görünüm/yeni ad İngilizce, model içeriği değişmiyor, TR\'ye dönüş', /Save/.test(en.save) && /Requirements/.test(en.req) && en.btn === 'TR' && en.newName.startsWith('Block') && en.tr === 'Save' && en.tpl === 'Error: x' && /Subsystem requirement/.test(en.reqView) && !/ereksinim/.test(en.reqView) && /Failure mode/.test(en.fmeaHead) && !/Arıza/.test(en.fmeaHead) && en.namesSame && /Kaydet/.test(en.saveTR) && /Gereksinimler/.test(en.reqTR) && en.btnTR === 'EN' && en.newNameTR.startsWith('Blok'), en);

  console.log('9) Büyük model performansı');
  const perf = await run(() => {
    const T = {}; const tm = (k, f) => { const t0 = performance.now(); f(); T[k] = Math.round(performance.now() - t0); };
    tm('oluştur', () => {
      const root = M.rootId, blocks = [];
      for (let pi = 0; pi < 30; pi++) { const pk = mk('Package', root, { name: 'P' + pi }); for (let i = 0; i < 50; i++) { const b = mk('Block', pk.id, { name: 'B' + pi + '-' + i }); mk('Value', b.id, { name: 'kütle', vtype: 'Real', def: '1' }); blocks.push(b); } }
      for (let i = 0; i < 2000; i++) mk('Requirement', findOrMkPkg(root, 'Gereksinimler'), { level: 'Sistem', name: 'G' + i, text: 'Sistem ' + i + ' s içinde yanıt vermelidir.' });
      const d = mk('Diagram', root, { name: 'Büyük', dtype: 'bdd', shapes: [], edges: [], vx: 60, vy: 70, z: 0.4 });
      blocks.slice(0, 150).forEach((bb, i) => addShape(d, bb.id, (i % 15) * 230, Math.floor(i / 15) * 180));
      for (let i = 1; i < 150; i++) connect(d, 'Composition', d.shapes[Math.floor((i - 1) / 3)], d.shapes[i]);
      window.__big = d.id;
    });
    T.eleman = Object.keys(M.els).length;
    tm('diyagramAç', () => openD(window.__big));
    tm('yenidenÇiz', () => renderDiagram());
    tm('ağaç', () => { Object.values(M.els).forEach(e => ST.exp.add(e.id)); renderTree(); });
    tm('gereksinimTablosu', () => openD('@reqtable'));
    tm('kapsama', () => openD('@coverage'));
    tm('doğrulama', () => validateModel());
    tm('kaydet', () => serialize());
    return T;
  });
  ok('~6000 elemanlı modelde işlemler 2 sn altında', ['diyagramAç', 'yenidenÇiz', 'ağaç', 'gereksinimTablosu', 'kapsama', 'doğrulama', 'kaydet'].every(k => perf[k] < 2000), perf);

  ok('çalışma sırasında JavaScript hatası yok', !errs.length, errs.slice(0, 5));
  await browser.close();
  const fail = results.filter(r => !r.ok).length;
  console.log(`\n${results.length - fail}/${results.length} test geçti`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
