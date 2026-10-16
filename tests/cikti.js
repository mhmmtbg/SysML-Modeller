/* Altın çıktı testi — node tests/cikti.js [--guncelle]
   Örnek model deterministik üretilir (Math.random ve Date sabitlenir); diyagram SVG'leri, XMI, ReqIF, SysML v2 metni,
   Excel içerikleri (buildXlsx girdisi), rapor blokları, doğrulama, türetme, parametrik ve bütçe sonuçları normalleştirilip
   tests/altin/cikti.json ile karşılaştırılır. Davranışı değiştirmesi amaçlanmayan yeniden düzenlemelerden sonra fark olmamalıdır.
   Bilerek değiştirilen çıktılar için: node tests/cikti.js --guncelle */
const fs = require('fs'), path = require('path');
let chromium; for (const m of ['playwright', '/opt/node22/lib/node_modules/playwright']) { try { ({ chromium } = require(m)); break; } catch (e) {} }
const FILE = path.resolve(process.argv.find(a => a.endsWith('.html')) || path.join(__dirname, '..', 'app', 'sysml-modeler.html'));
const GOLD = path.join(__dirname, 'altin', 'cikti.json'), UPD = process.argv.includes('--guncelle');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1400, height: 900 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
  await p.addInitScript(() => {
    let s = 20261016; Math.random = () => (s = (s * 16807) % 2147483647) / 2147483647;
    const RD = Date; let t = RD.UTC(2026, 9, 16, 9, 0, 0);
    class FD extends RD { constructor(...a) { if (a.length) super(...a); else super(t); } static now() { return t += 7; } }
    FD.UTC = RD.UTC; FD.parse = RD.parse; window.Date = FD;
    try { localStorage.clear(); } catch (e) {}
  });
  await p.goto('file://' + FILE); await p.waitForTimeout(800);
  const out = await p.evaluate(async () => {
    const O = {}, cap = []; const dl0 = download; download = (blob, name) => cap.push({ blob, name });
    const xl0 = buildXlsx; buildXlsx = function (sheets) { cap.push({ xlsx: JSON.parse(JSON.stringify(sheets)) }); return xl0.apply(this, arguments); };
    loadModel(demo()); afterLoad(); renderAll();
    Object.values(M.els).filter(e => e.kind === 'Diagram').sort((a, c) => (a.name || '').localeCompare(c.name || '', 'tr')).forEach(d => { const r = diagramSVGStr(d); O['svg:' + d.name] = typeof r === 'string' ? r : r && r.str; });
    const take = async (k, f) => { cap.length = 0; try { await f(); } catch (e) { O[k] = 'HATA ' + e.message; return; } for (const c of cap) { if (c.xlsx) O[k + ':xlsx'] = JSON.stringify(c.xlsx); else if (c.blob && /\.(xmi|xml|reqif|txt|json|html|sysml)$/i.test(c.name)) O[k + ':' + c.name.replace(/^.* - /, '')] = await c.blob.text(); } };
    await take('xmi', () => xmiExport());
    await take('reqif', () => exportReqIF());
    O.sysmlv2 = sysmlV2Text();
    await take('reqxlsx', () => exportReqsXlsx());
    await take('icd', () => icdXlsx());
    await take('vcrm', () => exportVcrmXlsx());
    await take('fmea', () => fmeaXlsx());
    await take('profil', () => pfXlsx());
    await take('olcum', () => measXlsx());
    await take('varyant', () => variantsXlsx());
    await take('kapsama', () => coverXlsx());
    await take('turetme', () => deriveXlsx());
    const o = { kind: 'report', title: 'Altın', sec: {}, dia: Object.values(M.els).filter(e => e.kind === 'Diagram').map(d => d.id) }; RPT_SECTIONS.forEach(([k]) => { o[k] = true; o.sec[k] = true; });
    O.rapor = JSON.stringify(buildReport(o).map(x => x.t === 'img' ? { t: 'img', cap: x.cap, svg: x.r && x.r.str } : x));
    O.dogrulama = JSON.stringify(validateModel().map(x => [x.sev, x.rule, x.id, x.msg]));
    O.turetme = JSON.stringify(deriveRun().map(s => [s.state, s.rule, s.sig, s.level, s.subsys || '', s.name || '', s.text, s.verif || '']));
    O.parametrik = JSON.stringify(parSolveAll(false).map(r => (r.vals || []).map(x => [x.v && x.v.name, x.val])));
    const top = typeof topBlock === 'function' && topBlock(); O.butce = top ? JSON.stringify(['kütle', 'güç', 'maliyet'].map(pp => rollup(top.id, pp).total)) : '';
    O.kapsamaHarita = JSON.stringify((() => { const D = coverData(); return D.rows.map(bb => REQ_CATS.map(c => D.cell.get(bb.id + '|' + c.id).length)); })());
    O.__ver = APP_VER; download = dl0; buildXlsx = xl0; return O;
  });
  /* normalleştirme: kimlikler görülme sırasına göre, tarih/saat damgaları sabit */
  const VER = out.__ver; delete out.__ver;
  const ids = new Map(), norm = s => String(s).split(VER).join('SÜRÜM').replace(/_[a-z0-9]{8,16}\b/g, m => { if (!ids.has(m)) ids.set(m, '#' + (ids.size + 1)); return ids.get(m); })
    .replace(/\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(\.\d+)?Z?/g, 'ZAMAN').replace(/\b\d\d\.\d\d\.\d{4}( \d\d:\d\d(:\d\d)?)?\b/g, 'TARİH').replace(/\b(19|20)\d\d-\d\d-\d\d\b/g, 'TARİH');
  const N = {}; Object.keys(out).sort().forEach(k => { N[k] = norm(out[k]); });
  if (UPD || !fs.existsSync(GOLD)) { fs.mkdirSync(path.dirname(GOLD), { recursive: true }); fs.writeFileSync(GOLD, JSON.stringify(N, null, 1)); console.log((UPD ? 'Güncellendi' : 'Oluşturuldu') + ': ' + Object.keys(N).length + ' çıktı → ' + path.relative(process.cwd(), GOLD)); await b.close(); process.exit(errs.length ? 1 : 0); }
  const G = JSON.parse(fs.readFileSync(GOLD, 'utf8')), keys = [...new Set(Object.keys(G).concat(Object.keys(N)))].sort(), diff = [];
  keys.forEach(k => { if (G[k] === N[k]) return; if (G[k] == null || N[k] == null) { diff.push(k + (G[k] == null ? ' (yeni çıktı)' : ' (çıktı kayboldu)')); return; } let i = 0; while (i < G[k].length && G[k][i] === N[k][i]) i++; diff.push(k + ' @' + i + '\n      altın: ' + JSON.stringify(G[k].slice(Math.max(0, i - 40), i + 80)) + '\n      şimdi: ' + JSON.stringify(N[k].slice(Math.max(0, i - 40), i + 80))); });
  console.log('Altın çıktı karşılaştırması: ' + (keys.length - diff.length) + '/' + keys.length + ' aynı');
  diff.forEach(d => console.log('  ✗ ' + d)); if (errs.length) console.log('  JavaScript hataları: ' + errs.slice(0, 3).join(' | '));
  await b.close(); process.exit(diff.length || errs.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
