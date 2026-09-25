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
