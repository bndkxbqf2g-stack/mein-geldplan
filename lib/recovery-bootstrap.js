import {createBackupSnapshot,restoreBackupSnapshot} from './maintenance-ui.js';
import {loadRecoverySnapshot,shouldRecoverPrimary,scheduleRecoverySnapshot,clearRecoverySnapshot} from './recovery-store.js';

export async function recoverLocalDataIfNeeded(){
  try{
    const primary=createBackupSnapshot();
    const recovery=await loadRecoverySnapshot();
    if(!shouldRecoverPrimary(primary,recovery))return false;
    restoreBackupSnapshot(recovery);
    return true;
  }catch(error){
    console.warn('[recovery-restore]',error);
    return false;
  }
}

export function scheduleCurrentRecoverySnapshot(){
  scheduleRecoverySnapshot(createBackupSnapshot());
}

export async function clearRecoveryForReset(){
  return clearRecoverySnapshot().catch(()=>false);
}
