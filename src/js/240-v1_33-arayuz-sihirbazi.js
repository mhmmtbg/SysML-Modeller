/* ================= v1.33: HIZLI ARAYÜZ SİHİRBAZI VE IBD DERİN PART'LAR ================= */
/* ---------- IBD: alt part'ları kutu içinde göster ---------- */
function deepKids(d, sh){ const out = []; const rec = id => d.shapes.forEach(s => { if(s.parent === id){ out.push(s); rec(s.id); } }); rec(sh.id); return out; }
function deepExpand(d, sh, depth){
  depth = depth == null ? 1 : depth;
  const p = E(sh.el); if(!p || p.kind !== 'Part' || !p.type || !E(p.type) || depth < 1) return 0;
  const subs = kidsOf(p.type).filter(k => k.kind === 'Part').sort(sortEls); if(!subs.length) return 0;
  const have = new Set(d.shapes.filter(s => s.parent === sh.id).map(s => s.el));
  let n = 0; const W = 170, H = 70, G2 = 150, cols = Math.min(3, subs.length);
  subs.forEach((sp, i) => {
    if(have.has(sp.id)) return;
    const c = addShape(d, sp.id, sh.x + 40 + (i % cols) * (W + G2), sh.y + 60 + Math.floor(i / cols) * (H + 60), W, H); c.parent = sh.id; c.deep = 1; n++;
    try { showPorts(d, c); } catch(e){}
    if(depth > 1){ n += deepExpand(d, c, depth - 1); }
  });
  deepFit(d, sh);
  sh.deep = depth;
  return n;
}
function deepFit(d, sh){
  const kids = d.shapes.filter(s => s.parent === sh.id && E(s.el) && E(s.el).kind === 'Part'); if(!kids.length) return;
  const pside = d.shapes.filter(s => s.parent === sh.id && E(s.el) && E(s.el).kind === 'Port').map(pt => [pt, portSide(pt, sh)]);
  kids.forEach(k => deepFit(d, k));
  const x1 = Math.max(...kids.map(k => k.x + k.w)) + 20, y1 = Math.max(...kids.map(k => k.y + k.h)) + 20;
  const minX = Math.min(...kids.map(k => k.x)), minY = Math.min(...kids.map(k => k.y));
  if(minX < sh.x + 10){ const dx = sh.x + 10 - minX; kids.forEach(k => moveDeep(d, k, dx, 0)); }
  if(minY < sh.y + 34){ const dy = sh.y + 34 - minY; kids.forEach(k => moveDeep(d, k, 0, dy)); }
  sh.w = Math.max(sh.w, snapv(Math.max(...kids.map(k => k.x + k.w)) + 20 - sh.x)); sh.h = Math.max(sh.h, snapv(Math.max(...kids.map(k => k.y + k.h)) + 20 - sh.y));
  // sınırdaki portları yeni kenara taşı
  pside.forEach(([pt, sd]) => { if(sd === 'r') pt.x = sh.x + sh.w - pt.w / 2; else if(sd === 'b') pt.y = sh.y + sh.h - pt.h / 2; else if(sd === 't'){ pt.y = sh.y - pt.h / 2; pt.x = sh.x + sh.w - 40 - pt.w / 2; } });
}
function moveDeep(d, s, dx, dy){ s.x += dx; s.y += dy; d.shapes.forEach(c => { if(c.parent === s.id) moveDeep(d, c, dx, dy); }); }
function deepCollapse(d, sh){
  const kill = new Set(deepKids(d, sh).filter(s => { let p = s; while(p && p.parent !== sh.id) p = d.shapes.find(x => x.id === p.parent); return p && p.deep; }).map(s => s.id));
  d.shapes.filter(s => s.parent === sh.id && s.deep).forEach(s => { kill.add(s.id); deepKids(d, s).forEach(k => kill.add(k.id)); });
  d.shapes = d.shapes.filter(s => !kill.has(s.id)); d.edges = d.edges.filter(e => !kill.has(e.s) && !kill.has(e.t));
  delete sh.deep; return kill.size;
}
/* ---------- hızlı arayüz sihirbazı ---------- */
function ifaceCandidates(){
  const d = cur(), out = [];
  if(d && !isView(ST.cur) && d.dtype === 'ibd') d.shapes.filter(s => E(s.el) && E(s.el).kind === 'Part').forEach(s => out.push({k:'shape:' + s.id, l:'IBD part: ' + E(s.el).name + (E(s.el).type && E(E(s.el).type) ? ' : ' + E(E(s.el).type).name : ''), sh:s, part:E(s.el), block:E(E(s.el).type || '')}));
  Object.values(M.els).filter(e => e.kind === 'Block').sort(sortEls).forEach(b => out.push({k:'block:' + b.id, l:'Blok: ' + pathOf(b.id), block:b}));
  return out;
}
function ifaceWizard(){
  const C = ifaceCandidates(); if(C.length < 2) return toast('En az iki blok veya part gerekli');
  const d = cur(), selS = d && !isView(ST.cur) ? d.shapes.filter(s => ST.sel.has(s.id) && E(s.el) && ['Part', 'Block'].includes(E(s.el).kind)) : [];
  const pre = selS.map(s => C.find(c => c.sh === s) || C.find(c => c.k === 'block:' + s.el)).filter(Boolean);
  const A0 = (pre[0] || C[0]).k, B0 = (pre[1] || C.find(c => c.k !== A0)).k;
  const box = $('#modalBox'); box.style.width = 'min(640px, 96vw)'; box.style.maxWidth = 'none';
  const opts = v => C.map(c => `<option value="${c.k}"${c.k === v ? ' selected' : ''}>${esc(c.l)}</option>`).join('');
  box.innerHTML = `<h2>Hızlı arayüz bağla</h2><p class="muted" style="margin:-4px 0 8px;font-size:12px">İki blok/part arasında tek adımda: arayüz bloğu (InterfaceBlock) ve akış özellikleri, A tarafında normal, B tarafında eşlenik (~) proxy port ve aralarında Connector. Açık IBD'de seçili iki part varsa otomatik gelir.</p>
    <div class="qf"><label>A (sağlayan)<select id="ifA" class="noi18n">${opts(A0)}</select></label><label>B (kullanan)<select id="ifB" class="noi18n">${opts(B0)}</select></label>
    <label>Arayüz bloğu adı<input id="ifN" placeholder="ör. GüçArayüzü"></label>
    <label>Akış özellikleri (her satır: ad : tip : yön — yön A'dan bakışla out/in/inout)<textarea id="ifF" rows="4" placeholder="güç : Real : out&#10;durum : String : in"></textarea></label>
    <label>Port adları (A / B)<div style="display:flex;gap:6px"><input id="ifPA" placeholder="otomatik"><input id="ifPB" placeholder="otomatik"></div></label>
    </div><label class="vchk" style="display:block;margin-top:6px"><input type="checkbox" id="ifX" checked> Mevcut aynı adlı arayüz bloğunu yeniden kullan</label>
    <p style="text-align:right;margin:12px 0 0"><span class="muted" id="ifSt"></span> <button class="pbtn" id="ifC">Vazgeç</button> <button class="pbtn pri" id="ifO">Oluştur</button></p>`;
  $('#modal').style.display = 'flex';
  const close = () => { $('#modal').style.display = 'none'; box.style.width = ''; box.style.maxWidth = ''; box.onclick = null; box.onkeydown = null; };
  const sug = () => { const a = C.find(c => c.k === $('#ifA').value), b = C.find(c => c.k === $('#ifB').value); if(!$('#ifN').dataset.touched && a && b) $('#ifN').value = ((a.block || {}).name || 'A').replace(/\s+/g, '') + '_' + ((b.block || {}).name || 'B').replace(/\s+/g, '') + 'Arayüzü'; };
  sug(); box.onchange = ev => { if(ev.target.id === 'ifA' || ev.target.id === 'ifB') sug(); };
  box.oninput = ev => { if(ev.target.id === 'ifN') ev.target.dataset.touched = 1; };
  box.onkeydown = ev => { ev.stopPropagation(); if(ev.key === 'Escape') close(); };
  box.onclick = ev => {
    if(ev.target.id === 'ifC') return close();
    if(ev.target.id !== 'ifO') return;
    const a = C.find(c => c.k === $('#ifA').value), b = C.find(c => c.k === $('#ifB').value);
    const r = ifaceCreate(a, b, {name:$('#ifN').value.trim(), flows:$('#ifF').value, pa:$('#ifPA').value.trim(), pb:$('#ifPB').value.trim(), reuse:$('#ifX').checked});
    if(r.err){ $('#ifSt').textContent = r.err; return; }
    close(); toast(`Arayüz kuruldu: ${r.ib.name} · ${r.flows} akış özelliği · ${r.conn ? 'bağlantı oluşturuldu' : 'bağlantı için ortak bağlam bulunamadı'}`);
  };
}
function ifaceCreate(a, b, o){
  if(!a || !b) return {err:'İki uç seçin'}; if(a.k === b.k) return {err:'Uçlar farklı olmalı'};
  if(!a.block || !b.block || !E(a.block.id) || !E(b.block.id)) return {err:'Part\'ın tipi (blok) yok — önce tipleyin'};
  if(a.block.id === b.block.id) return {err:'İki uç aynı bloğa tipli; farklı bloklar seçin'};
  const name = o.name || 'Arayüz';
  snap();
  let ib = o.reuse ? Object.values(M.els).find(e => e.kind === 'InterfaceBlock' && e.name === name) : null;
  if(!ib) ib = mk('InterfaceBlock', nearestPkg(a.block.id), {name});
  let nf = 0;
  String(o.flows || '').split(/\n+/).map(l => l.trim()).filter(Boolean).forEach(l => {
    const [n, t, dr] = l.split(':').map(x => (x || '').trim()); if(!n) return;
    if(kidsOf(ib.id).some(f => f.kind === 'FlowProp' && f.name === n)) return;
    const dir = /^(in|out|inout)$/i.test(dr || '') ? dr.toLowerCase() : 'out';
    const blk = t && Object.values(M.els).find(e => ['Block', 'Signal', 'InterfaceBlock'].includes(e.kind) && e.name === t);
    mk('FlowProp', ib.id, Object.assign({name:n, dir}, blk ? {type:blk.id} : {vtype:t || 'Real'})); nf++;
  });
  const pn = (blk, other, given) => given || uniqName(lcFirst(String(other.name || 'port').replace(/\s+/g, '')) + 'Port', blk.id);
  const pA = mk('Port', a.block.id, {name:pn(a.block, b.block, o.pa), type:ib.id, pkind:'proxy'});
  const pB = mk('Port', b.block.id, {name:pn(b.block, a.block, o.pb), type:ib.id, pkind:'proxy', conj:true});
  let conn = null;
  const d = cur();
  if(a.sh && b.sh && d && d.shapes.includes(a.sh) && d.shapes.includes(b.sh)){
    showPorts(d, a.sh); showPorts(d, b.sh);
    const sa = d.shapes.find(s => s.parent === a.sh.id && s.el === pA.id), sb = d.shapes.find(s => s.parent === b.sh.id && s.el === pB.id);
    if(sa && sb){ const ed = connect(d, 'Connector', sa, sb); conn = E(ed.el); }
  }
  if(!conn){
    const ctx = Object.values(M.els).find(c => c.kind === 'Block' && kidsOf(c.id).some(p => p.kind === 'Part' && p.type === a.block.id) && kidsOf(c.id).some(p => p.kind === 'Part' && p.type === b.block.id));
    if(ctx){
      const qa = (a.part && a.part.owner === ctx.id) ? a.part : kidsOf(ctx.id).find(p => p.kind === 'Part' && p.type === a.block.id), qb = (b.part && b.part.owner === ctx.id) ? b.part : kidsOf(ctx.id).find(p => p.kind === 'Part' && p.type === b.block.id);
      conn = mk('Connector', ctx.id, {src:pA.id, tgt:pB.id, sp:qa.id, tp:qb.id, name:''});
      ibdsOf(ctx).forEach(x => { try { syncIBD(x); } catch(e){} });
    }
  }
  if(conn) conn.conv = [ib.id];
  afterChange();
  return {ib, pA, pB, conn, flows:nf};
}
/* ---------- menüler ve özellikler ---------- */
{
  HOOKS.menu.tools.push(r => { const i = r.findIndex(x => x && x.h === 'Modelleme yardımcıları'); r.splice(i < 0 ? r.length : i + 1, 0, {t:'Hızlı arayüz bağla (Cameo sihirbazı)…', f:ifaceWizard}); });
}
HOOKS.props.push(function(){
    const t = typeof propTarget === 'function' ? propTarget() : {}, sh = t.sh, el = t.el, d = cur(); if(!sh || !el || !d || d.dtype !== 'ibd' || el.kind !== 'Part') return;
    const subs = el.type && E(el.type) ? kidsOf(el.type).filter(k => k.kind === 'Part').length : 0;
    const P = $('#props');
    P.insertAdjacentHTML('beforeend', `<div class="sub"><span>İç yapı (IBD)</span></div><div class="pf"><label>Alt part'lar</label><div>${subs ? `<label class="vchk"><input type="checkbox" data-deep="1"${sh.deep ? ' checked' : ''}> Alt part'ları kutu içinde göster</label> <select data-deepn="1">${[1, 2, 3].map(n => `<option value="${n}"${(sh.deep || 1) === n ? ' selected' : ''}>${n} seviye</option>`).join('')}</select>` : '<span class="muted">Tip bloğunda part yok</span>'}</div></div><div class="pf"><label></label><div><button class="pbtn" data-ifw="1">Hızlı arayüz bağla…</button></div></div>`);
  });
(() => {
  const P = $('#props');
  P.addEventListener('change', ev => {
    const t = ev.target; if(!t.dataset || !(t.dataset.deep || t.dataset.deepn)) return;
    const p = propTarget(), d = cur(); if(!p || !p.sh || !d) return;
    snap();
    if(t.dataset.deep && !t.checked){ deepCollapse(d, p.sh); }
    else { const n = +((P.querySelector('[data-deepn]') || {}).value || 1); if(p.sh.deep) deepCollapse(d, p.sh); deepExpand(d, p.sh, n); }
    afterChange();
  });
  P.addEventListener('click', ev => { if(ev.target.closest('[data-ifw]')) ifaceWizard(); });
})();

