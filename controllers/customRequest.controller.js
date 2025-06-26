const CustomRequest = require('../models/customRequest.model');
const User = require('../models/user.model'); // Pour lier la requête à un utilisateur si connecté

// @desc    Soumettre une nouvelle demande de projet sur mesure
// @route   POST /api/custom-requests
// @access  Public (peut être soumis par un utilisateur non connecté ou connecté)
exports.submitCustomRequest = async (req, res) => {
    const { firstName, lastName, email, phoneNumber, projectDescription, dimensions, woodTypes, budgetRange, inspirationImages } = req.body;

    try {
        if (!firstName || !lastName || !email || !projectDescription) {
            return res.status(400).json({ message: 'Veuillez fournir prénom, nom, email et description du projet.' });
        }

        let userId = null;
        if (req.user) { // Si l'utilisateur est authentifié via le middleware `protect` (optionnel sur cette route)
            userId = req.user._id;
        }

        const newRequest = new CustomRequest({
            user: userId, // Peut être null si l'utilisateur n'est pas connecté
            firstName,
            lastName,
            email,
            phoneNumber,
            projectDescription,
            dimensions,
            woodTypes,
            budgetRange,
            inspirationImages,
            status: 'pending_review' // Statut initial
        });

        const savedRequest = await newRequest.save();

        // TODO: Envoyer un email de confirmation à l'utilisateur et une notification à l'admin

        res.status(201).json(savedRequest);

    } catch (error) {
        console.error("Erreur lors de la soumission de la demande sur mesure:", error);
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return res.status(400).json({ message: 'Données fournies invalides.', errors: messages });
        }
        res.status(500).json({ message: 'Erreur serveur lors de la soumission de la demande.', error: error.message });
    }
};

// --- Routes Admin ---

// @desc    Récupérer toutes les demandes de projets sur mesure (Admin)
// @route   GET /api/custom-requests/admin/all
// @access  Private/Admin
exports.getAllCustomRequests = async (req, res) => {
    try {
        const pageSize = parseInt(req.query.pageSize) || 10;
        const page = parseInt(req.query.page) || 1;
        const statusFilter = req.query.status;
        const sortOrder = req.query.sort === 'asc' ? 1 : -1; // Trier par date de création

        let query = {};
        if (statusFilter) {
            query.status = statusFilter;
        }

        const count = await CustomRequest.countDocuments(query);
        const requests = await CustomRequest.find(query)
            .populate('user', 'firstName lastName email') // Peuple les infos de l'utilisateur si la demande est liée
            .sort({ createdAt: sortOrder })
            .limit(pageSize)
            .skip(pageSize * (page - 1));

        res.json({
            requests,
            page,
            pages: Math.ceil(count / pageSize),
            count
        });
    } catch (error) {
        console.error("Erreur lors de la récupération des demandes sur mesure (admin):", error);
        res.status(500).json({ message: 'Erreur serveur.', error: error.message });
    }
};

// @desc    Récupérer une demande de projet sur mesure par ID (Admin)
// @route   GET /api/custom-requests/admin/:id
// @access  Private/Admin
exports.getCustomRequestById = async (req, res) => {
    try {
        const request = await CustomRequest.findById(req.params.id).populate('user', 'firstName lastName email');
        if (!request) {
            return res.status(404).json({ message: 'Demande non trouvée.' });
        }
        res.json(request);
    } catch (error) {
        console.error(`Erreur lors de la récupération de la demande ${req.params.id} (admin):`, error);
        if (error.kind === 'ObjectId') {
            return res.status(404).json({ message: 'Demande non trouvée (ID mal formé).' });
        }
        res.status(500).json({ message: 'Erreur serveur.', error: error.message });
    }
};

// @desc    Mettre à jour le statut ou les notes d'une demande (Admin)
// @route   PUT /api/custom-requests/admin/:id
// @access  Private/Admin
exports.updateCustomRequest = async (req, res) => {
    const { status, adminNotes } = req.body;
    try {
        const requestToUpdate = await CustomRequest.findById(req.params.id);
        if (!requestToUpdate) {
            return res.status(404).json({ message: 'Demande non trouvée.' });
        }

        if (status) {
            const allowedStatuses = CustomRequest.schema.path('status').enumValues;
            if (!allowedStatuses.includes(status)) {
                return res.status(400).json({ message: `Statut invalide. Doit être l'un de: ${allowedStatuses.join(', ')}` });
            }
            requestToUpdate.status = status;
        }

        if (adminNotes !== undefined) {
            requestToUpdate.adminNotes = adminNotes;
        }

        requestToUpdate.updatedAt = Date.now();
        const updatedRequest = await requestToUpdate.save();

        // TODO: Envoyer un email à l'utilisateur si le statut change (ex: 'quote_sent', 'approved')

        res.json(updatedRequest);
    } catch (error) {
        console.error(`Erreur lors de la mise à jour de la demande ${req.params.id} (admin):`, error);
        if (error.kind === 'ObjectId') {
            return res.status(404).json({ message: 'Demande non trouvée (ID mal formé).' });
        }
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return res.status(400).json({ message: 'Données fournies invalides.', errors: messages });
        }
        res.status(500).json({ message: 'Erreur serveur.', error: error.message });
    }
};

// @desc    Supprimer une demande de projet sur mesure (Admin)
// @route   DELETE /api/custom-requests/admin/:id
// @access  Private/Admin
exports.deleteCustomRequest = async (req, res) => {
    try {
        const requestToDelete = await CustomRequest.findById(req.params.id);
        if (!requestToDelete) {
            return res.status(404).json({ message: 'Demande non trouvée.' });
        }

        // TODO: Gérer la suppression des images d'inspiration associées si elles sont stockées localement/cloud.
        await requestToDelete.deleteOne();
        res.json({ message: 'Demande de projet sur mesure supprimée avec succès.' });

    } catch (error) {
        console.error(`Erreur lors de la suppression de la demande ${req.params.id} (admin):`, error);
        if (error.kind === 'ObjectId') {
            return res.status(404).json({ message: 'Demande non trouvée (ID mal formé).' });
        }
        res.status(500).json({ message: 'Erreur serveur.', error: error.message });
    }
};

