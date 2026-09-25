import test from 'node:test';
import assert from 'node:assert/strict';
import {parseTimeReportText} from '../lib/pdf.js';
import {salaryForecastBreakdown} from '../lib/salary.js';

const report=(header,rows)=>parseTimeReportText([
  `Z E I T N A C H W E I S 80030991 Martin Eitner ${header}`,
  ...rows
].join('\n'));

function count(report,code){
  return report.items.filter(item=>item.code===code).length;
}

function hours(report,code){
  return Math.round(report.items
    .filter(item=>item.code===code)
    .reduce((sum,item)=>sum+(Number(item.hours)||0),0)*100)/100;
}

test('echter März-2026-Zeitnachweis wird März zugeordnet und nach Mai ausgezahlt',()=>{
  const r=report('Mrz 26',[
    '09.03.2026 21:00 21:27 3A10 5010: Nachtarbeit 0,45',
    '10.03.2026 21:00 21:27 3A10 5010: Nachtarbeit 0,45',
    '11.03.2026 21:00 21:27 3A10 5010: Nachtarbeit 0,45',
    '23.03.2026 21:00 21:27 3A10 5010: Nachtarbeit 0,45',
    '24.03.2026 21:00 21:27 3A10 5010: Nachtarbeit 0,45',
    '25.03.2026 21:00 21:27 3A10 5010: Nachtarbeit 0,45',
    '30.03.2026 3B61 5161: Durchschnitt §21 TV 1,00',
    '31.03.2026 3B61 5161: Durchschnitt §21 TV 1,00',
    '31.03.2026 3C12 5212: SchiZ§43 1,00'
  ]);
  assert.deepEqual(r.month,{year:2026,month:3});
  assert.equal(r.payoutMonth,'2026-05');
  assert.equal(count(r,'5010'),6);
  assert.equal(hours(r,'5010'),2.70);
  assert.equal(count(r,'5161'),2);
  assert.equal(count(r,'5212'),1);
  assert.equal(r.schicht,true);
  assert.equal(r.wechsel,false);
});

test('echter April-2026-Zeitnachweis wird April zugeordnet und nach Juni ausgezahlt',()=>{
  const r=report('Apr 26',[
    '13.04.2026 21:00 21:27 3A10 5010: Nachtarbeit 0,45',
    '14.04.2026 21:00 21:27 3A10 5010: Nachtarbeit 0,45',
    '15.04.2026 21:00 21:27 3A10 5010: Nachtarbeit 0,45',
    '01.04.2026 3B62 5162:Durchsch.§21TVL-Folg 1,00',
    '02.04.2026 3B62 5162:Durchsch.§21TVL-Folg 1,00',
    '30.04.2026 3C12 5212: SchiZ§43 1,00'
  ]);
  assert.deepEqual(r.month,{year:2026,month:4});
  assert.equal(r.payoutMonth,'2026-06');
  assert.equal(count(r,'5010'),3);
  assert.equal(hours(r,'5010'),1.35);
  assert.equal(count(r,'5162'),2);
  assert.equal(count(r,'5212'),1);
  assert.equal(r.schicht,true);
  assert.equal(r.wechsel,false);
});

test('echter Mai-2026-Zeitnachweis wird Mai zugeordnet und nach Juli ausgezahlt',()=>{
  const r=report('Mai 26',[
    '11.05.2026 21:00 21:27 3A10 5010: Nachtarbeit 0,45',
    '12.05.2026 21:00 21:27 3A10 5010: Nachtarbeit 0,45',
    '13.05.2026 21:00 21:27 3A10 5010: Nachtarbeit 0,45',
    '26.05.2026 3B61 5161: Durchschnitt §21 TV 1,00',
    '27.05.2026 3B61 5161: Durchschnitt §21 TV 1,00',
    '28.05.2026 3B61 5161: Durchschnitt §21 TV 1,00',
    '29.05.2026 3B61 5161: Durchschnitt §21 TV 1,00',
    '31.05.2026 3C12 5212: SchiZ§43 1,00'
  ]);
  assert.deepEqual(r.month,{year:2026,month:5});
  assert.equal(r.payoutMonth,'2026-07');
  assert.equal(count(r,'5010'),3);
  assert.equal(hours(r,'5010'),1.35);
  assert.equal(count(r,'5161'),4);
  assert.equal(count(r,'5212'),1);
  assert.equal(r.schicht,true);
  assert.equal(r.wechsel,false);
});

test('März, April und Mai ergeben aus den echten Zeitlohnarten jeweils 100 Euro Schichtzulage',()=>{
  const cases=[
    {header:'Mrz 26',month:3,night:[.45,.45,.45,.45,.45,.45],avg:['5161','5161'],taxFree:12.37,payout:'2026-05'},
    {header:'Apr 26',month:4,night:[.45,.45,.45],avg:['5162','5162'],taxFree:6.18,payout:'2026-06'},
    {header:'Mai 26',month:5,night:[.45,.45,.45],avg:['5161','5161','5161','5161'],taxFree:6.18,payout:'2026-07'}
  ];
  for(const c of cases){
    const mm=String(c.month).padStart(2,'0');
    const rows=[...c.night.map((h,i)=>`${String(i+1).padStart(2,'0')}.${mm}.2026 21:00 21:27 3A10 5010: Nachtarbeit ${String(h).replace('.',',')}`),...c.avg.map((code,i)=>`${String(i+20).padStart(2,'0')}.${mm}.2026 3B61 ${code}: Durchschnitt §21 TV 1,00`),`28.${mm}.2026 3C12 5212: SchiZ§43 1,00`];
    const r=report(c.header,rows),b=salaryForecastBreakdown(r);
    assert.equal(r.payoutMonth,c.payout);assert.equal(b.shiftAllowance.amount,100);assert.equal(b.taxableGross,4580.43);assert.equal(b.taxFreeSurcharges,c.taxFree);assert.equal(b.needsReview,true);
  }
});
