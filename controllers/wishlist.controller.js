const Wishlist = require('../models/wishlist.model');
const Product = require('../models/product.model');

// Fonction utilitaire pour récupérer ou créer une wishlist pour l'utilisateur
async function getOrCreateWishlist(userId) {
    let wishlist = await Wishlist.findOne({ user: userId });
    if (!wishlist) {
        wishlist = new Wishlist({ user: userId, items: [] });
        await wishlist.save();
    }
    return wishlist;
}

// @desc    Récupérer la wishlist de l'utilisateur connecté
// @route   GET /api/wishlist
// @access  Private
exports.getWishlist = async (req, res) => {
    try {
        const wishlist = await Wishlist.findOne({ user: req.user._id }).populate({
            path: 'items.product',
            select: 'name price images sku isPublished' // Champs pertinents du produit pour la wishlist
        });

        if (!wishlist) {
            return res.json({ user: req.user._id, items: [] });
        }

        // Filtrer les produits qui ne sont plus publiés ou qui n'existent plus
        const validItems = wishlist.items.filter(item => item.product && item.product.isPublished);

        // Si des items ont été filtrés, on pourrait envisager de sauvegarder la wishlist nettoyée.
        // Pour l'instant, on renvoie juste la version filtrée.
        // if (validItems.length < wishlist.items.length) {
        //     wishlist.items = validItems;
        //     await wishlist.save();
        // }


        res.json({
            _id: wishlist._id,
            user: wishlist.user,
            items: validItems, // Renvoyer uniquement les items valides
            lastUpdated: wishlist.lastUpdated
        });

    } catch (error) {
        console.error("Erreur lors de la récupération de la wishlist:", error);
        res.status(500).json({ message: 'Erreur serveur lors de la récupération de la wishlist.', error: error.message });
    }
};

// @desc    Ajouter un article à la wishlist
// @route   POST /api/wishlist/items
// @access  Private
exports.addItemToWishlist = async (req, res) => {
    const { productId } = req.body;
    const userId = req.user._id;

    try {
        if (!productId) {
            return res.status(400).json({ message: 'ID de produit requis.' });
        }

        const product = await Product.findById(productId);
        if (!product || !product.isPublished) {
            return res.status(404).json({ message: 'Produit non trouvé ou non disponible.' });
        }

        const wishlist = await getOrCreateWishlist(userId);

        // Vérifier si l'article est déjà dans la wishlist
        const existingItem = wishlist.items.find(item => item.product.equals(productId));

        if (existingItem) {
            // L'article est déjà là, on ne fait rien ou on renvoie un message spécifique
            // Pour une meilleure expérience utilisateur, on renvoie juste la wishlist actuelle.
        } else {
            wishlist.items.push({ product: productId });
            wishlist.lastUpdated = Date.now();
            await wishlist.save();
        }

        // Renvoyer la wishlist mise à jour
        return exports.getWishlist(req, res);

    } catch (error) {
        console.error("Erreur lors de l'ajout à la wishlist:", error);
        res.status(500).json({ message: 'Erreur serveur lors de l\'ajout à la wishlist.', error: error.message });
    }
};

// @desc    Supprimer un article de la wishlist
// @route   DELETE /api/wishlist/items/:productId
// @access  Private
exports.removeItemFromWishlist = async (req, res) => {
    const { productId } = req.params; // productId est maintenant dans les paramètres de la route
    const userId = req.user._id;

    try {
        if (!productId) {
            return res.status(400).json({ message: 'ID de produit requis.' });
        }

        const wishlist = await Wishlist.findOne({ user: userId });

        if (wishlist) {
            const initialLength = wishlist.items.length;
            wishlist.items = wishlist.items.filter(item => !item.product.equals(productId));

            if (wishlist.items.length < initialLength) {
                wishlist.lastUpdated = Date.now();
                await wishlist.save();
            } else {
                // L'item n'était pas dans la wishlist, on peut considérer que c'est un succès.
            }
        } else {
            // Pas de wishlist, donc l'item n'y est pas. Succès implicite.
        }

        // Renvoyer la wishlist mise à jour (ou vide si elle n'existait pas)
        return exports.getWishlist(req, res);

    } catch (error) {
        console.error("Erreur lors de la suppression de l'article de la wishlist:", error);
        if (error.kind === 'ObjectId') {
            return res.status(400).json({ message: 'ID de produit mal formé.' });
        }
        res.status(500).json({ message: 'Erreur serveur lors de la suppression de l\'article de la wishlist.', error: error.message });
    }
};

