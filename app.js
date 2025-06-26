require('dotenv').config(); // Charger les variables d'environnement en premier
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

// Middlewares
app.use(cors({
    origin: process.env.CORS_ORIGIN || '*' // Configurer l'origine CORS
}));
app.use(express.json()); // Pour parser les requêtes JSON
app.use(express.urlencoded({ extended: true })); // Pour parser les requêtes URL-encoded

// Variables d'environnement
const PORT = process.env.PORT || 3001; // Port par défaut si non spécifié
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error("Erreur: La variable d'environnement MONGODB_URI n'est pas définie.");
    process.exit(1); // Arrêter l'application si l'URI MongoDB n'est pas définie
}

// Connexion à MongoDB
mongoose.connect(MONGODB_URI)
.then(() => console.log('Connecté à MongoDB avec succès !'))
.catch(err => {
    console.error('Erreur de connexion à MongoDB:', err);
    process.exit(1); // Arrêter l'application en cas d'échec de connexion
});

// Route de test simple
app.get('/', (req, res) => {
    res.json({ message: 'Bienvenue sur l\'API de Wud E-commerce ! Le serveur fonctionne.' });
});

// Importer les routes
const productRoutes = require('./routes/product.routes');
const categoryRoutes = require('./routes/category.routes');
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const cartRoutes = require('./routes/cart.routes');
const wishlistRoutes = require('./routes/wishlist.routes');
const orderRoutes = require('./routes/order.routes');
const customRequestRoutes = require('./routes/customRequest.routes');
const blogPostRoutes = require('./routes/blogPost.routes');
const newsletterRoutes = require('./routes/newsletter.routes');
const adminRoutes = require('./routes/admin.routes');

// Utiliser les routes
app.use('/api/products', productRoutes); // Préfixe pour toutes les routes de produits
app.use('/api/categories', categoryRoutes); // Préfixe pour toutes les routes de catégories
app.use('/api/auth', authRoutes); // Préfixe pour les routes d'authentification
app.use('/api/users', userRoutes); // Préfixe pour les routes de gestion des utilisateurs
app.use('/api/cart', cartRoutes); // Préfixe pour les routes du panier
app.use('/api/wishlist', wishlistRoutes); // Préfixe pour les routes de la wishlist
app.use('/api/orders', orderRoutes); // Préfixe pour les routes des commandes
app.use('/api/custom-requests', customRequestRoutes); // Préfixe pour les demandes sur mesure
app.use('/api/blog', blogPostRoutes); // Préfixe pour les routes du blog
app.use('/api/newsletter', newsletterRoutes); // Préfixe pour les routes de la newsletter
app.use('/api/admin', adminRoutes); // Préfixe pour les routes admin

// Importer les gestionnaires d'erreurs
const { notFound, errorHandler } = require('./middleware/errorHandler');

// Gestionnaire pour les routes non trouvées (404) - doit être après toutes les routes
app.use(notFound);

// Gestionnaire global d'erreurs - doit être le dernier middleware
app.use(errorHandler);

// Démarrer le serveur
app.listen(PORT, () => {
    console.log(`Serveur démarré sur le port ${PORT}`);
    if (process.env.NODE_ENV) {
        console.log(`Mode: ${process.env.NODE_ENV}`);
    }
});

module.exports = app; // Exporter pour les tests potentiels
