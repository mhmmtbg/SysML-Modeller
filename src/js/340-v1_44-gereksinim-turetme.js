/* ================= v1.44: OTOMATİK GEREKSİNİM TÜRETME — ALTYAPI, ARAYÜZ VE BÜTÇE DAĞITIMI =================
   Kurallar DERIVE_RULES'a kayıt olur: {id, tr, doc, gen(cfg) → öneri[]}.
   Öneri: {sig, level, subsys, name, text, verif, src:[id], satisfyBy, parent, note, extra}
   sig kararlı bir imzadır: aynı kaynak aynı imzayı üretir. Kabul edilen gereksinim e.derivedFrom = {rule, sig, gen, src, t} taşır;
   böylece sihirbaz tekrar çalıştığında yinelenmez, kaynak değiştiyse "güncelle", kaynak silindiyse "kaynak yok" önerir. */
const DERIVE_RULES = [];
const deriveCfg = () => (M.deriveCfg = M.deriveCfg || {rules:{}, budget:{}});
/* ---------- metin yardımcıları ---------- */
function trNum(v){ if(v == null || !isFinite(v)) return '—'; const a = Math.abs(v); return v.toLocaleString('tr-TR', {maximumFractionDigits:a >= 100 ? 0 : a >= 10 ? 1 : a >= 1 ? 2 : 3}); }
function floorSig(v, n){ if(!v || !isFinite(v)) return v; const p = Math.pow(10, Math.floor(Math.log10(Math.abs(v))) - (n - 1)); return Number((Math.floor(v / p + 1e-9) * p).toPrecision(n)); }
const sentCap = s => { s = String(s || '').trim().replace(/\s+/g, ' '); return s ? s.charAt(0).toLocaleUpperCase('tr') + s.slice(1) : s; };
const sentEnd = s => /[.!?]$/.test(s) ? s : s + '.';
const blkName = e => e ? (e.kind === 'Part' && e.type && E(e.type) ? E(e.type).name : e.name) : '';
function verifFor(word){ const w = String(word || '').toLocaleLowerCase('tr'); return /kütle|ağırlık|boyut|hacim|mass/.test(w) ? 'Muayene' : /maliyet|cost|güvenilirlik|mtbf/.test(w) ? 'Analiz' : 'Test'; }
/* ---------- öneri motoru ---------- */
function derivedReqs(){ return Object.values(M.els).filter(e => e.kind === 'Requirement' && e.derivedFrom && e.derivedFrom.sig); }
function deriveRun(ruleIds){
  const cfg = deriveCfg(), on = new Set(ruleIds || DERIVE_RULES.filter(r => cfg.rules[r.id] !== false).map(r => r.id));
  const bySig = new Map(); derivedReqs().forEach(r => bySig.set(r.derivedFrom.sig, r));
  const out = [], seen = new Set();
  DERIVE_RULES.filter(r => on.has(r.id)).forEach(rule => {
    let list = []; try { list = rule.gen(cfg) || []; } catch(e){ appErr('derive:' + rule.id, e); }
    list.forEach(s => {
      if(!s || !s.sig || seen.has(s.sig)) return; seen.add(s.sig);
      s.rule = rule.id; s.ruleTr = rule.tr; s.text = sentEnd(sentCap(s.text));
      const ex = bySig.get(s.sig);
      if(!ex) s.state = 'yeni';
      else { s.req = ex; const gen0 = ex.derivedFrom.gen || '', edited = String(ex.text || '').trim() !== gen0.trim(); s.edited = edited; s.state = gen0.trim() === s.text.trim() || (edited && String(ex.text).trim() === s.text.trim()) ? 'mevcut' : 'güncelle'; }
      out.push(s);
    });
  });
  derivedReqs().filter(r => on.has(r.derivedFrom.rule) && !seen.has(r.derivedFrom.sig) && reqStatus(r) !== 'İptal').forEach(r => out.push({sig:r.derivedFrom.sig, rule:r.derivedFrom.rule, ruleTr:(DERIVE_RULES.find(x => x.id === r.derivedFrom.rule) || {}).tr || r.derivedFrom.rule, state:'kaynak yok', req:r, level:reqLevel(r), subsys:r.subsys, name:r.name, text:r.text, note:'Kaynağı modelde artık yok veya kural artık bu gereksinimi üretmiyor'}));
  return out;
}
function deriveApply(list, parentId){
  if(!list.length) return {n:0, u:0, x:0};
  snap(); let n = 0, u = 0, x = 0; const today = new Date().toISOString().slice(0, 10);
  list.forEach(s => {
    if(s.state === 'yeni'){
      const r = mk('Requirement', reqPkgFor(s.level, s.subsys), {level:s.level, subsys:s.level === 'Alt Sistem' ? s.subsys || '' : '', name:s.name || '', text:s.text, verif:s.verif || '', status:'Taslak'});
      r.derivedFrom = {rule:s.rule, sig:s.sig, gen:s.gen || s.text, src:(s.src || []).filter(Boolean), t:today};
      if(s.extra) Object.assign(r, s.extra);
      if(s.vcond) r.vcond = s.vcond;
      if(s.satisfyBy && E(s.satisfyBy)) addRel('Satisfy', s.satisfyBy, r.id);
      const par = s.parent || parentId; if(par && E(par) && par !== r.id) addRel('DeriveReqt', r.id, par);
      (s.verifyBy || []).forEach(t => E(t) && addRel('Verify', t, r.id));
      s.req = r; n++;
    } else if(s.state === 'güncelle' && s.req){
      s.req.text = s.text; s.req.derivedFrom.gen = s.gen || s.text; s.req.derivedFrom.t = today; if(s.name && !s.req.name) s.req.name = s.name; if(s.extra) Object.assign(s.req, s.extra);
      if(reqStatus(s.req) === 'Onaylı') s.req.status = 'Değişiklikte'; u++;
    } else if(s.state === 'kaynak yok' && s.req){ s.req.status = 'İptal'; x++; }
  });
  afterChange(); return {n, u, x};
}
/* ---------- kural: arayüz gereksinimleri ---------- */
function ifItemsText(c){
  const it0 = cItems(c), types = new Set(it0.map(x => x.type).filter(Boolean)), it = it0.filter(x => !(x.src !== 'arayüz' && types.has(x.name))); if(!it.length) return '';
  const one = x => x.name + (x.type || x.unit ? ' (' + [x.type, x.unit].filter(Boolean).join(', ') + ')' : '');
  return it.length === 1 ? one(it[0]) : it.slice(0, -1).map(one).join(', ') + ' ve ' + one(it[it.length - 1]);
}
DERIVE_RULES.push({id:'arayuz', tr:'Arayüz', doc:'Her bağlantı (connector) için sağlayan tarafa çıkış, alan tarafa giriş gereksinimi; protokol/standart tanımlıysa uyum gereksinimi. Değerler ICD alanlarından (arayüz ID, özellikler, protokol, akış öğeleri) alınır.',
  opts:[['proto', 'Protokol / standart uyum gereksinimi', true], ['recv', 'Alan taraf için giriş gereksinimi', true]],
  gen(cfg){
    const o = Object.assign({proto:true, recv:true}, (cfg.ruleOpts || {}).arayuz || {}), out = [], scope = cfg.ifScope || 'all';
    allConns().filter(c => scope === 'all' || c.owner === scope).forEach(c => {
      const a = cEnd(c, 0), b = cEnd(c, 1); if(!a || !b || a.boundary || b.boundary) return;
      const ha = a.part || a.host, hb = b.part || b.host; if(!ha || !hb) return;
      const A = blkName(ha), B = blkName(hb), Ab = ha.kind === 'Part' && ha.type ? ha.type : ha.id, Bb = hb.kind === 'Part' && hb.type ? hb.type : hb.id; if(!A || !B || A === B) return;
      const d = cFlowDir(a, b), id = c.icdId || c.name || 'arayüz', items = ifItemsText(c) || 'tanımlı arayüz öğelerini', spec = String(c.spec || '').trim().replace(/[.\s]+$/, ''), srcs = [c.id, ha.id, hb.id];
      const nameOf = (s) => (c.icdId ? c.icdId + ' ' : '') + s;
      if(d === 0){
        [[A, B, Ab, ha], [B, A, Bb, hb]].forEach(([X, Y, Xb, hx]) => out.push({sig:'if:' + c.id + ':io:' + Xb, level:'Alt Sistem', subsys:X, name:nameOf('veri/öğe alışverişi'), text:`${X}, ${id} arayüzü üzerinden ${Y} ile ${items} alışverişini ${spec ? spec + ' özellikleriyle ' : ''}yapacaktır`, verif:'Test', src:srcs, satisfyBy:Xb, vcond:hx.vcond || '', note:`${a.label} ↔ ${b.label}`}));
      } else {
        const [P, R, Pb, Rb, hp, hr, lp, lr] = d > 0 ? [A, B, Ab, Bb, ha, hb, a.label, b.label] : [B, A, Bb, Ab, hb, ha, b.label, a.label];
        out.push({sig:'if:' + c.id + ':out:' + Pb, level:'Alt Sistem', subsys:P, name:nameOf('çıkışı'), text:`${P}, ${id} arayüzü üzerinden ${R} için ${items} çıkışını ${spec ? spec + ' özellikleriyle ' : ''}sağlayacaktır`, verif:'Test', src:srcs, satisfyBy:Pb, vcond:hp.vcond || '', note:`${lp} → ${lr}`});
        if(o.recv) out.push({sig:'if:' + c.id + ':in:' + Rb, level:'Alt Sistem', subsys:R, name:nameOf('girişi'), text:`${R}, ${P} tarafından ${id} arayüzü üzerinden sağlanan ${items} girdisini kabul edecektir`, verif:'Test', src:srcs, satisfyBy:Rb, vcond:hr.vcond || '', note:`${lr} ← ${lp}`});
      }
      const proto = String(c.proto || '').trim();
      if(o.proto && proto) out.push({sig:'if:' + c.id + ':proto', level:'Alt Sistem', subsys:d >= 0 ? A : B, name:nameOf('standart uyumu'), text:`${A} ile ${B} arasındaki ${id} arayüzü ${proto} gerekliliklerini karşılayacaktır`, verif:'Muayene, Test', src:srcs, satisfyBy:d >= 0 ? Ab : Bb, note:'Protokol / standart: ' + proto});
    });
    return out;
  }
});
/* ---------- kural: bütçe dağıtımı (flow-down) ---------- */
const MAX_RE = /aşmayacak|aşmamalı|geçmeyecek|geçmemeli|en fazla|en çok|azami|maksimum|altında olacak|altında kalacak|≤|<=/i;
let BU_C = null, BU_REV = -1, BU_M = null;
function budgetUnits(){ if(BU_REV !== REV || BU_M !== M){ const um = new Map(); Object.values(M.els).forEach(e => { if(e.kind === 'Value' && !um.has(e.name)) um.set(e.name, unitOf(e)); }); BU_C = new Map(budgetProps().map(p => [p, um.get(p) || ''])); BU_REV = REV; BU_M = M; } return BU_C; }
function reqLimit(r, prop, unit){
  const t = String(r.text || ''), u = unit != null ? unit : budgetUnits().get(prop) || budgetUnit(prop); if(!u || !/\d/.test(t)) return null;
  const re = new RegExp('(\\d+(?:[.,]\\d+)?)\\s*' + u.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?![A-Za-zÇĞİÖŞÜçğıöşü])');
  const m = re.exec(t); if(!m) return null;
  return {val:parseFloat(m[1].replace(',', '.')), unit:u, max:MAX_RE.test(t)};
}
function budgetCands(){
  const rs = allReqs().filter(r => !r.budgetAlloc && reqStatus(r) !== 'İptal' && /\d/.test(r.text || '') && MAX_RE.test(r.text || '')); if(!rs.length) return [];
  const units = [...budgetUnits()].filter(([, u]) => u), sat = relIdx().Satisfy || [];
  return rs.map(r => {
    const low = String(r.text || '').toLocaleLowerCase('tr');
    const hits = units.map(([p, u]) => ({p, L:reqLimit(r, p, u)})).filter(x => x.L && x.L.max).sort((x, y) => (low.includes(y.p.toLocaleLowerCase('tr')) ? 1 : 0) - (low.includes(x.p.toLocaleLowerCase('tr')) ? 1 : 0));
    if(!hits.length) return null;
    const blk = sat.filter(s => s.tgt === r.id && E(s.src) && E(s.src).kind === 'Block').map(s => E(s.src)).find(b => kidsOf(b.id).some(k => k.kind === 'Part')) || null;
    return {r, prop:hits[0].p, props:hits.map(h => h.p), L:hits[0].L, root:blk};
  }).filter(Boolean);
}
function budgetPlan(c, bc){
  const root = E(bc.root) || c.root; if(!root) return {err:'Kök blok yok — gereksinimi karşılayan (Satisfy) ve part\'ları olan bir blok seçin', rows:[]};
  const prop = bc.prop || c.prop, L = reqLimit(c.r, prop); if(!L) return {err:'Gereksinim metninde "' + prop + '" birimiyle (' + (budgetUnit(prop) || '?') + ') sayısal sınır bulunamadı', rows:[]};
  const parts = kidsOf(root.id).filter(p => p.kind === 'Part' && !p.shared && p.type && E(p.type) && E(p.type).kind === 'Block' && (typeof varOn !== 'function' || varOn(p)));
  if(!parts.length) return {err:'Kök blokta part yok', rows:[]};
  const margin = Math.max(0, Math.min(90, numOf(bc.margin) == null ? 10 : numOf(bc.margin))), avail = L.val * (1 - margin / 100);
  const cur = parts.map(p => { const m = multOf(p.mult).n || 1, t = rollup(p.type, prop).total; return {p, m, t:t == null ? null : t * m}; });
  const prop0 = (bc.method || 'oran') === 'oran' && cur.every(x => x.t != null && x.t > 0);
  const sum = cur.reduce((s, x) => s + (x.t || 0), 0);
  const rows = cur.map(x => { const tot = prop0 ? avail * x.t / sum : avail / cur.length, per = floorSig(tot / x.m, 3); return {p:x.p, mult:x.m, cur:x.t, alloc:per, total:per * x.m}; });
  return {root, prop, L, margin, avail, method:prop0 ? 'oran' : 'esit', fallback:(bc.method || 'oran') === 'oran' && !prop0, rows, unit:L.unit};
}
DERIVE_RULES.push({id:'butce', tr:'Bütçe dağıtımı', doc:'Sayısal üst sınırlı bir gereksinim (ör. "toplam kütle 45 kg\'ı aşmayacaktır") kök bloğun part\'larına dağıtılır: mevcut değerlerle orantılı veya eşit; sistem marjı ayrılır. Her pay, üst gereksinimden türetilmiş alt sistem gereksinimi olur.',
  gen(cfg){
    const out = [];
    budgetCands().forEach(c => {
      const bc = cfg.budget[c.r.id] || {}; if(bc.on === false) return;
      const P = budgetPlan(c, bc); if(P.err) return;
      P.rows.forEach(x => {
        const B = E(x.p.type).name;
        out.push({sig:'bud:' + c.r.id + ':' + x.p.id + ':' + P.prop, level:'Alt Sistem', subsys:B, name:P.prop.charAt(0).toLocaleUpperCase('tr') + P.prop.slice(1) + ' bütçesi',
          text:`${B} ${P.prop} değeri${x.mult > 1 ? ' (adet başına)' : ''} en fazla ${trNum(x.alloc)} ${P.unit} olacaktır`, verif:verifFor(P.prop), src:[c.r.id, x.p.id], satisfyBy:x.p.type, parent:c.r.id, vcond:x.p.vcond || '',
          extra:{budgetAlloc:{prop:P.prop, val:x.alloc, unit:P.unit, mult:x.mult, part:x.p.id, parent:c.r.id, lim:P.L.val, margin:P.margin, method:P.method}},
          note:`${c.r.reqId}: ${trNum(P.L.val)} ${P.unit} − %${trNum(P.margin)} marj → ${x.p.name}${x.mult > 1 ? ' ×' + x.mult : ''}; mevcut ${x.cur == null ? '—' : trNum(x.cur) + ' ' + P.unit}${P.method === 'oran' ? ' (orantılı)' : ' (eşit)'}`});
      });
    });
    return out;
  }
});
/* ---------- doğrulayıcılar ---------- */
VALIDATORS.push(add => {
  const al = allReqs().filter(r => r.budgetAlloc && reqStatus(r) !== 'İptal'), byPar = new Map();
  if(!al.length && !derivedReqs().length) return; const SAT = relIdx().Satisfy || [];
  al.forEach(r => { const a = r.budgetAlloc, k = a.parent + '|' + a.prop; if(!byPar.has(k)) byPar.set(k, []); byPar.get(k).push(r);
    const blk = SAT.filter(s => s.tgt === r.id && E(s.src) && E(s.src).kind === 'Block').map(s => E(s.src))[0];
    if(blk){ const t = rollup(blk.id, a.prop).total; if(t != null && a.val != null && t > a.val + 1e-9) add('uyarı', 'Bütçe payı aşıldı', r, `${blk.name}: ${a.prop} ${trNum(t)} ${a.unit} > pay ${trNum(a.val)} ${a.unit}`); }
  });
  byPar.forEach((rs, k) => { const p = E(rs[0].budgetAlloc.parent); if(!p) return; const lim = rs[0].budgetAlloc.lim, s = rs.reduce((t, r) => t + (r.budgetAlloc.val || 0) * (r.budgetAlloc.mult || 1), 0); if(lim != null && s > lim + 1e-9) add('hata', 'Bütçe dağıtımı tutarsız', p, `Alt paylar toplamı ${trNum(s)} ${rs[0].budgetAlloc.unit} > sınır ${trNum(lim)} ${rs[0].budgetAlloc.unit}`); });
  derivedReqs().filter(r => reqStatus(r) !== 'İptal' && (r.derivedFrom.src || []).length && !(r.derivedFrom.src || []).every(id => E(id))).forEach(r => add('uyarı', 'Türetme kaynağı silinmiş', r, 'Bu gereksinimi üreten model elemanı silinmiş — türetme sihirbazında "kaynak yok" olarak görünür'));
});
/* ---------- sihirbaz görünümü ---------- */
let DV = {sel:new Set(), show:'acik', parent:'', list:null, edits:{}, rule:'all'};
function deriveList(){ if(!DV.list || DV.rev !== REV || DV.m !== M){ DV.list = deriveRun(); DV.rev = REV; DV.m = M; const ok = new Set(DV.list.filter(x => x.state !== 'mevcut').map(x => x.sig)); DV.sel = new Set([...DV.sel].filter(x => ok.has(x))); } return DV.list; }
function deriveRefresh(){ DV.list = null; DV.sel = new Set(); DV.edits = {}; }
const DSTATE = {'yeni':['Yeni', '#2e7d32'], 'güncelle':['Güncelle', '#d18a00'], 'mevcut':['Mevcut', '#7f8c8d'], 'kaynak yok':['Kaynak yok', '#c0392b']};
function deriveHTML(){
  const cfg = deriveCfg(), L = deriveList();
  let h = `<div class="tsw"><div class="sub"><span>Kurallar</span></div><div class="dvrules">${DERIVE_RULES.map(r => `<label class="dvrule" title="${esc(r.doc)}"><input type="checkbox" data-dvr="${r.id}"${cfg.rules[r.id] !== false ? ' checked' : ''}> <b>${esc(r.tr)}</b> <span class="muted">(${L.filter(s => s.rule === r.id && s.state !== 'mevcut').length})</span></label>${(r.opts || []).map(([k, t, d]) => { const v = ((cfg.ruleOpts || {})[r.id] || {})[k]; return `<label class="dvopt"><input type="checkbox" data-dvo="${r.id}|${k}"${(v == null ? d : v) ? ' checked' : ''}> ${esc(t)}</label>`; }).join('')}`).join('')}</div>`;
  /* bütçe ayarları */
  if(cfg.rules.butce !== false){
    const cs = budgetCands(), blocks = Object.values(M.els).filter(b => b.kind === 'Block' && kidsOf(b.id).some(p => p.kind === 'Part')).sort(sortEls);
    h += `<div class="sub"><span>Bütçe dağıtımı — sayısal üst sınırlı gereksinimler (${cs.length})</span></div>`;
    h += cs.length ? `<table class="rt fmt"><thead><tr><th></th><th>Gereksinim</th><th>Özellik</th><th>Sınır</th><th>Kök blok</th><th>Yöntem</th><th>Sistem marjı %</th><th>Dağıtılabilir</th><th>Durum</th></tr></thead><tbody>${cs.map(c => { const bc = cfg.budget[c.r.id] || {}, P = budgetPlan(c, bc); return `<tr><td><input type="checkbox" data-dbo="${c.r.id}"${bc.on === false ? '' : ' checked'}></td><td><a class="lnk" data-goto="${c.r.id}"><b class="noi18n">${esc(c.r.reqId)}</b></a> <span class="muted noi18n">${esc((c.r.text || '').slice(0, 70))}</span></td>
      <td><select class="fmsel noi18n" data-dbp="${c.r.id}">${c.props.map(p => `<option${(bc.prop || c.prop) === p ? ' selected' : ''}>${esc(p)}</option>`).join('')}</select></td><td>${P.L ? '≤ ' + trNum(P.L.val) + ' ' + esc(P.L.unit) : '—'}</td>
      <td><select class="fmsel noi18n" data-dbr="${c.r.id}"><option value="">—</option>${blocks.map(b => `<option value="${b.id}"${(P.root && P.root.id) === b.id ? ' selected' : ''}>${esc(b.name)}</option>`).join('')}</select></td>
      <td><select class="fmsel" data-dbm="${c.r.id}"><option value="oran"${(bc.method || 'oran') === 'oran' ? ' selected' : ''}>Mevcut değerlerle orantılı</option><option value="esit"${bc.method === 'esit' ? ' selected' : ''}>Eşit</option></select></td>
      <td><input class="fmsel" data-dbg="${c.r.id}" value="${esc(bc.margin == null ? '10' : String(bc.margin))}" style="width:56px"></td><td>${P.avail != null ? trNum(P.avail) + ' ' + esc(P.unit) : '—'}</td><td>${P.err ? `<span class="tsbad">${esc(P.err)}</span>` : P.fallback ? '<span class="muted">Bazı part\'larda değer yok — eşit dağıtıldı</span>' : `<span class="tsok">${P.rows.length} pay</span>`}</td></tr>`; }).join('')}</tbody></table>` : '<div class="muted">Metninde bütçe özelliğinin birimiyle sayısal üst sınır (ör. "45 kg\'ı aşmayacaktır", "en fazla 120 W") geçen gereksinim yok.</div>';
  }
  /* öneriler */
  const st = s => DV.show === 'acik' ? s.state !== 'mevcut' : DV.show === 'hepsi' ? true : s.state === DV.show;
  const vis = L.filter(s => st(s) && (DV.rule === 'all' || s.rule === DV.rule)), cnt = k => L.filter(s => s.state === k).length;
  const reqs = allReqs().filter(r => reqStatus(r) !== 'İptal');
  h += `<div class="sub"><span>Öneriler</span></div><div class="cards">${Object.entries(DSTATE).map(([k, [t, c]]) => `<div class="card dvcard${DV.show === k ? ' on' : ''}" data-dvshow="${k}"><div class="cv" style="color:${c}">${cnt(k)}</div><div class="ct">${t}</div></div>`).join('')}</div>`;
  h += `<div class="li">Göster <select data-dvs="1"><option value="acik"${DV.show === 'acik' ? ' selected' : ''}>İşlem bekleyenler</option><option value="hepsi"${DV.show === 'hepsi' ? ' selected' : ''}>Tümü</option>${Object.keys(DSTATE).map(k => `<option value="${k}"${DV.show === k ? ' selected' : ''}>${DSTATE[k][0]}</option>`).join('')}</select> Kural <select data-dvrf="1"><option value="all">Tümü</option>${DERIVE_RULES.map(r => `<option value="${r.id}"${DV.rule === r.id ? ' selected' : ''}>${esc(r.tr)}</option>`).join('')}</select>
    <span class="vsep"></span> Yeni gereksinimlerin üst gereksinimi (isteğe bağlı) <select data-dvp="1" class="noi18n" style="max-width:300px"><option value="">—</option>${reqs.map(r => `<option value="${r.id}"${DV.parent === r.id ? ' selected' : ''}>${esc((r.reqId || '') + ' ' + (r.name || ''))}</option>`).join('')}</select></div>`;
  if(!vis.length) return h + `<div class="vempty">${L.length ? 'Bu süzgeçte öneri yok.' : 'Seçili kurallar bu modelde öneri üretmedi.'}</div></div>`;
  h += `<table class="rt fmt dvt"><thead><tr><th><input type="checkbox" data-dvall="1"${vis.every(s => s.state === 'mevcut' || DV.sel.has(s.sig)) ? ' checked' : ''}></th><th>Durum</th><th>Kural</th><th>Seviye / alt sistem</th><th>Başlık</th><th style="min-width:340px">Gereksinim metni</th><th>Doğrulama</th><th>Kaynak</th><th>Kalite</th></tr></thead><tbody>`;
  vis.forEach(s => {
    const tx = DV.edits[s.sig] != null ? DV.edits[s.sig] : s.text, iss = (() => { try { return s.state === 'kaynak yok' ? [] : reqQuality({text:tx, reqId:'\u0000'}); } catch(e){ return []; } })(), [lt, lc] = DSTATE[s.state];
    h += `<tr class="${DV.sel.has(s.sig) ? 'sel' : ''}"><td>${s.state === 'mevcut' ? '' : `<input type="checkbox" data-dvsel="${esc(s.sig)}"${DV.sel.has(s.sig) ? ' checked' : ''}>`}</td><td><span class="stc" style="background:${lc}">${lt}</span>${s.edited ? '<div class="muted" style="font-size:10.5px">elle düzenlenmiş</div>' : ''}${s.req ? `<div><a class="lnk noi18n" data-goto="${s.req.id}">${esc(s.req.reqId)}</a></div>` : ''}</td><td>${esc(s.ruleTr)}</td>
      <td>${esc(s.level || '')}${s.subsys ? `<div class="muted noi18n">${esc(s.subsys)}</div>` : ''}</td><td class="noi18n">${esc(s.name || '')}</td>
      <td>${s.state === 'kaynak yok' ? `<span class="noi18n">${esc(tx)}</span>` : `<textarea class="dvtx noi18n" data-dvtx="${esc(s.sig)}" rows="${Math.max(2, Math.min(6, Math.ceil(tx.length / 64)))}">${esc(tx)}</textarea>`}${s.state === 'güncelle' && s.req ? `<div class="muted noi18n" style="font-size:11px">Şu an: ${esc(s.req.text)}</div>` : ''}</td>
      <td>${esc(s.verif || '')}</td><td class="muted noi18n" style="font-size:11px">${esc(s.note || '')}</td><td>${s.state === 'kaynak yok' ? '' : qualityBadge(iss)}</td></tr>`;
  });
  h += `</tbody></table><div class="li" style="margin-top:8px"><button class="vb pri" data-dvgo="1"${DV.sel.size ? '' : ' disabled'}>Seçilenleri uygula (${DV.sel.size})</button> <span class="muted">Yeni → "Taslak" gereksinim + Satisfy/Derive ilişkileri · Güncelle → metin yenilenir, bağlı ilişkiler şüpheli olur · Kaynak yok → "İptal" durumuna alınır</span></div></div>`;
  return h;
}
function deriveBar(){ return `<button class="vb pri" data-dvgo="1"${DV.sel.size ? '' : ' disabled'}>✓ Seçilenleri uygula (${DV.sel.size})</button><span class="vsep"></span><button class="vb" data-dva="refresh">↻ Yeniden hesapla</button><button class="vb" data-dva="selnew">Tüm yenileri seç</button><button class="vb" data-dva="none">Seçimi temizle</button><span class="vsep"></span><button class="vb" data-dva="xl">⤒ Excel</button>`; }
VIEWS['@derive'] = {tr:'Gereksinim Türetme', ic:'Tü', note:'Modelin kendisinden gereksinim önerileri üretilir: <b>arayüzlerden</b> (bağlantı, ICD alanları) ve <b>bütçe dağıtımından</b> (sistem sınırının alt sistemlere paylaştırılması).<br><br>Öneriler doğrudan modele yazılmaz: işaretleyip <b>Seçilenleri uygula</b> ile kabul edin. Kabul edilen gereksinim "Taslak" olarak oluşur, kaynağını hatırlar ve Satisfy / Derive ilişkileri kurulur. Sihirbaz tekrar çalıştırıldığında aynı gereksinimi yinelemez; kaynak değiştiyse <b>Güncelle</b>, silindiyse <b>Kaynak yok</b> önerir.', render:deriveHTML, bar:deriveBar, status:() => { const L = deriveList(); return L.filter(s => s.state === 'yeni').length + ' yeni öneri · ' + L.filter(s => s.state === 'güncelle').length + ' güncelleme'; }};
function deriveXlsx(){
  const L = deriveList(), rows = [['Durum', 'Kural', 'Seviye', 'Alt sistem', 'Başlık', 'Gereksinim metni', 'Doğrulama', 'Kaynak', 'Mevcut ID'].map(v => ({v, s:1}))];
  L.forEach(s => rows.push([DSTATE[s.state][0], s.ruleTr, s.level || '', s.subsys || '', s.name || '', DV.edits[s.sig] != null ? DV.edits[s.sig] : s.text, s.verif || '', s.note || '', s.req ? s.req.reqId : '']));
  download(buildXlsx([{name:'Türetme önerileri', rows, widths:[12, 16, 11, 18, 24, 70, 14, 40, 12], header:true, freeze:[0, 1]}]), fileSafe(E(M.rootId).name) + ' - Gereksinim Türetme.xlsx');
}
(() => {
  const V = $('#view'), rer = () => { renderViewBar(); renderView(); };
  V.addEventListener('click', ev => {
    if(ST.cur !== '@derive') return; const t = ev.target.closest('button,[data-dvshow]') || ev.target, d = t.dataset || {};
    if(d.dvshow){ DV.show = DV.show === d.dvshow ? 'acik' : d.dvshow; rer(); }
    if(d.dva === 'refresh'){ deriveRefresh(); rer(); toast('Öneriler yeniden hesaplandı'); }
    if(d.dva === 'selnew'){ deriveList().filter(s => s.state === 'yeni').forEach(s => DV.sel.add(s.sig)); rer(); }
    if(d.dva === 'none'){ DV.sel.clear(); rer(); }
    if(d.dva === 'xl') deriveXlsx();
    if(d.dvgo){ const L = deriveList().filter(s => DV.sel.has(s.sig)).map(s => Object.assign({}, s, {gen:s.text, text:sentEnd(sentCap(DV.edits[s.sig] != null ? DV.edits[s.sig] : s.text))})); const r = deriveApply(L, DV.parent); deriveRefresh(); rer(); toast(`${r.n} gereksinim oluşturuldu, ${r.u} güncellendi, ${r.x} iptal edildi`); }
  });
  V.addEventListener('change', ev => {
    if(ST.cur !== '@derive') return; const t = ev.target, d = t.dataset, cfg = deriveCfg(), bset = (id, k, v) => { cfg.budget[id] = Object.assign({}, cfg.budget[id] || {}, {[k]:v}); };
    if(d.dvr){ cfg.rules[d.dvr] = t.checked; deriveRefresh(); rer(); return; }
    if(d.dvo){ const [r, k] = d.dvo.split('|'); cfg.ruleOpts = cfg.ruleOpts || {}; cfg.ruleOpts[r] = Object.assign({}, cfg.ruleOpts[r] || {}, {[k]:t.checked}); deriveRefresh(); rer(); return; }
    if(d.dbo){ bset(d.dbo, 'on', t.checked); deriveRefresh(); rer(); return; }
    if(d.dbp){ bset(d.dbp, 'prop', t.value); deriveRefresh(); rer(); return; }
    if(d.dbr){ bset(d.dbr, 'root', t.value); deriveRefresh(); rer(); return; }
    if(d.dbm){ bset(d.dbm, 'method', t.value); deriveRefresh(); rer(); return; }
    if(d.dbg){ bset(d.dbg, 'margin', t.value); deriveRefresh(); rer(); return; }
    if(d.dvs){ DV.show = t.value; rer(); return; }
    if(d.dvrf){ DV.rule = t.value; rer(); return; }
    if(d.dvp != null){ DV.parent = t.value; return; }
    if(d.dvall){ deriveList().filter(s => s.state !== 'mevcut' && (DV.show === 'acik' || DV.show === 'hepsi' || s.state === DV.show) && (DV.rule === 'all' || s.rule === DV.rule)).forEach(s => t.checked ? DV.sel.add(s.sig) : DV.sel.delete(s.sig)); rer(); return; }
    if(d.dvsel){ t.checked ? DV.sel.add(d.dvsel) : DV.sel.delete(d.dvsel); rer(); return; }
  });
  V.addEventListener('input', ev => { if(ST.cur === '@derive' && ev.target.dataset.dvtx){ DV.edits[ev.target.dataset.dvtx] = ev.target.value; } });
  V.addEventListener('focusout', ev => { if(ST.cur === '@derive' && ev.target.dataset && ev.target.dataset.dvtx){ const td = ev.target.closest('tr'); const s = deriveList().find(x => x.sig === ev.target.dataset.dvtx); if(td && s){ const b = td.querySelector('td:last-child'); if(b) try { b.innerHTML = qualityBadge(reqQuality({text:ev.target.value, reqId:'\u0000'})); } catch(e){ appErr('dvq', e); } } } });
  V.addEventListener('keydown', ev => { if(ST.cur === '@derive' && ev.target.matches && ev.target.matches('input,textarea')) ev.stopPropagation(); });
})();
function deriveOpen(){ deriveRefresh(); openD('@derive'); }
HOOKS.menu.req.push(r => { r.splice(Math.min(r.length, 4), 0, {t:'Gereksinim türetme sihirbazı (modelden)', f:deriveOpen}); });
if(typeof WF_STEPS !== 'undefined') WF_STEPS[0].a.splice(1, 0, ['Türetme sihirbazı', /^Gereksinim türetme sihirbazı/]);
{
  const css = document.createElement('style');
  css.textContent = `.dvrules{display:flex;flex-wrap:wrap;gap:6px 18px;align-items:center;margin:4px 0 8px}.dvrule{white-space:nowrap}.dvopt{white-space:nowrap;font-size:12px;color:#445;margin-left:-8px}
.dvt textarea.dvtx{width:100%;min-width:320px;font:inherit;font-size:12.5px;border:1px solid #c8d0db;border-radius:4px;padding:3px 5px;resize:vertical}
.dvcard{cursor:pointer}.dvcard.on{outline:2px solid #26364b}body.dark .dvt textarea.dvtx{background:#1f2a38;color:#e8edf3;border-color:#3b4b60}`;
  document.head.appendChild(css);
}
if(typeof UI_RULES !== 'undefined') UI_RULES.unshift([/türetme|derive/i, 'wand']);
