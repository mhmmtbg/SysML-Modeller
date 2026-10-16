/* ================= v1.10: XMI (Cameo / MagicDraw alt kümesi) VE ŞABLONLAR ================= */
const XNS = {xmi:'http://www.omg.org/spec/XMI/20131001', uml:'http://www.omg.org/spec/UML/20161101', sysml:'http://www.omg.org/spec/SysML/20181001/SysML'};
const PRIM_HREF = {Real:'http://www.omg.org/spec/SysML/20181001/SysML.xmi#SysML_dataType.Real', Integer:'http://www.omg.org/spec/UML/20161101/PrimitiveTypes.xmi#Integer', Boolean:'http://www.omg.org/spec/UML/20161101/PrimitiveTypes.xmi#Boolean', String:'http://www.omg.org/spec/UML/20161101/PrimitiveTypes.xmi#String'};
function xmiExport(){
  const out = [], st = [], X = xe;
  const xid = id => '_' + String(id).replace(/[^A-Za-z0-9_.-]/g, '');
  const kids = id => kidsOf(id).filter(e => !KIND[e.kind].rel && e.kind !== 'Diagram').sort(sortEls);
  const rels = Object.values(M.els).filter(e => KIND[e.kind] && KIND[e.kind].rel && E(e.src) && E(e.tgt));
  const docC = e => e.doc ? `<ownedComment xmi:type="uml:Comment" xmi:id="${xid(e.id)}_doc" body="${X(e.doc)}"><annotatedElement xmi:idref="${xid(e.id)}"/></ownedComment>` : '';
  const mult = m => { m = String(m || '').trim(); if(!m) return ''; const r = m.split('..'), lo = r[0].trim(), hi = (r[1] || r[0]).trim(); const lv = lo === '*' ? 0 : parseInt(lo, 10) || 0; return `<lowerValue xmi:type="uml:LiteralInteger" xmi:id="${uid()}" value="${lv}"/><upperValue xmi:type="uml:LiteralUnlimitedNatural" xmi:id="${uid()}" value="${hi === '*' ? '*' : parseInt(hi, 10) || 1}"/>`; };
  const typeRef = x => { if(x.type && E(x.type)) return ` type="${xid(x.type)}"`; const vt = vtypeOf(x.vtype); if(vt) return ` type="${xid(vt.id)}"`; return ''; };
  const typeHref = x => (!x.type || !E(x.type)) && !vtypeOf(x.vtype) && PRIM_HREF[x.vtype] ? `<type href="${PRIM_HREF[x.vtype]}"/>` : '';
  const defV = v => { if(v.def == null || v.def === '') return ''; const n = numOf(v.def); return n != null ? `<defaultValue xmi:type="uml:LiteralReal" xmi:id="${uid()}" value="${n}"/>` : `<defaultValue xmi:type="uml:LiteralString" xmi:id="${uid()}" value="${X(v.def)}"/>`; };
  const assocs = [];
  const prop = (p, owner) => {
    if(p.kind === 'Part'){ const r = rels.find(x => x.part === p.id); const aid = r ? xid(r.id) : null; if(aid) assocs.push({aid, p, owner, r}); return `<ownedAttribute xmi:type="uml:Property" xmi:id="${xid(p.id)}" name="${X(p.name)}" visibility="public" aggregation="${p.shared ? 'shared' : 'composite'}"${typeRef(p)}${aid ? ` association="${aid}"` : ''}>${mult(p.mult)}${docC(p)}</ownedAttribute>`; }
    if(p.kind === 'Value'){ return `<ownedAttribute xmi:type="uml:Property" xmi:id="${xid(p.id)}" name="${X(p.name)}" visibility="public" aggregation="composite"${typeRef(p)}>${typeHref(p)}${defV(p)}${docC(p)}</ownedAttribute>`; }
    if(p.kind === 'Port'){ if(p.pkind === 'proxy') st.push(`<sysml:ProxyPort xmi:id="${xid(p.id)}_st" base_Port="${xid(p.id)}"/>`); if(p.pkind === 'full') st.push(`<sysml:FullPort xmi:id="${xid(p.id)}_st" base_Port="${xid(p.id)}"/>`); return `<ownedAttribute xmi:type="uml:Port" xmi:id="${xid(p.id)}" name="${X(p.name)}" visibility="public" aggregation="composite"${p.conj ? ' isConjugated="true"' : ''}${typeRef(p)}>${mult(p.mult)}${docC(p)}</ownedAttribute>`; }
    if(p.kind === 'FlowProp'){ st.push(`<sysml:FlowProperty xmi:id="${xid(p.id)}_st" base_Property="${xid(p.id)}" direction="${p.dir || 'inout'}"/>`); return `<ownedAttribute xmi:type="uml:Property" xmi:id="${xid(p.id)}" name="${X(p.name)}" visibility="public"${typeRef(p)}>${typeHref(p)}${mult(p.mult)}</ownedAttribute>`; }
    if(p.kind === 'ConstraintProp'){ st.push(`<MD_Customization_for_SysML__additional_stereotypes:ConstraintProperty xmi:id="${xid(p.id)}_st" base_Property="${xid(p.id)}"/>`); return `<ownedAttribute xmi:type="uml:Property" xmi:id="${xid(p.id)}" name="${X(p.name)}" visibility="public" aggregation="composite"${typeRef(p)}/>`; }
    if(p.kind === 'Param') return `<ownedAttribute xmi:type="uml:Property" xmi:id="${xid(p.id)}" name="${X(p.name)}" visibility="public">${typeHref(p)}</ownedAttribute>`;
    return '';
  };
  const connectors = b => rels.filter(r => (r.kind === 'Connector' || r.kind === 'Binding') && r.owner === b.id).map(r => {
    if(r.kind === 'Binding') st.push(`<sysml:BindingConnector xmi:id="${xid(r.id)}_st" base_Connector="${xid(r.id)}"/>`);
    const end = (el, part, i) => `<end xmi:type="uml:ConnectorEnd" xmi:id="${xid(r.id)}_e${i}" role="${xid(el)}"${part ? ` partWithPort="${xid(part)}"` : ''}/>`;
    return `<ownedConnector xmi:type="uml:Connector" xmi:id="${xid(r.id)}" name="${X(r.name || '')}" visibility="public">${end(r.src, r.sp, 1)}${end(r.tgt, r.tp, 2)}</ownedConnector>`;
  }).join('');
  const gens = e => rels.filter(r => r.kind === 'Generalization' && r.src === e.id).map(r => `<generalization xmi:type="uml:Generalization" xmi:id="${xid(r.id)}" general="${xid(r.tgt)}"/>`).join('');
  const behaviors = e => kids(e.id).filter(k => ['Activity','StateMachine'].includes(k.kind)).map(k => k.kind === 'Activity' ? activity(k, 'ownedBehavior') : stateMachine(k, 'ownedBehavior')).join('');
  const activity = (a, tag) => {
    const ns = kidsOf(a.id).filter(n => !KIND[n.kind].rel), flows = rels.filter(r => (r.kind === 'ControlFlow' || r.kind === 'ObjectFlow') && (ns.some(n => n.id === r.src || n.id === E(r.src).owner) || r.owner === a.id));
    const NT = {Action:'uml:OpaqueAction', SendSignal:'uml:SendSignalAction', AcceptEvent:'uml:AcceptEventAction', AcceptTime:'uml:AcceptEventAction', Initial:'uml:InitialNode', Final:'uml:ActivityFinalNode', FlowFinal:'uml:FlowFinalNode', Decision:'uml:DecisionNode', Merge:'uml:MergeNode', Fork:'uml:ForkNode', Join:'uml:JoinNode', Object:'uml:CentralBufferNode', ActParam:'uml:ActivityParameterNode'};
    let h = `<${tag} xmi:type="uml:Activity" xmi:id="${xid(a.id)}" name="${X(a.name)}" visibility="public">${docC(a)}`;
    ns.filter(n => n.kind === 'ActParam').forEach(p => { h += `<ownedParameter xmi:type="uml:Parameter" xmi:id="${xid(p.id)}_par" name="${X(p.name)}" direction="${p.dir === 'out' ? 'out' : 'in'}"${typeRef(p)}>${typeHref(p)}</ownedParameter>`; });
    ns.forEach(n => {
      const t = n.kind === 'Action' && n.behavior && E(n.behavior) ? 'uml:CallBehaviorAction' : NT[n.kind]; if(!t) return;
      let inner = '';
      kidsOf(n.id).filter(p => p.kind === 'Pin').forEach(p => { const tg = t === 'uml:CallBehaviorAction' ? (p.dir === 'out' ? 'result' : 'argument') : t === 'uml:SendSignalAction' ? 'argument' : t === 'uml:AcceptEventAction' ? 'result' : (p.dir === 'out' ? 'outputValue' : 'inputValue'); inner += `<${tg} xmi:type="uml:${p.dir === 'out' ? 'OutputPin' : 'InputPin'}" xmi:id="${xid(p.id)}" name="${X(p.name)}"${typeRef(p)}/>`; });
      if(n.kind === 'AcceptTime') inner += `<trigger xmi:type="uml:Trigger" xmi:id="${xid(n.id)}_tr" name="${X(n.name)}"/>`;
      h += `<node xmi:type="${t}" xmi:id="${xid(n.id)}" name="${X(n.name || '')}"${t === 'uml:CallBehaviorAction' ? ` behavior="${xid(n.behavior)}"` : ''}${n.signal && E(n.signal) ? ` signal="${xid(n.signal)}"` : ''}${n.kind === 'ActParam' ? ` parameter="${xid(n.id)}_par"` : ''}${n.kind === 'Object' ? typeRef(n) : ''}>${inner}</node>`;
    });
    flows.forEach(f => { h += `<edge xmi:type="uml:${f.kind}" xmi:id="${xid(f.id)}" name="${X(f.name || '')}" source="${xid(f.src)}" target="${xid(f.tgt)}">${f.guard ? `<guard xmi:type="uml:LiteralString" xmi:id="${xid(f.id)}_g" value="${X(f.guard)}"/>` : ''}</edge>`; });
    ns.filter(n => n.kind === 'Partition').forEach(p => { h += `<group xmi:type="uml:ActivityPartition" xmi:id="${xid(p.id)}" name="${X(p.name)}"${p.represents && E(p.represents) ? ` represents="${xid(p.represents)}"` : ''}/>`; });
    return h + `</${tag}>`;
  };
  const vertex = v => {
    if(v.kind === 'State'){
      const sub = kidsOf(v.id).filter(c => NESTK.has(c.kind) && c.kind !== 'Region'), regs = kidsOf(v.id).filter(c => c.kind === 'Region');
      let h = `<subvertex xmi:type="uml:State" xmi:id="${xid(v.id)}" name="${X(v.name)}">`;
      [['entry', v.entry], ['doActivity', v.doAct], ['exit', v.exit]].forEach(([k, b]) => { if(b) h += `<${k} xmi:type="uml:OpaqueBehavior" xmi:id="${xid(v.id)}_${k}" name="${X(b)}"><body>${X(b)}</body></${k}>`; });
      if(sub.length) h += region({id:v.id + '_r', name:''}, v.id);
      regs.forEach(r => { h += region(r, r.id); });
      return h + '</subvertex>';
    }
    if(v.kind === 'Final') return `<subvertex xmi:type="uml:FinalState" xmi:id="${xid(v.id)}" name="${X(v.name || '')}"/>`;
    const pk = {Initial:'initial', Choice:'choice', Junction:'junction', History:v.deep ? 'deepHistory' : 'shallowHistory'}[v.kind];
    return pk ? `<subvertex xmi:type="uml:Pseudostate" xmi:id="${xid(v.id)}" kind="${pk}"/>` : '';
  };
  const region = (r, ownerId) => {
    const vs = kidsOf(ownerId).filter(c => NESTK.has(c.kind) && c.kind !== 'Region'), ids = new Set(vs.map(v => v.id));
    const trs = rels.filter(t => t.kind === 'Transition' && ids.has(t.src));
    return `<region xmi:type="uml:Region" xmi:id="${xid(r.id)}" name="${X(r.name || '')}">` + vs.map(vertex).join('') + trs.map(t => `<transition xmi:type="uml:Transition" xmi:id="${xid(t.id)}" source="${xid(t.src)}" target="${xid(t.tgt)}" name="${X(t.name || '')}">${t.name ? `<trigger xmi:type="uml:Trigger" xmi:id="${xid(t.id)}_tr" name="${X(t.name)}"/>` : ''}${t.guard ? `<guard xmi:type="uml:Constraint" xmi:id="${xid(t.id)}_g"><specification xmi:type="uml:OpaqueExpression" xmi:id="${xid(t.id)}_gs"><body>${X(t.guard)}</body></specification></guard>` : ''}${t.effect ? `<effect xmi:type="uml:OpaqueBehavior" xmi:id="${xid(t.id)}_ef" name="${X(t.effect)}"><body>${X(t.effect)}</body></effect>` : ''}</transition>`).join('') + '</region>';
  };
  const stateMachine = (sm, tag) => `<${tag} xmi:type="uml:StateMachine" xmi:id="${xid(sm.id)}" name="${X(sm.name)}">${docC(sm)}${region({id:sm.id + '_r', name:''}, sm.id)}</${tag}>`;
  const classLike = (e, tag) => {
    const ch = kidsOf(e.id);
    let body = docC(e) + gens(e) + ch.filter(c => ['Part','Value','Port','FlowProp','ConstraintProp','Param'].includes(c.kind)).map(c => prop(c, e)).join('') + connectors(e) + behaviors(e);
    if(e.kind === 'ConstraintBlock' && e.expr) body += `<ownedRule xmi:type="uml:Constraint" xmi:id="${xid(e.id)}_c"><specification xmi:type="uml:OpaqueExpression" xmi:id="${xid(e.id)}_cs"><body>${X(e.expr)}</body><language>Text</language></specification></ownedRule>`;
    return `<${tag} xmi:type="uml:Class" xmi:id="${xid(e.id)}" name="${X(e.name)}" visibility="public">${body}</${tag}>`;
  };
  const pkgItem = e => {
    const T = 'packagedElement';
    switch(e.kind){
      case 'Package': return `<${T} xmi:type="uml:Package" xmi:id="${xid(e.id)}" name="${X(e.name)}" visibility="public">${docC(e)}${kids(e.id).map(pkgItem).join('')}</${T}>`;
      case 'Block': st.push(`<sysml:Block xmi:id="${xid(e.id)}_st" base_Class="${xid(e.id)}"/>`); return classLike(e, T);
      case 'InterfaceBlock': st.push(`<sysml:InterfaceBlock xmi:id="${xid(e.id)}_st" base_Class="${xid(e.id)}"/>`); return classLike(e, T);
      case 'ConstraintBlock': st.push(`<sysml:ConstraintBlock xmi:id="${xid(e.id)}_st" base_Class="${xid(e.id)}"/>`); return classLike(e, T);
      case 'Requirement': st.push(`<sysml:Requirement xmi:id="${xid(e.id)}_st" base_Class="${xid(e.id)}" id="${X(e.reqId || '')}" text="${X(e.text || '')}"/>`); return `<${T} xmi:type="uml:Class" xmi:id="${xid(e.id)}" name="${X(e.name)}" visibility="public">${docC(e)}${kids(e.id).filter(c => c.kind === 'Requirement').map(c => { const s0 = pkgItem(c); return s0.replace(/^<packagedElement/, '<nestedClassifier').replace(/<\/packagedElement>$/, '</nestedClassifier>'); }).join('')}</${T}>`;
      case 'TestCase': st.push(`<sysml:TestCase xmi:id="${xid(e.id)}_st" base_Behavior="${xid(e.id)}"/>`); return `<${T} xmi:type="uml:Activity" xmi:id="${xid(e.id)}" name="${X(e.name)}" visibility="public">${docC(e)}</${T}>`;
      case 'ValueType': st.push(`<sysml:ValueType xmi:id="${xid(e.id)}_st" base_DataType="${xid(e.id)}"/>`); return `<${T} xmi:type="uml:DataType" xmi:id="${xid(e.id)}" name="${X(e.name)}" visibility="public">${e.unit ? `<ownedComment xmi:type="uml:Comment" xmi:id="${xid(e.id)}_u" body="${X('unit = ' + e.unit + (e.qk ? '; quantityKind = ' + e.qk : ''))}"><annotatedElement xmi:idref="${xid(e.id)}"/></ownedComment>` : ''}${e.base && PRIM_HREF[e.base] ? `<generalization xmi:type="uml:Generalization" xmi:id="${xid(e.id)}_g"><general href="${PRIM_HREF[e.base]}"/></generalization>` : ''}</${T}>`;
      case 'Enumeration': return `<${T} xmi:type="uml:Enumeration" xmi:id="${xid(e.id)}" name="${X(e.name)}" visibility="public">${enumLits(e).map((l, i) => `<ownedLiteral xmi:type="uml:EnumerationLiteral" xmi:id="${xid(e.id)}_l${i}" name="${X(l)}"/>`).join('')}</${T}>`;
      case 'Signal': return `<${T} xmi:type="uml:Signal" xmi:id="${xid(e.id)}" name="${X(e.name)}" visibility="public">${kidsOf(e.id).filter(c => c.kind === 'Value').map(c => prop(c, e)).join('')}</${T}>`;
      case 'Actor': return `<${T} xmi:type="uml:Actor" xmi:id="${xid(e.id)}" name="${X(e.name)}" visibility="public">${docC(e)}${gens(e)}</${T}>`;
      case 'UseCase': return `<${T} xmi:type="uml:UseCase" xmi:id="${xid(e.id)}" name="${X(e.name)}" visibility="public">${docC(e)}${gens(e)}${rels.filter(r => r.kind === 'Include' && r.src === e.id).map(r => `<include xmi:type="uml:Include" xmi:id="${xid(r.id)}" addition="${xid(r.tgt)}"/>`).join('')}${rels.filter(r => r.kind === 'Extend' && r.src === e.id).map(r => `<extend xmi:type="uml:Extend" xmi:id="${xid(r.id)}" extendedCase="${xid(r.tgt)}"/>`).join('')}${behaviors(e)}</${T}>`;
      case 'Subject': return `<${T} xmi:type="uml:Class" xmi:id="${xid(e.id)}" name="${X(e.name)}" visibility="public">${kids(e.id).filter(c => c.kind === 'UseCase').map(c => pkgItem(c).replace(/^<packagedElement/, '<ownedUseCase').replace(/<\/packagedElement>$/, '</ownedUseCase>')).join('')}</${T}>`;
      case 'Activity': return activity(e, T);
      case 'StateMachine': return stateMachine(e, T);
      case 'Comment': return `<ownedComment xmi:type="uml:Comment" xmi:id="${xid(e.id)}" body="${X(e.name)}"/>`;
    }
    return '';
  };
  const root = E(M.rootId);
  let body = kids(M.rootId).map(pkgItem).join('');
  // dependency türü ilişkiler + association
  const relX = {Satisfy:'uml:Abstraction', DeriveReqt:'uml:Abstraction', Verify:'uml:Abstraction', Refine:'uml:Abstraction', Trace:'uml:Abstraction', Allocate:'uml:Abstraction', Dependency:'uml:Dependency', Import:'uml:Dependency'};
  rels.forEach(r => {
    if(relX[r.kind]){ const stn = {Satisfy:'Satisfy', DeriveReqt:'DeriveReqt', Verify:'Verify', Refine:'Refine', Trace:'Trace', Allocate:'Allocate'}[r.kind]; if(stn) st.push(`<sysml:${stn} xmi:id="${xid(r.id)}_st" base_Abstraction="${xid(r.id)}"/>`); body += `<packagedElement xmi:type="${relX[r.kind]}" xmi:id="${xid(r.id)}" name="${X(r.name || '')}"><client xmi:idref="${xid(r.src)}"/><supplier xmi:idref="${xid(r.tgt)}"/></packagedElement>`; }
    if(r.kind === 'Association'){ body += `<packagedElement xmi:type="uml:Association" xmi:id="${xid(r.id)}" name="${X(r.name || '')}" memberEnd="${xid(r.id)}_a ${xid(r.id)}_b"><ownedEnd xmi:type="uml:Property" xmi:id="${xid(r.id)}_a" type="${xid(r.src)}" association="${xid(r.id)}"/><ownedEnd xmi:type="uml:Property" xmi:id="${xid(r.id)}_b" type="${xid(r.tgt)}" association="${xid(r.id)}"/></packagedElement>`; }
  });
  assocs.forEach(({aid, p, owner}) => { body += `<packagedElement xmi:type="uml:Association" xmi:id="${aid}" memberEnd="${xid(p.id)} ${aid}_o"><ownedEnd xmi:type="uml:Property" xmi:id="${aid}_o" type="${xid(owner.id)}" association="${aid}"/></packagedElement>`; });
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
${typeof secLabel === 'function' && secLabel() ? '<!-- GİZLİLİK DERECESİ: ' + secLabel().replace(/--/g, '-') + ' -->\n' : ''}<xmi:XMI xmi:version="2.5" xmlns:xmi="${XNS.xmi}" xmlns:uml="${XNS.uml}" xmlns:sysml="${XNS.sysml}" xmlns:MD_Customization_for_SysML__additional_stereotypes="http://www.magicdraw.com/spec/Customization/180/SysML" xmlns:umldi="${UMLDI_NS}" xmlns:dc="${DC_NS}">
<xmi:Documentation><xmi:exporter>SysML Modelleyici</xmi:exporter><xmi:exporterVersion>${APP_VER}</xmi:exporterVersion></xmi:Documentation>
<uml:Model xmi:type="uml:Model" xmi:id="${xid(root.id)}" name="${X(root.name)}">${body}</uml:Model>
${st.join('\n')}
${xmiDI(xid, X)}
</xmi:XMI>`;
  download(new Blob([xml], {type:'application/xml'}), fileSafe(root.name) + '.xmi');
  toast('XMI dışa aktarıldı — yapı, gereksinimler, ilişkiler, davranışlar ve diyagram yerleşimi (UML DI)');
  return xml;
}

/* ---- XMI içe aktarma ---- */
async function pickText(filter, accept){
  if(NATIVE){ const r = await nDialog('open', '', filter); if(r.error) throw new Error(r.error); return r.path ? {name:r.path, text:r.text} : null; }
  return new Promise(res => { const inp = document.createElement('input'); inp.type = 'file'; inp.accept = accept; inp.onchange = async () => { const f = inp.files[0]; if(!f) return res(null); res({name:f.name, text:decodeText(new Uint8Array(await f.arrayBuffer()))}); }; inp.click(); });
}
async function xmiImportDialog(){
  let f; try { f = await pickText('XMI / UML (*.xmi;*.xml;*.uml)|*.xmi;*.xml;*.uml|Tüm dosyalar (*.*)|*.*', '.xmi,.xml,.uml'); } catch(e){ return toast('Açılamadı: ' + e.message); }
  if(!f) return;
  const box = $('#modalBox'); box.style.width = 'min(560px, 94vw)'; box.style.maxWidth = 'none';
  box.innerHTML = `<h2>XMI içe aktar</h2><p class="muted">${esc(baseName(f.name))}</p>
    <label class="vchk"><input type="checkbox" id="xiD" checked> Diyagramları otomatik oluştur (BDD, IBD, aktivite, durum makinesi, use case)</label><br>
    <label class="vchk"><input type="checkbox" id="xiR" checked> Gereksinim diyagramı oluştur</label>
    <p class="muted" style="margin-top:10px">Model, kökte "XMI: …" adlı yeni bir paketin içine aktarılır. Cameo/MagicDraw, Papyrus ve Enterprise Architect'in UML 2.x / SysML 1.x XMI dosyalarında paket, blok, arayüz bloğu, part, port, değer, akış özelliği, değer tipi, numaralandırma, sinyal, gereksinim (id/metin), test durumu, kısıt bloğu, ilişkiler (composition, generalization, association, satisfy, derive, verify, refine, trace, allocate, dependency), aktör, use case, aktivite ve durum makineleri okunur. Diyagram yerleşimleri XMI'da standart olmadığından aktarılmaz.</p>
    <p style="text-align:right;margin:10px 0 0"><span class="muted" id="xist"></span> <button class="pbtn" id="xiC">Vazgeç</button> <button class="pbtn pri" id="xiO">Aktar</button></p>`;
  $('#modal').style.display = 'flex';
  box.onclick = ev => {
    if(ev.target.id === 'xiC'){ $('#modal').style.display = 'none'; box.onclick = null; }
    if(ev.target.id === 'xiO'){
      try { const r = xmiImport(f.text, baseName(f.name).replace(/\.(xmi|xml|uml)$/i, ''), {diagrams:$('#xiD').checked, req:$('#xiR').checked}); $('#modal').style.display = 'none'; box.onclick = null; toast(`XMI aktarıldı: ${r.n} eleman, ${r.rels} ilişki, ${r.dias} diyagram${r.skipped ? ' · ' + r.skipped + ' desteklenmeyen öğe atlandı' : ''}`); }
      catch(e){ $('#xist').textContent = 'Hata: ' + e.message; }
    }
  };
}
function xmiImport(text, label, opt){
  opt = opt || {};
  const doc = new DOMParser().parseFromString(text, 'application/xml');
  if(doc.getElementsByTagName('parsererror').length) throw new Error('XML okunamadı');
  const XMI_NS = [...new Set([...doc.getElementsByTagName('*')].map(n => n.namespaceURI).filter(u => u && /XMI|xmi/.test(u) && /omg|schema/i.test(u)))];
  const att = (n, a) => { if(!n || !n.getAttribute) return null; let v = n.getAttribute('xmi:' + a); if(v == null) for(const ns of XMI_NS){ v = n.getAttributeNS(ns, a); if(v) break; } if(v == null && a !== 'type') v = n.getAttribute(a); return v; };
  const xtype = n => String(att(n, 'type') || '').replace(/^.*:/, '');
  const idOf = n => att(n, 'id') || att(n, 'uuid');
  const byId = new Map(); [...doc.getElementsByTagName('*')].forEach(n => { const i = idOf(n); if(i && !byId.has(i)) byId.set(i, n); });
  // stereotip uygulamaları: base_* niteliği taşıyan kök çocukları
  const stOf = new Map(), stNode = new Map();
  [...doc.getElementsByTagName('*')].forEach(n => { [...n.attributes].forEach(a => { if(/^base_/.test(a.localName) && a.value){ a.value.split(/\s+/).forEach(b => { if(!stOf.has(b)) stOf.set(b, new Set()); stOf.get(b).add(n.localName); stNode.set(b + '|' + n.localName, n); }); } }); });
  const has = (id, s) => stOf.has(id) && stOf.get(id).has(s);
  const refs = (n, a) => { const v = n.getAttribute(a); if(v) return v.split(/\s+/).filter(Boolean); return [...n.children].filter(c => c.localName === a).map(c => att(c, 'idref') || (c.getAttribute('href') || '').replace(/^.*#/, '')).filter(Boolean); };
  const ref1 = (n, a) => refs(n, a)[0] || null;
  const typeOf = n => { const t = n.getAttribute('type'); if(t) return {id:t}; const c = [...n.children].find(x => x.localName === 'type'); if(c){ const i = att(c, 'idref'); if(i) return {id:i}; const h = c.getAttribute('href') || ''; return {prim:h.replace(/^.*[#.]/, '').replace(/^.*_/, '')}; } return {}; };
  const valOf = n => { const c = [...n.children].find(x => x.localName === 'defaultValue'); if(!c) return ''; const v = c.getAttribute('value'); if(v != null) return v; const b = [...c.children].find(x => x.localName === 'body'); return b ? b.textContent : (c.getAttribute('instance') ? '' : ''); };
  const multOfN = n => { const lo = [...n.children].find(x => x.localName === 'lowerValue'), hi = [...n.children].find(x => x.localName === 'upperValue'); if(!lo && !hi) return ''; const l = lo ? (lo.getAttribute('value') || '0') : '1', h = hi ? (hi.getAttribute('value') || '1') : '1'; if(h === '-1') return l + '..*'; return l === h ? (l === '1' ? '' : l) : l + '..' + h; };
  const nameOf = n => n.getAttribute('name') || '';
  const docOf = n => [...n.children].filter(c => c.localName === 'ownedComment').map(c => c.getAttribute('body') || ([...c.children].find(x => x.localName === 'body') || {}).textContent || '').filter(Boolean).join('\n');
  snap();
  const map = new Map(), post = [], post2 = [], skipK = {};
  let n = 0, nrel = 0, skipped = 0;
  const skip = t => { skipped++; skipK[t] = (skipK[t] || 0) + 1; };
  const model = [...doc.getElementsByTagName('*')].find(x => xtype(x) === 'Model' || x.localName === 'Model') || doc.documentElement;
  const top = mk('Package', M.rootId, {name:uniqName('XMI: ' + (nameOf(model) || label), M.rootId), doc:'XMI\'dan aktarıldı: ' + label});
  const add = (k, owner, xn, props) => { const e = mk(k, owner, Object.assign({name:nameOf(xn), doc:docOf(xn)}, props || {})); if(idOf(xn)) map.set(idOf(xn), e.id); n++; return e; };
  const R = id => map.get(id) || null;
  const relAdd = (k, s, t, owner, extra) => { if(!s || !t) return null; const r = mk(k, owner || nearestPkg(s), Object.assign({src:s, tgt:t, name:''}, extra || {})); nrel++; return r; };
  const classify = xn => {
    const id = idOf(xn), t = xtype(xn);
    if(t === 'Class'){
      if(has(id, 'Requirement') || has(id, 'AbstractRequirement') || [...(stOf.get(id) || [])].some(s => /Requirement$/.test(s))) return 'Requirement';
      if(has(id, 'InterfaceBlock')) return 'InterfaceBlock';
      if(has(id, 'ConstraintBlock')) return 'ConstraintBlock';
      return 'Block';
    }
    if(t === 'DataType') return has(id, 'ValueType') ? 'ValueType' : 'ValueType';
    if(t === 'Activity' && (has(id, 'TestCase'))) return 'TestCase';
    return {Package:'Package', Model:'Package', Profile:null, Enumeration:'Enumeration', Signal:'Signal', Actor:'Actor', UseCase:'UseCase', Activity:'Activity', StateMachine:'StateMachine', Interaction:null, Component:'Block', Interface:'InterfaceBlock', Comment:'Comment', InstanceSpecification:null, PrimitiveType:null, Association:null, Abstraction:null, Dependency:null, Realization:null, Usage:null, Refine:null, Trace:null, SignalEvent:null, TimeEvent:null, ChangeEvent:null, CallEvent:null, AnyReceiveEvent:null, Diagram:null}[t];
  };
  const walkPkg = (xn, owner) => {
    [...xn.children].forEach(c => {
      if(!['packagedElement', 'ownedType', 'nestedClassifier', 'ownedBehavior', 'nestedPackage', 'ownedComment', 'ownedUseCase'].includes(c.localName)) return;
      const k = classify(c); if(k === undefined){ skip(xtype(c) || c.localName); return; } if(!k) return;
      if(k === 'Comment'){ const b = c.getAttribute('body') || ''; if(b && !refs(c, 'annotatedElement').length){ add('Comment', owner, c, {name:b}); } return; }
      importEl(c, k, owner);
    });
  };
  const importEl = (xn, k, owner) => {
    const own = canOwn(E(owner).kind, k) ? owner : nearestPkg(owner);
    if(k === 'Package'){ const p = add('Package', own, xn); walkPkg(xn, p.id); return p; }
    if(k === 'Requirement'){
      const id = idOf(xn), sn = [...(stOf.get(id) || [])].map(s => stNode.get(id + '|' + s)).find(Boolean);
      const gv = a => sn ? (sn.getAttribute(a) || ([...sn.children].find(x => x.localName === a) || {}).textContent || '') : '';
      const e = add('Requirement', own === M.rootId ? top.id : own, xn, {reqId:gv('id') || gv('Id') || nextReqId('Sistem'), text:gv('text') || gv('Text')});
      [...xn.children].filter(c => c.localName === 'nestedClassifier').forEach(c => { if(classify(c) === 'Requirement') importEl(c, 'Requirement', e.id); });
      return e;
    }
    if(k === 'TestCase'){ return add('TestCase', own, xn, {tMethod:'Test'}); }
    if(k === 'Enumeration') return add('Enumeration', own, xn, {lits:[...xn.children].filter(c => c.localName === 'ownedLiteral').map(nameOf).join('\n')});
    if(k === 'ValueType'){ const b = docOf(xn), m = b.match(/unit\s*=\s*([^;\n]+)/i), q = b.match(/quantityKind\s*=\s*([^;\n]+)/i); const e = add('ValueType', own, xn, {base:'Real', unit:m ? m[1].trim() : '', qk:q ? q[1].trim() : '', doc:m ? '' : b}); return e; }
    if(k === 'Activity') return importActivity(xn, own);
    if(k === 'StateMachine') return importSM(xn, own);
    const e = add(k, own, xn);
    if(['Block', 'InterfaceBlock', 'ConstraintBlock', 'Signal', 'Actor', 'UseCase'].includes(k)){
      [...xn.children].forEach(c => {
        const ct = xtype(c);
        if(c.localName === 'ownedAttribute') post.push(() => importAttr(c, e));
        else if(c.localName === 'generalization'){ const g = ref1(c, 'general'); post.push(() => { if(R(g)) relAdd('Generalization', e.id, R(g)); }); }
        else if(c.localName === 'ownedConnector') post2.push(() => importConn(c, e));
        else if(c.localName === 'ownedBehavior' || c.localName === 'classifierBehavior' && ct){ const bk = classify(c); if(bk === 'Activity') importActivity(c, e.id); else if(bk === 'StateMachine') importSM(c, e.id); }
        else if(c.localName === 'ownedRule' && k === 'ConstraintBlock'){ const sp = [...c.getElementsByTagName('*')].find(x => x.localName === 'body'); if(sp) e.expr = sp.textContent.trim(); }
        else if(c.localName === 'include'){ const a = ref1(c, 'addition'); post.push(() => { if(R(a)) relAdd('Include', e.id, R(a)); }); }
        else if(c.localName === 'extend'){ const a = ref1(c, 'extendedCase'); post.push(() => { if(R(a)) relAdd('Extend', e.id, R(a)); }); }
        else if(c.localName === 'ownedUseCase' || c.localName === 'nestedClassifier'){ const kk = classify(c); if(kk) importEl(c, kk, e.id); }
      });
    }
    return e;
  };
  const importAttr = (c, owner) => {
    const id = idOf(c), ct = xtype(c), ty = typeOf(c), tid = ty.id && R(ty.id), tel = tid && E(tid), tx = ty.id && byId.get(ty.id);
    const tname = tel ? tel.name : (tx ? nameOf(tx) : (ty.prim || ''));
    if(owner.kind === 'ConstraintBlock' && !tel){ const p = mk('Param', owner.id, {name:nameOf(c), vtype:tname || 'Real'}); map.set(id, p.id); n++; return; }
    if(ct === 'Port'){ const p = mk('Port', owner.id, {name:nameOf(c), type:tel ? tid : null, conj:c.getAttribute('isConjugated') === 'true', pkind:has(id, 'ProxyPort') ? 'proxy' : has(id, 'FullPort') ? 'full' : '', mult:multOfN(c), dir:''}); const fp = stNode.get(id + '|FlowPort'); if(fp && fp.getAttribute('direction')) p.dir = fp.getAttribute('direction'); map.set(id, p.id); n++; return; }
    if(has(id, 'FlowProperty')){ const sn = stNode.get(id + '|FlowProperty'); const p = mk('FlowProp', owner.id, {name:nameOf(c), dir:(sn && sn.getAttribute('direction')) || 'inout', type:tel ? tid : null, vtype:tel ? '' : tname, mult:multOfN(c)}); map.set(id, p.id); n++; return; }
    if(tel && tel.kind === 'ConstraintBlock'){ const p = mk('ConstraintProp', owner.id, {name:nameOf(c), type:tid}); map.set(id, p.id); n++; return; }
    if(tel && ['Block', 'InterfaceBlock', 'Actor'].includes(tel.kind) && owner.kind !== 'Signal'){
      const agg = c.getAttribute('aggregation') || 'none';
      if(agg === 'none' && c.getAttribute('association')) return;
      const p = mk('Part', owner.id, {name:nameOf(c) || lcFirst(tel.name), type:tid, mult:multOfN(c), shared:agg === 'shared' || undefined}); map.set(id, p.id); n++;
      if(tel.kind === 'Block' && owner.kind === 'Block') relAdd(agg === 'shared' ? 'Aggregation' : 'Composition', owner.id, tid, nearestPkg(owner.id), {part:p.id});
      return;
    }
    const v = mk('Value', owner.id, {name:nameOf(c), vtype:tname || '', def:valOf(c)}); map.set(id, v.id); n++;
  };
  const importConn = (c, owner) => {
    const ends = [...c.children].filter(x => x.localName === 'end'); if(ends.length !== 2) return;
    const e1 = ends.map(x => ({role:R(ref1(x, 'role')), part:R(ref1(x, 'partWithPort'))}));
    if(!e1[0].role || !e1[1].role) return;
    relAdd(has(idOf(c), 'BindingConnector') ? 'Binding' : 'Connector', e1[0].role, e1[1].role, owner.id, {sp:e1[0].part, tp:e1[1].part, name:nameOf(c)});
  };
  const ANODE = {OpaqueAction:'Action', CallBehaviorAction:'Action', CallOperationAction:'Action', SendSignalAction:'SendSignal', AcceptEventAction:'AcceptEvent', InitialNode:'Initial', ActivityFinalNode:'Final', FlowFinalNode:'FlowFinal', DecisionNode:'Decision', MergeNode:'Merge', ForkNode:'Fork', JoinNode:'Join', CentralBufferNode:'Object', DataStoreNode:'Object', ActivityParameterNode:'ActParam'};
  const importActivity = (xn, owner) => {
    const own = canOwn(E(owner).kind, 'Activity') ? owner : nearestPkg(owner);
    const a = add('Activity', own, xn);
    const params = new Map([...xn.children].filter(c => c.localName === 'ownedParameter').map(c => [idOf(c), c]));
    [...xn.children].filter(c => c.localName === 'node' || c.localName === 'ownedNode').forEach(c => {
      const k = ANODE[xtype(c)]; if(!k){ skip(xtype(c)); return; }
      const props = {};
      if(k === 'ActParam'){ const pr = params.get(c.getAttribute('parameter')); props.dir = pr && pr.getAttribute('direction') === 'out' ? 'out' : 'in'; }
      const e = add(k === 'AcceptEvent' && [...c.children].some(x => x.localName === 'trigger' && /time/i.test(xtype(x) + (x.getAttribute('event') || ''))) ? 'AcceptTime' : k, a.id, c, props);
      if(k === 'Action' && c.getAttribute('behavior')){ const b = c.getAttribute('behavior'); post.push(() => { if(R(b)) e.behavior = R(b); }); }
      if(c.getAttribute('signal')){ const sg = c.getAttribute('signal'); post.push(() => { if(R(sg)) e.signal = R(sg); }); }
      [...c.children].filter(p => /Pin$/.test(xtype(p))).forEach(p => { const pe = mk('Pin', e.id, {name:nameOf(p), dir:/Output/.test(xtype(p)) ? 'out' : 'in'}); map.set(idOf(p), pe.id); n++; const ty = typeOf(p); post.push(() => { if(ty.id && R(ty.id)) pe.type = R(ty.id); else if(ty.prim) pe.vtype = ty.prim; }); });
    });
    [...xn.children].filter(c => c.localName === 'group' && xtype(c) === 'ActivityPartition').forEach(c => { const p = add('Partition', a.id, c); const rep = c.getAttribute('represents'); post.push(() => { if(R(rep)) p.represents = R(rep); }); p._nodes = refs(c, 'node'); });
    post.push(() => {
      [...xn.children].filter(c => c.localName === 'edge').forEach(c => {
        const s = R(c.getAttribute('source') || ref1(c, 'source')), t = R(c.getAttribute('target') || ref1(c, 'target')); if(!s || !t){ skip('edge'); return; }
        const g = [...c.children].find(x => x.localName === 'guard'); let gv = g ? (g.getAttribute('value') || ([...g.children].find(x => x.localName === 'body') || {}).textContent || '') : '';
        if(gv === 'true') gv = '';
        relAdd(xtype(c) === 'ObjectFlow' ? 'ObjectFlow' : 'ControlFlow', s, t, a.id, {guard:gv, name:nameOf(c)});
      });
    });
    return a;
  };
  const importSM = (xn, owner) => {
    const own = canOwn(E(owner).kind, 'StateMachine') ? owner : nearestPkg(owner);
    const sm = add('StateMachine', own, xn);
    const PK = {initial:'Initial', choice:'Choice', junction:'Junction', shallowHistory:'History', deepHistory:'History'};
    const region = (r, ownerId, multi) => {
      const holder = multi ? add('Region', ownerId, r).id : ownerId;
      [...r.children].filter(c => c.localName === 'subvertex').forEach(v => {
        const t = xtype(v); let e;
        if(t === 'State'){ e = add('State', holder, v); [['entry', 'entry'], ['doActivity', 'doAct'], ['exit', 'exit']].forEach(([x, f]) => { const b = [...v.children].find(q => q.localName === x); if(b) e[f] = nameOf(b) || ([...b.children].find(q => q.localName === 'body') || {}).textContent || ''; }); const rs = [...v.children].filter(q => q.localName === 'region'); rs.forEach(q => region(q, e.id, rs.length > 1)); }
        else if(t === 'FinalState') e = add('Final', holder, v);
        else if(t === 'Pseudostate'){ const k = PK[v.getAttribute('kind') || 'initial']; if(!k){ skipped++; return; } e = add(k, holder, v, k === 'History' ? {deep:v.getAttribute('kind') === 'deepHistory'} : {}); }
      });
      post.push(() => [...r.children].filter(c => c.localName === 'transition').forEach(c => {
        const s = R(c.getAttribute('source')), t = R(c.getAttribute('target')); if(!s || !t){ skipped++; return; }
        const trg = [...c.children].find(x => x.localName === 'trigger'); let tn = trg ? nameOf(trg) : ''; if(trg && !tn && trg.getAttribute('event')){ const ev = byId.get(trg.getAttribute('event')); tn = ev ? nameOf(ev) : ''; }
        const g = [...c.getElementsByTagName('*')].find(x => x.localName === 'specification' && x.parentNode.localName === 'guard'), gb = g ? (g.getAttribute('value') || ([...g.children].find(x => x.localName === 'body') || {}).textContent || '') : '';
        const ef = [...c.children].find(x => x.localName === 'effect');
        relAdd('Transition', s, t, sm.id, {name:tn || nameOf(c), guard:gb, effect:ef ? (nameOf(ef) || ([...ef.children].find(x => x.localName === 'body') || {}).textContent || '') : ''});
      }));
    };
    const rs = [...xn.children].filter(c => c.localName === 'region');
    rs.forEach(r => region(r, sm.id, rs.length > 1));
    return sm;
  };
  walkPkg(model, top.id);
  for(let i = 0; i < post.length; i++) post[i]();
  post2.forEach(f => f());
  // ilişkiler (paket düzeyinde): abstraction/dependency/realization + association
  [...doc.getElementsByTagName('*')].forEach(c => {
    if(c.localName !== 'packagedElement') return;
    const t = xtype(c), id = idOf(c);
    if(['Abstraction', 'Dependency', 'Realization', 'Usage', 'Refine', 'Trace'].includes(t)){
      const s = R(ref1(c, 'client')), g = R(ref1(c, 'supplier')); if(!s || !g){ skipped++; return; }
      const k = has(id, 'Satisfy') ? 'Satisfy' : has(id, 'DeriveReqt') ? 'DeriveReqt' : has(id, 'Verify') ? 'Verify' : has(id, 'Refine') || t === 'Refine' ? 'Refine' : has(id, 'Trace') || has(id, 'Copy') || t === 'Trace' ? 'Trace' : has(id, 'Allocate') ? 'Allocate' : 'Dependency';
      if(k === 'Verify' && E(s).kind === 'Activity' && !kidsOf(s).length){ const x = E(s); x.kind = 'TestCase'; x.tMethod = 'Test'; }
      relAdd(k, s, g);
    } else if(t === 'Association'){
      const me = (c.getAttribute('memberEnd') || '').split(/\s+/).filter(Boolean).concat([...c.children].filter(x => x.localName === 'memberEnd').map(x => att(x, 'idref')).filter(Boolean));
      const endsN = me.length ? me.map(i => byId.get(i)).filter(Boolean) : [...c.children].filter(x => x.localName === 'ownedEnd');
      const typesE = endsN.map(x => R(typeOf(x).id)).filter(Boolean);
      if(endsN.length === 2 && typesE.length === 2 && endsN.every(x => (x.getAttribute('aggregation') || 'none') === 'none')){ const a0 = E(typesE[0]), b0 = E(typesE[1]); if(a0 && b0 && validate('Association', a0, b0, {dtype:a0.kind === 'Actor' || b0.kind === 'Actor' ? 'uc' : 'bdd'}) === '') relAdd('Association', typesE[0], typesE[1]); }
    }
  });
  // stereotip ile işaretlenmiş TestCase (Behavior/Operation)
  stOf.forEach((s, id) => { if(s.has('TestCase') && R(id) && E(R(id)).kind === 'Activity' && !kidsOf(R(id)).length){ const x = E(R(id)); x.kind = 'TestCase'; x.tMethod = 'Test'; } });
  Object.values(M.els).forEach(e => { if(e._nodes) delete e._nodes; });
  let dias = opt.di === false ? 0 : xmiImportDI(doc, R, top.id, idOf);
  if(opt.diagrams && !dias) dias = xmiAutoDiagrams(top.id, opt);
  ST.exp.add(top.id); afterChange(); revealInTree(top.id);
  return {n, rels:nrel, dias, skipped, skipK, pkg:top.id};
}
/* içe aktarılan yapı için otomatik diyagramlar */
function xmiAutoDiagrams(pkgId, opt){
  let n = 0;
  const all = Object.values(M.els).filter(e => e.id === pkgId || isAnc(pkgId, e.id));
  const lay = (d, mode) => { const g = layoutDiagram(d, mode); d.shapes.forEach(s => { const b = g.get(s.id); if(b){ s.x = b.x; s.y = b.y; s.w = b.w; s.h = b.h; } }); delete d._seqMsgs; };
  const pk = all.filter(e => e.kind === 'Package' || e.id === pkgId);
  pk.forEach(p => {
    const bl = kidsOf(p.id).filter(e => ['Block', 'InterfaceBlock', 'ConstraintBlock', 'ValueType', 'Enumeration', 'Signal'].includes(e.kind));
    if(bl.length){ const d = mk('Diagram', p.id, {name:p.name + ' BDD', dtype:'bdd', shapes:[], edges:[], vx:60, vy:70, z:1}); bl.forEach((b, i) => addShape(d, b.id, (i % 4) * 240, Math.floor(i / 4) * 200)); d.shapes.slice().forEach(s => autoEdges(d, s)); lay(d, 'tb'); n++; }
    const uc = kidsOf(p.id).filter(e => ['Actor', 'UseCase'].includes(e.kind));
    if(uc.some(e => e.kind === 'UseCase')){ const d = mk('Diagram', p.id, {name:p.name + ' Use Case', dtype:'uc', shapes:[], edges:[], vx:60, vy:70, z:1}); uc.forEach((b, i) => addShape(d, b.id, (i % 4) * 200, Math.floor(i / 4) * 140)); d.shapes.slice().forEach(s => autoEdges(d, s)); lay(d, 'ucLeft'); n++; }
    const rq = kidsOf(p.id).filter(e => e.kind === 'Requirement');
    if(opt.req && rq.length){ const d = mk('Diagram', p.id, {name:p.name + ' Gereksinimler', dtype:'req', shapes:[], edges:[], vx:60, vy:70, z:1}); const list = rq.concat(rq.flatMap(r => kidsOf(r.id).filter(c => c.kind === 'Requirement'))).slice(0, 40); list.forEach((b, i) => addShape(d, b.id, (i % 4) * 280, Math.floor(i / 4) * 170)); d.shapes.slice().forEach(s => autoEdges(d, s)); lay(d, 'tb'); n++; }
  });
  all.filter(e => e.kind === 'Block' && kidsOf(e.id).some(c => c.kind === 'Part')).forEach(b => { const d = newDiagramCore(b.id, 'ibd', b.name + ' IBD'); lay(d, 'lr'); n++; });
  all.filter(e => e.kind === 'Activity' && kidsOf(e.id).some(c => !KIND[c.kind].rel && c.kind !== 'Partition')).forEach(a => {
    const d = newDiagramCore(a.id, 'act', a.name);
    kidsOf(a.id).filter(c => !KIND[c.kind].rel && !['Partition', 'Pin', 'Diagram'].includes(c.kind)).forEach((c, i) => { const sh = addShape(d, c.id, (i % 3) * 200, Math.floor(i / 3) * 110); if(['Action', 'SendSignal', 'AcceptEvent'].includes(c.kind)) showPorts(d, sh); });
    d.shapes.slice().forEach(s => autoEdges(d, s)); lay(d, 'tb'); n++;
  });
  all.filter(e => e.kind === 'StateMachine').forEach(sm => {
    const d = newDiagramCore(sm.id, 'stm', sm.name);
    const place = (ownerId, x0, y0) => { const ch = kidsOf(ownerId).filter(c => NESTK.has(c.kind)); let i = 0; ch.forEach(c => { const comp = kidsOf(c.id).some(q => NESTK.has(q.kind)); const sh = addShape(d, c.id, x0 + (i % 3) * 220, y0 + Math.floor(i / 3) * 140); i++; if(comp){ sh.w = 420; sh.h = 260; place(c.id, sh.x + 20, sh.y + 60); } }); };
    place(sm.id, 0, 0);
    d.shapes.slice().forEach(s => autoEdges(d, s)); if(!d.shapes.some(s => isComposite(E(s.el)))) lay(d, 'tb'); n++;
  });
  return n;
}

/* ---- şablonlar ---- */
const TPL_810H = [
  ['500.6', 'Alçak basınç (irtifa)', 'depolama/taşıma ve çalışma irtifası koşullarında [TBD m] basınç seviyesine maruz kaldıktan sonra'],
  ['501.7', 'Yüksek sıcaklık', 'depolama [TBD °C] ve çalışma [TBD °C] yüksek sıcaklık koşullarında'],
  ['502.7', 'Düşük sıcaklık', 'depolama [TBD °C] ve çalışma [TBD °C] düşük sıcaklık koşullarında'],
  ['503.7', 'Sıcaklık şoku', '[TBD °C] ile [TBD °C] arasındaki ani sıcaklık değişimlerine maruz kaldıktan sonra'],
  ['505.7', 'Güneş radyasyonu', 'güneş radyasyonu (ısıl ve aktinik etkiler) koşullarında'],
  ['507.6', 'Nem', 'yüksek bağıl nem [TBD %] döngülerine maruz kaldıktan sonra'],
  ['509.7', 'Tuz sisi', 'tuz sisi ortamına [TBD saat] maruz kaldıktan sonra'],
  ['510.7', 'Kum ve toz', 'üflenen kum ve toz ortamında'],
  ['512.6', 'Daldırma', '[TBD m] derinliğe daldırıldıktan sonra sızdırmazlığını koruyarak'],
  ['513.8', 'İvme', 'yapısal ve çalışma ivme seviyelerinde [TBD g]'],
  ['514.8', 'Titreşim', 'yaşam döngüsü titreşim profillerinde (ör. Kategori [TBD], [TBD g²/Hz] PSD, [TBD saat/eksen])'],
  ['515.8', 'Akustik gürültü', '[TBD dB] toplam ses basınç seviyesindeki akustik ortamda'],
  ['516.8', 'Şok', 'işlevsel şok, taşıma düşmesi ve çarpma koşullarında (ör. Prosedür [TBD], [TBD g], [TBD ms])'],
  ['517.3', 'Piroteknik şok', '[TBD g] tepe ve [TBD Hz] köşe frekanslı şok tepki spektrumunda (SRS)']
];
const TPL_SMC = [
  ['Akustik', 'akustik kalifikasyon seviyesinde (kabul seviyesi + [TBD dB], [TBD s])'],
  ['Rastgele titreşim', 'kalifikasyon rastgele titreşim seviyesinde ([TBD g²/Hz], her eksende [TBD s])'],
  ['Sinüs titreşim', 'kalifikasyon sinüs titreşim seviyesinde ([TBD g], [TBD Hz] aralığı)'],
  ['Şok (piroteknik/ayrılma)', 'kalifikasyon şok tepki spektrumunda (SRS, kabul seviyesi + [TBD dB])'],
  ['Termal vakum', 'termal vakum ortamında [TBD] döngü, kalifikasyon sıcaklık aralığında ([TBD °C] / [TBD °C])'],
  ['Termal döngü', 'termal döngü testinde [TBD] döngü, [TBD °C] ile [TBD °C] arasında'],
  ['Basınç / sızdırmazlık', 'kalifikasyon basınç seviyesinde ([TBD × MEOP]) sızdırmazlığını koruyarak'],
  ['Statik yük', 'kalifikasyon statik yüklerinde ([TBD × sınır yük]) kalıcı deformasyon olmadan'],
  ['EMC', 'elektromanyetik uyumluluk gereksinimlerini (yayınım ve bağışıklık) karşılayarak'],
  ['Kütle özellikleri', 'kütle, ağırlık merkezi ve eylemsizlik momenti ölçümleriyle tanımlı toleranslarda']
];
const TPL_SKEL = ['01 Gereksinimler', '02 Kullanım Senaryoları', '03 Yapı', '04 Davranış', '05 Arayüzler', '06 Analiz', '07 Doğrulama'];
function templateDialog(){
  const box = $('#modalBox'); box.style.width = 'min(620px, 94vw)'; box.style.maxWidth = 'none';
  const pk = Object.values(M.els).filter(e => e.kind === 'Package' || e.kind === 'Model').sort((a, b) => pathOf(a.id).localeCompare(pathOf(b.id), 'tr'));
  box.innerHTML = `<h2>Şablon ekle</h2>
    <div class="plist" style="max-height:none">
      <label class="pli"><input type="radio" name="tpl" value="810" checked> <b>MIL-STD-810H çevresel kalifikasyon</b><em>14 test yöntemi (500.6 alçak basınç … 517.3 piroteknik şok) için sistem gereksinimi + kalifikasyon test durumu + Verify ilişkisi. Seviyeler [TBD] olarak gelir; kalite raporu doldurulmamışları listeler.</em></label>
      <label class="pli"><input type="radio" name="tpl" value="smc"> <b>SMC-S-016 uzay aracı kalifikasyon testleri</b><em>Akustik, rastgele/sinüs titreşim, şok, termal vakum, termal döngü, basınç, statik yük, EMC, kütle özellikleri.</em></label>
      <label class="pli"><input type="radio" name="tpl" value="skel"> <b>Proje iskeleti</b><em>01 Gereksinimler … 07 Doğrulama paket yapısı, SI birim kütüphanesi ve «LRU» stereotipi.</em></label>
    </div>
    <div class="rpgrid" style="margin-top:10px"><label>Hedef paket <select id="tpP">${pk.map(p => `<option value="${p.id}">${esc(pathOf(p.id))}</option>`).join('')}</select></label>
    <label>Doğrulanan birim (test edilen) <input id="tpI" value="${esc(E(M.rootId).name)}"></label></div>
    <label class="vchk"><input type="checkbox" id="tpT" checked> Test durumlarını ve Verify ilişkilerini oluştur</label>
    <p style="text-align:right;margin:10px 0 0"><button class="pbtn" id="tpC">Vazgeç</button> <button class="pbtn pri" id="tpO">Ekle</button></p>`;
  $('#modal').style.display = 'flex';
  box.onclick = ev => {
    if(ev.target.id === 'tpC'){ $('#modal').style.display = 'none'; box.onclick = null; }
    if(ev.target.id === 'tpO'){ const k = box.querySelector('input[name=tpl]:checked').value; const r = applyTemplate(k, $('#tpP').value, {tests:$('#tpT').checked, item:$('#tpI').value.trim()}); $('#modal').style.display = 'none'; box.onclick = null; toast(r); }
  };
}
function applyTemplate(k, target, o){
  o = o || {}; snap();
  if(k === 'skel'){
    TPL_SKEL.forEach(n => findOrMkPkg(target, n));
    addUnitLibQuiet();
    if(!Object.values(M.els).some(e => e.kind === 'Stereotype' && e.name === 'LRU')) mk('Stereotype', findOrMkPkg(M.rootId, 'Profil'), {name:'LRU', meta:['Block'], tags:'parçaNo : String\ntedarikçi : String\nMTBF : Real'});
    ST.exp.add(target); afterChange(); revealInTree(target);
    return 'Proje iskeleti eklendi: ' + TPL_SKEL.length + ' paket, birim kütüphanesi, «LRU» stereotipi';
  }
  const is810 = k === '810', list = is810 ? TPL_810H : TPL_SMC;
  const pk = mk('Package', target, {name:uniqName(is810 ? 'Çevresel Kalifikasyon (MIL-STD-810H)' : 'Uzay Aracı Kalifikasyonu (SMC-S-016)', target)});
  const tpk = o.tests ? mk('Package', pk.id, {name:'Kalifikasyon Testleri'}) : null;
  let i = 0;
  list.forEach(row => {
    const [m, t, cond] = is810 ? row : [null, row[0], row[1]];
    i++;
    const r = mk('Requirement', pk.id, {level:'Sistem', name:(is810 ? 'Yöntem ' + m + ' – ' : '') + t, text:'Sistem, ' + (is810 ? 'MIL-STD-810H Yöntem ' + m + ' ' : 'SMC-S-016 ') + t.toLocaleLowerCase('tr') + ' testinde, ' + cond + ' belirtilen performans gereksinimlerini karşılayacaktır.', verif:'Test', attrs:{}});
    if(tpk){ const tc = mk('TestCase', tpk.id, {name:t + ' testi', procNo:(is810 ? 'QT-810-' + m.replace('.', '') : 'QT-SMC-' + String(i).padStart(2, '0')), tMethod:'Test', tLevel:'Kalifikasyon', testItem:o.item || '', std:is810 ? 'MIL-STD-810H Yöntem ' + m : 'SMC-S-016', result:'Planlandı'}); addRel('Verify', tc.id, r.id); }
  });
  ST.exp.add(target); ST.exp.add(pk.id); afterChange(); revealInTree(pk.id);
  return list.length + ' gereksinim' + (tpk ? ' ve ' + list.length + ' test durumu' : '') + ' eklendi — [TBD] değerlerini doldurun (Gereksinimler ▾ → Kalite raporu eksikleri listeler)';
}
function addUnitLibQuiet(){ const pk = findOrMkPkg(M.rootId, 'Birimler'); const have = new Set(Object.values(M.els).filter(e => e.kind === 'ValueType').map(e => e.name)); UNIT_LIB.forEach(([nm0, unit, qk]) => { if(!have.has(nm0)) mk('ValueType', pk, {name:nm0, base:'Real', unit, qk}); }); }

