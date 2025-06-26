# Wud' - Application E-commerce Artisanale

Projet d'application e-commerce full-stack pour "Wud'", une boutique de mobilier haut de gamme en bois massif fait main.

## Structure du Projet

Le projet est divisé en deux principaux dossiers :

-   `backend/`: Contient l'API RESTful développée avec Node.js, Express.js, et MongoDB (Mongoose).
-   `frontend/`: Contient l'application frontend statique construite avec HTML, Tailwind CSS, et JavaScript Vanilla (utilisant Vite comme outil de build).

## Stack Technique

**Backend:**
*   Node.js
*   Express.js
*   MongoDB (avec Mongoose)
*   JWT pour l'authentification

**Frontend:**
*   HTML, CSS, JavaScript (Vanilla)
*   Tailwind CSS
*   Vite (outil de build)

## Prérequis

*   Node.js (version 18.x ou supérieure recommandée)
*   npm (généralement inclus avec Node.js)
*   MongoDB (instance locale ou distante accessible)

## Installation

1.  **Cloner le dépôt (si applicable) :**
    ```bash
    git clone <url-du-depot>
    cd wud-ecommerce
    ```

2.  **Installer les dépendances du Backend :**
    ```bash
    cd backend
    npm install
    ```

3.  **Installer les dépendances du Frontend :**
    ```bash
    cd ../frontend
    npm install
    ```
    *(Note: L'agent a configuré les fichiers mais n'a pas pu exécuter `npm install` dans le dossier frontend en raison de limitations du bac à sable. Vous devrez le faire manuellement).*

## Configuration

1.  **Backend :**
    *   À la racine du dossier `backend/`, copiez `.env.example` vers un nouveau fichier nommé `.env`.
    *   Modifiez les variables dans `.env` selon votre configuration :
        *   `MONGODB_URI`: Votre chaîne de connexion MongoDB (ex: `mongodb://localhost:27017/wud_db`).
        *   `PORT`: Le port sur lequel le serveur backend tournera (ex: 3000).
        *   `JWT_SECRET`: Une chaîne aléatoire forte pour signer les tokens JWT (ex: `votreSuperSecretDe32CaracteresMinimum`).
        *   `JWT_EXPIRES_IN`: Durée de validité des tokens (ex: `1h`, `7d`).
        *   `CORS_ORIGIN`: L'URL de votre frontend en développement (ex: `http://localhost:5173` si Vite tourne sur ce port). Pour la production, mettez l'URL de votre frontend déployé.
        *   `NODE_ENV`: `development` ou `production`.

2.  **Frontend :**
    *   Dans `frontend/src/js/api.js`, la constante `BASE_URL` est définie sur `http://localhost:3000/api`. Ajustez-la si votre backend tourne sur un port différent en développement. En production, cette URL devra pointer vers votre API backend déployée.
    *   Vite est configuré pour servir le frontend. Le port par défaut est généralement `5173`.

## Lancement de l'Application

1.  **Démarrer le serveur Backend :**
    Depuis le dossier `backend/` :
    ```bash
    npm run dev
    ```
    (Utilise `nodemon` pour le redémarrage automatique en développement)
    Ou pour une exécution simple :
    ```bash
    npm start
    ```

2.  **Démarrer le serveur de développement Frontend :**
    Depuis le dossier `frontend/` :
    ```bash
    npm run dev
    ```
    Ouvrez votre navigateur à l'adresse indiquée (généralement `http://localhost:5173`). Assurez-vous que le backend est démarré et accessible.

## Build pour la Production (Frontend)

Depuis le dossier `frontend/` :
```bash
npm run build
```
Les fichiers optimisés pour la production seront générés dans le dossier `frontend/dist/`. Ces fichiers peuvent ensuite être déployés sur un serveur statique.

## Fonctionnalités Implémentées (Résumé)

*   **Backend :** API RESTful complète pour produits, catégories, utilisateurs (clients/admin), commandes, panier, wishlist, demandes sur mesure, articles de blog, inscriptions newsletter. Authentification JWT.
*   **Frontend :** Interface utilisateur pour parcourir les produits, gérer le panier/wishlist, passer des commandes, consulter son compte, lire le blog, soumettre des demandes sur mesure. Structure de base pour un dashboard admin.

## Données JSON Simulées

Des fichiers d'exemples de données (`sample.products.json`, `sample.categories.json`, `sample.users.json`) sont fournis dans le dossier `backend/sample-data/`. Vous pouvez les utiliser pour peupler votre base de données MongoDB avec des outils comme `mongoimport` ou des scripts de seeding personnalisés.
Pour `mongoimport` (assurez-vous que votre base de données s'appelle `wud_db` ou ajustez) :
```bash
mongoimport --db wud_db --collection users --file backend/sample-data/sample.users.json --jsonArray
mongoimport --db wud_db --collection categories --file backend/sample-data/sample.categories.json --jsonArray
mongoimport --db wud_db --collection products --file backend/sample-data/sample.products.json --jsonArray
# (Répétez pour les autres collections si des données d'exemple sont fournies)
```

---
Ce projet a été développé avec l'assistance de Jules, un agent IA expert en développement logiciel.
