/* ================= v1.47: EKSİK KATEGORİ ANALİZİ, ÇOKLU İSTER BÖLME, ARES KÖPRÜSÜ ================= */
/* ---------- gereksinim kategorileri (IEEE 29148 / INCOSE) ---------- */
const REQ_CATS = [
  {id:'fonk', tr:'Fonksiyon', re:null, tpl:b => `${b}, [işlev adı] işlevini yerine getirecektir.`},
  {id:'perf', tr:'Performans', re:/\b(hız|süre|zaman|doğruluk|hassasiyet|çözünürlük|menzil|kapasite|verim|gecikme|frekans|bant|en az|en fazla|en geç|içinde)\b/i, tpl:b => `${b} [performans parametresi] değeri en fazla TBD [birim] olacaktır.`},
  {id:'ara', tr:'Arayüz', re:/arayüz|bağlantı|konnektör|protokol|rs-?4\d\d|rs-?232|mil-std-1553|ethernet|can bus|\bif-\d|veri yolu|besleme hattı/i, tpl:b => `${b}, [karşı birim] ile TBD arayüzü üzerinden [öğe] alışverişi yapacaktır.`},
  {id:'cevre', tr:'Çevre', re:/titreşim|şok|sıcaklık|nem|tuz|toz|yağmur|irtifa|basınç|mil-std-810|çevresel|termal|°c|grms|akustik/i, tpl:b => `${b}, MIL-STD-810H Yöntem TBD koşullarına maruz kaldığında işlevsel performansını koruyacaktır.`},
  {id:'emc', tr:'EMC', re:/\bemc\b|\bemi\b|elektromanyetik|mil-std-461|mil-std-464|iletim yoluyla|ışınım|yıldırım|esd/i, tpl:b => `${b}, MIL-STD-461G TBD gerekliliklerini karşılayacaktır.`},
  {id:'guv', tr:'Güvenilirlik', re:/mtbf|güvenilirlik|arıza|ömür|yedek|kullanılabilirlik|dayanıklılık|fmea|önlemini/i, tpl:b => `${b} MTBF değeri en az TBD saat olacaktır.`},
  {id:'bakim', tr:'Bakım kolaylığı', re:/bakım|mttr|değiştirilebilir|\blru\b|erişileb|onarım|kalibrasyon|test noktası/i, tpl:b => `${b} sahada en fazla TBD dk içinde değiştirilebilecektir.`},
  {id:'emn', tr:'Emniyet / güvenlik', re:/emniyet|güvenlik|tehlike|kilit|siber|yetki|şifre|kimlik doğrulama|kazara|patlayıcı/i, tpl:b => `${b}, [tehlike] durumunda TBD emniyet önlemini sağlayacaktır.`},
  {id:'fiz', tr:'Fiziksel', re:/kütle|ağırlık|boyut|hacim|renk|kaplama|ağırlık merkezi|zarf|montaj|malzeme/i, tpl:b => `${b} kütle değeri en fazla TBD kg olacaktır.`}
];
const RULE_CAT = {arayuz:'ara', butce:'fiz', cevre:'cevre', fonk:'fonk', durum:'fonk', kisit:'perf', fmea:'guv'};
function reqCats(r){
  const out = new Set(); if(r.category) String(r.category).split(/[,;]/).map(x => x.trim()).forEach(c => { const k = REQ_CATS.find(x => x.id === c || x.tr === c); if(k) out.add(k.id); });
  if(r.derivedFrom && RULE_CAT[r.derivedFrom.rule]) out.add(RULE_CAT[r.derivedFrom.rule]);
  if(r.budgetAlloc && /güç|power|maliyet/i.test(r.budgetAlloc.prop)) { out.delete('fiz'); out.add('perf'); }
  if(!out.size){ const t = String(r.text || ''); REQ_CATS.forEach(c => { if(c.re && c.re.test(t)) out.add(c.id); }); if(out.has('perf') && out.size > 1) out.delete('perf'); if(!out.size) out.add('fonk'); }
  return out;
}
/* gereksinim → blok: Satisfy (blok veya part tipi), alt sistem adı, sistem seviyesi → en üst blok */
function reqBlocks(r, sat, byName, tb){
  const s = new Set(); sat.filter(x => x.tgt === r.id).forEach(x => { const e = E(x.src); if(!e) return; if(e.kind === 'Block') s.add(e.id); else if(e.kind === 'Part' && e.type && E(e.type)) s.add(e.type); });
  if(!s.size && reqLevel(r) === 'Alt Sistem' && r.subsys && byName.has(String(r.subsys).trim())) s.add(byName.get(String(r.subsys).trim()));
  if(!s.size && reqLevel(r) === 'Sistem' && tb) s.add(tb.id);
  return s;
}
function coverData(){
  const tb = topBlock(), rows = [];
  if(tb){ rows.push(tb); [...new Map(kidsOf(tb.id).filter(p => p.kind === 'Part' && p.type && E(p.type) && E(p.type).kind === 'Block').map(p => [p.type, E(p.type)])).values()].sort(sortEls).forEach(b => rows.push(b)); }
  const byName = new Map(Object.values(M.els).filter(b => b.kind === 'Block').map(b => [b.name, b.id])), sat = relIdx().Satisfy || [];
  const cell = new Map(); rows.forEach(b => REQ_CATS.forEach(c => cell.set(b.id + '|' + c.id, [])));
  allReqs().filter(r => activeReq(r) && reqStatus(r) !== 'İptal').forEach(r => { const cs = reqCats(r); reqBlocks(r, sat, byName, tb).forEach(bid => cs.forEach(c => { const k = bid + '|' + c; if(cell.has(k)) cell.get(k).push(r); })); });
  return {rows, cell};
}
let RCV = {skip:{}};
function coverHTML(){
  const D = coverData(); if(!D.rows.length) return '<div class="vempty">Part\'ları olan bir sistem bloğu bulunamadı.<br><br><span class="muted">Kapsama haritası en üst sistem bloğu ve onun part tipleri için çizilir.</span></div>';
  const skip = RCV.skip, gaps = []; D.rows.forEach(b => REQ_CATS.forEach(c => { if(!D.cell.get(b.id + '|' + c.id).length && !skip[b.id + '|' + c.id]) gaps.push([b, c]); }));
  const mx = Math.max(1, ...[...D.cell.values()].map(a => a.length));
  let h = `<div class="cards"><div class="card"><div class="cv">${D.rows.length}</div><div class="ct">Blok</div></div><div class="card"><div class="cv">${REQ_CATS.length}</div><div class="ct">Kategori</div></div><div class="card"><div class="cv" style="color:${gaps.length ? '#c0392b' : '#2e9e6a'}">${gaps.length}</div><div class="ct">Boş hücre (eksik kategori)</div></div></div>`;
  h += `<div class="muted" style="margin:0 0 8px">Hücre: o bloğa bağlı (Satisfy, alt sistem adı veya sistem seviyesi) ve o kategorideki gereksinim sayısı. Kategori, türetme kuralından, gereksinimin "Kategori" alanından veya metindeki anahtar sözcüklerden belirlenir. <b>Boş hücreye tıklayın:</b> şablon gereksinim oluşturulur veya hücre "uygulanamaz" işaretlenir.</div>`;
  h += `<div style="overflow-x:auto"><table class="rt rcv"><thead><tr><th>Blok</th>${REQ_CATS.map(c => `<th>${esc(c.tr)}</th>`).join('')}<th>Toplam</th></tr></thead><tbody>${D.rows.map((b, i) => { const tot = new Set(); REQ_CATS.forEach(c => D.cell.get(b.id + '|' + c.id).forEach(r => tot.add(r.id))); return `<tr><td class="noi18n" style="white-space:nowrap">${i ? '' : '<b>'}${esc(b.name)}${i ? '' : '</b> <span class="muted">(sistem)</span>'}</td>${REQ_CATS.map(c => { const k = b.id + '|' + c.id, L = D.cell.get(k), na = skip[k]; const a = L.length / mx; return `<td class="rcc${L.length ? '' : na ? ' na' : ' gap'}" data-rcc="${k}" title="${esc(L.map(r => (r.reqId || '') + ' ' + (r.text || '').slice(0, 80)).join('\n') || (na ? 'Uygulanamaz' : 'Gereksinim yok — tıklayın'))}"${L.length ? ` style="background:rgba(31,111,209,${(0.12 + 0.55 * a).toFixed(2)})"` : ''}>${L.length || (na ? 'u/d' : '—')}</td>`; }).join('')}<td><b>${tot.size}</b></td></tr>`; }).join('')}</tbody></table></div>`;
  return h;
}
function coverXlsx(){
  const D = coverData(), rows = [['Blok'].concat(REQ_CATS.map(c => c.tr)).map(v => ({v, s:1}))];
  D.rows.forEach(b => rows.push([b.name].concat(REQ_CATS.map(c => { const n = D.cell.get(b.id + '|' + c.id).length; return n || (RCV.skip[b.id + '|' + c.id] ? 'u/d' : 0); }))));
  const det = [['Blok', 'Kategori', 'Gereksinim', 'Metin'].map(v => ({v, s:1}))]; D.rows.forEach(b => REQ_CATS.forEach(c => D.cell.get(b.id + '|' + c.id).forEach(r => det.push([b.name, c.tr, r.reqId || '', r.text || '']))));
  download(buildXlsx([{name:'Kapsama haritası', rows, widths:[26].concat(REQ_CATS.map(() => 14)), header:true}, {name:'Ayrıntı', rows:det, widths:[24, 18, 12, 80], header:true}]), fileSafe(E(M.rootId).name) + ' - Gereksinim Kapsama Haritası.xlsx');
}
function coverCell(k, x, y){
  const [bid, cid] = k.split('|'), b = E(bid), c = REQ_CATS.find(z => z.id === cid); if(!b || !c) return;
  const tb = topBlock(), sys = tb && tb.id === bid, subj = sys ? 'Sistem' : b.name, L = coverData().cell.get(k) || [];
  const items = [{h:b.name + ' · ' + c.tr}];
  L.slice(0, 8).forEach(r => items.push({t:(r.reqId || '') + ' ' + (r.text || '').slice(0, 60), f:() => showElement(r.id)}));
  if(L.length) items.push('-');
  items.push({t:'Şablon gereksinim oluştur', f:() => { snap(); const lv = sys ? 'Sistem' : 'Alt Sistem'; const r = mk('Requirement', reqPkgFor(lv, sys ? '' : b.name), {level:lv, subsys:sys ? '' : b.name, name:c.tr + ' — ' + b.name, text:c.tpl(subj), category:c.id, status:'Taslak', verif:c.id === 'fiz' ? 'Muayene' : c.id === 'guv' ? 'Analiz' : 'Test'}); addRel('Satisfy', b.id, r.id); afterChange(); toast((r.reqId || '') + ' oluşturuldu — TBD değerlerini doldurun'); showElement(r.id); }});
  items.push({t:RCV.skip[k] ? 'Uygulanamaz işaretini kaldır' : 'Uygulanamaz olarak işaretle', f:() => { M.coverSkip = M.coverSkip || {}; if(RCV.skip[k]) delete M.coverSkip[k]; else M.coverSkip[k] = 1; RCV.skip = M.coverSkip; renderView(); }});
  menu(x, y, items);
}
VIEWS['@reqcover'] = {tr:'Gereksinim Kapsama Haritası', ic:'Kh', note:'Sistem bloğu ve alt sistemleri için <b>kategori</b> (fonksiyon, performans, arayüz, çevre, EMC, güvenilirlik, bakım kolaylığı, emniyet/güvenlik, fiziksel) başına gereksinim sayısı. Boş hücreler eksik gereksinim alanlarını gösterir; tıklayıp şablon gereksinim oluşturabilir veya "uygulanamaz" işaretleyebilirsiniz.', render:() => { RCV.skip = M.coverSkip || {}; return coverHTML(); }, bar:() => `<button class="vb" data-rca="xl">⤒ Excel</button><button class="vb" data-rca="derive">Türetme sihirbazı</button>`, status:() => { const D = coverData(); let g = 0; D.rows.forEach(b => REQ_CATS.forEach(c => { if(!D.cell.get(b.id + '|' + c.id).length && !(M.coverSkip || {})[b.id + '|' + c.id]) g++; })); return g + ' boş hücre'; }};
(() => { const V = $('#view'); V.addEventListener('click', ev => { if(ST.cur !== '@reqcover') return; const c = ev.target.closest('[data-rcc]'); if(c){ coverCell(c.dataset.rcc, ev.clientX, ev.clientY); return; } const b = ev.target.closest('[data-rca]'); if(b){ if(b.dataset.rca === 'xl') coverXlsx(); if(b.dataset.rca === 'derive') deriveOpen(); } }); })();
/* ---------- çoklu ister bölme ---------- */
const MODAL_W = /^[a-zçğıöşüâîû]{4,}(?:acak|ecek)(?:t[ıi]r)?$|^[a-zçğıöşüâîû]+m[ae]l[ıi](?:d[ıi]r)?$/;
const addCop = w => /acak$/.test(w) ? w + 'tır' : /ecek$/.test(w) ? w + 'tir' : /malı$/.test(w) ? w + 'dır' : /meli$/.test(w) ? w + 'dir' : w;
const SUBJ2 = /^(birimi|sistemi|modülü|ünitesi|bilgisayarı|yazılımı|kartı|alt sistemi|kutusu|paneli|cihazı|aracı|platformu|sensörü|motoru)$/i;
function splitReqText(t){
  const out = [], sents = String(t || '').replace(/\s+/g, ' ').trim().split(/(?<=[.;!?])\s+(?=[A-ZÇĞİÖŞÜ0-9"(])/);
  sents.forEach(sn => {
    const tok = sn.split(/(\s+)/), words = sn.split(/\s+/);
    let subj = '', comma = false; const cm = /^([^,]{2,60}),\s/.exec(sn);
    if(cm && !MODAL_W.test(cm[1].split(/\s+/).pop().toLocaleLowerCase('tr'))){ subj = cm[1]; comma = true; } else { subj = words[0] + (words[1] && SUBJ2.test(words[1].replace(/[^\wçğıöşü]/gi, '')) ? ' ' + words[1] : ''); }
    /* sınırlar: zorunluluk fiilinden sonra gelen ", " veya " ve / veya / ayrıca " */
    const parts = []; let cur = '';
    const re = /([A-Za-zÇĞİÖŞÜçğıöşüâîû]+)(\s*[,;]\s*|\s+)(ve|veya|ayrıca|hem de)?\s+/g; let last = 0, m;
    while((m = re.exec(sn))){
      const w = m[1].toLocaleLowerCase('tr'); if(!MODAL_W.test(w)) continue;
      const sep = m[2], conj = m[3]; if(!conj && !/[,;]/.test(sep)) continue;
      parts.push(sn.slice(last, m.index) + addCop(m[1])); last = m.index + m[0].length;
    }
    if(!parts.length){ out.push(sn.trim()); return; }
    parts.push(sn.slice(last));
    parts.forEach((p, i) => {
      p = p.trim().replace(/[.;,\s]+$/, ''); if(!p) return;
      if(i > 0){ const low = p.toLocaleLowerCase('tr'), sl = subj.toLocaleLowerCase('tr'); if(!low.startsWith(sl)) p = subj + (comma ? ', ' : ' ') + p.charAt(0).toLocaleLowerCase('tr') + p.slice(1); }
      out.push(p.charAt(0).toLocaleUpperCase('tr') + p.slice(1) + '.');
    });
  });
  return out.filter(Boolean);
}
const isMulti = r => modalHits(String(r.text || ''), reqStyle()) > 1 || splitReqText(r.text).length > 1;
const SPLIT_REL = [['Satisfy', 'tgt'], ['Verify', 'tgt'], ['Refine', 'tgt'], ['DeriveReqt', 'src'], ['Trace', 'tgt'], ['Trace', 'src'], ['Allocate', 'src'], ['Allocate', 'tgt']];
function splitApply(r, parts, copyRels){
  if(!r || parts.length < 2) return [];
  snap(); const idx = relIdx(), made = [];
  r.text = parts[0]; if(reqStatus(r) === 'Onaylı') r.status = 'Değişiklikte';
  parts.slice(1).forEach((tx, i) => {
    const n = mk('Requirement', r.owner, {level:r.level, subsys:r.subsys || '', name:(r.name || r.reqId || '') + ' (' + (i + 2) + ')', text:tx, verif:r.verif || '', status:'Taslak', attrs:Object.assign({}, r.attrs || {}), splitFrom:r.id});
    if(r.vcond) n.vcond = r.vcond; if(r.category) n.category = r.category;
    if(copyRels) SPLIT_REL.forEach(([k, side]) => (idx[k] || []).filter(x => x[side] === r.id).forEach(x => addRel(k, side === 'src' ? n.id : x.src, side === 'tgt' ? n.id : x.tgt)));
    made.push(n);
  });
  afterChange(); return made;
}
function splitDialog(rid){
  const r = E(rid); if(!r) return; let parts = splitReqText(r.text); if(parts.length < 2) parts = [r.text || '', ''];
  const box = $('#modalBox'); box.style.width = 'min(820px, 96vw)'; box.style.maxWidth = 'none';
  const draw = () => {
    box.innerHTML = `<h2>İsteri böl — <span class="noi18n">${esc(r.reqId || '')}</span></h2><div class="muted" style="margin:-4px 0 8px">Özgün metin:</div><div class="noi18n" style="padding:6px 8px;border:1px solid #c8d0db;border-radius:4px;margin-bottom:10px">${esc(r.text || '')}</div>
      <div class="muted" style="margin-bottom:6px">Parçalar (ilki özgün gereksinimde kalır; diğerleri aynı seviye, alt sistem ve doğrulama yöntemiyle yeni gereksinim olur):</div>
      ${parts.map((p, i) => `<div style="display:flex;align-items:flex-start;gap:6px;margin:0 0 6px"><b style="min-width:22px;padding-top:4px">${i + 1}.</b><textarea class="noi18n" data-spx="${i}" rows="2" style="flex:1;min-width:0;font:inherit;padding:4px 6px;border:1px solid #c8d0db;border-radius:4px;resize:vertical">${esc(p)}</textarea><span>${p.trim() ? qualityBadge(reqQuality({text:p, reqId:'\u0000'})) : ''}</span>${parts.length > 2 ? `<button class="vb" data-ic="0" data-spdel="${i}">✕</button>` : ''}</div>`).join('')}
      <div class="li"><button class="vb" data-spadd="1">+ Parça</button></div>
      <label class="vchk" style="display:block;margin-top:8px"><input type="checkbox" id="spRel" checked> İlişkileri yeni gereksinimlere kopyala (karşılayan blok, doğrulayan test, üst gereksinim, Refine / Trace / Allocate)</label>
      <p style="text-align:right;margin:12px 0 0"><button class="pbtn" id="spC">Vazgeç</button> <button class="pbtn pri" id="spK">Böl (${parts.filter(p => p.trim()).length} gereksinim)</button></p>`;
  };
  draw(); $('#modal').style.display = 'flex';
  box.oninput = ev => { const t = ev.target; if(t.dataset.spx != null) parts[+t.dataset.spx] = t.value; };
  box.onclick = ev => { const t = ev.target.closest('button') || ev.target;
    if(t.id === 'spC'){ $('#modal').style.display = 'none'; box.onclick = box.oninput = null; }
    if(t.dataset && t.dataset.spadd){ parts.push(''); draw(); }
    if(t.dataset && t.dataset.spdel != null){ parts.splice(+t.dataset.spdel, 1); draw(); }
    if(t.id === 'spK'){ const ps = parts.map(p => p.trim()).filter(Boolean); if(ps.length < 2) return toast('En az iki parça gerekli'); const n = splitApply(r, ps, $('#spRel').checked); $('#modal').style.display = 'none'; box.onclick = box.oninput = null; toast((r.reqId || '') + ' bölündü: ' + n.map(x => x.reqId).join(', ') + ' oluşturuldu'); }
  };
}
function multiListDialog(){
  const L = allReqs().filter(r => activeReq(r) && reqStatus(r) !== 'İptal' && isMulti(r)), box = $('#modalBox'); box.style.width = 'min(860px, 96vw)'; box.style.maxWidth = 'none';
  box.innerHTML = `<h2>Birden fazla ister içeren gereksinimler (${L.length})</h2>${L.length ? `<table class="rt fmt"><thead><tr><th>ID</th><th>Metin</th><th>Önerilen parça</th><th></th></tr></thead><tbody>${L.map(r => `<tr><td class="noi18n"><b>${esc(r.reqId || '')}</b></td><td class="noi18n">${esc(r.text || '')}</td><td>${splitReqText(r.text).length}</td><td><button class="vb" data-spl="${r.id}">Böl…</button></td></tr>`).join('')}</tbody></table>` : '<div class="vempty">Birden fazla ister içeren gereksinim bulunamadı.</div>'}<p style="text-align:right;margin:12px 0 0"><button class="pbtn pri" id="mlC">Kapat</button></p>`;
  $('#modal').style.display = 'flex';
  box.onclick = ev => { const b = ev.target.closest('button'); if(!b) return; if(b.id === 'mlC'){ $('#modal').style.display = 'none'; box.onclick = null; } if(b.dataset.spl) splitDialog(b.dataset.spl); };
}
HOOKS.props.push((t, P) => { const el = t.el; if(!el || el.kind !== 'Requirement' || (typeof bulkTargets === 'function' && bulkTargets()) || !isMulti(el)) return; P.insertAdjacentHTML('beforeend', `<div class="pf"><label>Çoklu ister</label><div><button class="vb" data-splitreq="${el.id}">İsteri böl…</button> <span class="muted" style="font-size:11px">${splitReqText(el.text).length} parça önerilir</span></div></div>`); });
document.addEventListener('click', ev => { const b = ev.target.closest && ev.target.closest('[data-splitreq]'); if(b) splitDialog(b.dataset.splitreq); });
/* ---------- ARES köprüsü (yerel LLM ile türetme) ---------- */
const ARES_IN = 'sysml-modeler/ares-context', ARES_OUT = 'ares/suggestions';
function aresContext(opt){
  opt = opt || {}; const tb = topBlock(), byPk = id => !opt.pkgs || !opt.pkgs.length || opt.pkgs.some(p => p === id || isAnc(p, id));
  const blk = Object.values(M.els).filter(b => b.kind === 'Block' && byPk(b.id)).sort(sortEls);
  const D = coverData(), gaps = []; D.rows.forEach(b => REQ_CATS.forEach(c => { if(!D.cell.get(b.id + '|' + c.id).length && !(M.coverSkip || {})[b.id + '|' + c.id]) gaps.push({block:b.id, blockName:b.name, category:c.id, categoryName:c.tr}); }));
  const sat = relIdx().Satisfy || [], der = relIdx().DeriveReqt || [];
  return {
    schema:ARES_IN, version:1, generated:new Date().toISOString(), tool:'SysML Modelleyici ' + APP_VER, model:{name:E(M.rootId).name, classification:typeof secLabel === 'function' ? secLabel() : ''},
    conventions:{language:'tr', modalEnding:reqStyle() === 'mali' ? '-malıdır / -melidir' : '-ecektir / -acaktır', idPrefixes:reqCfg().prefix, verificationMethods:VERIF.map(v => v[0]), levels:['Sistem', 'Alt Sistem'], categories:REQ_CATS.map(c => ({id:c.id, name:c.tr}))},
    instructions:'Aşağıdaki modelden eksik gereksinimleri türetin. Her öneri tek bir zorunluluk fiili içermeli ve konvansiyondaki ekle bitmelidir; sayısal değerler birimiyle yazılmalı, yer tutucu kullanılmamalıdır. Çıktıyı "outputSchema" biçiminde JSON olarak verin; kaynak olarak kullandığınız model elemanlarının id değerlerini "sources" alanına yazın.',
    outputSchema:{schema:ARES_OUT, version:1, suggestions:[{id:'(isteğe bağlı, kararlı kimlik)', level:'Sistem | Alt Sistem', subsystem:'(Alt Sistem ise blok adı)', title:'kısa başlık', text:'gereksinim metni', verification:'Test | Analiz | Muayene | Gösterim', category:'kategori id', parent:'üst gereksinim id veya kimliği (SYS-001)', satisfiedBy:'blok id veya adı', sources:['model eleman id'], rationale:'gerekçe', confidence:'0–1'}]},
    requirements:allReqs().filter(r => reqStatus(r) !== 'İptal' && byPk(r.id)).map(r => ({id:r.id, reqId:r.reqId, level:reqLevel(r), subsystem:r.subsys || '', title:r.name || '', text:r.text || '', verification:r.verif || '', status:reqStatus(r), categories:[...reqCats(r)], parents:der.filter(x => x.src === r.id).map(x => x.tgt), satisfiedBy:sat.filter(x => x.tgt === r.id).map(x => x.src)})),
    blocks:blk.map(b => ({id:b.id, name:b.name, level:lvlOfBlock(b), doc:b.doc || '', parts:kidsOf(b.id).filter(p => p.kind === 'Part').map(p => ({id:p.id, name:p.name, type:p.type || '', typeName:p.type && E(p.type) ? E(p.type).name : '', multiplicity:p.mult || '1'})), values:kidsOf(b.id).filter(v => v.kind === 'Value').map(v => ({id:v.id, name:v.name, value:v.def == null ? '' : String(v.def), unit:unitOf(v) || ''})), ports:kidsOf(b.id).filter(p => p.kind === 'Port').map(p => ({id:p.id, name:p.name, type:p.type && E(p.type) ? E(p.type).name : '', conjugated:!!p.conj}))})),
    interfaces:allConns().filter(c => byPk(c.id) || byPk(c.owner)).map(c => { const a = cEnd(c, 0), b = cEnd(c, 1); return {id:c.id, icdId:c.icdId || '', name:c.name || '', from:a ? a.label : '', to:b ? b.label : '', direction:a && b ? cFlowDir(a, b) : 0, items:cItems(c).map(x => ({name:x.name, type:x.type || '', unit:x.unit || ''})), characteristics:c.spec || '', protocol:c.proto || '', type:c.ifType || ''}; }),
    functions:Object.values(M.els).filter(a => (a.kind === 'Action' || a.kind === 'Activity') && a.name && byPk(a.id)).map(a => ({id:a.id, name:a.name, kind:a.kind, owner:E(a.owner) ? E(a.owner).name : '', allocatedTo:[...allocTargets(a.id)].map(id => ({id, name:nm(E(id) || {})}))})),
    stateMachines:Object.values(M.els).filter(s => s.kind === 'StateMachine' && byPk(s.id)).map(s => ({id:s.id, name:s.name, context:E(s.owner) ? E(s.owner).name : '', states:Object.values(M.els).filter(x => x.kind === 'State' && isAnc(s.id, x.id)).map(x => x.name), transitions:Object.values(M.els).filter(t => t.kind === 'Transition' && E(t.src) && isAnc(s.id, t.src)).map(t => ({from:E(t.src).name || E(t.src).kind, to:E(t.tgt) ? E(t.tgt).name || E(t.tgt).kind : '', trigger:t.name || '', guard:t.guard || ''}))})),
    environment:allProfiles().map(p => ({id:p.id, name:p.name, type:p.ptype || 'psd', level:p.plevel || '', standard:p.std || '', summary:pfMetrics(p).main || ''})),
    failureModes:allFMs().filter(f => byPk(f.id)).map(f => ({id:f.id, name:f.name, item:nm(E(f.owner) || {}), effect:f.effE || f.effN || '', S:f.S || '', rpn:rpnOf(f) || '', action:f.act || ''})),
    gaps
  };
}
function aresExport(){ const ctx = aresContext(); download(new Blob([JSON.stringify(ctx, null, 1)], {type:'application/json'}), fileSafe(E(M.rootId).name) + ' - ARES bağlam paketi.json'); toast('ARES bağlam paketi: ' + ctx.requirements.length + ' gereksinim, ' + ctx.blocks.length + ' blok, ' + ctx.gaps.length + ' boşluk'); }
function aresParse(txt){
  let j; try { j = JSON.parse(String(txt || '').replace(/^﻿/, '')); } catch(e){ throw new Error('JSON okunamadı: ' + e.message); }
  const list = Array.isArray(j) ? j : j && Array.isArray(j.suggestions) ? j.suggestions : null;
  if(!list) throw new Error('"suggestions" dizisi bulunamadı (beklenen şema: ' + ARES_OUT + ')');
  const byReqId = new Map(allReqs().map(r => [String(r.reqId), r.id])), byBlk = new Map(Object.values(M.els).filter(b => b.kind === 'Block').map(b => [b.name, b.id])), errs = [];
  const items = list.map((s, i) => {
    const text = String(s.text || s.requirement || '').trim(); if(!text){ errs.push((i + 1) + '. öneride metin yok'); return null; }
    const lv = /alt/i.test(s.level || '') || s.subsystem ? 'Alt Sistem' : 'Sistem';
    const par = s.parent ? (E(s.parent) ? s.parent : byReqId.get(String(s.parent)) || null) : null;
    const sb = s.satisfiedBy ? (E(s.satisfiedBy) ? s.satisfiedBy : byBlk.get(String(s.satisfiedBy)) || (lv === 'Alt Sistem' && s.subsystem ? byBlk.get(String(s.subsystem)) : null) || null) : (lv === 'Alt Sistem' && s.subsystem ? byBlk.get(String(s.subsystem)) || null : null);
    const id = String(s.id || fnv1a(lv + '|' + (s.subsystem || '') + '|' + text));
    return {id, level:lv, subsys:lv === 'Alt Sistem' ? String(s.subsystem || (sb && E(sb) ? E(sb).name : '')) : '', name:String(s.title || ''), text, verif:String(s.verification || ''), category:String(s.category || ''), parent:par, satisfyBy:sb, src:(Array.isArray(s.sources) ? s.sources : []).filter(x => E(x)), rationale:String(s.rationale || ''), confidence:s.confidence};
  }).filter(Boolean);
  return {items, errs, meta:{model:j.model || '', generated:j.generated || '', engine:j.engine || j.tool || 'ARES'}};
}
function aresImportText(txt, name){
  const P = aresParse(txt); M.aresInbox = {file:name || '', t:new Date().toISOString(), meta:P.meta, items:P.items}; deriveCfg().rules.ares = true; bump(); if(typeof persistSoon === 'function') persistSoon();
  return P;
}
async function aresImport(){
  const f = await pickAny('.json', 'JSON (*.json)|*.json|Tüm dosyalar (*.*)|*.*').catch(e => { toast('Açılamadı: ' + e.message); return null; }); if(!f) return;
  let P; try { P = aresImportText(decodeText(f.u8), f.name.split(/[\\/]/).pop()); } catch(e){ return toast(e.message); }
  deriveRefresh(); DV.rule = 'ares'; DV.tab = 'oner'; openD('@derive'); toast(`${P.items.length} ARES önerisi alındı${P.errs.length ? ' · ' + P.errs.length + ' satır atlandı' : ''}`);
}
async function pickAny(accept, nativeFilter){
  if(typeof NATIVE !== 'undefined' && NATIVE){ const r = await nDialog('open', '', nativeFilter, '', true); if(r.error) throw new Error(r.error); if(!r.path) return null; const bin = atob(r.b64 || ''), u8 = new Uint8Array(bin.length); for(let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i); return {name:r.path, u8}; }
  return new Promise(res => { const inp = document.createElement('input'); inp.type = 'file'; inp.accept = accept; inp.onchange = async () => { const f = inp.files[0]; if(!f) return res(null); res({name:f.name, u8:new Uint8Array(await f.arrayBuffer())}); }; inp.click(); });
}
DERIVE_RULES.push({id:'ares', tr:'ARES (yerel LLM)', doc:'ARES\'ten (veya başka bir yerel dil modelinden) içe aktarılan öneriler. Bağlam paketi Araçlar ▾ → ARES bağlam paketini dışa aktar ile üretilir; ARES çıktısı (JSON, şema "ares/suggestions") Gereksinimler ▾ → ARES önerilerini içe aktar ile alınır. Kabul ve kalite denetimi kurallı türetmeyle aynıdır.',
  gen(){ const B = M.aresInbox; if(!B || !Array.isArray(B.items)) return []; return B.items.map(s => Object.assign({}, s, {sig:'ares:' + s.id, note:[s.rationale, s.confidence != null && s.confidence !== '' ? 'güven ' + s.confidence : '', B.file].filter(Boolean).join(' · '), extra:s.category ? {category:s.category} : null})); }
});
/* ---------- kural / ARES karşılaştırma raporu ---------- */
function deriveSeen(L){ const S = M.deriveSeen = M.deriveSeen || {}; L.forEach(s => { if(s.state === 'kaynak yok') return; const a = S[s.rule] = S[s.rule] || []; if(!a.includes(s.sig) && a.length < 5000) a.push(s.sig); }); }
{ const _dl = deriveList; deriveList = function(){ const L = _dl.apply(this, arguments); try { deriveSeen(L); } catch(e){ appErr('deriveSeen', e); } return L; }; }
function deriveStats(){
  const seen = M.deriveSeen || {}, D = derivedReqs(), rows = [];
  DERIVE_RULES.forEach(rule => {
    const acc = D.filter(r => r.derivedFrom.rule === rule.id), live = acc.filter(r => reqStatus(r) !== 'İptal'), sug = new Set((seen[rule.id] || []).concat(acc.map(r => r.derivedFrom.sig))).size;
    const iss = live.map(r => reqQuality(r).filter(x => x[0] !== 'bilgi').length), edited = live.filter(r => String(r.text || '').trim() !== String(r.derivedFrom.gen || '').trim()).length;
    const cats = new Set(); live.forEach(r => reqCats(r).forEach(c => cats.add(c)));
    rows.push({rule, sug, acc:acc.length, live:live.length, rate:sug ? acc.length / sug : null, issAvg:live.length ? iss.reduce((a, b) => a + b, 0) / live.length : null, clean:live.length ? iss.filter(x => !x).length / live.length : null, edited:live.length ? edited / live.length : null, cats:cats.size});
  });
  return rows;
}
function compareXlsx(){
  const S = deriveStats(), pct = v => v == null ? '—' : Math.round(v * 100) + '%';
  const sum = [['Kaynak', 'Görülen öneri', 'Kabul edilen', 'Etkin (iptal hariç)', 'Kabul oranı', 'Kalite bulgusu / gereksinim', 'Bulgusuz oranı', 'Kabulden sonra düzenlenen', 'Kapsanan kategori'].map(v => ({v, s:1}))];
  const grp = (name, rs) => { const a = rs.reduce((t, r) => ({sug:t.sug + r.sug, acc:t.acc + r.acc, live:t.live + r.live, iss:t.iss + (r.issAvg || 0) * r.live, clean:t.clean + (r.clean || 0) * r.live, ed:t.ed + (r.edited || 0) * r.live}), {sug:0, acc:0, live:0, iss:0, clean:0, ed:0}); sum.push([{v:name, s:1}, a.sug, a.acc, a.live, pct(a.sug ? a.acc / a.sug : null), a.live ? +(a.iss / a.live).toFixed(2) : '—', pct(a.live ? a.clean / a.live : null), pct(a.live ? a.ed / a.live : null), '']); };
  grp('Kurallı türetme (toplam)', S.filter(r => r.rule.id !== 'ares')); grp('ARES (yerel LLM)', S.filter(r => r.rule.id === 'ares'));
  sum.push([]); S.forEach(r => sum.push([r.rule.tr, r.sug, r.acc, r.live, pct(r.rate), r.issAvg == null ? '—' : +r.issAvg.toFixed(2), pct(r.clean), pct(r.edited), r.cats]));
  const det = [['Kaynak', 'Kural', 'ID', 'Durum', 'Metin', 'Üretilen metin', 'Düzenlendi', 'Kalite bulguları', 'Kategori'].map(v => ({v, s:1}))];
  derivedReqs().forEach(r => { const q = reqQuality(r).filter(x => x[0] !== 'bilgi'); det.push([r.derivedFrom.rule === 'ares' ? 'ARES' : 'Kural', (DERIVE_RULES.find(x => x.id === r.derivedFrom.rule) || {}).tr || r.derivedFrom.rule, r.reqId || '', reqStatus(r), r.text || '', r.derivedFrom.gen || '', String(r.text || '').trim() !== String(r.derivedFrom.gen || '').trim() ? 'evet' : '', q.map(x => x[1]).join('; '), [...reqCats(r)].map(c => (REQ_CATS.find(x => x.id === c) || {}).tr).join(', ')]); });
  download(buildXlsx([{name:'Özet', rows:sum, widths:[30, 14, 14, 16, 12, 22, 14, 22, 16], header:true}, {name:'Gereksinimler', rows:det, widths:[8, 18, 12, 12, 70, 70, 10, 50, 20], header:true, freeze:[0, 1]}]), fileSafe(E(M.rootId).name) + ' - Türetme Karşılaştırma.xlsx');
}
/* ---------- menüler ve sihirbaz çubuğu ---------- */
HOOKS.menu.req.push(r => { r.push({t:'Gereksinim kapsama haritası (eksik kategoriler)', f:() => openD('@reqcover')}, {t:'Çoklu isterleri böl…', f:multiListDialog}, {t:'ARES önerilerini içe aktar (JSON)…', f:aresImport}, {t:'Türetme karşılaştırma raporu (kural / ARES, Excel)', f:compareXlsx}); });
HOOKS.menu.tools.push(r => { r.push({t:'ARES bağlam paketini dışa aktar (JSON)…', f:aresExport}); });
if(typeof MENU_GROUPS !== 'undefined'){ MENU_GROUPS.tools.cls.unshift(['Değişim formatları (ReqIF, XMI, SysML v2)', /ARES/]); MENU_GROUPS.req.cls.unshift(['Gereksinimler', /kapsama haritası|Çoklu isterleri|Türetme karşılaştırma/]); }
if(typeof WF_STEPS !== 'undefined'){ WF_STEPS[0].a.push(['Kapsama haritası', /^Gereksinim kapsama haritası/]); WF_STEPS[4].a.push(['Türetme raporu', /^Türetme karşılaştırma/]); }
{ const V0 = VIEWS['@derive'], _b = V0.bar; V0.bar = () => _b() + (DV.tab === 'isk' ? '' : '<span class="vsep"></span><button class="vb" data-dva2="ares-in">ARES içe aktar…</button><button class="vb" data-dva2="ares-out">ARES bağlam paketi</button><button class="vb" data-dva2="cmp">Karşılaştırma raporu</button><button class="vb" data-dva2="cover">Kapsama haritası</button>');
  $('#view').addEventListener('click', ev => { if(ST.cur !== '@derive') return; const b = ev.target.closest('[data-dva2]'); if(!b) return; const a = b.dataset.dva2; if(a === 'ares-in') aresImport(); if(a === 'ares-out') aresExport(); if(a === 'cmp') compareXlsx(); if(a === 'cover') openD('@reqcover'); }); }
VIEWS['@derive'].note += '<br><br><b>ARES köprüsü:</b> "ARES bağlam paketi" modeli (gereksinimler, bloklar, arayüzler, fonksiyonlar, durumlar, çevre profilleri, FMEA, eksik kategoriler) ve beklenen çıktı şemasını JSON olarak verir. ARES çıktısı içe aktarılınca öneriler "ARES (yerel LLM)" kuralında görünür. <b>Karşılaştırma raporu</b> kurallı türetme ile ARES\'in kabul oranı, kalite bulguları ve düzenleme oranlarını karşılaştırır.';
{ const css = document.createElement('style'); css.textContent = `.rcv td.rcc{text-align:center;cursor:pointer;min-width:62px}.rcv td.gap{color:#c0392b;background:#fff5f4}.rcv td.na{color:#889;background:#f3f4f6}.rcv td.rcc:hover{outline:2px solid #26364b;outline-offset:-2px}body.dark .rcv td.gap{background:#3a2422}body.dark .rcv td.na{background:#2a3038}`; document.head.appendChild(css); }
if(typeof UI_RULES !== 'undefined') UI_RULES.unshift([/kapsama haritası/i, 'grid'], [/ares/i, 'link'], [/böl/i, 'unlink'], [/uygulanamaz/i, 'eyeoff'], [/şablon gereksinim/i, 'plus']);
