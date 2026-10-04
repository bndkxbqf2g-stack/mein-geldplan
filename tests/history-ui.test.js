import test from 'node:test';
import assert from 'node:assert/strict';
import {expectedSalarySlots,overviewAvailableAmount} from '../lib/history-ui.js';

test('Übersicht ordnet den Hauptbetrag dem aktuellen Budgetzyklus bis Samstag zu',()=>{
  const budget={active:true,weeklyBudget:74.97,dailyBudget:18.742,segmentStart:new Date(2026,8,30),segmentEnd:new Date(2026,9,3)};
  assert.equal(overviewAvailableAmount({budget,giro:562.26,cash:30}),74.97);
  assert.equal(budget.segmentEnd.getDay(),6);
  assert.equal(Number(budget.dailyBudget.toFixed(2)),18.74);
});

test('Übersicht zeigt im aktiven Zyklus das berechnete Abschnittsbudget statt Giro plus Bargeld',()=>{
  assert.equal(overviewAvailableAmount({
    budget:{active:true,weeklyBudget:74.97},
    giro:562.26,
    cash:30
  }),74.97);
});

test('Ohne aktiven Zyklus zeigt die Übersicht weiterhin Giro plus Bargeld',()=>{
  assert.equal(overviewAvailableAmount({
    budget:{active:false},
    giro:562.26,
    cash:30
  }),592.26);
});

test('Übersicht zeigt für September die aktuell gespeicherte Prognose',()=>{
  const slots=expectedSalarySlots({
    today:new Date(2026,8,25,12,0,0),
    transactions:[],
    forecasts:[
      {payoutMonth:'2026-09',reportMonth:'2026-07',payout:2831.13,needsReview:false},
      {payoutMonth:'2026-10',reportMonth:'2026-08',payout:2977.51,needsReview:false}
    ]
  });
  assert.deepEqual(slots.map(slot=>slot.payoutMonth),['2026-09','2026-10']);
  assert.equal(slots[0].payout,2831.13);
  assert.equal(slots[0].reportMonth,'2026-07');
  assert.equal(slots[0].status,'forecast');
});


test('Übersicht ersetzt September-Prognose durch tatsächliche Auszahlung sobald Bezügemitteilung vorliegt',()=>{
  const slots=expectedSalarySlots({
    today:new Date(2026,8,25,12,0,0),
    transactions:[],
    forecasts:[
      {payoutMonth:'2026-09',reportMonth:'2026-07',payout:2831.13,needsReview:false},
      {payoutMonth:'2026-10',reportMonth:'2026-08',payout:2808.94,needsReview:false}
    ],
    payslips:[{month:'2026-09',payout:2657.94}],
    learning:[]
  });
  assert.equal(slots[0].status,'actual');
  assert.equal(slots[0].payout,2657.94);
  assert.equal(slots[0].rawPayout,2831.13);
});

test('Übersicht nutzt für zukünftige Monate eine stabile Lernkalibrierung',()=>{
  const learning=[
    {
      payoutMonth:'2026-07',hasPriorAdjustment:false,
      rows:[{key:'night',comparable:true,confirmed:true}],
      totals:[
        {key:'totalGross',comparable:true,confirmed:true,difference:0},
        {key:'payout',comparable:true,confirmed:false,difference:-4}
      ]
    },
    {
      payoutMonth:'2026-08',hasPriorAdjustment:false,
      rows:[{key:'night',comparable:true,confirmed:true}],
      totals:[
        {key:'totalGross',comparable:true,confirmed:true,difference:0},
        {key:'payout',comparable:true,confirmed:false,difference:-6}
      ]
    }
  ];
  const slots=expectedSalarySlots({
    today:new Date(2026,8,25,12,0,0),
    transactions:[],
    forecasts:[
      {payoutMonth:'2026-09',reportMonth:'2026-07',payout:2808.94,needsReview:false,components:{unpriced:[]}},
      {payoutMonth:'2026-10',reportMonth:'2026-08',payout:2808.94,needsReview:false,components:{unpriced:[]}}
    ],
    payslips:[],
    learning
  });
  assert.equal(slots[0].status,'forecast');
  assert.equal(slots[0].learningApplied,true);
  assert.equal(slots[0].payout,2803.94);
});


