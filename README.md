# 👑 King TCG — README Officiel

**Version actuelle :** V3 — Scanner IA (Gemini Vision) en cours de finalisation  
**Stack :** Next.js App Router, React, TypeScript, TailwindCSS  
**Intelligence Artificielle :** Google Gemini Vision  
**APIs :** Pokémon TCG API (CardMarket, TCGPlayer), Canvas API, MediaDevices, LocalStorage  

---

## 📌 Présentation & Objectifs

King TCG est une application web moderne dédiée à l'univers du Pokémon Trading Card Game. Le projet dépasse la simple base de données de cartes : son objectif est de développer un assistant intelligent capable de reconnaître automatiquement une carte Pokémon via IA, de retrouver instantanément ses informations officielles et d'en permettre la gestion complète au sein d'une collection.

### Objectifs du projet
* **Vitesse :** Scanner une carte en moins de deux secondes.
* **Reconnaissance automatique :** Langue, Pokémon, cartes Trainer/Energy, variantes, Full Art, Secret Rare, extension et numéro.
* **Navigation & Estimation :** Ouverture directe de la bonne fiche, estimation du prix réel et suivi de son évolution.
* **Gestion & Outils :** Collection complète, statistiques avancées et outils d'investissement.

---

## 🏗️ Architecture Générale

Caméra ➔ Capture vidéo ➔ Canvas ➔ Image JPEG ➔ Gemini Vision ➔ CardScanResult ➔ pokemonTranslator ➔ pokemon.ts ➔ Pokémon TCG API ➔ Score des résultats ➔ Carte retenue ➔ Page Carte

### Philosophie du Scanner
Gemini sert uniquement de moteur OCR intelligent pour la lecture d'image et n'interroge jamais directement la base Pokémon TCG. Le flux suit la chaîne : Gemini ➔ lecture ➔ nettoyage ➔ traduction ➔ matching ➔ Pokémon API. Cette séparation garantit l'indépendance du moteur de recherche, la maîtrise du score et des performances constantes.

---

## 📂 Structure du Projet

king-tcg/
├── app/
│   ├── api/scan/       # Endpoint IA (Gemini Vision)
│   ├── scanner/        # Page du scanner
│   ├── dashboard/      # Tableau de bord
│   ├── card/           # Page de fiche carte
│   ├── alerts/         # Gestion des alertes
│   └── favoris/        # Cartes favorites
├── components/
│   ├── scanner/        # ScannerCamera, ScannerOverlay, etc.
│   ├── navbar/         # Barre de navigation
│   └── ui/             # Composants d'interface
├── lib/
│   ├── scanner/        # Logique de capture (capture.ts)
│   ├── pokemon.ts      # Moteur de recherche, scoring et cache
│   ├── pokemonTranslator.ts # Nettoyage OCR, traduction FR -> EN
│   ├── types.ts        # Interfaces TypeScript (CardScanResult, PokemonCard)
│   └── cache/          # Cache mémoire et LocalStorage
├── public/
├── styles/
└── package.json

### Fichiers critiques du pipeline
Le pipeline repose sur la chaîne : capture.ts ➔ route.ts ➔ ScannerPage ➔ pokemonTranslator.ts ➔ pokemon.ts ➔ CardPage. Toute modification sur l'un de ces fichiers peut impacter l'ensemble du scanner et exige une évolution conjointe.

---

## 🧩 Architecture Logique en 5 Couches

1. Couche 1 — Capture caméra (capture.ts) : Création d'une image JPEG optimisée via Canvas.
2. Couche 2 — Analyse IA (app/api/scan/route.ts) : Envoi à Gemini Vision et extraction d'un CardScanResult brut (Nom, Pokémon, Numéro, Extension, Langue, Rareté, Variante, Confiance).
3. Couche 3 — Résolution (pokemonTranslator.ts) : Correcteur OCR (ex: Dracofeu ➔ Dracaufeu), nettoyage des suffixes (EX, GX, V, VMAX, VSTAR, SAR, etc.), conservation des formes régionales (Alola, Hisui, Paldea) et traduction (Dracaufeu ➔ Charizard).
4. Couche 4 — Recherche (pokemon.ts) : Exécution de recherches successives (Fallbacks : Nom+N° ➔ Nom+Set ➔ Nom seul ➔ Nom FR ➔ N° seul), dédoublonnage et calcul du score de correspondance.
5. Couche 5 — Affichage (CardPage) : Redirection et rendu de la fiche carte retenue.

---

## 🛠️ Documentation Technique des Modules

### 1. app/api/scan/route.ts (API IA)
* Entrée : POST /api/scan avec corps { "imageBase64": "..." }.
* Modèles Gemini (ordre de fallback) : gemini-2.5-flash ➔ gemini-2.0-flash-lite ➔ gemini-flash-latest ➔ gemini-2.0-flash.
* Rôle strict : Convertir l'image, appeler Gemini, parser/valider le JSON et renvoyer un CardScanResult. Ne doit jamais appeler l'API Pokémon ni traduire/corriger le texte.

