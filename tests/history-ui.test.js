import test from 'node:test';
import assert from 'node:assert/strict';
import {expectedSalarySlots} from '../lib/history-ui.js';

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
