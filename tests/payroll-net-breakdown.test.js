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
