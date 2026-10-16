/* ================= v1.50: SADELİK — TEMEL / UZMAN GÖRÜNÜM, MENÜ DENETİMİ, ÖZELLİKLERDE "GELİŞMİŞ" =================
   Temel görünüm yeni kullanıcı için varsayılandır: ileri düzey komutlar menülerden, ileri düzey öğeler paletten gizlenir,
   Özellikler panelindeki ikincil bölümler "Gelişmiş" altında katlanır. Komut paleti (Ctrl+K) her iki görünümde de tüm komutları bulur.
   Tercih kullanıcı başına (tarayıcı / bilgisayar) hatırlanır; model dosyasına yazılmaz. */
const UI_MODE = { get(){ try { return localStorage.getItem('sysml-mod') || 'temel'; } catch(e){ return 'temel'; } }, set(v){ try { localStorage.setItem('sysml-mod', v); } catch(e){ appErr('mode', e); } } };
const isBasic = () => UI_MODE.get() === 'temel';
let MENU_FULL = false;
/* ---------- menü: yinelenenler, Temel süzgeci, son gruplama ---------- */
const MENU_DUP = { /* aynı komutun ikinci kopyası: hangi menüde kalacağı yorumda */
  tools:/^ReqIF olarak dışa aktar \(DOORS|^ReqIF \/ Excel'den gereksinim aktar/,   /* → Gereksinimler › İçe / dışa aktarma */
  analysis:/^MagicGrid mimari panosu/                                               /* → Araçlar › Modelleme yardımcıları */
};
const MENU_ADV = {
  tools:/MagicGrid paket iskeleti|Yeni akıllı paket|View dokümanı|^İnceleme notları$|İnceleme notlarını içe|Etkileşimli inceleme paketi|SysML v2|ARES|[Mm]odül|kütüphanesini ekle|^MagicGrid mimari panosu|Hata günlüğü|Dosya denetim geçmişi|Başka modeli birleştir/,
  analysis:/Trade study|Duyarlılık|Monte Carlo|Varyant|Zaman diyagramı|Genel tablo|Örneklem|İlişki haritası/,
  req:/Sütunlar ve özellikler|Kullanıcı adım|ARES|Türetme karşılaştırma|Değişiklik geçmişi|Yeni gereksinim diyagramı|Çoklu isterleri böl|^Excel'e aktar \(VCRM|^Excel'den test durumu/, /* VCRM ve test görünüm çubuklarında, ağaçta ve Özellikler panelinde de bulunur */
  layout:/^$/
};
function menuFinal(k, r){
  if(MENU_DUP[k]) for(let i = r.length - 1; i >= 0; i--) if(r[i] && r[i].t && MENU_DUP[k].test(r[i].t)) r.splice(i, 1);
  if(typeof regroupMenu === 'function' && MENU_GROUPS[k]) regroupMenu(r, MENU_GROUPS[k]);
  if(!MENU_FULL && isBasic() && MENU_ADV[k]){
    for(let i = r.length - 1; i >= 0; i--) if(r[i] && r[i].t && MENU_ADV[k].test(r[i].t)) r.splice(i, 1);
    for(let i = r.length - 1; i >= 0; i--) if(r[i] && r[i].h && (i === r.length - 1 || (r[i + 1] && r[i + 1].h) || r[i + 1] === '-')) r.splice(i, 1);
  }
  if(k === 'tools'){ const g = r.findIndex(x => x && x.h === 'Görünüm ve erişilebilirlik'); const it = {t:isBasic() ? 'Uzman görünüme geç (tüm komutlar)' : 'Temel görünüme geç (sade menüler)', f:toggleMode}; if(g >= 0) r.splice(g + 1, 0, it); else r.push(it); }
  return r;
}
['tools', 'analysis', 'req', 'layout'].forEach(k => HOOKS.menu[k].push(r => menuFinal(k, r)));
if(typeof MENU_GROUPS !== 'undefined'){
  MENU_GROUPS.tools.cls.unshift(['Model kalitesi', /Yedekten geri yükle/], ['Değişim formatları (ReqIF, XMI, SysML v2)', /ARES/], ['Görünüm ve erişilebilirlik', /görünüme geç/]);
  MENU_GROUPS.req.cls.unshift(['Gereksinimler', /kapsama haritası|Çoklu isterleri|Türetme karşılaştırma|türetme sihirbazı/i], ['İçe / dışa aktarma', /ARES önerilerini/]);
}
/* komut paleti ve iş akışı merkezi her zaman tüm komutları görür */
{ const _pi = paletteItems; paletteItems = function(){ MENU_FULL = true; try { return _pi.apply(this, arguments); } finally { MENU_FULL = false; } };
  if(typeof menuFind === 'function'){ const _mf = menuFind; menuFind = function(){ MENU_FULL = true; try { return _mf.apply(this, arguments); } finally { MENU_FULL = false; } }; } }
/* ---------- palet: ileri düzey öğeler ---------- */
const PAL_ADV = new Set(['Instance', 'Viewpoint', 'View', 'Conform', 'Expose', 'PartitionH', 'IRegion', 'History', 'Junction', 'StateInv', 'DurCons', 'TimeCons']);
{
  const _rp = renderPalette;
  renderPalette = function(){
    const d = !isView(ST.cur) && cur(); if(!d || !isBasic() || !DT[d.dtype]) return _rp.apply(this, arguments);
    const t = DT[d.dtype], s0 = t.shapes, r0 = t.rels; t.shapes = s0.filter(k => !PAL_ADV.has(k)); t.rels = r0.filter(k => !PAL_ADV.has(k));
    try { return _rp.apply(this, arguments); } finally { t.shapes = s0; t.rels = r0; }
  };
}
/* ---------- Özellikler: ikincil bölümler "Gelişmiş" altında ---------- */
const PROP_ADV = /^(İkon|İkon rengi|Gösterim|Bu bloğu tip olarak kullananlar|Alt diyagramlar|Bağlı diyagram|Gösterildiği diyagramlar|Görünüm|Dolgu|Çizgi rengi|Bölmeler|Konum\/Boyut|Sürekli dinamik|Bölme elemanları|Simülasyon kısıtı|Kullanıldığı yerler|Stil|Yazı boyutu|Çerçeve|Diyagram görünümü|Katmanlar)/;
let PROP_ADV_OPEN = false;
HOOKS.props.push((t, P) => {
  if(!isBasic() || !P || (typeof bulkTargets === 'function' && bulkTargets())) return;
  const kids = [...P.children], groups = []; let g = null;
  kids.forEach(c => {
    const head = c.matches('.sub, details.wu') || (c.matches('.pf') && !g);
    if(c.matches('.sub, details.wu')){ g = {head:c, items:[c]}; groups.push(g); }
    else if(c.matches('.pf') && (!g || !g.head.matches('.sub'))){ groups.push({head:c, items:[c]}); g = null; }
    else if(g) g.items.push(c); else groups.push({head:c, items:[c]});
  });
  const label = x => { const l = x.matches('details') ? x.querySelector('summary') : x.querySelector('label, span'); return (l ? l.textContent : x.textContent).trim(); };
  const adv = groups.filter(gr => { if(!gr.head.matches('.sub, .pf, details.wu')) return false; const tx = label(gr.head); if(!PROP_ADV.test(tx)) { if(/^Varyant koşulu/.test(tx)){ const i = gr.head.querySelector('input'); return !(i && i.value.trim()); } return false; } return true; });
  if(!adv.length) return;
  const det = document.createElement('details'); det.className = 'advp'; det.open = PROP_ADV_OPEN;
  det.innerHTML = `<summary>Gelişmiş <span class="muted">(${adv.length})</span></summary>`; det.addEventListener('toggle', () => { PROP_ADV_OPEN = det.open; });
  const notes = [...P.children].find(c => c.matches('.sub') && /^İnceleme notları/.test(label(c)));
  adv.forEach(gr => gr.items.forEach(x => det.appendChild(x)));
  if(notes) P.insertBefore(det, notes); else P.appendChild(det);
});
/* ---------- araç çubuğu ve görünüm düğmesi ---------- */
function applyMode(){
  const b = isBasic(); document.body.classList.toggle('mode-temel', b);
  const btn = document.querySelector('#toolbar [data-act="uimode"]'); if(btn){ btn.lastChild.nodeValue = b ? ' Temel' : ' Uzman'; btn.title = b ? 'Temel görünüm: sade menüler ve palet. Tıklayınca Uzman görünüme geçer (tüm komutlar).' : 'Uzman görünüm: tüm komutlar. Tıklayınca Temel görünüme geçer.'; }
}
function toggleMode(){ UI_MODE.set(isBasic() ? 'uzman' : 'temel'); applyMode(); hideMenu(); renderAll(); toast(isBasic() ? 'Temel görünüm: ileri düzey komutlar gizlendi (Ctrl+K hepsini bulur)' : 'Uzman görünüm: tüm komutlar gösteriliyor'); }
ACT.uimode = toggleMode;
{
  const help = document.querySelector('#toolbar [data-act="help"]');
  if(help && !document.querySelector('#toolbar [data-act="uimode"]')){ help.insertAdjacentHTML('afterend', '<button data-act="uimode"> Temel</button>'); if(typeof TB_IC !== 'undefined') TB_IC.uimode = 'layers'; if(typeof decorateToolbar === 'function') decorateToolbar(); }
  const css = document.createElement('style');
  css.textContent = `body.mode-temel #toolbar [data-act="painter"],body.mode-temel #toolbar [data-act="iconMenu"],body.mode-temel #toolbar [data-act="mini"]{display:none}
details.advp{margin:10px 0 4px;border-top:1px solid #d5dbe3;padding-top:6px}details.advp>summary{cursor:pointer;font-weight:600;color:#3d5070;padding:3px 0;list-style-position:inside}details.advp[open]>summary{margin-bottom:6px}
body.dark details.advp{border-color:#3b4b60}body.dark details.advp>summary{color:#c7d0dc}`;
  document.head.appendChild(css);
  applyMode();
}
/* gizlilik rozeti Temel görünümde yalnız işaretliyse görünür */
STATUS_HOOKS.push(() => { const s = document.querySelector('#toolbar .secbadge, #secBadge'); if(s) s.style.display = isBasic() && !(typeof secLabel === 'function' && secLabel()) ? 'none' : ''; });
/* ilk kez Temel görünüm açıldığında bir kez bilgi */
BOOT_HOOKS.push(() => { let seen = '1'; try { seen = localStorage.getItem('sysml-mod-bilgi'); localStorage.setItem('sysml-mod-bilgi', '1'); } catch(e){ appErr('modinfo', e); } if(!seen && isBasic()) setTimeout(() => toast('Temel görünüm açık: ileri düzey komutlar gizli — sağ üstteki "Temel" düğmesiyle Uzman görünüme geçebilirsiniz'), 1500); });
if(typeof UI_RULES !== 'undefined') UI_RULES.unshift([/görünüme geç/i, 'layers']);
/* tanıtım turuna görünüm düğmesi adımı */
if(typeof TOUR !== 'undefined'){ const i = TOUR.findIndex(x => x.s === '[data-act="workflow"]'); TOUR.splice(i < 0 ? 1 : i + 1, 0, {s:'[data-act="uimode"]', t:'Temel / Uzman görünüm', x:'Temel görünümde menüler ve palet sade tutulur, Özellikler panelindeki ikincil alanlar <b>Gelişmiş</b> altında katlanır. Tüm komutlar için bu düğmeyle Uzman görünüme geçin; Ctrl+K komut paleti her iki görünümde de her komutu bulur.'}); }
