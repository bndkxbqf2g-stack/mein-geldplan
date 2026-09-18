const STORAGE_KEY = "mgp35";
const DATA_SCHEMA_VERSION = 3;

const FIX_LABELS = [
  "Stefanie",
  "Landkreis Main-Spessart",
  "Lebensmittel",
  "D-Ticket",
  "Konto",
  "Apple Speicher"
];

const DEFAULT_FIX = [
  [FIX_LABELS[0], 754.00],
  [FIX_LABELS[1], 1133.00],
  [FIX_LABELS[2], 200.00],
  [FIX_LABELS[3], 63.00],
  [FIX_LABELS[4], 6.00],
  [FIX_LABELS[5], 0.99]
];

const DEFAULT_RATES = {
  "5010": { name: "Nachtarbeit", rate: 4.58, source: "Bezügemitteilungen 04–07/2026" },
  "5011": { name: "Nacht Beginn v.0:00", rate: null, source: "Keine eindeutige Euro-Rate im Projektmaterial" },
  "5014": { name: "Sa 13–20 Uhr", rate: null, source: "Keine eindeutige Euro-Rate im Projektmaterial" },
  "5024": { name: "Sonntagsarbeit 25%", rate: 5.58, source: "Bezügemitteilung 04/2026 – Rückrechnung 02/2026" },
  "5161": { name: "Durchschnitt §21 TV", rate: null, source: "Historische Sätze variieren; keine feste Rate ableitbar" },
  "5211": { name: "WechS§43", rate: null, source: "Keine eindeutige Euro-Rate im Projektmaterial" },
  "5212": { name: "SchiZ§43", rate: 60.00, source: "Bezügemitteilungen 02–07/2026 – Schichtzul. mtl. §43 TV-L" }
};

const DEFAULT_DATA = {
  schemaVersion: DATA_SCHEMA_VERSION,
  giro: 0,
  bargeld: 0,
  fix: DEFAULT_FIX,
  salaryCycles: {},
  history: [],
  payroll: {
    latestImport: null,
    entries: [],
    sourceMonth: "",
    rates: DEFAULT_RATES,
    supportObligations: 2,
    baseline: {
      month: "2026-08",
      gross: 4480.43,
      statutoryNet: 2827.98
    }
  }
};

function cloneDefaults(){
  return JSON.parse(JSON.stringify(DEFAULT_DATA));
}

