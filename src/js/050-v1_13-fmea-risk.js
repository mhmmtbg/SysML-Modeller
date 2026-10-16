/* ================= v1.13: FMEA / FMECA VE RİSK YÖNETİMİ ================= */
Object.assign(KIND, {
  FailureMode:{tr:'Arıza Modu', en:'FailureMode', ic:'FM', col:'#b03a2e'},
  Risk:{tr:'Risk', en:'Risk', ic:'Rk', col:'#d35400'}
});
Object.assign(BASE, {FailureMode:'Arıza modu', Risk:'Risk'});
['Block', 'Part', 'Activity', 'Action', 'InterfaceBlock'].forEach(k => { if(OWN[k] && !OWN[k].includes('FailureMode')) OWN[k].push('FailureMode'); });
['Model', 'Package'].forEach(k => { ['FailureMode', 'Risk'].forEach(x => { if(!OWN[k].includes(x)) OWN[k].push(x); }); });
RANK.push('FailureMode', 'Risk');
const FM_ST = ['Açık', 'Uygulanıyor', 'Kapandı'], RK_ST = ['Açık', 'İzleniyor', 'Gerçekleşti', 'Kapandı'];
const RK_CAT = ['Teknik', 'Takvim', 'Maliyet', 'Tedarik', 'Emniyet', 'Güvenlik', 'Kalifikasyon', 'Diğer'], RK_STR = ['Azalt', 'Kaçın', 'Transfer et', 'Kabul et', 'İzle'];
const FM_HOSTS = ['Block', 'Part', 'Activity', 'Action', 'InterfaceBlock', 'Package', 'Model'];
const allFMs = () => Object.values(M.els).filter(e => e.kind === 'FailureMode');
const allRisks = () => Object.values(M.els).filter(e => e.kind === 'Risk').sort((a, b) => COLL.compare(String(a.riskId || ''), String(b.riskId || '')));
const n10 = v => { const n = parseInt(v, 10); return n >= 1 && n <= 10 ? n : null; };
const n5 = v => { const n = parseInt(v, 10); return n >= 1 && n <= 5 ? n : null; };
const rpnOf = (f, post) => { const s = n10(post ? f.S2 || f.S : f.S), o = n10(post ? f.O2 : f.O), d = n10(post ? f.D2 : f.D); return s && o && d ? s * o * d : null; };
const sevCat = s => s == null ? '' : s >= 9 ? 'I' : s >= 7 ? 'II' : s >= 4 ? 'III' : 'IV';
const SEV_CAT_TR = {I:'I – Katastrofik', II:'II – Kritik', III:'III – Marjinal', IV:'IV – Önemsiz'};
const cmOf = f => { const l = numOf(f.lam), a = numOf(f.alpha), b = numOf(f.beta), t = numOf(f.top); return l != null && a != null && b != null && t != null ? b * a * l * t : null; };
const rpnCol = r => r == null ? '#bbb' : r >= FV.thr ? '#c0392b' : r >= FV.thr / 2 ? '#d18a00' : '#2e9e6a';
const rkScore = (r, post) => { const p = n5(post ? r.P2 : r.P), i = n5(post ? r.I2 : r.I); return p && i ? p * i : null; };
const rkLevel = s => s == null ? '' : s >= 15 ? 'Çok yüksek' : s >= 10 ? 'Yüksek' : s >= 5 ? 'Orta' : 'Düşük';
const RK_COL = {'Düşük':'#2e9e6a', 'Orta':'#e1b12c', 'Yüksek':'#e67e22', 'Çok yüksek':'#c0392b', '':'#bbb'};
const fmHost = f => { let e = E(f.owner); return e; };
const fmReqs = f => (f.reqs || []).map(E).filter(x => x && x.kind === 'Requirement');
const rkLinks = r => (r.links || []).map(E).filter(Boolean);
function fmTests(f){ const idx = relIdx(); const s = new Set(); fmReqs(f).forEach(r => (idx['Verify'] || []).filter(x => x.tgt === r.id).forEach(x => s.add(x.src))); return [...s].map(E).filter(Boolean); }
function nextRiskId(){ let mx = 0; allRisks().forEach(r => { const m = String(r.riskId || '').match(/(\d+)\s*$/); if(m) mx = Math.max(mx, +m[1]); }); return 'R-' + String(mx + 1).padStart(3, '0'); }
let FV = {item:'all', thr:100, post:true, fmeca:false, sort:'', q:'', open:false};
let RV2 = {post:false, cell:null, q:'', st:'all'};
function fmHostsAll(){ return Object.values(M.els).filter(e => ['Block', 'Part', 'Activity', 'Action', 'InterfaceBlock'].includes(e.kind)).sort((a, b) => pathOf(a.id).localeCompare(pathOf(b.id), 'tr')); }
function fmRows(){
  let rs = allFMs();
  if(FV.item !== 'all') rs = rs.filter(f => f.owner === FV.item || isAnc(FV.item, f.owner));
  if(FV.open) rs = rs.filter(f => (f.fst || 'Açık') !== 'Kapandı');
  if(FV.q){ const q = asciiTr(FV.q); rs = rs.filter(f => asciiTr([f.name, f.fn, f.cause, f.effL, f.effN, f.effE, f.act, nm(fmHost(f) || {})].join(' ')).includes(q)); }
  const key = FV.sort;
  rs.sort((a, b) => key === 'rpn' ? (rpnOf(b) || 0) - (rpnOf(a) || 0) : key === 'S' ? (n10(b.S) || 0) - (n10(a.S) || 0) : key === 'cm' ? (cmOf(b) || 0) - (cmOf(a) || 0) : pathOf(a.owner).localeCompare(pathOf(b.owner), 'tr') || COLL.compare(a.name || '', b.name || ''));
  return rs;
}
const ce = (e, k, cls) => `<div class="ce${cls ? ' ' + cls : ''}" contenteditable="true" data-r="${e.id}" data-c="${k}">${esc(e[k] == null ? '' : e[k])}</div>`;
const sel10 = (e, k, hi) => `<select class="fmsel" data-fx="${e.id}|${k}" title="1–${hi}"><option value="">–</option>${Array.from({length:hi}, (_, i) => `<option${String(e[k]) === String(i + 1) ? ' selected' : ''}>${i + 1}</option>`).join('')}</select>`;
const selL = (e, k, list, def) => `<select class="fmsel" data-fx="${e.id}|${k}">${list.map(x => `<option${(e[k] || def) === x ? ' selected' : ''}>${esc(x)}</option>`).join('')}</select>`;
function fmeaHTML(){
  const all = allFMs(), rs = fmRows();
  if(!all.length) return `<div class="vempty">Henüz arıza modu yok.<br><br><button class="vb pri" data-fma="add">+ Arıza modu ekle</button><br><br><span class="muted">Ağaçta bir blok, part veya fonksiyon seçip ekleyin; arıza modları o elemanın altına kaydedilir.<br>Şiddet (Ş), Oluşma (O) ve Tespit (T) 1–10 arası puanlanır; RPN = Ş × O × T.</span></div>`;
  const rp = all.map(f => rpnOf(f)).filter(x => x != null), hiS = all.filter(f => n10(f.S) >= 8), noMit = hiS.filter(f => !fmReqs(f).length), openA = all.filter(f => f.act && (f.fst || 'Açık') !== 'Kapandı');
  const over = all.filter(f => (rpnOf(f) || 0) >= FV.thr), overPost = all.filter(f => (rpnOf(f, true) || rpnOf(f) || 0) >= FV.thr);
  let h = `<div class="cards"><div class="card"><div class="cv">${all.length}</div><div class="ct">Arıza modu</div><div class="cs">${new Set(all.map(f => f.owner)).size} elemanda</div></div>
    <div class="card"><div class="cv" style="color:${rpnCol(Math.max(0, ...rp))}">${rp.length ? Math.max(...rp) : '—'}</div><div class="ct">En yüksek RPN</div></div>
    <div class="card"><div class="cv" style="color:${over.length ? '#c0392b' : '#2e9e6a'}">${over.length} → ${overPost.length}</div><div class="ct">RPN ≥ ${FV.thr} (önlem öncesi → sonrası)</div></div>
    <div class="card"><div class="cv" style="color:${noMit.length ? '#c0392b' : '#2e9e6a'}">${noMit.length}</div><div class="ct">Ş ≥ 8, önleyici gereksinimi yok</div></div>
    <div class="card"><div class="cv" style="color:${openA.length ? '#d18a00' : '#2e9e6a'}">${openA.length}</div><div class="ct">Açık önlem</div></div></div>`;
  const post = FV.post, fc = FV.fmeca;
  h += `<table class="rt fmt"><thead><tr><th class="rn">#</th><th>Eleman</th><th>Fonksiyon</th><th>Arıza modu</th><th>Arıza nedeni</th><th>Yerel etki</th><th>Üst seviye etki</th><th>Son etki</th><th title="Şiddet (1–10)" data-fsort="S" data-en="S">Ş</th><th title="Oluşma olasılığı (1–10)">O</th><th title="Tespit edilebilirlik (1: kesin tespit … 10: tespit edilemez)" data-en="D">T</th><th data-fsort="rpn" title="Risk öncelik sayısı = Ş × O × T">RPN${FV.sort === 'rpn' ? ' ▼' : ''}</th><th>Mevcut kontroller / tespit yöntemi</th><th>Önerilen önlem</th><th>Sorumlu</th><th>Hedef tarih</th><th data-en="Status">Durum</th>${post ? '<th title="Önlem sonrası şiddet" data-en="S′">Ş′</th><th>O′</th><th data-en="D′">T′</th><th>RPN′</th>' : ''}${fc ? '<th title="Şiddet sınıfı (MIL-STD-1629A)">Sınıf</th><th title="Parça arıza oranı (10⁻⁶ / saat)">λp</th><th title="Arıza modu oranı">α</th><th title="Arıza etkisi olasılığı">β</th><th title="Çalışma süresi (saat)">t</th><th data-fsort="cm" title="Mod kritikliği Cm = β·α·λp·t">Cm</th>' : ''}<th>Önleyici gereksinimler → testler</th><th></th></tr></thead><tbody>`;
  rs.forEach((f, i) => {
    const r1 = rpnOf(f), r2 = rpnOf(f, true), host = fmHost(f), rq = fmReqs(f), ts = fmTests(f), cm = cmOf(f);
    const warn = n10(f.S) >= 8 && !rq.length;
    h += `<tr data-row="${f.id}" class="${ST.tsel === f.id ? 'sel' : ''}"><td class="rn">${i + 1}</td><td style="white-space:nowrap"><a class="lnk" data-ago="${host ? host.id : ''}">${esc(host ? nm(host) : '—')}</a><div class="muted" style="font-size:10.5px">${esc(host ? KIND[host.kind].tr : '')}</div></td>
      <td>${ce(f, 'fn')}</td><td>${ce(f, 'name', 'rid')}</td><td>${ce(f, 'cause')}</td><td>${ce(f, 'effL')}</td><td>${ce(f, 'effN')}</td><td>${ce(f, 'effE')}</td>
      <td>${sel10(f, 'S', 10)}</td><td>${sel10(f, 'O', 10)}</td><td>${sel10(f, 'D', 10)}</td><td><span class="rpn" style="background:${rpnCol(r1)}">${r1 == null ? '—' : r1}</span></td>
      <td>${ce(f, 'ctrl')}</td><td>${ce(f, 'act')}</td><td>${ce(f, 'resp')}</td><td><input type="date" class="fmsel" data-fx="${f.id}|due" value="${esc(f.due || '')}"></td><td>${selL(f, 'fst', FM_ST, 'Açık')}</td>
      ${post ? `<td>${sel10(f, 'S2', 10)}</td><td>${sel10(f, 'O2', 10)}</td><td>${sel10(f, 'D2', 10)}</td><td><span class="rpn" style="background:${rpnCol(r2)}">${r2 == null ? '—' : r2}</span></td>` : ''}
      ${fc ? `<td>${esc(sevCat(n10(f.S)))}</td><td>${ce(f, 'lam')}</td><td>${ce(f, 'alpha')}</td><td>${ce(f, 'beta')}</td><td>${ce(f, 'top')}</td><td><b>${cm == null ? '—' : fmtG(cm)}</b></td>` : ''}
      <td><div class="tcell">${rq.map(r => `<span class="chip2"><a class="lnk" data-ago="${r.id}">${esc(r.reqId || nm(r))}</a></span>`).join('')}<button class="tadd" data-fmreq="${f.id}" title="Önleyici gereksinim bağla">+</button></div>${ts.length ? `<div class="muted" style="font-size:11px">→ ${ts.map(t => esc(nm(t)) + ' ' + resChip(testResult(t))).join(' ')}</div>` : ''}${warn ? '<div class="bad" style="font-size:11px">⚠ yüksek şiddet, gereksinim yok</div>' : ''}</td>
      <td style="white-space:nowrap"><button class="tdel" data-fmrisk="${f.id}" title="Risk kaydına aktar">⚑</button> <button class="tdel" data-fmdel="${f.id}" title="Sil">✕</button></td></tr>`;
  });
  h += `</tbody></table><div class="vfoot">${rs.length} / ${all.length} arıza modu · Ş: şiddet, O: oluşma, T: tespit (1 kolay … 10 imkânsız) · RPN = Ş × O × T · Hücrelere tıklayıp yazın; Enter alt satıra geçer${fc ? ' · Cm = β · α · λp · t (MIL-STD-1629A)' : ''}</div>`;
  if(fc){
    const items = new Map(); all.forEach(f => { const c = cmOf(f); if(c == null) return; const k = f.owner + '|' + sevCat(n10(f.S)); items.set(k, (items.get(k) || 0) + c); });
    if(items.size){ h += '<h3>Eleman kritikliği (Cr = Σ Cm, şiddet sınıfına göre)</h3><table class="rt"><thead><tr><th>Eleman</th><th>Şiddet sınıfı</th><th>Cr</th></tr></thead><tbody>' + [...items].sort((a, b) => b[1] - a[1]).map(([k, v]) => { const [id, c] = k.split('|'); return `<tr><td>${esc(nm(E(id) || {}))}</td><td>${esc(SEV_CAT_TR[c] || c)}</td><td><b>${fmtG(v)}</b></td></tr>`; }).join('') + '</tbody></table>'; }
  }
  return h;
}
function fmeaBar(){
  return `<button class="vb pri" data-fma="add">+ Arıza modu</button><label>Eleman <select data-fmf="item"><option value="all">(tümü)</option>${fmHostsAll().map(e => `<option value="${e.id}"${FV.item === e.id ? ' selected' : ''}>${esc(pathOf(e.id))}</option>`).join('')}</select></label>
    <input data-fmf="q" placeholder="Ara…" value="${esc(FV.q)}" style="width:140px"><label>RPN eşiği <input data-fmf="thr" value="${FV.thr}" style="width:50px"></label>
    <label class="vchk"><input type="checkbox" data-fmf="post"${FV.post ? ' checked' : ''}> Önlem sonrası</label><label class="vchk"><input type="checkbox" data-fmf="fmeca"${FV.fmeca ? ' checked' : ''}> FMECA (kritiklik)</label><label class="vchk"><input type="checkbox" data-fmf="open"${FV.open ? ' checked' : ''}> Yalnız açık</label>
    <span class="vsep"></span><button class="vb" data-fma="risk">Risk kaydı →</button><button class="vb" data-fma="xl">⤒ Excel'e aktar</button>`;
}
/* ---- risk kaydı ---- */
function rkRows(){
  let rs = allRisks();
  if(RV2.st !== 'all') rs = rs.filter(r => (r.rst || 'Açık') === RV2.st);
  if(RV2.q){ const q = asciiTr(RV2.q); rs = rs.filter(r => asciiTr([r.riskId, r.name, r.desc, r.act, r.resp].join(' ')).includes(q)); }
  if(RV2.cell){ const [p, i] = RV2.cell.split(':').map(Number); rs = rs.filter(r => n5(RV2.post ? r.P2 : r.P) === p && n5(RV2.post ? r.I2 : r.I) === i); }
  return rs;
}
function riskMatrixSVG(risks, post, o){
  o = o || {}; const C = o.cell || 56, L = 74, Tp = 26, W = L + C * 5 + 10, H = Tp + C * 5 + 46;
  let g = `<rect width="${W}" height="${H}" fill="#fff"/><text x="${L + C * 2.5}" y="16" text-anchor="middle" font-family="${FF}" font-size="12" font-weight="600" fill="#26364b">${post ? 'Önlem sonrası (artık risk)' : 'Önlem öncesi'}</text>`;
  for(let p = 5; p >= 1; p--) for(let i = 1; i <= 5; i++){
    const x = L + (i - 1) * C, y = Tp + (5 - p) * C, lv = rkLevel(p * i), list = risks.filter(r => n5(post ? r.P2 : r.P) === p && n5(post ? r.I2 : r.I) === i), on = !o.static && RV2.post === post && RV2.cell === p + ':' + i;
    g += `<g${o.static ? '' : ` data-rkc="${p}:${i}" data-rkp="${post ? 1 : 0}" style="cursor:pointer"`}><rect x="${x}" y="${y}" width="${C}" height="${C}" fill="${RK_COL[lv]}" fill-opacity="${list.length ? 0.85 : 0.3}" stroke="${on ? '#1e2733' : '#fff'}" stroke-width="${on ? 3 : 1.5}"/>`;
    if(list.length){ g += `<text x="${x + C / 2}" y="${y + C / 2 + 2}" text-anchor="middle" font-family="${FF}" font-size="16" font-weight="700" fill="#fff">${list.length}</text><text x="${x + C / 2}" y="${y + C - 6}" text-anchor="middle" font-family="${FF}" font-size="8.5" fill="#fff">${esc(list.slice(0, 3).map(r => r.riskId || '').join(' '))}${list.length > 3 ? '…' : ''}</text>`; }
    g += '</g>';
  }
  for(let p = 1; p <= 5; p++) g += `<text x="${L - 6}" y="${Tp + (5 - p) * C + C / 2 + 4}" text-anchor="end" font-family="${FF}" font-size="11" fill="#556">${p}</text>`;
  for(let i = 1; i <= 5; i++) g += `<text x="${L + (i - 1) * C + C / 2}" y="${Tp + C * 5 + 15}" text-anchor="middle" font-family="${FF}" font-size="11" fill="#556">${i}</text>`;
  g += `<text x="${L + C * 2.5}" y="${H - 8}" text-anchor="middle" font-family="${FF}" font-size="11" fill="#445">Etki →</text><text transform="translate(16 ${Tp + C * 2.5}) rotate(-90)" text-anchor="middle" font-family="${FF}" font-size="11" fill="#445">Olasılık →</text>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${g}</svg>`;
}
function riskHTML(){
  const all = allRisks();
  if(!all.length) return `<div class="vempty">Risk kaydı boş.<br><br><button class="vb pri" data-rka="add">+ Risk ekle</button><br><br><span class="muted">Olasılık (O) ve Etki (E) 1–5 arası puanlanır; skor = O × E. FMEA tablosundaki ⚑ ile arıza modundan risk oluşturulabilir.</span></div>`;
  const act = all.filter(r => !['Kapandı'].includes(r.rst || 'Açık')), lv = s => act.filter(r => rkLevel(rkScore(r)) === s).length;
  let h = `<div class="cards"><div class="card"><div class="cv">${act.length}</div><div class="ct">Açık / izlenen risk</div><div class="cs">toplam ${all.length}</div></div>${['Çok yüksek', 'Yüksek', 'Orta', 'Düşük'].map(s => `<div class="card"><div class="cv" style="color:${RK_COL[s]}">${lv(s)}</div><div class="ct">${s}</div></div>`).join('')}
    <div class="card"><div class="cv" style="color:${all.filter(r => r.due && r.due < todayISO() && (r.rst || 'Açık') !== 'Kapandı').length ? '#c0392b' : '#2e9e6a'}">${all.filter(r => r.due && r.due < todayISO() && (r.rst || 'Açık') !== 'Kapandı').length}</div><div class="ct">Tarihi geçmiş önlem</div></div></div>`;
  h += `<div class="rkmx">${riskMatrixSVG(act, false)}${riskMatrixSVG(act, true)}<div class="muted" style="align-self:center;max-width:240px;font-size:12px">Hücreye tıklayınca tablo o hücredeki risklerle süzülür; tekrar tıklayınca süzme kalkar.<br><br><span style="color:${RK_COL['Düşük']}">■</span> Düşük (1–4) &nbsp;<span style="color:${RK_COL['Orta']}">■</span> Orta (5–9)<br><span style="color:${RK_COL['Yüksek']}">■</span> Yüksek (10–14) &nbsp;<span style="color:${RK_COL['Çok yüksek']}">■</span> Çok yüksek (15–25)<br><br>Kapanan riskler matriste gösterilmez.</div></div>`;
  const rs = rkRows();
  h += `<table class="rt fmt"><thead><tr><th class="rn">#</th><th>ID</th><th>Başlık</th><th>Açıklama (eğer … ise …)</th><th>Kategori</th><th title="Olasılık 1–5">O</th><th title="Etki 1–5">E</th><th>Skor</th><th>Strateji</th><th>Önlem planı</th><th>Sorumlu</th><th>Hedef tarih</th><th>Durum</th><th title="Önlem sonrası olasılık">O′</th><th title="Önlem sonrası etki">E′</th><th>Artık skor</th><th>İlgili elemanlar</th><th></th></tr></thead><tbody>`;
  rs.forEach((r, i) => {
    const s1 = rkScore(r), s2 = rkScore(r, true), late = r.due && r.due < todayISO() && (r.rst || 'Açık') !== 'Kapandı';
    h += `<tr data-row="${r.id}" class="${ST.tsel === r.id ? 'sel' : ''}"><td class="rn">${i + 1}</td><td>${ce(r, 'riskId', 'rid')}</td><td>${ce(r, 'name')}</td><td>${ce(r, 'desc', 'long')}</td><td>${selL(r, 'cat', RK_CAT, 'Teknik')}</td>
      <td>${sel10(r, 'P', 5)}</td><td>${sel10(r, 'I', 5)}</td><td><span class="rpn" style="background:${RK_COL[rkLevel(s1)]}" title="${rkLevel(s1)}">${s1 == null ? '—' : s1}</span></td><td>${selL(r, 'strat', RK_STR, 'Azalt')}</td><td>${ce(r, 'act', 'long')}</td><td>${ce(r, 'resp')}</td>
      <td><input type="date" class="fmsel${late ? ' late' : ''}" data-fx="${r.id}|due" value="${esc(r.due || '')}"></td><td>${selL(r, 'rst', RK_ST, 'Açık')}</td><td>${sel10(r, 'P2', 5)}</td><td>${sel10(r, 'I2', 5)}</td><td><span class="rpn" style="background:${RK_COL[rkLevel(s2)]}">${s2 == null ? '—' : s2}</span></td>
      <td><div class="tcell">${rkLinks(r).map(x => `<span class="chip2" title="${esc(KIND[x.kind] ? KIND[x.kind].tr : '')}"><a class="lnk" data-ago="${x.id}">${esc(x.kind === 'Requirement' ? x.reqId || nm(x) : nm(x))}</a></span>`).join('')}<button class="tadd" data-rklink="${r.id}" title="Gereksinim, blok, test, arıza modu bağla">+</button></div></td><td><button class="tdel" data-rkdel="${r.id}" title="Sil">✕</button></td></tr>`;
  });
  return h + `</tbody></table><div class="vfoot">${rs.length} / ${all.length} risk${RV2.cell ? ` · Matris süzgeci: O=${RV2.cell.split(':')[0]}, E=${RV2.cell.split(':')[1]} (${RV2.post ? 'önlem sonrası' : 'önlem öncesi'}) <button class="vb" data-rka="nocell">süzgeci kaldır</button>` : ''}</div>`;
}
function riskBar(){
  return `<button class="vb pri" data-rka="add">+ Risk</button><input data-rkf="q" placeholder="Ara…" value="${esc(RV2.q)}" style="width:160px"><label>Durum <select data-rkf="st"><option value="all">Tümü</option>${RK_ST.map(s => `<option${RV2.st === s ? ' selected' : ''}>${s}</option>`).join('')}</select></label>
    <span class="vsep"></span><button class="vb" data-rka="fmea">← FMEA</button><button class="vb" data-rka="png">⤓ Matris PNG</button><button class="vb" data-rka="xl">⤒ Excel'e aktar</button>`;
}
function fmAdd(){
  let host = E(FV.item !== 'all' ? FV.item : ST.tsel);
  if(host && host.kind === 'FailureMode') host = E(host.owner);
  if(!host || !FM_HOSTS.includes(host.kind)){ const c = fmHostsAll(); if(!c.length) return toast('Önce bir blok, part veya fonksiyon oluşturun'); host = c[0]; toast(`Arıza modu "${nm(host)}" altına eklendi — ağaçta başka bir eleman seçerek ya da Eleman süzgeciyle hedefi değiştirebilirsiniz`); }
  snap(); const f = mk('FailureMode', host.id, {name:'', fn:'', fst:'Açık'}); f.name = ''; ST.tsel = f.id; ST.exp.add(host.id); pendingFocus = [f.id, 'name']; afterChange(); const b = $('#view .vbody'); if(b) b.scrollTop = b.scrollHeight;
}
function rkAdd(extra){
  const pk = allRisks()[0] ? allRisks()[0].owner : findOrMkPkg(M.rootId, 'Risk Kaydı');
  const r = mk('Risk', pk, Object.assign({riskId:nextRiskId(), name:'', desc:'', cat:'Teknik', strat:'Azalt', rst:'Açık', links:[]}, extra || {}));
  return r;
}
function fmeaXlsx(){
  const all = allFMs(); const H0 = ['Eleman', 'Eleman türü', 'Fonksiyon', 'Arıza modu', 'Arıza nedeni', 'Yerel etki', 'Üst seviye etki', 'Son etki', 'Ş', 'O', 'T', 'RPN', 'Mevcut kontroller', 'Önerilen önlem', 'Sorumlu', 'Hedef tarih', 'Durum', 'Ş′', 'O′', 'T′', 'RPN′', 'Şiddet sınıfı', 'λp', 'α', 'β', 't', 'Cm', 'Önleyici gereksinimler', 'Doğrulayan testler'];
  const rows = [H0.map(v => ({v, s:1}))];
  fmRows().forEach(f => { const r1 = rpnOf(f), r2 = rpnOf(f, true), h = fmHost(f); rows.push([h ? pathOf(h.id) : '', h ? KIND[h.kind].tr : '', f.fn || '', {v:f.name || '', s:6}, f.cause || '', f.effL || '', f.effN || '', f.effE || '', n10(f.S) || '', n10(f.O) || '', n10(f.D) || '', r1 == null ? '' : {v:r1, s:r1 >= FV.thr ? 4 : r1 >= FV.thr / 2 ? 5 : 3}, f.ctrl || '', f.act || '', f.resp || '', fmtD(f.due), f.fst || 'Açık', n10(f.S2) || '', n10(f.O2) || '', n10(f.D2) || '', r2 == null ? '' : {v:r2, s:r2 >= FV.thr ? 4 : r2 >= FV.thr / 2 ? 5 : 3}, sevCat(n10(f.S)), f.lam || '', f.alpha || '', f.beta || '', f.top || '', cmOf(f) == null ? '' : +cmOf(f).toPrecision(4), fmReqs(f).map(r => r.reqId || nm(r)).join(', '), fmTests(f).map(nm).join(', ')]); });
  const rk = [['ID', 'Başlık', 'Açıklama', 'Kategori', 'O', 'E', 'Skor', 'Seviye', 'Strateji', 'Önlem planı', 'Sorumlu', 'Hedef tarih', 'Durum', 'O′', 'E′', 'Artık skor', 'Artık seviye', 'İlgili elemanlar'].map(v => ({v, s:1}))];
  allRisks().forEach(r => { const s1 = rkScore(r), s2 = rkScore(r, true), st = s => s == null ? 2 : s >= 10 ? 4 : s >= 5 ? 5 : 3; rk.push([{v:r.riskId || '', s:6}, r.name || '', r.desc || '', r.cat || '', n5(r.P) || '', n5(r.I) || '', s1 == null ? '' : {v:s1, s:st(s1)}, rkLevel(s1), r.strat || '', r.act || '', r.resp || '', fmtD(r.due), r.rst || 'Açık', n5(r.P2) || '', n5(r.I2) || '', s2 == null ? '' : {v:s2, s:st(s2)}, rkLevel(s2), rkLinks(r).map(x => x.reqId || nm(x)).join(', ')]); });
  const mx = (post) => { const out = [[{v:(post ? 'Önlem sonrası' : 'Önlem öncesi') + ' risk matrisi (satır: olasılık 5→1, sütun: etki 1→5)', s:10}]]; for(let p = 5; p >= 1; p--){ const row = [{v:'O=' + p, s:1}]; for(let i = 1; i <= 5; i++){ const l = allRisks().filter(r => (r.rst || 'Açık') !== 'Kapandı' && n5(post ? r.P2 : r.P) === p && n5(post ? r.I2 : r.I) === i); const s = rkLevel(p * i); row.push({v:l.map(r => r.riskId).join(', ') || ' ', s:s === 'Düşük' ? 3 : s === 'Orta' ? 5 : 4}); } out.push(row); } out.push(['', 'E=1', 'E=2', 'E=3', 'E=4', 'E=5'].map(v => ({v, s:1}))); return out; };
  download(buildXlsx([{name:'FMEA', rows, widths:[30, 12, 22, 24, 24, 22, 22, 22, 5, 5, 5, 7, 26, 28, 14, 12, 12, 5, 5, 5, 7, 10, 8, 6, 6, 8, 10, 24, 26], header:true, freeze:[1, 4], filter:1}, {name:'Risk Kaydı', rows:rk, widths:[9, 26, 44, 13, 5, 5, 7, 11, 12, 36, 14, 12, 11, 5, 5, 9, 11, 30], header:true, freeze:[1, 2], filter:1}, {name:'Risk Matrisi', rows:mx(false).concat([[]], mx(true)), widths:[10, 18, 18, 18, 18, 18]}]), fileSafe(E(M.rootId).name) + ' - FMEA ve Risk.xlsx');
}
Object.assign(VIEWS, {
  '@fmea':{tr:'FMEA / FMECA', ic:'FM', note:'Arıza türleri ve etkileri analizi. Her satır, bir blok/part/fonksiyonun altındaki bir <b>Arıza Modu</b> elemanıdır.<br><br>Ş (şiddet), O (oluşma), T (tespit) 1–10; RPN = Ş × O × T. Önlem sonrası puanlarla artık RPN izlenir. "FMECA" açılınca MIL-STD-1629A mod kritikliği (Cm = β·α·λp·t) hesaplanır.<br><br>Önleyici gereksinim bağlayın; bu gereksinimleri doğrulayan testler otomatik gösterilir. ⚑ arıza modundan risk oluşturur.', render:fmeaHTML, bar:fmeaBar, status:() => allFMs().length + ' arıza modu'},
  '@risk':{tr:'Risk Kaydı', ic:'Rk', note:'Proje ve teknik riskler. Olasılık (O) ve etki (E) 1–5; skor = O × E.<br><br>Önlem öncesi ve sonrası 5×5 matris; hücreye tıklayınca tablo süzülür. Riskleri gereksinim, blok, test veya arıza modlarına bağlayın.', render:riskHTML, bar:riskBar, status:() => allRisks().length + ' risk'}
});
(function(){
  const V = $('#view');
  V.addEventListener('change', ev => {
    if(ST.cur !== '@fmea' && ST.cur !== '@risk') return;
    const t = ev.target;
    if(t.dataset.fx){ const [id, k] = t.dataset.fx.split('|'), e = E(id); if(!e) return; snap(); e[k] = t.value; afterChange(); return; }
    if(t.dataset.fmf){ const k = t.dataset.fmf; FV[k] = t.type === 'checkbox' ? t.checked : k === 'thr' ? (parseInt(t.value, 10) || 100) : t.value; renderViewBar(); renderView(); return; }
    if(t.dataset.rkf){ RV2[t.dataset.rkf] = t.value; renderView(); }
  });
  V.addEventListener('input', ev => { const t = ev.target; if(t.dataset.fmf === 'q'){ FV.q = t.value; clearTimeout(t._tm); t._tm = setTimeout(renderView, 250); } if(t.dataset.rkf === 'q'){ RV2.q = t.value; clearTimeout(t._tm); t._tm = setTimeout(renderView, 250); } });
  V.addEventListener('click', ev => {
    if(ST.cur !== '@fmea' && ST.cur !== '@risk') return;
    const t = ev.target, q = s => t.closest(s);
    let b;
    if((b = q('[data-fsort]'))){ FV.sort = FV.sort === b.dataset.fsort ? '' : b.dataset.fsort; renderView(); return; }
    if((b = q('[data-fma]'))){ const a = b.dataset.fma; if(a === 'add') fmAdd(); if(a === 'risk') openD('@risk'); if(a === 'xl') fmeaXlsx(); return; }
    if((b = q('[data-rka]'))){ const a = b.dataset.rka; if(a === 'add'){ snap(); const r = rkAdd(); ST.tsel = r.id; pendingFocus = [r.id, 'name']; afterChange(); const bd = $('#view .vbody'); if(bd) bd.scrollTop = bd.scrollHeight; } if(a === 'fmea') openD('@fmea'); if(a === 'xl') fmeaXlsx(); if(a === 'nocell'){ RV2.cell = null; renderView(); } if(a === 'png'){ const act = allRisks().filter(r => (r.rst || 'Açık') !== 'Kapandı'); const s1 = riskMatrixSVG(act, false, {static:1}), s2 = riskMatrixSVG(act, true, {static:1}); const w = +s1.match(/width="(\d+)"/)[1], h0 = +s1.match(/height="(\d+)"/)[1]; const str = `<svg xmlns="http://www.w3.org/2000/svg" width="${w * 2 + 20}" height="${h0}"><rect width="${w * 2 + 20}" height="${h0}" fill="#fff"/>${s1.replace('<svg ', '<svg x="0" ')}${s2.replace('<svg ', `<svg x="${w + 20}" `)}</svg>`; svgToPng({str, w:w * 2 + 20, h:h0}, 2).then(bl => download(new Blob([bl], {type:'image/png'}), fileSafe(E(M.rootId).name) + ' - Risk Matrisi.png')); } return; }
    if((b = q('[data-rkc]'))){ const c = b.dataset.rkc, p = b.dataset.rkp === '1'; if(RV2.cell === c && RV2.post === p) RV2.cell = null; else { RV2.cell = c; RV2.post = p; } renderView(); return; }
    if((b = q('[data-fmreq]'))){ const f = E(b.dataset.fmreq); pickList('Önleyici gereksinimler — ' + (f.name || 'arıza modu'), allReqs(), f.reqs || [], ids => { snap(); f.reqs = ids; afterChange(); }); return; }
    if((b = q('[data-rklink]'))){ const r = E(b.dataset.rklink); const c = Object.values(M.els).filter(e => ['Requirement', 'Block', 'Part', 'TestCase', 'FailureMode', 'Activity', 'InterfaceBlock'].includes(e.kind)).sort((a, b2) => (a.kind === 'Requirement' ? 0 : 1) - (b2.kind === 'Requirement' ? 0 : 1) || sortEls(a, b2)); pickList('İlgili elemanlar — ' + (r.riskId || ''), c, r.links || [], ids => { snap(); r.links = ids; afterChange(); }); return; }
    if((b = q('[data-fmdel]'))){ const f = E(b.dataset.fmdel); if(f && confirm(`"${f.name || 'Arıza modu'}" silinsin mi?`)){ snap(); delModel([f.id]); afterChange(); } return; }
    if((b = q('[data-rkdel]'))){ const r = E(b.dataset.rkdel); if(r && confirm(`${r.riskId || 'Risk'} silinsin mi?`)){ snap(); delModel([r.id]); afterChange(); } return; }
    if((b = q('[data-fmrisk]'))){ const f = E(b.dataset.fmrisk), h0 = fmHost(f); snap(); const s = n10(f.S), o = n10(f.O); const r = rkAdd({name:(h0 ? nm(h0) + ': ' : '') + (f.name || 'arıza modu'), desc:`Eğer ${h0 ? nm(h0) + ' ' : ''}"${f.name || ''}" arıza modu ${f.cause ? '(' + f.cause + ') ' : ''}oluşursa, ${f.effE || f.effN || f.effL || 'sistem etkilenir'}.`, cat:'Teknik', P:o ? Math.max(1, Math.min(5, Math.ceil(o / 2))) : '', I:s ? Math.max(1, Math.min(5, Math.ceil(s / 2))) : '', act:f.act || '', resp:f.resp || '', due:f.due || '', links:[f.id].concat(f.reqs || [])}); ST.tsel = r.id; afterChange(); toast(`${r.riskId} oluşturuldu (Ş/O 1–10 ölçeği 1–5'e çevrildi) — Risk kaydında görün`); return; }
    if((b = q('[data-ago]')) && b.dataset.ago){ revealInTree(b.dataset.ago); ST.tsel = b.dataset.ago; renderProps(); return; }
    const row = q('tr[data-row]'); if(row && ST.tsel !== row.dataset.row && !q('.ce') && !q('select') && !q('input')){ ST.tsel = row.dataset.row; renderTree(); renderProps(); markSelRow(); }
  });
})();
/* rapor bölümü */
RPT_SECTIONS.push(['risk', 'FMEA / FMECA ve risk kaydı']);
function reportRiskBlocks(H, Pp, TB, B, sec, figRef){
  const fms = allFMs(), rks = allRisks(); if(!fms.length && !rks.length) return sec;
  H(1, `${++sec}. FMEA ve risk yönetimi`);
  if(fms.length){
    H(2, 'Arıza türleri ve etkileri analizi (FMEA)');
    TB(['Eleman', 'Arıza modu', 'Neden', 'Son etki', 'Ş', 'O', 'T', 'RPN', 'Önlem', 'RPN′', 'Gereksinim'], fmRows().map(f => [nm(fmHost(f) || {}), f.name || '', f.cause || '', f.effE || f.effN || f.effL || '', String(n10(f.S) || ''), String(n10(f.O) || ''), String(n10(f.D) || ''), String(rpnOf(f) == null ? '' : rpnOf(f)), f.act || '', String(rpnOf(f, true) == null ? '' : rpnOf(f, true)), fmReqs(f).map(r => r.reqId || nm(r)).join(', ')]), [12, 13, 12, 13, 4, 4, 4, 6, 18, 6, 8]);
    const hi = fms.filter(f => (rpnOf(f) || 0) >= FV.thr || n10(f.S) >= 9); if(hi.length) Pp(`RPN ≥ ${FV.thr} veya Ş ≥ 9 olan ${hi.length} arıza modu: ` + hi.map(f => (f.name || '') + ' (' + nm(fmHost(f) || {}) + ')').join('; '));
  }
  if(rks.length){
    H(2, 'Risk kaydı');
    const act = rks.filter(r => (r.rst || 'Açık') !== 'Kapandı'), s1 = riskMatrixSVG(act, false, {static:1}), s2 = riskMatrixSVG(act, true, {static:1});
    const w = +s1.match(/width="(\d+)"/)[1], h0 = +s1.match(/height="(\d+)"/)[1];
    B.push({t:'img', r:{str:`<svg xmlns="http://www.w3.org/2000/svg" width="${w * 2 + 20}" height="${h0}" viewBox="0 0 ${w * 2 + 20} ${h0}"><rect width="${w * 2 + 20}" height="${h0}" fill="#fff"/>${s1.replace('<svg ', '<svg x="0" ')}${s2.replace('<svg ', `<svg x="${w + 20}" `)}</svg>`, w:w * 2 + 20, h:h0}, cap:`Şekil ${figRef()} – Risk matrisi (önlem öncesi / sonrası)`});
    TB(['ID', 'Risk', 'Kategori', 'O×E', 'Seviye', 'Strateji / önlem', 'Sorumlu', 'Tarih', 'Durum', 'Artık'], rks.map(r => [r.riskId || '', (r.name || '') + (r.desc ? '\n' + r.desc : ''), r.cat || '', rkScore(r) == null ? '' : n5(r.P) + '×' + n5(r.I) + '=' + rkScore(r), rkLevel(rkScore(r)), (r.strat || '') + (r.act ? ': ' + r.act : ''), r.resp || '', fmtD(r.due), r.rst || 'Açık', rkScore(r, true) == null ? '' : rkScore(r, true) + ' ' + rkLevel(rkScore(r, true))]), [7, 25, 9, 7, 8, 20, 9, 7, 7, 8]);
  }
  return sec;
}
/* model doğrulama */
VALIDATORS.push((add, els) => {
  els.filter(e => e.kind === 'FailureMode').forEach(f => {
    if(!String(f.name || '').trim()) add('uyarı', 'FMEA eksik', f, 'Arıza modu adı boş');
    if(!(n10(f.S) && n10(f.O) && n10(f.D))) add('uyarı', 'FMEA eksik', f, 'Ş / O / T puanlarından biri girilmemiş');
    if((rpnOf(f) || 0) >= FV.thr && !String(f.act || '').trim()) add('uyarı', 'FMEA önlemsiz yüksek RPN', f, `RPN ${rpnOf(f)} ≥ ${FV.thr}, önerilen önlem yok`);
    if(n10(f.S) >= 8 && !fmReqs(f).length) add('uyarı', 'FMEA izlenebilirlik', f, 'Yüksek şiddetli arıza modunun önleyici gereksinimi yok');
  });
  els.filter(e => e.kind === 'Risk').forEach(r => {
    if(!(n5(r.P) && n5(r.I))) add('uyarı', 'Risk eksik', r, 'Olasılık veya etki girilmemiş');
    if((rkScore(r) || 0) >= 10 && (r.rst || 'Açık') !== 'Kapandı' && !String(r.act || '').trim()) add('uyarı', 'Risk önlemsiz', r, 'Yüksek risk için önlem planı yok');
    if((r.rst || 'Açık') !== 'Kapandı' && !String(r.resp || '').trim()) add('bilgi', 'Risk sorumlusu yok', r, 'Sorumlu atanmamış');
    if(r.due && r.due < todayISO() && (r.rst || 'Açık') !== 'Kapandı') add('uyarı', 'Risk tarihi geçti', r, 'Hedef tarih geçti: ' + fmtD(r.due));
  });
});
/* örnek model */
DEMO_EXT.push(X => {
  const gb = Object.values(M.els).find(e => e.kind === 'Block' && e.name === 'Güç Birimi'), kb = Object.values(M.els).find(e => e.kind === 'Block' && e.name === 'Kontrol Birimi'), sb = Object.values(M.els).find(e => e.kind === 'Block' && e.name === 'Sensör Birimi');
  const R = id => Object.values(M.els).find(e => e.kind === 'Requirement' && e.reqId === id);
  const F = (h, o) => h ? mk('FailureMode', h.id, Object.assign({fst:'Açık'}, o)) : null;
  const f1 = F(gb, {fn:'28 V girişten 5/12 V üretmek', name:'Çıkış gerilimi yok', cause:'Giriş sigortası atık / DC-DC arızası', effL:'5 V ve 12 V baraları enerjisiz', effN:'Kontrol ve sensör birimleri çalışmaz', effE:'Sistem görev dışı', S:9, O:3, D:2, ctrl:'Açılışta BIT gerilim ölçümü', act:'Yedekli DC-DC, sigorta yerine PTC', resp:'Donanım', due:todayISO(), S2:9, O2:2, D2:2, lam:'4.2', alpha:'0.4', beta:'1', top:'1000', reqs:[R('SUB-001'), R('SYS-001')].filter(Boolean).map(r => r.id)});
  F(gb, {fn:'28 V girişten 5/12 V üretmek', name:'Çıkışta aşırı dalgalanma', cause:'Çıkış kondansatörü yaşlanması', effL:'Gürültülü besleme', effN:'Sensör ölçüm hatası', effE:'Hatalı durum bildirimi', S:6, O:4, D:5, ctrl:'Kabul testinde dalgalanma ölçümü', act:'Uzun ömürlü polimer kondansatör', resp:'Donanım', fst:'Uygulanıyor', S2:6, O2:2, D2:5, lam:'4.2', alpha:'0.3', beta:'0.5', top:'1000'});
  F(kb, {fn:'Açılışta kendi kendine test', name:'BIT takılması', cause:'Yazılım hatası (watchdog yok)', effL:'Açılış tamamlanmaz', effN:'Durum bildirilemez', effE:'Sistem 30 s içinde hazır olmaz', S:8, O:4, D:6, ctrl:'Entegrasyon testi', act:'Donanım watchdog ve BIT zaman aşımı', resp:'Yazılım', S2:8, O2:2, D2:3, reqs:[R('SUB-002'), R('SYS-002')].filter(Boolean).map(r => r.id)});
  const f4 = F(sb, {fn:'Veriyi 100 Hz ile iletmek', name:'Veri kaybı', cause:'Konnektör titreşimle gevşemesi', effL:'Paket kaybı', effN:'Kontrol birimi eski veriyle çalışır', effE:'Görev performansı düşer', S:7, O:5, D:4, ctrl:'Titreşim testi', act:'Kilitli konnektör, kablo sabitleme', resp:'Mekanik', S2:7, O2:2, D2:4, reqs:[R('SYS-005')].filter(Boolean).map(r => r.id)});
  const rpk = findOrMkPkg(M.rootId, 'Risk Kaydı');
  const RK = o => mk('Risk', rpk, Object.assign({cat:'Teknik', strat:'Azalt', rst:'Açık', links:[]}, o));
  RK({riskId:'R-001', name:'Titreşim kalifikasyonunda konnektör arızası', desc:'Eğer sensör konnektörü 514.8 seviyesinde gevşerse, kalifikasyon testi tekrarlanır ve takvim 6 hafta kayar.', cat:'Kalifikasyon', P:3, I:4, act:'Geliştirme modeliyle ön titreşim taraması; kilitli konnektör', resp:'Kalifikasyon', due:todayISO(), P2:1, I2:4, links:[f4 && f4.id, R('SYS-005') && R('SYS-005').id].filter(Boolean)});
  RK({riskId:'R-002', name:'DC-DC modülü tedarik süresi', desc:'Eğer DC-DC modülünün tedarik süresi 20 haftayı aşarsa, prototip montajı gecikir.', cat:'Tedarik', P:4, I:3, strat:'Azalt', act:'İkinci kaynak onayı, erken sipariş', resp:'Tedarik', P2:2, I2:3, links:[gb && gb.id].filter(Boolean)});
  RK({riskId:'R-003', name:'Yazılım BIT süresi', desc:'Eğer BIT süresi 20 s\'yi aşarsa, SYS-002 karşılanmaz.', cat:'Teknik', P:2, I:4, act:'BIT adımlarının paralelleştirilmesi', resp:'Yazılım', rst:'İzleniyor', P2:1, I2:4, links:[R('SYS-002') && R('SYS-002').id].filter(Boolean)});
  RK({riskId:'R-004', name:'Termal test odası müsaitliği', desc:'Eğer termal oda Q2\'de dolu olursa, ESS takvimi kayar.', cat:'Takvim', P:3, I:2, strat:'Transfer et', act:'Dış laboratuvarla çerçeve anlaşma', resp:'Test Ekibi', P2:2, I2:2});
  X.open.push('@fmea', '@risk');
});

