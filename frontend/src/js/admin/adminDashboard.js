import { loadHeader, loadFooter, displayMessage, setLoadingState, devLog, appError } from '../uiUtils.js';
import { authAPI, productAdminAPI, categoryAdminAPI, userAdminAPI, dashboardAPI } from '../api.js';
import { loadAdminProducts } from './adminProducts.js';
import { loadAdminCategories } from './adminCategories.js';
import { loadAdminUsers } from './adminUsers.js';
import { loadAdminOrders } from './adminOrders.js';
import { loadAdminCustomRequests } from './adminCustomRequests.js';
import { loadAdminBlogPosts } from './adminBlogPosts.js';

// État global pour le dashboard admin
let adminState = {
    currentSection: 'dashboard-overview-content',
    user: null,
    stats: {}
};

// Initialiser le dashboard admin
export async function initAdminDashboard() {
    devLog('Initializing admin dashboard...');
    
    // Charger header et footer
    await loadHeader();
    await loadFooter();
    
    // Vérifier l'authentification admin
    try {
        const user = await authAPI.getProfile();
        if (!user || user.role !== 'admin') {
            window.location.href = '/src/pages/login.html?redirect=' + encodeURIComponent(window.location.pathname);
            return;
        }
        adminState.user = user;
        devLog('Admin user authenticated:', user);
    } catch (error) {
        appError('Authentication failed', error);
        window.location.href = '/src/pages/login.html';
        return;
    }
    
    // Initialiser la navigation
    initAdminNavigation();
    
    // Charger les statistiques du dashboard
    await loadDashboardStats();
    
    // Gérer l'URL actuelle pour afficher la bonne section
    handleInitialRoute();
}

// Initialiser la navigation du menu admin
function initAdminNavigation() {
    const navLinks = document.querySelectorAll('.admin-nav-link');
    
    navLinks.forEach(link => {
        link.addEventListener('click', async (e) => {
            e.preventDefault();
            const section = link.dataset.section;
            await switchAdminSection(section);
            
            // Mettre à jour l'URL sans recharger la page
            const url = new URL(window.location);
            url.hash = section;
            history.pushState(null, '', url.toString());
        });
    });
}

// Gérer la route initiale basée sur l'URL
function handleInitialRoute() {
    const hash = window.location.hash.substring(1);
    const validSections = [
        'dashboard-overview-content',
        'products-management-content', 
        'categories-management-content',
        'orders-management-content',
        'users-management-content',
        'custom-requests-management-content',
        'blog-posts-management-content'
    ];
    
    const targetSection = validSections.includes(hash) ? hash : 'dashboard-overview-content';
    switchAdminSection(targetSection);
}

// Changer de section dans le dashboard admin
async function switchAdminSection(sectionId) {
    // Masquer toutes les sections
    const sections = document.querySelectorAll('.admin-section-content');
    sections.forEach(section => section.classList.add('hidden'));
    
    // Retirer la classe active de tous les liens
    const navLinks = document.querySelectorAll('.admin-nav-link');
    navLinks.forEach(link => {
        link.classList.remove('bg-wud-accent', 'text-white');
        link.classList.add('text-gray-700', 'hover:bg-wud-light', 'hover:text-wud-primary');
    });
    
    // Activer le lien correspondant
    const activeLink = document.querySelector(`[data-section="${sectionId}"]`);
    if (activeLink) {
        activeLink.classList.add('bg-wud-accent', 'text-white');
        activeLink.classList.remove('text-gray-700', 'hover:bg-wud-light', 'hover:text-wud-primary');
    }
    
    // Afficher la section correspondante
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.remove('hidden');
        adminState.currentSection = sectionId;
        
        // Charger le contenu spécifique selon la section
        await loadSectionContent(sectionId);
    }
}

