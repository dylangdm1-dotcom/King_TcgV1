# 👑 King_TCG --- README Officiel

**Version actuelle :** V5.0 --- Accès anticipé\
**Interface :** Premium Mobile / Audit global 2026\
**Stack :** Next.js App Router, React, TypeScript, TailwindCSS\
**IA :** Google Gemini\
**Données :** TCGdex + Pokémon TCG API + JustTCG\
**Stockage actuel :** LocalStorage + caches applicatifs

------------------------------------------------------------------------

## Présentation

King_TCG est un compagnon premium pour le Pokémon Trading Card Game
centré sur la recherche multilingue, la gestion de collection, le suivi
de valeur, le scanner assisté par IA et l'estimation visuelle PSA.

La V5.0 est actuellement distribuée en **accès anticipé**. L'objectif
prioritaire est une expérience mobile simple, rapide et lisible, sans
sacrifier les informations utiles aux collectionneurs.

------------------------------------------------------------------------

## Fonctionnalités disponibles

-   **Recherche de cartes : active** --- recherche par nom, langue et
    extension, avec tri récent → ancien.
-   **Données multilingues : actives** --- FR / EN / JP / ZH selon la
    couverture des sources.
-   **Collection : active** --- quantité, état, prix d'achat, favoris,
    valeur et plus-value.
-   **Dashboard : actif** --- valeur actuelle, rendement, actifs phares,
    historique et répartitions.
-   **Scanner Mono : actif** --- identification Gemini puis
    correspondance avec la base de cartes.
-   **Scanner Batch 4 cartes : actif** --- capture guidée de quatre
    cartes.
-   **Collection PSA : active** --- suivi des cartes gradées, valeur
    d'achat et valeur estimée.
-   **Estimation PSA IA : active / expérimentale** --- 4 photos
    guidées + Gemini + contrôle manuel structuré.
-   **Notifications : actives** --- accès depuis la Navbar.
-   **PriceCharting / sources marché : intégration selon disponibilité
    des données.**

------------------------------------------------------------------------

## Architecture des données V5

### Cartes, extensions et images

Ordre de priorité actuel :

1.  **TCGdex** --- source multilingue principale pour cartes,
    extensions, images et prix intégrés disponibles.
2.  **Pokémon TCG API** --- complément serveur, principalement pour les
    données anglaises, images et métadonnées manquantes.
3.  Conservation systématique des métadonnées originales en cas d'échec
    d'une source secondaire.

Une erreur de prix ne doit jamais remplacer le nom, l'extension, le
numéro, la rareté ou l'image d'une carte par des valeurs génériques.

### Prix

Ordre d'enrichissement :

1.  Cardmarket / TCGPlayer déjà présents dans TCGdex.
2.  Données complémentaires Pokémon TCG API lorsqu'elles sont
    disponibles.
3.  **JustTCG** comme secours ciblé, notamment pour les variantes Near
    Mint compatibles.
4.  **Annonces eBay** : lorsqu'une vraie source est disponible, la
    valeur doit être présentée comme une médiane d'annonces actives
    comparables et jamais comme un prix de vente réalisé.

Les résultats sont traités par lots afin de respecter les quotas
gratuits et les cartes visibles sont prioritaires.

### Cache

-   Prix valides : cache longue durée (environ 12 h selon le flux).
-   Erreurs/absences temporaires : cache court afin de permettre une
    nouvelle tentative.
-   Taux de conversion : cache dédié.
-   Les statuts doivent distinguer `Synchronisation`,
    `Limite temporaire`, `Non cotée actuellement` et
    `Source indisponible`.

------------------------------------------------------------------------

## Variables d'environnement

Les secrets restent exclusivement côté serveur et ne doivent jamais
utiliser le préfixe `NEXT_PUBLIC_`.

``` env
GEMINI_API_KEY=
POKEMON_TCG_API_KEY=
JUSTTCG_API_KEY=
```

