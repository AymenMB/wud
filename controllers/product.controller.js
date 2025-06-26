const Product = require('../models/product.model');

// @desc    Créer un nouveau produit
// @route   POST /api/products
// @access  Private/Admin
exports.createProduct = async (req, res) => {
    try {
        // TODO: Gestion de l'upload d'images (ex: avec Multer et Cloudinary)
        // Si req.files ou req.file est populé par Multer:
        // let imageUrls = [];
        // if (req.files && req.files.length > 0) {
        //   for (const file of req.files) {
        //     // const result = await cloudinary.uploader.upload(file.path);
        //     // imageUrls.push({ url: result.secure_url, altText: req.body.altTextForFileX || file.originalname });
        //     // fs.unlinkSync(file.path); // Supprimer le fichier local après upload
        //   }
        // } else if (req.body.imageUrls && Array.isArray(req.body.imageUrls)) {
        //   // Si on fournit des URLs directement (ex: lors d'une édition sans re-upload)
        //   imageUrls = req.body.imageUrls.map(url => ({ url, altText: "Default alt text" }));
        // }
        // Les images finales à sauvegarder seraient dans imageUrls.

        const {
            name,
            description,
            price,
            sku,
            categories,
            // images, // Seraient remplacées par imageUrls si l'upload est implémenté
            stock,
            variants,
            dimensions,
            woodEssence,
            usage,
            isFeatured,
            isPublished,
            tags,
            promotion
        } = req.body;

        // Validation simple (peut être étendue avec une librairie comme Joi ou express-validator)
        if (!name || !description || !price || !categories || !sku) {
            return res.status(400).json({ message: 'Veuillez fournir tous les champs requis (nom, description, prix, sku, catégories).' });
        }

        const product = new Product({
            name,
            description,
            price,
            sku,
            categories,
            images: images || [],
            stock: stock || 0,
            variants: variants || [],
            dimensions,
            woodEssence,
            usage: usage || [],
            isFeatured: isFeatured || false,
            isPublished: isPublished === undefined ? true : isPublished,
            tags: tags || [],
            promotion
        });

        const createdProduct = await product.save();
        res.status(201).json(createdProduct);
    } catch (error) {
        console.error("Erreur lors de la création du produit:", error);
        if (error.code === 11000) { // Erreur de duplicata MongoDB (ex: SKU unique)
            return res.status(400).json({ message: 'Un produit avec ce SKU existe déjà.', field: error.keyValue });
        }
        res.status(500).json({ message: 'Erreur serveur lors de la création du produit.', error: error.message });
    }
};

// @desc    Récupérer tous les produits (avec pagination et recherche par nom)
// @route   GET /api/products
// @access  Public
exports.getAllProducts = async (req, res) => {
    const pageSize = parseInt(req.query.pageSize) || 10; // Nombre d'éléments par page
    const page = parseInt(req.query.page) || 1;       // Page actuelle
    const searchQuery = req.query.search || '';      // Terme de recherche pour le nom

    try {
        let query = {};
        if (searchQuery) {
            query.name = { $regex: searchQuery, $options: 'i' }; // Recherche insensible à la casse
        }
        // Par défaut, on ne filtre que les produits publiés pour le public
        query.isPublished = true;

        // Si le paramètre isFeatured est présent et vrai
        if (req.query.isFeatured === 'true') {
            query.isFeatured = true;
        }
        // Si le paramètre isPublished est explicitement fourni (ex: 'false' ou 'all' pour admin)
        // Note: la route /admin/all gère déjà le cas de tous les produits pour l'admin
        // Ici, on s'assure que si isPublished n'est pas 'false', il reste à true ou est ignoré.
        if (req.query.isPublished === 'false') {
             // Pourrait être utilisé par un admin pour voir les non publiés SANS passer par /admin/all
             // Mais attention, cette route est publique. Il vaut mieux garder query.isPublished = true pour les non-admins.
             // query.isPublished = false; // Ne pas faire ça ici sans check de rôle
        }


        const count = await Product.countDocuments(query);
        const products = await Product.find(query)
            .populate('categories', 'name slug') // Peuple les noms et slugs des catégories
            .limit(pageSize)
            .skip(pageSize * (page - 1))
            .sort({ createdAt: -1 }); // Trie par date de création, les plus récents en premier

        res.json({
            products,
            page,
            pages: Math.ceil(count / pageSize),
            count
        });
    } catch (error) {
        console.error("Erreur lors de la récupération des produits:", error);
        res.status(500).json({ message: 'Erreur serveur lors de la récupération des produits.', error: error.message });
    }
};

