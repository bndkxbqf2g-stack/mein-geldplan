import { getSalaryForecasts, saveSalaryForecasts, getPayrollLearning, getPayrollPaymentOverrides } from './storage.js';
import { SALARY_2026 } from '../config/salary-2026.js';
import { calculateSalaryForecast, salaryForecastBreakdown } from './salary.js?v=0.99.60';
import { calculateNetEffects } from './salary-net-effects.js?v=0.99.60';
import { initSalaryPayslipUi, refreshPayrollChecks } from './salary-payslip-ui.js?v=0.99.60';
import { renderPayrollControl } from './payroll-control-ui-v2.js';
import { readPdfText, parseTimeReportText } from './pdf.js';
import { importStageError, normalizeImportError } from './import-status.js';
import { notify } from './ui.js';
import { learnedPayoutForForecast } from './payroll-learning-calibration.js';
import { applyPaymentMonthOverride } from './payroll-payment-overrides.js';

const $=id=>document.getElementById(id);
const money=value=>Math.round((Number(value)||0)*100)/100;
const eur=v=>new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR'}).format(Number.isFinite(Number(v))?Number(v):0);
const FORECAST_MODEL=4;
let activeReport=null;
let activeForecast=null;
let forecastChanged=()=>{};

export function salaryMonthLabel(value){if(!value)return '–';const p=String(value).split('-');return p.length===2?`${p[1]}/${p[0]}`:value;}
export function salaryMonthName(value){
  const [year,month]=String(value||'').split('-').map(Number);
  if(!Number.isInteger(year)||!Number.isInteger(month))return '–';
  return new Intl.DateTimeFormat('de-DE',{month:'long',year:'numeric'}).format(new Date(year,month-1,1));
}
export function comparisonLabel(status){return status==='ok'?'Prognose trifft Abrechnung':status==='adjusted'?'Kernwerte stimmen · Nachverrechnung vorhanden':status==='different'?'Abweichung erkannt':'Bitte prüfen';}
export function wageCodeLabel(code,type=null){if(type==='holidayWithoutTimeOff')return 'Feiertagsarbeit ohne Freizeitausgleich';if(type==='holidayWithTimeOff')return 'Feiertagsarbeit mit Freizeitausgleich';return ({'5010':'Nachtarbeit','5011':'Nachtarbeit (Beginn vor 0:00)','5014':'Samstagsarbeit','5024':'Sonntagsarbeit','5026':'Sonntag und Nacht','5030':'Feiertagszuschlag','5034':'Samstag 20–21 Uhr','5161':'Durchschnitt §21 TV-L','5162':'Durchschnitt §21 TV-L Folge','5211':'Wechselschichtzulage','5212':'Schichtzulage'})[code]||'Unbekannt';}
export function wageQuantityLabel(item){if(item?.hours==null)return 'Bitte prüfen';if(item.code==='5211'||item.code==='5212')return 'monatlich';if(item.code==='5161'||item.code==='5162')return `${Number(item.hours).toFixed(2)} Tg.`;return `${Number(item.hours).toFixed(2)} h`;}
export function salaryDisplayPayout(forecast,learning=[]){
  return learnedPayoutForForecast(forecast,learning);
}

export function summarizeForecastNet(forecast={},displayedPayout=null,learning=[]){
  const learned=salaryDisplayPayout(forecast,learning);
  const totalCandidate=Number.isFinite(Number(displayedPayout))?Number(displayedPayout):Number(learned?.payout);
  const baseCandidate=Number(forecast?.baselinePayout);
  const effectCandidate=Number(forecast?.netEffects?.totalNet);
  const totalNet=Number.isFinite(totalCandidate)?money(totalCandidate):Number.isFinite(baseCandidate)&&Number.isFinite(effectCandidate)?money(baseCandidate+effectCandidate):null;
  const surchargeNet=Number.isFinite(effectCandidate)?money(effectCandidate):Number.isFinite(baseCandidate)&&Number.isFinite(totalNet)?money(totalNet-baseCandidate):null;
  const c=forecast?.components||{};
  const taxFreeGross=money(Number(c.night||0)+Number(c.sunday||0)+Number(c.holiday||0));
  const taxableGross=money(Number(c.saturday||0)+Number(c.saturdayEvening||0)+Number(c.shift||0));
  const taxFreeNet=Number.isFinite(Number(forecast?.netEffects?.taxFreeNet))?money(forecast.netEffects.taxFreeNet):taxFreeGross;
  const taxableNet=surchargeNet==null?null:money(surchargeNet-taxFreeNet);
  return {totalNet,baseNet:Number.isFinite(baseCandidate)?money(baseCandidate):null,surchargeNet,taxFreeGross,taxableGross,taxFreeNet,taxableNet};
}

