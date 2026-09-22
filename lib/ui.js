export function $(id){return document.getElementById(id);}
export function num(id){const e=$(id);if(!e)return 0;const v=parseFloat(String(e.value||'').replace(',','.'));return Number.isFinite(v)?v:0;}
export function eur(value){return new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR'}).format(Number.isFinite(value)?value:0);}
export function fmt(date){return new Intl.DateTimeFormat('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'}).format(date);}
export function dateKey(date){return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;}
export function cycleKey(date){return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}`;}
export function openTab(id){document.querySelectorAll('.tab').forEach(item=>item.classList.toggle('active',item.dataset.tab===id));document.querySelectorAll('.view').forEach(view=>view.classList.toggle('hidden',view.id!==id));}
export function initTabs(){
  document.querySelectorAll('.tab').forEach((button)=>button.addEventListener('click',()=>{
    openTab(button.dataset.tab);
  }));
}
