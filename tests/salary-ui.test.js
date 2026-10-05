import test from 'node:test';
import assert from 'node:assert/strict';
import { salaryMonthLabel, comparisonLabel, restoreReportFromForecast, latestStoredSalaryForecast, refreshStoredSalaryForecasts, salaryDisplayPayout, summarizeForecastNet, processTimeReportFiles } from '../lib/salary-ui.js';

test('salary month label formatiert YYYY-MM als MM/YYYY',()=>assert.equal(salaryMonthLabel('2026-09'),'09/2026'));

test('Gesamtnetto enthält Zuschlags-Nachzahlung mit steuerfreier und steuerpflichtiger Aufteilung',()=>{
  const summary=summarizeForecastNet({baselinePayout:2657.94,payout:2831.13,components:{night:98.01,saturday:0.77,sunday:44.12,holiday:0,shift:100},netEffects:{totalNet:173.19,taxFreeNet:142.13}},2831.13,[]);
  assert.equal(summary.totalNet,2831.13);
  assert.equal(summary.surchargeNet,173.19);
  assert.equal(summary.taxFreeNet,142.13);
  assert.equal(summary.taxableGross,100.77);
  assert.equal(summary.taxableNet,31.06);
});
test('comparison label unterscheidet Treffer, Abweichung und Prüfung',()=>{
  assert.equal(comparisonLabel('ok'),'Prognose trifft Abrechnung');
  assert.equal(comparisonLabel('different'),'Abweichung erkannt');
  assert.equal(comparisonLabel('review'),'Bitte prüfen');
});
test('comparison label kennzeichnet Nachverrechnung ohne falschen Prognosefehler',()=>assert.equal(comparisonLabel('adjusted'),'Kernwerte stimmen · Nachverrechnung vorhanden'));
test('Neustart wählt die zuletzt ausgezahlte gespeicherte Prognose für die Detailansicht',()=>{
  const selected=latestStoredSalaryForecast([{payoutMonth:'2026-09'},{payoutMonth:'2027-01'},{payoutMonth:'2026-10'}]);
  assert.equal(selected.payoutMonth,'2027-01');
});

test('gespeicherte Prognose kann nach PWA-Neustart wieder als Zeitnachweis aktiviert werden',()=>{
  const report=restoreReportFromForecast({payoutMonth:'2026-09',reportMonth:'2026-07',reportItems:[{code:'5010',type:'night',hours:21.4,amount:null}],needsReview:false,springIn:{duties:0,hours:0}});
  assert.deepEqual(report.month,{year:2026,month:7});
  assert.equal(report.payoutMonth,'2026-09');
  assert.equal(report.items[0].code,'5010');
});

test('alte gespeicherte September-Prognose wird einmalig mit aktuellen Regeln neu aufgebaut',async()=>{
  const stale={
    forecastModel:2,
    payoutMonth:'2026-09',
    reportMonth:'2026-07',
    payout:2847.50,
    totalGross:4723.33,
    reportItems:[
      {code:'5010',hours:21.4},
      {code:'5014',hours:1.2},
      {code:'5024',hours:7.7},
      {code:'5212',hours:0}
    ],
    unknownCodes:[],
    needsReview:false
  };
  const baseline={
    totalGross:4480.43,taxableGross:4480.43,wageTax:662.58,solidarity:0,churchTax:32.99,
    sv:{health:390.86,care:72.21,pension:433.25,unemployment:60.56},
    legalNet:2827.98,vbl:81.10,protectedPay:0,garnishableNet:2746.88,garnishment:88.94,payout:2657.94,
    components:{hours:{night:0,saturday:0,sunday:0,holiday:0},pay:{night:0,saturday:0,sunday:0,holiday:0,shift:0},shift:'none',average21Days:0,unpriced:[],springIn:{duties:0,hours:0,total:0},springInVblUnverified:false}
  };
  const current={
    totalGross:4723.33,taxableGross:4581.20,wageTax:683.58,solidarity:0,churchTax:34.04,
    sv:{health:384.56,care:71.01,pension:426.05,unemployment:59.56},
    legalNet:3026.99,vbl:82.92,protectedPay:142.13,garnishableNet:2801.94,garnishment:112.94,payout:2831.13,
    needsReview:false,
    components:{
      hours:{night:21.4,saturday:1.2,sunday:7.7,holiday:0},
      pay:{night:98.01,saturday:.77,sunday:44.12,holiday:0,shift:100},
      shift:'schicht',average21Days:0,unpriced:[],springIn:{duties:0,hours:0,total:0},springInVblUnverified:false
    }
  };
  const saved=[];
  const result=await refreshStoredSalaryForecasts({
    forecasts:[stale],
    calculator:async report=>(report.items||[]).length?current:baseline,
    effectsCalculator:async()=>({complete:true,totalNet:173.19}),
    persist:value=>{saved.push(...value);return true;}
  });
  assert.equal(result.changed,true);
  assert.equal(saved.length,1);
  assert.equal(saved[0].forecastModel,4);
  assert.equal(saved[0].payout,2831.13);
  assert.equal(saved[0].baselinePayout,2657.94);
  assert.equal(saved[0].netEffects.totalNet,173.19);
});

