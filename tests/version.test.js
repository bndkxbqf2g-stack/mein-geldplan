import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {APP_VERSION} from '../config/version.js';

const root=path.join(path.dirname(fileURLToPath(import.meta.url)),'..');

test('sichtbare App-Version und Service-Worker-Version stimmen überein',()=>{
  const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
  const sw=fs.readFileSync(path.join(root,'service-worker.js'),'utf8');
  assert.match(APP_VERSION,/^\d+\.\d+\.\d+$/);
  assert.ok(html.includes(`id="appVersion">v${APP_VERSION}`));
  assert.ok(html.includes(`app.js?v=${APP_VERSION}`));
  assert.ok(html.includes('import(`./lib/salary-ui.js?v=${APP_VERSION}`)') || fs.readFileSync(path.join(root,'app.js'),'utf8').includes('import(`./lib/salary-ui.js?v=${APP_VERSION}`)'));
  assert.ok(sw.includes(`mein-geldplan-v${APP_VERSION}`));
  assert.ok(sw.includes(`app.js?v=${APP_VERSION}`));
  for(const module of ['salary-ui.js','salary-payslip-ui.js','salary-net-effects.js','salary.js'])assert.ok(sw.includes(`./lib/${module}?v=${APP_VERSION}`),module);
});
