# PULSE GRID — Playgama isolated QA build (NOT SUBMITTED)

Source: hypergrid-commercial, HTML blob 026c1b4a9383d6e4cb5a75bff98a3bb93af091ba, 11 Nov 2026. Production Render and RE:GENESIS are untouched.

Bridge v2 loads before the game, initialization and batched Bridge storage.get precede gameplay, scores write via Bridge storage.set only. Platform pause/audio changes are handled; original optional audio defaults off. The game announces game_ready after its first drawn screen; interstitial is requested at game over only, with the Bridge SDK's delay handling. The distributor copy removes offsite links, PayPal, licensing CTAs, social links and service worker registration.

**QA and account gates not yet met:** No developer account, accepted contract, real browser test, Playgama QA report, ZIP submission, partner approval or payout proof. Before submission test fullscreen/no-scroll mobile layout, resizing/orientation, audio after ads/tab changes, SDK no-fill and platform ad handling, one-thumb controls, persistence, SDK events, network loading, and English locale fallback. Declare only English as supported. Prepare root-level index.html + game.js + playgama-bridge-config.json archive (no Pegasus repository or unrelated IP). Playgama contact confirmed AI-assisted games are reviewable, not automatically accepted; Israel payment confirmation remains outstanding.

Official references: https://wiki.playgama.com/playgama/bridge-sdk/api ; https://wiki.playgama.com/playgama/bridge-sdk/setup ; https://wiki.playgama.com/playgama/bridge-sdk/config ; https://wiki.playgama.com/playgama/game-requirements/technical-requirements ; https://developer.playgama.com/ .

## Newly verified moderation blockers (12 Nov 2026)

Official game self-check and 3.3.1–3.3.2 explicitly require **background music and high-quality action/UI sound effects shipped as compressed MP3 or OGG assets**. The current code-only Web Audio tones are **not accepted**. Do **not** submit this build as if it passed audio QA; replace the tone synthesis with properly licensed original audio assets, then verify mute, tab switching, and ad sound lifecycle. Also verify the artwork has substantial human visual refinement rather than a default AI-generated template (content rule 4.3). Emoji used as interface icons were removed from this isolated staging copy. Bridge `level_started`, `level_failed`, `level_paused`, `level_resumed` events were added to the gameplay start/failure/pause lifecycle. All these changes remain staging-only.

References: https://wiki.playgama.com/playgama/game-requirements/user-experience-requirements ; https://wiki.playgama.com/playgama/game-requirements/content-requirements ; https://wiki.playgama.com/playgama/game-requirements/game-self-check ; https://wiki.playgama.com/playgama/bridge-sdk/api/platform .
