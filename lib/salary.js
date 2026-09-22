import { SALARY_2026 } from '../config/salary-2026.js';

const BMF_MODULE='https://cdn.jsdelivr.net/npm/lohnsteuerrechner@1.0.7/+esm';
let bmfPromise;
const money=v=>Math.round((Number(v)||0)*100)/100;

export function buildBmfInputs(taxableGross,config=SALARY_2026){
  const p=config.profile;
  return {LZZ:2,RE4:Math.round(taxableGross*100),STKL:p.taxClass,ZKF:p.childAllowance,KVZ:p.kvAdditionalRate,PVZ:p.childless?1:0,PVA:p.careChildDeductions,PVS:p.saxony?1:0,PKV:0,KRV:0,ALV:0};
}

export async function calculateWageTax(taxableGross,config=SALARY_2026){
  bmfPromise??=import(BMF_MODULE);
  const {calculate}=await bmfPromise;
  const out=calculate(2026,buildBmfInputs(taxableGross,config));
  const churchBase=(out.BK||0)/100;
  return {wageTax:(out.LSTLZZ||0)/100,solidarity:(out.SOLZLZZ||0)/100,churchTax:money(churchBase*config.profile.churchTaxRate),churchBase};
}

export function socialContributions(svGross,config=SALARY_2026){
  const s=config.social,bKv=Math.min(svGross,s.healthCareCap),bRv=Math.min(svGross,s.pensionUnemploymentCap);
  return {health:money(bKv*s.healthEmployee),care:money(bKv*s.careEmployee),pension:money(bRv*s.pensionEmployee),unemployment:money(bRv*s.unemploymentEmployee)};
}

export function reportComponents(report,config=SALARY_2026){
  const hours={night:0,saturday:0,sunday:0};let shiftPay=0,review=false,shift='none';
  for(const i of report?.items||[]){
    if(i.hours==null){review=true;continue;}
    if(i.code==='5010'||i.code==='5011')hours.night+=i.hours;
    else if(i.code==='5014')hours.saturday+=i.hours;
    else if(i.code==='5024')hours.sunday+=i.hours;
    else if(i.code==='5211'){shiftPay+=config.shift.wechsel;shift='wechsel';}
    else if(i.code==='5212'){shiftPay+=config.shift.schicht;shift='schicht';}
    else if(i.code==='5161')review=true;
  }
  const night=money(hours.night*config.surcharges.night),saturday=money(hours.saturday*config.surcharges.saturday),sunday=money(hours.sunday*config.surcharges.sunday);
  const taxFreePay=money(night+sunday),taxableSurcharges=money(saturday),taxableExtra=money(shiftPay+saturday);
  return {hours,pay:{night,saturday,sunday,shift:money(shiftPay)},taxFreePay,taxableSurcharges,taxableExtra,garnishmentProtectedPay:taxFreePay,protectedPay:taxFreePay,shift,needsReview:review||!!report?.needsReview};
}

export function garnishment2026(net,dependents=2){
  if(dependents!==2)return null;
  const n=Math.max(0,Number(net)||0);
  if(n<2520)return 0;
  if(n>4866.30)return money(936.94+n-4866.30);
  const bucket=Math.floor(n/10)*10;
  return money(.94+Math.max(0,(bucket-2520)/10)*4);
}

export async function calculateSalaryForecast(report,config=SALARY_2026){
  const c=reportComponents(report,config);
  const taxableGross=money(config.fixed.gross+c.taxableExtra),svAddon=money(taxableGross*config.social.zvSvAddonRate),svGross=money(taxableGross+svAddon);
  const tax=await calculateWageTax(taxableGross,config),sv=socialContributions(svGross,config),totalGross=money(taxableGross+c.taxFreePay);
  const legalNet=money(totalGross-tax.wageTax-tax.solidarity-tax.churchTax-sv.health-sv.care-sv.pension-sv.unemployment),vbl=money(taxableGross*config.social.vblEmployeeRate);
  const garnishableNet=money(Math.max(0,legalNet-c.garnishmentProtectedPay)),garnishment=garnishment2026(garnishableNet,config.payroll.dependents)??0,payout=money(legalNet-vbl-garnishment);
  return {totalGross,taxableGross,svGross,svAddon,...tax,sv,vbl,taxFreePay:c.taxFreePay,protectedPay:c.garnishmentProtectedPay,garnishableNet,garnishment,payout,components:c,needsReview:c.needsReview};
}
