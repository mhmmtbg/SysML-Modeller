/* Özellik ↔ test izlenebilirlik tablosu.
   tests/ozellikler.json'daki her özellik için birim (tests/unit.js T(...)) ve uçtan uca (tests/regression.js ok(...)) test adlarını
   düzenli ifadelerle eşler ve docs/OZELLIK-TEST.md dosyasını yazar. Testi olmayan özellik varsa --check ile çıkış kodu 1 döner.
   Çalıştırma: node tools/ozellik-test.js [--check] */
const fs = require('fs'), path = require('path');
const R = p => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');
const names = (src, re) => { const out = []; let m; while((m = re.exec(src))) out.push(m[1].replace(/\\'/g, "'")); return out; };
const unit = names(R('tests/unit.js'), /\bT\(\s*'((?:[^'\\]|\\.)*)'/g);
const reg = names(R('tests/regression.js'), /\bok\(\s*'((?:[^'\\]|\\.)*)'/g);
const feats = JSON.parse(R('tests/ozellikler.json'));
const match = (list, res) => (res || []).flatMap(r => list.filter(n => new RegExp(r, 'i').test(n)));
const rows = feats.map(f => { const u = [...new Set(match(unit, f.unit))], g = [...new Set(match(reg, f.reg))]; return {f, u, g, ok:u.length + g.length > 0}; });
const usedU = new Set(rows.flatMap(r => r.u)), usedG = new Set(rows.flatMap(r => r.g));
const esc = s => String(s).replace(/\|/g, '\\|');
let md = `# Özellik ↔ Test İzlenebilirlik Tablosu\n\n_Bu dosya \`node tools/ozellik-test.js\` ile üretilir; elle düzenlemeyin._\n\n`;
md += `- Özellik: **${feats.length}**, testle kapsanan: **${rows.filter(r => r.ok).length}**\n- Birim testi adı: ${unit.length} (döngüyle üretilenler dahil olmayabilir), uçtan uca test: ${reg.length}\n\n`;
md += `| No | Özellik | Sürüm | Birim testleri | Uçtan uca testler | Durum |\n|---|---|---|---|---|---|\n`;
rows.forEach(({f, u, g, ok}) => { md += `| ${f.id} | ${esc(f.ad)} | ${f.surum} | ${u.length ? u.length + ': ' + u.map(esc).join('; ') : '—'} | ${g.length ? g.map(esc).join('; ') : '—'} | ${ok ? '✓' : '⚠ test yok'} |\n`; });
const freeU = unit.filter(n => !usedU.has(n)), freeG = reg.filter(n => !usedG.has(n));
if(freeU.length || freeG.length) md += `\n## Özelliğe bağlanmamış testler\n\n${freeU.map(n => '- (birim) ' + n).join('\n')}${freeU.length && freeG.length ? '\n' : ''}${freeG.map(n => '- (uçtan uca) ' + n).join('\n')}\n`;
fs.writeFileSync(path.join(__dirname, '..', 'docs', 'OZELLIK-TEST.md'), md);
const miss = rows.filter(r => !r.ok);
console.log(`Özellik ↔ test: ${rows.length - miss.length}/${rows.length} kapsanıyor; bağlanmamış test ${freeU.length + freeG.length}`);
miss.forEach(r => console.log('  ⚠ ' + r.f.id + ' ' + r.f.ad));
if(process.argv.includes('--check') && miss.length) process.exit(1);
