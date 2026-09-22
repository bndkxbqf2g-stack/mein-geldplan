import {getSavings,saveSavings} from './storage.js';
import {createSavingsPosition,addSavingsPosition,createSavingsAllocation,addSavingsAllocation,renameSavingsPosition,deleteSavingsPosition,reverseSavingsAllocation,activeSavingsPositions,activeSavingsAllocations,savedForPosition,savingsForSegment,maxSavingsForSegment} from './savings.js';
import {nextSegmentStart} from './cycle.js';
import {$,num,eur,dateKey,notify} from './ui.js';

export function createSavingsUi({budgetUi,refresh=()=>{}}={}){
  const today=()=>dateKey(new Date());

  function render(){
    const data=getSavings(),positions=activeSavingsPositions(data),allocations=activeSavingsAllocations(data),list=$('savingsList'),select=$('sSavingPosition'),b=budgetUi.getBudget(),segment=b.segmentStart?dateKey(b.segmentStart):'',already=savingsForSegment(data,segment),max=maxSavingsForSegment(b.weeklyBudget,budgetUi.getCash(),already);
    if($('sSaveMax'))$('sSaveMax').textContent=eur(max);
    if(select){
      const selected=select.value;
      select.innerHTML='<option value="">Sparposition wählen</option>';
      positions.forEach(position=>{const option=document.createElement('option');option.value=position.id;option.textContent=position.name;select.appendChild(option);});
      if(positions.some(p=>p.id===selected))select.value=selected;
    }
    if(!list)return;
    list.innerHTML='';
    if(!positions.length){list.innerHTML='<div class="note">Noch keine Sparposition angelegt.</div>';return;}
    positions.forEach(position=>{
      const card=document.createElement('div');card.className='saving-card';
      const head=document.createElement('div');head.className='saving-head';
      const title=document.createElement('div');title.innerHTML=`<b>${escapeHtml(position.name)}</b><div class="note">Reserviert: ${eur(savedForPosition(data,position.id))}</div>`;
      const actions=document.createElement('div');actions.className='saving-actions';
      const rename=document.createElement('button');rename.type='button';rename.className='saving-action';rename.textContent='Umbenennen';rename.onclick=()=>renamePosition(position);
      const remove=document.createElement('button');remove.type='button';remove.className='saving-action danger-lite';remove.textContent='Löschen';remove.onclick=()=>removePosition(position);
      actions.append(rename,remove);head.append(title,actions);card.appendChild(head);
      const positionAllocations=allocations.filter(item=>item.positionId===position.id).slice().reverse();
      if(positionAllocations.length){
        const items=document.createElement('div');items.className='saving-rates';
        positionAllocations.forEach(allocation=>{
          const row=document.createElement('div');row.className='saving-rate';
          const text=document.createElement('span');text.textContent=`${allocation.date||'Sparrate'} · ${eur(allocation.amount)}`;
          const undo=document.createElement('button');undo.type='button';undo.className='saving-action';undo.textContent='↩ Freigeben';undo.onclick=()=>undoAllocation(allocation);
          row.append(text,undo);items.appendChild(row);
        });
        card.appendChild(items);
      }
      list.appendChild(card);
    });
  }

  function escapeHtml(value){return String(value).replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));}

  function addPosition(){
    const name=$('sSavingName')?.value.trim()||'';
    if(!name)return notify('Bitte einen Namen für die Sparposition eingeben.',{type:'error'});
    try{saveSavings(addSavingsPosition(getSavings(),createSavingsPosition(name)));$('sSavingName').value='';refresh();}
    catch(error){notify(error.message||'Sparposition konnte nicht angelegt werden.',{type:'error'});}
  }

  function renamePosition(position){
    const name=prompt('Neuer Name der Sparposition:',position.name);
    if(name===null)return;
    try{saveSavings(renameSavingsPosition(getSavings(),position.id,name));refresh();}
    catch(error){notify(error.message||'Sparposition konnte nicht umbenannt werden.',{type:'error'});}
  }

  function removePosition(position){
    const amount=savedForPosition(getSavings(),position.id);
    const message=amount>0
      ? `„${position.name}“ löschen? ${eur(amount)} werden wieder für dein Budget freigegeben.`
      : `„${position.name}“ wirklich löschen?`;
    if(!confirm(message))return;
    saveSavings(deleteSavingsPosition(getSavings(),position.id,today()));
    refresh();
  }

  function undoAllocation(allocation){
    if(!confirm(`${eur(allocation.amount)} wieder für dein Budget freigeben?`))return;
    saveSavings(reverseSavingsAllocation(getSavings(),allocation.id,today()));
    refresh();
  }

  function saveRate(){
    const amount=num('sSavingAmount'),positionId=$('sSavingPosition')?.value||'',b=budgetUi.getBudget();
    if(!b.segmentStart)return notify('Kein aktiver Budgetabschnitt gefunden.',{type:'error'});
    const segment=dateKey(b.segmentStart),data=getSavings(),already=savingsForSegment(data,segment),max=maxSavingsForSegment(b.weeklyBudget,budgetUi.getCash(),already);
    if(amount<=0)return notify('Bitte eine positive Sparrate eingeben.',{type:'error'});
    if(!positionId)return notify('Bitte eine Sparposition auswählen.',{type:'error'});
    if(amount>max+0.009)return notify(`Für diesen Abschnitt kannst du maximal ${eur(max)} zusätzlich reservieren.`,{type:'error'});
    const next=nextSegmentStart(b.segmentStart,b.nextPayday)||b.nextPayday;
    try{saveSavings(addSavingsAllocation(data,createSavingsAllocation({positionId,amount,date:today(),sourceSegmentStart:segment,effectiveFrom:dateKey(next)})));$('sSavingAmount').value='';refresh();}
    catch(error){notify(error.message||'Sparrate konnte nicht gespeichert werden.',{type:'error'});}
  }

  function init(){if($('savingPositionBtn'))$('savingPositionBtn').onclick=addPosition;if($('savingRateBtn'))$('savingRateBtn').onclick=saveRate;}
  return {init,render};
}
