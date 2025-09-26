# 🧭 Phase 3 — Technical Implementation Scope (Medusa v2)

> Cross‑reference of Step 2 technical features against Medusa v2 native modules, official/community OSS plugins, and custom work. Use as a build sheet across stores.

Legend: **Status** → N (Native), O (Official plugin/guide), C (Community plugin), X (Custom).
Tracks: **Modules/Plugins**, **Core Tasks**, **APIs/Workflows**, **Data/Schema**, **BG Jobs**, **UI Notes**, **Effort** (S/M/L).

---

## 🔎 Product Discovery

### Search (typeahead + full‑text)

* **Status:** C (Meilisearch plugin)
* **Modules/Plugins:** `medusa-plugin-meilisearch` (OSS community plugin). Provides indexing + search endpoints.
* **Core Tasks:** Catalog → index sync; suggest endpoint; debounce; zero‑results handling.
* **APIs/Workflows:** `/search?q=`, `/search/suggest?q=`; webhook or queue‑driven reindex on product/price/inventory change.
* **Data/Schema:** `search_index(doc)`, synonyms/stopwords; per‑channel visibility fields.
* **BG Jobs:** Reindex on product.created/updated, price\_list.updated, inventory.updated.
* **UI Notes:** Debounced input, recent/popular searches, empty states.
* **Effort:** S (with Meilisearch plugin).

### Faceted Filters & Sorting

* **Status:** N/O
* **Modules/Plugins:** Catalog, Pricing, Sales Channel modules.
* **Core Tasks:** Query builder with facets; stable shareable URLs.
* **APIs/Workflows:** `/products?filters=&sort=&page=` (channel/currency aware).
* **Data/Schema:** Facet definitions, attribute values, price ranges.
* **BG Jobs:** Optional facet materialization for speed.
* **UI Notes:** Chips, range slider, clear‑all.
* **Effort:** S.

### Categories & Collections

* **Status:** N
* **Modules/Plugins:** Category/Collection modules (core) + Workflows.
* **Core Tasks:** CRUD, rule‑based collections (e.g., new arrivals), SEO pages.
* **APIs/Workflows:** `/categories/tree`, `/collections/:slug`.
* **Data/Schema:** Hierarchical `category`; rule‑based `collection`.
* **BG Jobs:** Rule evaluation materializer.
* **UI Notes:** Breadcrumbs, landing pages.
* **Effort:** S.

---

## 🛍️ Merchandising

### Best Sellers / Top Rated / Featured

* **Status:** X (scoring) + O (analytics export)
* **Modules/Plugins:** Orders + custom scoring service; optional analytics sink.
* **Core Tasks:** Rolling sales windows, decay, ratings aggregate.
* **APIs/Workflows:** `/merch/:block_key` with rule params.
* **Data/Schema:** `merch_block`, product score table/materialized view.
* **BG Jobs:** Nightly recompute; incremental on order.complete.
* **UI Notes:** Reusable grid components.
* **Effort:** M.

### On‑Sale / Clearance

* **Status:** N/O
* **Modules/Plugins:** Pricing Module, Promotion Module.
* **Core Tasks:** Price lists, compare\_at, campaign windows.
* **APIs/Workflows:** `/products?on_sale=true`.
* **Data/Schema:** `price_list`, `promotion`, `campaign`.
* **BG Jobs:** Activate/deactivate, cache bust.
* **Effort:** S.

### Bundles / FBT

* **Status:** X
* **Modules/Plugins:** Custom bundle module; optional association mining job.
* **Core Tasks:** Bundle composition, price mode, availability.
* **APIs/Workflows:** `/bundles/:id`, `/products/:id/fbt`.
* **Data/Schema:** `bundle`, `bundle_item`, `association_graph`.
* **BG Jobs:** Basket analysis refresh.
* **Effort:** M.

### Upsell / Cross‑Sell

* **Status:** X (rules) / O (recommendations via events)
* **Modules/Plugins:** Custom rules engine or reuse Promotion conditions.
* **Core Tasks:** Contextual recommendations (PDP/Cart/Category).
* **APIs/Workflows:** `/recommendations?context=`.
* **Effort:** S‑M.

### Back‑in‑Stock

* **Status:** X
* **Modules/Plugins:** Inventory + Notifications provider.
* **Core Tasks:** Subscribe per SKU; trigger on threshold.
* **APIs/Workflows:** `/stock/subscribe`, webhook/queue → email/SMS.
* **Data/Schema:** `stock_subscription`.
* **Effort:** S.

### Pre‑Orders

* **Status:** X
* **Modules/Plugins:** Pricing/Inventory policy tweaks; payment capture strategy.
* **Core Tasks:** Window mgmt, deposit/authorize, split fulfillment.
* **Effort:** M.

---

## 💳 Checkout & Payments

### Cart & Checkout Sessions

* **Status:** N
* **Modules/Plugins:** Cart, Payment, Tax, Shipping modules; Workflows.
* **Core Tasks:** Idempotent mutations; address/ship/tax selection; order placement.
* **APIs/Workflows:** `/cart`, `/checkout/session`, `/checkout/confirm`.
* **Effort:** S (you have base flow).

### Payments (Wallets/BNPL)

* **Status:** O/C
* **Modules/Plugins:** Official/community payment providers (Stripe, PayPal, Klarna, etc.).
* **Core Tasks:** Intent lifecycle, 3DS, webhooks, refunds.
* **Effort:** S per provider.

### Discounts & Promotions

* **Status:** N
* **Modules/Plugins:** Promotion Module + Campaigns.
* **Core Tasks:** Rule config (customer groups, min spend), stackability, free shipping.
* **APIs/Workflows:** `/cart/apply-promo`, admin promo CRUD.
* **Effort:** S.

