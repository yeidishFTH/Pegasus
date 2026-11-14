AFTERSHOCK / AFTERSHOCK FOUNDRY — browser release notes
Last verified in source: 2026-11-14

CURRENT PUBLISHER DEMO (FOUNDRY)
- Main playable URL: https://pulse-grid-arcade.onrender.com/aftershock/foundry.html?lang=en
- Publisher evaluation: https://pulse-grid-arcade.onrender.com/aftershock/studio.html
- Entry file: foundry.html. Standalone six-room physics game. No installation, account, build step, remote runtime asset or advertising SDK required.
- Choose room in-game, or use ?room=1 through ?room=6 in the standalone demo.
- The publisher's embedded iframe uses ?preview=1 for its preview-only entry experience. This flag is not a license or permission to re-host the file.
- Three playable bodies: PIP spring, BOLT steel, FLUX magnet. Launch by pulling back and releasing; swap bodies and interact with weights, bridges, glass, conveyors and dominoes.
- Keyboard: arrows to aim, Space to launch, number keys 1/2/3 for bodies, E for magnet pulse, Q for pull/push, Z for undo, R to restart, Escape to pause. Touch/mouse gestures are supported.
- English and Hebrew, optional synthesized audio, local progress and reduced-motion preferences. No mandatory payment and no player account.

OLDER MODULAR PROTOTYPE (SEPARATE)
- index.html + engine.js + scene.js + app.js + style.css are an earlier FOUR-room variant with different physics and visuals. Do not substitute this for the six-room FOUNDRY publisher demo.
- The original deterministic tests in qa-core.cjs apply to that four-room modular prototype, not to all six rooms in foundry.html.

VERIFICATION
- node qa-foundry.cjs: extracts the REAL standalone foundry.html physics model and exercises six-room content, launch validation, finite-state stability, independent snapshots, magnetic switch/bridge activation, conveyor force and physically propagated domino chain / gate relay.
- node qa-core.cjs: checks the separate earlier modular four-room engine including real launch routes for rooms 1–4.
- GitHub Actions pulse-arcade.yml runs both test suites. Passing checks do not establish that every puzzle solution works on every device.
- No claim of a full physical-device matrix or live-browser/WebGL certification is made. Individual publisher SDKs, network ad integrations and platform-specific telemetry have not been authorized or enabled in this public demo.

COMMERCIAL STATUS AND RIGHTS
- Free browser evaluation does NOT grant hosting, mirroring, monetization, sublicensing, source-code ownership, exclusivity or redistribution rights. The six-room publisher pilot shown on the site is only a proposed offer, not an accepted contract or automatic checkout.
- Usage rights, permitted domains, duration, files, third-party rights, AI-assisted provenance, price and delivery must be confirmed in writing BEFORE payment; only the agreed transferable title-specific materials can be supplied after successful payment is verified in the developer's own account.
- The game was created with substantial AI assistance. No blanket guarantee of exclusive rights over AI-generated content, or of verified sales, traffic, external acceptance or payouts.
- Never sell or disclose unrelated Pegasus repository files, GitHub access, developer accounts, credentials, or RE:GENESIS.
- Commercial inquiry: https://pulse-grid-arcade.onrender.com/license-order.html?offer=aftershock
