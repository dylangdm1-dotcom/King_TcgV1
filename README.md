# 📖 Présentation

**King_TCG** est une application web destinée aux collectionneurs de cartes Pokémon souhaitant transformer leur collection en un véritable **portfolio intelligent**.

L'application permet de :
* Gérer une collection complète
* Suivre la valeur des cartes
* Analyser les tendances du marché
* Détecter des opportunités
* Surveiller les variations de prix
* Scanner des cartes automatiquement depuis une caméra

L'objectif est de réunir dans une seule plateforme :
* Collection
* Marché
* Analyse financière
* Intelligence d'investissement
* Automatisation

---

# ✨ Fonctionnalités

## 📊 Dashboard

Vue globale du portfolio :
* Valeur estimée de la collection
* Nombre de cartes
* Statistiques principales
* Aperçu des performances
* Analyse globale

---

# 🃏 Gestion de collection

Gestion complète des cartes :
* Ajout et suppression de cartes
* Gestion des quantités et des favoris
* Informations d'achat et état des cartes
* Organisation par extensions

**Stockage actuel :**
* Local Storage synchronisé
* Gestion automatique des mises à jour

---

# 🔎 Scanner intelligent

Système de reconnaissance de cartes Pokémon.

**Fonctionnalités :**
* Accès et utilisation de la caméra mobile (arrière)
* Capture d'image et analyse OCR
* Recherche automatique de carte et ajout rapide dans la collection

**Architecture du scanner :**
```text
Camera ──> Capture image ──> OCR ──> Recherche carte ──> Ajout collection
💰 Analyse des prix
King_TCG intègre un système d'analyse du marché.

Sources supportées :

Cardmarket

TCGPlayer

eBay (en préparation)

Autres fournisseurs compatibles

Fonctions :

Prix actuel & historique des prix

Évolution du marché & comparaison des valeurs

Détection d'opportunités

🔔 Alertes intelligentes
Surveillance automatique :

Variations de prix & seuils personnalisés

Opportunités d'achat & risques de baisse

Types d'alertes :

BUY

HOLD

SELL

WATCH

📈 Intelligence marché & investissement
Plusieurs moteurs internes analysent les cartes :

Market Engine : Analyse les prix, les tendances et l'évolution globale du marché.

Prediction Engine : Prépare l'analyse des évolutions futures, du ROI potentiel et des tendances.

Investment Engine : Calcule le score d'investissement, le potentiel, les risques et génère des recommandations.

🏗️ Architecture
Stack technique
Frontend
Framework : Next.js 13, React

Langage : TypeScript

Styling : Tailwind CSS

Interface
Dark premium UI (Bento Design)

Responsive mobile

Composants réutilisables

Structure principale
Plaintext
app/
├── scanner
├── recherche
├── collection
├── dashboard
├── alerts
└── opportunity

components/
├── scanner
├── dashboard
└── UI

lib/
├── alertEngine.ts
├── opportunity.ts
├── investment.ts
├── marketEngine.ts
├── priceHistory.ts
├── priceIntelligence.ts
├── pokemon.ts
├── search.ts
├── storage.ts
└── types.ts

services/
└── market/
    ├── analysis
    └── provider
🚀 Installation
Prérequis
Node.js >= 20

npm ou pnpm

Guide pas à pas
Cloner le projet :

Bash
git clone [https://github.com/your-account/King_TCG.git](https://github.com/your-account/King_TCG.git)
cd King_TCG
Installer les dépendances :

Bash
npm install
Lancer le serveur de développement :

Bash
npm run dev
L'application sera disponible sur http://localhost:3000.

🧪 Tests avant production
Vérification complète du build :

Bash
npm run build
Le build doit se terminer avec les indications suivantes :

Plaintext
✓ Compiled successfully
✓ Checking validity of types
✓ Generating static pages
✓ Finalizing page optimization
🌐 Déploiement
King_TCG est compatible avec Vercel ou toute plateforme Node.js compatible Next.js.

Flux de déploiement automatique :

Plaintext
GitHub ──> Vercel ──> Production
⚙️ Variables d'environnement
Créer un fichier .env.local à la racine et y ajouter :

Extrait de code
NEXT_PUBLIC_API_URL=
DATABASE_URL=
🗺️ Roadmap
✅ V1 - Fonctionnelle
Interface :

[x] Design Dark premium

[x] Navigation complète

[x] Responsive mobile

[x] Dashboard & Pages cartes

Collection :

[x] Ajout, suppression & quantités

[x] Favoris

[x] Informations d'achat

Analyse :

[x] Prix marché & Historique

[x] Investment Score

[x] Opportunités & Alertes

Scanner :

[x] Caméra mobile & Capture d'image

[x] API Scanner & Recherche automatique

🔜 Prochaines améliorations
Portfolio Premium
[ ] ROI global

[ ] Évolution sur 7 / 30 / 365 jours

[ ] Graphiques avancés

[ ] Répartition par extensions et raretés

[ ] Performance du portefeuille

Intelligence avancée
[ ] Modèles prédictifs améliorés

[ ] Analyse des tendances du marché

[ ] Détection automatique des cartes sous-évaluées

[ ] Comparaison historique

Expérience utilisateur
[ ] Remplacement des emojis par Lucide Icons

[ ] Skeleton loaders & animations avancées

[ ] Mode tablette

[ ] Optimisations de performances

🎯 Vision du projet
King_TCG veut devenir un véritable assistant intelligent pour les collectionneurs Pokémon.

"Ne plus seulement posséder des cartes, mais comprendre leur valeur."

Le projet combine Collection, Données marché, Analyse financière et Intelligence artificielle pour proposer une nouvelle manière de gérer un patrimoine TCG.

🤝 Contribution
Les contributions sont les bienvenues !

Créez une nouvelle branche :

Bash
git checkout -b feature/nouvelle-fonctionnalite
Effectuez vos modifications.

Ouvrez une Pull Request.

📄 Licence
Projet privé - Tous droits réservés.
