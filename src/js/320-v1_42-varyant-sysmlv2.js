/* ================= v1.42: VARYANT / KONFİGÜRASYON YÖNETİMİ VE SYSML v2 METİN DIŞA AKTARMA ================= */
/* ---------- varyant modeli ---------- */
const varM = () => (M.variants = M.variants || {features:[], configs:[], active:'', hide:false});
const varFeatEnv = cfg => new Map(varM().features.map(f => [f.name, cfg && cfg.sel && cfg.sel[f.id] ? 1 : 0]));
const varActiveCfg = () => { const V = M && M.variants; return V && V.active ? V.configs.find(c => c.id === V.active) || null : null; };
function varOn(e, cfg){
  cfg = cfg === undefined ? varActiveCfg() : cfg; if(!cfg || !e) return true;
  let x = e, g = 0;
  while(x && g++ < 60){ if(x.vcond && String(x.vcond).trim()){ const r = xGuard(x.vcond, varFeatEnv(cfg)); if(r === false) return false; } x = x.kind === 'Package' ? null : E(x.owner); }
  return true;
}
function varCondCheck(expr){ const s = String(expr || '').trim(); if(!s) return ''; let ids; try { xParse(xTok(s)); ids = xIds(s); } catch(e){ return 'İfade hatası: ' + e.message; } const known = new Set(varM().features.map(f => f.name)); const bad = (ids || []).filter(i => !known.has(i)); return bad.length ? 'Tanımsız özellik: ' + bad.join(', ') : ''; }
/* bütçe toplamı etkin konfigürasyona göre */
let VAR_IN = false;
{
  const _ru = rollup;
  rollup = function(){
    if(VAR_IN || !varActiveCfg()) return _ru.apply(this, arguments);
    VAR_IN = true; const ok = kidsOf; kidsOf = id => ok(id).filter(k => k.kind !== 'Part' || varOn(k));
    try { return _ru.apply(this, arguments); } finally { kidsOf = ok; VAR_IN = false; }
  };
  /* diyagram: varyant dışı şekiller soluk veya gizli */
  DRAW.shape.push((s, sh, e) => (!e || !varActiveCfg() || varOn(e)) ? s : `<g opacity="0.25" data-varoff="1">${s}</g>`);
  DRAW.diagram.push(d => {
    const V = M.variants; if(!V || !V.hide || !varActiveCfg()) return null;
    const off = new Set(d.shapes.filter(s => E(s.el) && !varOn(E(s.el))).map(s => s.id)); if(!off.size) return null;
    return {shape:s => !off.has(s.id) && !(s.parent && off.has(s.parent))};
  });
}
function withConfig(cfgId, fn){ const V = varM(), keep = V.active; V.active = cfgId || ''; bump(); try { return fn(); } finally { V.active = keep; bump(); } }
/* ---------- görünüm ---------- */
let VRV = {root:null, props:['kütle', 'maliyet', 'güç']};
function variantsHTML(){
  const V = varM(), cond = Object.values(M.els).filter(e => String(e.vcond || '').trim());
  let h = `<div class="tsw"><div class="tsgrid"><div><div class="sub"><span>Özellikler (feature)</span></div>${V.features.map((f, i) => `<div class="li"><input class="fmsel noi18n" data-vff="${i}" value="${esc(f.name)}" style="width:150px"> <input class="fmsel noi18n" data-vfd="${i}" value="${esc(f.doc || '')}" placeholder="açıklama" style="width:220px"> <button class="vb" data-ic="0" data-vfdel="${i}">✕</button></div>`).join('')}<div class="li"><button class="vb" data-vfadd="1">+ Özellik</button></div></div>`;
  h += `<div><div class="sub"><span>Konfigürasyonlar</span></div>${V.configs.length || V.features.length ? `<div style="overflow-x:auto"><table class="rt fmt"><thead><tr><th>Konfigürasyon</th>${V.features.map(f => `<th class="noi18n">${esc(f.name)}</th>`).join('')}<th></th></tr></thead><tbody>${V.configs.map((c, i) => `<tr class="${V.active === c.id ? 'tswin' : ''}"><td><input class="fmsel noi18n" data-vcn="${i}" value="${esc(c.name)}" style="width:150px"></td>${V.features.map(f => `<td style="text-align:center"><input type="checkbox" data-vcs="${i}|${f.id}"${c.sel && c.sel[f.id] ? ' checked' : ''}></td>`).join('')}<td style="white-space:nowrap"><button class="vb" data-ic="0" data-vcact="${c.id}">${V.active === c.id ? 'Etkin ✓' : 'Etkinleştir'}</button> <button class="vb" data-ic="0" data-vcdel="${i}">✕</button></td></tr>`).join('')}</tbody></table></div>` : ''}<div class="li"><button class="vb" data-vcadd="1">+ Konfigürasyon</button></div></div></div>`;
  h += `<div class="sub"><span>Varyant koşullu elemanlar (${cond.length})</span></div>`;
  h += cond.length ? `<table class="rt fmt"><thead><tr><th>Eleman</th><th>Tür</th><th>Koşul</th>${V.configs.map(c => `<th class="noi18n">${esc(c.name)}</th>`).join('')}</tr></thead><tbody>${cond.map(e => { const err = varCondCheck(e.vcond); return `<tr><td class="noi18n"><a class="lnk" data-goto="${e.id}">${esc(pathOf(e.id))}</a></td><td>${esc(KIND[e.kind].tr)}</td><td class="noi18n"><code>${esc(e.vcond)}</code>${err ? `<div class="tsbad">${esc(err)}</div>` : ''}</td>${V.configs.map(c => `<td style="text-align:center">${varOn(e, c) ? '<b class="tsok">✓</b>' : '<span class="muted">—</span>'}</td>`).join('')}</tr>`; }).join('')}</tbody></table>` : `<div class="muted">Bir part, port, değer, gereksinim veya test seçip Özellikler → <b>Varyant koşulu</b> alanına özellik adlarıyla ifade yazın (ör. <code>UzunMenzil && !Hafif</code>).</div>`;
  const roots = Object.values(M.els).filter(b => b.kind === 'Block' && kidsOf(b.id).some(p => p.kind === 'Part')).sort(sortEls);
  let root = E(VRV.root); if(!root || root.kind !== 'Block') root = (typeof topBlock === 'function' && topBlock()) || roots[0]; VRV.root = root ? root.id : null;
  if(root && V.configs.length){
    const props = budgetProps().filter(p => VRV.props.includes(p) || p === VRV.extra);
    h += `<div class="sub"><span>Konfigürasyon karşılaştırma — <span class="noi18n">${esc(root.name)}</span></span></div><div class="li">Kök blok <select data-vrr="1" class="noi18n">${roots.map(b => `<option value="${b.id}"${b.id === root.id ? ' selected' : ''}>${esc(b.name)}</option>`).join('')}</select> Özellik ekle <select data-vrp="1" class="noi18n"><option value="">—</option>${budgetProps().filter(p => !props.includes(p)).map(p => `<option>${esc(p)}</option>`).join('')}</select></div>`;
    h += `<table class="rt fmt"><thead><tr><th>Konfigürasyon</th><th>Etkin part</th>${props.map(p => `<th class="noi18n">Σ ${esc(p)}${budgetUnit(p) ? ' [' + esc(budgetUnit(p)) + ']' : ''}</th>`).join('')}</tr></thead><tbody>${[{id:'', name:'(tüm model — 150%)'}].concat(V.configs).map(c => withConfig(c.id, () => { const parts = Object.values(M.els).filter(p => p.kind === 'Part' && (isAnc(root.id, p.id) || p.owner === root.id)); return `<tr><td class="noi18n">${esc(c.name)}</td><td>${parts.filter(p => varOn(p)).length} / ${parts.length}</td>${props.map(p => { const t = rollup(root.id, p).total; return `<td>${t == null ? '—' : fmtNum(t)}</td>`; }).join('')}</tr>`; })).join('')}</tbody></table>`;
  }
  return h + '</div>';
}
function variantsBar(){ const V = varM(); return `<label>Etkin konfigürasyon <select data-vact="1" class="noi18n"><option value="">(yok — tüm model)</option>${V.configs.map(c => `<option value="${c.id}"${V.active === c.id ? ' selected' : ''}>${esc(c.name)}</option>`).join('')}</select></label><label class="vchk"><input type="checkbox" data-vhide="1"${V.hide ? ' checked' : ''}> Varyant dışını diyagramlarda gizle (yoksa soluk)</label><span class="vsep"></span><button class="vb" data-vxl="1">⤒ Excel</button>`; }
VIEWS['@variants'] = {tr:'Varyantlar ve Konfigürasyonlar', ic:'Va', note:'Ürün ailesi yönetimi: <b>özellikler</b> (feature) tanımlayın, <b>konfigürasyonlarda</b> hangi özelliklerin seçili olduğunu işaretleyin ve elemanlara <b>varyant koşulu</b> yazın.<br><br>Etkin konfigürasyon seçildiğinde varyant dışı elemanlar diyagramlarda soluk (veya gizli) gösterilir, bütçe toplamları ve trade study yalnız etkin part\'ları hesaba katar. Karşılaştırma tablosu her konfigürasyonun kütle/maliyet/güç toplamını verir.', render:variantsHTML, bar:variantsBar, status:() => { const c = varActiveCfg(); return c ? 'Konfigürasyon: ' + c.name : varM().configs.length + ' konfigürasyon'; }};
function variantsXlsx(){
  const V = varM(), rows = [['Eleman', 'Tür', 'Koşul'].concat(V.configs.map(c => c.name)).map(v => ({v, s:1}))];
  Object.values(M.els).filter(e => String(e.vcond || '').trim()).forEach(e => rows.push([pathOf(e.id), KIND[e.kind].tr, e.vcond].concat(V.configs.map(c => varOn(e, c) ? '✓' : ''))));
  const fr = [['Konfigürasyon'].concat(V.features.map(f => f.name)).map(v => ({v, s:1}))].concat(V.configs.map(c => [c.name].concat(V.features.map(f => c.sel && c.sel[f.id] ? '✓' : ''))));
  download(buildXlsx([{name:'Konfigürasyonlar', rows:fr, widths:[26].concat(V.features.map(() => 14)), header:true}, {name:'Koşullu elemanlar', rows, widths:[40, 14, 30].concat(V.configs.map(() => 14)), header:true, freeze:[0, 1]}]), fileSafe(E(M.rootId).name) + ' - Varyantlar.xlsx');
}
(() => {
  const V = $('#view'), ch = f => { snap(); f(varM()); afterChange(); renderViewBar(); renderView(); };
  V.addEventListener('click', ev => {
    if(ST.cur !== '@variants') return; const t = ev.target.closest('button') || ev.target; const d = t.dataset || {};
    if(d.vfadd) ch(v => v.features.push({id:uid(), name:'Özellik' + (v.features.length + 1)}));
    if(d.vfdel != null) ch(v => { const f = v.features[+d.vfdel]; v.features.splice(+d.vfdel, 1); v.configs.forEach(c => { if(c.sel) delete c.sel[f.id]; }); });
    if(d.vcadd) ch(v => v.configs.push({id:uid(), name:'Konfigürasyon ' + String.fromCharCode(65 + v.configs.length), sel:{}}));
    if(d.vcdel != null) ch(v => { const c = v.configs[+d.vcdel]; v.configs.splice(+d.vcdel, 1); if(v.active === c.id) v.active = ''; });
    if(d.vcact) ch(v => { v.active = v.active === d.vcact ? '' : d.vcact; });
    if(d.vxl) variantsXlsx();
  });
  V.addEventListener('change', ev => {
    if(ST.cur !== '@variants') return; const t = ev.target, d = t.dataset;
    if(d.vff != null) ch(v => { const f = v.features[+d.vff], old = f.name, nw = t.value.trim().replace(/[^\wÇĞİÖŞÜçğıöşü]/g, ''); if(!nw) return; f.name = nw; if(old !== nw) Object.values(M.els).forEach(e => { if(e.vcond) e.vcond = e.vcond.replace(new RegExp('(^|[^\\wÇĞİÖŞÜçğıöşü])' + old + '(?![\\wÇĞİÖŞÜçğıöşü])', 'g'), '$1' + nw); }); });
    if(d.vfd != null) ch(v => { v.features[+d.vfd].doc = t.value; });
    if(d.vcn != null) ch(v => { v.configs[+d.vcn].name = t.value.trim() || v.configs[+d.vcn].name; });
    if(d.vcs){ const [i, fid] = d.vcs.split('|'); ch(v => { const c = v.configs[+i]; c.sel = c.sel || {}; c.sel[fid] = t.checked; }); }
    if(d.vact != null) ch(v => { v.active = t.value; });
    if(d.vhide) ch(v => { v.hide = t.checked; });
    if(d.vrr){ VRV.root = t.value; renderView(); }
    if(d.vrp && t.value){ VRV.props = VRV.props.concat([t.value]); renderView(); }
  });
  V.addEventListener('keydown', ev => { if(ST.cur === '@variants' && ev.target.matches && ev.target.matches('input')){ ev.stopPropagation(); if(ev.key === 'Enter') ev.target.blur(); } });
})();
HOOKS.menu.analysis.push(r => { const c = varActiveCfg(); r.push('-', {t:'Varyantlar ve konfigürasyonlar' + (c ? ' (' + c.name + ')' : ''), f:() => openD('@variants')}); });
const VAR_KINDS = new Set(['Part', 'Port', 'Value', 'Requirement', 'TestCase', 'Block', 'FlowProp', 'Action', 'State', 'UseCase']);
HOOKS.props.push((t, P) => { const el = t.el; if(!el || !VAR_KINDS.has(el.kind) || (typeof bulkTargets === 'function' && bulkTargets())) return;
  const V = varM(); if(!V.features.length && !el.vcond) return;
  const err = varCondCheck(el.vcond), on = varActiveCfg() ? varOn(el) : null;
  const html = `<div class="pf"><label>Varyant koşulu</label><div><input data-f="vcond" class="noi18n" list="varFeats" value="${esc(el.vcond || '')}" placeholder="ör. ${esc((V.features[0] || {name:'Özellik'}).name)}"><datalist id="varFeats">${V.features.map(f => `<option value="${esc(f.name)}">`).join('')}</datalist>${err ? `<div class="tsbad" style="font-size:11px">${esc(err)}</div>` : ''}${on === false ? '<div class="muted" style="font-size:11px">Etkin konfigürasyonda dışarıda</div>' : ''}</div></div>`;
  const wu = P.querySelector('details.wu'); if(wu) wu.insertAdjacentHTML('beforebegin', html); else P.insertAdjacentHTML('beforeend', html);
});
VALIDATORS.push((add, els) => { els.filter(e => String(e.vcond || '').trim()).forEach(e => { const er = varCondCheck(e.vcond); if(er) add('hata', 'Geçersiz varyant koşulu', e, er); }); });
STATUS_HOOKS.push(st => { if(!st) return; const c = varActiveCfg(); let b = st.querySelector('.varst'); if(!c){ if(b) b.remove(); return; } if(!b){ st.insertAdjacentHTML('beforeend', '<span class="varst noi18n" style="margin-left:12px;font-weight:600;color:#7a4fbf"></span>'); b = st.querySelector('.varst'); } b.textContent = '◆ ' + c.name; });
/* ---------- SysML v2 metin dışa aktarma (alt küme) ---------- */
function v2Name(s){ s = String(s == null ? '' : s); return /^[A-Za-z_][A-Za-z0-9_]*$/.test(s) ? s : "'" + s.replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'"; }
function v2Doc(e, ind){ return e.doc && String(e.doc).trim() ? ind + 'doc /* ' + String(e.doc).replace(/\*\//g, '* /').replace(/\n/g, '\n' + ind + ' * ') + ' */\n' : ''; }
function v2Qual(id){ const a = []; let e = E(id); while(e && e.id !== M.rootId){ a.unshift(v2Name(e.kind === 'Requirement' && e.reqId ? e.reqId : e.name)); e = E(e.owner); } return a.join('::'); }
function v2Mult(m){ m = String(m || '').trim(); return m && m !== '1' ? '[' + m + ']' : ''; }
function v2Num(v){ const n = numOf(v); return n != null ? String(n) : (v == null || v === '' ? '' : '"' + String(v).replace(/"/g, '\\"') + '"'); }
function sysmlV2Text(){
  const idx = relIdx(), R = k => idx[k] || [], out = [], I = n => '    '.repeat(n);
  const vtRef = (x) => x.type && E(x.type) ? v2Qual(x.type) : x.vtype ? (vtypeOf(x.vtype) ? v2Qual(vtypeOf(x.vtype).id) : ({Real:'ScalarValues::Real', Integer:'ScalarValues::Integer', Boolean:'ScalarValues::Boolean', String:'ScalarValues::String'}[x.vtype] || v2Name(x.vtype))) : '';
  const body = (e, n) => {
    const k = kidsOf(e.id).filter(c => !(KIND[c.kind] && KIND[c.kind].rel) && c.kind !== 'Diagram' && c.kind !== 'Comment').sort(sortEls);
    let s = '';
    k.forEach(c => { s += item(c, n); });
    return s;
  };
  const item = (e, n) => {
    const nm2 = v2Name(e.name), d = v2Doc(e, I(n + 1));
    const blk = (head, inner) => inner.trim() ? `${I(n)}${head} {\n${inner}${I(n)}}\n` : `${I(n)}${head};\n`;
    switch(e.kind){
      case 'Package': return blk('package ' + nm2, d + body(e, n + 1));
      case 'Block': case 'InterfaceBlock': {
        const gen = R('Generalization').filter(r => r.src === e.id && E(r.tgt)).map(r => v2Qual(r.tgt));
        let inner = d + body(e, n + 1);
        R('Connector').filter(c => c.owner === e.id && E(c.src) && E(c.tgt)).forEach(c => { const end = (pid, prt) => (prt && E(prt) ? v2Name(E(prt).name) + '.' : '') + v2Name(E(pid).name); inner += `${I(n + 1)}${(c.conv || []).length ? 'interface' : 'connect'} ${end(c.src, c.sp)} to ${end(c.tgt, c.tp)};\n`; });
        R('Satisfy').filter(r => r.src === e.id && E(r.tgt)).forEach(r => { inner += `${I(n + 1)}satisfy ${v2Qual(r.tgt)} by self;\n`; });
        return blk((e.kind === 'InterfaceBlock' ? 'port def ' : 'part def ') + nm2 + (gen.length ? ' :> ' + gen.join(', ') : ''), inner);
      }
      case 'Part': return `${I(n)}${e.shared ? 'ref ' : ''}part ${nm2}${e.type && E(e.type) ? ' : ' + v2Qual(e.type) : ''}${v2Mult(e.mult)};${e.vcond ? ' // varyant: ' + e.vcond : ''}\n`;
      case 'Value': { const t = vtRef(e), et = e.type && E(e.type) && E(e.type).kind === 'Enumeration' ? E(e.type) : (e.vtype && vtypeOf(e.vtype) && vtypeOf(e.vtype).kind === 'Enumeration' ? vtypeOf(e.vtype) : null), dv = et && enumLits(et).includes(String(e.def || '').trim()) ? v2Qual(et.id) + '::' + v2Name(String(e.def).trim()) : v2Num(e.def); return `${I(n)}attribute ${nm2}${t ? ' : ' + t : ''}${dv !== '' ? ' = ' + dv : ''};${unitOf(e) ? ' // [' + unitOf(e) + ']' : ''}\n`; }
      case 'Port': return `${I(n)}port ${nm2}${e.type && E(e.type) ? ' : ' + (e.conj ? '~' : '') + v2Qual(e.type) : ''}${v2Mult(e.mult)};\n`;
      case 'FlowProp': { const t = vtRef(e); return `${I(n)}${e.dir && e.dir !== 'inout' ? e.dir : 'inout'} item ${nm2}${t ? ' : ' + t : ''};\n`; }
      case 'ValueType': return blk('attribute def ' + nm2 + ' :> ScalarValues::Real', d + (unitOf(e) ? `${I(n + 1)}// birim: ${unitOf(e)}\n` : ''));
      case 'Enumeration': return blk('enum def ' + nm2, d + enumLits(e).map(l => `${I(n + 1)}enum ${v2Name(l)};\n`).join(''));
      case 'Signal': return blk('item def ' + nm2, d + body(e, n + 1));
      case 'ConstraintBlock': { const ps = kidsOf(e.id).filter(p => p.kind === 'Param'); return blk('constraint def ' + nm2, d + ps.map(p => `${I(n + 1)}in ${v2Name(p.name)} : ${vtRef(p) || 'ScalarValues::Real'};\n`).join('') + (xs => xs.length ? I(n + 1) + xs.map(x => xs.length > 1 ? '(' + x + ')' : x).join(' and\n' + I(n + 1)) + '\n' : '')(String(e.expr || '').split(/[;\n]+/).map(x => x.trim()).filter(Boolean).filter(x => !/^der\(/.test(x)).map(x => isIneq(x) ? x : x.replace(/(?<![<>!=])=(?!=)/, '==')))); }
      case 'ConstraintProp': return `${I(n)}constraint ${nm2}${e.type && E(e.type) ? ' : ' + v2Qual(e.type) : ''};\n`;
      case 'Requirement': { const who = v2Name(e.name || e.reqId); return blk(`requirement def ${e.reqId ? '<' + v2Name(e.reqId) + '> ' : ''}${who}`, (e.text ? `${I(n + 1)}doc /* ${String(e.text).replace(/\*\//g, '* /')} */\n` : '') + (e.verif ? `${I(n + 1)}// doğrulama yöntemi: ${e.verif}\n` : '') + (e.vcond ? `${I(n + 1)}// varyant: ${e.vcond}\n` : '') + body(e, n + 1)); }
      case 'TestCase': { const vs = R('Verify').filter(r => r.src === e.id && E(r.tgt)); return blk('verification def ' + nm2, d + (vs.length ? `${I(n + 1)}objective {\n${vs.map(r => `${I(n + 2)}verify ${v2Qual(r.tgt)};\n`).join('')}${I(n + 1)}}\n` : '') + (e.result ? `${I(n + 1)}// sonuç: ${testResult(e)}\n` : '')); }
      case 'Actor': return `${I(n)}part def ${nm2}; // aktör\n`;
      case 'UseCase': return blk('use case def ' + nm2, d + (e.scn ? `${I(n + 1)}/* ${String(e.scn).replace(/\*\//g, '* /')} */\n` : ''));
      case 'Activity': {
        const nodes = kidsOf(e.id).filter(x => ['Action', 'SendSignal', 'AcceptEvent', 'AcceptTime', 'Decision', 'Merge', 'Fork', 'Join', 'Initial', 'Final', 'FlowFinal'].includes(x.kind));
        const cnt = {}, auto = new Map(); nodes.forEach(x => { if(!x.name && !['Initial', 'Final', 'FlowFinal'].includes(x.kind)){ cnt[x.kind] = (cnt[x.kind] || 0) + 1; auto.set(x.id, x.kind.toLowerCase() + cnt[x.kind]); } });
        const nn = x => x.kind === 'Initial' ? 'start' : x.kind === 'Final' || x.kind === 'FlowFinal' ? 'done' : v2Name(x.name || auto.get(x.id) || x.kind);
        let inner = d;
        nodes.forEach(x => { if(x.kind === 'Action' || x.kind === 'SendSignal' || x.kind === 'AcceptEvent' || x.kind === 'AcceptTime') inner += `${I(n + 1)}action ${nn(x)}${x.behavior && E(x.behavior) ? ' : ' + v2Qual(x.behavior) : ''};\n`; else if(x.kind === 'Decision') inner += `${I(n + 1)}decide ${nn(x)};\n`; else if(x.kind === 'Merge') inner += `${I(n + 1)}merge ${nn(x)};\n`; else if(x.kind === 'Fork') inner += `${I(n + 1)}fork ${nn(x)};\n`; else if(x.kind === 'Join') inner += `${I(n + 1)}join ${nn(x)};\n`; });
        R('ControlFlow').concat(R('ObjectFlow')).filter(f => f.owner === e.id && E(f.src) && E(f.tgt)).forEach(f => { inner += `${I(n + 1)}${f.kind === 'ObjectFlow' ? 'flow' : 'succession'} first ${nn(E(f.src).kind === 'Pin' ? E(E(f.src).owner) : E(f.src))} then ${nn(E(f.tgt).kind === 'Pin' ? E(E(f.tgt).owner) : E(f.tgt))};${f.guard ? ' // [' + f.guard + ']' : ''}\n`; });
        return blk('action def ' + nm2, inner);
      }
      case 'StateMachine': {
        const sts = Object.values(M.els).filter(x => x.kind === 'State' && (x.owner === e.id || isAnc(e.id, x.id)));
        let inner = d;
        sts.forEach(x => { inner += `${I(n + 1)}state ${v2Name(x.name)}${x.entry || x.doAct || x.exit ? ' {' + (x.entry ? ' entry action { /* ' + x.entry + ' */ }' : '') + (x.doAct ? ' do action { /* ' + x.doAct + ' */ }' : '') + (x.exit ? ' exit action { /* ' + x.exit + ' */ }' : '') + ' }' : ';'}\n`; });
        const trs = R('Transition').filter(t => E(t.src) && E(t.tgt) && (t.owner === e.id || isAnc(e.id, t.id) || sts.some(s => s.id === t.src)));
        const pc = {}, pn = new Map(), sn2 = x => { if(x.kind === 'State' || x.name) return v2Name(x.name || x.kind); if(!pn.has(x.id)){ pc[x.kind] = (pc[x.kind] || 0) + 1; pn.set(x.id, x.kind.toLowerCase() + pc[x.kind]); } return pn.get(x.id); };
        const pseudo = new Set(); trs.forEach(t => [E(t.src), E(t.tgt)].forEach(x => { if(x.kind !== 'State' && x.kind !== 'Initial' && x.kind !== 'Final') pseudo.add(x); }));
        pseudo.forEach(x => { inner += `${I(n + 1)}${/Choice|Junction|Decision/.test(x.kind) ? 'state ' + sn2(x) + '; // seçim (choice)' : 'state ' + sn2(x) + '; // ' + x.kind}\n`; });
        const acc = nm0 => { const m = /^after\s*\(\s*([\d.]+)\s*([^)]*)\)$/i.exec(String(nm0).trim()); return m ? 'accept after ' + m[1] + (m[2].trim() ? ' [' + m[2].trim() + ']' : '') : 'accept ' + v2Name(nm0); };
        trs.forEach(t => { const s = E(t.src), g = E(t.tgt), tn = g.kind === 'Final' ? 'done' : sn2(g); if(s.kind === 'Initial'){ inner += `${I(n + 1)}entry; then ${tn};\n`; return; } const el = /^(else|değilse|aksi)$/i.test(String(t.guard || '').trim()); inner += `${I(n + 1)}transition first ${sn2(s)}${t.name ? ' ' + acc(t.name) : ''}${t.guard && !el ? ' if ' + t.guard : ''}${t.effect ? ' do action { /* ' + t.effect + ' */ }' : ''} then ${tn};${el ? ' // else' : ''}\n`; });
        return blk('state def ' + nm2, inner);
      }
      case 'View': return blk('view def ' + nm2, d + R('Expose').filter(r => r.src === e.id && E(r.tgt) && E(r.tgt).kind !== 'Diagram').map(r => `${I(n + 1)}expose ${v2Qual(r.tgt)}::**;\n`).join(''));
      case 'Viewpoint': return blk('viewpoint def ' + nm2, d + (e.stakeholders ? `${I(n + 1)}// paydaşlar: ${e.stakeholders}\n` : '') + (e.concerns ? `${I(n + 1)}// kaygılar: ${e.concerns}\n` : ''));
      default: return '';
    }
  };
  const root = E(M.rootId);
  out.push(`// SysML v2 metin gösterimi (alt küme) — ${root.name}`, `// SysML Modelleyici ${APP_VER} ile üretildi: ${new Date().toISOString().slice(0, 10)}` + (typeof secLabel === 'function' && secLabel() ? `\n// GİZLİLİK DERECESİ: ${secLabel()}` : ''), `// Not: davranış gövdeleri ve bazı ilişkiler yorum olarak aktarılır; Pilot uygulama / Cameo 2024x ile içe almadan önce gözden geçirin.`, '');
  out.push(`package ${v2Name(root.name)} {`, '    private import ScalarValues::*;');
  out.push(body(root, 1).replace(/\n$/, ''));
  /* model düzeyi ilişkiler */
  const rel = [];
  R('DeriveReqt').forEach(r => { if(E(r.src) && E(r.tgt)) rel.push(`    #derivation dependency from ${v2Qual(r.tgt)} to ${v2Qual(r.src)};`); });
  R('Refine').concat(R('Trace')).forEach(r => { if(E(r.src) && E(r.tgt)) rel.push(`    #${r.kind === 'Refine' ? 'refinement' : 'trace'} dependency from ${v2Qual(r.src)} to ${v2Qual(r.tgt)};`); });
  R('Satisfy').forEach(r => { const s = E(r.src); if(s && E(r.tgt) && s.kind !== 'Block' && s.kind !== 'InterfaceBlock') rel.push(`    satisfy ${v2Qual(r.tgt)} by ${v2Qual(r.src)};`); });
  R('Allocate').forEach(r => { if(E(r.src) && E(r.tgt)) rel.push(`    allocate ${v2Qual(r.src)} to ${v2Qual(r.tgt)};`); });
  R('Dependency').forEach(r => { if(E(r.src) && E(r.tgt)) rel.push(`    dependency from ${v2Qual(r.src)} to ${v2Qual(r.tgt)};`); });
  if(rel.length) out.push('', '    // ---- ilişkiler ----', ...rel);
  const V = M.variants; if(V && V.configs && V.configs.length) out.push('', '    // ---- varyantlar ----', ...V.configs.map(c => `    // konfigürasyon ${c.name}: ${V.features.filter(f => c.sel && c.sel[f.id]).map(f => f.name).join(', ') || '—'}`));
  out.push('}');
  return out.join('\n') + '\n';
}
function sysmlV2Dialog(){
  const txt = sysmlV2Text(), box = $('#modalBox'); box.style.width = 'min(980px, 96vw)'; box.style.maxWidth = 'none';
  box.innerHTML = `<h2>SysML v2 metin gösterimi</h2><p class="muted" style="margin:-4px 0 8px;font-size:12px">Modelin SysML v2 metin sözdizimine (alt küme) çevirisi: paketler, part/port/attribute tanımları, bağlantılar, gereksinimler ve doğrulamalar, aktivite ve durum makineleri, kısıtlar, ilişkiler. ${txt.split('\n').length} satır.</p><textarea readonly class="noi18n" style="width:100%;height:56vh;font:12px/1.45 Consolas,monospace;white-space:pre">${esc(txt)}</textarea>
    <p style="text-align:right;margin:10px 0 0"><button class="pbtn" id="v2Cp">Panoya kopyala</button> <button class="pbtn" id="v2Dl">Dosyaya kaydet (.txt)</button> <button class="pbtn pri" id="v2C">Kapat</button></p>`;
  $('#modal').style.display = 'flex';
  const close = () => { $('#modal').style.display = 'none'; box.style.width = ''; box.style.maxWidth = ''; box.onclick = null; };
  box.onclick = ev => { const id = ev.target.id; if(id === 'v2C') close(); if(id === 'v2Dl') download(new Blob([txt], {type:'text/plain'}), fileSafe(E(M.rootId).name) + ' - SysML v2.txt'); if(id === 'v2Cp'){ try { navigator.clipboard.writeText(txt); toast('Kopyalandı'); } catch(e){ appErr('pano', e); } } };
}
HOOKS.menu.tools.push(r => { const i = r.findIndex(x => x && x.t && /^XMI içe aktar/.test(x.t)); r.splice(i < 0 ? r.length : i + 1, 0, {t:'SysML v2 metin olarak dışa aktar…', f:sysmlV2Dialog}); });
/* ---------- örnek model: iki konfigürasyon ---------- */
DEMO_EXT.push(X => {
  const V = varM(); const fA = {id:uid(), name:'UzunMenzil', doc:'Ek sensör birimi ile genişletilmiş algılama'}, fB = {id:uid(), name:'Hafif', doc:'Kütle odaklı sürüm'};
  V.features.push(fA, fB);
  V.configs.push({id:uid(), name:'Temel', sel:{[fB.id]:true}}, {id:uid(), name:'Uzun Menzil', sel:{[fA.id]:true}});
  const sp = Object.values(M.els).find(e => e.kind === 'Part' && e.name === 'sensörBirimi'); if(sp) sp.vcond = 'UzunMenzil || !Hafif';
});
