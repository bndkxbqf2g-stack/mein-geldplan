import test from 'node:test';
import assert from 'node:assert/strict';
import {calculateSalaryForecastCore} from '../lib/salary.js';

test('VBL-Arbeitnehmeranteil mindert das pfändbare Netto',()=>{
  const forecast=calculateSalaryForecastCore(
    {items:[],needsReview:false},
    {wageTax:662.58,solidarity:0,churchTax:32.99,churchBase:0}
  );
  assert.equal(forecast.legalNet,2827.98);
  assert.equal(forecast.vbl,81.10);
  assert.equal(forecast.garnishableNet,2746.88);
  assert.equal(forecast.garnishment,88.94);
  assert.equal(forecast.payout,2657.94);
});


test('September-Rückstand berechnet Nettoeffekte mit echter Kernlogik',()=>{
  const baseline=calculateSalaryForecastCore(
    {items:[],needsReview:false},
    {wageTax:662.58,solidarity:0,churchTax:32.99,churchBase:0}
  );
  const report={items:[
    {code:'5010',hours:21.4},
    {code:'5014',hours:1.2},
    {code:'5024',hours:7.7},
    {code:'5212',hours:null}
  ],needsReview:false};
  const full=calculateSalaryForecastCore(
    report,
    {wageTax:683.58,solidarity:0,churchTax:34.04,churchBase:0}
  );
  assert.equal(baseline.payout,2657.94);
  assert.equal(full.components.taxFreePay,142.13);
  assert.equal(full.components.taxableExtra,100.77);
  assert.equal(full.totalGross,4723.33);
  assert.equal(full.vblGross,4581.20);
  assert.equal(full.vbl,82.92);
  assert.ok(full.payout>baseline.payout);
});
