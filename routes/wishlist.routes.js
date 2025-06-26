const express = require('express');
const router = express.Router();
const {
    getWishlist,
    addItemToWishlist,
    removeItemFromWishlist
} = require('../controllers/wishlist.controller');
const { protect } = require('../middleware/auth.middleware');

// Appliquer le middleware protect à toutes les routes de la wishlist
router.use(protect);

// @route   GET /api/wishlist
// @desc    Récupérer la wishlist de l'utilisateur
// @access  Private
router.get('/', getWishlist);

// @route   POST /api/wishlist/items
// @desc    Ajouter un produit à la wishlist (productId dans le body)
// @access  Private
router.post('/items', addItemToWishlist);

// @route   DELETE /api/wishlist/items/:productId
// @desc    Supprimer un produit de la wishlist (productId dans l'URL)
// @access  Private
router.delete('/items/:productId', removeItemFromWishlist);

module.exports = router;
