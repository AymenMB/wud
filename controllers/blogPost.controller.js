const BlogPost = require('../models/blogPost.model');
const User = require('../models/user.model'); // Pour l'auteur

// @desc    Créer un nouvel article de blog
// @route   POST /api/blog/posts
// @access  Private/Admin
exports.createBlogPost = async (req, res) => {
    const { title, content, excerpt, category, tags, featuredImage, status, isFeatured } = req.body;
    const authorId = req.user._id; // L'admin connecté est l'auteur

    try {
        if (!title || !content) {
            return res.status(400).json({ message: 'Le titre et le contenu sont requis.' });
        }

        // Le slug est généré automatiquement par le hook pre-save du modèle BlogPost
        // publishedAt est aussi géré par le hook si status est 'published'

        const newPost = new BlogPost({
            title,
            content, // Peut être du HTML/Markdown, à gérer côté frontend pour l'affichage
            excerpt,
            author: authorId,
            category,
            tags,
            featuredImage, // { url: String, altText: String }
            status: status || 'draft', // Par défaut 'draft' si non fourni
            isFeatured: isFeatured || false,
            // views et publishedAt sont gérés par le modèle ou d'autres logiques
        });

        const savedPost = await newPost.save();
        // Peupler l'auteur pour la réponse
        const populatedPost = await BlogPost.findById(savedPost._id).populate('author', 'firstName lastName email');
        res.status(201).json(populatedPost);

    } catch (error) {
        console.error("Erreur lors de la création de l'article de blog:", error);
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return res.status(400).json({ message: 'Données fournies invalides.', errors: messages });
        }
        if (error.code === 11000) { // Erreur de duplicata (slug ou titre unique)
            return res.status(400).json({ message: `Un article avec ce titre/slug existe déjà.`, field: error.keyValue });
        }
        res.status(500).json({ message: 'Erreur serveur.', error: error.message });
    }
};

// @desc    Récupérer tous les articles de blog publiés (avec pagination)
// @route   GET /api/blog/posts
// @access  Public
exports.getAllPublishedBlogPosts = async (req, res) => {
    try {
        const pageSize = parseInt(req.query.pageSize) || 10;
        const page = parseInt(req.query.page) || 1;
        const tag = req.query.tag; // Filtrer par tag
        const category = req.query.category; // Filtrer par catégorie
        const searchQuery = req.query.search; // Recherche textuelle

        let query = { status: 'published' };
        if (tag) {
            query.tags = tag; // Recherche un tag exact dans le tableau
        }
        if (category) {
            query.category = { $regex: category, $options: 'i' };
        }
        if (searchQuery) {
            query.$text = { $search: searchQuery };
        }

        const count = await BlogPost.countDocuments(query);
        const posts = await BlogPost.find(query)
            .populate('author', 'firstName lastName') // Ne pas exposer l'email de l'auteur publiquement
            .sort({ publishedAt: -1 }) // Les plus récents d'abord
            .limit(pageSize)
            .skip(pageSize * (page - 1))
            .select('-content'); // Optionnel: exclure le contenu complet pour la liste

        res.json({
            posts,
            page,
            pages: Math.ceil(count / pageSize),
            count
        });
    } catch (error) {
        console.error("Erreur lors de la récupération des articles publiés:", error);
        res.status(500).json({ message: 'Erreur serveur.', error: error.message });
    }
};

// @desc    Récupérer un article de blog publié par son slug
// @route   GET /api/blog/posts/:slug
// @access  Public
exports.getPublishedBlogPostBySlug = async (req, res) => {
    try {
        const post = await BlogPost.findOne({ slug: req.params.slug, status: 'published' })
            .populate('author', 'firstName lastName');

        if (!post) {
            return res.status(404).json({ message: 'Article non trouvé ou non publié.' });
        }

        // Incrémenter le compteur de vues
        post.views = (post.views || 0) + 1;
        await post.save();

        res.json(post);
    } catch (error) {
        console.error(`Erreur lors de la récupération de l'article ${req.params.slug}:`, error);
        res.status(500).json({ message: 'Erreur serveur.', error: error.message });
    }
};


// --- Routes Admin pour la gestion du Blog ---

