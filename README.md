# King_TCG

Application de gestion et d'analyse de cartes Pokémon : catalogues multilingues, collection, favoris, dashboard, scanner IA, estimation PSA expérimentale et agrégation de données marché.

> **État du projet : base V199 validée pour la reprise.**
> Les audits et la feuille de route détaillée sont dans `docs/`.
> Le développement structurel restant est volontairement réservé à la phase ChatGPT Work.

## État actuel

### Fonctionnel / validé

- Recherche et fiches cartes en **FR / EN / JP / CN**.
- Collection : quantités, état, variante, prix d'achat, valeur et progression par extension.
- Favoris et Dashboard.
- Scanner **Mono / Batch / Quad** côté structure.
- PSA IA avec quatre vues et contrôle manuel complémentaire.
- Marchés affichés séparément : **Cardmarket, eBay, TCGPlayer et JustTCG**.
- Cote King_TCG avec protections anti-outliers et distinction entre données exactes, comparables et indicatives.
- Cache prix et protections contre les appels fournisseurs répétés.
- Audits statiques de non-régression effectués sur les principaux parcours.

### Tests physiques encore nécessaires

- Scanner Mono avec une vraie carte.
- Scanner Batch.
- Quad avec 1/4, 2/4, 3/4 puis 4/4 cartes.
- Android et iPhone réels.
- PSA avec quatre vraies photos.
- Vérification finale mobile et clair/sombre.

### Reprise prévue dans Work

- Finalisation exhaustive des catalogues **JP et CN**.
- Fiabilisation des **images CN**.
- Cardmarket FR/NM exact si une voie fiable est disponible.
- Variantes et états complets.
- Pondérations finales du moteur King_TCG.
- Cache serveur partagé et historique persistant.
- Comptes Normal / Premium / Admin, Cloud et connexion Google.
- Sécurité production, quotas, monitoring, juridique et publication stores.

## Invariants à préserver

1. **Catalogue, Marché et Analytics restent indépendants.**
2. Une panne fournisseur ne doit jamais supprimer une carte, son identité ou une image déjà connue.
3. Tous les marchés restent visibles ; une source absente affiche `—`.
4. Une cotation d'une autre langue doit rester explicitement **comparable**, jamais devenir un prix local exact.
5. Le catalogue CN ne doit pas déclencher un scan massif automatique des extensions.
6. Scanner et PSA restent isolés du moteur de prix.
7. Les secrets API restent exclusivement côté serveur.
8. Les documents techniques `.md` restent dans `docs/`.

## Documentation de reprise

- `docs/PROJECT_STATUS.md` — état détaillé du projet.
- `docs/WORK_HANDOFF.md` — ordre de reprise recommandé pour Work.
- `docs/FINAL_ROADMAP.md` — tâches validées, tests restants et travaux Work.
- `docs/archive/audits/STATIC_REGRESSION_V194.md` — audit statique global.
- `docs/archive/audits/TARGETED_MARKET_REGRESSION_V195.md` — audit Recherche / fiches / prix.
- `docs/archive/audits/COLLECTION_FAVORITES_DASHBOARD_REGRESSION_V196.md` — audit Collection / Favoris / Dashboard.
- `docs/archive/audits/SCANNER_PSA_REGRESSION_V197.md` — audit Scanner / PSA.

---

# 👑 King_TCG — README officiel

**Version de travail actuelle : V153 — Catalogues régionaux et analytics explicables**\
**Statut produit : V5.0 — Accès anticipé**\
**Stack : Next.js App Router, React, TypeScript, TailwindCSS**\
**IA : Google Gemini**\
**Données cartes : TCGdex + Pokémon TCG API (EN uniquement en
fallback)**\
**Marché : Cardmarket + TCGPlayer + JustTCG + eBay Browse API**\
**Stockage actuel : LocalStorage + caches applicatifs et serveur**

> La feuille de route officielle et l'ordre des priorités jusqu'à la
> publication Android/iPhone sont conservés dans
> [`docs/ROADMAP_VERSION_FINALE.md`](docs/ROADMAP_VERSION_FINALE.md).
> Les sections techniques historiques de ce README seront consolidées après
> l'audit complet des API et des sources de prix.

