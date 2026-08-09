# Correction régression Scanner

- Normalisation de la confiance Gemini lorsqu'elle est renvoyée entre 0 et 1.
- Suppression du rejet automatique sous 55 % quand des signaux identitaires sont exploitables.
- Matching `extension + numéro` autorisé même si le nom est illisible.
- Rejet uniquement lorsqu'aucun nom, numéro ou set exploitable n'est détecté.
- Anciens changelogs racine regroupés dans `docs/changelogs/`.
