import { apiRequest } from '../api.js';
import { displayMessage, setLoadingState, devLog, appError, devWarn } from '../uiUtils.js';

// API pour l'administration des utilisateurs
export const userAdminAPI = {
    // Récupérer tous les utilisateurs avec filtres admin
    async getAll(filters = {}) {
        const params = new URLSearchParams();
        if (filters.page) params.append('page', filters.page);
        if (filters.pageSize) params.append('pageSize', filters.pageSize);
        if (filters.search) params.append('search', filters.search);
        if (filters.role && filters.role !== 'all') params.append('role', filters.role);
        if (filters.sortBy) params.append('sortBy', filters.sortBy);
        if (filters.sortOrder) params.append('sortOrder', filters.sortOrder);
        
        const queryString = params.toString();
        const endpoint = `/users${queryString ? '?' + queryString : ''}`;
        return await apiRequest(endpoint, 'GET', null, true);
    },

    // Récupérer un utilisateur par ID (admin)
    async getById(id) {
        return await apiRequest(`/users/${id}`, 'GET', null, true);
    },

    // Créer un nouvel utilisateur
    async create(userData) {
        return await apiRequest('/users', 'POST', userData, true);
    },

    // Mettre à jour un utilisateur
    async update(id, userData) {
        return await apiRequest(`/users/${id}`, 'PUT', userData, true);
    },

    // Supprimer un utilisateur
    async delete(id) {
        return await apiRequest(`/users/${id}`, 'DELETE', null, true);
    }
};

// État global pour la gestion des utilisateurs
let userManagementState = {
    currentFilters: {
        page: 1,
        pageSize: 20,
        search: '',
        role: 'all',
        sortBy: 'createdAt',
        sortOrder: 'desc'
    }
};

// Variables pour les timeouts
let searchTimeout;

// Fonction de rendu du tableau des utilisateurs
function renderUserTable(users, containerId = 'admin-user-list-table-body') {
    const tableBody = document.getElementById(containerId);
    if (!tableBody) {
        devLog(`Table body with id "${containerId}" not found for rendering user table.`);
        return;
    }
    
    if (!users || users.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="6" class="text-center py-8 text-wud-secondary">👥 Aucun utilisateur trouvé.</td></tr>';
        return;
    }
    
    tableBody.innerHTML = users.map(user => `
        <tr class="border-b hover:bg-gray-50 transition-colors">
            <td class="py-3 px-3">
                <div class="flex items-center">
                    <div class="w-10 h-10 bg-wud-primary rounded-full flex items-center justify-center text-white font-semibold mr-3">
                        ${(user.firstName?.charAt(0) || 'U').toUpperCase()}${(user.lastName?.charAt(0) || '').toUpperCase()}
                    </div>
                    <div>
                        <div class="font-medium text-sm">${user.firstName || ''} ${user.lastName || ''}</div>
                        <div class="text-xs text-gray-500">${user.email}</div>
                    </div>
                </div>
            </td>
            <td class="py-3 px-3 text-sm">
                <span class="px-2 py-1 text-xs font-semibold rounded-full ${user.role === 'admin' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}">
                    ${user.role === 'admin' ? '👑 Admin' : '👤 Client'}
                </span>
            </td>
            <td class="py-3 px-3 text-sm">${user.phoneNumber || '-'}</td>
            <td class="py-3 px-3 text-sm">${user.addresses?.length || 0} adresse(s)</td>
            <td class="py-3 px-3 text-sm">${new Date(user.createdAt).toLocaleDateString('fr-FR')}</td>
            <td class="py-3 px-3 text-sm text-right whitespace-nowrap">
                <button data-id="${user._id}" class="edit-user-btn text-blue-600 hover:text-blue-800 hover:underline mr-2 text-xs">✏️ Modifier</button>
                <button data-id="${user._id}" class="delete-user-btn text-red-600 hover:text-red-800 hover:underline text-xs">🗑️ Supprimer</button>
            </td>
        </tr>
    `).join('');
}

