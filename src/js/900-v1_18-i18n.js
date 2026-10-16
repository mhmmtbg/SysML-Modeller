/* ================= v1.18: İNGİLİZCE ARAYÜZ (TR | EN) ================= */
/* Arayüz metinleri sözlükle çevrilir: tam eşleşme + yer tutuculu kalıplar ({0}…). Model içeriği (adlar, gereksinim metinleri),
   diyagram tuvali ve çıktılar (Word, Excel, ReqIF, PDF) çevrilmez. Türkçe metinler kodda olduğu gibi kalır. */
const I18N = /*I18N*//*/I18N*/;
(function(){ const G = IC_GLYPH; Object.keys(I18N.exact).forEach(k => { if(G.test(k)){ const t = k.replace(G, ''); if(t && !Object.prototype.hasOwnProperty.call(I18N.exact, t)) I18N.exact[t] = String(I18N.exact[k]).replace(G, ''); } }); I18N.tpl.slice().forEach(([k, v]) => { if(G.test(k)){ const t = k.replace(G, ''); if(t && !I18N.tpl.some(x => x[0] === t)) I18N.tpl.push([t, String(v).replace(G, '')]); } }); })();
let LANG = 'tr';
try { if(localStorage.getItem('sysml-lang') === 'en') LANG = 'en'; } catch(e){}
const I18N_CACHE = new Map(), I18N_ORIG = new WeakMap(), I18N_AORIG = new WeakMap();
const I18N_LETTER = /[A-Za-zÇĞİÖŞÜçğıöşü]/;
const I18N_TPL = I18N.tpl.map(([k, v]) => {
  const parts = k.split(/\{(\d+)\}/); let src = '^', anchor = '';
  parts.forEach((p, i) => { if(i % 2){ src += '([\\s\\S]*?)'; } else { src += p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); if(p.trim().length > anchor.length) anchor = p.trim(); } });
  const trunc = new Set([...k.matchAll(/\{(\d+)\}\s*(?=\{)/g)].map(x => +x[1]));
  return {re:new RegExp(src + '$'), v, anchor, trunc, lead:!/^\{/.test(k) && /^[^{]*[A-Za-zÇĞİÖŞÜçğıöşü]{3}/.test(k)};
});
const I18N_HAS = k => Object.prototype.hasOwnProperty.call(I18N.exact, k);
/* ayraçlı birleşik metinler (ör. "Blok: Araç Sistemi", "[act] …", "A › B") — parçalar yalnız tam eşleşmeyle çevrilir */
const I18N_SEP1 = /( — | · | › | ▸ | → | ← |: | \+ | \/ )/, I18N_SEP2 = /([‹›«»()\[\]]|^[←→↪＋⤓⤒✓✗⚠▣↻⏵●■◇◉⊗⌛✉⋔⋈▶⏸⏭↺✕⊓⧉±⌕☰↶↷🖌↗○]+\s*)/;
/* başındaki simge/sayı, sonundaki sayaç "(3)" ve dış parantez soyulup tam eşleşme denenir */
const I18N_PRE = /^((?:[•▶⚠✓✗⤒⤓↪＋+←→↻⏵●■□◇◉⊗⌛✉⋔⋈⏸⏭↺✕⊓⧉±⌕☰↶↷🖌↗○—–-]+|\d[\d.,]*%?)\s+)/, I18N_SUF = /(\s*(?:\(\d+\)|[↓→←↑]+))$/;
function i18nSimple(x){
  if(I18N_HAS(x)) return I18N.exact[x];
  let pre = '', suf = '', c = x, m;
  for(let i = 0; i < 3; i++){
    let ch = false;
    if((m = c.match(I18N_PRE)) && m[0].length < c.length){ pre += m[0]; c = c.slice(m[0].length); ch = true; }
    if((m = c.match(I18N_SUF)) && m[0].length < c.length){ suf = m[0] + suf; c = c.slice(0, -m[0].length); ch = true; }
    if(/^\(.+\)$/.test(c) && !I18N_HAS(c)){ pre += '('; suf = ')' + suf; c = c.slice(1, -1); ch = true; }
    if(I18N_HAS(c)) return pre + I18N.exact[c] + suf;
    if(!ch) break;
  }
  /* başı sabit metinle başlayan kalıplar (ör. "· Grms oranı {0}…", "(çağrı: {0})") parça içinde de denenir */
  for(const p of I18N_TPL){ if(!p.lead || (p.anchor && !c.includes(p.anchor))) continue; const mm = c.match(p.re); if(mm) return pre + p.v.replace(/\{(\d+)\}/g, (_, n) => mm[+n + 1] == null ? '' : mm[+n + 1]) + suf; }
  return null;
}
function i18nParts(core){
  const tx = x => { const m = x.match(/^(\s*)([\s\S]*?)(\s*)$/); if(!m[2] || !I18N_LETTER.test(m[2])) return [x, false]; const sm = i18nSimple(m[2]); if(sm != null) return [m[1] + sm + m[3], true]; const q = m[2].split(I18N_SEP2); if(q.length > 1){ let ch = false; const r = q.map(y => { const yy = y.trim(); if(yy && I18N_LETTER.test(yy)){ const t = i18nSimple(yy); if(t != null){ ch = true; return y.replace(yy, t); } } return y; }).join(''); return [m[1] + r + m[3], ch]; } return [x, false]; };
  const ps = core.split(I18N_SEP1); if(ps.length < 2 && !I18N_SEP2.test(core)) return null;
  let any = false; const out = ps.map((x, i) => { if(i % 2) return x; const [t, ch] = tx(x); if(ch) any = true; return t; }).join('');
  return any ? out : null;
}
function i18nCore(core, depth){
  if(I18N_HAS(core)) return I18N.exact[core];
  if(depth > 0) return null;
  for(const p of I18N_TPL){
    if(p.anchor && !core.includes(p.anchor)) continue;
    const m = core.match(p.re); if(!m) continue;
    return p.v.replace(/\{(\d+)\}/g, (_, n) => { const g = m[+n + 1]; if(g == null) return ''; if(p.trunc.has(+n)) return g; const gm = g.match(/^(\s*)([\s\S]*?)(\s*)$/); if(!gm[2] || !I18N_LETTER.test(gm[2])) return g; let t = i18nSimple(gm[2]); if(t == null) t = i18nParts(gm[2]); return t == null ? g : gm[1] + t + gm[3]; });
  }
  return null;
}
/* bir metni (gerekirse) İngilizceye çevir; bulunamazsa olduğu gibi döner */
function tr(s){
  if(LANG !== 'en' || s == null) return s;
  s = String(s); const m = s.match(/^(\s*)([\s\S]*?)(\s*)$/); if(m[2].includes('\n')){ const ls = m[2].split('\n'); const tl = ls.map(l => tr(l)); if(tl.some((l, i) => l !== ls[i])) return m[1] + tl.join('\n') + m[3]; }
  const core = m[2].replace(/\s+/g, ' ');
  if(!core || !I18N_LETTER.test(core)) return s;
  let r = I18N_CACHE.get(core);
  if(r === undefined){
    r = i18nCore(core, 0);
    if(r == null){ const pm = core.match(I18N_PRE); if(pm && pm[0].length < core.length){ const t2 = i18nCore(core.slice(pm[0].length), 0); if(t2 != null) r = pm[0] + t2; } }
    if(r == null){ const sm = core.match(I18N_SUF); if(sm && sm[0].length < core.length){ const t3 = i18nCore(core.slice(0, -sm[0].length), 0); if(t3 != null) r = t3 + sm[0]; } }
    if(r == null) r = i18nSimple(core);
    if(r == null) r = i18nParts(core);
    if(r == null && core.includes('\n')){ const ls = core.split('\n'), tl = ls.map(l => tr(l)); if(tl.some((l, i) => l !== ls[i])) r = tl.join('\n'); }
    I18N_CACHE.set(core, r);
  }
  return r == null ? s : m[1] + r + m[3];
}
function trMsg(s){ if(LANG !== 'en' || s == null) return s; const t = tr(s); if(t !== s || !String(s).includes('\n')) return t; return String(s).split('\n').map(tr).join('\n'); }
const I18N_SKIP = '#svg, .nm, .ce, [contenteditable="true"], script, style, textarea, .noi18n, #inl, #embedded-model';
const I18N_ATTRS = ['title', 'placeholder'];
function i18nText(n){
  if(LANG !== 'en') return;
  const p = n.parentElement; if(!p) return;
  const isTitle = p.tagName === 'title' && p.closest('svg');
  if(!isTitle && p.closest(I18N_SKIP) && !p.closest('.i18nok') && !(p.closest('.nm') && /^\(.+\)$/.test(n.data.trim()))) return;
  if(I18N_ORIG.has(n) && n.data === tr(I18N_ORIG.get(n))) return;
  const de = p.getAttribute('data-en'), t = de != null && p.childNodes.length === 1 ? de : tr(n.data); if(t === n.data) return;
  I18N_ORIG.set(n, n.data);
  if(p.tagName === 'OPTION' && !p.hasAttribute('value')) p.setAttribute('value', n.data);
  n.data = t;
}
function i18nAttrs(el){
  if(LANG !== 'en' || !el.getAttribute || (el.closest && el.closest('#svg'))) return;
  I18N_ATTRS.forEach(a => {
    const cur = el.getAttribute(a); if(cur == null) return;
    const st = I18N_AORIG.get(el); if(st && st[a] != null && cur === tr(st[a])) return;
    const t = tr(cur); if(t === cur) return;
    const s2 = st || {}; s2[a] = cur; I18N_AORIG.set(el, s2); el.setAttribute(a, t);
  });
}
function i18nTree(root){
  if(LANG !== 'en' || !root) return;
  if(root.nodeType === 3){ i18nText(root); return; }
  if(root.nodeType !== 1) return;
  if(root.closest && root.closest('#svg') && root.tagName !== 'title' && !root.querySelector('title')) return;
  i18nAttrs(root);
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, {acceptNode:x => x.nodeType === 1 && (x.id === 'svg' && !x.querySelector('title')) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT});
  let x; while((x = w.nextNode())){ if(x.nodeType === 3) i18nText(x); else i18nAttrs(x); }
}
function i18nRestore(){
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  let x; while((x = w.nextNode())){
    if(x.nodeType === 3){ if(I18N_ORIG.has(x)){ x.data = I18N_ORIG.get(x); I18N_ORIG.delete(x); } }
    else { const st = I18N_AORIG.get(x); if(st){ Object.keys(st).forEach(a => x.setAttribute(a, st[a])); I18N_AORIG.delete(x); } }
  }
}
const I18N_OBS = new MutationObserver(muts => {
  if(LANG !== 'en') return;
  for(const m of muts){
    if(m.type === 'childList') m.addedNodes.forEach(i18nTree);
    else if(m.type === 'characterData') i18nText(m.target);
    else if(m.type === 'attributes') i18nAttrs(m.target);
  }
});
I18N_OBS.observe(document.body, {childList:true, subtree:true, characterData:true, attributes:true, attributeFilter:I18N_ATTRS});
/* yerel diyaloglar */
const _confirm = window.confirm.bind(window), _prompt = window.prompt.bind(window), _alert = window.alert.bind(window);
window.confirm = m => _confirm(trMsg(m)); window.prompt = (m, d) => _prompt(trMsg(m), d); window.alert = m => _alert(trMsg(m));
/* yeni elemanların varsayılan adları */
const BASE_TR = Object.assign({}, BASE);
const BASE_EN = {Requirement:'Requirement', TestCase:'Test', StateMachine:'State Machine', State:'State', Interaction:'Interaction', Lifeline:'ll', ConstraintBlock:'Constraint', ConstraintProp:'constraint', Package:'Package', Block:'Block', Value:'value', Actor:'Actor', Subject:'System', Activity:'Activity', Action:'Action', Object:'object', Partition:'Lane', InterfaceBlock:'Interface', FlowProp:'flow', ValueType:'ValueType', Signal:'Signal', Stereotype:'Stereotype', SendSignal:'Send', AcceptEvent:'Accept', Region:'region', FailureMode:'Failure mode', Legend:'Legend', TestProfile:'Profile', TestArticle:'Article', NCR:'Nonconformance', TestResource:'Resource'};
function applyBase(){ Object.keys(BASE_TR).forEach(k => { BASE[k] = LANG === 'en' && BASE_EN[k] != null ? BASE_EN[k] : BASE_TR[k]; }); }
function setLang(l){
  if(l === LANG) return;
  LANG = l; try { localStorage.setItem('sysml-lang', l); } catch(e){}
  document.documentElement.lang = l; applyBase(); I18N_CACHE.clear();
  if(l === 'en') i18nTree(document.body); else i18nRestore();
  const b = document.querySelector('[data-act="lang"]'); if(b) b.textContent = l === 'en' ? 'TR' : 'EN';
  try { renderAll(); if(isView(ST.cur)){ const v = $('#view'); v.dataset.v = ''; renderView(); } } catch(e){ appErr('900:131', e); }
  updTitle(); toast(l === 'en' ? 'Interface language: English' : 'Arayüz dili: Türkçe');
}
ACT.lang = () => setLang(LANG === 'en' ? 'tr' : 'en');
(function(){
  document.documentElement.lang = LANG; applyBase();
  const b = document.querySelector('[data-act="lang"]'); if(b) b.textContent = LANG === 'en' ? 'TR' : 'EN';
  if(LANG === 'en') i18nTree(document.body);
})();

/* ================= BOOT ================= */
(async function boot(){
  if(NATIVE){
    document.querySelectorAll('.nat').forEach(b => b.style.display = 'inline-block');
    let info = {};
    try { info = await window.nativeInfo() || {}; } catch(e){ appErr('900:146', e); }
    let m = null;
    if(info.argText) m = parseModelText(info.argText);
    if(m){ curPath = /\.(sysml|json)$/i.test(info.argPath || '') ? info.argPath : ''; dirty = !curPath; }
    else if(info.autosave){ m = parseModelText(info.autosave); if(m){ curPath = info.lastPath || ''; dirty = !!info.dirty || !curPath; } }
    if(!m){ m = demo(); dirty = true; }
    loadModel(m); renderAll(); updTitle(); persist();
    return;
  }
  let emb = null, ls = null;
  try { const t = $('#embedded-model').textContent.trim(); if(t) emb = JSON.parse(t); } catch(e){ appErr('900:156', e); }
  try { const t = localStorage.getItem(LSK); if(t) ls = JSON.parse(t); } catch(e){}
  let m;
  if(validModel(emb) && validModel(ls) && ls.uid === emb.uid && (ls.savedAt || 0) > (emb.savedAt || 0)) m = ls;
  else if(validModel(emb)) m = emb;
  else if(validModel(ls)) m = ls;
  else m = demo();
  loadModel(m);
  renderAll(); persist();
})();
