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
    const normalTotal=totalFixedCosts(items),nextTotal=totalFixedCostsForPayout(items,overrides,payoutDate),delta=nextTotal-normalTotal;
    if($('fixTotal'))$('fixTotal').textContent=eur(normalTotal);
    if($('fixNextDate'))$('fixNextDate').textContent=fmt(payoutDate);
    if($('fixNextTotal'))$('fixNextTotal').textContent=eur(nextTotal);
    if($('fixNextHint'))$('fixNextHint').textContent=Math.abs(delta)<.005?'keine einmalige Änderung':delta<0?`${eur(Math.abs(delta))} weniger als regulär`:`${eur(delta)} mehr als regulär`;
    if(!list)return;
    list.innerHTML='';
    items.forEach(item=>{
      const card=document.createElement('div');card.className='fix-item-card';
      const existing=overrideFor(overrides,item.id,payoutDate);
      if(existing)card.classList.add('has-override');

      const row=document.createElement('div');row.className='fix-item';
      const identity=document.createElement('div');identity.className='fix-item-identity';
      const icon=document.createElement('div');icon.className='fix-item-icon';icon.textContent=(item.name.trim()[0]||'•').toUpperCase();
      const nameWrap=document.createElement('label');nameWrap.className='fix-field fix-name-field';
      const nameCaption=document.createElement('span');nameCaption.textContent='Bezeichnung';
      const name=document.createElement('input');name.className='fix-name-input';name.value=item.name;name.setAttribute('aria-label','Bezeichnung');
      nameWrap.append(nameCaption,name);identity.append(icon,nameWrap);

      const amountWrap=document.createElement('label');amountWrap.className='fix-field fix-amount-field';
      const amountCaption=document.createElement('span');amountCaption.textContent='Monatlich';
      const amount=document.createElement('input');amount.className='fix-amount-input';amount.type='number';amount.step='.01';amount.min='0';amount.value=item.amount.toFixed(2);amount.setAttribute('aria-label','Betrag');
      amountWrap.append(amountCaption,amount);

      const del=document.createElement('button');del.type='button';del.className='fix-delete';del.textContent='×';del.setAttribute('aria-label',`${item.name} löschen`);

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
      row.append(identity,amountWrap,del);

      const once=document.createElement('details');once.className='fix-once-row';
      once.open=Boolean(existing);
      const summary=document.createElement('summary');summary.className='fix-once-summary';
      const summaryText=document.createElement('span');summaryText.textContent='Nächsten Lohn anpassen';
      const status=document.createElement('span');status.className='fix-once-status';
      status.textContent=!existing?'Normal':existing.amount===0?'Pausiert':`${eur(existing.amount)} statt ${eur(item.amount)}`;
      summary.append(summaryText,status);

      const controls=document.createElement('div');controls.className='fix-once-controls';
      const label=document.createElement('span');label.className='fix-once-label';label.textContent=`Gilt einmalig am ${fmt(payoutDate)}`;
      const select=document.createElement('select');select.className='fix-once-select';select.setAttribute('aria-label',`${item.name} im nächsten Lohnzyklus`);
      select.innerHTML='<option value="normal">Normal</option><option value="pause">Pausieren</option><option value="reduce">Reduzieren</option>';
      const reduce=document.createElement('input');reduce.className='fix-once-amount';reduce.type='number';reduce.step='.01';reduce.min='0';reduce.max=String(item.amount);reduce.placeholder='Neuer Betrag';reduce.setAttribute('aria-label',`${item.name} einmalig reduzieren auf`);

      const mode=!existing?'normal':existing.amount===0?'pause':'reduce';
      select.value=mode;
      reduce.classList.toggle('hidden',mode!=='reduce');
      if(existing&&mode==='reduce')reduce.value=existing.amount.toFixed(2);

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

      controls.append(label,select,reduce);
      once.append(summary,controls);
      card.append(row,once);list.appendChild(card);
    });
  }

  function add(){save(addFixedCost(get()));refresh();}
  function init(){if(getFixedCosts()===null)save(get());if($('addFixBtn'))$('addFixBtn').onclick=add;if($('addFixMobileBtn'))$('addFixMobileBtn').onclick=add;}
  return {init,render,getTotal:()=>totalFixedCosts(get())};
}
