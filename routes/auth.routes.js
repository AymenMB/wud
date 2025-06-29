const express = require('express');
const router = express.Router();
const {
    registerUser,
    loginUser,
    getUserProfile,
    updateUserProfile,
    refreshToken
} = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth.middleware'); // Seulement 'protect' est nécessaire ici pour les routes de profil

// @route   POST /api/auth/register
// @desc    Inscrire un nouvel utilisateur
// @access  Public
router.post('/register', registerUser);

// @route   POST /api/auth/login
// @desc    Connecter un utilisateur
// @access  Public
router.post('/login', loginUser);

// @route   GET /api/auth/profile
// @desc    Obtenir le profil de l'utilisateur connecté
// @access  Private (protégé)
router.get('/profile', protect, getUserProfile);

// @route   PUT /api/auth/profile
// @desc    Mettre à jour le profil de l'utilisateur connecté
// @access  Private (protégé)
router.put('/profile', protect, updateUserProfile);

// @route   POST /api/auth/refresh
// @desc    Actualiser le token de l'utilisateur connecté
// @access  Private (protégé)
router.post('/refresh', protect, refreshToken);

// Une route de déconnexion n'est généralement pas nécessaire avec JWT côté serveur,
// car la déconnexion est gérée côté client en supprimant le token.
// Si l'on voulait implémenter une liste noire de tokens, ce serait ici.

module.exports = router;
