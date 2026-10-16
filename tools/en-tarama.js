/* İngilizce arayüz taraması: EN modunda tüm görünüm, menü ve pencereleri açar; çevrilmemiş Türkçe arayüz metinlerini listeler (model içeriği hariç). Çalıştırma: node tools/en-tarama.js */
const { chromium } = (() => { for (const m of ['playwright', '/opt/node22/lib/node_modules/playwright']) { try { return require(m); } catch (e) {} } })();
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1500, height: 900 } }); await p.goto('file://' + require('path').resolve(__dirname, '../app/sysml-modeler.html')); await p.waitForTimeout(600);
 const res = await p.evaluate(async () => {
   const sleep = ms => new Promise(r => setTimeout(r, ms));
   setLang('en'); await sleep(100);
   const names = new Set(Object.values(M.els).map(e => (e.name || '').trim()).filter(Boolean)); Object.values(M.els).forEach(e => { ['text', 'doc', 'reqId'].forEach(k => e[k] && names.add(String(e[k]).trim())); });
   const TRC = /[çğıöşüÇĞİÖŞÜ]|\b(ve|ile|için|bir|yok|seç|ekle|tablo|gereksinim|durum|test durumu)\b/;
   const found = new Map();
   const scan = (root, where) => { if(!root) return; const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT); let n; while((n = w.nextNode())){ const t = n.data.trim(); if(!t || !TRC.test(t)) continue; const el = n.parentElement; if(!el || el.closest('.noi18n, svg, textarea, script, style, option[data-raw]')) continue; if(el.closest('select') ) {} if(names.has(t)) continue; if([...names].some(nm => nm.length > 2 && t.includes(nm) && t.replace(nm, '').replace(/[^\wçğıöşüÇĞİÖŞÜ]/g, '').length < 3)) continue; if(!found.has(t)) found.set(t, where); } };
   scan(document.querySelector('#toolbar'), 'toolbar'); scan(document.querySelector('#left'), 'left'); scan(document.querySelector('#palette'), 'palette'); scan(document.querySelector('#status'), 'status');
   for(const k of ['toolsMenuItems', 'analysisMenuItems', 'reqMenuItems']){ menu(10, 10, window[k]()); await sleep(30); scan(document.querySelector('#ctx'), k); hideMenu(); }
   for(const v of Object.keys(VIEWS)){ try { openD(v); await sleep(60); scan(document.querySelector('#view'), v); } catch(e){ found.set('ERR ' + v + ': ' + e.message, v); } }
   const dlg = [['workflow', () => workflowHub()], ['keys', () => shortcutsDialog()], ['help', () => showHelp()], ['v2', () => sysmlV2Dialog()]];
   for(const [n, f] of dlg){ f(); await sleep(60); scan(document.querySelector('#modalBox'), n); document.querySelector('#modal').style.display = 'none'; }
   for(let i = 0; i < TOUR.length; i++){ tourStart(i); await sleep(30); scan(document.querySelector('#tourOv'), 'tour'); } tourEnd();
   const blk = Object.values(M.els).find(e => e.kind === 'Part'); const d = Object.values(M.els).find(e => e.kind === 'Diagram' && e.dtype === 'ibd'); openD(d.id); const sh = d.shapes.find(s => s.el === blk.id); ST.sel = new Set([sh.id]); renderDiagram(); renderProps(); await sleep(60); scan(document.querySelector('#props'), 'props-part');
   return [...found].map(([t, w]) => w + '\t' + t);
 });
 console.log(res.join('\n')); console.log('TOTAL', res.length); await b.close(); })();
