const express = require('express');
const router = express.Router();
const {
    getAllUsers,
    getUserById,
    updateUser,
    deleteUser,
    createUser // Ajout de la création d'utilisateur par l'admin
} = require('../controllers/user.controller');
const { protect, admin } = require('../middleware/auth.middleware');

// Toutes les routes ici sont protégées et nécessitent un rôle admin

// @route   GET /api/users
// @desc    Récupérer tous les utilisateurs (Admin)
// @access  Private/Admin
router.get('/', protect, admin, getAllUsers);

// @route   POST /api/users
// @desc    Créer un utilisateur (Admin)
// @access  Private/Admin
router.post('/', protect, admin, createUser);

// @route   GET /api/users/:id
// @desc    Récupérer un utilisateur par ID (Admin)
// @access  Private/Admin
router.get('/:id', protect, admin, getUserById);

// @route   PUT /api/users/:id
// @desc    Mettre à jour un utilisateur (Admin)
// @access  Private/Admin
router.put('/:id', protect, admin, updateUser);

// @route   DELETE /api/users/:id
// @desc    Supprimer un utilisateur (Admin)
// @access  Private/Admin
router.delete('/:id', protect, admin, deleteUser);

module.exports = router;
