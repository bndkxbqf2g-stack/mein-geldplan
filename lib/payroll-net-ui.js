const eur=value=>new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR'}).format(Number.isFinite(Number(value))?Number(value):0);

function note(text,className='note'){
  const element=document.createElement('div');
  element.className=className;
  element.textContent=text;
  return element;
}

export function payrollNetEquation(data={}){
  const taxFree=Number(data.taxFreeNet);
  const taxable=Number(data.taxableNet);
  const total=Number(data.totalNet);
  if(![taxFree,taxable,total].every(Number.isFinite))return null;
  return {
    taxFree:Math.round(taxFree*100)/100,
    taxable:Math.round(taxable*100)/100,
    total:Math.round(total*100)/100,
    matches:Math.abs((taxFree+taxable)-total)<0.011
  };
}

function row(label,value,{strong=false,small=''}={}){
  const element=document.createElement('div');
  element.className='row';
  const left=document.createElement('span');
  if(strong){
    const title=document.createElement('b');
    title.textContent=label;
    left.appendChild(title);
  }else left.textContent=label;
  if(small){
    const detail=document.createElement('small');
    detail.textContent=small;
    left.appendChild(detail);
  }
  const right=document.createElement('span');
  right.className='v';
  right.textContent=value;
  element.append(left,right);
  return element;
}

