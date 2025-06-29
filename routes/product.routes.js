const express = require('express');
const router = express.Router();
const {
    createProduct,
    getAllProducts,
    getProductById,
    updateProduct,
    deleteProduct,
    getAllProductsAdmin,
    getProductByIdAdmin,
    updateProductAdmin,
    deleteProductAdmin,
    getProductStats
} = require('../controllers/product.controller');
// Importer les middlewares d'authentification et d'autorisation
const { protect, admin } = require('../middleware/auth.middleware');
// Importer le middleware de upload d'images
const { uploadProductImages } = require('../utils/fileUpload');

// --- Routes Publiques ---
router.get('/', getAllProducts);
router.get('/:id', getProductById);

// --- Routes Admin ---
// Routes spécifiques pour l'admin (doivent être avant les routes génériques)
router.get('/admin/all', protect, admin, getAllProductsAdmin);
router.get('/admin/stats', protect, admin, getProductStats);
router.get('/admin/:id', protect, admin, getProductByIdAdmin);
router.put('/admin/:id', protect, admin, uploadProductImages.array('images', 10), updateProductAdmin);
router.delete('/admin/:id', protect, admin, deleteProductAdmin);

// Pour créer un produit
router.post('/', protect, admin, uploadProductImages.array('images', 10), createProduct);

// Pour mettre à jour un produit (route générique, garder pour compatibilité)
router.put('/:id', protect, admin, uploadProductImages.array('images', 10), updateProduct);

// Pour supprimer un produit (route générique, garder pour compatibilité)
router.delete('/:id', protect, admin, deleteProduct);


module.exports = router;
