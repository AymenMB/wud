import { productAdminAPI, categoryAdminAPI } from '../api.js';
import { displayMessage, setLoadingState, devLog, appError, devWarn } from '../uiUtils.js';

// État global pour la gestion des produits
let productManagementState = {
    currentFilters: {
        page: 1,
        pageSize: 20,
        search: '',
        category: 'all',
        status: 'all',
        sortBy: 'createdAt',
        sortOrder: 'desc'
    },
    categories: []
};

// Variables pour les timeouts
let searchTimeout;

// Fonction de rendu du tableau des produits
function renderProductTable(products, containerId = 'admin-product-list-table-body') {
    const tableBody = document.getElementById(containerId);
    if (!tableBody) {
        devLog(`Table body with id "${containerId}" not found for rendering product table.`);
        return;
    }
    
    if (!products || products.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="7" class="text-center py-8 text-wud-secondary">📦 Aucun produit trouvé.</td></tr>';
        return;
    }
    
    tableBody.innerHTML = products.map(product => `
        <tr class="border-b hover:bg-gray-50 transition-colors">
            <td class="py-3 px-3">
                <div class="flex items-center">
                    ${product.images && product.images.length > 0 ? 
                        `<img src="${product.images[0].url && product.images[0].url.startsWith('http') ? product.images[0].url : 
                            (product.images[0].url && product.images[0].url.startsWith('/uploads') ? 
                                'http://localhost:3001' + product.images[0].url : 
                                product.images[0].url || product.images[0])}" alt="${product.name}" class="w-10 h-10 rounded object-cover mr-3">` : 
                        '<div class="w-10 h-10 bg-gray-200 rounded mr-3 flex items-center justify-center text-xs text-gray-500">📦</div>'
                    }
                    <div>
                        <div class="font-medium text-sm">${product.name}</div>
                        <div class="text-xs text-gray-500">${product.sku}</div>
                    </div>
                </div>
            </td>
            <td class="py-3 px-3 text-sm">
                ${(product.categories || []).map(cat => 
                    `<span class="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded mr-1 mb-1">${cat.name || cat}</span>`
                ).join('')}
            </td>
            <td class="py-3 px-3 text-sm font-medium">${parseFloat(product.price || 0).toFixed(2)} €</td>
            <td class="py-3 px-3 text-sm">
                <span class="flex items-center">
                    ${product.stock <= 5 ? '⚠️' : '✅'} ${product.stock || 0}
                </span>
            </td>
            <td class="py-3 px-3 text-sm">${product.views || 0}</td>
            <td class="py-3 px-3 text-sm">
                ${product.isPublished ?
                    '<span class="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">✅ Publié</span>' :
                    '<span class="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">📝 Brouillon</span>'
                }
                ${product.isFeatured ? '<span class="block mt-1 px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">⭐ En vedette</span>' : ''}
            </td>
            <td class="py-3 px-3 text-sm text-right whitespace-nowrap">
                <button data-id="${product._id}" class="edit-product-btn text-blue-600 hover:text-blue-800 hover:underline mr-2 text-xs">✏️ Modifier</button>
                <button data-id="${product._id}" class="delete-product-btn text-red-600 hover:text-red-800 hover:underline text-xs">🗑️ Supprimer</button>
            </td>
        </tr>
    `).join('');
}

// Rendu des filtres et barre de recherche
function renderProductFilters(containerId = 'admin-product-filters') {
    const filtersContainer = document.getElementById(containerId);
    if (!filtersContainer) return;

    const categoryOptions = [
        '<option value="all">Toutes les catégories</option>',
        ...productManagementState.categories.map(cat => 
            `<option value="${cat._id}" ${productManagementState.currentFilters.category === cat._id ? 'selected' : ''}>${cat.name}</option>`
        )
    ].join('');

    filtersContainer.innerHTML = `
        <div class="bg-white p-4 rounded-lg shadow-sm border space-y-4">
            <div class="grid grid-cols-1 md:grid-cols-5 gap-4">
                <!-- Recherche -->
                <div class="md:col-span-2">
                    <label for="product-search" class="block text-sm font-medium text-gray-700 mb-1">Rechercher</label>
                    <div class="relative">
                        <input 
                            type="text" 
                            id="product-search" 
                            value="${productManagementState.currentFilters.search}"
                            placeholder="Nom, SKU, description..." 
                            class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wud-primary focus:border-wud-primary"
                        >
                        <svg class="absolute left-3 top-2.5 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                </div>
                
                <!-- Filtre par catégorie -->
                <div>
                    <label for="category-filter" class="block text-sm font-medium text-gray-700 mb-1">Catégorie</label>
                    <select id="category-filter" class="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wud-primary focus:border-wud-primary">
                        ${categoryOptions}
                    </select>
                </div>
                
                <!-- Filtre par statut -->
                <div>
                    <label for="status-filter" class="block text-sm font-medium text-gray-700 mb-1">Statut</label>
                    <select id="status-filter" class="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wud-primary focus:border-wud-primary">
                        <option value="all" ${productManagementState.currentFilters.status === 'all' ? 'selected' : ''}>Tous</option>
                        <option value="published" ${productManagementState.currentFilters.status === 'published' ? 'selected' : ''}>Publiés</option>
                        <option value="draft" ${productManagementState.currentFilters.status === 'draft' ? 'selected' : ''}>Brouillons</option>
                    </select>
                </div>
                
                <!-- Tri -->
                <div>
                    <label for="sort-filter" class="block text-sm font-medium text-gray-700 mb-1">Trier par</label>
                    <select id="sort-filter" class="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wud-primary focus:border-wud-primary">
                        <option value="createdAt-desc" ${productManagementState.currentFilters.sortBy === 'createdAt' && productManagementState.currentFilters.sortOrder === 'desc' ? 'selected' : ''}>Plus récents</option>
                        <option value="createdAt-asc" ${productManagementState.currentFilters.sortBy === 'createdAt' && productManagementState.currentFilters.sortOrder === 'asc' ? 'selected' : ''}>Plus anciens</option>
                        <option value="name-asc" ${productManagementState.currentFilters.sortBy === 'name' && productManagementState.currentFilters.sortOrder === 'asc' ? 'selected' : ''}>Nom A-Z</option>
                        <option value="name-desc" ${productManagementState.currentFilters.sortBy === 'name' && productManagementState.currentFilters.sortOrder === 'desc' ? 'selected' : ''}>Nom Z-A</option>
                        <option value="price-asc" ${productManagementState.currentFilters.sortBy === 'price' && productManagementState.currentFilters.sortOrder === 'asc' ? 'selected' : ''}>Prix croissant</option>
                        <option value="price-desc" ${productManagementState.currentFilters.sortBy === 'price' && productManagementState.currentFilters.sortOrder === 'desc' ? 'selected' : ''}>Prix décroissant</option>
                    </select>
                </div>
            </div>
            
            <div class="flex justify-between items-center pt-2 border-t">
                <button id="reset-filters-btn" class="text-sm text-gray-600 hover:text-gray-800">🔄 Réinitialiser</button>
                <button id="apply-filters-btn" class="bg-wud-primary text-white px-4 py-2 rounded-lg text-sm hover:bg-wud-dark transition-colors">🔍 Appliquer</button>
            </div>
        </div>
    `;

    // Event listeners pour les filtres
    attachFilterEventListeners();
}

function attachFilterEventListeners() {
    const searchInput = document.getElementById('product-search');
    const categoryFilter = document.getElementById('category-filter');
    const statusFilter = document.getElementById('status-filter');
    const sortFilter = document.getElementById('sort-filter');
    const applyBtn = document.getElementById('apply-filters-btn');
    const resetBtn = document.getElementById('reset-filters-btn');

    // Application des filtres
    const applyFilters = () => {
        productManagementState.currentFilters = {
            ...productManagementState.currentFilters,
            page: 1, // Reset à la page 1
            search: searchInput?.value || '',
            category: categoryFilter?.value || 'all',
            status: statusFilter?.value || 'all'
        };
        
        // Gestion du tri
        const sortValue = sortFilter?.value || 'createdAt-desc';
        const [sortBy, sortOrder] = sortValue.split('-');
        productManagementState.currentFilters.sortBy = sortBy;
        productManagementState.currentFilters.sortOrder = sortOrder;
        
        loadProductsWithFilters();
    };

    // Reset des filtres
    const resetFilters = () => {
        productManagementState.currentFilters = {
            page: 1,
            pageSize: 20,
            search: '',
            category: 'all',
            status: 'all',
            sortBy: 'createdAt',
            sortOrder: 'desc'
        };
        
        // Reset des champs
        if (searchInput) searchInput.value = '';
        if (categoryFilter) categoryFilter.value = 'all';
        if (statusFilter) statusFilter.value = 'all';
        if (sortFilter) sortFilter.value = 'createdAt-desc';
        
        loadProductsWithFilters();
    };

    if (applyBtn) applyBtn.addEventListener('click', applyFilters);
    if (resetBtn) resetBtn.addEventListener('click', resetFilters);
    
    // Application automatique lors de la saisie (avec debounce)
    if (searchInput) {
        let searchTimeout;
        searchInput.addEventListener('input', () => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(applyFilters, 500);
        });
    }
    
    // Application automatique pour les select
    [categoryFilter, statusFilter, sortFilter].forEach(element => {
        if (element) element.addEventListener('change', applyFilters);
    });
}

// Charger les produits avec filtres
async function loadProductsWithFilters() {
    const tableBody = document.getElementById('admin-product-list-table-body');
    if (tableBody) {
        tableBody.innerHTML = '<tr><td colspan="7" class="text-center py-4 text-wud-secondary">🔄 Chargement des produits...</td></tr>';
    }

    try {
        const response = await productAdminAPI.getAll(productManagementState.currentFilters);
        renderProductTable(response.products);
        renderPagination(response);
        attachProductTableActionListeners();
    } catch (error) {
        appError("Error loading products with filters", error);
        if (tableBody) {
            tableBody.innerHTML = '<tr><td colspan="7" class="text-center py-4 text-red-500">❌ Erreur de chargement des produits.</td></tr>';
        }
    }
}

// Rendu de la pagination
function renderPagination(response) {
    const paginationContainer = document.getElementById('product-pagination');
    if (!paginationContainer) return;

    const { page, pages, count } = response;
    
    if (pages <= 1) {
        paginationContainer.innerHTML = '';
        return;
    }

    const startResult = ((page - 1) * productManagementState.currentFilters.pageSize) + 1;
    const endResult = Math.min(page * productManagementState.currentFilters.pageSize, count);

    paginationContainer.innerHTML = `
        <div class="flex items-center justify-between px-4 py-3 bg-white border-t">
            <div class="text-sm text-gray-700">
                Affichage de <span class="font-medium">${startResult}</span> à <span class="font-medium">${endResult}</span> sur <span class="font-medium">${count}</span> produits
            </div>
            <div class="flex space-x-1">
                <button 
                    ${page === 1 ? 'disabled' : ''} 
                    onclick="changePage(${page - 1})" 
                    class="px-3 py-1 text-sm border rounded ${page === 1 ? 'text-gray-400 cursor-not-allowed' : 'text-gray-700 hover:bg-gray-50'}"
                >
                    Précédent
                </button>
                ${Array.from({ length: pages }, (_, i) => i + 1)
                    .filter(pageNum => pageNum === 1 || pageNum === pages || Math.abs(pageNum - page) <= 2)
                    .map(pageNum => `
                        <button 
                            onclick="changePage(${pageNum})" 
                            class="px-3 py-1 text-sm border rounded ${pageNum === page ? 'bg-wud-primary text-white' : 'text-gray-700 hover:bg-gray-50'}"
                        >
                            ${pageNum}
                        </button>
                    `).join('')}
                <button 
                    ${page === pages ? 'disabled' : ''} 
                    onclick="changePage(${page + 1})" 
                    class="px-3 py-1 text-sm border rounded ${page === pages ? 'text-gray-400 cursor-not-allowed' : 'text-gray-700 hover:bg-gray-50'}"
                >
                    Suivant
                </button>
            </div>
        </div>
    `;
}

// Fonction globale pour changer de page
window.changePage = function(newPage) {
    productManagementState.currentFilters.page = newPage;
    loadProductsWithFilters();
};

async function renderProductForm(product = {}, containerId = 'admin-product-form-container', mode = 'create') {
    const formContainer = document.getElementById(containerId);
    if (!formContainer) {
        devLog(`Form container with id "${containerId}" not found.`);
        return;
    }

    let categoryOptionsHTML = '<option value="">Sélectionner une catégorie...</option>';
    try {
        const categories = await categoryAdminAPI.getAll();
        categoryOptionsHTML += categories.map(cat =>
            `<option value="${cat._id}" ${product.categories?.some(pCat => (typeof pCat === 'string' ? pCat : pCat._id) === cat._id) ? 'selected' : ''}>
                ${cat.name}
            </option>`
        ).join('');
    } catch(err) {
        appError("Failed to load categories for product form", err);
        categoryOptionsHTML += '<option value="" disabled>Erreur chargement catégories</option>';
    }

    const isEdit = mode === 'edit' && product._id;

    formContainer.innerHTML = `
        <div class="bg-white p-6 rounded-lg shadow-lg border">
            <div class="flex justify-between items-center mb-6">
                <h3 class="text-xl font-semibold text-wud-primary">
                    ${isEdit ? `✏️ Modifier: ${product.name || 'Produit'}` : '📦 Ajouter un Nouveau Produit'}
                </h3>
                <button type="button" id="close-product-form" class="text-gray-500 hover:text-gray-700">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                </button>
            </div>
            
            <form id="product-form" data-mode="${mode}" data-product-id="${product._id || ''}" class="space-y-6">
                <!-- Informations de base -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label for="product-name" class="block text-sm font-medium text-gray-700 mb-2">
                            Nom du Produit <span class="text-red-500">*</span>
                        </label>
                        <input 
                            type="text" 
                            id="product-name" 
                            name="name" 
                            value="${product.name || ''}" 
                            required 
                            class="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-wud-primary focus:border-wud-primary"
                            placeholder="Ex: Table en chêne massif"
                        >
                    </div>
                    <div>
                        <label for="product-sku" class="block text-sm font-medium text-gray-700 mb-2">
                            SKU <span class="text-red-500">*</span>
                        </label>
                        <input 
                            type="text" 
                            id="product-sku" 
                            name="sku" 
                            value="${product.sku || ''}" 
                            required 
                            class="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-wud-primary focus:border-wud-primary"
                            placeholder="Ex: TBL-CHE-001"
                        >
                    </div>
                </div>

                <!-- Description complète -->
                <div>
                    <label for="product-description" class="block text-sm font-medium text-gray-700 mb-2">
                        Description <span class="text-red-500">*</span>
                    </label>
                    <textarea 
                        id="product-description" 
                        name="description" 
                        rows="4" 
                        required 
                        class="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-wud-primary focus:border-wud-primary"
                        placeholder="Description détaillée du produit...">${product.description || ''}</textarea>
                </div>

                <!-- Prix, Stock, Poids -->
                <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                        <label for="product-price" class="block text-sm font-medium text-gray-700 mb-2">
                            Prix (€) <span class="text-red-500">*</span>
                        </label>
                        <input 
                            type="number" 
                            id="product-price" 
                            name="price" 
                            value="${product.price || ''}" 
                            required 
                            step="0.01" 
                            min="0" 
                            class="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-wud-primary focus:border-wud-primary"
                        >
                    </div>
                    <div>
                        <label for="product-stock" class="block text-sm font-medium text-gray-700 mb-2">
                            Stock <span class="text-red-500">*</span>
                        </label>
                        <input 
                            type="number" 
                            id="product-stock" 
                            name="stock" 
                            value="${product.stock || ''}" 
                            required 
                            min="0" 
                            class="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-wud-primary focus:border-wud-primary"
                        >
                    </div>
                    <div>
                        <label for="product-weight" class="block text-sm font-medium text-gray-700 mb-2">
                            Poids (kg)
                        </label>
                        <input 
                            type="number" 
                            id="product-weight" 
                            name="weight" 
                            value="${product.weight || ''}" 
                            step="0.1" 
                            min="0" 
                            class="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-wud-primary focus:border-wud-primary"
                        >
                    </div>
                </div>

                <!-- Catégories -->
                <div>
                    <label for="product-categories" class="block text-sm font-medium text-gray-700 mb-2">
                        Catégories <span class="text-red-500">*</span>
                    </label>
                    <select 
                        id="product-categories" 
                        name="categories" 
                        multiple 
                        required 
                        class="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-wud-primary focus:border-wud-primary"
                        size="4">
                        ${categoryOptionsHTML}
                    </select>
                    <p class="text-sm text-gray-500 mt-1">Maintenez Ctrl/Cmd pour sélectionner plusieurs catégories</p>
                </div>

                <!-- Images -->
                <div>
                    <label for="product-images" class="block text-sm font-medium text-gray-700 mb-2">
                        Images du produit
                    </label>
                    <input 
                        type="file" 
                        id="product-images" 
                        name="images" 
                        multiple 
                        accept="image/*" 
                        class="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-wud-primary focus:border-wud-primary"
                    >
                    <p class="text-sm text-gray-500 mt-1">Sélectionnez une ou plusieurs images (JPG, PNG, WebP, max 5MB chacune)</p>
                    
                    <!-- Zone de prévisualisation des nouvelles images -->
                    <div id="image-preview-container" class="mt-3 hidden">
                        <p class="text-sm font-medium text-gray-700 mb-2">Aperçu des nouvelles images :</p>
                        <div id="image-preview-grid" class="flex gap-2 flex-wrap"></div>
                    </div>
                    
                    ${product.images && product.images.length > 0 ? `
                        <div class="mt-3">
                            <p class="text-sm font-medium text-gray-700 mb-2">Images actuelles :</p>
                            <div class="flex gap-2 flex-wrap">
                                ${product.images.map((img, index) => `
                                    <div class="relative">
                                        <img src="${img.url?.startsWith('http') ? img.url : (img.url?.startsWith('/uploads') ? `http://localhost:3001${img.url}` : (img.url || img))}" alt="Image ${index + 1}" class="w-20 h-20 object-cover rounded border">
                                        <button type="button" 
                                                class="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 text-xs hover:bg-red-600 remove-image-btn" 
                                                data-image-index="${index}">×</button>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}
                </div>

                <!-- Caractéristiques produit -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label for="product-materials" class="block text-sm font-medium text-gray-700 mb-2">
                            Matériaux / Essence de Bois
                        </label>
                        <input 
                            type="text" 
                            id="product-materials" 
                            name="materials" 
                            value="${product.materials || product.woodEssence || ''}" 
                            class="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-wud-primary focus:border-wud-primary"
                            placeholder="Ex: Chêne massif, Noyer, Pin..."
                        >
                    </div>
                    <div>
                        <label for="product-dimensions" class="block text-sm font-medium text-gray-700 mb-2">
                            Dimensions (L×l×H en cm)
                        </label>
                        <input 
                            type="text" 
                            id="product-dimensions" 
                            name="dimensions" 
                            value="${product.dimensions || ''}" 
                            class="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-wud-primary focus:border-wud-primary"
                            placeholder="Ex: 120×80×75"
                        >
                    </div>
                </div>

                <!-- Options et statuts -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div class="space-y-3">
                        <label class="flex items-center">
                            <input 
                                type="checkbox" 
                                id="product-published" 
                                name="isPublished" 
                                ${product.isPublished ? 'checked' : ''} 
                                class="rounded border-gray-300 text-wud-primary focus:ring-wud-primary"
                            >
                            <span class="ml-2 text-sm font-medium text-gray-700">✅ Produit publié (visible sur le site)</span>
                        </label>
                        
                        <label class="flex items-center">
                            <input 
                                type="checkbox" 
                                id="product-featured" 
                                name="isFeatured" 
                                ${product.isFeatured ? 'checked' : ''} 
                                class="rounded border-gray-300 text-wud-primary focus:ring-wud-primary"
                            >
                            <span class="ml-2 text-sm font-medium text-gray-700">⭐ Produit en vedette (page d'accueil)</span>
                        </label>
                    </div>
                    
                    <div>
                        <label for="product-finish" class="block text-sm font-medium text-gray-700 mb-2">
                            Finition
                        </label>
                        <input 
                            type="text" 
                            id="product-finish" 
                            name="finish" 
                            value="${product.finish || ''}" 
                            class="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-wud-primary focus:border-wud-primary"
                            placeholder="Ex: Huile naturelle, Vernis mat..."
                        >
                    </div>
                </div>

                <!-- Boutons d'action -->
                <div class="flex justify-end space-x-3 pt-6 border-t border-gray-200">
                    <button 
                        type="button" 
                        id="cancel-product-form" 
                        class="px-6 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
                    >
                        Annuler
                    </button>
                    <button 
                        type="submit" 
                        class="px-6 py-2 bg-wud-primary text-white rounded-lg hover:bg-wud-dark transition-colors flex items-center"
                    >
                        ${isEdit ? '💾 Mettre à jour le produit' : '➕ Créer le produit'}
                    </button>
                </div>
            </form>
        </div>
    `;

    // Pré-sélectionner les catégories pour l'édition
    if (isEdit && product.categories) {
        setTimeout(() => {
            const categorySelect = document.getElementById('product-categories');
            if (categorySelect) {
                product.categories.forEach(cat => {
                    const catId = cat._id || cat;
                    const option = categorySelect.querySelector(`option[value="${catId}"]`);
                    if (option) option.selected = true;
                });
            }
        }, 100);
    }

    attachProductFormEventListeners();
}

export async function loadAdminProducts() {
    const productListContainer = document.getElementById('products-management-content');
    if (!productListContainer) {
        devLog("Product management content container not found.");
        return;
    }

    // Charger les catégories pour les filtres
    try {
        productManagementState.categories = await categoryAdminAPI.getAll();
    } catch (error) {
        appError("Failed to load categories for filters", error);
        productManagementState.categories = [];
    }

    // Vérifier si le contenu est déjà chargé (pour éviter de recharger à chaque fois)
    if (productListContainer.dataset.loaded === 'true') {
        // Juste recharger les données sans recréer l'interface
        await loadProductsWithFilters();
        return;
    }

    productListContainer.innerHTML = `
        <div class="flex justify-between items-center mb-6">
            <div>
                <h2 class="text-2xl font-semibold text-wud-primary">📦 Gestion des Produits</h2>
                <p class="text-gray-600 mt-1">Gérez votre catalogue de produits</p>
            </div>
            <button id="add-new-product-btn" class="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-lg text-sm font-medium shadow-lg transition-colors flex items-center">
                <svg class="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Ajouter un Produit
            </button>
        </div>
        
        <!-- Filtres -->
        <div id="admin-product-filters" class="mb-6"></div>
        
        <!-- Formulaire -->
        <div id="admin-product-form-container" class="mb-6"></div>
        
        <!-- Liste des produits -->
        <div class="bg-white rounded-lg shadow-lg overflow-hidden">
            <div class="p-4 bg-gray-50 border-b">
                <h3 class="text-lg font-medium text-gray-800">Liste des Produits</h3>
            </div>
            <div class="overflow-x-auto">
                <table class="min-w-full">
                    <thead class="bg-gray-50">
                        <tr>
                            <th class="py-3 px-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Produit</th>
                            <th class="py-3 px-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Catégories</th>
                            <th class="py-3 px-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Prix</th>
                            <th class="py-3 px-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
                            <th class="py-3 px-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vues</th>
                            <th class="py-3 px-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Statut</th>
                            <th class="py-3 px-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody id="admin-product-list-table-body">
                        <tr><td colspan="7" class="text-center py-4 text-wud-secondary">🔄 Chargement des produits...</td></tr>
                    </tbody>
                </table>
            </div>
            <div id="product-pagination"></div>
        </div>
    `;

    // Marquer comme chargé pour éviter de recharger à chaque navigation
    productListContainer.dataset.loaded = 'true';

    // Rendre les filtres
    renderProductFilters();

    // Event listener pour le bouton d'ajout
    const addNewProductBtn = document.getElementById('add-new-product-btn');
    if (addNewProductBtn) {
        addNewProductBtn.addEventListener('click', () => {
            renderProductForm({}, 'admin-product-form-container', 'create');
        });
    }

    // Charger les produits avec filtres
    await loadProductsWithFilters();
}

function attachProductFormEventListeners() {
    const form = document.getElementById('product-form');
    const formContainer = document.getElementById('admin-product-form-container');
    const submitButton = form ? form.querySelector('button[type="submit"]') : null;

    if (!form || !submitButton) {
        devWarn("Product form or its submit button not found for attaching listeners.");
        return;
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const mode = form.dataset.mode;
        const productId = form.dataset.productId;

        const categoriesSelect = form.querySelector('#product-categories');
        const selectedCategories = categoriesSelect ? Array.from(categoriesSelect.selectedOptions).map(opt => opt.value).filter(val => val && val.trim() !== '') : [];

        // Validation des catégories
        if (selectedCategories.length === 0) {
            displayMessage(formContainer, 'Veuillez sélectionner au moins une catégorie.', 'error');
            setLoadingState(submitButton, false);
            return;
        }

        console.log('Selected categories:', selectedCategories);

        // Créer un FormData pour gérer les fichiers
        const formData = new FormData();
        
        // Ajouter tous les champs texte
        formData.append('name', form.querySelector('#product-name').value);
        formData.append('sku', form.querySelector('#product-sku').value);
        formData.append('description', form.querySelector('#product-description').value);
        formData.append('price', form.querySelector('#product-price').value);
        formData.append('stock', form.querySelector('#product-stock').value);
        formData.append('categories', JSON.stringify(selectedCategories));
        formData.append('isPublished', form.querySelector('#product-published').checked);
        formData.append('isFeatured', form.querySelector('#product-featured').checked);
        
        // Ajouter les champs optionnels
        const materials = form.querySelector('#product-materials').value;
        if (materials) formData.append('materials', materials);
        
        const dimensions = form.querySelector('#product-dimensions').value;
        if (dimensions) formData.append('dimensions', dimensions);
        
        const finish = form.querySelector('#product-finish').value;
        if (finish) formData.append('finish', finish);
        
        const weight = form.querySelector('#product-weight').value;
        if (weight) formData.append('weight', weight);

        // Ajouter les fichiers images
        const imageFiles = form.querySelector('#product-images').files;
        console.log('Image files to upload:', imageFiles);
        if (imageFiles && imageFiles.length > 0) {
            console.log(`Adding ${imageFiles.length} image files to FormData`);
            for (let i = 0; i < imageFiles.length; i++) {
                console.log(`Adding file ${i}:`, imageFiles[i].name, imageFiles[i].size, imageFiles[i].type);
                formData.append('images', imageFiles[i]);
            }
        } else {
            console.log('No image files to upload');
        }

        setLoadingState(submitButton, true, mode === 'create' ? 'Création...' : 'Sauvegarde...');

        try {
            console.log('Submitting product form with mode:', mode);
            console.log('FormData contents:');
            for (let [key, value] of formData.entries()) {
                if (value instanceof File) {
                    console.log(`${key}: File(${value.name}, ${value.size} bytes, ${value.type})`);
                } else {
                    console.log(`${key}: ${value}`);
                }
            }
            
            if (mode === 'create') {
                console.log('Creating new product...');
                const result = await productAdminAPI.create(formData);
                console.log('Product created successfully:', result);
                displayMessage(formContainer, 'Produit créé avec succès.', 'success');
            } else {
                console.log('Updating product with ID:', productId);
                const result = await productAdminAPI.update(productId, formData);
                console.log('Product updated successfully:', result);
                displayMessage(formContainer, 'Produit mis à jour avec succès.', 'success');
            }
            if (formContainer) formContainer.innerHTML = '';
            await loadProductsWithFilters();
        } catch (error) {
            console.error(`Error ${mode === 'create' ? 'creating' : 'updating'} product:`, error);
            appError(`Error ${mode === 'create' ? 'creating' : 'updating'} product`, error);
            
            let errorMessage = 'Erreur serveur lors de l\'opération.';
            if (error.data && error.data.message) {
                errorMessage = error.data.message;
            } else if (error.message) {
                errorMessage = error.message;
            }
            
            displayMessage(formContainer, errorMessage, 'error');
        } finally {
            setLoadingState(submitButton, false);
        }
    });

    // Event listener pour la prévisualisation des images
    const imageInput = document.getElementById('product-images');
    const previewContainer = document.getElementById('image-preview-container');
    const previewGrid = document.getElementById('image-preview-grid');
    
    if (imageInput && previewContainer && previewGrid) {
        imageInput.addEventListener('change', function(event) {
            const files = Array.from(event.target.files);
            
            if (files.length === 0) {
                previewContainer.classList.add('hidden');
                return;
            }
            
            // Vérifier la taille des fichiers
            const validFiles = [];
            for (const file of files) {
                if (file.size > 5 * 1024 * 1024) { // 5MB
                    displayMessage(formContainer, `Le fichier ${file.name} est trop volumineux (max 5MB).`, 'error');
                    continue;
                }
                if (!file.type.startsWith('image/')) {
                    displayMessage(formContainer, `Le fichier ${file.name} n'est pas une image.`, 'error');
                    continue;
                }
                validFiles.push(file);
            }
            
            if (validFiles.length === 0) {
                previewContainer.classList.add('hidden');
                imageInput.value = '';
                return;
            }
            
            // Afficher les aperçus
            previewGrid.innerHTML = '';
            validFiles.forEach((file, index) => {
                const reader = new FileReader();
                reader.onload = function(e) {
                    const previewDiv = document.createElement('div');
                    previewDiv.className = 'relative';
                    previewDiv.innerHTML = `
                        <img src="${e.target.result}" alt="Aperçu ${index + 1}" class="w-20 h-20 object-cover rounded border">
                        <div class="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-1 rounded-b">
                            ${file.name.length > 15 ? file.name.substring(0, 12) + '...' : file.name}
                        </div>
                    `;
                    previewGrid.appendChild(previewDiv);
                };
                reader.readAsDataURL(file);
            });
            
            previewContainer.classList.remove('hidden');
        });
    }

    // Event listeners pour les boutons d'annulation et fermeture
    const cancelBtn = document.getElementById('cancel-product-form');
    const closeBtn = document.getElementById('close-product-form');
    
    [cancelBtn, closeBtn].forEach(btn => {
        if (btn && formContainer) {
            btn.addEventListener('click', () => {
                formContainer.innerHTML = '';
            });
        }
    });
}

