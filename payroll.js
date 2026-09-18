const SUPPORTED_CODES = ["5010","5011","5014","5024","5161","5211","5212"];

function parseMoneyInput(value){
  let raw = String(value ?? "").trim().replace(/€|\s/g, "");
  if(!raw) return NaN;
  const hasComma = raw.includes(",");
  const hasDot = raw.includes(".");
  if(hasComma && hasDot){
    raw = raw.lastIndexOf(",") > raw.lastIndexOf(".")
      ? raw.replace(/\./g, "").replace(",", ".")
      : raw.replace(/,/g, "");
  }else if(hasComma){
    raw = raw.replace(",", ".");
  }
  return Number(raw);
}

function parseDE(value){ return parseMoneyInput(value); }

function hexToText(hex){
  const clean = hex.replace(/\s+/g, "");
  if(!clean || clean.length % 2 !== 0) return "";
  const bytes = new Uint8Array(clean.length / 2);
  for(let i=0;i<bytes.length;i++) bytes[i] = parseInt(clean.slice(i*2, i*2+2), 16);
  try { return new TextDecoder("windows-1252").decode(bytes); } catch { return String.fromCharCode(...bytes); }
}

function decodePdfLiteral(content){
  let out = "";
  for(let i=0;i<content.length;i++){
    const ch = content[i];
    if(ch !== "\\"){ out += ch; continue; }
    i++;
    if(i >= content.length) break;
    const esc = content[i];
    const map = {n:"\n",r:"\r",t:"\t",b:"\b",f:"\f"};
    if(map[esc]){ out += map[esc]; continue; }
    if("()\\".includes(esc)){ out += esc; continue; }
    if(/[0-7]/.test(esc)){
      let oct = esc;
      for(let j=0;j<2 && i+1<content.length && /[0-7]/.test(content[i+1]);j++) oct += content[++i];
      out += String.fromCharCode(parseInt(oct,8));
      continue;
    }
    out += esc;
  }
  return out;
}

function extractPdfTextLocal(bytes){
  const text = new TextDecoder("latin1").decode(bytes);
  const pieces = [];

  const hexRe = /<([0-9A-Fa-f\s]+)>\s*Tj/g;
  let match;
  while((match = hexRe.exec(text))){
    pieces.push(hexToText(match[1]));
  }

  const literalRe = /\(((?:\\.|[^\\)])*)\)\s*Tj/g;
  while((match = literalRe.exec(text))){
    pieces.push(decodePdfLiteral(match[1]));
  }

  return pieces.filter(Boolean).join(" ").replace(/\s+/g, " ").replace(/\s*(\d{2}\.\d{2}\.\d{4})\s*/g, "\n$1 ").trim();
}

function monthFromText(text){
  const months = {Jan:1,Feb:2,Mär:3,Mar:3,Apr:4,May:5,Mai:5,Jun:6,Jul:7,Aug:8,Sep:9,Okt:10,Oct:10,Nov:11,Dez:12,Dec:12};
  const match = text.match(/\b(Jan|Feb|Mär|Mar|Apr|May|Mai|Jun|Jul|Aug|Sep|Okt|Oct|Nov|Dez|Dec)\s+(20\d{2}|\d{2})\b/i);
  if(!match) return "";
  const key = Object.keys(months).find(k => k.toLowerCase() === match[1].toLowerCase());
  if(!key) return "";
  const year = match[2].length === 2 ? 2000 + Number(match[2]) : Number(match[2]);
  return `${year}-${String(months[key]).padStart(2,"0")}`;
}

