import {calculateSalaryForecast} from './salary.js';

const money=value=>Math.round((Number(value)||0)*100)/100;
const TIME_CODES=new Set(['5010','5011','5014','5024']);

function filteredReport(report,predicate){
  return {
    ...report,
    items:(report?.items||[]).filter(predicate),
    springIn:null,
    unknownCodes:[],
    needsReview:false
  };
}

export async function calculateNetEffects(report,baseline,full){
  if(!report||!baseline||!full)return null;
  const isTime=item=>TIME_CODES.has(item.code)||item.type==='holiday';
  const isShift=item=>item.code==='5211'||item.code==='5212';

  const time=await calculateSalaryForecast(filteredReport(report,isTime));
  const shiftOnly=await calculateSalaryForecast(filteredReport(report,isShift));
  const timeShift=await calculateSalaryForecast(filteredReport(report,item=>isTime(item)||isShift(item)));

  return {
    complete:!(full.components.springIn.total>0)&&!(full.components.unpriced?.length),
    totalNet:money(full.payout-baseline.payout),
    taxFreeNet:money(full.taxFreePay),
    timeGross:money(full.components.pay.night+full.components.pay.saturday+full.components.pay.sunday+full.components.pay.holiday),
    timeNet:money(time.payout-baseline.payout),
    shiftGross:money(full.components.pay.shift),
    shiftStandaloneNet:money(shiftOnly.payout-baseline.payout),
    shiftAfterTimeNet:money(timeShift.payout-time.payout)
  };
}