test('Übersicht rechnet offene September-Nachzahlung in die Oktober-Prognose ein',()=>{
  const commonComponents={
    fixed:{basePay:4226.92,careAllowance:90,universityAllowance:163.51},
    night:98.01,saturday:0.77,sunday:44.12,holiday:0,shift:0,shiftType:'none',springIn:0,
    unpriced:[]
  };
  const forecasts=[
    {
      payoutMonth:'2026-09',reportMonth:'2026-07',totalGross:4723.33,payout:2845.20,
      components:commonComponents,
      netEffects:{basis:'actual-payslip-outstanding',complete:true,totalNet:173.19,timeNet:173.19}
    },
    {
      payoutMonth:'2026-10',reportMonth:'2026-08',totalGross:4480.43,payout:2773.72,
      components:{...commonComponents,night:0,saturday:0,sunday:0}
    }
  ];
  const payslips=[{
    month:'2026-09',basePay:4226.92,careAllowance:90,universityAllowance:163.51,
    totalGross:4480.43,payout:2700.70,hasPriorAdjustment:false,needsReview:false,
    components:{night:null,saturday:null,sunday:null,holiday:null,shift:null,springIn:null,hasVariableDetail:false},
    retroPeriods:[]
  }];
  const slots=expectedSalarySlots({
    today:new Date(2026,8,25,12,0,0),
    transactions:[],
    forecasts,
    payslips,
    learning:[]
  });
  assert.equal(slots[0].status,'actual');
  assert.equal(slots[1].payout,2946.91);
  assert.equal(slots[1].regularPayout,2773.72);
  assert.equal(slots[1].carryover,173.19);
});

test('Übersicht fasst Grundnetto nur einmal zusammen und addiert alle Zuschläge aus demselben Auszahlungsmonat netto',()=>{
  const fixed={basePay:2500,careAllowance:50,universityAllowance:50};
  const makeForecast=({reportMonth,standardPayoutMonth,payout,shift,override=false})=>({
    payoutMonth:'2026-10',
    reportMonth,
    standardPayoutMonth,
    paymentMonthOverride:override?{reason:'einmalige Verzögerung'}:null,
    totalGross:2600+shift,
    baselineGross:2600,
    baselinePayout:2500,
    payout,
    netEffects:{complete:true,totalNet:payout-2500},
    reportItems:[{code:shift===100?'5212':'5211'}],
    components:{fixed,night:0,saturday:0,saturdayEvening:0,sunday:0,holiday:0,shift,shiftType:shift===100?'schicht':'wechsel',springIn:0,unpriced:[],springInVblUnverified:false},
    needsReview:false
  });
  const slots=expectedSalarySlots({
    today:new Date(2026,9,4,12,0,0),
    transactions:[],
    forecasts:[
      makeForecast({reportMonth:'2026-07',standardPayoutMonth:'2026-09',payout:2600,shift:100,override:true}),
      makeForecast({reportMonth:'2026-08',standardPayoutMonth:'2026-10',payout:2800,shift:300})
    ],
    payslips:[],
    learning:[]
  });
  assert.equal(slots[0].payoutMonth,'2026-10');
  assert.equal(slots[0].payout,2900);
  assert.equal(slots[0].regularPayout,2900);
  assert.deepEqual(slots[0].reportMonths,['2026-07','2026-08']);
  assert.equal(slots[0].status,'forecast');
});

test('Übersicht markiert den Monatsbetrag zur Prüfung, wenn eine Zusatzprognose keinen belastbaren Nettoeffekt hat',()=>{
  const base={payoutMonth:'2026-10',reportMonth:'2026-08',standardPayoutMonth:'2026-10',baselinePayout:2500,payout:2700,baselineGross:2600,totalGross:2700,components:{fixed:{basePay:2500},night:0,shift:100,unpriced:[]},reportItems:[{code:'5212'}],needsReview:false};
  const extra={...base,reportMonth:'2026-07',standardPayoutMonth:'2026-09',paymentMonthOverride:{reason:'einmalige Verzögerung'},baselinePayout:null,netEffects:null};
  const slot=expectedSalarySlots({today:new Date(2026,9,4,12,0,0),forecasts:[base,extra]})[0];
  assert.equal(slot.payout,null);
  assert.equal(slot.status,'review');
});
