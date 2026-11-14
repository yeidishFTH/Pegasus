import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const js = readFileSync(join(here, "..", "y8-bridge.js"), "utf8");

function makePage(appId = "", gameId = "") {
  const listeners = {};
  const appended = [];
  const doc = {
    currentScript: { dataset: { appId, gameId } },
    createElement: () => ({}),
    head: { appendChild: (el) => appended.push(el) }
  };
  const win = {
    addEventListener: (name, fn) => { listeners[name] = fn; }
  };
  runInNewContext(js, { window: win, document: doc, Promise });
  return { win, doc, listeners, appended };
}

const publicPage = makePage();
assert.equal(publicPage.win.PulseGridY8Bridge.enabled, false);
assert.equal(publicPage.appended.length, 0, "No SDK or ads without credentials");
assert.equal(await publicPage.win.PulseGridY8Bridge.showAfterRound(), false);

const stage = makePage("test-app", "test-game");
assert.equal(stage.win.PulseGridY8Bridge.enabled, true);
assert.equal(stage.appended.length, 1, "SDK loads only for configured builds");
assert.equal(stage.appended[0].src, "https://cdn.y8.com/minimal-sdk/2-0/y8.min.js");
let inits = 0, shows = 0, calls = [];
const sdk = {
  init: (app, ad) => {
    inits++;
    assert.equal(app.appId, "test-app");
    assert.equal(app.autoLogin, false);
    assert.equal(ad.gameId, "test-game");
    assert.equal(ad.sound, "off");
  },
  showAd: (config) => { shows++; calls.push(config); return Promise.resolve({ breakStatus: "shown" }); }
};
stage.win.y8 = { sdk: () => sdk };
stage.listeners["y8sdk.ready"]();
stage.listeners["y8sdk.ready"](); // Duplicate ready event cannot initialize twice
assert.equal(inits, 1);
assert.equal(stage.win.PulseGridY8Bridge.ready(), true);
assert.equal(await stage.win.PulseGridY8Bridge.showAfterRound(), true);
assert.equal(shows, 1);
assert.equal(calls[0].type, "next");
assert.equal(calls[0].name, "round-complete");

sdk.showAd = () => Promise.reject(new Error("frequency-capped"));
assert.equal(await stage.win.PulseGridY8Bridge.showAfterRound(), false,
  "A capped ad must fail open rather than strand the user");
sdk.showAd = () => { throw new Error("SDK unavailable"); };
assert.equal(await stage.win.PulseGridY8Bridge.showAfterRound(), false);

console.log("Y8 staging bridge smoke: 12 assertions PASS");
