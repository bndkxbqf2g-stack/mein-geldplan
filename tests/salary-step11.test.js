import test from 'node:test';
import assert from 'node:assert/strict';
import {reportComponents,garnishment2026} from '../lib/salary.js';

test('Samstag ist steuer- und pfändungspflichtig, Nacht/Sonntag geschützt',()=>{
  const c=reportComponents({items:[{code:'5010',hours:2},{code:'5014',hours:3},{code:'5024',hours:4}]});
  assert.equal(c.pay.night,9.16);
  assert.equal(c.pay.saturday,1.92);
  assert.equal(c.pay.sunday,22.92);
  assert.equal(c.taxFreePay,32.08);
  assert.equal(c.taxableExtra,1.92);
  assert.equal(c.garnishmentProtectedPay,32.08);
});

test('Schichtzulagen bleiben pfändungspflichtige Zusatzbestandteile',()=>{
  const c=reportComponents({items:[{code:'5211',hours:1}]});
  assert.equal(c.taxableExtra,250);
  assert.equal(c.garnishmentProtectedPay,0);
});

test('Pfändung 2026 bildet Tabellenobergrenze und Mehrbetrag ab',()=>{
  assert.equal(garnishment2026(4866.30,2),936.94);
  assert.equal(garnishment2026(4900,2),970.64);
});
