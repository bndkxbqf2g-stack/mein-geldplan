let currentView = "overview";
const APP_VERSION = "v35 Final";

function euro(v){ return formatEUR(v); }

function showToast(message){
  let el=document.querySelector(".toast");
  if(!el){ el=document.createElement("div"); el.className="toast"; document.body.appendChild(el); }
  el.textContent=message;
  el.classList.add("show");
  clearTimeout(showToast.t);
  showToast.t=setTimeout(()=>el.classList.remove("show"),2000);
}

function sundayLabel(rec){
  if(rec === null) return `<div class="list-sub">Sonntagsabschluss</div><div class="list-value">heute keine Abhebungsempfehlung</div>`;
  return `<div class="list-sub">Ziel-Bargeld 120,00 €</div><div class="list-value">${euro(rec)} Empfehlung</div>`;
}

function renderOverview(){
  const b=budgetSnapshot();
  const rec=sundayWithdrawalRecommendation();
  const d=load();
  const salaryMonths=Object.keys(d.salaryCycles||{}).sort().reverse();
  const latestSalary=salaryMonths[0] ? d.salaryCycles[salaryMonths[0]] : null;
  const scheduled = scheduledSalaryDate(new Date().getFullYear(), new Date().getMonth());
  const bookedToday = isSalaryBookedFor(new Date());
  return `<div class="card hero-card"><div class="hero-label">Gesamtvermögen</div><div class="hero-amount">${euro(b.total)}</div><div class="hero-meta"><div class="metric"><div class="metric-label">Giro</div><div class="metric-value">${euro(b.giro)}</div></div><div class="metric"><div class="metric-label">Bargeld</div><div class="metric-value">${euro(b.bargeld)}</div></div></div></div>
  <div class="grid-2"><div class="kpi"><div class="small">Tagesbudget</div><div class="big">${euro(b.dayRate)}</div><div class="small">pro Tag · ${b.days} Resttage</div></div><div class="kpi"><div class="small">Wochensatz</div><div class="big">${euro(b.weekRate)}</div><div class="small">7 Tage</div></div></div>
  <div class="card"><div class="section-head"><div><h2>Budgetzyklus</h2><div class="sub">Nächster Lohn: ${b.nextSalary.toLocaleDateString("de-DE")}</div></div><span class="pill">${bookedToday?"Lohn heute gebucht":"1 Lohn / Monat"}</span></div><div class="list"><div class="list-row"><div class="list-main"><div class="list-title">Fixkosten</div><div class="list-sub">automatisch nur beim Lohn</div></div><div class="list-value">${euro(b.fix)}</div></div><div class="list-row"><div class="list-main"><div class="list-title">Wochenabschluss</div>${sundayLabel(rec)}</div></div></div><div class="grid-2" style="margin-top:14px"><button class="btn btn-primary" onclick="bookSalary()">€ Lohn buchen</button><button class="btn btn-secondary" onclick="changeCash()">Bargeld ±</button></div><div class="help" style="margin-top:10px">Lohnbuchungstag im aktuellen Monat: ${scheduled.toLocaleDateString("de-DE")}. Automatische Feiertagskalender sind bewusst nicht hinterlegt, weil sie nicht Bestandteil der Projektakte sind.</div></div>
  <div class="card"><div class="section-head"><div><h2>Letzter Lohn</h2><div class="sub">Nur bestätigte Lohnbuchungen.</div></div></div>${latestSalary?`<div class="list-row"><div class="list-main"><div class="list-title">${escapeHtml(latestSalary.month)}</div><div class="list-sub">Netto ${euro(latestSalary.net)} · Fixkosten ${euro(latestSalary.fix)}</div></div><div class="list-value">${latestSalary.net-latestSalary.fix>=0?"+":"−"}${euro(Math.abs(latestSalary.net-latestSalary.fix))}</div></div>`:`<div class="empty">Noch kein Lohnzyklus gebucht.</div>`}</div>`;
}

function renderBackup(){
  const d=load();
  return `<div class="card"><div class="section-head"><div><h2>Backup</h2><div class="sub">Lokale Daten exportieren, importieren oder zurücksetzen.</div></div><span class="pill">${APP_VERSION}</span></div><button class="btn btn-primary btn-full" onclick="exportBackup()">Backup herunterladen</button><div style="height:8px"></div><button class="btn btn-secondary btn-full" onclick="importBackup()">Backup importieren</button><div style="height:12px"></div><button class="btn btn-danger btn-full" onclick="confirmReset()">Daten zurücksetzen</button></div><div class="card"><div class="notice"><strong>Gespeichert:</strong> ${d.history.length} Verlaufseinträge · ${d.fix.length} Fixkostenpositionen · ${d.payroll.entries.length} Zeitlohnarten.</div><div style="height:10px"></div><div class="notice"><strong>Datenmigration:</strong> Schema v${DATA_SCHEMA_VERSION}. Beim Einlesen werden Werte auf Cent normalisiert, aber keine Budgetbuchungen neu berechnet.</div></div>`;
}

function downloadText(content,filename,type){
  const blob=new Blob([content],{type});
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");
  a.href=url; a.download=filename; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),0);
}

function exportBackup(){
  const payload={app:"Mein Geldplan",appVersion:APP_VERSION,schemaVersion:DATA_SCHEMA_VERSION,exportedAt:new Date().toISOString(),data:load()};
  downloadText(JSON.stringify(payload,null,2),`mein-geldplan-backup-${new Date().toISOString().slice(0,10)}.json`,`application/json`);
  showToast("Backup exportiert");
}

function importBackup(){
  const input=document.createElement("input");
  input.type="file"; input.accept="application/json,.json";
  input.onchange=async()=>{
    const file=input.files && input.files[0]; if(!file) return;
    try{
      const parsed=JSON.parse(await file.text());
      const payload=parsed && parsed.data && typeof parsed.data === "object" ? parsed.data : parsed;
      const validation=validateBackupPayload(payload);
      if(!validation.ok){ alert(validation.message); return; }
      if(!confirm("Backup importieren und die aktuell gespeicherten Daten ersetzen?")) return;
      save(payload); renderApp(currentView); showToast("Backup importiert und migriert");
    }catch(e){ alert("Backup konnte nicht gelesen werden."); }
  };
  input.click();
}

function confirmReset(){ if(confirm("Lokale Daten wirklich zurücksetzen?")) resetAll(); }

function updateConnectionPill(){
  const el=document.getElementById("connection-pill"); if(!el) return;
  el.innerHTML=`<span class="status-dot"></span> ${navigator.onLine?"Online · lokal gespeichert":"Offline · lokal gespeichert"}`;
}

function renderApp(view=currentView){
  currentView=view;
  document.querySelectorAll(".nav-item").forEach(btn=>btn.classList.toggle("active",btn.dataset.view===view));
  const map={overview:renderOverview,history:renderHistory,fixed:renderFixkosten,payroll:renderPayroll,backup:renderBackup};
  document.getElementById("app").innerHTML=map[view] ? map[view]() : renderOverview();
  updateConnectionPill();
}

document.addEventListener("click",e=>{
  const btn=e.target.closest(".nav-item");
  if(btn) renderApp(btn.dataset.view);
});
window.addEventListener("online",updateConnectionPill);
window.addEventListener("offline",updateConnectionPill);

renderApp();
if("serviceWorker" in navigator){ navigator.serviceWorker.register("sw.js").catch(()=>{}); }
