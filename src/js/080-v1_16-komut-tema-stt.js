/* ================= v1.16: KOMUT PALETİ, KARANLIK TEMA, DURUM GEÇİŞ TABLOSU, KULLANILDIĞI YERLER ================= */
/* ---- kullanıldığı yerler ---- */
function whereUsed(id){
  const e = E(id); if(!e) return [];
  const G = [], els = Object.values(M.els), add = (t, list) => { if(list.length) G.push([t, list]); };
  add('Gösterildiği diyagramlar', els.filter(d => d.kind === 'Diagram' && d.shapes.some(s => s.el === id)));
  add('Tip olarak kullanıldığı part / port / value', els.filter(x => ['Part', 'Port', 'Value', 'FlowProp', 'Lifeline', 'ConstraintProp', 'Pin', 'ActParam', 'Param', 'Object'].includes(x.kind) && (x.type === id || (e.name && TYPEDEF.includes(e.kind) && x.vtype === e.name))));
  add('Çağıran aksiyonlar / davranış', els.filter(x => x.behavior === id || x.signal === id || x.represents === id));
  add('Alt tipleri (generalization)', els.filter(r => r.kind === 'Generalization' && r.tgt === id).map(r => E(r.src)).filter(Boolean));
  const rels = els.filter(r => KIND[r.kind] && KIND[r.kind].rel && (r.src === id || r.tgt === id) && r.kind !== 'Generalization');
  add('İlişkiler', rels.map(r => ({_rel:r, other:E(r.src === id ? r.tgt : r.src), out:r.src === id})).filter(x => x.other));
  add('Kullanan test durumları (profil)', els.filter(x => x.kind === 'TestCase' && (x.profiles || []).includes(id)));
  add('Önleyici olduğu arıza modları', els.filter(x => x.kind === 'FailureMode' && (x.reqs || []).includes(id)));
  add('İlgili riskler', els.filter(x => x.kind === 'Risk' && (x.links || []).includes(id)));
  add('İlgili uygunsuzluklar (NCR)', els.filter(x => x.kind === 'NCR' && (x.test === id || x.article === id || x.fm === id || x.retest === id || (x.reqs || []).includes(id))));
  add('Numunenin kullanıldığı testler', els.filter(x => x.kind === 'TestCase' && (x.articles || []).includes(id)));
  add('Bu bloğun test numuneleri', els.filter(x => x.kind === 'TestArticle' && x.block === id));
  add('Uygulanan stereotip', e.kind === 'Stereotype' ? els.filter(x => Array.isArray(x.st) && x.st.includes(id)) : []);
  return G;
}
function whereUsedHTML(el){
  const G = whereUsed(el.id), n = G.reduce((a, g) => a + g[1].length, 0);
  let h = `<details class="wu"${ST.wuOpen ? ' open' : ''}><summary data-wu="1">Kullanıldığı yerler (${n})</summary>`;
  if(!n) h += '<div class="muted" style="font-size:12px;padding:4px 0">Bu eleman başka bir yerde kullanılmıyor.</div>';
  G.forEach(([t, L]) => { h += `<div class="wug">${esc(t)} (${L.length})</div>` + L.slice(0, 60).map(x => x._rel ? `<div class="li"><span class="muted">${x.out ? '→' : '←'} ${esc(KIND[x._rel.kind].tr)}</span> <a class="lnk" data-goto="${x.other.id}">${esc(rowLabel(x.other))}</a></div>` : x.kind === 'Diagram' ? `<div class="li"><a class="lnk" data-opend="${x.id}">▣ ${esc(x.name)}</a> <span class="muted">${esc(x.dtype)}</span></div>` : `<div class="li"><a class="lnk" data-goto="${x.id}">${esc(rowLabel(x))}</a> <span class="muted">${esc(KIND[x.kind].tr)} · ${esc(nm(E(x.owner) || {}))}</span></div>`).join('') + (L.length > 60 ? `<div class="muted">… ${L.length - 60} daha</div>` : ''); });
  return h + '</details>';
}
/* ---- durum geçiş tablosu ---- */
let STV = {sm:null, mode:'table'};
function stmList(){ return Object.values(M.els).filter(e => e.kind === 'StateMachine').sort(sortEls); }
function stmStates(sm){ const out = []; const rec = id => kidsOf(id).forEach(c => { if(['State', 'Initial', 'Final', 'Choice', 'Junction', 'History'].includes(c.kind)) out.push(c); if(['State', 'Region'].includes(c.kind)) rec(c.id); }); rec(sm.id); return out; }
function stmName(s){ return s.kind === 'State' ? s.name || 'Durum' : '(' + KIND[s.kind].tr + ')'; }
function sttHTML(){
  const L = stmList(); if(!L.length) return '<div class="vempty">Modelde durum makinesi yok.</div>';
  if(!STV.sm || !E(STV.sm)) STV.sm = L[0].id;
  const sm = E(STV.sm), ss = stmStates(sm), ids = new Set(ss.map(s => s.id));
  const tr = Object.values(M.els).filter(r => r.kind === 'Transition' && ids.has(r.src)).sort((a, b) => ss.indexOf(E(a.src)) - ss.indexOf(E(b.src)) || COLL.compare(a.name || '', b.name || ''));
  const out = new Set(tr.map(t => t.src)), inn = new Set(tr.map(t => t.tgt));
  const unreach = ss.filter(s => s.kind === 'State' && !inn.has(s.id) && !kidsOf(s.owner).some(c => c.kind === 'Initial' && tr.some(t => t.src === c.id && t.tgt === s.id)));
  const dead = ss.filter(s => s.kind === 'State' && !out.has(s.id) && !kidsOf(s.id).some(c => c.kind === 'State' || c.kind === 'Region'));
  const evs = [...new Set(tr.map(t => t.name || '(tamamlanma)'))];
  const nd = new Map(); tr.forEach(t => { const k = t.src + '|' + (t.name || ''); nd.set(k, (nd.get(k) || 0) + 1); });
  const nondet = tr.filter(t => nd.get(t.src + '|' + (t.name || '')) > 1 && !t.guard);
  let h = `<div class="cards"><div class="card"><div class="cv">${ss.filter(s => s.kind === 'State').length}</div><div class="ct">Durum</div></div><div class="card"><div class="cv">${tr.length}</div><div class="ct">Geçiş</div></div><div class="card"><div class="cv">${evs.length}</div><div class="ct">Olay</div></div>
    <div class="card"><div class="cv" style="color:${unreach.length ? '#d18a00' : '#2e9e6a'}">${unreach.length}</div><div class="ct">Ulaşılamayan durum</div><div class="cs">${esc(unreach.map(stmName).join(', '))}</div></div><div class="card"><div class="cv" style="color:${dead.length ? '#d18a00' : '#2e9e6a'}">${dead.length}</div><div class="ct">Çıkışı olmayan durum</div><div class="cs">${esc(dead.map(stmName).join(', '))}</div></div>
    <div class="card"><div class="cv" style="color:${nondet.length ? '#c0392b' : '#2e9e6a'}">${nondet.length}</div><div class="ct">Belirsiz geçiş</div><div class="cs">aynı durum + olay, koşulsuz</div></div></div>`;
  if(STV.mode === 'table'){
    h += `<table class="rt fmt"><thead><tr><th class="rn">#</th><th>Kaynak durum</th><th>Olay (tetik)</th><th>Koşul [guard]</th><th>Etki / effect</th><th>Hedef durum</th><th>entry / do / exit (hedef)</th></tr></thead><tbody>`;
    tr.forEach((t, i) => { const s = E(t.src), g = E(t.tgt); h += `<tr data-row="${t.id}" class="${ST.tsel === t.id ? 'sel' : ''}${nondet.includes(t) ? ' warnrow' : ''}"><td class="rn">${i + 1}</td><td><a class="lnk" data-ago="${s.id}">${esc(stmName(s))}</a><div class="muted" style="font-size:10.5px">${esc(nm(E(s.owner) || {}))}</div></td><td>${ce(t, 'name', 'rid')}</td><td>${ce(t, 'guard')}</td><td>${ce(t, 'effect')}</td><td>${g ? `<a class="lnk" data-ago="${g.id}">${esc(stmName(g))}</a>` : '?'}</td><td class="muted" style="font-size:11.5px">${g && g.kind === 'State' ? esc([g.entry && 'entry/' + g.entry, g.doAct && 'do/' + g.doAct, g.exit && 'exit/' + g.exit].filter(Boolean).join(' · ')) : ''}</td></tr>`; });
    h += '</tbody></table>';
  } else {
    const st = ss.filter(s => s.kind !== 'Final');
    h += `<div style="overflow:auto"><table class="rt"><thead><tr><th>Durum \\ Olay</th>${evs.map(v => `<th>${esc(v)}</th>`).join('')}</tr></thead><tbody>${st.map(s => `<tr><td><b>${esc(stmName(s))}</b></td>${evs.map(v => { const L2 = tr.filter(t => t.src === s.id && (t.name || '(tamamlanma)') === v); return `<td${L2.length > 1 && L2.some(t => !t.guard) ? ' class="bad"' : ''}>${L2.map(t => `<div>→ <a class="lnk" data-ago="${t.tgt}">${esc(stmName(E(t.tgt) || {}))}</a>${t.guard ? ` <span class="muted">[${esc(t.guard)}]</span>` : ''}${t.effect ? ` <span class="muted">/ ${esc(t.effect)}</span>` : ''}</div>`).join('') || '<span class="muted">—</span>'}</td>`; }).join('')}</tr>`).join('')}</tbody></table></div>`;
  }
  return h + `<div class="vfoot">Olay, koşul ve etki hücrelerine tıklayıp yazın; değişiklik diyagrama yansır. Satırı seçince geçiş Özellikler panelinde açılır.</div>`;
}
function sttBar(){ return `<label>Durum makinesi <select data-stv="sm">${stmList().map(s => `<option value="${s.id}"${STV.sm === s.id ? ' selected' : ''}>${esc(pathOf(s.id))}</option>`).join('')}</select></label><label>Görünüm <select data-stv="mode"><option value="table"${STV.mode === 'table' ? ' selected' : ''}>Geçiş listesi</option><option value="matrix"${STV.mode === 'matrix' ? ' selected' : ''}>Durum × olay matrisi</option></select></label><span class="vsep"></span><button class="vb" data-stva="xl">⤒ Excel'e aktar</button>`; }
function sttXlsx(){
  const sm = E(STV.sm); if(!sm) return; const ss = stmStates(sm), ids = new Set(ss.map(s => s.id));
  const tr = Object.values(M.els).filter(r => r.kind === 'Transition' && ids.has(r.src));
  const rows = [['Kaynak durum', 'Olay', 'Koşul', 'Etki', 'Hedef durum'].map(v => ({v, s:1}))]; tr.forEach(t => rows.push([stmName(E(t.src)), t.name || '', t.guard || '', t.effect || '', stmName(E(t.tgt) || {})]));
  download(buildXlsx([{name:'Geçiş Tablosu', rows, widths:[24, 20, 20, 24, 24], header:true, freeze:[0, 1], filter:1}]), fileSafe(sm.name) + ' - Durum Geçiş Tablosu.xlsx');
}
Object.assign(VIEWS, {'@stt':{tr:'Durum Geçiş Tablosu', ic:'STT', note:'Seçilen durum makinesinin geçişleri tablo veya durum × olay matrisi olarak.<br><br>Ulaşılamayan, çıkışı olmayan durumlar ve aynı olayda koşulsuz birden çok geçiş (belirsizlik) üstte gösterilir.', render:sttHTML, bar:sttBar, status:() => STV.sm && E(STV.sm) ? E(STV.sm).name : ''}});
/* ---- komut paleti (Ctrl+K) ---- */
function paletteItems(){
  const it = [], A = (t, cat, f, k) => it.push({t, cat, f, k:k || ''});
  [['Yeni model', 'new'], ['Aç…', 'open', 'Ctrl+O'], ['Kaydet', 'save', 'Ctrl+S'], ['Farklı kaydet…', 'saveAs', 'Ctrl+Shift+S'], ['HTML olarak kaydet (paylaşım)', 'saveHtml'], ['Geri al', 'undo', 'Ctrl+Z'], ['Yinele', 'redo', 'Ctrl+Y'], ['Ekrana sığdır', 'fit'], ['Izgara aç/kapat', 'grid'], ['Mini harita aç/kapat', 'mini'], ['Biçim boyacısı', 'painter'], ['PNG olarak kaydet', 'png'], ['SVG olarak kaydet', 'svg'], ['Panoya resim kopyala', 'copy'], ['İkon ata…', 'iconMenu'], ['Tümünü aç (ağaç)', 'expandAll'], ['Tümünü kapat (ağaç)', 'collapseAll'], ['Yardım', 'help'], ['Karanlık / açık tema', 'theme']].forEach(([t, a, k]) => A(t, 'Komut', () => ACT[a](), k));
  const fromMenu = (items, cat) => { let h = cat; (items || []).forEach(x => { if(x && x.h) h = cat + ' › ' + x.h; else if(x && x.t && x.f && !x.dis) A(x.t.replace(/…$/, '…'), h, x.f, x.k); }); };
  try { fromMenu(reqMenuItems(), 'Gereksinimler'); } catch(e){ appErr('080:70', e); }
  try { fromMenu(analysisMenuItems(), 'Analiz'); } catch(e){ appErr('080:71', e); }
  try { fromMenu(toolsMenuItems(), 'Araçlar'); } catch(e){ appErr('080:72', e); }
  try { if(cur()) fromMenu(layoutMenuItems(), 'Düzen'); } catch(e){ appErr('080:73', e); }
  Object.entries(VIEWS).forEach(([id, v]) => A(v.tr, 'Görünüm', () => openD(id)));
  Object.values(M.els).filter(e => e.kind === 'Diagram').sort(sortEls).forEach(d => A(d.name, 'Diyagram · ' + d.dtype, () => openD(d.id)));
  return it;
}
function paletteElems(q){
  if(q.length < 2) return [];
  const out = []; for(const k in M.els){ const e = M.els[k]; if(e.kind === 'Diagram' || (KIND[e.kind] && KIND[e.kind].rel && !e.name)) continue; const s = asciiTr([e.reqId, e.name, e.icdId, e.riskId, e.procNo].filter(Boolean).join(' ')); if(!s) continue; const i = s.indexOf(q); if(i >= 0) out.push({e, sc:(i === 0 ? 0 : 1) + s.length / 200}); if(out.length > 400) break; }
  return out.sort((a, b) => a.sc - b.sc).slice(0, 40).map(({e}) => ({t:rowLabel(e), cat:KIND[e.kind].tr + ' · ' + nm(E(e.owner) || {}), f:() => { revealInTree(e.id); ST.tsel = e.id; ST.focus = 'tree'; if(e.kind === 'TestProfile' || e.kind === 'FailureMode' || e.kind === 'Risk') goTargets(e, 200, 200); renderProps(); }}));
}
function fuzzy(q, s){ if(!q) return 1; s = asciiTr(s); const i = s.indexOf(q); if(i >= 0) return i === 0 ? 3 : 2; let j = 0; for(const ch of s){ if(ch === q[j]) j++; if(j === q.length) return 1; } return 0; }
function commandPalette(){
  const box = $('#modalBox'); box.style.width = 'min(640px, 94vw)'; box.style.maxWidth = 'none';
  box.innerHTML = `<input id="cpq" class="cpq" placeholder="Komut, görünüm, diyagram veya eleman ara… (↑↓ seç, Enter çalıştır, Esc kapat)" autocomplete="off"><div id="cpl" class="cpl"></div>`;
  $('#modal').style.display = 'flex'; box.classList.add('cpbox');
  const base = paletteItems(); let L = [], si = 0;
  const close = () => { $('#modal').style.display = 'none'; box.style.width = ''; box.style.maxWidth = ''; box.classList.remove('cpbox'); box.onclick = null; };
  const draw = () => {
    const q = asciiTr($('#cpq').value);
    L = base.map(x => ({x, s:Math.max(fuzzy(q, x.t), fuzzy(q, x.cat) ? 0.5 : 0)})).filter(o => o.s > 0).sort((a, b) => b.s - a.s).map(o => o.x).slice(0, 60).concat(paletteElems(q));
    si = Math.min(si, Math.max(0, L.length - 1));
    $('#cpl').innerHTML = L.length ? L.map((x, i) => `<div class="cpi${i === si ? ' on' : ''}" data-cpi="${i}"><span>${esc(x.t)}</span><span class="muted">${esc(x.cat)}${x.k ? ' · ' + esc(x.k) : ''}</span></div>`).join('') : '<div class="muted" style="padding:10px">Sonuç yok</div>';
    const on = $('#cpl .cpi.on'); if(on) on.scrollIntoView({block:'nearest'});
  };
  const run0 = i => { const x = L[i]; if(!x) return; close(); setTimeout(() => { try { x.f(); } catch(e){ toast('Çalıştırılamadı: ' + e.message); } }, 0); };
  $('#cpq').oninput = () => { si = 0; draw(); };
  $('#cpq').onkeydown = ev => { ev.stopPropagation(); if(ev.key === 'ArrowDown'){ ev.preventDefault(); si = Math.min(L.length - 1, si + 1); draw(); } else if(ev.key === 'ArrowUp'){ ev.preventDefault(); si = Math.max(0, si - 1); draw(); } else if(ev.key === 'Enter'){ ev.preventDefault(); run0(si); } else if(ev.key === 'Escape') close(); };
  box.onclick = ev => { const c = ev.target.closest('[data-cpi]'); if(c) run0(+c.dataset.cpi); };
  draw(); $('#cpq').focus();
}
/* ---- tema ---- */
function applyTheme(dark){ document.body.classList.toggle('dark', !!dark); const b = document.querySelector('[data-act="theme"]'); if(b){ if(typeof uiIc === 'function'){ b.innerHTML = uiIc(dark ? 'sun' : 'moon', 16); b.classList.add('ico'); } else b.textContent = dark ? '☀' : '☾'; } }
ACT.theme = () => { const d = !document.body.classList.contains('dark'); applyTheme(d); try { localStorage.setItem('sysml-theme', d ? 'dark' : 'light'); } catch(e){} toast(d ? 'Karanlık tema (diyagram alanı açık kalır)' : 'Açık tema'); };
ACT.palette = commandPalette;
(function(){
  try { applyTheme(localStorage.getItem('sysml-theme') === 'dark'); } catch(e){}
  document.addEventListener('keydown', ev => { if((ev.ctrlKey || ev.metaKey) && (ev.key === 'k' || ev.key === 'K')){ ev.preventDefault(); ev.stopPropagation(); commandPalette(); } }, true);
  const V = $('#view');
  V.addEventListener('change', ev => { if(ST.cur !== '@stt') return; const t = ev.target; if(t.dataset.stv){ STV[t.dataset.stv] = t.value; renderViewBar(); renderView(); renderStatus(); } });
  V.addEventListener('click', ev => { if(ST.cur !== '@stt') return; const t = ev.target; let b; if((b = t.closest('[data-stva]'))){ sttXlsx(); return; } if((b = t.closest('[data-ago]')) && b.dataset.ago){ revealInTree(b.dataset.ago); ST.tsel = b.dataset.ago; renderProps(); } });
  $('#props').addEventListener('click', ev => { const s = ev.target.closest('[data-wu]'); if(s){ setTimeout(() => { const d = s.parentElement; ST.wuOpen = d.open; }, 0); } const o = ev.target.closest('[data-opend]'); if(o) openD(o.dataset.opend); const st = ev.target.closest('[data-stmtab]'); if(st){ STV.sm = st.dataset.stmtab; openD('@stt'); } });
})();

