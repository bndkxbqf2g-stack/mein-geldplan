// Read-only dashboard presentation. Reuses the app's existing statistics and budget calculation.
import {getTransactions,getSavings,getCash} from './lib/storage.js';
import {getCurrentGiro} from './lib/budget.js';
import {monthlyStatistics} from './lib/statistics.js';
import {$,eur} from './lib/ui.js';

function renderDashboard(){
  const today=new Date(),transactions=getTransactions(),savings=getSavings();
  const key=`${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}`;
  const stats=monthlyStatistics(transactions,savings,6),current=stats.find(m=>m.month===key);
  const net=current?.net||0;
  $('designMonthNet').textContent=`${net>0?'+':''}${eur(net)}`;
  $('designIncome').textContent=eur(current?.income||0);
  $('designExpenses').textContent=eur(current?.expenses||0);
  $('designTotal').textContent=eur(getCurrentGiro(transactions)+getCash());
  renderActivities(transactions);
  $('designMonthNet').className=`metric ${net<0?'red':'good'}`;

  const chart=$('designCashflow');chart.replaceChildren();
  if(!stats.length){const empty=document.createElement('div');empty.className='empty';empty.textContent='Noch keine Monatsdaten. Deine Buchungen erscheinen hier.';chart.append(empty);return;}
  const peak=Math.max(1,...stats.flatMap(m=>[m.income,m.expenses]));
  const step=peak>1000?500:peak>100?100:peak>10?10:1;
  const max=Math.ceil(peak/step)*step;
  const axis=$('designChartAxis');axis.replaceChildren();
  [max,max*.75,max*.5,max*.25,0].forEach(value=>{const tick=document.createElement('span');tick.textContent=`${new Intl.NumberFormat('de-DE',{maximumFractionDigits:0}).format(value)} €`;axis.append(tick);});
  stats.forEach(m=>{
    const group=document.createElement('div');group.className=`cashflow-month ${m.month===key?'is-current':''}`;
    const bars=document.createElement('div');bars.className='cashflow-bars';
    [['income','Einnahmen'],['expenses','Ausgaben']].forEach(([field,label])=>{
      const bar=document.createElement('div');bar.className=`cashflow-bar ${field}`;
      bar.style.height=`${m[field]/max*100}%`;bar.title=`${label}: ${eur(m[field])}`;
      bar.setAttribute('aria-label',`${m.month} ${label}: ${eur(m[field])}`);bars.append(bar);
    });
    const label=document.createElement('span');label.className='cashflow-label';
    label.textContent=new Intl.DateTimeFormat('de-DE',{month:'short'}).format(new Date(`${m.month}-01T12:00:00`));
    group.append(bars,label);chart.append(group);
  });
}
function renderActivities(transactions){
  const recent=transactions.filter(t=>t&&t.type!=='base').slice().reverse().slice(0,5);
  const icons={income:'<path d="M12 4v16m-4-4 4 4 4-4"/><path d="M5 8V5h14v3"/>',expense:'<path d="M3 4h3l3 12h10l2-9H7"/><circle cx="10" cy="20" r="1"/><circle cx="18" cy="20" r="1"/>',fixedcost:'<path d="m3 10 9-7 9 7M5 9v12h14V9m-10 12v-7h6v7"/>',other:'<path d="M5 8h14m-4-4 4 4-4 4M19 16H5m4-4-4 4 4 4"/>'};
  const labels={salary:'Lohn',income:'Einnahme',expense:'Ausgabe',fixedcost:'Fixkosten',withdrawal:'Giro → Bargeld',correction:'Kontokorrektur'};
  $('ovRecent').replaceChildren();
  if(!recent.length){const empty=document.createElement('div');empty.className='empty';empty.textContent='Noch keine Kontobewegungen.';$('ovRecent').append(empty);}
  recent.forEach(tx=>{
    const row=document.createElement('div');row.className='row activity-row';
    const positive=Number(tx.amount)>=0,kind=['salary','income'].includes(tx.type)?'income':tx.type==='expense'?'expense':tx.type==='fixedcost'?'fixedcost':'other';
    const icon=document.createElement('span');icon.className=`activity-icon ${kind}`;icon.setAttribute('aria-hidden','true');icon.innerHTML=`<svg viewBox="0 0 24 24">${icons[kind]}</svg>`;
    const info=document.createElement('span');info.className='activity-info';const title=document.createElement('strong');title.textContent=tx.text||'Buchung';const meta=document.createElement('small');const date=new Date(`${tx.date}T12:00:00`);meta.textContent=`${labels[tx.type]||'Buchung'} · ${Number.isNaN(date.getTime())?tx.date:new Intl.DateTimeFormat('de-DE',{day:'numeric',month:'short'}).format(date)}`;info.append(title,meta);
    const value=document.createElement('span');value.className=`v ${positive?'positive':''}`;value.textContent=`${positive?'+':''}${eur(Number(tx.amount)||0)}`;
    row.append(icon,info,value);$('ovRecent').append(row);
  });
}
// Existing app event keeps presentation current without changing its render or storage paths.
document.addEventListener('geldplan:data-changed',renderDashboard);
renderDashboard();