test('aktuelle Prognose wird nicht bei jedem App-Start erneut gespeichert',async()=>{
  let persisted=false;
  const current={forecastModel:4,payoutMonth:'2026-10',standardPayoutMonth:'2026-09',reportMonth:'2026-07',payout:2831.13};
  const result=await refreshStoredSalaryForecasts({
    forecasts:[current],
    calculator:async()=>{throw new Error('darf nicht neu rechnen');},
    persist:()=>{persisted=true;return true;}
  });
  assert.equal(result.changed,false);
  assert.equal(persisted,false);
  assert.equal(result.forecasts[0],current);
});


test('Gehaltsprognose kann stabile Lernhistorie auf zukünftige Auszahlung anwenden',()=>{
  const learning=['2026-07','2026-08'].map((month,index)=>({
    payoutMonth:month,
    hasPriorAdjustment:false,
    rows:[{key:'night',comparable:true,confirmed:true}],
    totals:[
      {key:'totalGross',comparable:true,confirmed:true,difference:0},
      {key:'payout',comparable:true,confirmed:false,difference:index===0?-4:-6}
    ]
  }));
  const result=salaryDisplayPayout({
    payout:2808.94,
    needsReview:false,
    components:{unpriced:[],springInVblUnverified:false}
  },learning);
  assert.equal(result.applied,true);
  assert.equal(result.payout,2803.94);
});

test('Zeitnachweis-Import verarbeitet mehrere Dateien getrennt und markiert unbekannte Lohnarten',async()=>{
  const stored=[];
  const results=await processTimeReportFiles([
    {name:'gut.pdf',text:'gut'},
    {name:'leer.pdf',empty:true},
    {name:'unbekannt.pdf',text:'unbekannt'},
    {name:'defekt.pdf',broken:true}
  ],{
    read:async file=>{
      if(file.broken)throw new Error('FileReader konnte Datei nicht lesen');
      return file.empty?{text:'',needsOcr:true}:{text:file.text,needsOcr:false};
    },
    parse:text=>text==='unbekannt'
      ?{month:{year:2026,month:4},payoutMonth:'2026-06',items:[{code:'5010',hours:1,status:'ok'}],unknownCodes:[{code:'5999',status:'review'}],needsReview:true}
      :{month:{year:2026,month:4},payoutMonth:'2026-06',items:[{code:'5010',hours:1,status:'ok'}],unknownCodes:[],needsReview:false},
    calculate:async report=>({payout:1,taxFreePay:4.58,needsReview:Boolean(report.needsReview),components:{shift:'none',pay:{shift:0},unpriced:[]}}),
    effects:async()=>null,
    store:async report=>{stored.push(report);}
  });
  assert.equal(results.length,4);
  assert.equal(results[0].error,null);
  assert.equal(results[0].report.payoutMonth,'2026-06');
  assert.equal(results[1].stage,'textExtract');
  assert.equal(results[2].error,null);
  assert.equal(results[2].warnings[0].stage,'review');
  assert.equal(results[3].stage,'fileRead');
  assert.equal(stored.length,2);
});

test('Zeitnachweis ohne Monat oder ohne verwertbare Lohnart wird nicht als Nullprognose gespeichert',async()=>{
  const stored=[];
  const results=await processTimeReportFiles([{name:'monat.pdf',text:'monat'},{name:'unbekannt.pdf',text:'unbekannt'}],{
    read:async file=>({text:file.text}),
    parse:text=>text==='monat'
      ?{month:null,items:[{code:'5010',hours:1}],unknownCodes:[]}
      :{month:{year:2026,month:4},items:[],unknownCodes:[{code:'5999'}]},
    calculate:async()=>({components:{pay:{shift:0},unpriced:[]}}),
    store:async report=>stored.push(report)
  });
  assert.equal(results[0].stage,'month');
  assert.equal(results[1].stage,'wageType');
  assert.equal(stored.length,0);
});