export function restoreReportFromForecast(forecast){
  if(!forecast?.payoutMonth||!Array.isArray(forecast.reportItems)||!forecast.reportItems.length)return null;
  const [year,month]=String(forecast.reportMonth||'').split('-').map(Number);
  if(!Number.isInteger(year)||!Number.isInteger(month))return null;
  return {
    month:{year,month},
    payoutMonth:String(forecast.payoutMonth),
    standardPayoutMonth:String(forecast.standardPayoutMonth||forecast.payoutMonth),
    paymentMonthOverride:forecast.paymentMonthOverride?{...forecast.paymentMonthOverride}:null,
    items:forecast.reportItems.map(item=>({...item})),
    unknownCodes:Array.isArray(forecast.unknownCodes)?forecast.unknownCodes.map(item=>({...item})):[],
    needsReview:Boolean(forecast.needsReview),
    conflict:forecast.conflict||null,
    springIn:forecast.springIn||{duties:0,hours:0}
  };
}

function reportMonthKey(report){return report?.month?`${report.month.year}-${String(report.month.month).padStart(2,'0')}`:null;}
function shiftLabel(type){return type==='wechsel'?'Wechselschichtzulage':type==='schicht'?'Schichtzulage':type==='conflict'?'Schichtzulage: Konflikt':'Keine Schicht-/Wechselschichtzulage';}
function set(id,value){if($(id))$(id).textContent=value;}

export function serializeSalaryForecast(report,f,baseline=null,netEffects=null){
  const safeReport=report||{};
  const safeForecast=f||{};
  const c=safeForecast.components||{};
  const hours=c.hours||{};
  const pay=c.pay||{};
  return {
    forecastModel:FORECAST_MODEL,
    payoutMonth:safeReport.payoutMonth||null,
    standardPayoutMonth:safeReport.standardPayoutMonth||safeReport.payoutMonth||null,
    paymentMonthOverride:safeReport.paymentMonthOverride?{...safeReport.paymentMonthOverride}:null,
    reportMonth:reportMonthKey(safeReport),
    totalGross:safeForecast.totalGross??null,
    taxableGross:safeForecast.taxableGross??null,
    wageTax:safeForecast.wageTax??null,
    solidarity:safeForecast.solidarity??null,
    churchTax:safeForecast.churchTax??null,
    health:safeForecast.sv?.health??null,
    care:safeForecast.sv?.care??null,
    pension:safeForecast.sv?.pension??null,
    unemployment:safeForecast.sv?.unemployment??null,
    legalNet:safeForecast.legalNet??null,
    vbl:safeForecast.vbl??null,
    protectedPay:safeForecast.protectedPay??null,
    garnishableNet:safeForecast.garnishableNet??null,
    garnishment:safeForecast.garnishment??null,
    payout:safeForecast.payout??null,
    baselineGross:baseline?.totalGross??null,
    baselineLegalNet:baseline?.legalNet??null,
    baselinePayout:baseline?.payout??null,
    netEffects,
    reportItems:(safeReport.items||[]).map(item=>({code:item.code,type:item.type||null,hours:item.hours??null,amount:item.amount??null,status:item.status||null,line:item.line||null})),
    unknownCodes:(safeReport.unknownCodes||[]).map(item=>({code:item.code,line:item.line||null,status:item.status||'review'})),
    conflict:safeReport.conflict||null,
    needsReview:Boolean(safeForecast.needsReview),
    springIn:c.springIn||{duties:0,hours:0,total:0},
    components:{
      fixed:{basePay:SALARY_2026.fixed.basePay,careAllowance:SALARY_2026.fixed.careAllowance,universityAllowance:SALARY_2026.fixed.universityAllowance},
      hours:{...hours},
      night:pay.night??0,
      saturday:pay.saturday??0,
      saturdayEvening:pay.saturdayEvening??0,
      sunday:pay.sunday??0,
      sundayNight:pay.sundayNight??0,
      holiday:pay.holiday??0,
      shift:pay.shift??0,
      shiftType:c.shift,
      average21Days:c.average21Days??0,
      unpriced:Array.isArray(c.unpriced)?c.unpriced:[],
      springInVblUnverified:Boolean(c.springInVblUnverified)
    }
  };
}

