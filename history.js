function addTransaction(type,amount,description,timestamp=new Date()){
  const d=load();
  const value=Math.max(0,cents(amount));
  if(!Number.isFinite(value)||value<=0) return {ok:false,message:'Betrag muss größer als 0 sein.'};
  const deltaGiro = type==='Einnahme' ? value : type==='Ausgabe' ? -value : type==='Abheben' ? -value : 0;
  const deltaCash = type==='Abheben' ? value : 0;
  d.giro=cents(d.giro+deltaGiro); d.bargeld=Math.max(0,cents(d.bargeld+deltaCash));
  d.history.unshift({id:uid('h'),type,amount:value,description:String(description||type),timestamp:new Date(timestamp).toISOString(),deltaGiro,deltaCash,salaryCycle:null,undone:false});
  save(d); return {ok:true};
}
function undoTransaction(id){
  const d=load(); const item=d.history.find(x=>x.id===id);
  if(!item || item.undone) return {ok:false,message:'Buchung bereits rückgängig gemacht.'};
  d.giro=cents(d.giro-item.deltaGiro); d.bargeld=Math.max(0,cents(d.bargeld-item.deltaCash)); item.undone=true;
  if(item.salaryCycle && d.salaryCycles[item.salaryCycle]) delete d.salaryCycles[item.salaryCycle];
  save(d); return {ok:true};
}
function renderHistory(){
  const d=load();
  const rows=d.history.map(item=>{
    const sign=item.type==='Einnahme'?'+':item.type==='Ausgabe'?'−':item.type==='Abheben'?'⇄':'+';
    const state=item.undone?' rückgängig':'';
    return `<div class="history-row ${item.undone?'is-undone':''}"><div class="history-icon">${item.type==='Einnahme'?'↗':item.type==='Ausgabe'?'↘':item.type==='Abheben'?'⇄':'€'}</div><div class="history-main"><div class="list-title">${escapeHtml(item.description)}</div><div class="list-sub">${escapeHtml(item.type)} · ${formatDateTime(item.timestamp)}${state}</div></div><div class="history-right"><div class="list-value">${sign}${formatEUR(item.amount)}</div>${item.undone?'':`<button class="text-btn" data-action="undo" data-id="${escapeHtml(item.id)}">Rückgängig</button>`}</div></div>`;
  }).join('');
  return `<section class="page-head"><div><p class="eyebrow">ALLE BUCHUNGEN</p><h2>Verlauf</h2><p class="muted">Einnahmen, Ausgaben, Abhebungen und Lohnbuchungen.</p></div><button class="btn btn-primary" data-action="open-booking">+ Buchung</button></section><div class="card"><div class="history-list">${rows||'<div class="empty">Noch keine Buchungen.</div>'}</div></div>`;
}
