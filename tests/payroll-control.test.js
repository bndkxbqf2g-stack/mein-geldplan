import test from 'node:test';
import assert from 'node:assert/strict';
import {buildPayrollControl,buildPayrollControlHistory,buildPayrollCarryovers,payrollCarryoverRegularSollLabel} from '../lib/payroll-control.js';

const forecast={
  payoutMonth:'2026-09',
  reportMonth:'2026-07',
  totalGross:4723.33,
  payout:2845.20,
  baselinePayout:2700.70,
  needsReview:false,
  components:{
    fixed:{basePay:4226.92,careAllowance:90,universityAllowance:163.51},
    night:98.01,
    saturday:0.77,
    sunday:44.12,
    shift:100,
    shiftType:'schicht',
    springIn:0
  }
};

const september={
  month:'2026-09',
  basePay:4226.92,
  careAllowance:90,
  universityAllowance:163.51,
  totalGross:4480.43,
  payout:2700.70,
  hasPriorAdjustment:false,
  needsReview:false,
  components:{night:null,saturday:null,sunday:null,shift:null,springIn:null,hasVariableDetail:false},
  retroPeriods:[]
};

test('fehlende Juli-Zuschläge sind in September rechnerisch nachvollziehbar',()=>{
  const control=buildPayrollControl({forecast,actual:september,payslips:[september]});
  assert.equal(control.status,'open');
  assert.equal(control.inferredMissingVariablePay,true);
  assert.equal(control.initialShortfall,242.90);
  assert.equal(control.remainingGross,242.90);
  assert.equal(Math.round(control.variableRows.reduce((sum,row)=>sum+row.expected,0)*100)/100,242.90);
  assert.equal(control.variableRows.find(row=>row.key==='shift').tax,'steuerpflichtig');
  assert.equal(control.variableRows.find(row=>row.key==='night').tax,'steuerfrei');
  assert.equal(control.variableRows.find(row=>row.key==='saturday').tax,'steuerpflichtig');
});

test('spätere Rückrechnung gleicht den alten Abrechnungsmonat aus',()=>{
  const october={
    month:'2026-10',
    totalGross:4480.43,
    payout:2855.90,
    priorAdjustment:155.20,
    hasPriorAdjustment:true,
    retroPeriods:[{
      month:'2026-09',
      totalGross:242.90,
      components:{night:98.01,saturday:0.77,sunday:44.12,shift:100,springIn:null}
    }]
  };
  const control=buildPayrollControl({forecast,actual:september,payslips:[september,october]});
  assert.equal(control.status,'settled');
  assert.equal(control.remainingGross,0);
  assert.equal(control.retroGross,242.90);
  assert.equal(control.exactRetroNet,155.20);
  assert.equal(control.variableRows.every(row=>row.open===0),true);
});

test('aggregierte Rückrechnung kann Gesamtanspruch ausgleichen ohne Komponenten zu erfinden',()=>{
  const october={
    month:'2026-10',
    priorAdjustment:150,
    retroPeriods:[{month:'2026-09',totalGross:242.90,components:{night:null,saturday:null,sunday:null,shift:null,springIn:null}}]
  };
  const control=buildPayrollControl({forecast,actual:september,payslips:[september,october]});
  assert.equal(control.status,'settled');
  assert.equal(control.remainingGross,0);
  assert.equal(control.variableRows.every(row=>row.retroAggregate===true),true);
});

test('Historie bleibt nach Auszahlungsmonat sortiert',()=>{
  const list=buildPayrollControlHistory({
    forecasts:[forecast,{...forecast,payoutMonth:'2026-10'}],
    payslips:[september]
  });
  assert.deepEqual(list.map(x=>x.payoutMonth),['2026-10','2026-09']);
});


test('Forecast ohne Bezügemitteilung bleibt kontrollierbar',()=>{
  const control=buildPayrollControl({forecast:{...forecast,payoutMonth:'2026-10'},actual:null,payslips:[]});
  assert.equal(control.status,'waiting');
  assert.equal(control.actualGross,null);
  assert.equal(control.remainingGross,null);
});

test('5211/5212 aus gespeichertem Zeitnachweis bestimmt Zulagenart',()=>{
  const wechsel=buildPayrollControl({
    forecast:{...forecast,components:{...forecast.components,shiftType:'none'},reportItems:[{code:'5211'}]},
    actual:null,
    payslips:[]
  });
  const schicht=buildPayrollControl({
    forecast:{...forecast,components:{...forecast.components,shiftType:'none'},reportItems:[{code:'5212'}]},
    actual:null,
    payslips:[]
  });
  assert.equal(wechsel.variableRows.find(row=>row.key==='shift').label,'Wechselschichtzulage');
  assert.equal(schicht.variableRows.find(row=>row.key==='shift').label,'Schichtzulage');
});

test('offene September-Nachzahlung wird dem nächsten ausstehenden Monat Oktober zugeordnet',()=>{
  const controls=[
    {payoutMonth:'2026-10',label:'Oktober 2026',status:'waiting',remainingGross:null},
    {payoutMonth:'2026-09',label:'September 2026',status:'open',remainingGross:242.90}
  ];
  const carry=buildPayrollCarryovers({controls,netByMonth:{'2026-09':173.19}});
  assert.deepEqual(carry,{
    '2026-10':[{
      sourceMonth:'2026-09',
      sourceLabel:'September 2026',
      net:173.19,
      gross:242.90
    }]
  });
  assert.equal(Math.round((2773.72+carry['2026-10'][0].net)*100)/100,2946.91);
});

test('erledigte Nachzahlung wird nicht mehr in einen Folgemonat übertragen',()=>{
  const controls=[
    {payoutMonth:'2026-10',label:'Oktober 2026',status:'waiting',remainingGross:null},
    {payoutMonth:'2026-09',label:'September 2026',status:'settled',remainingGross:0}
  ];
  assert.deepEqual(buildPayrollCarryovers({controls,netByMonth:{'2026-09':173.19}}),{});
});

test('offener Anspruch wandert zum nächsten noch nicht abgerechneten Monat',()=>{
  const controls=[
    {payoutMonth:'2026-11',label:'November 2026',status:'waiting',remainingGross:null},
    {payoutMonth:'2026-10',label:'Oktober 2026',status:'ok',remainingGross:0},
    {payoutMonth:'2026-09',label:'September 2026',status:'open',remainingGross:242.90}
  ];
  const carry=buildPayrollCarryovers({controls,netByMonth:{'2026-09':173.19}});
  assert.equal(carry['2026-11'][0].sourceMonth,'2026-09');
  assert.equal(carry['2026-10'],undefined);
});


test('Hinweis zum Nachzahlungsübertrag nennt den tatsächlichen Zielmonat',()=>{
  assert.equal(
    payrollCarryoverRegularSollLabel({payoutMonth:'2026-10',label:'Oktober 2026'}),
    'Reguläres Soll für Oktober 2026 bleibt unverändert'
  );
  assert.equal(
    payrollCarryoverRegularSollLabel({payoutMonth:'2026-11',label:'November 2026'}),
    'Reguläres Soll für November 2026 bleibt unverändert'
  );
});
