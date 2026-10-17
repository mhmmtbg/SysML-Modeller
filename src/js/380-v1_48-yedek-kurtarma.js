/* ================= v1.48: VERİ GÜVENLİĞİ — DÖNEN YEDEKLER, GERİ YÜKLEME, KURTARMA BİLDİRİMİ =================
   Masaüstü: her kayıtta dosyanın yanındaki .yedek klasörüne zaman damgalı kopya (yazılamazsa yerel uygulama klasörü); son N tutulur.
   Tarayıcı: IndexedDB'de model başına son N anlık görüntü; kayıtta ve düzenleme sırasında en çok 10 dakikada bir. */
const BK_DEF = {on:true, keep:10, every:10};
const bkCfg = () => { try { return Object.assign({}, BK_DEF, JSON.parse(localStorage.getItem('sysml-yedek') || '{}')); } catch(e){ return Object.assign({}, BK_DEF); } };
const bkSetCfg = c => { try { localStorage.setItem('sysml-yedek', JSON.stringify(c)); } catch(e){ appErr('bkcfg', e); } };
const bkText = () => JSON.stringify(pack(), clean, 1);
let BK_LAST = {h:'', t:0}, BK_ERR = false, BK_PEND = '';
/* içerik özeti: kayıt zamanı, açık sekmeler ve sağlama alanı gibi değişken alanlar hariç */
const bkHash = txt => { try { const o = JSON.parse(txt); delete o.savedAt; delete o.ui; delete o.chk; return String(fnv1a(JSON.stringify(o))); } catch(e){ return String(fnv1a(txt)); } };
/* ---------- IndexedDB (tarayıcı) ---------- */
function idbOpen(){ return new Promise((res, rej) => { try { const r = indexedDB.open('sysml-yedek', 1); r.onupgradeneeded = () => { const db = r.result; if(!db.objectStoreNames.contains('snap')){ const s = db.createObjectStore('snap', {keyPath:'id', autoIncrement:true}); s.createIndex('uid', 'uid'); } }; r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); } catch(e){ rej(e); } }); }
async function idbAll(uid0){ const db = await idbOpen(); return new Promise((res, rej) => { const out = [], tx = db.transaction('snap', 'readonly'), c = tx.objectStore('snap').openCursor(); c.onsuccess = () => { const cur = c.result; if(cur){ if(!uid0 || cur.value.uid === uid0) out.push(cur.value); cur.continue(); } else res(out.sort((a, b) => b.t - a.t)); }; c.onerror = () => rej(c.error); }); }
async function idbPut(rec, keep){ const db = await idbOpen(); await new Promise((res, rej) => { const tx = db.transaction('snap', 'readwrite'); tx.objectStore('snap').add(rec); tx.oncomplete = res; tx.onerror = () => rej(tx.error); }); const L = await idbAll(rec.uid); if(L.length > keep){ const db2 = await idbOpen(); await new Promise(res => { const tx = db2.transaction('snap', 'readwrite'), st = tx.objectStore('snap'); L.slice(keep).forEach(x => st.delete(x.id)); tx.oncomplete = res; tx.onerror = res; }); } }
/* ---------- yedek alma ---------- */
async function backupNow(reason, txt){
  const c = bkCfg(); if(!c.on) return null;
  txt = txt || bkText(); const h = bkHash(txt); if((h === BK_LAST.h || h === BK_PEND) && reason !== 'restore') return null;
  BK_PEND = h; /* yazım sürerken gelen aynı içerikli ikinci istek (art arda kayıt) yinelenmez */
  try {
    if(NATIVE && typeof window.nativeBackup === 'function'){
      const r = await window.nativeBackup(curPath || 'kaydedilmemis.sysml', txt, c.keep); if(r && r.error) throw new Error(r.error);
      BK_LAST = {h, t:Date.now()}; return r && r.path;
    }
    if(typeof indexedDB === 'undefined') return null;
    await idbPut({uid:M.uid || 'model', name:E(M.rootId).name, t:Date.now(), n:Object.keys(M.els).length, size:txt.length, reason:reason || '', data:txt}, c.keep);
    BK_LAST = {h, t:Date.now()}; return 'idb';
  } catch(e){ appErr('backup', e); if(!BK_ERR){ BK_ERR = true; toast('Yedek alınamadı: ' + (e.message || e)); } return null; }
  finally { if(BK_PEND === h) BK_PEND = ''; }
}
{
  const _sj = saveJSON;
  saveJSON = async function(saveAs){ const r = await _sj.apply(this, arguments); if(!NATIVE || (!dirty && curPath)) backupNow('kayıt'); return r; };
  ACT.save = () => saveJSON(false); if(ACT.saveAs) ACT.saveAs = () => saveJSON(true);
  const _sh = saveHTML; saveHTML = function(){ const r = _sh.apply(this, arguments); backupNow('html'); return r; }; if(ACT.saveHtml) ACT.saveHtml = saveHTML;
  /* tarayıcıda düzenleme sırasında periyodik yedek */
  const _ps = persist; persist = function(){ const r = _ps.apply(this, arguments); if(!NATIVE){ const c = bkCfg(); if(c.on && Date.now() - BK_LAST.t > c.every * 60000) backupNow('otomatik'); } return r; };
}
/* ---------- fark özeti ---------- */
function modelDiff(a, b){
  const A = a.els || {}, B = b.els || {}; let add = 0, del = 0, chg = 0; const reqs = {add:0, del:0, chg:0};
  const sig = e => JSON.stringify(Object.assign({}, e, {shapes:undefined, edges:undefined}));
  for(const k in B){ if(!A[k]){ add++; if(B[k].kind === 'Requirement') reqs.add++; } else if(sig(A[k]) !== sig(B[k])){ chg++; if(B[k].kind === 'Requirement') reqs.chg++; } }
  for(const k in A) if(!B[k]){ del++; if(A[k].kind === 'Requirement') reqs.del++; }
  return {add, del, chg, reqs};
}
const diffTxt = d => !d ? '—' : (!d.add && !d.del && !d.chg) ? 'aynı' : [d.add ? '+' + d.add : '', d.del ? '−' + d.del : '', d.chg ? '~' + d.chg : ''].filter(Boolean).join(' ') + (d.reqs.add + d.reqs.del + d.reqs.chg ? ` (gereksinim: ${[d.reqs.add ? '+' + d.reqs.add : '', d.reqs.del ? '−' + d.reqs.del : '', d.reqs.chg ? '~' + d.reqs.chg : ''].filter(Boolean).join(' ')})` : '');
/* ---------- geri yükleme penceresi ---------- */
async function backupEntries(){
  if(NATIVE && typeof window.nativeBackupList === 'function'){
    const L = (await window.nativeBackupList(curPath || 'kaydedilmemis.sysml')) || [];
    return L.map(x => ({id:x.path, t:Date.parse(x.mtime) || 0, size:x.size, name:x.name, load:async () => { const r = await window.nativeRead(x.path); if(r.error) throw new Error(r.error); return r.text; }}));
  }
  const L = await idbAll(M.uid || 'model');
  return L.map(x => ({id:x.id, t:x.t, size:x.size, name:x.name, reason:x.reason, load:async () => x.data}));
}
async function restoreDialog(){
  const box = $('#modalBox'); box.style.width = 'min(860px, 96vw)'; box.style.maxWidth = 'none'; box.onclick = null;
  box.innerHTML = '<h2>Yedekten geri yükle</h2><div class="muted">Yedekler okunuyor…</div>'; $('#modal').style.display = 'flex';
  let L = []; try { L = await backupEntries(); } catch(e){ box.innerHTML = `<h2>Yedekten geri yükle</h2><div class="tsbad">Yedekler okunamadı: ${esc(e.message || String(e))}</div><p style="text-align:right"><button class="pbtn pri" id="rbC">Kapat</button></p>`; box.onclick = ev => { if(ev.target.id === 'rbC') $('#modal').style.display = 'none'; }; return; }
  const cur = pack(), rows = [];
  for(const x of L){ let m = null, d = null, n = null, nr = null; try { m = parseModelText(await x.load()); if(m){ n = Object.keys(m.els || {}).length; nr = Object.values(m.els || {}).filter(e => e.kind === 'Requirement').length; d = modelDiff(m, cur); } } catch(e){ appErr('bkread', e); } rows.push({x, m, d, n, nr}); }
  const c = bkCfg();
  box.innerHTML = `<h2>Yedekten geri yükle</h2><div class="muted" style="margin:-4px 0 8px">${NATIVE ? (curPath ? 'Yedekler: <span class="noi18n">' + esc(curPath.replace(/[^\\/]+$/, '')) + '.yedek</span> (yazılamazsa yerel uygulama klasörü)' : 'Model henüz kaydedilmedi — yedekler yerel uygulama klasöründe') : 'Yedekler bu tarayıcının yerel veritabanında (model başına)'} · her kayıtta${NATIVE ? '' : ' ve düzenlerken en çok ' + c.every + ' dakikada bir'} alınır, son ${c.keep} tanesi tutulur.</div>
    ${rows.length ? `<table class="rt fmt"><thead><tr><th>Tarih</th><th>Eleman</th><th>Gereksinim</th><th>Boyut</th><th>Şu anki modele göre fark</th><th></th></tr></thead><tbody>${rows.map((r, i) => `<tr><td style="white-space:nowrap">${esc(new Date(r.x.t).toLocaleString('tr-TR'))}${r.x.reason ? ` <span class="muted">(${esc(r.x.reason)})</span>` : ''}</td><td>${r.n == null ? '<span class="tsbad">okunamadı</span>' : r.n}</td><td>${r.nr == null ? '' : r.nr}</td><td>${(r.x.size / 1024).toFixed(0)} KB</td><td class="muted" title="+ bu yedekte olmayan, sonradan eklenen · − yedekte olup şimdi olmayan · ~ değişen">${esc(diffTxt(r.d))}</td><td style="white-space:nowrap">${r.m ? `<button class="vb pri" data-rbr="${i}">Geri yükle</button> <button class="vb" data-rbd="${i}">İndir</button>` : ''}</td></tr>`).join('')}</tbody></table>` : '<div class="vempty">Henüz yedek yok. İlk yedek bir sonraki kayıtta alınır.</div>'}
    <div class="li" style="margin-top:10px"><label class="vchk"><input type="checkbox" id="rbOn"${c.on ? ' checked' : ''}> Otomatik yedek al</label> <label>Tutulacak yedek <input id="rbKeep" class="fmsel" value="${c.keep}" style="width:46px"></label>${NATIVE ? '' : ` <label>Düzenlerken yedek aralığı (dk) <input id="rbEvery" class="fmsel" value="${c.every}" style="width:46px"></label>`} <button class="vb" id="rbNow">Şimdi yedekle</button></div>
    <p style="text-align:right;margin:12px 0 0"><button class="pbtn pri" id="rbC">Kapat</button></p>`;
  box.onchange = () => { const k = Math.max(1, Math.min(100, parseInt($('#rbKeep').value, 10) || 10)), ev = $('#rbEvery') ? Math.max(1, Math.min(240, parseInt($('#rbEvery').value, 10) || 10)) : c.every; bkSetCfg({on:$('#rbOn').checked, keep:k, every:ev}); };
  box.onclick = async ev => {
    const t = ev.target.closest('button'); if(!t) return;
    if(t.id === 'rbC'){ $('#modal').style.display = 'none'; box.onclick = box.onchange = null; return; }
    if(t.id === 'rbNow'){ BK_LAST.h = ''; const p = await backupNow('elle'); toast(p ? 'Yedek alındı' : 'Yedek alınamadı'); restoreDialog(); return; }
    if(t.dataset.rbd != null){ const r = rows[+t.dataset.rbd]; download(new Blob([await r.x.load()], {type:'application/json'}), fileSafe(E(M.rootId).name) + ' - yedek ' + new Date(r.x.t).toISOString().slice(0, 16).replace(/[T:]/g, '-') + '.sysml'); return; }
    if(t.dataset.rbr != null){
      const r = rows[+t.dataset.rbr]; if(!confirm(`${new Date(r.x.t).toLocaleString('tr-TR')} tarihli yedek geri yüklensin mi?\n\nŞu anki durum önce ayrı bir yedek olarak saklanır; ayrıca Geri Al ile dönülebilir.`)) return;
      BK_LAST.h = ''; await backupNow('geri yükleme öncesi');
      snap(); const m = parseModelText(await r.x.load()); const keepPath = curPath; loadModel(m); afterLoad(); renderAll(); if(NATIVE){ curPath = keepPath; dirty = true; updTitle(); } afterChange();
      $('#modal').style.display = 'none'; box.onclick = box.onchange = null; toast('Yedek geri yüklendi — kalıcı olması için kaydedin');
    }
  };
}
HOOKS.menu.tools.push(r => { r.push({t:'Yedekten geri yükle…', f:restoreDialog}); });
if(typeof MENU_GROUPS !== 'undefined') MENU_GROUPS.tools.cls.unshift(['Model kalitesi', /Yedekten geri yükle/]);
/* ---------- açılışta kurtarma bildirimi ---------- */
BOOT_HOOKS.push(info => {
  if(!info || !info.native) return;
  /* başka bir dosya açılırken önceki oturumun kaydedilmemiş değişiklikleri kaybolmasın */
  if(info.argText && info.autosave && info.dirty && info.lastPath !== info.argPath && typeof window.nativeBackup === 'function'){
    window.nativeBackup(info.lastPath || 'kaydedilmemis.sysml', info.autosave, bkCfg().keep).then(r => { if(r && r.path) recoverNote(`Önceki oturumun kaydedilmemiş değişiklikleri yedeklendi (${baseName(info.lastPath) || 'kaydedilmemiş model'}). Yedekten geri yükle ile açabilirsiniz.`, null); }).catch(e => appErr('bootbk', e));
    return;
  }
  if(!info.argText && info.autosave && info.dirty) recoverNote(info.lastPath ? `Kaydedilmemiş değişiklikler kurtarıldı (${baseName(info.lastPath)}).` : 'Kaydedilmemiş model kurtarıldı.', info.lastPath || null);
});
function recoverNote(msg, diskPath){
  const st = $('#status'); if(!st) return; const old = $('#recNote'); if(old) old.remove();
  st.insertAdjacentHTML('afterbegin', `<span id="recNote" class="recnote">⚠ ${esc(msg)} ${diskPath ? '<a class="lnk" data-rn="disk" tabindex="0">Diskteki kayıtlı sürümü aç</a> · ' : ''}<a class="lnk" data-rn="list" tabindex="0">Yedekler</a> · <a class="lnk" data-rn="x" tabindex="0">Tamam</a></span>`);
  $('#recNote').onclick = async ev => { const a = ev.target.closest('[data-rn]'); if(!a) return; const k = a.dataset.rn;
    if(k === 'x'){ $('#recNote').remove(); return; }
    if(k === 'list'){ restoreDialog(); return; }
    if(k === 'disk'){ if(!confirm('Kurtarılan değişiklikler bırakılıp diskteki kayıtlı sürüm açılsın mı?\n\nKurtarılan durum önce yedeklenir.')) return; BK_LAST.h = ''; await backupNow('kurtarılan oturum'); const r = await window.nativeRead(diskPath); if(r.error) return toast('Okunamadı: ' + r.error); const m = parseModelText(r.text); if(!m) return toast('Dosya okunamadı'); loadModel(m); afterLoad(); renderAll(); curPath = diskPath; dirty = false; updTitle(); persist(); $('#recNote').remove(); toast('Kayıtlı sürüm açıldı'); }
  };
}
{
  /* durum çubuğu alt öğeleri metinle güncellenir; #recNote kendiliğinden korunur */
  const css = document.createElement('style'); css.textContent = '.recnote{background:#fff4d6;border:1px solid #e1b12c;border-radius:4px;padding:1px 8px;margin-right:10px;white-space:nowrap}body.dark .recnote{background:#3a3220;border-color:#8a6d1c}'; document.head.appendChild(css);
}
