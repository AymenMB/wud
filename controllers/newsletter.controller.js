const NewsletterSubscription = require('../models/newsletterSubscription.model');

// @desc    S'inscrire à la newsletter
// @route   POST /api/newsletter/subscribe
// @access  Public
exports.subscribeToNewsletter = async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ message: 'L\'adresse email est requise.' });
    }

    try {
        const existingSubscription = await NewsletterSubscription.findOne({ email });

        if (existingSubscription) {
            if (existingSubscription.isSubscribed) {
                return res.status(200).json({ message: 'Vous êtes déjà abonné à notre newsletter.', subscription: existingSubscription });
            } else {
                // Réabonnement si l'utilisateur s'était désinscrit
                existingSubscription.isSubscribed = true;
                existingSubscription.subscribedAt = Date.now();
                await existingSubscription.save();
                // TODO: Envoyer un email de confirmation de réabonnement
                return res.status(200).json({ message: 'Vous avez été réabonné à notre newsletter avec succès !', subscription: existingSubscription });
            }
        }

        const newSubscription = new NewsletterSubscription({ email });
        await newSubscription.save();

        // TODO: Envoyer un email de bienvenue/confirmation d'abonnement

        res.status(201).json({ message: 'Merci de vous être abonné à notre newsletter !', subscription: newSubscription });

    } catch (error) {
        console.error("Erreur lors de l'inscription à la newsletter:", error);
        if (error.name === 'ValidationError') {
            return res.status(400).json({ message: error.errors.email.message });
        }
        if (error.code === 11000) { // Devrait être géré par la vérification existante, mais au cas où
            return res.status(400).json({ message: 'Cet email est déjà enregistré.' });
        }
        res.status(500).json({ message: 'Erreur serveur lors de l\'inscription à la newsletter.', error: error.message });
    }
};

// Optionnel: Route Admin pour lister les abonnés
// @desc    Lister tous les abonnés à la newsletter (Admin)
// @route   GET /api/newsletter/admin/subscriptions
// @access  Private/Admin
exports.getAllSubscriptions = async (req, res) => {
    try {
        const pageSize = parseInt(req.query.pageSize) || 20;
        const page = parseInt(req.query.page) || 1;

        const query = { isSubscribed: true }; // On ne liste que ceux activement abonnés par défaut

        const count = await NewsletterSubscription.countDocuments(query);
        const subscriptions = await NewsletterSubscription.find(query)
            .sort({ subscribedAt: -1 })
            .limit(pageSize)
            .skip(pageSize * (page - 1));

        res.json({
            subscriptions,
            page,
            pages: Math.ceil(count / pageSize),
            count
        });
    } catch (error) {
        console.error("Erreur lors de la récupération des abonnements (admin):", error);
        res.status(500).json({ message: 'Erreur serveur.', error: error.message });
    }
};