------------------------------------------------------------------------

## Présentation

King_TCG est un compagnon premium pour le Pokémon Trading Card Game
centré sur la recherche multilingue, la collection, le suivi de valeur,
l'analyse de marché, le scanner assisté par IA et l'estimation visuelle
PSA.

La priorité actuelle est la **fiabilité des données** : une carte doit
conserver sa bonne langue, son extension, son numéro et son visuel
indépendamment de la disponibilité des prix.

------------------------------------------------------------------------

## Fonctionnalités principales

-   **Recherche cartes** par nom, langue et extension.
-   **Catalogues multilingues** FR / EN / JP / CN.
-   **Catalogue physique uniquement** : les extensions numériques Pokémon TCG Pocket sont séparées et non proposées comme produits de marché.
-   **Fiches cartes** chargées indépendamment des fournisseurs de prix.
-   **Cote King_TCG** avec agrégation contrôlée des sources marché.
-   **Cardmarket** comme référence principale du marché FR.
-   **eBay officiel** via OAuth et Browse API.
-   **JustTCG** avec variantes, état, printing et langue, y compris les
    cotations comparables cross-language lorsqu’elles sont compatibles.
-   **TCGPlayer** principalement pour les données anglaises compatibles.
-   **Historique King_TCG** sous les fiches cartes.
-   **Projection 30 jours FR** basée sur la Cote King_TCG.
-   **Repère de mise en vente FR** basé sur la Cote King_TCG, hors frais et négociation.
-   **Collection** : quantité, état, prix d'achat, favoris, valeur et
    plus-value.
-   **Dashboard** : portefeuille, statistiques et projection 7 jours.
-   **Scanner Mono / Batch / Quad** avec Gemini et confiance bornée par les signaux réellement lus.
-   **Collection PSA** et estimation visuelle expérimentale, avec cohérence et plafonds de confiance contrôlés côté serveur.
-   **Notifications** et navigation mobile premium.

------------------------------------------------------------------------

## Architecture Data actuelle

### Principe fondamental

Les données sont séparées en trois couches :

1.  **Catalogue** --- identité, langue, extension, numéro, rareté,
    image.
2.  **Marché** --- prix et fournisseurs.
3.  **Analytics** --- historique, tendances, projections et indicateurs.

Une erreur ou une indisponibilité de prix ne doit **jamais** empêcher
l'affichage d'une carte ni modifier sa langue, son extension ou son
image.

### Recherche

La recherche ne déclenche plus automatiquement l'ensemble du moteur de
prix.

Elle privilégie :

`Catalogue → résultats → ouverture fiche → détail carte → marché`

Cela évite les rafales de requêtes et les divergences entre résultats et
fiches.

### Catalogues par langue

-   **FR** : TCGdex FR uniquement pour le catalogue.
-   **EN** : TCGdex EN avec fallback Pokémon TCG API autorisé.
-   **JP** : TCGdex JP uniquement pour le catalogue.
-   **CN** : PokéWallet avec catalogue local de repli, alias de codes fournisseur et cache long. La couverture exhaustive et les images restent à finaliser dans Work.

Les sources anglaises ne doivent jamais injecter une carte ou une
extension anglaise dans un catalogue FR, JP ou CN.

Les identifiants techniques TCGdex restent séparés des codes affichés.
Exemple : un ID fournisseur `sv08.5` peut être affiché en français sous
la forme `EV8.5` sans modifier l'identifiant utilisé pour interroger
l'API.

------------------------------------------------------------------------

## Images

TCGdex reste la source principale des visuels.

Les fallbacks doivent respecter la langue de la carte. Une image
anglaise ne doit pas être utilisée silencieusement pour remplacer une
impression FR, JP ou CN.

Pour les assets TCGdex reconstruits, le chemin doit conserver la
structure :

`langue / série / extension / carte`

La V42 corrige notamment les fallbacks d'images utilisés lors des
recherches JP par extension.

------------------------------------------------------------------------

## Cote King_TCG

La Cote King_TCG est une estimation de marché et non une garantie de
prix de vente.

