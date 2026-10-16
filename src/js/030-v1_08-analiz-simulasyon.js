/* ================= v1.8: ANALİZ VE SİMÜLASYON ================= */
/* ---- güvenli ifade ayrıştırıcı (eval kullanılmaz) ---- */
const EXF = {sqrt:Math.sqrt, abs:Math.abs, sin:Math.sin, cos:Math.cos, tan:Math.tan, asin:Math.asin, acos:Math.acos, atan:Math.atan, atan2:Math.atan2, exp:Math.exp, ln:Math.log, log:Math.log10, log10:Math.log10, min:Math.min, max:Math.max, pow:Math.pow, round:Math.round, floor:Math.floor, ceil:Math.ceil, sum:(...a) => a.reduce((x, y) => x + y, 0)};
const EXC = {pi:Math.PI, e:Math.E, g0:9.80665};
function exParse(src){
  const s = String(src); let i = 0; const toks = [];
  const isId0 = c => /[\p{L}_]/u.test(c), isId = c => /[\p{L}\p{N}_.]/u.test(c);
  while(i < s.length){
    const c = s[i];
    if(/\s/.test(c)){ i++; continue; }
    if(/[0-9]/.test(c) || (c === '.' && /[0-9]/.test(s[i + 1] || ''))){
      let j = i; while(j < s.length && /[0-9.]/.test(s[j])) j++;
      if(j < s.length && /[eE]/.test(s[j]) && /[-+0-9]/.test(s[j + 1] || '')){ j++; if(/[-+]/.test(s[j])) j++; while(j < s.length && /[0-9]/.test(s[j])) j++; }
      toks.push({t:'n', v:parseFloat(s.slice(i, j))}); i = j; continue;
    }
    if(isId0(c)){ let j = i; while(j < s.length && isId(s[j])) j++; toks.push({t:'id', v:s.slice(i, j)}); i = j; continue; }
    if('+-*/^(),'.includes(c)){ toks.push({t:c}); i++; continue; }
    if(c === '·' || c === '×'){ toks.push({t:'*'}); i++; continue; }
    if(c === '²'){ toks.push({t:'^'}, {t:'n', v:2}); i++; continue; }
    throw new Error('Geçersiz karakter: "' + c + '"');
  }
  let p = 0;
  const peek = () => toks[p], eat = t => { if(!toks[p] || toks[p].t !== t) throw new Error('"' + t + '" bekleniyordu'); return toks[p++]; };
  const expr = () => { let a = term(); while(peek() && (peek().t === '+' || peek().t === '-')){ const o = toks[p++].t; a = {o, a, b:term()}; } return a; };
  const term = () => { let a = unary(); while(peek() && (peek().t === '*' || peek().t === '/')){ const o = toks[p++].t; a = {o, a, b:unary()}; } return a; };
  const unary = () => { if(peek() && peek().t === '-'){ p++; return {o:'neg', a:unary()}; } if(peek() && peek().t === '+'){ p++; return unary(); } return power(); };
  const power = () => { const a = atom(); if(peek() && peek().t === '^'){ p++; return {o:'^', a, b:unary()}; } return a; };
  const atom = () => {
    const t = toks[p++]; if(!t) throw new Error('İfade eksik');
    if(t.t === 'n') return {n:t.v};
    if(t.t === '('){ const e = expr(); eat(')'); return e; }
    if(t.t === 'id'){
      if(peek() && peek().t === '('){
        p++; const args = [];
        if(!(peek() && peek().t === ')')){ args.push(expr()); while(peek() && peek().t === ','){ p++; args.push(expr()); } }
        eat(')');
        const f = t.v.toLowerCase(); if(!EXF[f]) throw new Error('Bilinmeyen fonksiyon: ' + t.v);
        return {f, args};
      }
      return {v:t.v};
    }
    throw new Error('Beklenmeyen simge: ' + t.t);
  };
  const r = expr(); if(p < toks.length) throw new Error('İfadenin sonunda fazlalık var');
  return r;
}
function exEval(n, env){
  if('n' in n) return n.n;
  if('v' in n){ if(env.has(n.v)) return env.get(n.v); if(n.v in EXC) return EXC[n.v]; throw {unk:n.v}; }
  if(n.f) return EXF[n.f](...n.args.map(a => exEval(a, env)));
  const a = exEval(n.a, env);
  if(n.o === 'neg') return -a;
  const b = exEval(n.b, env);
  switch(n.o){ case '+': return a + b; case '-': return a - b; case '*': return a * b; case '/': return a / b; case '^': return Math.pow(a, b); }
  return NaN;
}
function exVars(n, out){ out = out || new Set(); if('v' in n){ if(!(n.v in EXC)) out.add(n.v); } else if(n.f) n.args.forEach(a => exVars(a, out)); else if(n.a){ exVars(n.a, out); if(n.b) exVars(n.b, out); } return out; }
function parseEqs(expr){
  return String(expr || '').split(/[;\n]+/).map(x => x.trim()).filter(Boolean).filter(x => !isIneq(x)).map(x => {
    const k = x.split(/(?<![<>!=])=(?!=)/);
    if(k.length !== 2) throw new Error('Denklem "a = b" biçiminde olmalı: ' + x);
    return {src:x, l:exParse(k[0]), r:exParse(k[1])};
  });
}
function solveFor(eq, env, x){
  if('v' in eq.l && eq.l.v === x && !exVars(eq.r).has(x)) return exEval(eq.r, env);
  if('v' in eq.r && eq.r.v === x && !exVars(eq.l).has(x)) return exEval(eq.l, env);
  const f = v => { const e2 = new Map(env); e2.set(x, v); return exEval(eq.l, e2) - exEval(eq.r, e2); };
  for(const s0 of [1, 10, 0.1, 100, -1, 1000, 1e-3, -100]){
    let a = s0, b = s0 * 1.05 + 0.01, fa = f(a), fb = f(b);
    for(let k = 0; k < 120; k++){
      if(!isFinite(fa) || !isFinite(fb)) break;
      if(Math.abs(fb) <= 1e-11 * Math.max(1, Math.abs(b))) return b;
      const d = fb - fa; if(d === 0) break;
      const c = b - fb * (b - a) / d; a = b; fa = fb; b = c; fb = f(b);
    }
    if(isFinite(fb) && Math.abs(fb) <= 1e-8 * Math.max(1, Math.abs(b))) return b;
  }
  return NaN;
}
const numOf = v => { if(v == null || v === '') return null; const n = parseFloat(String(v).replace(',', '.')); return isFinite(n) ? n : null; };
const fmtNum = v => { if(v == null || !isFinite(v)) return '—'; const a = Math.abs(v); if(a !== 0 && (a >= 1e7 || a < 1e-4)) return v.toExponential(4); return String(+v.toPrecision(7)); };

