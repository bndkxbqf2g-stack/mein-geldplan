import test from 'node:test';
import assert from 'node:assert/strict';
import {buildPayrollNetBreakdown} from '../lib/payroll-net-breakdown.js';
import {payrollNetEquation} from '../lib/payroll-net-ui.js';

test('offene Rückstände werden netto getrennt',()=>{
  const variableRows=[
    {key:'night',expected:98.01,open:98.01,tax:'steuerfrei'},
    {key:'saturday',expected:.77,open:.77,tax:'steuerpflichtig'},
    {key:'sunday',expected:44.12,open:44.12,tax:'steuerfrei'},
    {key:'shift',expected:100,open:100,tax:'steuerpflichtig'}
  ];
  const forecast={
    components:{unpriced:[],springInVblUnverified:false},
    netEffects:{complete:true,totalNet:173.19,timeNet:142.55,shiftAfterTimeNet:30.64,shiftStandaloneNet:30.64}
  };
  const result=buildPayrollNetBreakdown({
    forecast,
    actual:{payout:2657.94,hasPriorAdjustment:false},
    variableRows,
    retro:[],
    estimatedNetImpact:173.19
  });
  assert.equal(result.taxFreeNet,142.13);
  assert.equal(result.taxableGross,100.77);
  assert.equal(result.taxableNet,31.06);
  assert.equal(result.timeGross,142.90);
  assert.equal(result.timeNet,142.55);
  assert.equal(result.shiftNet,30.64);
  assert.equal(result.totalNet,173.19);
  assert.equal(result.correctedPayout,2831.13);
});


test('allein fehlende Schichtzulage nutzt den Einzel-Nettoeffekt',()=>{
  const result=buildPayrollNetBreakdown({
    forecast:{components:{unpriced:[],springInVblUnverified:false},netEffects:{complete:true,shiftStandaloneNet:30.64}},
    actual:{payout:2657.94,hasPriorAdjustment:false},
    variableRows:[
      {key:'night',expected:98.01,open:0,tax:'steuerfrei'},
      {key:'saturday',expected:.77,open:0,tax:'steuerpflichtig'},
      {key:'sunday',expected:44.12,open:0,tax:'steuerfrei'},
      {key:'shift',expected:100,open:100,tax:'steuerpflichtig'}
    ],
    retro:[]
  });
  assert.equal(result.taxableGross,100);
  assert.equal(result.taxableNet,30.64);
  assert.equal(result.shiftNet,30.64);
  assert.equal(result.correctedPayout,2688.58);
});


test('gespeicherte Altprognose kann für Nettoeffekte rekonstruiert werden',async()=>{
  const {storedForecastReport}=await import('../lib/salary-net-effects.js');
  const {reportComponents}=await import('../lib/salary.js');
  const report=storedForecastReport({components:{
    night:98.01,saturday:.77,sunday:44.12,holiday:0,shift:100,shiftType:'schicht',springIn:0,unpriced:[]
  }});
  const c=reportComponents(report);
  assert.equal(c.pay.night,98.01);
  assert.equal(c.pay.saturday,.77);
  assert.equal(c.pay.sunday,44.12);
  assert.equal(c.pay.shift,100);
  assert.equal(c.taxFreePay,142.13);
  assert.equal(c.taxableExtra,100.77);
});

test('Legacy-Summenforecast rekonstruiert 142,13 steuerfrei und 100,77 steuerpflichtig',async()=>{
  const {storedLegacySummaryReport}=await import('../lib/salary-net-effects.js');
  const {reportComponents}=await import('../lib/salary.js');
  const report=storedLegacySummaryReport({
    totalGross:4723.33,
    legalNet:3026.99,
    garnishableNet:2884.86,
    needsReview:false,
    springIn:0
  });
  const c=reportComponents(report);
  assert.equal(report.inferredShiftType,'schicht');
  assert.equal(report.inferredShiftGross,100);
  assert.equal(report.inferredSaturdayGross,.77);
  assert.equal(c.pay.shift,100);
  assert.equal(c.pay.saturday,.77);
  assert.equal(c.taxFreePay,142.13);
  assert.equal(c.taxableExtra,100.77);
});

