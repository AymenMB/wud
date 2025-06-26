const express = require('express');
const router = express.Router();
const {
    getCart,
    addItemToCart,
    updateCartItemQuantity,
    removeItemFromCart,
    clearCart
} = require('../controllers/cart.controller');
const { protect } = require('../middleware/auth.middleware'); // Toutes les routes du panier sont protégées

// Appliquer le middleware protect à toutes les routes définies ci-dessous
router.use(protect);

// @route   GET /api/cart
// @desc    Récupérer le panier de l'utilisateur
// @access  Private
router.get('/', getCart);

// @route   POST /api/cart/items
// @desc    Ajouter un article au panier
// @access  Private
router.post('/items', addItemToCart);

// @route   PUT /api/cart/items
// @desc    Mettre à jour la quantité d'un article (productId, newQuantity, selectedVariant dans le body)
// @access  Private
router.put('/items', updateCartItemQuantity);

// @route   DELETE /api/cart/items
// @desc    Supprimer un article spécifique du panier (productId, selectedVariant dans le body)
// @access  Private
router.delete('/items', removeItemFromCart); // Changé de /items/:itemId à /items avec infos dans le body

// @route   DELETE /api/cart
// @desc    Vider tout le panier
// @access  Private
router.delete('/', clearCart);

module.exports = router;
