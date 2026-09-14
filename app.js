(function(){
"use strict";
function $(id){return document.getElementById(id);}
function num(id){var e=$(id);if(!e)return 0;var v=parseFloat(String(e.value||"").replace(",","."));return Number.isFinite(v)?v:0;}
function eur(v){return new Intl.NumberFormat("de-DE",{style:"currency",currency:"EUR"}).format(Number.isFinite(v)?v:0);}
function fmt(d){return new Intl.DateTimeFormat("de-DE",{day:"2-digit",month:"2-digit",year:"numeric"}).format(d);}
function dateKey(d){return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");}
function addDays(d,n){var x=new Date(d);x.setDate(x.getDate()+n);return x;}
function easter(y){var a=y%19,b=Math.floor(y/100),c=y%100,d=Math.floor(b/4),e=b%4,f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3),h=(19*a+b-d-g+15)%30,i=Math.floor(c/4),k=c%4,l=(32+2*e+2*i-h-k)%7,m=Math.floor((a+11*h+22*l)/451),mo=Math.floor((h+l-7*m+114)/31),da=((h+l-7*m+22*l-7*m+114)%31)+1;return new Date(y,mo-1,da);}
function holidays(y){
  var e=easter(y),a=[dateKey(new Date(y,0,1)),dateKey(new Date(y,4,1)),dateKey(new Date(y,9,3)),dateKey(new Date(y,11,25)),dateKey(new Date(y,11,26))];
  [-2,1,39,50,60].forEach(function(n){a.push(dateKey(addDays(e,n)));});
  return a;
}
function isBankDay(d){return d.getDay()!==0&&d.getDay()!==6&&holidays(d.getFullYear()).indexOf(dateKey(d))===-1;}
function nthLastBankDay(y,m,n){var d=new Date(y,m+1,0),c=0;while(d.getMonth()===m){if(isBankDay(d)){c++;if(c===n)return d;}d.setDate(d.getDate()-1);}return d;}
function nextPayDate(){
  var now=new Date(),y=now.getFullYear(),m=now.getMonth(),d=nthLastBankDay(y,m,2);d.setHours(20,30,0,0);
  if(now>d){m++;if(m>11){m=0;y++;}d=nthLastBankDay(y,m,2);d.setHours(20,30,0,0);}
  return d;
}
function cycleDays(){
  var now=new Date(),n=nextPayDate(),today=new Date(now.getFullYear(),now.getMonth(),now.getDate()),nd=new Date(n.getFullYear(),n.getMonth(),n.getDate());
  return Math.max(1,Math.round((nd-today)/86400000)+1);
}
function txs(){try{var a=JSON.parse(localStorage.getItem("meinGeldplanGiroTx")||"[]");return Array.isArray(a)?a:[];}catch(e){return[];}}
function saveTx(a){try{localStorage.setItem("meinGeldplanGiroTx",JSON.stringify(a));}catch(e){}}
function ensureBase(){
  var a=txs();
  if(!a.some(function(t){return t.type==="base";})){
    a.unshift({id:"base",type:"base",amount:233.30,date:dateKey(new Date()),text:"Startkontostand"});
    saveTx(a);
  }
}
function base(){var t=txs().find(function(x){return x.type==="base";});return t?Number(t.amount)||0:233.30;}
function currentGiro(){return base()+txs().filter(function(t){return t.type!=="base";}).reduce(function(s,t){return s+(Number(t.amount)||0);},0);}
function getState(){try{var x=JSON.parse(localStorage.getItem("meinGeldplanState")||"{}");return x&&typeof x==="object"?x:{};}catch(e){return{};}}
function saveState(s){try{localStorage.setItem("meinGeldplanState",JSON.stringify(s));}catch(e){}}

function updateBudget(){
  var days=cycleDays(),giro=currentGiro(),cash=num("bCarryCash"),available=giro+cash;
  $("mainGiro").textContent=eur(giro);$("mainAvailable").textContent=eur(available);
  $("mainNextPay").textContent=fmt(nextPayDate())+" 20:30";$("mainDays").textContent=days;
  var day=available/days,week=day*7;
  $("mainDay").textContent=eur(day);$("mainWeek").textContent=eur(week);
  if($("afterFixAvailable")) $("afterFixAvailable").textContent=eur(available);
}
function renderTx(){
  var list=$("giroTxList");if(!list)return;list.innerHTML="";
  var a=txs().filter(function(t){return t.type!=="base";}).slice().reverse();
  if(!a.length){list.innerHTML='<div class="note">Noch keine Kontobewegungen.</div>';return;}
  a.slice(0,10).forEach(function(t){
    var r=document.createElement("div");r.className="row";
    var l=document.createElement("span");l.textContent=(t.date||"")+" · "+(t.text||"Buchung");
    var v=document.createElement("span");v.className="v";v.textContent=(Number(t.amount)>=0?"+":"")+eur(Number(t.amount)||0);
    r.appendChild(l);r.appendChild(v);list.appendChild(r);
  });
}
function bookTransaction(amount,text,type){
  var a=txs();a.push({id:Date.now()+Math.random(),type:type,amount:amount,date:dateKey(new Date()),text:text});saveTx(a);
}
function addIncome(){
  var v=num("giroIncome");if(v<=0){alert("Bitte einen positiven Zahlungseingang eingeben.");return;}
  // A new wage starts a new monthly budget cycle. We explicitly book the net wage,
  // then book fixed costs once, unless the user says they are already deducted.
  bookTransaction(v,$("giroText").value.trim()||"Lohn / Zahlungseingang","income");
  var st=getState(), already=$("fixAlready") ? $("fixAlready").value==="yes" : false;
  var fix=num("monthlyFix");
  if(!already && fix>0){
    bookTransaction(-fix,"Fixkosten automatisch abgezogen","fixedcost");
    st.lastFixDate=dateKey(new Date());
    saveState(st);
    if($("fixAlready"))$("fixAlready").value="yes";
  }
  $("giroIncome").value="";$("giroText").value="";refresh();
}
function addExpense(){
  var v=num("giroExpense");if(v<=0){alert("Bitte einen positiven Ausgabebetrag eingeben.");return;}
  bookTransaction(-v,$("giroText").value.trim()||"Ausgabe","expense");
  $("giroExpense").value="";$("giroText").value="";refresh();
}
function withdraw(){
  var v=num("sWithdrawAmount"),g=currentGiro();if(v<=0){alert("Bitte einen Abhebebetrag eingeben.");return;}if(v>g){alert("Der Abhebebetrag ist höher als dein Girokontostand.");return;}
  bookTransaction(-v,"Bargeldabhebung","withdrawal");
  $("sWithdrawAmount").value="";refresh();
}
function sunday(){
  var konto=currentGiro(),cash=num("bCarryCash");
  $("sTotal").textContent=eur(konto+cash);$("sGiro").textContent=eur(konto);
  var day=cycleDays()? (konto+cash)/cycleDays():0;
  var suggested=day*7-Math.max(0,cash);
  if(suggested<0)suggested=0;
  $("sSuggested").textContent=eur(suggested);
  $("sAfter").textContent=eur(konto-num("sWithdrawAmount"));
}
function refresh(){renderTx();updateBudget();sunday();if($("giroCurrent"))$("giroCurrent").textContent=eur(currentGiro());}
function init(){
  ensureBase();
  if($("incomeBtn"))$("incomeBtn").onclick=addIncome;
  if($("expenseBtn"))$("expenseBtn").onclick=addExpense;
  if($("withdrawBtn"))$("withdrawBtn").onclick=withdraw;
  document.querySelectorAll("input,select").forEach(function(el){el.addEventListener("input",refresh);el.addEventListener("change",refresh);});
  refresh();setInterval(refresh,60000);document.addEventListener("visibilitychange",function(){if(!document.hidden)refresh();});
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();
