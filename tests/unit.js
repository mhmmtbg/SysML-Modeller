/* Birim testleri — tarayıcısız (Node vm). Çalıştırma: node tests/unit.js
   Motorlar: ifade, parametrik çözücü, bütçe, çokluk, metachain, trade study, Monte Carlo, kısıt, senaryo,
   dosya bütünlüğü, onarım, geri al, otomatik onarım, tablo içe aktarma, MagicGrid. Olumsuz durumlar dahil. */
const { load } = require('./unit-env.js');
let pass = 0, fail = 0; const fails = [];
function T(name, fn){ try { const r = fn(); if(r === true){ pass++; } else { fail++; fails.push(name + ' → ' + JSON.stringify(r)); } } catch(e){ fail++; fails.push(name + ' → İSTİSNA ' + e.message); } }
const c = load();
const R = (fn, a) => c.__run(fn, a);
const fresh = () => R(() => { demo(); rebuildReqCache(); undoStack.length = 0; redoStack.length = 0; return true; });

/* ---------- ifade motoru ---------- */
const EX = [['1 + 2 * 3', 7], ['(1 + 2) * 3', 9], ['2 ^ 3 ^ 2', 512], ['-2 ^ 2', -4], ['10 % 4', 2], ['7 / 2', 3.5], ['max(1, 5, 3)', 5], ['min(4, -1)', -1], ['abs(-3.5)', 3.5], ['sqrt(16) + round(2.6)', 7],
  ['3 > 2 && 1 < 0', 0], ['3 > 2 || 1 < 0', 1], ['!(2 == 2)', 0], ['2 != 3', 1], ['5 >= 5 ve 4 <= 3', 0], ['doğru veya yanlış', 1], ['1e3 / 10', 100], ['floor(-1.5)', -2]];
EX.forEach(([e, v]) => T('ifade: ' + e, () => { const r = R(a => xExpr(a, new Map()), e); return Math.abs(r - v) < 1e-9 || {beklenen:v, bulunan:r}; }));
T('ifade: değişken ve noktalı ad', () => R(() => xExpr('güçBirimi.gerilim * I', new Map([['güçBirimi.gerilim', 28], ['I', 2]]))) === 56);
['2 +', '(1 + 2', 'max(1,', '3 $ 4', ''].forEach(e => T('ifade hatası yakalanır: "' + e + '"', () => R(a => { try { xExpr(a, new Map()); return a === '' ? 'boş kabul edilebilir' : 'hata yok'; } catch(err){ return true; } }, e) === true || e === ''));
T('ifade: tanımsız değişken hata verir', () => R(() => { try { xExpr('x + 1', new Map()); return false; } catch(e){ return /Tanımsız/.test(e.message); } }));
T('xRun: atama, +=, ++, metin deyimi', () => R(() => { const V = new Map([['a', 1]]); const r = xRun('a += 4; b = a * 2; c++; lambayı yak', V); return V.get('a') === 5 && V.get('b') === 10 && V.get('c') === 1 && r.text.length === 1; }));
T('xGuard: else / bilinmeyen / doğru', () => R(() => xGuard('else', new Map()) === 'else' && xGuard('hazır', new Map()) === null && xGuard('1 < 2', new Map()) === true));
T('xAfter: birimler', () => R(() => xAfter('after(2 dk)') === 120 && xAfter('after(500 ms)') === 0.5 && xAfter('3 sa') === 10800 && xAfter('olay') == null));

/* ---------- sayı yardımcıları ---------- */
T('numOf: virgül, boş, metin', () => R(() => numOf('3,5') === 3.5 && numOf('') === null && numOf('abc') === null && numOf(' 7 ') === 7));
T('multCount: çokluk', () => R(() => multCount('2') === 2 && multCount('1..4') === 4 && multCount('0..*') === 1 && multCount('') === 1));

