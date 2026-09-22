import test from 'node:test';
import assert from 'node:assert/strict';
import {calculateCurrentCycleBudget} from '../lib/budget-ui.js';

test('Budget-UI hält Abhebung im laufenden Abschnitt neutral',()=>{
  const result=calculateCurrentCycleBudget({
    giro:1520,
    transactions:[{type:'withdrawal',amount:-300,date:'2026-10-04'}],
    savings:{positions:[],allocations:[]},
    today:new Date('2026-10-04T12:00:00')
  });
  assert.equal(result.dailyBudget,70);
  assert.equal(result.weeklyBudget,490);
});

test('Reservierte Sparrate wirkt erst ab effectiveFrom auf das Girobudget',()=>{
  const result=calculateCurrentCycleBudget({
    giro:1520,
    transactions:[{type:'withdrawal',amount:-300,date:'2026-10-04'}],
    savings:{positions:[{id:'u',name:'Urlaub'}],allocations:[{positionId:'u',amount:100,sourceSegmentStart:'2026-10-04',effectiveFrom:'2026-10-11'}]},
    today:new Date('2026-10-11T12:00:00')
  });
  assert.equal(result.remainingDays,19);
  assert.equal(Number(result.dailyBudget.toFixed(2)),74.74);
});