/* ---- parametrik çözücü: binding'lerle bağlanan değerler ve kısıt denklemleri ---- */
function parContexts(){ return [...new Set(Object.values(M.els).filter(c => c.kind === 'ConstraintProp' && c.type && E(c.type) && E(c.owner)).map(c => c.owner))]; }
function parSolve(blockId){
  const cps = kidsOf(blockId).filter(c => c.kind === 'ConstraintProp' && c.type && E(c.type));
  const cpSet = new Set(cps.map(c => c.id));
  const par = new Map(), find = k => { while(par.get(k) !== k){ par.set(k, par.get(par.get(k))); k = par.get(k); } return k; };
  const node = k => { if(!par.has(k)) par.set(k, k); return k; };
  const uni = (a, b) => { const x = find(node(a)), y = find(node(b)); if(x !== y) par.set(x, y); };
  const keyOf = (id, ctx) => { const e = E(id); if(!e) return null; if(e.kind === 'Param') return ctx && cpSet.has(ctx) ? 'P:' + ctx + ':' + id : null; if(e.kind === 'Value' || e.kind === 'Port') return 'V:' + (ctx || '') + ':' + id; return null; };
  const binds = Object.values(M.els).filter(r => r.kind === 'Binding');
  binds.forEach(r => { const a = keyOf(r.src, r.sp), b = keyOf(r.tgt, r.tp); if(a && b && (a.startsWith('P:') || b.startsWith('P:'))) uni(a, b); });
  const out = {block:blockId, eqs:[], vals:[], errors:[]};
  cps.forEach(cp => {
    const cb = E(cp.type), params = kidsOf(cb.id).filter(p => p.kind === 'Param');
    let eqs; try { eqs = parseEqs(cb.expr); } catch(e){ out.errors.push(`${cp.name} (${cb.name}): ${e.message}`); return; }
    const vmap = new Map(params.map(p => [p.name, node('P:' + cp.id + ':' + p.id)]));
    parseIneqs(cb.expr).forEach(src => (out.ineqs = out.ineqs || []).push({cp, src, vmap}));
    eqs.forEach(eq => { const vs = [...exVars(eq.l), ...exVars(eq.r)]; const miss = vs.filter(v => !vmap.has(v)); if(miss.length){ out.errors.push(`${cp.name}: "${miss.join(', ')}" kısıt bloğunun parametresi değil`); return; } out.eqs.push({cp, src:eq.src, eq, vmap}); });
  });
  const known = new Map(), given = new Set(), groups = new Map();
  par.forEach((_, k) => { const g = find(k); if(!groups.has(g)) groups.set(g, []); groups.get(g).push(k); });
  groups.forEach((ks, g) => ks.forEach(k => { if(!k.startsWith('V:')) return; const v = E(k.split(':')[2]); const n = v ? numOf(v.def) : null; if(n != null){ if(known.has(g) && Math.abs(known.get(g) - n) > 1e-9 * Math.max(1, Math.abs(n))) out.errors.push(`Bağlı değerler çelişiyor: ${v.name} = ${n}, diğer = ${known.get(g)}`); known.set(g, n); given.add(g); } }));
  let prog = true, it = 0;
  while(prog && it++ < 60){
    prog = false;
    out.eqs.forEach(q => {
      const env = new Map(), unk = [];
      q.vmap.forEach((k, name) => { const g = find(k); if(known.has(g)) env.set(name, known.get(g)); else if(exVars(q.eq.l).has(name) || exVars(q.eq.r).has(name)) unk.push(name); });
      const U = [...new Set(unk)];
      if(U.length !== 1) return;
      let x; try { x = solveFor(q.eq, env, U[0]); } catch(e){ x = NaN; }
      if(isFinite(x)){ known.set(find(q.vmap.get(U[0])), x); q.solved = U[0]; prog = true; }
      else q.fail = U[0];
    });
    if(!prog && typeof parNewton === 'function' && parNewton(out.eqs, find, known)){ prog = true; out.newton = (out.newton || 0) + 1; }
  }
  out.eqs.forEach(q => {
    const env = new Map(); let all = true;
    q.vmap.forEach((k, name) => { const g = find(k); if(known.has(g)) env.set(name, known.get(g)); else if(exVars(q.eq.l).has(name) || exVars(q.eq.r).has(name)) all = false; });
    if(!all){ q.status = 'çözülemedi'; return; }
    try { const l = exEval(q.eq.l, env), r = exEval(q.eq.r, env); q.res = l - r; q.status = Math.abs(l - r) <= 1e-6 * Math.max(1, Math.abs(l), Math.abs(r)) ? (q.solved ? 'çözüldü (' + q.solved + ')' : 'sağlanıyor') : 'çelişki'; } catch(e){ q.status = 'hata'; }
  });
  groups.forEach((ks, g) => ks.forEach(k => {
    if(!k.startsWith('V:')) return;
    const v = E(k.split(':')[2]); if(!v) return;
    const ctx = k.split(':')[1];
    out.vals.push({v, ctx, given:given.has(g), val:known.has(g) ? known.get(g) : null});
  }));
  out.checks = (out.ineqs || []).map(c => { const env = new Map(); c.vmap.forEach((k, name) => { const g = find(k); if(known.has(g)) env.set(name, known.get(g)); }); const r = typeof xGuard === 'function' ? xGuard(c.src, env) : null; return {cp:c.cp, src:c.src, ok:r === true ? true : r === false ? false : null, env:[...env].map(([k, v]) => k + '=' + fmtNum(v)).join(', ')}; });
  return out;
}
function parSolveAll(write){
  const ctxs = parContexts();
  if(!ctxs.length){ toast('Modelde kısıt özelliği (parametrik diyagram) yok'); return []; }
  const res = ctxs.map(parSolve);
  if(write){
    snap();
    res.forEach(r => r.vals.forEach(x => { if(x.given) delete x.v.res; else if(x.val != null) x.v.res = +x.val.toPrecision(10); else delete x.v.res; }));
    afterChange();
  }
  return res;
}
function parDialog(){
  const res = parSolveAll(true); if(!res.length) return;
  const box = $('#modalBox'); box.style.width = 'min(860px, 96vw)'; box.style.maxWidth = 'none';
  const stc = s => /çelişki|hata/.test(s) ? '#c0392b' : /çözülemedi/.test(s) ? '#d18a00' : '#2e7d32';
  box.innerHTML = `<h2>Parametrik hesap</h2><div class="imwrap" style="max-height:62vh">` + res.map(r => {
    const B = E(r.block);
    return `<h3 style="margin:10px 0 6px">${esc(B ? B.name : '?')}</h3>` +
      (r.errors.length ? `<div class="gaps">${r.errors.map(esc).join('<br>')}</div>` : '') +
      `<table class="rt" style="width:100%;margin-top:6px"><thead><tr><th>Değer</th><th>Bağlam</th><th>Durum</th><th style="text-align:right">Sonuç</th></tr></thead><tbody>` +
      r.vals.map(x => `<tr><td><b>${esc(x.v.name)}</b> <span class="muted">${esc(x.v.vtype || '')}</span></td><td class="muted">${esc(x.ctx && E(x.ctx) ? E(x.ctx).name : pathOf(x.v.owner))}</td><td>${x.given ? 'girdi' : x.val != null ? '<span style="color:#2e7d32;font-weight:600">hesaplandı</span>' : '<span style="color:#d18a00">bilinmiyor</span>'}</td><td style="text-align:right;font-variant-numeric:tabular-nums">${fmtNum(x.val)} ${esc(unitOf(x.v))}</td></tr>`).join('') + '</tbody></table>' +
      `<table class="rt" style="width:100%;margin-top:8px"><thead><tr><th>Kısıt</th><th>Denklem</th><th>Durum</th></tr></thead><tbody>` +
      r.eqs.map(q => `<tr><td>${esc(q.cp.name)}</td><td><code>${esc(q.src)}</code></td><td style="color:${stc(q.status || '')};font-weight:600">${esc(q.status || '')}${q.newton ? ' <span class="muted">(denklem takımı)</span>' : ''}</td></tr>`).join('') + '</tbody></table>' +
      ((r.checks || []).length ? `<table class="rt" style="width:100%;margin-top:8px"><thead><tr><th>Kısıt</th><th>Eşitsizlik</th><th>Değerler</th><th>Durum</th></tr></thead><tbody>${r.checks.map(c => `<tr><td>${esc(c.cp.name)}</td><td><code>${esc(c.src)}</code></td><td class="muted">${esc(c.env)}</td><td style="font-weight:600;color:${c.ok === true ? '#2e7d32' : c.ok === false ? '#c0392b' : '#d18a00'}">${c.ok === true ? 'sağlanıyor' : c.ok === false ? 'İHLAL' : 'hesaplanamadı'}</td></tr>`).join('')}</tbody></table>` : '');
  }).join('') + `</div><p class="muted" style="margin:8px 0 0">Varsayılan değeri dolu olan value property'ler <b>girdi</b>, boş olanlar <b>çıktı</b> kabul edilir. Sonuçlar diyagramlarda <i>= değer ⚙</i> olarak gösterilir. Fonksiyonlar: sqrt, abs, sin, cos, tan, exp, ln, log, min, max, pow, round; sabitler: pi, e, g0.</p>
  <p style="text-align:right;margin:8px 0 0"><button class="pbtn" id="pdclr">Sonuçları temizle</button> <button class="pbtn pri" id="pdok">Kapat</button></p>`;
  $('#modal').style.display = 'flex';
  box.onclick = ev => {
    if(ev.target.id === 'pdok'){ $('#modal').style.display = 'none'; box.onclick = null; box.style.width = ''; box.style.maxWidth = ''; }
    if(ev.target.id === 'pdclr'){ snap(); Object.values(M.els).forEach(e => { delete e.res; }); afterChange(); $('#modal').style.display = 'none'; box.onclick = null; toast('Hesaplanan değerler temizlendi'); }
  };
}

