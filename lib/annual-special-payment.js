import {SALARY_2026,fixedGross} from '../config/salary-2026.js';
import {calculateSupplementaryWageTax,calculateWageTax,socialContributions,vblEmployeeContribution,vblSvAddon,garnishment2026} from './salary.js';

const money=value=>Math.round((Number(value)||0)*100)/100;
const knownNumber=value=>value!==null&&value!==undefined&&Number.isFinite(Number(value));
const monthKey=(year,month)=>`${year}-${String(month).padStart(2,'0')}`;

function sourceValue(source,key,fallback=null){
  return knownNumber(source?.[key])?Number(source[key]):fallback;
}

function forecastEntitlement(forecast,config){
  if(knownNumber(forecast?.totalGross))return money(forecast.totalGross);
  const fixed=sourceValue(forecast?.baselineGross,fixedGross(config));
  const effects=forecast?.components;
  if(!effects)return fixed;
  const variable=['night','saturday','saturdayEvening','sunday','holiday','shift','springIn'];
  if(variable.some(key=>!knownNumber(effects[key])))return fixed;
  return money(fixed+variable.reduce((sum,key)=>sum+Number(effects[key]),0));
}

function forecastTaxableEntitlement(forecast,entitlement,config){
  if(knownNumber(forecast?.taxableGross))return money(forecast.taxableGross);
  if(knownNumber(forecast?.baselineGross)&&knownNumber(forecast?.netEffects?.taxableGross))return money(forecast.baselineGross+forecast.netEffects.taxableGross);
  return money(entitlement);
}

export function annualSpecialPaymentReferenceMonths(year=2026,config=SALARY_2026){
  return config.annualSpecialPayment.referenceMonths.map(month=>monthKey(year,month));
}

export function annualSpecialPaymentForecast({year=2026,payslips=[],forecasts=[],config=SALARY_2026}={}){
  const references=annualSpecialPaymentReferenceMonths(year,config);
  const safePayslips=Array.isArray(payslips)?payslips:[];
  const safeForecasts=Array.isArray(forecasts)?forecasts:[];
  const observations=references.map(month=>{
    const actual=safePayslips.find(entry=>entry?.month===month&&knownNumber(entry?.totalGross));
    const forecast=safeForecasts.find(entry=>entry?.reportMonth===month);
    if(actual){
      const gross=money(Math.max(0,Number(actual.totalGross)-(Number(actual.specialPaymentGross)||0)));
      return {month,source:'actual',gross,taxableGross:knownNumber(actual.taxableGross)?money(actual.taxableGross):gross,svGross:sourceValue(actual,'svGross'),vblGross:sourceValue(actual,'vblGross')};
    }
    if(forecast){
      const gross=forecastEntitlement(forecast,config);
      return {month,source:'forecast',gross,taxableGross:forecastTaxableEntitlement(forecast,gross,config),svGross:sourceValue(forecast,'svGross'),vblGross:sourceValue(forecast,'vblGross')};
    }
    const gross=fixedGross(config);
    return {month,source:'estimate',gross,taxableGross:gross,svGross:null,vblGross:null};
  });
  const averageEntitlementGross=money(observations.reduce((sum,item)=>sum+item.gross,0)/Math.max(1,observations.length));
  const averageTaxableGross=money(observations.reduce((sum,item)=>sum+item.taxableGross,0)/Math.max(1,observations.length));
  const svValues=observations.map(item=>item.svGross).filter(knownNumber);
  const vblValues=observations.map(item=>item.vblGross).filter(knownNumber);
  const sourceSet=new Set(observations.map(item=>item.source));
  const status=sourceSet.has('estimate')?'estimate':sourceSet.size>1?'mixed':sourceSet.has('actual')?'actual':'forecast';
  return {
    year,
    paymentMonth:monthKey(year,config.annualSpecialPayment.paymentMonth),
    rate:config.annualSpecialPayment.rate,
    referenceMonths:observations,
    averageEntitlementGross,
    averageTaxableGross,
    averageSvGross:svValues.length===observations.length?money(svValues.reduce((sum,value)=>sum+value,0)/svValues.length):null,
    averageVblGross:vblValues.length===observations.length?money(vblValues.reduce((sum,value)=>sum+value,0)/vblValues.length):null,
    gross:money(averageEntitlementGross*config.annualSpecialPayment.rate),
    source:status,
    needsReview:status==='estimate'||status==='mixed',
    vblEligible:config.annualSpecialPayment.vblEligible
  };
}

export async function calculateAnnualSpecialPaymentNet({forecast,config=SALARY_2026}={}){
  if(!forecast||!knownNumber(forecast.gross))return null;
  const gross=money(forecast.gross);
  const regularGross=money(forecast.averageEntitlementGross??fixedGross(config));
  const regularTaxableGross=money(forecast.averageTaxableGross??regularGross);
  const regularTax=await calculateWageTax(regularTaxableGross,config);
  const regularSvGross=money(forecast.averageSvGross??(regularTaxableGross+vblSvAddon(regularGross,config)));
  const regularSv=socialContributions(regularSvGross,config);
  const regularVblGross=money(forecast.averageVblGross??fixedGross(config));
  const regularVbl=vblEmployeeContribution(regularVblGross,config);
  const regularLegalNet=money(regularGross-regularTax.wageTax-regularTax.solidarity-regularTax.churchTax-regularSv.health-regularSv.care-regularSv.pension-regularSv.unemployment);
  const regularGarnishable=money(Math.max(0,regularLegalNet-regularVbl));
  const regularGarnishment=garnishment2026(regularGarnishable,config.payroll.dependents)??0;
  const tax=await calculateSupplementaryWageTax(gross,regularTaxableGross*12,config);
  const specialVblGross=forecast.vblEligible?gross:0;
  const beforeSv=socialContributions(regularSvGross,config);
  const afterSv=socialContributions(money(regularSvGross+gross+vblSvAddon(specialVblGross,config)),config);
  const socialDelta={
    health:money(afterSv.health-beforeSv.health),
    care:money(afterSv.care-beforeSv.care),
    pension:money(afterSv.pension-beforeSv.pension),
    unemployment:money(afterSv.unemployment-beforeSv.unemployment)
  };
  const vbl=vblEmployeeContribution(specialVblGross,config);
  const netBeforeGarnishment=money(gross-tax.wageTax-tax.solidarity-tax.churchTax-socialDelta.health-socialDelta.care-socialDelta.pension-socialDelta.unemployment-vbl);
  const afterGarnishable=money(Math.max(0,regularLegalNet+netBeforeGarnishment-regularVbl));
  const garnishment=garnishment2026(afterGarnishable,config.payroll.dependents)??0;
  const garnishmentDelta=money(Math.max(0,garnishment-regularGarnishment));
  return {
    gross,
    ...tax,
    socialDelta,
    vbl,
    regularGarnishment,
    garnishmentDelta,
    payout:money(netBeforeGarnishment-garnishmentDelta),
    needsReview:Boolean(forecast.needsReview||!forecast.vblEligible)
  };
}
