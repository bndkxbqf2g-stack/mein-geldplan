import {getSalaryForecasts,saveSalaryForecasts,getPayslips,savePayslips,getPayrollLearning,savePayrollLearning} from './storage.js';
import {readPdfText} from './pdf.js';
import {parsePayslipDocument} from './payslip.js';
import {importStageError,normalizeImportError} from './import-status.js';
import {samePayrollMonth} from './payroll-month.js';
import {retroForForecast} from './payroll-control.js';
import {calculateOutstandingNetEffects} from './salary-net-effects.js?v=0.99.60';
import {renderPayrollControl} from './payroll-control-ui-v2.js';
import {buildPayrollLearningSnapshot,mergePayrollLearning} from './payroll-learning.js';
import {notify} from './ui.js';
const $=id=>document.getElementById(id);
let payslipChanged=()=>{};
const monthLabel=value=>{if(!value)return '–';const [year,month]=String(value).split('-').map(Number);return new Intl.DateTimeFormat('de-DE',{month:'long',year:'numeric'}).format(new Date(year,month-1,1));};
function storePayslip(actual){
  if(!actual?.month)return;
  const list=getPayslips().filter(item=>!samePayrollMonth(item?.month,actual.month));
  list.push(actual);list.sort((a,b)=>String(a.month).localeCompare(String(b.month)));
  if(!savePayslips(list.slice(-18)))throw new Error('Bezügemitteilung konnte nicht dauerhaft gespeichert werden.');
}

const payslipFileName=file=>String(file?.name||'Unbenannte Datei');
const payslipWarning=(stage,detail)=>({stage,message:importStageError(stage,detail).message});

export function payslipImportWarnings(actual){
  if(!actual?.needsReview)return [];
  const required=['month','totalGross','legalNet','payout'];
  const missing=required.filter(key=>actual[key]==null);
  return [payslipWarning('review',missing.length?`Fehlende Felder: ${missing.join(', ')}.`:'Einzelne Abrechnungswerte konnten nicht sicher gelesen werden.')];
}

