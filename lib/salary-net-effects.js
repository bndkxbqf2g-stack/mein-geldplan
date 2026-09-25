import {calculateSalaryForecast} from './salary.js';
import {SALARY_2026} from '../config/salary-2026.js';

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

export async function calculateNetEffects(report,baseline,full,calculator=calculateSalaryForecast){
  if(!report||!baseline||!full)return null;
  const isTime=item=>TIME_CODES.has(item.code)||item.type==='holiday';
  const isShift=item=>item.code==='5211'||item.code==='5212';

  const time=await calculator(filteredReport(report,isTime));
  const shiftOnly=await calculator(filteredReport(report,isShift));
  const timeShift=await calculator(filteredReport(report,item=>isTime(item)||isShift(item)));

  return {
    complete:!(full.components.springIn.total>0)&&!(full.components.unpriced?.length),
    totalNet:money(full.payout-baseline.payout),
    taxFreeNet:money(full.taxFreePay),
    timeGross:money(full.components.pay.night+full.components.pay.saturday+full.components.pay.sunday+full.components.pay.holiday),
    timeNet:money(time.payout-baseline.payout),
    shiftGross:money(full.components.pay.shift),
    shiftType:full.components.shift||'none',
    shiftStandaloneNet:money(shiftOnly.payout-baseline.payout),
    shiftAfterTimeNet:money(timeShift.payout-time.payout)
  };
}


function legacyTaxableItems(taxableGross,config=SALARY_2026){
  const taxable=money(Math.max(0,Number(taxableGross)||0));
  const saturdayRate=Number(config.surcharges.saturday)||0;
  const maxPlausibleSaturdayHours=40;
  const candidates=[
    {code:'5211',amount:Number(config.shift.wechsel)||0,type:'wechsel'},
    {code:'5212',amount:Number(config.shift.schicht)||0,type:'schicht'}
  ].filter(entry=>entry.amount>0&&taxable+0.02>=entry.amount)
   .map(entry=>({...entry,residual:money(taxable-entry.amount)}))
   .filter(entry=>saturdayRate>0&&entry.residual/saturdayRate<=maxPlausibleSaturdayHours)
   .sort((a,b)=>a.residual-b.residual);
  const chosen=candidates[0]||null;
  const items=[];
  let saturdayGross=taxable;
  let shiftType='none';
  if(chosen){
    items.push({code:chosen.code,hours:null});
    saturdayGross=chosen.residual;
    shiftType=chosen.type;
  }
  if(saturdayGross>0.005&&saturdayRate>0)items.push({code:'5014',hours:saturdayGross/saturdayRate});
  return {items,shiftType,saturdayGross:money(saturdayGross),shiftGross:chosen?money(chosen.amount):0};
}

export function storedLegacySummaryReport(forecast,config=SALARY_2026){
  if(forecast?.components||forecast?.needsReview||Number(forecast?.springIn)>0)return null;
  const totalGross=Number(forecast?.totalGross);
  const legalNet=Number(forecast?.legalNet);
  const garnishableNet=Number(forecast?.garnishableNet);
  if(![totalGross,legalNet,garnishableNet].every(Number.isFinite))return null;
  const grossGap=money(totalGross-config.fixed.gross);
  const taxFreeGross=money(legalNet-garnishableNet);
  const taxableGross=money(grossGap-taxFreeGross);
  if(grossGap<=0.005||taxFreeGross<-0.02||taxableGross<-0.02)return null;
  const items=[];
  if(taxFreeGross>0.005)items.push({code:'legacy-taxfree',type:'holiday',hours:0,amount:taxFreeGross});
  const taxable=legacyTaxableItems(taxableGross,config);
  items.push(...taxable.items);
  return {
    items,
    unknownCodes:[],
    needsReview:false,
    legacySummary:true,
    inferredShiftType:taxable.shiftType,
    inferredShiftGross:taxable.shiftGross,
    inferredSaturdayGross:taxable.saturdayGross
  };
}

export function storedForecastReport(forecast,config=SALARY_2026){
  const c=forecast?.components;
  if(!c||Number(c.springIn)>0||(Array.isArray(c.unpriced)&&c.unpriced.length))return null;
  const items=[];
  const addHours=(code,amount,rate)=>{
    const value=Math.max(0,Number(amount)||0);
    if(value>0&&rate>0)items.push({code,hours:value/rate});
  };
  addHours('5010',c.night,config.surcharges.night);
  addHours('5014',c.saturday,config.surcharges.saturday);
  addHours('5024',c.sunday,config.surcharges.sunday);
  if(Number(c.holiday)>0)items.push({code:'holiday-stored',type:'holiday',hours:0,amount:Number(c.holiday)});
  if(Number(c.shift)>0){
    if(c.shiftType==='wechsel')items.push({code:'5211',hours:null});
    else if(c.shiftType==='schicht')items.push({code:'5212',hours:null});
    else return null;
  }
  return {items,unknownCodes:[],needsReview:false};
}

function reportFromForecast(forecast,config=SALARY_2026){
  const items=Array.isArray(forecast?.reportItems)?forecast.reportItems.filter(item=>item?.code):[];
  if(items.length)return {items:items.map(item=>({...item})),unknownCodes:[],needsReview:false};
  return storedForecastReport(forecast,config)||storedLegacySummaryReport(forecast,config);
}

function closeEnough(a,b,tolerance=1){
  return Number.isFinite(Number(a))&&Number.isFinite(Number(b))&&Math.abs(Number(a)-Number(b))<=tolerance;
}

export async function calculateActualBasedForecastNetEffects(forecast,actual,config=SALARY_2026,calculator=calculateSalaryForecast){
  if(!forecast||!actual||actual.hasPriorAdjustment)return null;
  if(actual?.components?.hasVariableDetail)return null;
  const report=reportFromForecast(forecast,config);
  if(!report)return null;

  const baseline=await calculator({items:[],unknownCodes:[],needsReview:false},config);
  // Für die Rückrechnung dient die echte Bezügemitteilung als Auszahlungssockel.
  // Das Modell muss deshalb nicht dieselben absoluten Netto-/VBL-/Pfändungswerte treffen.
  // Entscheidend ist nur: reine Festbezüge, keine Nachverrechnung, keine bereits
  // ausgewiesenen variablen Bezüge und dass das Ist-Brutto dem Festbrutto entspricht.
  if(!closeEnough(actual.totalGross,config.fixed.gross))return null;
  if(!Number.isFinite(Number(actual.payout)))return null;

  const full=await calculator(report,config);
  const effects=await calculateNetEffects(report,baseline,full,(entry)=>calculator(entry,config));
  return effects?{
    ...effects,
    basis:'actual-payslip',
    actualPayout:money(actual.payout),
    modelBaselinePayout:money(baseline.payout),
    correctedPayout:money(Number(actual.payout)+Number(effects.totalNet||0))
  }:null;
}

export async function calculateStoredForecastNetEffects(forecast,config=SALARY_2026){
  if(forecast?.netEffects&&forecast?.components)return forecast.netEffects;
  if(forecast?.netEffects&&forecast?.netEffectsSource==='legacy-summary-current-rules')return forecast.netEffects;
  const report=storedForecastReport(forecast,config)||storedLegacySummaryReport(forecast,config);
  if(!report)return null;
  const baseline=await calculateSalaryForecast({items:[],unknownCodes:[],needsReview:false},config);
  const full=await calculateSalaryForecast(report,config);
  return calculateNetEffects(report,baseline,full);
}