function storeForecast(report,f,baseline=null,netEffects=null){
  if(!report?.payoutMonth)return;
  const originMonth=reportMonthKey(report);
  const list=getSalaryForecasts().filter(item=>reportMonthKey(item)!==originMonth);
  list.push(serializeSalaryForecast(report,f,baseline,netEffects));
  list.sort((a,b)=>String(a.payoutMonth).localeCompare(String(b.payoutMonth)));
  if(!saveSalaryForecasts(list.slice(-18)))throw new Error('Gehaltsprognose konnte nicht dauerhaft gespeichert werden.');
}

export async function refreshStoredSalaryForecasts({
  forecasts=getSalaryForecasts(),
  calculator=calculateSalaryForecast,
  effectsCalculator=calculateNetEffects,
  persist=saveSalaryForecasts
}={}){
  const input=Array.isArray(forecasts)?forecasts:[];
  const overrides=getPayrollPaymentOverrides();
  const next=[];
  let changed=false;
  for(const stored of input){
    if(Number(stored?.forecastModel)>=FORECAST_MODEL){next.push(stored);continue;}
    const restored=restoreReportFromForecast(stored);
    const report=restored?applyPaymentMonthOverride(restored,overrides):null;
    if(!report){next.push(stored);continue;}
    try{
      const baseline=await calculator({items:[],unknownCodes:[],needsReview:false});
      const recalculated=await calculator(report);
      const netEffects=await effectsCalculator(report,baseline,recalculated);
      next.push(serializeSalaryForecast(report,recalculated,baseline,netEffects));
      changed=true;
    }catch(error){
      console.error('[salary-refresh-stored]',stored?.payoutMonth,error);
      next.push(stored);
    }
  }
  next.sort((a,b)=>String(a?.payoutMonth||'').localeCompare(String(b?.payoutMonth||'')));
  if(changed&&!persist(next.slice(-18)))throw new Error('Gespeicherte Gehaltsprognosen konnten nicht auf die aktuellen Rechenregeln aktualisiert werden.');
  return {changed,forecasts:next.slice(-18)};
}

function renderStoredForecast(forecast){
  if(!forecast)return;
  const c=forecast.components||{};
  const fixed=c.fixed||SALARY_2026.fixed;
  const hours=c.hours||{};
  const taxFree=Number(forecast.protectedPay)||0;
  const taxableExtra=Math.max(0,(Number(forecast.taxableGross)||SALARY_2026.fixed.gross)-SALARY_2026.fixed.gross);
  set('rMonth',salaryMonthName(forecast.reportMonth));set('rPayoutMonth',salaryMonthName(forecast.payoutMonth));
  set('pBasePay',eur(fixed.basePay));set('pCareAllowance',eur(fixed.careAllowance));set('pUniversityAllowance',eur(fixed.universityAllowance));
  set('pShiftAllowance',`${shiftLabel(c.shiftType)} · ${eur(c.shift||0)}`);
  set('pNight',`${Number(hours.night||0).toFixed(2)} h · ${eur(c.night||0)}`);
  set('pSaturday',`${Number(hours.saturday||0).toFixed(2)} h · ${eur(c.saturday||0)}`);
  set('pSaturdayEvening',`${Number(hours.saturdayEvening||0).toFixed(2)} h · ${eur(c.saturdayEvening||0)}`);
  set('pSunday',`${Number(hours.sunday||0).toFixed(2)} h · ${eur(c.sunday||0)}`);
  set('pHoliday',`${Number(hours.holiday||0).toFixed(2)} h · ${eur(c.holiday||0)}`);
  set('pTaxableExtra',eur(taxableExtra));set('pTaxableGross',eur(forecast.taxableGross));set('pTaxFree',eur(taxFree));set('pBrutto',eur(forecast.totalGross));
  set('pTax',eur((forecast.wageTax||0)+(forecast.churchTax||0)+(forecast.solidarity||0)));
  set('pSocial',eur((forecast.health||0)+(forecast.care||0)+(forecast.pension||0)+(forecast.unemployment||0)));
  const learned=salaryDisplayPayout(forecast,getPayrollLearning());
  const netSummary=summarizeForecastNet(forecast,learned.payout,getPayrollLearning());
  set('pVbl',eur(forecast.vbl));set('pGarnish',eur(forecast.garnishment));set('pLegalNet',eur(forecast.legalNet));set('pPayout',eur(learned.payout));set('pPayoutDetail',eur(learned.payout));
  set('pTotalNet',eur(netSummary.totalNet));
  set('pTotalNetDetail',netSummary.surchargeNet!=null?`${eur(netSummary.baseNet)} Basis + ${eur(netSummary.surchargeNet)} Zuschlags-Nachzahlung`:'inkl. aller sicher berechneten Zuschläge');
  set('pSurchargeSummary',netSummary.surchargeNet!=null?`${eur(netSummary.taxFreeNet)} steuerfrei netto + ${eur(netSummary.taxableGross)} steuerpflichtig brutto → ${eur(netSummary.taxableNet)} steuerpflichtig netto.`:'Steuerliche Aufteilung wird nach sicherer Zuschlagsgrundlage angezeigt.');
  const open=Array.isArray(c.unpriced)?c.unpriced:[];
  set('pOpenItems',open.length?open.map(item=>`${item.label}: ${item.quantity}`).join(' · '):'Keine offenen, unberechneten Positionen.');
  const learningNote=learned.applied?` · Lernkalibrierung ${learned.adjustment>=0?'+':'−'}${eur(Math.abs(learned.adjustment))} aus ${learned.observations} sauberen Abrechnungen.`:'';
  const overrideNote=forecast.paymentMonthOverride?` Einmalige Korrektur: Auszahlung statt ${salaryMonthName(forecast.standardPayoutMonth)} in ${salaryMonthName(forecast.payoutMonth)} (${forecast.paymentMonthOverride.reason}).`:'';
  set('pReview',(forecast.needsReview?'Prognose erstellt. Einzelne Angaben sind noch als „Bitte prüfen“ markiert.':'Prognose vollständig aus den erkannten Zeitlohnarten berechnet.')+learningNote+overrideNote);
}

