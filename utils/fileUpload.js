const multer = require('multer');
const cloudinary = require('cloudinary');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const path = require('path');

// Configuration de Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Configuration du stockage Cloudinary pour les images de produits
const productImageStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'wud-ecommerce/products',
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
        transformation: [
            {
                width: 1200,
                height: 1200,
                crop: 'limit',
                quality: 'auto:good',
                format: 'webp'
            }
        ],
        public_id: (req, file) => `product-${Date.now()}-${Math.round(Math.random() * 1E9)}`,
    },
});

// Multer pour les images de produits
const uploadProductImages = multer({
    storage: productImageStorage,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB par fichier
        files: 10 // Maximum 10 fichiers
    },
    fileFilter: (req, file, cb) => {
        // Vérifier le type de fichier
        const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Type de fichier non autorisé. Utilisez JPG, JPEG, PNG ou WebP.'), false);
        }
    }
});

// Configuration du stockage local en fallback (si Cloudinary n'est pas configuré)
const localStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, '../uploads/products');
        // Créer le dossier s'il n'existe pas
        const fs = require('fs');
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const extension = path.extname(file.originalname);
        cb(null, `product-${uniqueSuffix}${extension}`);
    }
});

// Multer avec stockage local
const uploadProductImagesLocal = multer({
    storage: localStorage,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB par fichier
        files: 10 // Maximum 10 fichiers
    },
    fileFilter: (req, file, cb) => {
        const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Type de fichier non autorisé. Utilisez JPG, JPEG, PNG ou WebP.'), false);
        }
    }
});

// Fonction pour traiter les images uploadées
const processUploadedImages = (files) => {
    console.log('=== processUploadedImages Debug ===');
    console.log('Input files:', files);
    
    if (!files || files.length === 0) {
        console.log('No files provided');
        return [];
    }
    
    return files.map((file, index) => {
        console.log(`Processing file ${index}:`, {
            filename: file.filename,
            originalname: file.originalname,
            path: file.path,
            secure_url: file.secure_url
        });
        
        let imageUrl;
        
        if (file.secure_url) {
            // Cloudinary URL
            imageUrl = file.secure_url;
        } else if (file.filename) {
            // Local storage - create proper URL pointing to backend
            const baseUrl = process.env.BACKEND_URL || 'http://localhost:3001';
            imageUrl = `${baseUrl}/uploads/products/${file.filename}`;
        } else {
            console.error('No valid file URL found for file:', file);
            return null;
        }
        
        const result = {
            url: imageUrl,
            altText: file.originalname ? file.originalname.split('.')[0] : `Product image ${index + 1}`
        };
        
        console.log(`Processed image ${index}:`, result);
        return result;
    }).filter(img => img !== null); // Remove any null entries
};

// Fonction pour supprimer une image de Cloudinary
const deleteImageFromCloudinary = async (imageUrl) => {
    try {
        // Extraire le public_id de l'URL Cloudinary
        const parts = imageUrl.split('/');
        const filename = parts[parts.length - 1];
        const publicId = filename.split('.')[0];
        const folderPath = 'wud-ecommerce/products/' + publicId;
        
        const result = await cloudinary.uploader.destroy(folderPath);
        return result;
    } catch (error) {
        console.error('Erreur lors de la suppression de l\'image Cloudinary:', error);
        return null;
    }
};

// Choisir le bon uploader selon la configuration
const getUploader = () => {
    // Force local storage for simplicity
    console.log('Using LOCAL STORAGE for image uploads');
    return uploadProductImagesLocal;
    
    /* 
    // Uncomment this code if you want to use Cloudinary
    const hasCloudinaryConfig = process.env.CLOUDINARY_CLOUD_NAME && 
                               process.env.CLOUDINARY_API_KEY && 
                               process.env.CLOUDINARY_API_SECRET;
    
    if (hasCloudinaryConfig) {
        console.log('Utilisation de Cloudinary pour le stockage des images');
        return uploadProductImages;
    } else {
        console.log('Utilisation du stockage local pour les images (Cloudinary non configuré)');
        return uploadProductImagesLocal;
    }
    */
};

module.exports = {
    uploadProductImages: getUploader(),
    processUploadedImages,
    deleteImageFromCloudinary,
    cloudinary
};
