# King_TCG

King_TCG est une application Next.js de recherche, collection et analyse de cartes Pokémon TCG. Elle réunit un catalogue multilingue, la gestion de collection, les favoris, un scanner assisté par IA, une estimation PSA et une agrégation de données marché.

**Version actuelle : V305 Final Alpha — Items FR/EN, Listing Scanner PRO 2/4 cartes, export Excel et finition mobile/desktop.**

La V305 transforme l’ancien essai « Inventaire » en **Listing PRO gold** : choix de 2 ou 4 cartes par photo, deux analyses simultanées, accumulation de 40 cartes physiques, correction manuelle et export CSV UTF-8 pour Excel. Ce parcours ne déclenche ni recherche de prix ni affichage de visuel. La capacité Alpha est réglée à 550 sessions afin de tester le niveau PRO ; les droits réels appliqueront ensuite 30 / 500 / 550 selon l’abonnement.

La Recherche permet désormais de parcourir séparément les **séries réelles** et les grandes **générations**. Les 18 séries FR, 20 EN, 15 JP et 6 CN restent reliées à leurs extensions, avec des libellés compréhensibles en français pour les séries japonaises et chinoises. Une identité canonique ne peut apparaître que dans une seule section et les 55 alias FR sans cartes restent fusionnés avec leur extension navigable.

La V301 conserve les apports V300 et ajoute **2 512 visuels japonais TCGplayer réellement testés**, reliés aux identifiants tiers du dépôt open-source TCGdex. Le catalogue atteint toujours 59 697 cartes, dont 6 394/12 781 cartes japonaises avec visuel. Les 6 387 références JP encore sans image conservent un placeholder explicite : aucune correspondance ambiguë ou URL en erreur n’est publiée.

L’espace Items synchronise automatiquement les produits scellés français disponibles sur CardTrader et les fusionne avec 53 produits EN distincts. Les cinq façades de la Mega Heroes Mini Tin forment une seule référence avec une galerie de cinq images : les 57 visuels EN restent tous disponibles. Un snapshot FR rempli reste frais 24 heures ; un résultat vide est retenté après 10 minutes et une erreur fournisseur après 5 minutes.

Le parcours Vente est actif localement : sélection depuis la collection, quantité, prix, frais, bénéfice, retrait du stock, historique et annulation restauratrice. Les comptes, droits et paiements Stripe restent réservés à la V304 ; aucune facturation réelle n’est déclenchée par cette version.

## Fonctions principales

- recherche par nom ou par extension en français, anglais, japonais et chinois simplifié ;
- catalogue local versionné avec séries, extensions, cartes, variantes et références visuelles ;
- vues Recherche compacte (3 cartes par ligne), standard et large ;
- collection, favoris, dashboard, alertes et opportunités ;
- ventes de cartes avec historique, bénéfice et mise à jour du portefeuille ;
- Scanner Mono, Batch, Quad et Listing PRO 2/4 cartes ;
- raccord Scanner → fiche → prix d'une seule carte validée, sans appels marché sur les candidats ;
- estimation PSA expérimentale avec PriceCharting et eBay, regroupée par langue, carte, extension, édition, variante et grade ;
- Cote King_TCG construite à partir des sources compatibles disponibles ;
- cache marché partagé et historique quotidien persistant via Redis REST.
- espace Items séparé de Recherche cartes/extensions, avec fiches, filtres, références personnelles, collection, favoris et export CSV ;
- accès Items prévu pour Premium et PRO, avec aperçu ouvert pendant la bêta ;
- formule PRO à 6,99 €/mois préparée pour 550 sessions Scanner, dont le Listing gros volume sans prix et ses exports professionnels.

## Espace Items

La route `/items` est entièrement indépendante de `/recherche` : une recherche de cartes ou d’extensions ne renvoie jamais de produit scellé, et une recherche Items ne renvoie jamais de carte. Les ETB, displays, boosters, bundles, UPC, coffrets, Pokébox, decks et collections spéciales possèdent leur propre modèle de données et leurs propres routes `/api/items/*`.

Fonctions actuellement disponibles :

- d’enregistrer une référence personnelle sans la faire passer pour une donnée officielle ;
- d’ajouter un Item à la collection avec quantité, prix d’achat, date et notes ;
- d’ajouter un Item aux favoris ;
- d’ouvrir une fiche dédiée ;
- d’exporter l’inventaire Items en CSV ;
- de distinguer le prix de sortie officiel FR de la cote marché actuelle.

