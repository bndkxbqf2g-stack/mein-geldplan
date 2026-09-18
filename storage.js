(function(){
  const STORAGE_KEY = 'mein-geldplan:data';
  const DATA_SCHEMA_VERSION = 6;
  const DEFAULT_GIRO = 147.30;
  const FIX_LABELS = [
    'Stefanie',
    'Landkreis Main-Spessart',
    'Lebensmittel',
    'D-Ticket',
    'Konto',
    'Apple Speicher'
  ];
  const DEFAULT_FIX = [754.00,1133.00,200.00,63.00,6.00,0.99];
  const SUPPORTED_CODES = ['5010','5011','5014','5024','5161','5211','5212'];

  function clone(obj){ return JSON.parse(JSON.stringify(obj)); }
  function cents(v){
    const n = Number(v);
    if(!Number.isFinite(n)) return 0;
    return Math.round((n + Number.EPSILON) * 100) / 100;
  }
  function parseMoneyInput(value){
    if(value === null || value === undefined) return NaN;
    let s = String(value).trim().replace(/\s/g,'');
    if(!s) return NaN;
    s = s.replace(/€/g,'');
    if(s.includes(',') && s.includes('.')) s = s.replace(/\./g,'').replace(',','.');
    else if(s.includes(',')) s = s.replace(',','.');
    const n = Number(s);
    return Number.isFinite(n) ? cents(n) : NaN;
  }
  function uid(prefix='id'){
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2,9)}`;
  }
  function formatEUR(v){
    return new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR'}).format(Number(v||0));
  }
  function formatDateTime(iso){
    const d = new Date(iso);
    if(Number.isNaN(d.getTime())) return '—';
    return d.toLocaleString('de-DE',{dateStyle:'short',timeStyle:'short'});
  }
  function escapeHtml(value){
    return String(value ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  }

  function defaultData(){
    return {
      schemaVersion: DATA_SCHEMA_VERSION,
      giro: DEFAULT_GIRO,
      bargeld: 0,
      fix: DEFAULT_FIX.map((amount,i)=>({id:`fix-${i+1}`,label:FIX_LABELS[i],amount})),
      salaryCycles: {},
      history: [],
      payroll: {
        imports: [],
        latestImport: null,
        entries: [],
        sourceMonth: '',
        supportObligations: 2,
        rates: {
          '5010': {label:'Nachtarbeit', rate:4.58, unit:'Std.', source:'Bezügemitteilungen 06–08/2026'},
          '5011': {label:'Nachtbeginn', rate:null, unit:'Std.', source:'Kein eigenständiger Euro-Satz im Quellenpaket belegt'},
          '5014': {label:'Samstag', rate:null, unit:'Std.', source:'Kein eigenständiger Euro-Satz im Quellenpaket belegt; Zeitnachweis enthält Zusatzwert'},
          '5024': {label:'Sonntagsarbeit 25%', rate:5.58, unit:'Std.', source:'Bezügemitteilung 04/2026'},
          '5161': {label:'Durchschnitt §21', rate:1.44, unit:'Tag', source:'Bezügemitteilung 07/2026'},
          '5211': {label:'Wechselschicht', rate:null, unit:'Einheit', source:'Kein eigenständiger Euro-Satz im Quellenpaket belegt'},
          '5212': {label:'Schichtzulage', rate:60.00, unit:'Einheit', source:'Bezügemitteilungen 02, 04, 07/2026; Zuordnung des Codes ist aus dem Zeitnachweis abgeleitet'}
        }
      }
    };
  }

  function normalizeFix(source){
    const arr = Array.isArray(source) ? source : [];
    return FIX_LABELS.map((label,i)=>{
      const item = arr[i] || {};
      const amount = Array.isArray(item) ? item[1] : item.amount;
      return {id:`fix-${i+1}`, label, amount: Math.max(0,cents(amount ?? DEFAULT_FIX[i]))};
    });
  }
  function normalizeHistoryEntry(e){
    if(!e || typeof e !== 'object') return null;
    const type = ['Einnahme','Ausgabe','Abheben','Lohn'].includes(e.type) ? e.type : 'Ausgabe';
    const amount = Math.max(0,cents(e.amount));
    const timestamp = e.timestamp && !Number.isNaN(new Date(e.timestamp).getTime()) ? new Date(e.timestamp).toISOString() : new Date().toISOString();
    const deltaGiro = e.deltaGiro !== undefined ? cents(e.deltaGiro) : (type==='Einnahme' ? amount : type==='Ausgabe' ? -amount : 0);
    const deltaCash = e.deltaCash !== undefined ? cents(e.deltaCash) : (type==='Abheben' ? amount : 0);
    return {
      id:String(e.id||uid('h')),
      type,
      amount,
      description:String(e.description||type),
      timestamp,
      deltaGiro,
      deltaCash,
      salaryCycle:e.salaryCycle || null,
      undone: Boolean(e.undone)
    };
  }
  function migrate(raw){
    const base = defaultData();
    const src = raw && typeof raw==='object' ? raw : {};
    const payroll = src.payroll && typeof src.payroll==='object' ? src.payroll : {};
    const data = {
      ...base,
      ...src,
      schemaVersion:DATA_SCHEMA_VERSION,
      fix:normalizeFix(src.fix),
      salaryCycles: src.salaryCycles && typeof src.salaryCycles==='object' && !Array.isArray(src.salaryCycles) ? src.salaryCycles : {},
      history:Array.isArray(src.history) ? src.history.map(normalizeHistoryEntry).filter(Boolean) : [],
      payroll:{...base.payroll,...payroll,rates:{...base.payroll.rates,...(payroll.rates||{})},supportObligations:2}
    };
    data.giro = cents(src.giro !== undefined ? src.giro : DEFAULT_GIRO);
    data.bargeld = Math.max(0,cents(src.bargeld !== undefined ? src.bargeld : 0));
    data.salaryCycles = Object.fromEntries(Object.entries(data.salaryCycles).filter(([k,v])=>/^\d{4}-\d{2}$/.test(k)&&v&&typeof v==='object').map(([k,v])=>[k,{month:k,net:cents(v.net),fix:cents(v.fix),timestamp:(v.timestamp && !Number.isNaN(new Date(v.timestamp).getTime()))?new Date(v.timestamp).toISOString():new Date().toISOString()}]));
    const rates = data.payroll.rates;
    for(const code of SUPPORTED_CODES){
      if(!rates[code]) rates[code]=base.payroll.rates[code];
      if(rates[code].rate!==null && rates[code].rate!==undefined && rates[code].rate!=='') rates[code].rate=cents(rates[code].rate);
      else rates[code].rate=null;
    }
    data.payroll.entries = Array.isArray(payroll.entries) ? payroll.entries.filter(e=>e && SUPPORTED_CODES.includes(String(e.code||''))).map(e=>({
      id:String(e.id||uid('p')),date:String(e.date||''),from:e.from?String(e.from):null,to:e.to?String(e.to):null,code:String(e.code),name:String(e.name||rates[e.code]?.label||e.code),quantity:e.quantity==null?null:Number(e.quantity),extraValue:e.extraValue==null?null:Number(e.extraValue)
    })) : [];
    data.payroll.sourceMonth = /^\d{4}-\d{2}$/.test(payroll.sourceMonth||'') ? payroll.sourceMonth : '';
    data.payroll.latestImport = payroll.latestImport || null;
    return data;
  }

  function load(){
    try{return migrate(JSON.parse(localStorage.getItem(STORAGE_KEY)||'null'));}
    catch(e){return defaultData();}
  }
  function save(data){
    const normalized=migrate(data);
    localStorage.setItem(STORAGE_KEY,JSON.stringify(normalized));
    return normalized;
  }
  function resetAll(){localStorage.removeItem(STORAGE_KEY);location.reload();}
  function validateBackupPayload(payload){
    if(!payload || typeof payload!=='object' || Array.isArray(payload)) return {ok:false,message:'Ungültiges Backup-Format.'};
    if(payload.giro!==undefined && !Number.isFinite(Number(payload.giro))) return {ok:false,message:'Giro-Wert ist ungültig.'};
    if(payload.bargeld!==undefined && !Number.isFinite(Number(payload.bargeld))) return {ok:false,message:'Bargeld-Wert ist ungültig.'};
    if(payload.fix!==undefined && !Array.isArray(payload.fix)) return {ok:false,message:'Fixkosten sind ungültig.'};
    if(payload.history!==undefined && !Array.isArray(payload.history)) return {ok:false,message:'Verlauf ist ungültig.'};
    return {ok:true};
  }
  window.STORAGE_KEY=STORAGE_KEY;
  window.DATA_SCHEMA_VERSION=DATA_SCHEMA_VERSION;
  window.FIX_LABELS=FIX_LABELS;
  window.DEFAULT_FIX=DEFAULT_FIX;
  window.SUPPORTED_CODES=SUPPORTED_CODES;
  window.cents=cents; window.parseMoneyInput=parseMoneyInput; window.uid=uid; window.formatEUR=formatEUR; window.formatDateTime=formatDateTime; window.escapeHtml=escapeHtml;
  window.load=load; window.save=save; window.resetAll=resetAll; window.defaultData=defaultData; window.migrate=migrate; window.validateBackupPayload=validateBackupPayload;
})();
