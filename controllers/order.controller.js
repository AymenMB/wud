const Order = require('../models/order.model');
const Cart = require('../models/cart.model');
const Product = require('../models/product.model');
const User = require('../models/user.model'); // Pour récupérer l'adresse par défaut si besoin

// @desc    Créer une nouvelle commande
// @route   POST /api/orders
// @access  Private
exports.createOrder = async (req, res) => {
    const userId = req.user._id;
    const { shippingAddress, billingAddress, paymentMethod, shippingMethod, orderNotes } = req.body;

    try {
        // 1. Récupérer le panier de l'utilisateur
        const cart = await Cart.findOne({ user: userId }).populate('items.product');
        if (!cart || cart.items.length === 0) {
            return res.status(400).json({ message: 'Votre panier est vide. Impossible de passer commande.' });
        }

        // 2. Vérifier le stock et calculer le total
        let totalAmount = 0;
        const orderItems = [];
        const productStockUpdates = [];

        for (const cartItem of cart.items) {
            const product = cartItem.product;
            if (!product || !product.isPublished) {
                return res.status(400).json({ message: `Le produit "${product ? product.name : 'Inconnu'}" n'est plus disponible.` });
            }

            let itemPrice = product.price;
            let availableStock = product.stock;
            let variantInfoString = '';

            // Gestion des variantes (prix et stock)
            if (cartItem.selectedVariant && cartItem.selectedVariant.optionValue && product.variants) {
                const productVariantInfo = product.variants.find(v => v.name === cartItem.selectedVariant.name);
                if (productVariantInfo) {
                    const option = productVariantInfo.options.find(opt => opt.value === cartItem.selectedVariant.optionValue);
                    if (option) {
                        if (option.additionalPrice) itemPrice += option.additionalPrice;
                        if (option.stock !== undefined) availableStock = option.stock;
                        variantInfoString = `${cartItem.selectedVariant.name}: ${cartItem.selectedVariant.optionValue}`;
                    } else {
                        return res.status(400).json({ message: `L'option de variante "${cartItem.selectedVariant.optionValue}" pour "${product.name}" n'est pas valide.` });
                    }
                } else {
                     return res.status(400).json({ message: `La variante "${cartItem.selectedVariant.name}" pour "${product.name}" n'est pas valide.` });
                }
            }

            if (availableStock < cartItem.quantity) {
                return res.status(400).json({ message: `Stock insuffisant pour "${product.name}" (Variante: ${variantInfoString || 'N/A'}). Demandé: ${cartItem.quantity}, Disponible: ${availableStock}.` });
            }

            orderItems.push({
                product: product._id,
                name: product.name, // Copier pour l'historique
                quantity: cartItem.quantity,
                price: itemPrice,    // Prix unitaire au moment de la commande
                variantInfo: variantInfoString
            });
            totalAmount += cartItem.quantity * itemPrice;

            // Préparer la mise à jour du stock
            productStockUpdates.push({
                productId: product._id,
                variantName: cartItem.selectedVariant ? cartItem.selectedVariant.name : null,
                variantOptionValue: cartItem.selectedVariant ? cartItem.selectedVariant.optionValue : null,
                quantityToDecrement: cartItem.quantity
            });
        }

        // Ajouter des frais de port simulés (à développer)
        const shippingCost = shippingMethod === 'express' ? 15 : 5; // Exemple simple
        totalAmount += shippingCost;

        // 3. Utiliser l'adresse de livraison fournie ou l'adresse par défaut de l'utilisateur
        let finalShippingAddress = shippingAddress;
        if (!finalShippingAddress || Object.keys(finalShippingAddress).length === 0) {
            const user = await User.findById(userId);
            const defaultAddr = user.addresses.find(addr => addr.isDefault);
            if (defaultAddr) {
                finalShippingAddress = {
                    street: defaultAddr.street,
                    city: defaultAddr.city,
                    zipCode: defaultAddr.zipCode,
                    country: defaultAddr.country,
                    phoneNumber: user.phoneNumber // Peut être différent de celui de l'adresse
                };
            } else if (user.addresses && user.addresses.length > 0) {
                 finalShippingAddress = { // Prendre la première adresse si pas de défaut
                    street: user.addresses[0].street,
                    city: user.addresses[0].city,
                    zipCode: user.addresses[0].zipCode,
                    country: user.addresses[0].country,
                    phoneNumber: user.phoneNumber
                };
            } else {
                return res.status(400).json({ message: "Adresse de livraison requise. Veuillez en ajouter une à votre profil ou la fournir lors de la commande." });
            }
        }
         if (!finalShippingAddress.street || !finalShippingAddress.city || !finalShippingAddress.zipCode || !finalShippingAddress.country) {
            return res.status(400).json({ message: "L'adresse de livraison doit contenir: rue, ville, code postal et pays." });
        }


        // 4. Créer la commande
        const order = new Order({
            user: userId,
            items: orderItems,
            totalAmount: parseFloat(totalAmount.toFixed(2)),
            shippingAddress: finalShippingAddress,
            billingAddress: billingAddress || finalShippingAddress, // Utiliser shipping si billing non fourni
            paymentDetails: { paymentMethod: paymentMethod || 'Non spécifié', status: 'pending' }, // Statut initial du paiement
            status: 'pending', // Statut initial de la commande
            shippingMethod: shippingMethod || 'standard',
            shippingCost: shippingCost,
            orderNotes: orderNotes || ''
        });

        // Simulation de paiement (à remplacer par une vraie intégration PSP)
        // Si le paiement est "réussi", on met à jour le statut.
        if (paymentMethod === 'simulated_success_psp') {
            order.paymentDetails.status = 'succeeded';
            order.paymentDetails.paymentDate = new Date();
            order.status = 'paid'; // Ou 'processing' si le paiement est juste autorisé
        }


        const createdOrder = await order.save();

        // 5. Mettre à jour le stock des produits (opération critique)
        // Idéalement, cela devrait être dans une transaction si MongoDB le supporte bien avec votre config.
        for (const update of productStockUpdates) {
            const productToUpdate = await Product.findById(update.productId);
            if (update.variantName && update.variantOptionValue) {
                const variant = productToUpdate.variants.find(v => v.name === update.variantName);
                if (variant) {
                    const option = variant.options.find(o => o.value === update.variantOptionValue);
                    if (option && option.stock !== undefined) {
                        option.stock -= update.quantityToDecrement;
                    } else { // Pas de stock de variante spécifique, décrémenter le stock principal
                        productToUpdate.stock -= update.quantityToDecrement;
                    }
                }
            } else {
                productToUpdate.stock -= update.quantityToDecrement;
            }
            await productToUpdate.save();
        }

        // 6. Vider le panier de l'utilisateur
        cart.items = [];
        cart.lastUpdated = Date.now();
        await cart.save();

        res.status(201).json(createdOrder);

    } catch (error) {
        console.error("Erreur lors de la création de la commande:", error);
        // TODO: Gérer le rollback du stock si la création de commande échoue après la vérification du stock
        res.status(500).json({ message: 'Erreur serveur lors de la création de la commande.', error: error.message });
    }
};


