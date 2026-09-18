const PAYROLL_CODE_LABELS={
  '5010':'Nachtarbeit',
  '5011':'Nachtbeginn',
  '5014':'Samstag',
  '5024':'Sonntagsarbeit 25%',
  '5161':'Durchschnitt §21',
  '5211':'Wechselschicht',
  '5212':'Schichtzulage'
};

function decodeLatin1(bytes){
  try{return new TextDecoder('windows-1252').decode(bytes);}catch{return Array.from(bytes,b=>String.fromCharCode(b)).join('');}
}
function decodePdfHex(hex){
  const clean=hex.replace(/\s/g,'');
  if(!clean) return '';
  const even=clean.length%2?clean+'0':clean;
  const pairs=even.match(/.{2}/g)||[];
  return pairs.map(h=>String.fromCharCode(parseInt(h,16))).join('');
}
function unescapePdfLiteral(s){
  return s.replace(/\\([\\()])/g,'$1').replace(/\\n/g,'\n').replace(/\\r/g,'\r').replace(/\\t/g,'\t');
}

/*
 * The supplied SAP PDFs contain their text in uncompressed PDF content streams
 * using Tj text operators. We deliberately parse only that structure and do not
 * introduce a network dependency or fabricate values that are not documented.
 */
function extractPdfTokens(buffer){
  const raw=decodeLatin1(new Uint8Array(buffer));
  const tokens=[];
  const hexRe=/<([0-9A-Fa-f\s]+)>\s*Tj\b/g;
  let m;
  while((m=hexRe.exec(raw))) tokens.push(decodePdfHex(m[1]));
  const litRe=/\(((?:\\.|[^\\)])*)\)\s*Tj\b/g;
  while((m=litRe.exec(raw))) tokens.push(unescapePdfLiteral(m[1]));
  return tokens.map(t=>t.replace(/\s+/g,' ').trim()).filter(Boolean);
}
function extractPdfText(buffer){return extractPdfTokens(buffer).join('\n');}

function parseMonthFromPayrollText(text){
  const monthMap={Jan:1,Feb:2,Mar:3,Apr:4,May:5,Jun:6,Jul:7,Aug:8,Sep:9,Oct:10,Nov:11,Dec:12};
  const m=text.match(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{2})\b/i);
  if(m){
    const key=m[1].slice(0,1).toUpperCase()+m[1].slice(1,3).toLowerCase();
    return `20${m[2]}-${String(monthMap[key]).padStart(2,'0')}`;
  }
  const dm=text.match(/\b(\d{2})\.(\d{2})\.(\d{4})\b/);
  return dm?`${dm[3]}-${dm[2]}`:'';
}

