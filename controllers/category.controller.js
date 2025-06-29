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
        } else if (error.kind === 'ObjectId') {
            return res.status(404).json({ message: 'Catégorie non trouvée (ID mal formé).' });
        }
        res.status(500).json({ message: 'Erreur serveur lors de la récupération de la catégorie.', error: error.message });
    }
};

// @desc    Mettre à jour une catégorie
// @route   PUT /api/categories/:id
// @access  Private/Admin
exports.updateCategory = async (req, res) => {
    // if (!isAdmin(req)) {
    //     return res.status(403).json({ message: 'Accès refusé. Administrateur requis.' });
    // }
    try {
        const { name, description, parentCategory, image, isFeatured, slug } = req.body;
        const category = await Category.findById(req.params.id);

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

        if (category) {
            category.name = name || category.name;
            category.description = description === undefined ? category.description : description;
            category.parentCategory = parentCategory === undefined ? category.parentCategory : (parentCategory || null);
            category.image = processedImage === undefined ? category.image : processedImage;
            category.isFeatured = isFeatured === undefined ? category.isFeatured : isFeatured;

            // Si le nom change, le slug sera mis à jour par le hook pre-save
            // Si un slug est explicitement fourni et différent, on pourrait vouloir le gérer,
            // mais attention aux implications SEO. Pour l'instant, on laisse le hook gérer.
            if (slug && slug !== category.slug) {
                // Vérifier si le nouveau slug est unique s'il est fourni manuellement
                const slugExists = await Category.findOne({ slug: slug, _id: { $ne: category._id } });
                if (slugExists) {
                    return res.status(400).json({ message: 'Ce slug est déjà utilisé par une autre catégorie.' });
                }
                category.slug = slug;
            }


            category.updatedAt = Date.now();

            const updatedCategory = await category.save();
            res.json(updatedCategory);
        } else {
            res.status(404).json({ message: 'Catégorie non trouvée.' });
        }
    } catch (error) {
        console.error(`Erreur lors de la mise à jour de la catégorie ${req.params.id}:`, error);
        if (error.code === 11000) {
            return res.status(400).json({ message: 'Une catégorie avec ce nom/slug existe déjà.', field: error.keyValue });
        }
        if (error.kind === 'ObjectId') {
            return res.status(404).json({ message: 'Catégorie non trouvée (ID mal formé).' });
        }
        res.status(500).json({ message: 'Erreur serveur lors de la mise à jour de la catégorie.', error: error.message });
    }
};

// @desc    Supprimer une catégorie
// @route   DELETE /api/categories/:id
// @access  Private/Admin
exports.deleteCategory = async (req, res) => {
    // if (!isAdmin(req)) {
    //     return res.status(403).json({ message: 'Accès refusé. Administrateur requis.' });
    // }
    try {
        const category = await Category.findById(req.params.id);

        if (category) {
            // Vérifier si des produits sont associés à cette catégorie
            const productsInCategory = await Product.countDocuments({ categories: category._id });
            if (productsInCategory > 0) {
                return res.status(400).json({
                    message: `Impossible de supprimer la catégorie '${category.name}' car ${productsInCategory} produit(s) y sont associés. Veuillez d'abord réassigner ou supprimer ces produits.`
                });
            }

            // Vérifier si c'est une catégorie parente
            const childCategories = await Category.countDocuments({ parentCategory: category._id });
            if (childCategories > 0) {
                return res.status(400).json({
                     message: `Impossible de supprimer la catégorie '${category.name}' car elle est parente de ${childCategories} autre(s) catégorie(s). Veuillez d'abord supprimer ou réassigner les catégories enfants.`
                });
            }

            await category.deleteOne();
            res.json({ message: 'Catégorie supprimée avec succès.' });
        } else {
            res.status(404).json({ message: 'Catégorie non trouvée.' });
        }
    } catch (error) {
        console.error(`Erreur lors de la suppression de la catégorie ${req.params.id}:`, error);
        if (error.kind === 'ObjectId') {
            return res.status(404).json({ message: 'Catégorie non trouvée (ID mal formé).' });
        }
        res.status(500).json({ message: 'Erreur serveur lors de la suppression de la catégorie.', error: error.message });
    }
};

// @desc    Récupérer toutes les catégories avec comptage de produits (admin)
// @route   GET /api/categories/admin/all
// @access  Private/Admin
exports.getAllCategoriesAdmin = async (req, res) => {
    try {
        const categories = await Category.aggregate([
            {
                $lookup: {
                    from: 'products',
                    localField: '_id',
                    foreignField: 'categories',
                    as: 'products'
                }
            },
            {
                $addFields: {
                    productCount: { $size: '$products' }
                }
            },
            {
                $project: {
                    products: 0 // Exclure le tableau des produits pour alléger la réponse
                }
            },
            {
                $sort: { name: 1 }
            }
        ]);

        // Populer la catégorie parent après l'agrégation
        await Category.populate(categories, { path: 'parentCategory', select: 'name slug' });

        res.json(categories);
    } catch (error) {
        console.error('Erreur lors de la récupération des catégories (admin):', error);
        res.status(500).json({ message: 'Erreur serveur lors de la récupération des catégories.', error: error.message });
    }
};

