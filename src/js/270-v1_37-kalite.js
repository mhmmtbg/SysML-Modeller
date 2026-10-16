/* ================= v1.37: KALİTE ALTYAPISI — HATA GÜNLÜĞÜ, DOSYA BÜTÜNLÜĞÜ, ONARIM RAPORU, VERİMLİ GERİ AL ================= */
/* ---------- yakalanmamış hatalar günlüğe ---------- */
window.addEventListener('error', ev => appErr('genel', ev.error || ev.message));
window.addEventListener('unhandledrejection', ev => appErr('söz (promise)', ev.reason));
function errLogDialog(){
  const L = (window.APP_ERRS || []).slice().reverse();
  const box = $('#modalBox'); box.style.width = 'min(860px, 96vw)'; box.style.maxWidth = 'none';
  box.innerHTML = `<h2>Hata günlüğü</h2><p class="muted" style="margin:-4px 0 8px;font-size:12px">Bu oturumda yakalanan hatalar (en yeni üstte). Bir sorun bildirirken bu listeyi kopyalayıp iletin. Model verisi içermez.</p>
    ${L.length ? `<div style="max-height:52vh;overflow:auto"><table class="rt fmt"><thead><tr><th>Zaman</th><th>Yer</th><th>Hata</th></tr></thead><tbody>${L.map(x => `<tr><td style="white-space:nowrap">${esc(x.t.slice(11, 19))}</td><td class="noi18n">${esc(x.where)}</td><td class="noi18n">${esc(x.msg)}<div class="muted" style="font-size:11px">${esc(x.stack)}</div></td></tr>`).join('')}</tbody></table></div>` : '<div class="vempty">Bu oturumda hata kaydı yok.</div>'}
    <p style="text-align:right;margin:12px 0 0"><span class="muted" style="float:left;font-size:12px">SysML Modelleyici ${APP_VER}</span><button class="pbtn" id="elCp">Panoya kopyala</button> <button class="pbtn" id="elClr">Temizle</button> <button class="pbtn pri" id="elC">Kapat</button></p>`;
  $('#modal').style.display = 'flex';
  const close = () => { $('#modal').style.display = 'none'; box.style.width = ''; box.style.maxWidth = ''; box.onclick = null; };
  box.onclick = ev => {
    if(ev.target.id === 'elC') close();
    if(ev.target.id === 'elClr'){ window.APP_ERRS = []; close(); toast('Hata günlüğü temizlendi'); }
    if(ev.target.id === 'elCp'){ const t = 'SysML Modelleyici ' + APP_VER + '\n' + L.map(x => `${x.t}\t${x.where}\t${x.msg}\t${x.stack}`).join('\n'); try { navigator.clipboard.writeText(t); toast('Kopyalandı'); } catch(e){ appErr('pano', e); } }
  };
}
HOOKS.menu.tools.push(r => r.push('-', {t:'Hata günlüğü…' + ((window.APP_ERRS || []).length ? ' (' + window.APP_ERRS.length + ')' : ''), f:errLogDialog}));
/* ---------- dosya bütünlüğü: sağlama toplamı ve şema denetimi ---------- */
function fnv1a(s){ let h = 0x811c9dc5; for(let i = 0; i < s.length; i++){ h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); } return ('0000000' + (h >>> 0).toString(16)).slice(-8); }
const elsSum = els => fnv1a(JSON.stringify(els, clean));
{
  const _pack = pack;
  pack = function(){ const m = _pack.apply(this, arguments); m.chk = {alg:'fnv1a-32', n:Object.keys(m.els).length, h:elsSum(m.els)}; queueMicrotask(() => { if(M === m) delete M.chk; }); return m; };
}
function fileCheck(m){
  const out = [];
  if(!m || typeof m !== 'object') return [['hata', 'Dosya bir model nesnesi değil']];
  if(!m.els || typeof m.els !== 'object' || Array.isArray(m.els)) return [['hata', '"els" eleman tablosu yok veya geçersiz']];
  if(!m.rootId || !m.els[m.rootId]) out.push(['hata', 'Kök model (rootId) bulunamadı']);
  else if(m.els[m.rootId].kind !== 'Model') out.push(['uyarı', 'Kök eleman Model türünde değil']);
  if(m.chk && m.chk.h){
    const n = Object.keys(m.els).length;
    if(m.chk.n !== n) out.push(['uyarı', `Kayıtlı eleman sayısı ${m.chk.n}, dosyada ${n} — dosya kaydedildikten sonra değiştirilmiş veya eksik`]);
    else if(m.chk.h !== elsSum(m.els)) out.push(['uyarı', 'Sağlama toplamı tutmuyor — dosya kaydedildikten sonra dışarıda değiştirilmiş veya bozulmuş olabilir']);
  } else if(m.app) out.push(['bilgi', 'Dosyada sağlama toplamı yok (v1.37 öncesi kayıt)']);
  let unk = 0, noid = 0, dang = 0, badD = 0;
  for(const k in m.els){ const e = m.els[k]; if(!e || typeof e !== 'object' || !e.kind){ noid++; continue; } if(!KIND[e.kind] && !e._unk) unk++; if(KIND[e.kind] && KIND[e.kind].rel && (!m.els[e.src] || !m.els[e.tgt])) dang++; if(e.kind === 'Diagram' && (!Array.isArray(e.shapes) || e.shapes.some(s => !s || !m.els[s.el]))) badD++; }
  if(noid) out.push(['hata', noid + ' kayıt eleman yapısında değil']);
  if(unk) out.push(['uyarı', unk + ' eleman bu sürümün tanımadığı türde']);
  if(dang) out.push(['uyarı', dang + ' ilişkinin ucu eksik']);
  if(badD) out.push(['uyarı', badD + ' diyagramda eksik elemana işaret eden şekil var']);
  return out;
}
let LAST_REPAIR = null;
{
  const _mig = migrateModel;
  migrateModel = function(m){ const notes = _mig.apply(this, arguments); if(LAST_REPAIR) LAST_REPAIR.notes = notes.slice(); return notes; };
  const _lm2 = loadModel;
  loadModel = function(m){
    LAST_REPAIR = {t:new Date().toISOString(), issues:fileCheck(m), notes:[]}; if(m) delete m.chk;
    _lm2.apply(this, arguments);
    const R = LAST_REPAIR; LAST_REPAIR = null;
    const real = R.issues.filter(x => x[0] !== 'bilgi');
    if(real.length || R.notes.length){
      M.repairLog = (M.repairLog || []).concat([{t:R.t, app:APP_VER, issues:R.issues.map(x => x[0] + ': ' + x[1]), notes:R.notes}]).slice(-50);
      setTimeout(() => repairDialog(R), 80);
    }
    return R;
  };
}
function repairDialog(R){
  const box = $('#modalBox'); if(!box || !M) return;
  box.style.width = 'min(640px, 94vw)'; box.style.maxWidth = 'none';
  box.innerHTML = `<h2>Dosya denetimi</h2><p class="muted" style="margin:-4px 0 8px;font-size:12px">Açılan dosyada aşağıdaki durumlar tespit edildi ve gerekli onarımlar yapıldı. Kayıt, modelin "onarım geçmişi"ne eklendi (Araçlar ▾ → Hata günlüğü… yanında Dosya denetim geçmişi).</p>
    ${R.issues.length ? `<div class="sub"><span>Bütünlük</span></div>${R.issues.map(x => `<div class="li"><span class="stc" style="background:${SEV_COL[x[0]] || '#888'}">${esc(x[0])}</span> ${esc(x[1])}</div>`).join('')}` : ''}
    ${R.notes.length ? `<div class="sub"><span>Yapılan onarımlar</span></div>${R.notes.map(n => `<div class="li">• ${esc(n)}</div>`).join('')}` : ''}
    <p style="text-align:right;margin:12px 0 0"><button class="pbtn pri" id="rdC">Tamam</button></p>`;
  $('#modal').style.display = 'flex';
  box.onclick = ev => { if(ev.target.id === 'rdC'){ $('#modal').style.display = 'none'; box.style.width = ''; box.style.maxWidth = ''; box.onclick = null; } };
}
function repairHistoryDialog(){
  const L = (M.repairLog || []).slice().reverse();
  const box = $('#modalBox'); box.style.width = 'min(720px, 96vw)'; box.style.maxWidth = 'none';
  box.innerHTML = `<h2>Dosya denetim geçmişi</h2>${L.length ? L.map(r => `<div class="sub"><span>${esc(new Date(r.t).toLocaleString('tr-TR'))} · v${esc(r.app || '')}</span></div>${r.issues.concat(r.notes).map(x => `<div class="li noi18n">• ${esc(x)}</div>`).join('')}`).join('') : '<div class="vempty">Bu model açılırken hiç onarım gerekmedi.</div>'}
    <p style="text-align:right;margin:12px 0 0"><button class="pbtn pri" id="rhC">Kapat</button></p>`;
  $('#modal').style.display = 'flex';
  box.onclick = ev => { if(ev.target.id === 'rhC'){ $('#modal').style.display = 'none'; box.style.width = ''; box.style.maxWidth = ''; box.onclick = null; } };
}
HOOKS.menu.tools.push(r => r.push({t:'Dosya denetim geçmişi…' + ((M && M.repairLog || []).length ? ' (' + M.repairLog.length + ')' : ''), f:repairHistoryDialog}));
/* ---------- verimli geri al: değişmeyen elemanlar adımlar arasında paylaşılır ---------- */
const UNDO_INTERN = new Map();
function undoEnc(){
  const els = {};
  for(const k in M.els){ const s = JSON.stringify(M.els[k]), c = UNDO_INTERN.get(k); if(c === s) els[k] = c; else { UNDO_INTERN.set(k, s); els[k] = s; } }
  const rest = Object.assign({}, M); delete rest.els;
  return {u:1, rest:JSON.stringify(rest), els};
}
function undoDec(x){
  if(typeof x === 'string') return JSON.parse(x);
  const m = JSON.parse(x.rest); m.els = {}; for(const k in x.els) m.els[k] = JSON.parse(x.els[k]); return m;
}
{
  snap = function(){ bump(); MCHG++; if(ST.batch) return; markDirty(); undoStack.push(undoEnc()); if(undoStack.length > 150) undoStack.shift(); redoStack.length = 0; };
  undo = function(){ if(!undoStack.length) return toast('Geri alınacak işlem yok'); markDirty(); redoStack.push(undoEnc()); M = undoDec(undoStack.pop()); afterLoad(); };
  redo = function(){ if(!redoStack.length) return; markDirty(); undoStack.push(undoEnc()); M = undoDec(redoStack.pop()); afterLoad(); };
}
if(typeof ACT === 'object'){ ACT.undo = () => undo(); ACT.redo = () => redo(); }
function undoMemory(){ const seen = new Set(); let bytes = 0; undoStack.concat(redoStack).forEach(x => { if(typeof x === 'string'){ bytes += x.length * 2; return; } bytes += x.rest.length * 2; for(const k in x.els){ const s = x.els[k]; if(!seen.has(s)){ seen.add(s); bytes += s.length * 2; } } }); return bytes; }