// Charger le contenu spécifique de chaque section
async function loadSectionContent(sectionId) {
    switch (sectionId) {
        case 'dashboard-overview-content':
            await loadDashboardOverview();
            break;
        case 'products-management-content':
            await loadAdminProducts();
            break;
        case 'categories-management-content':
            await loadAdminCategories();
            break;
        case 'orders-management-content':
            await loadOrdersManagement();
            break;
        case 'users-management-content':
            await loadAdminUsers();
            break;
        case 'custom-requests-management-content':
            await loadCustomRequestsManagement();
            break;
        case 'blog-posts-management-content':
            await loadBlogPostsManagement();
            break;
        default:
            devLog(`Unknown section: ${sectionId}`);
    }
}

// Charger les statistiques du dashboard
async function loadDashboardStats() {
    try {
        // Charger les statistiques depuis différents endpoints
        const dashboardStats = await dashboardAPI.getStats().catch(() => ({}));
        const dashboardOverview = await dashboardAPI.getOverview().catch(() => ({}));
        
        adminState.stats = {
            overview: dashboardStats,
            details: dashboardOverview
        };
        
        devLog('Dashboard stats loaded:', adminState.stats);
    } catch (error) {
        appError('Erreur lors du chargement des statistiques du dashboard', error);
    }
}