function parsePayrollEntries(textOrTokens){
  const tokens=Array.isArray(textOrTokens) ? textOrTokens : (textOrTokens && textOrTokens instanceof ArrayBuffer ? extractPdfTokens(textOrTokens) : String(textOrTokens||'').split(/\n+/).map(s=>s.trim()).filter(Boolean));
  const entries=[];
  const dateRe=/^\d{2}\.\d{2}\.\d{4}$/;
  const timeRe=/^\d{1,2}:\d{2}$/;
  const codeRe=/\b(5010|5011|5014|5024|5161|5211|5212)\b/;
  const numRe=/^[0-9]+(?:[\.,][0-9]+)?$/;
  const codePattern=/(5010|5011|5014|5024|5161|5211|5212)/;
  const toNum=s=>parseMoneyInput(String(s).replace(',','.'));

  for(let i=0;i<tokens.length;i++){
    if(!dateRe.test(tokens[i])) continue;
    const date=tokens[i];
    let from=null,to=null,codeIndex=-1;

    for(let k=1;k<=5 && i+k<tokens.length;k++){
      const t=tokens[i+k];
      if(timeRe.test(t)){
        if(!from) from=t;
        else if(!to) to=t;
      }
      if(codeRe.test(t)){codeIndex=i+k;break;}
      if(dateRe.test(t)) break;
    }
    if(codeIndex<0) continue;

    const codeMatch=tokens[codeIndex].match(codePattern);
    if(!codeMatch) continue;
    const code=codeMatch[1];

    let quantity=null;
    let extraValue=null;
    let quantityIndex=-1;
    let desc=tokens[codeIndex].replace(/^[\s\S]*?\b(?:5010|5011|5014|5024|5161|5211|5212)\s*:\s*/,'').trim();

    // The SAP PDF splits some values across separate text objects. In particular
    // 5011 appears as "... v.0:" then "00" then "1,25". The first pure number
    // after the description is the quantity only when it is not a continuation of
    // a clock such as the split "00" above.
    for(let k=codeIndex+1;k<Math.min(tokens.length,codeIndex+10);k++){
      const t=tokens[k];
      if(dateRe.test(t)) break;
      if(codeRe.test(t)) break;
      if(timeRe.test(t)) continue;
      if(t==='E'){
        if(k+1<tokens.length && numRe.test(tokens[k+1])) extraValue=toNum(tokens[k+1]);
        continue;
      }
      if(/:$/u.test(desc) && t==='00'){
        desc += '00';
        continue;
      }
      if(quantity===null && numRe.test(t)){
        quantity=toNum(t); quantityIndex=k; break;
      }
    }

    // A row like "5014: Sa 13-20 Uhr 0,64 E 1,20" contains both a
    // split descriptive number and the payable quantity. When the first value is
    // clearly a side value followed by E, keep the payable quantity in quantity.
    if(quantityIndex>=0 && tokens[quantityIndex+1]==='E' && numRe.test(tokens[quantityIndex+2]||'')){
      extraValue=toNum(tokens[quantityIndex+2]);
      quantity=quantity; // keep the first number as the source quantity
    }

    if(quantity===null || !Number.isFinite(quantity)) continue;
    const name=PAYROLL_CODE_LABELS[code]||desc||code;
    entries.push({id:uid('p'),date,from,to,code,name,quantity,extraValue});

    i=Math.max(i,codeIndex);
  }
  return entries;
}

async function parseTimeSheetPdf(file){
  if(!file) throw new Error('Keine Datei ausgewählt.');
  if(file.type && file.type!=='application/pdf' && !/\.pdf$/i.test(file.name||'')) throw new Error('Bitte eine PDF-Datei auswählen.');
  const buffer=await file.arrayBuffer();
  const tokens=extractPdfTokens(buffer);
  const text=tokens.join('\n');
  const entries=parsePayrollEntries(tokens);
  return {sourceMonth:parseMonthFromPayrollText(text),entries,textLength:text.length};
}

function forecastPayroll(importData){
  const d=load();
  const rates=d.payroll.rates;
  const rows=importData.entries.map(e=>{
    const cfg=rates[e.code]||{};
    const rate=cfg.rate==null?null:Number(cfg.rate);
    return {...e,rate,gross:rate==null?null:cents(e.quantity*rate)};
  });
  const documentedGross=cents(rows.filter(r=>r.gross!==null).reduce((s,r)=>s+r.gross,0));
  const unresolvedCodes=[...new Set(rows.filter(r=>r.gross===null).map(r=>r.code))];
  const salaryMonth=importData.sourceMonth?addMonthsKey(importData.sourceMonth,2):'';
  const salaryDate=salaryMonth?getLastBankworkdayForKey(salaryMonth):null;
  const baselineGross=4480.43;
  const baselineNet=2827.98;
  const netFactor=baselineNet/baselineGross;
  const modelNet=cents((baselineGross+documentedGross)*netFactor);
  return {
    rows,documentedGross,unresolvedCodes,
    forecastGross:cents(baselineGross+documentedGross),
    forecastLegalNet:modelNet,
    salaryMonth,salaryDate,
    supportObligations:2,
    method:`Modellwert auf Basis der dokumentierten Referenzwerte (${formatEUR(baselineNet)} / ${formatEUR(baselineGross)}). Nicht belegte Euro-Sätze werden nicht erfunden.`
  };
}