/* ---------- parametrik ve bütçe ---------- */
fresh();
T('parametrik: demo güç = V × I', () => R(() => { const r = parSolveAll(false)[0]; const g = r.vals.find(x => x.v.name === 'güç'); return g && Math.abs(g.val - 98) < 1e-9; }));
T('parametrik: tutarsız veri çelişki olarak raporlanır', () => R(() => { const g = Object.values(M.els).find(e => e.kind === 'Value' && e.name === 'güç' && E(e.owner).name === 'Güç Birimi'); g.def = '50'; const r = parSolveAll(false)[0]; delete g.def; return r.eqs.some(q => q.status === 'çelişki'); }));
T('parseEqs: geçersiz denklem hata verir', () => R(() => { try { parseEqs('P = = V'); return false; } catch(e){ return true; } }));
T('solveFor: doğrusal olmayan çözüm', () => R(() => { const eq = parseEqs('y = x^2 + 1')[0]; const x = solveFor(eq, new Map([['y', 10]]), 'x'); return Math.abs(Math.abs(x) - 3) < 1e-6; }));
T('bütçe: kütle toplamı çoklukla', () => R(() => { const a = Object.values(M.els).find(e => e.kind === 'Block' && e.name === 'Araç Sistemi'); const t = rollup(a.id, 'kütle').total; return Math.abs(t - (4.2 + 2.8 + 2 * 1.6)) < 1e-9 || t; }));
T('bütçe: döngüsel kompozisyon sonsuz döngüye girmez', () => R(() => { const pk = mk('Package', M.rootId, {}), A = mk('Block', pk.id, {name:'A'}), B = mk('Block', pk.id, {name:'B'}); mk('Part', A.id, {type:B.id}); mk('Part', B.id, {type:A.id}); mk('Value', A.id, {name:'m', def:'1'}); const r = rollup(A.id, 'm'); delModel([pk.id]); return r !== undefined; }));

/* ---------- metachain ---------- */
T('metachain: alt gereksinimleri karşılayan bloklar', () => R(() => { const ch = mcChains()[0]; const r = allReqs().find(x => x.reqId === 'SYS-002'); return mcValue(r, ch).length > 0; }));
T('metachain: boş adım listesi kendisini döndürmez', () => R(() => { const b = Object.values(M.els).find(e => e.kind === 'Block'); return mcReach(b.id, {steps:[]}).size === 1; }));
T('metachain: tekrarlı adım döngüde sonlanır', () => R(() => { const pk = mk('Package', M.rootId, {}), A = mk('Block', pk.id, {}), B = mk('Block', pk.id, {}); mk('Part', A.id, {type:B.id}); mk('Part', B.id, {type:A.id}); afterChange(); const n = mcReach(A.id, {steps:[{s:'parts', rep:true}]}).size; delModel([pk.id]); return n === 1; }));

/* ---------- trade study ve Monte Carlo ---------- */
T('trade study: demo sıralama ve eleme', () => R(() => { const t = tsEval(allTS()[0]); return t.alts[t.order[0]].name === 'Li-ion Paket' && t.elim[t.alts.findIndex(a => a.name === 'NiMH Paket')].length === 1; }));
T('trade study: sıfır ağırlık puanı 0 verir, çökmez', () => R(() => { const ts = mk('TradeStudy', M.rootId, {alts:allTS()[0].alts, crit:[{prop:'kütle', w:0, dir:'min'}]}); const r = tsEval(ts); delete M.els[ts.id]; return r.score.every(x => x === 0); }));
T('Monte Carlo: tohumla tekrarlanabilir, istatistik sınırları', () => R(() => { const out = tsOutputs().find(o => o.k.startsWith('par')).k, v = Object.values(M.els).find(e => e.kind === 'Value' && e.name === 'akım'); v.tol = {lo:3, hi:4, dist:'uni'}; const a = tsMonteCarlo({out, n:400, seed:3}), b = tsMonteCarlo({out, n:400, seed:3}); delete v.tol; return a.mean === b.mean && a.min >= 84 - 1e-9 && a.max <= 112 + 1e-9 && a.p5 <= a.p50 && a.p50 <= a.p95; }));
T('Monte Carlo: model değerleri geri yüklenir', () => R(() => { const before = JSON.stringify(Object.values(M.els).filter(e => e.kind === 'Value').map(e => e.def)); const out = tsOutputs()[0].k; tsMonteCarlo({out, n:50}); return before === JSON.stringify(Object.values(M.els).filter(e => e.kind === 'Value').map(e => e.def)); }));
T('tsRng: düzgün dağılım ortalaması ~0.5', () => R(() => { const r = tsRng(42); let s = 0; for(let i = 0; i < 20000; i++) s += r(); return Math.abs(s / 20000 - 0.5) < 0.01; }));
T('tsDraw: normal dağılım ±3σ içinde çoğunluk', () => R(() => { const r = tsRng(7); let k = 0; for(let i = 0; i < 5000; i++){ const x = tsDraw(r, {lo:0, hi:6, dist:'norm'}, 3); if(x >= 0 && x <= 6) k++; } return k / 5000 > 0.99; }));