### Wishlists & Saved Carts

* **Status:** C (wishlist) / N (carts)
* **Modules/Plugins:** `@rsc-labs/medusa-wishlist` or build‑your‑own.
* **Core Tasks:** CRUD, shareable tokens, merge on login.
* **Effort:** S for wishlist plugin; S for saved carts UI.

---

## 📦 Post‑Purchase & Customer Service

### Orders, Shipments, Tracking

* **Status:** N/O
* **Modules/Plugins:** Orders, Fulfillment, Notifications; carrier adapters.
* **Core Tasks:** Multi‑parcel shipments, tracking page, emails.
* **Effort:** S‑M (carrier API differences).

### Returns / Exchanges

* **Status:** N
* **Modules/Plugins:** Returns module & workflows.
* **Core Tasks:** RMA, label gen (carrier), refunds.
* **Effort:** M.

### Accounts (Profile, Addresses, Consents)

* **Status:** N
* **Modules/Plugins:** Customer, Auth, Consents (custom/simple).
* **Core Tasks:** OAuth/magic link, GDPR export/delete.
* **Effort:** S‑M.

### Loyalty / Rewards

* **Status:** O/C/X
* **Modules/Plugins:** Tutorial (points), community plugins (e.g., Valoriz); custom ledger for flexibility.
* **Core Tasks:** Earn on order state, redeem at checkout, expiry.
* **Effort:** M.

---

## 📈 Marketing & Retention

### Reviews & UGC

* **Status:** C/O
* **Modules/Plugins:** Community reviews plugin(s) or tutorial; moderation queue.
* **Core Tasks:** Create/list reviews, media, verified purchase flag.
* **Effort:** S‑M.

### Email/SMS Capture & Automations

* **Status:** O/C
* **Modules/Plugins:** Notification providers (Mail, SMS, Push) via plugins; event bus.
* **Core Tasks:** Double opt‑in, abandoned cart triggers.
* **Effort:** S.

### Personalization/Recommendations

* **Status:** X/O
* **Modules/Plugins:** Event stream to store/warehouse; simple rules or ML adapter.
* **Core Tasks:** Profile features, context endpoints.
* **Effort:** M.

### Referral Program

* **Status:** X
* **Modules/Plugins:** Custom codes + reward ledger.
* **Effort:** M.

---

## 📱 UX & Modern Expectations

* **Status:** N/O
* **Modules/Plugins:** Next.js storefront, i18n, currency module, SEO helpers.
* **Core Tasks:** PWA (SW, manifest), A11y CI checks, hreflang/sitemaps.
* **Effort:** S.

---

## 🛠️ Store Owner & Ops Tools

### Admin/CMS

* **Status:** N/O
* **Modules/Plugins:** Medusa Admin; consider lightweight CMS for content blocks.
* **Core Tasks:** Draft/publish, media, collections.
* **Effort:** S.

### Inventory & Stock Locations

* **Status:** N
* **Modules/Plugins:** Inventory & Multi‑warehouse modules.
* **Core Tasks:** Reservations, backorder policy, low‑stock alerts.
* **Effort:** S‑M.

### Pricing & Multi‑Currency

* **Status:** N
* **Modules/Plugins:** Pricing + Currency modules.
* **Core Tasks:** Presentment vs. settlement currency; group pricing; FX cache.
* **Effort:** S.

### Segmentation & Analytics

* **Status:** O/X
* **Modules/Plugins:** Event bus to BI; segment rules engine.
* **Core Tasks:** Materialized segments, dashboards.
* **Effort:** M.

---

## 🌐 Multi‑Store / Platform Management

* **Status:** N/O
* **Modules/Plugins:** Sales Channels, Store config per domain/locale/currency.
* **Core Tasks:** Channel‑aware catalog, payments/tax per region, feature flags.
* **Effort:** M.

---

## 🔐 Security/Privacy/Compliance (Cross‑Cutting)

* **Status:** O/X
* **Modules/Plugins:** Auth providers; rate‑limit middleware; consent tracking.
* **Core Tasks:** CSRF/CSP, bot detection, DSR workflows.
* **Effort:** S‑M.

---

## ⚙️ Platform Plumbing

* **Status:** N/O
* **Modules/Plugins:** Medusa workflows, event bus, queues; Redis cache; ISR.
* **Core Tasks:** Outbox pattern, retries, feature flags.
* **Effort:** S‑M.

---

## 🔧 Integration Picks (OSS‑only)

* Search: `medusa-plugin-meilisearch` (OSS)
* Wishlist: `@rsc-labs/medusa-wishlist`
* Reviews: community plugins (e.g., `@lambdacurry/medusa-product-reviews`) or tutorial‑based implementation
* Loyalty: tutorial or `@shiju-s/valoriz-loyalty-plugin`
* Payments: Stripe/PayPal/Klarna OSS providers
* Shipping/Tracking: carrier OSS adapters where available; generic webhook polling

---

## ▶ Acceptance Criteria (per feature)

* **Contracts:** REST/RPC typed; idempotent; error taxonomy
* **Perf:** p95 < 200ms for typeahead; < 500ms for filtered PLP
* **A11y:** WCAG 2.2 AA on key flows
* **i18n/FX:** Correct currency & formatting per locale/channel
* **Obs:** Events emitted; dashboards/alerts wired
* **Security:** AuthZ on admin ops; rate limits on public endpoints

---

### Notes

* Treat each item as **Native/Adapter/Custom** in the backlog with an Effort/Impact score to form the roadmap (Step 4).
