// Dependency-free browser-game regression tests executed in Node.js via VM.
// Canvas, animation frames, and browser storage are stubbed: no network, secrets,
// payment requests, or real browser are involved.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

function createBrowser(file) {
  const html = fs.readFileSync(file, 'utf8');
  const scripts = [...html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/gi)]
    .filter(match => !/application\/ld\+json/i.test(match[1]) && !/src\s*=/i.test(match[1]))
    .map(match => match[2]);
  assert.equal(scripts.length, 1, file + ': expected one inline game script');

  const ctx = new Proxy({}, {
    get(target, key) {
      if (Object.prototype.hasOwnProperty.call(target, key)) return target[key];
      if (key === 'createRadialGradient' || key === 'createLinearGradient') {
        return () => ({addColorStop() {}});
      }
      return () => {};
    },
    set(target, key, value) { target[key] = value; return true; }
  });
  const elements = new Map();
  function element(id) {
    if (!elements.has(id)) elements.set(id, {
      id, hidden: false, textContent: '', innerHTML: '', className: '',
      style: {setProperty() {}}, offsetWidth: 5, clientWidth: 350,
      classList: {add() {}, remove() {}},
      children: [],
      appendChild(child) { this.children.push(child); },
      remove() {},
      getContext() { return ctx; },
      addEventListener() {},
      setAttribute(name, value) { (this.attributes ??= {})[name] = String(value); },
      getAttribute(name) { return this.attributes?.[name] ?? null; },
      removeAttribute(name) { if(this.attributes) delete this.attributes[name]; },
      setPointerCapture() {}
    });
    return elements.get(id);
  }
  const listeners = new Map();
  const document = {
    hidden: false,
    getElementById: element,
    createElement: () => element('mock-' + (elements.size + 1)),
    addEventListener(name, callback) { listeners.set(name, callback); }
  };
  // Simulate a user with local storage blocked, not just an empty store.
  const window = {
    get localStorage() { throw new Error('localStorage disabled by browser'); },
    matchMedia() { return {matches: true}; },
    addEventListener() {}
  };
  let raf = 0;
  const browser = {
    document, window, navigator: {}, URL, URLSearchParams,
    location: {href: 'https://pulse-grid-arcade.onrender.com/', search: ''},
    performance: {now: () => 1000}, requestAnimationFrame: () => ++raf,
    cancelAnimationFrame() {}, setTimeout: () => 1, clearTimeout() {},
    console
  };
  const context = vm.createContext(browser);
  for (const script of scripts) vm.runInContext(script, context, {timeout: 1200});
  const evaluate = expr => vm.runInContext(expr, context, {timeout: 1200});
  return {evaluate, element, document, listeners};
}

const grid = createBrowser('pulse-grid/index.html');
assert.equal(grid.evaluate('active'), false, 'PULSE GRID must initially be ready');
grid.evaluate('start(false)');
assert.equal(grid.evaluate('active'), true, 'PULSE GRID starts on blocked storage');
assert.equal(grid.evaluate('grid.length'), 20, 'PULSE GRID board height');
grid.evaluate('drop()');
assert.ok(grid.evaluate('score') > 0, 'hard drop scores points');
assert.ok(grid.evaluate('grid.flat().some(cell=>cell>=0)'), 'hard drop locks blocks');
grid.evaluate('pause()');
assert.equal(grid.evaluate('paused'), true, 'PULSE GRID pause works');
grid.evaluate('start(true)');
const firstDaily = Array.from(grid.evaluate('[cur.k,next.k]'));
grid.evaluate('start(true)');
const secondDaily = Array.from(grid.evaluate('[cur.k,next.k]'));
assert.deepEqual(firstDaily, secondDaily, 'daily seed produces repeatable opening pieces');
grid.document.hidden = true;
grid.listeners.get('visibilitychange')();
assert.equal(grid.evaluate('paused'), true, 'PULSE GRID pauses when hidden');
grid.evaluate('end()');
assert.equal(grid.element('supportOverlay').hidden, false, 'optional PayPal CTA shown after game over');
console.log('PASS PULSE GRID runtime: start, drop, scoring, hold-ready UI, pause, daily seed, privacy mode, game-over');

const orbit = createBrowser('pulse-grid/orbit.html');
assert.equal(orbit.evaluate('state'), 'ready', 'PULSE ORBIT initial state');
orbit.evaluate('start()');
assert.equal(orbit.evaluate('state'), 'play', 'PULSE ORBIT starts with blocked storage');
orbit.evaluate('move(1)');
assert.equal(orbit.evaluate('lane'), 2, 'PULSE ORBIT lane movement');
orbit.evaluate('update(0.04)');
assert.ok(orbit.evaluate('points') > 0, 'PULSE ORBIT score increases');
orbit.document.hidden = true;
orbit.listeners.get('visibilitychange')();
assert.equal(orbit.evaluate('state'), 'pause', 'PULSE ORBIT pauses on hidden tab');
orbit.evaluate('end()');
assert.equal(orbit.evaluate('state'), 'over', 'PULSE ORBIT game over');
assert.equal(orbit.element('shareEnd').hidden, false, 'PULSE ORBIT share is available after game over');
console.log('PASS PULSE ORBIT runtime: start, lane, score, pause, privacy mode, game-over');

console.log('All PULSE ARCADE browser-game runtime smoke tests passed.');
