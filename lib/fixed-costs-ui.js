import {getFixedCosts,saveFixedCosts,getFixedCostOverrides,saveFixedCostOverrides,getTransactions} from './storage.js';
import {normalizeFixedCosts,totalFixedCosts,addFixedCost,updateFixedCost,removeFixedCost} from './fixed-costs.js';
import {nextFixedCostPayoutDate,overrideFor,setFixedCostOverride,removeFixedCostOverride,totalFixedCostsForPayout} from './fixed-cost-overrides.js';
import {$,eur,fmt} from './ui.js';

export function createFixedCostsUi({refresh=()=>{}}={}){
  const get=()=>normalizeFixedCosts(getFixedCosts());
  const getOverrides=()=>getFixedCostOverrides();
  const save=value=>saveFixedCosts(value);
  const saveOverrides=value=>saveFixedCostOverrides(value);
  const targetDate=()=>nextFixedCostPayoutDate({today:new Date(),transactions:getTransactions()});

  function render(){
    const list=$('fixItems'),items=get(),payoutDate=targetDate(),overrides=getOverrides();
    if($('fixTotal'))$('fixTotal').textContent=eur(totalFixedCosts(items));
    if($('fixNextDate'))$('fixNextDate').textContent=fmt(payoutDate);
    if($('fixNextTotal'))$('fixNextTotal').textContent=eur(totalFixedCostsForPayout(items,overrides,payoutDate));
    if(!list)return;
    list.innerHTML='';
    items.forEach(item=>{
      const card=document.createElement('div');card.className='fix-item-card';
      const row=document.createElement('div');row.className='fix-item';
      const name=document.createElement('input');name.value=item.name;name.setAttribute('aria-label','Bezeichnung');
      const amount=document.createElement('input');amount.type='number';amount.step='.01';amount.min='0';amount.value=item.amount.toFixed(2);amount.setAttribute('aria-label','Betrag');
      const del=document.createElement('button');del.type='button';del.textContent='×';del.setAttribute('aria-label',`${item.name} löschen`);
      const existing=overrideFor(overrides,item.id,payoutDate);

      name.onchange=()=>{save(updateFixedCost(get(),item.id,{name:name.value}));refresh();};
      amount.onchange=()=>{
        const nextAmount=Math.max(0,Number(amount.value)||0);
        save(updateFixedCost(get(),item.id,{amount:nextAmount}));
        const current=overrideFor(getOverrides(),item.id,payoutDate);
        if(current&&current.amount>=nextAmount)saveOverrides(removeFixedCostOverride(getOverrides(),item.id,payoutDate));
        refresh();
      };
      del.onclick=()=>{
        save(removeFixedCost(get(),item.id));
        saveOverrides(getOverrides().filter(entry=>entry.fixedCostId!==String(item.id)));
        refresh();
      };
      row.append(name,amount,del);

      const once=document.createElement('div');once.className='fix-once-row';
      const label=document.createElement('span');label.className='fix-once-label';label.textContent=`Einmalig ${fmt(payoutDate)}`;
      const select=document.createElement('select');select.className='fix-once-select';select.setAttribute('aria-label',`${item.name} im nächsten Lohnzyklus`);
      select.innerHTML='<option value="normal">Normal</option><option value="pause">Pausieren</option><option value="reduce">Reduzieren</option>';
      const reduce=document.createElement('input');reduce.className='fix-once-amount';reduce.type='number';reduce.step='.01';reduce.min='0';reduce.max=String(item.amount);reduce.placeholder='Neuer Betrag';reduce.setAttribute('aria-label',`${item.name} einmalig reduzieren auf`);

      const mode=!existing?'normal':existing.amount===0?'pause':'reduce';
      select.value=mode;
      reduce.classList.toggle('hidden',mode!=='reduce');
      if(existing&&mode==='reduce')reduce.value=existing.amount.toFixed(2);

      const status=document.createElement('span');status.className='fix-once-status';
      status.textContent=!existing?'normal':existing.amount===0?`pausiert · statt ${eur(item.amount)}`:`${eur(existing.amount)} statt ${eur(item.amount)}`;

      select.onchange=()=>{
        if(select.value==='normal'){
          saveOverrides(removeFixedCostOverride(getOverrides(),item.id,payoutDate));refresh();return;
        }
        if(select.value==='pause'){
          saveOverrides(setFixedCostOverride(getOverrides(),{fixedCostId:item.id,payoutDate,amount:0,baseAmount:item.amount}));refresh();return;
        }
        reduce.classList.remove('hidden');
        reduce.value=existing&&existing.amount>0?existing.amount.toFixed(2):'';
        reduce.focus();
      };
      reduce.onchange=()=>{
        const next=Math.max(0,Number(reduce.value)||0);
        if(next>=item.amount){
          saveOverrides(removeFixedCostOverride(getOverrides(),item.id,payoutDate));
        }else{
          saveOverrides(setFixedCostOverride(getOverrides(),{fixedCostId:item.id,payoutDate,amount:next,baseAmount:item.amount}));
        }
        refresh();
      };

      once.append(label,select,reduce,status);
      card.append(row,once);list.appendChild(card);
    });
  }

  function add(){save(addFixedCost(get()));refresh();}
  function init(){if(getFixedCosts()===null)save(get());if($('addFixBtn'))$('addFixBtn').onclick=add;}
  return {init,render,getTotal:()=>totalFixedCosts(get())};
}
