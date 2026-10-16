/* Tarayıcısız birim testi ortamı: uygulama betiğini Node vm içinde, her DOM erişimini yutan sahte nesnelerle çalıştırır.
   Böylece motor fonksiyonları (ifade, parametrik, bütçe, metachain, takvim, Monte Carlo…) DOM olmadan test edilir. */
const fs = require('fs'), vm = require('vm'), path = require('path');
function nullObj(){
  const f = function(){ return P; };
  const P = new Proxy(f, {
    get(t, k){
      if(k === Symbol.toPrimitive) return () => '';
      if(k === Symbol.iterator) return function*(){};
      if(k === 'length') return 0;
      if(k === 'then') return undefined;
      if(k === 'style' || k === 'dataset') return {};
      if(k === 'classList') return {add(){}, remove(){}, toggle(){}, contains(){ return false; }};
      if(k === 'getBoundingClientRect') return () => ({x:0, y:0, width:1200, height:800, left:0, top:0, right:1200, bottom:800});
      if(k === 'closest') return () => null;
      if(k === 'querySelector') return () => P;
      if(k === 'querySelectorAll' || k === 'getElementsByTagName') return () => [];
      if(k === 'getContext') return () => ({measureText:s => ({width:String(s).length * 7}), fillText(){}, fillRect(){}, drawImage(){}});
      return P;
    },
    set(){ return true; }, apply(){ return P; }, construct(){ return P; }
  });
  return P;
}
function load(){
  const html = fs.readFileSync(path.join(__dirname, '../app/sysml-modeler.html'), 'utf8');
  const a = html.indexOf('<script>\n') + 9, b = html.lastIndexOf('</script>');
  const N = nullObj(), store = new Map();
  const doc = new Proxy({}, {get(t, k){ if(k === 'querySelector' || k === 'getElementById') return () => N; if(k === 'querySelectorAll') return () => []; if(k === 'createElement') return () => nullObj(); if(k === 'documentElement' || k === 'body' || k === 'head') return N; return N; }});
  const ctx = {console:{log(){}, warn(){}, info(){}, error(){}}, document:doc, navigator:{userAgent:'node', clipboard:N}, location:{href:'file:///test', search:''},
    localStorage:{getItem:k => store.has(k) ? store.get(k) : null, setItem:(k, v) => store.set(k, String(v)), removeItem:k => store.delete(k)},
    MutationObserver:function(){ return {observe(){}, disconnect(){}}; }, ResizeObserver:function(){ return {observe(){}, disconnect(){}}; },
    requestAnimationFrame:f => 0, cancelAnimationFrame(){}, setTimeout:() => 0, clearTimeout(){}, setInterval:() => 0, clearInterval(){},
    getComputedStyle:() => N, matchMedia:() => ({matches:false, addEventListener(){}}), addEventListener(){}, removeEventListener(){},
    Image:function(){ return N; }, Blob:function(p, o){ this.parts = p; this.type = o && o.type; }, URL:{createObjectURL:() => 'blob:x', revokeObjectURL(){}},
    TextEncoder, TextDecoder, DOMParser:function(){ return {parseFromString:() => N}; }, XMLSerializer:function(){ return {serializeToString:() => ''}; },
    performance:{now:() => Date.now()}, queueMicrotask:f => Promise.resolve().then(f), alert(){}, confirm:() => true, prompt:() => null, print(){}, getSelection:() => N, open:() => N, CSS:{escape:s => s}, innerWidth:1600, innerHeight:1000};
  ctx.window = ctx; ctx.self = ctx; ctx.globalThis = ctx;
  vm.createContext(ctx);
  vm.runInContext(html.slice(a, b), ctx, {filename:'sysml-modeler.js'});
  ctx.__run = (fn, arg) => vm.runInContext('(' + fn.toString() + ')(' + JSON.stringify(arg === undefined ? null : arg) + ')', ctx);
  return ctx;
}
module.exports = {load};
