import { getSalaryForecasts, saveSalaryForecasts, getPayslips, savePayslips } from './storage.js';
import { SALARY_2026 } from '../config/salary-2026.js';
import { calculateSalaryForecast } from './salary.js';

const $=id=>document.getElementById(id);
const eur=v=>new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR'}).format(Number.isFinite(v)?v:0);
let activeReport=null;

export function salaryMonthLabel(value){if(!value)return '–';const p=String(value).split('-');return p.length===2?`${p[1]}/${p[0]}`:value;}
export function comparisonLabel(status){return status==='ok'?'Prognose trifft Abrechnung':status==='different'?'Abweichung erkannt':'Bitte prüfen';}

function storeForecast(report,f){
  if(!report?.payoutMonth)return;
  const list=getSalaryForecasts().filter(x=>x.payoutMonth!==report.payoutMonth);
  list.push({payoutMonth:report.payoutMonth,reportMonth:report.month?`${report.month.year}-${String(report.month.month).padStart(2,'0')}`:null,totalGross:f.totalGross,legalNet:f.legalNet,garnishableNet:f.garnishableNet,garnishment:f.garnishment,payout:f.payout,needsReview:f.needsReview});
  list.sort((a,b)=>String(a.payoutMonth).localeCompare(String(b.payoutMonth)));
  saveSalaryForecasts(list.slice(-18));
}
function storePayslip(actual){
  if(!actual?.month)return;
  const list=getPayslips().filter(x=>x.month!==actual.month);
  list.push(actual);list.sort((a,b)=>String(a.month).localeCompare(String(b.month)));
  savePayslips(list.slice(-18));
}
function renderPayslipComparison(actual,comparison){
  const wrap=$('payslipComparison'),status=$('payslipStatus');if(!wrap||!actual){if(wrap)wrap.innerHTML='';return;}
  if(status)status.textContent=`${salaryMonthLabel(actual.month)} · ${comparisonLabel(comparison?.status)}`;
  const rows=comparison?.rows||[];
  wrap.innerHTML=`<div class="forecast-card"><div class="forecast-head"><b>${salaryMonthLabel(actual.month)}</b><span class="forecast-amount">${eur(actual.payout||0)}</span></div>${rows.map(r=>{const d=r.difference==null?'–':`${r.difference>0?'+':''}${eur(r.difference)}`;return `<div class="row"><span>${r.label}</span><span class="v">${eur(r.predicted||0)} → ${eur(r.actual||0)} · ${d}</span></div>`;}).join('')}${comparison?.maxAbsDiff!=null?`<div class="note">Größte Abweichung: ${eur(comparison.maxAbsDiff)}</div>`:'<div class="note">Keine passende Prognose gefunden.</div>'}</div>`;
}
async function importPayslips(){
  const input=$('payslipFiles'),status=$('payslipStatus'),files=input?.files?Array.from(input.files):[];
  if(!files.length){alert('Bitte mindestens eine Bezügemitteilung auswählen.');return;}
  status.textContent='Bezügemitteilung wird gelesen …';
  try{
    const pdf=await import('./pdf.js'),mod=await import('./payslip.js');let last=null,lastComparison=null;const forecasts=getSalaryForecasts();
    for(const file of files){const read=await pdf.readPdfText(file);if(read.needsOcr){status.textContent='Kein sicherer PDF-Text erkannt – bitte prüfen.';continue;}const actual=mod.parsePayslipText(read.text);storePayslip(actual);const forecast=forecasts.find(f=>f.payoutMonth===actual.month);last=actual;lastComparison=forecast?mod.comparePayslip(forecast,actual):{status:'review',rows:[],maxAbsDiff:null};}
    renderPayslipComparison(last,lastComparison);
  }catch(error){status.textContent='Bezügemitteilung konnte nicht ausgewertet werden.';alert(error.message||'Bezügemitteilung konnte nicht ausgewertet werden.');}
}
export function renderForecastHistory(){
  const list=getSalaryForecasts(),wrap=$('forecastTableWrap'),chart=$('forecastChart');
  if(wrap)wrap.innerHTML=!list.length?'<div class="empty">Noch kein Zeitnachweis eingelesen.</div>':list.slice().reverse().map(f=>`<div class="forecast-card"><div class="forecast-head"><b>${salaryMonthLabel(f.payoutMonth)}</b><span class="forecast-amount">${eur(f.payout)}</span></div><div class="mini-grid"><div class="mini"><div class="t">Brutto</div><div class="n">${eur(f.totalGross)}</div></div><div class="mini"><div class="t">Netto</div><div class="n">${eur(f.legalNet)}</div></div><div class="mini"><div class="t">Pfändung</div><div class="n">${eur(f.garnishment)}</div></div></div>${f.needsReview?'<div class="note">Bitte prüfen</div>':''}</div>`).join('');
  if(chart){if(!list.length){chart.innerHTML='<div class="empty">Noch keine Prognosen.</div>';return;}const max=Math.max(...list.map(f=>f.payout||0))||1;chart.innerHTML=list.slice(-8).map(f=>`<div class="row"><span>${salaryMonthLabel(f.payoutMonth)}</span><span class="v">${eur(f.payout)}</span></div><div style="height:8px;background:var(--soft);border-radius:99px;overflow:hidden;margin:0 0 8px"><div style="height:100%;width:${Math.max(3,Math.round((f.payout/max)*100))}%;background:currentColor;border-radius:99px"></div></div>`).join('');}
}
export async function renderSalaryForecast(){
  if($('pBasePay'))$('pBasePay').textContent=eur(SALARY_2026.fixed.basePay);if($('pCareAllowance'))$('pCareAllowance').textContent=eur(SALARY_2026.fixed.careAllowance);if($('pUniversityAllowance'))$('pUniversityAllowance').textContent=eur(SALARY_2026.fixed.universityAllowance);if(!activeReport)return;
  try{
    const f=await calculateSalaryForecast(activeReport),set=(id,v)=>{if($(id))$(id).textContent=v;};
    set('pBrutto',eur(f.totalGross));set('pNettoBasis',eur(f.legalNet));set('pLegalNet',eur(f.legalNet));set('pProtected',eur(f.protectedPay));set('pSurcharges',eur(f.protectedPay+f.components.taxableExtra));set('pPfNetto',eur(f.garnishableNet));set('pGarnish',eur(f.garnishment));set('pPayout',eur(f.payout));set('pPayoutDetail',eur(f.payout));set('pVariableNet',eur(f.components.taxableExtra));set('pTaxFree',eur(f.taxFreePay));set('pSaturday',eur(f.components.pay.saturday));set('pTax',eur(f.wageTax+f.churchTax+f.solidarity));set('pSocial',eur(f.sv.health+f.sv.care+f.sv.pension+f.sv.unemployment));set('pVbl',eur(f.vbl));set('pShiftSummary',`${f.components.hours.night.toFixed(2)} h Nacht · ${f.components.hours.saturday.toFixed(2)} h Samstag · ${f.components.hours.sunday.toFixed(2)} h Sonntag · ${f.components.shift==='wechsel'?'Wechselschicht':f.components.shift==='schicht'?'Schicht':'keine Schichtzulage'}${f.needsReview?' · Bitte prüfen':''}`);
  }catch(error){if($('timeReportStatus'))$('timeReportStatus').textContent='Netto-Berechnung konnte nicht geladen werden.';console.error('[salary]',error);}
}
async function importTimeReports(){
  const input=$('timeReportFiles'),status=$('timeReportStatus'),preview=$('timeReportPreview'),details=$('reportDetails'),files=input?.files?Array.from(input.files):[];
  if(!files.length){alert('Bitte mindestens einen Zeitnachweis auswählen.');return;}status.textContent='PDF wird gelesen …';
  try{
    const pdf=await import('./pdf.js'),reports=[];
    for(const file of files){const read=await pdf.readPdfText(file);reports.push(read.needsOcr?{file:file.name,ocr:true}:{file:file.name,report:pdf.parseTimeReportText(read.text)});}
    status.textContent=reports.some(r=>r.ocr||r.report?.needsReview)?'Eingelesen – bitte markierte Angaben prüfen.':'Zeitnachweis erfolgreich eingelesen.';
    const first=reports.find(r=>r.report);activeReport=first?first.report:null;
    if(activeReport){if($('rMonth')&&activeReport.month)$('rMonth').textContent=`${String(activeReport.month.month).padStart(2,'0')}/${activeReport.month.year}`;if($('rPayoutMonth'))$('rPayoutMonth').textContent=activeReport.payoutMonth||'–';await renderSalaryForecast();try{const f=await calculateSalaryForecast(activeReport);storeForecast(activeReport,f);renderForecastHistory();}catch(error){console.error('[salary-history]',error);}}
    if(preview){preview.classList.remove('hidden');preview.innerHTML=reports.map(r=>r.ocr?`<div class="note"><b>${r.file}</b>: Kein sicherer PDF-Text erkannt – OCR/Prüfung erforderlich.</div>`:`<div class="row"><span>${r.file} · ${r.report.month?`${String(r.report.month.month).padStart(2,'0')}/${r.report.month.year}`:'Monat unbekannt'}</span><span class="v">${r.report.needsReview?'Bitte prüfen':'OK'}</span></div>`).join('');}
    if(details)details.innerHTML=reports.flatMap(r=>r.report?r.report.items.concat(r.report.unknownCodes):[]).map(i=>`<div class="row"><span>${i.code} · ${i.type||'Unbekannt'}</span><span class="v">${i.hours==null?'Bitte prüfen':`${i.hours.toFixed(2)} h`}</span></div>`).join('')||'<div class="empty">Keine Zeitlohnarten erkannt.</div>';
  }catch(error){status.textContent='PDF konnte nicht ausgewertet werden.';alert(error.message||'PDF konnte nicht ausgewertet werden.');}
}
export function initSalaryUi(){
  renderSalaryForecast();renderForecastHistory();
  if($('timeReportBtn'))$('timeReportBtn').onclick=importTimeReports;
  if($('payslipBtn'))$('payslipBtn').onclick=importPayslips;
}
