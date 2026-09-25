const money=v=>Math.round((Number(v)||0)*100)/100;

function amount(value){return Number.isFinite(Number(value))?money(Number(value)):null;}
function sum(values){return money(values.reduce((s,v)=>s+(Number(v)||0),0));}
function monthLabel(value){
  if(!value)return '–';
  const [y,m]=String(value).split('-').map(Number);
  return new Intl.DateTimeFormat('de-DE',{month:'long',year:'numeric'}).format(new Date(y,m-1,1));
}

export function forecastComponents(forecast={}){
  const c=forecast.components||{};
  const fixed=c.fixed||{};
  return {
    basePay:amount(fixed.basePay),
    careAllowance:amount(fixed.careAllowance),
    universityAllowance:amount(fixed.universityAllowance),
    night:amount(c.night)||0,
    saturday:amount(c.saturday)||0,
    sunday:amount(c.sunday)||0,
    shift:amount(c.shift)||0,
    shiftType:c.shiftType||'none',
    springIn:amount(c.springIn)||0
  };
}

function actualFixedTotal(actual={}){
  const values=[actual.basePay,actual.careAllowance,actual.universityAllowance];
  if(values.some(v=>v==null))return null;
  return sum(values);
}

function expectedVariableRows(forecast={}){
  const c=forecastComponents(forecast);
  return [
    {key:'night',label:'Nachtzuschläge',expected:c.night,tax:'steuerfrei'},
    {key:'saturday',label:'Samstagszuschläge',expected:c.saturday,tax:'steuerpflichtig'},
    {key:'sunday',label:'Sonntagszuschläge',expected:c.sunday,tax:'steuerfrei'},
    {key:'shift',label:c.shiftType==='wechsel'?'Wechselschichtzulage':'Schichtzulage',expected:c.shift,tax:'steuerpflichtig'},
    {key:'springIn',label:'Einspringprämie',expected:c.springIn,tax:'prüfen'}
  ].filter(row=>row.expected>0.005);
}

function componentActual(actual,key){
  const c=actual?.components||{};
  const value=amount(c[key]);
  return value==null?null:value;
}

function retroForMonth(payslips,month){
  const hits=[];
  for(const payslip of payslips||[]){
    for(const retro of payslip?.retroPeriods||[]){
      if(retro?.month===month)hits.push({...retro,paidWithMonth:payslip.month,combinedNetAdjustment:payslip.priorAdjustment||0,retroCount:(payslip.retroPeriods||[]).length});
    }
  }
  return hits;
}

