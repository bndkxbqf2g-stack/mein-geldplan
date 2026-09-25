import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('v0.99.2 exposes accessible global status notice',()=>{
  const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
  assert.match(html,/id="appNotice"/);
  assert.match(html,/aria-live="polite"/);
});

test('update button has an accessible label',()=>{
  const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
  assert.match(html,/id="updateBtn"[^>]*aria-label="Auf neue Version prüfen"/);
});


test('header only keeps refresh control and settings contain preferences',()=>{
  const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
  const header=html.match(/<header[\s\S]*?<\/header>/)?.[0]||'';
  assert.match(header,/id="updateBtn"/);
  assert.doesNotMatch(header,/id="themeBtn"/);
  assert.doesNotMatch(header,/<h1>/);
  assert.match(html,/id="explanationsToggle"/);
  assert.match(html,/id="themeBtn"/);
});