/* ---- bütçe toplama (kütle, güç, maliyet…) ---- */
let BV = {root:null, prop:'', limit:'', margin:'', open:new Set()};
function multOf(m){
  m = String(m || '').trim(); if(!m) return {n:1, w:''};
  const r = m.split('..').map(x => x.trim()), hi = r[r.length - 1];
  if(hi === '*'){ const lo = parseInt(r[0], 10); return {n:r.length > 1 && lo > 0 ? lo : 1, w:'çokluk "' + m + '": alt sınır alındı'}; }
  const n = parseInt(hi, 10); return {n:isFinite(n) && n >= 0 ? n : 1, w:r.length > 1 ? 'çokluk "' + m + '": üst sınır alındı' : ''};
}
function budgetProps(){ const s = new Set(); Object.values(M.els).forEach(v => { if(v.kind === 'Value' && E(v.owner) && E(v.owner).kind === 'Block') s.add(v.name); }); return [...s].filter(Boolean).sort((a, b) => a.localeCompare(b, 'tr')); }
function ownVal(b, prop){ const v = kidsOf(b.id).find(c => c.kind === 'Value' && c.name === prop); if(!v) return {v:null, n:null}; const n = numOf(v.def); return {v, n:n != null ? n : null}; }
function rollup(blockId, prop, stack){
  stack = stack || [];
  const b = E(blockId); if(!b) return {total:null, rows:[]};
  if(stack.includes(blockId)) return {total:null, rows:[], cyc:true};
  const own = ownVal(b, prop);
  const parts = kidsOf(b.id).filter(p => p.kind === 'Part' && !p.shared && p.type && E(p.type) && E(p.type).kind === 'Block');
  const kids = parts.map(p => { const mm = multOf(p.mult), r = rollup(p.type, prop, stack.concat([blockId])); return {p, mult:mm.n, warn:mm.w, r, total:r.total == null ? null : r.total * mm.n}; });
  const contrib = kids.filter(k => k.total != null);
  const sum = contrib.reduce((t, k) => t + k.total, 0);
  const total = contrib.length ? sum : own.n;
  return {b, own, kids, total, fromKids:contrib.length > 0, diff:contrib.length > 0 && own.n != null && Math.abs(own.n - sum) > 1e-9 * Math.max(1, Math.abs(sum))};
}
function budgetUnit(prop){ const v = Object.values(M.els).find(e => e.kind === 'Value' && e.name === prop); return v ? unitOf(v) : ''; }
function budgetRows(R, depth, path, rows){
  rows.push({R, depth, path});
  (R.kids || []).forEach(k => { if(k.r && (k.total != null || (k.r.kids || []).length)){ const r2 = Object.assign({}, k.r, {part:k.p, mult:k.mult, warn:k.warn, line:k.total}); budgetRows(r2, depth + 1, path + '/' + k.p.id, rows); } });
  return rows;
}
function budgetHTML(){
  const blocks = Object.values(M.els).filter(e => e.kind === 'Block').sort(sortEls), props = budgetProps();
  if(!BV.root || !E(BV.root)){ const used = new Set(); for(const k in M.els){ const p = M.els[k]; if(p.kind === 'Part' && p.type) used.add(p.type); } const top = blocks.find(b => !used.has(b.id) && kidsOf(b.id).some(c => c.kind === 'Part')); BV.root = top ? top.id : (blocks[0] && blocks[0].id); }
  if(!BV.prop || !props.includes(BV.prop)) BV.prop = props.find(p => /kütle|kutle|mass|ağırlık/i.test(p)) || props[0] || '';
  if(!BV.root) return '<div class="vempty">Modelde blok yok.</div>';
  if(!BV.prop) return '<div class="vempty">Bloklarda value property yok.<br>Bütçe için bloklara ör. <b>kütle</b> veya <b>güç</b> adlı value property ekleyin ve yaprak bloklara değer girin.</div>';
  const R = rollup(BV.root, BV.prop), unit = budgetUnit(BV.prop), lim = numOf(BV.limit), mg = numOf(BV.margin) || 0;
  const tot = R.total, withM = tot == null ? null : tot * (1 + mg / 100);
  const st = lim == null || withM == null ? null : withM <= lim ? (withM <= lim * 0.9 ? 'ok' : 'warn') : 'bad';
  const col = {ok:'#2e7d32', warn:'#d18a00', bad:'#c0392b'};
  let h = '<div class="cards">' +
    `<div class="card"><div class="cv">${fmtNum(tot)} <small style="font-size:14px">${esc(unit)}</small></div><div class="ct">Toplam ${esc(BV.prop)}</div><div class="cs">${esc(E(BV.root).name)} — alt parçalardan toplandı</div></div>` +
    (mg ? `<div class="card"><div class="cv">${fmtNum(withM)} <small style="font-size:14px">${esc(unit)}</small></div><div class="ct">%${fmtNum(mg)} pay ile</div><div class="cs">Tasarım belirsizlik payı</div></div>` : '') +
    (lim != null ? `<div class="card"><div class="cv" style="color:${col[st] || '#26364b'}">${fmtNum(lim - (withM || 0))} <small style="font-size:14px">${esc(unit)}</small></div><div class="ct">Kalan marj (sınır ${fmtNum(lim)} ${esc(unit)})</div><div class="cbar"><i style="width:${Math.min(100, Math.max(0, (withM || 0) / lim * 100))}%;background:${col[st] || '#26364b'}"></i></div><div class="cs">%${((withM || 0) / lim * 100).toFixed(1)} kullanıldı — ${st === 'ok' ? 'uygun' : st === 'warn' ? 'sınıra yakın (%90+)' : 'SINIR AŞILDI'}</div></div>` : '') + '</div>';
  const rows = budgetRows(R, 0, '', []);
  h += `<table class="rt" style="min-width:760px"><thead><tr><th>Yapı (part : blok)</th><th style="text-align:right">Çokluk</th><th style="text-align:right">Kendi değeri</th><th style="text-align:right">Birim toplam</th><th style="text-align:right">Satır toplamı</th><th style="min-width:160px">Pay</th><th>Not</th></tr></thead><tbody>`;
  rows.forEach(({R: r, depth}) => {
    const line = depth ? r.line : r.total, pct = tot ? (line || 0) / tot * 100 : 0;
    const notes = []; if(r.warn) notes.push(r.warn); if(r.diff) notes.push(`kendi değeri (${fmtNum(r.own.n)}) alt toplamdan farklı — tahmin mi?`); if(r.cyc) notes.push('döngüsel yapı'); if(!r.fromKids && r.own.n == null && !(r.kids || []).length) notes.push('değer girilmemiş');
    h += `<tr><td style="padding-left:${8 + depth * 18}px">${depth ? '└ ' : ''}${r.part ? `<b>${esc(r.part.name)}</b> : ` : ''}<a class="lnk" data-ago="${r.b.id}">${esc(r.b.name)}</a></td>` +
      `<td style="text-align:right">${depth ? r.mult : ''}</td><td style="text-align:right">${r.own.v ? fmtNum(r.own.n) : '<span class="muted">—</span>'}</td>` +
      `<td style="text-align:right">${fmtNum(r.total)}</td><td style="text-align:right;font-weight:600">${fmtNum(line)}</td>` +
      `<td><div class="cbar" style="margin:4px 0"><i style="width:${Math.min(100, pct)}%;background:#2e86c1"></i></div><span class="muted" style="font-size:11px">%${pct.toFixed(1)}</span></td><td class="gapt">${esc(notes.join('; '))}</td></tr>`;
  });
  h += '</tbody></table><div class="vfoot">Toplama kuralı: bir blokta bu adla değer taşıyan alt part\'lar varsa birim toplam = Σ (alt toplam × çokluk); yoksa bloğun kendi değeri. Shared (referans) part\'lar sayılmaz. "Sonuçları modele yaz" her bloğun değerine hesaplanan toplamı ⚙ olarak işler.</div>';
  return h;
}
function budgetBar(){
  const blocks = Object.values(M.els).filter(e => e.kind === 'Block').sort(sortEls), props = budgetProps();
  return `<label>Kök blok <select data-anf="bv.root">${blocks.map(b => `<option value="${b.id}"${b.id === BV.root ? ' selected' : ''}>${esc(b.name)}</option>`).join('')}</select></label>
    <label>Özellik <select data-anf="bv.prop">${props.map(p => `<option${p === BV.prop ? ' selected' : ''}>${esc(p)}</option>`).join('')}</select></label>
    <label>Sınır <input data-anf="bv.limit" value="${esc(BV.limit)}" style="width:80px" placeholder="ör. 45"></label>
    <label>Pay % <input data-anf="bv.margin" value="${esc(BV.margin)}" style="width:60px" placeholder="ör. 10"></label>
    <span class="vsep"></span><button class="vb pri" data-an="bvwrite">⚙ Sonuçları modele yaz</button><button class="vb" data-an="bvxl">⤒ Excel'e aktar</button>`;
}
function budgetWrite(){
  const R = rollup(BV.root, BV.prop); snap(); let n = 0;
  const walk = r => { if(r.own && r.own.v && r.fromKids){ r.own.v.res = +r.total.toPrecision(10); n++; } (r.kids || []).forEach(k => walk(k.r)); };
  walk(R); afterChange(); toast(n + ' bloğun "' + BV.prop + '" değerine toplam yazıldı (⚙)');
}
function budgetXlsx(){
  const R = rollup(BV.root, BV.prop), unit = budgetUnit(BV.prop);
  const rows = [[{v:'Yapı', s:1}, {v:'Blok', s:1}, {v:'Çokluk', s:1}, {v:'Kendi değeri', s:1}, {v:'Birim toplam', s:1}, {v:'Satır toplamı (' + unit + ')', s:1}, {v:'Pay %', s:1}]];
  budgetRows(R, 0, '', []).forEach(({R: r, depth}) => { const line = depth ? r.line : r.total; rows.push(['  '.repeat(depth) + (r.part ? r.part.name : r.b.name), r.b.name, depth ? r.mult : '', r.own.n == null ? '' : r.own.n, r.total == null ? '' : r.total, line == null ? '' : line, R.total ? +((line || 0) / R.total * 100).toFixed(2) : '']); });
  download(buildXlsx([{name:'Bütçe', rows, widths:[40, 26, 10, 14, 14, 18, 10], header:true, freeze:[0, 1]}]), fileSafe(E(BV.root).name + ' - ' + BV.prop + ' bütçesi') + '.xlsx');
}