### Français

Le marché FR utilise principalement :

1.  **Cardmarket** comme ancre principale.
2.  **eBay** comme source complémentaire lorsque les annonces
    correspondent précisément à la carte.
3.  Autres données compatibles lorsqu'elles sont réellement pertinentes.

eBay n'est pas intégré sous forme de moyenne brute. Sa contribution est
pondérée afin d'éviter qu'une annonce aberrante ou un petit nombre
d'annonces ne déforme fortement la Cote King_TCG.

Les annonces eBay actives ne sont jamais présentées comme des ventes
réalisées.

### Japonais

Le moteur peut exploiter :

-   JustTCG Pokémon Japan ;
-   eBay avec filtrage JP ;
-   références secondaires compatibles lorsqu'elles existent.

Le nom anglais de la même carte peut être utilisé uniquement pour
améliorer la recherche d'annonces marché. Il ne doit jamais modifier le
nom, la langue ou le visuel affiché dans King_TCG.

### Chinois

Le moteur peut exploiter :

-   eBay avec filtrage CN ;
-   sources compatibles réellement disponibles ;
-   références secondaires lorsque leur correspondance est suffisamment
    fiable.

Si aucune source comparable n'est disponible, King_TCG doit afficher une
absence de cote plutôt qu'inventer un prix.

------------------------------------------------------------------------

## eBay officiel

King_TCG utilise l'API officielle eBay côté serveur :

`OAuth Client Credentials → Application Access Token → Browse API → item_summary/search`

Le token est mis en cache et renouvelé automatiquement.

Variables Vercel :

``` env
EBAY_CLIENT_ID=
EBAY_CLIENT_SECRET=
EBAY_MARKETPLACE_ID=EBAY_FR
```

Ne pas utiliser :

-   Developer ID ;
-   User Token pour ce flux ;
-   préfixe `NEXT_PUBLIC_` pour les secrets.

Les vraies valeurs ne doivent jamais être enregistrées dans Git, le
README ou le code source.

------------------------------------------------------------------------

## Autres variables d'environnement

``` env
GEMINI_API_KEY=
POKEMON_TCG_API_KEY=
JUSTTCG_API_KEY=
EBAY_CLIENT_ID=
EBAY_CLIENT_SECRET=
EBAY_MARKETPLACE_ID=EBAY_FR
```

Toutes les clés privées restent exclusivement côté serveur.

------------------------------------------------------------------------

## Lecture du marché FR

Pour le français, la **Cote King_TCG** est la référence centrale des
éléments analytiques de la fiche.

Le repère de mise en vente reprend la Cote King_TCG sans majoration
arbitraire. Les frais, la négociation, l'état précis et le délai de vente
ne sont pas connus de l'application et doivent être appréciés séparément.

La projection 30 jours part également de la Cote King_TCG actuelle afin
d'éviter qu'un ancien historique ou une moyenne provenant d'une autre
source devienne la valeur de départ.

------------------------------------------------------------------------

## Historique King_TCG

L'historique affiché sous la fiche utilise les observations King_TCG
enregistrées.

Lorsque l'historique réel est encore insuffisant, l'interface peut
reconstruire une série indicative à partir de la cote actuelle et des
tendances disponibles. Cette reconstruction doit rester identifiable
comme une estimation et ne doit pas être présentée comme une succession
de ventes historiques réelles.

Les points reconstruits sont marqués `reconstructed` et sont exclus du
calcul de couverture des données, de volatilité et de confiance.

------------------------------------------------------------------------

## Score stratégique et projections

Le score stratégique n'est pas un conseil financier. Il combine des
signaux bornés : tendance 7/30 jours lorsqu'elle existe, rareté, volatilité
des seuls relevés observés, niveau de prix, état et écart entre sources.

La projection 30 jours est un scénario algorithmique amorti, accompagné :

-   d'une fourchette basse/haute ;
-   d'un pourcentage de couverture des données ;
-   du nombre de sources compatibles ;
-   du nombre de relevés King_TCG réellement enregistrés ;
-   d'un libellé de qualité `Insuffisante`, `Limitée`, `Correcte` ou `Solide`.

