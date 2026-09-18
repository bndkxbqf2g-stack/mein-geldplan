function getLastBankworkday(year, month){
  const d = new Date(year, month + 1, 0);
  while([0,6].includes(d.getDay())) d.setDate(d.getDate() - 1);
  return d;
}

function cycleKeyForDate(date){
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}`;
}

function scheduledSalaryDate(year, month){
  return getLastBankworkday(year, month);
}

function isSalaryBookedFor(date){
  const d = load();
  return Boolean(d.salaryCycles[cycleKeyForDate(date)]);
}

function nextSalaryDate(from = new Date()){
  const y = from.getFullYear();
  const m = from.getMonth();
  const currentPayday = scheduledSalaryDate(y, m);
  if(!isSalaryBookedFor(from) && from <= currentPayday) return currentPayday;
  return scheduledSalaryDate(y, m + 1);
}

function daysUntilNextSalary(now = new Date()){
  const next = nextSalaryDate(now);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const salaryDay = new Date(next.getFullYear(), next.getMonth(), next.getDate());
  return Math.max(1, Math.round((salaryDay - today) / 86400000));
}

function budgetSnapshot(now = new Date()){
  const d = load();
  const giro = cents(d.giro);
  const bargeld = cents(d.bargeld);
  const total = cents(giro + bargeld);
  const days = daysUntilNextSalary(now);
  const dayRate = cents(total / days);
  return {
    giro,
    bargeld,
    total,
    days,
    dayRate,
    weekRate: cents(dayRate * 7),
    nextSalary: nextSalaryDate(now),
    fix: totalFix()
  };
}

function bookSalary(){
  const now = new Date();
  const cycle = cycleKeyForDate(now);
  const officialPayDay = scheduledSalaryDate(now.getFullYear(), now.getMonth());
  const d = load();

  if(now.getFullYear() !== officialPayDay.getFullYear() || now.getMonth() !== officialPayDay.getMonth() || now.getDate() !== officialPayDay.getDate()){
    alert(`Der Lohn wird am letzten Bankwerktag gebucht: ${officialPayDay.toLocaleDateString("de-DE")}.`);
    return;
  }
  if(d.salaryCycles[cycle]){
    alert(`Für ${cycle} ist bereits ein Lohn gebucht.`);
    return;
  }

  const raw = prompt("Nettolohn für diesen Monat in €");
  if(raw === null) return;
  const net = cents(parseMoneyInput(raw));
  if(!Number.isFinite(net) || net <= 0){
    alert("Bitte einen gültigen Nettolohn eingeben.");
    return;
  }

  const cashDefault = cents(d.bargeld).toFixed(2).replace(".", ",");
  const cashRaw = prompt("Bargeldbestand am Lohnbuchungstag in € (manuell)", cashDefault);
  if(cashRaw !== null){
    const cash = cents(parseMoneyInput(cashRaw));
    if(!Number.isFinite(cash) || cash < 0){
      alert("Der Bargeldbestand muss 0 € oder höher sein.");
      return;
    }
    d.bargeld = cash;
  }

  const fixed = cents(totalFix());
  const budgetDelta = cents(net - fixed);
  d.giro = cents(d.giro + budgetDelta);
  d.salaryCycles[cycle] = {month: cycle, net, fix: fixed, timestamp: now.toISOString()};
  d.history.unshift({
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    type: "Lohn",
    amount: net,
    description: `Lohn ${cycle} · Fixkosten ${formatEUR(fixed)}`,
    timestamp: now.toISOString(),
    budgetDelta
  });
  save(d);
  renderApp("overview");
  showToast("Lohn gebucht · neuer Budgetzyklus gestartet");
}

function changeCash(){
  const d = load();
  const raw = prompt(`Bargeld korrigieren. Aktuell ${formatEUR(d.bargeld)}. Änderung (+/-) in €`);
  if(raw === null) return;
  const delta = parseMoneyInput(raw);
  if(!Number.isFinite(delta)){
    alert("Bitte eine gültige Änderung eingeben.");
    return;
  }
  const next = cents(d.bargeld + delta);
  if(next < 0){
    alert("Bargeld kann nicht unter 0 € liegen.");
    return;
  }
  d.bargeld = next;
  save(d);
  renderApp("overview");
  showToast("Bargeld aktualisiert");
}

function sundayWithdrawalRecommendation(now = new Date()){
  if(now.getDay() !== 0) return null;
  const d = load();
  return Math.max(0, cents(120 - Number(d.bargeld || 0)));
}
