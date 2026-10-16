/* ================= v1.45: ÇEVRESEL PROFİLDEN GEREKSİNİM VE DOĞRULAMA İSKELETİ ================= */
/* ---------- metin parçaları ---------- */
const listTr = a => a.length <= 1 ? (a[0] || '') : a.slice(0, -1).join(', ') + ' ve ' + a[a.length - 1];
function envBehavior(plevel){
  const l = String(plevel || '').toLocaleLowerCase('tr');
  if(/kalifik|qualif/.test(l)) return 'yapısal ve işlevsel bütünlüğünü koruyacaktır';
  if(/ess|tarama|screen/.test(l)) return 'tarama sonrasında işlevsel performansını koruyacaktır';
  if(/fonksiyon|çalışma|operasyon|operat|görev/.test(l)) return 'çalışmasını sürdürecektir';
  if(/kabul|accept/.test(l)) return 'işlevsel performansını koruyacaktır';
  return 'işlevsel performansını koruyacaktır';
}
function envTestLevel(plevel){ const l = String(plevel || '').toLocaleLowerCase('tr'); return /kalifik/.test(l) ? 'Kalifikasyon' : /kabul|ess/.test(l) ? 'Kabul (FAT)' : 'Sistem'; }
/* profilin sayısal özünü cümleye çevirir: "… maruz kaldığında" kısmına kadar */
function envClause(p){
  const t = p.ptype || 'psd', m = pfMetrics(p); if(!m.ok) return null;
  const pts = m.pts, f0 = trNum(pts[0][0]), f1 = trNum(pts[pts.length - 1][0]), ax = pfAxes(p), nm0 = '"' + p.name + '"', has = re => re.test(p.name);
  const axT = ax.length ? listTr(ax) + (/^±/.test(ax[0]) ? (ax.length > 1 ? ' yönlerinde' : ' yönünde') : (ax.length > 1 ? ' eksenlerinde' : ' ekseninde')) + ' ' : '';
  if(t === 'psd'){ const dur = numOf(p.dur); return `${axT}${f0} Hz ile ${f1} Hz arasında ${trNum(m.grms)} Grms seviyesindeki ${nm0} ${has(/titreşim|psd|vibra/i) ? '' : 'rastgele titreşim '}profiline${dur != null ? ' eksen başına ' + trNum(dur) + ' dk' : ''} maruz kaldığında`; }
  if(t === 'sine'){ const amp = Math.max(...pts.map(q => q[1])), rate = numOf(p.rate) || 1, sw = numOf(p.sweeps) || 1; return `${axT}${f0} Hz ile ${f1} Hz arasında ${trNum(amp)} g tepe genlikli, ${trNum(rate)} oktav/dk hızla ${trNum(sw)} kez süpürülen ${nm0} ${has(/sinüs|sine/i) ? 'profiline' : 'sinüs titreşimine'} maruz kaldığında`; }
  if(t === 'srs'){ const mx = Math.max(...pts.map(q => q[1])), knee = (pts.find(q => q[1] >= mx * 0.999) || pts[0])[0], n = numOf(p.shocks) || 3; return `${axT}${ax.length ? 'yön başına' : ''} ${trNum(n)} kez uygulanan, ${trNum(mx)} g tepe ivmeli ve ${trNum(knee)} Hz köşe frekanslı ${nm0} ${has(/şok|srs|shock/i) ? 'profiline' : 'şok tepki spektrumuna'} maruz kaldığında`.replace(/\s+/g, ' '); }
  const cyc = numOf(p.cycles) || 1; return `${trNum(m.tmin)} °C ile ${trNum(m.tmax)} °C arasında, en fazla ${trNum(m.rmax)} °C/dk değişim hızıyla ${trNum(cyc)} döngü uygulanan ${nm0} ${has(/termal|sıcaklık|thermal/i) ? '' : 'termal '}profiline maruz kaldığında`;
}
/* en üst sistem bloğu: part'ı olan ve kendisi hiçbir part'ın tipi olmayan blok */
let TB_C = null, TB_REV = -1, TB_M = null;
function topBlock(){ if(TB_REV === REV && TB_M === M) return TB_C; TB_REV = REV; TB_M = M; return TB_C = topBlock0(); }
function topBlock0(){ const used = new Set(Object.values(M.els).filter(p => p.kind === 'Part' && p.type).map(p => p.type)); return Object.values(M.els).filter(b => b.kind === 'Block' && !used.has(b.id) && kidsOf(b.id).some(k => k.kind === 'Part')).sort((a, b) => kidsOf(b.id).filter(k => k.kind === 'Part').length - kidsOf(a.id).filter(k => k.kind === 'Part').length || sortEls(a, b))[0] || null; }
/* ---------- kural: çevresel profil ---------- */
DERIVE_RULES.push({id:'cevre', tr:'Çevresel profil', doc:'Her test profilinden (rastgele titreşim PSD, sinüs, SRS şok, termal döngü) profilin sayısal değerleriyle çevresel dayanım gereksinimi. İfade profilin seviyesine göre seçilir (kalifikasyon: bütünlük, kabul/ESS: işlevsel performans, fonksiyonel: çalışmayı sürdürme). Gereksinim profile Refine ile, profili kullanan testlere Verify ile bağlanır; profili inceleyen bir üst gereksinim varsa ondan türetilir.',
  opts:[['sub', 'Alt sistem seviyesinde (kök bloğun her part tipi için ayrı)', false], ['skipFn', 'Fonksiyonel / karakterizasyon profillerini atla (ör. rezonans arama)', true], ['mkTest', 'Profili kullanan test yoksa test durumu iskeleti oluştur', true]],
  gen(cfg){
    const o = Object.assign({sub:false, skipFn:true, mkTest:true}, (cfg.ruleOpts || {}).cevre || {}), out = [];
    const sat = relIdx().Satisfy || [];
    allProfiles().forEach(p => {
      if(o.skipFn && /fonksiyon|karakter|rezonans|resonance/i.test((p.plevel || '') + ' ' + p.name)) return;
      const cl = envClause(p); if(!cl) return;
      const parent = pfReqs(p).find(r => !(r.derivedFrom && r.derivedFrom.rule === 'cevre') && reqStatus(r) !== 'İptal') || null;
      const std = String(p.std || '').trim().replace(/(MIL-STD-810\w*)\s+(\d{3}\.\d+)/i, '$1 Yöntem $2'), beh = envBehavior(p.plevel), tests = pfTests(p).map(t => t.id);
      const base = {verif:'Test', parent:parent ? parent.id : null, refineBy:p.id, verifyBy:tests, mkTest:!tests.length && o.mkTest ? {key:'pf:' + p.id, name:p.name + ' testi', tMethod:'Test', tLevel:envTestLevel(p.plevel), profiles:[p.id], std} : null,
        note:`${PT[p.ptype || 'psd'].sh} · ${pfMetrics(p).main || ''}${p.plevel ? ' · ' + p.plevel : ''}${parent ? ' · üst: ' + parent.reqId : ''}${tests.length ? ' · test: ' + tests.map(id => nm(E(id))).join(', ') : ''}`, src:[p.id]};
      const subj = (who) => `${who}, ${std ? std + ' kapsamında ' : ''}${cl} ${beh}`;
      if(!o.sub){
        const top = parent ? sat.filter(s => s.tgt === parent.id && E(s.src) && E(s.src).kind === 'Block').map(s => s.src)[0] : null;
        out.push(Object.assign({sig:'env:' + p.id, level:'Sistem', name:'Çevre: ' + p.name, text:subj('Sistem'), satisfyBy:top}, base));
      } else {
        const rootB = E((cfg.env || {}).root) || (parent && sat.filter(s => s.tgt === parent.id && E(s.src) && E(s.src).kind === 'Block').map(s => E(s.src))[0]) || topBlock();
        const kids = rootB ? [...new Map(kidsOf(rootB.id).filter(x => x.kind === 'Part' && x.type && E(x.type) && E(x.type).kind === 'Block' && (typeof varOn !== 'function' || varOn(x))).map(x => [x.type, E(x.type)])).values()] : [];
        kids.forEach(b => out.push(Object.assign({}, base, {sig:'env:' + p.id + ':' + b.id, level:'Alt Sistem', subsys:b.name, name:'Çevre: ' + p.name, text:subj(b.name), satisfyBy:b.id, src:[p.id, b.id], mkTest:base.mkTest ? Object.assign({}, base.mkTest, {testItem:b.name}) : null})));
      }
    });
    return out;
  }
});
/* ---------- uygulama: Refine, Verify ve test iskeleti ---------- */
function verifSuggest(text){
  const t = String(text || '').toLocaleLowerCase('tr');
  if(/analiz|hesap|mtbf|güvenilirlik|ömür|maliyet|olasılık|benzetim/.test(t)) return 'Analiz';
  if(/kütle|ağırlık|boyut|renk|etiket|işaret|malzeme|kaplama|montaj|bağlantı elemanı|görsel/.test(t)) return 'Muayene';
  if(/göster|ekran|operatör|kullanıcı|bildir|arayüzünde görün/.test(t)) return 'Gösterim';
  return 'Test';
}
function mkTestFor(r, spec, cache){
  const key = spec && spec.key; if(key && cache.has(key)){ const t = cache.get(key); addRel('Verify', t.id, r.id); return t; }
  const meth = (spec && spec.tMethod) || String(r.verif || '').split(/[,;]/)[0].trim() || verifSuggest(r.text);
  const t = newTest(Object.assign({name:uniqName((spec && spec.name) || ((r.reqId ? r.reqId + ' ' : '') + (r.name || 'doğrulama') + ' ' + ({Test:'testi', Analiz:'analizi', Muayene:'muayenesi', 'Gösterim':'gösterimi'}[meth] || 'doğrulaması')), testPkg()), tMethod:meth, tLevel:reqLevel(r) === 'Sistem' ? 'Sistem' : 'Alt Sistem', testItem:reqLevel(r) === 'Alt Sistem' ? r.subsys || '' : ''}, spec ? (({key, name, ...rest}) => rest)(spec) : {}));
  t.derivedFrom = {rule:'iskelet', sig:'tc:' + (key || r.id), t:new Date().toISOString().slice(0, 10), src:[r.id]};
  addRel('Verify', t.id, r.id); if(key) cache.set(key, t); return t;
}
DERIVE_HOOKS.apply.push((list, opt, res) => {
  const cache = new Map(); let nt = 0;
  list.forEach(s => {
    const r = s.req; if(!r || s.state !== 'yeni') return;
    if(s.refineBy && E(s.refineBy)) addRel('Refine', s.refineBy, r.id);
    const hasV = (relIdx().Verify || []).some(v => v.tgt === r.id);
    if(!hasV && (s.mkTest || opt.mkTests)){ mkTestFor(r, s.mkTest, cache); nt++; }
  });
  res.t = nt;
});
/* ---------- doğrulama iskeleti: Verify'sız gereksinimler ---------- */
function unverifiedReqs(){ const V = new Set((relIdx().Verify || []).map(v => v.tgt)); return allReqs().filter(r => activeReq(r) && reqStatus(r) !== 'İptal' && !V.has(r.id)); }
let DVK = {sel:new Set()};
function skeletonHTML(){
  const rs = unverifiedReqs();
  let h = `<div class="tsw"><div class="sub"><span>Doğrulama bağlantısı (Verify) olmayan gereksinimler (${rs.length})</span></div>`;
  if(!rs.length) return h + '<div class="vempty">Tüm gereksinimler en az bir test / doğrulama faaliyetine bağlı.</div></div>';
  h += `<div class="muted" style="margin:0 0 8px">Seçilen her gereksinim için yöntemine uygun bir doğrulama faaliyeti (test durumu) oluşturulur ve Verify ile bağlanır; yöntem boşsa önerilen yöntem gereksinime de yazılır. Oluşan faaliyetler VCRM, test kampanyası ve kapanış raporunda görünür.</div>`;
  h += `<table class="rt fmt"><thead><tr><th><input type="checkbox" data-dkall="1"${rs.every(r => DVK.sel.has(r.id)) ? ' checked' : ''}></th><th>ID</th><th>Seviye</th><th>Gereksinim metni</th><th>Mevcut yöntem</th><th>Önerilen yöntem</th><th>Oluşacak faaliyet</th></tr></thead><tbody>${rs.map(r => { const m = String(r.verif || '').split(/[,;]/)[0].trim() || verifSuggest(r.text); return `<tr class="${DVK.sel.has(r.id) ? 'sel' : ''}"><td><input type="checkbox" data-dksel="${r.id}"${DVK.sel.has(r.id) ? ' checked' : ''}></td><td><a class="lnk noi18n" data-goto="${r.id}"><b>${esc(r.reqId || '')}</b></a></td><td>${esc(reqLevel(r))}${r.subsys ? `<div class="muted noi18n">${esc(r.subsys)}</div>` : ''}</td><td class="noi18n" style="max-width:520px">${esc(r.text || '')}</td><td>${esc(r.verif || '—')}</td><td>${r.verif ? '<span class="muted">—</span>' : `<b>${esc(m)}</b>`}</td><td class="muted">${esc(m)} · ${esc(reqLevel(r) === 'Sistem' ? 'Sistem' : 'Alt Sistem')}</td></tr>`; }).join('')}</tbody></table>
    <div class="li" style="margin-top:8px"><button class="vb pri" data-dkgo="1"${DVK.sel.size ? '' : ' disabled'}>Seçilenler için doğrulama faaliyeti oluştur (${DVK.sel.size})</button></div></div>`;
  return h;
}
function skeletonApply(ids){
  const rs = ids.map(E).filter(Boolean); if(!rs.length) return 0; snap(); const cache = new Map();
  rs.forEach(r => { if(!String(r.verif || '').trim()) r.verif = verifSuggest(r.text); mkTestFor(r, null, cache); });
  afterChange(); return rs.length;
}
/* sihirbaza sekme olarak eklenir */
{
  const V0 = VIEWS['@derive'], _h = V0.render, _b = V0.bar;
  V0.render = () => `<div class="dvtabs"><button class="vb${DV.tab !== 'isk' ? ' on' : ''}" data-dvtab="oner">Gereksinim önerileri</button><button class="vb${DV.tab === 'isk' ? ' on' : ''}" data-dvtab="isk">Doğrulama iskeleti (${unverifiedReqs().length})</button></div>` + (DV.tab === 'isk' ? skeletonHTML() : _h());
  V0.bar = () => DV.tab === 'isk' ? `<button class="vb" data-dka="all">Tümünü seç</button><button class="vb" data-dka="none">Seçimi temizle</button>` : _b().replace('<span class="vsep"></span><button class="vb" data-dva="xl">', `<label class="vchk" title="Kabul edilen yeni gereksinimlerden doğrulama bağlantısı olmayanlar için yöntemine uygun test durumu oluşturulur"><input type="checkbox" data-dvmt="1"${DV.mkTests ? ' checked' : ''}> Kabul edilenlere doğrulama faaliyeti ekle</label><span class="vsep"></span><button class="vb" data-dva="xl">`);
  const Vw = $('#view'), rer = () => { renderViewBar(); renderView(); };
  Vw.addEventListener('click', ev => {
    if(ST.cur !== '@derive') return; const b = ev.target.closest('button'); if(!b) return; const d = b.dataset;
    if(d.dvtab){ DV.tab = d.dvtab; rer(); }
    if(d.dka === 'all'){ unverifiedReqs().forEach(r => DVK.sel.add(r.id)); rer(); }
    if(d.dka === 'none'){ DVK.sel.clear(); rer(); }
    if(d.dkgo){ const n = skeletonApply([...DVK.sel]); DVK.sel.clear(); rer(); toast(n + ' doğrulama faaliyeti oluşturuldu'); }
  }, true);
  Vw.addEventListener('change', ev => {
    if(ST.cur !== '@derive') return; const t = ev.target, d = t.dataset;
    if(d.dvmt){ DV.mkTests = t.checked; }
    if(d.dkall){ unverifiedReqs().forEach(r => t.checked ? DVK.sel.add(r.id) : DVK.sel.delete(r.id)); rer(); }
    if(d.dksel){ t.checked ? DVK.sel.add(d.dksel) : DVK.sel.delete(d.dksel); rer(); }
  });
  const css = document.createElement('style'); css.textContent = '.dvtabs{display:flex;gap:4px;margin:0 0 10px}.dvtabs .vb.on{background:#26364b;color:#fff;border-color:#26364b}'; document.head.appendChild(css);
}
VIEWS['@derive'].note += '<br><br><b>Çevresel profil</b> kuralı test profillerinden (PSD, sinüs, SRS, termal) sayısal değerli çevresel dayanım gereksinimleri üretir. <b>Doğrulama iskeleti</b> sekmesi Verify bağlantısı olmayan gereksinimler için yöntemine uygun doğrulama faaliyetleri oluşturur.';