Le premier lot public contient **53 produits scellés anglais distincts** issus de deux extensions : `ME01: Mega Evolution` et `ME02: Phantasmal Flames`. Il conserve **57 visuels fournisseur** : les cinq illustrations de Mega Heroes Mini Tin sont regroupées dans une seule galerie. **50 produits distincts disposent d’une cote actuelle TCGplayer en USD** et 3 restent explicitement sans cote. Aucun prix manquant n’est inventé.

La source utilisée est **TCGCSV** : gratuite, sans clé API, mise à jour quotidiennement et prévue pour une ingestion serveur. King_TCG respecte une synchronisation maximale toutes les 24 heures avec un User-Agent identifiable. La donnée reste classée EN/US : elle n’est jamais présentée comme une cote française exacte.

Les langues ne sont pas mélangées : les visuels TCGplayer restent marqués EN et ne deviennent jamais des emballages FR. Le navigateur charge une URL interne `/api/items/image` ; le serveur contrôle strictement l’identifiant fournisseur et met la réponse en cache. Le prix officiel de sortie n’est pas fourni par TCGCSV. King_TCG accepte uniquement une valeur publiée par une source officielle française : aucune conversion d’un MSRP américain ni aucun prix de boutique/revente n’est présenté comme prix officiel. Sans preuve officielle FR, la valeur reste donc `—`.

Le catalogue français est déclaré **en synchronisation bêta**. Son socle statique reste vide, mais `/api/items/catalog`, `/api/items/search` et `/api/items/[id]` fusionnent automatiquement le snapshot FR CardTrader conservé dans Redis. La V301 corrige la détection du libellé accentué « Pokémon » qui provoquait `cardtrader_pokemon_game_missing`, utilise un nouveau cache et explore jusqu’à 30 extensions récentes pour viser au moins 100 produits FR après regroupement. Seules les références disposant réellement d’un visuel CardTrader sont publiées. Chaque Item conserve son chemin canonique `fr/items/...json`; les façades d’un même booster unitaire ou d’une même Mini Tin sont regroupées, tandis que les blisters promo, lots et coffrets différents restent séparés.

Le quota CardTrader déclaré est de 200 requêtes par fenêtre de 10 secondes. King_TCG conserve une marge à 180 requêtes et espace les lectures Marketplace d’au moins 1,1 seconde. Un verrou Redis distribué autorise une seule reconstruction du snapshot FR à la fois ; les visiteurs suivants relisent le cache au lieu de rappeler CardTrader. Les trois routes dynamiques Items utilisent `private, no-store` pour ne plus figer publiquement pendant une heure un résultat FR vide.

## Couverture du catalogue

| Langue | Séries | Extensions | Cartes locales | État |
|---|---:|---:|---:|---|
| FR | 18 | 244 | 19 797 | 172 complètes, 10 partielles |
| EN | 20 | 203 | 21 066 | 199 complètes |
| JP | 15 | 164 | 12 781 | 115 complètes, 1 partielle, 48 en métadonnées |
| CN | 6 | 66 | 6 053 | 60 complètes, 6 en métadonnées |

Les extensions JP/CN sont visibles avec leur nom, code et série même lorsque leurs cartes ne sont pas encore disponibles localement. Le catalogue JP atteint 12 781 cartes : 115 extensions complètes, 1 partielle et 48 encore limitées aux métadonnées. Il contient 3 882 références visuelles TCGdex et 2 512 références TCGplayer contrôlées, soit 6 394 visuels JP. Les cartes sans URL fournisseur utilisent un placeholder sans faux visuel.

En mode japonais, Recherche affiche le nom japonais fourni par TCGdex tout en conservant les alias déjà connus. Le compteur ne dit plus « à compléter » : il indique « sans cartes publiées » pour les extensions conservées en métadonnées mais dont aucune carte n’est fournie. `MP` est désormais complète à 132/132 et `WEB1` reste à 47/48. Treize fichiers promo `SV-P` sans nom japonais ont été ignorés au lieu de fabriquer des cartes.

Le catalogue chinois contient 60 extensions ouvrables, **6 053 identités canoniques et 6 890 impressions PokéWallet**. Les différentes impressions d’un même numéro sont regroupées sous une identité afin d’éviter les faux doublons. La Recherche distingue maintenant le nombre de cartes uniques du nombre d’impressions fournisseur ; par exemple CBB6C contient 28 identités et 192 impressions regroupées. Les 7 anciennes extensions « partielles » passent à « complètes » car leurs identifiants d’impression couvrent réellement 100 % du total fournisseur.