// @desc    Récupérer tous les articles de blog (Admin, y compris brouillons)
// @route   GET /api/blog/admin/posts/all
// @access  Private/Admin
exports.getAllBlogPostsAdmin = async (req, res) => {
     try {
        const pageSize = parseInt(req.query.pageSize) || 10;
        const page = parseInt(req.query.page) || 1;
        const status = req.query.status;
        const searchQuery = req.query.search;

        let query = {};
        if (status) query.status = status;
        if (searchQuery) query.$text = { $search: searchQuery };


        const count = await BlogPost.countDocuments(query);
        const posts = await BlogPost.find(query)
            .populate('author', 'firstName lastName email')
            .sort({ createdAt: -1 })
            .limit(pageSize)
            .skip(pageSize * (page - 1));

        res.json({
            posts,
            page,
            pages: Math.ceil(count / pageSize),
            count
        });
    } catch (error) {
        console.error("Erreur lors de la récupération de tous les articles (admin):", error);
        res.status(500).json({ message: 'Erreur serveur.', error: error.message });
    }
};


// @desc    Récupérer un article de blog par ID (Admin, pour brouillons etc.)
// @route   GET /api/blog/admin/posts/:id
// @access  Private/Admin
exports.getBlogPostByIdAdmin = async (req, res) => {
    try {
        const post = await BlogPost.findById(req.params.id).populate('author', 'firstName lastName email');
        if (!post) {
            return res.status(404).json({ message: 'Article non trouvé.' });
        }
        res.json(post);
    } catch (error) {
        console.error(`Erreur lors de la récupération de l'article ${req.params.id} (admin):`, error);
        if (error.kind === 'ObjectId') {
            return res.status(404).json({ message: 'Article non trouvé (ID mal formé).' });
        }
        res.status(500).json({ message: 'Erreur serveur.', error: error.message });
    }
};

// @desc    Mettre à jour un article de blog (Admin)
// @route   PUT /api/blog/admin/posts/:id
// @access  Private/Admin
exports.updateBlogPost = async (req, res) => {
    const { title, content, excerpt, category, tags, featuredImage, status, isFeatured } = req.body;
    try {
        const post = await BlogPost.findById(req.params.id);
        if (!post) {
            return res.status(404).json({ message: 'Article non trouvé.' });
        }

        // L'auteur ne change pas, sauf si explicitement permis par une autre logique
        post.title = title || post.title;
        post.content = content || post.content;
        post.excerpt = excerpt === undefined ? post.excerpt : excerpt;
        post.category = category === undefined ? post.category : category;
        post.tags = tags || post.tags;
        post.featuredImage = featuredImage === undefined ? post.featuredImage : featuredImage;
        post.status = status || post.status;
        post.isFeatured = isFeatured === undefined ? post.isFeatured : isFeatured;

        // Le slug et publishedAt sont mis à jour par le hook pre-save si nécessaire

        post.updatedAt = Date.now();
        const updatedPost = await post.save();
        const populatedPost = await BlogPost.findById(updatedPost._id).populate('author', 'firstName lastName email');
        res.json(populatedPost);

    } catch (error) {
        console.error(`Erreur lors de la mise à jour de l'article ${req.params.id} (admin):`, error);
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return res.status(400).json({ message: 'Données fournies invalides.', errors: messages });
        }
        if (error.code === 11000) {
            return res.status(400).json({ message: `Un article avec ce titre/slug existe déjà.`, field: error.keyValue });
        }
        if (error.kind === 'ObjectId') {
            return res.status(404).json({ message: 'Article non trouvé (ID mal formé).' });
        }
        res.status(500).json({ message: 'Erreur serveur.', error: error.message });
    }
};

// @desc    Supprimer un article de blog (Admin)
// @route   DELETE /api/blog/admin/posts/:id
// @access  Private/Admin
exports.deleteBlogPost = async (req, res) => {
    try {
        const post = await BlogPost.findById(req.params.id);
        if (!post) {
            return res.status(404).json({ message: 'Article non trouvé.' });
        }

        // TODO: Gérer la suppression de l'image en vedette si stockée localement/cloud.
        await post.deleteOne();
        res.json({ message: 'Article de blog supprimé avec succès.' });

    } catch (error) {
        console.error(`Erreur lors de la suppression de l'article ${req.params.id} (admin):`, error);
        if (error.kind === 'ObjectId') {
            return res.status(404).json({ message: 'Article non trouvé (ID mal formé).' });
        }
        res.status(500).json({ message: 'Erreur serveur.', error: error.message });
    }
};