// Rendu des filtres et barre de recherche pour les utilisateurs
function renderUserFilters(containerId = 'admin-user-filters') {
    const filtersContainer = document.getElementById(containerId);
    if (!filtersContainer) return;

    filtersContainer.innerHTML = `
        <div class="bg-white p-4 rounded-lg shadow-sm border space-y-4">
            <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                <!-- Recherche -->
                <div class="md:col-span-2">
                    <label for="user-search" class="block text-sm font-medium text-gray-700 mb-1">Rechercher</label>
                    <div class="relative">
                        <input 
                            type="text" 
                            id="user-search" 
                            value="${userManagementState.currentFilters.search}"
                            placeholder="Nom, prénom, email..." 
                            class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wud-primary focus:border-wud-primary"
                        >
                        <svg class="absolute left-3 top-2.5 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                </div>
                
                <!-- Filtre par rôle -->
                <div>
                    <label for="role-filter" class="block text-sm font-medium text-gray-700 mb-1">Rôle</label>
                    <select id="role-filter" class="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wud-primary focus:border-wud-primary">
                        <option value="all" ${userManagementState.currentFilters.role === 'all' ? 'selected' : ''}>Tous</option>
                        <option value="user" ${userManagementState.currentFilters.role === 'user' ? 'selected' : ''}>Clients</option>
                        <option value="admin" ${userManagementState.currentFilters.role === 'admin' ? 'selected' : ''}>Administrateurs</option>
                    </select>
                </div>
                
                <!-- Tri -->
                <div>
                    <label for="sort-filter" class="block text-sm font-medium text-gray-700 mb-1">Trier par</label>
                    <select id="sort-filter" class="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wud-primary focus:border-wud-primary">
                        <option value="createdAt-desc" ${userManagementState.currentFilters.sortBy === 'createdAt' && userManagementState.currentFilters.sortOrder === 'desc' ? 'selected' : ''}>Plus récents</option>
                        <option value="createdAt-asc" ${userManagementState.currentFilters.sortBy === 'createdAt' && userManagementState.currentFilters.sortOrder === 'asc' ? 'selected' : ''}>Plus anciens</option>
                        <option value="firstName-asc" ${userManagementState.currentFilters.sortBy === 'firstName' && userManagementState.currentFilters.sortOrder === 'asc' ? 'selected' : ''}>Prénom A-Z</option>
                        <option value="firstName-desc" ${userManagementState.currentFilters.sortBy === 'firstName' && userManagementState.currentFilters.sortOrder === 'desc' ? 'selected' : ''}>Prénom Z-A</option>
                        <option value="email-asc" ${userManagementState.currentFilters.sortBy === 'email' && userManagementState.currentFilters.sortOrder === 'asc' ? 'selected' : ''}>Email A-Z</option>
                    </select>
                </div>
            </div>
            
            <div class="flex justify-between items-center pt-2 border-t">
                <button id="reset-user-filters-btn" class="text-sm text-gray-600 hover:text-gray-800">🔄 Réinitialiser</button>
                <button id="apply-user-filters-btn" class="bg-wud-primary text-white px-4 py-2 rounded-lg text-sm hover:bg-wud-dark transition-colors">🔍 Appliquer</button>
            </div>
        </div>
    `;

    // Event listeners pour les filtres
    attachUserFilterEventListeners();
}

function attachUserFilterEventListeners() {
    const searchInput = document.getElementById('user-search');
    const roleFilter = document.getElementById('role-filter');
    const sortFilter = document.getElementById('sort-filter');
    const resetBtn = document.getElementById('reset-user-filters-btn');
    const applyBtn = document.getElementById('apply-user-filters-btn');

    function applyFilters() {
        if (searchInput) userManagementState.currentFilters.search = searchInput.value;
        if (roleFilter) userManagementState.currentFilters.role = roleFilter.value;
        if (sortFilter) {
            const [sortBy, sortOrder] = sortFilter.value.split('-');
            userManagementState.currentFilters.sortBy = sortBy;
            userManagementState.currentFilters.sortOrder = sortOrder;
        }
        userManagementState.currentFilters.page = 1;
        loadUsersWithFilters();
    }

    function resetFilters() {
        userManagementState.currentFilters = {
            page: 1,
            pageSize: 20,
            search: '',
            role: 'all',
            sortBy: 'createdAt',
            sortOrder: 'desc'
        };
        renderUserFilters();
        loadUsersWithFilters();
    }

    if (applyBtn) applyBtn.addEventListener('click', applyFilters);
    if (resetBtn) resetBtn.addEventListener('click', resetFilters);
    
    // Recherche en temps réel avec debounce
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(applyFilters, 500);
        });
    }
    
    // Application automatique pour les select
    [roleFilter, sortFilter].forEach(element => {
        if (element) element.addEventListener('change', applyFilters);
    });
}