/* ---------- dosya bütünlüğü, onarım, geri al ---------- */
fresh();
T('sağlama toplamı: kayıt → açılış temiz', () => R(() => { const m = JSON.parse(JSON.stringify(pack(), clean)); return fileCheck(m).filter(x => x[0] !== 'bilgi').length === 0; }));
T('sağlama toplamı: dışarıda değişiklik yakalanır', () => R(() => { const m = JSON.parse(JSON.stringify(pack(), clean)); const k = Object.keys(m.els).find(k => m.els[k].kind === 'Block'); m.els[k].name = 'Değiştirildi'; return fileCheck(m).some(x => /Sağlama/.test(x[1])); }));
T('sağlama toplamı: eksik eleman yakalanır', () => R(() => { const m = JSON.parse(JSON.stringify(pack(), clean)); delete m.els[Object.keys(m.els).find(k => m.els[k].kind === 'Value')]; return fileCheck(m).some(x => /eleman sayısı/.test(x[1])); }));
['null', '{}', '{"els":[]}', '{"els":{},"rootId":"x"}'].forEach(t => T('fileCheck: bozuk yapı ' + t, () => R(a => fileCheck(JSON.parse(a)).some(x => x[0] === 'hata'), t)));
T('onarım: kopuk ilişki ve sahipsiz eleman onarılır, rapor kalıcı', () => R(() => { const m = JSON.parse(JSON.stringify(pack(), clean)); m.els.x1 = {id:'x1', kind:'Block', owner:'yok', name:'Sahipsiz'}; m.els.x2 = {id:'x2', kind:'Satisfy', owner:m.rootId, src:'yok', tgt:'x1'}; loadModel(m); return E('x1').owner === M.rootId && !E('x2') && (M.repairLog || []).length === 1 && M.repairLog[0].notes.length >= 2; }));
fresh();
T('geri al: elemanlar paylaşılır, geri al/yinele doğru', () => R(() => { const n0 = Object.keys(M.els).length; snap(); const b = mk('Block', M.rootId, {name:'GA'}); snap(); b.name = 'GA2'; const enc = undoStack[undoStack.length - 1]; const shared = Object.keys(enc.els).filter(k => k !== b.id && enc.els[k] === undoStack[0].els[k]).length; undo(); const ok1 = E(b.id).name === 'GA'; undo(); const ok2 = !E(b.id) && Object.keys(M.els).length === n0; redo(); redo(); return ok1 && ok2 && E(b.id).name === 'GA2' && shared === n0; }));
T('geri al: bellek tam kopyanın çok altında', () => R(() => { for(let i = 0; i < 40; i++){ snap(); mk('Block', M.rootId, {name:'B' + i}); } const full = JSON.stringify(M).length * 2 * undoStack.length; return undoMemory() < full / 5; }));

