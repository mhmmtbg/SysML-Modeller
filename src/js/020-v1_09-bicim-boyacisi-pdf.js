/* ================= v1.9: BİÇİM BOYACISI, PDF ================= */
function fmtPainter(off){
  if(ST.painter || off){ ST.painter = null; wrapEl.classList.remove('paint'); const b = $('#btnPainter'); if(b) b.classList.remove('on'); if(!off) toast('Biçim boyacısı kapandı'); return; }
  const d = cur(); if(!d) return toast('Önce bir diyagram açın');
  const id = [...ST.sel][0], sh = id && shapeOf(d, id), ed = id && d.edges.find(x => x.id === id);
  if(ST.sel.size !== 1 || (!sh && !ed)) return toast('Önce biçimi kopyalanacak tek bir şekil veya bağlantı seçin');
  if(sh) ST.painter = {kind:'shape', st:{fill:sh.fill, stroke:sh.stroke, hide:sh.hide}, size:null};
  else ST.painter = {kind:'edge', st:{stroke:ed.stroke, route:ed.route}};
  wrapEl.classList.add('paint'); const b = $('#btnPainter'); if(b) b.classList.add('on');
  toast('Biçim kopyalandı — uygulamak için ' + (sh ? 'şekillere' : 'bağlantılara') + ' tıklayın · Esc veya boş alana tık: çıkış');
}
/* ---- PDF: JPEG görüntülü, bağımlılıksız PDF yazıcı ---- */
function svgToJpeg(r, scale){
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => { const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(r.w * scale)); c.height = Math.max(1, Math.round(r.h * scale)); const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0, c.width, c.height); c.toBlob(async b => res({bytes:new Uint8Array(await b.arrayBuffer()), w:c.width, h:c.height}), 'image/jpeg', 0.92); };
    img.onerror = () => rej(new Error('görüntü oluşturulamadı'));
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(r.str);
  });
}
function buildPdf(pages){
  const enc = new TextEncoder(), parts = [], offs = [];
  let len = 0; const push = x => { const b = typeof x === 'string' ? enc.encode(x) : x; parts.push(b); len += b.length; };
  const objs = [];
  const add = f => { objs.push(f); return objs.length; };
  const catalog = add(null), pagesId = add(null);
  const kids = [];
  pages.forEach(pg => {
    const im = add({img:pg});
    const cs = `q ${pg.dw.toFixed(2)} 0 0 ${pg.dh.toFixed(2)} ${pg.dx.toFixed(2)} ${pg.dy.toFixed(2)} cm /Im0 Do Q`;
    const ct = add({str:`<< /Length ${cs.length} >>\nstream\n${cs}\nendstream`});
    kids.push(add({str:`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${pg.pw} ${pg.ph}] /Resources << /XObject << /Im0 ${im} 0 R >> >> /Contents ${ct} 0 R >>`}));
  });
  objs[catalog - 1] = {str:`<< /Type /Catalog /Pages ${pagesId} 0 R >>`};
  objs[pagesId - 1] = {str:`<< /Type /Pages /Kids [${kids.map(k => k + ' 0 R').join(' ')}] /Count ${kids.length} >>`};
  push('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');
  objs.forEach((o, i) => {
    offs.push(len); push(`${i + 1} 0 obj\n`);
    if(o.img){ push(`<< /Type /XObject /Subtype /Image /Width ${o.img.w} /Height ${o.img.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${o.img.bytes.length} >>\nstream\n`); push(o.img.bytes); push('\nendstream'); }
    else push(o.str);
    push('\nendobj\n');
  });
  const xref = len;
  push(`xref\n0 ${objs.length + 1}\n0000000000 65535 f \n` + offs.map(o => String(o).padStart(10, '0') + ' 00000 n \n').join(''));
  push(`trailer\n<< /Size ${objs.length + 1} /Root ${catalog} 0 R >>\nstartxref\n${xref}\n%%EOF`);
  return new Blob(parts, {type:'application/pdf'});
}
async function exportPDF(ids, opt){
  opt = opt || {};
  const ds = ids.map(E).filter(d => d && d.kind === 'Diagram' && d.shapes.length);
  if(!ds.length) return toast('Dışa aktarılacak dolu diyagram yok');
  toast('PDF hazırlanıyor… (' + ds.length + ' diyagram)');
  const pages = [];
  for(const d of ds){
    const r = diagramSVGStr(d); if(!r) continue;
    const land = opt.orient === 'auto' ? r.w >= r.h : opt.orient === 'land';
    const pw = opt.size === 'A3' ? (land ? 1190.55 : 841.89) : (land ? 841.89 : 595.28), ph = opt.size === 'A3' ? (land ? 841.89 : 1190.55) : (land ? 595.28 : 841.89);
    const m = 28, k = Math.min((pw - 2 * m) / r.w, (ph - 2 * m) / r.h, 1.6);
    const scale = Math.min(3, Math.max(1.2, 2600 / Math.max(r.w, r.h)));
    const im = await svgToJpeg(r, scale);
    pages.push(Object.assign(im, {pw, ph, dw:r.w * k, dh:r.h * k, dx:(pw - r.w * k) / 2, dy:(ph - r.h * k) / 2}));
  }
  const name = ds.length === 1 ? fileSafe(ds[0].name) : fileSafe(E(M.rootId).name) + ' - diyagramlar';
  download(buildPdf(pages), name + '.pdf');
}
function pdfMenu(){
  const b = document.querySelector('[data-act="exportMenu"]').getBoundingClientRect(), d = cur(), all = Object.values(M.els).filter(e => e.kind === 'Diagram' && e.shapes.length).sort(sortEls);
  setTimeout(() => menu(b.left, b.bottom + 4, [{h:'Görüntü'},
    {t:'PNG olarak kaydet', dis:!d, f:exportPNG}, {t:'SVG olarak kaydet', dis:!d, f:exportSVG}, {t:'Panoya resim olarak kopyala', dis:!d, f:copyImage},
    {h:'PDF olarak kaydet'},
    {t:'Açık diyagram — A4 (yön otomatik)', dis:!d, f:() => exportPDF([d.id], {size:'A4', orient:'auto'})},
    {t:'Açık diyagram — A3 (yön otomatik)', dis:!d, f:() => exportPDF([d.id], {size:'A3', orient:'auto'})},
    {t:'Açık sekmelerdeki diyagramlar — A4', f:() => exportPDF(ST.open.filter(id => !isView(id)), {size:'A4', orient:'auto'})},
    {t:'Tüm diyagramlar (' + all.length + ') — A4', f:() => exportPDF(all.map(x => x.id), {size:'A4', orient:'auto'})},
    '-', {t:'Yazdır (tarayıcı yazdırma penceresi)…', dis:!d || NATIVE, f:() => printDiagram(d)}]), 0);
}
function printDiagram(d){
  const r = diagramSVGStr(d); if(!r) return;
  const w = window.open('', '_blank'); if(!w) return toast('Açılır pencere engellendi — PDF olarak kaydedin');
  w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(d.name)}</title><style>@page{size:${r.w >= r.h ? 'landscape' : 'portrait'};margin:10mm}body{margin:0;display:flex;justify-content:center}svg{max-width:100%;height:auto}</style></head><body>${r.str}<script>onload=()=>setTimeout(()=>print(),200)<\/script></body></html>`);
  w.document.close();
}

