import {getSalaryForecasts,getPayslips} from './storage.js';
import {buildPayrollControlHistory,payrollControlStatusLabel} from './payroll-control.js';
import {buildPayrollNetBreakdown} from './payroll-net-breakdown.js';
import {appendPayrollNetBreakdown} from './payroll-net-ui.js';

const $=id=>document.getElementById(id);
const eur=v=>new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR'}).format(Number.isFinite(Number(v))?Number(v):0);
const value=v=>v==null?'–':eur(v);
const month=value=>{
  if(!value)return '–';
  const parts=String(value).split('-');
  return parts.length===2?parts[1]+'/'+parts[0]:String(value);
};
const badgeClass=status=>status==='ok'||status==='settled'?'good':status==='open'?'red':'warn';

function line(label,expected,actual,status,detail=''){
  const row=document.createElement('div');row.className='payroll-control-line';
  const a=document.createElement('span');a.textContent=label;
  if(detail){const small=document.createElement('small');small.textContent=detail;a.appendChild(small);}
  const b=document.createElement('span');b.textContent='Soll '+value(expected);
  const c=document.createElement('span');c.textContent='Ist '+(actual==null?'nicht eindeutig':value(actual));
  const d=document.createElement('strong');d.className=status==='ok'?'good':status==='open'||status==='different'?'red':'warn';
  d.textContent=status==='ok'?'✓':status==='different'?'Abweichung':status==='open'?'offen':'prüfen';
  row.append(a,b,c,d);return row;
}

function note(text,className='note'){
  const el=document.createElement('div');el.className=className;el.textContent=text;return el;
}

