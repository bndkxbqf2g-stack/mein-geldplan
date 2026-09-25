import test from 'node:test';
import assert from 'node:assert/strict';
import {buildPayrollLearningSnapshot,mergePayrollLearning,summarizePayrollLearning,validateForecastWithLearning} from '../lib/payroll-learning.js';

function forecast(month='2026-09'){
  return {
    payoutMonth:month,
    reportMonth:'2026-07',
    totalGross:4723.33,
    legalNet:3026.99,
    vbl:82.92,
    garnishment:112.94,
    payout:2831.13,
    reportItems:[
      {code:'5010',hours:18.9},{code:'5011',hours:2.5},{code:'5014',hours:1.2},{code:'5024',hours:7.7},{code:'5212',hours:0}
    ],
    components:{night:98.01,saturday:.77,sunday:44.12,holiday:0,shift:100,springIn:0}
  };
}
function payslip(month='2026-09'){
  return {
    month,totalGross:4723.33,legalNet:3026.99,vbl:82.92,garnishment:112.94,payout:2831.13,
    components:{night:98.01,saturday:.77,sunday:44.12,holiday:0,shift:100,springIn:null}
  };
}

test('Soll-Ist-Lernsnapshot vergleicht Zeitnachweis-Komponenten mit der echten Abrechnung',()=>{
  const result=buildPayrollLearningSnapshot({forecast:forecast(),actual:payslip()});
  assert.equal(result.payoutMonth,'2026-09');
  assert.equal(result.rows.find(row=>row.key==='night').confirmed,true);
  assert.deepEqual(result.rows.find(row=>row.key==='night').codes,['5010','5011']);
  assert.equal(result.rows.find(row=>row.key==='shift').codes[0],'5212');
  assert.equal(result.rows.find(row=>row.key==='shift').tax,'steuerpflichtig');
});

test('Lernhistorie ersetzt denselben Monatsabgleich statt doppelt zu zählen',()=>{
  const first=buildPayrollLearningSnapshot({forecast:forecast(),actual:payslip()});
  const second={...first,createdAt:'later'};
  const merged=mergePayrollLearning([first],second);
  assert.equal(merged.length,1);
  assert.equal(merged[0].createdAt,'later');
});

test('drei identische Bestätigungen ergeben verifiziert ohne Rechenregeln automatisch zu überschreiben',()=>{
  const history=['2026-09','2026-10','2026-11'].map((month,index)=>{
    const f=forecast(month);f.reportMonth=`2026-${String(7+index).padStart(2,'0')}`;
    const a=payslip(month);
    return buildPayrollLearningSnapshot({forecast:f,actual:a});
  });
  const rules=summarizePayrollLearning(history);
  const night=rules.find(rule=>rule.key==='5010');
  assert.equal(night.observations,3);
  assert.equal(night.confirmations,3);
  assert.equal(night.confidence,'verifiziert');
});

test('Abweichungen werden als Warnung gelernt und nicht still als neue Wahrheit übernommen',()=>{
  const actual=payslip();actual.components.shift=80;
  const history=[buildPayrollLearningSnapshot({forecast:forecast(),actual})];
  const check=validateForecastWithLearning(forecast(),history);
  assert.equal(check.needsReview,true);
  assert.equal(check.warnings.find(w=>w.code==='5212').mismatches,1);
});