// Charger les utilisateurs avec filtres
async function loadUsersWithFilters() {
    const tableBody = document.getElementById('admin-user-list-table-body');
    if (tableBody) {
        tableBody.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-wud-secondary">🔄 Chargement des utilisateurs...</td></tr>';
    }

    try {
        const response = await userAdminAPI.getAll(userManagementState.currentFilters);
        renderUserTable(response.users);
        renderUserPagination(response);
        attachUserTableActionListeners();
    } catch (error) {
        appError("Error loading users with filters", error);
        if (tableBody) {
            tableBody.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-red-500">❌ Erreur de chargement des utilisateurs.</td></tr>';
        }
    }
}

// Rendu de la pagination pour les utilisateurs
function renderUserPagination(response) {
    const paginationContainer = document.getElementById('user-pagination');
    if (!paginationContainer) return;

    const { page, pages, count } = response;
    
    if (pages <= 1) {
        paginationContainer.innerHTML = '';
        return;
    }

    const startResult = ((page - 1) * userManagementState.currentFilters.pageSize) + 1;
    const endResult = Math.min(page * userManagementState.currentFilters.pageSize, count);

    paginationContainer.innerHTML = `
        <div class="flex items-center justify-between px-4 py-3 bg-white border-t">
            <div class="text-sm text-gray-700">
                Affichage de <span class="font-medium">${startResult}</span> à <span class="font-medium">${endResult}</span> sur <span class="font-medium">${count}</span> utilisateurs
            </div>
            <div class="flex space-x-1">
                <button 
                    ${page === 1 ? 'disabled' : ''} 
                    onclick="changeUserPage(${page - 1})" 
                    class="px-3 py-1 text-sm border rounded ${page === 1 ? 'text-gray-400 cursor-not-allowed' : 'text-gray-700 hover:bg-gray-50'}"
                >
                    Précédent
                </button>
                ${Array.from({ length: pages }, (_, i) => i + 1)
                    .filter(pageNum => pageNum === 1 || pageNum === pages || Math.abs(pageNum - page) <= 2)
                    .map(pageNum => `
                        <button 
                            onclick="changeUserPage(${pageNum})" 
                            class="px-3 py-1 text-sm border rounded ${pageNum === page ? 'bg-wud-primary text-white' : 'text-gray-700 hover:bg-gray-50'}"
                        >
                            ${pageNum}
                        </button>
                    `).join('')}
                <button 
                    ${page === pages ? 'disabled' : ''} 
                    onclick="changeUserPage(${page + 1})" 
                    class="px-3 py-1 text-sm border rounded ${page === pages ? 'text-gray-400 cursor-not-allowed' : 'text-gray-700 hover:bg-gray-50'}"
                >
                    Suivant
                </button>
            </div>
        </div>
    `;
}

// Fonction globale pour changer de page
window.changeUserPage = function(newPage) {
    userManagementState.currentFilters.page = newPage;
    loadUsersWithFilters();
};

