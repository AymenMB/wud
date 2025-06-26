const express = require('express');
const router = express.Router();
const {
    submitCustomRequest,
    getAllCustomRequests,
    getCustomRequestById,
    updateCustomRequest,
    deleteCustomRequest
} = require('../controllers/customRequest.controller');
const { protect, admin, optionalProtect } = require('../middleware/auth.middleware');

// --- Route Publique (avec authentification optionnelle) ---
// Permet à un utilisateur connecté de lier la demande à son compte,
// ou à un visiteur de soumettre anonymement (en termes de compte utilisateur, l'email est toujours requis).
router.post('/', optionalProtect, submitCustomRequest);


// --- Routes Administrateur Protégées ---
// Pour lister toutes les demandes
router.get('/admin/all', protect, admin, getAllCustomRequests);

// Pour récupérer, mettre à jour ou supprimer une demande spécifique
router.get('/admin/:id', protect, admin, getCustomRequestById);
router.put('/admin/:id', protect, admin, updateCustomRequest);
router.delete('/admin/:id', protect, admin, deleteCustomRequest);


// TODO: Potentiellement une route pour qu'un utilisateur connecté voie SES demandes sur mesure.
// router.get('/my-requests', protect, getUserCustomRequests); // Nécessiterait un nouveau contrôleur.

module.exports = router;
