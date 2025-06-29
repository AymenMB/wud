import { customRequestAdminAPI } from '../api.js';
import { devLog } from '../uiUtils.js';

// État global pour la gestion des demandes sur mesure
let customRequestManagementState = {
    currentFilters: {
        page: 1,
        pageSize: 20,
        status: 'all',
        sortBy: 'createdAt',
        sortOrder: 'desc'
    }
};

// Fonction de rendu du tableau des demandes
function renderCustomRequestTable(requests, containerId = 'admin-custom-request-list-table-body') {
    const tableBody = document.getElementById(containerId);
    if (!tableBody) {
        devLog('Custom request table body element not found');
        return;
    }
    
    if (!requests || requests.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="6" class="text-center py-8 text-gray-500">Aucune demande trouvée</td></tr>';
        return;
    }

    tableBody.innerHTML = requests.map(request => {
        const statusClass = getCustomRequestStatusClass(request.status);
        
        return `
            <tr class="hover:bg-gray-50">
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    ${request.firstName} ${request.lastName}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${request.email}
                </td>
                <td class="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                    ${request.projectDescription.substring(0, 50)}${request.projectDescription.length > 50 ? '...' : ''}
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusClass}">
                        ${getCustomRequestStatusText(request.status)}
                    </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${new Date(request.createdAt).toLocaleDateString('fr-FR')}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div class="flex space-x-2">
                        <button onclick="viewCustomRequest('${request._id}')" 
                                class="text-blue-600 hover:text-blue-900">
                            Voir
                        </button>
                        <button onclick="editCustomRequestStatus('${request._id}', '${request.status}')" 
                                class="text-green-600 hover:text-green-900">
                            Statut
                        </button>
                        <button onclick="deleteCustomRequest('${request._id}')" 
                                class="text-red-600 hover:text-red-900">
                            Supprimer
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// Fonctions utilitaires pour le statut des demandes sur mesure
function getCustomRequestStatusClass(status) {
    const statusClasses = {
        'pending_review': 'bg-yellow-100 text-yellow-800',
        'in_discussion': 'bg-blue-100 text-blue-800',
        'quote_sent': 'bg-purple-100 text-purple-800',
        'approved': 'bg-green-100 text-green-800',
        'in_progress': 'bg-indigo-100 text-indigo-800',
        'completed': 'bg-green-100 text-green-800',
        'rejected': 'bg-red-100 text-red-800'
    };
    return statusClasses[status] || 'bg-gray-100 text-gray-800';
}

function getCustomRequestStatusText(status) {
    const statusTexts = {
        'pending_review': 'En attente',
        'in_discussion': 'En discussion',
        'quote_sent': 'Devis envoyé',
        'approved': 'Approuvé',
        'in_progress': 'En cours',
        'completed': 'Terminé',
        'rejected': 'Rejeté'
    };
    return statusTexts[status] || status;
}

// Rendu des filtres
function renderCustomRequestFilters(containerId = 'admin-custom-request-filters') {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = `
        <div class="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6">
            <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                    <label for="custom-request-status-filter" class="block text-sm font-medium text-gray-700 mb-1">
                        Statut
                    </label>
                    <select id="custom-request-status-filter" class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-wud-primary">
                        <option value="all">Tous les statuts</option>
                        <option value="pending_review">En attente</option>
                        <option value="in_discussion">En discussion</option>
                        <option value="quote_sent">Devis envoyé</option>
                        <option value="approved">Approuvé</option>
                        <option value="in_progress">En cours</option>
                        <option value="completed">Terminé</option>
                        <option value="rejected">Rejeté</option>
                    </select>
                </div>
                
                <div>
                    <label for="custom-request-sort-filter" class="block text-sm font-medium text-gray-700 mb-1">
                        Trier par
                    </label>
                    <select id="custom-request-sort-filter" class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-wud-primary">
                        <option value="createdAt">Date de création</option>
                        <option value="firstName">Nom</option>
                        <option value="status">Statut</option>
                    </select>
                </div>

                <div>
                    <label for="custom-request-sort-order" class="block text-sm font-medium text-gray-700 mb-1">
                        Ordre
                    </label>
                    <select id="custom-request-sort-order" class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-wud-primary">
                        <option value="desc">Décroissant</option>
                        <option value="asc">Croissant</option>
                    </select>
                </div>

                <div>
                    <label for="custom-request-page-size" class="block text-sm font-medium text-gray-700 mb-1">
                        Résultats par page
                    </label>
                    <select id="custom-request-page-size" class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-wud-primary">
                        <option value="10">10</option>
                        <option value="20" selected>20</option>
                        <option value="50">50</option>
                    </select>
                </div>
            </div>
        </div>
    `;

    attachCustomRequestFilterEventListeners();
}

function attachCustomRequestFilterEventListeners() {
    const statusFilter = document.getElementById('custom-request-status-filter');
    const sortFilter = document.getElementById('custom-request-sort-filter');
    const sortOrderFilter = document.getElementById('custom-request-sort-order');
    const pageSizeFilter = document.getElementById('custom-request-page-size');

    [statusFilter, sortFilter, sortOrderFilter, pageSizeFilter].forEach(filter => {
        if (filter) {
            filter.addEventListener('change', () => {
                customRequestManagementState.currentFilters.page = 1;
                customRequestManagementState.currentFilters.status = statusFilter.value;
                customRequestManagementState.currentFilters.sortBy = sortFilter.value;
                customRequestManagementState.currentFilters.sortOrder = sortOrderFilter.value;
                customRequestManagementState.currentFilters.pageSize = parseInt(pageSizeFilter.value);
                loadCustomRequestsWithFilters();
            });
        }
    });
}

// Charger les demandes avec filtres
async function loadCustomRequestsWithFilters() {
    try {
        const params = {};
        if (customRequestManagementState.currentFilters.status !== 'all') {
            params.status = customRequestManagementState.currentFilters.status;
        }
        
        params.page = customRequestManagementState.currentFilters.page;
        params.pageSize = customRequestManagementState.currentFilters.pageSize;
        params.sortBy = customRequestManagementState.currentFilters.sortBy;
        params.sortOrder = customRequestManagementState.currentFilters.sortOrder;

        const response = await customRequestAdminAPI.getAll(params);
        
        renderCustomRequestTable(response.customRequests || response.requests || response);
        if (response.page) {
            renderCustomRequestPagination(response);
        }
        
    } catch (error) {
        console.error('Erreur lors du chargement des demandes:', error);
        const tableBody = document.getElementById('admin-custom-request-list-table-body');
        if (tableBody) {
            tableBody.innerHTML = '<tr><td colspan="6" class="text-center py-8 text-red-500">Erreur lors du chargement des demandes</td></tr>';
        }
    }
}

// Rendu de la pagination
function renderCustomRequestPagination(response) {
    const paginationContainer = document.getElementById('admin-custom-request-pagination');
    if (!paginationContainer) return;

    const { page, pages, count } = response;
    
    if (pages <= 1) {
        paginationContainer.innerHTML = '';
        return;
    }

    const paginationHTML = `
        <div class="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-200 sm:px-6">
            <div class="flex justify-between flex-1 sm:hidden">
                <button ${page <= 1 ? 'disabled' : ''} 
                        onclick="changeCustomRequestPage(${page - 1})"
                        class="relative inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 ${page <= 1 ? 'opacity-50 cursor-not-allowed' : ''}">
                    Précédent
                </button>
                <button ${page >= pages ? 'disabled' : ''} 
                        onclick="changeCustomRequestPage(${page + 1})"
                        class="relative ml-3 inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 ${page >= pages ? 'opacity-50 cursor-not-allowed' : ''}">
                    Suivant
                </button>
            </div>
            <div class="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                <div>
                    <p class="text-sm text-gray-700">
                        Affichage de <span class="font-medium">${((page - 1) * customRequestManagementState.currentFilters.pageSize) + 1}</span>
                        à <span class="font-medium">${Math.min(page * customRequestManagementState.currentFilters.pageSize, count)}</span>
                        sur <span class="font-medium">${count}</span> résultats
                    </p>
                </div>
            </div>
        </div>
    `;

    paginationContainer.innerHTML = paginationHTML;
}

// Fonction globale pour changer de page
window.changeCustomRequestPage = function(newPage) {
    customRequestManagementState.currentFilters.page = newPage;
    loadCustomRequestsWithFilters();
};

// Fonctions globales pour les actions
window.viewCustomRequest = async function(requestId) {
    try {
        const request = await customRequestAdminAPI.getById(requestId);
        showCustomRequestDetailModal(request);
    } catch (error) {
        console.error('Erreur lors du chargement de la demande:', error);
        alert('Erreur lors du chargement de la demande');
    }
};

window.editCustomRequestStatus = function(requestId, currentStatus) {
    showCustomRequestStatusModal(requestId, currentStatus);
};

window.deleteCustomRequest = async function(requestId) {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette demande sur mesure ?')) {
        try {
            await customRequestAdminAPI.delete(requestId);
            loadCustomRequestsWithFilters();
        } catch (error) {
            console.error('Erreur lors de la suppression:', error);
            alert('Erreur lors de la suppression de la demande');
        }
    }
};

// Modal pour afficher les détails d'une demande
function showCustomRequestDetailModal(request) {
    const modalHTML = `
        <div id="custom-request-detail-modal" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div class="relative top-10 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-2/3 shadow-lg rounded-md bg-white">
                <div class="mt-3">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="text-lg font-bold text-gray-900">
                            Demande de ${request.firstName} ${request.lastName}
                        </h3>
                        <button onclick="closeCustomRequestDetailModal()" class="text-gray-400 hover:text-gray-600">
                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                            </svg>
                        </button>
                    </div>
                    
                    <div class="space-y-6">
                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <h4 class="font-semibold text-gray-700">Informations de contact</h4>
                                <p><strong>Nom:</strong> ${request.firstName} ${request.lastName}</p>
                                <p><strong>Email:</strong> ${request.email}</p>
                                ${request.phoneNumber ? `<p><strong>Téléphone:</strong> ${request.phoneNumber}</p>` : ''}
                            </div>
                            <div>
                                <h4 class="font-semibold text-gray-700">Statut et dates</h4>
                                <p><strong>Statut:</strong> 
                                    <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getCustomRequestStatusClass(request.status)}">
                                        ${getCustomRequestStatusText(request.status)}
                                    </span>
                                </p>
                                <p><strong>Créé le:</strong> ${new Date(request.createdAt).toLocaleDateString('fr-FR')}</p>
                                <p><strong>Mis à jour le:</strong> ${new Date(request.updatedAt).toLocaleDateString('fr-FR')}</p>
                            </div>
                        </div>
                        
                        <div>
                            <h4 class="font-semibold text-gray-700">Description du projet</h4>
                            <div class="bg-gray-50 p-3 rounded-md">
                                <p class="whitespace-pre-wrap">${request.projectDescription}</p>
                            </div>
                        </div>
                        
                        ${request.dimensions ? `
                            <div>
                                <h4 class="font-semibold text-gray-700">Dimensions souhaitées</h4>
                                <p>${request.dimensions}</p>
                            </div>
                        ` : ''}
                        
                        ${request.woodTypes && request.woodTypes.length > 0 ? `
                            <div>
                                <h4 class="font-semibold text-gray-700">Essences de bois préférées</h4>
                                <p>${request.woodTypes.join(', ')}</p>
                            </div>
                        ` : ''}
                        
                        ${request.budgetRange ? `
                            <div>
                                <h4 class="font-semibold text-gray-700">Budget indicatif</h4>
                                <p>${request.budgetRange}</p>
                            </div>
                        ` : ''}
                        
                        ${request.inspirationImages && request.inspirationImages.length > 0 ? `
                            <div>
                                <h4 class="font-semibold text-gray-700">Images d'inspiration</h4>
                                <div class="grid grid-cols-2 md:grid-cols-3 gap-2">
                                    ${request.inspirationImages.map(image => `
                                        <div class="relative">
                                            <img src="${image.url}" alt="${image.caption || 'Image d\'inspiration'}" 
                                                 class="w-full h-32 object-cover rounded-md">
                                            ${image.caption ? `<p class="text-xs text-gray-600 mt-1">${image.caption}</p>` : ''}
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        ` : ''}
                        
                        ${request.adminNotes ? `
                            <div>
                                <h4 class="font-semibold text-gray-700">Notes administratives</h4>
                                <div class="bg-blue-50 p-3 rounded-md">
                                    <p class="whitespace-pre-wrap">${request.adminNotes}</p>
                                </div>
                            </div>
                        ` : ''}
                        
                        <div class="flex justify-between items-center pt-4 border-t">
                            <div class="space-x-2">
                                <button onclick="editCustomRequestStatus('${request._id}', '${request.status}')" 
                                        class="px-4 py-2 bg-wud-primary text-white rounded-md hover:bg-wud-secondary">
                                    Modifier le statut
                                </button>
                                <button onclick="addAdminNotes('${request._id}')" 
                                        class="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600">
                                    Ajouter des notes
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

window.closeCustomRequestDetailModal = function() {
    const modal = document.getElementById('custom-request-detail-modal');
    if (modal) {
        modal.remove();
    }
};

// Modal pour modifier le statut
function showCustomRequestStatusModal(requestId, currentStatus) {
    const modalHTML = `
        <div id="custom-request-status-modal" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div class="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
                <div class="mt-3">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="text-lg font-bold text-gray-900">Modifier le statut</h3>
                        <button onclick="closeCustomRequestStatusModal()" class="text-gray-400 hover:text-gray-600">
                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                            </svg>
                        </button>
                    </div>
                    
                    <form id="custom-request-status-form">
                        <div class="mb-4">
                            <label for="new-custom-request-status" class="block text-sm font-medium text-gray-700 mb-1">
                                Nouveau statut
                            </label>
                            <select id="new-custom-request-status" class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-wud-primary">
                                <option value="pending_review" ${currentStatus === 'pending_review' ? 'selected' : ''}>En attente</option>
                                <option value="in_discussion" ${currentStatus === 'in_discussion' ? 'selected' : ''}>En discussion</option>
                                <option value="quote_sent" ${currentStatus === 'quote_sent' ? 'selected' : ''}>Devis envoyé</option>
                                <option value="approved" ${currentStatus === 'approved' ? 'selected' : ''}>Approuvé</option>
                                <option value="in_progress" ${currentStatus === 'in_progress' ? 'selected' : ''}>En cours</option>
                                <option value="completed" ${currentStatus === 'completed' ? 'selected' : ''}>Terminé</option>
                                <option value="rejected" ${currentStatus === 'rejected' ? 'selected' : ''}>Rejeté</option>
                            </select>
                        </div>
                        
                        <div class="flex justify-end space-x-2">
                            <button type="button" onclick="closeCustomRequestStatusModal()" 
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

    document.getElementById('custom-request-status-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const newStatus = document.getElementById('new-custom-request-status').value;
        
        try {
            await customRequestAdminAPI.update(requestId, { status: newStatus });
            closeCustomRequestStatusModal();
            loadCustomRequestsWithFilters();
            
            // Fermer aussi le modal de détail s'il est ouvert
            const detailModal = document.getElementById('custom-request-detail-modal');
            if (detailModal) {
                detailModal.remove();
            }
            
        } catch (error) {
            console.error('Erreur lors de la mise à jour du statut:', error);
            alert('Erreur lors de la mise à jour du statut');
        }
    });
}

window.closeCustomRequestStatusModal = function() {
    const modal = document.getElementById('custom-request-status-modal');
    if (modal) {
        modal.remove();
    }
};

// Modal pour ajouter des notes admin
window.addAdminNotes = function(requestId) {
    const modalHTML = `
        <div id="admin-notes-modal" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div class="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
                <div class="mt-3">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="text-lg font-bold text-gray-900">Ajouter des notes</h3>
                        <button onclick="closeAdminNotesModal()" class="text-gray-400 hover:text-gray-600">
                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                            </svg>
                        </button>
                    </div>
                    
                    <form id="admin-notes-form">
                        <div class="mb-4">
                            <label for="admin-notes-textarea" class="block text-sm font-medium text-gray-700 mb-1">
                                Notes administratives
                            </label>
                            <textarea id="admin-notes-textarea" rows="4" 
                                    class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-wud-primary"
                                    placeholder="Ajoutez vos notes ici..."></textarea>
                        </div>
                        
                        <div class="flex justify-end space-x-2">
                            <button type="button" onclick="closeAdminNotesModal()" 
                                    class="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50">
                                Annuler
                            </button>
                            <button type="submit" 
                                    class="px-4 py-2 bg-wud-primary text-white rounded-md hover:bg-wud-secondary">
                                Enregistrer
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    document.getElementById('admin-notes-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const notes = document.getElementById('admin-notes-textarea').value;
        
        try {
            await customRequestAPI.updateAdmin(requestId, { adminNotes: notes });
            closeAdminNotesModal();
            
            // Recharger le modal de détail s'il est ouvert
            const detailModal = document.getElementById('custom-request-detail-modal');
            if (detailModal) {
                const request = await customRequestAdminAPI.getById(requestId);
                detailModal.remove();
                showCustomRequestDetailModal(request);
            }
            
        } catch (error) {
            console.error('Erreur lors de l\'ajout des notes:', error);
            alert('Erreur lors de l\'ajout des notes');
        }
    });
};

window.closeAdminNotesModal = function() {
    const modal = document.getElementById('admin-notes-modal');
    if (modal) {
        modal.remove();
    }
};

// Fonction principale pour charger la gestion des demandes sur mesure
export async function loadAdminCustomRequests() {
    const container = document.getElementById('admin-main-content');
    if (!container) return;

    container.innerHTML = `
        <div class="space-y-6">
            <div class="flex justify-between items-center">
                <h2 class="text-2xl font-bold text-gray-900">Gestion des Demandes sur Mesure</h2>
            </div>
            
            <div id="admin-custom-request-filters"></div>
            
            <div class="bg-white shadow-sm rounded-lg overflow-hidden">
                <table class="min-w-full divide-y divide-gray-200">
                    <thead class="bg-gray-50">
                        <tr>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Client
                            </th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Email
                            </th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Description
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
                    <tbody id="admin-custom-request-list-table-body" class="bg-white divide-y divide-gray-200">
                        <tr>
                            <td colspan="6" class="text-center py-8 text-gray-500">Chargement des demandes...</td>
                        </tr>
                    </tbody>
                </table>
            </div>
            
            <div id="admin-custom-request-pagination"></div>
        </div>
    `;

    // Charger les filtres et les demandes
    renderCustomRequestFilters();
    await loadCustomRequestsWithFilters();
}
