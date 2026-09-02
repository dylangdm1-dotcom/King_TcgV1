# King_TCG

King_TCG est une application Next.js de recherche, collection et analyse de cartes Pokémon TCG. Elle réunit un catalogue multilingue, la gestion de collection, les favoris, un scanner assisté par IA, une estimation PSA et une agrégation de données marché.

**Version actuelle : V296 — Items FR automatiques en vérification.**

La V296 supprime toute manipulation propriétaire du parcours normal. La page `/items` déclenche automatiquement, si nécessaire, une synchronisation CardTrader des dernières extensions Pokémon, conserve uniquement les produits scellés proposés en français et affiche leurs fiches avec le statut « en vérification ». Les noms, emballages et cotes peuvent ainsi être contrôlés directement sur le site. Redis empêche les synchronisations multiples et conserve le lot sept jours ; une donnée fraîche est réutilisée pendant 24 heures.

Les comptes et abonnements restent volontairement désactivés. Leur mise en place est planifiée seulement après la stabilisation complète de PSA.

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
- espace Items séparé de Recherche cartes/extensions, avec fiches, filtres, références personnelles, collection, favoris et export CSV ;
- accès Items prévu pour Premium et PRO, avec aperçu ouvert pendant la bêta ;
- formule PRO préparée pour un futur scanner de stock gros volume sans prix et des exports professionnels.

## Espace Items

La route `/items` est entièrement indépendante de `/recherche` : une recherche de cartes ou d’extensions ne renvoie jamais de produit scellé, et une recherche Items ne renvoie jamais de carte. Les ETB, displays, boosters, bundles, UPC, coffrets, Pokébox, decks et collections spéciales possèdent leur propre modèle de données et leurs propres routes `/api/items/*`.

Fonctions actuellement disponibles :

- d’enregistrer une référence personnelle sans la faire passer pour une donnée officielle ;
- d’ajouter un Item à la collection avec quantité, prix d’achat, date et notes ;
- d’ajouter un Item aux favoris ;
- d’ouvrir une fiche dédiée ;
- d’exporter l’inventaire Items en CSV ;
- de distinguer le futur prix de sortie officiel de la future cote marché actuelle.

Le premier lot public contient **57 produits scellés anglais** issus de deux extensions : `ME01: Mega Evolution` et `ME02: Phantasmal Flames`. Les **57 références disposent maintenant d’un visuel fournisseur** servi par une route King_TCG contrôlée et mise en cache. Parmi elles, **54 disposent d’une cote actuelle TCGplayer en USD** et 3 restent explicitement sans cote. Aucun prix manquant n’est inventé.

La source utilisée est **TCGCSV** : gratuite, sans clé API, mise à jour quotidiennement et prévue pour une ingestion serveur. King_TCG respecte une synchronisation maximale toutes les 24 heures avec un User-Agent identifiable. La donnée reste classée EN/US : elle n’est jamais présentée comme une cote française exacte.

Les langues ne sont pas mélangées : les visuels TCGplayer restent marqués EN et ne deviennent jamais des emballages FR. Le navigateur charge une URL interne `/api/items/image` ; le serveur contrôle strictement l’identifiant fournisseur et met la réponse en cache. Le prix officiel de sortie n’est pas fourni par TCGCSV et reste donc `—`.

Le catalogue français est déclaré **en vérification bêta**. Son socle statique reste vide, mais `/api/items/catalog`, `/api/items/search` et `/api/items/[id]` fusionnent automatiquement le snapshot FR CardTrader conservé dans Redis. Aucun token n’est demandé dans l’interface. Les visuels passent par `/api/items/image`, qui accepte uniquement les URL HTTPS appartenant à CardTrader. Les fiches partielles affichent leur cote minimale CardTrader en EUR comme donnée de marché, jamais comme prix magasin officiel.

Le quota CardTrader déclaré est de 200 requêtes par fenêtre de 10 secondes. King_TCG conserve une marge à 180 requêtes et espace les lectures Marketplace d’au moins 1,1 seconde. Un verrou Redis distribué autorise une seule reconstruction du snapshot FR à la fois ; les visiteurs suivants relisent le cache au lieu de rappeler CardTrader.

## Couverture du catalogue

| Langue | Séries | Extensions | Cartes locales | État |
|---|---:|---:|---:|---|
| FR | 18 | 244 | 19 797 | 172 complètes, 10 partielles |
| EN | 20 | 203 | 21 066 | 199 complètes |
| JP | 13 | 122 | 8 440 | 73 complètes, 49 extensions en métadonnées |
| CN | 6 | 66 | 6 053 | 60 complètes, 6 en métadonnées |

Les extensions JP/CN sont visibles avec leur nom, code et série même lorsque leurs cartes ne sont pas encore disponibles localement. Le catalogue JP atteint 8 440 cartes réparties dans 73 extensions complètes et contient 3 794 cartes avec une référence visuelle TCGdex. Les cartes sans URL fournisseur utilisent un placeholder sans faux visuel.

En mode japonais, Recherche affiche désormais le nom japonais fourni par TCGdex tout en conservant le nom anglais comme alias recherchable. Parmi les 49 extensions encore en métadonnées, 30 existent dans l’index TCGdex mais ne publient actuellement aucune liste de cartes, et 19 sont absentes de cet index. Elles ne sont pas déclarées complètes artificiellement.

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
- **CardTrader** : prévisualisation serveur privée des futurs Items FR, avec jeton obligatoire, preuve de langue par offre Marketplace et validation manuelle avant publication.

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
