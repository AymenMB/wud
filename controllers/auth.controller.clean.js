const User = require('../models/user.model');
const generateToken = require('../utils/generateToken');

// @desc    Inscrire (enregistrer) un nouvel utilisateur
// @route   POST /api/auth/register
// @access  Public
exports.registerUser = async (req, res) => {
    const { firstName, lastName, email, password, phoneNumber } = req.body;

    try {
        // Vérifier si l'utilisateur existe déjà
        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ message: 'Un utilisateur avec cet email existe déjà.' });
        }

        // Créer un nouvel utilisateur
        // Le mot de passe sera haché par le middleware pre-save du modèle User
        const user = await User.create({
            firstName,
            lastName,
            email,
            password, // Le hachage se fait dans le modèle User
            phoneNumber
            // Le rôle par défaut est 'client' comme défini dans le schéma
        });

        if (user) {
            // Générer un token JWT
            const token = generateToken(user._id, user.role);

            res.status(201).json({
                _id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                role: user.role,
                phoneNumber: user.phoneNumber,
                token: token, // Envoyer le token au client
                createdAt: user.createdAt
            });
        } else {
            res.status(400).json({ message: 'Données utilisateur invalides.' });
        }
    } catch (error) {
        console.error('Erreur lors de l\'inscription:', error);
        if (error.name === 'ValidationError') {
            // Collecter les messages d'erreur de validation de Mongoose
            const messages = Object.values(error.errors).map(val => val.message);
            return res.status(400).json({ message: 'Données fournies invalides.', errors: messages });
        }
        res.status(500).json({ message: 'Erreur serveur lors de l\'inscription.', error: error.message });
    }
};

// @desc    Authentifier (connecter) un utilisateur & obtenir un token
// @route   POST /api/auth/login
// @access  Public
exports.loginUser = async (req, res) => {
    const { email, password } = req.body;

    try {
        if (!email || !password) {
            return res.status(400).json({ message: 'Veuillez fournir un email et un mot de passe.' });
        }

        // Trouver l'utilisateur par email
        const user = await User.findOne({ email });

        // Vérifier si l'utilisateur existe et si le mot de passe correspond
        if (user && (await user.comparePassword(password))) {
            // Générer un token JWT
            const token = generateToken(user._id, user.role);

            res.json({
                _id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                role: user.role,
                token: token, // Envoyer le token au client
            });
        } else {
            res.status(401).json({ message: 'Email ou mot de passe incorrect.' }); // Message générique pour la sécurité
        }
    } catch (error) {
        console.error('Erreur lors de la connexion:', error);
        res.status(500).json({ message: 'Erreur serveur lors de la connexion.', error: error.message });
    }
};

// @desc    Obtenir le profil de l'utilisateur connecté
// @route   GET /api/auth/profile
// @access  Private (nécessite le middleware protect)
exports.getUserProfile = async (req, res) => {
    // req.user est peuplé par le middleware `protect`
    const user = await User.findById(req.user._id).select('-password'); // Exclure le mot de passe

    if (user) {
        res.json({
            _id: user._id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            role: user.role,
            phoneNumber: user.phoneNumber,
            addresses: user.addresses,
            createdAt: user.createdAt
        });
    } else {
        res.status(404).json({ message: 'Utilisateur non trouvé.' });
    }
};

// @desc    Mettre à jour le profil de l'utilisateur connecté
// @route   PUT /api/auth/profile
// @access  Private (nécessite le middleware protect)
exports.updateUserProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);

        if (user) {
            user.firstName = req.body.firstName || user.firstName;
            user.lastName = req.body.lastName || user.lastName;
            user.email = req.body.email || user.email; // Attention: gérer la vérification d'email si modifié
            user.phoneNumber = req.body.phoneNumber || user.phoneNumber;
            // Ne pas mettre à jour le rôle ici, cela devrait être une action d'admin séparée

            if (req.body.password) {
                // Le hachage sera fait par le hook pre-save du modèle User
                user.password = req.body.password;
            }

            // Gérer la mise à jour des adresses
            // Ceci est une approche simple, une logique plus complexe pourrait être nécessaire
            // pour ajouter, supprimer, ou modifier des adresses spécifiques.
            if (req.body.addresses) {
                user.addresses = req.body.addresses;
            }

            const updatedUser = await user.save();

            res.json({
                _id: updatedUser._id,
                firstName: updatedUser.firstName,
                lastName: updatedUser.lastName,
                email: updatedUser.email,
                role: updatedUser.role,
                phoneNumber: updatedUser.phoneNumber,
                addresses: updatedUser.addresses,
                token: generateToken(updatedUser._id, updatedUser.role), // Renvoyer un nouveau token si infos sensibles changent
            });
        } else {
            res.status(404).json({ message: 'Utilisateur non trouvé.' });
        }
    } catch (error) {
        console.error('Erreur lors de la mise à jour du profil:', error);
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return res.status(400).json({ message: 'Données fournies invalides.', errors: messages });
        }
        if (error.code === 11000 && error.keyValue && error.keyValue.email) { // Erreur de duplicata pour l'email
            return res.status(400).json({ message: 'Cet email est déjà utilisé par un autre compte.' });
        }
        res.status(500).json({ message: 'Erreur serveur lors de la mise à jour du profil.', error: error.message });
    }
};
