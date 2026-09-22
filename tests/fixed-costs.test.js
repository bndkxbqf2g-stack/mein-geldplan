import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeFixedCosts,totalFixedCosts,addFixedCost,updateFixedCost,removeFixedCost} from '../lib/fixed-costs.js';

test('persönliche Fixkosten sind als Standard hinterlegt',()=>{
  const items=normalizeFixedCosts(null);
  assert.equal(items.length,10);
  assert.equal(totalFixedCosts(items),2160.31);
  assert.equal(items.find(x=>x.id==='apple-speicher').amount,4.31);
});

test('gespeicherte leere Liste bleibt leer',()=>assert.deepEqual(normalizeFixedCosts([]),[]));

test('Fixkosten lassen sich addieren, ändern und löschen',()=>{
  let items=[];
  items=addFixedCost(items,{id:'miete',name:'Miete',amount:750});
  items=updateFixedCost(items,'miete',{amount:800});
  assert.equal(totalFixedCosts(items),800);
  items=removeFixedCost(items,'miete');
  assert.equal(totalFixedCosts(items),0);
});
