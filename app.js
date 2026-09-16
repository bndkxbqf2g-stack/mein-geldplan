(function(){
function $(id){return document.getElementById(id);} 
function num(id){var e=$(id);if(!e)return 0;var v=parseFloat(String(e.value||"").replace(",","."));return Number.isFinite(v)?v:0;}
function eur(v){return new Intl.NumberFormat("de-DE",{style:"currency",currency:"EUR"}).format(Number.isFinite(v)?v:0);}
function fmt(d){return new Intl.DateTimeFormat("de-DE",{day:"2-digit",month:"2-digit",year:"numeric"}).format(d);}
function dateKey(d){return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");}
function addDays(d,n){var x=new Date(d);x.setDate(x.getDate()+n);return x;}
function easter(y){var a=y%19,b=Math.floor(y/100),c=y%100,d=Math.floor(b/4),e=b%4,f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3),h=(19*a+b-d-g+15)%30,i=Math.floor(c/4),k=c%4,l=(32+2*e+2*i-h-k)%7,m=Math.floor((a+11*h+22*l)/451),mo=Math.floor((h+l-7*m+114)/31),da=((h+l-7*m+114)%31)+1;return new Date(y,mo-1,da);}
function holidays(y){var e=easter(y),a=[dateKey(new Date(y,0,1)),dateKey(new Date(y,4,1)),dateKey(new Date(y,9,3)),dateKey(new Date(y,11,25)),dateKey(new Date(y,11,26))];[-2,1,39,50,60].forEach(function(n){a.push(dateKey(addDays(e,n)));});return a;}
function isBankDay(d){return d.getDay()!==0&&d.getDay()!==6&&holidays(d.getFullYear()).indexOf(dateKey(d))===-1;}
function lastBankDay(y,m){var d=new Date(y,m+1,0);while(d.getMonth()===m&&!isBankDay(d))d.setDate(d.getDate()-1);d.setHours(20,30,0,0);return d;}
function nextLastBankDayAfter(d){var y=d.getFullYear(),m=d.getMonth()+1;if(m>11){m=0;y++;}return lastBankDay(y,m);}
function upcomingPayDate(){var now=new Date(),d=lastBankDay(now.getFullYear(),now.getMonth());return now<=d?d:lastBankDay(now.getFullYear(),now.getMonth()+1);}
function txs(){try{var a=JSON.parse(localStorage.getItem("meinGeldplanGiroTx")||"[]");return Array.isArray(a)?a:[];}catch(e){return[];}}
function saveTx(a){try{localStorage.setItem("meinGeldplanGiroTx",JSON.stringify(a));}catch(e){}}
function ensureBase(){var a=txs();if(!a.some(function(t){return t.type==="base";})){a.unshift({id:"base",type:"base",amount:153.30,date:dateKey(new Date()),text:"Ausgangskontostand"});saveTx(a);}}
function base(){var t=txs().find(function(x){return x.type==="base";});return t?Number(t.amount)||0:153.30;}
function currentGiro(){return base()+txs().filter(function(t){return t.type!=="base";}).reduce(function(s,t){return s+(Number(t.amount)||0);},0);}
function cashBalance(){try{var v=parseFloat(localStorage.getItem("meinGeldplanCash")||"0");return Number.isFinite(v)?Math.max(0,v):0;}catch(e){return 0;}}
function saveCash(v){try{localStorage.setItem("meinGeldplanCash",String(Math.max(0,Number(v)||0)));}catch(e){}}
function latestSalary(){var a=txs().filter(function(t){return t.type==="salary";});if(!a.length)return null;return a[a.length-1];}
function activeCycleKey(){
 var s=latestSalary();
 return s?String(s.cycle||('salary-'+s.id)):'pre-salary-'+dateKey(new Date());
}
function currentCyclePayDate(){
 var s=latestSalary(), upcoming=upcomingPayDate();
 if(!s)return upcoming;
 var sd=new Date((s.date||dateKey(new Date()))+'T20:30:00');
 var next=nextLastBankDayAfter(sd);
 return new Date()<sd?sd:next;
}
function nextPayDateForCycle(){
 var s=latestSalary();
 if(!s)return upcomingPayDate();
 var d=new Date((s.date||dateKey(new Date()))+'T20:30:00');
 return nextLastBankDayAfter(d);
}
function daysBetweenDates(from,to){var a=new Date(from.getFullYear(),from.getMonth(),from.getDate()),b=new Date(to.getFullYear(),to.getMonth(),to.getDate());return Math.max(0,Math.round((b-a)/86400000));}
function remainingPayDays(){
 var now=new Date(), pay=currentCyclePayDate();
 return Math.max(1,daysBetweenDates(now,pay));
}
function lastWithdrawal(){var a=txs().filter(function(t){return t.type==='withdrawal';});return a.length?a[a.length-1]:null;}
function nextWithdrawalDate(){
 var today=new Date();
 var dow=today.getDay();
 var delta=(7-dow)%7;
 // Sonntag selbst bedeutet: heute endet der aktuelle Zeitraum; die nächste Abhebung ist in 7 Tagen.
 return addDays(new Date(today.getFullYear(),today.getMonth(),today.getDate()),delta===0?7:delta);
}
function daysUntilNextWithdrawal(){
 var n=nextWithdrawalDate();
 return n?daysBetweenDates(new Date(),n):7;
}
function daysToFollowingSundayFrom(d){
 var dow=d.getDay(),delta=(7-dow)%7;
 return delta===0?7:delta;
}
function firstWithdrawalSuggested(available){
 var payDays=remainingPayDays(), t=new Date(), days=daysToFollowingSundayFrom(t);
 return payDays>0?Math.max(0,available/payDays*Math.min(days,payDays)):0;
}
function regularWithdrawalSuggested(available){
 var payDays=remainingPayDays();
 return payDays>0?Math.max(0,available/payDays*Math.min(7,payDays)):Math.max(0,available);
}
var DEFAULT_FIX=[
 {id:"urlaub",name:"Urlaubssparen",amount:60},
 {id:"apple",name:"Apple Speicher",amount:1},
 {id:"bank",name:"Kontoführung",amount:6},
 {id:"weitere",name:"Weitere Fixkosten",amount:2089}
];
function fixItems(){try{var a=JSON.parse(localStorage.getItem("meinGeldplanFixItems")||"");if(Array.isArray(a)&&a.length)return a;}catch(e){}return DEFAULT_FIX.map(function(x){return {id:x.id,name:x.name,amount:x.amount};});}
function saveFixItems(a){try{localStorage.setItem("meinGeldplanFixItems",JSON.stringify(a));}catch(e){}}
function fixTotal(){return fixItems().reduce(function(s,x){return s+(Number(x.amount)||0);},0);}
function renderFixItems(){var box=$("fixItems");if(!box)return;var a=fixItems();box.innerHTML="";a.forEach(function(item,idx){var wrap=document.createElement("div");wrap.className="fix-item";wrap.innerHTML='<input class="fix-name" data-idx="'+idx+'" type="text" value="'+String(item.name).replace(/&/g,"&amp;").replace(/"/g,"&quot;")+'"><input class="fix-amount" data-idx="'+idx+'" type="number" step=".01" min="0" value="'+(Number(item.amount)||0).toFixed(2)+'"><button type="button" class="removeFix" data-idx="'+idx+'">×</button>';box.appendChild(wrap);});
 box.querySelectorAll("input").forEach(function(el){el.addEventListener("input",function(){var i=Number(el.dataset.idx),arr=fixItems();if(el.classList.contains("fix-name"))arr[i].name=el.value;else arr[i].amount=numValue(el.value);saveFixItems(arr);refresh();});});
 box.querySelectorAll(".removeFix").forEach(function(btn){btn.addEventListener("click",function(){var arr=fixItems();arr.splice(Number(btn.dataset.idx),1);saveFixItems(arr);renderFixItems();refresh();});});
 var total=fixTotal();if($("fixTotal"))$("fixTotal").textContent=eur(total);if($("monthlyFix")){if(document.activeElement!==$("monthlyFix"))$("monthlyFix").value=total.toFixed(2);}
}
function numValue(v){var n=parseFloat(String(v).replace(",","."));return Number.isFinite(n)?n:0;}
function addFixItem(){var a=fixItems();a.push({id:"f"+Date.now()+Math.random(),name:"Neue Fixkosten",amount:0});saveFixItems(a);renderFixItems();}
function bookTransaction(amount,text,type,meta){var a=txs(),t={id:Date.now()+Math.random(),type:type,amount:amount,date:dateKey(new Date()),text:text};if(meta)Object.keys(meta).forEach(function(k){t[k]=meta[k];});a.push(t);saveTx(a);return t;}

function updateBudget(){
 var giro=currentGiro(),cash=cashBalance(),available=giro+cash,payDays=remainingPayDays(),nextPay=currentCyclePayDate(),nextW=nextWithdrawalDate();
 var daysW=daysUntilNextWithdrawal();
 if($('mainGiro'))$('mainGiro').textContent=eur(giro);
 if($('mainCash'))$('mainCash').textContent=eur(cash);
 if($('mainAvailable'))$('mainAvailable').textContent=eur(available);
 if($('mainNextPay'))$('mainNextPay').textContent=fmt(nextPay)+' 20:30';
 if($('mainDays'))$('mainDays').textContent=daysW;
 var day=payDays>0?available/payDays:0,week=day*7;
 if($('mainDay'))$('mainDay').textContent=eur(day);
 if($('mainWeek'))$('mainWeek').textContent=eur(week);
 if($('budgetNote'))$('budgetNote').textContent='Die Budgettage zeigen den Zeitraum bis zur nächsten Abhebung. Tagessatz und Wochensatz berechnen sich aus Giro + vorhandenem Bargeld, geteilt durch die verbleibenden Tage bis zum nächsten Lohn. Du bestimmst die tatsächliche Abhebung selbst.';
 renderFixItems();
}
function renderTx(){var list=$("giroTxList");if(!list)return;list.innerHTML="";var a=txs().filter(function(t){return t.type!=="base";}).slice().reverse();if(!a.length){list.innerHTML='<div class="note">Noch keine Kontobewegungen.</div>';return;}a.slice(0,15).forEach(function(t){var r=document.createElement("div");r.className="row";var l=document.createElement("span");l.textContent=(t.date||"")+" · "+(t.text||"Buchung");var v=document.createElement("span");v.className="v";v.textContent=(Number(t.amount)>=0?"+":"")+eur(Number(t.amount)||0);r.appendChild(l);r.appendChild(v);list.appendChild(r);});}
function renderCycleExpenses(){var list=$("cycleExpenseList");if(!list)return;list.innerHTML="";var c=activeCycleKey();var a=txs().filter(function(t){return t.type==="expense"&&t.cycle===c;}).slice().reverse();if(!a.length){list.innerHTML='<div class="note">Keine zusätzlichen Ausgaben im laufenden Lohnzyklus.</div>';return;}var total=0;a.forEach(function(t){total+=Math.abs(Number(t.amount)||0);var r=document.createElement("div");r.className="row";var l=document.createElement("span");l.textContent=(t.date||"")+" · "+(t.text||"Ausgabe");var v=document.createElement("span");v.className="v red";v.textContent=eur(Math.abs(Number(t.amount)||0));r.appendChild(l);r.appendChild(v);list.appendChild(r);});var rr=document.createElement("div");rr.className="row";rr.innerHTML='<span><b>Zusätzliche Ausgaben im Zyklus</b></span><span class="v">'+eur(total)+'</span>';list.appendChild(rr);}
function addIncome(){var v=num("giroIncome");if(v<=0){alert("Bitte einen positiven Zahlungseingang eingeben.");return;}bookTransaction(v,$("giroText").value.trim()||"Zahlungseingang","income",{cycle:activeCycleKey()});$("giroIncome").value="";$("giroText").value="";refresh();}
function fixedCostAlreadyBooked(cycle){return txs().some(function(t){return t.type==="fixedcost"&&t.cycle===cycle;});}
function addSalary(){
 var v=num('salaryAmount');
 if(v<=0){alert('Bitte den Nettolohn eingeben.');return;}
 var now=new Date(),cycle='salary-'+dateKey(now),fix=fixTotal();
 bookTransaction(v,$('salaryText').value.trim()||'Lohn','salary',{cycle:cycle});
 if(fix>0&&!fixedCostAlreadyBooked(cycle))bookTransaction(-fix,'Fixkosten automatisch abgezogen','fixedcost',{cycle:cycle});
 $('salaryAmount').value='';$('salaryText').value='';refresh();
}
function addExpense(){var v=num("giroExpense");if(v<=0){alert("Bitte einen positiven Ausgabebetrag eingeben.");return;}bookTransaction(-v,$("giroText").value.trim()||"Ausgabe","expense",{cycle:activeCycleKey()});$("giroExpense").value="";$("giroText").value="";refresh();}
function withdraw(){var v=num("sWithdrawAmount"),g=currentGiro();if(v<=0){alert("Bitte einen Abhebebetrag eingeben.");return;}if(v>g){alert("Der Abhebebetrag ist höher als dein Girokontostand.");return;}bookTransaction(-v,"Bargeldabhebung","withdrawal",{cycle:activeCycleKey()});saveCash(cashBalance()+v);$("sWithdrawAmount").value="";refresh();}
function sunday(){
 var konto=currentGiro(),cash=cashBalance(),available=konto+cash,pay=remainingPayDays();
 var day=pay>0?available/pay:0;
 var suggested=pay>0?day*Math.min(7,pay):0;
 var next=nextWithdrawalDate();
 if($('bCarryCash')&&document.activeElement!==$('bCarryCash'))$('bCarryCash').value=cash.toFixed(2);
 if($('sTotal'))$('sTotal').textContent=eur(available);
 if($('sGiro'))$('sGiro').textContent=eur(konto);
 if($('sCash'))$('sCash').textContent=eur(cash);
 if($('sSuggested'))$('sSuggested').textContent=eur(suggested);
 if($('sAfter'))$('sAfter').textContent=eur(konto-num('sWithdrawAmount'));
 if($('nextWithdrawalDate'))$('nextWithdrawalDate').textContent=next?fmt(next):'–';
 if($('withdrawalDays'))$('withdrawalDays').textContent=daysUntilNextWithdrawal();
 if($('withdrawalHint'))$('withdrawalHint').textContent='Der rechnerische 7-Tage-Betrag ist nur eine Orientierung. Du entscheidest selbst, wie viel du abhebst.';
}
function tariffHour(){return 24.21;}

var pendingScan=[];
function esc(v){return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function scanWordType(txt){
 var t=String(txt||'').toLowerCase().trim()
   .replace(/[\[\]{}|:;,.!?]/g,'')
   .replace(/ä/g,'ä').replace(/ö/g,'ö').replace(/ü/g,'ü');
 // Deliberately target the short, unambiguous calendar labels.
 if(/^(nacht|nachtd|nachtdi|nachtdien|nachtdienst)$/.test(t) || /\bnacht\b/.test(t))return 'ND';
 if(/^(spät|spaet|spätd|spaetd|spätdi|spaetdi|spätad|spatd|spatdi|spätser|spaetser)$/.test(t) || /\bspät\b/.test(t) || /\bspaet\b/.test(t))return 'SD';
 if(/^(früh|frueh|frühd|fruehd|frühdi|fruehdi)$/.test(t) || /\bfrüh\b/.test(t) || /\bfrueh\b/.test(t))return 'FD';
 return null;
}
function makeRedMask(src){
 var c=document.createElement('canvas');c.width=src.width;c.height=src.height;
 var x=c.getContext('2d'),im=x.createImageData(src.width,src.height),ctx=src.getContext('2d'),d=ctx.getImageData(0,0,src.width,src.height).data,o=im.data;
 for(var i=0;i<d.length;i+=4){
   var r=d[i],g=d[i+1],b=d[i+2];
   // Keep white/light text on red event chips, suppress the red background.
   var red=(r>125&&r>g*1.10&&r>b*1.08);
   var light=(r>175&&g>175&&b>175);
   var j=i;
   if(red){o[j]=0;o[j+1]=0;o[j+2]=0;o[j+3]=255;}
   else if(light){o[j]=255;o[j+1]=255;o[j+2]=255;o[j+3]=255;}
   else{o[j]=255;o[j+1]=255;o[j+2]=255;o[j+3]=255;}
 }
 x.putImageData(im,0,0);return c;
}
function numericDateWords(words,year,month){
 return words.filter(function(w){
   var tx=String(w.text||'').trim().replace(/[^0-9]/g,'');var n=Number(tx);var b=w.bbox||{};
   var h=(b.y1-b.y0);return /^\d{1,2}$/.test(tx)&&n>=1&&n<=31&&b.y0>300&&b.y0<1100&&h<=34;
 }).map(function(w){var tx=String(w.text||'').trim().replace(/[^0-9]/g,'');return {n:Number(tx),bbox:w.bbox,conf:w.confidence||0};});
}
function dateForNumber(n,year,month){var d=new Date(year,month,n);return d.getMonth()===month&&d.getDate()===n?d:null;}
function nearestDateForService(box,dateWords){
 var cx=(box.x0+box.x1)/2,cy=(box.y0+box.y1)/2,best=null;
 dateWords.forEach(function(w){
   var wx=(w.bbox.x0+w.bbox.x1)/2,wy=(w.bbox.y0+w.bbox.y1)/2;
   var dy=Math.abs(cy-wy),dx=Math.abs(cx-wx);
   if(dy>150||dx>150)return;
   // Prefer same calendar week row and nearby column; vertical distance is primary.
   var score=dy*1.0+dx*0.75;
   if(!best||score<best.score)best={w:w,score:score};
 });
 return best?best.w:null;
}
async function scanSchedule(){
 var file=$('shiftImage')&&$('shiftImage').files[0],status=$('scanStatus');
 if(!file){alert('Bitte zuerst einen Screenshot auswählen.');return;}
 if(!window.Tesseract){alert('OCR-Modul konnte nicht geladen werden. Bitte Internetverbindung prüfen und die Seite neu laden.');return;}
 var mVal=$('scanMonth').value||'2026-10',parts=mVal.split('-'),year=Number(parts[0]),month=Number(parts[1])-1;
 status.textContent='Screenshot wird analysiert … gesucht wird gezielt nach „Früh“, „Spät“ und „Nacht“.';$('scanBtn').disabled=true;
 try{
   var img=await createImageBitmap(file),maxW=2200,scale=Math.min(1,maxW/img.width),canvas=document.createElement('canvas');
   canvas.width=Math.round(img.width*scale);canvas.height=Math.round(img.height*scale);
   var ctx=canvas.getContext('2d');ctx.drawImage(img,0,0,canvas.width,canvas.height);
   var worker=await Tesseract.createWorker('deu');
   var orig=await worker.recognize(canvas,{rotateAuto:true});
   var redCanvas=makeRedMask(canvas);
   var red=await worker.recognize(redCanvas,{rotateAuto:true});
   await worker.terminate();
   var ow=(orig.data.words||[]).filter(function(w){return w.text&&w.bbox;});
   var rw=(red.data.words||[]).filter(function(w){return w.text&&w.bbox;});
   var dates=numericDateWords(ow,year,month);
   numericDateWords(rw,year,month).forEach(function(w){
     var exists=dates.some(function(d){return d.n===w.n&&Math.abs(((d.bbox.x0+d.bbox.x1)/2)-((w.bbox.x0+w.bbox.x1)/2))<40&&Math.abs(((d.bbox.y0+d.bbox.y1)/2)-((w.bbox.y0+w.bbox.y1)/2))<45;});
     if(!exists)dates.push(w);
   });
   var pool=rw.concat(ow);
   var candidates=[];
   pool.forEach(function(w){
     var typ=scanWordType(w.text);if(!typ)return;
     var conf=Number(w.confidence)||0;if(conf<8)return;
     var dw=nearestDateForService(w.bbox,dates);if(!dw)return;
     var dt=dateForNumber(dw.n,year,month);if(!dt)return;
     candidates.push({date:dateKey(dt),type:typ,label:String(w.text||''),confidence:Math.round(conf),x:(w.bbox.x0+w.bbox.x1)/2,y:(w.bbox.y0+w.bbox.y1)/2});
   });
   var map={};candidates.forEach(function(c){
     var k=c.date+'|'+c.type;if(!map[k]||c.confidence>map[k].confidence)map[k]=c;
   });
   pendingScan=Object.values(map).sort(function(a,b){return a.date.localeCompare(b.date)||a.type.localeCompare(b.type);});
   renderScanResults();
   status.textContent=pendingScan.length?('Erkennung abgeschlossen: '+pendingScan.length+' mögliche Dienste. Bitte vor der Übernahme prüfen.'):'Keine eindeutigen Dienstbegriffe erkannt. Bitte die Dienste manuell eintragen.';
 }catch(e){console.error(e);status.textContent='Die automatische Analyse ist fehlgeschlagen. Du kannst die Dienste weiterhin manuell eingeben.';}
 $('scanBtn').disabled=false;
}
function renderScanResults(){var box=$('scanResults'),btn=$('applyScanBtn');if(!box)return;box.classList.remove('hidden');if(!pendingScan.length){box.innerHTML='<div class="note">Keine Dienste sicher erkannt.</div>';if(btn)btn.classList.add('hidden');return;}var rows=pendingScan.map(function(c){var d=new Date(c.date+'T12:00:00');var day=d.toLocaleDateString('de-DE',{weekday:'short',day:'2-digit',month:'2-digit'});var type=c.type==='FD'?'Frühdienst':c.type==='SD'?'Spätdienst':'Nachtdienst';return '<div class="row"><span>'+esc(day)+' · '+esc(type)+'</span><span class="v">'+esc(c.label)+' · '+c.confidence+' %</span></div>';}).join('');box.innerHTML='<div class="note"><b>Bitte vor der Übernahme prüfen:</b></div>'+rows;if(btn)btn.classList.remove('hidden');}
function applyScan(){var counts={FD:0,FDSo:0,SD:0,SDSa:0,SDSo:0,ND:0,NDSa:0,NDSo:0};pendingScan.forEach(function(c){var d=new Date(c.date+'T12:00:00'),dow=d.getDay();if(c.type==='FD'){if(dow===0)counts.FDSo++;else counts.FD++;}else if(c.type==='SD'){if(dow===0)counts.SDSo++;else if(dow===6)counts.SDSa++;else counts.SD++;}else if(c.type==='ND'){if(dow===0)counts.NDSo++;else if(dow===6)counts.NDSa++;else counts.ND++;}});$('pFD').value=counts.FD;$('pFDSo').value=counts.FDSo;$('pSD').value=counts.SD;$('pSDSa').value=counts.SDSa;$('pSDSo').value=counts.SDSo;$('pND').value=counts.ND;$('pNDSa').value=counts.NDSa;$('pNDSo').value=counts.NDSo;calcForecast();var s=$('scanStatus');if(s)s.textContent='Übernommen: '+pendingScan.length+' Dienste. Die Zuschlagsberechnung wurde aktualisiert.';}

function calcForecast(){var baseGross=num("pGrund")+num("pPflege")+num("pUni")+( $("pWechselOn")&&$("pWechselOn").value==="on" ? num("pWechsel") : 0 );var h=tariffHour();var fdSo=num("pFDSo")*8.2,sdWeek=num("pSD")*0.7,sdSo=num("pSDSo")*8.2,ndWeek=num("pND")*8.75,ndSa=num("pNDSa")*2.75,ndSoNight=num("pNDSo")*2.75,ndSaSun=num("pNDSa")*6.0,ndSoSun=num("pNDSo")*6.0;var nightHours=sdWeek+ndWeek+ndSa+ndSoNight,sunHours=fdSo+sdSo+ndSaSun+ndSoSun,saturdayPay=num("pSDSa")*7.5*0.64,night=nightHours*h*0.20,sundayPay=sunHours*h*0.25,protectedPay=night+sundayPay+saturdayPay;var baseRef=4730.43,netRef=num("pBasisNetto")||2991.52,estNetBase=netRef*(baseGross/baseRef),estimatedPfNet=estNetBase+protectedPay*0.72,garnish=estimatedPfNet>2868.87?136.94+(estimatedPfNet-2868.87)*((188.94-136.94)/(2991.52-2868.87)):0,payout=estimatedPfNet-garnish;if($("pBrutto"))$("pBrutto").textContent=eur(baseGross);if($("pNettoBasis"))$("pNettoBasis").textContent=eur(estNetBase);if($("pProtected"))$("pProtected").textContent=eur(protectedPay);if($("pGarnish"))$("pGarnish").textContent=eur(garnish);if($("pPayout"))$("pPayout").textContent=eur(payout);if($("pSurcharges"))$("pSurcharges").textContent=eur(protectedPay);if($("pShiftSummary"))$("pShiftSummary").textContent=nightHours.toFixed(2)+" h Nacht · "+sunHours.toFixed(2)+" h Sonntag · "+eur(saturdayPay)+" Samstag";}
function correctGiro(){var target=num("giroCorrection");if(target<0){alert("Bitte einen gültigen Kontostand eingeben.");return;}var current=currentGiro(),delta=target-current;if(Math.abs(delta)<0.005){$("giroCorrection").value="";alert("Der Kontostand entspricht bereits dem eingegebenen Wert.");return;}bookTransaction(delta,"Kontostand korrigiert","correction",{target:target,cycle:activeCycleKey()});$("giroCorrection").value="";refresh();}
function resetApp(){if(!confirm("Wirklich alle gespeicherten Eingaben und Buchungen löschen?"))return;["meinGeldplanGiroTx","meinGeldplanCash","meinGeldplanFixItems","meinGeldplanMonthlyFix"].forEach(function(k){localStorage.removeItem(k);});location.reload();}
function refresh(){renderTx();renderCycleExpenses();updateBudget();sunday();if($("giroCurrent"))$("giroCurrent").textContent=eur(currentGiro());calcForecast();}
function setDefaultMonth(){if($("pMonth")&&!$("pMonth").value){var d=new Date();$("pMonth").value=d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0");}}
function init(){ensureBase();setDefaultMonth();renderFixItems();if($("monthlyFix"))$("monthlyFix").value=fixTotal().toFixed(2);if($("bCarryCash"))$("bCarryCash").value=cashBalance().toFixed(2);if($("incomeBtn"))$("incomeBtn").onclick=addIncome;if($("expenseBtn"))$("expenseBtn").onclick=addExpense;if($("withdrawBtn"))$("withdrawBtn").onclick=withdraw;if($("salaryBtn"))$("salaryBtn").onclick=addSalary;if($("resetBtn"))$("resetBtn").onclick=resetApp;if($("scanBtn"))$("scanBtn").onclick=scanSchedule;if($("applyScanBtn"))$("applyScanBtn").onclick=applyScan;if($("correctionBtn"))$("correctionBtn").onclick=correctGiro;if($("addFixBtn"))$("addFixBtn").onclick=addFixItem;document.querySelectorAll("input,select").forEach(function(el){if(el.classList.contains("fix-name")||el.classList.contains("fix-amount"))return;el.addEventListener("input",function(){if(el.id==="monthlyFix")return;if(el.id==="bCarryCash")saveCash(num("bCarryCash"));refresh();});el.addEventListener("change",function(){if(el.id==="bCarryCash")saveCash(num("bCarryCash"));refresh();});});if($("monthlyFix"))$("monthlyFix").addEventListener("change",function(){var v=Math.max(0,num("monthlyFix")),a=fixItems();if(!a.length)a=[{id:"weitere",name:"Fixkosten",amount:v}];else{var sum=fixTotal();a[a.length-1].amount=Math.max(0,(a[a.length-1].amount||0)+(v-sum));}saveFixItems(a);renderFixItems();refresh();});document.querySelectorAll(".tab").forEach(function(b){b.addEventListener("click",function(){document.querySelectorAll(".tab").forEach(function(x){x.classList.remove("active")});b.classList.add("active");document.querySelectorAll(".view").forEach(function(v){v.classList.add("hidden")});var t=b.dataset.tab;if($(t))$(t).classList.remove("hidden");});});refresh();setInterval(refresh,60000);document.addEventListener("visibilitychange",function(){if(!document.hidden)refresh();});}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();