test('tatsächliche Abrechnung wird als Basis der Nachzahlung markiert',()=>{
  const result=buildPayrollNetBreakdown({
    forecast:{components:{unpriced:[],springInVblUnverified:false},netEffects:{complete:true,totalNet:173.19,timeNet:142.55,shiftAfterTimeNet:30.64}},
    actual:{payout:2657.94,totalGross:4480.43,legalNet:2827.98,hasPriorAdjustment:false},
    variableRows:[{key:'night',expected:98.01,open:98.01,tax:'steuerfrei'},{key:'saturday',expected:.77,open:.77,tax:'steuerpflichtig'},{key:'sunday',expected:44.12,open:44.12,tax:'steuerfrei'},{key:'shift',expected:100,open:100,tax:'steuerpflichtig'}],retro:[]
  });
  assert.equal(result.actualBased,true);
  assert.equal(result.actualTaxableBase,4480.43);
  assert.equal(result.correctedPayout,2831.13);
});


test('alte Prognose zeigt wenigstens gespeicherten Netto-Nachzahlungsbetrag',()=>{
  const result=buildPayrollNetBreakdown({forecast:{components:{}},actual:{payout:2657.94,totalGross:4480.43,legalNet:2827.98},variableRows:[],estimatedNetImpact:157.88});
  assert.equal(result.totalNet,157.88);
  assert.equal(result.correctedPayout,2815.82);
  assert.equal(result.source,'legacy-total');
});


test('sichtbarer Fallback aus Soll- und Ist-Auszahlung bei alten September-Daten',()=>{
  const expectedPayout=2815.82,actualPayout=2657.94;
  const fallback=Math.round((expectedPayout-actualPayout)*100)/100;
  const result=buildPayrollNetBreakdown({forecast:{components:{}},actual:{payout:actualPayout,totalGross:4480.43,legalNet:2827.98},variableRows:[],estimatedNetImpact:fallback});
  assert.equal(result.totalNet,157.88);
  assert.equal(result.correctedPayout,2815.82);
  assert.equal(result.source,'legacy-total');
});

test('alte September-Prognose nutzt alte Pfändungssemantik und aktuelle Nettoeffekte',()=>{
  const result=buildPayrollNetBreakdown({
    forecast:{
      totalGross:4723.33,
      legalNet:3026.99,
      garnishableNet:2884.86,
      payout:2815.82,
      needsReview:false,
      springIn:0,
      netEffects:{complete:true,totalNet:189.88}
    },
    actual:{payout:2657.94,totalGross:4480.43,legalNet:2827.98,vbl:81.10,garnishment:88.94,hasPriorAdjustment:false,components:{hasVariableDetail:false}},
    variableRows:[],
    retro:[],
    estimatedNetImpact:157.88
  });
  assert.equal(result.taxFreeGross,142.13);
  assert.equal(result.taxFreeNet,142.13);
  assert.equal(result.taxableGross,100.77);
  assert.equal(result.taxableNet,31.06);
  assert.equal(result.totalNet,173.19);
  assert.equal(result.correctedPayout,2831.13);
  assert.equal(result.source,'actual-payslip-summary');
});

test('alte September-Prognose zeigt ohne Neuberechnung keinen veralteten Netto-Fallback',()=>{
  const result=buildPayrollNetBreakdown({
    forecast:{totalGross:4723.33,legalNet:3026.99,garnishableNet:2884.86,needsReview:false,springIn:0},
    actual:{payout:2657.94,totalGross:4480.43,legalNet:2827.98,hasPriorAdjustment:false},
    variableRows:[],
    retro:[],
    estimatedNetImpact:157.88
  });
  assert.equal(result.taxFreeGross,142.13);
  assert.equal(result.taxableGross,100.77);
  assert.equal(result.totalNet,null);
  assert.equal(result.correctedPayout,null);
  assert.equal(result.source,'legacy-summary-awaiting');
});