Une variation forte augmente l'incertitude ; elle n'augmente pas la
confiance à elle seule.

------------------------------------------------------------------------

## Dashboard et projection portefeuille

La projection portefeuille 7 jours utilise une tendance **pondérée par
la valeur des positions et leur quantité**.

Une carte importante dans le portefeuille influence donc davantage la
projection qu'une carte de faible valeur.

La courbe peut inclure une micro-volatilité visuelle bornée entre les
jours afin d'éviter une trajectoire artificiellement parfaitement
droite, tout en conservant :

-   la valeur actuelle comme point de départ ;
-   la tendance calculée comme direction générale ;
-   aucune prétention à prédire exactement les futurs prix.

Si une carte légère ne contient pas encore sa cote complète, le
dashboard peut utiliser le dernier point King_TCG enregistré localement
plutôt que relancer toutes les APIs de marché au chargement.

------------------------------------------------------------------------

## Cache et performances

Principes :

-   le catalogue et les prix ont des responsabilités séparées ;
-   les recherches ne doivent pas déclencher une synchronisation marché
    massive ;
-   les prix sont chargés principalement à l'ouverture de la fiche ;
-   les erreurs temporaires utilisent des caches courts ;
-   les données valides peuvent utiliser des caches plus longs ;
-   une indisponibilité eBay, Cardmarket, JustTCG ou TCGPlayer ne doit
    jamais casser la fiche.

`clearPokemonCache()` doit uniquement supprimer les clés de cache
King_TCG concernées et ne doit jamais utiliser `localStorage.clear()`.

------------------------------------------------------------------------

## Pages principales

``` text
app/
├── page.tsx
├── recherche/
├── scanner/
├── collection/
├── dashboard/
├── card/[id]/
├── psa/
├── favoris/
├── reglages/
└── api/
    ├── scan/
    ├── psa-grade/
    ├── cards/
    └── prices/
```

Modules Data importants :

``` text
lib/
├── pokemon.ts
├── pokemonTranslator.ts
├── priceClient.ts
├── marketEngine.ts
├── pricing.ts
├── priceHistory.ts
├── priceTracker.ts
└── types.ts
```

Les anciens modules marché encore présents doivent être supprimés ou
fusionnés uniquement après validation qu'ils ne sont plus utilisés.

------------------------------------------------------------------------

## Scanner IA

### Scanner Mono

Pipeline :

`Caméra → Capture → Gemini → résultat structuré → matching catalogue → carte → marché`

Gemini identifie les informations visibles, mais la correspondance
finale reste effectuée avec le catalogue commun.

### JP / CN

Pour les cartes japonaises et chinoises, le numéro, l'extension et les
identifiants fiables doivent être privilégiés par rapport à une
traduction approximative du nom.

### Batch

Le mode Batch permet le traitement de plusieurs cartes. Le mode Quad gère quatre emplacements avec résultats progressifs et détections partielles.

------------------------------------------------------------------------

## PSA / IA Grade

L'estimation PSA est expérimentale et non officielle.

Parcours principal :

1.  Face avant.
2.  Face arrière.
3.  Inclinaison avant.
4.  Inclinaison arrière.
5.  Analyse Gemini.
6.  Contrôle manuel structuré.
7.  Estimation affinée.

L'application ne doit jamais présenter cette estimation comme un grade
PSA officiel.

------------------------------------------------------------------------

## Design

Direction artistique :

-   fond noir profond ;
-   cyan / bleu King_TCG ;
-   vert pour les valeurs positives ;
-   rouge pour les pertes et alertes ;
-   violet et orange comme accents secondaires ;
-   interface mobile premium ;
-   cartes compactes ;
-   priorité à la lisibilité ;
-   vrais logos des marketplaces lorsqu'ils sont disponibles.

------------------------------------------------------------------------

## Règles de développement

1.  Ne jamais casser le catalogue pour corriger un prix.
2.  Ne jamais utiliser une source EN comme carte FR/JP/CN.
3.  Préserver identité, extension, numéro, rareté et image même si le
    marché échoue.