function renderCalculatedForecast(report,f){
  const b=salaryForecastBreakdown(report);
  set('rMonth',salaryMonthName(b.reportMonth));set('rPayoutMonth',salaryMonthName(b.payoutMonth));
  set('pBasePay',eur(b.fixed.basePay));set('pCareAllowance',eur(b.fixed.careAllowance));set('pUniversityAllowance',eur(b.fixed.universityAllowance));
  set('pShiftAllowance',`${b.shiftAllowance.label} · ${eur(b.shiftAllowance.amount)}`);
  const byKey=Object.fromEntries(b.timeSurcharges.map(item=>[item.key,item]));
  const line=key=>`${Number(byKey[key]?.hours||0).toFixed(2)} h · ${eur(byKey[key]?.amount||0)}`;
  set('pNight',line('night'));set('pSaturday',line('saturday'));set('pSaturdayEvening',line('saturdayEvening'));set('pSunday',line('sunday'));set('pHoliday',line('holiday'));
  set('pTaxableExtra',eur(b.taxableAdditions));set('pTaxableGross',eur(f.taxableGross));set('pTaxFree',eur(f.taxFreePay));set('pBrutto',eur(f.totalGross));
  const learned=salaryDisplayPayout(f,getPayrollLearning());
  const netSummary=summarizeForecastNet(f,learned.payout,getPayrollLearning());
  set('pTax',eur(f.wageTax+f.churchTax+f.solidarity));set('pSocial',eur(f.sv.health+f.sv.care+f.sv.pension+f.sv.unemployment));set('pVbl',eur(f.vbl));set('pGarnish',eur(f.garnishment));set('pLegalNet',eur(f.legalNet));set('pPayout',eur(learned.payout));set('pPayoutDetail',eur(learned.payout));
  set('pTotalNet',eur(netSummary.totalNet));
  set('pTotalNetDetail',netSummary.surchargeNet!=null?`${eur(netSummary.baseNet)} Basis + ${eur(netSummary.surchargeNet)} Zuschlags-Nachzahlung`:'inkl. aller sicher berechneten Zuschläge');
  set('pSurchargeSummary',netSummary.surchargeNet!=null?`${eur(netSummary.taxFreeNet)} steuerfrei netto + ${eur(netSummary.taxableGross)} steuerpflichtig brutto → ${eur(netSummary.taxableNet)} steuerpflichtig netto.`:'Steuerliche Aufteilung wird nach sicherer Zuschlagsgrundlage angezeigt.');
  set('pOpenItems',b.unpriced.length?b.unpriced.map(item=>`${item.label}: ${Number(item.quantity||0).toFixed(2)}`).join(' · '):'Keine offenen, unberechneten Positionen.');
  const notes=[];
  if(learned.applied)notes.push(`Lernkalibrierung ${learned.adjustment>=0?'+':'−'}${eur(Math.abs(learned.adjustment))} aus ${learned.observations} sauberen Abrechnungen`);
  if(report.conflict)notes.push(report.conflict);
  if(report.unknownCodes?.length)notes.push(`${report.unknownCodes.length} unbekannte Lohnart(en)`);
  if(b.unpriced.length)notes.push('§21-Durchschnitt ohne Betrag kann nicht automatisch bepreist werden');
  if(report.paymentMonthOverride)notes.push(`Einmalige Auszahlungskorrektur: ${salaryMonthName(report.standardPayoutMonth)} → ${salaryMonthName(report.payoutMonth)}`);
  set('pReview',notes.length?`Prognose erstellt · Bitte prüfen: ${notes.join(' · ')}`:'Prognose vollständig aus dem Zeitnachweis berechnet.');
}

