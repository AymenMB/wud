const Cart = require('../models/cart.model');
const Product = require('../models/product.model'); // Pour vérifier l'existence et le stock du produit

// Fonction utilitaire pour récupérer ou créer un panier pour l'utilisateur
async function getOrCreateCart(userId) {
    let cart = await Cart.findOne({ user: userId });
    if (!cart) {
        cart = new Cart({ user: userId, items: [] });
        await cart.save();
    }
    return cart;
}

// @desc    Récupérer le panier de l'utilisateur connecté
// @route   GET /api/cart
// @access  Private
exports.getCart = async (req, res) => {
    try {
        const cart = await Cart.findOne({ user: req.user._id }).populate({
            path: 'items.product',
            select: 'name price images sku stock variants isPublished' // Sélectionner les champs nécessaires du produit
        });

        if (!cart) {
            // Si aucun panier n'existe, en retourner un vide (ou le créer à la volée)
            return res.json({ user: req.user._id, items: [], totalPrice: 0 });
        }

        // Calculer le prix total dynamiquement (plus fiable que de le stocker)
        // Cette logique peut devenir plus complexe avec les variantes de produits
        let totalPrice = 0;
        const validItems = [];

        for (const item of cart.items) {
            if (item.product && item.product.isPublished) { // S'assurer que le produit existe et est publié
                let itemPrice = item.product.price;
                // Logique pour le prix additionnel des variantes (si applicable)
                if (item.selectedVariant && item.selectedVariant.optionValue && item.product.variants) {
                    const productVariant = item.product.variants.find(v => v.name === item.selectedVariant.name);
                    if (productVariant) {
                        const option = productVariant.options.find(opt => opt.value === item.selectedVariant.optionValue);
                        if (option && option.additionalPrice) {
                            itemPrice += option.additionalPrice;
                        }
                    }
                }
                totalPrice += item.quantity * itemPrice;
                validItems.push({
                    ...item.toObject(), // Convertir le sous-document Mongoose en objet simple
                    currentPricePerUnit: itemPrice // Ajouter le prix calculé pour l'affichage
                });
            }
        }
        cart.items = validItems;


        res.json({
            _id: cart._id,
            user: cart.user,
            items: cart.items,
            totalPrice: parseFloat(totalPrice.toFixed(2)),
            lastUpdated: cart.lastUpdated
        });

    } catch (error) {
        console.error("Erreur lors de la récupération du panier:", error);
        res.status(500).json({ message: 'Erreur serveur lors de la récupération du panier.', error: error.message });
    }
};

// @desc    Ajouter un article au panier ou augmenter sa quantité
// @route   POST /api/cart/items
// @access  Private
exports.addItemToCart = async (req, res) => {
    const { productId, quantity, selectedVariant } = req.body;
    const userId = req.user._id;

    try {
        if (!productId || !quantity || quantity < 1) {
            return res.status(400).json({ message: 'ID de produit et quantité valide requis.' });
        }

        const product = await Product.findById(productId);
        if (!product || !product.isPublished) {
            return res.status(404).json({ message: 'Produit non trouvé ou non disponible.' });
        }

        // Vérification du stock (simplifiée, une logique plus complexe peut être nécessaire pour les variantes)
        let availableStock = product.stock;
        if (selectedVariant && selectedVariant.optionValue && product.variants) {
            const productVariantInfo = product.variants.find(v => v.name === selectedVariant.name);
            if (productVariantInfo) {
                const option = productVariantInfo.options.find(opt => opt.value === selectedVariant.optionValue);
                if (option && option.stock !== undefined) {
                    availableStock = option.stock;
                } else if (option && option.stock === undefined) {
                    // Si la variante existe mais n'a pas de stock spécifique, on utilise le stock global du produit
                    // (ou on pourrait interdire l'ajout si la variante n'a pas de stock défini)
                } else {
                     return res.status(400).json({ message: 'Option de variante non valide.' });
                }
            } else {
                 return res.status(400).json({ message: 'Variante de produit non valide.' });
            }
        }

        if (availableStock < quantity) {
            return res.status(400).json({ message: `Stock insuffisant pour ${product.name}. Disponible : ${availableStock}` });
        }

        const cart = await getOrCreateCart(userId);

        // Construire une clé unique pour l'item (produit + variante)
        // Cela permet de traiter "Produit A - Couleur Rouge" et "Produit A - Couleur Bleue" comme des items distincts.
        const itemIdentifier = selectedVariant && selectedVariant.optionValue ?
                               `${productId}-${selectedVariant.name}-${selectedVariant.optionValue}` :
                               productId;

        // Trouver l'index de l'article dans le panier
        // On doit comparer l'ID du produit et les détails de la variante s'ils existent.
        const existingItemIndex = cart.items.findIndex(item => {
            const currentItemIdentifier = item.selectedVariant && item.selectedVariant.optionValue ?
                                          `${item.product.toString()}-${item.selectedVariant.name}-${item.selectedVariant.optionValue}` :
                                          item.product.toString();
            return currentItemIdentifier === itemIdentifier;
        });


        if (existingItemIndex > -1) {
            // L'article existe déjà, augmenter la quantité
            cart.items[existingItemIndex].quantity += quantity;
             if (availableStock < cart.items[existingItemIndex].quantity) {
                return res.status(400).json({ message: `Stock insuffisant pour la quantité totale de ${product.name}. Disponible : ${availableStock}` });
            }
        } else {
            // Nouvel article
            cart.items.push({ product: productId, quantity, selectedVariant });
        }

        cart.lastUpdated = Date.now();
        await cart.save();

        // Ré-exécuter getCart pour renvoyer le panier complet et à jour
        return exports.getCart(req, res);

    } catch (error) {
        console.error("Erreur lors de l'ajout au panier:", error);
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return res.status(400).json({ message: 'Données fournies invalides.', errors: messages });
        }
        res.status(500).json({ message: 'Erreur serveur lors de l\'ajout au panier.', error: error.message });
    }
};