// @desc    Récupérer les commandes de l'utilisateur connecté
// @route   GET /api/orders/myorders
// @access  Private
exports.getMyOrders = async (req, res) => {
    try {
        const pageSize = parseInt(req.query.pageSize) || 10;
        const page = parseInt(req.query.page) || 1;

        const count = await Order.countDocuments({ user: req.user._id });
        const orders = await Order.find({ user: req.user._id })
            .populate('items.product', 'name images sku') // Peuple qqs infos produit
            .sort({ createdAt: -1 })
            .limit(pageSize)
            .skip(pageSize * (page - 1));

        res.json({
            orders,
            page,
            pages: Math.ceil(count / pageSize),
            count
        });
    } catch (error) {
        console.error("Erreur lors de la récupération de mes commandes:", error);
        res.status(500).json({ message: 'Erreur serveur.', error: error.message });
    }
};

// @desc    Récupérer une commande par ID
// @route   GET /api/orders/:id
// @access  Private (utilisateur propriétaire ou Admin)
exports.getOrderById = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id)
            .populate('user', 'firstName lastName email') // Peuple infos de l'utilisateur
            .populate('items.product', 'name images sku price'); // Peuple infos des produits

        if (!order) {
            return res.status(404).json({ message: 'Commande non trouvée.' });
        }

        // Vérifier si l'utilisateur connecté est le propriétaire de la commande ou un admin
        if (order.user._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Accès non autorisé à cette commande.' });
        }

        res.json(order);
    } catch (error) {
        console.error(`Erreur lors de la récupération de la commande ${req.params.id}:`, error);
        if (error.kind === 'ObjectId') {
            return res.status(404).json({ message: 'Commande non trouvée (ID mal formé).' });
        }
        res.status(500).json({ message: 'Erreur serveur.', error: error.message });
    }
};


