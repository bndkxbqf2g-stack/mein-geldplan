import test from 'node:test';
import assert from 'node:assert/strict';
import { salaryMonthLabel, comparisonLabel, restoreReportFromForecast } from '../lib/salary-ui.js';

test('salary month label formatiert YYYY-MM als MM/YYYY',()=>assert.equal(salaryMonthLabel('2026-09'),'09/2026'));
test('comparison label unterscheidet Treffer, Abweichung und Prüfung',()=>{
  assert.equal(comparisonLabel('ok'),'Prognose trifft Abrechnung');
  assert.equal(comparisonLabel('different'),'Abweichung erkannt');
  assert.equal(comparisonLabel('review'),'Bitte prüfen');
});
test('comparison label kennzeichnet Nachverrechnung ohne falschen Prognosefehler',()=>assert.equal(comparisonLabel('adjusted'),'Kernwerte stimmen · Nachverrechnung vorhanden'));
test('gespeicherte Prognose kann nach PWA-Neustart wieder als Zeitnachweis aktiviert werden',()=>{
  const report=restoreReportFromForecast({payoutMonth:'2026-09',reportMonth:'2026-07',reportItems:[{code:'5010',type:'night',hours:21.4,amount:null}],needsReview:false,springIn:{duties:0,hours:0}});
  assert.deepEqual(report.month,{year:2026,month:7});
  assert.equal(report.payoutMonth,'2026-09');
  assert.equal(report.items[0].code,'5010');
});