// @desc    Mettre à jour la quantité d'un article dans le panier
// @route   PUT /api/cart/items  (on envoie productId, newQuantity, selectedVariant dans le body)
// @access  Private
exports.updateCartItemQuantity = async (req, res) => {
    const { productId, newQuantity, selectedVariant } = req.body; // productId de l'item à mettre à jour
    const userId = req.user._id;

    try {
        if (!productId || newQuantity === undefined || newQuantity < 0) {
            return res.status(400).json({ message: 'ID de produit et nouvelle quantité valide requis.' });
        }

        const cart = await Cart.findOne({ user: userId });
        if (!cart) {
            return res.status(404).json({ message: 'Panier non trouvé.' });
        }

        const product = await Product.findById(productId);
        if (!product || !product.isPublished) {
            return res.status(404).json({ message: 'Produit non trouvé ou non disponible.' });
        }

        let availableStock = product.stock;
        if (selectedVariant && selectedVariant.optionValue && product.variants) {
            const productVariantInfo = product.variants.find(v => v.name === selectedVariant.name);
            if (productVariantInfo) {
                const option = productVariantInfo.options.find(opt => opt.value === selectedVariant.optionValue);
                if (option && option.stock !== undefined) availableStock = option.stock;
            }
        }

        if (availableStock < newQuantity && newQuantity > 0) { // newQuantity > 0 pour permettre de mettre à 0 (suppression)
            return res.status(400).json({ message: `Stock insuffisant pour ${product.name}. Disponible : ${availableStock}` });
        }

        const itemIdentifier = selectedVariant && selectedVariant.optionValue ?
                               `${productId}-${selectedVariant.name}-${selectedVariant.optionValue}` :
                               productId;

        const itemIndex = cart.items.findIndex(item => {
            const currentItemIdentifier = item.selectedVariant && item.selectedVariant.optionValue ?
                                          `${item.product.toString()}-${item.selectedVariant.name}-${item.selectedVariant.optionValue}` :
                                          item.product.toString();
            return currentItemIdentifier === itemIdentifier;
        });

        if (itemIndex > -1) {
            if (newQuantity === 0) {
                // Si la nouvelle quantité est 0, supprimer l'article
                cart.items.splice(itemIndex, 1);
            } else {
                cart.items[itemIndex].quantity = newQuantity;
            }
            cart.lastUpdated = Date.now();
            await cart.save();
            return exports.getCart(req, res); // Renvoyer le panier mis à jour
        } else {
            return res.status(404).json({ message: 'Article non trouvé dans le panier.' });
        }
    } catch (error) {
        console.error("Erreur lors de la mise à jour de la quantité de l'article:", error);
        res.status(500).json({ message: 'Erreur serveur lors de la mise à jour de l\'article.', error: error.message });
    }
};


// @desc    Supprimer un article du panier
// @route   DELETE /api/cart/items  (on envoie productId et selectedVariant dans le body)
// @access  Private
exports.removeItemFromCart = async (req, res) => {
    const { productId, selectedVariant } = req.body; // Identifiant de l'item à supprimer
    const userId = req.user._id;

    try {
         if (!productId) {
            return res.status(400).json({ message: 'ID de produit requis.' });
        }
        const cart = await Cart.findOne({ user: userId });
        if (!cart) {
            // Même si le panier n'existe pas, on peut renvoyer un succès car l'item n'y est de toute façon pas.
            // Ou on peut renvoyer le panier vide.
            return exports.getCart(req, res);
        }

        const itemIdentifier = selectedVariant && selectedVariant.optionValue ?
                               `${productId}-${selectedVariant.name}-${selectedVariant.optionValue}` :
                               productId;

        const initialLength = cart.items.length;
        cart.items = cart.items.filter(item => {
            const currentItemIdentifier = item.selectedVariant && item.selectedVariant.optionValue ?
                                          `${item.product.toString()}-${item.selectedVariant.name}-${item.selectedVariant.optionValue}` :
                                          item.product.toString();
            return currentItemIdentifier !== itemIdentifier;
        });

        if (cart.items.length < initialLength) {
            cart.lastUpdated = Date.now();
            await cart.save();
        } else {
            // Optionnel: informer que l'item n'a pas été trouvé.
            // Ou juste renvoyer le panier tel quel.
            // return res.status(404).json({ message: "Article non trouvé dans le panier." });
        }

        return exports.getCart(req, res); // Renvoyer le panier mis à jour

    } catch (error) {
        console.error("Erreur lors de la suppression de l'article du panier:", error);
        res.status(500).json({ message: 'Erreur serveur lors de la suppression de l\'article.', error: error.message });
    }
};

// @desc    Vider complètement le panier de l'utilisateur
// @route   DELETE /api/cart
// @access  Private
exports.clearCart = async (req, res) => {
    const userId = req.user._id;
    try {
        let cart = await Cart.findOne({ user: userId });
        if (cart) {
            cart.items = [];
            cart.lastUpdated = Date.now();
            await cart.save();
        } else {
            // Si pas de panier, on peut considérer que c'est déjà vide.
            // Créer un panier vide pour être cohérent avec getCart
            cart = await getOrCreateCart(userId);
        }

        return exports.getCart(req, res); // Renvoyer le panier vide

    } catch (error) {
        console.error("Erreur lors du vidage du panier:", error);
        res.status(500).json({ message: 'Erreur serveur lors du vidage du panier.', error: error.message });
    }
};