export async function renderSalaryForecast(){
  if(!activeReport){renderStoredForecast(activeForecast);return;}
  try{
    const f=await calculateSalaryForecast(activeReport);activeForecast=f;renderCalculatedForecast(activeReport,f);
  }catch(error){
    console.error('[salary-forecast]',error);
    const saved=getSalaryForecasts().find(item=>item.payoutMonth===activeReport?.payoutMonth);
    if(saved)renderStoredForecast(saved);
    set('pReview','Netto-Berechnung konnte aktuell nicht neu geladen werden. Gespeicherte Werte bleiben erhalten.');
  }
}

function renderReportDetails(report){
  const details=$('reportDetails');if(!details)return;
  const rows=[...(report?.items||[]),...(report?.unknownCodes||[])];
  const escape=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  details.innerHTML=rows.length?rows.map(item=>`<div class="row wage-row"><span>${escape(item.code)} · ${escape(wageCodeLabel(item.code,item.type))}${item.status==='review'?' · UNSICHER / PRÜFEN':''}</span><span class="v wage-unit">${escape(wageQuantityLabel(item))}</span></div>`).join(''):'<div class="empty">Keine Zeitlohnarten erkannt.</div>';
}

export function renderForecastHistory(){renderPayrollControl();}

const fileNameOf=file=>String(file?.name||'Unbenannte Datei');
const importWarning=(stage,detail)=>({stage,message:importStageError(stage,detail).message});

export function timeReportImportWarnings(report,forecast){
  const warnings=[];
  const unknown=[...new Set((report?.unknownCodes||[]).map(item=>String(item?.code||'')).filter(Boolean))];
  if(unknown.length)warnings.push(importWarning('review',`Unbekannte Lohnart(en) ${unknown.join(', ')} wurden als UNSICHER / PRÜFEN gespeichert.`));
  const reviewItems=(report?.items||[]).filter(item=>item?.status==='review');
  if(reviewItems.length)warnings.push(importWarning('calculation',`${reviewItems.map(item=>item.code).join(', ')} ohne sicher berechenbare Stunden.`));
  const unpriced=Array.isArray(forecast?.components?.unpriced)?forecast.components.unpriced:[];
  if(unpriced.length)warnings.push(importWarning('calculation',unpriced.map(item=>item?.label||item?.code||'Position').join(', ')));
  return warnings;
}

