const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema({
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity: { type: Number, required: true, min: 1, default: 1 },
    selectedVariant: { // Pour stocker les options de variante choisies
        name: String, // e.g., "Essence de bois"
        optionValue: String // e.g., "Chêne"
        // Vous pouvez ajouter plus de détails si une variante a plusieurs options
    },
    addedAt: { type: Date, default: Date.now }
}, { _id: false }); // Pas besoin d'un _id séparé pour les sous-documents ici

const cartSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    items: [cartItemSchema],
    lastUpdated: { type: Date, default: Date.now }
}, { timestamps: true });

// Méthode pour calculer le total du panier (peut être utile, mais la logique de prix final sera plutôt côté backend lors du checkout)
// cartSchema.virtual('totalPrice').get(function() {
//     return this.items.reduce((total, item) => {
//         // Note: This is a simplified calculation.
//         // Real calculation needs to fetch product price and variant additionalPrice.
//         // This should ideally be done in a service layer before saving or when retrieving.
//         return total + (item.product.price * item.quantity);
//     }, 0);
// });

const Cart = mongoose.model('Cart', cartSchema);
module.exports = Cart;
