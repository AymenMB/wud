# 🚀 DÉMARRAGE RAPIDE - WUD E-COMMERCE

## Installation et Démarrage Automatique

### Windows
```bash
# Double-cliquez sur start.bat OU exécutez dans PowerShell :
.\start.bat
```

### Linux/Mac
```bash
# Rendez le script exécutable et lancez-le :
chmod +x start.sh
./start.sh
```

### Démarrage Manuel

Si vous préférez démarrer manuellement :

1. **Backend** (Terminal 1) :
```bash
npm install
npm run dev
```

2. **Frontend** (Terminal 2) :
```bash
cd frontend
npm install
npm run dev
```

## 🔐 CONNEXION ADMINISTRATEUR

### Identifiants Admin par défaut :
- **Email :** `admin@wud.com`
- **Mot de passe :** `admin123`

### Comment accéder au Dashboard Admin :

1. **Ouvrez le frontend :** http://localhost:5173
2. **Connectez-vous :**
   - Cliquez sur "Connexion" en haut à droite
   - Entrez : `admin@wud.com` / `admin123`
3. **Accédez au Dashboard :**
   - Une fois connecté, un lien "Admin" apparaîtra dans le menu
   - OU allez directement à : http://localhost:5173/src/pages/admin/admin.html

## 🛠️ FONCTIONNALITÉS ADMIN

Une fois connecté en tant qu'admin, vous pouvez :

### 📦 **Gestion des Produits**
- **Créer un nouveau produit** avec images, descriptions, prix
- **Modifier** les produits existants
- **Gérer les catégories** et sous-catégories
- **Contrôler la visibilité** (publié/brouillon)

### 👥 **Gestion des Utilisateurs**
- Voir tous les utilisateurs inscrits
- Modifier les rôles (client/admin)
- Gérer les comptes utilisateurs

### 📋 **Gestion des Commandes**
- Voir toutes les commandes
- Changer le statut des commandes
- Suivre les paiements

### 📝 **Gestion du Blog**
- Créer des articles de blog
- Publier/dépublier des articles
- Gérer le contenu éditorial

### 📧 **Newsletter**
- Voir les abonnés à la newsletter
- Gérer les inscriptions

### 🎨 **Demandes Sur Mesure**
- Voir les demandes de projets personnalisés
- Gérer le statut des demandes
- Communiquer avec les clients

## 🔧 CONFIGURATION

### Base de Données
- **MongoDB** : `mongodb://localhost:27017/wud-ecommerce`
- Assurez-vous que MongoDB est installé et en marche

### Variables d'Environnement
Le fichier `.env` sera créé automatiquement avec :
```env
MONGODB_URI=mongodb://localhost:27017/wud-ecommerce
JWT_SECRET=your-super-secret-jwt-key-here-change-in-production
PORT=3001
NODE_ENV=development
```

## 📱 URLs Utiles

- **Frontend :** http://localhost:5173
- **Backend API :** http://localhost:3001
- **Admin Dashboard :** http://localhost:5173/src/pages/admin/admin.html

## 🆘 Problèmes Courants

### Port déjà utilisé
Si le port 3001 est occupé :
```bash
# Windows
netstat -ano | findstr :3001
taskkill /PID <PID_NUMBER> /F

# Linux/Mac
lsof -ti:3001 | xargs kill -9
```

### MongoDB non connecté
Assurez-vous que MongoDB est installé et démarré :
```bash
# Installation MongoDB (Windows)
# Téléchargez depuis https://www.mongodb.com/try/download/community

# Démarrage MongoDB
mongod
```

Bon développement ! 🎉
