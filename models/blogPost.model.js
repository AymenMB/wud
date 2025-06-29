const mongoose = require('mongoose');

const blogPostSchema = new mongoose.Schema({
    title: { type: String, required: true, trim: true, unique: true },
    slug: { type: String, unique: true, trim: true, lowercase: true },
    content: { type: String, required: true }, // Peut contenir du HTML ou Markdown
    excerpt: { type: String, trim: true }, // Court résumé
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Admin/Rédacteur
    category: { type: String, trim: true }, // Catégorie de l'article de blog
    tags: [String],
    featuredImage: {
        url: String,
        altText: String
    },
    status: { type: String, enum: ['draft', 'published', 'archived'], default: 'draft' },
    isFeatured: { type: Boolean, default: false }, // Pour les articles à mettre en avant
    views: { type: Number, default: 0 },
    publishedAt: { type: Date },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

// Index pour la recherche full-text et optimisation des requêtes
blogPostSchema.index({ title: 'text', content: 'text', tags: 'text' }); // Pour la recherche
blogPostSchema.index({ status: 1, publishedAt: -1 }); // Pour lister les articles publiés

// Middleware pour générer le slug à partir du titre et mettre à jour publishedAt
blogPostSchema.pre('save', function(next) {
    if (this.isModified('title') || this.isNew) {
        this.slug = this.title.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');
    }
    if (this.isModified('status') && this.status === 'published' && !this.publishedAt) {
        this.publishedAt = new Date();
    }
    next();
});

const BlogPost = mongoose.model('BlogPost', blogPostSchema);
module.exports = BlogPost;
