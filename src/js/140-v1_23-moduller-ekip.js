/* ================= v1.23: AĞ KLASÖRÜNDE EKİP ÇALIŞMASI — MODÜLLER, SALT OKUNUR REFERANS, KİLİT ================= */
const MOD_FILTER = 'SysML modül (*.sysmod)|*.sysmod|Tüm dosyalar (*.*)|*.*';
const mods = () => { if(!M.mods) M.mods = {}; return M.mods; };
const hasNat = f => NATIVE && typeof window[f] === 'function';
function modOf(id){ const ms = M.mods; if(!ms) return null; let e = E(id), g = 0; while(e && g++ < 200){ if(ms[e.id]) return e.id; e = E(e.owner); } return null; }
const isRO = id => !!modOf(id);
function modSubtree(pid, src){
  const S = src || M, out = [], kids = new Map();
  Object.values(S.els).forEach(e => { if(!kids.has(e.owner)) kids.set(e.owner, []); kids.get(e.owner).push(e); });
  const rec = id => { const e = S.els[id]; if(!e) return; out.push(e); (kids.get(id) || []).forEach(c => rec(c.id)); };
  rec(pid); return out;
}
/* ---------- dışa aktarma (modül sahibi) ---------- */
function buildModule(pkg){
  const els = {}; modSubtree(pkg.id).forEach(e => { els[e.id] = JSON.parse(JSON.stringify(e)); });
  delete els[pkg.id].modOut;
  const ext = new Set(); Object.values(els).forEach(e => ['type', 'behavior', 'signal', 'represents', 'src', 'tgt'].forEach(k => { if(typeof e[k] === 'string' && e[k] && !els[e[k]] && E(e[k])) ext.add(e[k]); }));
  return {sysmlModule:1, id:pkg.id, name:pkg.name, rev:(pkg.modOut && pkg.modOut.rev || 0) + 1, exportedAt:new Date().toISOString(), by:userName(), from:E(M.rootId).name, app:APP_VER, ext:[...ext].map(id => ({id, kind:E(id).kind, name:E(id).name, path:pathOf(id)})), els};
}
async function exportModule(pkgId, ask){
  const pkg = E(pkgId); if(!pkg || !['Package'].includes(pkg.kind)) return toast('Modül olarak dışa aktarmak için bir paket seçin');
  if(isRO(pkg.id)) return toast('Salt okunur bir modül yeniden dışa aktarılamaz');
  const mod = buildModule(pkg), txt = JSON.stringify(mod, null, 1), name = fileSafe(pkg.name) + '.sysmod';
  let path = '';
  if(NATIVE){
    try {
      if(pkg.modOut && pkg.modOut.path && !ask){ await window.nativeWrite(pkg.modOut.path, txt); path = pkg.modOut.path; }
      else { const r = await nDialog('save', pkg.modOut && pkg.modOut.path ? baseName(pkg.modOut.path) : name, MOD_FILTER, txt, false); if(r.error) throw r.error; if(!r.path) return; path = r.path; }
    } catch(e){ return toast('Kaydedilemedi: ' + e); }
  } else download(new Blob([txt], {type:'application/json'}), name);
  snap(); pkg.modOut = {path:path || (pkg.modOut && pkg.modOut.path) || '', rev:mod.rev, at:mod.exportedAt, n:Object.keys(mod.els).length}; afterChange();
  toast(`"${pkg.name}" modülü dışa aktarıldı (rev ${mod.rev}, ${Object.keys(mod.els).length} eleman)` + (mod.ext.length ? ` · modül dışına ${mod.ext.length} başvuru var` : ''));
}
/* ---------- içe aktarma (salt okunur referans) ---------- */
async function readModuleFile(path){
  let txt = '', p = path || '', fname = '';
  if(path && hasNat('nativeRead')){ const r = await window.nativeRead(path); if(r.error) throw new Error(r.error); txt = r.text; fname = baseName(path); }
  else if(NATIVE){ const r = await nDialog('open', '', MOD_FILTER, '', false); if(r.error) throw new Error(r.error); if(!r.path) return null; txt = r.text; p = r.path; fname = baseName(p); }
  else { const f = await pickBytes(); if(!f) return null; txt = decodeText(f.u8); fname = f.name; }
  let m; try { m = JSON.parse(txt.replace(/^﻿/, '')); } catch(e){ throw new Error('Modül dosyası okunamadı'); }
  if(!m || !m.sysmlModule || !m.els || !m.els[m.id]) throw new Error('Geçerli bir modül dosyası değil (.sysmod)');
  return {m, path:p, fname};
}
function cleanModuleEls(m, target){
  /* hedef modelde olmayan başvuruları temizle; ilişkilerin ucu yoksa at */
  const has = id => !!(m.els[id] || target.els[id]); let dropped = 0, cleared = 0;
  const out = {};
  Object.values(m.els).forEach(e0 => {
    const e = JSON.parse(JSON.stringify(e0));
    if(KIND[e.kind] && KIND[e.kind].rel && ((e.src && !has(e.src)) || (e.tgt && !has(e.tgt)))){ dropped++; return; }
    ['type', 'behavior', 'signal', 'represents', 'part', 'sp', 'tp'].forEach(k => { if(typeof e[k] === 'string' && e[k] && !has(e[k])){ e[k] = ''; cleared++; } });
    ['profiles', 'reqs', 'links', 'st', 'articles', 'res', 'deps'].forEach(k => { if(Array.isArray(e[k])){ const n = e[k].filter(has); cleared += e[k].length - n.length; e[k] = n; } });
    if(e.tv) Object.keys(e.tv).forEach(k => { if(!has(k.slice(0, k.indexOf('.')))) delete e.tv[k]; });
    out[e.id] = e;
  });
  Object.values(out).filter(e => e.kind === 'Diagram').forEach(d => { d.shapes = (d.shapes || []).filter(s => out[s.el] || target.els[s.el]); const sid = new Set(d.shapes.map(s => s.id)); d.shapes.forEach(s => { if(s.parent && !sid.has(s.parent)) delete s.parent; }); d.edges = (d.edges || []).filter(x => sid.has(x.s) && sid.has(x.t) && (!x.el || out[x.el] || target.els[x.el])); });
  return {els:out, dropped, cleared};
}
async function importModule(path, R0){
  let R = R0; if(!R){ try { R = await readModuleFile(path); } catch(e){ return toast(e.message); } } if(!R) return;
  const {m} = R;
  if(E(m.id) && !mods()[m.id]) return toast(`"${m.name}" paketi bu modelde zaten düzenlenebilir olarak var (modülün kaynağı bu model olabilir)`);
  if(mods()[m.id]) return moduleUpdate(m.id, R, true);
  const lk = R.path && hasNat('nativeLockGet') ? await window.nativeLockGet(R.path) : null;
  const C = cleanModuleEls(m, M);
  snap();
  Object.values(C.els).forEach(e => { M.els[e.id] = e; });
  M.els[m.id].owner = M.rootId;
  mods()[m.id] = {name:m.name, path:R.path, fname:R.fname, rev:m.rev, at:new Date().toISOString(), exportedAt:m.exportedAt, by:m.by, from:m.from};
  modSnap(m.id); ST.exp.add(m.id); afterChange(); revealInTree(m.id);
  toast(`"${m.name}" modülü salt okunur olarak eklendi (rev ${m.rev}, ${Object.keys(C.els).length} eleman)` + (C.dropped ? ` · ucu olmayan ${C.dropped} ilişki alınmadı` : '') + (lk && lk.user ? ` · Not: ${lk.user} şu anda bu modülü düzenliyor` : ''));
}
/* güncelleme: karşılaştırma ekranında göster ya da doğrudan uygula */
let MOD_ALLOW = false, MOD_PENDING = null;
function moduleTargetModel(mid, m){
  const O = JSON.parse(JSON.stringify(M)), old = modSubtree(mid, O).map(e => e.id);
  old.forEach(id => delete O.els[id]);
  const C = cleanModuleEls(m, O); Object.values(C.els).forEach(e => { if(M.els[e.id] && M.els[e.id].notes) e.notes = M.els[e.id].notes; O.els[e.id] = e; }); O.els[mid].owner = M.els[mid] ? M.els[mid].owner : M.rootId;
  return {O, C};
}
async function moduleUpdate(mid, R0, viaCompare){
  const info = mods()[mid]; if(!info) return;
  let R = R0; if(!R){ try { R = await readModuleFile(info.path || ''); } catch(e){ toast(e.message + (info.path ? '' : '')); if(!info.path || !NATIVE) return; try { R = await readModuleFile(''); } catch(e2){ return toast(e2.message); } } } if(!R) return;
  if(R.m.id !== mid) return toast('Seçilen dosya bu modülün yeni sürümü değil (farklı modül kimliği)');
  const {O, C} = moduleTargetModel(mid, R.m), meta = {name:R.m.name, path:R.path || info.path, fname:R.fname, rev:R.m.rev, at:new Date().toISOString(), exportedAt:R.m.exportedAt, by:R.m.by, from:R.m.from};
  if(viaCompare){ MOD_PENDING = {mid, meta}; cmpLoad(O, (R.fname || info.name) + ' (rev ' + R.m.rev + ')'); toast(`Modül farkları gösteriliyor (rev ${info.rev} → ${R.m.rev}); seçip "Uygula" ile alın`); return; }
  snap(); MOD_ALLOW = true;
  try { modSubtree(mid).map(e => e.id).forEach(id => delete M.els[id]); Object.values(C.els).forEach(e => { M.els[e.id] = e; }); M.els[mid].owner = O.els[mid].owner; mods()[mid] = meta; afterChange(); }
  finally { MOD_ALLOW = false; modSnap(mid); }
  toast(`"${meta.name}" modülü güncellendi: rev ${info.rev} → ${meta.rev}` + (C.dropped ? ` · ucu olmayan ${C.dropped} ilişki alınmadı` : ''));
}
if(typeof cmpOpen === 'function'){ const _cmpOpen = cmpOpen; cmpOpen = function(){ MOD_PENDING = null; return _cmpOpen.apply(this, arguments); }; }
if(typeof cmpApply === 'function'){
  const _cmpApply = cmpApply;
  cmpApply = function(){ const P = MOD_PENDING; MOD_ALLOW = !!P; try { const r = _cmpApply.apply(this, arguments); if(P && E(P.mid)){ mods()[P.mid] = P.meta; MOD_PENDING = null; } return r; } finally { MOD_ALLOW = false; modSnapAll(); } };
}
function moduleDetach(mid){ const info = mods()[mid]; if(!info || !confirm(`"${info.name}" modülünün bağlantısı koparılsın mı? Elemanlar bu modelin düzenlenebilir parçası olur ve artık modül dosyasından güncellenmez.`)) return; snap(); delete mods()[mid]; MOD_SNAP.delete(mid); afterChange(); toast('Modül bağlantısı koparıldı; elemanlar artık düzenlenebilir'); }
function moduleRemove(mid){ const info = mods()[mid]; if(!info || !confirm(`"${info.name}" modülü modelden kaldırılsın mı? Bu modelden modül elemanlarına kurulan ilişkiler de silinir.`)) return; snap(); MOD_ALLOW = true; try { delete mods()[mid]; MOD_SNAP.delete(mid); delModel([mid]); afterChange(); } finally { MOD_ALLOW = false; } toast('Modül kaldırıldı'); }
/* ---------- salt okunur koruma: modül elemanlarındaki değişiklikler geri alınır ---------- */
const MOD_SNAP = new Map();
const modJSON = e => JSON.stringify(e, (k, v) => k === 'notes' ? undefined : v);
function modSnap(mid){ const m = new Map(); modSubtree(mid).forEach(e => { if(e.kind !== 'Diagram') m.set(e.id, modJSON(e)); }); MOD_SNAP.set(mid, m); }
function modSnapAll(){ MOD_SNAP.clear(); Object.keys(M.mods || {}).forEach(mid => { if(E(mid)) modSnap(mid); }); }
function modGuard(){
  const ms = M.mods; if(!ms || !Object.keys(ms).length) return 0;
  if(MOD_ALLOW){ modSnapAll(); return 0; }
  let n = 0, names = new Set();
  Object.keys(ms).forEach(mid => {
    const S = MOD_SNAP.get(mid); if(!S) return modSnap(mid);
    if(!E(mid)){ M.els[mid] = JSON.parse(S.get(mid)); n++; }
    const cur = new Map(); modSubtree(mid).forEach(e => { if(e.kind !== 'Diagram') cur.set(e.id, e); });
    S.forEach((js, id) => { const e = cur.get(id); if(!e || modJSON(e) !== js){ const r = JSON.parse(js); if(e && e.notes) r.notes = e.notes; M.els[id] = r; n++; names.add(ms[mid].name); } });
    cur.forEach((e, id) => { if(!S.has(id)){ e.owner = KIND[e.kind] && KIND[e.kind].rel ? M.rootId : (canOwn(E(M.rootId).kind, e.kind) ? M.rootId : e.owner); if(e.owner !== M.rootId) delete M.els[id]; n++; names.add(ms[mid].name); } });
  });
  if(n) setTimeout(() => toast(`Salt okunur modül (${[...names].join(', ')}): değişiklik geri alındı. Düzenlemek için modülün kaynak modelini kullanın veya modül bağlantısını koparın.`), 0);
  return n;
}
/* ---------- dosya kilidi (yalnız masaüstü uygulaması) ---------- */
let LOCK = {path:'', other:null, me:null};
async function lockWho(){ if(LOCK.me) return LOCK.me; try { LOCK.me = hasNat('nativeWho') ? await window.nativeWho() : {user:'', host:''}; } catch(e){ LOCK.me = {user:'', host:''}; } return LOCK.me; }
const lockMine = (lk, me) => lk && me && lk.host === me.host && (lk.winUser || '') === (me.user || '');
async function lockSync(){
  if(!hasNat('nativeLockSet') || curPath === LOCK.path) return;
  const old = LOCK.path; LOCK.path = curPath; LOCK.other = null;
  try { if(old){ const me = await lockWho(), lk = await window.nativeLockGet(old); if(lockMine(lk, me)) await window.nativeLockClear(old); } } catch(e){}
  if(!curPath) return updLockBadge();
  try {
    const me = await lockWho(), lk = await window.nativeLockGet(curPath);
    if(lk && !lockMine(lk, me)){ LOCK.other = lk; toast(`⚠ Bu dosya ${lk.user || lk.winUser || '?'} (${lk.host || '?'}) tarafından ${lk.time ? new Date(lk.time).toLocaleString('tr-TR') : ''} itibarıyla açık. Aynı anda kaydederseniz değişiklikler birbirinin üzerine yazılır.`); }
    else await window.nativeLockSet(curPath, userName(), 'model');
  } catch(e){}
  updLockBadge();
}
async function lockBeforeSave(){
  if(!hasNat('nativeLockGet') || !curPath) return true;
  try { const me = await lockWho(), lk = await window.nativeLockGet(curPath); if(lk && !lockMine(lk, me)){ LOCK.other = lk; updLockBadge(); return confirm(`Bu dosya şu anda ${lk.user || lk.winUser || '?'} (${lk.host || '?'}) tarafından açık. Yine de kaydedilsin mi? (Onun değişiklikleri kaybolabilir)`); } if(!lk) await window.nativeLockSet(curPath, userName(), 'model'); } catch(e){}
  return true;
}
function updLockBadge(){ const b = document.getElementById('lockBadge'); if(!b) return; if(LOCK.other){ b.style.display = ''; b.textContent = '🔒 ' + (LOCK.other.user || LOCK.other.winUser || '?'); b.title = `Bu dosya ${LOCK.other.user || ''} (${LOCK.other.host || ''}) tarafından da açık`; } else b.style.display = 'none'; }
/* ---------- modüller görünümü ---------- */
let MV = {locks:{}};
async function modRefreshLocks(){
  if(!hasNat('nativeLockGet')) return;
  const L = {}, paths = Object.values(mods()).map(x => x.path).concat(Object.values(M.els).filter(e => e.modOut && e.modOut.path).map(e => e.modOut.path)).filter(Boolean);
  for(const p of paths){ try { L[p] = await window.nativeLockGet(p); } catch(e){} }
  MV.locks = L; if(ST.cur === '@modules') renderView();
}
function modulesHTML(){
  const own = Object.values(M.els).filter(e => e.kind === 'Package' && !isRO(e.id)).sort((a, b) => pathOf(a.id).localeCompare(pathOf(b.id), 'tr')), refs = Object.keys(mods()).filter(id => E(id));
  const lockTxt = p => { const lk = p && MV.locks[p]; return lk ? `<span class="stc" style="background:#c0392b" title="${esc((lk.host || '') + ' · ' + (lk.time ? new Date(lk.time).toLocaleString('tr-TR') : ''))}">🔒 ${esc(lk.user || lk.winUser || '?')} düzenliyor</span>` : ''; };
  let h = `<div class="cards"><div class="card"><div class="cv">${own.filter(p => p.modOut).length}</div><div class="ct">Dışa aktarılan modül</div></div><div class="card"><div class="cv">${refs.length}</div><div class="ct">Salt okunur modül</div><div class="cs">${refs.reduce((a, id) => a + modSubtree(id).length, 0)} eleman</div></div><div class="card"><div class="cv" style="color:${NATIVE ? '#2e9e6a' : '#95a5a6'}">${NATIVE ? 'Açık' : 'Yok'}</div><div class="ct">Dosya kilidi</div><div class="cs">${NATIVE ? 'masaüstü uygulaması' : 'yalnız masaüstü uygulamasında'}</div></div></div>`;
  h += `<h3>Bu modelden paylaşılan paketler</h3><table class="rt"><thead><tr><th>Paket</th><th>Eleman</th><th>Son dışa aktarma</th><th>Dosya</th><th>Kilit</th><th></th></tr></thead><tbody>`;
  own.filter(p => p.modOut || p.owner === M.rootId).forEach(p => {
    const o = p.modOut, path = o && o.path, lk = path && MV.locks[path];
    h += `<tr data-row="${p.id}"><td class="noi18n"><a class="lnk" data-goto="${p.id}">${esc(pathOf(p.id))}</a></td><td>${modSubtree(p.id).length}</td><td>${o ? `rev ${o.rev} · ${esc(new Date(o.at).toLocaleString('tr-TR'))}` : '<span class="muted">—</span>'}</td><td class="noi18n" style="max-width:260px;word-break:break-all">${esc(path || '')}</td><td>${lockTxt(path)}</td>
      <td style="white-space:nowrap"><button class="vb${o ? ' pri' : ''}" data-mdx="exp|${p.id}">⤒ ${o ? 'Yeniden dışa aktar' : 'Modül olarak dışa aktar'}</button>${o && NATIVE ? ` <button class="vb" data-mdx="expas|${p.id}">Farklı…</button>` : ''}${path && NATIVE ? (lk ? ` <button class="vb" data-mdx="unlock|${p.id}">Kilidi bırak</button>` : ` <button class="vb" data-mdx="lock|${p.id}">🔒 Düzenliyorum</button>`) : ''}</td></tr>`;
  });
  h += `</tbody></table><div class="muted" style="font-size:12px;margin:4px 0 14px">Kök düzeyindeki paketler ve daha önce dışa aktarılanlar listelenir; başka bir paketi ağaçta sağ tık → "Modül olarak dışa aktar" ile paylaşın.</div>`;
  h += `<h3>Salt okunur modüller (başka modellerden)</h3>`;
  h += refs.length ? `<table class="rt"><thead><tr><th>Modül</th><th>Rev.</th><th>Kaynak</th><th>Dışa aktaran</th><th>Eklendi / güncellendi</th><th>Dosya</th><th>Kilit</th><th></th></tr></thead><tbody>${refs.map(id => { const x = mods()[id]; return `<tr data-row="${id}"><td class="noi18n"><a class="lnk" data-goto="${id}">🔒 ${esc(x.name)}</a> <span class="muted">(${modSubtree(id).length})</span></td><td>${esc(String(x.rev || ''))}</td><td class="noi18n">${esc(x.from || '')}</td><td class="noi18n">${esc(x.by || '')}${x.exportedAt ? '<br><span class="muted">' + esc(new Date(x.exportedAt).toLocaleString('tr-TR')) + '</span>' : ''}</td><td>${esc(new Date(x.at).toLocaleString('tr-TR'))}</td><td class="noi18n" style="max-width:220px;word-break:break-all">${esc(x.path || x.fname || '')}</td><td>${lockTxt(x.path)}</td>
      <td style="white-space:nowrap"><button class="vb pri" data-mdx="cmp|${id}">⇄ Karşılaştır ve güncelle…</button> <button class="vb" data-mdx="upd|${id}">Doğrudan güncelle</button> <button class="vb" data-mdx="det|${id}">Bağlantıyı kopar</button> <button class="tdel" data-mdx="rem|${id}" title="Modülü kaldır">✕</button></td></tr>`; }).join('')}</tbody></table>` : '<div class="muted" style="padding:6px">Salt okunur modül yok. "⤓ Modül ekle" ile başka bir modelin paylaştığı paketi ekleyin.</div>';
  return h + `<div class="vfoot">Modül: bir paketin ağ klasöründe paylaşılan kopyası (.sysmod). Paketin sahibi kendi modelinde düzenleyip yeniden dışa aktarır; diğerleri salt okunur olarak ekler, kendi elemanlarını modül elemanlarına bağlar ve yeni sürümü karşılaştırarak alır. Modül elemanlarında yapılan değişiklikler otomatik geri alınır.</div>`;
}
function modulesBar(){ return `<button class="vb pri" data-mdx="imp|">⤓ Modül ekle…</button><span class="vsep"></span>${NATIVE ? '<button class="vb" data-mdx="locks|">↻ Kilitleri yenile</button>' : ''}`; }
VIEWS['@modules'] = {tr:'Modüller (ekip çalışması)', ic:'MD', note:'Paketleri ağ klasöründe modül dosyası (.sysmod) olarak paylaşın; başkalarının modüllerini <b>salt okunur</b> olarak ekleyin ve yeni sürümlerini karşılaştırma ekranında seçerek alın.<br><br>Masaüstü uygulamasında, açık model ve modül dosyalarının yanına <b>kilit dosyası</b> (.lock) yazılır; aynı dosyayı açan diğer kişi kimin düzenlediğini görür.', render:modulesHTML, bar:modulesBar, status:() => Object.keys(mods()).length + ' salt okunur modül'};
(function(){
  $('#view').addEventListener('click', async ev => {
    const b = ev.target.closest('[data-mdx]'); if(!b || ST.cur !== '@modules') return;
    const [a, id] = b.dataset.mdx.split('|'), p = E(id);
    if(a === 'imp') return importModule('');
    if(a === 'locks') return modRefreshLocks();
    if(a === 'exp') return exportModule(id, false).then(modRefreshLocks);
    if(a === 'expas') return exportModule(id, true).then(modRefreshLocks);
    if(a === 'lock' && p && p.modOut){ try { const me = await lockWho(), lk = await window.nativeLockGet(p.modOut.path); if(lk && !lockMine(lk, me) && !confirm(`Modül ${lk.user || '?'} tarafından kilitli. Kilit devralınsın mı?`)) return; await window.nativeLockSet(p.modOut.path, userName(), 'module'); toast('Modül kilitlendi — diğer kullanıcılar sizin düzenlediğinizi görür'); } catch(e){ toast('Kilit yazılamadı: ' + e); } return modRefreshLocks(); }
    if(a === 'unlock' && p && p.modOut){ try { await window.nativeLockClear(p.modOut.path); } catch(e){} return modRefreshLocks(); }
    if(a === 'cmp') return moduleUpdate(id, null, true);
    if(a === 'upd') return moduleUpdate(id, null, false);
    if(a === 'det') return moduleDetach(id);
    if(a === 'rem') return moduleRemove(id);
  });
})();
/* özellik paneli: salt okunur bildirimi */
HOOKS.props.push(function(){
    const {el} = propTarget(); const mid = el && el.id && modOf(el.id); if(!mid) return;
    const x = mods()[mid], P = $('#props');
    P.insertAdjacentHTML('afterbegin', `<div class="robar">🔒 Salt okunur modül: <b class="noi18n">${esc(x.name)}</b> (rev ${esc(String(x.rev))}${x.from ? ', <span class="noi18n">' + esc(x.from) + '</span>' : ''}). Yapılan değişiklikler geri alınır.</div>`);
    P.querySelectorAll('input, select, textarea').forEach(i => { if(!i.closest('.robar') && !i.closest('.note') && i.id !== 'noteTx' && !i.closest('details.wu')) i.disabled = true; });
  });