async function handlePayrollFile(file){
  try{
    const parsed=await parseTimeSheetPdf(file);
    if(!parsed.entries.length){
      alert('Im PDF wurden keine der 7 vorgesehenen Zeitlohnarten erkannt.');
      return;
    }
    const d=load();
    const importedAt=new Date().toISOString();
    const forecast=forecastPayroll(parsed);
    d.payroll.entries=parsed.entries;
    d.payroll.sourceMonth=parsed.sourceMonth;
    d.payroll.latestImport={name:file.name,size:file.size,importedAt,forecast};
    d.payroll.imports.unshift({name:file.name,sourceMonth:parsed.sourceMonth,importedAt,entryCount:parsed.entries.length});
    save(d);
    renderApp('payroll');
    showToast('Zeitnachweis importiert');
  }catch(e){
    console.error(e);
    alert(`Zeitnachweis konnte nicht verarbeitet werden. ${e?.message||''}`.trim());
  }
}

function renderPayroll(){
  const d=load();
  const imp=d.payroll.latestImport;
  const forecast=imp?.forecast;
  const entries=d.payroll.entries||[];
  return `<section class="page-head"><div><p class="eyebrow">ZEITNACHWEIS → PROGNOSE</p><h2>Gehalt</h2><p class="muted">Keine Dienste manuell eingeben. Nur Zeitnachweis hochladen. Die Prognose verändert niemals das Budget.</p></div><label class="btn btn-primary file-button" for="payroll-file">PDF hochladen<input id="payroll-file" class="file-input" type="file" accept="application/pdf,.pdf"></label></section>
  <div class="card"><div class="section-head"><div><h3>Letzter Import</h3><div class="sub">${imp?`${escapeHtml(imp.name)} · ${imp.sourceMonth||'Monat nicht erkannt'}`:'Noch kein Zeitnachweis importiert.'}</div></div>${imp?`<span class="pill">${entries.length} Einträge</span>`:''}</div>
  ${forecast?`<div class="forecast-grid"><div class="forecast-tile"><span>Auszahlungsmonat</span><strong>${forecast.salaryDate?forecast.salaryDate.toLocaleDateString('de-DE'):(forecast.salaryMonth||'—')}</strong></div><div class="forecast-tile"><span>Modell-Netto*</span><strong>${formatEUR(forecast.forecastLegalNet)}</strong></div><div class="forecast-tile"><span>Dokumentierter Zusatzbrutto</span><strong>${formatEUR(forecast.documentedGross)}</strong></div><div class="forecast-tile"><span>Unterhaltspflichten</span><strong>2</strong></div></div><div class="help" style="margin-top:10px">${escapeHtml(forecast.method)}</div>`:'<div class="notice">Die PDF-Auswertung liest den Monat und die Zeitlohnarten direkt aus dem Dokument. Die vollständige offizielle Pfändungstabelle 2026 ist im Quellenpaket nicht enthalten; deshalb werden dafür keine Tabellenwerte erfunden.</div>'}
  </div>
  ${entries.length?`<div class="card"><div class="section-head"><div><h3>Erkannte Zeitlohnarten</h3><div class="sub">${forecast?.unresolvedCodes?.length?'Für '+forecast.unresolvedCodes.join(', ')+' ist im Quellenpaket kein eindeutiger Euro-Satz belegt.':'Alle sieben vorgesehenen Codes wurden aus dem Dokument verarbeitet.'}</div></div></div><div class="payroll-table">${entries.map(e=>{const r=(d.payroll.rates||{})[e.code]||{};const amount=r.rate==null?null:cents(e.quantity*r.rate);return `<div class="pay-row"><div class="code-badge">${e.code}</div><div class="pay-main"><div class="list-title">${escapeHtml(e.name)}</div><div class="list-sub">${escapeHtml(e.date)}${e.from?` · ${escapeHtml(e.from)}–${escapeHtml(e.to||'')}`:''} · Menge ${String(e.quantity??'—').replace('.',',')}${e.extraValue!=null?` · Zusatz ${String(e.extraValue).replace('.',',')}`:''}</div></div><div class="pay-value">${amount==null?'Satz fehlt':formatEUR(amount)}</div></div>`}).join('')}</div></div>`:''}
  <div class="help">* Modellwert, keine Lohnabrechnung. Die Pfändung bleibt getrennt vom Budget.</div>`;
}

function getLastBankworkdayForKey(key){const [y,m]=key.split('-').map(Number);return getLastBankworkday(y,m-1);}
function addMonthsKey(key,delta){const [y,m]=key.split('-').map(Number);const d=new Date(y,m-1+delta,1);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;}
