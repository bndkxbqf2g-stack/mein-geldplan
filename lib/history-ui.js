import {getTransactions,getSavings,getSalaryForecasts,getPayslips,getPayrollLearning} from './storage.js';
import {plannedPaydayForDate,nextPaydayFrom,nextWithdrawalOrPayday} from './cycle.js';
import {$,eur,fmt} from './ui.js';
import {transactionTotals,monthlyStatistics,savingsStatistics} from './statistics.js';
import {learnedPayoutForForecast} from './payroll-learning-calibration.js';
import {buildPayrollControlHistory,buildPayrollCarryovers} from './payroll-control.js';
import {buildPayrollNetBreakdown} from './payroll-net-breakdown.js';

const relevant=t=>t&&t.type!=='base';
function monthKey(t){return String(t.date||'').slice(0,7);}
function monthLabel(key){const [y,m]=key.split('-');return `${m}/${y}`;}
function monthKeyFromDate(value){const d=new Date(value);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;}
function fullMonthLabel(key){const [y,m]=String(key).split('-').map(Number);return new Intl.DateTimeFormat('de-DE',{month:'long',year:'numeric'}).format(new Date(y,m-1,1));}
function txRow(t){const row=document.createElement('div');row.className='row';const l=document.createElement('span');l.textContent=`${t.date||''} · ${t.text||'Buchung'}`;const v=document.createElement('span');v.className='v';v.textContent=`${Number(t.amount)>=0?'+':''}${eur(Number(t.amount)||0)}`;row.append(l,v);return row;}

const VARIABLE_PAY_KEYS=['night','saturday','saturdayEvening','sunday','holiday','shift','springIn'];
const money=value=>Math.round((Number(value)||0)*100)/100;
const knownNumber=value=>value!==null&&value!==undefined&&Number.isFinite(Number(value));