Ne jamais enregistrer les valeurs réelles dans Git, le README ou le code
source.

------------------------------------------------------------------------

## Recherche V5

La recherche est pensée en priorité pour le mobile :

-   langues FR / EN / JP / ZH ;
-   recherche par nom ;
-   sélection par extension ;
-   modules de générations fermés par défaut ;
-   extensions et cartes triées du plus récent au plus ancien ;
-   interface compacte ;
-   protection contre les noms japonais/chinois trop longs ;
-   récupération progressive des prix ;
-   plusieurs fallbacks d'image.

Les extensions françaises constituent la priorité de qualité du
catalogue. Les nouvelles extensions doivent pouvoir apparaître via les
sources distantes sans nécessiter une liste statique exhaustive dans
l'interface.

------------------------------------------------------------------------

## Scanner IA

### Scanner Mono

Pipeline général :

`Caméra → Capture → Gemini → résultat structuré → moteur de correspondance → données carte → prix`

Gemini est utilisé pour comprendre la carte photographiée. La
correspondance finale avec le catalogue reste séparée afin de limiter
les faux positifs et de profiter des mêmes données que la recherche
standard.

### Scanner multilingue

Le scanner exploite notamment :

-   langue détectée ;
-   nom original ;
-   numéro de carte ;
-   code / extension ;
-   variante ;
-   candidats provenant du moteur de données commun.

Pour JP/ZH, le numéro et l'extension doivent être privilégiés par
rapport à une traduction approximative du nom.

### Batch

Le mode Batch permet une capture de quatre cartes avec quatre zones
guidées. Les étapes mobiles sont volontairement courtes :
`Photo → Carte → Match → Prix`.

------------------------------------------------------------------------

## PSA / IA Grade

L'estimation PSA est une fonctionnalité expérimentale et **non
officielle**.

Parcours :

1.  Face avant.
2.  Face arrière.
3.  Inclinaison avant.
4.  Inclinaison arrière.
5.  Analyse Gemini.
6.  Contrôle manuel structuré des défauts difficiles à confirmer sur
    photo.
7.  Estimation affinée.

Critères analysés : centrage, coins, bords, surface, défauts visibles et
qualité des photos.

Le contrôle manuel utilise uniquement des choix structurés (points
blancs, rayures, coins, bords, pli/enfoncement, défaut difficile à
voir). **Aucun champ de texte libre n'est utilisé.**

La confiance ne constitue jamais une garantie de grade officiel et
l'application doit refuser ou nuancer l'estimation lorsque les photos
sont insuffisantes.

------------------------------------------------------------------------

## Pages principales

``` text
app/
├── page.tsx                 # Accueil / accès anticipé
├── recherche/               # Recherche cartes et extensions
├── scanner/                 # Scanner Mono / Batch
├── collection/              # Collection principale
├── dashboard/               # Portfolio et statistiques
├── card/[id]/               # Fiche détaillée d'une carte
├── psa/                     # Collection PSA + IA Grade
├── favoris/                 # Favoris
├── reglages/                # Réglages / fonctionnalités
└── api/
    ├── scan/                # Gemini Scanner
    ├── psa-grade/           # Gemini estimation PSA
    ├── cards/               # Proxy serveur catalogue
    └── prices/              # Agrégation / normalisation des prix
```

Modules importants :

``` text
components/
├── cards/
├── scanner/
├── psa/
└── Navbar.tsx

lib/
├── pokemon.ts
├── pokemonTranslator.ts
├── pokemon/
│   ├── normalize.ts
│   └── ocrAliases.ts
├── scanner/
├── psa/
├── priceClient.ts
└── types.ts
```

------------------------------------------------------------------------

## pokemonTranslator --- transition en cours

`lib/pokemonTranslator.ts` reste temporairement présent pour préserver
la compatibilité des recherches existantes.

La V5 a commencé à extraire ses responsabilités vers des modules plus
petits :

-   `lib/pokemon/normalize.ts` --- normalisation des chaînes et suffixes
    ;