function asNumber(value){
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function cents(value){
  return Math.round(asNumber(value) * 100) / 100;
}

function normalizeHistoryEntry(entry){
  if(!entry || typeof entry !== "object") return null;
  const validTypes = ["Einnahme","Ausgabe","Abheben","Lohn"];
  const type = validTypes.includes(entry.type) ? entry.type : null;
  const amount = cents(entry.amount);
  if(!type || amount <= 0) return null;
  const timestamp = entry.timestamp && !Number.isNaN(new Date(entry.timestamp).getTime())
    ? new Date(entry.timestamp).toISOString()
    : new Date().toISOString();
  return {
    id: String(entry.id || `${Date.now()}-${Math.random().toString(16).slice(2)}`),
    type,
    amount,
    description: String(entry.description || type),
    timestamp,
    ...(entry.budgetDelta !== undefined ? { budgetDelta: cents(entry.budgetDelta) } : {})
  };
}

function normalizeFix(sourceFix){
  const src = Array.isArray(sourceFix) ? sourceFix : [];
  return FIX_LABELS.map((label, index) => {
    const item = src[index];
    const name = Array.isArray(item) && String(item[0] || "").trim() ? String(item[0]).trim() : DEFAULT_FIX[index][0];
    const amount = Array.isArray(item) ? Math.max(0, cents(item[1])) : DEFAULT_FIX[index][1];
    return [name, amount];
  });
}

function migrateData(raw){
  const base = cloneDefaults();
  const source = raw && typeof raw === "object" ? raw : {};
  const sourcePayroll = source.payroll && typeof source.payroll === "object" ? source.payroll : {};

  const migrated = {
    ...base,
    ...source,
    schemaVersion: DATA_SCHEMA_VERSION,
    fix: normalizeFix(source.fix),
    salaryCycles: source.salaryCycles && typeof source.salaryCycles === "object" ? source.salaryCycles : {},
    history: Array.isArray(source.history) ? source.history.map(normalizeHistoryEntry).filter(Boolean) : [],
    payroll: {
      ...base.payroll,
      ...sourcePayroll,
      latestImport: sourcePayroll.latestImport && typeof sourcePayroll.latestImport === "object" ? sourcePayroll.latestImport : null,
      entries: Array.isArray(sourcePayroll.entries) ? sourcePayroll.entries : [],
      rates: {...base.payroll.rates, ...(sourcePayroll.rates || {})},
      supportObligations: 2,
      baseline: {...base.payroll.baseline, ...(sourcePayroll.baseline || {})}
    }
  };

  migrated.giro = cents(source.giro);
  migrated.bargeld = Math.max(0, cents(source.bargeld));

  migrated.salaryCycles = Object.fromEntries(
    Object.entries(migrated.salaryCycles).filter(([key, value]) => /^\d{4}-\d{2}$/.test(key) && value && typeof value === "object")
      .map(([key, value]) => [key, {
        month: key,
        net: cents(value.net),
        fix: cents(value.fix),
        timestamp: value.timestamp && !Number.isNaN(new Date(value.timestamp).getTime()) ? new Date(value.timestamp).toISOString() : new Date().toISOString()
      }])
  );

  migrated.payroll.entries = migrated.payroll.entries
    .filter(e => e && typeof e === "object")
    .map((e, index) => ({
      id: String(e.id || `${index}`),
      date: String(e.date || ""),
      from: e.from ? String(e.from) : null,
      to: e.to ? String(e.to) : null,
      code: String(e.code || ""),
      name: String(e.name || ""),
      quantity: e.quantity === null || e.quantity === undefined ? null : asNumber(e.quantity),
      extraValue: e.extraValue === null || e.extraValue === undefined ? null : asNumber(e.extraValue)
    }))
    .filter(e => SUPPORTED_CODES.includes(e.code));

  migrated.payroll.rates = Object.fromEntries(SUPPORTED_CODES.map(code => {
    const baseRate = base.payroll.rates[code];
    const existing = migrated.payroll.rates[code] || {};
    const rate = existing.rate === null || existing.rate === undefined || existing.rate === "" ? baseRate.rate : cents(existing.rate);
    return [code, {...baseRate, ...existing, rate}];
  }));

  migrated.payroll.sourceMonth = /^\d{4}-\d{2}$/.test(migrated.payroll.sourceMonth) ? migrated.payroll.sourceMonth : "";
  migrated.payroll.latestImport = migrated.payroll.latestImport || null;

  return migrated;
}

function normalizeData(raw){
  return migrateData(raw);
}

function load(){
  try{
    return normalizeData(JSON.parse(localStorage.getItem(STORAGE_KEY) || "null"));
  }catch(err){
    return cloneDefaults();
  }
}

function save(data){
  const normalized = normalizeData(data);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
}

function resetAll(){
  localStorage.removeItem(STORAGE_KEY);
  location.reload();
}

function validateBackupPayload(payload){
  if(!payload || typeof payload !== "object" || Array.isArray(payload)) return {ok:false, message:"Ungültiges Backup-Format."};
  if(payload.giro !== undefined && !Number.isFinite(Number(payload.giro))) return {ok:false, message:"Giro-Wert im Backup ist ungültig."};
  if(payload.bargeld !== undefined && !Number.isFinite(Number(payload.bargeld))) return {ok:false, message:"Bargeld-Wert im Backup ist ungültig."};
  if(payload.fix !== undefined && !Array.isArray(payload.fix)) return {ok:false, message:"Fixkosten im Backup sind ungültig."};
  if(payload.history !== undefined && !Array.isArray(payload.history)) return {ok:false, message:"Verlauf im Backup ist ungültig."};
  if(payload.salaryCycles !== undefined && (typeof payload.salaryCycles !== "object" || Array.isArray(payload.salaryCycles))) return {ok:false, message:"Lohnzyklen im Backup sind ungültig."};
  if(payload.payroll !== undefined && (typeof payload.payroll !== "object" || Array.isArray(payload.payroll))) return {ok:false, message:"Gehaltsdaten im Backup sind ungültig."};
  return {ok:true};
}
