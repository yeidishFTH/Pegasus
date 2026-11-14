// Checkout regression coverage: no external payment request or email is sent.
// This browser mock executes the actual inquiry-form script and checks offer gating.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const html = fs.readFileSync('pulse-grid/license-order.html', 'utf8');
const matches = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)];
assert.equal(matches.length, 1, 'The commercial inquiry page should have one inline script');
const script = new vm.Script(matches[0][1], { filename: 'license-order.html' });

function browserFor(offer) {
  const nodes = new Map();
  const calls = {};
  let chosen = 'pilot';
  function node(id) {
    if (!nodes.has(id)) nodes.set(id, {
      id, value: '', hidden: false, required: id === 'site', disabled: false,
      textContent: '', addEventListener(event, fn) { calls[id + ':' + event] = fn; }
    });
    return nodes.get(id);
  }
  const form = {
    querySelector(query) {
      if (query === 'input[name=offer]:checked') return { value: chosen };
      const found = query.match(/^input\[name=offer\]\[value="(\w+)"\]$/);
      if (!found) throw new Error('Unexpected selector: ' + query);
      return { set checked(value) { if (value) chosen = found[1]; } };
    },
    querySelectorAll(query) {
      assert.equal(query, 'input[name=offer]');
      return [{ addEventListener() {} }];
    },
    addEventListener(event, fn) { calls['form:' + event] = fn; },
    reportValidity() {
      if (!node('contact').value.trim()) return false;
      if (node('site').required && !node('site').value.trim()) return false;
      if (node('sourceTitle').required && !node('sourceTitle').value) return false;
      return true;
    }
  };
  const document = { getElementById(id) { return id === 'order' ? form : node(id); } };
  const window = { location: { search: '?offer=' + offer, href: '' },
    open(url) { calls.openedUrl = url; } };
  node('contact').value = 'buyer@example.com';
  node('notes').value = 'Please confirm the exact scope';
  node('sourceTitle').value = 'PULSE ORBIT';
  const clipboard = { async writeText(value) { calls.copiedText = value; } };
  script.runInNewContext({ document, window, navigator: { clipboard },
    URLSearchParams, encodeURIComponent }, { timeout: 1500 });
  return { node, form, calls, chosen: () => chosen };
}

const source = browserFor('source');
assert.equal(source.chosen(), 'source');
assert.equal(source.node('site').required, false, 'Individual source buyers must not need a company website');
assert.equal(source.node('siteRequiredMarker').hidden, true);
assert.equal(source.node('sourceTitle').required, true, 'Source buyer must select one game');
assert.equal(source.node('approved-source-payment').hidden, false);
assert.equal(source.node('approved-aftershock-payment').hidden, true);
assert.equal(source.node('fast-checkout').hidden, true);
await source.calls['copy:click']();
assert.match(source.calls.copiedText, /PULSE ORBIT/);
assert.match(source.calls.copiedText, /Individual buyer \(website not provided\)/);
assert.match(source.calls.copiedText, /buyer@example\.com/);

const aftershock = browserFor('aftershock');
aftershock.node('site').value = 'publisher.example';
assert.equal(aftershock.node('site').required, true);
assert.equal(aftershock.node('approved-aftershock-payment').hidden, false);
assert.equal(aftershock.node('approved-source-payment').hidden, true);
assert.equal(aftershock.node('fast-checkout').hidden, true);
await aftershock.calls['copy:click']();
assert.match(aftershock.calls.copiedText, /AFTERSHOCK FOUNDRY/);
assert.match(aftershock.calls.copiedText, /USD 19/);
assert.match(aftershock.calls.copiedText, /publisher\.example/);

const pilot = browserFor('pilot');
assert.equal(pilot.node('site').required, true, 'Domain-based placement requires a site or organization');
assert.equal(pilot.node('approved-pilot-payment').hidden, false);
assert.equal(pilot.node('fast-checkout').hidden, false);
assert.equal(pilot.node('approved-source-payment').hidden, true);

assert.match(html, /paypal\.me\/DANEFFRIMK\/19USD/);
assert.match(html, /paypal\.me\/DANEFFRIMK\/35USD/);
assert.match(html, /paypal\.me\/DANEFFRIMK\/9USD/);
assert.match(html, /Do not send money before your written terms are confirmed/);
console.log('PASS commercial inquiry offer selection, individual buyers, payment labels, and email-copy fallbacks');
