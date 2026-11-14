(function (win, doc) {
  "use strict";
  // Isolated Y8 staging adapter. A real App ID + Game ID must come from the
  // owner's own Y8 Developer Portal before any Y8 request can start.
  const tag = doc.currentScript;
  const appId = tag && tag.dataset ? (tag.dataset.appId || "").trim() : "";
  const gameId = tag && tag.dataset ? (tag.dataset.gameId || "").trim() : "";
  let sdk = null;
  let initialized = false;
  let attempted = false;
  let adPending = false;

  function initializeOnce() {
    if (attempted || !appId || !gameId || !win.y8 || typeof win.y8.sdk !== "function") return;
    attempted = true;
    try {
      sdk = win.y8.sdk();
      if (!sdk || typeof sdk.init !== "function") return;
      // No auto-login, trackers or ads before the owner adds real portal IDs.
      sdk.init({ appId: appId, autoLogin: false }, {
        gameId: gameId,
        preloadAdBreaks: "on",
        sound: "off",
        onReady: function () { initialized = true; }
      });
      // Managed Partnership builds may not invoke the AFP-specific onReady.
      initialized = true;
    } catch (error) {
      sdk = null;
      initialized = false;
    }
  }

  function showAfterRound() {
    // Only at the natural GAME OVER boundary; gameplay starts immediately.
    // A capped/unavailable ad will never pause gameplay.
    if (!initialized || !sdk || adPending || typeof sdk.showAd !== "function") {
      return Promise.resolve(false);
    }
    adPending = true;
    try {
      return Promise.resolve(sdk.showAd({
        type: "next",
        name: "round-complete",
        beforeAd: function () { /* Game loop has already ended naturally. */ },
        afterAd: function () { /* The play-again button remains available. */ }
      })).then(function () { return true; }, function () { return false; })
        .finally(function () { adPending = false; });
    } catch (error) {
      adPending = false;
      return Promise.resolve(false);
    }
  }

  win.PulseGridY8Bridge = {
    enabled: !!(appId && gameId),
    ready: function () { return initialized; },
    showAfterRound: showAfterRound
  };

  // An incomplete staging build never loads third-party code or ads.
  if (!appId || !gameId) return;
  win.addEventListener("y8sdk.ready", initializeOnce, { once: true });
  const external = doc.createElement("script");
  external.src = "https://cdn.y8.com/minimal-sdk/2-0/y8.min.js";
  external.async = true;
  external.onerror = function () { initialized = false; };
  (doc.head || doc.documentElement).appendChild(external);
  if (win.y8 && typeof win.y8.emitReadyEvent === "function") {
    win.y8.emitReadyEvent();
  }
})(window, document);
