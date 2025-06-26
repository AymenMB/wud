#!/bin/bash

echo "================================"
echo "    WUD E-COMMERCE SETUP"
echo "================================"
echo

# Vérifier si Node.js est installé
if ! command -v node &> /dev/null; then
    echo "ERREUR: Node.js n'est pas installé!"
    echo "Veuillez installer Node.js depuis https://nodejs.org/"
    exit 1
fi

echo "Node.js détecté: $(node --version)"
echo

# Installer les dépendances du backend
echo "[1/4] Installation des dépendances du backend..."
npm install
if [ $? -ne 0 ]; then
    echo "ERREUR: Échec de l'installation des dépendances backend"
    exit 1
fi

# Installer les dépendances du frontend
echo "[2/4] Installation des dépendances du frontend..."
cd frontend
npm install
if [ $? -ne 0 ]; then
    echo "ERREUR: Échec de l'installation des dépendances frontend"
    exit 1
fi
cd ..

echo "[3/4] Configuration terminée!"
echo

# Créer un fichier .env s'il n'existe pas
if [ ! -f .env ]; then
    echo "[4/4] Création du fichier .env..."
    cat > .env << EOF
MONGODB_URI=mongodb://localhost:27017/wud-ecommerce
JWT_SECRET=your-super-secret-jwt-key-here-change-in-production
PORT=3001
NODE_ENV=development
EOF
    echo
    echo "Fichier .env créé avec les valeurs par défaut."
    echo "IMPORTANT: Modifiez le JWT_SECRET en production!"
    echo
fi

echo "================================"
echo "       DÉMARRAGE DES SERVEURS"
echo "================================"
echo
echo "Backend: http://localhost:3001"
echo "Frontend: http://localhost:5173"
echo
echo "ADMIN LOGIN:"
echo "Email: admin@wud.com"
echo "Password: admin123"
echo
echo "================================"
echo "Démarrage en cours..."
echo "================================"

# Démarrer le backend en arrière-plan
echo "Démarrage du backend..."
npm run dev &
BACKEND_PID=$!

# Attendre 3 secondes
sleep 3

# Démarrer le frontend
echo "Démarrage du frontend..."
cd frontend
npm run dev &
FRONTEND_PID=$!

echo
echo "Les deux serveurs sont en cours de démarrage..."
echo "Patientez quelques secondes puis ouvrez:"
echo "- Frontend: http://localhost:5173"
echo "- Backend API: http://localhost:3001"
echo
echo "Pour vous connecter en tant qu'admin:"
echo "1. Allez sur http://localhost:5173"
echo "2. Cliquez sur 'Connexion'"
echo "3. Utilisez: admin@wud.com / admin123"
echo "4. Accédez au dashboard admin via le menu"
echo
echo "Appuyez sur Ctrl+C pour arrêter les serveurs"

# Attendre que l'utilisateur interrompe
wait
