// Reine Anzeige-Auswertung einer echten Bezügemitteilung. Keine Prognoseregeln ändern.
const known=value=>value!==null&&value!==undefined&&value!==''&&Number.isFinite(Number(value));
const money=value=>Math.round(Number(value)*100)/100;

export function summarizePaidPayrollAdjustments(payslip,expectedGross=null){
  if(!payslip||!Array.isArray(payslip.retroPeriods))return null;
  const periods=payslip.retroPeriods;
  const periodsGrossKnown=periods.every(period=>known(period?.totalGross));
  const grossRetro=periodsGrossKnown?money(periods.reduce((total,period)=>total+Number(period.totalGross),0)):null;
  const grossIncludingRetro=known(payslip.totalGross)&&grossRetro!=null
    ?money(Number(payslip.totalGross)+grossRetro):null;
  const grossOutsideForecast=known(expectedGross)&&grossIncludingRetro!=null
    ?money(grossIncludingRetro-Number(expectedGross)):null;
  const rows=periods.map(period=>{
    const legalNet=period?.legalNet;
    const vbl=period?.vbl;
    // In alten gespeicherten Belegen wurde eine fehlende VBL-Zeile als 0 gespeichert.
    // Eine nachgewiesene Null nur mit explizitem Importmerkmal akzeptieren.
    const hasDocumentedVbl=period?.vblDocumented===true||
      (period?.vblDocumented==null&&known(vbl)&&Number(vbl)!==0);
    const net=known(legalNet)&&hasDocumentedVbl&&known(vbl)
      ?money(Number(legalNet)-Number(vbl)):null;
    return {
      month:period?.month||null,
      gross:known(period?.totalGross)?money(period.totalGross):null,
      legalNet:known(legalNet)?money(legalNet):null,
      vbl:hasDocumentedVbl?money(vbl):null,
      net,
      average21Gross:known(period?.components?.average21)?money(period.components.average21):null
    };
  });
  const priorAdjustment=periods.length&&known(payslip.priorAdjustment)&&
    (payslip.hasPriorAdjustment||Math.abs(Number(payslip.priorAdjustment))>0.005)
    ?money(payslip.priorAdjustment):null;
  const allPeriodNetsKnown=rows.length>0&&rows.every(row=>row.net!=null);
  const netSum=allPeriodNetsKnown?money(rows.reduce((total,row)=>total+row.net,0)):null;
  const netReconciled=priorAdjustment!=null&&netSum!=null&&Math.abs(priorAdjustment-netSum)<=0.02;
  const average21Rows=rows.filter(row=>row.average21Gross!=null);
  const average21Gross=average21Rows.length
    ?money(average21Rows.reduce((total,row)=>total+row.average21Gross,0)):null;
  return {
    rows:rows.map(row=>({...row,net:netReconciled?row.net:null})),
    grossRetro,
    grossIncludingRetro,
    grossOutsideForecast,
    priorAdjustment,
    reconciledNet:netReconciled?netSum:null,
    netReconciled,
    average21Gross
  };
}
