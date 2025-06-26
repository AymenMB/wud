@echo off
echo ================================
echo    WUD E-COMMERCE SETUP
echo ================================
echo.

REM Vérifier si Node.js est installé
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERREUR: Node.js n'est pas installé!
    echo Veuillez installer Node.js depuis https://nodejs.org/
    pause
    exit /b 1
)

echo Node.js detecte: 
node --version
echo.

REM Installer les dépendances du backend
echo [1/4] Installation des dependances du backend...
npm install
if %errorlevel% neq 0 (
    echo ERREUR: Echec de l'installation des dependances backend
    pause
    exit /b 1
)

REM Installer les dépendances du frontend
echo [2/4] Installation des dependances du frontend...
cd frontend
npm install
if %errorlevel% neq 0 (
    echo ERREUR: Echec de l'installation des dependances frontend
    pause
    exit /b 1
)
cd ..

echo [3/4] Configuration terminee!
echo.

REM Créer un fichier .env s'il n'existe pas
if not exist .env (
    echo [4/4] Creation du fichier .env...
    echo MONGODB_URI=mongodb://localhost:27017/wud-ecommerce > .env
    echo JWT_SECRET=your-super-secret-jwt-key-here-change-in-production >> .env
    echo PORT=3001 >> .env
    echo NODE_ENV=development >> .env
    echo.
    echo Fichier .env cree avec les valeurs par defaut.
    echo IMPORTANT: Modifiez le JWT_SECRET en production!
    echo.
)

echo ================================
echo       DEMARRAGE DES SERVEURS
echo ================================
echo.
echo Backend: http://localhost:3001
echo Frontend: http://localhost:5173
echo.
echo ADMIN LOGIN:
echo Email: admin@wud.com
echo Password: admin123
echo.
echo ================================
echo Demarrage en cours...
echo ================================

REM Démarrer le backend en arrière-plan
start "WUD Backend" cmd /k "echo Backend WUD demarre... && npm run dev"

REM Attendre 3 secondes
timeout /t 3 /nobreak >nul

REM Démarrer le frontend
start "WUD Frontend" cmd /k "echo Frontend WUD demarre... && cd frontend && npm run dev"

echo.
echo Les deux serveurs sont en cours de demarrage...
echo Patientez quelques secondes puis ouvrez:
echo - Frontend: http://localhost:5173
echo - Backend API: http://localhost:3001
echo.
echo Pour vous connecter en tant qu'admin:
echo 1. Allez sur http://localhost:5173
echo 2. Cliquez sur "Connexion"
echo 3. Utilisez: admin@wud.com / admin123
echo 4. Accedez au dashboard admin via le menu
echo.
pause
