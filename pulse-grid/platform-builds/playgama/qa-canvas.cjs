// Run: node qa-canvas.cjs
// Test the actual drawing helper from game.js without a full browser runtime.
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, 'game.js'), 'utf8');
const line = source.split('\n').find(s => s.startsWith('function rounded('));
assert.ok(line, 'rounded helper must exist');
assert.doesNotMatch(source, /\.replaceAll\(/, 'avoid replaceAll for older Safari');
function fakeCanvas(hasRoundRect) {
  const calls = [];
  const ctx = {};
  for (const name of ['beginPath', 'moveTo', 'lineTo', 'quadraticCurveTo', 'closePath', 'fill']) {
    ctx[name] = (...args) => calls.push([name, ...args]);
  }
  if (hasRoundRect) ctx.roundRect = (...args) => calls.push(['roundRect', ...args]);
  return { ctx, calls };
}
for (const supported of [true, false]) {
  const { ctx, calls } = fakeCanvas(supported);
  vm.runInNewContext(line + '\nrounded(g,2,4,32,5);', { g: ctx }, { timeout: 500 });
  assert.equal(calls[0][0], 'beginPath');
  assert.equal(calls.at(-1)[0], 'fill');
  if (supported) {
    assert.equal(calls.filter(c => c[0] === 'roundRect').length, 1);
    assert.equal(calls.filter(c => c[0] === 'quadraticCurveTo').length, 0);
  } else {
    assert.equal(calls.filter(c => c[0] === 'quadraticCurveTo').length, 4);
    assert.equal(calls.filter(c => c[0] === 'closePath').length, 1);
    assert.equal(calls.filter(c => c[0] === 'roundRect').length, 0);
  }
}
console.log('PASS: canvas path on modern and legacy browsers; no replaceAll');
