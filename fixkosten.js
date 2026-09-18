function totalFix(){ return load().fix.reduce((sum,item)=>sum + (Number(item[1]) || 0), 0); }

function updateFix(i, value){
  const d = load();
  d.fix[i][1] = Math.max(0, Math.round((Number(value)||0)*100)/100);
  save(d); renderApp("fixed");
}

function updateFixName(i, value){
  const d=load(); d.fix[i][0]=value.trim() || d.fix[i][0]; save(d); renderApp("fixed");
}

function addFix(){
  const name=(prompt("Name der Fixkosten")||"").trim();
  if(!name) return;
  const amount=Number(prompt("Betrag in €")||0);
  if(!Number.isFinite(amount) || amount<0) return;
  const d=load(); d.fix.push([name,Math.round(amount*100)/100]); save(d); renderApp("fixed");
}

function deleteFix(i){
  const d=load(); if(d.fix.length<=1) return;
  d.fix.splice(i,1); save(d); renderApp("fixed");
}

function renderFixkosten(){
  const d=load();
  const rows=d.fix.map((f,i)=>`<div class="fix-row">
    <input type="text" value="${escapeHtml(f[0])}" onchange="updateFixName(${i},this.value)">
    <input type="number" step="0.01" min="0" value="${Number(f[1]).toFixed(2)}" onchange="updateFix(${i},this.value)">
    <button class="delete-mini" onclick="deleteFix(${i})" title="Entfernen">×</button>
  </div>`).join("");
  return `<div class="card"><div class="section-head"><div><h2>Fixkosten</h2><div class="sub">Automatischer Abzug ausschließlich bei der Lohnbuchung.</div></div><button class="btn btn-secondary" onclick="addFix()">＋</button></div>${rows}<div class="total-row"><span>Gesamtsumme</span><span>${formatEUR(totalFix())}</span></div></div>`;
}
