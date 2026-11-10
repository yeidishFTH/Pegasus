import fs from 'node:fs';
import assert from 'node:assert/strict';
import vm from 'node:vm';

const paths=['pulse-grid/index.html','pulse-grid/orbit.html','pulse-grid/arcade.html','pulse-grid/partners.html','pulse-grid/license-order.html'];
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

// Verify public navigation does not point to missing local assets or pages.
for (const file of paths) {
  const html = fs.readFileSync(file,'utf8');
  for (const [, raw] of html.matchAll(/\b(?:href|src)=["'](\/[^"']*)["']/g)) {
    const pathname=decodeURIComponent(raw.split(/[?#]/,1)[0]);
    if(pathname==='/' || pathname==='')continue;
    assert.ok(fs.existsSync('pulse-grid'+pathname),file+': missing local target '+pathname);
  }
}
const home=fs.readFileSync('pulse-grid/index.html','utf8');
const orbit=fs.readFileSync('pulse-grid/orbit.html','utf8');
const partners=fs.readFileSync('pulse-grid/partners.html','utf8');
const order=fs.readFileSync('pulse-grid/license-order.html','utf8');
assert.match(home,/id="start"/,'PULSE GRID needs PLAY NOW');
assert.match(home,/id="invite"/,'PULSE GRID needs friend invite');
assert.match(home,/supportOverlay/,'PULSE GRID needs voluntary support after game over');
assert.match(home,/visibilitychange/,'PULSE GRID should pause when backgrounded');
assert.match(orbit,/visibilitychange/,'PULSE ORBIT should pause when backgrounded');
assert.match(home,/storageGet/,'PULSE GRID should tolerate blocked local storage');
assert.match(orbit,/storageGet/,'PULSE ORBIT should tolerate blocked local storage');
assert.match(partners,/license-order\.html/,'licensing page must lead to order inquiry');
assert.match(order,/mailto:efrimaidan2@gmail\.com/,'order request needs a functional email handoff');
assert.match(order,/paypal\.me\/DANEFFRIMK\/9USD/,'approved USD 9 pilot needs an explicit payment destination');
assert.match(order,/written confirmation/i,'do not imply rights without terms');
assert.match(order,/value="source"/,'developer source-code inquiry option exists');
assert.match(order,/source:\[/,'developer source-code selection must populate the quote');
assert.match(partners,/license-order\.html\?offer=source/,'partner offer must lead to canonical source-code quote');
assert.match(partners,/AI-assisted/,'disclose source provenance and rights constraints');
assert.match(home,/paypal\.me\/DANEFFRIMK\/1USD/,'free game must show voluntary payment only');
assert.ok(!/premium features included|pay.to.win bonus/i.test(home),'no paid advantage claims');
const sitemap=fs.readFileSync('pulse-grid/sitemap.xml','utf8');
for(const route of ['/','/arcade.html','/orbit.html','/partners.html','/license-order.html']){
  assert.ok(sitemap.includes('https://pulse-grid-arcade.onrender.com'+route+'</loc>'),'missing sitemap route '+route);
}
assert.match(fs.readFileSync('pulse-grid/robots.txt','utf8'),/Sitemap:/,'robots lists sitemap');
const manifest=JSON.parse(fs.readFileSync('pulse-grid/manifest.webmanifest','utf8'));
assert.equal(manifest.start_url,'/','PWA opens to playable game');
new vm.Script(fs.readFileSync('pulse-grid/sw.js','utf8'),{filename:'sw.js'});
console.log('PASS navigation, assets, payment labeling, link safety, sitemap, PWA structure');
console.log('All PULSE ARCADE structural checks passed; parsed',passed,'inline scripts.');
await import('./runtime-smoke.mjs');
