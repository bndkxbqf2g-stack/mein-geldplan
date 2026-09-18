function totalFix(){ return cents(load().fix.reduce((sum,item)=>sum+Number(item.amount||0),0)); }
function renderFixkosten(){
  const d=load();
  return `<section class="page-head"><div><p class="eyebrow">LAUFENDE KOSTEN</p><h2>Fixkosten</h2><p class="muted">Diese sechs Positionen werden ausschließlich bei einer Lohnbuchung automatisch abgezogen.</p></div><div class="sum-chip">${formatEUR(totalFix())}<span>pro Monat</span></div></section>
  <div class="card"><div class="list fixed-list">${d.fix.map((item,i)=>`<div class="fixed-row"><div><div class="list-title">${escapeHtml(item.label)}</div><div class="list-sub">Position ${i+1} · automatisch beim Lohn</div></div><div class="fixed-edit"><input class="money-input fix-input" data-index="${i}" inputmode="decimal" value="${Number(item.amount||0).toLocaleString('de-DE',{minimumFractionDigits:2,maximumFractionDigits:2})}" aria-label="Betrag ${escapeHtml(item.label)}"><span>€</span></div></div>`).join('')}</div><div class="help">Gesamtsumme: <strong>${formatEUR(totalFix())}</strong></div></div>`;
}
function updateFixkosten(index,value){
  const d=load();
  if(index<0 || index>=d.fix.length) return;
  const n=parseMoneyInput(value);
  if(!Number.isFinite(n)||n<0){showToast('Ungültiger Betrag');return;}
  d.fix[index].amount=cents(n); save(d); renderApp('fixed'); showToast('Fixkosten gespeichert');
}
