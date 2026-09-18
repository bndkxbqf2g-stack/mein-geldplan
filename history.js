function addHistoryEntry(type, amount, description, date = new Date()){
  const d = load();
  const value = Math.round(Number(amount) * 100) / 100;
  if(!Number.isFinite(value) || value <= 0) return false;
  d.history.unshift({
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    type,
    amount: value,
    description: description || "",
    timestamp: date.toISOString()
  });
  save(d);
  return true;
}

function undoHistory(id){
  const d = load();
  const idx = d.history.findIndex(x => x.id === id);
  if(idx < 0) return;
  const entry = d.history[idx];

  if(entry.type === "Einnahme") d.giro -= entry.amount;
  if(entry.type === "Ausgabe") d.giro += entry.amount;
  if(entry.type === "Abheben"){
    d.giro += entry.amount;
    d.bargeld -= entry.amount;
  }
  if(entry.type === "Lohn") d.giro -= Number(entry.budgetDelta ?? entry.amount);

  if(entry.type === "Lohn") {
    const match = entry.description.match(/Lohn (\d{4}-\d{2})/);
    if(match) delete d.salaryCycles[match[1]];
  }

  d.history.splice(idx,1);
  save(d);
  renderApp("history");
  showToast("Buchung rückgängig");
}

function historyForm(){
  return `
    <div class="card">
      <div class="section-head"><div><h2>Buchung erfassen</h2><div class="sub">Verlauf bleibt manuell steuerbar.</div></div></div>
      <div class="grid-2">
        <button class="btn btn-secondary" onclick="manualBooking('Einnahme')">＋ Einnahme</button>
        <button class="btn btn-secondary" onclick="manualBooking('Ausgabe')">− Ausgabe</button>
        <button class="btn btn-secondary" onclick="manualBooking('Abheben')">↥ Abheben</button>
        <button class="btn btn-secondary" onclick="bookSalary()">€ Lohn</button>
      </div>
    </div>`;
}

function manualBooking(type){
  const amount = Number(prompt(`${type}: Betrag in €`));
  if(!Number.isFinite(amount) || amount <= 0) return;
  const description = prompt("Beschreibung") || type;
  const d = load();
  if(type === "Einnahme" || type === "Lohn") d.giro += amount;
  if(type === "Ausgabe") d.giro -= amount;
  if(type === "Abheben"){ d.giro -= amount; d.bargeld += amount; }
  d.history.unshift({
    id:`${Date.now()}-${Math.random().toString(16).slice(2)}`,
    type, amount:Math.round(amount*100)/100, description,
    timestamp:new Date().toISOString()
  });
  save(d); renderApp("history");
}

function renderHistory(){
  const d = load();
  const rows = d.history.map(entry => {
    const dt = new Date(entry.timestamp);
    const sign = entry.type === "Ausgabe" ? "−" : "+";
    return `<div class="list-row">
      <div class="list-main"><div class="list-title">${escapeHtml(entry.description || entry.type)}</div><div class="list-sub">${escapeHtml(entry.type)} · ${dt.toLocaleDateString("de-DE")} ${dt.toLocaleTimeString("de-DE",{hour:"2-digit",minute:"2-digit"})}</div></div>
      <div style="display:flex;align-items:center;gap:8px"><div class="list-value">${sign}${formatEUR(entry.amount)}</div><button class="delete-mini" onclick="undoHistory('${entry.id}')" title="Rückgängig">↶</button></div>
    </div>`;
  }).join("");
  return `${historyForm()}<div class="card"><div class="section-head"><div><h2>Verlauf</h2><div class="sub">Jede Buchung mit Rückgängig-Funktion.</div></div><span class="pill">${d.history.length} Buchungen</span></div>${rows ? `<div class="list">${rows}</div>` : `<div class="empty">Noch keine Buchungen vorhanden.</div>`}</div>`;
}

function escapeHtml(v){ return String(v).replace(/[&<>'"]/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;","\"":"&quot;"}[ch])); }
function formatEUR(v){ return new Intl.NumberFormat("de-DE",{style:"currency",currency:"EUR"}).format(Number(v)||0); }
