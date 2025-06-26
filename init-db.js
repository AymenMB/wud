const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const Category = require('./models/category.model');
const Product = require('./models/product.model');
const BlogPost = require('./models/blogPost.model');
const User = require('./models/user.model');

async function initializeDatabase() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Clear existing data
        await Category.deleteMany({});
        await Product.deleteMany({});
        await BlogPost.deleteMany({});
        await User.deleteMany({});

        // Create admin user
        const adminUser = await User.create({
            firstName: 'Admin',
            lastName: 'Wud',
            email: 'admin@wud.com',
            password: 'admin123', // The model will hash this
            role: 'admin'
        });

        // Create categories
        const categories = await Category.insertMany([
            {
                name: 'Meubles de Salon',
                slug: 'meubles-salon',
                description: 'Tables basses, étagères, et mobilier de salon en bois massif',
                isActive: true
            },
            {
                name: 'Meubles de Chambre',
                slug: 'meubles-chambre', 
                description: 'Lits, commodes, et armoires en bois naturel',
                isActive: true
            },
            {
                name: 'Cuisine & Salle à Manger',
                slug: 'cuisine-salle-manger',
                description: 'Tables, chaises, et mobilier de cuisine artisanal',
                isActive: true
            }
        ]);

        // Create sample products
        const products = await Product.insertMany([
            {
                name: 'Table Basse Chêne Royal',
                slug: 'table-basse-chene-royal',
                sku: 'WUD-TB-001',
                description: 'Table basse en chêne massif, finition huilée. Fabriquée artisanalement dans nos ateliers.',
                price: 450.00,
                stock: 12,
                categories: [categories[0]._id],
                woodType: 'Chêne',
                dimensions: { length: 120, width: 60, height: 45 },
                weight: 25,
                isPublished: true,
                images: [
                    {
                        url: '/src/assets/images/placeholder-product.svg',
                        altText: 'Table basse en chêne royal',
                        isPrimary: true
                    }
                ]
            },
            {
                name: 'Étagère Murale Design',
                slug: 'etagere-murale-design',
                sku: 'WUD-EM-002',
                description: 'Étagère murale moderne en noyer, design minimaliste et fonctionnel.',
                price: 180.00,
                stock: 8,
                categories: [categories[0]._id],
                woodType: 'Noyer',
                dimensions: { length: 80, width: 20, height: 15 },
                weight: 8,
                isPublished: true,
                images: [
                    {
                        url: '/src/assets/images/placeholder-product.svg',
                        altText: 'Étagère murale en noyer',
                        isPrimary: true
                    }
                ]
            },
            {
                name: 'Lit King Size Scandinave',
                slug: 'lit-king-size-scandinave',
                sku: 'WUD-LIT-003',
                description: 'Lit king size en pin massif, style scandinave épuré.',
                price: 890.00,
                stock: 5,
                categories: [categories[1]._id],
                woodType: 'Pin',
                dimensions: { length: 200, width: 180, height: 90 },
                weight: 45,
                isPublished: true,
                images: [
                    {
                        url: '/src/assets/images/placeholder-product.svg',
                        altText: 'Lit king size scandinave',
                        isPrimary: true
                    }
                ]
            },
            {
                name: 'Table à Manger Rustique',
                slug: 'table-manger-rustique',
                sku: 'WUD-TAM-004',
                description: 'Grande table à manger en chêne rustique pour 8 personnes.',
                price: 1250.00,
                stock: 3,
                categories: [categories[2]._id],
                woodType: 'Chêne',
                dimensions: { length: 220, width: 100, height: 75 },
                weight: 65,
                isPublished: true,
                images: [
                    {
                        url: '/src/assets/images/placeholder-product.svg',
                        altText: 'Table à manger rustique',
                        isPrimary: true
                    }
                ]
            }
        ]);

        // Create sample blog posts
        await BlogPost.insertMany([
            {
                title: 'Les Secrets du Travail du Bois Artisanal',
                slug: 'secrets-travail-bois-artisanal',
                content: 'Découvrez les techniques traditionnelles et modernes que nous utilisons dans nos ateliers pour créer des meubles d\'exception...',
                excerpt: 'Plongez dans l\'univers du travail du bois artisanal et découvrez nos techniques séculaires.',
                author: adminUser._id,
                category: 'Artisanat',
                tags: ['bois', 'artisanat', 'tradition'],
                status: 'published',
                featuredImage: {
                    url: '/src/assets/images/placeholder-product.svg',
                    altText: 'Artisan travaillant le bois'
                },
                publishedAt: new Date()
            },
            {
                title: 'Comment Choisir le Bon Bois pour Vos Meubles',
                slug: 'choisir-bon-bois-meubles',
                content: 'Chêne, noyer, pin... Chaque essence de bois a ses propres caractéristiques. Voici notre guide complet...',
                excerpt: 'Guide complet pour choisir l\'essence de bois parfaite selon vos besoins.',
                author: adminUser._id,
                category: 'Conseils',
                tags: ['bois', 'conseils', 'guide'],
                status: 'published',
                featuredImage: {
                    url: '/src/assets/images/placeholder-product.svg',
                    altText: 'Différentes essences de bois'
                },
                publishedAt: new Date()
            },
            {
                title: 'Entretien et Durabilité de Vos Meubles en Bois',
                slug: 'entretien-durabilite-meubles-bois',
                content: 'Pour que vos meubles en bois traversent les générations, voici nos conseils d\'entretien...',
                excerpt: 'Conseils d\'experts pour préserver la beauté de vos meubles en bois.',
                author: adminUser._id,
                category: 'Entretien',
                tags: ['entretien', 'durabilité', 'conseils'],
                status: 'published',
                featuredImage: {
                    url: '/src/assets/images/placeholder-product.svg',
                    altText: 'Entretien meuble en bois'
                },
                publishedAt: new Date()
            }
        ]);

        console.log('Database initialized with sample data!');
        console.log(`Created ${categories.length} categories`);
        console.log(`Created ${products.length} products`);
        console.log('Created 3 blog posts');

    } catch (error) {
        console.error('Error initializing database:', error);
    } finally {
        await mongoose.disconnect();
    }
}

initializeDatabase();
