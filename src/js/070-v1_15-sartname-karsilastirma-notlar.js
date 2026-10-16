/* ================= v1.15: ŞARTNAMEDEN GEREKSİNİM ÇIKARMA, MODEL KARŞILAŞTIRMA, İNCELEME NOTLARI ================= */
/* ---- 1) şartname / doküman ayrıştırma ---- */
const SPEC_ID_RE = /^\s*[\[(]?([A-ZÇĞİÖŞÜ]{1,8}[-_.]?[A-ZÇĞİÖŞÜ0-9]*[-_.]\d{1,5}(?:[.-]\d+)*)[\])]?\s*[:.\-–]?\s+/;
const SEC_RE = /^\s*((?:\d+\.)+\d*|\d+(?:\.\d+)+)\s+(.{2,140})$/;
async function docxBlocks(u8){
  const z = await unzip(u8), xml = await z.get('word/document.xml'); if(!xml) throw new Error('word/document.xml bulunamadı — geçerli bir .docx değil');
  const doc = xmlDoc(xml), body = tagsNS(doc, 'body')[0], out = [], cnt = [0, 0, 0, 0, 0, 0, 0, 0, 0];
  const ptext = p => tagsNS(p, 't').concat(tagsNS(p, 'tab')).length ? [...p.getElementsByTagNameNS('*', '*')].filter(n => n.localName === 't' || n.localName === 'tab' || n.localName === 'br').map(n => n.localName === 't' ? n.textContent : n.localName === 'tab' ? '\t' : '\n').join('') : '';
  const walk = node => {
    [...node.childNodes].forEach(n => {
      if(n.localName === 'p'){
        const st = (tagsNS(n, 'pStyle')[0] || {getAttribute:() => ''}).getAttribute('w:val') || '';
        const m = st.match(/^(?:heading|balk|başlık|baslik|berschrift|titre|kop)\s*(\d)$/i), t = ptext(n).replace(/\s+$/, '');
        if(!t.trim()) return;
        if(m){ const lv = +m[1]; cnt[lv - 1]++; for(let i = lv; i < 9; i++) cnt[i] = 0; const num = SEC_RE.test(t) ? t.match(SEC_RE)[1] : cnt.slice(0, lv).join('.'); out.push({t:'h', lv, num:num.replace(/\.$/, ''), title:t.replace(/^\s*(?:\d+\.)*\d*\s+/, '').trim() || t}); }
        else out.push({t:'p', x:t});
      } else if(n.localName === 'tbl'){
        tagsNS(n, 'tr').forEach(tr => { const cells = [...tr.childNodes].filter(c => c.localName === 'tc').map(tc => tagsNS(tc, 'p').map(ptext).join('\n').trim()); if(cells.some(Boolean)) out.push({t:'row', cells}); });
      } else if(n.childNodes && n.localName !== 'sectPr') walk(n);
    });
  };
  walk(body);
  return out;
}
function textBlocks(txt){
  const out = [];
  String(txt || '').replace(/\r/g, '').split(/\n/).forEach(l => {
    const t = l.trim(); if(!t) return;
    if(/^#{1,6}\s/.test(t)){ const lv = t.match(/^#+/)[0].length; out.push({t:'h', lv, num:'', title:t.replace(/^#+\s*/, '')}); return; }
    const m = t.match(SEC_RE); if(m && !isReqSentence(m[2]) && m[2].length < 90 && !/[.;:]$/.test(m[2])){ out.push({t:'h', lv:m[1].split('.').filter(Boolean).length, num:m[1].replace(/\.$/, ''), title:m[2]}); return; }
    if(t.includes('\t') && t.split('\t').length >= 2){ out.push({t:'row', cells:t.split('\t').map(x => x.trim())}); return; }
    out.push({t:'p', x:t});
  });
  /* satırlara bölünmüş paragrafları birleştir */
  const merged = []; out.forEach(b => { const L = merged[merged.length - 1]; if(b.t === 'p' && L && L.t === 'p' && !/[.;:!?]$/.test(L.x) && !SPEC_ID_RE.test(b.x) && !/^\s*([-•*]|\d+[).]|[a-zç][).])\s/.test(b.x)) L.x += ' ' + b.x; else merged.push(Object.assign({}, b)); });
  return merged;
}
function isReqSentence(s){
  const w = trWords(String(s || '').toLocaleLowerCase('tr').replace(/[\(\[][^()\[\]]*[\)\]]/g, ' ')); if(w.length < 3) return false;
  const last = w[w.length - 1];
  return FUT_W.test(last) || MALI_W.test(last) || /\b(shall|must)\b/i.test(s) || /zorundadır|zorunludur|gerekmektedir|gereklidir/.test(last);
}
function splitSentences(t){
  let x = String(t || '').replace(/\s+/g, ' ').trim(); const keep = [];
  x = x.replace(/(^|[^A-Za-zÇĞİÖŞÜçğıöşü])(bkz|vb|vs|vd|örn|ör|no|şek|tab|md|mad|ref|rev|min|maks|max|yakl|yön|std|Fig|Tab|vol|approx)\.(?=\s)/gi, (m, a, b) => { keep.push(b + '.'); return a + '\u0001' + (keep.length - 1) + '\u0001'; });
  x = x.replace(/(\d)\.(\d)/g, '$1\u0002$2');
  return x.split(/(?<=[.;!?])\s+(?=[A-ZÇĞİÖŞÜ0-9"“(\[])/).map(s => s.replace(/\u0001(\d+)\u0001/g, (m, i) => keep[+i]).replace(/\u0002/g, '.').trim()).filter(Boolean);
}
function extractReqs(blocks, fname){
  const out = [], sec = []; let lastId = '';
  const push = (txt, o) => { const t = txt.replace(/\s+/g, ' ').trim(); if(t.length < 12) return; out.push(Object.assign({text:t, sec:sec.filter(Boolean).map(s => s.num).filter(Boolean).slice(-1)[0] || '', title:(sec.filter(Boolean).slice(-1)[0] || {}).title || '', file:fname}, o)); };
  blocks.forEach(b => {
    if(b.t === 'h'){ sec[b.lv - 1] = b; sec.length = b.lv; return; }
    if(b.t === 'p'){
      let x = b.x, id = '', num = ''; const m = x.match(SPEC_ID_RE); if(m && /\d/.test(m[1])){ id = m[1]; x = x.slice(m[0].length); }
      const mn = !id && x.match(/^\s*(\d+(?:\.\d+)+)\.?\s+(?=\S)/); if(mn){ num = mn[1]; x = x.slice(mn[0].length); }
      const ss = splitSentences(x), rq = ss.filter(isReqSentence);
      if(!rq.length) return;
      if(id) push(rq.join(' '), {srcNo:id, multi:rq.length > 1, kind:'p'});
      else if(num) rq.forEach((s, i) => push(s, {srcNo:'Md. ' + num + (rq.length > 1 ? '/' + (i + 1) : ''), sec:num, kind:'p'}));
      else rq.forEach((s, i) => push(s, {srcNo:'', idx:i, kind:'p'}));
    }
    if(b.t === 'row'){
      const cells = b.cells, ri = cells.findIndex(c => splitSentences(c).some(isReqSentence)); if(ri < 0) return;
      const idc = cells.find((c, i) => i !== ri && SPEC_ID_RE.test(c + ' x') && c.length < 30);
      push(cells[ri], {srcNo:idc ? idc.trim() : '', kind:'row', extra:cells.filter((c, i) => i !== ri && c !== idc && c.length < 60).join(' | ')});
    }
  });
  /* müşteri ister no yoksa bölüm numarası + sıra */
  const per = new Map(); out.forEach(r => { if(!r.srcNo && r.sec){ const n = (per.get(r.sec) || 0) + 1; per.set(r.sec, n); r.srcNo = 'Md. ' + r.sec + (n > 1 || out.filter(q => q.sec === r.sec && !q.srcNo).length > 1 ? '/' + n : ''); } });
  /* mevcut gereksinimlerle benzerlik */
  const ex = allReqs().map(r => [r, qTokens(r.text || r.srcText || '')]);
  out.forEach(r => { const A = qTokens(r.text); let best = null; ex.forEach(([q, B]) => { if(A.size < 3 || B.size < 3) return; let i = 0; A.forEach(w => { if(B.has(w)) i++; }); const j = i / (A.size + B.size - i); if(!best || j > best[1]) best = [q, j]; }); if(best && best[1] >= 0.8) r.dup = best; r.q = reqQuality({id:'_', reqId:'_', text:r.text}, null); });
  return out;
}
async function specImportDialog(){
  const box = $('#modalBox'); box.style.width = 'min(760px, 96vw)'; box.style.maxWidth = 'none';
  box.innerHTML = `<h2>Şartnameden gereksinim çıkar</h2><p class="muted" style="margin:0 0 8px">Word (.docx), metin (.txt / .md) dosyası seçin veya metni aşağıya yapıştırın. Zorunluluk ifadesiyle biten cümleler (<i>-ecek / -acak / -ecektir / -acaktır, -malıdır / -melidir, shall, must</i>) aday gereksinim olarak bulunur; bölüm numaraları, madde başındaki ister numaraları (ör. <i>[TŞ-012]</i>) ve tablolardaki gereksinim satırları okunur. PDF için metni kopyalayıp yapıştırın.</p>
    <div class="icbar"><button class="pbtn pri" id="spF">Dosya seç…</button> <span class="muted" id="spN"></span></div>
    <textarea id="spT" rows="12" style="width:100%;font:12px Consolas,monospace;margin-top:6px" placeholder="3.2 Güç&#10;3.2.1 Sistem 28 V DC besleme ile çalışacaktır.&#10;[TŞ-014] Sistem 30 s içinde hazır durumuna geçecektir…"></textarea>
    <p style="text-align:right;margin:10px 0 0"><span class="muted" id="spS"></span> <button class="pbtn" id="spC">Vazgeç</button> <button class="pbtn pri" id="spO">Gereksinimleri bul →</button></p>`;
  $('#modal').style.display = 'flex';
  let blocks = null, fname = 'yapıştırılan metin';
  const close = () => { $('#modal').style.display = 'none'; box.style.width = ''; box.style.maxWidth = ''; box.onclick = null; };
  $('#spT').onkeydown = ev => ev.stopPropagation();
  box.onclick = async ev => {
    const id = ev.target.id;
    if(id === 'spC') close();
    if(id === 'spF'){
      const f = await new Promise(res => { if(NATIVE){ nDialog('open', '', 'Şartname (*.docx;*.txt;*.md)|*.docx;*.txt;*.md|Tüm dosyalar (*.*)|*.*', '', true).then(r => { if(r.error || !r.path) return res(null); const bin = atob(r.b64 || ''), u8 = new Uint8Array(bin.length); for(let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i); res({name:r.path, u8}); }); return; } const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.docx,.txt,.md,.text'; inp.onchange = async () => { const f0 = inp.files[0]; if(!f0) return res(null); res({name:f0.name, u8:new Uint8Array(await f0.arrayBuffer())}); }; inp.click(); });
      if(!f) return; fname = baseName(f.name);
      try {
        if(/\.doc$/i.test(f.name)) throw new Error('Eski .doc biçimi okunamaz; Word\'de .docx olarak kaydedin');
        if(f.u8[0] === 0x25 && f.u8[1] === 0x50) throw new Error('PDF doğrudan okunamaz; metni kopyalayıp kutuya yapıştırın');
        if(f.u8[0] === 0x50 && f.u8[1] === 0x4b){ blocks = await docxBlocks(f.u8); $('#spT').value = blocks.map(b => b.t === 'h' ? (b.num ? b.num + ' ' : '') + b.title : b.t === 'row' ? b.cells.join('\t') : b.x).join('\n'); }
        else { $('#spT').value = decodeText(f.u8); blocks = null; }
        $('#spN').textContent = fname + ' okundu';
      } catch(e){ $('#spS').textContent = 'Hata: ' + e.message; }
    }
    if(id === 'spO'){
      const txt = $('#spT').value; if(!txt.trim()) return $('#spS').textContent = 'Önce dosya seçin veya metin yapıştırın';
      const bl = blocks && $('#spT').value === blocks.map(b => b.t === 'h' ? (b.num ? b.num + ' ' : '') + b.title : b.t === 'row' ? b.cells.join('\t') : b.x).join('\n') ? blocks : textBlocks(txt);
      const cands = extractReqs(bl, fname);
      if(!cands.length) return $('#spS').textContent = 'Zorunluluk ifadesiyle biten cümle bulunamadı';
      specPreview(cands, fname);
    }
  };
}
function specPreview(cands, fname){
  const box = $('#modalBox'); box.style.width = 'min(1100px, 97vw)'; box.style.maxWidth = 'none';
  const sel = new Set(cands.map((c, i) => c.dup ? null : i).filter(i => i != null));
  const pk = Object.values(M.els).filter(e => e.kind === 'Package' || e.kind === 'Model').sort((a, b) => pathOf(a.id).localeCompare(pathOf(b.id), 'tr'));
  const draw = () => {
    $('#spL').innerHTML = `<table class="rt"><thead><tr><th><input type="checkbox" id="spAll"${sel.size === cands.length ? ' checked' : ''}></th><th>Kaynak no</th><th>Bölüm</th><th>Gereksinim metni (düzenlenebilir)</th><th>Kalite</th><th>Not</th></tr></thead><tbody>${cands.map((c, i) => `<tr${c.dup ? ' style="background:#fff8e6"' : ''}><td><input type="checkbox" data-spi="${i}"${sel.has(i) ? ' checked' : ''}></td><td style="white-space:nowrap">${esc(c.srcNo)}</td><td class="muted" style="font-size:11px;max-width:140px">${esc((c.sec ? c.sec + ' ' : '') + (c.title || ''))}</td><td><div class="ce long" contenteditable="true" data-spe="${i}">${esc(c.text)}</div></td><td>${qualityBadge(c.q)}</td><td style="font-size:11px">${c.dup ? `<span class="bad">≈ ${esc(c.dup[0].reqId || '')} (%${Math.round(c.dup[1] * 100)} benzer)</span>` : ''}${c.multi ? '<div class="muted">birden çok cümle</div>' : ''}${c.extra ? `<div class="muted">${esc(c.extra)}</div>` : ''}</td></tr>`).join('')}</tbody></table>`;
    $('#spC2').textContent = sel.size + ' / ' + cands.length + ' seçili';
  };
  box.innerHTML = `<h2>Bulunan gereksinimler <span class="muted" style="font-size:12px;font-weight:normal">${esc(fname)}</span></h2>
    <div class="icbar" style="flex-wrap:wrap;gap:10px"><label>Seviye <select id="spLv"><option>Sistem</option><option>Alt Sistem</option></select></label><label>Alt sistem <input id="spSs" placeholder="(alt sistemse)" style="width:140px"></label>
    <label>Paket <select id="spPk"><option value="">(otomatik — Gereksinimler)</option>${pk.map(p => `<option value="${p.id}">${esc(pathOf(p.id))}</option>`).join('')}</select></label>
    <label class="vchk"><input type="checkbox" id="spSrc" checked> Özgün cümleyi "Müşteri İsteri" alanına yaz</label><label class="vchk"><input type="checkbox" id="spTtl" checked> Başlık = bölüm adı</label></div>
    <div id="spL" style="max-height:56vh;overflow:auto;margin-top:6px"></div>
    <p style="text-align:right;margin:10px 0 0"><span class="muted" id="spC2"></span> &nbsp; <button class="pbtn" id="spBk">← Geri</button> <button class="pbtn" id="spX">Vazgeç</button> <button class="pbtn pri" id="spGo">Seçilenleri ekle</button></p>`;
  draw();
  const close = () => { $('#modal').style.display = 'none'; box.style.width = ''; box.style.maxWidth = ''; box.onclick = null; box.onchange = null; box.oninput = null; };
  box.oninput = ev => { const i = ev.target.dataset.spe; if(i != null){ cands[+i].text = ev.target.innerText.replace(/\s+/g, ' ').trim(); } };
  box.addEventListener('keydown', ev => ev.stopPropagation());
  box.onchange = ev => { const t = ev.target; if(t.dataset.spi != null){ t.checked ? sel.add(+t.dataset.spi) : sel.delete(+t.dataset.spi); $('#spC2').textContent = sel.size + ' / ' + cands.length + ' seçili'; } if(t.id === 'spAll'){ sel.clear(); if(t.checked) cands.forEach((c, i) => sel.add(i)); draw(); } };
  box.onclick = ev => {
    const id = ev.target.id;
    if(id === 'spX') close();
    if(id === 'spBk') specImportDialog();
    if(id === 'spGo'){
      if(!sel.size) return toast('En az bir gereksinim seçin');
      const lvl = $('#spLv').value, ss = $('#spSs').value.trim(), pkg = $('#spPk').value, src = $('#spSrc').checked, ttl = $('#spTtl').checked;
      if(lvl === 'Alt Sistem' && !ss) return toast('Alt sistem adını girin');
      snap(); let n = 0;
      [...sel].sort((a, b) => a - b).forEach(i => { const c = cands[i]; const r = mk('Requirement', pkg || reqPkgFor(lvl, ss), {level:lvl, subsys:lvl === 'Alt Sistem' ? ss : '', name:ttl ? (c.title || '') : '', text:c.text, srcNo:c.srcNo || '', srcText:src ? c.text : '', doc:'Kaynak: ' + c.file + (c.sec ? ', bölüm ' + c.sec : '') + (c.extra ? ' — ' + c.extra : ''), status:'Taslak'}); n++; });
      close(); ST.cur = '@reqtable'; if(!ST.open.includes('@reqtable')) ST.open.push('@reqtable'); afterChange(); toast(n + ' gereksinim eklendi (durum: Taslak) — kalite raporunu kontrol edin');
    }
  };
}
/* ---- 2) model karşılaştırma ---- */
const CMP_SKIP = new Set(['id', 'owner', 'ui', '_pts', '_rm', '_num', '_seqMsgs', '_po', '_hy', 'hist']);
const CMP_LBL = {name:'Ad', text:'Metin', doc:'Açıklama', reqId:'Gereksinim ID', level:'Seviye', subsys:'Alt sistem', status:'Durum', verif:'Doğrulama yöntemi', srcNo:'Müşteri ister no', srcText:'Müşteri isteri', type:'Tip', mult:'Çokluk', dir:'Yön', def:'Varsayılan', vtype:'Değer tipi', unit:'Birim', result:'Sonuç', procNo:'Prosedür', src:'Kaynak', tgt:'Hedef', pts:'Kırılma noktaları', expr:'İfade', guard:'Koşul', S:'Ş', O:'O', D:'T', P:'Olasılık', I:'Etki', icdId:'Arayüz ID', profiles:'Test profilleri', reqs:'Gereksinimler', links:'İlgili elemanlar', attrs:'Özel özellikler', st:'Stereotipler', notes:'İnceleme notları'};
let CMP = null, CV2 = {f:'all', kind:'all', q:''};
function opath(O, id){ const a = []; let e = O.els[id], g = 0; while(e && g++ < 60){ a.unshift(e.name || (KIND[e.kind] ? KIND[e.kind].tr : e.kind)); e = O.els[e.owner]; } return a.join(' ▸ '); }
function cmpVal(O, e, k){
  const v = e[k];
  if(['type', 'src', 'tgt', 'sp', 'tp', 'behavior', 'represents', 'part', 'signal'].includes(k) && typeof v === 'string'){ const x = O.els[v]; return x ? (x.reqId || x.name || KIND[x.kind] && KIND[x.kind].tr || v) : v; }
  if(['profiles', 'reqs', 'links', 'st'].includes(k) && Array.isArray(v)) return v.map(id => { const x = O.els[id]; return x ? (x.reqId || x.name || id) : id; }).sort().join(', ');
  if(k === 'notes' && Array.isArray(v)) return v.map(n => `${n.u}: ${n.txt} [${n.st || 'Açık'}]`).join(' | ');
  return v == null ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v);
}
function diffModels(A, B){
  /* A: bu model, B: karşılaştırılan; kimlik eşleşmezse tür + yol ile eşleştir */
  const map = new Map(), usedB = new Set();
  Object.keys(A.els).forEach(id => { if(B.els[id] && B.els[id].kind === A.els[id].kind){ map.set(id, id); usedB.add(id); } });
  const keyOf = (O, e) => e.kind + '|' + (e.reqId ? 'R:' + e.reqId : e.icdId ? 'I:' + e.icdId : e.riskId ? 'K:' + e.riskId : (KIND[e.kind] && KIND[e.kind].rel) ? (O.els[e.src] ? opath(O, e.src) : '') + '→' + (O.els[e.tgt] ? opath(O, e.tgt) : '') : opath(O, e.id));
  const bk = new Map(); Object.values(B.els).forEach(e => { if(usedB.has(e.id)) return; const k = keyOf(B, e); if(!bk.has(k)) bk.set(k, []); bk.get(k).push(e.id); });
  Object.values(A.els).forEach(e => { if(map.has(e.id)) return; const L = bk.get(keyOf(A, e)); if(L && L.length){ const b = L.shift(); map.set(e.id, b); usedB.add(b); } });
  const rows = [];
  const geo = d => JSON.stringify((d.shapes || []).map(s => [s.el, Math.round(s.x), Math.round(s.y), Math.round(s.w), Math.round(s.h)]).sort());
  Object.values(A.els).forEach(a => {
    if(a.id === A.rootId) return;
    const bid = map.get(a.id);
    if(!bid){ rows.push({st:'Silinen', a, b:null, ch:[]}); return; }
    const b = B.els[bid], ch = [];
    if(a.kind === 'Diagram'){
      const sa = new Set((a.shapes || []).map(s => s.el)), sb = new Set((b.shapes || []).map(s => s.el));
      const add = [...sb].filter(x => !sa.has(x)).length, del = [...sa].filter(x => !sb.has(x)).length;
      if(add || del) ch.push({k:'shapes', l:'Şekiller', o:sa.size + ' şekil', n:sb.size + ' şekil (+' + add + ' / −' + del + ')'});
      else if(geo(a) !== geo(b)) ch.push({k:'shapes', l:'Yerleşim', o:'', n:'şekillerin konumu/boyutu değişmiş'});
      if((a.edges || []).length !== (b.edges || []).length) ch.push({k:'edges', l:'Bağlantılar', o:(a.edges || []).length, n:(b.edges || []).length});
      if((a.name || '') !== (b.name || '')) ch.push({k:'name', l:'Ad', o:a.name, n:b.name});
    } else {
      const keys = new Set(Object.keys(a).concat(Object.keys(b)).filter(k => !CMP_SKIP.has(k) && !k.startsWith('_')));
      keys.forEach(k => { const va = cmpVal(A, a, k), vb = cmpVal(B, b, k); if(va !== vb) ch.push({k, l:CMP_LBL[k] || k, o:va, n:vb}); });
      const pa = A.els[a.owner], pb = B.els[b.owner]; if(pa && pb && opath(A, pa.id) !== opath(B, pb.id)) ch.push({k:'owner', l:'Konum (sahip)', o:opath(A, pa.id), n:opath(B, pb.id)});
    }
    if(ch.length) rows.push({st:'Değişen', a, b, ch});
  });
  Object.values(B.els).forEach(b => { if(b.id === B.rootId || usedB.has(b.id)) return; rows.push({st:'Eklenen', a:null, b, ch:[]}); });
  return rows;
}
function cmpRows(){
  if(!CMP) return [];
  let rs = CMP.rows;
  if(CV2.f !== 'all') rs = rs.filter(r => r.st === CV2.f);
  if(CV2.kind !== 'all') rs = rs.filter(r => (r.a || r.b).kind === CV2.kind);
  if(CV2.q){ const q = asciiTr(CV2.q); rs = rs.filter(r => asciiTr(rowPath(r) + ' ' + r.ch.map(c => c.o + ' ' + c.n).join(' ')).includes(q)); }
  return rs;
}
const rowPath = r => r.a ? (E(r.a.id) ? pathOf(r.a.id) : r.a.name || '') : opath(CMP.O, r.b.id);
const rowLabel = e => e ? (e.reqId ? e.reqId + ' ' : '') + (e.name || (KIND[e.kind] ? KIND[e.kind].tr : e.kind)) : '';
function cmpHTML(){
  if(!CMP) return `<div class="vempty">Bu modeli başka bir model dosyasıyla (ör. ekip arkadaşınızın sürümü, önceki revizyon) karşılaştırın.<br><br><button class="vb pri" data-cma="open">Karşılaştırılacak dosyayı seç…</button><br><br><span class="muted">Elemanlar önce kimlikle, bulunamazsa tür + konum (yol), gereksinim ID, arayüz ID veya risk ID ile eşleştirilir.<br>Farkları seçip bu modele uygulayabilirsiniz.</span></div>`;
  const R = CMP.rows, c = s => R.filter(r => r.st === s).length, rs = cmpRows();
  let h = `<div class="cards"><div class="card"><div class="cv" style="font-size:16px">${esc(CMP.name)}</div><div class="ct">Karşılaştırılan model</div><div class="cs">${esc(CMP.O.els[CMP.O.rootId].name)} · ${Object.keys(CMP.O.els).length} eleman${CMP.O.savedAt ? ' · ' + new Date(CMP.O.savedAt).toLocaleString('tr-TR') : ''}</div></div>${[['Eklenen', '#2e9e6a', 'karşılaştırılanda var, bunda yok'], ['Silinen', '#c0392b', 'bunda var, karşılaştırılanda yok'], ['Değişen', '#d18a00', 'alan farkı olan']].map(([s, col, d]) => `<div class="card"><div class="cv" style="color:${col}">${c(s)}</div><div class="ct">${s}</div><div class="cs">${d}</div></div>`).join('')}</div>`;
  if(!R.length) return h + '<div class="vempty">Fark yok — iki model aynı.</div>';
  h += `<table class="rt"><thead><tr><th><input type="checkbox" data-cmall="1"${rs.length && rs.every(r => CMP.sel.has(r)) ? ' checked' : ''}></th><th>Durum</th><th>Tür</th><th>Eleman</th><th>Alan</th><th>Bu model</th><th>Karşılaştırılan</th></tr></thead><tbody>`;
  rs.slice(0, CMP.limit || 400).forEach(r => {
    const e = r.a || r.b, col = {Eklenen:'#2e9e6a', Silinen:'#c0392b', 'Değişen':'#d18a00'}[r.st], i = CMP.rows.indexOf(r);
    const span = Math.max(1, r.ch.length);
    const head = `<td rowspan="${span}"><input type="checkbox" data-cmi="${i}"${CMP.sel.has(r) ? ' checked' : ''}></td><td rowspan="${span}"><span class="rpn" style="background:${col}">${r.st}</span></td><td rowspan="${span}" class="muted">${esc(KIND[e.kind] ? KIND[e.kind].tr : e.kind)}</td><td rowspan="${span}">${r.a && E(r.a.id) ? `<a class="lnk" data-ago="${r.a.id}">${esc(rowLabel(r.a))}</a>` : esc(rowLabel(e))}<div class="muted" style="font-size:10.5px">${esc(rowPath(r))}</div></td>`;
    if(!r.ch.length){ h += `<tr>${head}<td class="muted">—</td><td>${r.a ? esc(cmpVal(CMP.A, r.a, 'text') || cmpVal(CMP.A, r.a, 'doc') || '') : ''}</td><td>${r.b ? esc(cmpVal(CMP.O, r.b, 'text') || cmpVal(CMP.O, r.b, 'doc') || '') : ''}</td></tr>`; return; }
    r.ch.forEach((x, j) => { const long = String(x.o).length + String(x.n).length > 40 && (x.k === 'text' || x.k === 'doc' || x.k === 'srcText'); h += `<tr>${j ? '' : head}<td style="white-space:nowrap">${esc(x.l)}</td>${long ? `<td colspan="2" class="wdiff">${wordDiff(x.o, x.n)}</td>` : `<td><del>${esc(String(x.o).slice(0, 300))}</del></td><td><ins>${esc(String(x.n).slice(0, 300))}</ins></td>`}</tr>`; });
  });
  h += '</tbody></table>';
  if(rs.length > (CMP.limit || 400)) h += `<div class="vfoot">${CMP.limit || 400} / ${rs.length} gösteriliyor <button class="vb" data-cma="more">Tümünü göster</button></div>`;
  return h + `<div class="vfoot">Seçili ${CMP.sel.size} fark · <b>Uygula</b>: eklenenler bu modele kopyalanır, değişenlerde alanlar karşılaştırılan modelden alınır, silinenler bu modelden silinir. Tek adımda Ctrl+Z ile geri alınır.</div>`;
}
function cmpBar(){
  const kinds = CMP ? [...new Set(CMP.rows.map(r => (r.a || r.b).kind))].sort() : [];
  return `<button class="vb${CMP ? '' : ' pri'}" data-cma="open">${CMP ? 'Başka dosya…' : 'Dosya seç…'}</button>${CMP ? `<label>Göster <select data-cmf="f"><option value="all">Tümü</option>${['Eklenen', 'Silinen', 'Değişen'].map(s => `<option${CV2.f === s ? ' selected' : ''}>${s}</option>`).join('')}</select></label><label>Tür <select data-cmf="kind"><option value="all">Tümü</option>${kinds.map(k => `<option value="${k}"${CV2.kind === k ? ' selected' : ''}>${esc(KIND[k] ? KIND[k].tr : k)}</option>`).join('')}</select></label><input data-cmf="q" placeholder="Ara…" value="${esc(CV2.q)}" style="width:150px">
    <span class="vsep"></span><button class="vb pri" data-cma="apply">✓ Seçilenleri uygula (${CMP.sel.size})</button><button class="vb" data-cma="xl">⤒ Excel'e aktar</button><button class="vb" data-cma="close">Kapat</button>` : ''}`;
}
async function cmpOpen(){
  let f; try { f = await pickModelText(); } catch(e){ return toast('Açılamadı: ' + e.message); }
  if(!f) return; const O = parseModelText(f.text); if(!O) return toast('Geçerli bir model dosyası değil');
  migrateModel(O);
  cmpLoad(O, baseName(f.name));
}
function cmpLoad(O, name){ const A = JSON.parse(JSON.stringify(M)); CMP = {O, A, name, rows:diffModels(A, O), sel:new Set(), limit:400}; CV2 = {f:'all', kind:'all', q:''}; openD('@compare'); renderViewBar(); renderView(); }
function cmpApply(){
  if(!CMP || !CMP.sel.size) return toast('Önce uygulanacak farkları seçin');
  const O = CMP.O, sel = [...CMP.sel]; snap(); ST.batch = true;
  let na = 0, nc = 0, nd = 0, skip = 0;
  const idMap = new Map(); CMP.rows.forEach(r => { if(r.a && r.b) idMap.set(r.b.id, r.a.id); });
  const mapId = id => idMap.get(id) || id;
  const remap = x => { ['src', 'tgt', 'sp', 'tp', 'type', 'behavior', 'represents', 'part', 'signal'].forEach(k => { if(typeof x[k] === 'string') x[k] = mapId(x[k]); }); ['profiles', 'reqs', 'links', 'st'].forEach(k => { if(Array.isArray(x[k])) x[k] = x[k].map(mapId); }); if(x.kind === 'Diagram'){ (x.shapes || []).forEach(s => { s.el = mapId(s.el); }); (x.edges || []).forEach(ed => { if(ed.el) ed.el = mapId(ed.el); }); } return x; };
  /* eklenenler: sahipler önce */
  const adds = sel.filter(r => r.st === 'Eklenen').sort((p, q) => opath(O, p.b.id).split(' ▸ ').length - opath(O, q.b.id).split(' ▸ ').length);
  adds.forEach(r => { const b = JSON.parse(JSON.stringify(r.b)); const own = mapId(b.owner); if(!M.els[own]){ const pk = findOrMkPkg(M.rootId, 'Karşılaştırmadan gelenler'); b.owner = pk; } else b.owner = own; if(M.els[b.id]) b.id = uid(); idMap.set(r.b.id, b.id); M.els[b.id] = b; na++; });
  adds.forEach(r => remap(M.els[idMap.get(r.b.id)]));
  sel.filter(r => r.st === 'Değişen').forEach(r => { const a = M.els[r.a.id]; if(!a){ skip++; return; } const b = remap(JSON.parse(JSON.stringify(r.b))); r.ch.forEach(c => { if(c.k === 'owner'){ const o = mapId(r.b.owner); if(M.els[o] && !isAnc(a.id, o)) a.owner = o; } else if(c.k === 'shapes' || c.k === 'edges'){ a.shapes = b.shapes; a.edges = b.edges; } else if(b[c.k] === undefined) delete a[c.k]; else a[c.k] = b[c.k]; }); nc++; });
  const dels = sel.filter(r => r.st === 'Silinen' && M.els[r.a.id]).map(r => r.a.id); if(dels.length){ delModel(dels); nd = dels.length; }
  ST.batch = false; bump(); Object.values(M.els).forEach(d => { if(d.kind === 'Diagram'){ d.shapes = (d.shapes || []).filter(s => M.els[s.el]); const ids = new Set(d.shapes.map(s => s.id)); d.edges = (d.edges || []).filter(ed => ids.has(ed.s) && ids.has(ed.t) && (!ed.el || M.els[ed.el])); } });
  afterChange(); CMP.A = JSON.parse(JSON.stringify(M)); CMP.rows = diffModels(CMP.A, CMP.O); CMP.sel.clear(); renderViewBar(); renderView();
  toast(`${na} eleman eklendi, ${nc} eleman güncellendi, ${nd} eleman silindi${skip ? ', ' + skip + ' atlandı' : ''} — Ctrl+Z ile geri alınabilir`);
}
function cmpXlsx(){
  if(!CMP) return; const rows = [['Durum', 'Tür', 'Eleman', 'Yol', 'Alan', 'Bu model', 'Karşılaştırılan (' + CMP.name + ')'].map(v => ({v, s:1}))];
  cmpRows().forEach(r => { const e = r.a || r.b, s = r.st === 'Eklenen' ? 3 : r.st === 'Silinen' ? 4 : 5; if(!r.ch.length) rows.push([{v:r.st, s}, KIND[e.kind] ? KIND[e.kind].tr : e.kind, rowLabel(e), rowPath(r), '', r.a ? cmpVal(CMP.A, r.a, 'text') : '', r.b ? cmpVal(CMP.O, r.b, 'text') : '']); else r.ch.forEach(c => rows.push([{v:r.st, s}, KIND[e.kind] ? KIND[e.kind].tr : e.kind, rowLabel(e), rowPath(r), c.l, String(c.o), String(c.n)])); });
  download(buildXlsx([{name:'Model Farkları', rows, widths:[10, 16, 30, 40, 18, 50, 50], header:true, freeze:[1, 3], filter:1}]), fileSafe(E(M.rootId).name) + ' - Model Karşılaştırma.xlsx');
}
/* ---- 3) inceleme notları ---- */
const noteOpen = e => (e && Array.isArray(e.notes) ? e.notes.filter(n => (n.st || 'Açık') === 'Açık').length : 0);
function noteBadge(sh, e){ const n = noteOpen(e); if(!n) return ''; const x = sh.x + sh.w - 6, y = sh.y - 6; return `<g class="nbd" data-note="${e.id}"><circle cx="${x}" cy="${y}" r="9" fill="#f5b400" stroke="#fff" stroke-width="1.5"/><text x="${x}" y="${y + 3.5}" text-anchor="middle" font-family="${FF}" font-size="10" font-weight="700" fill="#3a2a00">${n}</text><title>${n} açık inceleme notu</title></g>`; }
function notesHTML(el){
  const L = Array.isArray(el.notes) ? el.notes : [];
  let h = `<div class="sub"><span>İnceleme notları (${noteOpen(el)} açık / ${L.length})</span></div>`;
  h += L.map((n, i) => `<div class="note${(n.st || 'Açık') === 'Açık' ? '' : ' done'}"><div class="nh"><b>${esc(n.u || '')}</b> <span class="muted">${n.t ? new Date(n.t).toLocaleString('tr-TR', {dateStyle:'short', timeStyle:'short'}) : ''}</span> <span class="nst">${esc(n.st || 'Açık')}</span></div><div class="nt">${esc(n.txt || '')}</div>${(n.re || []).map(r => `<div class="nre"><b>${esc(r.u)}</b>: ${esc(r.txt)}</div>`).join('')}<div class="na"><button class="pbtn" data-nact="re|${el.id}|${i}">Yanıtla</button> <button class="pbtn" data-nact="tog|${el.id}|${i}">${(n.st || 'Açık') === 'Açık' ? '✓ Kapat' : 'Yeniden aç'}</button> <button class="pbtn" data-nact="del|${el.id}|${i}">✕</button></div></div>`).join('');
  h += `<textarea id="noteTx" rows="2" style="width:100%;font:inherit;font-size:12px;margin-top:4px" placeholder="Not / inceleme yorumu yazın… (${esc(userName())})"></textarea><div style="text-align:right"><button class="pbtn pri" data-nact="add|${el.id}">+ Not ekle</button></div>`;
  return h;
}
function noteAct(a){
  const [op, id, i] = a.split('|'), e = E(id); if(!e) return;
  if(op === 'add'){ const tx = ($('#noteTx') || {}).value || ''; if(!tx.trim()) return toast('Not metni boş'); snap(); e.notes = (e.notes || []).concat([{id:uid(), t:new Date().toISOString(), u:userName(), txt:tx.trim(), st:'Açık'}]); afterChange(); return; }
  const n = (e.notes || [])[+i]; if(!n) return;
  if(op === 'tog'){ snap(); n.st = (n.st || 'Açık') === 'Açık' ? 'Kapalı' : 'Açık'; n.ct = new Date().toISOString(); n.cu = userName(); afterChange(); }
  if(op === 'del'){ if(!confirm('Not silinsin mi?')) return; snap(); e.notes.splice(+i, 1); if(!e.notes.length) delete e.notes; afterChange(); }
  if(op === 're'){ const t = prompt('Yanıt:'); if(!t || !t.trim()) return; snap(); n.re = (n.re || []).concat([{u:userName(), t:new Date().toISOString(), txt:t.trim()}]); afterChange(); }
}
let NV = {st:'Açık', u:'all', q:''};
function allNotes(){ const out = []; Object.values(M.els).forEach(e => (e.notes || []).forEach((n, i) => out.push({e, n, i}))); return out.sort((a, b) => String(b.n.t || '').localeCompare(String(a.n.t || ''))); }
function reviewsHTML(){
  const all = allNotes();
  if(!all.length) return `<div class="vempty">Henüz inceleme notu yok.<br><br><span class="muted">Ağaçta veya diyagramda bir eleman seçip Özellikler panelinin altındaki <b>İnceleme notları</b> bölümünden not ekleyin.<br>Açık notlu elemanlar diyagramda sarı rozetle işaretlenir.</span></div>`;
  let L = all; if(NV.st !== 'all') L = L.filter(x => (x.n.st || 'Açık') === NV.st); if(NV.u !== 'all') L = L.filter(x => x.n.u === NV.u); if(NV.q){ const q = asciiTr(NV.q); L = L.filter(x => asciiTr(x.n.txt + ' ' + nm(x.e) + ' ' + (x.n.re || []).map(r => r.txt).join(' ')).includes(q)); }
  const users = [...new Set(all.map(x => x.n.u))];
  let h = `<div class="cards"><div class="card"><div class="cv" style="color:#d18a00">${all.filter(x => (x.n.st || 'Açık') === 'Açık').length}</div><div class="ct">Açık not</div></div><div class="card"><div class="cv" style="color:#2e9e6a">${all.filter(x => x.n.st === 'Kapalı').length}</div><div class="ct">Kapalı not</div></div><div class="card"><div class="cv">${new Set(all.map(x => x.e.id)).size}</div><div class="ct">Notlu eleman</div></div><div class="card"><div class="cv">${users.length}</div><div class="ct">Yazan</div><div class="cs">${esc(users.slice(0, 4).join(', '))}</div></div></div>`;
  h += `<table class="rt"><thead><tr><th>Eleman</th><th>Not</th><th>Yanıtlar</th><th>Yazan</th><th>Tarih</th><th>Durum</th><th></th></tr></thead><tbody>${L.map(x => `<tr data-row="${x.e.id}"><td><a class="lnk" data-ago="${x.e.id}">${esc(rowLabel(x.e))}</a><div class="muted" style="font-size:10.5px">${esc(KIND[x.e.kind] ? KIND[x.e.kind].tr : '')} · ${esc(pathOf(x.e.owner || ''))}</div></td><td style="max-width:420px;white-space:pre-wrap">${esc(x.n.txt)}</td><td style="font-size:11.5px">${(x.n.re || []).map(r => `<div><b>${esc(r.u)}</b>: ${esc(r.txt)}</div>`).join('')}</td><td>${esc(x.n.u || '')}</td><td style="white-space:nowrap">${x.n.t ? new Date(x.n.t).toLocaleDateString('tr-TR') : ''}</td><td><span class="rpn" style="background:${(x.n.st || 'Açık') === 'Açık' ? '#d18a00' : '#2e9e6a'}">${esc(x.n.st || 'Açık')}</span>${x.n.cu ? `<div class="muted" style="font-size:10.5px">${esc(x.n.cu)}</div>` : ''}</td><td style="white-space:nowrap"><button class="vb" data-nact="re|${x.e.id}|${x.i}">Yanıtla</button> <button class="vb" data-nact="tog|${x.e.id}|${x.i}">${(x.n.st || 'Açık') === 'Açık' ? '✓ Kapat' : 'Aç'}</button></td></tr>`).join('')}</tbody></table>`;
  return h + `<div class="vfoot">${L.length} / ${all.length} not · Kullanıcı adınız: <b>${esc(userName())}</b> (Gereksinimler ▾ → Kullanıcı adım)</div>`;
}
function reviewsBar(){ const users = [...new Set(allNotes().map(x => x.n.u))]; return `<label>Durum <select data-nvf="st">${[['Açık', 'Açık'], ['Kapalı', 'Kapalı'], ['all', 'Tümü']].map(([v, t]) => `<option value="${v}"${NV.st === v ? ' selected' : ''}>${t}</option>`).join('')}</select></label><label>Yazan <select data-nvf="u"><option value="all">Tümü</option>${users.map(u => `<option${NV.u === u ? ' selected' : ''}>${esc(u)}</option>`).join('')}</select></label><input data-nvf="q" placeholder="Ara…" value="${esc(NV.q)}" style="width:160px"><span class="vsep"></span><button class="vb" data-nva="xl">⤒ Excel'e aktar</button>`; }
function reviewsXlsx(){ const rows = [['Eleman', 'Tür', 'Yol', 'Not', 'Yanıtlar', 'Yazan', 'Tarih', 'Durum', 'Kapatan'].map(v => ({v, s:1}))]; allNotes().forEach(x => rows.push([rowLabel(x.e), KIND[x.e.kind] ? KIND[x.e.kind].tr : '', pathOf(x.e.owner || ''), x.n.txt, (x.n.re || []).map(r => r.u + ': ' + r.txt).join('\n'), x.n.u || '', x.n.t ? new Date(x.n.t).toLocaleString('tr-TR') : '', {v:x.n.st || 'Açık', s:(x.n.st || 'Açık') === 'Açık' ? 5 : 3}, x.n.cu || ''])); download(buildXlsx([{name:'İnceleme Notları', rows, widths:[30, 14, 34, 60, 40, 14, 18, 10, 14], header:true, freeze:[1, 1], filter:1}]), fileSafe(E(M.rootId).name) + ' - İnceleme Notları.xlsx'); }
Object.assign(VIEWS, {
  '@compare':{tr:'Model Karşılaştırma', ic:'⇄', note:'Bu modeli başka bir .sysml dosyasıyla karşılaştırır: eklenen, silinen ve değişen elemanlar alan alan listelenir (metinlerde kelime düzeyinde fark).<br><br>Farkları işaretleyip <b>Uygula</b> ile bu modele alın; tek adımda geri alınabilir.', render:cmpHTML, bar:cmpBar, status:() => CMP ? CMP.rows.length + ' fark' : 'Dosya seçilmedi'},
  '@reviews':{tr:'İnceleme Notları', ic:'💬', note:'Model elemanlarına yazılan inceleme notları (kim, ne zaman, açık/kapalı, yanıtlar).<br><br>Not eklemek için elemanı seçip Özellikler panelinin altındaki bölümü kullanın. Açık notlu elemanlar diyagramlarda sarı rozetle görünür.', render:reviewsHTML, bar:reviewsBar, status:() => allNotes().filter(x => (x.n.st || 'Açık') === 'Açık').length + ' açık not'}
});
(function(){
  const V = $('#view');
  V.addEventListener('change', ev => {
    const t = ev.target;
    if(ST.cur === '@compare' && CMP){
      if(t.dataset.cmi != null){ const r = CMP.rows[+t.dataset.cmi]; t.checked ? CMP.sel.add(r) : CMP.sel.delete(r); renderViewBar(); return; }
      if(t.dataset.cmall){ const rs = cmpRows(); rs.forEach(r => t.checked ? CMP.sel.add(r) : CMP.sel.delete(r)); renderViewBar(); renderView(); return; }
      if(t.dataset.cmf){ CV2[t.dataset.cmf] = t.value; renderView(); return; }
    }
    if(ST.cur === '@reviews' && t.dataset.nvf){ NV[t.dataset.nvf] = t.value; renderView(); }
  });
  V.addEventListener('input', ev => { const t = ev.target; if(t.dataset.cmf === 'q'){ CV2.q = t.value; clearTimeout(t._tm); t._tm = setTimeout(renderView, 250); } if(t.dataset.nvf === 'q'){ NV.q = t.value; clearTimeout(t._tm); t._tm = setTimeout(renderView, 250); } });
  V.addEventListener('click', ev => {
    const t = ev.target; let b;
    if((b = t.closest('[data-nact]'))){ noteAct(b.dataset.nact); return; }
    if(ST.cur === '@reviews' && (b = t.closest('[data-nva]'))){ reviewsXlsx(); return; }
    if(ST.cur === '@compare' && (b = t.closest('[data-cma]'))){ const a = b.dataset.cma; if(a === 'open') cmpOpen(); if(a === 'apply'){ if(CMP && CMP.sel.size && confirm(CMP.sel.size + ' fark bu modele uygulansın mı?')) cmpApply(); else if(CMP && !CMP.sel.size) toast('Önce farkları işaretleyin'); } if(a === 'xl') cmpXlsx(); if(a === 'close'){ CMP = null; renderViewBar(); renderView(); } if(a === 'more'){ CMP.limit = 1e9; renderView(); } return; }
    if((ST.cur === '@compare' || ST.cur === '@reviews') && (b = t.closest('[data-ago]')) && b.dataset.ago){ revealInTree(b.dataset.ago); ST.tsel = b.dataset.ago; renderProps(); }
  });
  $('#props').addEventListener('click', ev => { const b = ev.target.closest('[data-nact]'); if(b) noteAct(b.dataset.nact); });
  $('#props').addEventListener('keydown', ev => { if(ev.target.id === 'noteTx'){ ev.stopPropagation(); if(ev.key === 'Enter' && ev.ctrlKey){ const e = ST.tsel; if(e) noteAct('add|' + e); } } });
})();
VALIDATORS.push((add, els) => { els.forEach(e => { const n = noteOpen(e); if(n) add('bilgi', 'Açık inceleme notu', e, n + ' açık not: ' + e.notes.filter(x => (x.st || 'Açık') === 'Açık').map(x => x.txt).join(' | ').slice(0, 160)); }); });
DEMO_EXT.push(X => {
  X.S5.notes = [{id:uid(), t:new Date(Date.now() - 864e5 * 2).toISOString(), u:'Kalite', txt:'Kategori ve test süresi belirtilmeli (ör. Kat. 24, 1 sa/eksen).', st:'Açık', re:[{u:'Sistem Müh.', t:new Date(Date.now() - 864e5).toISOString(), txt:'Test profiline bağlandı, metin güncellenecek.'}]}];
  const kb = Object.values(M.els).find(e => e.kind === 'Block' && e.name === 'Kontrol Birimi'); if(kb) kb.notes = [{id:uid(), t:new Date(Date.now() - 864e5 * 5).toISOString(), u:'Tasarım İnceleme', txt:'Watchdog donanımı blok tanımına eklensin.', st:'Kapalı', cu:'Yazılım'}];
});

