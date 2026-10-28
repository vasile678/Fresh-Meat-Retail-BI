# LUMI FRESH MEAT RETAIL BI — v2.6 PRODUCTION

Status: ACTIVE DOMAIN CONFIG
Supersedes conflicting weekly execution/rendering clauses in v2.5.2.

Fresh Meat retail, promotions, competitor pricing, category analysis and pork-market work route here.

## PROMO WKxx
Scope: Kaufland / Lidl / PENNY / Carrefour / Auchan × Spată porc fără os / Pulpă porc fără os / Cotlet porc fără os / Ceafă porc fără os / Piept pui dezosat = 25 cells.
Research window: requested ISO week ±3 days for evidence discovery, but offer validity must overlap the requested ISO week.
Every cell receives an audit trail. Like-for-like gate: species → cut → bone status → natural/marinated → format → unit → promo conditions.
Numeric price is allowed only for VERIFIED comparable evidence. Verified non-comparable = NC. Otherwise N/V.
Research → 25/25 audit → like-for-like → date overlap → reconciliation → authoritative lock → runtime → deterministic renderer → manifest/receipt PASS → delivery.
Standard delivery: executive summary + complete 5×5 table + Golden Master PNG.
No generative fallback. No historical template values as current facts. Profi excluded unless explicitly requested.
Follow-ups change only the named dimension.

## EU PORK MARKET WKxx
Fixed benchmark order: Germany VEZG; ISN / Internet Pig Auction; Spain Mercolleida; Italy CUN 156–200 kg; Netherlands Vion; Denmark Danish Crown; France MPB; Poland ZMI Class E.
Research each benchmark for the requested week. Prefer primary/official sources; cross-check where useful.
Do not mix live-weight and carcass bases. Preserve original unit/basis. Unresolved conflict or insufficient exact benchmark evidence = N/V.
Research → 8/8 audit → benchmark identity → unit/basis check → reconciliation → authoritative lock → EU runtime → deterministic mask render over Golden Master → receipt PASS → delivery.
Standard delivery: executive summary + complete 8-row table + Golden Master PNG.
Renderer/mask are presentation machinery, never data sources. No image generation or creative reconstruction.
WK37 is historical visual baseline, not a permanent numerical baseline. WK38+ is permitted only through the deterministic EU runtime declared in CONFIG_MANIFEST.

## EXECUTION INTEGRITY
Never claim research completion, reconciliation PASS, renderer execution, hash verification, manifest PASS, runtime receipt PASS or file creation without direct current-task evidence.
Missing required runtime asset or failed validation => fail closed.
UNKNOWN/N/V > invention. Current verified evidence > stale memory.
