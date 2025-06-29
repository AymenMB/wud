const express = require('express');
const router = express.Router();
const {
    createCategory,
    getAllCategories,
    getCategoryByIdOrSlug,
    updateCategory,
    deleteCategory,
    getAllCategoriesAdmin,
    updateCategoryAdmin,
    deleteCategoryAdmin,
    getCategoryStats
} = require('../controllers/category.controller');
// Importer les middlewares d'authentification et d'autorisation
const { protect, admin } = require('../middleware/auth.middleware');

// --- Routes Publiques ---
router.get('/', getAllCategories);

// --- Routes Admin ---
// Routes spécifiques pour l'admin (doivent être avant les routes génériques)
router.get('/admin/all', protect, admin, getAllCategoriesAdmin);
router.get('/admin/stats', protect, admin, getCategoryStats);
router.put('/admin/:id', protect, admin, updateCategoryAdmin);
router.delete('/admin/:id', protect, admin, deleteCategoryAdmin);

// Pour créer une catégorie
router.post('/', protect, admin, createCategory);

// Pour mettre à jour une catégorie (route générique, garder pour compatibilité)
// Note: On utilise :id ici, car la mise à jour se fait généralement par ID pour éviter ambiguïté avec slug qui peut changer
router.put('/:id', protect, admin, updateCategory);

// Pour supprimer une catégorie (route générique, garder pour compatibilité)
router.delete('/:id', protect, admin, deleteCategory);

// Cette route doit être en dernier car elle capture tout /:idOrSlug
router.get('/:idOrSlug', getCategoryByIdOrSlug); // Peut être un ID ou un slug

module.exports = router;