/* ---------- doğrulama ve otomatik onarım ---------- */
fresh();
T('otomatik onarım: tipsiz part/port/değer, başlangıç/bitiş, port yönü', () => R(() => { const pk = mk('Package', M.rootId, {}), B = mk('Block', pk.id, {}), pt = mk('Part', B.id, {name:'motor'}), po = mk('Port', B.id, {name:'g'}), v = mk('Value', B.id, {name:'n', def:'true'}); const a = mk('Activity', pk.id, {}), a1 = mk('Action', a.id, {name:'x'}); const C = mk('Block', pk.id, {}), X = mk('Block', pk.id, {}), Y = mk('Block', pk.id, {}); const p1 = mk('Port', X.id, {dir:'out'}), p2 = mk('Port', Y.id, {dir:'out'}); mk('Connector', C.id, {src:p1.id, tgt:p2.id, sp:'a', tp:'b'}); afterChange(); fixAll(); const ok = E(pt.type).kind === 'Block' && E(po.type).kind === 'InterfaceBlock' && v.vtype === 'Boolean' && kidsOf(a.id).some(k => k.kind === 'Initial') && kidsOf(a.id).some(k => k.kind === 'Final') && p2.dir === 'in'; delModel([pk.id]); return ok; }));
T('doğrulama: demo modelde hata seviyesi bulgu yok', () => R(() => validateModel().filter(x => x.sev === 'hata').length === 0 || validateModel().filter(x => x.sev === 'hata').map(x => x.rule)));

/* ---------- genel tablo içe aktarma ---------- */
T('tablo içe aktarma: Kimlik ve Ad+Sahibi eşleşmesi', () => R(() => { const pk = mk('Package', M.rootId, {name:'GT'}); GT.kind = 'Block'; GT.scope = pk.id; const x = mk('Block', pk.id, {name:'Var'}); const P = gtPlan([['Ad', 'Sahibi', 'Açıklama', 'Kimlik'], ['Var', '', 'd1', x.id], ['Yeni', pathOf(pk.id), 'd2', ''], ['', '', '', '']], 'Block'); const r = gtApply(P, 'Block'); const ok = r.n === 1 && r.u === 1 && x.doc === 'd1'; GT.scope = ''; delModel([pk.id]); return ok; }));
T('tablo içe aktarma: Ad sütunu yoksa hata', () => R(() => { try { gtPlan([['Başka'], ['x']], 'Block'); return false; } catch(e){ return true; } }));

/* ---------- MagicGrid ---------- */
T('MagicGrid: 16 hücre 0–100 aralığında', () => R(() => { const D = mgData(); let n = 0; ['bb', 'wb', 'sol', 'ver'].forEach(cc => ['req', 'beh', 'str', 'par'].forEach(r => { if(D[cc][r].pct >= 0 && D[cc][r].pct <= 100) n++; })); return n === 16; }));
T('MagicGrid: boş modelde çökmez', () => R(() => { const keep = M; M = {uid:'x', v:2, els:{}, rootId:null}; const root = mk('Model', null, {name:'Boş'}); M.rootId = root.id; let ok; try { const D = mgData(); ok = D.bb.req.pct === 0; } finally { M = keep; } return ok; }));

