import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeFixedCosts,totalFixedCosts,addFixedCost,updateFixedCost,removeFixedCost} from '../lib/fixed-costs.js';

test('alter Fixkosten-Gesamtwert bleibt als Standard erhalten',()=>{
  const items=normalizeFixedCosts(null);
  assert.equal(items.length,1);
  assert.equal(totalFixedCosts(items),2156);
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