function parseTimeEntries(text){
  const entries = [];
  const lines = text.split(/\r?\n/).map(x => x.trim()).filter(Boolean);
  for(const line of lines){
    const codeMatch = line.match(/\b(5010|5011|5014|5024|5161|5211|5212)\s*:\s*/);
    if(!codeMatch) continue;
    const code = codeMatch[1];
    const pre = line.slice(0, codeMatch.index).trim();
    const dateMatch = pre.match(/(\d{2}\.\d{2}\.\d{4})/);
    if(!dateMatch) continue;
    const date = dateMatch[1];
    const times = pre.match(/(\d{2}:\d{2})\s+(\d{2}:\d{2})/);
    const suffix = line.slice(codeMatch.index + codeMatch[0].length).trim();
    const nums = [...suffix.matchAll(/\b(\d+(?:[\.,]\d+)?)\b/g)].map(m => m[1]);
    if(!nums.length) continue;
    const quantity = parseDE(nums[nums.length - 1]);
    let mainQty = quantity;
    let extraValue = null;
    if(code === "5014" && nums.length >= 2){
      mainQty = parseDE(nums[nums.length - 2]);
      extraValue = quantity;
    }
    const info = suffix.replace(/\s+\d+(?:[\.,]\d+)?\s*(?:E\s*\d+(?:[\.,]\d+)?)?\s*$/i, "").trim();
    const d = load();
    entries.push({
      id:`${date}-${code}-${entries.length}`,
      date,
      from:times ? times[1] : null,
      to:times ? times[2] : null,
      code,
      name:info || (d.payroll.rates[code]?.name || code),
      quantity:Number.isFinite(mainQty) ? mainQty : null,
      extraValue:Number.isFinite(extraValue) ? extraValue : null
    });
  }
  return entries;
}

function sourceDerivedRate(code){
  const d = load();
  return d.payroll.rates[code] || {name:code,rate:null,source:"Keine Rate"};
}

function estimateEntryGross(entry){
  const cfg = sourceDerivedRate(entry.code);
  if(cfg.rate === null || !Number.isFinite(Number(entry.quantity))) return null;
  return cents(Number(entry.quantity) * Number(cfg.rate));
}

function computeForecast(entries, baseline){
  let knownGross = 0;
  let unknown = 0;
  const details = entries.map(e => {
    const gross = estimateEntryGross(e);
    if(gross === null){ unknown++; return {...e,gross:null}; }
    knownGross = cents(knownGross + gross);
    return {...e,gross};
  });
  const referenceGross = Number(baseline.gross) || 0;
  const referenceNet = Number(baseline.statutoryNet) || 0;
  const netFactor = referenceGross > 0 ? referenceNet / referenceGross : 0;
  const estimatedNetAddition = cents(knownGross * netFactor);
  const statutoryNetForecast = cents(referenceNet + estimatedNetAddition);
  return {details,knownGross,unknown,estimatedNetAddition,statutoryNetForecast};
}

function monthPlusTwo(yyyyMm){
  if(!/^\d{4}-\d{2}$/.test(yyyyMm)) return null;
  const [y,m] = yyyyMm.split("-").map(Number);
  const d = new Date(y,m-1,1);
  d.setMonth(d.getMonth()+2);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
}

function monthLabel(yyyyMm){
  if(!/^\d{4}-\d{2}$/.test(yyyyMm)) return "—";
  const [y,m] = yyyyMm.split("-").map(Number);
  return new Date(y,m-1,1).toLocaleDateString("de-DE",{month:"long",year:"numeric"});
}

async function handlePayrollFile(file){
  if(!file) return;
  try{
    const bytes = new Uint8Array(await file.arrayBuffer());
    const text = extractPdfTextLocal(bytes);
    const entries = parseTimeEntries(text);
    const sourceMonth = monthFromText(text);
    if(!entries.length){
      alert("Es wurden keine der sieben festgelegten Zeitlohnarten im PDF erkannt.");
      return;
    }
    if(!sourceMonth){
      alert("Der Monat des Zeitnachweises konnte im PDF nicht eindeutig erkannt werden.");
      return;
    }
    const d = load();
    d.payroll.latestImport = {fileName:file.name,uploadedAt:new Date().toISOString(),sourceMonth,textLength:text.length};
    d.payroll.entries = entries;
    d.payroll.sourceMonth = sourceMonth;
    save(d);
    renderApp("payroll");
    showToast(`${entries.length} Zeitlohnarten erkannt · ${monthLabel(sourceMonth)}`);
  }catch(err){
    console.error(err);
    alert("Der Zeitnachweis konnte nicht ausgelesen werden. Die lokale PDF-Erkennung erwartet einen textbasierten Zeitnachweis wie die bereitgestellten Projekt-PDFs.");
  }
}

