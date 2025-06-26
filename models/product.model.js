const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    sku: { type: String, unique: true, trim: true }, // Stock Keeping Unit
    categories: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true }],
    images: [{
        url: { type: String, required: true },
        altText: { type: String }
    }],
    stock: { type: Number, required: true, min: 0, default: 0 },
    variants: [{ // Pour gérer différentes essences de bois, dimensions, etc.
        name: String, // e.g., "Essence de bois", "Taille"
        options: [{
            value: String, // e.g., "Chêne", "Noyer", "120x60cm"
            additionalPrice: { type: Number, default: 0 },
            stock: { type: Number, min: 0 }
        }]
    }],
    dimensions: {
        length: Number, // en cm
        width: Number,  // en cm
        height: Number, // en cm
        weight: Number  // en kg
    },
    woodEssence: { type: String, trim: true }, // Peut être une caractéristique principale ou une variante
    usage: [String], // ex: "Intérieur", "Bureau", "Salon"
    isFeatured: { type: Boolean, default: false }, // Pour les produits phares
    isPublished: { type: Boolean, default: true },
    tags: [String],
    averageRating: { type: Number, default: 0, min: 0, max: 5 },
    reviewCount: { type: Number, default: 0 },
    views: { type: Number, default: 0 }, // Pour compter les produits les plus consultés
    promotion: { // Pour les timers de promotion
        discountPercentage: { type: Number, min: 0, max: 100 },
        startDate: Date,
        endDate: Date,
        promoText: String // ex: "10% OFF"
    },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

// Index pour la recherche textuelle
productSchema.index({ name: 'text', description: 'text', tags: 'text', woodEssence: 'text' });
// Index pour le tri et les filtres
productSchema.index({ price: 1 });
productSchema.index({ categories: 1 });
productSchema.index({ isFeatured: -1 });
productSchema.index({ createdAt: -1 });

const Product = mongoose.model('Product', productSchema);
module.exports = Product;
