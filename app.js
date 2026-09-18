const s={giro:153.30,cash:100,pay:'2026-09-30'};
function days(){const t=new Date(s.pay),n=new Date();n.setHours(0,0,0,0);return Math.max(0,Math.round((t-n)/86400000));}
function render(){const d=days(),tot=s.giro+s.cash;date.textContent=new Date().toLocaleDateString('de-DE');giro.textContent=s.giro.toFixed(2)+' €';cash.textContent=s.cash.toFixed(2)+' €';total.textContent=tot.toFixed(2)+' €';daysEl=document.getElementById('days');daysEl.textContent=d;day.textContent=(d?tot/d:0).toFixed(2)+' €';week.textContent=((d?tot/d:0)*7).toFixed(2)+' €';pay.textContent=new Date(s.pay).toLocaleDateString('de-DE');localStorage.gp35=JSON.stringify(s);}
function recommend(){rec.textContent='Empfohlene Abhebung: '+Math.max(0,120-s.cash).toFixed(2)+' €';}
function change(sign){const v=parseFloat(amt.value||0);if(!v)return;s.cash=Math.max(0,s.cash+v*sign);amt.value='';render();}
const saved=localStorage.gp35;if(saved)Object.assign(s,JSON.parse(saved));render();