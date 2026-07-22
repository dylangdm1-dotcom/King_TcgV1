# 👑 King_TCG

> Une plateforme intelligente de gestion, d'analyse et de suivi de collection de cartes Pokémon.

![King_TCG Banner](./public/banner.png)

## 📖 Présentation

**King_TCG** est une application web dédiée aux collectionneurs de cartes Pokémon souhaitant gérer leur collection, suivre la valeur de leurs cartes et prendre de meilleures décisions grâce à des outils d'analyse avancés.

L'objectif du projet est de transformer une collection classique en un véritable **portfolio intelligent**, combinant :

- Gestion de collection
- Analyse de marché
- Suivi des prix
- Alertes personnalisées
- Prédictions d'évolution
- Aide à l'investissement
- Scanner intelligent de cartes


---

# ✨ Fonctionnalités

## 📊 Dashboard

Une vue globale de votre collection :

- Valeur totale estimée
- Nombre de cartes
- Statistiques principales
- Aperçu des dernières acquisitions
- Évolution globale du portfolio

---

## 🃏 Gestion de collection

Gérez facilement vos cartes :

- Ajout de cartes
- Organisation par extensions
- Gestion des raretés
- Suivi des cartes favorites
- Historique de collection

---

## 🔎 Scanner de cartes

Identification rapide des cartes grâce au scanner intégré :

- Reconnaissance depuis la caméra
- Recherche automatique
- Ajout simplifié dans la collection

---

## 💰 Analyse des prix

Système intelligent de récupération et comparaison des prix :

Sources compatibles :

- Cardmarket
- eBay
- TCGPlayer
- PriceCharting

Fonctionnalités :

- Prix actuel
- Historique des variations
- Comparaison marché
- Détection d'opportunités

---

## 🔔 Alertes intelligentes

Surveillez vos cartes :

- Variation de prix
- Seuil personnalisé
- Opportunités d'achat
- Evolutions importantes

---

## 📈 Intelligence marché & investissement

King_TCG intègre plusieurs moteurs d'analyse :

### Market Engine

Analyse globale du marché.

### Prediction Engine

Estimation des tendances futures.

### Investment Engine

Aide à identifier :

- Cartes avec potentiel
- Progressions importantes
- Opportunités intéressantes


---

# 🏗️ Architecture

## Stack technique

### Frontend

- Next.js
- React
- TypeScript
- Tailwind CSS

### Design

- Dark mode premium
- Bento UI
- Components réutilisables
- Animations modernes


### Services internes

```
lib/
 └── priceProviders/

services/
 ├── alerts
 ├── collection
 ├── favorites
 ├── investment
 ├── marketEngine
 ├── predictionEngine
 ├── pokemon
 ├── priceHistory
 └── scanner
```

---

# 🚀 Installation

## Prérequis

- Node.js >= 20
- npm / pnpm

---

## Installation

Cloner le projet :

```bash
git clone https://github.com/your-account/King_TCG.git
```

Installer les dépendances :

```bash
npm install
```

Lancer le serveur de développement :

```bash
npm run dev
```

L'application sera disponible sur :

```
http://localhost:3000
```

---

# ⚙️ Variables d'environnement

Créer un fichier :

```
.env.local
```

Ajouter vos variables :

```env
NEXT_PUBLIC_API_URL=
DATABASE_URL=
```

---

# 🗺️ Roadmap

## ✅ V1 - Presque terminée

### Design & expérience

- [x] Design system Dark/Zinc
- [x] Interface Bento
- [x] Navigation complète
- [x] Dashboard moderne
- [x] Pages cartes optimisées

### Fonctionnalités principales

- [x] Collection
- [x] Favoris
- [x] Scanner
- [x] Recherche
- [x] Alertes
- [x] Analyse prix
- [x] Marché
- [x] Prédiction
- [x] Investissement


---

## 🔜 Prochaines améliorations

### Portfolio Premium

Prévu :

- Valeur totale
- ROI global
- Evolution 7/30/365 jours
- Graphiques interactifs
- Répartition extensions
- Répartition raretés
- Top gagnants/perdants


### Notification Center

- Alertes regroupées
- Historique
- Actions rapides


### UI Final Polish

- Remplacement emojis par Lucide Icons
- Skeleton loaders
- Empty states
- Animations avancées
- Optimisation responsive


---

# 🎯 Vision du projet

King_TCG ambitionne de devenir un véritable assistant pour collectionneurs :

> "Ne plus seulement posséder des cartes, mais comprendre leur valeur."

Le projet combine collection, données marché et intelligence artificielle afin d'offrir une expérience complète aux passionnés du TCG Pokémon.


---

# 🤝 Contribution

Les contributions sont les bienvenues.

Avant toute modification :

1. Créer une branche :

```bash
git checkout -b feature/nouvelle-fonctionnalite
```

2. Effectuer vos changements.

3. Créer une Pull Request.


---

# 📄 Licence

Projet privé - Tous droits réservés.

---

# 👑 King_TCG

Built with ❤️ for Pokémon TCG collectors.