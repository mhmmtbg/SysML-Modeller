/* ================= v1.46: DAVRANIŞTAN, KISITTAN VE ANALİZDEN GEREKSİNİM TÜRETME — TÜRKÇE ÇEKİM ================= */
/* ---------- Türkçe gelecek zaman çekimi ----------
   Eylem adı ("Güç ver", "Hata raporla", "Test sonucunu kaydet") → "güç verecektir", "hata raporlayacaktır", "test sonucunu kaydedecektir".
   Son sözcük fiil kökü değilse null döner; kural o zaman '"X" işlevini yerine getirecektir' kalıbını kullanır. */
const TR_BACK = /[aıou]/, TR_VOW = /[aeıioöuü]/;
const TR_VERB_IRR = {et:'edecek', git:'gidecek', ye:'yiyecek', de:'diyecek', tat:'tadacak', güt:'güdecek', kaydet:'kaydedecek', reddet:'reddedecek', hallet:'halledecek', terket:'terkedecek', sabret:'sabredecek', affet:'affedecek', hisset:'hissedecek', seyret:'seyredecek', emret:'emredecek', zannet:'zannedecek', hapset:'hapsedecek', addet:'addedecek', kat:'katacak'};
const TR_VERBS = new Set(('al ver yap aç kapat kur seç bul gör göster bildir oku yaz sil ölç say tut sür dur durdur başlat bitir kes bağla çöz dön döndür gönder ilet iste izle dinle yönet besle soğut ısıt koru sakla ' +
  'hesapla raporla kaydet işle algıla kontrol denetle doğrula sına dene tanı tanımla belirle uygula üret sağla düzenle ayarla sıfırla güncelle yükle indir aktar dağıt topla karşılaştır filtrele dönüştür kilitle ' +
  'uyar tespit hazırla temizle çalıştır çalış bekle kaldır yerleştir taşı sabitle yönlendir hizala ateşle fırlat ayır birleştir eşle yansıt kodla şifrele çöz gözle gözet planla zamanla tetikle ' +
  'öner seç değerlendir analiz onayla reddet kabul geç gir çık kal ol bil sun').split(/\s+/));
