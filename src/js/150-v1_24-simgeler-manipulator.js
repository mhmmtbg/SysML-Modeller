/* ================= v1.24: SİMGELER, SÜRÜKLEYEREK İLİŞKİ, AKILLI MANİPÜLATÖRLER, HİZALAMA KILAVUZLARI ================= */
/* ---------- arayüz simge kütüphanesi (24×24, çizgi) ---------- */
const UIP = {
  new:'M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9zM14 3v6h6M12 12v6M9 15h6',
  open:'M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v1H7.5L5 19H3zM7.5 10H22l-3 9H5',
  save:'M5 3h11l3 3v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zM7 3v5h8V3M7 21v-7h10v7',
  saveas:'M5 3h11l3 3v5M7 3v5h8V3M3 5v14a2 2 0 0 0 2 2h6M15 21l1-4 5-5 3 3-5 5z',
  html:'M8 8l-4 4 4 4M16 8l4 4-4 4M14 5l-4 14',
  back:'M15 18l-6-6 6-6', fwd:'M9 18l6-6-6-6',
  undo:'M9 14L4 9l5-5M4 9h11a5 5 0 0 1 0 10h-3', redo:'M15 14l5-5-5-5M20 9H9a5 5 0 0 0 0 10h3',
  export:'M12 3v12M7 8l5-5 5 5M5 15v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4',
  import:'M12 15V3M7 10l5 5 5-5M5 15v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4',
  zin:'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-4-4M11 8v6M8 11h6', zout:'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-4-4M8 11h6',
  fit:'M4 9V5a1 1 0 0 1 1-1h4M15 4h4a1 1 0 0 1 1 1v4M20 15v4a1 1 0 0 1-1 1h-4M9 20H5a1 1 0 0 1-1-1v-4',
  grid:'M4 4h16v16H4zM4 9.3h16M4 14.6h16M9.3 4v16M14.6 4v16',
  map:'M9 4L3 6v14l6-2 6 2 6-2V4l-6 2zM9 4v14M15 6v14',
  brush:'M18 3l3 3-9 9-3-3zM9 12l-3 3c-2 0-3 1.5-3 3.5V21h2.5c2 0 3.5-1 3.5-3l3-3',
  req:'M9 5h11M9 12h11M9 19h11M4 4l1 1 2-2M4 11l1 1 2-2M4 18l1 1 2-2',
  chart:'M4 20V10M10 20V4M16 20v-7M22 20H2',
  tools:'M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.4-.6-.6-2.4z',
  layout:'M4 4h16v16H4zM4 10h16M10 10v10',
  image:'M4 4h16v16H4zM4 16l5-5 4 4 3-3 4 4M15 8.5a1.5 1.5 0 1 0 0 .01',
  search:'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-4-4',
  cmd:'M9 6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3z',
  moon:'M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z',
  globe:'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18',
  help:'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.7M12 17h.01',
  plus:'M12 5v14M5 12h14', minus:'M5 12h14', x:'M6 6l12 12M18 6L6 18',
  trash:'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
  edit:'M4 20h4L19 9l-4-4L4 16zM14 6l4 4',
  copy:'M9 9h11v11H9zM5 15H4V4h11v1', paste:'M9 4h6v3H9zM8 5H6v16h12V5h-2M9 12h6M9 16h4',
  table:'M4 5h16v14H4zM4 10h16M4 15h16M10 5v14',
  matrix:'M4 4h16v16H4zM9 4v16M4 9h16M13 13l3 3M16 13l-3 3',
  xls:'M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9zM14 3v6h6M8 12l5 6M13 12l-5 6',
  doc:'M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9zM14 3v6h6M8 13h8M8 17h6',
  pdf:'M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9zM14 3v6h6M8 17v-4h1.5a1.5 1.5 0 0 1 0 3H8',
  print:'M7 9V3h10v6M7 17H4v-7h16v7h-3M7 14h10v7H7z',
  link:'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1',
  unlink:'M15 9l3-3M6 18l3-3M9 6V3M18 15h3M5 9H3M15 21v-2M10 14a4 4 0 0 0 5.7 0l3-3M14 10a4 4 0 0 0-5.7 0l-3 3',
  eye:'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z', eyeoff:'M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.9 5.1A9 9 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3 3.9M6.6 6.6C3.9 8.4 2 12 2 12s3.5 7 10 7a9.6 9.6 0 0 0 5.4-1.6',
  filter:'M3 4h18l-7 8v6l-4 2v-8z', sort:'M7 4v16M3 16l4 4 4-4M17 20V4M13 8l4-4 4 4',
  play:'M7 4l13 8-13 8z', stop:'M6 6h12v12H6z', step:'M5 4l10 8-10 8zM19 5v14',
  refresh:'M20 11a8 8 0 0 0-14.8-4M4 4v4h4M4 13a8 8 0 0 0 14.8 4M20 20v-4h-4',
  check:'M5 12l5 5L20 7', warn:'M12 3L2 20h20zM12 10v5M12 18h.01', info:'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 11v6M12 7.5h.01',
  lock:'M6 11h12v10H6zM8 11V7a4 4 0 0 1 8 0v4', unlock:'M6 11h12v10H6zM8 11V7a4 4 0 0 1 7.5-2',
  pkg:'M3 7h7l2 2h9v11H3zM3 7V5h6l2 2', box:'M4 6h16v13H4zM4 10h16M9 6v4',
  diagram:'M4 4h6v5H4zM14 15h6v5h-6zM14 4h6v5h-6zM7 9v3h10v3M17 9v2',
  tree:'M5 4v16M5 8h5M5 14h5M5 20h5M12 6h8v4h-8zM12 12h8v4h-8z',
  right:'M5 12h14M13 6l6 6-6 6', up:'M12 19V5M6 11l6-6 6 6', down:'M12 5v14M6 13l6 6 6-6',
  alignl:'M4 3v18M8 7h12v4H8zM8 14h7v4H8z', alignc:'M12 3v18M6 7h12v4H6zM8.5 14h7v4h-7z', alignr:'M20 3v18M4 7h12v4H4zM9 14h7v4H9z',
  alignt:'M3 4h18M7 8h4v12H7zM14 8h4v7h-4z', alignm:'M3 12h18M7 6h4v12H7zM14 8.5h4v7h-4z', alignb:'M3 20h18M7 4h4v12H7zM14 9h4v7h-4z',
  distH:'M4 4v16M20 4v16M9 8h6v8H9z', distV:'M4 4h16M4 20h16M8 9h8v6H8z',
  line:'M3 20l6-8 4 4 8-10M21 6v4M21 6h-4', cal:'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4', clock:'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7v5l3 2',
  users:'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM2 21v-1a6 6 0 0 1 12 0v1M16 3.5a4 4 0 0 1 0 7.5M22 21v-1a6 6 0 0 0-4-5.6',
  user:'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM5 21v-1a7 7 0 0 1 14 0v1',
  flag:'M5 21V4M5 4h11l-2 4 2 4H5', bug:'M12 7a4 4 0 0 1 4 4v4a4 4 0 0 1-8 0v-4a4 4 0 0 1 4-4zM9 4l1.5 2M15 4l-1.5 2M4 11h4M16 11h4M4 17l4-1M20 17l-4-1M12 11v8',
  flask:'M9 3h6M10 3v6L4 19a1.5 1.5 0 0 0 1.3 2h13.4a1.5 1.5 0 0 0 1.3-2L14 9V3M7 15h10',
  target:'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10zM12 11a1 1 0 1 0 0 2 1 1 0 0 0 0-2z',
  shield:'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6zM9 12l2 2 4-4',
  layers:'M12 3l9 5-9 5-9-5zM3 13l9 5 9-5M3 17.5l9 5 9-5',
  merge:'M6 4v4a6 6 0 0 0 6 6h6M6 20v-6M15 11l3 3-3 3',
  compare:'M6 3v12M6 21a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM18 21V9M18 3a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM10 7H6M14 17h4',
  clip:'M9 4h6v3H9zM8 5H6v16h12V5h-2', note:'M4 4h16v12H8l-4 4z', msg:'M4 5h16v11H9l-5 4z',
  settings:'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z',
  wand:'M15 4V2M15 10V8M11 6h2M17 6h2M4 20L14 10M18 13v2M17 14h2', list:'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
  hash:'M5 9h14M5 15h14M10 3L8 21M16 3l-2 18', tag:'M3 3h8l10 10-8 8L3 11zM7.5 7.5h.01',
  compass:'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM15.5 8.5l-2 5-5 2 2-5z',
  sigma:'M18 5H6l6 7-6 7h12', calc:'M5 3h14v18H5zM8 7h8M8 11h2M14 11h2M8 15h2M14 15h2M8 18h2M14 18h2',
  wave:'M2 12c2-6 4-6 6 0s4 6 6 0 4-6 6 0', activity:'M3 12h4l3-8 4 16 3-8h4',
  star:'M12 3l2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z',
  dot:'M12 10a2 2 0 1 0 0 4 2 2 0 0 0 0-4z', chev:'M9 6l6 6-6 6',
  route:'M6 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM18 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM6 15V9a4 4 0 0 1 4-4h6M18 9v6a4 4 0 0 1-4 4H8',
  connect:'M5 12h10M11 7l5 5-5 5M19 5v14', ruler:'M3 17L17 3l4 4L7 21zM7 13l2 2M10 10l2 2M13 7l2 2',
  folder:'M3 6a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z', home:'M3 11l9-8 9 8M5 9v12h14V9',
  kbd:'M3 6h18v12H3zM7 10h.01M11 10h.01M15 10h.01M7 14h10',
  sun:'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4'
};
const uiIc = (n, sz) => UIP[n] ? `<svg class="uic" width="${sz || 15}" height="${sz || 15}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${UIP[n]}"/></svg>` : '';
/* metinden simge seç (Türkçe ve İngilizce anahtar kelimeler; özelden genele) */
const UI_RULES = [
  [/excel|xlsx|csv|elektronik tablo|spreadsheet/i, 'xls'], [/word|docx|doküman|document|spesifikasyon|specification|prosedür|procedure|rapor|report/i, 'doc'], [/\bpdf\b/i, 'pdf'], [/\bpng\b|\bsvg\b|görüntü|image|resim/i, 'image'], [/yazdır|print/i, 'print'],
  [/model doğrulama|model validation|kalite raporu|quality report/i, 'check'],
  [/reqif|xmi|cameo|magicdraw/i, 'export'],
  [/farklı kaydet|save as/i, 'saveas'], [/html/i, 'html'], [/kaydet|save/i, 'save'], [/^yeni proje|new project|^yeni$|^new$/i, 'new'],
  [/içe aktar|import|ekle…|aktar…|yükle|load|⤓|modül ekle|add module|yapıştır|paste/i, 'import'], [/dışa aktar|export|⤒/i, 'export'],
  [/^aç$|^open$|dosya aç|aç…|open…/i, 'open'],
  [/geri al|undo|↶/i, 'undo'], [/yinele|redo|↷/i, 'redo'],
  [/yakınlaş|zoom in/i, 'zin'], [/uzaklaş|zoom out/i, 'zout'], [/sığdır|\bfit\b/i, 'fit'], [/ızgara|izgara|grid/i, 'grid'], [/harita|minimap|\bmap\b/i, 'map'], [/biçim|format painter|🖌/i, 'brush'],
  [/kopyala|copy|çoğalt|duplicate/i, 'copy'], [/sil\b|silin|delete|kaldır|remove|✕/i, 'trash'], [/yeniden adlandır|rename|düzenle|edit/i, 'edit'],
  [/^kapat$|^close$|vazgeç|cancel/i, 'x'], [/simülasyon|simulat|başlat|▶|çalıştır|\brun\b|start/i, 'play'], [/durdur|stop/i, 'stop'], [/adım|step/i, 'step'],
  [/yenile|refresh|↻|güncelle|update|eşitle|sync/i, 'refresh'], [/karşılaştır|compare|⇄|fark/i, 'compare'], [/birleştir|merge/i, 'merge'],
  [/kilit|lock|düzenliyorum/i, 'lock'], [/modül|module|paket|package/i, 'pkg'],
  [/matris|matrix|n²|n2/i, 'matrix'], [/tablo|table|sütun|column|vcrm/i, 'table'], [/gereksinim|requirement|kapsama|coverage|izlenebilir|trace/i, 'req'],
  [/kaynak|resource|numune|article/i, 'box'], [/takvim|schedule|zaman|time|gantt|kaydır|shift/i, 'cal'],
  [/test|doğrulama|verif|prosedür|kampanya|campaign/i, 'flask'], [/ncr|uygunsuz|nonconform|arıza|failure|fmea/i, 'bug'], [/risk/i, 'shield'],
  [/bütçe|budget|parametrik|parametric|hesap|calcul|solve|çöz/i, 'calc'], [/profil|profile|psd|titreşim|vibration|sinüs|sine|srs|şok|shock|termal|thermal/i, 'wave'],
  [/analiz|analysis|grafik|chart|trade|monte|hassasiyet|sensitivity/i, 'chart'], [/ilişki haritası|relation map|harita/i, 'compass'],
  [/bağlam|context/i, 'compass'], [/ibd|bdd|diyagram|diagram/i, 'diagram'], [/ağaç|tree/i, 'tree'], [/katman|layer/i, 'layers'],
  [/hizala|align|dağıt|distribute|düzen|layout|yerleşim/i, 'layout'], [/ikon|icon/i, 'image'], [/bul|ara|search|find|komut|command|⌕/i, 'search'],
  [/tema|theme|karanlık|dark|☾/i, 'moon'], [/dil|language|\ben\b|\btr\b/i, 'globe'], [/yardım|help|kullanım|usage/i, 'help'],
  [/not|note|inceleme|review|yorum|comment/i, 'note'], [/kullanıcı|user/i, 'user'], [/şablon|template|kütüphane|library|iskelet/i, 'layers'], [/stereotip|stereotype|etiket|tag/i, 'tag'],
  [/ayar|setting|seçenek|option/i, 'settings'], [/göster|show|görünür|visible/i, 'eye'], [/gizle|hide/i, 'eyeoff'], [/süz|filter/i, 'filter'], [/sırala|sort/i, 'sort'],
  [/bağla|link|ilişkilendir|connect|ata\b|assign/i, 'link'], [/kopar|unlink|detach/i, 'unlink'], [/git|go to|aç|open|↪|→/i, 'right'],
  [/ekle|add|\+|yeni|new|oluştur|create|üret|generate/i, 'plus'], [/tamam|uygula|apply|ok\b|kabul/i, 'check'], [/vazgeç|cancel|iptal/i, 'x'], [/uyarı|warning|doğrula|valid/i, 'warn'], [/bilgi|info/i, 'info']
];
function uiIconFor(t){ t = String(t || '').trim(); if(!t) return ''; if(/^(\+|➕)\s/.test(t)) return 'plus'; for(const [re, n] of UI_RULES) if(re.test(t)) return n; return 'chev'; }
/* araç çubuğu: düğme simgeleri (bazıları yalnız simge) */
const TB_IC = {new:'new', open:'open', save:'save', saveAs:'saveas', saveHtml:'html', navBack:'back', navFwd:'fwd', undo:'undo', redo:'redo', exportMenu:'export', zout:'zout', zin:'zin', fit:'fit', grid:'grid', mini:'map', painter:'brush', reqMenu:'req', analysisMenu:'chart', toolsMenu:'tools', layoutMenu:'layout', iconMenu:'image', palette:'cmd', theme:'moon', help:'help', expandAll:'plus', collapseAll:'minus'};
const TB_ONLY = new Set(['navBack', 'navFwd', 'undo', 'redo', 'zout', 'zin', 'fit', 'grid', 'mini', 'painter', 'iconMenu', 'theme', 'expandAll', 'collapseAll']);
function decorateToolbar(){
  document.querySelectorAll('#toolbar button[data-act], #left .ph button[data-act]').forEach(b => {
    const a = b.dataset.act, n = TB_IC[a]; if(!n || b.querySelector('svg.uic')) return;
    if(TB_ONLY.has(a)){ if(!b.title) b.title = b.textContent.trim(); b.innerHTML = uiIc(n, 16); b.classList.add('ico'); }
    else { b.insertAdjacentHTML('afterbegin', uiIc(n, 15)); const t = b.childNodes[1]; if(t && t.nodeType === 3) t.data = t.data.replace(/^\s*[⌕☾]\s*/, ' '); }
  });
}
/* görünüm çubukları, pencereler ve panel düğmeleri: metne göre simge */
const IC_GLYPH = /^\s*(?:[+⤒⤓↻⇄⎘📄▶☰⌕⇥↶↷🖌✓⇪⚑∿←→↑↓◀▶⏭⏵⏸↺✕]|➕)\s*/u;
function decorateButtons(root){
  if(!root || !root.querySelectorAll) return;
  root.querySelectorAll('button.vb, button.pbtn, #props .sub button, .ph button').forEach(b => {
    if(b.dataset.ic === '0' || b.querySelector('svg')) return;
    const tx = b.textContent.trim(); if(!/[A-Za-zÇĞİÖŞÜçğıöşü]{2}/.test(tx)) return;
    const n = uiIconFor(tx); if(!n) return;
    const t = [...b.childNodes].find(x => x.nodeType === 3 && x.data.trim()); if(t && IC_GLYPH.test(t.data)) t.data = t.data.replace(IC_GLYPH, '');
    b.insertAdjacentHTML('afterbegin', uiIc(n, 14));
  });
}
const IC_OBS = new MutationObserver(ms => { for(const m of ms) m.addedNodes.forEach(n => { if(n.nodeType !== 1) return; if(n.matches && n.matches('button.vb, button.pbtn')) decorateButtons(n.parentElement); else decorateButtons(n); }); });
IC_OBS.observe(document.body, {childList:true, subtree:true});
decorateToolbar(); decorateButtons(document.body);