// Rendu du formulaire d'utilisateur
async function renderUserForm(user = {}, containerId = 'admin-user-form-container', mode = 'create') {
    const formContainer = document.getElementById(containerId);
    if (!formContainer) {
        devLog(`Form container with id "${containerId}" not found.`);
        return;
    }

    const isEdit = mode === 'edit';

    formContainer.innerHTML = `
        <div class="bg-white p-6 rounded-lg shadow-lg border">
            <div class="flex justify-between items-center mb-6">
                <h3 class="text-xl font-semibold text-wud-primary">
                    ${isEdit ? `✏️ Modifier: ${user.firstName || ''} ${user.lastName || ''}` : '👤 Ajouter un Nouvel Utilisateur'}
                </h3>
                <button type="button" id="close-user-form" class="text-gray-500 hover:text-gray-700">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                </button>
            </div>
            
            <form id="user-form" data-mode="${mode}" data-user-id="${user._id || ''}" class="space-y-6">
                <!-- Informations personnelles -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label for="user-firstName" class="block text-sm font-medium text-gray-700 mb-2">
                            Prénom <span class="text-red-500">*</span>
                        </label>
                        <input 
                            type="text" 
                            id="user-firstName" 
                            name="firstName" 
                            value="${user.firstName || ''}" 
                            required 
                            class="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-wud-primary focus:border-wud-primary"
                            placeholder="Ex: Jean"
                        >
                    </div>
                    <div>
                        <label for="user-lastName" class="block text-sm font-medium text-gray-700 mb-2">
                            Nom <span class="text-red-500">*</span>
                        </label>
                        <input 
                            type="text" 
                            id="user-lastName" 
                            name="lastName" 
                            value="${user.lastName || ''}" 
                            required 
                            class="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-wud-primary focus:border-wud-primary"
                            placeholder="Ex: Dupont"
                        >
                    </div>
                </div>

                <!-- Contact -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label for="user-email" class="block text-sm font-medium text-gray-700 mb-2">
                            Email <span class="text-red-500">*</span>
                        </label>
                        <input 
                            type="email" 
                            id="user-email" 
                            name="email" 
                            value="${user.email || ''}" 
                            required 
                            class="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-wud-primary focus:border-wud-primary"
                            placeholder="Ex: jean.dupont@email.com"
                        >
                    </div>
                    <div>
                        <label for="user-phoneNumber" class="block text-sm font-medium text-gray-700 mb-2">
                            Téléphone
                        </label>
                        <input 
                            type="tel" 
                            id="user-phoneNumber" 
                            name="phoneNumber" 
                            value="${user.phoneNumber || ''}" 
                            class="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-wud-primary focus:border-wud-primary"
                            placeholder="Ex: 06 12 34 56 78"
                        >
                    </div>
                </div>

                <!-- Rôle et mot de passe -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label for="user-role" class="block text-sm font-medium text-gray-700 mb-2">
                            Rôle <span class="text-red-500">*</span>
                        </label>
                        <select 
                            id="user-role" 
                            name="role" 
                            required 
                            class="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-wud-primary focus:border-wud-primary"
                        >
                            <option value="user" ${user.role === 'user' ? 'selected' : ''}>👤 Client</option>
                            <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>👑 Administrateur</option>
                        </select>
                    </div>
                    ${!isEdit ? `
                    <div>
                        <label for="user-password" class="block text-sm font-medium text-gray-700 mb-2">
                            Mot de passe <span class="text-red-500">*</span>
                        </label>
                        <input 
                            type="password" 
                            id="user-password" 
                            name="password" 
                            required 
                            minlength="6"
                            class="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-wud-primary focus:border-wud-primary"
                            placeholder="Minimum 6 caractères"
                        >
                    </div>
                    ` : ''}
                </div>

                <div id="user-form-message" class="text-sm"></div>

                <!-- Boutons d'action -->
                <div class="flex justify-end space-x-3 pt-6 border-t border-gray-200">
                    <button 
                        type="button" 
                        id="cancel-user-form" 
                        class="px-6 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
                    >
                        Annuler
                    </button>
                    <button 
                        type="submit" 
                        class="px-6 py-2 bg-wud-primary text-white rounded-lg hover:bg-wud-dark transition-colors flex items-center"
                    >
                        ${isEdit ? '💾 Mettre à jour l\'utilisateur' : '➕ Créer l\'utilisateur'}
                    </button>
                </div>
            </form>
        </div>
    `;

    // Attacher les événements du formulaire
    attachUserFormEventListeners();
}

// Event listeners pour le formulaire d'utilisateur
function attachUserFormEventListeners() {
    const form = document.getElementById('user-form');
    const messageDiv = document.getElementById('user-form-message');
    const formContainer = document.getElementById('admin-user-form-container');
    const submitButton = form ? form.querySelector('button[type="submit"]') : null;
    const cancelButton = document.getElementById('cancel-user-form');
    const closeButton = document.getElementById('close-user-form');

    if (!form || !submitButton) {
        devWarn("User form or its submit button not found for attaching listeners.");
        return;
    }

    // Gestion de la soumission du formulaire
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(form);
        const mode = form.dataset.mode;
        const userId = form.dataset.userId;

        const userData = {
            firstName: formData.get('firstName'),
            lastName: formData.get('lastName'),
            email: formData.get('email'),
            phoneNumber: formData.get('phoneNumber'),
            role: formData.get('role')
        };

        // Ajouter le mot de passe seulement lors de la création
        if (mode === 'create') {
            userData.password = formData.get('password');
        }

        setLoadingState(submitButton, true, mode === 'create' ? 'Création...' : 'Sauvegarde...');
        displayMessage(messageDiv, '', 'info');

        try {
            if (mode === 'create') {
                await userAdminAPI.create(userData);
                displayMessage(messageDiv, 'Utilisateur créé avec succès !', 'success');
            } else {
                await userAdminAPI.update(userId, userData);
                displayMessage(messageDiv, 'Utilisateur mis à jour avec succès !', 'success');
            }
            
            // Fermer le formulaire et recharger la liste
            setTimeout(() => {
                if (formContainer) formContainer.innerHTML = '';
                loadUsersWithFilters();
            }, 1000);
            
        } catch (error) {
            appError(`Error ${mode === 'create' ? 'creating' : 'updating'} user`, error);
            displayMessage(messageDiv, error.data?.message || 'Erreur serveur lors de l\'opération.', 'error');
        } finally {
            setLoadingState(submitButton, false);
        }
    });

    // Boutons d'annulation
    [cancelButton, closeButton].forEach(btn => {
        if (btn) {
            btn.addEventListener('click', () => {
                if (formContainer) formContainer.innerHTML = '';
            });
        }
    });
}

