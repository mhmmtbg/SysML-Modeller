/* Tüm denetimler tek komutla — node tests/hepsi.js [--stres]
   1) derleme tutarlılığı (app/sysml-modeler.html kaynaklarla aynı mı)  2) birim testleri  3) uçtan uca regresyon
   4) altın çıktı karşılaştırması  5) özellik ↔ test kapsaması  6) (isteğe bağlı) gerçek ölçek stres testi */
const { spawnSync } = require('child_process'), path = require('path');
const R = path.join(__dirname, '..');
const steps = [
  ['Derleme tutarlılığı', 'python3', ['tools/build.py', '--check']],
  ['Birim testleri', 'node', ['tests/unit.js']],
  ['Uçtan uca regresyon', 'node', ['tests/regression.js']],
  ['Altın çıktı', 'node', ['tests/cikti.js']],
  ['Özellik ↔ test', 'node', ['tools/ozellik-test.js', '--check']]
].concat(process.argv.includes('--stres') ? [['Stres testi', 'node', ['tests/stres.js']]] : []);
let bad = 0;
for (const [ad, cmd, args] of steps) {
  const t0 = Date.now(), r = spawnSync(cmd, args, { cwd: R, encoding: 'utf8', maxBuffer: 64 << 20 });
  const out = (r.stdout || '') + (r.stderr || ''), ok = r.status === 0, last = out.trim().split('\n').filter(l => /geçti|aynı|kapsanıyor|Stres modeli|✗/.test(l));
  if (!ok) bad++;
  console.log((ok ? '✓ ' : '✗ ') + ad.padEnd(22) + String(Math.round((Date.now() - t0) / 1000)).padStart(4) + ' sn  ' + (last.slice(-1)[0] || (ok ? '' : out.trim().split('\n').slice(-3).join(' | '))));
  if (!ok) last.filter(l => /✗/.test(l)).slice(0, 8).forEach(l => console.log('      ' + l.trim().slice(0, 200)));
}
console.log(bad ? `\n${bad} denetim başarısız` : '\nTüm denetimler geçti'); process.exit(bad ? 1 : 0);
