/* ================= v1.30: ÇİZGİ ATLAMALARI, AĞAÇ STİLİ YÖNLENDİRME, DİYAGRAM KATMANLARI, SEÇMELİ BÖLME ELEMANLARI ================= */
const jumpsOn = d => !!d && d.jumps !== false && d.dtype !== 'sd';
let JUMP = null;
/* ---------- katmanlar ---------- */
const dLayers = d => (d.layers = d.layers || []);
function layerHiddenSet(d){
  const off = new Set(dLayers(d).filter(l => l.vis === false).map(l => l.id)), out = new Set();
  if(!off.size) return out;
  const byId = new Map(d.shapes.map(s => [s.id, s]));
  d.shapes.forEach(s => { let p = s, g = 0; while(p && g++ < 30){ if(p.layer && off.has(p.layer)){ out.add(s.id); return; } p = p.parent ? byId.get(p.parent) : null; } });
  return out;
}
/* ---------- ağaç stili plan: genellemeler genel tipte, kompozisyonlar bütünde birleşir ---------- */
function treePlan(d){
  const plan = new Map(); if(!d || !d.tree) return plan;
  const SM = new Map(d.shapes.map(s => [s.id, s])), groups = new Map();
  d.edges.forEach(ed => {
    const k = edgeKind(ed); if(!['Generalization', 'Composition', 'Aggregation'].includes(k) || (ed.wp && ed.wp.length) || (ed.route && ed.route !== 'ortho') || ed.s === ed.t) return;
    const hub = k === 'Generalization' ? ed.t : ed.s, key = (k === 'Generalization' ? 'G' : 'C') + '|' + hub;
    if(!groups.has(key)) groups.set(key, []); groups.get(key).push(ed);
  });
  groups.forEach((eds, key) => {
    const gen = key[0] === 'G', H = SM.get(gen ? eds[0].t : eds[0].s); if(!H) return;
    const L = eds.map(ed => SM.get(gen ? ed.s : ed.t)); if(L.some(x => !x)) return;
    const below = L.every(s => s.y >= H.y + H.h + 16), above = L.every(s => s.y + s.h <= H.y - 16);
    if(!below && !above) return;
    const hx = H.x + H.w / 2, hy = below ? H.y + H.h : H.y;
    const bus = below ? Math.round((H.y + H.h + Math.min(...L.map(s => s.y))) / 2) : Math.round((H.y + Math.max(...L.map(s => s.y + s.h))) / 2);
    eds.forEach((ed, i) => {
      const s = L[i], lx = s.x + s.w / 2, ly = below ? s.y : s.y + s.h;
      let pts = Math.abs(lx - hx) < 1 ? [{x:hx, y:ly}, {x:hx, y:hy}] : [{x:lx, y:ly}, {x:lx, y:bus}, {x:hx, y:bus}, {x:hx, y:hy}];
      if(!gen) pts = pts.reverse();
      plan.set(ed.id, pts);
    });
  });
  return plan;
}
{
  const _eg = edgeGeom;
  edgeGeom = function(S, T2, ed, ctx){
    if(ctx && ctx.d && ctx.d.tree){
      if(!ctx.treePlan) ctx.treePlan = treePlan(ctx.d);
      const p = ctx.treePlan.get(ed.id);
      if(p){ const r = p.map(q => ({x:q.x, y:q.y})); if(ctx.routed) for(let i = 0; i < r.length - 1; i++) ctx.routed.push({a:r[i], b:r[i + 1]}); return r; }
    }
    return _eg(S, T2, ed, ctx);
  };
}
/* ---------- çizgi atlamaları (köprü) ---------- */
function segX(a, b, c, e){
  const r = {x:b.x - a.x, y:b.y - a.y}, s = {x:e.x - c.x, y:e.y - c.y}, den = r.x * s.y - r.y * s.x;
  if(Math.abs(den) < 1e-9) return null;
  const t = ((c.x - a.x) * s.y - (c.y - a.y) * s.x) / den, u = ((c.x - a.x) * r.y - (c.y - a.y) * r.x) / den;
  const La = Math.hypot(r.x, r.y), Lc = Math.hypot(s.x, s.y);
  if(t * La < 7 || (1 - t) * La < 7 || u * Lc < 4 || (1 - u) * Lc < 4) return null;
  return t;
}
function jumpPath(pts, segs, R){
  let d = 'M' + pts[0].x.toFixed(1) + ',' + pts[0].y.toFixed(1), n = 0;
  for(let i = 0; i < pts.length - 1; i++){
    const a = pts[i], b = pts[i + 1], L = Math.hypot(b.x - a.x, b.y - a.y) || 1, ux = (b.x - a.x) / L, uy = (b.y - a.y) / L;
    const ts = []; segs.forEach(sg => { const t = segX(a, b, sg.a, sg.b); if(t != null) ts.push(t * L); });
    ts.sort((p, q) => p - q);
    let last = -1e9; const sw = ux > 0.01 || (Math.abs(ux) <= 0.01 && uy > 0) ? 1 : 0;
    ts.forEach(t => { if(t - last < 2 * R + 2 || t < R + 2 || t > L - R - 2) return; last = t; n++; const p1 = {x:a.x + ux * (t - R), y:a.y + uy * (t - R)}, p2 = {x:a.x + ux * (t + R), y:a.y + uy * (t + R)}; d += ` L${p1.x.toFixed(1)},${p1.y.toFixed(1)} A${R},${R} 0 0 ${sw} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`; });
    d += ` L${b.x.toFixed(1)},${b.y.toFixed(1)}`;
  }
  return {d, n};
}
/* atlama çizgileri ve katman görünürlüğü: çizim boru hattı */
DRAW.edge.push((s, d, ed, SM, pts, exp) => {
  const k = edgeKind(ed);
  if(!(JUMP && JUMP.d === d && jumpsOn(d) && pts && pts.length > 1 && !isMsg(k) && k !== 'Anchor')) return;
  const r = ed.el ? E(ed.el) : null;
  if(!(r && r.fl)){
    const dstr = 'M' + pts.map(p => p.x.toFixed(1) + ',' + p.y.toFixed(1)).join(' L');
    const J = jumpPath(pts, JUMP.segs, 5);
    if(J.n){ const i = s.indexOf(`d="${dstr}"`), j = i >= 0 ? s.indexOf(`d="${dstr}"`, i + 1) : -1; if(j >= 0) s = s.slice(0, j) + `d="${J.d}"` + s.slice(j + dstr.length + 4); else if(i >= 0 && exp) s = s.slice(0, i) + `d="${J.d}"` + s.slice(i + dstr.length + 4); }
  }
  for(let i = 0; i < pts.length - 1; i++) JUMP.segs.push({a:pts[i], b:pts[i + 1]});
  return s;
});
DRAW.diagram.push((d, exp) => {
  const prevJ = JUMP; JUMP = {d, segs:[]};
  const hid = layerHiddenSet(d), offL = new Set(dLayers(d).filter(l => l.vis === false).map(l => l.id)), done = () => { JUMP = prevJ; };
  if(!hid.size && !offL.size) return {done};
  return {shape:s => !hid.has(s.id), edge:e => !hid.has(e.s) && !hid.has(e.t) && !(e.layer && offL.has(e.layer)), done};
});
/* ---------- seçmeli bölme elemanları ---------- */
DRAW.shapeCtx.push((sh, e) => {
  if(!sh || !e || !(sh.hideEls && sh.hideEls.length)) return null;
  const H = new Set(sh.hideEls), ok = kidsOf;
  kidsOf = id => { const r = ok(id); return id === e.id ? r.filter(k => !H.has(k.id)) : r; };
  return () => { kidsOf = ok; };
});
const COMP_GROUPS = [['Part', 'parts', c => c.kind === 'Part' && !c.shared], ['Ref', 'references', c => c.kind === 'Part' && c.shared], ['Value', 'values', c => c.kind === 'Value'], ['Port', 'ports', c => c.kind === 'Port'], ['FlowProp', 'flow properties', c => c.kind === 'FlowProp'], ['Constraint', 'constraints', c => c.kind === 'ConstraintProp']];
function compElsDialog(sh){
  const e = E(sh.el); if(!e) return;
  const kids = kidsOf(e.id), H = new Set(sh.hideEls || []);
  const box = $('#modalBox'); box.style.width = 'min(560px, 94vw)'; box.style.maxWidth = 'none';
  const grp = COMP_GROUPS.map(([k, t, f]) => [t, kids.filter(f).sort(sortEls)]).filter(g => g[1].length);
  box.innerHTML = `<h2>Bölme elemanları — <span class="noi18n">${esc(e.name || '')}</span></h2><p class="muted" style="margin:-4px 0 8px;font-size:12px">Bu diyagramdaki şekilde yalnız işaretli elemanlar gösterilir; model değişmez. Bölmenin tamamını gizlemek için Özellikler → Görünüm → Bölmeler.</p>
    ${grp.length ? grp.map(([t, arr]) => `<div class="sub"><span>${esc(t)}</span><span><a class="lnk" data-cea="${esc(t)}">tümü</a> · <a class="lnk" data-cen="${esc(t)}">hiçbiri</a></span></div>${arr.map(c => `<label class="vchk" style="display:block;margin:2px 0" data-ceg="${esc(t)}"><input type="checkbox" data-ce="${c.id}"${H.has(c.id) ? '' : ' checked'}> <span class="noi18n">${esc(c.name || '')}${c.type && E(c.type) ? ' : ' + esc(E(c.type).name) : ''}</span></label>`).join('')}`).join('') : '<div class="vempty">Bu elemanın bölme elemanı yok.</div>'}
    <p style="text-align:right;margin:12px 0 0"><button class="pbtn" id="ceAll" style="float:left">Tümünü göster</button><button class="pbtn" id="ceC">Vazgeç</button> <button class="pbtn pri" id="ceO">Uygula</button></p>`;
  $('#modal').style.display = 'flex';
  const close = () => { $('#modal').style.display = 'none'; box.style.width = ''; box.style.maxWidth = ''; box.onclick = null; box.onkeydown = null; };
  box.onkeydown = ev => { ev.stopPropagation(); if(ev.key === 'Escape') close(); };
  box.onclick = ev => {
    const t = ev.target;
    if(t.dataset && (t.dataset.cea || t.dataset.cen)){ const g = t.dataset.cea || t.dataset.cen; box.querySelectorAll(`[data-ceg="${g}"] input`).forEach(i => i.checked = !!t.dataset.cea); return; }
    if(t.id === 'ceAll'){ box.querySelectorAll('[data-ce]').forEach(i => i.checked = true); return; }
    if(t.id === 'ceC') return close();
    if(t.id === 'ceO'){ snap(); const hid = [...box.querySelectorAll('[data-ce]')].filter(i => !i.checked).map(i => i.dataset.ce); if(hid.length) sh.hideEls = hid; else delete sh.hideEls; afterChange(); close(); toast(hid.length ? hid.length + ' eleman gizlendi' : 'Tüm elemanlar gösteriliyor'); }
  };
}
/* ---------- katman penceresi ---------- */
function layersDialog(){
  const d = cur(); if(!d || isView(ST.cur)) return toast('Önce bir diyagram açın');
  const box = $('#modalBox'); box.style.width = 'min(600px, 94vw)'; box.style.maxWidth = 'none';
  const cnt = id => d.shapes.filter(s => (s.layer || '') === id).length + d.edges.filter(e => (e.layer || '') === id).length;
  const draw = () => {
    const nsel = [...ST.sel].filter(id => d.shapes.some(s => s.id === id) || d.edges.some(e => e.id === id)).length;
    box.innerHTML = `<h2>Katmanlar — <span class="noi18n">${esc(d.name || '')}</span></h2><p class="muted" style="margin:-4px 0 8px;font-size:12px">Şekil ve bağlantıları katmanlara ayırın; gizli katmanlar ekranda ve dışa aktarımda görünmez (model değişmez). Seçili: ${nsel}</p>
      <table class="rt fmt"><thead><tr><th>Görünür</th><th>Katman</th><th>Eleman</th><th></th></tr></thead><tbody>
      <tr><td><input type="checkbox" checked disabled></td><td>Varsayılan</td><td>${cnt('')}</td><td style="white-space:nowrap"><button class="vb" data-ic="0" data-lmv=""${nsel ? '' : ' disabled'}>Seçilileri buraya taşı</button></td></tr>
      ${dLayers(d).map(l => `<tr><td><input type="checkbox" data-lvis="${l.id}"${l.vis === false ? '' : ' checked'}></td><td><input class="fmsel noi18n" data-lname="${l.id}" value="${esc(l.name || '')}" style="width:160px"></td><td>${cnt(l.id)}</td><td style="white-space:nowrap"><button class="vb" data-ic="0" data-lmv="${l.id}"${nsel ? '' : ' disabled'}>Seçilileri buraya taşı</button> <button class="vb" data-ic="0" data-lsel="${l.id}" title="Bu katmandaki elemanları seç">Seç</button> <button class="vb" data-ic="0" data-ldel="${l.id}" title="Katmanı sil (elemanlar varsayılana döner)">✕</button></td></tr>`).join('')}
      </tbody></table><p><button class="vb" id="lAdd">+ Katman</button></p>
      <p style="text-align:right;margin:12px 0 0"><button class="pbtn pri" id="lC">Kapat</button></p>`;
  };
  const close = () => { $('#modal').style.display = 'none'; box.style.width = ''; box.style.maxWidth = ''; box.onclick = null; box.onchange = null; box.onkeydown = null; };
  const ch = f => { snap(); f(); bump(); afterChange(); draw(); };
  draw(); $('#modal').style.display = 'flex';
  box.onkeydown = ev => { ev.stopPropagation(); if(ev.key === 'Escape') close(); };
  box.onchange = ev => {
    const t = ev.target;
    if(t.dataset.lvis){ ch(() => { const l = dLayers(d).find(x => x.id === t.dataset.lvis); if(l){ l.vis = t.checked; if(!t.checked){ const hid = layerHiddenSet(d); [...ST.sel].forEach(id => { if(hid.has(id)) ST.sel.delete(id); }); } } }); return; }
    if(t.dataset.lname){ ch(() => { const l = dLayers(d).find(x => x.id === t.dataset.lname); if(l) l.name = t.value.trim() || l.name; }); }
  };
  box.onclick = ev => {
    const t = ev.target.closest('button, input') || ev.target;
    if(t.id === 'lC') return close();
    if(t.id === 'lAdd') return ch(() => dLayers(d).push({id:uid(), name:'Katman ' + (dLayers(d).length + 1), vis:true}));
    if(t.dataset && t.dataset.lmv != null && t.tagName === 'BUTTON'){ const id = t.dataset.lmv; return ch(() => { d.shapes.forEach(s => { if(ST.sel.has(s.id)){ if(id) s.layer = id; else delete s.layer; } }); d.edges.forEach(e => { if(ST.sel.has(e.id)){ if(id) e.layer = id; else delete e.layer; } }); }); }
    if(t.dataset && t.dataset.lsel){ ST.sel = new Set(d.shapes.filter(s => s.layer === t.dataset.lsel).map(s => s.id).concat(d.edges.filter(e => e.layer === t.dataset.lsel).map(e => e.id))); renderDiagram(); renderProps(); return draw(); }
    if(t.dataset && t.dataset.ldel){ const id = t.dataset.ldel; return ch(() => { d.layers = dLayers(d).filter(l => l.id !== id); d.shapes.forEach(s => { if(s.layer === id) delete s.layer; }); d.edges.forEach(e => { if(e.layer === id) delete e.layer; }); }); }
  };
}
/* ---------- menüler ve özellikler paneli ---------- */
HOOKS.menu.layout.push(it => {
    const d = cur(); if(!d || isView(ST.cur)) return;
    it.push({h:'Çizim'});
    it.push({t:(jumpsOn(d) ? '✓ ' : '') + 'Çizgi atlamaları (kesişimde köprü)', dis:d.dtype === 'sd', f:() => { snap(); d.jumps = !jumpsOn(d); afterChange(); }});
    it.push({t:(d.tree ? '✓ ' : '') + 'Ağaç stili: genelleme / kompozisyon birleşik', dis:!['bdd', 'pkg', 'req'].includes(d.dtype) && !d.edges.some(e => ['Generalization', 'Composition', 'Aggregation'].includes(edgeKind(e))), f:() => { snap(); d.tree = !d.tree; afterChange(); }});
    const nh = dLayers(d).filter(l => l.vis === false).length;
    it.push({t:'Katmanlar…' + (dLayers(d).length ? ` (${dLayers(d).length}${nh ? ', ' + nh + ' gizli' : ''})` : ''), f:layersDialog});
});
HOOKS.props.push(function(){
    const t = typeof propTarget === 'function' ? propTarget() : {}, sh = t.sh, el = t.el, d = cur(); if(!sh || !el || !d) return;
    const P = $('#props'); let h = '';
    if(['Block', 'InterfaceBlock'].includes(el.kind)){ const n = (sh.hideEls || []).length; h += `<div class="pf"><label>Bölme elemanları</label><div><button class="pbtn" data-compels="1">Elemanları seç…</button>${n ? ` <span class="muted">${n} gizli</span>` : ''}</div></div>`; }
    if(dLayers(d).length) h += `<div class="pf"><label>Katman</label><div><select data-shlayer="1"><option value="">Varsayılan</option>${dLayers(d).map(l => `<option value="${l.id}"${sh.layer === l.id ? ' selected' : ''}>${esc(l.name)}</option>`).join('')}</select></div></div>`;
    if(!h) return;
    const ks = [...P.querySelectorAll('.sub')].find(x => /Görünüm|Appearance/.test(x.textContent));
    if(ks){ let n = ks.nextElementSibling; while(n && !n.classList.contains('sub') && n.nextElementSibling && !n.nextElementSibling.classList.contains('sub')) n = n.nextElementSibling; (n || ks).insertAdjacentHTML('afterend', h); }
    else P.insertAdjacentHTML('beforeend', `<div class="sub"><span>Görünüm</span></div>` + h);
  });