// Event listeners pour les actions du tableau
function attachUserTableActionListeners() {
    // Boutons de modification
    document.querySelectorAll('.edit-user-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const userId = e.target.dataset.id;
            try {
                const user = await userAdminAPI.getById(userId);
                await renderUserForm(user, 'admin-user-form-container', 'edit');
            } catch (error) {
                appError("Failed to load user for editing", error);
                displayMessage(document.body, 'Erreur lors du chargement de l\'utilisateur.', 'error');
            }
        });
    });

    // Boutons de suppression
    document.querySelectorAll('.delete-user-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const userId = e.target.dataset.id;
            const userRow = e.target.closest('tr');
            const userName = userRow.querySelector('td .font-medium').textContent;

            if (confirm(`Êtes-vous sûr de vouloir supprimer l'utilisateur "${userName}" ? Cette action est irréversible.`)) {
                try {
                    await userAdminAPI.delete(userId);
                    displayMessage(document.body, 'Utilisateur supprimé avec succès !', 'success');
                    loadUsersWithFilters();
                } catch (error) {
                    appError("Failed to delete user", error);
                    displayMessage(document.body, 'Erreur lors de la suppression de l\'utilisateur.', 'error');
                }
            }
        });
    });
}

// Fonction principale pour charger la gestion des utilisateurs
export async function loadAdminUsers() {
    const userListContainer = document.getElementById('users-management-content');
    if (!userListContainer) {
        devLog("User management content container not found.");
        return;
    }

    userListContainer.innerHTML = `
        <div class="flex justify-between items-center mb-6">
            <div>
                <h2 class="text-2xl font-semibold text-wud-primary">👥 Gestion des Utilisateurs</h2>
                <p class="text-gray-600 mt-1">Gérez les comptes utilisateurs et administrateurs</p>
            </div>
            <button id="add-new-user-btn" class="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-lg text-sm font-medium shadow-lg transition-colors flex items-center">
                <svg class="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Ajouter un Utilisateur
            </button>
        </div>
        
        <!-- Filtres -->
        <div id="admin-user-filters" class="mb-6"></div>
        
        <!-- Formulaire -->
        <div id="admin-user-form-container" class="mb-6"></div>
        
        <!-- Liste des utilisateurs -->
        <div class="bg-white rounded-lg shadow-lg overflow-hidden">
            <div class="p-4 bg-gray-50 border-b">
                <h3 class="text-lg font-medium text-gray-800">Liste des Utilisateurs</h3>
            </div>
            <div class="overflow-x-auto">
                <table class="min-w-full">
                    <thead class="bg-gray-50">
                        <tr>
                            <th class="py-3 px-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Utilisateur</th>
                            <th class="py-3 px-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rôle</th>
                            <th class="py-3 px-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Téléphone</th>
                            <th class="py-3 px-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Adresses</th>
                            <th class="py-3 px-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Inscription</th>
                            <th class="py-3 px-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody id="admin-user-list-table-body">
                        <tr><td colspan="6" class="text-center py-4 text-wud-secondary">🔄 Chargement des utilisateurs...</td></tr>
                    </tbody>
                </table>
            </div>
            <div id="user-pagination"></div>
        </div>
    `;

    // Rendre les filtres
    renderUserFilters();

    // Event listener pour le bouton d'ajout
    const addNewUserBtn = document.getElementById('add-new-user-btn');
    if (addNewUserBtn) {
        addNewUserBtn.addEventListener('click', () => {
            renderUserForm({}, 'admin-user-form-container', 'create');
        });
    }

    // Charger les utilisateurs avec filtres
    await loadUsersWithFilters();
}