// Charger la vue d'ensemble du dashboard
async function loadDashboardOverview() {
    const overviewContainer = document.getElementById('dashboard-overview-content');
    if (!overviewContainer) return;
    
    try {
        // Charger les statistiques détaillées
        const overviewData = await dashboardAPI.getOverview();
        const statsData = await dashboardAPI.getStats();
        
        overviewContainer.innerHTML = `
            <div class="mb-8">
                <h2 class="text-3xl font-bold text-wud-primary mb-2">Tableau de Bord Administrateur</h2>
                <p class="text-gray-600">Bienvenue, ${adminState.user?.firstName || 'Admin'}. Voici un aperçu de votre e-commerce Wud.</p>
            </div>
            
            <!-- Statistiques principales -->
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div class="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 rounded-lg shadow-lg">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-blue-100 text-sm">Produits Total</p>
                            <p class="text-2xl font-bold">${statsData?.overview?.totalProducts || 0}</p>
                            <p class="text-xs text-blue-200 mt-1">Publiés: ${statsData?.overview?.publishedProducts || 0}</p>
                        </div>
                        <div class="text-blue-200 text-3xl">📦</div>
                    </div>
                </div>
                
                <div class="bg-gradient-to-r from-green-500 to-green-600 text-white p-6 rounded-lg shadow-lg">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-green-100 text-sm">Utilisateurs</p>
                            <p class="text-2xl font-bold">${statsData?.overview?.totalUsers || 0}</p>
                            <p class="text-xs text-green-200 mt-1">Nouveaux ce mois: ${overviewData?.monthlyGrowth?.newUsers || 0}</p>
                        </div>
                        <div class="text-green-200 text-3xl">👥</div>
                    </div>
                </div>
                
                <div class="bg-gradient-to-r from-orange-500 to-orange-600 text-white p-6 rounded-lg shadow-lg">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-orange-100 text-sm">Commandes</p>
                            <p class="text-2xl font-bold">${statsData?.overview?.totalOrders || 0}</p>
                            <p class="text-xs text-orange-200 mt-1">Revenus: ${statsData?.revenue?.monthly || 0}€</p>
                        </div>
                        <div class="text-orange-200 text-3xl">🛒</div>
                    </div>
                </div>
                
                <div class="bg-gradient-to-r from-purple-500 to-purple-600 text-white p-6 rounded-lg shadow-lg">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-purple-100 text-sm">Blog & Catégories</p>
                            <p class="text-2xl font-bold">${statsData?.overview?.totalCategories || 0}</p>
                            <p class="text-xs text-purple-200 mt-1">Articles blog: ${statsData?.overview?.totalBlogPosts || 0}</p>
                        </div>
                        <div class="text-purple-200 text-3xl">�</div>
                    </div>
                </div>
            </div>

            <!-- Alertes et notifications -->
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                <div class="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg">
                    <div class="flex">
                        <div class="flex-shrink-0">
                            <span class="text-yellow-400 text-xl">⚠️</span>
                        </div>
                        <div class="ml-3">
                            <h3 class="text-sm font-medium text-yellow-800">Stock Faible</h3>
                            <p class="text-sm text-yellow-700">${(statsData?.recentActivity?.lowStockProducts || []).length} produit(s) en rupture</p>
                            <button onclick="switchAdminSection('products-management-content')" class="text-xs text-yellow-600 hover:text-yellow-800 mt-1">Gérer les stocks →</button>
                        </div>
                    </div>
                </div>
                
                <div class="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-lg">
                    <div class="flex">
                        <div class="flex-shrink-0">
                            <span class="text-blue-400 text-xl">📝</span>
                        </div>
                        <div class="ml-3">
                            <h3 class="text-sm font-medium text-blue-800">Demandes sur Mesure</h3>
                            <p class="text-sm text-blue-700">${statsData?.overview?.totalCustomRequests || 0} demande(s) à traiter</p>
                            <button onclick="switchAdminSection('custom-requests-management-content')" class="text-xs text-blue-600 hover:text-blue-800 mt-1">Voir les demandes →</button>
                        </div>
                    </div>
                </div>
                
                <div class="bg-green-50 border-l-4 border-green-400 p-4 rounded-lg">
                    <div class="flex">
                        <div class="flex-shrink-0">
                            <span class="text-green-400 text-xl">�</span>
                        </div>
                        <div class="ml-3">
                            <h3 class="text-sm font-medium text-green-800">Performances</h3>
                            <p class="text-sm text-green-700">Revenus mensuels: ${statsData?.revenue?.monthly || 0}€</p>
                            <p class="text-xs text-green-600">${overviewData?.monthlyGrowth?.orders || 0} commande(s) ce mois</p>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Actions rapides et activité récente -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <div class="bg-white p-6 rounded-lg shadow-lg">
                    <h3 class="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                        🚀 <span class="ml-2">Actions Rapides</span>
                    </h3>
                    <div class="grid grid-cols-2 gap-3">
                        <button onclick="switchAdminSection('products-management-content')" class="text-center px-4 py-3 bg-wud-light hover:bg-wud-accent hover:text-white rounded-lg transition-colors">
                            <div class="text-2xl mb-1">📦</div>
                            <div class="text-sm font-medium">Produits</div>
                        </button>
                        <button onclick="switchAdminSection('categories-management-content')" class="text-center px-4 py-3 bg-wud-light hover:bg-wud-accent hover:text-white rounded-lg transition-colors">
                            <div class="text-2xl mb-1">📁</div>
                            <div class="text-sm font-medium">Catégories</div>
                        </button>
                        <button onclick="switchAdminSection('orders-management-content')" class="text-center px-4 py-3 bg-wud-light hover:bg-wud-accent hover:text-white rounded-lg transition-colors">
                            <div class="text-2xl mb-1">📋</div>
                            <div class="text-sm font-medium">Commandes</div>
                        </button>
                        <button onclick="switchAdminSection('users-management-content')" class="text-center px-4 py-3 bg-wud-light hover:bg-wud-accent hover:text-white rounded-lg transition-colors">
                            <div class="text-2xl mb-1">👥</div>
                            <div class="text-sm font-medium">Utilisateurs</div>
                        </button>
                        <button onclick="switchAdminSection('custom-requests-management-content')" class="text-center px-4 py-3 bg-wud-light hover:bg-wud-accent hover:text-white rounded-lg transition-colors">
                            <div class="text-2xl mb-1">🛠️</div>
                            <div class="text-sm font-medium">Demandes</div>
                        </button>
                        <button onclick="switchAdminSection('blog-posts-management-content')" class="text-center px-4 py-3 bg-wud-light hover:bg-wud-accent hover:text-white rounded-lg transition-colors">
                            <div class="text-2xl mb-1">📝</div>
                            <div class="text-sm font-medium">Blog</div>
                        </button>
                    </div>
                </div>
                
                <div class="bg-white p-6 rounded-lg shadow-lg">
                    <h3 class="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                        📊 <span class="ml-2">Commandes Récentes</span>
                    </h3>
                    <div class="space-y-3 text-sm max-h-64 overflow-y-auto">
                        ${(statsData?.recentActivity?.recentOrders || []).length > 0 ? 
                            statsData.recentActivity.recentOrders.slice(0, 5).map(order => `
                                <div class="flex items-center justify-between py-2 border-b last:border-b-0">
                                    <div>
                                        <div class="font-medium text-gray-800">#${order.orderNumber || order._id.slice(-6)}</div>
                                        <div class="text-xs text-gray-500">${order.customer}</div>
                                    </div>
                                    <div class="text-right">
                                        <div class="font-medium text-wud-primary">${order.totalAmount}€</div>
                                        <div class="text-xs text-gray-500">${order.status}</div>
                                    </div>
                                </div>
                            `).join('') : 
                            '<p class="text-gray-500 italic">Aucune commande récente</p>'
                        }
                    </div>
                    ${(statsData?.recentActivity?.recentOrders || []).length > 0 ? 
                        '<button onclick="switchAdminSection(\'orders-management-content\')" class="w-full mt-4 text-center text-sm text-wud-primary hover:text-wud-accent">Voir toutes les commandes →</button>' : 
                        ''
                    }
                </div>
            </div>
            
            <!-- Statistiques détaillées -->
            <div class="bg-white p-6 rounded-lg shadow-lg mb-8">
                <h3 class="text-lg font-semibold text-gray-800 mb-4">📈 Statistiques Détaillées</h3>
                
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div class="border border-gray-200 rounded-lg p-4">
                        <p class="text-sm text-gray-500 mb-1">Newsletter</p>
                        <p class="text-xl font-bold">${statsData?.overview?.totalNewsletterSubscribers || 0}</p>
                        <p class="text-xs text-gray-400">Abonnés à la newsletter</p>
                    </div>
                    
                    <div class="border border-gray-200 rounded-lg p-4">
                        <p class="text-sm text-gray-500 mb-1">Blog</p>
                        <p class="text-xl font-bold">${statsData?.overview?.totalBlogPosts || 0}</p>
                        <p class="text-xs text-gray-400">Nouveaux articles: ${overviewData?.monthlyGrowth?.blogPosts || 0}</p>
                    </div>
                    
                    <div class="border border-gray-200 rounded-lg p-4">
                        <p class="text-sm text-gray-500 mb-1">Brouillons</p>
                        <p class="text-xl font-bold">${statsData?.overview?.draftBlogPosts || 0}</p>
                        <p class="text-xs text-gray-400">Articles en attente de publication</p>
                    </div>
                    
                    <div class="border border-gray-200 rounded-lg p-4">
                        <p class="text-sm text-gray-500 mb-1">Top Catégorie</p>
                        <p class="text-xl font-bold">${statsData?.analytics?.topCategories && statsData.analytics.topCategories.length > 0 ? statsData.analytics.topCategories[0].name : 'N/A'}</p>
                        <p class="text-xs text-gray-400">${statsData?.analytics?.topCategories && statsData.analytics.topCategories.length > 0 ? statsData.analytics.topCategories[0].productCount : 0} produits</p>
                    </div>
                </div>
            </div>
            
            <!-- État des demandes -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div class="bg-white p-6 rounded-lg shadow-lg">
                    <h3 class="text-lg font-semibold text-gray-800 mb-4">🛠️ Demandes sur Mesure</h3>
                    <div class="flex flex-wrap gap-2">
                        ${Object.entries(statsData?.analytics?.customRequestsByStatus || {}).map(([status, count]) => {
                            const statusColors = {
                                'pending_review': 'bg-yellow-100 text-yellow-800',
                                'in_discussion': 'bg-blue-100 text-blue-800',
                                'quote_sent': 'bg-indigo-100 text-indigo-800',
                                'approved': 'bg-green-100 text-green-800',
                                'in_progress': 'bg-purple-100 text-purple-800',
                                'completed': 'bg-green-100 text-green-800',
                                'rejected': 'bg-red-100 text-red-800'
                            };
                            const statusLabels = {
                                'pending_review': 'En attente',
                                'in_discussion': 'En discussion',
                                'quote_sent': 'Devis envoyé',
                                'approved': 'Approuvé',
                                'in_progress': 'En cours',
                                'completed': 'Terminé',
                                'rejected': 'Rejeté'
                            };
                            return `
                                <div class="px-3 py-2 ${statusColors[status] || 'bg-gray-100 text-gray-800'} rounded-full">
                                    ${statusLabels[status] || status}: <span class="font-bold">${count}</span>
                                </div>
                            `;
                        }).join('') || '<p class="text-gray-500 italic">Aucune donnée disponible</p>'}
                    </div>
                    <button onclick="switchAdminSection('custom-requests-management-content')" class="w-full mt-4 text-center text-sm text-wud-primary hover:text-wud-accent">Gérer les demandes →</button>
                </div>
                
                <div class="bg-white p-6 rounded-lg shadow-lg">
                    <h3 class="text-lg font-semibold text-gray-800 mb-4">📝 Contenu à Gérer</h3>
                    <ul class="space-y-2">
                        <li class="flex justify-between items-center">
                            <span class="text-gray-700">Produits en rupture de stock</span>
                            <span class="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-bold">${(statsData?.recentActivity?.lowStockProducts || []).length}</span>
                        </li>
                        <li class="flex justify-between items-center">
                            <span class="text-gray-700">Articles en brouillon</span>
                            <span class="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-bold">${statsData?.overview?.draftBlogPosts || 0}</span>
                        </li>
                        <li class="flex justify-between items-center">
                            <span class="text-gray-700">Demandes en attente</span>
                            <span class="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-bold">${statsData?.analytics?.customRequestsByStatus?.pending_review || 0}</span>
                        </li>
                        <li class="flex justify-between items-center">
                            <span class="text-gray-700">Commandes à traiter</span>
                            <span class="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-bold">${overviewData?.monthlyGrowth?.orders || 0}</span>
                        </li>
                    </ul>
                </div>
            </div>
        `;
        
        // Rendre la fonction switchAdminSection globale pour les boutons
        window.switchAdminSection = switchAdminSection;
        
    } catch (error) {
        appError('Erreur lors du chargement de la vue d\'ensemble', error);
        overviewContainer.innerHTML = `
            <div class="bg-red-50 border-l-4 border-red-400 p-4 rounded-lg">
                <h3 class="text-lg font-semibold text-gray-800 mb-2">Erreur de chargement</h3>
                <p class="text-gray-600">Impossible de charger les données du dashboard. Veuillez rafraîchir la page.</p>
            </div>
        `;
    }
}

