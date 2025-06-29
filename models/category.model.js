const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true, trim: true },
    slug: { type: String, unique: true, trim: true, lowercase: true }, // Pour les URLs amicales
    description: { type: String },
    parentCategory: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null },
    image: {
        url: String,
        altText: String
    },
    isFeatured: { type: Boolean, default: false }, // Pour les catégories en vedette sur la page d'accueil
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

// Middleware pour générer le slug à partir du nom
categorySchema.pre('save', function(next) {
    if (this.isModified('name') || this.isNew) {
        this.slug = this.name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');
    }
    next();
});

const Category = mongoose.model('Category', categorySchema);
module.exports = Category;
