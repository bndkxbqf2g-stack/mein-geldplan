
(function(){
"use strict";
function $(id){return document.getElementById(id);}
function num(id){var e=$(id); if(!e)return 0; var v=parseFloat(String(e.value||"").replace(",", ".")); return isFinite(v)?v:0;}
function eur(v){return new Intl.NumberFormat("de-DE",{style:"currency",currency:"EUR"}).format(isFinite(v)?v:0);}

function getTx(){
  try { var x=JSON.parse(localStorage.getItem("meinGeldplanGiroTx")||"[]"); return Array.isArray(x)?x:[]; } catch(e){ return []; }
}
function saveTx(a){ try{localStorage.setItem("meinGeldplanGiroTx",JSON.stringify(a));}catch(e){} }

function currentGiro(){
  return getTx().reduce(function(sum,t){return sum+(Number(t.amount)||0);},0) + num("giroStand");
}
function renderGiro(){
  var base=getTx().filter(function(t){return t.type==="base";});
  var tx=getTx().filter(function(t){return t.type!=="base";});
  var baseAmount=base.length?Number(base[0].amount)||0:num("giroStand");
  if(base.length) $("giroStand").value=baseAmount.toFixed(2);
  var total=baseAmount+tx.reduce(function(s,t){return s+(Number(t.amount)||0);},0);
  $("giroCurrent").textContent=eur(total);
  var list=$("giroTxList"); if(!list)return;
  list.innerHTML="";
  if(!tx.length){list.innerHTML='<div class="note">Noch keine Kontobewegungen eingetragen.</div>';return;}
  tx.slice().reverse().forEach(function(t){
    var row=document.createElement("div"); row.className="row";
    var left=document.createElement("span");
    left.textContent=(t.date||"")+" · "+(t.text||"Buchung");
    var right=document.createElement("span"); right.className="v";
    right.textContent=(t.amount>=0?"+":"")+eur(Number(t.amount));
    row.appendChild(left);row.appendChild(right);list.appendChild(row);
  });
}
function ensureBase(){
  var a=getTx();
  if(!a.some(function(t){return t.type==="base";})){
    a.push({id:"base",type:"base",amount:num("giroStand"),date:new Date().toISOString().slice(0,10),text:"Startkontostand"});
    saveTx(a);
  }
}
function addGiroIncome(){
  var v=num("giroIncome"); if(v<=0){alert("Bitte einen positiven Zahlungseingang eingeben.");return;}
  var a=getTx(); a.push({id:Date.now(),amount:v,type:"income",date:new Date().toISOString().slice(0,10),text:$("#giroText").value.trim()||"Lohn / Zahlungseingang"});
  saveTx(a); $("#giroIncome").value=""; $("#giroText").value=""; renderGiro(); syncGiro(); calcAll();
}
function addGiroExpense(){
  var v=num("giroExpense"); if(v<=0){alert("Bitte einen positiven Ausgabebetrag eingeben.");return;}
  var a=getTx(); a.push({id:Date.now(),amount:-v,type:"expense",date:new Date().toISOString().slice(0,10),text:$("#giroText").value.trim()||"Ausgabe"});
  saveTx(a); $("#giroExpense").value=""; $("#giroText").value=""; renderGiro(); syncGiro(); calcAll();
}
function syncGiro(){
  var cur=currentGiro();
  if($("sKonto")) $("sKonto").value=cur.toFixed(2);
}

function specials(){
  try{var x=JSON.parse(localStorage.getItem("meinGeldplanSonderausgaben")||"[]");return Array.isArray(x)?x:[];}catch(e){return[];}
}
function saveSpecials(a){try{localStorage.setItem("meinGeldplanSonderausgaben",JSON.stringify(a));}catch(e){}}
function renderSpecials(){
  var list=$("specialList"), total=$("seTotal"); if(!list)return;
  var a=specials().sort(function(x,y){return String(y.date).localeCompare(String(x.date));});
  list.innerHTML="";
  if(!a.length){list.innerHTML='<div class="note">Noch keine Sonderausgaben eingetragen.</div>';}
  else a.forEach(function(e){
    var row=document.createElement("div"); row.className="row";
    var left=document.createElement("span"); var b=document.createElement("b"); b.textContent=eur(Number(e.amount)); left.appendChild(b); left.appendChild(document.createElement("br"));
    var sm=document.createElement("span");sm.className="note";sm.textContent=(e.date||"")+" · "+(e.category||"Sonstiges")+(e.text?" · "+e.text:"");left.appendChild(sm);
    var btn=document.createElement("button");btn.textContent="Löschen";btn.style.width="auto";btn.style.padding="8px 11px";btn.style.background="#f1f1f3";btn.style.color="#111";btn.style.fontSize="13px";
    btn.onclick=function(){saveSpecials(specials().filter(function(x){return x.id!==e.id;}));renderSpecials();calcAll();};
    row.appendChild(left);row.appendChild(btn);list.appendChild(row);
  });
  if(total) total.textContent=eur(a.reduce(function(s,e){return s+(Number(e.amount)||0);},0));
}
function addSpecial(){
  var amount=num("seBetrag");if(amount<=0){alert("Bitte einen gültigen Betrag eingeben.");return;}
  var a=specials();a.push({id:Date.now(),amount:amount,date:$("seDatum").value||new Date().toISOString().slice(0,10),category:$("seKat").value,text:$("seText").value.trim()});
  saveSpecials(a);$("seBetrag").value="";$("seText").value="";renderSpecials();calcAll();
}
function calculateBudget(){
  var netto=num("bNetto"),fix=num("bFix"),extra=num("bExtraSave"),days=Math.max(1,num("bDays"));
  var st=specials().reduce(function(s,e){return s+(Number(e.amount)||0);},0);
  var afterFix=netto-fix,after=afterFix-extra-st,day=after/days,week=day*7;
  $("bRest").textContent=eur(afterFix);$("bRestSave").textContent=eur(after);$("bDay").textContent=eur(day);$("bWeek").textContent=eur(week);
  var diff=week-num("bTarget");$("bDiff").textContent=(diff>=0?"+":"")+eur(diff);
}
function calculateSunday(){
  var konto=currentGiro(),bar=num("sBar"),target=num("sTarget"),need=Math.max(0,target-bar),wd=Math.min(konto,need);
  $("sBarOut").textContent=eur(bar);$("sNeed").textContent=eur(need);$("sWithdraw").textContent=eur(wd);$("sAfter").textContent=eur(konto-wd);
}
function safeSpend(){
  var days=Math.max(1,num("bDays")),konto=currentGiro(),bar=num("sBar");
  var st=specials().reduce(function(s,e){return s+(Number(e.amount)||0);},0);
  var available=konto+bar-st;
  $("safeDays").textContent=days;$("safeKonto").textContent=eur(konto);$("safeBar").textContent=eur(bar);$("safeSpecial").textContent=eur(st);
  $("safeDay").textContent=eur(available/days);
}
function calculateLohn(){
  var brutto=num("lGrund")+num("lPflege")+num("lUni")+num("lWechsel")+num("lTaxZ"),netto=num("lNetto"),unpf=num("lUntaxZ"),pf=num("lPf");
  $("lBrutto").textContent=eur(brutto);$("lNettoOut").textContent=eur(netto);$("lUnpfOut").textContent=eur(unpf);$("lBeforePf").textContent=eur(netto+unpf);$("lPfOut").textContent=eur(pf);$("lAuszahlung").textContent=eur(netto+unpf-pf);
}
function calculateSave(){
  var stand=num("uStand"),rate=num("uOwn")+num("uSteffi")+num("uExtra"),m=num("uMonths"),goal=num("uGoal"),forecast=stand+rate*m;
  $("uMonth").textContent=eur(rate);$("uForecast").textContent=eur(forecast);$("uMissing").textContent=eur(Math.max(0,goal-forecast));
  $("aForecast").textContent=eur(num("aStand")+num("aRate")*num("aMonths"));
}
function calcAll(){calculateBudget();calculateSunday();safeSpend();calculateLohn();calculateSave();}
function init(){
  ensureBase(); renderGiro(); renderSpecials(); syncGiro(); calcAll();
  document.querySelectorAll("input,select").forEach(function(el){el.addEventListener("input",calcAll);el.addEventListener("change",calcAll);});
  document.querySelectorAll(".tab").forEach(function(btn){btn.addEventListener("click",function(){
    document.querySelectorAll(".tab").forEach(function(x){x.classList.remove("active");});
    btn.classList.add("active");document.querySelectorAll(".view").forEach(function(v){v.classList.add("hidden");});
    var t=$(btn.getAttribute("data-tab"));if(t)t.classList.remove("hidden");
  });});
  window.addGiroIncome=addGiroIncome;window.addGiroExpense=addGiroExpense;window.addSpecial=addSpecial;window.syncGiro=syncGiro;
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();
