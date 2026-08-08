# Scanner Data V5.1

## Modifications

- Scanner Mono et Batch raccordés au même catalogue que la Recherche standard.
- Matching prioritaire par langue, extension/code et numéro de collection.
- Classement par nom, rareté, variante et récence uniquement après validation de l'identité.
- Recherche JP/CN prioritaire dans l'extension détectée, avec fallback anglais contrôlé.
- Enrichissement des prix limité aux meilleurs candidats pour préserver les quotas gratuits.
- Timeouts explicites sur Gemini et les appels catalogue afin d'éviter les blocages.
- Messages distincts pour quota Gemini et analyse trop longue.
- Suppression du contour autour du logo King_TCG dans la Navbar, sans changement de taille ni de position.

## Fichiers modifiés

- `app/scanner/page.tsx`
- `lib/scanner/searchFromScan.ts`
- `app/globals.css`

## Fichier ajouté

- `CHANGELOG-SCANNER-DATA-V5.1.md`
