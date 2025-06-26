import { orderAPI } from '../api.js';
import { devLog } from '../uiUtils.js';

// État global pour la gestion des commandes
let orderManagementState = {
    currentFilters: {
        page: 1,
        pageSize: 20,
        status: 'all',
        sortBy: 'createdAt',
        sortOrder: 'desc'
    }
};

// Variables pour les timeouts
let searchTimeout;

// Fonction de rendu du tableau des commandes
function renderOrderTable(orders, containerId = 'admin-order-list-table-body') {
    const tableBody = document.getElementById(containerId);
    if (!tableBody) {
        devLog('Order table body element not found');
        return;
    }
    
    if (!orders || orders.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="6" class="text-center py-8 text-gray-500">Aucune commande trouvée</td></tr>';
        return;
    }

    tableBody.innerHTML = orders.map(order => {
        const statusClass = getStatusClass(order.status);
        const customerName = order.user ? `${order.user.firstName} ${order.user.lastName}` : 'Client supprimé';
        
        return `
            <tr class="hover:bg-gray-50">
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    #${order.orderNumber || order._id.slice(-8)}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${customerName}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${order.totalAmount?.toFixed(2) || '0.00'} €
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusClass}">
                        ${getStatusText(order.status)}
                    </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${new Date(order.createdAt).toLocaleDateString('fr-FR')}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div class="flex space-x-2">
                        <button onclick="viewOrder('${order._id}')" 
                                class="text-blue-600 hover:text-blue-900">
                            Voir
                        </button>
                        <button onclick="editOrderStatus('${order._id}', '${order.status}')" 
                                class="text-green-600 hover:text-green-900">
                            Statut
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// Fonctions utilitaires pour le statut
function getStatusClass(status) {
    const statusClasses = {
        'pending': 'bg-yellow-100 text-yellow-800',
        'paid': 'bg-blue-100 text-blue-800',
        'processing': 'bg-indigo-100 text-indigo-800',
        'shipped': 'bg-purple-100 text-purple-800',
        'delivered': 'bg-green-100 text-green-800',
        'cancelled': 'bg-red-100 text-red-800',
        'refunded': 'bg-gray-100 text-gray-800'
    };
    return statusClasses[status] || 'bg-gray-100 text-gray-800';
}

function getStatusText(status) {
    const statusTexts = {
        'pending': 'En attente',
        'paid': 'Payée',
        'processing': 'En traitement',
        'shipped': 'Expédiée',
        'delivered': 'Livrée',
        'cancelled': 'Annulée',
        'refunded': 'Remboursée'
    };
    return statusTexts[status] || status;
}

// Rendu des filtres
function renderOrderFilters(containerId = 'admin-order-filters') {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = `
        <div class="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6">
            <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                    <label for="order-status-filter" class="block text-sm font-medium text-gray-700 mb-1">
                        Statut
                    </label>
                    <select id="order-status-filter" class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-wud-primary">
                        <option value="all">Tous les statuts</option>
                        <option value="pending">En attente</option>
                        <option value="paid">Payées</option>
                        <option value="processing">En traitement</option>
                        <option value="shipped">Expédiées</option>
                        <option value="delivered">Livrées</option>
                        <option value="cancelled">Annulées</option>
                        <option value="refunded">Remboursées</option>
                    </select>
                </div>
                
                <div>
                    <label for="order-sort-filter" class="block text-sm font-medium text-gray-700 mb-1">
                        Trier par
                    </label>
                    <select id="order-sort-filter" class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-wud-primary">
                        <option value="createdAt">Date de création</option>
                        <option value="totalAmount">Montant</option>
                        <option value="status">Statut</option>
                    </select>
                </div>

                <div>
                    <label for="order-sort-order" class="block text-sm font-medium text-gray-700 mb-1">
                        Ordre
                    </label>
                    <select id="order-sort-order" class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-wud-primary">
                        <option value="desc">Décroissant</option>
                        <option value="asc">Croissant</option>
                    </select>
                </div>

                <div>
                    <label for="order-page-size" class="block text-sm font-medium text-gray-700 mb-1">
                        Résultats par page
                    </label>
                    <select id="order-page-size" class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-wud-primary">
                        <option value="10">10</option>
                        <option value="20" selected>20</option>
                        <option value="50">50</option>
                    </select>
                </div>
            </div>
        </div>
    `;

    attachOrderFilterEventListeners();
}

function attachOrderFilterEventListeners() {
    const statusFilter = document.getElementById('order-status-filter');
    const sortFilter = document.getElementById('order-sort-filter');
    const sortOrderFilter = document.getElementById('order-sort-order');
    const pageSizeFilter = document.getElementById('order-page-size');

    [statusFilter, sortFilter, sortOrderFilter, pageSizeFilter].forEach(filter => {
        if (filter) {
            filter.addEventListener('change', () => {
                orderManagementState.currentFilters.page = 1;
                orderManagementState.currentFilters.status = statusFilter.value;
                orderManagementState.currentFilters.sortBy = sortFilter.value;
                orderManagementState.currentFilters.sortOrder = sortOrderFilter.value;
                orderManagementState.currentFilters.pageSize = parseInt(pageSizeFilter.value);
                loadOrdersWithFilters();
            });
        }
    });
}

// Charger les commandes avec filtres
async function loadOrdersWithFilters() {
    try {
        const params = {};
        if (orderManagementState.currentFilters.status !== 'all') {
            params.status = orderManagementState.currentFilters.status;
        }
        
        params.page = orderManagementState.currentFilters.page;
        params.pageSize = orderManagementState.currentFilters.pageSize;
        params.sortBy = orderManagementState.currentFilters.sortBy;
        params.sortOrder = orderManagementState.currentFilters.sortOrder;

        const response = await orderAPI.getAllAdmin(params);
        
        renderOrderTable(response.orders);
        renderOrderPagination(response);
        
    } catch (error) {
        console.error('Erreur lors du chargement des commandes:', error);
        const tableBody = document.getElementById('admin-order-list-table-body');
        if (tableBody) {
            tableBody.innerHTML = '<tr><td colspan="6" class="text-center py-8 text-red-500">Erreur lors du chargement des commandes</td></tr>';
        }
    }
}

// Rendu de la pagination
function renderOrderPagination(response) {
    const paginationContainer = document.getElementById('admin-order-pagination');
    if (!paginationContainer) return;

    const { page, pages, count } = response;
    
    if (pages <= 1) {
        paginationContainer.innerHTML = '';
        return;
    }

    let paginationHTML = `
        <div class="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-200 sm:px-6">
            <div class="flex justify-between flex-1 sm:hidden">
                <button ${page <= 1 ? 'disabled' : ''} 
                        onclick="changeOrderPage(${page - 1})"
                        class="relative inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 ${page <= 1 ? 'opacity-50 cursor-not-allowed' : ''}">
                    Précédent
                </button>
                <button ${page >= pages ? 'disabled' : ''} 
                        onclick="changeOrderPage(${page + 1})"
                        class="relative ml-3 inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 ${page >= pages ? 'opacity-50 cursor-not-allowed' : ''}">
                    Suivant
                </button>
            </div>
            <div class="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                <div>
                    <p class="text-sm text-gray-700">
                        Affichage de <span class="font-medium">${((page - 1) * orderManagementState.currentFilters.pageSize) + 1}</span>
                        à <span class="font-medium">${Math.min(page * orderManagementState.currentFilters.pageSize, count)}</span>
                        sur <span class="font-medium">${count}</span> résultats
                    </p>
                </div>
                <div>
                    <nav class="relative z-0 inline-flex -space-x-px rounded-md shadow-sm">
    `;

    // Bouton précédent
    paginationHTML += `
        <button ${page <= 1 ? 'disabled' : ''} 
                onclick="changeOrderPage(${page - 1})"
                class="relative inline-flex items-center px-2 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-l-md hover:bg-gray-50 ${page <= 1 ? 'opacity-50 cursor-not-allowed' : ''}">
            ←
        </button>
    `;

    // Numéros de page
    for (let i = Math.max(1, page - 2); i <= Math.min(pages, page + 2); i++) {
        paginationHTML += `
            <button onclick="changeOrderPage(${i})"
                    class="relative inline-flex items-center px-4 py-2 text-sm font-medium ${i === page ? 'text-white bg-wud-primary border-wud-primary' : 'text-gray-700 bg-white border-gray-300 hover:bg-gray-50'} border">
                ${i}
            </button>
        `;
    }

    // Bouton suivant
    paginationHTML += `
        <button ${page >= pages ? 'disabled' : ''} 
                onclick="changeOrderPage(${page + 1})"
                class="relative inline-flex items-center px-2 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-r-md hover:bg-gray-50 ${page >= pages ? 'opacity-50 cursor-not-allowed' : ''}">
            →
        </button>
                    </nav>
                </div>
            </div>
        </div>
    `;

    paginationContainer.innerHTML = paginationHTML;
}

// Fonction globale pour changer de page
window.changeOrderPage = function(newPage) {
    orderManagementState.currentFilters.page = newPage;
    loadOrdersWithFilters();
};

// Fonctions globales pour les actions
window.viewOrder = async function(orderId) {
    try {
        const order = await orderAPI.getById(orderId);
        showOrderDetailModal(order);
    } catch (error) {
        console.error('Erreur lors du chargement de la commande:', error);
        alert('Erreur lors du chargement de la commande');
    }
};

window.editOrderStatus = function(orderId, currentStatus) {
    showOrderStatusModal(orderId, currentStatus);
};

// Modal pour afficher les détails d'une commande
function showOrderDetailModal(order) {
    const modalHTML = `
        <div id="order-detail-modal" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div class="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
                <div class="mt-3">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="text-lg font-bold text-gray-900">
                            Détails de la commande #${order.orderNumber || order._id.slice(-8)}
                        </h3>
                        <button onclick="closeOrderDetailModal()" class="text-gray-400 hover:text-gray-600">
                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                            </svg>
                        </button>
                    </div>
                    
                    <div class="space-y-4">
                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <h4 class="font-semibold text-gray-700">Client</h4>
                                <p>${order.user ? `${order.user.firstName} ${order.user.lastName}` : 'Client supprimé'}</p>
                                <p class="text-sm text-gray-500">${order.user?.email || ''}</p>
                            </div>
                            <div>
                                <h4 class="font-semibold text-gray-700">Statut</h4>
                                <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusClass(order.status)}">
                                    ${getStatusText(order.status)}
                                </span>
                            </div>
                        </div>
                        
                        <div>
                            <h4 class="font-semibold text-gray-700">Adresse de livraison</h4>
                            <p>${order.shippingAddress.street}</p>
                            <p>${order.shippingAddress.zipCode} ${order.shippingAddress.city}</p>
                            <p>${order.shippingAddress.country}</p>
                        </div>
                        
                        <div>
                            <h4 class="font-semibold text-gray-700">Articles commandés</h4>
                            <div class="border rounded-lg overflow-hidden">
                                <table class="min-w-full divide-y divide-gray-200">
                                    <thead class="bg-gray-50">
                                        <tr>
                                            <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Produit</th>
                                            <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Quantité</th>
                                            <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Prix unitaire</th>
                                            <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody class="bg-white divide-y divide-gray-200">
                                        ${order.items.map(item => `
                                            <tr>
                                                <td class="px-4 py-2">
                                                    <div>
                                                        <p class="text-sm font-medium text-gray-900">${item.name}</p>
                                                        ${item.variantInfo ? `<p class="text-xs text-gray-500">${item.variantInfo}</p>` : ''}
                                                    </div>
                                                </td>
                                                <td class="px-4 py-2 text-sm text-gray-900">${item.quantity}</td>
                                                <td class="px-4 py-2 text-sm text-gray-900">${item.price.toFixed(2)} €</td>
                                                <td class="px-4 py-2 text-sm text-gray-900">${(item.quantity * item.price).toFixed(2)} €</td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        
                        <div class="flex justify-between items-center pt-4 border-t">
                            <span class="text-lg font-semibold">Total: ${order.totalAmount.toFixed(2)} €</span>
                            <div class="space-x-2">
                                <button onclick="editOrderStatus('${order._id}', '${order.status}')" 
                                        class="px-4 py-2 bg-wud-primary text-white rounded-md hover:bg-wud-secondary">
                                    Modifier le statut
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

window.closeOrderDetailModal = function() {
    const modal = document.getElementById('order-detail-modal');
    if (modal) {
        modal.remove();
    }
};

// Modal pour modifier le statut d'une commande
function showOrderStatusModal(orderId, currentStatus) {
    const modalHTML = `
        <div id="order-status-modal" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div class="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
                <div class="mt-3">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="text-lg font-bold text-gray-900">Modifier le statut</h3>
                        <button onclick="closeOrderStatusModal()" class="text-gray-400 hover:text-gray-600">
                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                            </svg>
                        </button>
                    </div>
                    
                    <form id="order-status-form">
                        <div class="mb-4">
                            <label for="new-status" class="block text-sm font-medium text-gray-700 mb-1">
                                Nouveau statut
                            </label>
                            <select id="new-status" class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-wud-primary">
                                <option value="pending" ${currentStatus === 'pending' ? 'selected' : ''}>En attente</option>
                                <option value="paid" ${currentStatus === 'paid' ? 'selected' : ''}>Payée</option>
                                <option value="processing" ${currentStatus === 'processing' ? 'selected' : ''}>En traitement</option>
                                <option value="shipped" ${currentStatus === 'shipped' ? 'selected' : ''}>Expédiée</option>
                                <option value="delivered" ${currentStatus === 'delivered' ? 'selected' : ''}>Livrée</option>
                                <option value="cancelled" ${currentStatus === 'cancelled' ? 'selected' : ''}>Annulée</option>
                                <option value="refunded" ${currentStatus === 'refunded' ? 'selected' : ''}>Remboursée</option>
                            </select>
                        </div>
                        
                        <div class="flex justify-end space-x-2">
                            <button type="button" onclick="closeOrderStatusModal()" 
                                    class="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50">
                                Annuler
                            </button>
                            <button type="submit" 
                                    class="px-4 py-2 bg-wud-primary text-white rounded-md hover:bg-wud-secondary">
                                Mettre à jour
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    document.getElementById('order-status-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const newStatus = document.getElementById('new-status').value;
        
        try {
            await orderAPI.updateStatusAdmin(orderId, { status: newStatus });
            closeOrderStatusModal();
            loadOrdersWithFilters(); // Recharger la liste
            
            // Fermer aussi le modal de détail s'il est ouvert
            const detailModal = document.getElementById('order-detail-modal');
            if (detailModal) {
                detailModal.remove();
            }
            
        } catch (error) {
            console.error('Erreur lors de la mise à jour du statut:', error);
            alert('Erreur lors de la mise à jour du statut');
        }
    });
}

window.closeOrderStatusModal = function() {
    const modal = document.getElementById('order-status-modal');
    if (modal) {
        modal.remove();
    }
};

// Fonction principale pour charger la gestion des commandes
export async function loadAdminOrders() {
    const container = document.getElementById('admin-main-content');
    if (!container) return;

    container.innerHTML = `
        <div class="space-y-6">
            <div class="flex justify-between items-center">
                <h2 class="text-2xl font-bold text-gray-900">Gestion des Commandes</h2>
            </div>
            
            <div id="admin-order-filters"></div>
            
            <div class="bg-white shadow-sm rounded-lg overflow-hidden">
                <table class="min-w-full divide-y divide-gray-200">
                    <thead class="bg-gray-50">
                        <tr>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Numéro
                            </th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Client
                            </th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Montant
                            </th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Statut
                            </th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Date
                            </th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
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
            
            <div id="admin-order-pagination"></div>
        </div>
    `;

    // Charger les filtres et les commandes
    renderOrderFilters();
    await loadOrdersWithFilters();
}