test('September rekonstruiert Komponenten aus gespeichertem Zeitnachweis und zeigt Netto je Gruppe',()=>{
 const result=buildPayrollNetBreakdown({forecast:{totalGross:4723.33,components:{night:98.01,saturday:.77,sunday:44.12,holiday:0,shift:100,shiftType:'schicht',unpriced:[],springInVblUnverified:false},netEffects:{complete:true,totalNet:173.19,timeNet:142.55,shiftAfterTimeNet:30.64,shiftStandaloneNet:30.64}},actual:{totalGross:4480.43,legalNet:2827.98,payout:2657.94,hasPriorAdjustment:false},variableRows:[],retro:[]});
 assert.equal(result.taxFreeNet,142.13);assert.equal(result.taxableGross,100.77);assert.equal(result.taxableNet,31.06);assert.equal(result.timeGross,142.90);assert.equal(result.timeNet,142.55);assert.equal(result.shiftGross,100);assert.equal(result.shiftNet,30.64);assert.equal(result.totalNet,173.19);assert.equal(result.correctedPayout,2831.13);
});

test('Ist-Abrechnung ist Basis und Schichtzulage wird isoliert gegen diese Basis gerechnet',async()=>{
  const {calculateActualBasedForecastNetEffects}=await import('../lib/salary-net-effects.js');
  const forecast={
    payoutMonth:'2026-09',
    components:{night:98.01,saturday:.77,sunday:44.12,holiday:0,shift:100,shiftType:'schicht',springIn:0,unpriced:[],springInVblUnverified:false},
    reportItems:[
      {code:'5010',hours:18.9},{code:'5011',hours:2.5},{code:'5014',hours:1.2},{code:'5024',hours:7.7},{code:'5212',hours:null}
    ]
  };
  const actual={
    month:'2026-09',totalGross:4480.43,legalNet:2827.98,vbl:81.10,garnishment:88.94,payout:2657.94,
    hasPriorAdjustment:false,components:{hasVariableDetail:false}
  };
  const calculator=async(report)=>{
    const items=report?.items||[];
    const hasShift=items.some(item=>item.code==='5212');
    const hasTime=items.some(item=>['5010','5011','5014','5024'].includes(item.code));
    if(!items.length)return {totalGross:4480.43,legalNet:2827.98,vbl:81.10,garnishment:88.94,payout:2657.94,components:{springIn:{total:0},unpriced:[],pay:{night:0,saturday:0,sunday:0,holiday:0,shift:0}}};
    if(hasShift&&!hasTime)return {payout:2688.58,components:{springIn:{total:0},unpriced:[],pay:{night:0,saturday:0,sunday:0,holiday:0,shift:100}}};
    if(hasTime&&!hasShift)return {payout:2800.49,components:{springIn:{total:0},unpriced:[],pay:{night:98.01,saturday:.77,sunday:44.12,holiday:0,shift:0}}};
    return {payout:2831.13,components:{springIn:{total:0},unpriced:[],pay:{night:98.01,saturday:.77,sunday:44.12,holiday:0,shift:100}}};
  };
  const effects=await calculateActualBasedForecastNetEffects(forecast,actual,undefined,calculator);
  assert.equal(effects?.basis,'actual-payslip');
  assert.equal(effects.shiftStandaloneNet,30.64);
  assert.equal(effects.totalNet,173.19);
  assert.equal(effects.actualPayout,2657.94);
  assert.equal(effects.correctedPayout,2831.13);
});

