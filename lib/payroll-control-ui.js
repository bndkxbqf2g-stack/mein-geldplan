import {getSalaryForecasts,getPayslips} from './storage.js';
import {buildPayrollControlHistory,buildPayrollCarryovers,groupPayrollControlsByPayoutMonth,payrollControlStatusLabel,visiblePayrollControls,payrollControlSummary} from './payroll-control.js';
import {buildPayrollNetBreakdown} from './payroll-net-breakdown.js';
import {annualSpecialPaymentForecast,calculateAnnualSpecialPaymentNet} from './annual-special-payment.js';

const $=id=>document.getElementById(id);
const eur=v=>new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR'}).format(Number.isFinite(Number(v))?Number(v):0);
const value=v=>v==null?'–':eur(v);
const month=value=>{if(!value)return '–';const parts=String(value).split('-');return parts.length===2?parts[1]+'/'+parts[0]:String(value);};
const badgeClass=status=>status==='ok'||status==='settled'?'good':status==='open'||status==='partial'?'red':'warn';
const controlKey=item=>`${item?.reportMonth||''}:${item?.payoutMonth||''}`;
const round=v=>Math.round((Number(v)||0)*100)/100;
const sum=values=>round(values.reduce((total,v)=>total+(Number(v)||0),0));

function note(text,className='note'){const el=document.createElement('div');el.className=className;el.textContent=text;return el;}
function summaryRow(label,text){const row=document.createElement('div');row.className='row';const left=document.createElement('span');left.textContent=label;const right=document.createElement('span');right.className='v';right.textContent=text;row.append(left,right);return row;}
function summaryDetail(expected,accounted,open){if(accounted==null&&open==null)return 'erwartet '+value(expected);return 'erwartet '+value(expected)+' · berücksichtigt '+value(accounted)+' · offen '+value(open);}
function miniGrid(card,entries){const grid=document.createElement('div');grid.className='mini-grid';for(const [label,amount] of entries){const mini=document.createElement('div');mini.className='mini';const t=document.createElement('div');t.className='t';t.textContent=label;const n=document.createElement('div');n.className='n';n.textContent=value(amount);mini.append(t,n);grid.appendChild(mini);}card.appendChild(grid);}
function groupStatus(group){const statuses=group.controls.map(item=>item.status);if(statuses.includes('review')||group.controls.some(item=>item.needsReview))return 'review';if(statuses.includes('open'))return 'open';if(statuses.includes('partial'))return 'partial';if(statuses.every(status=>status==='waiting'))return 'waiting';if(statuses.every(status=>status==='settled'))return 'settled';return 'ok';}
function groupSummary(group,netContexts,specialPayment=null){
  const children=group.controls.map(item=>{
    const context=netContexts.get(controlKey(item));
    const summary=payrollControlSummary(item,context?.netBreakdown);
    const net=Number(context?.netBreakdown?.totalNet);
    return {item,context,summary,net:Number.isFinite(net)?net:(Number(summary.netImpact)||0)};
  });
  const variable=sum(children.map(child=>child.summary.expectedVariableGross));
  const taxFree=sum(children.map(child=>child.summary.expectedTaxFreeGross));
  const taxable=sum(children.map(child=>child.summary.expectedTaxableGross));
  const accountedTaxFree=children.every(child=>child.summary.accountedTaxFreeGross!=null)?sum(children.map(child=>child.summary.accountedTaxFreeGross)):null;
  const accountedTaxable=children.every(child=>child.summary.accountedTaxableGross!=null)?sum(children.map(child=>child.summary.accountedTaxableGross)):null;
  const openTaxFree=children.every(child=>child.summary.openTaxFreeGross!=null)?sum(children.map(child=>child.summary.openTaxFreeGross)):null;
  const openTaxable=children.every(child=>child.summary.openTaxableGross!=null)?sum(children.map(child=>child.summary.openTaxableGross)):null;
  const fixedGross=children[0]?.item.expectedGross!=null?round(children[0].item.expectedGross-children[0].summary.expectedVariableGross):null;
  const specialGross=Number.isFinite(Number(specialPayment?.gross))&&!specialPayment?.excluded?round(specialPayment.gross):0;
  const specialNet=Number.isFinite(Number(specialPayment?.net))&&!specialPayment?.excluded?round(specialPayment.net):null;
  const expectedGross=fixedGross==null?null:round(fixedGross+variable+specialGross);
  const netEffect=sum(children.map(child=>child.net));
  const basePayout=children[0]?.item.expectedPayout!=null?round(children[0].item.expectedPayout-children[0].net):null;
  const projectedPayout=basePayout==null?null:round(basePayout+netEffect+(specialNet??0));
  const actualPayout=children.find(child=>child.item.actualPayout!=null)?.item.actualPayout??null;
  return {children,variable,taxFree,taxable,accountedTaxFree,accountedTaxable,openTaxFree,openTaxable,expectedGross,netEffect,basePayout,projectedPayout,actualPayout,specialPayment:specialPayment||null,specialGross,specialNet};
}

