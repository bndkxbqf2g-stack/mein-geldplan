let currentView = "overview";

function euro(v){return new Intl.NumberFormat("de-DE",{style:"currency",currency:"EUR"}).format(Number(v)||0)}
function showToast(message){
  let el=document.querySelector(".toast");
  if(!el){el=document.createElement("div");el.className="toast";document.body.appendChild(el);}
  el.textContent=message;el.classList.add("show");clearTimeout(showToast.t);showToast.t=setTimeout(()=>el.classList.remove("show"),1800);
}
function renderOverview(){
  const b=budgetSnapshot();
  const rec=sundayWithdrawalRecommendation();
  const d=load();
  const salaryMonths=Object.keys(d.salaryCycles||{}).sort().reverse();
  const latestSalary=salaryMonths[0] ? d.salaryCycles[salaryMonths[0]] : null;
  return `<div class="card hero-card"><div class="hero-label">Gesamtvermögen</div><div class="hero-amount">${euro(b.total)}</div><div class="hero-meta"><div class="metric"><div class="metric-label">Giro</div><div class="metric-value">${euro(b.giro)}</div></div><div class="metric"><div class="metric-label">Bargeld</div><div class="metric-value">${euro(b.bargeld)}</div></div></div></div>
  <div class="grid-2"><div class="kpi"><div class="small">Tagesbudget</div><div class="big">${euro(b.dayRate)}</div><div class="small">pro Tag</div></div><div class="kpi"><div class="small">Wochensatz</div><div class="big">${euro(b.weekRate)}</div><div class="small">7 Tage</div></div></div>
  <div class="card"><div class="section-head"><div><h2>Budgetzyklus</h2><div class="sub">Nächster Lohn: ${b.nextSalary.toLocaleDateString("de-DE")}</div></div><span class="pill">${b.days} Resttage</span></div><div class="list"><div class="list-row"><div class="list-main"><div class="list-title">Fixkosten</div><div class="list-sub">automatisch nur beim Lohn</div></div><div class="list-value">${euro(b.fix)}</div></div><div class="list-row"><div class="list-main"><div class="list-title">Wochenabschluss</div><div class="list-sub">Ziel-Bargeld 120,00 €</div></div><div class="list-value">${euro(rec)} Empfehlung</div></div></div><div class="grid-2" style="margin-top:14px"><button class="btn btn-primary" onclick="bookSalary()">€ Lohn buchen</button><button class="btn btn-secondary" onclick="changeCash()">Bargeld ±</button></div></div>
  <div class="card"><div class="section-head"><div><h2>Letzter Lohn</h2><div class="sub">Nur bestätigte Lohnbuchungen.</div></div></div>${latestSalary?`<div class="list-row"><div class="list-main"><div class="list-title">${escapeHtml(latestSalary.month)}</div><div class="list-sub">Netto ${euro(latestSalary.net)} · Fixkosten ${euro(latestSalary.fix)}</div></div><div class="list-value">+${euro(latestSalary.net-latestSalary.fix)}</div></div>`:`<div class="empty">Noch kein Lohnzyklus gebucht.</div>`}</div>`;
}

function renderBackup(){
  const d=load();
  return `<div class="card"><div class="section-head"><div><h2>Backup</h2><div class="sub">Lokale Daten exportieren oder zurücksetzen.</div></div></div><button class="btn btn-primary btn-full" onclick="exportBackup()">Backup herunterladen</button><div style="height:8px"></div><button class="btn btn-secondary btn-full" onclick="importBackup()">Backup importieren</button><div style="height:12px"></div><button class="btn btn-danger btn-full" onclick="confirmReset()">Daten zurücksetzen</button></div><div class="card"><div class="notice"><strong>Lokale Speicherung:</strong> ${Object.keys(d.history||{}).length} Verlaufseinträge, ${d.fix.length} Fixkostenpositionen und ${d.payroll.entries.length} Zeitlohnarten im Browser gespeichert.</div></div>`;
}
function exportBackup(){const blob=new Blob([JSON.stringify(load(),null,2)],{type:"application/json"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=`mein-geldplan-backup-${new Date().toISOString().slice(0,10)}.json`;a.click();URL.revokeObjectURL(url);showToast("Backup exportiert");}
function importBackup(){const input=document.createElement("input");input.type="file";input.accept="application/json";input.onchange=async()=>{const file=input.files[0];if(!file)return;try{const parsed=JSON.parse(await file.text());save(parsed);location.reload();}catch(e){alert("Backup konnte nicht gelesen werden.");}};input.click();}
function confirmReset(){if(confirm("Lokale Daten wirklich zurücksetzen?")) resetAll();}

function renderApp(view=currentView){
  currentView=view;
  document.querySelectorAll(".nav-item").forEach(btn=>btn.classList.toggle("active",btn.dataset.view===view));
  const map={overview:renderOverview,history:renderHistory,fixed:renderFixkosten,payroll:renderPayroll,backup:renderBackup};
  document.getElementById("app").innerHTML=map[view] ? map[view]() : renderOverview();
}

document.addEventListener("click",e=>{const btn=e.target.closest(".nav-item");if(btn) renderApp(btn.dataset.view);});

renderApp();
if("serviceWorker" in navigator){ navigator.serviceWorker.register("sw.js").catch(()=>{}); }
