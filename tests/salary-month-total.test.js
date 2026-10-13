import test from 'node:test';
import assert from 'node:assert/strict';
import {renderPaymentMonthTotal} from '../lib/salary-ui.js';
import {expectedSalarySlots,expectedSalaryForPayoutMonth} from '../lib/history-ui.js';

const forecasts=[
  {reportMonth:'2026-09',payoutMonth:'2026-11',payout:1700,totalGross:2850,needsReview:false}
];

function withDisplay({payslips=[],storedForecasts=forecasts}={},callback){
  const beforeStorage=globalThis.localStorage,beforeDocument=globalThis.document;
  const data={meinGeldplanSalaryForecasts:JSON.stringify(storedForecasts),meinGeldplanPayslips:JSON.stringify(payslips)};
  const elements=new Map();
  const node=()=>({
    textContent:'',
    hidden:true,
    classList:{
      classes:new Set(['hidden']),
      toggle(name,hidden){if(hidden)this.classes.add(name);else this.classes.delete(name);},
      contains(name){return this.classes.has(name);}
    }
  });
  for(const id of ['pAnnualSpecialCards','pPayoutLabel','pTotalNetLabel','pTotalNet','pTotalNetDetail','pAnnualSpecialGross','pAnnualSpecialNet','pAnnualSpecialStatus'])elements.set(id,node());
  globalThis.localStorage={getItem:key=>data[key]??null};
  globalThis.document={getElementById:id=>elements.get(id)||null};
  const view=id=>elements.get(id).textContent;
  return Promise.resolve().then(()=>callback({view,elements,payslips,storedForecasts})).finally(()=>{
    if(beforeStorage===undefined)delete globalThis.localStorage;else globalThis.localStorage=beforeStorage;
    if(beforeDocument===undefined)delete globalThis.document;else globalThis.document=beforeDocument;
  });
}

test('November: Detail zeigt reguläres Netto + gesondertes Bonusnetto = monatliche Gesamtprognose',async()=>{
  await withDisplay({},async({view,elements,storedForecasts})=>{
    renderPaymentMonthTotal('2026-11',{calculateSpecialNet:async()=>({payout:525})});
    assert.equal(view('pTotalNet'),'–','keine vorzeitige Falschausgabe nur des Monatsnettos');
    await new Promise(resolve=>setImmediate(resolve));
    assert.equal(view('pPayoutLabel'),'Reguläres Gehalt netto (Zeitnachweis)');
    assert.equal(view('pAnnualSpecialNet'),'525,00 €');
    assert.equal(view('pTotalNet'),'2.225,00 €');
    assert.match(view('pTotalNetDetail'),/1\.700,00/);
    assert.match(view('pTotalNetDetail'),/525,00/);
    assert.equal(elements.get('pAnnualSpecialCards').classList.contains('hidden'),false);
    const month=expectedSalaryForPayoutMonth({
      payoutMonth:'2026-11',forecasts:storedForecasts,
      annualSpecialPayment:{paymentMonth:'2026-11',net:525,gross:1000}
    });
    assert.equal(month.payout,2225,'gleiches Monatsnetz wie die Übersicht');
  });
});

test('Ist-November mit Sonderzahlung: Gesamtbetrag nicht noch einmal um einen Bonus erhöhen',async()=>{
  await withDisplay({payslips:[{month:'2026-11',payout:2300,specialPaymentGross:960}]},async({view})=>{
    let wasCalled=false;
    renderPaymentMonthTotal('2026-11',{calculateSpecialNet:async()=>{wasCalled=true;return {payout:525};}});
    assert.equal(view('pTotalNet'),'2.300,00 €');
    assert.equal(view('pAnnualSpecialGross'),'960,00 €');
    assert.equal(view('pAnnualSpecialNet'),'In Ist-Auszahlung enthalten');
    assert.equal(wasCalled,false);
    const month=expectedSalaryForPayoutMonth({
      payoutMonth:'2026-11',forecasts,payslips:[{month:'2026-11',payout:2300,specialPaymentGross:960}],
      annualSpecialPayment:{paymentMonth:'2026-11',net:525,gross:1000}
    });
    assert.equal(month.payout,2300);
  });
});

test('Ist-November ohne separat erkannte Sonderzahlung: keine fiktive Bonus-Nachzahlung',async()=>{
  const actual=[{month:'2026-11',payout:2120,specialPaymentGross:null}];
  await withDisplay({payslips:actual},async({view})=>{
    renderPaymentMonthTotal('2026-11',{calculateSpecialNet:async()=>({payout:525})});
    assert.equal(view('pTotalNet'),'2.120,00 €');
    assert.equal(view('pAnnualSpecialNet'),'Nicht separat belegbar');
    const month=expectedSalaryForPayoutMonth({
      payoutMonth:'2026-11',forecasts,payslips:actual,
      annualSpecialPayment:{paymentMonth:'2026-11',net:525,gross:1000}
    });
    assert.equal(month.payout,2120);
    assert.equal(month.specialPayment.net,null);
  });
});

test('Nicht-November: Sonderzahlung ausgeblendet und async Rückmeldung einer alten Ansicht ignoriert',async()=>{
  await withDisplay({},async({view,elements})=>{
    let resolveNet;
    renderPaymentMonthTotal('2026-11',{calculateSpecialNet:()=>new Promise(resolve=>{resolveNet=resolve;})});
    await Promise.resolve();
    renderPaymentMonthTotal('2026-12');
    assert.equal(view('pTotalNetLabel'),'Gesamtnetto inkl. Zuschlags-Nachzahlung');
    assert.equal(elements.get('pAnnualSpecialCards').classList.contains('hidden'),true);
    resolveNet({payout:525});
    await new Promise(resolve=>setImmediate(resolve));
    assert.equal(view('pTotalNetLabel'),'Gesamtnetto inkl. Zuschlags-Nachzahlung');
    assert.notEqual(view('pTotalNet'),'2.225,00 €');
  });
});

test('Monatsprojektion ist unabhängig vom aktuellen Datum und greift nicht in Lohnbuchungen ein',()=>{
  assert.equal(expectedSalaryForPayoutMonth({payoutMonth:'2026-00'}),null);
  assert.equal(expectedSalaryForPayoutMonth({payoutMonth:'foo'}),null);
  const params={
    today:new Date(2026,10,1,12),transactions:[],forecasts,
    annualSpecialPayment:{paymentMonth:'2026-11',gross:1000,net:525}
  };
  const overview=expectedSalarySlots(params).find(slot=>slot.payoutMonth==='2026-11');
  const selected=expectedSalaryForPayoutMonth({...params,payoutMonth:'2026-11'});
  assert.equal(selected.payout,overview.payout);
  assert.equal(selected.regularPayout,overview.regularPayout);
});
