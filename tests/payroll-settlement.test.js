import test from 'node:test';
import assert from 'node:assert/strict';
import {summarizePaidPayrollAdjustments} from '../lib/payroll-settlement.js';
import {parsePayslipDocument} from '../lib/payslip.js';
import {renderPayrollControl} from '../lib/payroll-control-ui.js';

const fixed={basePay:1200,careAllowance:0,universityAllowance:0};
const amountComponents=(night,sunday,shift,shiftType)=>({
  fixed,night,sunday,shift,shiftType,saturday:0,saturdayEvening:0,holiday:0,springIn:0,unpriced:[]
});

function fixture(){
  const payslip={
    month:'2026-10',basePay:1200,careAllowance:0,universityAllowance:0,
    totalGross:1200,legalNet:1000,vbl:20,garnishment:0,
    priorAdjustment:173,hasPriorAdjustment:true,payout:1153,
    components:{night:null,saturday:null,sunday:null,shift:null},
    retroPeriods:[
      {month:'2026-07',totalGross:70,legalNet:58,vbl:2,vblDocumented:true,
        components:{night:20,sunday:10,shift:40,saturday:0,average21:null}},
      {month:'2026-08',totalGross:152.5,legalNet:120,vbl:3,vblDocumented:true,
        components:{night:15,sunday:10,shift:100,saturday:0,average21:27.5}}
    ]
  };
  const forecasts=[
    {reportMonth:'2026-07',payoutMonth:'2026-10',standardPayoutMonth:'2026-09',
      paymentMonthOverride:{reason:'Testverzögerung'},
      totalGross:1270,baselinePayout:980,payout:1036,
      components:amountComponents(20,10,40,'schicht'),reportItems:[{code:'5212'}]},
    {reportMonth:'2026-08',payoutMonth:'2026-10',standardPayoutMonth:'2026-10',
      totalGross:1325,baselinePayout:980,payout:1070,
      components:amountComponents(15,10,100,'wechsel'),reportItems:[{code:'5211'}]}
  ];
  return {payslip,forecasts};
}

test('echte Rückrechnungsnettos und getrennte Bruttowerte werden nur einmal summiert',()=>{
  const {payslip}=fixture();
  const result=summarizePaidPayrollAdjustments(payslip,1395);
  assert.equal(result.netReconciled,true);
  assert.equal(result.priorAdjustment,173);
  assert.equal(result.reconciledNet,173);
  assert.deepEqual(result.rows.map(row=>row.net),[56,117]);
  assert.deepEqual(result.rows.map(row=>row.month),['2026-07','2026-08']);
  assert.equal(result.grossIncludingRetro,1422.5);
  assert.equal(result.grossOutsideForecast,27.5);
  assert.equal(result.average21Gross,27.5);
});

test('unvollständige oder widersprüchliche Rückrechnung erfindet keine Monatsnettos',()=>{
  const {payslip}=fixture();
  assert.equal(summarizePaidPayrollAdjustments({...payslip,priorAdjustment:175},1395).rows[0].net,null);
  assert.equal(summarizePaidPayrollAdjustments({...payslip,retroPeriods:[{month:'2026-07',totalGross:70,legalNet:58,vbl:0}]},1270).rows[0].net,null);
  const missing=summarizePaidPayrollAdjustments({...payslip,retroPeriods:[{month:'2026-07',totalGross:70}]},1270);
  assert.equal(missing.rows[0].net,null);
  assert.equal(missing.reconciledNet,null);
});

test('PDF-Parser liest §21 und explizite VBL für einzelne Rückrechnungen',()=>{
  const doc=parsePayslipDocument([
    'Aktuelle Abrechnungsperiode','Abrechnungsmonat : 10/2026',
    'Gesamtbrutto 1.200,00','Gesetzliches Netto 1.000,00',
    'Nachverrechnung aus Vorm. 56,00','Überweisung 1.036,00',
    'Rückrechnungs-Periode','für Abrechnungsmonat : 07/2026',
    'Durchschnitt § 21 LSGZ 5,00 2,50 12,50',
    'Gesamtbrutto 70,00','Gesetzliches Netto 58,00',
    'ZV-Uml. Regelentg. AN 2,00-'
  ].join('\n'));
  assert.equal(doc.retroPeriods[0].components.average21,12.5);
  assert.equal(doc.retroPeriods[0].vblDocumented,true);
  assert.equal(summarizePaidPayrollAdjustments(doc).rows[0].net,56);
});

test('Kontrollkarte zeigt bereits gezahlte Nettoanteile statt offen=0 als Zuschlagseffekt',()=>{
  const {payslip,forecasts}=fixture();
  const beforeStorage=globalThis.localStorage,beforeDocument=globalThis.document;
  const storage={
    meinGeldplanSalaryForecasts:JSON.stringify(forecasts),
    meinGeldplanPayslips:JSON.stringify([payslip])
  };
  const elements=new Map();
  const make=()=>({
    children:[],className:'',textContent:'',innerHTML:'',
    append(...children){this.children.push(...children);},
    appendChild(child){this.children.push(child);return child;}
  });
  const list=make(),status=make();
  elements.set('payrollControlList',list);
  elements.set('payrollControlStatus',status);
  globalThis.localStorage={getItem:key=>storage[key]??null};
  globalThis.document={
    getElementById:id=>elements.get(id)||null,
    createElement:make
  };
  const collect=node=>[node.textContent,...node.children.flatMap(child=>[collect(child)])].join(' ');
  try{
    renderPayrollControl({annualSpecialPayment:{paymentMonth:'2027-11',excluded:true}});
    const visible=collect(list);
    assert.match(visible,/Zuschläge bezahlt/);
    assert.match(visible,/Nachverrechnung netto \(Ist\)/);
    assert.match(visible,/173,00\s*€/);
    assert.match(visible,/Noch offen netto/);
    assert.match(visible,/0,00\s*€/);
    assert.match(visible,/Abgerechnetes Brutto inkl\. Rückrechnungen \(Ist\)/);
    assert.match(visible,/1\.422,50\s*€/);
    assert.match(visible,/Durchschnitt §21 TV-L/);
    assert.match(visible,/27,50\s*€/);
    assert.match(visible,/nachgezahlt netto 56,00\s*€/);
    assert.match(visible,/nachgezahlt netto 117,00\s*€/);
    assert.doesNotMatch(visible,/Nettoeffekt Zuschläge 0,00/);
    assert.equal(list.children.length,1);
  }finally{
    if(beforeStorage===undefined)delete globalThis.localStorage;else globalThis.localStorage=beforeStorage;
    if(beforeDocument===undefined)delete globalThis.document;else globalThis.document=beforeDocument;
  }
});
