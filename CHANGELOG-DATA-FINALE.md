# Phase Data finale

## Recherche
- Alias FR/EN/OCR étendus via le traducteur et la distance de Levenshtein.
- Les identifiants d'extension TCGdex sont dérivés depuis l'id de carte lorsque le résumé ne contient pas `set`.
- Tri récent → ancien effectué avant les appels de détail TCGdex.
- Les détails sont chargés en priorité pour les 48 cartes les plus récentes.

## Extensions
- Pagination complète du fallback Pokémon TCG API (jusqu'à 6 pages de 250 cartes).
- Toutes les cartes TCGdex d'une extension restent conservées, même si seuls les premiers détails sont hydratés.

## Images
- Les fallbacks TCGdex utilisent maintenant aussi l'identifiant d'extension dérivé depuis la carte.

## Prix
- Ajout d'un contrat normalisé `getNormalizedMarketSummary` partagé par les résultats de recherche.
- Une carte ayant une vraie cotation est toujours considérée `available`, même si un ancien statut était resté en cache.

## Nettoyage
- Suppression du fournisseur vide `pokemonPriceTracker` et de son export.
- Suppression de `public/pokemonNames.json`, non référencé par le code.

## Non modifié
- Scanner.
- PSA.
- Collection.
- Dashboard.
