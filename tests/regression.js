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
