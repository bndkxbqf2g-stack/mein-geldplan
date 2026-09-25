const eur=value=>new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR'}).format(Number.isFinite(Number(value))?Number(value):0);

function note(text,className='note'){
  const element=document.createElement('div');
  element.className=className;
  element.textContent=text;
  return element;
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
    ['Steuerpfl. brutto → netto',data.taxableNet],
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

  if(data.taxFreeGross>0)card.appendChild(row(
    'Steuerfreie Rückstände',
    eur(data.taxFreeGross)+' brutto = '+eur(data.taxFreeNet)+' netto'
  ));
  if(data.taxableGross>0)card.appendChild(row(
    'Steuerpflichtige Rückstände',
    eur(data.taxableGross)+' brutto → '+(data.taxableNet==null?'noch nicht berechenbar':eur(data.taxableNet)+' Nettoeffekt')
  ));

  if(data.timeGross>0){
    card.appendChild(row(
      'Zeitzuschläge gesamt',
      eur(data.timeGross)+' brutto'+(data.timeNet==null?'':' → '+eur(data.timeNet)+' netto')
    ));
  }

  if(data.shiftGross>0){
    const shiftLabel=item.variableRows?.find(entry=>entry.key==='shift')?.label||'Schichtzulage';
    card.appendChild(row(
      shiftLabel,
      eur(data.shiftGross)+' brutto'+(data.shiftNet==null?'':' → '+eur(data.shiftNet)+' netto')
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

  if(data.source==='legacy-total'&&data.taxFreeGross<=0&&data.taxableGross<=0){
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
