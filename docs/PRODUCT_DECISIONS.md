# Amulbot product and technical decisions

This is the living decision record for Amulbot. It is written for future product work and for explaining the project honestly in launch posts, blog posts, and LinkedIn updates.

## What we are building

Amulbot is an independent, pincode-level restock radar for hard-to-find Amul protein products. It helps a buyer catch a short restock window; it does not promise stock, reserve products, or place orders.

## Positioning

**Know when your protein is actually available — at your pincode, before your stash runs out.**

Alerts are table stakes. The differentiator is reliable, transparent availability data: when we checked, what we observed, and whether people report catching the drop.

## Product principles

1. **Trust before growth.** An automation failure is `unknown`, never `out of stock`.
2. **Pincode-specific by design.** Amul availability differs by delivery location.
3. **Useful even between drops.** The Stockboard and historical availability create value without sending more notifications.
4. **Fun, never manipulative.** Celebrate self-reported catches; do not use false urgency, purchase streaks, or scarcity theatre.
5. **Privacy-minimal.** We store a Telegram chat ID and pincode for an active alert. Exact pincodes are never published.
6. **Independent and transparent.** We are not affiliated with Amul and show monitoring freshness/status.
7. **Fair access, not fandom.** We are on the shopper's side against uncertainty; we do not manufacture urgency, encourage hoarding, or claim special access.

## Evidence that shaped the product

- Drops can disappear in minutes, making a direct buy link and fresh confirmation more useful than a generic notification. [Community example](https://www.reddit.com/r/amulisinstock/comments/1mpvhn7)
- Shoppers report missed or unreliable official/third-party alerts, making worker health and `last checked` data part of the product. [Community example](https://www.reddit.com/r/amulisinstock/comments/1uamg85)
- Existing tools already offer Telegram, email, or web push; channels alone are not the moat. [Community example](https://www.reddit.com/r/amulisinstock/comments/1uv8net/)

## Phased roadmap

### Phase 0 — reliability foundation

- Dynamic monitoring targets: active/pending alerts determine which pincode/SKU pairs are checked.
- Current state plus append-only observation history.
- `available`, `unavailable`, and `unknown` semantics.
- Worker run health and a visible freshness signal.
- Recheck an apparent restock before alerting.
- Expire abandoned pending alert links and provide Telegram alert-management commands.

### Phase 1 — trustworthy public beta

- Three whey SKUs only.
- Pincode Stockboard with last checked time and seven recent observations.
- Fast Telegram buy alert with a direct product link.
- `Caught it`, `Missed it`, and `Stock was wrong` feedback.
- City/region-level, anonymous catch activity and a share action.

**Implementation note (July 2026):** Telegram catch feedback and an anonymous recent-catches feed are the first Phase 1 pieces. Feedback stores the outcome, SKU, and pincode needed to improve the product, but never publishes a user identity or exact pincode.

### Phase 2 — public Stockboard growth

- Shareable, city-level views and SEO-friendly SKU pages.
- Recent availability heartbeat, observed restock duration, and reliability page.

### Phase 3 — Restock Radar

- Historical watch windows and observed duration only after enough data exists.
- Never promise a restock time or label a weak pattern as a prediction.

### Phase 4 — Catch Club

- First-catch milestones, restrained share cards, weekly Protein Signal recap, and Protein Weather.
- Reward useful reports, not purchase volume.

## Explicit non-goals

- Auto-order, checkout automation, or collecting Amul credentials/payment details.
- A paid VIP/scalping layer.
- Publishing exact pincode-level availability publicly.
- Nutrition, medical, food-safety, or product-quality advice.
- A standalone community/forum before the data product is valuable.

## Technical decisions

| Decision | Choice | Why |
| --- | --- | --- |
| Web app | Next.js on Vercel | Simple public product surface and fast iteration. |
| Durable data | Dedicated `amulbot` schema in shared Supabase project | Keeps this side project isolated from other projects. |
| Monitoring | Playwright in GitHub Actions, triggered by Supabase cron | Browser automation is required; cron dispatch provides a second scheduling path. |
| Notifications | Telegram first | Fast, low-cost, and already validated. |
| Backend boundary | Supabase Edge Functions | Keeps service credentials out of the browser and encapsulates public/worker APIs. |
| Availability model | Latest state + append-only observations | Supports fast alerts now and honest history/Radar later. |
| Failure model | `unknown` is distinct from `unavailable` | Avoids false stock conclusions when the retailer changes or blocks the site. |

## Measures we will track

- Worker run success rate and freshness.
- Detection-to-alert latency.
- User-reported false-stock rate.
- Alert click/open rate.
- Confirmed catch rate and weekly confirmed catches.
- Website-to-Telegram activation rate.
- Organic shares and Stockboard revisit rate.

## Copy guardrails

Say “availability observed at [time]” and “last checked [time]”, not “guaranteed in stock” or “real-time.” Clearly label catches as self-reported. Be playful about the hunt, never about health outcomes or panic buying.

The community is pragmatic rather than a brand cult: affordable protein, short restock windows, and unreliable official alerts create a useful mutual-aid network. Use simple, warm copy such as “Your pincode. Your protein signal.” and “We watch the store. You decide when to buy.” Avoid “VIP,” “exclusive,” “beat everyone,” invented countdowns, or bulk-buying celebration.
