const Category = require('../models/category.model');
const Product = require('../models/product.model'); // Pour vérifier si des produits utilisent une catégorie avant suppression

// @desc    Créer une nouvelle catégorie
// @route   POST /api/categories
// @access  Private/Admin
exports.createCategory = async (req, res) => {
    try {
        console.log('=== Category Creation Debug ===');
        console.log('req.body:', req.body);
        console.log('req.user:', req.user ? { id: req.user._id, role: req.user.role } : 'No user');
        
        const { name, description, parentCategory, image, isFeatured } = req.body;

        if (!name) {
            return res.status(400).json({ message: 'Le nom de la catégorie est requis.' });
        }

        // Le slug est généré automatiquement par le middleware pre-save du modèle Category

        const categoryExists = await Category.findOne({ name }); // Ou par slug si vous préférez
        if (categoryExists) {
            return res.status(400).json({ message: 'Une catégorie avec ce nom existe déjà.' });
        }

        // Process image data - handle both string URL and object format
        let processedImage = null;
        if (image) {
            if (typeof image === 'string') {
                // If image is just a URL string, convert to object format
                processedImage = {
                    url: image,
                    altText: name || 'Image de catégorie'
                };
            } else if (typeof image === 'object' && image.url) {
                // If image is already an object with url property
                processedImage = {
                    url: image.url,
                    altText: image.altText || name || 'Image de catégorie'
                };
            }
        }

        const category = new Category({
            name,
            description,
            parentCategory: parentCategory || null,
            image: processedImage,
            isFeatured: isFeatured || false
        });

        const createdCategory = await category.save();
        console.log('Category created successfully:', createdCategory._id);
        res.status(201).json(createdCategory);
    } catch (error) {
        console.error("Erreur lors de la création de la catégorie:", error);
        if (error.code === 11000) { // Erreur de duplicata MongoDB (ex: slug unique)
            return res.status(400).json({ message: 'Une catégorie avec ce nom/slug existe déjà.', field: error.keyValue });
        }
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return res.status(400).json({ message: 'Données fournies invalides.', errors: messages });
        }
        res.status(500).json({ message: 'Erreur serveur lors de la création de la catégorie.', error: error.message });
    }
};

// @desc    Récupérer toutes les catégories
// @route   GET /api/categories
// @access  Public
exports.getAllCategories = async (req, res) => {
    try {
        const categories = await Category.find({}).populate('parentCategory', 'name slug').sort({ name: 1 });
        res.json(categories);
    } catch (error) {
        console.error("Erreur lors de la récupération des catégories:", error);
        res.status(500).json({ message: 'Erreur serveur lors de la récupération des catégories.', error: error.message });
    }
};

// @desc    Récupérer une catégorie par son ID ou Slug
// @route   GET /api/categories/:idOrSlug
// @access  Public
exports.getCategoryByIdOrSlug = async (req, res) => {
    try {
        const idOrSlug = req.params.idOrSlug;
        let category;

        // Vérifier si idOrSlug est un ObjectId valide. Si oui, chercher par ID, sinon par slug.
        if (idOrSlug.match(/^[0-9a-fA-F]{24}$/)) {
            category = await Category.findById(idOrSlug).populate('parentCategory', 'name slug');
        } else {
            category = await Category.findOne({ slug: idOrSlug }).populate('parentCategory', 'name slug');
        }

        if (category) {
            res.json(category);
        } else {
            res.status(404).json({ message: 'Catégorie non trouvée.' });
        }
    } catch (error) {
        console.error(`Erreur lors de la récupération de la catégorie ${req.params.idOrSlug}:`, error);
        if (error.kind === 'ObjectId' && !req.params.idOrSlug.match(/^[0-9a-fA-F]{24}$/)) {
             // Ce n'est pas un ObjectId, donc on ne logue pas d'erreur de cast, la recherche par slug a déjà échoué.
        }
        res.status(500).json({ message: 'Erreur serveur lors de la récupération de la catégorie.', error: error.message });
    }
};

