const PAYROLL_CODE_LABELS={
  '5010':'Nachtarbeit','5011':'Nachtbeginn','5014':'Samstag','5024':'Sonntagsarbeit 25%','5161':'Durchschnitt §21','5211':'Wechselschicht','5212':'Schichtzulage'
};
function latin1(bytes){ return new TextDecoder('latin1').decode(bytes); }
function decodePdfHex(hex){
  const clean=hex.replace(/\s/g,'');
  if(!clean) return '';
  const even=clean.length%2?clean+'0':clean;
  const pairs=even.match(/.{2}/g)||[];
  return pairs.map(h=>String.fromCharCode(parseInt(h,16))).join('');
}
function extractPdfTokens(buffer){
  const raw=latin1(new Uint8Array(buffer));
  const tokens=[];
  const hexRe=/<([0-9A-Fa-f\s]+)>\s*Tj/g;
  let m;
  while((m=hexRe.exec(raw))) tokens.push(decodePdfHex(m[1]));
  const parenRe=/\(((?:\\.|[^\\)])*)\)\s*Tj/g;
  while((m=parenRe.exec(raw))) tokens.push(m[1].replace(/\\([\\()\\])/g,'$1'));
  return tokens.map(t=>t.replace(/\s+/g,' ').trim()).filter(Boolean);
}
function extractPdfText(buffer){ return extractPdfTokens(buffer).join('\n'); }
function parseMonthFromPayrollText(text){
  const m=text.match(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{2})\b/i);
  if(m){
    const map={Jan:1,Feb:2,Mar:3,Apr:4,May:5,Jun:6,Jul:7,Aug:8,Sep:9,Oct:10,Nov:11,Dec:12};
    const key=m[1].slice(0,1).toUpperCase()+m[1].slice(1,3).toLowerCase();
    return `20${m[2]}-${String(map[key]).padStart(2,'0')}`;
  }
  const dm=text.match(/\b(\d{2})\.(\d{2})\.(\d{4})\b/);
  return dm ? `${dm[3]}-${dm[2]}` : '';
}
function parsePayrollEntries(textOrTokens){
  const tokens=Array.isArray(textOrTokens)?textOrTokens:String(textOrTokens||'').split(/\n+/).map(s=>s.trim()).filter(Boolean);
  const entries=[];
  const dateRe=/^\d{2}\.\d{2}\.\d{4}$/;
  const timeRe=/^\d{1,2}:\d{2}$/;
  const codeRe=/\b(5010|5011|5014|5024|5161|5211|5212)\b/;
  const numRe=/^[0-9]+(?:[\.,][0-9]+)?$/;
  const tidy=s=>s.replace(/\s+/g,' ').trim();
  for(let i=0;i<tokens.length;i++){
    if(!dateRe.test(tokens[i])) continue;
    const date=tokens[i];
    let j=i+1, from=null, to=null;
    for(let k=0;k<4 && j+k<tokens.length;k++){
      const t=tokens[j+k];
      if(timeRe.test(t)){ if(!from) from=t; else if(!to) to=t; }
      if(codeRe.test(t)){ j=j+k; break; }
      if(codeRe.test(t)) break;
    }
    if(!codeRe.test(tokens[j]||'')) continue;
    const cm=tokens[j].match(codeRe); const code=cm[1];
    const descParts=[tokens[j].replace(/^[\s\S]*?\b(?:5010|5011|5014|5024|5161|5211|5212)\s*:\s*/,'').replace(/\s+$/,'')];
    let quantity=null, extraValue=null, qIndex=-1;
    const inline=tokens[j].match(/([0-9]+(?:[\.,][0-9]+))\s*$/);
    if(inline){ quantity=parseMoneyInput(inline[1]); qIndex=j; }
    let k=j+1;
    for(;quantity===null && k<Math.min(tokens.length,j+8);k++){
      const t=tokens[k];
      const continuesClock = t==='00' && descParts.length && /:$/.test(descParts[descParts.length-1]);
      if(numRe.test(t) && !continuesClock){quantity=parseMoneyInput(t);qIndex=k;break;}
      if(!dateRe.test(t) && !codeRe.test(t) && !timeRe.test(t) && !/^E$/.test(t)) descParts.push(t);
      if(t==='E' && k+1<tokens.length && numRe.test(tokens[k+1])){extraValue=parseMoneyInput(tokens[k+1]);}
    }
    if(quantity===null || !Number.isFinite(quantity)) continue;
    if(extraValue===null && qIndex>=0 && tokens[qIndex+1]==='E' && numRe.test(tokens[qIndex+2]||'')) extraValue=parseMoneyInput(tokens[qIndex+2]);
    const name=PAYROLL_CODE_LABELS[code] || tidy(descParts.join(' ')).replace(/\s+[0-9]+(?:[\.,][0-9]+)?$/,'') || code;
    entries.push({id:uid('p'),date,from,to,code,name:tidy(name),quantity,extraValue});
    i=Math.max(i,k-1);
  }
  return entries;
}
function parseTimeSheetPdf(file){
  return file.arrayBuffer().then(buffer=>{
    const tokens=extractPdfTokens(buffer);
    const text=tokens.join('\n');
    return {sourceMonth:parseMonthFromPayrollText(text),entries:parsePayrollEntries(tokens),textLength:text.length};
  });
}
function forecastPayroll(importData){
  const d=load(); const rates=d.payroll.rates;
  const rows=importData.entries.map(e=>{const cfg=rates[e.code]||{};const rate=cfg.rate==null?null:Number(cfg.rate);return {...e,rate,gross:rate==null?null:cents(e.quantity*rate)};});
  const documentedGross=cents(rows.filter(r=>r.gross!==null).reduce((s,r)=>s+r.gross,0));
  const unresolvedCodes=[...new Set(rows.filter(r=>r.gross===null).map(r=>r.code))];
  const salaryMonth=importData.sourceMonth?addMonthsKey(importData.sourceMonth,2):'';
  const salaryDate=salaryMonth?getLastBankworkdayForKey(salaryMonth):null;
  const baselineGross=4480.43;
  const baselineNet=2827.98;
  const netFactor=cents(baselineNet/baselineGross);
  const modelNet=cents((baselineGross+documentedGross)*netFactor);
  return {rows,documentedGross,unresolvedCodes,forecastGross:cents(baselineGross+documentedGross),forecastLegalNet:modelNet,salaryMonth,salaryDate,supportObligations:2,method:`Modellwert: Referenz-Netto/Referenz-Brutto (${formatEUR(baselineNet)} / ${formatEUR(baselineGross)}) auf dokumentierte Zusatzbeträge. Nicht vollständig dokumentierte Sätze werden nicht erfunden.`};
}
function importPayrollFile(){
  const input=document.createElement('input'); input.type='file'; input.accept='application/pdf,.pdf';
  input.onchange=async()=>{
    const file=input.files?.[0]; if(!file)return;
    try{
      const parsed=await parseTimeSheetPdf(file);
      if(!parsed.entries.length){alert('Im PDF wurden keine der 7 vorgesehenen Zeitlohnarten erkannt.');return;}
      const d=load(); d.payroll.entries=parsed.entries; d.payroll.sourceMonth=parsed.sourceMonth; d.payroll.latestImport={name:file.name,size:file.size,importedAt:new Date().toISOString()};
      d.payroll.latestImport.forecast=forecastPayroll(parsed); d.payroll.imports.unshift({name:file.name,sourceMonth:parsed.sourceMonth,importedAt:new Date().toISOString(),entryCount:parsed.entries.length}); save(d); renderApp('payroll'); showToast('Zeitnachweis importiert');
    }catch(e){console.error(e);alert('Zeitnachweis konnte nicht verarbeitet werden.');}
  }; input.click();
}
function renderPayroll(){
  const d=load(); const imp=d.payroll.latestImport; const forecast=imp?.forecast; const entries=d.payroll.entries||[];
  return `<section class="page-head"><div><p class="eyebrow">ZEITNACHWEIS → PROGNOSE</p><h2>Gehalt</h2><p class="muted">Keine Dienste manuell eingeben. Nur Zeitnachweis hochladen. Die Prognose verändert niemals das Budget.</p></div><button class="btn btn-primary" data-action="import-pdf">PDF hochladen</button></section>
  <div class="card"><div class="section-head"><div><h3>Letzter Import</h3><div class="sub">${imp?`${escapeHtml(imp.name)} · ${imp.sourceMonth||'Monat nicht erkannt'}`:'Noch kein Zeitnachweis importiert.'}</div></div>${imp?`<span class="pill">${entries.length} Einträge</span>`:''}</div>
  ${forecast?`<div class="forecast-grid"><div class="forecast-tile"><span>Prognose Auszahlung</span><strong>${forecast.salaryDate?forecast.salaryDate.toLocaleDateString('de-DE'):(forecast.salaryMonth||'—')}</strong></div><div class="forecast-tile"><span>Modell-Netto*</span><strong>${formatEUR(forecast.forecastLegalNet)}</strong></div><div class="forecast-tile"><span>Dokumentierter Zusatzbrutto</span><strong>${formatEUR(forecast.documentedGross)}</strong></div><div class="forecast-tile"><span>Unterhaltspflichten</span><strong>2</strong></div></div><div class="help" style="margin-top:10px">${escapeHtml(forecast.method)}</div>`:'<div class="notice">Die PDF-Auswertung liest Monat und Zeitlohnarten aus dem Dokument. Die vollständige offizielle Pfändungstabelle 2026 ist im Quellenpaket nicht enthalten; daher werden dafür keine Tabellenwerte erfunden.</div>'}
  </div>
  ${entries.length?`<div class="card"><div class="section-head"><div><h3>Erkannte Zeitlohnarten</h3><div class="sub">${forecast?.unresolvedCodes?.length?'Für '+forecast.unresolvedCodes.join(', ')+' ist im Quellenpaket kein eindeutiger Euro-Satz belegt.':'Alle erkannten Codes besitzen einen hinterlegten Quellenwert.'}</div></div></div><div class="payroll-table">${entries.map(e=>{const r=(d.payroll.rates||{})[e.code]||{};const amount=r.rate==null?null:cents(e.quantity*r.rate);return `<div class="pay-row"><div class="code-badge">${e.code}</div><div class="pay-main"><div class="list-title">${escapeHtml(e.name)}</div><div class="list-sub">${escapeHtml(e.date)}${e.from?` · ${escapeHtml(e.from)}–${escapeHtml(e.to||'')}`:''} · Menge ${String(e.quantity??'—').replace('.',',')}${e.extraValue!=null?` · Zusatz ${String(e.extraValue).replace('.',',')}`:''}</div></div><div class="pay-value">${amount==null?'Satz fehlt':formatEUR(amount)}</div></div>`}).join('')}</div></div>`:''}
  <div class="help">* Modellwert, keine Lohnabrechnung. Die Pfändung bleibt getrennt vom Budget und wird nur mit vollständig bereitgestellter Tabelle umgesetzt.</div>`;
}
function getLastBankworkdayForKey(key){const [y,m]=key.split('-').map(Number);return getLastBankworkday(y,m-1);}
function addMonthsKey(key,delta){const [y,m]=key.split('-').map(Number);const d=new Date(y,m-1+delta,1);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;}
function importPayrollFile(){
  const input=document.createElement('input'); input.type='file'; input.accept='application/pdf,.pdf';
  input.onchange=async()=>{
    const file=input.files?.[0]; if(!file)return;
    try{
      const parsed=await parseTimeSheetPdf(file);
      if(!parsed.entries.length){alert('Im PDF wurden keine der 7 vorgesehenen Zeitlohnarten erkannt.');return;}
      const d=load(); d.payroll.entries=parsed.entries; d.payroll.sourceMonth=parsed.sourceMonth; d.payroll.latestImport={name:file.name,size:file.size,importedAt:new Date().toISOString()};
      const forecast=forecastPayroll(parsed); d.payroll.latestImport.forecast=forecast; d.payroll.imports.unshift({name:file.name,sourceMonth:parsed.sourceMonth,importedAt:new Date().toISOString(),entryCount:parsed.entries.length}); save(d); renderApp('payroll'); showToast('Zeitnachweis importiert');
    }catch(e){console.error(e);alert('Zeitnachweis konnte nicht verarbeitet werden.');}
  }; input.click();
}
function renderPayroll(){
  const d=load(); const imp=d.payroll.latestImport; const forecast=imp?.forecast; const entries=d.payroll.entries||[];
  return `<section class="page-head"><div><p class="eyebrow">ZEITNACHWEIS → PROGNOSE</p><h2>Gehalt</h2><p class="muted">Keine Dienste manuell eingeben. Nur Zeitnachweis hochladen. Die Prognose verändert niemals das Budget.</p></div><button class="btn btn-primary" data-action="import-pdf">PDF hochladen</button></section>
  <div class="card"><div class="section-head"><div><h3>Letzter Import</h3><div class="sub">${imp?`${escapeHtml(imp.name)} · ${imp.sourceMonth||'Monat nicht erkannt'}`:'Noch kein Zeitnachweis importiert.'}</div></div>${imp?`<span class="pill">${entries.length} Einträge</span>`:''}</div>
  ${forecast?`<div class="forecast-grid"><div class="forecast-tile"><span>Prognose Auszahlung</span><strong>${forecast.salaryDate?forecast.salaryDate.toLocaleDateString('de-DE'):(forecast.salaryMonth||'—')}</strong></div><div class="forecast-tile"><span>Gesetzliches Netto*</span><strong>${formatEUR(forecast.forecastLegalNet)}</strong></div><div class="forecast-tile"><span>Dokumentierter Zusatzbrutto</span><strong>${formatEUR(forecast.documentedGross)}</strong></div><div class="forecast-tile"><span>Unterhaltspflichten</span><strong>2</strong></div></div>`:'<div class="notice">Die PDF-Auswertung liest den Monat aus dem Dokument. Die Pfändungstabelle 2026 ist im bereitgestellten Quellenpaket nicht enthalten und wird deshalb nicht mit erfundenen Tabellenwerten berechnet.</div>'}
  </div>
  ${entries.length?`<div class="card"><div class="section-head"><div><h3>Erkannte Zeitlohnarten</h3><div class="sub">${forecast?.unresolvedCodes?.length?'Für '+forecast.unresolvedCodes.join(', ')+' ist im Quellenpaket kein eindeutiger Euro-Satz belegt.':'Alle erkannten Codes besitzen einen hinterlegten Quellenwert.'}</div></div></div><div class="payroll-table">${entries.map(e=>{const r=(d.payroll.rates||{})[e.code]||{};const amount=r.rate==null?null:cents(e.quantity*r.rate);return `<div class="pay-row"><div class="code-badge">${e.code}</div><div class="pay-main"><div class="list-title">${escapeHtml(e.name)}</div><div class="list-sub">${escapeHtml(e.date)}${e.from?` · ${escapeHtml(e.from)}–${escapeHtml(e.to||'')}`:''} · Menge ${String(e.quantity??'—').replace('.',',')}</div></div><div class="pay-value">${amount==null?'Satz fehlt':formatEUR(amount)}</div></div>`}).join('')}</div></div>`:''}
  <div class="help">* Die gesetzliche Netto-Prognose ist eine Modellrechnung auf Basis der dokumentierten Referenzwerte der bereitgestellten Bezügemitteilungen; sie ist keine Lohnabrechnung. Pfändung wird separat behandelt.</div>`;
}