/* ---------- bilgi güvenliği ---------- */
fresh();
T('gizlilik: işaretsiz modelde çıktı değişmez', () => R(() => { delete M.sec; const r = {str:'<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 10 10"></svg>', w:10, h:10}; return secSvg(r) === r && secHtml('<body>x</body>') === '<body>x</body>'; }));
T('gizlilik: SVG bandı bir kez eklenir, yükseklik artar', () => R(() => { M.sec = {level:'GİZLİ'}; const r = {str:'<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 10 10"></svg>', w:10, h:10}; const a = secSvg(r), b = secSvg(a); delete M.sec; return a.h === 54 && b === a && (a.str.match(/GİZLİ/g) || []).length === 2; }));
T('gizlilik: HTML üst ve alt şerit', () => R(() => { M.sec = {level:'ÖZEL', caveat:'X'}; const h = secHtml('<html><body class="a">i</body></html>'); delete M.sec; return (h.match(/data-sec-band/g) || []).length === 2 && h.includes('ÖZEL · X'); }));
T('kapsamlı kopya: yalnız seçili paket, dış referans ve notlar temizlenir', () => R(() => { const rp = Object.values(M.els).find(e => e.kind === 'Package' && e.name === 'Yapı'); const {m, rep} = scopedModel({pkgs:[rp.id], noNotes:true, anon:true, noLog:true}); const ok1 = Object.values(m.els).every(e => e.id === m.rootId || e.id === rp.id || isAnc(rp.id, e.id) || (KIND[e.kind].rel && m.els[e.src] && m.els[e.tgt])); const ok2 = !Object.values(m.els).some(e => e.notes) && !m.reqLog && rep.removed > 0; const ok3 = Object.values(m.els).every(e => !e.type || m.els[e.type]); const ok4 = Object.values(m.els).filter(e => e.kind === 'Diagram').every(d => d.shapes.every(s => m.els[s.el])); return ok1 && ok2 && ok3 && ok4 && Object.keys(M.els).length > Object.keys(m.els).length; }));
T('kapsamlı kopya: canlı model değişmez', () => R(() => { const n = JSON.stringify(M.els).length; scopedModel({pkgs:[], noNotes:true, anon:true, noDoc:true}); return JSON.stringify(M.els).length === n; }));
T('withModel: geçici model sonrası geri yüklenir', () => R(() => { const keep = M, {m} = scopedModel({}); const n = withModel(m, () => Object.keys(M.els).length); return M === keep && n === Object.keys(m.els).length; }));

