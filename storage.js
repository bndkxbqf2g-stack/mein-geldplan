const STORAGE_KEY = "mgp35";
const DATA_SCHEMA_VERSION = 2;

const DEFAULT_FIX = [
  ["Stefanie", 754.00],
  ["Landkreis Main-Spessart", 1133.00],
  ["Lebensmittel", 200.00],
  ["D-Ticket", 63.00],
  ["Konto", 6.00],
  ["Apple Speicher", 0.99]
];

const DEFAULT_RATES = {
  "5010": { name: "Nachtarbeit", rate: 4.58, source: "Bezügemitteilungen 04–07/2026" },
  "5011": { name: "Nacht Beginn v.0:00", rate: null, source: "Keine Rate im Projektmaterial" },
  "5014": { name: "Sa 13–20 Uhr", rate: null, source: "Keine eindeutige Euro-Rate im Projektmaterial" },
  "5024": { name: "Sonntagsarbeit 25%", rate: 5.58, source: "Bezügemitteilung 04/2026 – Rückrechnung 02/2026" },
  "5161": { name: "Durchschnitt §21 TV", rate: null, source: "Historische Sätze variieren; keine feste Rate ableitbar" },
  "5211": { name: "WechS§43", rate: null, source: "Keine eindeutige Rate im Projektmaterial" },
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
    supportObligations: 2
  }
};

function cloneDefaults(){
  return JSON.parse(JSON.stringify(DEFAULT_DATA));
}

function asNumber(value){
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function normalizeHistoryEntry(entry){
  if(!entry || typeof entry !== "object") return null;
  const type = ["Einnahme","Ausgabe","Abheben","Lohn"].includes(entry.type) ? entry.type : null;
  const amount = Math.round(asNumber(entry.amount) * 100) / 100;
  if(!type || amount <= 0) return null;
  return {
    id: String(entry.id || `${Date.now()}-${Math.random().toString(16).slice(2)}`),
    type,
    amount,
    description: String(entry.description || type),
    timestamp: entry.timestamp && !Number.isNaN(new Date(entry.timestamp).getTime())
      ? new Date(entry.timestamp).toISOString()
      : new Date().toISOString(),
    ...(entry.budgetDelta !== undefined ? { budgetDelta: asNumber(entry.budgetDelta) } : {})
  };
}

function migrateData(raw){
  const base = cloneDefaults();
  const source = raw && typeof raw === "object" ? raw : {};

  // Preserve the current data model while adding schema metadata. No budget values
  // are recalculated or otherwise changed during migration.
  const migrated = {
    ...base,
    ...source,
    schemaVersion: DATA_SCHEMA_VERSION,
    fix: Array.isArray(source.fix) ? source.fix : base.fix,
    salaryCycles: source.salaryCycles && typeof source.salaryCycles === "object" ? source.salaryCycles : {},
    history: Array.isArray(source.history) ? source.history.map(normalizeHistoryEntry).filter(Boolean) : [],
    payroll: source.payroll && typeof source.payroll === "object" ? source.payroll : base.payroll
  };

  migrated.giro = Math.round(asNumber(source.giro) * 100) / 100;
  migrated.bargeld = Math.max(0, Math.round(asNumber(source.bargeld) * 100) / 100);

  migrated.fix = migrated.fix
    .filter(item => Array.isArray(item) && item.length >= 2)
    .map(item => [String(item[0] || "Fixkosten"), Math.max(0, Math.round(asNumber(item[1]) * 100) / 100)]);
  if(migrated.fix.length === 0) migrated.fix = base.fix;

  migrated.payroll = {
    ...base.payroll,
    ...migrated.payroll,
    latestImport: migrated.payroll.latestImport && typeof migrated.payroll.latestImport === "object" ? migrated.payroll.latestImport : null,
    entries: Array.isArray(migrated.payroll.entries) ? migrated.payroll.entries : [],
    rates: {...base.payroll.rates, ...(migrated.payroll.rates || {})},
    supportObligations: 2
  };

  return migrated;
}

function normalizeData(raw){
  return migrateData(raw);
}

function load(){
  try {
    return normalizeData(JSON.parse(localStorage.getItem(STORAGE_KEY) || "null"));
  } catch(err){
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
  if(!payload || typeof payload !== "object") return {ok:false, message:"Ungültiges Backup-Format."};
  if(Array.isArray(payload)) return {ok:false, message:"Dieses Backup enthält kein gültiges Datenobjekt."};
  if(payload.giro !== undefined && !Number.isFinite(Number(payload.giro))) return {ok:false, message:"Giro-Wert im Backup ist ungültig."};
  if(payload.bargeld !== undefined && !Number.isFinite(Number(payload.bargeld))) return {ok:false, message:"Bargeld-Wert im Backup ist ungültig."};
  if(payload.fix !== undefined && !Array.isArray(payload.fix)) return {ok:false, message:"Fixkosten im Backup sind ungültig."};
  if(payload.history !== undefined && !Array.isArray(payload.history)) return {ok:false, message:"Verlauf im Backup ist ungültig."};
  return {ok:true};
}