### 2. app/scanner/page.tsx & Composants UI
* ScannerPage : Contrôleur orchestrateur des états (ready, scanning, status, detectedCard).
* ScannerCamera.tsx : Gestion du flux vidéo HTML5 et demandes de permissions.
* ScannerOverlay.tsx : Interface graphique (cadre de visée, ligne d'animation, feedback).

### 3. lib/scanner/capture.ts
* Pipeline : Vidéo ➔ Crop centré ➔ Resize ➔ Canvas ➔ Compression JPEG ➔ Base64.
* Objectif : Supprimer les bandes noires, optimiser le poids et conserver la lisibilité de la carte.

### 4. lib/types.ts
* CardScanResult : Représente le résultat brut extrait par l'IA (sans prix ni ID).
* PokemonCard : Structure complète issue de l'API Pokémon TCG.
* Règle : Ces deux structures doivent rester strictly séparées.

### 5. lib/cache/
* Cache mémoire : Rapide, valable pendant la session.
* LocalStorage : Conservation persistante des cartes chargées pour limiter l'impact réseau.

---

## 🎯 Moteur de Recherche & Scoring (pokemon.ts)

Pour trier les résultats renvoyés par l'API Pokémon TCG, un score pondéré est attribué à chaque carte :
* Nom exact : +100 | Numéro exact : +150 | Extension exacte : +80
* Variante exacte : +60 | Forme régionale : +30 | Langue : +20 | Nom partiel : +40

La carte obtenant le score maximal est automatiquement sélectionnée.

---

## 📋 Audit Technique Complet

### Bilan par Module
* app/scanner/page.tsx (4/5) : Fonctionnel mais doit être déchargé vers un service scanPipeline.ts.
* capture.ts (5/5) : Très performant et lisible.
* route.ts (4/5) : Propre, à compléter avec retry intelligent et monitoring.
* pokemonTranslator.ts (3/5) : Fichier centralisé mais fragile ; à refactoriser en plusieurs sous-modules (dictionary, aliases, suffix, regional, resolver).
* pokemon.ts (4/5) : Moteur puissant à découper en sous-modules (searchEngine, score, cache, api).
* types.ts / UI / Cache (4.5/5 à 5/5) : Excellente séparation et typage solide.

### Performances Actuelles
* Capture : ~100 ms | Gemini : ~800 à 1800 ms | API Search : ~300 ms | Nav : ~100 ms
* Temps total : 1,5 à 3 secondes. (Objectif V4 : < 2s | Objectif V5 : < 1s)

### Matrice d'Audit Global

* Architecture : 9.5 / 10 | Qualité du code : 8.5 / 10
* Scanner IA : 8.0 / 10 | Performances : 8.0 / 10
* Typage TypeScript : 9.0 / 10 | Évolutivité : 10.0 / 10
* Lisibilité : 8.5 / 10 | Dette technique : Faible à moyenne

---

## 🚀 Roadmap Officielle & Changelog

### Version V3.5 — Stabilisation du Scanner (En cours)
* Amélioration du matching : Variantes, Full Art, Secret Rare, Trainer, Energy, cartes asiatiques et européennes.
* Correction OCR renforcée (0/O, 1/I, 5/S, 8/B) et ajout des formes régionales (Paldea, Galar, Paradox, etc.).
* Cible : 95% de reconnaissance réussie.

### Version V3.6 — Optimisation Moteur
* Recherches parallèles (gain de 30 à 60% de vitesse).
* Cache intelligent et préchargement au démarrage des séries/extensions.
* Fichiers de logs (scan.log, gemini.log, api.log).

### Version V4 — Scanner Nouvelle Génération
* Détection automatique de présence de carte, auto-focus, auto-crop et capture automatique sans clic.
* Correction de perspective (inclinaison, rotation 90°/180°/270°) et mode multi-scan / flux vidéo continu.

### Version V4.5 — Collection Pro
* Imports (CSV, Pokellector, Collectr), synchronisation Cloud multi-appareils, collections publiques/privées.
* Statistiques de collection : Valeur totale, ROI, historique d'achats/ventes, répartition.

### Version V5 — IA Avancée & Grading
* Analyse IA de l'état : Centrage, coins, bords, surface, estimation de note PSA/BGS/CGC, détection des contrefaçons.
* Prévision de prix (30j, 90j, 1an) et indicateurs d'investissement (Acheter / Conserver / Vendre).

### Version V6 à 1.0 — Écosystème Complet
* Marketplace, comparateur, Deck Builder, recherche vocale/visuelle, application PWA hors-ligne.
* Cible 1.0 : >99% de précision et traitement en moins de 2 secondes.

---

## 📝 Historique des Versions (Changelog)

* V1.0 : Création du projet et gestion de collection locale.
* V2.0 : Intégration Pokémon TCG API, fiches cartes et prix.
* V3.0 (Actuelle) : Scanner Gemini Vision, capture Canvas, overlay, module de traduction FR/EN, correction OCR et système de cache.
* V3.5 ➔ V1.0 : Stabilisation, automatisme, grading IA et plateforme globale (voir Roadmap).

---

## 📐 Conventions de Développement

1. Responsabilité unique : Une fonction = une tâche. La logique métier réside exclusivement dans lib/.
2. Immuabilité du pipeline : Capture ➔ Gemini ➔ CardScanResult ➔ Translator ➔ Search Engine ➔ API ➔ Scoring ➔ CardPage.
3. Typage strict : Toujours réutiliser CardScanResult et PokemonCard.
4. Isolations des modules : route.ts n'appelle jamais l'API Pokémon. pokemonTranslator.ts ne fait aucune recherche API. Le scoring doit être centralisé dans une fonction dédiée.