// --- Routes Admin ---

// @desc    Récupérer toutes les commandes (Admin)
// @route   GET /api/orders/admin/allorders
// @access  Private/Admin
exports.getAllOrders = async (req, res) => {
    try {
        const pageSize = parseInt(req.query.pageSize) || 10;
        const page = parseInt(req.query.page) || 1;
        const statusFilter = req.query.status; // Filtrer par statut: pending, paid, shipped, etc.
        const userIdFilter = req.query.userId; // Filtrer par utilisateur

        let query = {};
        if (statusFilter) {
            query.status = statusFilter;
        }
        if (userIdFilter) {
            query.user = userIdFilter;
        }

        const count = await Order.countDocuments(query);
        const orders = await Order.find(query)
            .populate('user', 'firstName lastName email') // Peuple qqs infos utilisateur
            .sort({ createdAt: -1 })
            .limit(pageSize)
            .skip(pageSize * (page - 1));

        res.json({
            orders,
            page,
            pages: Math.ceil(count / pageSize),
            count
        });
    } catch (error) {
        console.error("Erreur lors de la récupération de toutes les commandes (admin):", error);
        res.status(500).json({ message: 'Erreur serveur.', error: error.message });
    }
};

// @desc    Mettre à jour le statut d'une commande (Admin)
// @route   PUT /api/orders/admin/:id/status
// @access  Private/Admin
exports.updateOrderStatus = async (req, res) => {
    const { status } = req.body; // Nouveau statut: e.g., 'shipped', 'delivered', 'cancelled'

    try {
        if (!status) {
            return res.status(400).json({ message: "Le nouveau statut est requis." });
        }
        // Valider si le statut est l'un des enums définis dans le modèle Order
        const allowedStatuses = Order.schema.path('status').enumValues;
        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({ message: `Statut invalide. Doit être l'un de: ${allowedStatuses.join(', ')}` });
        }

        const order = await Order.findById(req.params.id);

        if (!order) {
            return res.status(404).json({ message: 'Commande non trouvée.' });
        }

        order.status = status;
        // Potentiellement mettre à jour d'autres champs liés au statut, ex: date de livraison, date d'expédition
        if (status === 'shipped' && !order.shippedAt) { // Supposant un champ shippedAt dans le schema Order
             // order.shippedAt = new Date(); // Décommenter si le champ existe
        }
        if (status === 'delivered' && !order.deliveredAt) { // Supposant un champ deliveredAt
            // order.deliveredAt = new Date(); // Décommenter si le champ existe
        }


        order.updatedAt = Date.now();
        const updatedOrder = await order.save();
        res.json(updatedOrder);

    } catch (error) {
        console.error(`Erreur lors de la mise à jour du statut de la commande ${req.params.id}:`, error);
        if (error.kind === 'ObjectId') {
            return res.status(404).json({ message: 'Commande non trouvée (ID mal formé).' });
        }
        res.status(500).json({ message: 'Erreur serveur.', error: error.message });
    }
};