// @desc    Récupérer un produit par son ID
// @route   GET /api/products/:id
// @access  Public
exports.getProductById = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id).populate('categories', 'name slug');
        if (product && product.isPublished) {
            // Incrémenter le compteur de vues
            product.views = (product.views || 0) + 1;
            await product.save();
            res.json(product);
        } else if (product && !product.isPublished) {
            // Si l'admin veut voir un produit non publié, il faudra une autre route ou une logique isAdmin ici
            res.status(404).json({ message: 'Produit non trouvé ou non publié.' });
        }
        else {
            res.status(404).json({ message: 'Produit non trouvé.' });
        }
    } catch (error) {
        console.error(`Erreur lors de la récupération du produit ${req.params.id}:`, error);
        if (error.kind === 'ObjectId') {
            return res.status(404).json({ message: 'Produit non trouvé (ID mal formé).' });
        }
        res.status(500).json({ message: 'Erreur serveur lors de la récupération du produit.', error: error.message });
    }
};

// @desc    Mettre à jour un produit
// @route   PUT /api/products/:id
// @access  Private/Admin
exports.updateProduct = async (req, res) => {
    // if (!isAdmin(req)) {
    //     return res.status(403).json({ message: 'Accès refusé. Administrateur requis.' });
    // }
    try {
        const {
            name,
            description,
            price,
            sku,
            categories,
            images,
            stock,
            variants,
            dimensions,
            woodEssence,
            usage,
            isFeatured,
            isPublished,
            tags,
            promotion
        } = req.body;

        const product = await Product.findById(req.params.id);

        if (product) {
            product.name = name || product.name;
            product.description = description || product.description;
            product.price = price === undefined ? product.price : price;
            product.sku = sku || product.sku;
            product.categories = categories || product.categories;
            product.images = images || product.images;
            product.stock = stock === undefined ? product.stock : stock;
            product.variants = variants || product.variants;
            product.dimensions = dimensions || product.dimensions;
            product.woodEssence = woodEssence || product.woodEssence;
            product.usage = usage || product.usage;
            product.isFeatured = isFeatured === undefined ? product.isFeatured : isFeatured;
            product.isPublished = isPublished === undefined ? product.isPublished : isPublished;
            product.tags = tags || product.tags;
            product.promotion = promotion === undefined ? product.promotion : promotion;
            product.updatedAt = Date.now();

            const updatedProduct = await product.save();
            res.json(updatedProduct);
        } else {
            res.status(404).json({ message: 'Produit non trouvé.' });
        }
    } catch (error) {
        console.error(`Erreur lors de la mise à jour du produit ${req.params.id}:`, error);
         if (error.code === 11000) {
            return res.status(400).json({ message: 'Un produit avec ce SKU existe déjà.', field: error.keyValue });
        }
        if (error.kind === 'ObjectId') {
            return res.status(404).json({ message: 'Produit non trouvé (ID mal formé).' });
        }
        res.status(500).json({ message: 'Erreur serveur lors de la mise à jour du produit.', error: error.message });
    }
};

// @desc    Supprimer un produit
// @route   DELETE /api/products/:id
// @access  Private/Admin
exports.deleteProduct = async (req, res) => {
    // if (!isAdmin(req)) {
    //     return res.status(403).json({ message: 'Accès refusé. Administrateur requis.' });
    // }
    try {
        const product = await Product.findById(req.params.id);

        if (product) {
            await product.deleteOne(); // Utiliser deleteOne() ou remove() selon la version de Mongoose
            res.json({ message: 'Produit supprimé avec succès.' });
        } else {
            res.status(404).json({ message: 'Produit non trouvé.' });
        }
    } catch (error) {
        console.error(`Erreur lors de la suppression du produit ${req.params.id}:`, error);
        if (error.kind === 'ObjectId') {
            return res.status(404).json({ message: 'Produit non trouvé (ID mal formé).' });
        }
        res.status(500).json({ message: 'Erreur serveur lors de la suppression du produit.', error: error.message });
    }
};

// --- Fonctions spécifiques Admin ---