-   `lib/pokemon/ocrAliases.ts` --- erreurs OCR réellement utiles ;
-   index multilingue dynamique à poursuivre afin de réduire
    progressivement le dictionnaire statique.

Le fichier historique ne doit pas être supprimé avant validation
complète du nouveau moteur FR/EN/JP/ZH.

------------------------------------------------------------------------

## Design V5

Direction artistique : premium mobile, sombre, lisible et identifiable.

Principes :

-   noir profond comme fond ;
-   cyan/bleu King_TCG comme couleur de marque ;
-   vert réservé principalement aux valeurs positives ;
-   rouge aux pertes / alertes négatives ;
-   violet et orange comme accents secondaires ;
-   cartes compactes ;
-   suppression des espaces verticaux inutiles ;
-   vrais logos de services lorsque les assets sont disponibles ;
-   priorité absolue à l'utilisation sur téléphone.

La Navbar utilise la couronne King_TCG et un sous-titre court
`Pokémon Trading Card`.

------------------------------------------------------------------------

## Audit mobile actuel

La passe d'audit V5 a notamment couvert :

-   Navbar et accueil ;
-   Dashboard ;
-   portefeuille détaillé ;
-   recherche et extensions ;
-   fiche carte ;
-   réglages ;
-   PSA ;
-   Scanner Mono / Batch.

La Collection principale est actuellement considérée comme l'une des
zones visuelles les plus abouties et doit être modifiée avec prudence.

------------------------------------------------------------------------

## Règles de développement

1.  Ne jamais supprimer une fonctionnalité, un bouton ou un raccourci
    existant sans décision explicite.
2.  Préserver les métadonnées d'une carte même lorsqu'une source de prix
    échoue.
3.  Garder les clés API côté serveur.
4.  Réutiliser le moteur de données commun plutôt que créer des
    catalogues divergents entre Recherche et Scanner.
5.  Ne jamais inventer un prix pour remplir une donnée manquante.
6.  Optimiser d'abord pour mobile.
7.  Tester `npm run build` après chaque Sprint.
8.  Pour les modifications importantes, fournir la liste exacte des
    fichiers modifiés et des nouveaux assets.

------------------------------------------------------------------------

## Tests de non-régression prioritaires

Après une modification Data / Scanner :

-   recherche FR récente ;
-   recherche EN ;
-   carte JP récente ;
-   carte ZH si disponible ;
-   recherche par extension ;
-   image / extension / numéro / rareté ;
-   Cardmarket / TCGPlayer / JustTCG ;
-   fiche détaillée ;
-   ajout Collection ;
-   Scanner Mono ;
-   PSA IA Grade ;
-   build Next.js.

------------------------------------------------------------------------

## Roadmap immédiate

### Data V5

-   compléter et fiabiliser les extensions françaises récentes ;
-   améliorer les fallbacks d'images ;
-   réduire les écarts entre prix Recherche et fiche détaillée ;
-   poursuivre l'index multilingue dynamique ;
-   intégrer proprement la médiane des annonces eBay actives lorsqu'une
    source gratuite fiable est disponible.

### Scanner

Une fois la fondation Data stabilisée :

-   reconnecter et calibrer le Scanner JP/ZH sur le catalogue commun ;
-   améliorer le matching numéro + extension ;
-   mesurer la stabilité sur les extensions les plus récentes.

### PSA

-   continuer les tests de répétabilité du grade ;
-   améliorer la stabilité de confiance ;
-   conserver l'approche hybride photos + contrôle manuel structuré.

------------------------------------------------------------------------

## État du projet

**King_TCG V5.0 --- Accès anticipé**\
Base fonctionnelle : Recherche, Collection, Dashboard, Scanner Gemini,
Batch, PSA Collection et estimation PSA IA.\
Priorité actuelle : qualité des données, couverture multilingue, prix
gratuits, stabilité mobile et calibration du Scanner.