export function appendPayrollNetBreakdown(card,item){
  const data=item?.netBreakdown;
  if(!card||!data||(data.taxFreeGross<=0&&data.taxableGross<=0&&data.totalNet==null))return;

  const heading=document.createElement('div');
  heading.className='payroll-control-group';
  heading.textContent='Erwartete Nachzahlung';
  card.appendChild(heading);

  const summary=document.createElement('div');
  summary.className='mini-grid';
  for(const [label,value] of [
    ['Steuerfrei netto',data.taxFreeNet],
    ['Steuerpflichtig netto',data.taxableNet],
    ['Korrektur netto',data.totalNet]
  ]){
    const mini=document.createElement('div');
    mini.className='mini';
    const title=document.createElement('div');
    title.className='t';
    title.textContent=label;
    const amount=document.createElement('div');
    amount.className='n';
    amount.textContent=value==null?'–':eur(value);
    mini.append(title,amount);
    summary.appendChild(mini);
  }
  card.appendChild(summary);

  const equation=payrollNetEquation(data);
  if(equation?.matches){
    card.appendChild(row(
      'Netto-Addition',
      eur(equation.taxFree)+' + '+eur(equation.taxable)+' = '+eur(equation.total),
      {strong:true,small:'steuerfrei + steuerpflichtig = gesamte erwartete Netto-Nachzahlung'}
    ));
  }

  if(data.taxFreeGross>0)card.appendChild(row(
    'Steuerfreie Rückstände gesamt',
    eur(data.taxFreeGross)+' brutto = '+eur(data.taxFreeNet)+' netto',
    {small:'Dieser Nettobetrag fließt einmal in die Gesamtnachzahlung ein.'}
  ));
  if(data.taxableGross>0)card.appendChild(row(
    'Steuerpflichtige Rückstände gesamt',
    eur(data.taxableGross)+' brutto → '+(data.taxableNet==null?'noch nicht berechenbar':eur(data.taxableNet)+' netto'),
    {small:'Nach Steuer, SV, VBL und zusätzlicher Pfändung. Dieser Nettobetrag fließt einmal in die Gesamtnachzahlung ein.'}
  ));

  const grossOpen=Math.round(((Number(data.taxFreeGross)||0)+(Number(data.taxableGross)||0))*100)/100;
  if(grossOpen>0.005&&data.totalNet!=null){
    card.appendChild(row(
      'Vom Brutto-Rückstand zur Netto-Nachzahlung',
      eur(grossOpen)+' brutto → '+eur(data.totalNet)+' netto',
      {small:'Netto nach Steuer, Sozialversicherung, VBL und Pfändung.'}
    ));
  }

  if(data.actualGarnishableNet!=null&&data.correctedGarnishableNet!=null){
    card.appendChild(row(
      'Pfändbares Netto',
      eur(data.actualGarnishableNet)+' → '+eur(data.correctedGarnishableNet),
      {small:'Steuerfreie Zuschläge bleiben geschützt; VBL wird vor der Pfändung abgezogen.'}
    ));
  }

  if(data.actualGarnishment!=null&&data.correctedGarnishment!=null){
    const delta=Number(data.garnishmentDelta)||0;
    card.appendChild(row(
      'Pfändung',
      eur(data.actualGarnishment)+' → '+eur(data.correctedGarnishment)+(Math.abs(delta)>0.005?' (+'+eur(delta)+')':''),
      {small:'Die Mehrpfändung ist in der Netto-Nachzahlung bereits abgezogen und wird nicht zusätzlich verrechnet.'}
    ));
  }

  if(data.actualVbl!=null&&data.correctedVbl!=null){
    const delta=Number(data.vblDelta)||0;
    card.appendChild(row(
      'VBL Arbeitnehmeranteil',
      eur(data.actualVbl)+' → '+eur(data.correctedVbl)+(Math.abs(delta)>0.005?' (+'+eur(delta)+')':''),
      {small:'Die Änderung ist ebenfalls bereits in der Netto-Nachzahlung berücksichtigt.'}
    ));
  }

  if(data.shiftGross>0){
    const shiftType=data.shiftType||item.forecast?.components?.shiftType||'none';
    const shiftLabel=item.variableRows?.find(entry=>entry.key==='shift')?.label||(shiftType==='wechsel'?'Wechselschichtzulage':'Schichtzulage');
    card.appendChild(row(
      'davon '+shiftLabel,
      eur(data.shiftGross)+' brutto → '+(data.shiftNet==null?'Netto wird aus der aktuellen Abrechnung berechnet':eur(data.shiftNet)+' netto'),
      {small:'In „Steuerpflichtige Rückstände gesamt“ bereits enthalten – nicht zusätzlich addieren.'}
    ));

    const otherGross=Math.round(Math.max(0,(Number(data.taxableGross)||0)-(Number(data.shiftGross)||0))*100)/100;
    const otherNet=data.taxableNet!=null&&data.shiftNet!=null
      ?Math.round(((Number(data.taxableNet)||0)-(Number(data.shiftNet)||0))*100)/100
      :null;
    if(otherGross>0.005&&otherNet!=null&&otherNet>=-0.01){
      card.appendChild(row(
        'davon übrige steuerpflichtige Zuschläge',
        eur(otherGross)+' brutto → '+eur(Math.max(0,otherNet))+' netto',
        {small:'Restbetrag innerhalb der steuerpflichtigen Gesamtsumme.'}
      ));
    }
  }

  if(data.timeGross>0){
    card.appendChild(row(
      'Kontrollwert Zeitzuschläge',
      eur(data.timeGross)+' brutto → '+(data.timeNet==null?'Netto noch nicht berechenbar':eur(data.timeNet)+' netto'),
      {small:'Quersumme der Zeit-Zuschläge; überschneidet sich mit den Gruppen oben und wird nicht zusätzlich addiert.'}
    ));
  }

  if(data.correctedPayout!=null){
    const corrected=row(
      'Erwartete Auszahlung nach Korrektur',
      eur(data.correctedPayout),
      {strong:true,small:'Aktuelle Auszahlung + erwartete Netto-Nachzahlung'}
    );
    corrected.lastChild.classList.add('good');
    card.appendChild(corrected);
  }

  if(data.source==='actual-payslip-detailed'||data.source==='actual-payslip-summary'){
    card.appendChild(note(
      'Die Nettoeffekte werden gegen die tatsächlich eingelesene aktuelle Bezügemitteilung gerechnet. Die Schicht-/Wechselschichtzulage wird dabei separat als Szenario „aktuelle Abrechnung + nur diese Zulage“ berechnet.',
      'note payroll-alert'
    ));
  }else if(data.source==='legacy-summary-recalculated'){
    card.appendChild(note(
      'Steuerfrei und steuerpflichtig wurden aus dem alten Forecast rekonstruiert und mit der aktuellen Steuer-/SV-/VBL-/Pfändungslogik neu berechnet. Für die Aufteilung auf einzelne Lohnarten wie Nacht, Sonntag, Samstag oder Schichtzulage müsste der alte Zeitnachweis erneut eingelesen werden.',
      'note payroll-alert'
    ));
  }else if(data.source==='legacy-summary-awaiting'){
    card.appendChild(note(
      'Die steuerfreie/steuerpflichtige Aufteilung ist rekonstruiert. Der Nettoeffekt wird mit der aktuellen Lohnlogik neu berechnet.',
      'note payroll-alert'
    ));
  }else if(data.source==='legacy-total'&&data.taxFreeGross<=0&&data.taxableGross<=0){
    card.appendChild(note('Gesamter Nettoeffekt aus der gespeicherten Soll-/Ist-Prognose. Für die Aufteilung nach Zuschlagsart fehlt in diesem alten Datensatz der Zeitnachweis-Inhalt.','note payroll-alert'));
  }else if(data.source==='legacy-total'){
    card.appendChild(note(
      'Steuerfrei/steuerpflichtig ist bereits getrennt. Für die exakte Netto-Aufteilung zwischen Zeitzuschlägen und Schichtzulage den Zeitnachweis einmal neu einlesen.',
      'note payroll-alert'
    ));
  }else if(data.totalNet!=null){
    card.appendChild(note(
      data.actualBased?'Nettoeffekt auf Basis der tatsächlich eingelesenen Abrechnung und der hinterlegten Steuer-/SV-/VBL-/Pfändungslogik.':'Netto-Prognose aus BMF-Lohnsteuer, Sozialversicherung, VBL und Pfändung.'
    ));
  }
}
