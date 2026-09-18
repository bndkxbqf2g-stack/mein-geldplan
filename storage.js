const STORAGE_KEY = "mgp35";
const DEFAULT_FIX = [
  ["Stefanie", 754.00],
  ["Landkreis Main-Spessart", 1133.00],
  ["Lebensmittel", 200.00],
  ["D-Ticket", 63.00],
  ["Konto", 6.00],
  ["Apple Speicher", 0.99]
];

const DEFAULT_DATA = {
  giro: 0,
  bargeld: 0,
  fix: DEFAULT_FIX,
  salaryCycles: {},
  history: [],
  payroll: {
    latestImport: null,
    entries: [],
    rates: {
      "5010": { name: "Nachtarbeit", rate: 4.58, source: "Bezügemitteilungen 04–07/2026" },
      "5011": { name: "Nacht Beginn v.0:00", rate: null, source: "Keine Rate im Projektmaterial" },
      "5014": { name: "Sa 13–20 Uhr", rate: null, source: "Keine eindeutige Euro-Rate im Projektmaterial" },
      "5024": { name: "Sonntagsarbeit 25%", rate: 5.58, source: "Bezügemitteilung 04/2026 – Rückrechnung 02/2026" },
      "5161": { name: "Durchschnitt §21 TV", rate: null, source: "Historische Sätze variieren; keine feste Rate ableitbar" },
      "5211": { name: "WechS§43", rate: null, source: "Keine eindeutige Rate im Projektmaterial" },
      "5212": { name: "SchiZ§43", rate: 60.00, source: "Bezügemitteilungen 02–07/2026 – Schichtzul. mtl. §43 TV-L" }
    },
    supportObligations: 2
  }
};

function cloneDefaults(){ return JSON.parse(JSON.stringify(DEFAULT_DATA)); }

function normalizeData(raw){
  const d = raw && typeof raw === "object" ? raw : cloneDefaults();
  if(!Array.isArray(d.fix)) d.fix = cloneDefaults().fix;
  if(!Array.isArray(d.history)) d.history = [];
  if(!d.salaryCycles || typeof d.salaryCycles !== "object") d.salaryCycles = {};
  if(typeof d.giro !== "number") d.giro = Number(d.giro) || 0;
  if(typeof d.bargeld !== "number") d.bargeld = Number(d.bargeld) || 0;
  d.payroll = d.payroll && typeof d.payroll === "object" ? d.payroll : cloneDefaults().payroll;
  d.payroll.rates = {...cloneDefaults().payroll.rates, ...(d.payroll.rates || {})};
  if(typeof d.payroll.supportObligations !== "number") d.payroll.supportObligations = 2;
  if(!Array.isArray(d.payroll.entries)) d.payroll.entries = [];
  return d;
}

function load(){
  try { return normalizeData(JSON.parse(localStorage.getItem(STORAGE_KEY) || "null")); }
  catch(err){ return cloneDefaults(); }
}

function save(data){ localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizeData(data))); }

function resetAll(){ localStorage.removeItem(STORAGE_KEY); location.reload(); }
