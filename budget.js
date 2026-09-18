function getLastBankworkday(year, month){
  const d = new Date(year, month + 1, 0);
  while([0,6].includes(d.getDay())) d.setDate(d.getDate()-1);
  return d;
}

function nextSalaryDate(from = new Date()){
  const y=from.getFullYear(), m=from.getMonth();
  let target = getLastBankworkday(y,m);
  if(from > target) target = getLastBankworkday(y,m+1);
  return target;
}

function cycleKeyForDate(date){ return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}`; }

function daysUntilNextSalary(now=new Date()){
  const next=nextSalaryDate(now);
  const ms = new Date(next.getFullYear(),next.getMonth(),next.getDate()+1)-new Date(now.getFullYear(),now.getMonth(),now.getDate());
  return Math.max(1, Math.ceil(ms/86400000));
}

function budgetSnapshot(now=new Date()){
  const d=load();
  const total = (Number(d.giro)||0)+(Number(d.bargeld)||0);
  const days=daysUntilNextSalary(now);
  return {giro:d.giro,bargeld:d.bargeld,total,days,dayRate:total/days,weekRate:(total/days)*7,nextSalary:nextSalaryDate(now),fix:totalFix()};
}

function bookSalary(){
  const now=new Date();
  const cycle=cycleKeyForDate(now);
  const d=load();
  if(d.salaryCycles[cycle]){
    alert(`Für ${cycle} ist bereits ein Lohn gebucht.`);
    return;
  }
  const raw=prompt("Nettolohn für diesen Monat in €");
  if(raw===null) return;
  const net=Number(String(raw).replace(",","."));
  if(!Number.isFinite(net) || net<=0){ alert("Bitte einen gültigen Nettolohn eingeben."); return; }
  const fixed=totalFix();
  d.giro += net-fixed;
  d.salaryCycles[cycle]={month:cycle,net,fix:fixed,timestamp:now.toISOString()};
  d.history.unshift({id:`${Date.now()}-${Math.random().toString(16).slice(2)}`,type:"Lohn",amount:net,description:`Lohn ${cycle} · Fixkosten ${formatEUR(fixed)}`,timestamp:now.toISOString(),budgetDelta:net-fixed});
  save(d); renderApp("overview");
}

function changeCash(){
  const d=load();
  const raw=prompt(`Bargeld korrigieren. Aktuell ${formatEUR(d.bargeld)}. Änderung (+/-) in €`);
  if(raw===null)return;
  const delta=Number(String(raw).replace(",","."));
  if(!Number.isFinite(delta))return;
  d.bargeld=Math.max(0,Math.round((d.bargeld+delta)*100)/100);
  save(d); renderApp("overview");
}

function sundayWithdrawalRecommendation(now=new Date()){
  const d=load();
  return Math.max(0,120-(Number(d.bargeld)||0));
}
