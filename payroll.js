const SUPPORTED_CODES = ["5010","5011","5014","5024","5161","5211","5212"];
let pdfjsPromise = null;

async function loadPdfJs(){
  if(pdfjsPromise) return pdfjsPromise;
  pdfjsPromise = import("https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs")
    .then(mod=>{
      mod.GlobalWorkerOptions.workerSrc="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs";
      return mod;
    });
  return pdfjsPromise;
}

function parseDE(value){ return Number(String(value).replace(/\./g,"").replace(",",".")); }
function normalizeCode(name){ return SUPPORTED_CODES.find(code => name.includes(code)) || null; }

async function extractPdfText(file){
  const pdfjsLib=await loadPdfJs();
  const bytes=new Uint8Array(await file.arrayBuffer());
  const pdf=await pdfjsLib.getDocument({data:bytes}).promise;
  const pages=[];
  for(let i=1;i<=pdf.numPages;i++){
    const page=await pdf.getPage(i);
    const tc=await page.getTextContent();
    let line=""; const lines=[];
    for(const item of tc.items){
      line += item.str;
      if(item.hasEOL){ lines.push(line.trim()); line=""; } else line += " ";
    }
    if(line.trim()) lines.push(line.trim());
    pages.push(lines.join("\n"));
  }
  return pages.join("\n");
}

function parseTimeEntries(text){
  const entries=[];
  const lines=text.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
  for(const line of lines){
    const codeMatch=line.match(/\b(5010|5011|5014|5024|5161|5211|5212)\s*:\s*/);
    if(!codeMatch) continue;
    const code=codeMatch[1];
    const pre=line.slice(0,codeMatch.index).trim();
    const dateMatch=pre.match(/(\d{2}\.\d{2}\.\d{4})/);
    if(!dateMatch) continue;
    const date=dateMatch[1];
    const times=pre.match(/(\d{2}:\d{2})\s+(\d{2}:\d{2})/);
    const suffix=line.slice(codeMatch.index+codeMatch[0].length).trim();
    const nums=[...suffix.matchAll(/\b(\d+(?:[\.,]\d+)?)\b/g)].map(m=>m[1]);
    const quantity=nums.length?parseDE(nums[nums.length-1]):null;
    let mainQty=null, extraValue=null;
    if(code === "5014" && nums.length>=2){ mainQty=parseDE(nums[nums.length-2]); extraValue=quantity; }
    else mainQty=quantity;
    const info = suffix.replace(/\s+\d+(?:[\.,]\d+)?\s*(?:E\s*\d+(?:[\.,]\d+)?)?\s*$/i,"").trim();
    entries.push({
      id:`${date}-${code}-${entries.length}`,
      date,
      from:times?times[1]:null,
      to:times?times[2]:null,
      code,
      name:info || (load().payroll.rates[code]?.name || code),
      quantity:mainQty,
      extraValue
    });
  }
  return entries;
}

function sourceDerivedRate(code){
  const d=load(); return d.payroll.rates[code] || {rate:null,source:"Keine Rate"};
}
function estimateEntryGross(entry){
  const cfg=sourceDerivedRate(entry.code);
  if(cfg.rate===null || !Number.isFinite(Number(entry.quantity))) return null;
  return Number(entry.quantity)*Number(cfg.rate);
}

function computeForecast(entries, baseNet){
  let knownGross=0, unknown=0;
  const details=entries.map(e=>{
    const gross=estimateEntryGross(e);
    if(gross===null){ unknown++; return {...e,gross:null}; }
    knownGross += gross; return {...e,gross};
  });
  const referenceGross=4480.43;
  const referenceNet=Number(baseNet)||2827.98;
  const netFactor=referenceGross>0 ? referenceNet/referenceGross : 0;
  const estimatedNetAddition=knownGross*netFactor;
  return {details,knownGross,unknown,estimatedNetAddition,forecastNet:referenceNet+estimatedNetAddition};
}

function monthPlusTwo(yyyyMm){
  if(!/^\d{4}-\d{2}$/.test(yyyyMm)) return null;
  const [y,m]=yyyyMm.split("-").map(Number); const d=new Date(y,m-1,1); d.setMonth(d.getMonth()+2);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
}

async function handlePayrollFile(file){
  if(!file) return;
  try{
    const text=await extractPdfText(file);
    const entries=parseTimeEntries(text);
    const monthGuess=file.name.match(/(20\d{2})[-_](\d{2})/);
    const sourceMonth=monthGuess?`${monthGuess[1]}-${monthGuess[2]}`:"";
    const d=load();
    d.payroll.latestImport={fileName:file.name,uploadedAt:new Date().toISOString(),sourceMonth,textLength:text.length};
    d.payroll.entries=entries;
    d.payroll.sourceMonth=sourceMonth;
    save(d);
    renderApp("payroll");
    showToast(`${entries.length} Zeitlohnarten erkannt`);
  }catch(err){
    console.error(err);
    alert("Der Zeitnachweis konnte nicht ausgelesen werden. Beim ersten PDF-Import benötigt der Parser eine einmalige Internetverbindung, damit die PDF-Lese-Bibliothek geladen und anschließend offline zwischengespeichert werden kann.");
  }
}

function updatePayrollRate(code,value){
  const d=load(); const rate=value===""?null:parseDE(value);
  d.payroll.rates[code]={...(d.payroll.rates[code]||{}),rate:Number.isFinite(rate)?rate:null};
  save(d); renderApp("payroll");
}

function setSupportObligations(value){
  const d=load(); d.payroll.supportObligations=2; save(d); renderApp("payroll");
}