/* ---------- şüpheli bağlantı, birim, arayüz kuralları ---------- */
fresh();
T('şüpheli: gereksinim metni değişince bağlı ilişkiler işaretlenir', () => R(() => { const r = allReqs().find(x => x.reqId === 'SYS-002'); const rels = Object.values(M.els).filter(x => SUS_KINDS.has(x.kind) && (x.src === r.id || x.tgt === r.id)); snap(); r.text += ' x'; afterChange(); return rels.length > 0 && rels.every(x => x.suspect && x.suspect.by === r.id); }));
T('şüpheli: yalnız durum/öncelik gibi esas olmayan değişiklik işaretlemez', () => R(() => { allSuspects().forEach(x => delete x.suspect); const r = allReqs().find(x => x.reqId === 'SYS-001'); r.attrs = Object.assign({}, r.attrs, {oncelik:'Yüksek'}); afterChange(); return allSuspects().length === 0; }));
T('şüpheli: gözden geçirme kaydı tutulur', () => R(() => { const r = allReqs().find(x => x.reqId === 'SYS-001'); r.text += ' y'; afterChange(); const ids = allSuspects().map(x => x.id); const n = suspectClear(ids, 'kontrol edildi'); return n === ids.length && n > 0 && allSuspects().length === 0 && M.suspectLog.slice(-1)[0].why === 'kontrol edildi'; }));
T('birim: türetilmiş birimler', () => R(() => dimEq(unitDim('W'), unitDim('V A')) && dimEq(unitDim('J'), unitDim('N·m')) && dimEq(unitDim('Pa'), unitDim('N/m^2')) && dimEq(unitDim('Wh'), unitDim('J')) && unitDim('foo') === null && dimEq(unitDim('m/s²'), unitDim('m s^-2'))));
T('birim: P = V * I tutarlı, P = V + I tutarsız', () => R(() => { const env = new Map([['P', unitDim('W')], ['V', unitDim('V')], ['I', unitDim('A')]]); const i1 = [], i2 = []; const q1 = parseEqs('P = V * I')[0], q2 = parseEqs('P = V + I')[0]; const a = exDim(q1.l, env, i1), b = exDim(q1.r, env, i1); exDim(q2.r, env, i2); return dimEq(a, b) && !i1.length && i2.length === 1; }));
T('birim: kısıt bloğunda birim hatası doğrulamada çıkar', () => R(() => { const pk = mk('Package', M.rootId, {}), B = mk('Block', pk.id, {name:'Ü'}), cb = mk('ConstraintBlock', pk.id, {name:'K', expr:'m = F * a'}); mk('Param', cb.id, {name:'m', unit:'kg'}); mk('Param', cb.id, {name:'F', unit:'N'}); mk('Param', cb.id, {name:'a', unit:'m/s^2'}); mk('ConstraintProp', B.id, {name:'k', type:cb.id}); afterChange(); const bad = unitIssues().some(x => /K: "m = F \* a"/.test(x.msg)); cb.expr = 'F = m * a'; const good = !unitIssues().some(x => /K:/.test(x.msg)); delModel([pk.id]); return bad && good; }));
T('arayüz: taşınan öğe arayüzde yoksa bulgu', () => R(() => { const pk = mk('Package', M.rootId, {}), IB = mk('InterfaceBlock', pk.id, {name:'I'}), S = mk('Signal', pk.id, {name:'Komut'}), X = mk('Block', pk.id, {}), Y = mk('Block', pk.id, {}), C = mk('Block', pk.id, {}); const a = mk('Port', X.id, {type:IB.id}), b = mk('Port', Y.id, {type:IB.id, conj:true}); const pa = mk('Part', C.id, {type:X.id}), pb = mk('Part', C.id, {type:Y.id}); const c = mk('Connector', C.id, {src:a.id, tgt:b.id, sp:pa.id, tp:pb.id, conv:[S.id]}); const r1 = ifaceRuleIssues().some(x => x.el === c && x.rule === 'Taşınan öğe arayüzde yok'); mk('FlowProp', IB.id, {name:'komut', type:S.id, dir:'out'}); const r2 = !ifaceRuleIssues().some(x => x.el === c && x.rule === 'Taşınan öğe arayüzde yok'); delModel([pk.id]); return r1 && r2; }));
T('arayüz: eşlenik eksik bulunur ve otomatik onarılır', () => R(() => { const pk = mk('Package', M.rootId, {}), IB = mk('InterfaceBlock', pk.id, {name:'I'}); mk('FlowProp', IB.id, {name:'a', dir:'out'}); mk('FlowProp', IB.id, {name:'b', dir:'in'}); const X = mk('Block', pk.id, {}), Y = mk('Block', pk.id, {}), C = mk('Block', pk.id, {}); const a = mk('Port', X.id, {type:IB.id}), b = mk('Port', Y.id, {type:IB.id}); const pa = mk('Part', C.id, {type:X.id}), pb = mk('Part', C.id, {type:Y.id}); const c = mk('Connector', C.id, {src:a.id, tgt:b.id, sp:pa.id, tp:pb.id}); afterChange(); const f1 = ifaceRuleIssues().some(x => x.el === c && x.rule === 'Eşlenik port eksik'); fixAll(); const ok = b.conj === true && !ifaceRuleIssues().some(x => x.el === c); delModel([pk.id]); return f1 && ok; }));
T('arayüz: tahsisli nesne akışına bağlantı yok → onarım arayüz ve bağlantı kurar', () => R(() => { const pk = mk('Package', M.rootId, {}), X = mk('Block', pk.id, {name:'Algılayıcı'}), Y = mk('Block', pk.id, {name:'İşlemci'}), C = mk('Block', pk.id, {name:'Bağlam'}); mk('Part', C.id, {name:'x', type:X.id}); mk('Part', C.id, {name:'y', type:Y.id}); const A = mk('Activity', pk.id, {}), a1 = mk('Action', A.id, {name:'Ölç'}), a2 = mk('Action', A.id, {name:'İşle'}); const fl = mk('ObjectFlow', A.id, {src:a1.id, tgt:a2.id, name:'ölçüm'}); mk('Allocate', pk.id, {src:a1.id, tgt:X.id}); mk('Allocate', pk.id, {src:a2.id, tgt:Y.id}); afterChange(); const f1 = ifaceRuleIssues().some(x => x.el === fl); fixAll(); const ok = !ifaceRuleIssues().some(x => x.el === fl) && Object.values(M.els).some(r => r.kind === 'Connector' && r.owner === C.id); delModel([pk.id]); return f1 && ok; }));

console.log(`Birim testleri: ${pass} geçti, ${fail} kaldı`);
if(fails.length){ fails.forEach(f => console.log('  ✗ ' + f)); process.exit(1); }