function trLastVowel(w){ for(let i = w.length - 1; i >= 0; i--) if(TR_VOW.test(w[i])) return w[i]; return 'e'; }
function trFutureStem(v){
  v = String(v || '').toLocaleLowerCase('tr'); if(!v) return null;
  if(TR_VERB_IRR[v]) return TR_VERB_IRR[v];
  const back = TR_BACK.test(trLastVowel(v)), suf = back ? 'acak' : 'ecek';
  return TR_VOW.test(v[v.length - 1]) ? v + 'y' + suf : v + suf;
}
const trCop = fut => fut + (/acak$/.test(fut) ? 'tır' : 'tir');
function trIsVerb(w, prev){
  w = String(w || '').toLocaleLowerCase('tr');
  if(TR_VERB_IRR[w] || TR_VERBS.has(w)) return true;
  if(w === 'et' || w === 'ol' || w === 'yap') return true;
  return w.length > 3 && /(la|le|lat|let|laş|leş|dır|dir|dur|dür|tır|tir|tur|tür)$/.test(w) && !/(sel|sal|tal|nal|el|al)$/.test(w.slice(-3));
}
const trLower1 = s => { s = String(s || ''); const w = s.split(/\s+/)[0] || ''; return /^[A-ZÇĞİÖŞÜ0-9]{2,}/.test(w) || /[A-ZÇĞİÖŞÜ].*[A-ZÇĞİÖŞÜ]/.test(w.slice(1)) ? s : s.charAt(0).toLocaleLowerCase('tr') + s.slice(1); };
function trConjugate(phrase){
  const ws = String(phrase || '').trim().split(/\s+/); if(!ws.length || !ws[0]) return null;
  const last = ws[ws.length - 1]; if(!trIsVerb(last, ws[ws.length - 2])) return null;
  ws[ws.length - 1] = trCop(trFutureStem(last));
  return trLower1(ws.join(' '));
}
function trAct(subject, actName){ const c = trConjugate(actName); return c ? `${subject} ${c}` : `${subject}, "${actName}" işlevini yerine getirecektir`; }
/* ---------- ortak yardımcılar ---------- */
let PT_C = null, PT_REV = -1, PT_M = null, BD_C = null;
const partTypes = () => { if(PT_REV !== REV || PT_M !== M){ PT_C = new Set(); BD_C = []; Object.values(M.els).forEach(e => { if(e.kind === 'Part' && e.type) PT_C.add(e.type); if(e.kind === 'Binding') BD_C.push(e); }); PT_REV = REV; PT_M = M; } return PT_C; };
const allBindings = () => { partTypes(); return BD_C; };
const lvlOfBlock = b => { const tb = typeof topBlock === 'function' ? topBlock() : null; return !b || (tb && tb.id === b.id) || !partTypes().has(b.id) ? 'Sistem' : 'Alt Sistem'; };
const subjOf = b => lvlOfBlock(b) === 'Sistem' ? 'Sistem' : b.name;
function satisfiedBy(id){ return (relIdx().Satisfy || []).filter(s => s.src === id && E(s.tgt) && E(s.tgt).kind === 'Requirement').map(s => E(s.tgt)); }
function vcondOf(id){ let e = E(id), g = 0; while(e && g++ < 50){ if(e.vcond && String(e.vcond).trim()) return e.vcond; if(e.kind === 'Package' || e.kind === 'Model') return ''; e = E(e.owner); } return ''; }
/* ---------- kural: fonksiyon (tahsisli eylemler) ve kullanım durumları ---------- */
DERIVE_RULES.push({id:'fonk', tr:'Fonksiyon', doc:'Bir bloğa tahsis edilmiş (Allocate veya kulvar) her aksiyon/aktivite için o bloğa fonksiyonel gereksinim; eylem adı Türkçe gelecek zamana çekilir ("Güç ver" → "Güç Birimi güç verecektir"). Aktörlü kullanım durumlarından paydaş gereksinimi. Gereksinim davranışa Refine ile bağlanır; üst aktivitenin karşıladığı gereksinim varsa ondan türetilir.',
  opts:[['skipSat', 'Zaten bir gereksinimi karşılayan (Satisfy) eylemleri atla', true], ['uc', 'Kullanım durumlarından paydaş gereksinimi', true]],
  gen(cfg){
    const o = Object.assign({skipSat:true, uc:true}, (cfg.ruleOpts || {}).fonk || {}), out = [];
    Object.values(M.els).filter(e => (e.kind === 'Action' || e.kind === 'Activity') && e.name && String(e.name).trim()).sort(sortEls).forEach(a => {
      if(o.skipSat && satisfiedBy(a.id).length) return;
      const tg = [...allocTargets(a.id)].map(E).filter(b => b && b.kind === 'Block'); if(!tg.length) return;
      const own = E(a.owner), par = own && own.kind === 'Activity' ? satisfiedBy(own.id)[0] || null : (a.behavior ? satisfiedBy(a.behavior)[0] || null : null);
      tg.forEach(b => out.push({sig:'fn:' + a.id + ':' + b.id, level:lvlOfBlock(b), subsys:lvlOfBlock(b) === 'Alt Sistem' ? b.name : '', name:'Fonksiyon: ' + a.name, text:a.kind === 'Activity' ? `${subjOf(b)}, "${a.name}" işlevini yerine getirecektir` : trAct(subjOf(b), a.name), verif:'Test', src:[a.id, b.id], satisfyBy:b.id, refineBy:a.id, parent:par ? par.id : null, note:`${a.kind === 'Activity' ? 'Aktivite' : 'Aksiyon'} → ${b.name} (tahsis)${own && own.kind === 'Activity' ? ' · ' + own.name : ''}${par ? ' · üst: ' + par.reqId : ''}`}));
    });
    if(o.uc){
      const asc = (relIdx().Association || []).filter(r => E(r.src) && E(r.tgt)), tb = typeof topBlock === 'function' ? topBlock() : null;
      Object.values(M.els).filter(u => u.kind === 'UseCase' && u.name).sort(sortEls).forEach(u => {
        if(satisfiedBy(u.id).length && o.skipSat) return;
        const acts = [...new Set(asc.filter(r => (r.src === u.id && E(r.tgt).kind === 'Actor') || (r.tgt === u.id && E(r.src).kind === 'Actor')).map(r => nm(E(r.src === u.id ? r.tgt : r.src))))];
        if(!acts.length) return;
        out.push({sig:'uc:' + u.id, level:'Sistem', name:'Kullanım: ' + u.name, text:`Sistem, ${listTr(acts)} için "${u.name}" kullanım durumunu destekleyecektir`, verif:'Gösterim', src:[u.id], satisfyBy:tb ? tb.id : null, refineBy:u.id, note:'Aktör: ' + acts.join(', ')});
      });
    }
    return out;
  }
});
/* ---------- kural: durum makinesi (mod ve geçiş, zamanlama) ---------- */
const PSEUDO = new Set(['Choice', 'Junction', 'Decision', 'Merge', 'Fork', 'Join']);
function trigText(t){
  const n = String(t.name || '').trim(); if(!n) return null;
  const m = /^after\s*\(\s*([\d.,]+)\s*([^)]*)\)$/i.exec(n); if(m) return {after:trNum(parseFloat(m[1].replace(',', '.'))) + (m[2].trim() ? ' ' + m[2].trim() : ' s')};
  const w = /^when\s*\((.+)\)$/i.exec(n); if(w) return {when:w[1].trim()};
  return {ev:n};
}
function stmPhrase(S, trg, guard, els){
  const g = guard && !/^(else|değilse|aksi)$/i.test(guard.trim()) ? ` [${guard.trim()}] koşulu sağlanıyorsa` : els ? ' diğer koşullar sağlanmıyorsa' : '';
  if(!trg) return `"${S}" durumundaki işlemler tamamlandığında${g}`;
  if(trg.after) return `"${S}" durumuna girdikten ${trg.after} sonra${g}`;
  if(trg.when) return `"${S}" durumundayken [${trg.when}] koşulu oluştuğunda${g}`;
  return `"${S}" durumundayken "${trg.ev}" olayı alındığında${g}`;
}
DERIVE_RULES.push({id:'durum', tr:'Mod ve geçiş', doc:'Durum makinelerinin geçişlerinden mod/geçiş gereksinimi: olay ("… olayı alındığında"), koruma koşulu ("[x] koşulu sağlanıyorsa"), zaman tetiklemesi after(30 s) → "… durumuna girdikten 30 s sonra"; seçim düğümleri gelen geçişle birleştirilir. Başlangıç durumu için ayrı gereksinim. Bağlam bloğu durum makinesinin sahibidir.',
  opts:[['init', 'Başlangıç durumu gereksinimi', true]],
  gen(cfg){
    const o = Object.assign({init:true}, (cfg.ruleOpts || {}).durum || {}), out = [], TS = Object.values(M.els).filter(e => e.kind === 'Transition' && E(e.src) && E(e.tgt));
    Object.values(M.els).filter(e => e.kind === 'StateMachine').sort(sortEls).forEach(sm => {
      const own = E(sm.owner), B = own && own.kind === 'Block' ? own : (typeof topBlock === 'function' ? topBlock() : null), subj = B ? subjOf(B) : 'Sistem', lv = B ? lvlOfBlock(B) : 'Sistem';
      const inSm = id => { const x = E(id); return x && (x.owner === sm.id || isAnc(sm.id, id)); };
      const mine = TS.filter(t => inSm(t.src));
      const base = {level:lv, subsys:lv === 'Alt Sistem' ? B.name : '', verif:'Test', satisfyBy:B ? B.id : null, refineBy:sm.id};
      mine.forEach(t => {
        const s = E(t.src), g = E(t.tgt);
        if(PSEUDO.has(g.kind)) return; /* seçim düğümüne giren geçiş, çıkan geçişlerle birleştirilir */
        const T = g.kind === 'Final' || g.kind === 'FinalState' ? null : (g.name || g.kind);
        const to = T ? `"${T}" durumuna geçecektir` : 'çalışmasını sonlandıracaktır';
        if(s.kind === 'Initial' || s.kind === 'InitialState'){
          if(!o.init || !T) return; const par = E(s.owner);
          const text = par && par.kind === 'State' ? `${subj}, "${par.name}" durumuna girdiğinde "${T}" alt durumunda başlayacaktır` : `${subj} başlangıçta "${T}" durumunda olacaktır`;
          out.push(Object.assign({sig:'stm:' + t.id, name:'Mod: başlangıç' + (par && par.kind === 'State' ? ' (' + par.name + ')' : ''), text, src:[t.id, sm.id], note:sm.name}, base)); return;
        }
        if(PSEUDO.has(s.kind)){
          TS.filter(i => i.tgt === s.id && E(i.src) && !PSEUDO.has(E(i.src).kind)).forEach(i => {
            const S = E(i.src); const els = /^(else|değilse|aksi)$/i.test(String(t.guard || '').trim());
            out.push(Object.assign({sig:'stm:' + i.id + ':' + t.id, name:'Geçiş: ' + (S.name || S.kind) + ' → ' + (T || 'son'), text:`${subj}, ${stmPhrase(S.name || S.kind, trigText(i), t.guard || i.guard, els)} ${to}`, src:[i.id, t.id, sm.id], note:`${sm.name} · seçim düğümü üzerinden${t.effect ? ' · efekt: ' + t.effect : ''}`}, base));
          });
          return;
        }
        out.push(Object.assign({sig:'stm:' + t.id, name:'Geçiş: ' + (s.name || s.kind) + ' → ' + (T || 'son'), text:`${subj}, ${stmPhrase(s.name || s.kind, trigText(t), t.guard, false)} ${to}`, src:[t.id, sm.id], note:`${sm.name}${t.effect ? ' · efekt: ' + t.effect : ''}`}, base));
      });
    });
    return out;
  }
});
/* ---------- kural: kısıt eşitsizlikleri ve toleranslar (performans) ---------- */
function cpParamValues(blockId){
  const par = new Map(), find = k => { while(par.get(k) !== k){ par.set(k, par.get(par.get(k))); k = par.get(k); } return k; }, node = k => { if(!par.has(k)) par.set(k, k); return k; };
  const cps = kidsOf(blockId).filter(c => c.kind === 'ConstraintProp' && c.type && E(c.type)), cpSet = new Set(cps.map(c => c.id));
  const keyOf = (id, ctx) => { const e = E(id); if(!e) return null; if(e.kind === 'Param') return ctx && cpSet.has(ctx) ? 'P:' + ctx + ':' + id : null; if(e.kind === 'Value') return 'V:' + id; return null; };
  allBindings().forEach(r => { const a = keyOf(r.src, r.sp), b = keyOf(r.tgt, r.tp); if(a && b){ const x = find(node(a)), y = find(node(b)); if(x !== y) par.set(x, y); } });
  const vals = new Map(); par.forEach((_, k) => { if(k.startsWith('V:')) vals.set(find(k), E(k.slice(2))); });
  const out = new Map();
  cps.forEach(cp => { const m = new Map(); kidsOf(cp.type).filter(p => p.kind === 'Param').forEach(p => { const k = 'P:' + cp.id + ':' + p.id; const v = par.has(k) ? vals.get(find(k)) : null; m.set(p.name, v || null); }); out.set(cp.id, m); });
  return {cps, map:out};
}
const OPS = {'<=':'le', '≤':'le', '>=':'ge', '≥':'ge', '<':'lt', '>':'gt'}, FLIP = {le:'ge', ge:'le', lt:'gt', gt:'lt'};
function boundText(vn, n, u, op){ const nu = trNum(n) + (u ? ' ' + u : ''); return op === 'le' ? `${vn} değeri en fazla ${nu} olacaktır` : op === 'ge' ? `${vn} değeri en az ${nu} olacaktır` : op === 'lt' ? `${vn} değeri ${nu} değerinin altında olacaktır` : `${vn} değeri ${nu} değerinin üzerinde olacaktır`; }
DERIVE_RULES.push({id:'kisit', tr:'Performans (kısıt)', doc:'Kısıt bloklarındaki eşitsizlikler (ör. P <= 120) bağlamada (binding) bağlı değer özelliğiyle performans gereksinimine çevrilir ("Güç Birimi güç değeri en fazla 120 W olacaktır"); karmaşık ifadeler parametre adları değer adlarıyla değiştirilerek yazılır. Tolerans aralığı tanımlı değerler (Monte Carlo) için aralık gereksinimi.',
  opts:[['tol', 'Tolerans aralıklı değerlerden aralık gereksinimi', true]],
  gen(cfg){
    const o = Object.assign({tol:true}, (cfg.ruleOpts || {}).kisit || {}), out = [];
    Object.values(M.els).filter(b => b.kind === 'Block').sort(sortEls).forEach(B => {
      const kk = kidsOf(B.id); if(!kk.some(c => (c.kind === 'ConstraintProp' && c.type) || (o.tol && c.kind === 'Value' && c.tol && typeof c.tol === 'object'))) return;
      const {cps, map} = cpParamValues(B.id); const subj = subjOf(B), lv = lvlOfBlock(B);
      cps.forEach(cp => {
        const cb = E(cp.type), pm = map.get(cp.id) || new Map(); let ins = []; try { ins = parseIneqs(cb.expr); } catch(e){ return; }
        ins.forEach((src, i) => {
          const s = String(src).trim(); let m = /^([A-Za-zÇĞİÖŞÜçğıöşü_][\wÇĞİÖŞÜçğıöşü.]*)\s*(<=|>=|≤|≥|<|>)\s*(-?\d+(?:[.,]\d+)?)$/.exec(s), op, vn, n;
          if(m){ vn = m[1]; op = OPS[m[2]]; n = parseFloat(m[3].replace(',', '.')); }
          else if((m = /^(-?\d+(?:[.,]\d+)?)\s*(<=|>=|≤|≥|<|>)\s*([A-Za-zÇĞİÖŞÜçğıöşü_][\wÇĞİÖŞÜçğıöşü.]*)$/.exec(s))){ vn = m[3]; op = FLIP[OPS[m[2]]]; n = parseFloat(m[1].replace(',', '.')); }
          const base = {sig:'cst:' + cp.id + ':' + i, level:lv, subsys:lv === 'Alt Sistem' ? B.name : '', verif:'Analiz, Test', satisfyBy:B.id, refineBy:cp.id, src:[cp.id, cb.id]};
          if(vn){ const v = pm.get(vn), u = v ? unitOf(v) : ''; const name = v ? v.name : vn; out.push(Object.assign(base, {name:'Performans: ' + name, text:`${subj} ${boundText(name, n, u, op)}`, src:base.src.concat(v ? [v.id] : []), note:`${cb.name}: ${s}${v ? ' · ' + vn + ' = ' + v.name : ' · bağlanmamış parametre'}`})); }
          else { let e2 = s; pm.forEach((v, k) => { if(v) e2 = e2.replace(new RegExp('(^|[^\\wÇĞİÖŞÜçğıöşü])' + k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?![\\wÇĞİÖŞÜçğıöşü])', 'g'), '$1' + v.name); }); out.push(Object.assign(base, {name:'Performans: ' + cb.name, text:`${subj}, [${e2}] kısıtını sağlayacaktır`, note:`${cb.name}: ${s}`})); }
        });
      });
      if(o.tol) kidsOf(B.id).filter(v => v.kind === 'Value' && v.tol && typeof v.tol === 'object' && numOf(v.tol.lo) != null && numOf(v.tol.hi) != null).forEach(v => {
        const u = unitOf(v), lo = numOf(v.tol.lo), hi = numOf(v.tol.hi);
        out.push({sig:'tol:' + v.id, level:lv, subsys:lv === 'Alt Sistem' ? B.name : '', name:'Tolerans: ' + v.name, text:`${subj} ${v.name} değeri ${trNum(lo)}${u ? ' ' + u : ''} ile ${trNum(hi)}${u ? ' ' + u : ''} arasında olacaktır`, verif:'Test', src:[v.id], satisfyBy:B.id, note:`Tolerans (${v.tol.dist === 'uni' ? 'düzgün' : 'normal'} dağılım)`});
      });
    });
    return out;
  }
});
/* ---------- kural: FMEA önlemleri ve risk azaltımları (güvenilirlik / emniyet) ---------- */
DERIVE_RULES.push({id:'fmea', tr:'Güvenilirlik (FMEA)', doc:'Kapanmamış ve önerilen önlemi olan FMEA kalemlerinden — RPN eşik değerini aşan veya şiddeti 9–10 olanlar — güvenilirlik/emniyet gereksinimi ("Güç Birimi, "Çıkış gerilimi yok" arıza kipine karşı "Yedekli DC-DC" önlemini sağlayacaktır"). Gereksinim FMEA satırının gereksinim listesine eklenir. İsteğe bağlı: teknik/emniyet/kalifikasyon kategorisinde yüksek seviyeli risklerin azaltım önlemleri.',
  opts:[['risk', 'Yüksek seviyeli teknik / emniyet risklerinin azaltımları', false]],
  gen(cfg){
    const o = Object.assign({risk:false, rpn:100}, (cfg.ruleOpts || {}).fmea || {}), out = [];
    allFMs().filter(f => (f.fst || 'Açık') !== 'Kapandı' && String(f.act || '').trim() && ((rpnOf(f) || 0) >= o.rpn || (n10(f.S) || 0) >= 9)).forEach(f => {
      const h = fmHost(f); let B = h && h.kind === 'Part' && h.type ? E(h.type) : h && (h.kind === 'Block' || h.kind === 'InterfaceBlock') ? h : null;
      if(!B && h && (h.kind === 'Action' || h.kind === 'Activity')) B = [...allocTargets(h.id)].map(E).find(b => b && b.kind === 'Block') || null;
      const subj = B ? subjOf(B) : 'Sistem', lv = B ? lvlOfBlock(B) : 'Sistem', act = String(f.act).trim().replace(/[.\s]+$/, '');
      out.push({sig:'fm:' + f.id, level:lv, subsys:lv === 'Alt Sistem' && B ? B.name : '', name:'Güvenilirlik: ' + f.name, text:`${subj}, "${f.name}" arıza kipine karşı "${act}" önlemini sağlayacaktır`, verif:'Test, Analiz', src:[f.id], satisfyBy:B ? B.id : null, fmLink:f.id, note:`RPN ${rpnOf(f) || '—'} · S ${f.S || '—'} · ${f.effE || f.effN || ''}`});
    });
    if(o.risk) allRisks().filter(r => (r.rst || 'Açık') !== 'Kapandı' && String(r.act || '').trim() && /Teknik|Emniyet|Güvenlik|Kalifikasyon/.test(r.cat || '') && ['Yüksek', 'Çok yüksek'].includes(rkLevel((n10(r.P) || 0) * (n10(r.I) || 0)))).forEach(r => {
      const act = String(r.act).trim().replace(/[.\s]+$/, ''), tb = typeof topBlock === 'function' ? topBlock() : null;
      out.push({sig:'rk:' + r.id, level:'Sistem', name:'Risk azaltımı: ' + r.name, text:`Sistem, "${r.name}" riskine karşı "${act}" önlemini sağlayacaktır`, verif:'Analiz, Test', src:[r.id], satisfyBy:tb ? tb.id : null, riskLink:r.id, note:`${r.riskId || ''} · ${r.cat || ''} · ${rkLevel((n10(r.P) || 0) * (n10(r.I) || 0))}`});
    });
    return out;
  }
});
/* ---------- varyant koşulu kalıtımı ve FMEA / risk bağlantısı ---------- */
DERIVE_HOOKS.run.push(L => L.forEach(s => { if(s.state !== 'kaynak yok' && !s.vcond && s.src) s.vcond = (s.src || []).map(vcondOf).find(Boolean) || ''; }));
DERIVE_HOOKS.apply.push(list => list.forEach(s => { const r = s.req; if(!r || s.state !== 'yeni') return;
  if(s.fmLink && E(s.fmLink)){ const f = E(s.fmLink); f.reqs = (f.reqs || []).concat(f.reqs && f.reqs.includes(r.id) ? [] : [r.id]); }
  if(s.riskLink && E(s.riskLink)){ const k = E(s.riskLink); k.links = (k.links || []).concat(k.links && k.links.includes(r.id) ? [] : [r.id]); } }));
VIEWS['@derive'].note += '<br><br><b>Fonksiyon</b>, <b>Mod ve geçiş</b>, <b>Performans</b> ve <b>Güvenilirlik</b> kuralları tahsisli eylemlerden, durum makinelerinden, kısıt eşitsizliklerinden ve FMEA önlemlerinden gereksinim üretir. Eylem adları Türkçe gelecek zamana çekilir ("Güç ver" → "güç verecektir"). Kaynağın varyant koşulu gereksinime aktarılır.';