// Stubs pour les autres sections (à implémenter)
async function loadOrdersManagement() {
    try {
        const container = document.getElementById('orders-management-content');
        if (!container) return;
        
        // Ajouter une structure de base pour le contenu de la section
        container.innerHTML = `
            <div class="mb-6">
                <h2 class="text-2xl font-semibold text-wud-primary mb-2">Gestion des Commandes</h2>
                <p class="text-gray-600">Gérez toutes les commandes et leurs statuts.</p>
            </div>
            
            <!-- Filtres de recherche -->
            <div id="admin-order-filters" class="mb-6"></div>
            
            <!-- Tableau des commandes -->
            <div class="overflow-x-auto">
                <table class="min-w-full divide-y divide-gray-200">
                    <thead class="bg-gray-50">
                        <tr>
                            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Numéro
                            </th>
                            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Client
                            </th>
                            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Montant
                            </th>
                            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Statut
                            </th>
                            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Date
                            </th>
                            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody id="admin-order-list-table-body" class="bg-white divide-y divide-gray-200">
                        <tr>
                            <td colspan="6" class="text-center py-8 text-gray-500">Chargement des commandes...</td>
                        </tr>
                    </tbody>
                </table>
            </div>
            
            <!-- Pagination -->
            <div id="admin-order-pagination" class="flex justify-between items-center mt-6">
                <div class="text-sm text-gray-500">
                    <span id="admin-order-count">0</span> commande(s) trouvée(s)
                </div>
                <div class="flex space-x-2">
                    <button id="admin-order-prev-page" class="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">
                        Précédent
                    </button>
                    <button id="admin-order-next-page" class="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">
                        Suivant
                    </button>
                </div>
            </div>
            
            <!-- Détails de la commande (modal) -->
            <div id="admin-order-detail-modal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center hidden">
                <div class="bg-white p-6 rounded-lg shadow-lg max-w-4xl w-full max-h-screen overflow-y-auto">
                    <div class="flex justify-between items-center mb-6">
                        <h3 class="text-xl font-semibold text-wud-primary">Détails de la Commande</h3>
                        <button id="close-order-modal" class="text-2xl text-gray-400 hover:text-gray-600">&times;</button>
                    </div>
                    <div id="admin-order-detail-content">
                        <p class="text-center text-gray-500">Chargement des détails...</p>
                    </div>
                </div>
            </div>
        `;
        
        // Appel à la fonction de chargement du module adminOrders.js
        await loadAdminOrders();
    } catch (error) {
        console.error('Erreur lors du chargement de la gestion des commandes:', error);
        const container = document.getElementById('orders-management-content');
        if (container) {
            container.innerHTML = `
                <div class="bg-red-50 border-l-4 border-red-400 p-4 rounded-lg">
                    <h3 class="text-lg font-semibold text-red-800 mb-2">Erreur</h3>
                    <p class="text-gray-600">Impossible de charger les données des commandes. Veuillez réessayer plus tard.</p>
                </div>
            `;
        }
    }
}