test('Legacy-September nutzt Ist-Abrechnung und liefert isolierten Nettoeffekt der 100-Euro-Schichtzulage',async()=>{
  const {calculateActualBasedForecastNetEffects}=await import('../lib/salary-net-effects.js');
  const forecast={
    payoutMonth:'2026-09',
    totalGross:4723.33,
    legalNet:3026.99,
    garnishableNet:2884.86,
    needsReview:false,
    springIn:0
  };
  const actual={
    month:'2026-09',
    totalGross:4480.43,
    legalNet:2827.98,
    vbl:81.10,
    garnishment:88.94,
    payout:2657.94,
    hasPriorAdjustment:false,
    components:{hasVariableDetail:false}
  };
  const calculator=async(report)=>{
    const items=report?.items||[];
    const hasShift=items.some(item=>item.code==='5212');
    const hasSaturday=items.some(item=>item.code==='5014');
    const hasTaxFree=items.some(item=>item.type==='holiday');
    if(!items.length)return {totalGross:4480.43,legalNet:2827.98,vbl:81.10,garnishment:88.94,payout:2657.94,components:{springIn:{total:0},unpriced:[],pay:{night:0,saturday:0,sunday:0,holiday:0,shift:0},shift:'none'}};
    if(hasShift&&!hasSaturday&&!hasTaxFree)return {payout:2688.58,components:{springIn:{total:0},unpriced:[],pay:{night:0,saturday:0,sunday:0,holiday:0,shift:100},shift:'schicht'}};
    if(!hasShift&&(hasSaturday||hasTaxFree))return {payout:2800.49,components:{springIn:{total:0},unpriced:[],pay:{night:0,saturday:.77,sunday:0,holiday:142.13,shift:0},shift:'none'}};
    return {payout:2831.13,components:{springIn:{total:0},unpriced:[],pay:{night:0,saturday:.77,sunday:0,holiday:142.13,shift:100},shift:'schicht'}};
  };
  const effects=await calculateActualBasedForecastNetEffects(forecast,actual,undefined,calculator);
  assert.equal(effects?.basis,'actual-payslip');
  assert.equal(effects.shiftType,'schicht');
  assert.equal(effects.shiftGross,100);
  assert.equal(effects.shiftStandaloneNet,30.64);
  assert.equal(effects.totalNet,173.19);

  const result=buildPayrollNetBreakdown({
    forecast:{...forecast,actualNetEffects:effects},
    actual,
    variableRows:[],
    retro:[],
    estimatedNetImpact:157.88
  });
  assert.equal(result.source,'actual-payslip-summary');
  assert.equal(result.shiftType,'schicht');
  assert.equal(result.shiftGross,100);
  assert.equal(result.shiftNet,30.64);
  assert.equal(result.taxFreeNet,142.13);
  assert.equal(result.taxableGross,100.77);
  assert.equal(result.totalNet,173.19);
  assert.equal(result.correctedPayout,2831.13);
});

test('Ist-Auszahlung bleibt Sockel auch wenn Modell-Baseline netto abweicht',async()=>{
  const {calculateActualBasedForecastNetEffects}=await import('../lib/salary-net-effects.js');
  const forecast={
    totalGross:4723.33,
    legalNet:3026.99,
    garnishableNet:2884.86,
    needsReview:false,
    springIn:0
  };
  const actual={
    totalGross:4480.43,
    payout:2600,
    hasPriorAdjustment:false,
    components:{hasVariableDetail:false}
  };
  const calculator=async(report)=>{
    const items=report?.items||[];
    const baseline=!items.length;
    const hasShift=items.some(item=>item.code==='5212');
    if(baseline)return {totalGross:4480.43,payout:2700,components:{springIn:{total:0},unpriced:[],pay:{night:0,saturday:0,sunday:0,holiday:0,shift:0},shift:'none'}};
    if(hasShift&&items.length===1)return {payout:2730,components:{springIn:{total:0},unpriced:[],pay:{night:0,saturday:0,sunday:0,holiday:0,shift:100},shift:'schicht'}};
    return {payout:2890,components:{springIn:{total:0},unpriced:[],pay:{night:0,saturday:.77,sunday:0,holiday:142.13,shift:100},shift:'schicht'}};
  };
  const effects=await calculateActualBasedForecastNetEffects(forecast,actual,undefined,calculator);
  assert.equal(effects.basis,'actual-payslip');
  assert.equal(effects.modelBaselinePayout,2700);
  assert.equal(effects.shiftStandaloneNet,30);
  assert.equal(effects.totalNet,190);
  assert.equal(effects.actualPayout,2600);
  assert.equal(effects.correctedPayout,2790);
});

