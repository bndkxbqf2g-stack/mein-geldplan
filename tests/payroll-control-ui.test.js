import test from 'node:test';
import assert from 'node:assert/strict';
import {renderPayrollControl} from '../lib/payroll-control-ui.js';

test('Kontrollkarten initialisieren ohne Fehler, wenn noch keine Prognosen gespeichert sind',()=>{
  const originalDocument=globalThis.document;
  const originalStorage=globalThis.localStorage;
  const wrap={innerHTML:'',children:[],appendChild(child){this.children.push(child);}};
  const status={textContent:''};
  globalThis.document={
    getElementById:id=>id==='payrollControlList'?wrap:id==='payrollControlStatus'?status:null,
    createElement:tag=>({tagName:tag,className:'',textContent:''})
  };
  globalThis.localStorage={getItem:()=>null};
  try{
    assert.doesNotThrow(()=>renderPayrollControl());
    assert.equal(wrap.children.length,1);
    assert.ok(wrap.children[0].textContent.includes('Noch keine gemeinsame Soll-/Ist-Grundlage'));
  }finally{
    if(originalDocument===undefined)delete globalThis.document;else globalThis.document=originalDocument;
    if(originalStorage===undefined)delete globalThis.localStorage;else globalThis.localStorage=originalStorage;
  }
});
