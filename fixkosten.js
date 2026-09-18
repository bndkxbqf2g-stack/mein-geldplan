function totalFix(){
  return cents(load().fix.reduce((sum, item) => sum + (Number(item[1]) || 0), 0));
}

function updateFix(i, value){
  const d = load();
  if(!d.fix[i]) return;
  d.fix[i][1] = Math.max(0, cents(parseMoneyInput(value)));
  save(d);
  renderApp("fixed");
}

function updateFixName(i, value){
  const d = load();
  if(!d.fix[i]) return;
  d.fix[i][0] = String(value).trim() || d.fix[i][0];
  save(d);
  renderApp("fixed");
}

function renderFixkosten(){
  const d = load();
  const rows = d.fix.map((f,i) => `<div class="fix-row">
    <input type="text" value="${escapeHtml(f[0])}" onchange="updateFixName(${i},this.value)" aria-label="Bezeichnung ${i+1}">
    <input type="number" step="0.01" min="0" value="${Number(f[1]).toFixed(2)}" onchange="updateFix(${i},this.value)" aria-label="Betrag ${escapeHtml(f[0])}">
  </div>`).join("");
  return `<div class="card"><div class="section-head"><div><h2>Fixkosten</h2><div class="sub">Sechs feste Positionen · einzeln editierbar · automatischer Abzug ausschließlich beim Lohn.</div></div><span class="pill">6 Positionen</span></div>${rows}<div class="total-row"><span>Gesamtsumme</span><span>${formatEUR(totalFix())}</span></div></div>`;
}