// @desc    Récupérer tous les produits (y compris non publiés) pour l'admin
// @route   GET /api/products/admin/all
// @access  Private/Admin
exports.getAllProductsAdmin = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const pageSize = parseInt(req.query.pageSize) || 20;
        const search = req.query.search || '';
        const category = req.query.category || '';
        const status = req.query.status || '';
        const sortBy = req.query.sortBy || 'createdAt';
        const sortOrder = req.query.sortOrder || 'desc';

        // Construire la requête de filtre
        let filter = {};
        
        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: 'i' } },
                { sku: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }

        if (category && category !== 'all') {
            filter.categories = { $in: [category] };
        }

        if (status && status !== 'all') {
            if (status === 'published') {
                filter.isPublished = true;
            } else if (status === 'draft') {
                filter.isPublished = false;
            }
        }

        // Construire l'objet de tri
        const sort = {};
        sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

        const count = await Product.countDocuments(filter);
        const products = await Product.find(filter)
            .populate('categories', 'name')
            .sort(sort)
            .limit(pageSize)
            .skip(pageSize * (page - 1));

        res.json({
            products,
            page,
            pages: Math.ceil(count / pageSize),
            count
        });
    } catch (error) {
        console.error('Erreur lors de la récupération des produits (admin):', error);
        res.status(500).json({ message: 'Erreur serveur lors de la récupération des produits.', error: error.message });
    }
};

// @desc    Récupérer un produit par ID (admin)
// @route   GET /api/products/admin/:id
// @access  Private/Admin
exports.getProductByIdAdmin = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id).populate('categories', 'name');
        if (product) {
            res.json(product);
        } else {
            res.status(404).json({ message: 'Produit non trouvé.' });
        }
    } catch (error) {
        console.error(`Erreur lors de la récupération du produit ${req.params.id} (admin):`, error);
        if (error.kind === 'ObjectId') {
            return res.status(404).json({ message: 'Produit non trouvé (ID mal formé).' });
        }
        res.status(500).json({ message: 'Erreur serveur lors de la récupération du produit.', error: error.message });
    }
};

// @desc    Mettre à jour un produit (admin)
// @route   PUT /api/products/admin/:id
// @access  Private/Admin
exports.updateProductAdmin = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);

        if (product) {
            // Mettre à jour tous les champs fournis
            Object.keys(req.body).forEach(key => {
                if (req.body[key] !== undefined) {
                    product[key] = req.body[key];
                }
            });

            product.updatedAt = Date.now();
            const updatedProduct = await product.save();
            await updatedProduct.populate('categories', 'name');

            res.json(updatedProduct);
        } else {
            res.status(404).json({ message: 'Produit non trouvé.' });
        }
    } catch (error) {
        console.error(`Erreur lors de la mise à jour du produit ${req.params.id} (admin):`, error);
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return res.status(400).json({ message: 'Données fournies invalides.', errors: messages });
        }
        res.status(500).json({ message: 'Erreur serveur lors de la mise à jour du produit.', error: error.message });
    }
};

// @desc    Supprimer un produit (admin)
// @route   DELETE /api/products/admin/:id
// @access  Private/Admin
exports.deleteProductAdmin = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);

        if (product) {
            await Product.findByIdAndDelete(req.params.id);
            res.json({ message: 'Produit supprimé avec succès.' });
        } else {
            res.status(404).json({ message: 'Produit non trouvé.' });
        }
    } catch (error) {
        console.error(`Erreur lors de la suppression du produit ${req.params.id} (admin):`, error);
        if (error.kind === 'ObjectId') {
            return res.status(404).json({ message: 'Produit non trouvé (ID mal formé).' });
        }
        res.status(500).json({ message: 'Erreur serveur lors de la suppression du produit.', error: error.message });
    }
};

// @desc    Obtenir les statistiques des produits (admin)
// @route   GET /api/products/admin/stats
// @access  Private/Admin
exports.getProductStats = async (req, res) => {
    try {
        const totalProducts = await Product.countDocuments();
        const publishedProducts = await Product.countDocuments({ isPublished: true });
        const draftProducts = await Product.countDocuments({ isPublished: false });
        const featuredProducts = await Product.countDocuments({ isFeatured: true });
        const lowStockProducts = await Product.countDocuments({ stock: { $lte: 5 } });

        // Produits les plus vus
        const topViewedProducts = await Product.find()
            .select('name views')
            .sort({ views: -1 })
            .limit(5);

        // Produits récemment ajoutés
        const recentProducts = await Product.find()
            .select('name createdAt')
            .sort({ createdAt: -1 })
            .limit(5);

        res.json({
            totalProducts,
            publishedProducts,
            draftProducts,
            featuredProducts,
            lowStockProducts,
            topViewedProducts,
            recentProducts
        });
    } catch (error) {
        console.error('Erreur lors de la récupération des statistiques des produits:', error);
        res.status(500).json({ message: 'Erreur serveur lors de la récupération des statistiques.', error: error.message });
    }
};
