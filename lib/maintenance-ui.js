import {getTransactions,saveTransactions,getCash,saveCash,getSavings,saveSavings,getSalaryForecasts,saveSalaryForecasts,getPayslips,savePayslips,getFixedCosts,saveFixedCosts,getBudgetAnchor,saveBudgetAnchor} from './storage.js';
import {$} from './ui.js';

const VERSION=2;
function snapshot(){return {version:VERSION,exportedAt:new Date().toISOString(),transactions:getTransactions(),cash:getCash(),savings:getSavings(),salaryForecasts:getSalaryForecasts(),payslips:getPayslips(),fixedCosts:getFixedCosts(),budgetAnchor:getBudgetAnchor()};}
function restore(data){if(!data||typeof data!=='object')throw new Error('Ungültige Sicherungsdatei.');saveTransactions(data.transactions||[]);saveCash(data.cash||0);saveSavings(data.savings||{});saveSalaryForecasts(data.salaryForecasts||[]);savePayslips(data.payslips||[]);if('fixedCosts'in data)saveFixedCosts(data.fixedCosts||[]);if(data.budgetAnchor)saveBudgetAnchor(data.budgetAnchor);}
export function createMaintenanceUi(){
  function exportData(){const blob=new Blob([JSON.stringify(snapshot(),null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`mein-geldplan-${new Date().toISOString().slice(0,10)}.json`;a.click();URL.revokeObjectURL(url);if($('backupStatus'))$('backupStatus').textContent='Sicherung erstellt.';}
  async function importData(){const file=$('importFile')?.files?.[0];if(!file)return alert('Bitte zuerst eine Sicherungsdatei auswählen.');try{restore(JSON.parse(await file.text()));if($('backupStatus'))$('backupStatus').textContent='Sicherung wiederhergestellt. App wird neu geladen.';setTimeout(()=>location.reload(),300);}catch(e){if($('backupStatus'))$('backupStatus').textContent='Wiederherstellung fehlgeschlagen.';alert(e.message||'Sicherung konnte nicht gelesen werden.');}}
  async function initPwa(){if(!('serviceWorker'in navigator))return null;try{return await navigator.serviceWorker.register('./service-worker.js');}catch{return null;}}
  async function checkUpdate(){const status=$('updateStatus');if(status){status.style.display='block';status.textContent='Prüfe auf neue Version …';}const reg=await initPwa();if(reg)await reg.update();if(status)status.textContent=reg?'Update geprüft.':'Service Worker nicht verfügbar.';}
  async function init(){if($('exportBtn'))$('exportBtn').onclick=exportData;if($('importBtn'))$('importBtn').onclick=importData;if($('updateBtn'))$('updateBtn').onclick=checkUpdate;await initPwa();}
  return {init};
}
export {snapshot as createBackupSnapshot,restore as restoreBackupSnapshot};
