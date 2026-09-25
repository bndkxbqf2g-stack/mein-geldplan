import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeCloudSession} from '../lib/cloud-auth.js';
import {snapshotHash} from '../lib/cloud-backup.js';

test('Cloud-Sitzung akzeptiert nur vollständige Zugangsdaten',()=>{
  assert.equal(normalizeCloudSession(null),null);
  assert.equal(normalizeCloudSession({accessToken:'a'}),null);
  assert.deepEqual(normalizeCloudSession({accessToken:'a',refreshToken:'r',expiresAt:123,userId:'u',email:'x@y.de'}),{accessToken:'a',refreshToken:'r',expiresAt:123,userId:'u',email:'x@y.de'});
});

test('Snapshot-Hash ist stabil und reagiert auf Datenänderung',async()=>{
  const a=await snapshotHash({cash:85,transactions:[]});
  const b=await snapshotHash({cash:85,transactions:[]});
  const c=await snapshotHash({cash:84,transactions:[]});
  assert.equal(a,b);
  assert.notEqual(a,c);
  assert.equal(a.length,64);
});