async function loadCustomRequestsManagement() {
    try {
        const container = document.getElementById('custom-requests-management-content');
        if (!container) return;
        
        // Ajouter une structure de base pour le contenu de la section
        container.innerHTML = `
            <div class="mb-6">
                <h2 class="text-2xl font-semibold text-wud-primary mb-2">Demandes sur Mesure</h2>
                <p class="text-gray-600">Gérez toutes les demandes de projets personnalisés.</p>
            </div>
            
            <!-- Filtres de recherche -->
            <div id="admin-custom-request-filters" class="mb-6"></div>
            
            <!-- Tableau des demandes -->
            <div class="overflow-x-auto">
                <table class="min-w-full divide-y divide-gray-200">
                    <thead class="bg-gray-50">
                        <tr>
                            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Client
                            </th>
                            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Email
                            </th>
                            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Description
                            </th>
                            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Statut
                            </th>
                            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Date
                            </th>
                            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody id="admin-custom-request-list-table-body" class="bg-white divide-y divide-gray-200">
                        <tr>
                            <td colspan="6" class="text-center py-8 text-gray-500">Chargement des demandes...</td>
                        </tr>
                    </tbody>
                </table>
            </div>
            
            <!-- Pagination -->
            <div id="admin-custom-request-pagination" class="flex justify-between items-center mt-6">
                <div class="text-sm text-gray-500">
                    <span id="admin-custom-request-count">0</span> demande(s) trouvée(s)
                </div>
                <div class="flex space-x-2">
                    <button id="admin-custom-request-prev-page" class="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">
                        Précédent
                    </button>
                    <button id="admin-custom-request-next-page" class="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">
                        Suivant
                    </button>
                </div>
            </div>
            
            <!-- Détails de la demande (modal) -->
            <div id="admin-custom-request-detail-modal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center hidden">
                <div class="bg-white p-6 rounded-lg shadow-lg max-w-4xl w-full max-h-screen overflow-y-auto">
                    <div class="flex justify-between items-center mb-6">
                        <h3 class="text-xl font-semibold text-wud-primary">Détails de la Demande</h3>
                        <button id="close-custom-request-modal" class="text-2xl text-gray-400 hover:text-gray-600">&times;</button>
                    </div>
                    <div id="admin-custom-request-detail-content">
                        <p class="text-center text-gray-500">Chargement des détails...</p>
                    </div>
                </div>
            </div>
        `;
        
        // Appel à la fonction de chargement du module adminCustomRequests.js
        await loadAdminCustomRequests();
    } catch (error) {
        console.error('Erreur lors du chargement de la gestion des demandes:', error);
        const container = document.getElementById('custom-requests-management-content');
        if (container) {
            container.innerHTML = `
                <div class="bg-red-50 border-l-4 border-red-400 p-4 rounded-lg">
                    <h3 class="text-lg font-semibold text-red-800 mb-2">Erreur</h3>
                    <p class="text-gray-600">Impossible de charger les données des demandes. Veuillez réessayer plus tard.</p>
                </div>
            `;
        }
    }
}

