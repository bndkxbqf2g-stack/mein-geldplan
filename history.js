function addHistoryEntry(type, amount, description, date = new Date()){
  const allowed = ["Einnahme", "Ausgabe", "Abheben", "Lohn"];
  if(!allowed.includes(type)) return false;
  const value = cents(amount);
  if(!Number.isFinite(value) || value <= 0) return false;
  const d = load();
  d.history.unshift({
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    type,
    amount: value,
    description: description || type,
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

  if(entry.type === "Einnahme") d.giro = cents(d.giro - entry.amount);
  if(entry.type === "Ausgabe") d.giro = cents(d.giro + entry.amount);
  if(entry.type === "Abheben"){
    d.giro = cents(d.giro + entry.amount);
    d.bargeld = Math.max(0, cents(d.bargeld - entry.amount));
  }
  if(entry.type === "Lohn"){
    d.giro = cents(d.giro - Number(entry.budgetDelta ?? entry.amount));
    const match = String(entry.description || "").match(/Lohn (\d{4}-\d{2})/);
    if(match) delete d.salaryCycles[match[1]];
  }

  d.history.splice(idx, 1);
  save(d);
  renderApp("history");
  showToast("Buchung rückgängig");
}

function historyForm(){
  return `
    <div class="card">
      <div class="section-head"><div><h2>Buchung erfassen</h2><div class="sub">Einnahmen und Ausgaben verändern ausschließlich das Giro. Bargeld wird nicht automatisch verändert.</div></div></div>
      <div class="grid-2">
        <button class="btn btn-secondary" onclick="manualBooking('Einnahme')">＋ Einnahme</button>
        <button class="btn btn-secondary" onclick="manualBooking('Ausgabe')">− Ausgabe</button>
        <button class="btn btn-secondary" onclick="manualBooking('Abheben')">↥ Abheben</button>
        <button class="btn btn-secondary" onclick="bookSalary()">€ Lohn</button>
      </div>
    </div>`;
}

function manualBooking(type){
  const raw = prompt(`${type}: Betrag in €`);
  if(raw === null) return;
  const amount = cents(parseMoneyInput(raw));
  if(!Number.isFinite(amount) || amount <= 0){
    alert("Bitte einen gültigen Betrag eingeben.");
    return;
  }
  const description = (prompt("Beschreibung") || type).trim() || type;
  const d = load();

  if(type === "Einnahme") d.giro = cents(d.giro + amount);
  if(type === "Ausgabe") d.giro = cents(d.giro - amount);
  if(type === "Abheben"){
    d.giro = cents(d.giro - amount);
    d.bargeld = cents(d.bargeld + amount);
  }

  d.history.unshift({
    id:`${Date.now()}-${Math.random().toString(16).slice(2)}`,
    type,
    amount,
    description,
    timestamp:new Date().toISOString()
  });
  save(d);
  renderApp("history");
  showToast("Buchung gespeichert");
}

function historyDisplay(entry){
  const dt = new Date(entry.timestamp);
  let value = formatEUR(entry.amount);
  if(entry.type === "Einnahme" || entry.type === "Lohn") value = `+${value}`;
  if(entry.type === "Ausgabe") value = `−${value}`;
  return `<div class="list-row">
    <div class="list-main"><div class="list-title">${escapeHtml(entry.description || entry.type)}</div><div class="list-sub">${escapeHtml(entry.type)} · ${dt.toLocaleDateString("de-DE")} ${dt.toLocaleTimeString("de-DE",{hour:"2-digit",minute:"2-digit"})}${entry.type === "Abheben" ? " · Giro → Bargeld" : ""}</div></div>
    <div style="display:flex;align-items:center;gap:8px"><div class="list-value">${value}</div><button class="delete-mini" onclick="undoHistory('${entry.id}')" title="Rückgängig">↶</button></div>
  </div>`;
}

function renderHistory(){
  const d = load();
  const rows = d.history.map(historyDisplay).join("");
  return `${historyForm()}<div class="card"><div class="section-head"><div><h2>Verlauf</h2><div class="sub">Jede Buchung enthält Datum, Uhrzeit, Betrag, Beschreibung und Rückgängig.</div></div><span class="pill">${d.history.length} Buchungen</span></div>${rows ? `<div class="list">${rows}</div>` : `<div class="empty">Noch keine Buchungen vorhanden.</div>`}</div>`;
}

function escapeHtml(v){
  return String(v).replace(/[&<>'"]/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;","\"":"&quot;"}[ch]));
}

function formatEUR(v){
  return new Intl.NumberFormat("de-DE",{style:"currency",currency:"EUR"}).format(Number(v)||0);
}
