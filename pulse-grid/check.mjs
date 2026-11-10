import fs from 'node:fs';
import assert from 'node:assert/strict';
import vm from 'node:vm';

const paths=['pulse-grid/index.html','pulse-grid/orbit.html','pulse-grid/arcade.html','pulse-grid/partners.html'];
let passed=0;
for (const file of paths) {
  const html=fs.readFileSync(file,'utf8');
  assert.match(html,/<!doctype html>/i,file+': doctype');
  assert.match(html,/<meta[^>]+viewport/i,file+': viewport');
  assert.match(html,/<title>[^<]+<\/title>/i,file+': descriptive title');
  assert.match(html,/<\/html>/i,file+': html closed');
  for (const match of html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/gi)){
    if (/type\s*=\s*["']application\/ld\+json/i.test(match[1])) { JSON.parse(match[2]); continue; }
    if (/src\s*=/i.test(match[1])) continue;
    new vm.Script(match[2],{filename:file});
    passed++;
  }
  if (file.endsWith('index.html')) {
    assert.match(html,/arcade\.html/, 'game must lead to hub');
    assert.match(html,/partners\.html/, 'game must lead to licensing');
    assert.match(html,/function (?:start|end|drop|lock)\(/, 'puzzle interaction loop');
  }
  if (file.endsWith('orbit.html')) {
    assert.match(html,/function (?:start|end|update|move|draw)\(/, 'survival interaction loop');
    assert.match(html,/pointerdown/i, 'mobile pointer input');
  }
  console.log('PASS',file);
}
for (const file of ['pulse-grid/cover.png','pulse-grid/beat-2000.png','pulse-grid/favicon.svg']){
  assert.ok(fs.statSync(file).size>100,file+': missing asset');
  console.log('PASS',file);
}
console.log('All PULSE ARCADE smoke checks passed; parsed',passed,'inline scripts.');
