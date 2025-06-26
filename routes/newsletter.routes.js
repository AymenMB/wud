const express = require('express');
const router = express.Router();
const {
    subscribeToNewsletter,
    getAllSubscriptions
} = require('../controllers/newsletter.controller');
const { protect, admin } = require('../middleware/auth.middleware');

// @route   POST /api/newsletter/subscribe
// @desc    S'inscrire à la newsletter
// @access  Public
router.post('/subscribe', subscribeToNewsletter);

// @route   GET /api/newsletter/admin/subscriptions
// @desc    Lister tous les abonnés (Admin)
// @access  Private/Admin
router.get('/admin/subscriptions', protect, admin, getAllSubscriptions);

// TODO: Ajouter une route pour la désinscription si nécessaire (ex: via un lien dans l'email)
// router.post('/unsubscribe', unsubscribeFromNewsletter);

module.exports = router;
