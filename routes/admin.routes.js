const express = require('express');
const router = express.Router();
const {
    getDashboardStats,
    getDashboardOverview
} = require('../controllers/admin.controller');
const { protect, admin } = require('../middleware/auth.middleware');

// Appliquer les middlewares de protection admin à toutes les routes
router.use(protect, admin);

// @route   GET /api/admin/stats
// @desc    Obtenir les statistiques générales du dashboard
// @access  Private/Admin
router.get('/stats', getDashboardStats);

// @route   GET /api/admin/overview  
// @desc    Obtenir une vue d'ensemble détaillée
// @access  Private/Admin
router.get('/overview', getDashboardOverview);

module.exports = router;