/* ---- tahsis (allocation) matrisi ---- */
let AV = {cols:'block', implicit:true};
function allocFuncs(){ return Object.values(M.els).filter(e => ['Activity','Action','SendSignal','AcceptEvent'].includes(e.kind)).sort((a, b) => pathOf(a.id).localeCompare(pathOf(b.id), 'tr')); }
function implicitAlloc(){
  const imp = new Set();
  Object.values(M.els).forEach(d => {
    if(d.kind !== 'Diagram' || d.dtype !== 'act') return;
    const lanes = d.shapes.filter(s => { const e = E(s.el); return e && e.kind === 'Partition' && e.represents && E(e.represents); });
    d.shapes.forEach(s => { const e = E(s.el); if(!e || !['Action','SendSignal','AcceptEvent'].includes(e.kind)) return; const cx = s.x + s.w / 2, cy = s.y + s.h / 2; lanes.forEach(L => { if(cx >= L.x && cx <= L.x + L.w && cy >= L.y && cy <= L.y + L.h){ const t = E(E(L.el).represents); imp.add(e.id + '|' + t.id); if(t.kind === 'Part' && t.type) imp.add(e.id + '|' + t.type); } }); });
  });
  return imp;
}
function allocHTML(){
  const rows = allocFuncs(), cols = Object.values(M.els).filter(e => AV.cols === 'part' ? e.kind === 'Part' : e.kind === 'Block').sort(sortEls);
  if(!rows.length || !cols.length) return `<div class="vempty">${!rows.length ? 'Modelde fonksiyon (aktivite / aksiyon) yok.' : 'Modelde ' + (AV.cols === 'part' ? 'part' : 'blok') + ' yok.'}</div>`;
  const ex = new Set(Object.values(M.els).filter(e => e.kind === 'Allocate').map(e => e.src + '|' + e.tgt)), imp = AV.implicit ? implicitAlloc() : new Set();
  const lab = e => e.kind === 'Part' ? e.name + (e.type && E(e.type) ? ' : ' + E(e.type).name : '') : e.name;
  const cc = cols.map(c => rows.filter(r => ex.has(r.id + '|' + c.id) || imp.has(r.id + '|' + c.id)).length);
  let h = `<table class="mx"><thead><tr><th class="mxc">Fonksiyon ↓ / ${AV.cols === 'part' ? 'Part' : 'Blok'} →</th>` + cols.map((c, j) => `<th class="mxh${cc[j] ? '' : ' zero'}" title="${esc(pathOf(c.id))}"><div><span>${esc(lab(c).slice(0, 40))}</span></div></th>`).join('') + '<th class="mxh tot"><div><span>Toplam</span></div></th></tr></thead><tbody>';
  rows.forEach(r => {
    const n = cols.filter(c => ex.has(r.id + '|' + c.id) || imp.has(r.id + '|' + c.id)).length;
    const ind = r.kind === 'Activity' ? '' : '&nbsp;&nbsp;&nbsp;';
    h += `<tr><th class="mxr${n ? '' : ' zero'}" title="${esc(pathOf(r.id))}">${ind}${icon(r)} <a class="lnk" data-ago="${r.id}">${esc(nm(r).slice(0, 56))}</a></th>`;
    cols.forEach(c => { const k = r.id + '|' + c.id, e1 = ex.has(k), i1 = imp.has(k); h += `<td class="mxd${e1 ? ' on' : ''}" data-alx="${k}" title="${e1 ? '«allocate» (kaldırmak için tıklayın)' : i1 ? 'Kulvardan dolaylı tahsis (açık ilişki için tıklayın)' : 'Tahsis et'}">${e1 ? '↗' : i1 ? '<span style="color:#8a94a3">○</span>' : ''}</td>`; });
    h += `<td class="mxt${n ? '' : ' zero'}">${n}</td></tr>`;
  });
  h += '</tbody></table>';
  const un = rows.filter(r => r.kind !== 'Activity' && !cols.some(c => ex.has(r.id + '|' + c.id) || imp.has(r.id + '|' + c.id))).length;
  return h + `<div class="vfoot">↗ açık «allocate» ilişkisi · ○ kulvar (partition) üzerinden dolaylı tahsis · Tahsis edilmemiş aksiyon: <b class="${un ? 'bad' : ''}">${un}</b></div>`;
}
function allocBar(){
  return `<label>Sütunlar <select data-anf="av.cols"><option value="block"${AV.cols === 'block' ? ' selected' : ''}>Bloklar</option><option value="part"${AV.cols === 'part' ? ' selected' : ''}>Part'lar</option></select></label>
    <label class="vchk"><input type="checkbox" data-anf="av.implicit"${AV.implicit ? ' checked' : ''}> Kulvardan dolaylı tahsisi göster</label><span class="vsep"></span><button class="vb" data-an="avxl">⤒ Excel'e aktar</button>`;
}
function allocXlsx(){
  const rows0 = allocFuncs(), cols = Object.values(M.els).filter(e => AV.cols === 'part' ? e.kind === 'Part' : e.kind === 'Block').sort(sortEls);
  const ex = new Set(Object.values(M.els).filter(e => e.kind === 'Allocate').map(e => e.src + '|' + e.tgt)), imp = AV.implicit ? implicitAlloc() : new Set();
  const rows = [[{v:'Fonksiyon', s:1}, {v:'Tür', s:1}].concat(cols.map(c => ({v:c.name, s:1})))];
  rows0.forEach(r => rows.push([nm(r), KIND[r.kind].tr].concat(cols.map(c => ex.has(r.id + '|' + c.id) ? 'X' : imp.has(r.id + '|' + c.id) ? '(o)' : ''))));
  download(buildXlsx([{name:'Tahsis Matrisi', rows, widths:[40, 14].concat(cols.map(() => 6)), header:true, freeze:[2, 1]}]), fileSafe(E(M.rootId).name) + ' - Tahsis Matrisi.xlsx');
}

