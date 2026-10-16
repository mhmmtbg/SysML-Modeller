/* Gerçekçi ölçek stres testi — node tests/stres.js [html]   (süreler soğuk ilk açılıştır; görünüm sınırı 3 sn, 60 diyagram + tüm bölümlü Word raporu 15 sn)
   Model: 13 alt sistem, ~400 blok, ~3000 gereksinim (Derive + Satisfy), 60 diyagram (BDD, IBD, aktivite, durum, gereksinim, kullanım durumu),
   ~200 bağlantı, 50 test (Verify), 100 FMEA, 30 risk. Her işlem süre sınırıyla ölçülür; sınır aşılırsa çıkış kodu 1. */
const path = require('path');
let chromium; for (const m of ['playwright', '/opt/node22/lib/node_modules/playwright']) { try { ({ chromium } = require(m)); break; } catch (e) {} }
const FILE = path.resolve(process.argv[2] || path.join(__dirname, '..', 'app', 'sysml-modeler.html'));
const LIMIT = { olustur: 30000, kaydet: 1500, yukle: 4000, diyagramMaks: 2000, gorunum: 3000, dogrulama: 2500, turetme: 2500, kapsamaHaritasi: 2500, rapor: 15000, agac: 2000, yedekOzet: 1000 };
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1500, height: 900 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
  await p.goto('file://' + FILE); await p.waitForTimeout(700);
  const r = await p.evaluate(async () => {
    const T = {}, tm = (k, f) => { const t0 = performance.now(); const v = f(); T[k] = Math.round(performance.now() - t0); return v; };
    download = () => {};
    tm('olustur', () => {
      M = emptyModel(); const root = M.rootId; let sd = 11; const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647, pick = a => a[Math.floor(rnd() * a.length)];
      const yap = mk('Package', root, { name: 'Yapı' }), arz = mk('Package', root, { name: 'Arayüzler' }), dav = mk('Package', root, { name: 'Davranış' }), dog = mk('Package', root, { name: 'Doğrulama' });
      const kg = mk('ValueType', arz.id, { name: 'Kütle', unit: 'kg' }), W = mk('ValueType', arz.id, { name: 'Güç', unit: 'W' });
      const ifs = Array.from({ length: 20 }, (_, i) => { const ib = mk('InterfaceBlock', arz.id, { name: 'IF' + i }); mk('FlowProp', ib.id, { name: 'akış' + i, dir: 'out', vtype: 'Real' }); return ib; });
      const top = mk('Block', yap.id, { name: 'Füze Sistemi' }); const subs = [], units = [];
      for (let s = 0; s < 13; s++) {
        const pk = mk('Package', yap.id, { name: 'AS' + s }), sb = mk('Block', pk.id, { name: 'Alt Sistem ' + s }); subs.push(sb);
        mk('Part', top.id, { name: 'as' + s, type: sb.id });
        for (let u = 0; u < 29; u++) { const ub = mk('Block', pk.id, { name: 'Birim ' + s + '-' + u }); units.push(ub); mk('Value', ub.id, { name: 'kütle', type: kg.id, def: String(+(0.5 + rnd() * 5).toFixed(2)) }); mk('Value', ub.id, { name: 'güç', type: W.id, def: String(Math.round(rnd() * 80)) }); mk('Port', ub.id, { name: 'p', type: pick(ifs).id }); mk('Part', sb.id, { name: 'b' + u, type: ub.id }); }
      }
      /* bağlantılar: her alt sistemde ardışık birimler arasında */
      subs.forEach(sb => { const ps = kidsOf(sb.id).filter(x => x.kind === 'Part'); for (let i = 0; i < 15; i++) { const a = ps[i], c = ps[i + 1]; const pa = kidsOf(a.type).find(x => x.kind === 'Port'), pc = kidsOf(c.type).find(x => x.kind === 'Port'); mk('Connector', sb.id, { name: 'c' + i, src: pa.id, tgt: pc.id, sp: a.id, tp: c.id, icdId: 'IF-' + sb.name.slice(-2).trim() + '-' + i, spec: '28 V DC', proto: 'RS-422' }); } });
      /* diyagramlar: 20 BDD + 13 IBD + 10 act + 5 stm + 6 req + 6 uc */
      for (let i = 0; i < 20; i++) { const d = newDiagramCore(yap.id, 'bdd', 'BDD ' + i); const sb = subs[i % 13]; const s0 = addShape(d, sb.id, 400, 20); kidsOf(sb.id).filter(x => x.kind === 'Part').slice(0, 20).forEach((pt, j) => { const sh = addShape(d, pt.type, (j % 10) * 220, 260 + Math.floor(j / 10) * 260); connect(d, 'Composition', s0, sh); }); }
      subs.forEach(sb => { const d = newDiagramCore(sb.id, 'ibd', sb.name + ' IBD'); syncIBD(d); });
      for (let i = 0; i < 10; i++) { const a = mk('Activity', dav.id, { name: 'Görev ' + i }); const d = newDiagramCore(a.id, 'act', 'Görev ' + i + ' akışı'); let prev = null; for (let j = 0; j < 15; j++) { const ac = mk('Action', a.id, { name: 'Veri ' + j + ' işle' }); mk('Allocate', dav.id, { src: ac.id, tgt: pick(units).id }); const sh = addShape(d, ac.id, 100 + (j % 5) * 200, 60 + Math.floor(j / 5) * 140); if (prev) connect(d, 'ControlFlow', prev, sh); prev = sh; } }
      for (let i = 0; i < 5; i++) { const sm = mk('StateMachine', subs[i].id, { name: 'Durum ' + i }); const d = newDiagramCore(sm.id, 'stm', 'Durum ' + i); let prev = null; for (let j = 0; j < 10; j++) { const st = mk('State', sm.id, { name: 'D' + j }); const sh = addShape(d, st.id, 100 + (j % 5) * 220, 60 + Math.floor(j / 5) * 160); if (prev) { const ed = connect(d, 'Transition', prev, sh); if (ed && E(ed.el)) E(ed.el).name = 'ev' + j; } prev = sh; } }
      /* gereksinimler */
      const sys = [];
      for (let i = 0; i < 300; i++) { const r = mk('Requirement', reqPkgFor('Sistem'), { level: 'Sistem', name: 'S' + i, text: 'Sistem ' + (i + 1) + ' numaralı işlevi en geç ' + (10 + i % 50) + ' s içinde tamamlayacaktır.', verif: pick(['Test', 'Analiz', 'Muayene']) }); sys.push(r); mk('Satisfy', yap.id, { src: top.id, tgt: r.id }); }
      for (let i = 0; i < 2700; i++) { const sb = subs[i % 13], ub = units[(i * 7) % units.length]; const r = mk('Requirement', reqPkgFor('Alt Sistem', sb.name), { level: 'Alt Sistem', subsys: sb.name, name: 'A' + i, text: ub.name + ' birimi ' + (i % 90 + 5) + ' Hz ile veri ' + pick(['iletecektir', 'işleyecektir', 'kaydedecektir', 'doğrulayacaktır']) + '.', verif: 'Test' }); addRel('DeriveReqt', r.id, sys[i % 300].id); if (i % 4) addRel('Satisfy', ub.id, r.id); }
      const reqs = allReqs();
      for (let i = 0; i < 6; i++) { const d = newDiagramCore(reqPkgFor('Sistem'), 'req', 'Gereksinimler ' + i); reqs.slice(i * 30, i * 30 + 30).forEach((r, j) => addShape(d, r.id, (j % 6) * 260, Math.floor(j / 6) * 180)); }
      for (let i = 0; i < 6; i++) { const d = newDiagramCore(dav.id, 'uc', 'Kullanım ' + i); const ac = mk('Actor', dav.id, { name: 'Operatör ' + i }); const sa = addShape(d, ac.id, 40, 100); for (let j = 0; j < 6; j++) { const u = mk('UseCase', dav.id, { name: 'İşlem ' + i + '-' + j }); connect(d, 'Association', sa, addShape(d, u.id, 300, 40 + j * 90)); } }
      for (let i = 0; i < 50; i++) { const t = mk('TestCase', dog.id, { name: 'Test ' + i, tMethod: 'Test', result: pick(['Geçti', 'Kaldı', 'Planlandı']) }); for (let j = 0; j < 20; j++) addRel('Verify', t.id, reqs[(i * 53 + j * 7) % reqs.length].id); }
      for (let i = 0; i < 100; i++) mk('FailureMode', pick(units).id, { name: 'Arıza ' + i, fn: 'işlev', effE: 'etki', S: 1 + i % 10, O: 1 + (i * 3) % 10, D: 1 + (i * 7) % 10, act: i % 3 ? 'Önlem ' + i : '' });
      const rp = mk('Package', root, { name: 'Riskler' }); for (let i = 0; i < 30; i++) mk('Risk', rp.id, { name: 'Risk ' + i, cat: 'Teknik', P: 1 + i % 5, I: 1 + (i * 2) % 5, act: 'Azaltım ' + i, riskId: 'R-' + (i + 1) });
      afterChange();
    });
    T.eleman = Object.keys(M.els).length; T.gereksinim = allReqs().length; T.diyagram = Object.values(M.els).filter(e => e.kind === 'Diagram').length; T.baglanti = allConns().length;
    let txt; tm('kaydet', () => { txt = JSON.stringify(pack(), clean); }); T.boyutKB = Math.round(txt.length / 1024);
    tm('yukle', () => { const m = parseModelText(txt); loadModel(m); afterLoad(); renderAll(); });
    tm('agac', () => { Object.values(M.els).forEach(e => ST.exp.add(e.id)); renderTree(); });
    const dts = []; Object.values(M.els).filter(e => e.kind === 'Diagram').forEach(d => { const t0 = performance.now(); openD(d.id); dts.push([Math.round(performance.now() - t0), d.name]); });
    dts.sort((a, b2) => b2[0] - a[0]); T.diyagramMaks = dts[0][0]; T.diyagramOrt = Math.round(dts.reduce((s, x) => s + x[0], 0) / dts.length); T.enYavasDiyagram = dts[0][1];
    const vs = ['@reqtable', '@matrix', '@coverage', '@vcrm', '@icd', '@n2', '@budget', '@fmea', '@risk', '@quality', '@table', '@magicgrid', '@campaign', '@suspect'].filter(v => VIEWS[v]);
    const vt = {}; vs.forEach(v => { const t0 = performance.now(); try { openD(v); } catch (e) { vt[v] = 'HATA ' + e.message; return; } vt[v] = Math.round(performance.now() - t0); });
    T.gorunumler = vt; T.gorunum = Math.max(...Object.values(vt).filter(x => typeof x === 'number'));
    tm('dogrulama', () => validateModel());
    tm('turetme', () => { deriveRefresh(); openD('@derive'); }); T.oneri = deriveList().length;
    tm('kapsamaHaritasi', () => openD('@reqcover'));
    tm('yedekOzet', () => { bkHash(txt); modelDiff(JSON.parse(txt), pack()); });
    { const got = []; download = (b2, n) => got.push(n); reportDialog(); document.querySelector('#rpall') && document.querySelector('#rpall').click(); document.querySelectorAll('#modalBox input[type=checkbox]').forEach(c => { c.checked = true; });
      const t0 = performance.now(); document.querySelector('#rpdocx').click(); for (let i = 0; i < 600 && !got.length && !/Hata/.test((document.querySelector('#rpst') || {}).textContent || ''); i++) await new Promise(r => setTimeout(r, 50));
      T.rapor = Math.round(performance.now() - t0); const st = (document.querySelector('#rpst') || {}).textContent || ''; if (!got.length) T.raporHata = st || 'zaman aşımı'; download = () => {}; document.querySelector('#modal').style.display = 'none'; }
    if (performance.memory) T.bellekMB = Math.round(performance.memory.usedJSHeapSize / 1048576);
    return T;
  });
  const bad = Object.keys(LIMIT).filter(k => typeof r[k] === 'number' && r[k] > LIMIT[k]);
  console.log('Stres modeli: ' + r.eleman + ' eleman, ' + r.gereksinim + ' gereksinim, ' + r.diyagram + ' diyagram, ' + r.baglanti + ' bağlantı, ' + r.boyutKB + ' KB' + (r.bellekMB ? ', bellek ' + r.bellekMB + ' MB' : ''));
  Object.keys(LIMIT).forEach(k => console.log('  ' + (bad.includes(k) ? '✗' : '✓') + ' ' + k.padEnd(16) + String(r[k] == null ? '—' : r[k]).padStart(7) + ' ms   (sınır ' + LIMIT[k] + ')'));
  console.log('  diyagram ort. ' + r.diyagramOrt + ' ms, en yavaş: ' + r.enYavasDiyagram + ' · türetme önerisi: ' + r.oneri);
  console.log('  görünümler: ' + Object.entries(r.gorunumler).map(([k, v]) => k + ' ' + v).join(', '));
  if (r.raporHata) console.log('  rapor hatası: ' + r.raporHata);
  if (errs.length) console.log('  JavaScript hataları: ' + errs.slice(0, 5).join(' | '));
  await b.close(); process.exit(bad.length || errs.length || r.raporHata ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
