# PULSE GRID — Y8 isolated submission build (NOT SUBMITTED)

Source snapshot: `48613fb808a44f276427207309d9f22cdc411993`. This folder is a separate platform-specific review build and is **not** the public Render site. It intentionally removes PayPal buttons, off-site sales links and external social-share links while keeping browser gameplay, local scores, sound opt-in, hold and daily challenge. It loads the official Y8 JavaScript SDK asynchronously, with the documented ready-event race safeguard. Original game remains on the hypergrid-commercial branch.

## Required before release
1. **Account action**: The developer must log in to https://developer.y8.com/, create or use one genuine studio and create PULSE GRID in the developer dashboard. This produces an **App ID** and (if enabling ads) a **Game ID**; no IDs have been fabricated.
2. Replace empty `window.PULSE_Y8_APP_ID` and `window.PULSE_Y8_GAME_ID` in this folder's `index.html` with values from that account. Do **not** integrate on the public main game or reuse unrelated project IDs.
3. Test desktop/mobile gameplay, replays, sound, pause, ad no-fill and ad view/return, and verify SDK initialization and the ad report inside Y8's own test/review tools. Interstitials are only requested after a round ends; never interrupt active play.
4. Run actual browser smoke tests and prepare a ZIP with **this index.html at the archive root**. This staging file is not itself an uploaded release or proof of ads, traffic or revenue.
5. Read and accept Y8's terms yourself, submit through the developer portal, and verify approval. Never grant rights, post to Y8, or represent a live payout before this is done.
6. The Y8 developer-support reply dated 2026-11-11 explicitly says PayPal payouts include Israel, but revenue still requires approval, eligible ad delivery and the payout threshold.

## Official references
- https://docs.y8.com/sdk/intro/
- https://docs.y8.com/sdk/advertising/
- https://developer.y8.com/

This preparation is separate from RE:GENESIS. Do not publish, license or upload the full historical Pegasus repository. It is not proof of a completed integration without IDs.
