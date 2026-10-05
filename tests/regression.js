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