function renderPayroll(){
  const d=load();
  const entries=d.payroll.entries||[];
  const sourceMonth=d.payroll.sourceMonth || d.payroll.latestImport?.sourceMonth || "";
  const payoutMonth=monthPlusTwo(sourceMonth);
  const baseNet=2827.98;
  const forecast=computeForecast(entries,baseNet);
  const grouped=SUPPORTED_CODES.map(code=>({code,count:entries.filter(e=>e.code===code).length,rate:d.payroll.rates[code]}));

  const timeRows=entries.map(e=>{
    const rate=sourceDerivedRate(e.code).rate;
    const gross=estimateEntryGross(e);
    return `<div class="time-row"><div><div class="code">${e.code}</div><div class="time-date">${e.date}</div></div><div><div class="time-name">${escapeHtml(e.name)}</div><div class="time-date">${e.from&&e.to?`${e.from}–${e.to}`:"Tagesangabe"}</div></div><div class="time-qty">${Number(e.quantity||0).toLocaleString("de-DE",{maximumFractionDigits:2})}</div><div class="time-rate">${rate===null?"—":formatEUR(rate)}${gross!==null?`<div class="time-date">${formatEUR(gross)}</div>`:""}</div></div>`;
  }).join("");

  const rateRows=grouped.map(g=>`<div class="rate-row"><div class="code">${g.code}</div><div><div class="time-name">${escapeHtml(g.rate?.name||g.code)}</div><div class="time-date">${escapeHtml(g.rate?.source||"")}</div></div><input type="number" step="0.01" value="${g.rate?.rate===null||g.rate?.rate===undefined?"":Number(g.rate.rate).toFixed(2)}" placeholder="Rate €" onchange="updatePayrollRate('${g.code}',this.value)"></div>`).join("");

  return `<div class="card hero-card"><div class="hero-label">Gehaltsprognose · nicht budgetwirksam</div><div class="forecast-total">${formatEUR(forecast.forecastNet)}</div><div class="help">Basis: gesetzliches Netto ${formatEUR(baseNet)} aus der Bezügemitteilung 08/2026. Erkannte Zeitlohnarten werden getrennt verarbeitet.</div><div class="hero-meta" style="margin-top:16px"><div class="metric"><div class="metric-label">Zeitnachweis</div><div class="metric-value">${sourceMonth||"—"}</div></div><div class="metric"><div class="metric-label">Auszahlung</div><div class="metric-value">${payoutMonth||"—"}</div></div></div></div>

  <div class="card"><div class="section-head"><div><h2>Zeitnachweis hochladen</h2><div class="sub">PDF → Zeitlohnarten → Prognose</div></div></div><div class="file-drop"><input id="payroll-file" type="file" accept="application/pdf" onchange="handlePayrollFile(this.files[0])"><div class="help">Es werden ausschließlich die sieben in der Projektakte festgelegten Zeitlohnarten erkannt.</div></div>${d.payroll.latestImport?`<div style="margin-top:12px" class="notice"><strong>${escapeHtml(d.payroll.latestImport.fileName)}</strong><br>Importiert am ${new Date(d.payroll.latestImport.uploadedAt).toLocaleString("de-DE")} · ${entries.length} erkannte Einträge.</div>`:""}</div>

  <div class="card"><div class="section-head"><div><h2>Erkannte Zeitlohnarten</h2><div class="sub">5010 · 5011 · 5014 · 5024 · 5161 · 5211 · 5212</div></div><span class="pill">${entries.length} Einträge</span></div>${entries.length?`<div class="time-grid">${timeRows}</div>`:`<div class="empty">Noch kein Zeitnachweis importiert.</div>`}</div>

  <div class="card"><div class="section-head"><div><h2>Prognose-Sätze</h2><div class="sub">Nur dokumentierte oder manuell gesetzte Sätze werden verwendet.</div></div></div>${rateRows}</div>

  <div class="grid-2"><div class="kpi"><div class="small">Bekannte Zuschläge</div><div class="big">${formatEUR(forecast.knownGross)}</div><div class="small">Brutto-Schätzung</div></div><div class="kpi"><div class="small">Ohne Rate</div><div class="big">${forecast.unknown}</div><div class="small">Einträge nicht eingerechnet</div></div></div>

  <div class="card"><div class="section-head"><div><h2>Pfändung</h2><div class="sub">Getrennt vom Budget.</div></div><span class="pill pill-muted">2 Unterhaltspflichten</span></div><div class="notice"><strong>Pfändungsrelevantes Netto</strong><br>Die v35.5 hält das pfändungsrelevante Netto getrennt vom Budget und setzt 2 Unterhaltspflichten fest. Die konkrete offizielle 2026-Tabelle ist nicht als separates Tabellen-PDF im Projektmaterial enthalten; deshalb wird hier kein Tabellenwert erfunden.</div><div style="margin-top:12px" class="grid-2"><div class="metric"><div class="metric-label">Gesetzliches Netto 08/2026</div><div class="metric-value">${formatEUR(2827.98)}</div></div><div class="metric"><div class="metric-label">Pfändung/Abtretung 08/2026</div><div class="metric-value">${formatEUR(92.94)}</div></div></div></div>

  <div class="card"><div class="notice"><strong>Wichtig:</strong> Die Gehaltsprognose schreibt keinen Wert in Giro, Bargeld oder die laufende Budgetrechnung. Erst die spätere manuelle Lohnbuchung startet einen neuen Budgetzyklus.</div></div>`;
}
