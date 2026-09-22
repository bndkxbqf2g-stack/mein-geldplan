export const DEFAULT_FIXED_COSTS=Object.freeze([
  {id:'stefanie-754',name:'Stefanie Wolling',amount:754},
  {id:'landkreis-1',name:'Landkreis Main Spessart',amount:456.50},
  {id:'landkreis-2',name:'Landkreis Main Spessart',amount:456.50},
  {id:'stefanie-100',name:'Stefanie Wolling',amount:100},
  {id:'stefanie-60a',name:'Stefanie Wolling',amount:60},
  {id:'stefanie-60b',name:'Stefanie Wölling',amount:60},
  {id:'lebensmittel',name:'Lebensmittel',amount:200},
  {id:'deutschlandticket',name:'Deutschlandticket',amount:63},
  {id:'kontofuehrung',name:'Kontoführung',amount:6},
  {id:'apple-speicher',name:'Apple Speicher',amount:4.31}
]);

export function normalizeFixedCosts(value){
  if(value==null)return DEFAULT_FIXED_COSTS.map(x=>({...x}));
  if(!Array.isArray(value))return [];
  return value.filter(Boolean).map((item,i)=>({id:item.id||`fix-${i}`,name:String(item.name||'Fixkosten').trim()||'Fixkosten',amount:Math.max(0,Number(item.amount)||0)}));
}
export function totalFixedCosts(value){return normalizeFixedCosts(value).reduce((sum,item)=>sum+item.amount,0);}
export function addFixedCost(value,item={}){const list=normalizeFixedCosts(value);return [...list,{id:item.id||`${Date.now()}-${Math.random()}`,name:String(item.name||'Neue Fixkosten'),amount:Math.max(0,Number(item.amount)||0)}];}
export function updateFixedCost(value,id,patch={}){return normalizeFixedCosts(value).map(item=>item.id===id?{...item,...patch,amount:patch.amount===undefined?item.amount:Math.max(0,Number(patch.amount)||0),name:patch.name===undefined?item.name:(String(patch.name).trim()||'Fixkosten')}:item);}
export function removeFixedCost(value,id){return normalizeFixedCosts(value).filter(item=>item.id!==id);}