4.  Garder les clés API exclusivement côté serveur.
5.  Ne jamais inventer un prix manquant.
6.  Éviter les appels prix massifs depuis la recherche.
7.  Charger la fiche indépendamment du marché.
8.  Tester les langues séparément.
9.  Tester `npm run build` avant déploiement.
10. Ne pas multiplier les moteurs ou caches sans nécessité.
11. Ranger les notes et fichiers Markdown techniques dans `docs/`.
12. Conserver uniquement `README.md` à la racine.

------------------------------------------------------------------------

## Tests de non-régression prioritaires

Après une modification Data ou Marché :

-   recherche FR par nom ;
-   recherche FR par extension ;
-   absence de doublons EN en FR ;
-   séries spéciales FR comme `EV8.5` ;
-   recherche EN ;
-   recherche JP par nom ;
-   recherche JP par extension et images ;
-   recherche CN par nom et extension ;
-   ouverture de fiche dans chaque langue ;
-   Cardmarket ;
-   eBay ;
-   JustTCG ;
-   TCGPlayer lorsqu'il est pertinent ;
-   Cote King_TCG ;
-   historique King_TCG ;
-   projection FR 30 jours ;
-   dashboard et projection portefeuille 7 jours ;
-   collection ;
-   Scanner Mono ;
-   PSA IA Grade ;
-   `npm run build`.

------------------------------------------------------------------------

## Historique technique V42

### Validé récemment

-   séparation Recherche / Marché ;
-   fiches indépendantes des erreurs de prix ;
-   catalogues FR/EN/JP/CN isolés ;
-   suppression des doublons EN injectés en FR ;
-   correction des séries spéciales FR et IDs techniques ;
-   eBay Production fonctionnel en FR ;
-   eBay intégré à la Cote King_TCG FR avec pondération ;
-   historique King_TCG ;
-   projection portefeuille 7 jours restaurée ;
-   projection FR 30 jours basée sur la Cote King_TCG ;
-   fichiers techniques `.md` rangés dans `docs/`.

### En cours de validation

-   couverture complète des recherches Évoli et autres Pokémon avec de
    nombreuses impressions ;
-   images JP en recherche par extension après correction V42 ;
-   couverture prix JP ;
-   couverture prix CN ;
-   qualité du filtrage eBay JP/CN ;
-   pondération finale des différentes sources marché.

------------------------------------------------------------------------

## Anciennes priorités V42 — historique

1.  Valider V42 sur FR / JP / CN.
2.  Stabiliser la couverture prix JP et CN.
3.  Vérifier les images de toutes les extensions JP.
4.  Mesurer la qualité réelle des résultats eBay avant d'augmenter leur
    poids.
5.  Continuer à simplifier les anciens modules marché sans modifier les
    fonctions validées.
6.  Reprendre le Scanner uniquement après stabilisation complète du
    moteur Data / Marché.

------------------------------------------------------------------------

## Organisation du projet

Les documents techniques, audits, historiques de versions et notes de
migration doivent être placés dans :

``` text
docs/
```

La racine doit rester lisible. `README.md` est le seul document Markdown
principal conservé à la racine.

------------------------------------------------------------------------

**King_TCG — Pokémon Trading Card Companion**\
**V153 de travail / V5.0 Accès anticipé**

## V78 — CN public dual fallback + JP TCGdex isolation
- CN keeps V77 public PokéWallet primary + browser direct fallback when the server path fails.
- JP no longer calls the authenticated PokéWallet regional catalogue for either the set list or set-card fallback.
- PokéWallet 429/502 can therefore no longer break the JP catalogue path.
- TCGdex remains JP primary; curated recent JP entries remain display-only until TCGdex exposes matching cards.
- FR/EN and pricing engine unchanged.

## Feuille de route finale King_TCG

La feuille de route détaillée, les priorités, les exclusions et la première
action immédiate sont centralisées dans :

[`docs/ROADMAP_VERSION_FINALE.md`](docs/ROADMAP_VERSION_FINALE.md)

Règle stricte : une seule zone fonctionnelle importante par version, avec une
sauvegarde restaurable et des tests ciblés avant toute modification transversale.