function attachProductTableActionListeners() {
    const tableBody = document.getElementById('admin-product-list-table-body');
    if (!tableBody) return;

    tableBody.addEventListener('click', async (e) => {
        const editButton = e.target.closest('.edit-product-btn');
        const deleteButton = e.target.closest('.delete-product-btn');

        if (editButton) {
            const productId = editButton.dataset.id;
            devLog(`Editing product ${productId}`);
            try {
                const product = await productAdminAPI.getById(productId);
                if(product) {
                    renderProductForm(product, 'admin-product-form-container', 'edit');
                } else {
                    displayMessage(document.getElementById('admin-product-form-container'), 'Produit non trouvé.', 'error');
                }
            } catch (error) {
                appError("Error fetching product for edit", error);
                displayMessage(document.getElementById('admin-product-form-container'), 'Erreur chargement produit.', 'error');
            }
        }
        
        if (deleteButton) {
            const productId = deleteButton.dataset.id;
            if (confirm('Êtes-vous sûr de vouloir supprimer ce produit ? Cette action est irréversible.')) {
                devLog(`Deleting product ${productId}`);
                try {
                    await productAdminAPI.delete(productId);
                    displayMessage(document.getElementById('admin-product-form-container'), 'Produit supprimé avec succès.', 'success');
                    await loadProductsWithFilters();
                } catch (error) {
                    appError("Error deleting product", error);
                    alert('Erreur lors de la suppression du produit.');
                }
            }
        }
    });
}