// @desc    Mettre à jour une catégorie
// @route   PUT /api/categories/:id
// @access  Private/Admin
exports.updateCategory = async (req, res) => {
    try {
        const { name, description, parentCategory, image, isFeatured } = req.body;
        const category = await Category.findById(req.params.id);

        if (!category) {
            return res.status(404).json({ message: 'Catégorie non trouvée.' });
        }

        // Process image data - handle both string URL and object format
        let processedImage = image;
        if (image !== undefined) {
            if (typeof image === 'string') {
                // If image is just a URL string, convert to object format
                processedImage = image ? {
                    url: image,
                    altText: name || category.name || 'Image de catégorie'
                } : null;
            } else if (typeof image === 'object' && image !== null) {
                // If image is an object, ensure it has the right structure
                processedImage = {
                    url: image.url || '',
                    altText: image.altText || name || category.name || 'Image de catégorie'
                };
            }
        }

        category.name = name || category.name;
        category.description = description === undefined ? category.description : description;
        category.parentCategory = parentCategory === undefined ? category.parentCategory : (parentCategory || null);
        category.image = processedImage === undefined ? category.image : processedImage;
        category.isFeatured = isFeatured === undefined ? category.isFeatured : isFeatured;

        const updatedCategory = await category.save();
        res.json(updatedCategory);
    } catch (error) {
        console.error("Erreur lors de la mise à jour de la catégorie:", error);
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return res.status(400).json({ message: 'Données fournies invalides.', errors: messages });
        }
        if (error.code === 11000) {
            return res.status(400).json({ message: 'Une catégorie avec ce nom/slug existe déjà.', field: error.keyValue });
        }
        res.status(500).json({ message: 'Erreur serveur lors de la mise à jour de la catégorie.', error: error.message });
    }
};

// @desc    Supprimer une catégorie
// @route   DELETE /api/categories/:id
// @access  Private/Admin
exports.deleteCategory = async (req, res) => {
    try {
        const category = await Category.findById(req.params.id);

        if (!category) {
            return res.status(404).json({ message: 'Catégorie non trouvée.' });
        }

        // Vérifier s'il y a des produits qui utilisent cette catégorie
        const productsCount = await Product.countDocuments({ categories: req.params.id });
        if (productsCount > 0) {
            return res.status(400).json({ 
                message: `Impossible de supprimer la catégorie. Elle est utilisée par ${productsCount} produit(s).` 
            });
        }

        await Category.findByIdAndDelete(req.params.id);
        res.json({ message: 'Catégorie supprimée avec succès.' });
    } catch (error) {
        console.error("Erreur lors de la suppression de la catégorie:", error);
        res.status(500).json({ message: 'Erreur serveur lors de la suppression de la catégorie.', error: error.message });
    }
};

// @desc    Récupérer toutes les catégories avec comptage de produits (admin)
// @route   GET /api/categories/admin/all
// @access  Private/Admin
exports.getAllCategoriesAdmin = async (req, res) => {
    try {
        const categories = await Category.find({})
            .populate('parentCategory', 'name slug')
            .sort({ name: 1 });

        // Ajouter le comptage de produits pour chaque catégorie
        const categoriesWithCount = await Promise.all(
            categories.map(async (category) => {
                const productCount = await Product.countDocuments({ categories: category._id });
                return {
                    ...category.toObject(),
                    productCount
                };
            })
        );

        res.json(categoriesWithCount);
    } catch (error) {
        console.error("Erreur lors de la récupération des catégories admin:", error);
        res.status(500).json({ message: 'Erreur serveur lors de la récupération des catégories.', error: error.message });
    }
};

