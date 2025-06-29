const Product = require('../models/product.model');
const { processUploadedImages } = require('../utils/fileUpload');

// @desc    Créer un nouveau produit
// @route   POST /api/products
// @access  Private/Admin
exports.createProduct = async (req, res) => {
    try {
        console.log('=== Product Creation Debug ===');
        console.log('req.body:', req.body);
        console.log('req.files:', req.files);
        console.log('req.files length:', req.files ? req.files.length : 0);
        
        const {
            name,
            description,
            price,
            sku,
            categories,
            stock,
            variants,
            dimensions,
            materials,
            woodEssence,
            usage,
            isFeatured,
            isPublished,
            tags,
            promotion,
            finish,
            weight
        } = req.body;

        // Validation simple (peut être étendue avec une librairie comme Joi ou express-validator)
        if (!name || !description || !price || !categories || !sku) {
            return res.status(400).json({ message: 'Veuillez fournir tous les champs requis (nom, description, prix, sku, catégories).' });
        }

        // Traiter les images uploadées
        let images = [];
        if (req.files && req.files.length > 0) {
            console.log('=== Product Creation Image Processing ===');
            console.log('Number of files received:', req.files.length);
            
            req.files.forEach((file, index) => {
                console.log(`File ${index}:`, {
                    originalname: file.originalname,
                    filename: file.filename,
                    size: file.size,
                    mimetype: file.mimetype
                });
            });
            
            images = processUploadedImages(req.files);
            console.log('Final processed images:', images);
        } else {
            console.log('No image files received');
        }

        // Traiter les catégories (si c'est une chaîne JSON, la parser)
        let processedCategories = categories;
        if (typeof categories === 'string') {
            try {
                processedCategories = JSON.parse(categories);
            } catch (e) {
                processedCategories = [categories];
            }
        }
        
        // Validation des catégories
        if (!processedCategories || !Array.isArray(processedCategories) || processedCategories.length === 0) {
            return res.status(400).json({ message: 'Au moins une catégorie est requise.' });
        }
        
        // Filtrer les catégories vides
        processedCategories = processedCategories.filter(cat => cat && cat.trim() !== '');
        if (processedCategories.length === 0) {
            return res.status(400).json({ message: 'Au moins une catégorie valide est requise.' });
        }

        // Traiter la promotion si fournie
        let processedPromotion = undefined;
        if (promotion) {
            try {
                processedPromotion = typeof promotion === 'string' ? JSON.parse(promotion) : promotion;
                
                // Calculer price_before_discount si une promotion est appliquée
                if (processedPromotion && processedPromotion.discountPercentage > 0) {
                    const priceBeforeDiscount = parseFloat(price) / (1 - processedPromotion.discountPercentage / 100);
                    processedPromotion.price_before_discount = priceBeforeDiscount;
                }
            } catch (e) {
                console.warn('Invalid promotion data:', e);
                processedPromotion = undefined;
            }
        }

        const product = new Product({
            name,
            description,
            price: parseFloat(price),
            sku,
            categories: processedCategories,
            images,
            stock: parseInt(stock) || 0,
            variants: variants ? (typeof variants === 'string' ? JSON.parse(variants) : variants) : [],
            dimensions,
            materials: materials || woodEssence, // Support pour l'ancien champ woodEssence
            usage: usage ? (typeof usage === 'string' ? JSON.parse(usage) : usage) : [],
            isFeatured: isFeatured === 'true' || isFeatured === true,
            isPublished: isPublished === 'true' || isPublished === true || isPublished === undefined,
            tags: tags ? (typeof tags === 'string' ? JSON.parse(tags) : tags) : [],
            promotion: processedPromotion,
            price_before_discount: processedPromotion && processedPromotion.price_before_discount ? processedPromotion.price_before_discount : undefined,
            finish,
            weight: weight ? parseFloat(weight) : undefined
        });

        const createdProduct = await product.save();
        await createdProduct.populate('categories', 'name');
        
        res.status(201).json(createdProduct);
    } catch (error) {
        console.error("Erreur lors de la création du produit:", error);
        if (error.code === 11000) { // Erreur de duplicata MongoDB (ex: SKU unique)
            return res.status(400).json({ message: 'Un produit avec ce SKU existe déjà.', field: error.keyValue });
        }
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return res.status(400).json({ message: 'Données fournies invalides.', errors: messages });
        }
        res.status(500).json({ message: 'Erreur serveur lors de la création du produit.', error: error.message });
    }
};

