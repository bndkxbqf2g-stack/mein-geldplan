import test from 'node:test';
import assert from 'node:assert/strict';
import {buildBmfInputs,socialContributions,reportComponents,garnishment2026} from '../lib/salary.js';
import {SALARY_2026} from '../config/salary-2026.js';

test('BMF-Profil entspricht der Bezügemitteilung',()=>{
  const i=buildBmfInputs(4480.43);assert.equal(i.STKL,1);assert.equal(i.ZKF,1);assert.equal(i.KVZ,2.18);assert.equal(i.PVA,1);
});
test('Sozialversicherung trifft Referenzabrechnung',()=>{
  assert.deepEqual(socialContributions(4658.65),{health:390.86,care:72.21,pension:433.25,unemployment:60.56});
});
test('Zeitlohnarten werden getrennt berechnet',()=>{
  const c=reportComponents({items:[{code:'5010',hours:2},{code:'5024',hours:3},{code:'5211',hours:1}]});
  assert.equal(c.protectedPay,26.35);assert.equal(c.taxableExtra,250);assert.equal(c.shift,'wechsel');
});
test('Pfändungstabelle 2026 für zwei Unterhaltspflichten',()=>{
  assert.equal(garnishment2026(2805,2),112.94);assert.equal(garnishment2026(2525,2),.94);assert.equal(garnishment2026(2400,2),0);
});
test('Referenzwerte VBL und SV-Hinzubetrag sind kalibriert',()=>{
  assert.equal(Math.round(4480.43*SALARY_2026.social.vblEmployeeRate*100)/100,81.10);
  assert.equal(Math.round(4480.43*SALARY_2026.social.zvSvAddonRate*100)/100,178.22);
});
