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