Les collections chinoises disposent de leur propre catégorie d’affichage. Les noms King_TCG vérifiés remplacent également les libellés fournisseur réduits à un simple code (`CSVH3C`, `CSM2.5C`, `CSMAC`, `CSMC`, `CSMJC`, `CSMLC`, `CSMYC`, `CSUC`, `CSXC`, `CSYC` et `CSZC`).

Lorsqu'une identité chinoise possède plusieurs impressions PokéWallet, la fiche propose maintenant chaque impression dans le sélecteur Version. Le changement met à jour le visuel et l'identifiant fournisseur avant l'appel Prix. Les caches marché sont séparés par impression, tandis que la Recherche et le Scanner conservent une seule identité par carte.

Six extensions chinoises restent explicitement en métadonnées car PokéWallet ne publie pas encore leurs cartes : `CSV10C`, `CSV9C`, `CSV8C`, `CSV7C`, `CSVL2C` et `CSV6C`. King_TCG n’invente jamais une carte, un visuel ou un prix manquant.

## Sources de données

- **TCGdex** : catalogue et visuels FR/EN/JP lorsqu’ils sont disponibles ;
- **Pokémon TCG API** : repli anglais uniquement ;
- **PokéWallet** : données chinoises autorisées lorsqu’une clé est configurée ;
- **Cardmarket, TCGPlayer, JustTCG et eBay** : données marché selon la langue, la carte et la disponibilité ;
- **PriceCharting et eBay** : références complémentaires pour la partie PSA.
- **TCGCSV / TCGplayer** : identité et cote actuelle en USD des produits scellés EN, synchronisées au maximum une fois par jour.
- **TCGplayer visuels JP** : repli contrôlé uniquement lorsque le dépôt TCGdex publie l’identifiant produit correspondant et que l’image répond réellement.
- **CardTrader** : Items FR en vérification, preuve de langue par offre Marketplace, visuels contrôlés par proxy et snapshot automatique Redis.

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
CARDTRADER_API_TOKEN=
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
```

Les générateurs et audits internes sont conservés dans l’archive locale complète du projet. Ils ne sont pas nécessaires au build de production et ne sont pas publiés sur GitHub/Vercel.

## Architecture utile

```text
app/                    Pages et routes API Next.js
components/             Composants d’interface
lib/catalog-v2/         Modèle, imports et chargement du catalogue local
lib/market-cache/       Cache partagé, Redis, métriques et historique
public/data/catalog-v2/ Manifest et fichiers JSON par langue/extension
public/data/items-v1/    Catalogue indépendant des produits scellés
lib/items/               Identité, recherche, stockage et prix Items
```

Les dossiers techniques `scripts/` et `docs/` existent uniquement dans l’archive locale complète. Le déploiement contient le code de l’application, les données nécessaires et ce README.

## Déploiement GitHub et Vercel

1. envoyer uniquement le contenu du patch GitHub/Vercel dans le dépôt ;
2. conserver les variables sensibles dans les paramètres Vercel ;
3. lancer un nouveau déploiement après toute modification des variables Redis ou API ;
4. vérifier que `npm run build` passe avant la mise en production ;
5. ne jamais publier `.env.local`, les tokens, les dossiers `docs/` ou `scripts/`.

## Principes de fiabilité

1. Catalogue, marché et analytics restent indépendants.
2. Une panne externe ne supprime jamais une identité ou un visuel déjà connu.
3. Une source absente affiche `—` ; aucune valeur n’est inventée.
4. Les codes `CS*`, `CSV*` et `CBB*` restent chinois et ne sont jamais classés japonais.
5. Scanner et PSA restent isolés du moteur de prix ; le Scanner ouvre la fiche après validation, puis cette fiche enrichit une seule carte.
6. Les synchronisations de catalogue sont additives et contrôlées avant publication.
7. Le code interne historique `zh-tw` reste temporairement un alias de compatibilité pour le catalogue chinois simplifié ; la source PokéWallet est toujours interrogée avec sa langue `chn` afin de ne pas mélanger les cartes traditionnelles et simplifiées.

## État des tests réels

Les audits statiques, le typage, le lint et le build sont exécutés avant livraison. Restent à vérifier sur les environnements réels :

- simulation complète de cold start via la route protégée (la connexion Redis et le cache partagé ont été validés sur le déploiement réel) ;
- Scanner Mono/Batch/Quad avec caméra ;
- recherches PSA témoins multilingues ;
- rendu final sur Android et iPhone ;
- réponses et quotas réels des fournisseurs externes.

## Documentation publiée

Ce README est la documentation complète publiée avec l’application. Les rapports de reprise, audits détaillés et historiques de versions restent dans l’archive locale complète afin de préserver la continuité du projet sans alourdir GitHub ni le déploiement Vercel.