function reportMonthForPaymentMonth(value){
  const [year,month]=String(value||'').split('-').map(Number);
  if(!year||!month)return null;
  const date=new Date(year,month-3,1);
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}`;
}
function variableGross(forecast={}){
  const components=forecast?.components;
  if(!components||VARIABLE_PAY_KEYS.some(key=>!knownNumber(components[key])))return null;
  return money(VARIABLE_PAY_KEYS.reduce((total,key)=>total+Number(components[key]),0));
}
function forecastNetEffect(forecast={}){
  if(knownNumber(forecast?.payout)&&knownNumber(forecast?.baselinePayout))return money(Number(forecast.payout)-Number(forecast.baselinePayout));
  if(forecast?.netEffects?.complete&&knownNumber(forecast?.netEffects?.totalNet))return money(forecast.netEffects.totalNet);
  return null;
}
function aggregateForecastsByPaymentMonth(forecasts=[]){
  const grouped=new Map();
  for(const forecast of Array.isArray(forecasts)?forecasts:[]){
    if(!forecast?.payoutMonth)continue;
    const list=grouped.get(forecast.payoutMonth)||[];
    list.push(forecast);
    grouped.set(forecast.payoutMonth,list);
  }
  return [...grouped.entries()].map(([payoutMonth,entries])=>{
    const reportMonths=[...new Set(entries.map(entry=>entry?.reportMonth).filter(Boolean))].sort();
    if(entries.length===1)return {...entries[0],reportMonths};
    const standardReportMonth=reportMonthForPaymentMonth(payoutMonth);
    const primary=entries.find(entry=>!entry?.paymentMonthOverride&&entry?.standardPayoutMonth===payoutMonth)
      ||entries.find(entry=>!entry?.paymentMonthOverride&&entry?.reportMonth===standardReportMonth)
      ||entries.find(entry=>entry?.standardPayoutMonth===payoutMonth)
      ||entries[0];
    const effects=entries.map(forecastNetEffect);
    const allEffectsKnown=effects.every(value=>value!=null);
    const primaryEffect=forecastNetEffect(primary);
    const baselinePayout=knownNumber(primary?.baselinePayout)
      ?money(primary.baselinePayout)
      :knownNumber(primary?.payout)&&primaryEffect!=null
        ?money(Number(primary.payout)-primaryEffect)
        :null;
    const payout=baselinePayout!=null&&allEffectsKnown
      ?money(baselinePayout+effects.reduce((total,value)=>total+value,0))
      :null;
    const baselineGross=knownNumber(primary?.baselineGross)
      ?money(primary.baselineGross)
      :knownNumber(primary?.totalGross)&&variableGross(primary)!=null
        ?money(Number(primary.totalGross)-variableGross(primary))
        :null;
    const variableGrossEntries=entries.map(variableGross);
    const allVariableGrossKnown=variableGrossEntries.every(value=>value!=null);
    const totalVariableGross=allVariableGrossKnown?money(variableGrossEntries.reduce((total,value)=>total+value,0)):null;
    const totalGross=baselineGross==null||totalVariableGross==null?null:money(baselineGross+totalVariableGross);
    const reportItems=entries.flatMap(entry=>Array.isArray(entry?.reportItems)?entry.reportItems:[]);
    const hours={};
    for(const key of new Set(entries.flatMap(entry=>Object.keys(entry?.components?.hours||{})))){
      const values=entries.map(entry=>entry?.components?.hours?.[key]).filter(knownNumber);
      if(values.length)hours[key]=money(values.reduce((total,value)=>total+Number(value),0));
    }
    const components={
      ...(primary?.components||{}),
      fixed:primary?.components?.fixed||null,
      hours,
      ...Object.fromEntries(VARIABLE_PAY_KEYS.map(key=>[key,entries.every(entry=>knownNumber(entry?.components?.[key]))?money(entries.reduce((total,entry)=>total+Number(entry.components[key]),0)):null])),
      shiftType:reportItems.some(item=>item?.code==='5211')?'wechsel':reportItems.some(item=>item?.code==='5212')?'schicht':primary?.components?.shiftType||'none',
      average21Days:money(entries.reduce((total,entry)=>total+(Number(entry?.components?.average21Days)||0),0)),
      unpriced:entries.flatMap(entry=>Array.isArray(entry?.components?.unpriced)?entry.components.unpriced:[]),
      springInVblUnverified:entries.some(entry=>Boolean(entry?.components?.springInVblUnverified))
    };
    const netEffects=allEffectsKnown
      ?{...(primary?.netEffects||{}),complete:true,basis:'monthly-aggregate',totalNet:money(effects.reduce((total,value)=>total+value,0))}
      :null;
    return {
      ...primary,
      payoutMonth,
      reportMonth:primary?.reportMonth||reportMonths[0]||null,
      reportMonths,
      standardPayoutMonth:primary?.standardPayoutMonth||payoutMonth,
      baselinePayout,
      baselineGross,
      payout,
      totalGross,
      netEffects,
      reportItems,
      components,
      paymentMonthOverrides:entries.filter(entry=>entry?.paymentMonthOverride).map(entry=>({reportMonth:entry.reportMonth,...entry.paymentMonthOverride})),
      needsReview:entries.some(entry=>Boolean(entry?.needsReview))||payout==null||totalGross==null||!allVariableGrossKnown
    };
  }).sort((a,b)=>String(a.payoutMonth).localeCompare(String(b.payoutMonth)));
}
function reportMonthsFor(forecast){
  const source=Array.isArray(forecast?.reportMonths)?forecast.reportMonths:[forecast?.reportMonth];
  return [...new Set(source.filter(Boolean))].sort();
}

function overviewCarryovers({forecasts=[],payslips=[]}={}){
  const monthlyForecasts=aggregateForecastsByPaymentMonth(forecasts);
  const safePayslips=Array.isArray(payslips)?payslips:[];
  const controls=buildPayrollControlHistory({forecasts:monthlyForecasts,payslips:safePayslips});
  const netByMonth={};
  for(const control of controls){
    if(!['open','partial'].includes(control.status))continue;
    const forecast=monthlyForecasts.find(entry=>entry?.payoutMonth===control.payoutMonth);
    const actual=safePayslips.find(entry=>entry?.month===control.payoutMonth)||{payout:control.actualPayout,hasPriorAdjustment:control.hasPriorAdjustment};
    const fallbackNetImpact=control.expectedPayout!=null&&control.actualPayout!=null&&control.remainingGross>0.005
      ?Math.max(0,control.expectedPayout-control.actualPayout)
      :null;
    try{
      const breakdown=buildPayrollNetBreakdown({
        forecast,
        actual,
        variableRows:control.variableRows,
        retro:control.retro,
        estimatedNetImpact:control.estimatedNetImpact??fallbackNetImpact
      });
      const net=Number(breakdown?.totalNet);
      if(Number.isFinite(net)&&net>0.005)netByMonth[control.payoutMonth]=money(net);
    }catch(error){
      // Die Übersicht bleibt nutzbar, auch wenn eine alte Prognose keine
      // vollständige Netto-Rückrechnung mehr zulässt.
    }
  }
  return buildPayrollCarryovers({controls,netByMonth});
}

export function expectedSalarySlots({today=new Date(),transactions=[],forecasts=[],payslips=[],learning=[]}={}){
  let firstPayday=plannedPaydayForDate(today);
  const firstMonth=monthKeyFromDate(firstPayday);
  const salaryAlreadyBooked=(Array.isArray(transactions)?transactions:[]).some(t=>t?.type==='salary'&&String(t.date||'').slice(0,7)===firstMonth);
  if(salaryAlreadyBooked)firstPayday=nextPaydayFrom(firstPayday);
  const months=[monthKeyFromDate(firstPayday),monthKeyFromDate(nextPaydayFrom(firstPayday))];
  const sourceForecasts=Array.isArray(forecasts)?forecasts:[];
  const monthlyForecasts=aggregateForecastsByPaymentMonth(sourceForecasts);
  const carryovers=overviewCarryovers({forecasts:sourceForecasts,payslips:Array.isArray(payslips)?payslips:[]});
  return months.map(payoutMonth=>{
    const forecast=monthlyForecasts.find(entry=>entry?.payoutMonth===payoutMonth);
    const actual=(Array.isArray(payslips)?payslips:[]).find(p=>p?.month===payoutMonth);
    const learned=forecast&&forecast.payout!=null&&Number.isFinite(Number(forecast.payout))?learnedPayoutForForecast(forecast,learning):null;
    const hasActual=actual?.payout!=null&&Number.isFinite(Number(actual.payout));
    const regularPayout=hasActual?Number(actual.payout):learned?.payout??null;
    const incoming=hasActual?[]:(carryovers[payoutMonth]||[]);
    const carryover=incoming.reduce((total,entry)=>total+(Number(entry?.net)||0),0);
    const reportMonths=forecast?reportMonthsFor(forecast):[];
    const payout=regularPayout==null?null:money(regularPayout+carryover);
    return {
      payoutMonth,
      label:fullMonthLabel(payoutMonth),
      status:hasActual?'actual':forecast?(payout==null?'review':'forecast'):'outstanding',
      payout,
      regularPayout,
      carryover:money(carryover),
      rawPayout:forecast?.payout!=null&&Number.isFinite(Number(forecast.payout))?Number(forecast.payout):null,
      reportMonth:forecast?.reportMonth||null,
      reportMonths,
      needsReview:Boolean(forecast?.needsReview),
      learningApplied:Boolean(!hasActual&&learned?.applied),
      learningAdjustment:!hasActual&&learned?.applied?learned.adjustment:0
    };
  });
}

export function overviewAvailableAmount({budget={},giro=0,cash=0}={}){
  const total=Number(giro||0)+Number(cash||0);
  return budget.active?Number(budget.weeklyBudget||0):total;
}

export function createHistoryUi({budgetUi}={}){
  function renderExpectedSalaries(){
    const wrap=$('ovExpectedSalaries');if(!wrap)return;
    const slots=expectedSalarySlots({today:new Date(),transactions:getTransactions(),forecasts:getSalaryForecasts(),payslips:getPayslips(),learning:getPayrollLearning()});
    wrap.innerHTML='';
    slots.forEach(slot=>{
      const row=document.createElement('div');row.className='expected-salary-row';
      const left=document.createElement('div');left.className='expected-salary-info';
      const title=document.createElement('strong');title.textContent=slot.label;
      const detail=document.createElement('span');
      const reportMonths=Array.isArray(slot.reportMonths)?slot.reportMonths.filter(Boolean):[];
      const sourceLabel=reportMonths.length>1?'Zeitnachweise ':'Zeitnachweis ';
      const sourceText=reportMonths.length?reportMonths.map(monthLabel).join(' + '):'vorhanden';
      detail.textContent=slot.status==='actual'
        ?'Bezügemitteilung vorhanden'
        :slot.status==='review'
          ?`Netto-Prognose unvollständig · ${sourceLabel}${sourceText}`
          :slot.status==='forecast'
            ?`${sourceLabel}${sourceText}${slot.carryover>0.005?' · inkl. Netto-Nachzahlung aus Vormonat':''}${slot.learningApplied?' · lernkalibriert':''}${slot.needsReview?' · Bitte prüfen':''}`
            :'Zeitnachweis ausstehend';
      left.append(title,detail);
      const value=document.createElement('div');value.className=`expected-salary-value ${slot.status==='outstanding'||slot.status==='review'?'outstanding':'good'}`;
      value.textContent=slot.status==='outstanding'?'Ausstehend':slot.payout==null?'Prüfen':eur(slot.payout);
      row.append(left,value);wrap.appendChild(row);
    });
  }
  function renderOverview(){
    const b=budgetUi.getBudget(),g=budgetUi.getGiro(),c=budgetUi.getCash(),available=overviewAvailableAmount({budget:b,giro:g,cash:c}),planned=plannedPaydayForDate(new Date());
    const vals={ovGiro:eur(g),ovCash:eur(c),ovAvailable:eur(available),ovCycle:b.active?`Budgetzyklus ${fmt(b.segmentStart)}–${fmt(b.segmentEnd)}`:'Kein aktiver Budgetzyklus',ovDaily:b.active?`Tagessatz ${eur(b.dailyBudget)}`:'Tagessatz –',ovNextPay:b.active?`Nächster Lohn ${fmt(b.nextPayday)}`:`Geplanter Lohn ${fmt(planned)}`};
    Object.entries(vals).forEach(([id,v])=>{if($(id))$(id).textContent=v;});
    if($('ovAvailableLabel'))$('ovAvailableLabel').textContent=b.active?'Wochenbudget':'Aktuell verfügbar';
    renderExpectedSalaries();
    renderWithdrawalInfo(b);
  }
  function renderWithdrawalInfo(b){const today=new Date(),payday=b.nextPayday||plannedPaydayForDate(today),next=nextWithdrawalOrPayday(today,payday);const text=next?fmt(next):'–';const days=next?Math.max(0,Math.round((new Date(next.getFullYear(),next.getMonth(),next.getDate())-new Date(today.getFullYear(),today.getMonth(),today.getDate()))/86400000)):'–';if($('nextWithdrawalDate'))$('nextWithdrawalDate').textContent=text;if($('withdrawalDays'))$('withdrawalDays').textContent=days;}
  function renderHistory(){const tx=getTransactions().filter(relevant),savings=getSavings(),full=$('fullTxList');if(full){full.innerHTML='';const shown=tx.slice().reverse();if(!shown.length)full.innerHTML='<div class="note">Noch keine Kontobewegungen.</div>';else shown.forEach(t=>full.appendChild(txRow(t)));}
    const stats=monthlyStatistics(tx,savings,6),totals=transactionTotals(tx),savingStats=savingsStatistics(savings);
    const statVals={statIncome:eur(totals.income),statExpenses:eur(totals.expenses),statWithdrawals:eur(totals.withdrawals),statSaved:eur(savingStats.total)};Object.entries(statVals).forEach(([id,v])=>{if($(id))$(id).textContent=v;});
    const compare=$('monthlyCompare');if(compare){compare.innerHTML='';stats.forEach(m=>{const row=document.createElement('div');row.className='row';row.innerHTML=`<span>${monthLabel(m.month)}</span><span class="v">+${eur(m.income)} · −${eur(m.expenses)} · Sparen ${eur(m.saved)}</span>`;compare.appendChild(row);});if(!stats.length)compare.innerHTML='<div class="note">Noch keine Monatsdaten.</div>';}
    const chart=$('monthlyChart');if(chart){chart.innerHTML='';const max=Math.max(1,...stats.map(x=>Math.max(x.expenses,x.saved)));stats.forEach(x=>{const wrap=document.createElement('div');wrap.className='bar-wrap';wrap.innerHTML=`<div class="bar-value">${Math.round(x.expenses)} €</div><div class="bar" style="height:${Math.max(4,x.expenses/max*110)}px"></div><div class="bar-label">${monthLabel(x.month)}</div>`;chart.appendChild(wrap);});}
    const savingList=$('savingStats');if(savingList){savingList.innerHTML='';if(!savingStats.byPosition.length)savingList.innerHTML='<div class="note">Noch keine Sparpositionen mit reserviertem Betrag.</div>';else savingStats.byPosition.forEach(item=>{const row=document.createElement('div');row.className='row';row.innerHTML=`<span>${item.name}${item.deleted?' (gelöscht)':''}</span><span class="v">${eur(item.amount)}</span>`;savingList.appendChild(row);});}
  }
  function init(){}
  function render(){renderOverview();renderHistory();}
  return {init,render};
}