export function renderPayrollControl(){
  const wrap=$('payrollControlList'),status=$('payrollControlStatus');
  if(!wrap)return;
  const controls=buildPayrollControlHistory({forecasts:getSalaryForecasts(),payslips:getPayslips()});
  wrap.innerHTML='';
  if(!controls.length){
    wrap.appendChild(note('Noch keine gemeinsame Soll-/Ist-Grundlage. Zeitnachweis und Bezügemitteilung einlesen.','empty'));
    if(status)status.textContent='Noch keine vollständige Gehaltskontrolle möglich.';
    return;
  }
  const open=controls.filter(item=>item.status==='open'||item.status==='partial').length;
  const review=controls.filter(item=>item.status==='review'||item.needsReview).length;
  if(status)status.textContent=open?open+' Abrechnungsmonat(e) mit offenem Anspruch.':review?'Kontrolle enthält Positionen zur Prüfung.':'Alle vollständig prüfbaren Monate sind ausgeglichen.';

  for(const item of controls){
    const card=document.createElement('div');card.className='payroll-control-card';
    const head=document.createElement('div');head.className='payroll-control-head';
    const title=document.createElement('div');const strong=document.createElement('b');strong.textContent=item.label;
    const sub=document.createElement('span');sub.textContent=item.reportMonth?'Zeitnachweis '+month(item.reportMonth)+' → Auszahlungsmonat':'Auszahlungsmonat';title.append(strong,sub);
    const badge=document.createElement('span');badge.className='badge '+badgeClass(item.status);badge.textContent=payrollControlStatusLabel(item.status);
    head.append(title,badge);card.appendChild(head);

    const grid=document.createElement('div');grid.className='mini-grid';
    for(const entry of [['Soll-Brutto',item.expectedGross],['Ist-Brutto',item.actualGross],['Noch offen',item.remainingGross]]){
      const mini=document.createElement('div');mini.className='mini';
      const t=document.createElement('div');t.className='t';t.textContent=entry[0];
      const n=document.createElement('div');n.className='n';n.textContent=value(entry[1]);
      if(entry[0]==='Noch offen'&&Number(entry[1])>1)n.classList.add('red');
      mini.append(t,n);grid.appendChild(mini);
    }
    card.appendChild(grid);

    const payoutRow=document.createElement('div');payoutRow.className='row';
    const payoutLabel=document.createElement('span');payoutLabel.textContent=item.hasPriorAdjustment?'Auszahlung laut Abrechnung inkl. Nachverrechnung':'Soll / Ist Auszahlung';
    const payoutValue=document.createElement('span');payoutValue.className='v';payoutValue.textContent=value(item.expectedPayout)+' / '+value(item.actualPayout);
    payoutRow.append(payoutLabel,payoutValue);card.appendChild(payoutRow);

    if(item.inferredMissingVariablePay)card.appendChild(note('Die festen Bezüge stimmen; die Bruttodifferenz entspricht den erwarteten variablen Bezügen. Die fehlenden Zuschläge/Zulage sind damit rechnerisch nachvollziehbar.','note payroll-alert'));
    const forecast=getSalaryForecasts().find(entry=>entry.payoutMonth===item.payoutMonth);
    const actual=getPayslips().find(entry=>entry.month===item.payoutMonth)||{payout:item.actualPayout,hasPriorAdjustment:item.hasPriorAdjustment};
    const fallbackNetImpact=item.expectedPayout!=null&&item.actualPayout!=null&&item.remainingGross>0.005?Math.max(0,item.expectedPayout-item.actualPayout):null;
    try{
      const netBreakdown=buildPayrollNetBreakdown({forecast,actual,variableRows:item.variableRows,retro:item.retro,estimatedNetImpact:item.estimatedNetImpact??fallbackNetImpact});
      if(!item.hasDetailedForecast&&!['actual-payslip-summary','legacy-summary-recalculated'].includes(netBreakdown.source))card.appendChild(note('Für die komponentengenaue Kontrolle diesen Zeitnachweis einmal neu einlesen. Ältere gespeicherte Prognosen enthalten noch keine Einzelbestandteile.','note payroll-alert'));
      appendPayrollNetBreakdown(card,{...item,netBreakdown});
    }catch(error){
      console.error('[payroll-net-render]',item.payoutMonth,error);
      card.appendChild(note('Die Netto-Rückrechnung konnte für diesen Monat nicht geladen werden. Die Brutto-Kontrolle bleibt sichtbar.','note payroll-alert'));
    }

    const fg=document.createElement('div');fg.className='payroll-control-group';fg.textContent='Feste Bezüge';card.appendChild(fg);
    item.fixedRows.forEach(row=>card.appendChild(line(row.label,row.expected,row.actual,row.status)));

    if(item.variableRows.length){
      const vg=document.createElement('div');vg.className='payroll-control-group';vg.textContent='Zeitnachweis / variable Bezüge';card.appendChild(vg);
      item.variableRows.forEach(row=>{
        const el=line(row.label,row.expected,row.actual,row.status,row.tax);
        if(row.retro>0){
          const retro=document.createElement('em');retro.textContent='Rückrechnung +'+eur(row.retro);el.children[2].appendChild(retro);
        }else if(row.retroAggregate){
          const retro=document.createElement('em');retro.textContent='durch Gesamt-Rückrechnung ausgeglichen';el.children[2].appendChild(retro);
        }
        if(row.open!=null&&row.open>1)el.lastChild.textContent=eur(row.open)+' offen';
        card.appendChild(el);
      });
    }
    if(item.reviewRows?.length){
      const rg=document.createElement('div');rg.className='payroll-control-group';rg.textContent='Noch nicht automatisch berechenbar';card.appendChild(rg);
      item.reviewRows.forEach(row=>card.appendChild(note(row.label+(row.quantity?': '+row.quantity:'')+' · '+row.reason,'note payroll-alert')));
    }

    item.retro.forEach(r=>card.appendChild(note('Rückrechnung in '+month(r.paidWithMonth)+' für '+month(r.month)+': '+value(r.totalGross)+' Brutto'+(r.retroCount>1?' · zusammen mit weiteren Rückrechnungen':'')+'.','note payroll-retro-note')));

    if(item.exactRetroNet!=null){
      const row=document.createElement('div');row.className='row';
      const l=document.createElement('span');l.textContent='Tatsächlicher Nettoeffekt der Rückrechnung';
      const v=document.createElement('span');v.className='v good';v.textContent=eur(item.exactRetroNet);row.append(l,v);card.appendChild(row);
    }else if(item.retro.length&&item.status==='settled'){
      card.appendChild(note('Der Nettoeffekt ist in der aktuellen Bezügemitteilung nicht eindeutig diesem einen Altmonat zuordenbar. Die App zeigt deshalb keinen geratenen Nettobetrag.','note'));
    }else if(item.estimatedNetImpact!=null){
      const row=document.createElement('div');row.className='row';
      const l=document.createElement('span');l.textContent='Geschätzter Nettoeffekt des Soll-Zuschlags';
      const v=document.createElement('span');v.className='v';v.textContent=eur(item.estimatedNetImpact);row.append(l,v);card.appendChild(row);
    }

    if(item.unexpectedCurrentOverpayment>1)card.appendChild(note('Das Ist-Brutto liegt '+eur(item.unexpectedCurrentOverpayment)+' über dem berechneten Soll. Bitte zusätzliche oder unbekannte Bezüge prüfen.','note payroll-alert'));
    if(item.unexplainedOverCorrection>1)card.appendChild(note('Die Rückrechnung übersteigt die zuvor offene Bruttodifferenz um '+eur(item.unexplainedOverCorrection)+'. Bitte weitere Rückrechnungspositionen prüfen.','note payroll-alert'));
    wrap.appendChild(card);
  }
}