// @desc    Mettre à jour une catégorie (admin)
// @route   PUT /api/categories/admin/:id
// @access  Private/Admin
exports.updateCategoryAdmin = async (req, res) => {
    try {
        const category = await Category.findById(req.params.id);

        if (category) {
            // Process image data if provided - handle both string URL and object format
            if (req.body.image !== undefined) {
                const { image } = req.body;
                let processedImage = image;
                
                if (typeof image === 'string') {
                    // If image is just a URL string, convert to object format
                    processedImage = image ? {
                        url: image,
                        altText: req.body.name || category.name || 'Image de catégorie'
                    } : null;
                } else if (typeof image === 'object' && image !== null) {
                    // If image is an object, ensure it has the right structure
                    processedImage = {
                        url: image.url || '',
                        altText: image.altText || req.body.name || category.name || 'Image de catégorie'
                    };
                }
                
                category.image = processedImage;
            }
            
            // Mettre à jour tous les autres champs fournis
            Object.keys(req.body).forEach(key => {
                if (req.body[key] !== undefined && key !== 'image') { // Skip image as we handled it above
                    category[key] = req.body[key];
                }
            });

            category.updatedAt = Date.now();
            const updatedCategory = await category.save();
            await updatedCategory.populate('parentCategory', 'name slug');

            res.json(updatedCategory);
        } else {
            res.status(404).json({ message: 'Catégorie non trouvée.' });
        }
    } catch (error) {
        console.error(`Erreur lors de la mise à jour de la catégorie ${req.params.id} (admin):`, error);
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return res.status(400).json({ message: 'Données fournies invalides.', errors: messages });
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

        if (category) {
            // Vérifier s'il y a des produits associés à cette catégorie
            const productsUsingCategory = await Product.countDocuments({ categories: req.params.id });
            
            if (productsUsingCategory > 0) {
                return res.status(400).json({ 
                    message: `Impossible de supprimer cette catégorie car ${productsUsingCategory} produit(s) l'utilisent encore.` 
                });
            }

            // Vérifier s'il y a des sous-catégories
            const subcategories = await Category.countDocuments({ parentCategory: req.params.id });
            
            if (subcategories > 0) {
                return res.status(400).json({ 
                    message: `Impossible de supprimer cette catégorie car elle a ${subcategories} sous-catégorie(s).` 
                });
            }

            await Category.findByIdAndDelete(req.params.id);
            res.json({ message: 'Catégorie supprimée avec succès.' });
        } else {
            res.status(404).json({ message: 'Catégorie non trouvée.' });
        }
    } catch (error) {
        console.error(`Erreur lors de la suppression de la catégorie ${req.params.id} (admin):`, error);
        if (error.kind === 'ObjectId') {
            return res.status(404).json({ message: 'Catégorie non trouvée (ID mal formé).' });
        }
        res.status(500).json({ message: 'Erreur serveur lors de la suppression de la catégorie.', error: error.message });
    }
};

// @desc    Obtenir les statistiques des catégories (admin)
// @route   GET /api/categories/admin/stats
// @access  Private/Admin
exports.getCategoryStats = async (req, res) => {
    try {
        const totalCategories = await Category.countDocuments();
        const activeCategories = await Category.countDocuments({ isActive: true });
        const featuredCategories = await Category.countDocuments({ isFeatured: true });
        const parentCategories = await Category.countDocuments({ parentCategory: null });

        // Catégories avec le plus de produits
        const categoriesWithProductCount = await Category.aggregate([
            {
                $lookup: {
                    from: 'products',
                    localField: '_id',
                    foreignField: 'categories',
                    as: 'products'
                }
            },
            {
                $addFields: {
                    productCount: { $size: '$products' }
                }
            },
            {
                $project: {
                    name: 1,
                    productCount: 1
                }
            },
            {
                $sort: { productCount: -1 }
            },
            {
                $limit: 5
            }
        ]);

        res.json({
            totalCategories,
            activeCategories,
            featuredCategories,
            parentCategories,
            categoriesWithProductCount
        });
    } catch (error) {
        console.error('Erreur lors de la récupération des statistiques des catégories:', error);
        res.status(500).json({ message: 'Erreur serveur lors de la récupération des statistiques.', error: error.message });
    }
};

