# PULSE GRID — Y8 isolated monetization staging

This branch is an experimental, **unpublished** Y8 integration. It does not grant Y8 any rights, create an account, switch on ads, or alter the production `hypergrid-commercial` branch.

## What is implemented

- `pulse-grid/y8-bridge.js`: loads the official Y8 SDK **only** if both portal-issued IDs are configured.
- `pulse-grid/index.html`: invokes a `next` ad request at the natural game-over boundary, not mid-play. With blank IDs it remains the regular free-to-play puzzle.
- `pulse-grid/tests/y8-bridge-smoke.mjs`: offline checks for the credential gate, initialization only once, appropriate placement, and safe handling of capped or unavailable ads.
- `.github/workflows/pulse-grid-y8-bridge-smoke.yml`: isolated staging QA.

## What is still needed before any real Y8 monetization

1. **Owner action:** create/confirm a developer account, Studio and a PULSE GRID game in the official portal (https://developer.y8.com/). This requires agreement to Y8 terms, which must not be fabricated or accepted by an assistant.
2. Copy **App ID** and **Game ID** from the game's SDK Initialization tab. Populate the two blank `data-app-id` and `data-game-id` attributes on the staging HTML script, without committing private account secrets. Y8 calls these identifiers part of the client SDK configuration, but still obtain the genuine values.
3. Upload a clean, rights-reviewed ZIP through the Y8 portal; complete platform technical requirements and review. The existing public game was not submitted from this branch.
4. Test real SDK initialization and draft ads in Y8's hosted review context, including any callback semantics required by the actual partnership mode. **Offline smoke tests are not proof of live integration.**
5. Confirm eligibility, payout/invoice requirements, actual revenue terms and tax details before claiming income.

The public PULSE GRID site remains fully free without interstitials. Only in an explicitly configured Y8 build is a post-round ad attempted, and an unavailable, frequency-capped or rejected ad does not block gameplay. No rewarded in-game advantage is offered.

Official documentation: https://docs.y8.com/sdk/intro/ · https://docs.y8.com/sdk/advertising/ · https://docs.y8.com/studio/overview/

No approval, sale, payment, account access or publication is implied by these commits.
