import test from 'node:test';
import assert from 'node:assert/strict';
import {applyPaymentMonthOverride, DEFAULT_PAYROLL_PAYMENT_OVERRIDES} from '../lib/payroll-payment-overrides.js';
import {getPayrollPaymentOverrides, savePayrollPaymentOverrides, storageKeys} from '../lib/storage.js';

function memoryStorage(initial = {}) {
  const data = new Map(Object.entries(initial));
  return {getItem:key=>data.has(key)?data.get(key):null,setItem:(key,value)=>data.set(key,String(value)),removeItem:key=>data.delete(key)};
}

test('Juli 2026 wird einmalig von September nach Oktober verschoben und bleibt dem Leistungsmonat zugeordnet',()=>{
  const report=applyPaymentMonthOverride({
    month:{year:2026,month:7},
    payoutMonth:'2026-09',
    items:[{code:'5212',hours:0}]
  });
  assert.equal(report.standardPayoutMonth,'2026-09');
  assert.equal(report.payoutMonth,'2026-10');
  assert.equal(report.paymentMonthOverride.id,'2026-07-transmission-delay');
  assert.match(report.paymentMonthOverride.reason,/Flexpool/);
});

test('August 2026 folgt weiterhin der normalen M+2-Auszahlung im Oktober',()=>{
  const report=applyPaymentMonthOverride({
    month:{year:2026,month:8},
    payoutMonth:'2026-10'
  });
  assert.equal(report.standardPayoutMonth,'2026-10');
  assert.equal(report.payoutMonth,'2026-10');
  assert.equal(report.paymentMonthOverride,undefined);
});

test('Zahlungsmonatskorrekturen bleiben lokal speicherbar und defensiv normalisiert',()=>{
  const storage=memoryStorage();
  const defaults=getPayrollPaymentOverrides(storage);
  assert.deepEqual(defaults,DEFAULT_PAYROLL_PAYMENT_OVERRIDES);
  const custom=[{id:'x',originMonth:'2026-07',plannedPaymentMonth:'2026-09',actualPaymentMonth:'2026-11',oneTime:true,reason:'Test'}];
  assert.equal(savePayrollPaymentOverrides(custom,storage),true);
  assert.deepEqual(getPayrollPaymentOverrides(storage),custom);
  assert.notEqual(storage.getItem(storageKeys.payrollPaymentOverrides),null);
});