// @desc    Récupérer tous les produits (avec pagination, recherche et filtres)
// @route   GET /api/products
// @access  Public
exports.getAllProducts = async (req, res) => {
    const pageSize = parseInt(req.query.limit || req.query.pageSize) || 12; // Nombre d'éléments par page
    const page = parseInt(req.query.page) || 1;       // Page actuelle
    const searchQuery = req.query.search || '';      // Terme de recherche
    const category = req.query.category || '';        // Filtre par catégorie
    const materials = req.query.materials || '';     // Filtre par matériaux/bois
    const priceMin = parseFloat(req.query.priceMin) || 0;  // Prix minimum
    const priceMax = parseFloat(req.query.priceMax) || Number.MAX_VALUE;  // Prix maximum
    const sortBy = req.query.sortBy || 'createdAt';  // Champ de tri
    const sortOrder = req.query.sortOrder || 'desc'; // Ordre de tri

    try {
        let query = {};
        
        // Recherche textuelle
        if (searchQuery) {
            query.$or = [
                { name: { $regex: searchQuery, $options: 'i' } },
                { description: { $regex: searchQuery, $options: 'i' } },
                { sku: { $regex: searchQuery, $options: 'i' } },
                { tags: { $in: [new RegExp(searchQuery, 'i')] } },
                { materials: { $regex: searchQuery, $options: 'i' } },
                { woodEssence: { $regex: searchQuery, $options: 'i' } }
            ];
        }
        
        // Filtre par catégorie
        if (category && category !== 'all') {
            query.categories = { $in: [category] };
        }
        
        // Filtre par matériaux/essence de bois
        if (materials) {
            const materialsList = materials.split(',').map(m => m.trim());
            query.$or = query.$or || [];
            const materialQuery = {
                $or: [
                    { materials: { $in: materialsList.map(m => new RegExp(m, 'i')) } },
                    { woodEssence: { $in: materialsList.map(m => new RegExp(m, 'i')) } },
                    { tags: { $in: materialsList.map(m => new RegExp(m, 'i')) } }
                ]
            };
            
            if (query.$or.length > 0) {
                // Si on a déjà une clause $or pour la recherche, on combine avec $and
                query = {
                    $and: [
                        { $or: query.$or },
                        materialQuery
                    ]
                };
            } else {
                query = { ...query, ...materialQuery };
            }
        }
        
        // Filtre par prix
        query.price = { $gte: priceMin, $lte: priceMax };
        
        // Par défaut, on ne filtre que les produits publiés pour le public
        query.isPublished = true;

        // Si le paramètre isFeatured est présent et vrai
        if (req.query.isFeatured === 'true') {
            query.isFeatured = true;
        }

        // Construire l'objet de tri
        const sort = {};
        if (sortBy === 'price-asc') {
            sort.price = 1;
        } else if (sortBy === 'price-desc') {
            sort.price = -1;
        } else if (sortBy === 'name-asc') {
            sort.name = 1;
        } else if (sortBy === 'name-desc') {
            sort.name = -1;
        } else if (sortBy === 'latest') {
            sort.createdAt = -1;
        } else {
            sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
        }

        const count = await Product.countDocuments(query);
        const products = await Product.find(query)
            .populate('categories', 'name slug') // Peuple les noms et slugs des catégories
            .sort(sort)
            .limit(pageSize)
            .skip(pageSize * (page - 1));

        res.json({
            products,
            page,
            pages: Math.ceil(count / pageSize),
            totalPages: Math.ceil(count / pageSize),
            currentPage: page,
            count,
            total: count
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
        console.log('=== Product Update Debug (Admin) ===');
        console.log('req.body:', req.body);
        console.log('req.files:', req.files);
        console.log('req.files length:', req.files ? req.files.length : 0);
        
        const product = await Product.findById(req.params.id);

        if (!product) {
            return res.status(404).json({ message: 'Produit non trouvé.' });
        }

        const {
            name,
            description,
            price,
            sku,
            categories,
            stock,
            variants,
            dimensions,
            materials,
            woodEssence,
            usage,
            isFeatured,
            isPublished,
            tags,
            promotion,
            finish,
            weight
        } = req.body;

        // Traiter les nouvelles images uploadées
        let newImages = [];
        if (req.files && req.files.length > 0) {
            console.log('Processing new uploaded files...');
            console.log('New files received:', req.files.map(f => ({
                originalname: f.originalname,
                filename: f.filename,
                mimetype: f.mimetype,
                size: f.size
            })));
            
            newImages = processUploadedImages(req.files);
            console.log('Processed new images:', newImages);
        }

        // Traiter les catégories
        let processedCategories = categories;
        if (typeof categories === 'string') {
            try {
                processedCategories = JSON.parse(categories);
            } catch (e) {
                processedCategories = [categories];
            }
        }

        // Traiter la promotion si fournie
        let processedPromotion = promotion;
        if (promotion && typeof promotion === 'string') {
            try {
                processedPromotion = JSON.parse(promotion);
            } catch (e) {
                processedPromotion = undefined;
            }
        }

        // Traiter les variantes si fournies
        let processedVariants = variants;
        if (variants && typeof variants === 'string') {
            try {
                processedVariants = JSON.parse(variants);
            } catch (e) {
                processedVariants = undefined;
            }
        }

        // Traiter les tags si fournis
        let processedTags = tags;
        if (tags && typeof tags === 'string') {
            try {
                processedTags = JSON.parse(tags);
            } catch (e) {
                processedTags = tags.split(',').map(tag => tag.trim()).filter(tag => tag);
            }
        }

        // Mettre à jour les champs du produit
        if (name) product.name = name;
        if (description) product.description = description;
        if (price) product.price = parseFloat(price);
        if (sku) product.sku = sku;
        if (processedCategories) product.categories = processedCategories;
        if (stock !== undefined) product.stock = parseInt(stock);
        if (processedVariants) product.variants = processedVariants;
        if (dimensions) product.dimensions = dimensions;
        if (materials) product.materials = materials;
        if (woodEssence) product.woodEssence = woodEssence;
        if (usage) product.usage = usage;
        if (isFeatured !== undefined) product.isFeatured = isFeatured === 'true' || isFeatured === true;
        if (isPublished !== undefined) product.isPublished = isPublished === 'true' || isPublished === true;
        if (processedTags) product.tags = processedTags;
        if (processedPromotion) product.promotion = processedPromotion;
        if (finish) product.finish = finish;
        if (weight) product.weight = parseFloat(weight);

        // Ajouter les nouvelles images aux images existantes (ou les remplacer selon la logique souhaitée)
        if (newImages.length > 0) {
            // Pour l'instant, on remplace toutes les images par les nouvelles
            // Vous pouvez modifier cette logique pour ajouter aux images existantes
            product.images = newImages;
        }

        product.updatedAt = Date.now();
        const updatedProduct = await product.save();
        await updatedProduct.populate('categories', 'name');

        console.log('Product updated successfully:', updatedProduct._id);
        res.json(updatedProduct);

    } catch (error) {
        console.error(`Erreur lors de la mise à jour du produit ${req.params.id} (admin):`, error);
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return res.status(400).json({ message: 'Données fournies invalides.', errors: messages });
        }
        if (error.code === 11000) {
            return res.status(400).json({ message: 'Un produit avec ce SKU existe déjà.', field: error.keyValue });
        }
        if (error.kind === 'ObjectId') {
            return res.status(404).json({ message: 'Produit non trouvé (ID mal formé).' });
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