export async function processPayslipFiles(files,{read=readPdfText,parse=parsePayslipDocument,store=storePayslip}={}){
  const results=[];
  for(const [index,file] of (Array.isArray(files)?files:[]).entries()){
    const fileName=payslipFileName(file);
    try{
      let readResult;
      try{readResult=await read(file);}catch(error){throw normalizeImportError(error,'fileRead');}
      if(!readResult||typeof readResult.text!=='string')throw importStageError('textExtract','Es wurde kein PDF-Text geliefert.');
      if(readResult.needsOcr||readResult.text.trim().length===0)throw importStageError('textExtract','Kein sicherer PDF-Text erkannt; OCR wird nicht geschätzt.');
      let actual;
      try{actual=await parse(readResult.text);}catch(error){throw normalizeImportError(error,'payslipParser');}
      if(!actual)throw importStageError('payslipParser','Die Bezügemitteilung lieferte keine verwertbaren Daten.');
      if(!actual.month)throw importStageError('month','Abrechnungsmonat konnte nicht sicher erkannt werden.');
      try{await store(actual);}catch(error){throw normalizeImportError(error,'save');}
      results.push({file,fileName,index,actual,warnings:payslipImportWarnings(actual),error:null});
    }catch(error){
      const normalized=error?.importStage?error:normalizeImportError(error,'fileRead');
      results.push({file,fileName,index,error:normalized,stage:normalized.importStage,warnings:[]});
      console.error('[payslip-import]',fileName,normalized);
    }
  }
  return results;
}
export function buildUpdatedPayrollLearning(forecasts=[],payslips=[],history=[]){
  let next=Array.isArray(history)?history:[];
  for(const forecast of Array.isArray(forecasts)?forecasts:[]){
    const actual=(Array.isArray(payslips)?payslips:[]).find(item=>samePayrollMonth(item?.month,forecast?.payoutMonth));
    if(!actual)continue;
    const snapshot=buildPayrollLearningSnapshot({forecast,actual,payslips});
    if(!snapshot)continue;
    const previous=next.find(item=>item?.id===snapshot.id);
    if(previous){
      const {createdAt:_old,...oldData}=previous;
      const {createdAt:_new,...newData}=snapshot;
      if(JSON.stringify(oldData)===JSON.stringify(newData))continue;
    }
    next=mergePayrollLearning(next,snapshot);
  }
  return next;
}
function refreshPayrollLearning(){
  const current=getPayrollLearning();
  const next=buildUpdatedPayrollLearning(getSalaryForecasts(),getPayslips(),current);
  if(JSON.stringify(next)!==JSON.stringify(current)&&!savePayrollLearning(next))throw new Error('Payroll-Lernhistorie konnte nicht dauerhaft gespeichert werden.');
  return next;
}
export async function refreshPayrollChecks(){
  const forecasts=getSalaryForecasts(),payslips=getPayslips();let changed=false;
  for(const forecast of forecasts){
    const actual=payslips.find(item=>samePayrollMonth(item?.month,forecast?.payoutMonth));
    if(!actual)continue;
    try{
      const effects=await calculateOutstandingNetEffects(forecast,actual,retroForForecast(payslips,forecast));
      if(JSON.stringify(forecast.actualNetEffects)!==JSON.stringify(effects)||forecast.actualNetEffectsVersion!==6){
        forecast.actualNetEffects=effects||null;forecast.actualNetEffectsVersion=6;changed=true;
      }
    }catch(error){console.error('[salary-payslip-effects]',forecast?.payoutMonth,error);}
  }
  if(changed&&!saveSalaryForecasts(forecasts))throw new Error('Gehaltsprognose konnte nach dem Abgleich nicht gespeichert werden.');
  refreshPayrollLearning();
  renderPayrollControl();
}
export async function importPayslips(){
  const input=$('payslipFiles'),status=$('payslipStatus'),preview=$('payslipPreview'),files=input?.files?Array.from(input.files):[];
  if(!files.length){notify('Bitte mindestens eine Bezügemitteilung auswählen.',{type:'error'});return;}
  if(status)status.textContent='Bezügemitteilung wird gelesen …';
  const results=await processPayslipFiles(files),imported=results.filter(result=>result.actual).map(result=>result.actual),errors=results.filter(result=>result.error);
  if(status){
    const months=imported.map(item=>monthLabel(item.month)).join(', '),retros=imported.reduce((sum,item)=>sum+(item.retroPeriods?.length||0),0);
    status.textContent=imported.length?`Eingelesen: ${months}${retros?` · ${retros} Rückrechnung(en) erkannt`:''}${errors.length||results.some(result=>result.warnings?.length)?' · einzelne Dateien bitte prüfen':''}.`:'Keine Bezügemitteilung konnte sicher ausgewertet werden.';
  }
  if(preview){
    const escape=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
    preview.classList.remove('hidden');
    preview.innerHTML=results.map(result=>result.error
      ?`<div class="note"><b>${escape(result.fileName)}</b> · ${escape(result.error.message)}</div>`
      :`<div class="note"><b>${escape(result.fileName)}</b> · ${escape(monthLabel(result.actual.month))}${result.warnings?.length?` · ${result.warnings.map(item=>escape(item.message)).join(' · ')}`:' · Werte übernommen.'}</div>`).join('');
  }
  let displayError=null;
  try{await refreshPayrollChecks();}
  catch(error){displayError=importStageError('display',error?.message||'Anzeige konnte nicht aktualisiert werden.',error);console.error('[payslip-display]',displayError);}
  if(displayError&&status)status.textContent=`${status.textContent} ${displayError.message}`;
  if(imported.length){payslipChanged();notify('Bezügemitteilung wurde mit der Prognose gegengerechnet.',{type:'success'});}
  else notify(errors[0]?.error?.message||'Bezügemitteilung konnte nicht ausgewertet werden.',{type:'error'});
}
export function initSalaryPayslipUi({onChange}={}){
  payslipChanged=typeof onChange==='function'?onChange:()=>{};
  if($('payslipBtn'))$('payslipBtn').onclick=importPayslips;
  renderPayrollControl();void refreshPayrollChecks();
}
