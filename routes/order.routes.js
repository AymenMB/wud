const express = require('express');
const router = express.Router();
const {
    createOrder,
    getMyOrders,
    getOrderById,
    getAllOrders,      // Admin
    updateOrderStatus  // Admin
} = require('../controllers/order.controller');
const { protect, admin } = require('../middleware/auth.middleware');

// --- Routes Utilisateur Protégées ---
router.post('/', protect, createOrder);
router.get('/myorders', protect, getMyOrders);
router.get('/:id', protect, getOrderById); // L'accès est vérifié dans le contrôleur (propriétaire ou admin)

// --- Routes Administrateur Protégées ---
router.get('/admin/allorders', protect, admin, getAllOrders);
router.put('/admin/:id/status', protect, admin, updateOrderStatus);
// On pourrait ajouter d'autres routes admin, ex: supprimer une commande (avec précaution), mettre à jour détails paiement, etc.

module.exports = router;
