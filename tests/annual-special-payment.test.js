import test from 'node:test';
import assert from 'node:assert/strict';
import {SALARY_2026,fixedGross} from '../config/salary-2026.js';
import {annualSpecialPaymentForecast,annualSpecialPaymentReferenceMonths} from '../lib/annual-special-payment.js';
import {expectedSalarySlots} from '../lib/history-ui.js';
import {parsePayslipComponents} from '../lib/payslip.js';

test('Jahressonderzahlung nutzt TV-L-Referenzmonate und den datierten KR8-Satz',()=>{
  assert.deepEqual(annualSpecialPaymentReferenceMonths(2026),['2026-07','2026-08','2026-09']);
  const forecast=annualSpecialPaymentForecast({year:2026});
  assert.equal(forecast.rate,0.8814);
  assert.equal(forecast.averageEntitlementGross,fixedGross());
  assert.equal(forecast.gross,Math.round(fixedGross()*0.8814*100)/100);
  assert.equal(forecast.paymentMonth,'2026-11');
  assert.equal(forecast.source,'estimate');
  assert.equal(forecast.needsReview,true);
  assert.match(SALARY_2026.annualSpecialPayment.source,/TV-L §20/);
});

test('bekannte Juli-September-Bezüge ersetzen die reine Fixgehalts-Schätzung',()=>{
  const forecast=annualSpecialPaymentForecast({
    year:2026,
    payslips:[
      {month:'2026-07',totalGross:4600},
      {month:'2026-08',totalGross:4700},
      {month:'2026-09',totalGross:4800}
    ]
  });
  assert.equal(forecast.source,'actual');
  assert.equal(forecast.averageEntitlementGross,4700);
  assert.equal(forecast.gross,4142.58);
});

test('November-Sonderzahlung und November-Zeitnachweis werden getrennt ausgewiesen',()=>{
  const slots=expectedSalarySlots({
    today:new Date(2026,9,5,10,0),
    forecasts:[
      {payoutMonth:'2026-11',reportMonth:'2026-09',payout:2700.70},
      {payoutMonth:'2027-01',reportMonth:'2026-11',payout:2800}
    ],
    annualSpecialPayment:{paymentMonth:'2026-11',gross:3949.05,net:2000,source:'estimate',needsReview:true}
  });
  assert.deepEqual(slots.map(slot=>slot.payoutMonth),['2026-10','2026-11']);
  assert.equal(slots[1].payout,4700.70);
  assert.equal(slots[1].specialPayment.net,2000);
});

test('Ist-Sonderzahlung wird nicht ein zweites Mal auf die Bezügemitteilung addiert',()=>{
  const slots=expectedSalarySlots({
    today:new Date(2026,9,5,10,0),
    payslips:[{month:'2026-11',payout:4700.70,specialPaymentGross:3949.05}],
    forecasts:[{payoutMonth:'2026-11',reportMonth:'2026-09',payout:2700.70}],
    annualSpecialPayment:{paymentMonth:'2026-11',gross:3949.05,net:2000,source:'estimate',needsReview:true}
  });
  assert.equal(slots[1].status,'actual');
  assert.equal(slots[1].payout,4700.70);
  assert.equal(slots[1].specialPayment.actual,true);
  assert.equal(slots[1].specialPayment.net,null);
});

test('Bezügemitteilung erkennt Sonderzahlung TV-L als eigenes Ist-Element',()=>{
  const components=parsePayslipComponents('Sonderzahlung TV-L 3.949,05');
  assert.equal(components.specialPayment,3949.05);
});
