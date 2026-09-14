(function(){
"use strict";
function $(id){return document.getElementById(id);}
function num(id){var e=$(id);if(!e)return 0;var v=parseFloat(String(e.value||"").replace(",","."));return isFinite(v)?v:0;}
function eur(v){return new Intl.NumberFormat("de-DE",{style:"currency",currency:"EUR"}).format(isFinite(v)?v:0);}
function fmt(d){return new Intl.DateTimeFormat("de-DE",{day:"2-digit",month:"2-digit",year:"numeric"}).format(d);}

function holidays(y){
  var a=[dateKey(new Date(y,0,1)),dateKey(new Date(y,4,1)),dateKey(new Date(y,9,3)),dateKey(new Date(y,11,25)),dateKey(new Date(y,11,26))];
  var e=easter(y), offs=[-2,1,39,50,60];
  offs.forEach(function(n){a.push(dateKey(addDays(e,n)));});
  return a;
}
function dateKey(d){return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");}
function addDays(d,n){var x=new Date(d);x.setDate(x.getDate()+n);return x;}
function easter(y){
  var a=y%19,b=Math.floor(y/100),c=y%100,d=Math.floor(b/4),e=b%4,f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3);
  var h=(19*a+b-d-g+15)%30,i=Math.floor(c/4),k=c%4,l=(32+2*e+2*i-h-k)%7,m=Math.floor((a+11*h+22*l)/451);
  var mo=Math.floor((h+l-7*m+114)/31),da=((h+l-7*m+114)%31)+1;return new Date(y,mo-1,da);
}
function isBankDay(d){
  var day=d.getDay();if(day===0||day===6)return false;
  return holidays(d.getFullYear()).indexOf(dateKey(d))===-1;
}
function nthLastBankDay(y,m,n){
  var d=new Date(y,m+1,0),count=0;
  while(d.getMonth()===m){if(isBankDay(d)){count++;if(count===n)return d;}d.setDate(d.getDate()-1);}
  return d;
}
function nextPayDate(){
  var now=new Date(),y=now.getFullYear(),m=now.getMonth(),d=nthLastBankDay(y,m,2);
  d.setHours(20,30,0,0);
  if(now>d){m++;if(m>11){m=0;y++;}d=nthLastBankDay(y,m,2);d.setHours(20,30,0,0);}
  return d;
}
function cycleDays(){
  var now=new Date(),n=nextPayDate();
  var today=new Date(now.getFullYear(),now.getMonth(),now.getDate());
  var nd=new Date(n.getFullYear(),n.getMonth(),n.getDate());
  return Math.max(1,Math.round((nd-today)/86400000)+1);
}

function txs(){try{var a=JSON.parse(localStorage.getItem("meinGeldplanGiroTx")||"[]");return Array.isArray(a)?a:[];}catch(e){return[];}}
function saveTx(a){try{localStorage.setItem("meinGeldplanGiroTx",JSON.stringify(a));}catch(e){}}
function ensureBase(){
  var a=txs();
  if(!a.some(function(t){return t.type==="base";})){
    a.unshift({id:"base",type:"base",amount:num("giroStand"),date:dateKey(new Date()),text:"Startkontostand"});
    saveTx(a);
  }
}
function base(){var a=txs().find(function(t){return t.type==="base";});return a?Number(a.amount)||0:num("giroStand");}
function currentGiro(){return base()+txs().filter(function(t){return t.type!=="base";}).reduce(function(s,t){return s+(Number(t.amount)||0);},0);}
function renderTx(){
  var list=$("giroTxList");if(!list)return;
  var a=txs().filter(function(t){return t.type!=="base";}).slice().reverse();list.innerHTML="";
  if(!a.length){list.innerHTML='<div class="note">Noch keine Kontobewegungen.</div>';return;}
  a.slice(0,12).forEach(function(t){
    var r=document.createElement("div");r.className="row";
    var l=document.createElement("span");l.textContent=(t.date||"")+" · "+(t.text||"Buchung");
    var v=document.createElement("span");v.className="v";v.textContent=(Number(t.amount)>=0?"+":"")+eur(Number(t.amount)||0);
    r.appendChild(l);r.appendChild(v);list.appendChild(r);
  });
}
function addIncome(){
  var v=num("giroIncome");if(v<=0){alert("Bitte einen positiven Zahlungseingang eingeben.");return;}
  var a=txs();a.push({id:Date.now(),type:"income",amount:v,date:dateKey(new Date()),text:$("giroText").value.trim()||"Lohn / Zahlungseingang"});saveTx(a);
  $("giroIncome").value="";$("giroText").value="";refresh();
}
function addExpense(){
  var v=num("giroExpense");if(v<=0){alert("Bitte einen positiven Ausgabebetrag eingeben.");return;}
  var a=txs();a.push({id:Date.now(),type:"expense",amount:-v,date:dateKey(new Date()),text:$("giroText").value.trim()||"Ausgabe"});saveTx(a);
  $("giroExpense").value="";$("giroText").value="";refresh();
}
function specials(){
  try{var a=JSON.parse(localStorage.getItem("meinGeldplanSonderausgaben")||"[]");return Array.isArray(a)?a:[];}catch(e){return[];}
}
function saveSpecials(a){try{localStorage.setItem("meinGeldplanSonderausgaben",JSON.stringify(a));}catch(e){}}
function renderSpecials(){
  var a=specials().slice().sort(function(x,y){return String(y.date).localeCompare(String(x.date));});
  var list=$("specialList");if(!list)return;list.innerHTML="";
  if(!a.length)list.innerHTML='<div class="note">Noch keine Sonderausgaben eingetragen.</div>';
  a.forEach(function(e){
    var r=document.createElement("div");r.className="row";
    var l=document.createElement("span");l.innerHTML="<b>"+eur(Number(e.amount)||0)+"</b><br>";var sm=document.createElement("span");sm.className="note";sm.textContent=(e.date||"")+" · "+(e.category||"Sonstiges")+(e.text?" · "+e.text:"");l.appendChild(sm);
    var b=document.createElement("button");b.textContent="Löschen";b.style.width="auto";b.style.padding="8px 11px";b.style.background="#f1f1f3";b.style.color="#111";b.onclick=function(){
      // Remove matching linked giro transaction if available
      var arr=txs().filter(function(t){return t.specialId!==e.id;});saveTx(arr);
      saveSpecials(specials().filter(function(x){return x.id!==e.id;}));refresh();
    };
    r.appendChild(l);r.appendChild(b);list.appendChild(r);
  });
  if($("seTotal"))$("seTotal").textContent=eur(a.reduce(function(s,e){return s+(Number(e.amount)||0);},0));
}
function addSpecial(){
  var v=num("seBetrag");if(v<=0){alert("Bitte einen gültigen Betrag eingeben.");return;}
  var id=Date.now(), date=$("seDatum").value||dateKey(new Date()), text=$("seText").value.trim(), cat=$("seKat").value;
  var s=specials();s.push({id:id,amount:v,date:date,category:cat,text:text});saveSpecials(s);
  var a=txs();a.push({id:"sp-"+id,type:"expense",specialId:id,amount:-v,date:date,text:(text||cat)});saveTx(a);
  $("seBetrag").value="";$("seText").value="";refresh();
}
function sunday(){
  var konto=currentGiro(),bar=num("sBar"),week=currentWeek(),need=Math.max(0,week-bar),wd=Math.min(konto,need);
  $("sBarOut").textContent=eur(bar);$("sNeed").textContent=eur(need);$("sWithdraw").textContent=eur(wd);$("sAfter").textContent=eur(konto-wd);
}
function currentWeek(){
  var days=cycleDays();
  // Always show the user's desired flexible weekly budget based on remaining money.
  // For Sunday display, cap at the actual available current daily budget * 7.
  var available=currentGiro()+num("sBar");
  var special=specials().reduce(function(s,e){return s+(Number(e.amount)||0);},0);
  return Math.max(0,(available-special)/days*7);
}
function budget(){
  var days=cycleDays(),konto=currentGiro(),bar=num("sBar");
  var spec=specials().reduce(function(s,e){return s+(Number(e.amount)||0);},0);
  // Special expenses are already deducted from Giro through linked transactions.
  // Do not subtract them again from the current account budget.
  var day=konto/days,week=day*7;
  $("mainGiro").textContent=eur(konto);$("mainBar").textContent=eur(bar);$("mainTotal").textContent=eur(konto+bar);
  $("mainNextPay").textContent=fmt(nextPayDate())+" 20:30";$("mainDays").textContent=days;
  $("mainDay").textContent=eur(day);$("mainWeek").textContent=eur(week);$("mainSpecial").textContent=eur(spec);
}
function calcLohn(){
  var bruto=num("lGrund")+num("lPflege")+num("lUni")+num("lWechsel")+num("lTaxZ"),netto=num("lNetto"),unpf=num("lUntaxZ"),pf=num("lPf");
  if($("lBrutto"))$("lBrutto").textContent=eur(bruto);
  if($("lNettoOut"))$("lNettoOut").textContent=eur(netto);
  if($("lUnpfOut"))$("lUnpfOut").textContent=eur(unpf);
  if($("lBeforePf"))$("lBeforePf").textContent=eur(netto+unpf);
  if($("lPfOut"))$("lPfOut").textContent=eur(pf);
  if($("lAuszahlung"))$("lAuszahlung").textContent=eur(netto+unpf-pf);
}
function refresh(){renderTx();renderSpecials();budget();sunday();calcLohn();if($("giroCurrent"))$("giroCurrent").textContent=eur(currentGiro());}
function init(){
  ensureBase();
  // Sync the visible start field with persisted base balance.
  if($("giroStand"))$("giroStand").value=base().toFixed(2);
  if($("incomeBtn"))$("incomeBtn").onclick=addIncome;
  if($("expenseBtn"))$("expenseBtn").onclick=addExpense;
  if($("specialBtn"))$("specialBtn").onclick=addSpecial;
  document.querySelectorAll("input,select").forEach(function(el){el.addEventListener("input",refresh);el.addEventListener("change",refresh);});
  document.querySelectorAll(".tab").forEach(function(btn){btn.addEventListener("click",function(){
    document.querySelectorAll(".tab").forEach(function(x){x.classList.remove("active");});
    btn.classList.add("active");document.querySelectorAll(".view").forEach(function(v){v.classList.add("hidden");});
    var t=$(btn.getAttribute("data-tab"));if(t)t.classList.remove("hidden");
  });});
  refresh();
  setInterval(refresh,60000);
  document.addEventListener("visibilitychange",function(){if(!document.hidden)refresh();});
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();