/* ---- genel tablo ---- */
let GT = {kind:'Block', scope:'', q:''};
const GT_KINDS = ['Block','InterfaceBlock','Part','Port','FlowProp','Value','ValueType','Signal','Actor','UseCase','Activity','Action','State','Requirement','TestCase','ConstraintBlock','Package'];
function gtCols(kind){
  const c = [['name', 'Ad', 1], ['owner', 'Sahibi', 0]];
  if(['Part','Port','FlowProp','Object','Pin'].includes(kind)) c.push(['type', 'Tip', 0]);
  if(kind === 'Part' || kind === 'Port' || kind === 'FlowProp') c.push(['mult', 'Çokluk', 1]);
  if(kind === 'Port' || kind === 'FlowProp') c.push(['dir', 'Yön', 1]);
  if(kind === 'Value') c.push(['vtype', 'Tip', 1], ['def', 'Varsayılan', 1], ['unit', 'Birim', 1], ['res', 'Hesaplanan', 0]);
  if(kind === 'ValueType') c.push(['unit', 'Birim', 1], ['qk', 'Büyüklük', 1]);
  if(kind === 'Requirement') c.push(['reqId', 'ID', 1], ['text', 'Metin', 1], ['verif', 'Doğrulama', 1]);
  if(kind === 'TestCase') c.push(['procNo', 'Prosedür', 1], ['result', 'Sonuç', 0]);
  if(kind === 'ConstraintBlock') c.push(['expr', 'İfade', 1]);
  c.push(['st', 'Stereotipler', 0]);
  const tags = new Map(); Object.values(M.els).filter(e => e.kind === kind).forEach(e => (e.st || []).map(E).filter(Boolean).forEach(st => stTags(st).forEach(t => tags.set(st.id + '.' + t.key, st.name + '.' + t.key))));
  tags.forEach((lb, k) => c.push(['tv:' + k, lb, 1]));
  c.push(['doc', 'Açıklama', 1]);
  return c;
}
function gtVal(e, k){
  if(k === 'owner') return pathOf(e.owner);
  if(k === 'type') return e.type && E(e.type) ? E(e.type).name : (e.vtype || '');
  if(k === 'st') return stNames(e).join(', ');
  if(k === 'res') return e.res != null ? fmtNum(e.res) : '';
  if(k.startsWith('tv:')){ const key = k.slice(3), i = key.indexOf('.'); const st = E(key.slice(0, i)); return st ? tagVal(e, st, key.slice(i + 1)) : ''; }
  return e[k] == null ? '' : String(e[k]);
}
function gtRows(){
  const q = asciiTr(GT.q || '');
  return Object.values(M.els).filter(e => e.kind === GT.kind && (!GT.scope || e.id === GT.scope || isAnc(GT.scope, e.id)) && (!q || asciiTr(gtCols(GT.kind).map(c => gtVal(e, c[0])).join(' ')).includes(q))).sort((a, b) => pathOf(a.id).localeCompare(pathOf(b.id), 'tr'));
}
function gtHTML(){
  const cols = gtCols(GT.kind), rows = gtRows();
  if(!rows.length) return `<div class="vempty">Bu kapsamda "${esc(KIND[GT.kind].tr)}" türünde eleman yok.</div>`;
  let h = `<table class="rt"><thead><tr><th class="rn">#</th>${cols.map(c => `<th>${esc(c[1])}</th>`).join('')}</tr></thead><tbody>`;
  rows.forEach((e, i) => { h += `<tr data-gtr="${e.id}"><td class="rn">${i + 1}</td>` + cols.map(([k, , ed]) => `<td>${ed ? `<div class="ce${k === 'text' || k === 'doc' ? ' long' : ''}" contenteditable="true" data-gte="${e.id}" data-gtk="${k}">${esc(gtVal(e, k))}</div>` : k === 'owner' ? `<a class="lnk" data-ago="${e.owner}">${esc(gtVal(e, k))}</a>` : esc(gtVal(e, k))}</td>`).join('') + '</tr>'; });
  return h + `</tbody></table><div class="vfoot">${rows.length} eleman · Hücreye tıklayıp düzenleyin, Enter ile kaydedin. Stereotip etiketleri sütun olarak eklenir.</div>`;
}
function gtBar(){
  const pk = Object.values(M.els).filter(e => e.kind === 'Package' || e.kind === 'Model' || e.kind === 'Block').sort((a, b) => pathOf(a.id).localeCompare(pathOf(b.id), 'tr'));
  return `<label>Eleman türü <select data-anf="gt.kind">${GT_KINDS.map(k => `<option value="${k}"${GT.kind === k ? ' selected' : ''}>${esc(KIND[k].tr)}</option>`).join('')}</select></label>
    <label>Kapsam <select data-anf="gt.scope"><option value="">Tüm model</option>${pk.map(p => `<option value="${p.id}"${GT.scope === p.id ? ' selected' : ''}>${esc(pathOf(p.id))}</option>`).join('')}</select></label>
    <label>Ara <input data-anf="gt.q" value="${esc(GT.q)}" style="width:160px"></label><span class="vsep"></span><button class="vb" data-an="gtxl">⤒ Excel'e aktar</button>`;
}
function gtSet(e, k, v){
  if(k.startsWith('tv:')){ e.tv = e.tv || {}; e.tv[k.slice(3)] = v; return; }
  if(k === 'name' || k === 'reqId') v = v.trim();
  e[k] = v;
}
function gtXlsx(){
  const cols = gtCols(GT.kind), rows = [cols.map(c => ({v:c[1], s:1}))];
  gtRows().forEach(e => rows.push(cols.map(([k]) => { const v = gtVal(e, k), n = k === 'def' || k === 'res' ? numOf(v) : null; return n != null ? n : v; })));
  download(buildXlsx([{name:KIND[GT.kind].tr.slice(0, 28), rows, widths:cols.map(c => c[0] === 'text' || c[0] === 'doc' ? 50 : c[0] === 'owner' ? 36 : 18), header:true, freeze:[1, 1], filter:1}]), fileSafe(E(M.rootId).name + ' - ' + KIND[GT.kind].tr + ' tablosu') + '.xlsx');
}

/* ---- ilişki haritası ---- */
let RM = {root:null, depth:2, own:false, types:true};
function relNeighbors(id){
  const out = [];
  Object.values(M.els).forEach(r => {
    if(!KIND[r.kind] || !KIND[r.kind].rel || r.kind === 'Anchor') return;
    if(r.src === id && E(r.tgt)) out.push({o:r.tgt, lab:KIND[r.kind].tr.split(' (')[0], dir:1});
    else if(r.tgt === id && E(r.src)) out.push({o:r.src, lab:KIND[r.kind].tr.split(' (')[0], dir:-1});
  });
  const e = E(id);
  if(RM.types && e){
    if(e.type && E(e.type)) out.push({o:e.type, lab:'tip', dir:1});
    if(e.behavior && E(e.behavior)) out.push({o:e.behavior, lab:'çağırır', dir:1});
    if(e.signal && E(e.signal)) out.push({o:e.signal, lab:'sinyal', dir:1});
    Object.values(M.els).forEach(x => { if(x.kind !== 'Diagram' && (x.type === id || x.behavior === id || x.signal === id) && x.id !== id) out.push({o:x.id, lab:x.type === id ? 'tip' : x.behavior === id ? 'çağırır' : 'sinyal', dir:-1}); });
  }
  if(RM.own && e){
    if(e.owner && E(e.owner) && E(e.owner).kind !== 'Model') out.push({o:e.owner, lab:'sahibi', dir:-1, own:1});
    kidsOf(id).filter(k => !KIND[k.kind].rel && k.kind !== 'Diagram' && k.kind !== 'Comment').forEach(k => out.push({o:k.id, lab:'içerir', dir:1, own:1}));
  }
  return out;
}
function relmapHTML(){
  if(!RM.root || !E(RM.root)) RM.root = ST.tsel && E(ST.tsel) && E(ST.tsel).kind !== 'Diagram' ? ST.tsel : (allReqs()[0] || Object.values(M.els).find(e => e.kind === 'Block') || {}).id;
  if(!RM.root) return '<div class="vempty">Bir eleman seçin.</div>';
  const lv = new Map([[RM.root, 0]]), edges = [], q = [RM.root];
  while(q.length){ const id = q.shift(), d = lv.get(id); if(d >= RM.depth) continue; relNeighbors(id).forEach(n => { if(!lv.has(n.o)){ if(lv.size > 160) return; lv.set(n.o, d + 1); q.push(n.o); } const a = n.dir > 0 ? id : n.o, b = n.dir > 0 ? n.o : id; if(!edges.some(x => x.a === a && x.b === b && x.lab === n.lab)) edges.push({a, b, lab:n.lab, own:n.own}); }); }
  const cols = []; lv.forEach((d, id) => { (cols[d] = cols[d] || []).push(id); });
  const W = 210, H = 46, GX = 120, GY = 22, pos = new Map();
  cols.forEach((c, i) => { c.sort((a, b) => (E(a).kind + nm(E(a))).localeCompare(E(b).kind + nm(E(b)), 'tr')); c.forEach((id, j) => pos.set(id, {x:20 + i * (W + GX), y:20 + j * (H + GY)})); });
  const maxH = Math.max(...cols.map(c => c.length)) * (H + GY) + 40, maxW = cols.length * (W + GX) + 40;
  cols.forEach(c => { const off = (maxH - 40 - c.length * (H + GY)) / 2; c.forEach(id => { pos.get(id).y += Math.max(0, off); }); });
  let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${maxW}" height="${maxH}" style="background:#fff;border:1px solid #dde3ea;border-radius:8px"><defs><marker id="rmA" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#7a8796"/></marker></defs>`;
  edges.forEach(e0 => {
    const A = pos.get(e0.a), B = pos.get(e0.b); if(!A || !B) return;
    const lr = A.x <= B.x, x1 = lr ? A.x + W : A.x, x2 = lr ? B.x : B.x + W, y1 = A.y + H / 2, y2 = B.y + H / 2;
    const same = A.x === B.x, cx = same ? A.x + W + 60 : (x1 + x2) / 2;
    const d = same ? `M${A.x + W},${y1} C${cx},${y1} ${cx},${y2} ${B.x + W},${y2}` : `M${x1},${y1} C${cx},${y1} ${cx},${y2} ${x2},${y2}`;
    s += `<path d="${d}" fill="none" stroke="${e0.own ? '#c3cad3' : '#7a8796'}" stroke-width="1.2"${e0.own ? ' stroke-dasharray="4 3"' : ''} marker-end="url(#rmA)"/>`;
    s += `<text x="${same ? cx - 4 : cx}" y="${(y1 + y2) / 2 - 4}" font-size="10.5" text-anchor="middle" fill="#556" stroke="#fff" stroke-width="3" paint-order="stroke" font-family="${FF}">${esc(e0.lab)}</text>`;
  });
  lv.forEach((d, id) => {
    const e = E(id), p = pos.get(id), k = KIND[e.kind];
    const t = e.kind === 'Requirement' ? (e.reqId || '') + ' ' + (e.name || '') : nm(e);
    s += `<g data-rmn="${id}" style="cursor:pointer"><rect x="${p.x}" y="${p.y}" width="${W}" height="${H}" rx="6" fill="${id === RM.root ? '#fff3cd' : '#f7f9fc'}" stroke="${id === RM.root ? '#d18a00' : k.col || '#889'}" stroke-width="${id === RM.root ? 2 : 1.2}"/>` +
      `<rect x="${p.x}" y="${p.y}" width="5" height="${H}" rx="2" fill="${k.col || '#889'}"/>` +
      `<text x="${p.x + 12}" y="${p.y + 17}" font-size="10" fill="#778" font-family="${FF}">${esc(k.tr)}</text>` +
      `<text x="${p.x + 12}" y="${p.y + 34}" font-size="12.5" font-weight="600" fill="#1e2733" font-family="${FF}">${esc(t.length > 30 ? t.slice(0, 29) + '…' : t)}</text><title>${esc(pathOf(id))}\nÇift tık: merkeze al</title></g>`;
  });
  setTimeout(() => { const g = document.querySelector('#view [data-rmn="' + RM.root + '"]'); if(g) g.scrollIntoView({block:'center', inline:'nearest'}); }, 0);
  return s + `</svg><div class="vfoot">${lv.size} eleman · ${edges.length} bağlantı · Tıklayın: ağaçta göster · Çift tıklayın: haritanın merkezine alın. Kesikli çizgiler sahiplik ilişkisidir.</div>`;
}
function relmapBar(){
  const r = E(RM.root);
  return `<label>Merkez <b>${esc(r ? nm(r) : '—')}</b></label><button class="vb" data-an="rmsel" title="Ağaçta seçili elemanı merkeze al">↺ Ağaçtaki seçimi kullan</button>
    <label>Derinlik <select data-anf="rm.depth">${[1, 2, 3, 4].map(n => `<option${RM.depth === n ? ' selected' : ''}>${n}</option>`).join('')}</select></label>
    <label class="vchk"><input type="checkbox" data-anf="rm.own"${RM.own ? ' checked' : ''}> Sahiplik</label><label class="vchk"><input type="checkbox" data-anf="rm.types"${RM.types ? ' checked' : ''}> Tip / çağrı</label>`;
}

