/* ================= v1.36: KANCA KAYITLARI (genişletme noktaları) =================
   Modüller çekirdek fonksiyonları zincirleme sarmak yerine buraya kayıt olur:
   HOOKS.props  — Özellikler paneli çizildikten sonra: f(target, panel)
   HOOKS.menu.X — menü öğeleri listesi üretildikten sonra: f(items)  (X: tools, analysis, layout, req)
   Her kanca ayrı try/catch içinde çalışır; hata bir modülü bozsa da diğerleri çalışır. */
const HOOKS = {props:[], menu:{tools:[], analysis:[], layout:[], req:[]}};
/* açılış tamamlandığında: f({native, argText, argPath, autosave, lastPath, dirty}) */
const BOOT_HOOKS = [];
/* durum çubuğu çizildikten sonra: f(statusEl) · simülasyon çubuğu çizildikten sonra (görünür ve SIM varken): f(bar) */
const STATUS_HOOKS = [], SIMBAR_HOOKS = [];
function appErr(where, e){ try { (window.APP_ERRS = window.APP_ERRS || []).push({t:new Date().toISOString(), where, msg:String(e && e.message || e), stack:String(e && e.stack || '').split('\n').slice(0, 3).join(' | ')}); if(window.APP_ERRS.length > 200) window.APP_ERRS.shift(); console.warn('[' + where + ']', e); } catch(_){} }
function runHooks(list, where, args){ list.forEach((h, i) => { try { h.apply(null, args); } catch(e){ appErr(where + '#' + i, e); } }); }
{
  const _rp0 = renderProps;
  renderProps = function(){ _rp0.apply(this, arguments); const t = typeof propTarget === 'function' ? propTarget() : {}; runHooks(HOOKS.props, 'props', [t || {}, $('#props')]); };
  [['tools', 'toolsMenuItems'], ['analysis', 'analysisMenuItems'], ['layout', 'layoutMenuItems'], ['req', 'reqMenuItems']].forEach(([k, fn]) => {
    const orig = window[fn] || eval(fn);
    const w = function(){ const r = orig.apply(this, arguments); runHooks(HOOKS.menu[k], 'menu.' + k, [r]); return r; };
    if(fn === 'toolsMenuItems') toolsMenuItems = w; else if(fn === 'analysisMenuItems') analysisMenuItems = w; else if(fn === 'reqMenuItems') reqMenuItems = w; else layoutMenuItems = w;
  });
}

/* ================= v1.52: ÇİZİM BORU HATTI =================
   Modüller diagramSVG0 / drawShape / drawEdge fonksiyonlarını sarmak yerine buraya kayıt olur. Sıra: kayıt sırası.
   DRAW.diagram  — diyagram çizimi başlarken: f(d, exp) → null | {shape:s => göster?, edge:ed => göster?, done:() => temizlik}
                   (gizlenen şeklin kenarları kendiliğinden çizilmez)
   DRAW.shapeCtx — şekil çizilmeden önce: f(sh, e, d, SM, exp) → null | temizlik fonksiyonu (ör. geçici kidsOf süzgeci)
   DRAW.shape    — şekil çıktısı üzerinde: f(str, sh, e, d, SM, exp) → yeni str (undefined: değişmez)
   DRAW.edge     — kenar çıktısı üzerinde: f(str, d, ed, SM, pts, exp) → yeni str (undefined: değişmez) */
const DRAW = {diagram:[], shapeCtx:[], shape:[], edge:[]};
function drawShape(sh, e, d, SM, exp){
  const undo = []; DRAW.shapeCtx.forEach(h => { const u = h(sh, e, d, SM, exp); if(typeof u === 'function') undo.push(u); });
  try { let s = drawShapeCore(sh, e, d, SM, exp); DRAW.shape.forEach(h => { const r = h(s, sh, e, d, SM, exp); if(r != null) s = r; }); return s; }
  finally { for(let i = undo.length - 1; i >= 0; i--) undo[i](); }
}
function drawEdge(d, ed, SM, pts, exp){ let s = drawEdgeCore(d, ed, SM, pts, exp); DRAW.edge.forEach(h => { const r = h(s, d, ed, SM, pts, exp); if(r != null) s = r; }); return s; }
function diagramSVG0(d, exp){
  const R = DRAW.diagram.map(h => h(d, exp)).filter(Boolean), fs = R.filter(r => r.shape), fe = R.filter(r => r.edge);
  const S0 = d.shapes, E0 = d.edges;
  if(fs.length) d.shapes = S0.filter(s => fs.every(r => r.shape(s)));
  if(fe.length) d.edges = E0.filter(x => fe.every(r => r.edge(x)));
  try { return diagramSVG0Core(d, exp); }
  finally { d.shapes = S0; d.edges = E0; for(let i = R.length - 1; i >= 0; i--) if(R[i].done) R[i].done(); }
}
