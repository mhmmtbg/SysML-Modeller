/* ================= v1.36: KANCA KAYITLARI (genişletme noktaları) =================
   Modüller çekirdek fonksiyonları zincirleme sarmak yerine buraya kayıt olur:
   HOOKS.props  — Özellikler paneli çizildikten sonra: f(target, panel)
   HOOKS.menu.X — menü öğeleri listesi üretildikten sonra: f(items)  (X: tools, analysis, layout)
   Her kanca ayrı try/catch içinde çalışır; hata bir modülü bozsa da diğerleri çalışır. */
const HOOKS = {props:[], menu:{tools:[], analysis:[], layout:[]}};
function appErr(where, e){ try { (window.APP_ERRS = window.APP_ERRS || []).push({t:new Date().toISOString(), where, msg:String(e && e.message || e), stack:String(e && e.stack || '').split('\n').slice(0, 3).join(' | ')}); if(window.APP_ERRS.length > 200) window.APP_ERRS.shift(); console.warn('[' + where + ']', e); } catch(_){} }
function runHooks(list, where, args){ list.forEach((h, i) => { try { h.apply(null, args); } catch(e){ appErr(where + '#' + i, e); } }); }
{
  const _rp0 = renderProps;
  renderProps = function(){ _rp0.apply(this, arguments); const t = typeof propTarget === 'function' ? propTarget() : {}; runHooks(HOOKS.props, 'props', [t || {}, $('#props')]); };
  [['tools', 'toolsMenuItems'], ['analysis', 'analysisMenuItems'], ['layout', 'layoutMenuItems']].forEach(([k, fn]) => {
    const orig = window[fn] || eval(fn);
    const w = function(){ const r = orig.apply(this, arguments); runHooks(HOOKS.menu[k], 'menu.' + k, [r]); return r; };
    if(fn === 'toolsMenuItems') toolsMenuItems = w; else if(fn === 'analysisMenuItems') analysisMenuItems = w; else layoutMenuItems = w;
  });
}
