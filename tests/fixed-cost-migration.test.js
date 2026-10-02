import test from 'node:test';
import assert from 'node:assert/strict';
import {migrateStorage,getFixedCosts,storageKeys,DATA_SCHEMA_VERSION} from '../lib/storage.js';

function memory(){const m=new Map();return {getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k)};}

test('persönliche Fixkosten werden aus altem Schema einmalig migriert',()=>{
  const store=memory();
  store.setItem(storageKeys.schemaVersion,'3');
  store.setItem(storageKeys.fixedCosts,JSON.stringify([{id:'old',name:'Alt',amount:2156}]));
  const result=migrateStorage(store);
  const items=getFixedCosts(store);
  assert.equal(result.version,DATA_SCHEMA_VERSION);
  assert.equal(items.length,10);
  assert.equal(items.reduce((s,x)=>s+x.amount,0),2160.31);
});

test('ab Schema 4 bleiben spätere manuelle Fixkostenänderungen erhalten',()=>{
  const store=memory();
  store.setItem(storageKeys.schemaVersion,'4');
  store.setItem(storageKeys.fixedCosts,JSON.stringify([{id:'mine',name:'Eigene Änderung',amount:1}]));
  migrateStorage(store);
  assert.deepEqual(getFixedCosts(store),[{id:'mine',name:'Eigene Änderung',amount:1}]);
});