Object.assign(VIEWS, {
  '@budget':{tr:'Bütçe Analizi', ic:'Σ', note:'Kütle, güç, maliyet gibi bir value property\'yi yapı ağacı (composition) boyunca toplar.<br><br>Yaprak bloklara değer girin; çokluklar hesaba katılır. Sınır ve tasarım payı girerek kalan marjı görün.', render:budgetHTML, bar:budgetBar, status:() => 'Bütçe: ' + (BV.prop || '—')},
  '@alloc':{tr:'Tahsis Matrisi', ic:'ALC', note:'Fonksiyonların (aktivite ve aksiyonlar) yapıya (blok veya part) tahsisi.<br><br>Hücreye tıklayarak «allocate» ilişkisi kurun veya kaldırın. Kulvarlar üzerinden yapılan dolaylı tahsisler ○ ile gösterilir.', render:allocHTML, bar:allocBar, status:() => allocFuncs().length + ' fonksiyon'},
  '@table':{tr:'Genel Tablo', ic:'TBL', note:'Seçilen türdeki tüm elemanları tablo olarak listeler; ad, tip, birim, açıklama ve stereotip etiketleri doğrudan düzenlenebilir.<br><br>Excel\'e aktarılabilir.', render:gtHTML, bar:gtBar, status:() => gtRows().length + ' ' + KIND[GT.kind].tr},
  '@relmap':{tr:'İlişki Haritası', ic:'MAP', note:'Seçili elemanın ilişkilerini (gereksinim, tahsis, tip, çağrı, sahiplik) katmanlı bir harita olarak gösterir.<br><br>Bir düğüme çift tıklayınca o eleman merkeze alınır.', render:relmapHTML, bar:relmapBar, status:() => 'İlişki haritası'}
});
(function(){
  const V = $('#view');
  V.addEventListener('change', ev => {
    const t = ev.target, f = t.dataset.anf; if(!f) return;
    const [o, k] = f.split('.'), S0 = {bv:BV, av:AV, gt:GT, rm:RM}[o];
    S0[k] = t.type === 'checkbox' ? t.checked : (k === 'depth' ? +t.value : t.value);
    if(o === 'gt' && k === 'kind') GT.q = '';
    renderViewBar(); renderView();
  });
  V.addEventListener('input', ev => { const t = ev.target; if(t.dataset.anf === 'gt.q'){ GT.q = t.value; clearTimeout(t._tm); t._tm = setTimeout(() => { renderView(); }, 250); } });
  V.addEventListener('click', ev => {
    const t = ev.target;
    const a = t.closest('[data-an]');
    if(a){ ({bvwrite:budgetWrite, bvxl:budgetXlsx, avxl:allocXlsx, gtxl:gtXlsx, rmsel:() => { if(ST.tsel && E(ST.tsel)){ RM.root = ST.tsel; renderViewBar(); renderView(); } else toast('Önce ağaçta bir eleman seçin'); }})[a.dataset.an](); return; }
    const g = t.closest('[data-ago]'); if(g){ revealInTree(g.dataset.ago); ST.tsel = g.dataset.ago; renderProps(); return; }
    const ax = t.closest('[data-alx]');
    if(ax){ const [f0, s0] = ax.dataset.alx.split('|'); snap(); if(findRel('Allocate', f0, s0)) delRel('Allocate', f0, s0); else { const a0 = E(f0); const r = mk('Allocate', nearestPkg(a0.id), {src:f0, tgt:s0, name:''}); Object.values(M.els).forEach(d => { if(d.kind === 'Diagram' && DT[d.dtype].rels.includes('Allocate')) d.shapes.filter(s => s.el === f0 || s.el === s0).forEach(s => autoEdges(d, s)); }); void r; } afterChange(); return; }
    const rn = t.closest('[data-rmn]');
    if(rn){ if(ev.detail === 2){ RM.root = rn.dataset.rmn; renderViewBar(); renderView(); } else { revealInTree(rn.dataset.rmn); ST.tsel = rn.dataset.rmn; renderProps(); } return; }
    const gr = t.closest('tr[data-gtr]'); if(gr && !t.closest('[contenteditable]')){ ST.tsel = gr.dataset.gtr; renderProps(); }
  });
  V.addEventListener('keydown', ev => { const t = ev.target; if(t.dataset && t.dataset.gte && ev.key === 'Enter' && !ev.shiftKey){ ev.preventDefault(); t.blur(); } });
  V.addEventListener('focusout', ev => {
    const t = ev.target; if(!t.dataset || !t.dataset.gte) return;
    const e = E(t.dataset.gte), k = t.dataset.gtk, v = t.innerText.replace(/\n$/, '');
    if(!e || gtVal(e, k) === v) return;
    snap(); gtSet(e, k, v); afterChange();
  });
})();