export function buildPayrollControl({forecast,actual,payslips=[]}={}){
  if(!forecast?.payoutMonth)return null;
  const expectedGross=amount(forecast.totalGross);
  const actualGross=amount(actual?.totalGross);
  const fixedActual=actualFixedTotal(actual);
  const expectedRows=expectedVariableRows(forecast);
  const expectedVariable=sum(expectedRows.map(r=>r.expected));
  const actualVariableGross=actualGross!=null&&fixedActual!=null?money(actualGross-fixedActual):null;
  const retro=retroForMonth(payslips,forecast.payoutMonth);
  const retroGross=sum(retro.map(r=>Number(r.totalGross)||0));
  const grossDifference=expectedGross!=null&&actualGross!=null?money(actualGross-expectedGross):null;
  const initialShortfall=grossDifference==null?null:money(Math.max(0,-grossDifference));
  const unexpectedCurrentOverpayment=grossDifference==null?0:money(Math.max(0,grossDifference));
  const remainingGross=initialShortfall==null?null:money(Math.max(0,initialShortfall-retroGross));
  const unexplainedOverCorrection=initialShortfall==null?0:money(Math.max(0,retroGross-initialShortfall));
  const inferAllVariableMissing=Boolean(
    actual&&
    actualGross!=null&&
    fixedActual!=null&&
    expectedVariable>0.005&&
    Math.abs(actualVariableGross||0)<=1&&
    Math.abs((expectedGross||0)-(actualGross||0)-expectedVariable)<=1
  );

  const retroComponentTotal=sum(retro.flatMap(r=>['night','saturday','sunday','shift','springIn'].map(key=>Number(r.components?.[key])||0)));
  const aggregateRetroSettles=Boolean(initialShortfall!=null&&initialShortfall>1&&remainingGross<=1&&retroGross>0&&Math.abs(retroComponentTotal)<=1);
  const variableRows=expectedRows.map(row=>{
    let real=componentActual(actual,row.key);
    if(real==null&&inferAllVariableMissing)real=0;
    const retroPaid=sum(retro.map(r=>Number(r.components?.[row.key])||0));
    let open=real==null?null:money(Math.max(0,row.expected-real-retroPaid));
    let status=open==null?'unknown':open<=1?'ok':retroPaid>0?'partial':'open';
    let retroAggregate=false;
    if(aggregateRetroSettles&&open!=null&&open>1){
      open=0;status='ok';retroAggregate=true;
    }
    return {...row,actual:real,retro:retroPaid,open,status,retroAggregate};
  });

  const fixedRows=[
    ['basePay','Grundentgelt',forecastComponents(forecast).basePay,actual?.basePay],
    ['careAllowance','Pflegezulage',forecastComponents(forecast).careAllowance,actual?.careAllowance],
    ['universityAllowance','Universitätszulage',forecastComponents(forecast).universityAllowance,actual?.universityAllowance]
  ].map(([key,label,expected,real])=>{
    const actualValue=amount(real);
    const difference=expected==null||actualValue==null?null:money(actualValue-expected);
    return {key,label,expected,actual:actualValue,difference,status:difference==null?'unknown':Math.abs(difference)<=1?'ok':'different'};
  });

  const estimatedNetImpact=forecast.baselinePayout!=null&&forecast.payout!=null
    ?money(Number(forecast.payout)-Number(forecast.baselinePayout))
    :null;
  const exactRetroNet=retro.length===1&&retro[0].retroCount===1&&Math.abs(Number(retro[0].combinedNetAdjustment)||0)>0.005
    ?money(Number(retro[0].combinedNetAdjustment))
    :null;

  let status='waiting';
  if(actual){
    if(unexpectedCurrentOverpayment>1)status='review';
    else if(remainingGross!=null&&remainingGross<=1&&unexplainedOverCorrection<=1)status=retroGross>0?'settled':'ok';
    else if(retroGross>0&&remainingGross>1)status='partial';
    else if(initialShortfall!=null&&initialShortfall>1)status='open';
    else if(unexplainedOverCorrection>1)status='review';
    else status='review';
  }

  return {
    payoutMonth:forecast.payoutMonth,
    label:monthLabel(forecast.payoutMonth),
    status,
    expectedGross,
    actualGross,
    expectedPayout:amount(forecast.payout),
    actualPayout:amount(actual?.payout),
    grossDifference,
    initialShortfall,
    unexpectedCurrentOverpayment,
    retroGross,
    remainingGross,
    unexplainedOverCorrection,
    estimatedNetImpact,
    exactRetroNet,
    fixedRows,
    variableRows,
    retro,
    inferredMissingVariablePay:inferAllVariableMissing,
    hasPriorAdjustment:Boolean(actual?.hasPriorAdjustment),
    hasDetailedForecast:Boolean(forecast.components),
    needsReview:Boolean(forecast.needsReview||actual?.needsReview||variableRows.some(r=>r.status==='unknown')||fixedRows.some(r=>r.status==='unknown'))
  };
}

export function buildPayrollControlHistory({forecasts=[],payslips=[]}={}){
  return (forecasts||[])
    .map(forecast=>buildPayrollControl({
      forecast,
      actual:(payslips||[]).find(p=>p?.month===forecast.payoutMonth)||null,
      payslips
    }))
    .filter(Boolean)
    .sort((a,b)=>String(b.payoutMonth).localeCompare(String(a.payoutMonth)));
}

export function payrollControlStatusLabel(status){
  return ({waiting:'Abrechnung ausstehend',ok:'Stimmig',open:'Offen',partial:'Teilweise nachgezahlt',settled:'Erledigt',review:'Bitte prüfen'})[status]||'Bitte prüfen';
}
