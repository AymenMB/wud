const User = require('../models/user.model');

// @desc    Récupérer tous les utilisateurs (Admin)
// @route   GET /api/users
// @access  Private/Admin
exports.getAllUsers = async (req, res) => {
    try {
        // Ajout de la pagination
        const pageSize = parseInt(req.query.pageSize) || 10;
        const page = parseInt(req.query.page) || 1;
        const searchQuery = req.query.search || ''; // Pour rechercher par email ou nom

        let query = {};
        if (searchQuery) {
            query.$or = [
                { firstName: { $regex: searchQuery, $options: 'i' } },
                { lastName: { $regex: searchQuery, $options: 'i' } },
                { email: { $regex: searchQuery, $options: 'i' } }
            ];
        }

        const count = await User.countDocuments(query);
        const users = await User.find(query)
            .select('-password') // Exclure les mots de passe
            .limit(pageSize)
            .skip(pageSize * (page - 1))
            .sort({ createdAt: -1 });

        res.json({
            users,
            page,
            pages: Math.ceil(count / pageSize),
            count
        });
    } catch (error) {
        console.error("Erreur lors de la récupération des utilisateurs (admin):", error);
        res.status(500).json({ message: 'Erreur serveur lors de la récupération des utilisateurs.', error: error.message });
    }
};

// @desc    Récupérer un utilisateur par ID (Admin)
// @route   GET /api/users/:id
// @access  Private/Admin
exports.getUserById = async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('-password');
        if (user) {
            res.json(user);
        } else {
            res.status(404).json({ message: 'Utilisateur non trouvé.' });
        }
    } catch (error) {
        console.error(`Erreur lors de la récupération de l'utilisateur ${req.params.id} (admin):`, error);
        if (error.kind === 'ObjectId') {
            return res.status(404).json({ message: 'Utilisateur non trouvé (ID mal formé).' });
        }
        res.status(500).json({ message: 'Erreur serveur lors de la récupération de l\'utilisateur.', error: error.message });
    }
};

// @desc    Mettre à jour un utilisateur (Admin)
// @route   PUT /api/users/:id
// @access  Private/Admin
exports.updateUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);

        if (user) {
            user.firstName = req.body.firstName || user.firstName;
            user.lastName = req.body.lastName || user.lastName;
            user.email = req.body.email || user.email; // Attention: unicité de l'email
            user.role = req.body.role || user.role;   // L'admin peut changer le rôle
            user.phoneNumber = req.body.phoneNumber === undefined ? user.phoneNumber : req.body.phoneNumber;

            // L'admin ne devrait pas changer le mot de passe directement ici sans un flux spécifique
            // Si un changement de mot de passe par l'admin est nécessaire, envisager une route dédiée
            // ou un mécanisme de réinitialisation.
            // Pour l'instant, on ne permet pas à l'admin de changer le mdp via cette route.

            // Gérer la mise à jour des adresses
            if (req.body.addresses) {
                user.addresses = req.body.addresses;
            }

            user.updatedAt = Date.now();
            const updatedUser = await user.save();

            // Renvoyer l'utilisateur mis à jour sans le mot de passe
            const userToReturn = updatedUser.toObject();
            delete userToReturn.password;

            res.json(userToReturn);
        } else {
            res.status(404).json({ message: 'Utilisateur non trouvé.' });
        }
    } catch (error) {
        console.error(`Erreur lors de la mise à jour de l'utilisateur ${req.params.id} (admin):`, error);
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return res.status(400).json({ message: 'Données fournies invalides.', errors: messages });
        }
        if (error.code === 11000 && error.keyValue && error.keyValue.email) {
            return res.status(400).json({ message: 'Cet email est déjà utilisé par un autre compte.' });
        }
        if (error.kind === 'ObjectId') {
            return res.status(404).json({ message: 'Utilisateur non trouvé (ID mal formé).' });
        }
        res.status(500).json({ message: 'Erreur serveur lors de la mise à jour de l\'utilisateur.', error: error.message });
    }
};

// @desc    Supprimer un utilisateur (Admin)
// @route   DELETE /api/users/:id
// @access  Private/Admin
exports.deleteUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);

        if (user) {
            if (user.role === 'admin' && user._id.equals(req.user._id)) {
                 return res.status(400).json({ message: 'Un administrateur ne peut pas se supprimer lui-même.' });
            }
            // Ajouter ici une logique pour vérifier si l'utilisateur a des commandes ou d'autres données liées
            // avant de permettre la suppression, ou opter pour une "suppression douce" (soft delete).
            // Pour l'instant, suppression directe.

            // TODO: Gérer la suppression des données associées (commandes, panier, wishlist) ou les anonymiser/réassigner.
            // Par exemple, on pourrait vouloir annuler les commandes en cours au lieu de les supprimer.

            await user.deleteOne();
            res.json({ message: 'Utilisateur supprimé avec succès.' });
        } else {
            res.status(404).json({ message: 'Utilisateur non trouvé.' });
        }
    } catch (error) {
        console.error(`Erreur lors de la suppression de l'utilisateur ${req.params.id} (admin):`, error);
        if (error.kind === 'ObjectId') {
            return res.status(404).json({ message: 'Utilisateur non trouvé (ID mal formé).' });
        }
        res.status(500).json({ message: 'Erreur serveur lors de la suppression de l\'utilisateur.', error: error.message });
    }
};

// @desc    Créer un utilisateur (Admin)
// @route   POST /api/users
// @access  Private/Admin
exports.createUser = async (req, res) => {
    const { firstName, lastName, email, password, role, phoneNumber, addresses } = req.body;

    try {
        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ message: 'Un utilisateur avec cet email existe déjà.' });
        }

        if (!password) {
            return res.status(400).json({ message: 'Le mot de passe est requis pour créer un utilisateur.' });
        }

        const user = new User({
            firstName,
            lastName,
            email,
            password, // Sera haché par le hook pre-save
            role: role || 'client',
            phoneNumber,
            addresses
        });

        const createdUser = await user.save();

        // Renvoyer l'utilisateur créé sans le mot de passe
        const userToReturn = createdUser.toObject();
        delete userToReturn.password;

        res.status(201).json(userToReturn);
    } catch (error) {
        console.error('Erreur lors de la création de l\'utilisateur (admin):', error);
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return res.status(400).json({ message: 'Données fournies invalides.', errors: messages });
        }
        res.status(500).json({ message: 'Erreur serveur lors de la création de l\'utilisateur.', error: error.message });
    }
};