function updatePayrollRate(code,value){
  const d = load();
  if(!SUPPORTED_CODES.includes(code)) return;
  const raw = String(value).trim();
  const rate = raw === "" ? null : parseDE(raw);
  if(raw !== "" && (!Number.isFinite(rate) || rate < 0)){
    alert("Bitte einen gültigen Satz eingeben.");
    renderApp("payroll");
    return;
  }
  d.payroll.rates[code] = {...(d.payroll.rates[code] || {name:code,source:"Manuell"}),rate: raw === "" ? null : cents(rate), source: raw === "" ? "Keine Rate" : "Manuell gesetzt"};
  save(d);
  renderApp("payroll");
}

function renderPayroll(){
  const d = load();
  const entries = d.payroll.entries || [];
  const sourceMonth = d.payroll.sourceMonth || d.payroll.latestImport?.sourceMonth || "";
  const payoutMonth = monthPlusTwo(sourceMonth);
  const baseline = d.payroll.baseline;
  const forecast = computeForecast(entries,baseline);
  const grouped = SUPPORTED_CODES.map(code => ({code,count:entries.filter(e=>e.code===code).length,rate:d.payroll.rates[code]}));
  const allRatesKnown = forecast.unknown === 0;

  const timeRows = entries.map(e=>{
    const rate = sourceDerivedRate(e.code).rate;
    const gross = estimateEntryGross(e);
    return `<div class="time-row"><div><div class="code">${e.code}</div><div class="time-date">${escapeHtml(e.date)}</div></div><div><div class="time-name">${escapeHtml(e.name)}</div><div class="time-date">${e.from&&e.to?`${e.from}–${e.to}`:"Tagesangabe"}</div></div><div class="time-qty">${e.quantity===null?"—":Number(e.quantity).toLocaleString("de-DE",{maximumFractionDigits:2})}</div><div class="time-rate">${rate===null?"—":formatEUR(rate)}${gross!==null?`<div class="time-date">${formatEUR(gross)}</div>`:""}</div></div>`;
  }).join("");

  const rateRows = grouped.map(g=>`<div class="rate-row"><div class="code">${g.code}</div><div><div class="time-name">${escapeHtml(g.rate?.name||g.code)}</div><div class="time-date">${escapeHtml(g.rate?.source||"")}</div></div><input type="number" step="0.01" min="0" value="${g.rate?.rate===null||g.rate?.rate===undefined?"":Number(g.rate.rate).toFixed(2)}" placeholder="Rate €" onchange="updatePayrollRate('${g.code}',this.value)"></div>`).join("");

  const payoutCard = allRatesKnown && sourceMonth
    ? `<div class="card"><div class="section-head"><div><h2>Auszahlungsprognose</h2><div class="sub">Zwei Monate nach dem Zeitnachweis · Pfändung noch nicht abgezogen.</div></div><span class="pill pill-warn">vor Pfändung</span></div><div class="forecast-total">${formatEUR(forecast.statutoryNetForecast)}</div><div class="help">Das ist eine Netto-Schätzung aus dem dokumentierten August-Basiswert und den berechenbaren Zeitlohnarten. Der tatsächliche Auszahlungsbetrag kann ohne die vollständige offizielle Pfändungstabelle 2026 nicht abschließend berechnet werden.</div></div>`
    : `<div class="card"><div class="section-head"><div><h2>Auszahlungsprognose</h2><div class="sub">Zwei Monate nach dem Zeitnachweis</div></div></div><div class="notice"><strong>Noch nicht abschließbar.</strong><br>${forecast.unknown ? `${forecast.unknown} erkannte Zeitlohnart(en) haben noch keinen verwendbaren Satz.` : ""} Für den endgültigen Auszahlungsbetrag fehlt außerdem die im Projektauftrag geforderte offizielle Pfändungstabelle 2026 im bereitgestellten Projektmaterial.</div></div>`;

  return `<div class="card hero-card"><div class="hero-label">Gehaltsprognose · nicht budgetwirksam</div><div class="forecast-total">${sourceMonth && entries.length ? formatEUR(forecast.statutoryNetForecast) : "—"}</div><div class="help">Basis: gesetzliches Netto ${formatEUR(baseline.statutoryNet)} aus der Bezügemitteilung 08/2026. Die Prognose verändert niemals Giro, Bargeld oder den Budgetzyklus.</div><div class="hero-meta" style="margin-top:16px"><div class="metric"><div class="metric-label">Zeitnachweis</div><div class="metric-value">${sourceMonth?monthLabel(sourceMonth):"—"}</div></div><div class="metric"><div class="metric-label">Auszahlung</div><div class="metric-value">${payoutMonth?monthLabel(payoutMonth):"—"}</div></div></div></div>

  <div class="card"><div class="section-head"><div><h2>Zeitnachweis hochladen</h2><div class="sub">Lokale PDF-Erkennung · keine externe Bibliothek</div></div></div><div class="file-drop"><input id="payroll-file" type="file" accept="application/pdf" onchange="handlePayrollFile(this.files[0])"><div class="help">Es werden ausschließlich 5010, 5011, 5014, 5024, 5161, 5211 und 5212 erkannt. Der Monat wird aus dem PDF-Inhalt gelesen, nicht aus dem Dateinamen.</div></div>${d.payroll.latestImport?`<div style="margin-top:12px" class="notice"><strong>${escapeHtml(d.payroll.latestImport.fileName)}</strong><br>Importiert am ${new Date(d.payroll.latestImport.uploadedAt).toLocaleString("de-DE")} · ${entries.length} erkannte Einträge · ${sourceMonth?monthLabel(sourceMonth):"Monat unbekannt"}.</div>`:""}</div>

  <div class="card"><div class="section-head"><div><h2>Erkannte Zeitlohnarten</h2><div class="sub">5010 · 5011 · 5014 · 5024 · 5161 · 5211 · 5212</div></div><span class="pill">${entries.length} Einträge</span></div>${entries.length?`<div class="time-grid">${timeRows}</div>`:`<div class="empty">Noch kein Zeitnachweis importiert.</div>`}</div>

  <div class="card"><div class="section-head"><div><h2>Prognose-Sätze</h2><div class="sub">Nur dokumentierte oder von dir manuell gesetzte Sätze werden verwendet.</div></div></div>${rateRows}</div>

  <div class="grid-2"><div class="kpi"><div class="small">Bekannte Zuschläge</div><div class="big">${formatEUR(forecast.knownGross)}</div><div class="small">Brutto-Schätzung</div></div><div class="kpi"><div class="small">Ohne Rate</div><div class="big">${forecast.unknown}</div><div class="small">Einträge nicht eingerechnet</div></div></div>

  ${payoutCard}

  <div class="card"><div class="section-head"><div><h2>Pfändung</h2><div class="sub">Fest 2 Unterhaltspflichten · getrennt vom Budget</div></div><span class="pill pill-muted">2 Unterhaltspflichten</span></div><div class="notice"><strong>Pfändungsrelevantes Netto</strong><br>Die bereitgestellten Projekt-PDFs enthalten die Mitteilung zur Erhöhung der Pfändungsfreigrenzen ab 01.07.2026, aber nicht die vollständige offizielle Pfändungstabelle 2026. Deshalb wird kein Tabellenwert erfunden.</div><div style="margin-top:12px" class="grid-2"><div class="metric"><div class="metric-label">Gesetzliches Netto 08/2026</div><div class="metric-value">${formatEUR(2827.98)}</div></div><div class="metric"><div class="metric-label">Pfändung/Abtretung 08/2026</div><div class="metric-value">${formatEUR(92.94)}</div></div></div><div style="margin-top:12px" class="help">Referenz aus der vorhandenen Bezügemitteilung; nicht als allgemeiner Pfändungssatz verwendet.</div></div>

  <div class="card"><div class="notice"><strong>Budgetschutz:</strong> Der Zeitnachweis und jede Gehaltsprognose sind rein informativ. Nur eine bestätigte Lohnbuchung startet den neuen Budgetzyklus.</div></div>`;
}
