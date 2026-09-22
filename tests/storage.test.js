import test from "node:test";
import assert from "node:assert/strict";
import {
  getTransactions,
  saveTransactions,
  getCash,
  saveCash,
  clearBudgetStorage,
  getSavings,
  saveSavings,
  storageKeys
} from "../lib/storage.js";

function memoryStorage(initial = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem(key) { return data.has(key) ? data.get(key) : null; },
    setItem(key, value) { data.set(key, String(value)); },
    removeItem(key) { data.delete(key); }
  };
}

test("Transaktionen werden unverändert gespeichert und geladen", () => {
  const storage = memoryStorage();
  const transactions = [{ id: 1, type: "income", amount: 100, date: "2026-09-30" }];
  assert.equal(saveTransactions(transactions, storage), true);
  assert.deepEqual(getTransactions(storage), transactions);
});

test("defekte Transaktionsdaten führen sicher zu einer leeren Liste", () => {
  const storage = memoryStorage({ [storageKeys.transactions]: "{kaputt" });
  assert.deepEqual(getTransactions(storage), []);
});

test("Bargeld wird nie negativ gespeichert", () => {
  const storage = memoryStorage();
  saveCash(-25, storage);
  assert.equal(getCash(storage), 0);
  saveCash(90.5, storage);
  assert.equal(getCash(storage), 90.5);
});

test("Sparpositionen werden gespeichert und geladen", () => {
  const storage = memoryStorage();
  const value = { positions: [{ id: "u", name: "Urlaub" }], allocations: [] };
  assert.equal(saveSavings(value, storage), true);
  assert.deepEqual(getSavings(storage), value);
});

test("Reset entfernt nur die Budget-Speicherwerte", () => {
  const storage = memoryStorage({
    [storageKeys.transactions]: "[]",
    [storageKeys.cash]: "90",
    [storageKeys.savings]: JSON.stringify({ positions: [], allocations: [] }),
    unrelated: "bleibt"
  });
  assert.equal(clearBudgetStorage(storage), true);
  assert.equal(storage.getItem(storageKeys.transactions), null);
  assert.equal(storage.getItem(storageKeys.cash), null);
  assert.equal(storage.getItem(storageKeys.savings), null);
  assert.equal(storage.getItem("unrelated"), "bleibt");
});

test('Gehaltsprognosen werden getrennt gespeichert', async()=>{
  const {getSalaryForecasts,saveSalaryForecasts,clearBudgetStorage,clearAllStorage}=await import('../lib/storage.js');
  const data=new Map();
  const store={getItem:k=>data.has(k)?data.get(k):null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};
  saveSalaryForecasts([{payoutMonth:'2026-09',payout:2800}],store);
  assert.equal(getSalaryForecasts(store)[0].payout,2800);
  clearBudgetStorage(store);
  assert.equal(getSalaryForecasts(store).length,1);
  clearAllStorage(store);
  assert.equal(getSalaryForecasts(store).length,0);
});

test('speichert und lädt Bezügemitteilungen getrennt vom Budget', async () => {
  const { getPayslips, savePayslips } = await import('../lib/storage.js');
  const storage = memoryStorage();
  assert.equal(savePayslips([{ month:'2026-07', payout:2700.70 }], storage), true);
  assert.deepEqual(getPayslips(storage), [{ month:'2026-07', payout:2700.70 }]);
  assert.equal(storage.getItem(storageKeys.transactions), null);
});

test('Fixkosten werden getrennt gespeichert und geladen', async()=>{
  const {getFixedCosts,saveFixedCosts}=await import('../lib/storage.js');
  const storage=memoryStorage();
  const value=[{id:'miete',name:'Miete',amount:800}];
  assert.equal(saveFixedCosts(value,storage),true);
  assert.deepEqual(getFixedCosts(storage),value);
});
