const TX_KEY = "meinGeldplanGiroTx";
const CASH_KEY = "meinGeldplanCash";
const SAVINGS_KEY = "meinGeldplanSavings";
const SALARY_KEY = "meinGeldplanSalaryForecasts";
const PAYSLIP_KEY = "meinGeldplanPayslips";
const FIXED_KEY = "meinGeldplanFixedCosts";
const BUDGET_ANCHOR_KEY = "meinGeldplanBudgetAnchor";

function getStorage(storage) {
  if (storage) return storage;
  if (typeof globalThis !== "undefined" && globalThis.localStorage) return globalThis.localStorage;
  return null;
}

export function getTransactions(storage) {
  const store = getStorage(storage);
  if (!store) return [];
  try {
    const value = JSON.parse(store.getItem(TX_KEY) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

export function saveTransactions(transactions, storage) {
  const store = getStorage(storage);
  if (!store) return false;
  try {
    store.setItem(TX_KEY, JSON.stringify(Array.isArray(transactions) ? transactions : []));
    return true;
  } catch {
    return false;
  }
}

export function getCash(storage) {
  const store = getStorage(storage);
  if (!store) return 0;
  try {
    const value = Number.parseFloat(store.getItem(CASH_KEY) || "0");
    return Number.isFinite(value) ? Math.max(0, value) : 0;
  } catch {
    return 0;
  }
}

export function saveCash(value, storage) {
  const store = getStorage(storage);
  if (!store) return false;
  try {
    const safeValue = Math.max(0, Number(value) || 0);
    store.setItem(CASH_KEY, String(safeValue));
    return true;
  } catch {
    return false;
  }
}

export function getSavings(storage) {
  const store = getStorage(storage);
  if (!store) return { positions: [], allocations: [] };
  try {
    const value = JSON.parse(store.getItem(SAVINGS_KEY) || "{}");
    return {
      positions: Array.isArray(value?.positions) ? value.positions : [],
      allocations: Array.isArray(value?.allocations) ? value.allocations : []
    };
  } catch {
    return { positions: [], allocations: [] };
  }
}

export function saveSavings(value, storage) {
  const store = getStorage(storage);
  if (!store) return false;
  try {
    const safe = value && typeof value === "object" ? value : { positions: [], allocations: [] };
    store.setItem(SAVINGS_KEY, JSON.stringify(safe));
    return true;
  } catch {
    return false;
  }
}


export function getBudgetAnchor(storage) {
  const store = getStorage(storage);
  if (!store) return "";
  try { return String(store.getItem(BUDGET_ANCHOR_KEY) || "").slice(0, 10); } catch { return ""; }
}

export function saveBudgetAnchor(value, storage) {
  const store = getStorage(storage);
  if (!store) return false;
  try {
    const safe = String(value || "").slice(0, 10);
    if (!safe) return false;
    store.setItem(BUDGET_ANCHOR_KEY, safe);
    return true;
  } catch { return false; }
}

export function getFixedCosts(storage) {
  const store = getStorage(storage); if (!store) return null;
  try { const raw=store.getItem(FIXED_KEY); return raw===null?null:JSON.parse(raw); } catch { return null; }
}
export function saveFixedCosts(value, storage) {
  const store=getStorage(storage); if(!store)return false;
  try { store.setItem(FIXED_KEY,JSON.stringify(Array.isArray(value)?value:[])); return true; } catch { return false; }
}

export function getSalaryForecasts(storage) {
  const store = getStorage(storage);
  if (!store) return [];
  try {
    const value = JSON.parse(store.getItem(SALARY_KEY) || "[]");
    return Array.isArray(value) ? value : [];
  } catch { return []; }
}

export function saveSalaryForecasts(value, storage) {
  const store = getStorage(storage);
  if (!store) return false;
  try { store.setItem(SALARY_KEY, JSON.stringify(Array.isArray(value) ? value : [])); return true; }
  catch { return false; }
}

export function getPayslips(storage) {
  const store = getStorage(storage);
  if (!store) return [];
  try {
    const value = JSON.parse(store.getItem(PAYSLIP_KEY) || "[]");
    return Array.isArray(value) ? value : [];
  } catch { return []; }
}

export function savePayslips(value, storage) {
  const store = getStorage(storage);
  if (!store) return false;
  try { store.setItem(PAYSLIP_KEY, JSON.stringify(Array.isArray(value) ? value : [])); return true; }
  catch { return false; }
}

export function clearBudgetStorage(storage) {
  const store = getStorage(storage);
  if (!store) return false;
  try {
    store.removeItem(TX_KEY);
    store.removeItem(CASH_KEY);
    store.removeItem(SAVINGS_KEY);
    store.removeItem(FIXED_KEY);
    store.removeItem(BUDGET_ANCHOR_KEY);
    return true;
  } catch {
    return false;
  }
}

export function clearAllStorage(storage) {
  const store = getStorage(storage);
  if (!store) return false;
  try {
    store.removeItem(TX_KEY);
    store.removeItem(CASH_KEY);
    store.removeItem(SAVINGS_KEY);
    store.removeItem(SALARY_KEY);
    store.removeItem(PAYSLIP_KEY);
    store.removeItem(FIXED_KEY);
    store.removeItem(BUDGET_ANCHOR_KEY);
    return true;
  } catch { return false; }
}

export const storageKeys = Object.freeze({
  transactions: TX_KEY,
  cash: CASH_KEY,
  savings: SAVINGS_KEY,
  salaryForecasts: SALARY_KEY,
  payslips: PAYSLIP_KEY,
  fixedCosts: FIXED_KEY,
  budgetAnchor: BUDGET_ANCHOR_KEY
});