test('September-Legacy-Fallback berechnet steuerpflichtiges Netto ohne externen Steuerrechner',()=>{
  const result=buildPayrollNetBreakdown({
    forecast:{
      payoutMonth:'2026-09',
      totalGross:4723.33,
      legalNet:3026.99,
      garnishableNet:2884.86,
      needsReview:false,
      springIn:0
    },
    actual:{
      month:'2026-09',
      totalGross:4480.43,
      legalNet:2827.98,
      vbl:81.10,
      garnishment:88.94,
      payout:2657.94,
      hasPriorAdjustment:false,
      components:{hasVariableDetail:false}
    },
    variableRows:[],
    retro:[],
    estimatedNetImpact:157.88
  });
  assert.equal(result.source,'actual-payslip-summary');
  assert.equal(result.taxFreeGross,142.13);
  assert.equal(result.taxFreeNet,142.13);
  assert.equal(result.taxableGross,100.77);
  assert.equal(result.taxableNet,31.06);
  assert.equal(result.shiftGross,100);
  assert.equal(result.shiftType,'schicht');
  assert.equal(result.shiftNet,30.64);
  assert.equal(result.actualLegalNet,2827.98);
  assert.equal(result.correctedLegalNet,3026.99);
  assert.equal(result.legalNetDelta,199.01);
  assert.equal(result.taxableLegalNetDelta,56.88);
  assert.equal(result.taxAndSvReduction,43.89);
  assert.equal(result.actualVbl,81.10);
  assert.equal(result.correctedVbl,82.92);
  assert.equal(result.vblDelta,1.82);
  assert.equal(result.actualGarnishableNet,2746.88);
  assert.equal(result.correctedGarnishableNet,2801.94);
  assert.equal(result.actualGarnishment,88.94);
  assert.equal(result.correctedGarnishment,112.94);
  assert.equal(result.garnishmentDelta,24);
  assert.equal(result.totalNet,173.19);
  assert.equal(result.correctedPayout,2831.13);
  assert.equal(
    Math.round((result.taxableGross-result.taxAndSvReduction-result.vblDelta-result.garnishmentDelta)*100)/100,
    result.taxableNet
  );
});


test('Netto-Nachzahlung ist nachvollziehbar: steuerfrei plus steuerpflichtig ergibt Gesamtkorrektur',()=>{
  const equation=payrollNetEquation({taxFreeNet:142.13,taxableNet:31.06,totalNet:173.19});
  assert.deepEqual(equation,{taxFree:142.13,taxable:31.06,total:173.19,matches:true});
});

test('Schichtzulage ist Teil der steuerpflichtigen Summe und wird nicht doppelt addiert',()=>{
  const result=buildPayrollNetBreakdown({
    forecast:{
      payoutMonth:'2026-09',
      totalGross:4723.33,
      legalNet:3026.99,
      garnishableNet:2884.86,
      needsReview:false,
      springIn:0
    },
    actual:{
      month:'2026-09',
      totalGross:4480.43,
      legalNet:2827.98,
      vbl:81.10,
      garnishment:88.94,
      payout:2657.94,
      hasPriorAdjustment:false,
      components:{hasVariableDetail:false}
    },
    variableRows:[],
    retro:[],
    estimatedNetImpact:157.88
  });
  assert.equal(result.taxFreeNet,142.13);
  assert.equal(result.taxableNet,31.06);
  assert.equal(result.shiftNet,30.64);
  assert.equal(Math.round((result.taxFreeNet+result.taxableNet)*100)/100,result.totalNet);
  assert.equal(result.totalNet,173.19);
  assert.notEqual(Math.round((result.taxFreeNet+result.taxableNet+result.shiftNet)*100)/100,result.totalNet);
});


test('Legacy-Teilrückrechnung verwendet nicht erneut die volle Netto-Nachzahlung',()=>{
  const result=buildPayrollNetBreakdown({
    forecast:{
      payoutMonth:'2026-09',
      totalGross:4723.33,
      legalNet:3026.99,
      garnishableNet:2884.86,
      payout:2815.82,
      needsReview:false,
      springIn:0,
      netEffects:{complete:true,totalNet:189.88}
    },
    actual:{
      payout:2657.94,
      totalGross:4480.43,
      legalNet:2827.98,
      vbl:81.10,
      garnishment:88.94,
      hasPriorAdjustment:false,
      components:{hasVariableDetail:false}
    },
    variableRows:[],
    retro:[{month:'2026-09',totalGross:100,components:{}}],
    estimatedNetImpact:157.88
  });
  assert.equal(result.totalNet,null);
  assert.equal(result.correctedPayout,null);
});
