(function(){
"use strict";
function $(id){return document.getElementById(id);} 
function num(id){var e=$(id);if(!e)return 0;var v=parseFloat(String(e.value||"").replace(",","."));return Number.isFinite(v)?v:0;}
function eur(v){return new Intl.NumberFormat("de-DE",{style:"currency",currency:"EUR"}).format(Number.isFinite(v)?v:0);}
function fmt(d){return new Intl.DateTimeFormat("de-DE",{day:"2-digit",month:"2-digit",year:"numeric"}).format(d);}
function dateKey(d){return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");}
function cycleKey(d){return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0");}
function addDays(d,n){var x=new Date(d);x.setDate(x.getDate()+n);return x;}
function easter(y){var a=y%19,b=Math.floor(y/100),c=y%100,d=Math.floor(b/4),e=b%4,f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3),h=(19*a+b-d-g+15)%30,i=Math.floor(c/4),k=c%4,l=(32+2*e+2*i-h-k)%7,m=Math.floor((a+11*h+22*l)/451),mo=Math.floor((h+l-7*m+114)/31),da=((h+l-7*m+114)%31)+1;return new Date(y,mo-1,da);}
function holidays(y){var e=easter(y),a=[dateKey(new Date(y,0,1)),dateKey(new Date(y,4,1)),dateKey(new Date(y,9,3)),dateKey(new Date(y,11,25)),dateKey(new Date(y,11,26))];[-2,1,39,50,60].forEach(function(n){a.push(dateKey(addDays(e,n)));});return a;}
function isBankDay(d){return d.getDay()!==0&&d.getDay()!==6&&holidays(d.getFullYear()).indexOf(dateKey(d))===-1;}
function nthLastBankDay(y,m,n){var d=new Date(y,m+1,0),c=0;while(d.getMonth()===m){if(isBankDay(d)){c++;if(c===n)return d;}d.setDate(d.getDate()-1);}return d;}
function nextPayDate(){var now=new Date(),y=now.getFullYear(),m=now.getMonth(),d=nthLastBankDay(y,m,2);d.setHours(20,30,0,0);if(now>d){m++;if(m>11){m=0;y++;}d=nthLastBankDay(y,m,2);d.setHours(20,30,0,0);}return d;}
function cycleDays(){var now=new Date(),n=nextPayDate(),today=new Date(now.getFullYear(),now.getMonth(),now.getDate()),nd=new Date(n.getFullYear(),n.getMonth(),n.getDate());return Math.max(1,Math.round((nd-today)/86400000)+1);}
function txs(){try{var a=JSON.parse(localStorage.getItem("meinGeldplanGiroTx")||"[]");return Array.isArray(a)?a:[];}catch(e){return[];}}
function saveTx(a){try{localStorage.setItem("meinGeldplanGiroTx",JSON.stringify(a));}catch(e){}}
function ensureBase(){var a=txs();if(!a.some(function(t){return t.type==="base";})){a.unshift({id:"base",type:"base",amount:153.30,date:dateKey(new Date()),text:"Startkontostand"});saveTx(a);}}
function base(){var t=txs().find(function(x){return x.type==="base";});return t?Number(t.amount)||0:153.30;}
function currentGiro(){return base()+txs().filter(function(t){return t.type!=="base";}).reduce(function(s,t){return s+(Number(t.amount)||0);},0);}
function cashBalance(){try{var v=parseFloat(localStorage.getItem("meinGeldplanCash")||"0");return Number.isFinite(v)?Math.max(0,v):0;}catch(e){return 0;}}
function saveCash(v){try{localStorage.setItem("meinGeldplanCash",String(Math.max(0,Number(v)||0)));}catch(e){}}
function lastWithdrawalDate(){var a=txs().filter(function(t){return t.type==="withdrawal";});if(!a.length)return null;var x=a[a.length-1];return x.date||null;}
function weeklyInfo(){var a=txs().filter(function(t){return t.type==="withdrawal";});if(!a.length)return null;var x=a[a.length-1],start=new Date((x.date||dateKey(new Date()))+"T00:00:00"),today=new Date(dateKey(new Date())+"T00:00:00"),elapsed=Math.floor((today-start)/86400000);if(elapsed<0||elapsed>=7)return null;return {start:start,days:7-elapsed};}
function daysUntilNextPayOrSeven(){var w=weeklyInfo();return w?w.days:cycleDays();}
function bookTransaction(amount,text,type,meta){var a=txs();var t={id:Date.now()+Math.random(),type:type,amount:amount,date:dateKey(new Date()),text:text};if(meta)Object.keys(meta).forEach(function(k){t[k]=meta[k];});a.push(t);saveTx(a);}

function updateBudget(){
  var storedCash=cashBalance();
  var inputCash=$("bCarryCash")?num("bCarryCash"):storedCash;
  if($("bCarryCash") && document.activeElement!==$("bCarryCash") && Math.abs(inputCash-storedCash)>0.009) { $("bCarryCash").value=storedCash.toFixed(2); inputCash=storedCash; }
  var giro=currentGiro(),cash=inputCash,available=giro+cash,weekly=weeklyInfo();
  // Nach einer Abhebung sind die 7 Tage Bargeld bereits reserviert. Das verbleibende Girokonto
  // wird deshalb auf die restlichen Tage bis zum nächsten Lohn verteilt.
  // Das Budget für Tagessatz und Wochensatz basiert ausschließlich auf dem aktuellen Girokonto-Guthaben.
  // Nach einer Abhebung beginnt ein neuer 7-Tage-Zeitraum; innerhalb dieses
  // Zeitraums werden die verbleibenden Tage bis zum Ende der Woche angezeigt.
  var days=weekly?weekly.days:cycleDays();
  // Tagessatz/Wochensatz basieren ausschließlich auf dem aktuell verfügbaren Girokonto-Guthaben.
  var basis=giro;
  if($("mainGiro"))$("mainGiro").textContent=eur(giro);
  if($("mainCash"))$("mainCash").textContent=eur(cash);
  if($("mainAvailable"))$("mainAvailable").textContent=eur(available);
  if($("mainNextPay"))$("mainNextPay").textContent=fmt(nextPayDate())+" 20:30";
  if($("mainDays"))$("mainDays").textContent=days;
  var day=(days>0?basis/days:0),week=day*7;
  if($("mainDay"))$("mainDay").textContent=eur(day);
  if($("mainWeek"))$("mainWeek").textContent=eur(week);
  if($("afterFixAvailable"))$("afterFixAvailable").textContent=eur(available);
  if($("budgetNote")){if(weekly){var wd=lastWithdrawalDate();$("budgetNote").textContent="Neue Wochenperiode seit "+wd.split("-").reverse().join(".")+". Die ersten 7 Tage sind durch das Bargeld abgedeckt. Für die verbleibenden "+days+" Tage wird nur das Girokonto verteilt.";}else{$("budgetNote").textContent="Ohne laufende Abhebungswoche rechnet die App bis zum nächsten Lohn mit dem Girokonto.";}}
}
function renderTx(){
  var list=$("giroTxList");if(!list)return;list.innerHTML="";
  var a=txs().filter(function(t){return t.type!=="base";}).slice().reverse();
  if(!a.length){list.innerHTML='<div class="note">Noch keine Kontobewegungen.</div>';return;}
  a.slice(0,12).forEach(function(t){var r=document.createElement("div");r.className="row";var l=document.createElement("span");l.textContent=(t.date||"")+" · "+(t.text||"Buchung");var v=document.createElement("span");v.className="v";v.textContent=(Number(t.amount)>=0?"+":"")+eur(Number(t.amount)||0);r.appendChild(l);r.appendChild(v);list.appendChild(r);});
}
function addIncome(){
  var v=num("giroIncome");
  if(v<=0){alert("Bitte einen positiven Zahlungseingang eingeben.");return;}
  bookTransaction(v,$("giroText").value.trim()||"Zahlungseingang","income");
  $("giroIncome").value="";$("giroText").value="";refresh();
}
function fixedCostAlreadyBooked(cycle){return txs().some(function(t){return t.type==="fixedcost" && t.cycle===cycle;});}
function addSalary(){
  var v=num("salaryAmount");if(v<=0){alert("Bitte den Nettolohn eingeben.");return;}
  var now=new Date(),cycle=cycleKey(now),fix=num("monthlyFix")||2156;
  bookTransaction(v,$("salaryText").value.trim()||"Lohn","salary",{cycle:cycle});
  if(fix>0 && !fixedCostAlreadyBooked(cycle)) bookTransaction(-fix,"Fixkosten automatisch abgezogen","fixedcost",{cycle:cycle});
  $("salaryAmount").value="";$("salaryText").value="";refresh();
}
function addExpense(){var v=num("giroExpense");if(v<=0){alert("Bitte einen positiven Ausgabebetrag eingeben.");return;}bookTransaction(-v,$("giroText").value.trim()||"Ausgabe","expense");$("giroExpense").value="";$("giroText").value="";refresh();}
function withdraw(){var v=num("sWithdrawAmount"),g=currentGiro();if(v<=0){alert("Bitte einen Abhebebetrag eingeben.");return;}if(v>g){alert("Der Abhebebetrag ist höher als dein Girokontostand.");return;}bookTransaction(-v,"Bargeldabhebung","withdrawal");saveCash(cashBalance()+v);if($("bCarryCash"))$("bCarryCash").value=cashBalance().toFixed(2);$("sWithdrawAmount").value="";refresh();}
function sunday(){var konto=currentGiro(),cash=cashBalance();if($("bCarryCash")){if(document.activeElement!==$("bCarryCash"))$("bCarryCash").value=cash.toFixed(2);else{var typed=num("bCarryCash");if(Math.abs(typed-cash)>0.009){saveCash(typed);cash=Math.max(0,typed);}}}if($("sTotal"))$("sTotal").textContent=eur(konto+cash);if($("sGiro"))$("sGiro").textContent=eur(konto);if($("sCash"))$("sCash").textContent=eur(cash);var weekly=weeklyInfo(),days=weekly?weekly.days:cycleDays(),day=konto/days;var suggested=Math.max(0,day*7);if($("sSuggested"))$("sSuggested").textContent=eur(suggested);if($("sAfter"))$("sAfter").textContent=eur(konto-num("sWithdrawAmount"));}

/* Gehaltsprognose */
function tariffHour(){return 24.21;}
function calcForecast(){
  var baseGross=num("pGrund")+num("pPflege")+num("pUni")+( $("pWechselOn") && $("pWechselOn").value==="on" ? num("pWechsel") : 0 );
  var h=tariffHour();
  var fdSo=num("pFDSo")*8.2;
  var sdWeek=num("pSD")*0.7;
  var sdSa=0; // Saturday premium is the 0.64 €/h special amount below
  var sdSo=num("pSDSo")*8.2;
  var ndWeek=num("pND")*8.75;
  var ndSa=num("pNDSa")*2.75;
  var ndSoSun=num("pNDSo")*2.75;
  var ndSoNight=num("pNDSo")*6.0;
  var ndSaSun=num("pNDSa")*6.0;
  var nightHours=sdWeek+ndWeek+ndSa+ndSoNight;
  var sunHours=fdSo+sdSo+ndSaSun+ndSoSun;
  var saturdayPay=num("pSDSa")*7.5*0.64;
  var night=nightHours*h*0.20;
  var sundayPay=sunHours*h*0.25;
  var protectedPay=night+sundayPay+num("pSDSa")*7.5*0.64;
  var taxableGross=baseGross;
  var baseRef=4730.43, netRef=num("pBasisNetto")||2991.52;
  var estNetBase=netRef*(taxableGross/baseRef);
  var taxableShiftGross=0;
  // Saturday special is treated separately; the 0.64 €/h amount is not added to taxable gross here.
  var grossAll=baseGross+taxableShiftGross;
  var estimatedPfNet=estNetBase + protectedPay*0.72;
  var garnish=0;
  if(estimatedPfNet>2868.87) garnish=136.94+(estimatedPfNet-2868.87)*((188.94-136.94)/(2991.52-2868.87));
  else garnish=0;
  var payout=estimatedPfNet-garnish;
  if($("pBrutto"))$("pBrutto").textContent=eur(grossAll);
  if($("pNettoBasis"))$("pNettoBasis").textContent=eur(estNetBase);
  if($("pProtected"))$("pProtected").textContent=eur(protectedPay);
  if($("pGarnish"))$("pGarnish").textContent=eur(garnish);
  if($("pPayout"))$("pPayout").textContent=eur(payout);
  if($("pSurcharges"))$("pSurcharges").textContent=eur(protectedPay);
  if($("pShiftSummary"))$("pShiftSummary").textContent=nightHours.toFixed(2)+" h Nacht · "+sunHours.toFixed(2)+" h Sonntag · "+eur(saturdayPay)+" Samstag";
}
function resetApp(){if(!confirm("Wirklich alle gespeicherten Eingaben und Buchungen löschen?"))return;localStorage.removeItem("meinGeldplanGiroTx");localStorage.removeItem("meinGeldplanCash");location.reload();}
function refresh(){renderTx();updateBudget();sunday();if($("giroCurrent"))$("giroCurrent").textContent=eur(currentGiro());calcForecast();calcSparen();}
function setDefaultMonth(){if($("pMonth")&&!$("pMonth").value){var d=new Date();$("pMonth").value=d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0");}}
function init(){
 ensureBase();setDefaultMonth();if($("bCarryCash"))$("bCarryCash").value=cashBalance().toFixed(2);
 if($("incomeBtn"))$("incomeBtn").onclick=addIncome;
 if($("expenseBtn"))$("expenseBtn").onclick=addExpense;
 if($("withdrawBtn"))$("withdrawBtn").onclick=withdraw;
 if($("salaryBtn"))$("salaryBtn").onclick=addSalary;
 if($("resetBtn"))$("resetBtn").onclick=resetApp;
 document.querySelectorAll("input,select").forEach(function(el){el.addEventListener("input",refresh);el.addEventListener("change",refresh);});
 document.querySelectorAll(".tab").forEach(function(b){b.addEventListener("click",function(){document.querySelectorAll(".tab").forEach(function(x){x.classList.remove("active")});b.classList.add("active");document.querySelectorAll(".view").forEach(function(v){v.classList.add("hidden")});var t=b.dataset.tab;if($(t))$(t).classList.remove("hidden");});});
 refresh();setInterval(refresh,60000);document.addEventListener("visibilitychange",function(){if(!document.hidden)refresh();});
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();
