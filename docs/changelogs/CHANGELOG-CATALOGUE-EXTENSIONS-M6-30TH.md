# Catalogue extensions — M6 et sorties à venir

## Modifications

- classification commune des extensions par identifiant, série, date et nom ;
- reconnaissance des préfixes `M/ME`, `SV/EV/CSV`, `SWSH/EB`, `SM/SL`, `XY`, `BW/NB`, `HGSS` et `DP` ;
- tri commun récent → ancien pour les extensions et les résultats de recherche ;
- hydratation des métadonnées TCGdex manquantes avec cache local de 7 jours ;
- injection de secours de M6 japonais si le résumé TCGdex n'est pas encore actualisé ;
- ajout d'une zone repliable « À venir » dans la Recherche ;
- ajout officiel de `30th CELEBRATION` (M6a), sortie le 16 septembre 2026, prix officiel 360 ¥ ;
- bouton « Cartes révélées » affiché uniquement si l'extension existe déjà dans la base ;
- les extensions futures sont exclues du catalogue normal jusqu'à leur date de sortie.

## Fichiers

- `app/recherche/page.tsx`
- `lib/pokemon.ts`
- `lib/search.ts`
- `lib/setCatalog.ts` (nouveau)
