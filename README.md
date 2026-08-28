# King_TCG

King_TCG est une application Next.js de recherche, collection et analyse de cartes Pokémon TCG. Elle réunit un catalogue multilingue, la gestion de collection, les favoris, un scanner assisté par IA, une estimation PSA et une agrégation de données marché.

**Version actuelle : V281 — M6 locale et recherche PriceCharting FR fiable.**

## Fonctions principales

- recherche par nom ou par extension en français, anglais, japonais et chinois simplifié ;
- catalogue local versionné avec séries, extensions, cartes, variantes et références visuelles ;
- vues Recherche compacte (3 cartes par ligne), standard et large ;
- collection, favoris, dashboard, alertes et opportunités ;
- Scanner Mono, Batch et Quad ;
- raccord Scanner → fiche → prix d'une seule carte validée, sans appels marché sur les candidats ;
- estimation PSA expérimentale avec PriceCharting et eBay, regroupée par langue, carte, extension, édition, variante et grade ;
- Cote King_TCG construite à partir des sources compatibles disponibles ;
- cache marché partagé et historique quotidien persistant via Redis REST.

## Couverture du catalogue

| Langue | Séries | Extensions | Cartes locales | État |
|---|---:|---:|---:|---|
| FR | 18 | 244 | 19 797 | 172 complètes, 10 partielles |
| EN | 20 | 203 | 21 066 | 199 complètes |
| JP | 13 | 122 | 113 | M6 complète côté données, 121 extensions à synchroniser |
| CN | 5 | 42 | 0 | métadonnées prêtes, cartes à synchroniser |

Les extensions JP/CN sont visibles avec leur nom, code et série même lorsque leurs cartes ne sont pas encore disponibles localement. M6 contient 113 cartes locales avec leurs données et prix disponibles, mais TCGdex ne publie pas encore leurs visuels. King_TCG n’invente jamais une carte, un visuel ou un prix manquant.

## Sources de données

- **TCGdex** : catalogue et visuels FR/EN, catalogue JP lorsqu’il est disponible ;
- **Pokémon TCG API** : repli anglais uniquement ;
- **PokéWallet** : données chinoises autorisées lorsqu’une clé est configurée ;
- **Cardmarket, TCGPlayer, JustTCG et eBay** : données marché selon la langue, la carte et la disponibilité ;
- **PriceCharting et eBay** : références complémentaires pour la partie PSA.

Une donnée provenant d’une autre langue reste classée comme comparable ou indicative. Elle ne devient jamais silencieusement un prix exact local.

## Installation

Prérequis : Node.js 18+ et npm.

```bash
npm install
cp .env.example .env.local
npm run dev
```

L’application locale est ensuite disponible sur `http://localhost:3000`.

## Variables d’environnement

Les secrets restent exclusivement côté serveur et ne doivent jamais utiliser le préfixe `NEXT_PUBLIC_`.

```env
GEMINI_API_KEY=
POKEMON_TCG_API_KEY=
POKEWALLET_API_KEY=
JUSTTCG_API_KEY=
EBAY_CLIENT_ID=
EBAY_CLIENT_SECRET=
EBAY_MARKETPLACE_ID=EBAY_FR

# Diagnostic Redis protégé
KING_TCG_CACHE_STATUS_TOKEN=

# Redis REST : utiliser une seule paire reconnue
KING_TCG_REDIS_REST_URL=
KING_TCG_REDIS_REST_TOKEN=
```

Les paires Vercel/Upstash `KV_REST_API_URL` + `KV_REST_API_TOKEN`, `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` et la paire personnalisée longue générée pour le projet sont également reconnues.

## Redis sur Vercel

La base Upstash doit être connectée aux environnements Production et Preview. Après création ou modification des variables, un nouveau déploiement Vercel est obligatoire.

La route protégée `/api/market-cache/status` permet de vérifier :

- la configuration Redis ;
- le `PING` réel et sa latence ;
- les compteurs de lectures, écritures, erreurs et replis mémoire ;
- la conservation d’un snapshot après simulation de cold start.

Le test réel se lance depuis un terminal local, sans enregistrer le token dans Git :

```bash
KING_TCG_DEPLOYMENT_URL=https://votre-deploiement.vercel.app \
KING_TCG_CACHE_STATUS_TOKEN=valeur_locale \
npm run test:market-cache:live
```

## Commandes de contrôle

```bash
npm run lint
npx tsc --noEmit
npm run build
npm run audit:security
npm run audit:catalog-v2-local
npm run audit:search-catalog
npm run audit:market-scanner
npm run audit:psa-identity
npm run audit:v281
npm run audit:market-cache
npm run audit:market-cache:persistent
npm run audit:market-history
```

## Architecture utile

```text
app/                    Pages et routes API Next.js
components/             Composants d’interface
lib/catalog-v2/         Modèle, imports et chargement du catalogue local
lib/market-cache/       Cache partagé, Redis, métriques et historique
public/data/catalog-v2/ Manifest et fichiers JSON par langue/extension
scripts/                Audits et générateurs reproductibles
docs/                   État du projet, procédures et rapports techniques
```

## Principes de fiabilité

1. Catalogue, marché et analytics restent indépendants.
2. Une panne externe ne supprime jamais une identité ou un visuel déjà connu.
3. Une source absente affiche `—` ; aucune valeur n’est inventée.
4. Les codes `CS*`, `CSV*` et `CBB*` restent chinois et ne sont jamais classés japonais.
5. Scanner et PSA restent isolés du moteur de prix ; le Scanner ouvre la fiche après validation, puis cette fiche enrichit une seule carte.
6. Les synchronisations de catalogue sont additives et contrôlées avant publication.

## État des tests réels

Les audits statiques, le typage, le lint et le build sont exécutés avant livraison. Restent à vérifier sur les environnements réels :

- simulation complète de cold start via la route protégée (la connexion Redis et le cache partagé ont été validés sur le déploiement réel) ;
- Scanner Mono/Batch/Quad avec caméra ;
- recherches PSA témoins multilingues ;
- rendu final sur Android et iPhone ;
- réponses et quotas réels des fournisseurs externes.

## Documentation

- [`docs/PROJECT_STATUS.md`](docs/PROJECT_STATUS.md) — état détaillé actuel ;
- [`docs/SEARCH_CATALOG_V278.md`](docs/SEARCH_CATALOG_V278.md) — intégration visible Recherche/Catalogue ;
- [`docs/MARKET_SCANNER_V279.md`](docs/MARKET_SCANNER_V279.md) — contrat prix FR/EN/JP/CN et raccord Scanner ;
- [`docs/PSA_IDENTITY_V280.md`](docs/PSA_IDENTITY_V280.md) — dédoublonnage et regroupement PSA ;
- [`docs/M6_PRICECHARTING_V281.md`](docs/M6_PRICECHARTING_V281.md) — M6 locale et filtrage PriceCharting FR ;
- [`docs/MARKET_HISTORY_METRICS_V277.md`](docs/MARKET_HISTORY_METRICS_V277.md) — Redis, métriques et historique ;
- [`docs/FINAL_ROADMAP.md`](docs/FINAL_ROADMAP.md) — prochaines étapes ;
- [`docs/INDEX.md`](docs/INDEX.md) — index de toute la documentation.

Les anciens rapports sont conservés dans `docs/archive/` pour la traçabilité, sans encombrer ce README.
