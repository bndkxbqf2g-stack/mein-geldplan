function getLastBankworkday(year,month){
  const d=new Date(year,month+1,0);
  while(d.getDay()===0 || d.getDay()===6) d.setDate(d.getDate()-1);
  d.setHours(0,0,0,0); return d;
}
function cycleKeyForDate(date){return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}`;}
function scheduledSalaryDate(year,month){return getLastBankworkday(year,month);}
function isSameDay(a,b){return a.getFullYear()===b.getFullYear()&&a.getMonth()===b.getMonth()&&a.getDate()===b.getDate();}
function isSalaryBookedFor(date){return Boolean(load().salaryCycles[cycleKeyForDate(date)]);}
function nextSalaryDate(now=new Date()){
  const currentPayday=scheduledSalaryDate(now.getFullYear(),now.getMonth());
  if(isSameDay(now,currentPayday) && !isSalaryBookedFor(now)) return currentPayday;
  if(now < currentPayday) return currentPayday;
  return scheduledSalaryDate(now.getFullYear(),now.getMonth()+1);
}
function daysUntilNextSalary(now=new Date()){
  const next=nextSalaryDate(now); const today=new Date(now.getFullYear(),now.getMonth(),now.getDate()); const target=new Date(next.getFullYear(),next.getMonth(),next.getDate());
  const days=Math.round((target-today)/86400000); return Math.max(1,days);
}
function budgetSnapshot(now=new Date()){
  const d=load(); const giro=cents(d.giro), bargeld=cents(d.bargeld), total=cents(giro+bargeld), days=daysUntilNextSalary(now), dayRate=cents(total/days);
  return {giro,bargeld,total,days,dayRate,weekRate:cents(dayRate*7),nextSalary:nextSalaryDate(now),fix:totalFix()};
}
function isSalaryDay(date=new Date()){return isSameDay(date,scheduledSalaryDate(date.getFullYear(),date.getMonth()));}
function bookSalary(){
  const now=new Date(); const cycle=cycleKeyForDate(now); const payDay=scheduledSalaryDate(now.getFullYear(),now.getMonth()); const d=load();
  if(!isSameDay(now,payDay)){alert(`Der Lohn wird am letzten Bankwerktag gebucht: ${payDay.toLocaleDateString('de-DE')}.`);return;}
  if(d.salaryCycles[cycle]){alert(`Für ${cycle} ist bereits ein Lohn gebucht.`);return;}
  const raw=prompt('Nettolohn für diesen Monat in €'); if(raw===null) return;
  const net=parseMoneyInput(raw); if(!Number.isFinite(net)||net<=0){alert('Bitte einen gültigen Nettolohn eingeben.');return;}
  const cashRaw=prompt('Bargeldbestand am Lohnbuchungstag in €',String(d.bargeld).replace('.',','));
  if(cashRaw!==null){const cash=parseMoneyInput(cashRaw); if(!Number.isFinite(cash)||cash<0){alert('Bargeldbestand muss 0 € oder höher sein.');return;} d.bargeld=cents(cash);}
  const fixed=cents(totalFix()); const delta=cents(net-fixed);
  d.giro=cents(d.giro+delta);
  d.salaryCycles[cycle]={month:cycle,net:cents(net),fix:fixed,timestamp:now.toISOString()};
  d.history.unshift({id:uid('h'),type:'Lohn',amount:cents(net),description:`Lohn ${now.toLocaleString('de-DE',{month:'long',year:'numeric'})}`,timestamp:now.toISOString(),deltaGiro:delta,deltaCash:0,salaryCycle:cycle,undone:false});
  save(d); renderApp('overview'); showToast(`Lohn gebucht · ${formatEUR(net-fixed)} fürs Budget`);
}