export function renderPayrollControl(){
  const wrap=$('payrollControlList'),status=$('payrollControlStatus');if(!wrap)return;
  const forecasts=getSalaryForecasts(),payslips=getPayslips();
  const allControls=buildPayrollControlHistory({forecasts,payslips});
  const referenceSpecial=annualSpecialPayment||annualSpecialPaymentForecast({year:new Date().getFullYear(),payslips,forecasts});
  const actualSpecial=payslips.find(item=>item?.month===referenceSpecial?.paymentMonth&&Number.isFinite(Number(item?.specialPaymentGross)));
  const special=actualSpecial
    ?{...referenceSpecial,gross:Number(actualSpecial.specialPaymentGross),actual:true,excluded:false,net:null,needsReview:false}
    :referenceSpecial;
  const groups=visiblePayrollControls(groupPayrollControlsByPayoutMonth(allControls),3);
  const controls=groups.flatMap(group=>group.controls);
  const netContexts=new Map(),netByMonth={};
  for(const control of controls){const forecast=forecasts.find(entry=>entry.payoutMonth===control.payoutMonth&&(!control.reportMonth||entry.reportMonth===control.reportMonth));const actual=payslips.find(entry=>entry.month===control.payoutMonth)||{payout:control.actualPayout,hasPriorAdjustment:control.hasPriorAdjustment};try{const netBreakdown=buildPayrollNetBreakdown({forecast,actual,variableRows:control.variableRows,retro:control.retro,estimatedNetImpact:control.estimatedNetImpact});netContexts.set(controlKey(control),{forecast,actual,netBreakdown});const net=Number(netBreakdown.totalNet);if(Number.isFinite(net)&&net>0.005)netByMonth[control.payoutMonth]=(netByMonth[control.payoutMonth]||0)+net;}catch(error){console.error('[payroll-net-build]',control.payoutMonth,error);netContexts.set(controlKey(control),{forecast,actual,netBreakdown:null,error});}}
  const carryovers=buildPayrollCarryovers({controls,netByMonth});
  wrap.innerHTML='';
  if(!groups.length){wrap.appendChild(note('Noch keine gemeinsame Soll-/Ist-Grundlage. Zeitnachweis und Bezügemitteilung einlesen.','empty'));if(status)status.textContent='Noch keine vollständige Gehaltskontrolle möglich.';return;}
  const open=groups.filter(group=>['open','partial'].includes(groupStatus(group))).length;
  const review=groups.filter(group=>groupStatus(group)==='review').length;
  if(status)status.textContent=open?open+' der letzten drei Auszahlungsmonate mit offenem Anspruch.':review?'Die letzten drei Auszahlungsmonate enthalten Positionen zur Prüfung.':'Die letzten drei Auszahlungsmonate sind vollständig prüfbar bzw. ausgeglichen.';
  for(const group of groups){const groupSpecial=special?.paymentMonth===group.payoutMonth?special:null;const summary=groupSummary(group,netContexts,groupSpecial),state=groupStatus(group),card=document.createElement('div');card.className='payroll-control-card';const head=document.createElement('div');head.className='payroll-control-head';const title=document.createElement('div');const strong=document.createElement('b');strong.textContent=group.label;const sub=document.createElement('span');sub.textContent='Auszahlungsmonat '+month(group.payoutMonth)+' · '+group.controls.length+' Leistungsmonat'+(group.controls.length===1?'':'e');title.append(strong,sub);const badge=document.createElement('span');badge.className='badge '+badgeClass(state);badge.textContent=payrollControlStatusLabel(state);head.append(title,badge);card.appendChild(head);
    const waiting=state==='waiting';
    miniGrid(card,waiting?[['Soll-Brutto gesamt',summary.expectedGross],['Prognose Auszahlung',summary.projectedPayout],['Nettoeffekt Zuschläge',summary.netEffect]]:[['Soll-Brutto gesamt',summary.expectedGross],['Tatsächlich ausgezahlt',summary.actualPayout],['Nettoeffekt Zuschläge',summary.netEffect]]);
    const heading=document.createElement('div');heading.className='payroll-control-group';heading.textContent='Nachvollziehbare Zuschlagsübersicht';card.appendChild(heading);
    card.appendChild(summaryRow('Leistungsmonate / Auszahlung',group.controls.map(item=>month(item.reportMonth)+' → '+month(item.payoutMonth)).join(' · ')));
    card.appendChild(summaryRow('Variable Bezüge gesamt',value(summary.variable)));
    if(summary.specialGross>0.005){
      const specialLabel=summary.specialPayment?.actual?'Jahressonderzahlung (Ist)':summary.specialNet!=null?'Jahressonderzahlung':'Jahressonderzahlung (prognostiziert)';
      const specialValue=summary.specialNet!=null?value(summary.specialGross)+' brutto · '+value(summary.specialNet)+' netto':value(summary.specialGross)+' brutto';
      card.appendChild(summaryRow(specialLabel,specialValue));
    }
    card.appendChild(summaryRow('Steuerfrei',summaryDetail(summary.taxFree,summary.accountedTaxFree,summary.openTaxFree)));
    card.appendChild(summaryRow('Steuerpflichtig',summaryDetail(summary.taxable,summary.accountedTaxable,summary.openTaxable)));
    card.appendChild(summaryRow(waiting?'Gesamtnetto inkl. Zuschläge':'Nettoeffekt Zuschläge',waiting?value(summary.projectedPayout):value(summary.netEffect)));
    const origins=document.createElement('div');origins.className='payroll-control-group';origins.textContent='Herkunft der Zuschläge / Nachzahlungen';card.appendChild(origins);
    for(const child of summary.children){const row=document.createElement('div');row.className='row';const left=document.createElement('span');left.textContent=month(child.item.reportMonth)+' → '+month(child.item.payoutMonth);if(child.item.paymentMonthOverride){const small=document.createElement('small');small.textContent='regulär '+month(child.item.standardPayoutMonth)+', einmalig verspätet';left.appendChild(small);}const right=document.createElement('span');right.className='v';right.textContent=value(child.summary.expectedVariableGross)+' · Netto '+value(child.net);row.append(left,right);card.appendChild(row);for(const review of child.item.reviewRows||[]){card.appendChild(note(review.label+(review.quantity?': '+review.quantity:'')+' · '+review.reason,'note payroll-alert'));}}
    const incoming=carryovers[group.payoutMonth]||[];if(incoming.length){const cg=document.createElement('div');cg.className='payroll-control-group';cg.textContent='Nachzahlung aus Vormonat';card.appendChild(cg);for(const carry of incoming){const row=document.createElement('div');row.className='row';const left=document.createElement('span');left.textContent=carry.sourceLabel;if(carry.gross!=null){const small=document.createElement('small');small.textContent=value(carry.gross)+' brutto offen';left.appendChild(small);}const right=document.createElement('span');right.className='v good';right.textContent='+'+value(carry.net)+' netto';row.append(left,right);card.appendChild(row);}}
    const retroNotes=new Set();for(const child of summary.children)for(const retro of child.item.retro||[])retroNotes.add('Rückrechnung in '+month(retro.paidWithMonth)+' für '+month(retro.month)+': '+value(retro.totalGross)+' Brutto.');for(const text of retroNotes)card.appendChild(note(text,'note payroll-retro-note'));
    if(summary.children.some(child=>child.item.hasDetailedForecast===false))card.appendChild(note('Für ältere Prognosen ohne gespeicherte Einzelbestandteile ist die Brutto-/Nettoaufteilung nur so weit ausgewiesen, wie sie sicher nachvollziehbar ist.','note payroll-alert'));
    if(state==='review')card.appendChild(note('Mindestens ein Bestandteil ist noch nicht eindeutig berechenbar oder weicht vom Modell ab.','note payroll-alert'));
    wrap.appendChild(card);
  }
  if(!annualSpecialPayment&&special?.gross!=null&&!special?.actual){
    calculateAnnualSpecialPaymentNet({forecast:special}).then(net=>{
      if(net)renderPayrollControl({annualSpecialPayment:{...special,...net,net:net.payout}});
    }).catch(error=>console.error('[annual-special-payment-control]',error));
  }
}