(() => {
  const P = $('#props');
  P.addEventListener('click', ev => { const b = ev.target.closest('[data-compels]'); if(!b) return; const t = propTarget(); if(t && t.sh) compElsDialog(t.sh); });
  P.addEventListener('change', ev => { const t = ev.target; if(!t.dataset || !t.dataset.shlayer) return; const p = propTarget(); if(!p || !p.sh) return; snap(); if(t.value) p.sh.layer = t.value; else delete p.sh.layer; afterChange(); });
})();
/* örnek model: sistem yapısında ağaç stili ve köprüler; bir katman */
DEMO_EXT.push(X => {
  const d = Object.values(M.els).find(e => e.kind === 'Diagram' && e.dtype === 'bdd' && e.name === 'Sistem Yapısı');
  if(d){
    try { diagramSVG(d, true); } catch(e){ appErr('210:188', e); }
    const hub = d.shapes.find(s => E(s.el) && E(s.el).name === 'Araç Sistemi');
    if(hub){ const leaves = d.edges.filter(ed => edgeKind(ed) === 'Composition' && ed.s === hub.id).map(ed => d.shapes.find(s => s.id === ed.t)).filter(Boolean); const y = snapv(hub.y + hub.h + 70); leaves.forEach(s => { if(s.y < y) s.y = y; }); }
    d.tree = true; }
});

