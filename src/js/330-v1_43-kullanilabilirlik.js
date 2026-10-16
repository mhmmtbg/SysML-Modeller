/* ================= v1.43: KULLANILABİLİRLİK — GÖREV ODAKLI MENÜLER, İŞ AKIŞI, TANITIM TURU, ERİŞİLEBİLİRLİK ================= */
/* ---------- görev odaklı menü düzeni ----------
   Menü öğeleri başlıklar altında iş akışına göre gruplanır. Sınıflandırma sırası (cls) ile görüntü sırası (show) ayrıdır;
   bilinmeyen öğeler "Diğer" altında kalır, böylece yeni modüllerin eklediği öğeler kaybolmaz. */
const MENU_GROUPS = {
  tools:{cls:[
    ['Değişim formatları (ReqIF, XMI, SysML v2)', /ReqIF|XMI|SysML v2/],
    ['Rapor ve doküman', /Rapor oluştur|Doküman şablon|View dokümanı/],
    ['İnceleme, paylaşım ve güvenlik', /İnceleme|inceleme|Kapsamlı|Gizlilik/],
    ['Model kalitesi', /Model doğrulama|Hata günlüğü|Dosya denetim/],
    ['Birleştirme ve karşılaştırma', /birleştir|karşılaştır/i],
    ['Ekip çalışması (modüller)', /[Mm]odül/],
    ['Kütüphaneler ve şablonlar', /Şablon ekle|kütüphane/i],
    ['Modelleme yardımcıları', /arayüz bağla|MagicGrid|Bul ve değiştir|IBD|Bağlam diyagramı|akıllı paket/i],
    ['Görünüm ve erişilebilirlik', /kontrast|Tanıtım turu|Klavye kısayol|İş akışı/i]],
    show:['Modelleme yardımcıları', 'Model kalitesi', 'Rapor ve doküman', 'İnceleme, paylaşım ve güvenlik', 'Birleştirme ve karşılaştırma', 'Değişim formatları (ReqIF, XMI, SysML v2)', 'Ekip çalışması (modüller)', 'Kütüphaneler ve şablonlar', 'Görünüm ve erişilebilirlik']},
  analysis:{cls:[
    ['Hesap ve bütçe', /Parametrik|Bütçe/],
    ['Tasarım uzayı ve ürün ailesi', /Trade|Duyarlılık|Monte|Varyant/],
    ['Çevre ve test profilleri', /Test profilleri/],
    ['Güvenilirlik ve risk', /FMEA|Risk/],
    ['Simülasyon', /Simülasyon|Zaman diyagramı/],
    ['Mimari ve arayüzler', /MagicGrid|N²|ICD|Arayüz kontrol|Durum geçiş/],
    ['Tablolar ve matrisler', /Tahsis|Genel tablo|Örneklem|İlişki haritası/]],
    show:['Mimari ve arayüzler', 'Hesap ve bütçe', 'Tasarım uzayı ve ürün ailesi', 'Simülasyon', 'Güvenilirlik ve risk', 'Çevre ve test profilleri', 'Tablolar ve matrisler']},
  req:{cls:[
    ['Doğrulama ve test', /VCRM|[Tt]est|NCR|Uygunsuzluk|numune|Ölçüm/],
    ['Konfigürasyon yönetimi', /Kalite raporu|Taban çizgi|Değişiklik geçmişi|Kullanıcı adım/],
    ['İçe / dışa aktarma', /aktar|ReqIF|Şartname/],
    ['Gereksinimler', /./]],
    show:['Gereksinimler', 'İçe / dışa aktarma', 'Doğrulama ve test', 'Konfigürasyon yönetimi']}
};
function regroupMenu(items, G){
  const real = items.filter(x => x && x !== '-' && !x.h && x.t), skip = items.filter(x => x && x.h && !real.length);
  if(!real.length) return skip.length ? items : items;
  const buckets = new Map(G.show.map(h => [h, []])), other = [];
  real.forEach(it => { const g = G.cls.find(([, re]) => re.test(it.t)); if(g){ if(!buckets.has(g[0])) buckets.set(g[0], []); buckets.get(g[0]).push(it); } else other.push(it); });
  const out = []; buckets.forEach((arr, h) => { if(arr.length) out.push({h}, ...arr); }); if(other.length) out.push({h:'Diğer'}, ...other);
  items.length = 0; out.forEach(x => items.push(x)); return items;
}
HOOKS.menu.tools.push(r => r.push({t:'İş akışı (MBSE adımları)…', f:workflowHub}, {t:'Tanıtım turu', f:() => tourStart(0)}, {t:'Klavye kısayolları…', f:shortcutsDialog}, {t:'Yüksek kontrast ' + (document.body.classList.contains('hc') ? '(açık)' : '(kapalı)'), f:() => applyContrast(!document.body.classList.contains('hc'), true)}));
['tools', 'analysis', 'req'].forEach(k => HOOKS.menu[k].push(r => regroupMenu(r, MENU_GROUPS[k])));
/* ---------- iş akışı merkezi (MBSE adımları) ---------- */
function menuFind(re){ const all = [].concat(reqMenuItems(), analysisMenuItems(), toolsMenuItems()); return all.find(x => x && x.t && re.test(x.t)) || null; }
const WF_STEPS = [
  {n:'1', t:'Gereksinimleri topla', d:'Paydaş ve sistem gereksinimlerini girin, şartnameden veya Excel/ReqIF\'ten aktarın, türetme ilişkilerini kurun.', k:() => Object.values(M.els).filter(e => e.kind === 'Requirement').length + ' gereksinim',
    a:[['Gereksinim tablosu', /^Gereksinim tablosu/], ['Şartnameden çıkar…', /Şartnameden/], ['Excel\'den aktar…', /^Excel'den gereksinim/]]},
  {n:'2', t:'Mimariyi tasarla', d:'MagicGrid panosuyla problem ve çözüm alanını kurun; blokları, part\'ları, portları ve arayüzleri tanımlayın.', k:() => Object.values(M.els).filter(e => e.kind === 'Block').length + ' blok, ' + Object.values(M.els).filter(e => e.kind === 'Connector').length + ' bağlantı',
    a:[['MagicGrid panosu', /^MagicGrid mimari panosu/], ['Hızlı arayüz bağla…', /Hızlı arayüz/], ['N² arayüz matrisi', /N²/], ['ICD', /Arayüz kontrol/]]},
  {n:'3', t:'Davranışı modelle', d:'Kullanım durumları, aktiviteler ve durum makineleriyle sistemin ne yaptığını tanımlayın; fonksiyonları yapıya tahsis edin.', k:() => Object.values(M.els).filter(e => ['Activity', 'StateMachine', 'UseCase'].includes(e.kind)).length + ' davranış',
    a:[['Tahsis matrisi', /^Tahsis matrisi/], ['Simülasyon', /Simülasyon başlat|Simülasyonu kapat/], ['Durum geçiş tablosu', /Durum geçiş/]]},
  {n:'4', t:'Analiz et ve karar ver', d:'Parametrik hesap, bütçe, trade study, Monte Carlo ve varyant karşılaştırmasıyla tasarım kararlarını gerekçelendirin; FMEA ve risk kaydını tutun.', k:() => { const v = M.variants; return (v && v.configs ? v.configs.length : 0) + ' konfigürasyon'; },
    a:[['Bütçe analizi', /^Bütçe/], ['Trade study', /^Trade study/], ['Varyantlar', /^Varyantlar/], ['FMEA', /^FMEA/]]},
  {n:'5', t:'Doğrula', d:'Test durumlarını gereksinimlere bağlayın, VCRM\'i izleyin, ölçüm verisini değerlendirip kapanış raporunu üretin.', k:() => { const r = Object.values(M.els).filter(e => e.kind === 'Requirement'), v = r.filter(x => Object.values(M.els).some(y => y.kind === 'Verify' && y.tgt === x.id)); return v.length + ' / ' + r.length + ' gereksinim doğrulamaya bağlı'; },
    a:[['VCRM', /VCRM\)?$|^Doğrulama matrisi/], ['Ölçüm ve kapanış', /^Ölçüm değerlendirme/], ['Şüpheli bağlantılar', /^Şüpheli/], ['Model doğrulama', /^Model doğrulama/]]},
  {n:'6', t:'Paylaş ve yönet', d:'Rapor ve inceleme paketi üretin, taban çizgisi alın, gizlilik derecesini ve kapsamlı dışa aktarmayı kullanın.', k:() => ((M.baselines || []).length || 0) + ' taban çizgisi',
    a:[['Rapor oluştur…', /^Rapor oluştur/], ['İnceleme paketi…', /^Etkileşimli inceleme/], ['Taban çizgileri', /^Taban çizgi/], ['SysML v2 metni…', /SysML v2/]]}
];
function workflowHub(){
  const box = $('#modalBox'); box.style.width = 'min(900px, 96vw)'; box.style.maxWidth = 'none';
  box.innerHTML = `<h2>İş akışı — MBSE adımları</h2><p class="muted" style="margin:-4px 0 10px;font-size:12px">Ne yapmak istediğinizi seçin; ilgili görünüm veya pencere açılır. Sayılar bu modeldeki ilerlemeyi gösterir.</p>
    <div class="wfgrid">${WF_STEPS.map((s, i) => `<div class="wfcard"><div class="wfh"><span class="wfn">${s.n}</span><b>${esc(s.t)}</b><span class="wfk">${esc((() => { try { return s.k(); } catch(e){ return ''; } })())}</span></div><div class="wfd">${esc(s.d)}</div><div class="wfa">${s.a.map(([l, re], j) => `<button class="vb" data-wf="${i}|${j}"${menuFind(re) ? '' : ' disabled'}>${esc(l)}</button>`).join(' ')}</div></div>`).join('')}</div>
    <p style="text-align:right;margin:12px 0 0"><button class="pbtn" id="wfTour">Tanıtım turu</button> <button class="pbtn pri" id="wfC">Kapat</button></p>`;
  $('#modal').style.display = 'flex';
  box.onclick = ev => { const b = ev.target.closest('button'); if(!b) return; if(b.id === 'wfC'){ $('#modal').style.display = 'none'; return; } if(b.id === 'wfTour'){ $('#modal').style.display = 'none'; tourStart(0); return; }
    if(b.dataset.wf){ const [i, j] = b.dataset.wf.split('|').map(Number), it = menuFind(WF_STEPS[i].a[j][1]); $('#modal').style.display = 'none'; box.onclick = null; if(it) it.f(); } };
}
ACT.workflow = workflowHub;
{
  const tb = document.querySelector('#toolbar [data-act="reqMenu"]');
  if(tb && !document.querySelector('#toolbar [data-act="workflow"]')){ tb.insertAdjacentHTML('beforebegin', '<button data-act="workflow" title="İş akışı: MBSE adımlarına göre görevler (gereksinim → mimari → davranış → analiz → doğrulama → paylaşım)">İş akışı</button>'); if(typeof TB_IC !== 'undefined') TB_IC.workflow = 'compass'; if(typeof decorateToolbar === 'function') decorateToolbar(); }
}
/* ---------- tanıtım turu ---------- */
const TOUR = [
  {s:'#toolbar', t:'Araç çubuğu', x:'Dosya işlemleri (Yeni, Aç, Kaydet), geri al / yinele, yakınlaştırma ve menüler buradadır. Model tarayıcıda yerel olarak saklanır; <b>Kaydet</b> ile dosyaya yazın.'},
  {s:'[data-act="workflow"]', t:'İş akışı', x:'Nereden başlayacağınızı bilmiyorsanız buraya tıklayın: gereksinim → mimari → davranış → analiz → doğrulama → paylaşım adımlarının her biri için ilgili araçlar tek yerde.'},
  {s:'#left', t:'Model ağacı ve Özellikler', x:'Tüm model elemanları paketler halinde burada. Bir elemanı seçince altta <b>Özellikler</b> paneli açılır; ad, tip, değer, varyant koşulu gibi alanlar buradan düzenlenir. Sağ tıkla yeni eleman ve diyagram eklenir.'},
  {s:'#palette', t:'Palet', x:'Açık diyagram türüne uygun elemanlar ve ilişkiler. Bir öğeyi seçip tuvale tıklayın; ilişki çizmek için şekilden şekle sürükleyin.'},
  {s:'#canvasWrap', t:'Diyagram tuvali', x:'Şekilleri sürükleyin, çift tıklayıp yeniden adlandırın. Seçili şeklin yanındaki <b>+</b> manipülatörü hızlıca bağlı eleman ekler. Tekerlek ile yakınlaştırın, boşlukta sürükleyerek kaydırın.'},
  {s:'[data-act="reqMenu"]', t:'Gereksinimler', x:'Gereksinim tablosu, izlenebilirlik ve kapsama, VCRM, test kampanyası, ölçüm değerlendirme ve taban çizgileri.'},
  {s:'[data-act="analysisMenu"]', t:'Analiz', x:'Parametrik hesap, bütçe, trade study, Monte Carlo, varyantlar, simülasyon, FMEA ve tablolar.'},
  {s:'[data-act="toolsMenu"]', t:'Araçlar', x:'Model doğrulama ve otomatik onarım, raporlar, inceleme paketi, XMI / ReqIF / SysML v2 değişimi, kütüphaneler ve erişilebilirlik ayarları.'},
  {s:'[data-act="palette"]', t:'Komut paleti (Ctrl+K)', x:'Her komutu, görünümü, diyagramı ve elemanı adıyla arayıp açın. Klavye kısayollarının listesi için <b>?</b> tuşuna basın.'},
  {s:'#status', t:'Durum çubuğu', x:'Açık diyagram, eleman sayısı, etkin konfigürasyon ve ipuçları. Tur bitti — iyi modellemeler!'}
];
let TOURI = -1;
function tourEnd(){ TOURI = -1; const o = $('#tourOv'); if(o) o.remove(); try { localStorage.setItem('sysml-tour', '1'); } catch(e){} const p = $('#tourPrompt'); if(p) p.remove(); }
function tourStart(i){ hideMenu(); $('#modal').style.display = 'none'; TOURI = Math.max(0, Math.min(TOUR.length - 1, i | 0)); tourDraw(); }
function tourDraw(){
  let o = $('#tourOv'); if(!o){ o = document.createElement('div'); o.id = 'tourOv'; o.setAttribute('role', 'dialog'); o.setAttribute('aria-modal', 'true'); o.setAttribute('aria-label', 'Tanıtım turu'); document.body.appendChild(o); }
  const st = TOUR[TOURI], el = document.querySelector(st.s), r = el ? el.getBoundingClientRect() : {left:innerWidth / 2 - 100, top:innerHeight / 2 - 40, width:200, height:80};
  const card = {w:Math.min(360, innerWidth - 24)}; let cx = r.left, cy = r.bottom + 10;
  if(cy + 190 > innerHeight) cy = Math.max(10, r.top - 200); if(r.height > innerHeight * 0.5){ cy = Math.max(10, r.top + 20); cx = r.right + 10 + card.w < innerWidth ? r.right + 10 : r.left + 20; }
  cx = Math.max(10, Math.min(cx, innerWidth - card.w - 10));
  o.innerHTML = `<div class="tourHl" style="left:${r.left - 3}px;top:${r.top - 3}px;width:${r.width + 2}px;height:${r.height + 2}px"></div>
    <div class="tourCard" style="left:${cx}px;top:${cy}px;width:${card.w}px"><div class="tourN">${TOURI + 1} / ${TOUR.length}</div><h3>${esc(st.t)}</h3><div>${st.x}</div>
    <div class="tourB"><button class="pbtn" data-ic="0" data-tour="end">Turu kapat</button><span style="flex:1"></span><button class="pbtn" data-ic="0" data-tour="prev"${TOURI ? '' : ' disabled'}>◀ Önceki</button> <button class="pbtn pri" data-ic="0" data-tour="next">${TOURI === TOUR.length - 1 ? 'Bitir' : 'Sonraki ▶'}</button></div></div>`;
  o.onclick = ev => { const b = ev.target.closest('[data-tour]'); if(!b) return; const a = b.dataset.tour; if(a === 'end') tourEnd(); if(a === 'prev'){ TOURI--; tourDraw(); } if(a === 'next'){ if(TOURI >= TOUR.length - 1) tourEnd(); else { TOURI++; tourDraw(); } } };
  const nx = o.querySelector('[data-tour="next"]'); if(nx) nx.focus();
}
document.addEventListener('keydown', ev => { if(TOURI < 0) return; if(ev.key === 'Escape'){ ev.preventDefault(); ev.stopPropagation(); tourEnd(); } else if(ev.key === 'ArrowRight'){ ev.preventDefault(); ev.stopPropagation(); if(TOURI < TOUR.length - 1){ TOURI++; tourDraw(); } } else if(ev.key === 'ArrowLeft'){ ev.preventDefault(); ev.stopPropagation(); if(TOURI > 0){ TOURI--; tourDraw(); } } }, true);
window.addEventListener('resize', () => { if(TOURI >= 0) tourDraw(); });
/* ilk açılışta durum çubuğunda turu öner (engelleyici değil) */
function tourPromptShow(){
  let seen = '1'; try { seen = localStorage.getItem('sysml-tour'); } catch(e){}
  if(seen || $('#tourPrompt')) return; const st = $('#status'); if(!st) return;
  st.insertAdjacentHTML('beforeend', '<span id="tourPrompt" style="margin-left:auto;white-space:nowrap">İlk kez mi kullanıyorsunuz? <a class="lnk" data-tp="go" tabindex="0">Tanıtım turu ▸</a> <a class="lnk" data-tp="x" tabindex="0" title="Bir daha gösterme">✕</a></span>');
  $('#tourPrompt').onclick = ev => { const a = ev.target.closest('[data-tp]'); if(!a) return; if(a.dataset.tp === 'go') tourStart(0); else tourEnd(); };
}
{ const _rs3 = renderStatus; renderStatus = function(){ _rs3.apply(this, arguments); try { tourPromptShow(); } catch(e){ appErr('tourPrompt', e); } }; }
/* Yardım penceresine tur ve kısayol düğmeleri */
{
  const _sh = showHelp;
  showHelp = function(){ _sh.apply(this, arguments); const p = [...$('#modalBox').querySelectorAll('p')].pop(); if(p && !$('#hlpTour')){ p.insertAdjacentHTML('afterbegin', '<button class="pbtn" id="hlpTour" onclick="tourStart(0)">Tanıtım turu</button> <button class="pbtn" id="hlpKeys" onclick="shortcutsDialog()">Klavye kısayolları</button> <button class="pbtn" id="hlpWf" onclick="workflowHub()">İş akışı</button> '); } };
  ACT.help = showHelp;
}
/* ---------- klavye kısayolları ---------- */
const SHORTCUTS = [
  ['Genel', [['Ctrl+K', 'Komut paleti'], ['Ctrl+S / Ctrl+Shift+S', 'Kaydet / farklı kaydet'], ['Ctrl+O', 'Dosya aç'], ['Ctrl+Z / Ctrl+Y', 'Geri al / yinele'], ['Ctrl+F', 'Modelde ara'], ['Alt+← / Alt+→', 'Önceki / sonraki diyagram'], ['?', 'Bu liste'], ['Esc', 'Pencereyi, menüyü veya aracı kapat']]],
  ['Diyagram', [['Ctrl+A', 'Tümünü seç'], ['Ctrl+C / Ctrl+V', 'Kopyala / yapıştır (Shift: yeni eleman olarak)'], ['Ctrl+D', 'Çoğalt'], ['Delete / Shift+Delete', 'Modelden sil / yalnız diyagramdan kaldır'], ['F2', 'Yeniden adlandır'], ['Ok tuşları (Shift: 1 px)', 'Seçimi taşı'], ['+ / −', 'Yakınlaş / uzaklaş'], ['Ctrl+Shift+L', 'Otomatik düzen'], ['Boşluk + sürükle', 'Kaydır']]],
  ['Model ağacı', [['F2', 'Yeniden adlandır'], ['Enter', 'Diyagramı aç'], ['Delete', 'Modelden sil']]],
  ['Menüler ve pencereler', [['↑ / ↓', 'Menüde gezin'], ['Enter / Boşluk', 'Seç'], ['Tab / Shift+Tab', 'Penceredeki alanlar arasında (pencere içinde kalır)'], ['← / →', 'Tanıtım turunda önceki / sonraki']]]
];
function shortcutsDialog(){
  const box = $('#modalBox'); box.style.width = 'min(720px, 96vw)'; box.style.maxWidth = 'none'; box.onclick = null;
  box.innerHTML = `<h2>Klavye kısayolları</h2>${SHORTCUTS.map(([g, l]) => `<h3>${esc(g)}</h3><table class="rt fmt kbdt"><tbody>${l.map(([k, d]) => `<tr><td style="width:40%"><kbd class="noi18n">${esc(k)}</kbd></td><td>${esc(d)}</td></tr>`).join('')}</tbody></table>`).join('')}<p style="text-align:right;margin:12px 0 0"><button class="pbtn pri" onclick="document.getElementById('modal').style.display='none'">Kapat</button></p>`;
  $('#modal').style.display = 'flex';
}
document.addEventListener('keydown', ev => {
  if(ev.key !== '?' || ev.ctrlKey || ev.metaKey || ev.altKey) return; const t = ev.target; if(t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
  if($('#modal').style.display === 'flex') return; ev.preventDefault(); shortcutsDialog();
});
/* ---------- yüksek kontrast ---------- */
function applyContrast(on, say){ document.body.classList.toggle('hc', !!on); try { localStorage.setItem('sysml-hc', on ? '1' : '0'); } catch(e){} if(say) toast(on ? 'Yüksek kontrast açık' : 'Yüksek kontrast kapalı'); }
try { if(localStorage.getItem('sysml-hc') === '1') applyContrast(true); } catch(e){}
/* ---------- erişilebilirlik: ARIA, odak, menü klavye gezinmesi, pencere odak tuzağı ---------- */
function a11yLabel(root){
  (root || document).querySelectorAll('button').forEach(b => { if(!b.getAttribute('aria-label') && b.title && !/[A-Za-zÇĞİÖŞÜçğıöşü]{2}/.test(b.textContent)) b.setAttribute('aria-label', b.title); });
}
{
  const mo = $('#modal'), box = $('#modalBox'); mo.setAttribute('role', 'dialog'); mo.setAttribute('aria-modal', 'true');
  const tb = $('#toolbar'); if(tb){ tb.setAttribute('role', 'toolbar'); tb.setAttribute('aria-label', 'Araç çubuğu'); }
  [['#left', 'Model ağacı ve özellikler'], ['#palette', 'Palet'], ['#canvasWrap', 'Diyagram'], ['#status', 'Durum']].forEach(([s, l]) => { const e = $(s); if(e && !e.getAttribute('aria-label')) e.setAttribute('aria-label', l); });
  $('#ctx').setAttribute('role', 'menu'); const st = $('#status'); if(st) st.setAttribute('aria-live', 'polite');
  const toastEl = $('#toast'); if(toastEl){ toastEl.setAttribute('role', 'status'); toastEl.setAttribute('aria-live', 'polite'); }
  a11yLabel(document);
  let last = null, open = false;
  const focusables = () => [...box.querySelectorAll('button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), a[href], a[tabindex], [tabindex="0"]')].filter(e => e.offsetParent !== null || e === document.activeElement);
  new MutationObserver(() => {
    const now = mo.style.display === 'flex';
    if(now && !open){ open = true; last = document.activeElement; const h = box.querySelector('h2'); if(h){ h.id = h.id || 'modalTitle'; mo.setAttribute('aria-labelledby', h.id); } a11yLabel(box);
      setTimeout(() => { if(mo.style.display !== 'flex' || box.contains(document.activeElement)) return; const f = box.querySelector('input:not([type="checkbox"]):not([disabled]):not([readonly]), textarea:not([readonly]), select') || focusables().find(b => b.classList && b.classList.contains('pri')) || focusables()[0]; if(f) try { f.focus({preventScroll:true}); } catch(e){} }, 0); }
    else if(!now && open){ open = false; box.style.width = ''; box.style.maxWidth = ''; if(last && last.focus && document.contains(last)) try { last.focus({preventScroll:true}); } catch(e){} last = null; }
  }).observe(mo, {attributes:true, attributeFilter:['style']});
  new MutationObserver(() => { if(open) a11yLabel(box); }).observe(box, {childList:true});
  document.addEventListener('keydown', ev => {
    if(ev.key !== 'Tab' || mo.style.display !== 'flex') return; const f = focusables(); if(!f.length) return;
    const i = f.indexOf(document.activeElement);
    if(ev.shiftKey && (i <= 0)){ ev.preventDefault(); f[f.length - 1].focus(); } else if(!ev.shiftKey && (i === f.length - 1 || i < 0)){ ev.preventDefault(); f[0].focus(); }
  }, true);
  /* menü: ok tuşları, Enter, Esc; açan düğmeye dönüş */
  const _menu = menu; let menuOpener = null;
  menu = function(x, y, items){
    const ae = document.activeElement, kb = ae && ae.tagName === 'BUTTON' && ae.matches(':focus-visible');
    menuOpener = ae && ae.tagName === 'BUTTON' ? ae : null;
    _menu.apply(this, arguments);
    ctx.querySelectorAll('.mi').forEach(m => { m.setAttribute('role', 'menuitem'); m.tabIndex = -1; if(m.classList.contains('dis')) m.setAttribute('aria-disabled', 'true'); });
    if(menuOpener) menuOpener.setAttribute('aria-expanded', 'true');
    if(kb){ const f = ctx.querySelector('.mi:not(.dis)'); if(f) f.focus(); }
  };
  const _hm = hideMenu;
  hideMenu = function(){ const was = ctx.style.display === 'block'; _hm.apply(this, arguments); if(was && menuOpener){ menuOpener.setAttribute('aria-expanded', 'false'); if(ctx.contains(document.activeElement) || document.activeElement === document.body) try { menuOpener.focus({preventScroll:true}); } catch(e){} } };
  document.addEventListener('keydown', ev => {
    if(ctx.style.display !== 'block') return; const k = ev.key;
    if(!['ArrowDown', 'ArrowUp', 'Enter', ' ', 'Escape', 'Home', 'End'].includes(k)) return;
    const its = [...ctx.querySelectorAll('.mi:not(.dis)')]; if(!its.length) return;
    const i = its.indexOf(document.activeElement);
    if((k === 'Enter' || k === ' ') && i < 0) return;
    ev.preventDefault(); ev.stopPropagation();
    if(k === 'Escape'){ hideMenu(); return; }
    if(k === 'ArrowDown') its[(i + 1) % its.length].focus();
    if(k === 'ArrowUp') its[(i - 1 + its.length) % its.length].focus();
    if(k === 'Home') its[0].focus(); if(k === 'End') its[its.length - 1].focus();
    if(k === 'Enter' || k === ' ') its[i].click();
  }, true);
}
/* ---------- görünüm stili ---------- */
{
  const css = document.createElement('style');
  css.textContent = `
:focus-visible{outline:2px solid #d35400;outline-offset:1px}
#ctx .mi:focus{background:#e3ecfa;outline:none}
.wfgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:10px}
.wfcard{border:1px solid #c8d0db;border-radius:6px;padding:10px;background:#fbfcfe}
.wfh{display:flex;align-items:center;gap:8px;margin-bottom:6px}.wfh b{flex:1}
.wfn{display:inline-flex;width:22px;height:22px;border-radius:50%;background:#26364b;color:#fff;align-items:center;justify-content:center;font-size:12px;font-weight:600;flex:none}
.wfk{font-size:11px;color:#556;text-align:right;max-width:45%}.wfd{font-size:12px;color:#334;margin-bottom:8px;line-height:1.4}.wfa{display:flex;flex-wrap:wrap;gap:4px}
#tourOv{position:fixed;inset:0;z-index:300;pointer-events:none}
#tourOv .tourHl{position:fixed;border:3px solid #d35400;border-radius:6px;pointer-events:none}
#tourOv .tourCard{position:fixed;background:#fff;border:2px solid #26364b;border-radius:6px;padding:12px 14px;pointer-events:auto;font-size:13px;line-height:1.45;color:#1d2733}
#tourOv h3{margin:2px 0 6px;font-size:15px}.tourN{font-size:11px;color:#667}.tourB{display:flex;align-items:center;gap:4px;margin-top:12px}
.kbdt{width:100%}kbd{display:inline-block;border:1px solid #9aa7b8;border-bottom-width:2px;border-radius:4px;padding:0 5px;font:12px Consolas,monospace;background:#f6f8fa}
body.dark .wfcard{background:#1f2a38;border-color:#3b4b60}body.dark .wfd,body.dark .wfk{color:#c7d0dc}body.dark #tourOv .tourCard{background:#1f2a38;color:#e8edf3;border-color:#8aa0bb}body.dark kbd{background:#1f2a38;color:#e8edf3}
body.hc{--hc:#000}
body.hc #toolbar{background:#000}body.hc #toolbar button{background:#000;color:#fff;border:1px solid #fff}body.hc #toolbar button:hover{background:#333}
body.hc #left,body.hc #palette,body.hc #tabs,body.hc #view,body.hc #status,body.hc #ctx,body.hc #modalBox,body.hc #props{background:#fff;color:#000}
body.hc .muted,body.hc .hint,body.hc .wfd,body.hc .wfk,body.hc .tourN{color:#000 !important}
body.hc table.rt th,body.hc table.rt td,body.hc #ctx,body.hc #modalBox,body.hc .wfcard,body.hc input,body.hc select,body.hc textarea{border-color:#000 !important}
body.hc button.vb,body.hc button.pbtn{background:#fff;color:#000;border:1px solid #000}body.hc button.pri{background:#000;color:#fff}
body.hc a,body.hc .lnk{color:#0000c0 !important;text-decoration:underline}
body.hc #ctx .mi:hover,body.hc #ctx .mi:focus{background:#000;color:#fff}
body.hc :focus-visible{outline:3px solid #000;outline-offset:2px}
body.hc .ph{background:#fff !important;color:#000 !important;border-bottom:2px solid #000}body.hc .tree .row.sel,body.hc #tree .sel{background:#000 !important;color:#fff !important}`;
  document.head.appendChild(css);
}
if(typeof UI_RULES !== 'undefined') UI_RULES.unshift([/iş akışı|workflow/i, 'compass'], [/tanıtım turu|tour/i, 'flag'], [/kısayol|shortcut/i, 'kbd'], [/kontrast|contrast/i, 'eye']);