// @desc    Mettre à jour une catégorie (admin)
// @route   PUT /api/categories/admin/:id
// @access  Private/Admin
exports.updateCategoryAdmin = async (req, res) => {
    try {
        const { name, description, parentCategory, image, isFeatured } = req.body;
        
        if (!name) {
            return res.status(400).json({ message: 'Le nom de la catégorie est requis.' });
        }

        const category = await Category.findById(req.params.id);
        if (!category) {
            return res.status(404).json({ message: 'Catégorie non trouvée.' });
        }

        // Vérifier si le nom existe déjà (sauf pour la catégorie actuelle)
        const existingCategory = await Category.findOne({ 
            name: name, 
            _id: { $ne: req.params.id } 
        });
        if (existingCategory) {
            return res.status(400).json({ message: 'Une catégorie avec ce nom existe déjà.' });
        }

        // Process image data - handle both string URL and object format
        let processedImage = image;
        if (image !== undefined) {
            if (typeof image === 'string') {
                // If image is just a URL string, convert to object format
                processedImage = image ? {
                    url: image,
                    altText: name || 'Image de catégorie'
                } : null;
            } else if (typeof image === 'object' && image !== null) {
                // If image is an object, ensure it has the right structure
                processedImage = {
                    url: image.url || '',
                    altText: image.altText || name || 'Image de catégorie'
                };
            }
        }

        category.name = name;
        category.description = description || '';
        category.parentCategory = parentCategory || null;
        category.image = processedImage === undefined ? category.image : processedImage;
        category.isFeatured = isFeatured || false;

        const updatedCategory = await category.save();
        res.json(updatedCategory);
    } catch (error) {
        console.error("Erreur lors de la mise à jour de la catégorie admin:", error);
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return res.status(400).json({ message: 'Données fournies invalides.', errors: messages });
        }
        if (error.code === 11000) {
            return res.status(400).json({ message: 'Une catégorie avec ce nom/slug existe déjà.', field: error.keyValue });
        }
        res.status(500).json({ message: 'Erreur serveur lors de la mise à jour de la catégorie.', error: error.message });
    }
};

// @desc    Supprimer une catégorie (admin)
// @route   DELETE /api/categories/admin/:id
// @access  Private/Admin
exports.deleteCategoryAdmin = async (req, res) => {
    try {
        const category = await Category.findById(req.params.id);

        if (!category) {
            return res.status(404).json({ message: 'Catégorie non trouvée.' });
        }

        // Vérifier s'il y a des produits qui utilisent cette catégorie
        const productsCount = await Product.countDocuments({ categories: req.params.id });
        if (productsCount > 0) {
            return res.status(400).json({ 
                message: `Impossible de supprimer la catégorie. Elle est utilisée par ${productsCount} produit(s).` 
            });
        }

        await Category.findByIdAndDelete(req.params.id);
        res.json({ message: 'Catégorie supprimée avec succès.' });
    } catch (error) {
        console.error("Erreur lors de la suppression de la catégorie admin:", error);
        res.status(500).json({ message: 'Erreur serveur lors de la suppression de la catégorie.', error: error.message });
    }
};

// @desc    Obtenir les statistiques des catégories (admin)
// @route   GET /api/categories/admin/stats
// @access  Private/Admin
exports.getCategoryStats = async (req, res) => {
    try {
        const totalCategories = await Category.countDocuments({});
        const featuredCategories = await Category.countDocuments({ isFeatured: true });
        const categoriesWithProducts = await Category.aggregate([
            {
                $lookup: {
                    from: 'products',
                    localField: '_id',
                    foreignField: 'categories',
                    as: 'products'
                }
            },
            {
                $match: {
                    'products.0': { $exists: true }
                }
            },
            {
                $count: 'count'
            }
        ]);

        res.json({
            totalCategories,
            featuredCategories,
            categoriesWithProducts: categoriesWithProducts[0]?.count || 0,
            emptyCategoriesCount: totalCategories - (categoriesWithProducts[0]?.count || 0)
        });
    } catch (error) {
        console.error("Erreur lors de la récupération des statistiques des catégories:", error);
        res.status(500).json({ message: 'Erreur serveur lors de la récupération des statistiques.', error: error.message });
    }
};
