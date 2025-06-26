const jwt = require('jsonwebtoken');
const User = require('../models/user.model'); // Pour récupérer les infos utilisateur après vérification du token

// Middleware pour protéger les routes
const protect = async (req, res, next) => {
    let token;

    // Vérifier si le token est dans les en-têtes Authorization et commence par 'Bearer'
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            // Extraire le token (Bearer <token>)
            token = req.headers.authorization.split(' ')[1];

            // Vérifier le token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // Ajouter l'utilisateur (sans le mot de passe) à l'objet req pour utilisation dans les contrôleurs
            req.user = await User.findById(decoded.id).select('-password');

            if (!req.user) {
                return res.status(401).json({ message: 'Non autorisé, utilisateur non trouvé pour ce token.' });
            }

            next(); // Passer au prochain middleware ou contrôleur
        } catch (error) {
            console.error('Erreur de vérification du token:', error);
            if (error.name === 'TokenExpiredError') {
                return res.status(401).json({ message: 'Non autorisé, token expiré.' });
            }
            return res.status(401).json({ message: 'Non autorisé, token invalide.' });
        }
    }

    if (!token) {
        res.status(401).json({ message: 'Non autorisé, pas de token fourni.' });
    }
};

// Middleware pour vérifier si l'utilisateur est un administrateur
const admin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next(); // L'utilisateur est admin, continuer
    } else {
        res.status(403).json({ message: 'Accès refusé. Rôle administrateur requis.' });
    }
};

// Middleware pour tenter d'authentifier l'utilisateur, mais ne pas bloquer si non authentifié
const optionalProtect = async (req, res, next) => {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = await User.findById(decoded.id).select('-password');
            // Pas d'erreur si req.user n'est pas trouvé, on continue juste sans user
        } catch (error) {
            // Si le token est invalide ou expiré, on ne bloque pas, on continue juste sans user.
            // On pourrait logger l'erreur si besoin.
            console.warn('Optional protect: Token invalide ou expiré, continuation sans utilisateur authentifié.', error.name);
        }
    }
    next();
};

module.exports = { protect, admin, optionalProtect };
