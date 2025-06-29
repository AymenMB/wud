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
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
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
                isFeatured: true
            },
            {
                name: 'Meubles de Chambre',
                slug: 'meubles-chambre',
                description: 'Lits, commodes, et armoires en bois naturel',
                isFeatured: false
            },
            {
                name: 'Cuisine & Salle à Manger',
                slug: 'cuisine-salle-manger',
                description: 'Tables, chaises, et mobilier de cuisine artisanal',
                isFeatured: true
            }
        ]);

        // Create sample products
        const products = await Product.insertMany([
            {
                name: 'Table Basse Chêne Royal',
                sku: 'WUD-TB-001',
                description: 'Table basse en chêne massif, finition huilée. Fabriquée artisanalement dans nos ateliers.',
                price: 450.00,
                stock: 12,
                categories: [categories[0]._id],
                woodEssence: 'Chêne',
                materials: 'Chêne massif',
                dimensions: '120 x 60 x 45 cm',
                weight: 25,
                isPublished: true,
                isFeatured: true,
                tags: ['table', 'salon', 'chêne', 'artisanal'],
                images: [
                    {
                        url: '/src/assets/images/placeholder-product.svg',
                        altText: 'Table basse en chêne royal'
                    }
                ],
                variants: [
                    {
                        name: 'Essence de bois',
                        options: [
                            { value: 'Chêne', additionalPrice: 0, stock: 12 },
                            { value: 'Noyer', additionalPrice: 100, stock: 8 }
                        ]
                    }
                ]
            },
            {
                name: 'Étagère Murale Design',
                sku: 'WUD-EM-002',
                description: 'Étagère murale moderne en noyer, design minimaliste et fonctionnel.',
                price: 180.00,
                stock: 8,
                categories: [categories[0]._id],
                woodEssence: 'Noyer',
                materials: 'Noyer massif',
                dimensions: '80 x 20 x 15 cm',
                weight: 8,
                isPublished: true,
                tags: ['étagère', 'mural', 'noyer', 'design'],
                images: [
                    {
                        url: '/src/assets/images/placeholder-product.svg',
                        altText: 'Étagère murale en noyer'
                    }
                ]
            },
            {
                name: 'Lit King Size Scandinave',
                sku: 'WUD-LIT-003',
                description: 'Lit king size en pin massif, style scandinave épuré.',
                price: 890.00,
                stock: 5,
                categories: [categories[1]._id],
                woodEssence: 'Pin',
                materials: 'Pin massif',
                dimensions: '200 x 180 x 90 cm',
                weight: 45,
                isPublished: true,
                isFeatured: true,
                tags: ['lit', 'scandinave', 'pin', 'king size'],
                images: [
                    {
                        url: '/src/assets/images/placeholder-product.svg',
                        altText: 'Lit king size scandinave'
                    }
                ],
                variants: [
                    {
                        name: 'Taille',
                        options: [
                            { value: 'Queen (160x200)', additionalPrice: -150, stock: 8 },
                            { value: 'King (200x200)', additionalPrice: 0, stock: 5 }
                        ]
                    }
                ]
            },
            {
                name: 'Table à Manger Rustique',
                sku: 'WUD-TAM-004',
                description: 'Grande table à manger en chêne rustique pour 8 personnes.',
                price: 1250.00,
                stock: 3,
                categories: [categories[2]._id],
                woodEssence: 'Chêne',
                materials: 'Chêne rustique',
                dimensions: '220 x 100 x 75 cm',
                weight: 65,
                isPublished: true,
                isFeatured: true,
                tags: ['table', 'manger', 'chêne', 'rustique', '8 personnes'],
                images: [
                    {
                        url: '/src/assets/images/placeholder-product.svg',
                        altText: 'Table à manger rustique'
                    }
                ],
                promotion: {
                    discountPercentage: 10,
                    startDate: new Date(),
                    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
                    promoText: '-10%'
                }
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