/* ---------- sürükleyerek ilişki: tutamak + akıllı manipülatörler ---------- */
const MANI_PREF = {bdd:['Composition', 'Association', 'Generalization', 'Dependency'], ibd:['Connector', 'Dependency'], uc:['Association', 'Include', 'Extend', 'Generalization'], act:['ControlFlow', 'ObjectFlow'], req:['DeriveReqt', 'Satisfy', 'Verify', 'Refine'], stm:['Transition'], sd:['SyncMsg', 'AsyncMsg', 'ReplyMsg'], par:['Binding'], pkg:['Dependency', 'Import', 'Generalization']};
function maniKinds(d){ const R = DT[d.dtype].rels || []; return (MANI_PREF[d.dtype] || []).filter(k => R.includes(k)).concat(R.filter(k => k !== 'Anchor' && !(MANI_PREF[d.dtype] || []).includes(k))).slice(0, 4); }
function maniSVG(d, sh){
  const e = E(sh.el); if(!e || e.kind === 'Legend' || e.kind === 'Diagram') return '';
  const z = d.z, x = sh.x + sh.w + 14 / z, y0 = sh.y + (plusOK(d, e) ? 34 : 10) / z, r = 9 / z, st = 22 / z;
  const ks = e.kind === 'Comment' ? [] : maniKinds(d);
  let s = `<g data-mani="*" data-ms="${sh.id}" style="cursor:crosshair"><title>İlişki çekmek için sürükleyip başka bir elemana bırakın (tür bırakınca seçilir)</title><circle cx="${x}" cy="${y0}" r="${r}" fill="#26364b" stroke="#fff" stroke-width="${1.5 / z}"/><path d="M${x - r * 0.45} ${y0}h${r * 0.9}M${x + r * 0.1} ${y0 - r * 0.38}l${r * 0.35} ${r * 0.38}-${r * 0.35} ${r * 0.38}" stroke="#fff" stroke-width="${1.6 / z}" fill="none" stroke-linecap="round"/></g>`;
  ks.forEach((k, i) => {
    const cy = y0 + (i + 1) * st, w = 26 / z * 0.8, h = 18 / z * 0.8;
    s += `<g data-mani="${k}" data-ms="${sh.id}" style="cursor:crosshair"><title>${esc(KIND[k].tr)}: sürükleyip hedefe bırakın</title><rect x="${x - 12 / z}" y="${cy - 9 / z}" width="${24 / z}" height="${18 / z}" rx="${4 / z}" fill="#fff" stroke="#9fb0c5" stroke-width="${1 / z}"/><svg x="${x - w / 2}" y="${cy - h / 2}" width="${w}" height="${h}" viewBox="0 0 26 18" pointer-events="none">${palIcon(k).replace(/^<svg[^>]*>|<\/svg>$/g, '')}</svg></g>`;
  });
  return s;
}
function linkValidKinds(d, a, b){ return (DT[d.dtype].rels || []).filter(k => k !== 'Anchor' || a.kind === 'Comment' || b.kind === 'Comment').filter(k => !validate(k, a, b, d)); }
function linkCreate(d, kind, S, T, p){
  const a = E(S.el), b = E(T.el), err = validate(kind, a, b, d);
  if(err){ renderDiagram(); return toast(err); }
  snap();
  const ed = connect(d, kind, S, T);
  if(isMsg(kind)){ const lo = Math.max(S.y, T.y) + 50; ed.y = Math.max(lo, snapv(p ? p.y : lo)); }
  ST.sel = new Set([ed.id]); if(ed.el) ST.tsel = ed.el;
  afterChange();
  if(['ControlFlow', 'ObjectFlow'].includes(kind) && (a.kind === 'Decision' || a.kind === 'Choice')) editEdge(ed, 'guard');
  if(isMsg(kind) || kind === 'Transition') editEdge(ed, 'name');
  return ed;
}
function linkDrop(d, dr, tsh, ev){
  if(!tsh){ renderDiagram(); return; }
  if(tsh.id === dr.s.id && !['Transition'].includes(dr.kind) && !isMsg(dr.kind)){ renderDiagram(); return toast('Hedef olarak başka bir elemanın üzerine bırakın.'); }
  const a = E(dr.s.el), b = E(tsh.el);
  if(dr.kind && dr.kind !== '*') return linkCreate(d, dr.kind, dr.s, tsh, dr.p);
  const ks = linkValidKinds(d, a, b);
  renderDiagram();
  if(!ks.length) return toast(`${KIND[a.kind].tr} → ${KIND[b.kind].tr}: bu diyagramda kurulabilecek ilişki yok`);
  if(ks.length === 1) return linkCreate(d, ks[0], dr.s, tsh, dr.p);
  menu(ev.clientX + 6, ev.clientY + 6, [{h:`${nm(a) || KIND[a.kind].tr} → ${nm(b) || KIND[b.kind].tr}`}].concat(ks.map(k => ({t:KIND[k].tr, ic:palIcon(k), f:() => linkCreate(d, k, dr.s, tsh, dr.p)}))));
}
/* ---------- hizalama kılavuzları (sürüklerken kenar/merkez yakalama) ---------- */
function smartGuides(d, set, dx, dy){
  const mv = [...set].map(id => shapeOf(d, id)).filter(s => s && !s.parent); if(!mv.length || mv.length > 12) return {dx, dy, lines:[]};
  const bx = Math.min(...mv.map(s => s.x)), by = Math.min(...mv.map(s => s.y)), bw = Math.max(...mv.map(s => s.x + s.w)) - bx, bh = Math.max(...mv.map(s => s.y + s.h)) - by;
  const others = d.shapes.filter(s => !s.parent && !set.has(s.id) && E(s.el)), thr = 6 / d.z;
  let best = {x:null, y:null};
  const X = [bx, bx + bw / 2, bx + bw], Y = [by, by + bh / 2, by + bh];
  others.forEach(o => {
    [o.x, o.x + o.w / 2, o.x + o.w].forEach(ox => X.forEach(mx => { const dd = ox - mx; if(Math.abs(dd) <= thr && (!best.x || Math.abs(dd) < Math.abs(best.x.d))) best.x = {d:dd, v:ox, o}; }));
    [o.y, o.y + o.h / 2, o.y + o.h].forEach(oy => Y.forEach(my => { const dd = oy - my; if(Math.abs(dd) <= thr && (!best.y || Math.abs(dd) < Math.abs(best.y.d))) best.y = {d:dd, v:oy, o}; }));
  });
  const lines = [];
  if(best.x){ dx += best.x.d; const o = best.x.o; lines.push(`<line x1="${best.x.v}" y1="${Math.min(o.y, by) - 12}" x2="${best.x.v}" y2="${Math.max(o.y + o.h, by + bh) + 12}"/>`); }
  if(best.y){ dy += best.y.d; const o = best.y.o; lines.push(`<line x1="${Math.min(o.x, bx) - 12}" y1="${best.y.v}" x2="${Math.max(o.x + o.w, bx + bw) + 12}" y2="${best.y.v}"/>`); }
  return {dx, dy, lines};
}

