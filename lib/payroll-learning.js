const money=value=>Math.round((Number(value)||0)*100)/100;
const COMPONENTS=Object.freeze({
  night:{codes:['5010','5011'],tax:'steuerfrei'},
  saturday:{codes:['5014'],tax:'steuerpflichtig'},
  sunday:{codes:['5024'],tax:'steuerfrei'},
  holiday:{codes:[],tax:'steuerfrei'},
  shift:{codes:['5211','5212'],tax:'steuerpflichtig'},
  springIn:{codes:[],tax:'prüfen'}
});

function actualComponent(actual,key){
  const value=Number(actual?.components?.[key]);
  return Number.isFinite(value)?money(value):null;
}
function expectedComponent(forecast,key){
  const value=Number(forecast?.components?.[key]);
  return Number.isFinite(value)?money(value):null;
}
function reportCodes(forecast,key){
  const allowed=new Set(COMPONENTS[key]?.codes||[]);
  return [...new Set((forecast?.reportItems||[]).map(item=>String(item?.code||'')).filter(code=>allowed.has(code)))];
}
function confidence(confirmations,observations){
  if(!observations)return 'unbekannt';
  if(confirmations>=3&&confirmations===observations)return 'verifiziert';
  if(confirmations>=2)return 'mehrfach bestätigt';
  if(confirmations>=1)return 'einmal bestätigt';
  return 'abweichend';
}

export function buildPayrollLearningSnapshot({forecast,actual,tolerance=1}={}){
  if(!forecast?.payoutMonth||!actual?.month||forecast.payoutMonth!==actual.month)return null;
  const rows=[];
  for(const key of Object.keys(COMPONENTS)){
    const expected=expectedComponent(forecast,key);
    const real=actualComponent(actual,key);
    if(expected==null&&real==null)continue;
    const comparable=expected!=null&&real!=null;
    const difference=comparable?money(real-expected):null;
    rows.push({
      key,
      codes:reportCodes(forecast,key),
      tax:COMPONENTS[key].tax,
      expected,
      actual:real,
      difference,
      comparable,
      confirmed:comparable&&Math.abs(difference)<=tolerance
    });
  }
  const totalFields=['totalGross','legalNet','vbl','garnishment','payout'].map(key=>{
    const predicted=Number(forecast?.[key]),real=Number(actual?.[key]);
    const comparable=Number.isFinite(predicted)&&Number.isFinite(real)&&!(actual?.hasPriorAdjustment&&['garnishment','payout'].includes(key));
    return {key,predicted:Number.isFinite(predicted)?money(predicted):null,actual:Number.isFinite(real)?money(real):null,difference:comparable?money(real-predicted):null,comparable};
  });
  return {
    id:`${forecast.payoutMonth}:${forecast.reportMonth||'unknown'}`,
    payoutMonth:forecast.payoutMonth,
    reportMonth:forecast.reportMonth||null,
    createdAt:new Date().toISOString(),
    rows,
    totals:totalFields,
    hasPriorAdjustment:Boolean(actual?.hasPriorAdjustment)
  };
}

export function mergePayrollLearning(existing=[],snapshot){
  if(!snapshot)return Array.isArray(existing)?existing:[];
  const list=(Array.isArray(existing)?existing:[]).filter(item=>item?.id!==snapshot.id);
  list.push(snapshot);
  return list.sort((a,b)=>String(a.payoutMonth).localeCompare(String(b.payoutMonth))).slice(-36);
}

export function summarizePayrollLearning(history=[]){
  const summary={};
  for(const snapshot of Array.isArray(history)?history:[]){
    for(const row of snapshot?.rows||[]){
      const keys=row.codes?.length?row.codes:[row.key];
      for(const key of keys){
        const entry=summary[key]||{key,component:row.key,tax:row.tax,observations:0,confirmations:0,mismatches:0,lastDifference:null};
        if(row.comparable){
          entry.observations++;
          entry.lastDifference=row.difference;
          if(row.confirmed)entry.confirmations++;else entry.mismatches++;
        }
        summary[key]=entry;
      }
    }
  }
  return Object.values(summary).map(entry=>({...entry,confidence:confidence(entry.confirmations,entry.observations)}));
}

export function validateForecastWithLearning(forecast,history=[]){
  const learned=summarizePayrollLearning(history);
  const byCode=new Map(learned.map(item=>[item.key,item]));
  const warnings=[];
  for(const item of forecast?.reportItems||[]){
    const rule=byCode.get(String(item?.code||''));
    if(rule?.mismatches>0)warnings.push({code:String(item.code),confidence:rule.confidence,mismatches:rule.mismatches,message:'Historische Bezügemitteilungen wichen bei dieser Lohnart von der Prognose ab.'});
  }
  return {rules:learned,warnings,needsReview:warnings.length>0};
}
