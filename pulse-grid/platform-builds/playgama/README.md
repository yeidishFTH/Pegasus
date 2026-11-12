# PULSE GRID — Playgama isolated QA build (NOT SUBMITTED)

Source: hypergrid-commercial, HTML blob 026c1b4a9383d6e4cb5a75bff98a3bb93af091ba, 11 Nov 2026. Production Render and RE:GENESIS are untouched.

Bridge v2 loads before the game, initialization and batched Bridge storage.get precede gameplay, scores write via Bridge storage.set only. Platform pause/audio changes are handled; original optional audio defaults off. The game announces game_ready after its first drawn screen; interstitial is requested at game over only, with the Bridge SDK's delay handling. The distributor copy removes offsite links, PayPal, licensing CTAs, social links and service worker registration.

**QA and account gates not yet met:** No developer account, accepted contract, real browser test, Playgama QA report, ZIP submission, partner approval or payout proof. Before submission test fullscreen/no-scroll mobile layout, resizing/orientation, audio after ads/tab changes, SDK no-fill and platform ad handling, one-thumb controls, persistence, SDK events, network loading, and English locale fallback. Declare only English as supported. Prepare root-level index.html + game.js + playgama-bridge-config.json archive (no Pegasus repository or unrelated IP). Playgama contact confirmed AI-assisted games are reviewable, not automatically accepted; Israel payment confirmation remains outstanding.

Official references: https://wiki.playgama.com/playgama/bridge-sdk/api ; https://wiki.playgama.com/playgama/bridge-sdk/setup ; https://wiki.playgama.com/playgama/bridge-sdk/config ; https://wiki.playgama.com/playgama/game-requirements/technical-requirements ; https://developer.playgama.com/ .

## Newly verified moderation blockers (12 Nov 2026)

Official game self-check and 3.3.1–3.3.2 explicitly require **background music and high-quality action/UI sound effects shipped as compressed MP3 or OGG assets**. The original code-only Web Audio tones were a moderation blocker; a replacement is now staged but not browser-tested. Do **not** submit this build as if it passed audio QA; replace the tone synthesis with properly licensed original audio assets, then verify mute, tab switching, and ad sound lifecycle. Also verify the artwork has substantial human visual refinement rather than a default AI-generated template (content rule 4.3). Emoji used as interface icons were removed from this isolated staging copy. Bridge `level_started`, `level_failed`, `level_paused`, `level_resumed` events were added to the gameplay start/failure/pause lifecycle. All these changes remain staging-only.

References: https://wiki.playgama.com/playgama/game-requirements/user-experience-requirements ; https://wiki.playgama.com/playgama/game-requirements/content-requirements ; https://wiki.playgama.com/playgama/game-requirements/game-self-check ; https://wiki.playgama.com/playgama/bridge-sdk/api/platform .

## Staged CC0 OGG recordings (12 November 2026; NOT SUBMITTED)

Runtime oscillator tones have been replaced with six **Kenney Interface Sounds** OGG recordings for rotating, landing, hold, starting, line clearing and game over, plus the CC0 background music **qubodup / Two Simple Game Music Loops**. Source and licensing:

- Kenney, https://kenney.nl/assets/interface-sounds , CC0 1.0, mirrored at https://github.com/GeorgeQLe/assets-sfx-ui under `assets/kenney/interface-sounds/Audio/`; attribution optional.
- qubodup's `menumusicloop-tiggo.ogg` is mirrored as `music-loop.ogg` at https://github.com/blancmathis/Super_Bash_Folds/tree/main/public/assets/audio/open/music ; the mirror records CC0 and upstream details in `public/assets/audio/LICENSES.md`.

All audio is included in `audio/` and must be included alongside `index.html` and `game.js` in the distributor ZIP; it is never streamed from external hosts. Music and effects start only after the player's SOUND ON choice and pause on user/game/platform mute, ad interruption and browser backgrounding. **Not yet browser or mobile tested:** check sound levels, music loops, iOS/Safari OGG playback, host mute and ad lifecycle, visuals, gameplay, SDK events, ZIP structure and moderation. No Playgama submission or approval has occurred.