export async function processTimeReportFiles(files,{read=readPdfText,parse=parseTimeReportText,calculate=calculateSalaryForecast,effects=calculateNetEffects,store=storeForecast}={}){
  const results=[];
  for(const [index,file] of (Array.isArray(files)?files:[]).entries()){
    const fileName=fileNameOf(file);
    try{
      let readResult;
      try{readResult=await read(file);}catch(error){throw normalizeImportError(error,'fileRead');}
      if(!readResult||typeof readResult.text!=='string')throw importStageError('textExtract','Es wurde kein PDF-Text geliefert.');
      if(readResult.needsOcr||readResult.text.trim().length===0)throw importStageError('textExtract','Kein sicherer PDF-Text erkannt; OCR wird nicht geschätzt.');
      let report;
      try{report=await parse(readResult.text);}catch(error){throw normalizeImportError(error,'timeReportParser');}
      report=applyPaymentMonthOverride(report,getPayrollPaymentOverrides());
      if(!report||!report.month)throw importStageError('month','Leistungsmonat konnte nicht sicher erkannt werden.');
      if(!Array.isArray(report.items)||!report.items.length)throw importStageError('wageType',report.unknownCodes?.length?`Nur unbekannte Lohnart(en) ${report.unknownCodes.map(item=>item.code).join(', ')} erkannt.`:'Keine verwertbare Lohnart im Zeitnachweis erkannt.');
      let baseline,forecast,netEffects=null;
      try{
        baseline=await calculate({items:[],unknownCodes:[],needsReview:false});
        forecast=await calculate(report);
        netEffects=typeof effects==='function'?await effects(report,baseline,forecast):null;
      }catch(error){throw normalizeImportError(error,'calculation');}
      if(!forecast||!forecast.components)throw importStageError('calculation','Die erkannte Lohnart konnte nicht fachlich berechnet werden.');
      try{await store(report,forecast,baseline,netEffects);}catch(error){throw normalizeImportError(error,'save');}
      results.push({file,fileName,index,report,forecast,baseline,netEffects,warnings:timeReportImportWarnings(report,forecast),error:null});
    }catch(error){
      const normalized=error?.importStage?error:normalizeImportError(error,'fileRead');
      results.push({file,fileName,index,error:normalized,stage:normalized.importStage,warnings:[]});
      console.error('[time-report-import]',fileName,normalized);
    }
  }
  return results;
}

async function importTimeReports(){
  const input=$('timeReportFiles'),status=$('timeReportStatus'),preview=$('timeReportPreview');
  const files=input?.files?Array.from(input.files):[];
  if(!files.length){notify('Bitte mindestens einen Zeitnachweis auswählen.',{type:'error'});return;}
  if(status)status.textContent='Zeitnachweis wird gelesen …';
  const results=await processTimeReportFiles(files);
  const valid=results.filter(result=>result.report&&result.forecast),selected=valid.at(-1);
  if(selected){activeReport=selected.report;activeForecast=selected.forecast;renderCalculatedForecast(selected.report,selected.forecast);renderReportDetails(selected.report);}
  const hasReview=valid.some(result=>result.report.needsReview||result.forecast.needsReview||result.warnings?.length),hasErrors=results.some(result=>result.error);
  if(status)status.textContent=!valid.length?'Kein Zeitnachweis konnte sicher ausgewertet werden.':hasErrors||hasReview?'Prognose erstellt – einzelne Angaben bitte prüfen.':'Zeitnachweis ausgewertet und Prognose gespeichert.';
  if(preview){
    const escape=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
    preview.classList.remove('hidden');
    preview.innerHTML=results.map(result=>result.error
      ?`<div class="note"><b>${escape(result.fileName)}</b> · ${escape(result.error.message)}</div>`
      :`<div class="forecast-card"><div class="forecast-head"><b>${escape(salaryMonthName(reportMonthKey(result.report)))} → ${escape(salaryMonthName(result.report.payoutMonth))}</b><span class="forecast-amount">${eur(result.forecast.payout)}</span></div><div class="note">${escape(shiftLabel(result.forecast.components.shift))} ${eur(result.forecast.components.pay.shift)} · steuerfreie Zuschläge ${eur(result.forecast.taxFreePay)}${result.warnings?.length?` · ${result.warnings.map(item=>escape(item.message)).join(' · ')}`:''}</div></div>`).join('');
  }
  try{await refreshPayrollChecks();renderForecastHistory();forecastChanged();}
  catch(error){console.error('[time-report-display]',error);if(status)status.textContent=`${status.textContent} ${importStageError('display',error?.message||'Anzeige konnte nicht aktualisiert werden.').message}`;}
  if(valid.length)notify('Gehaltsprognose wurde neu berechnet.',{type:'success'});
}

export async function initSalaryUi({onForecastChange}={}){
  forecastChanged=typeof onForecastChange==='function'?onForecastChange:()=>{};
  await refreshStoredSalaryForecasts();
  const saved=getSalaryForecasts().slice().sort((a,b)=>String(a.payoutMonth).localeCompare(String(b.payoutMonth))).at(-1)||null;
  activeForecast=saved;activeReport=restoreReportFromForecast(saved);
  renderForecastHistory();void renderSalaryForecast();
  if(activeReport)renderReportDetails(activeReport);
  if($('timeReportBtn'))$('timeReportBtn').onclick=importTimeReports;
  initSalaryPayslipUi({onChange:forecastChanged});
}
