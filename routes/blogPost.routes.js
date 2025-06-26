const express = require('express');
const router = express.Router();
const {
    createBlogPost,
    getAllPublishedBlogPosts,
    getPublishedBlogPostBySlug,
    getAllBlogPostsAdmin,
    getBlogPostByIdAdmin,
    updateBlogPost,
    deleteBlogPost
} = require('../controllers/blogPost.controller');
const { protect, admin } = require('../middleware/auth.middleware');

// --- Routes Publiques pour le Blog ---
// Lister tous les articles publiés (avec pagination, filtres tag/catégorie, recherche)
router.get('/posts', getAllPublishedBlogPosts);

// Voir un article publié par son slug
router.get('/posts/:slug', getPublishedBlogPostBySlug);


// --- Routes Admin pour la gestion du Blog ---
// Créer un nouvel article de blog
router.post('/admin/posts', protect, admin, createBlogPost);

// Lister tous les articles (y compris brouillons, pour l'admin)
router.get('/admin/posts/all', protect, admin, getAllBlogPostsAdmin);

// Gérer un article spécifique par ID (pour l'admin)
router.get('/admin/posts/:id', protect, admin, getBlogPostByIdAdmin);
router.put('/admin/posts/:id', protect, admin, updateBlogPost);
router.delete('/admin/posts/:id', protect, admin, deleteBlogPost);

module.exports = router;
