import test from 'node:test';
import assert from 'node:assert/strict';
import {buildBmfInputs,socialContributions,reportComponents,garnishment2026,springInHourlyRate,springInPay,vblSvAddon,vblEmployeeContribution,calculateSalaryForecastCore,salaryForecastBreakdown} from '../lib/salary.js';
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
test('VBL 2026 wird nach Arbeitgeberumlage, 100-Euro-Grenze und 13,30-Euro-Freibetrag berechnet',()=>{
  assert.equal(vblEmployeeContribution(4480.43),81.10);
  assert.equal(vblSvAddon(4480.43),178.22);
  assert.equal(vblSvAddon(4581.20),183.75);
  assert.equal(vblSvAddon(4730.43),191.94);
});

test("Wechselschicht wird durch Code 5211 auch ohne Stundenwert berücksichtigt", () => {
  const c=reportComponents({items:[{code:'5211',hours:null,status:'ok'}],needsReview:false});
  assert.equal(c.pay.shift,250);
  assert.equal(c.shift,'wechsel');
});

test("Schichtzulage wird durch Code 5212 auch ohne Stundenwert berücksichtigt", () => {
  const c=reportComponents({items:[{code:'5212',hours:null,status:'ok'}],needsReview:false});
  assert.equal(c.pay.shift,100);
  assert.equal(c.shift,'schicht');
});

test('reiner Festbezug reproduziert die echte 2026-Kernabrechnung',()=>{
  const f=calculateSalaryForecastCore({items:[]},{wageTax:662.58,solidarity:0,churchTax:32.99,churchBase:0});
  assert.equal(f.totalGross,4480.43);
  assert.equal(f.svGross,4658.65);
  assert.equal(f.legalNet,2827.98);
  assert.equal(f.vbl,81.10);
});


test('Einspring-Stundenentgelt wird aus persönlicher KR-Stufe abgeleitet',()=>{
  assert.equal(springInHourlyRate(),25.25);
});

test('Einspringprämie besteht aus 150 Euro je Dienst plus Stundenentgelt',()=>{
  assert.deepEqual(springInPay({duties:1,hours:7.7}),{duties:1,hours:7.7,hourlyRate:25.25,premium:150,hourly:194.43,total:344.43});
});

test('Einspringen wird einmalig als steuerpflichtiger Zusatzlohn ergänzt',()=>{
  const c=reportComponents({items:[{code:'5010',hours:2}],springIn:{duties:1,hours:7.7}});
  assert.equal(c.pay.springIn,344.43);
  assert.equal(c.taxableExtra,344.43);
  assert.equal(c.taxFreePay,9.16);
  assert.equal(c.needsReview,true);
});


test('Einspringprämie bleibt bis VBL-Nachweis außerhalb der VBL-Basis',()=>{
  const f=calculateSalaryForecastCore({items:[],springIn:{duties:1,hours:7.7}},{wageTax:700,solidarity:0,churchTax:35,churchBase:0});
  assert.equal(f.components.springInVblUnverified,true);
  assert.equal(f.vblGross,4480.43);
  assert.equal(f.vbl,81.10);
  assert.equal(f.svAddon,178.22);
  assert.equal(f.needsReview,true);
});

test('§21-Durchschnitt wird sichtbar als nicht automatisch berechenbar geführt',()=>{
  const c=reportComponents({items:[{code:'5161',hours:2}]});
  assert.equal(c.average21Days,2);
  assert.equal(c.unpriced.length,1);
  assert.equal(c.needsReview,true);
});

test('Schichtzulage wird pro Monat nur einmal angesetzt, auch wenn der Code doppelt vorkommt',()=>{
  const c=reportComponents({items:[{code:'5212',hours:0},{code:'5212',hours:0}]});
  assert.equal(c.pay.shift,100);assert.equal(c.shift,'schicht');
});
test('gleichzeitige Codes 5211 und 5212 werden nicht zusammengerechnet',()=>{
  const c=reportComponents({items:[{code:'5211',hours:0},{code:'5212',hours:0}],needsReview:true});
  assert.equal(c.pay.shift,0);assert.equal(c.shift,'conflict');assert.equal(c.needsReview,true);
});
test('Forecast-Breakdown trennt feste Bezüge, steuerpflichtige Zulage und steuerfreie Zuschläge',()=>{
  const b=salaryForecastBreakdown({month:{year:2026,month:7},payoutMonth:'2026-09',items:[{code:'5010',hours:21.4},{code:'5014',hours:1.2},{code:'5024',hours:7.7},{code:'5212',hours:0}]});
  assert.equal(b.reportMonth,'2026-07');assert.equal(b.payoutMonth,'2026-09');assert.equal(b.fixed.gross,4480.43);assert.equal(b.shiftAllowance.amount,100);assert.equal(b.taxableAdditions,100.77);assert.equal(b.taxFreeSurcharges,142.13);assert.equal(b.taxableGross,4581.20);assert.equal(b.totalGross,4723.33);
});
