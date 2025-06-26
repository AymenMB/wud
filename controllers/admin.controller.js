const User = require('../models/user.model');
const Product = require('../models/product.model');
const Category = require('../models/category.model');
const Order = require('../models/order.model');
const BlogPost = require('../models/blogPost.model');
const CustomRequest = require('../models/customRequest.model');
const NewsletterSubscription = require('../models/newsletterSubscription.model');

// @desc    Obtenir les statistiques générales du dashboard admin
// @route   GET /api/admin/stats
// @access  Private/Admin
exports.getDashboardStats = async (req, res) => {
    try {
        // Calculer les statistiques de base
        const [
            totalUsers,
            totalProducts,
            totalCategories,
            totalOrders,
            totalBlogPosts,
            totalCustomRequests,
            totalNewsletterSubscribers,
            recentOrders,
            lowStockProducts,
            publishedProducts,
            draftBlogPosts
        ] = await Promise.all([
            User.countDocuments({ role: 'client' }),
            Product.countDocuments(),
            Category.countDocuments(),
            Order.countDocuments(),
            BlogPost.countDocuments(),
            CustomRequest.countDocuments(),
            NewsletterSubscription.countDocuments({ isSubscribed: true }),
            Order.find().sort({ createdAt: -1 }).limit(5).populate('user', 'firstName lastName email'),
            Product.find({ stock: { $lte: 5 }, isPublished: true }).limit(10),
            Product.countDocuments({ isPublished: true }),
            BlogPost.countDocuments({ status: 'draft' })
        ]);

        // Calculer les revenus du mois en cours
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);
        
        const monthlyOrdersAggregation = await Order.aggregate([
            {
                $match: {
                    createdAt: { $gte: startOfMonth },
                    status: { $nin: ['cancelled', 'refunded'] }
                }
            },
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: '$totalAmount' },
                    orderCount: { $sum: 1 }
                }
            }
        ]);

        const monthlyStats = monthlyOrdersAggregation[0] || { totalRevenue: 0, orderCount: 0 };

        // Calculer les top catégories
        const topCategories = await Product.aggregate([
            { $match: { isPublished: true } },
            { $unwind: '$categories' },
            { $group: { _id: '$categories', productCount: { $sum: 1 } } },
            { $lookup: { from: 'categories', localField: '_id', foreignField: '_id', as: 'category' } },
            { $unwind: '$category' },
            { $project: { name: '$category.name', productCount: 1 } },
            { $sort: { productCount: -1 } },
            { $limit: 5 }
        ]);

        // Statistiques des demandes sur mesure par statut
        const customRequestsByStatus = await CustomRequest.aggregate([
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 }
                }
            }
        ]);

        res.json({
            overview: {
                totalUsers,
                totalProducts,
                totalCategories,
                totalOrders,
                totalBlogPosts,
                totalCustomRequests,
                totalNewsletterSubscribers,
                publishedProducts,
                draftBlogPosts
            },
            revenue: {
                monthly: monthlyStats.totalRevenue,
                monthlyOrderCount: monthlyStats.orderCount
            },
            recentActivity: {
                recentOrders: recentOrders.map(order => ({
                    _id: order._id,
                    orderNumber: order.orderNumber,
                    totalAmount: order.totalAmount,
                    status: order.status,
                    createdAt: order.createdAt,
                    customer: order.user ? `${order.user.firstName} ${order.user.lastName}` : 'Client supprimé'
                })),
                lowStockProducts: lowStockProducts.map(product => ({
                    _id: product._id,
                    name: product.name,
                    sku: product.sku,
                    stock: product.stock
                }))
            },
            analytics: {
                topCategories,
                customRequestsByStatus: customRequestsByStatus.reduce((acc, item) => {
                    acc[item._id] = item.count;
                    return acc;
                }, {})
            }
        });

    } catch (error) {
        console.error('Erreur lors de la récupération des statistiques:', error);
        res.status(500).json({ message: 'Erreur serveur lors de la récupération des statistiques.', error: error.message });
    }
};

// @desc    Obtenir une vue d'ensemble détaillée pour le dashboard
// @route   GET /api/admin/overview
// @access  Private/Admin
exports.getDashboardOverview = async (req, res) => {
    try {
        // Statistiques des 30 derniers jours
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const [
            newUsersThisMonth,
            ordersThisMonth,
            blogPostsThisMonth,
            customRequestsThisMonth
        ] = await Promise.all([
            User.countDocuments({ 
                role: 'client',
                createdAt: { $gte: thirtyDaysAgo }
            }),
            Order.countDocuments({ 
                createdAt: { $gte: thirtyDaysAgo }
            }),
            BlogPost.countDocuments({ 
                createdAt: { $gte: thirtyDaysAgo }
            }),
            CustomRequest.countDocuments({ 
                createdAt: { $gte: thirtyDaysAgo }
            })
        ]);

        // Tendances des ventes par semaine (4 dernières semaines)
        const salesTrends = await Order.aggregate([
            {
                $match: {
                    createdAt: { $gte: thirtyDaysAgo },
                    status: { $nin: ['cancelled', 'refunded'] }
                }
            },
            {
                $group: {
                    _id: {
                        week: { $week: '$createdAt' },
                        year: { $year: '$createdAt' }
                    },
                    totalRevenue: { $sum: '$totalAmount' },
                    orderCount: { $sum: 1 }
                }
            },
            { $sort: { '_id.year': 1, '_id.week': 1 } }
        ]);

        res.json({
            monthlyGrowth: {
                newUsers: newUsersThisMonth,
                orders: ordersThisMonth,
                blogPosts: blogPostsThisMonth,
                customRequests: customRequestsThisMonth
            },
            salesTrends,
            timestamp: new Date()
        });

    } catch (error) {
        console.error('Erreur lors de la récupération de la vue d\'ensemble:', error);
        res.status(500).json({ message: 'Erreur serveur lors de la récupération de la vue d\'ensemble.', error: error.message });
    }
};