async function loadBlogPostsManagement() {
    try {
        const container = document.getElementById('blog-posts-management-content');
        if (!container) return;
        
        // Ajouter une structure de base pour le contenu de la section
        container.innerHTML = `
            <div class="mb-6">
                <h2 class="text-2xl font-semibold text-wud-primary mb-2">Gestion des Articles de Blog</h2>
                <p class="text-gray-600">Créez et gérez tous les articles du blog.</p>
            </div>
            
            <!-- Actions -->
            <div class="mb-6">
                <button id="admin-blog-add-button" class="bg-wud-primary text-white px-4 py-2 rounded-md hover:bg-wud-accent transition-colors">
                    <i class="fas fa-plus mr-2"></i> Ajouter un Article
                </button>
            </div>
            
            <!-- Filtres de recherche -->
            <div id="admin-blog-filters" class="mb-6"></div>
            
            <!-- Tableau des articles -->
            <div class="overflow-x-auto">
                <table class="min-w-full divide-y divide-gray-200">
                    <thead class="bg-gray-50">
                        <tr>
                            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Titre
                            </th>
                            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Auteur
                            </th>
                            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Catégorie
                            </th>
                            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Statut
                            </th>
                            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Date
                            </th>
                            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody id="admin-blog-list-table-body" class="bg-white divide-y divide-gray-200">
                        <tr>
                            <td colspan="6" class="text-center py-8 text-gray-500">Chargement des articles...</td>
                        </tr>
                    </tbody>
                </table>
            </div>
            
            <!-- Pagination -->
            <div id="admin-blog-pagination" class="flex justify-between items-center mt-6">
                <div class="text-sm text-gray-500">
                    <span id="admin-blog-count">0</span> article(s) trouvé(s)
                </div>
                <div class="flex space-x-2">
                    <button id="admin-blog-prev-page" class="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">
                        Précédent
                    </button>
                    <button id="admin-blog-next-page" class="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">
                        Suivant
                    </button>
                </div>
            </div>
            
            <!-- Modal pour créer/éditer un article -->
            <div id="admin-blog-modal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center hidden">
                <div class="bg-white p-6 rounded-lg shadow-lg max-w-4xl w-full max-h-screen overflow-y-auto">
                    <div class="flex justify-between items-center mb-6">
                        <h3 id="admin-blog-modal-title" class="text-xl font-semibold text-wud-primary">Ajouter un Article</h3>
                        <button id="close-blog-modal" class="text-2xl text-gray-400 hover:text-gray-600">&times;</button>
                    </div>
                    <div id="admin-blog-form-container">
                        <form id="admin-blog-form">
                            <!-- Le formulaire sera généré dynamiquement -->
                        </form>
                    </div>
                </div>
            </div>
        `;
        
        // Appel à la fonction de chargement du module adminBlogPosts.js
        await loadAdminBlogPosts();
    } catch (error) {
        console.error('Erreur lors du chargement de la gestion du blog:', error);
        const container = document.getElementById('blog-posts-management-content');
        if (container) {
            container.innerHTML = `
                <div class="bg-red-50 border-l-4 border-red-400 p-4 rounded-lg">
                    <h3 class="text-lg font-semibold text-red-800 mb-2">Erreur</h3>
                    <p class="text-gray-600">Impossible de charger les données du blog. Veuillez réessayer plus tard.</p>
                </div>
            `;
        }
    }
}

// Démarrer le dashboard quand le DOM est prêt
document.addEventListener('DOMContentLoaded', initAdminDashboard);
