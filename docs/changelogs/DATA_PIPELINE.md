# King_TCG — Data / Pricing pipeline

## Identity
A market quote is attached only after matching the card by language, set and local number. JP/CN never fall back to an English market quote as a local quote.

## Catalog / images
- TCGdex is the multilingual catalog authority for FR / EN / JA / ZH-TW.
- TCGdex `image` is an asset base URL. The application appends `/high.webp` or `/low.webp` as documented by TCGdex.
- PokéWallet is only an image/market identity fallback when an exact set + number match is found.

## Prices
- Cardmarket values from TCGdex / PokéWallet are labelled Europe and are not treated as FR Near Mint because those feeds do not expose listing language + condition together.
- TCGPlayer is a local quote only for English cards.
- JustTCG is accepted as an exact local quote only when its variant explicitly matches the requested language + Near Mint, except its mono-market EN/JP catalogs where missing legacy language can be inferred.
- eBay Browse is active-listing data. It is never labelled as a completed/sold price. Completed-sale search requires Marketplace Insights access, which eBay currently restricts.

## King_TCG estimate
Only exact, compatible, Near Mint quotes in the card's own language enter `marketEstimate`. If none exists, the UI may display Cardmarket Europe as a clearly-labelled reference, but it is not renamed as a local FR/JP/CN price.
