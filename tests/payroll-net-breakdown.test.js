import test from 'node:test';
import assert from 'node:assert/strict';
import {buildPayrollNetBreakdown} from '../lib/payroll-net-breakdown.js';

test('offene Rückstände werden netto getrennt',()=>{
  const variableRows=[
    {key:'night',expected:98.01,open:98.01,tax:'steuerfrei'},
    {key:'saturday',expected:.77,open:.77,tax:'steuerpflichtig'},
    {key:'sunday',expected:44.12,open:44.12,tax:'steuerfrei'},
    {key:'shift',expected:100,open:100,tax:'steuerpflichtig'}
  ];
  const forecast={
    components:{unpriced:[],springInVblUnverified:false},
    netEffects:{complete:true,totalNet:189.88,timeNet:142.50,shiftAfterTimeNet:47.38,shiftStandaloneNet:47.40}
  };
  const result=buildPayrollNetBreakdown({
    forecast,
    actual:{payout:2657.94,hasPriorAdjustment:false},
    variableRows,
    retro:[],
    estimatedNetImpact:189.88
  });
  assert.equal(result.taxFreeNet,142.13);
  assert.equal(result.taxableGross,100.77);
  assert.equal(result.taxableNet,47.75);
  assert.equal(result.timeGross,142.90);
  assert.equal(result.timeNet,142.50);
  assert.equal(result.shiftNet,47.38);
  assert.equal(result.totalNet,189.88);
  assert.equal(result.correctedPayout,2847.82);
});


test('allein fehlende Schichtzulage nutzt den Einzel-Nettoeffekt',()=>{
  const result=buildPayrollNetBreakdown({
    forecast:{components:{unpriced:[],springInVblUnverified:false},netEffects:{complete:true,shiftStandaloneNet:47.40}},
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
  assert.equal(result.taxableNet,47.40);
  assert.equal(result.shiftNet,47.40);
  assert.equal(result.correctedPayout,2705.34);
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


test('tatsächliche Abrechnung wird als Basis der Nachzahlung markiert',()=>{
  const result=buildPayrollNetBreakdown({
    forecast:{components:{unpriced:[],springInVblUnverified:false},netEffects:{complete:true,totalNet:189.88,timeNet:142.50,shiftAfterTimeNet:47.38}},
    actual:{payout:2657.94,totalGross:4480.43,legalNet:2827.98,hasPriorAdjustment:false},
    variableRows:[{key:'night',expected:98.01,open:98.01,tax:'steuerfrei'},{key:'saturday',expected:.77,open:.77,tax:'steuerpflichtig'},{key:'sunday',expected:44.12,open:44.12,tax:'steuerfrei'},{key:'shift',expected:100,open:100,tax:'steuerpflichtig'}],retro:[]
  });
  assert.equal(result.actualBased,true);
  assert.equal(result.actualTaxableBase,4480.43);
  assert.equal(result.correctedPayout,2847.82);
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


test('September rekonstruiert Komponenten aus gespeichertem Zeitnachweis und zeigt Netto je Gruppe',()=>{
 const result=buildPayrollNetBreakdown({forecast:{totalGross:4723.33,components:{night:98.01,saturday:.77,sunday:44.12,holiday:0,shift:100,shiftType:'schicht',unpriced:[],springInVblUnverified:false},netEffects:{complete:true,totalNet:189.88,timeNet:142.50,shiftAfterTimeNet:47.38,shiftStandaloneNet:47.40}},actual:{totalGross:4480.43,legalNet:2827.98,payout:2657.94,hasPriorAdjustment:false},variableRows:[],retro:[]});
 assert.equal(result.taxFreeNet,142.13);assert.equal(result.taxableGross,100.77);assert.equal(result.taxableNet,47.75);assert.equal(result.timeGross,142.90);assert.equal(result.timeNet,142.50);assert.equal(result.shiftGross,100);assert.equal(result.shiftNet,47.38);assert.equal(result.totalNet,189.88);assert.equal(result.correctedPayout,2847.82);
});