/* ---- simülasyon: aktivite token oyunu ve durum makinesi ---- */
let SIM = null;
const SIM_ACT = ['Action','SendSignal','AcceptEvent','AcceptTime','Object','ActParam'];
function simStart(){
  const d = cur(); if(!d || (d.dtype !== 'act' && d.dtype !== 'stm')) return toast('Simülasyon için bir aktivite veya durum makinesi diyagramı açın');
  SIM = {d:d.id, kind:d.dtype, log:[], step:0, tok:new Map(), act:new Set(), hist:new Map(), fired:new Set(), timer:null, ask:null, done:false};
  if(d.dtype === 'act'){
    const nodes = simActNodes(d);
    nodes.filter(n => n.kind === 'Initial' || (n.kind === 'ActParam' && n.dir !== 'out') || (n.kind === 'AcceptEvent' && !simIn(n.id).length)).forEach(n => simOfferOut(n.id, 'başlangıç'));
    simLog('Aktivite başladı: ' + (E(d.owner) ? E(d.owner).name : ''));
  } else {
    const sm = E(d.owner), init = kidsOf(sm.id).find(c => c.kind === 'Initial');
    simLog('Durum makinesi başladı: ' + sm.name);
    if(!init){ simLog('⚠ Başlangıç düğümü yok'); }
    else simFollow(init.id);
  }
  renderSimBar(); renderDiagram();
}
function simStop(){ if(SIM && SIM.timer) clearInterval(SIM.timer); SIM = null; renderSimBar(); renderDiagram(); }
function simLog(t){ SIM.log.push((SIM.step ? SIM.step + '. ' : '') + t); if(SIM.log.length > 300) SIM.log.shift(); }
const simFlows = () => Object.values(M.els).filter(r => r.kind === 'ControlFlow' || r.kind === 'ObjectFlow');
function simNodeOf(id){ const e = E(id); return e && e.kind === 'Pin' ? e.owner : id; }
function simIn(id){ return simFlows().filter(f => simNodeOf(f.tgt) === id); }
function simOut(id){ return simFlows().filter(f => simNodeOf(f.src) === id); }
function simActNodes(d){ const act = E(d.owner); return act ? kidsOf(act.id).filter(n => !['Partition','IRegion','Comment','Pin'].includes(n.kind) && !KIND[n.kind].rel) : []; }
function simOfferOut(id, why){ simOut(id).forEach(f => { SIM.tok.set(f.id, (SIM.tok.get(f.id) || 0) + 1); SIM.fired.add(f.id); }); }
function simEnabled(){
  const d = E(SIM.d); const nodes = simActNodes(d), en = [];
  nodes.forEach(n => {
    const inc = simIn(n.id); if(!inc.length) return;
    const has = f => (SIM.tok.get(f.id) || 0) > 0;
    if(['Merge','Decision','Final','FlowFinal'].includes(n.kind) || (n.kind === 'ActParam' && n.dir === 'out')){ if(inc.some(has)) en.push(n); }
    else if(inc.every(has)) en.push(n);
  });
  return en;
}
function simFireAct(n, choice){
  const inc = simIn(n.id), has = f => (SIM.tok.get(f.id) || 0) > 0;
  const take = f => SIM.tok.set(f.id, SIM.tok.get(f.id) - 1);
  SIM.fired = new Set(); SIM.step++;
  if(['Merge','Decision','Final','FlowFinal'].includes(n.kind) || n.kind === 'ActParam') take(inc.find(has)); else inc.forEach(take);
  if(n.kind === 'Final'){ SIM.tok.clear(); SIM.done = true; simLog('■ Aktivite sonu — tüm akışlar sonlandı'); return; }
  if(n.kind === 'FlowFinal'){ simLog('⊗ Akış sonu'); return; }
  if(n.kind === 'ActParam'){ simLog('→ çıktı parametresi: ' + n.name); return; }
  if(n.kind === 'Decision'){
    const outs = simOut(n.id); if(!outs.length) return;
    const f = choice || outs[0]; SIM.tok.set(f.id, (SIM.tok.get(f.id) || 0) + 1); SIM.fired.add(f.id);
    simLog('◇ Karar: [' + (f.guard || f.name || '—') + ']'); return;
  }
  const lb = {Action:'▶', SendSignal:'✉ gönder', AcceptEvent:'⌛ olay alındı', AcceptTime:'⧗ zaman', Object:'▣ nesne', Fork:'⋔ çatallanma', Join:'⋈ eşzamanlama', Merge:'◇ birleştirme', Initial:'●'}[n.kind] || '•';
  const extra = n.kind === 'Action' && n.behavior && E(n.behavior) ? ' (çağrı: ' + E(n.behavior).name + ')' : n.signal && E(n.signal) ? ' «' + E(n.signal).name + '»' : '';
  simLog(lb + (n.name ? ' ' + n.name : '') + extra);
  simOfferOut(n.id);
}
function simStepAct(auto){
  if(SIM.ask) return;
  const en = simEnabled();
  if(!en.length){ if(!SIM.done) simLog(SIM.tok.size && [...SIM.tok.values()].some(v => v > 0) ? '⏸ İlerleyemiyor: bekleyen token var ama hiçbir düğüm etkin değil (join/olay bekleniyor?)' : '■ Akış tamamlandı'); SIM.done = true; simAutoOff(); return; }
  const n = en[0];
  if(n.kind === 'Decision'){
    const outs = simOut(n.id);
    if(outs.length > 1){
      if(auto){ const g = outs.filter(f => !/^else$/i.test(String(f.guard || '').trim())); const pick = g[Math.floor(Math.random() * g.length)] || outs[0]; simFireAct(n, pick); }
      else { SIM.ask = {n, opts:outs}; renderSimBar(); return; }
    } else simFireAct(n, outs[0]);
  } else simFireAct(n);
}
/* durum makinesi */
function simAncestors(id){ const a = []; let e = E(id); while(e && e.kind !== 'StateMachine'){ a.push(e.id); e = E(e.owner); } return a; }
function simEnter(id){
  const e = E(id); if(!e) return;
  if(e.kind === 'Final'){
    let o = E(e.owner); if(o && o.kind === 'Region') o = E(o.owner);
    if(!o || o.kind === 'StateMachine'){ SIM.act.clear(); SIM.done = true; simLog('■ Son durum — durum makinesi bitti'); return; }
    simLog('◉ ' + o.name + ' tamamlandı'); simExitTree(o.id);
    const ct = Object.values(M.els).find(r => r.kind === 'Transition' && r.src === o.id && !r.name);
    if(ct) simTake(ct);
    return;
  }
  if(e.kind === 'Choice' || e.kind === 'Junction'){ const outs = Object.values(M.els).filter(r => r.kind === 'Transition' && r.src === id); if(outs.length > 1){ SIM.ask = {stm:1, opts:outs, from:id}; renderSimBar(); return; } if(outs[0]) simTake(outs[0]); return; }
  if(e.kind === 'History'){ const p = E(e.owner); const last = p && SIM.hist.get(p.id); if(last && E(last)){ simLog('H geçmiş: ' + E(last).name); simEnter(last); return; } const t = Object.values(M.els).find(r => r.kind === 'Transition' && r.src === id); if(t) simTake(t); else { const ini = kidsOf(p.id).find(c => c.kind === 'Initial'); if(ini) simFollow(ini.id); } return; }
  if(e.kind === 'State'){
    simAncestors(id).reverse().forEach(a => { if(!SIM.act.has(a)){ SIM.act.add(a); const s = E(a); if(s.entry) simLog('  entry / ' + s.entry + ' (' + s.name + ')'); } });
    simLog('● ' + e.name + (e.doAct ? '  [do / ' + e.doAct + ']' : ''));
    const o = E(e.owner); if(o && (o.kind === 'State' || o.kind === 'Region')) SIM.hist.set(o.kind === 'Region' ? E(o.owner).id : o.id, id);
    const subs = kidsOf(id).filter(c => c.kind === 'Region'); const ini = kidsOf(id).find(c => c.kind === 'Initial');
    if(subs.length) subs.forEach(r => { const ri = kidsOf(r.id).find(c => c.kind === 'Initial'); if(ri) simFollow(ri.id); });
    else if(ini) simFollow(ini.id);
  }
}
function simFollow(initId){ const t = Object.values(M.els).find(r => r.kind === 'Transition' && r.src === initId); if(t) simTake(t, true); }
function simExitTree(id){ [...SIM.act].forEach(a => { if(a !== id && simAncestors(a).includes(id)){ const s = E(a); if(s && s.exit) simLog('  exit / ' + s.exit + ' (' + s.name + ')'); SIM.act.delete(a); } }); }
function simTake(t, quiet){
  const src = E(t.src), tgt = E(t.tgt); SIM.fired = new Set([t.id]);
  if(src && src.kind === 'State'){
    simExitTree(src.id);
    const ta = tgt ? new Set(simAncestors(tgt.id)) : new Set();
    simAncestors(src.id).forEach(a => { if(!ta.has(a) || a === src.id){ const s = E(a); if(SIM.act.has(a)){ if(s.exit) simLog('  exit / ' + s.exit + ' (' + s.name + ')'); SIM.act.delete(a); } } });
  }
  if(!quiet || t.name || t.effect) simLog('→ ' + ([t.name, t.guard ? '[' + t.guard + ']' : '', t.effect ? '/ ' + t.effect : ''].filter(Boolean).join(' ') || '(tamamlanma)') + ' : ' + (src ? (src.name || KIND[src.kind].tr) : '') + ' ⇒ ' + (tgt ? (tgt.name || KIND[tgt.kind].tr) : ''));
  if(tgt) simEnter(tgt.id);
}
function simAvail(){
  const leaves = [...SIM.act].filter(a => ![...SIM.act].some(b => b !== a && simAncestors(b).includes(a)));
  const out = [];
  leaves.forEach(l => simAncestors(l).forEach(a => Object.values(M.els).forEach(r => { if(r.kind === 'Transition' && r.src === a && !out.includes(r)) out.push(r); })));
  return out;
}
function simStepStm(auto, tr){
  if(SIM.ask || SIM.done) return;
  const av = simAvail(); SIM.step++;
  const comp = av.filter(t => !t.name && !isComposite(E(t.src)));
  const pick = tr || (comp.length ? comp[0] : (auto ? av[Math.floor(Math.random() * av.length)] : null));
  if(!pick){ simLog(av.length ? 'Olay bekleniyor — aşağıdan bir tetik seçin' : '⏸ Etkin geçiş yok'); if(!av.length){ SIM.done = true; simAutoOff(); } SIM.step--; return; }
  simTake(pick);
}
function simStepNow(auto){ if(!SIM) return; if(SIM.kind === 'act') simStepAct(auto); else simStepStm(auto); renderSimBar(); renderDiagram(); }
function simAutoOff(){ if(SIM && SIM.timer){ clearInterval(SIM.timer); SIM.timer = null; } }
function simAuto(){ if(!SIM) return; if(SIM.timer){ simAutoOff(); renderSimBar(); return; } SIM.timer = setInterval(() => { if(!SIM || SIM.done || cur() !== E(SIM.d)){ simAutoOff(); renderSimBar(); return; } simStepNow(true); }, SIM.speed || 700); renderSimBar(); }
function simOverlay(d){
  if(!SIM || SIM.d !== d.id) return '';
  let s = '';
  const hot = new Set();
  if(SIM.kind === 'act'){ SIM.tok.forEach((n, fid) => { if(n > 0) hot.add(fid); }); }
  d.edges.forEach(ed => {
    if(!ed._pts || !ed.el) return;
    const on = SIM.kind === 'act' ? (SIM.tok.get(ed.el) || 0) : 0, fr = SIM.fired.has(ed.el);
    if(!on && !fr) return;
    const p = ed._pts;
    s += `<path d="M${p.map(q => q.x + ',' + q.y).join(' L')}" fill="none" stroke="${fr ? '#f39c12' : '#27ae60'}" stroke-width="${3.5 / d.z}" stroke-opacity=".75" pointer-events="none"/>`;
    if(on){ const q = p[p.length - 1], o = p[p.length - 2], L = Math.hypot(q.x - o.x, q.y - o.y) || 1, tx = q.x - (q.x - o.x) / L * 16, ty = q.y - (q.y - o.y) / L * 16; s += `<circle cx="${tx}" cy="${ty}" r="${6 / d.z + 1}" fill="#27ae60" stroke="#fff" stroke-width="1.5" pointer-events="none"/>` + (on > 1 ? `<text x="${tx}" y="${ty + 3.5}" font-size="9" text-anchor="middle" fill="#fff" font-weight="bold" pointer-events="none">${on}</text>` : ''); }
  });
  if(SIM.kind === 'stm') d.shapes.forEach(sh => { if(SIM.act.has(sh.el)) s += `<rect x="${sh.x - 4}" y="${sh.y - 4}" width="${sh.w + 8}" height="${sh.h + 8}" rx="16" fill="rgba(39,174,96,.10)" stroke="#27ae60" stroke-width="${3 / d.z}" pointer-events="none"/>`; });
  if(SIM.kind === 'act'){ const en = new Set(simEnabled().map(n => n.id)); d.shapes.forEach(sh => { if(en.has(sh.el)) s += `<rect x="${sh.x - 4}" y="${sh.y - 4}" width="${sh.w + 8}" height="${sh.h + 8}" rx="14" fill="none" stroke="#27ae60" stroke-width="${2.5 / d.z}" stroke-dasharray="${6 / d.z} ${3 / d.z}" pointer-events="none"/>`; }); }
  return s;
}
function renderSimBar(){ simBarCore(); if(typeof runHooks === 'function') runHooks(SIMBAR_HOOKS, 'simbar', [$('#simbar')]); }
function simBarCore(){
  let bar = $('#simbar');
  if(!bar){ bar = document.createElement('div'); bar.id = 'simbar'; $('#canvasWrap').appendChild(bar); bar.addEventListener('click', ev => { const b = ev.target.closest('[data-sim]'); if(!b) return; const k = b.dataset.sim;
    if(k === 'step') simStepNow(false); else if(k === 'auto') simAuto(); else if(k === 'reset'){ simAutoOff(); simStart(); } else if(k === 'stop') simStop();
    else if(k === 'opt'){ const o = SIM.ask.opts[+b.dataset.i]; const A = SIM.ask; SIM.ask = null; if(A.stm){ SIM.step++; simTake(o); } else simFireAct(A.n, o); renderSimBar(); renderDiagram(); }
    else if(k === 'trig'){ const t = E(b.dataset.t); if(t){ simStepStm(false, t); renderSimBar(); renderDiagram(); } } }); }
  if(!SIM || cur() !== E(SIM.d)){ bar.style.display = 'none'; return; }
  bar.style.display = 'flex';
  let opts = '';
  if(SIM.ask) opts = `<div class="simq"><b>Hangi dal?</b> ${SIM.ask.opts.map((o, i) => `<button class="vb" data-sim="opt" data-i="${i}">${esc(o.guard ? '[' + o.guard + ']' : (o.name || (E(o.tgt) ? nm(E(o.tgt)) : '?')))}</button>`).join(' ')}</div>`;
  else if(SIM.kind === 'stm' && !SIM.done){ const av = simAvail().filter(t => t.name); if(av.length) opts = `<div class="simq"><b>Olaylar:</b> ${av.map(t => `<button class="vb" data-sim="trig" data-t="${t.id}">${esc(t.name + (t.guard ? ' [' + t.guard + ']' : ''))}</button>`).join(' ')}</div>`; }
  bar.innerHTML = `<div class="simh"><b>▶ Simülasyon</b>&nbsp;<span class="muted">${SIM.kind === 'act' ? 'aktivite (token)' : 'durum makinesi'}</span></div><div class="simh simb">
    <button class="vb" data-sim="step" title="Bir adım">⏭ Adım</button><button class="vb${SIM.timer ? ' pri' : ''}" data-sim="auto">${SIM.timer ? '⏸ Durdur' : '⏵ Otomatik'}</button><button class="vb" data-sim="reset">↺ Baştan</button><button class="vb" data-sim="stop">✕ Kapat</button></div>${opts}
    <div class="simlog">${SIM.log.slice(-60).map(l => `<div>${esc(l)}</div>`).join('')}</div>`;
  const lg = bar.querySelector('.simlog'); lg.scrollTop = lg.scrollHeight;
}
function analysisMenuItems(){
  const d = cur();
  return [{h:'Analiz'},
    {t:'Parametrik hesapla (kısıt denklemlerini çöz)', f:parDialog},
    {t:'Bütçe analizi (kütle, güç, maliyet…)', f:() => openD('@budget')},
    {t:'Test profilleri (PSD, sinüs, SRS, termal)', f:() => openD('@profiles')},
    {t:'Durum geçiş tablosu', f:() => { if(ST.tsel && E(ST.tsel) && E(ST.tsel).kind === 'StateMachine') STV.sm = ST.tsel; else if(d && d.dtype === 'stm' && E(d.owner) && E(d.owner).kind === 'StateMachine') STV.sm = d.owner; openD('@stt'); }},
    {t:'N² arayüz matrisi', f:() => openD('@n2')},
    {t:'Arayüz kontrol tablosu (ICD)', f:() => openD('@icd')},
    '-',
    {t:'FMEA / FMECA', f:() => openD('@fmea')},
    {t:'Risk kaydı ve risk matrisi', f:() => openD('@risk')},
    '-',
    {t:SIM ? 'Simülasyonu kapat' : 'Simülasyon başlat (açık diyagram)', dis:!SIM && !(d && (d.dtype === 'act' || d.dtype === 'stm')), f:() => SIM ? simStop() : simStart()},
    '-',
    {t:'Tahsis matrisi (fonksiyon → yapı)', f:() => openD('@alloc')},
    {t:'Genel tablo', f:() => openD('@table')},
    {t:'Örneklem tablosu (instance)', f:() => openD('@instances')},
    {t:'İlişki haritası', f:() => { if(ST.tsel && E(ST.tsel) && E(ST.tsel).kind !== 'Diagram') RM.root = ST.tsel; openD('@relmap'); }}];
}

