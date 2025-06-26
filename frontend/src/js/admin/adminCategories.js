import { categoryAdminAPI } from '../api.js';
import { displayMessage, setLoadingState, devLog, appError } from '../uiUtils.js';

// Rendu de la table des catégories
function renderCategoryTable(categories, containerId = 'admin-category-list-table-body') {
    const tableBody = document.getElementById(containerId);
    if (!tableBody) {
        devLog(`Table body with id "${containerId}" not found for rendering category table.`);
        return;
    }
    
    if (!categories || categories.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-wud-secondary">Aucune catégorie trouvée.</td></tr>';
        return;
    }
    
    tableBody.innerHTML = categories.map(category => `
        <tr class="border-b hover:bg-gray-50">
            <td class="py-2 px-3">
                <div class="flex items-center">
                    ${category.image ? `<img src="${category.image}" alt="${category.name}" class="w-8 h-8 rounded mr-2 object-cover">` : '<div class="w-8 h-8 bg-gray-200 rounded mr-2 flex items-center justify-center text-xs text-gray-500">📁</div>'}
                    <span class="text-sm font-medium">${category.name}</span>
                </div>
            </td>
            <td class="py-2 px-3 text-sm text-gray-600">${category.description || '-'}</td>
            <td class="py-2 px-3 text-sm">${category.parentCategory ? category.parentCategory.name : 'Catégorie principale'}</td>
            <td class="py-2 px-3 text-sm">
                <span class="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium">${category.productCount || 0} produits</span>
            </td>
            <td class="py-2 px-3 text-sm">
                ${category.isFeatured ? 
                    '<span class="px-2 py-0.5 text-xs font-semibold rounded-full bg-green-100 text-green-800">Mise en avant</span>' :
                    '<span class="px-2 py-0.5 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">Standard</span>'
                }
            </td>
            <td class="py-2 px-3 text-sm text-right whitespace-nowrap">
                <button data-id="${category._id}" class="edit-category-btn text-blue-600 hover:text-blue-800 hover:underline mr-2 text-xs">Modifier</button>
                <button data-id="${category._id}" class="delete-category-btn text-red-600 hover:text-red-800 hover:underline text-xs">Supprimer</button>
            </td>
        </tr>
    `).join('');
}

// Rendu du formulaire de catégorie
async function renderCategoryForm(category = {}, containerId = 'admin-category-form-container', mode = 'create') {
    const formContainer = document.getElementById(containerId);
    if (!formContainer) {
        devLog(`Form container with id "${containerId}" not found.`);
        return;
    }

    // Récupérer les catégories pour la sélection parent
    let categoryOptionsHTML = '<option value="">Aucune (catégorie principale)</option>';
    try {
        const categories = await categoryAdminAPI.getAll();
        categoryOptionsHTML += categories
            .filter(cat => cat._id !== category._id) // Éviter de sélectionner soi-même comme parent
            .map(cat => `
                <option value="${cat._id}" ${category.parentCategory?._id === cat._id ? 'selected' : ''}>
                    ${cat.name}
                </option>
            `).join('');
    } catch(err) {
        appError("Failed to load categories for form", err);
        categoryOptionsHTML += '<option value="" disabled>Erreur chargement catégories</option>';
    }

    formContainer.innerHTML = `
        <div class="bg-white p-6 rounded-lg shadow-lg border">
            <h3 class="text-xl font-semibold mb-6 text-wud-primary">
                ${mode === 'create' ? '📁 Ajouter une Nouvelle Catégorie' : `✏️ Modifier: ${category.name || 'Catégorie'}`}
            </h3>
            <form id="category-form" data-mode="${mode}" data-category-id="${category._id || ''}" class="space-y-6">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label for="category-name" class="block text-sm font-medium text-gray-700 mb-2">
                            Nom de la Catégorie <span class="text-red-500">*</span>
                        </label>
                        <input 
                            type="text" 
                            id="category-name" 
                            name="name" 
                            value="${category.name || ''}" 
                            required 
                            class="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-wud-primary focus:border-wud-primary transition-colors"
                            placeholder="Ex: Mobilier de salon"
                        >
                    </div>
                    <div>
                        <label for="category-parent" class="block text-sm font-medium text-gray-700 mb-2">
                            Catégorie Parente
                        </label>
                        <select 
                            id="category-parent" 
                            name="parentCategory" 
                            class="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-wud-primary focus:border-wud-primary transition-colors"
                        >
                            ${categoryOptionsHTML}
                        </select>
                    </div>
                </div>
                
                <div>
                    <label for="category-description" class="block text-sm font-medium text-gray-700 mb-2">
                        Description
                    </label>
                    <textarea 
                        id="category-description" 
                        name="description" 
                        rows="3" 
                        class="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-wud-primary focus:border-wud-primary transition-colors"
                        placeholder="Description de la catégorie..."
                    >${category.description || ''}</textarea>
                </div>
                
                <div>
                    <label for="category-image" class="block text-sm font-medium text-gray-700 mb-2">
                        URL de l'Image
                    </label>
                    <input 
                        type="url" 
                        id="category-image" 
                        name="image" 
                        value="${category.image || ''}" 
                        class="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-wud-primary focus:border-wud-primary transition-colors"
                        placeholder="https://example.com/image.jpg"
                    >
                </div>
                
                <div class="flex items-center">
                    <input 
                        type="checkbox" 
                        id="category-isFeatured" 
                        name="isFeatured" 
                        ${category.isFeatured ? 'checked' : ''} 
                        class="h-4 w-4 text-wud-accent border-gray-300 rounded focus:ring-wud-primary mr-3"
                    >
                    <label for="category-isFeatured" class="text-sm font-medium text-gray-700">
                        Mettre en avant cette catégorie
                    </label>
                </div>
                
                <div id="category-form-message" class="text-sm"></div>
                
                <div class="flex justify-end space-x-3 pt-4 border-t">
                    <button 
                        type="button" 
                        id="cancel-category-form-btn" 
                        class="px-6 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-wud-primary transition-colors"
                    >
                        Annuler
                    </button>
                    <button 
                        type="submit" 
                        class="px-6 py-2 bg-wud-primary text-white rounded-lg text-sm font-medium hover:bg-wud-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-wud-primary transition-colors"
                    >
                        ${mode === 'create' ? '✨ Créer Catégorie' : '💾 Sauvegarder'}
                    </button>
                </div>
            </form>
        </div>
    `;
    
    attachCategoryFormEventListeners();
}

// Chargement principal de la gestion des catégories
export async function loadAdminCategories() {
    const categoryListContainer = document.getElementById('categories-management-content');
    if (!categoryListContainer) {
        devLog("Category management content container not found.");
        return;
    }

    categoryListContainer.innerHTML = `
        <div class="flex justify-between items-center mb-6">
            <div>
                <h2 class="text-2xl font-semibold text-wud-primary">📁 Gestion des Catégories</h2>
                <p class="text-gray-600 mt-1">Organisez vos produits par catégories</p>
            </div>
            <button id="add-new-category-btn" class="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-lg text-sm font-medium shadow-lg transition-colors flex items-center">
                <svg class="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Ajouter une Catégorie
            </button>
        </div>
        
        <div id="admin-category-form-container" class="mb-6"></div>
        
        <div class="bg-white rounded-lg shadow-lg overflow-hidden">
            <div class="p-4 bg-gray-50 border-b">
                <h3 class="text-lg font-medium text-gray-800">Liste des Catégories</h3>
            </div>
            <div class="overflow-x-auto">
                <table class="min-w-full">
                    <thead class="bg-gray-50">
                        <tr>
                            <th class="py-3 px-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Catégorie</th>
                            <th class="py-3 px-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                            <th class="py-3 px-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Parent</th>
                            <th class="py-3 px-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Produits</th>
                            <th class="py-3 px-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Statut</th>
                            <th class="py-3 px-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody id="admin-category-list-table-body">
                        <tr><td colspan="6" class="text-center py-4 text-wud-secondary">Chargement des catégories...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;

    // Event listener pour le bouton d'ajout
    const addNewCategoryBtn = document.getElementById('add-new-category-btn');
    if (addNewCategoryBtn) {
        addNewCategoryBtn.addEventListener('click', () => {
            renderCategoryForm({}, 'admin-category-form-container', 'create');
        });
    }

    // Charger les catégories
    try {
        const categories = await categoryAdminAPI.getAll();
        renderCategoryTable(categories);
        attachCategoryTableActionListeners();
    } catch (error) {
        appError("Error loading admin categories", error);
        const tableBody = document.getElementById('admin-category-list-table-body');
        if(tableBody) {
            tableBody.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-red-500">❌ Erreur de chargement des catégories.</td></tr>';
        }
    }
}

// Event listeners pour le formulaire de catégorie
function attachCategoryFormEventListeners() {
    const form = document.getElementById('category-form');
    const messageDiv = document.getElementById('category-form-message');
    const formContainer = document.getElementById('admin-category-form-container');
    const submitButton = form ? form.querySelector('button[type="submit"]') : null;

    if (!form || !submitButton) {
        devLog("Category form or its submit button not found for attaching listeners.");
        return;
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(form);
        const mode = form.dataset.mode;
        const categoryId = form.dataset.categoryId;

        const categoryData = {
            name: formData.get('name'),
            description: formData.get('description') || '',
            parentCategory: formData.get('parentCategory') || null,
            image: formData.get('image') || '',
            isFeatured: form.querySelector('#category-isFeatured').checked,
        };

        setLoadingState(submitButton, true, mode === 'create' ? '🔄 Création...' : '🔄 Sauvegarde...');
        displayMessage(messageDiv, '', 'info');

        try {
            if (mode === 'create') {
                await categoryAdminAPI.create(categoryData);
                displayMessage(messageDiv, '✅ Catégorie créée avec succès !', 'success');
            } else {
                await categoryAdminAPI.update(categoryId, categoryData);
                displayMessage(messageDiv, '✅ Catégorie mise à jour avec succès !', 'success');
            }
            
            // Fermer le formulaire et recharger la liste
            setTimeout(() => {
                if (formContainer) formContainer.innerHTML = '';
                loadAdminCategories();
            }, 1500);
            
        } catch (error) {
            appError(`Error ${mode === 'create' ? 'creating' : 'updating'} category`, error);
            displayMessage(messageDiv, error.data?.message || '❌ Erreur lors de l\'opération.', 'error');
        } finally {
            setLoadingState(submitButton, false);
        }
    });

    // Event listener pour le bouton d'annulation
    const cancelBtn = document.getElementById('cancel-category-form-btn');
    if (cancelBtn && formContainer) {
        cancelBtn.addEventListener('click', () => {
            formContainer.innerHTML = '';
        });
    }
}

// Event listeners pour les actions du tableau
function attachCategoryTableActionListeners() {
    const tableBody = document.getElementById('admin-category-list-table-body');
    if (!tableBody) return;

    tableBody.addEventListener('click', async (e) => {
        const editButton = e.target.closest('.edit-category-btn');
        const deleteButton = e.target.closest('.delete-category-btn');

        if (editButton) {
            const categoryId = editButton.dataset.id;
            devLog(`Editing category ${categoryId}`);
            try {
                // Pour la démo, on va récupérer la catégorie depuis la liste affichée
                const categories = await categoryAdminAPI.getAll();
                const category = categories.find(cat => cat._id === categoryId);
                
                if(category) {
                    renderCategoryForm(category, 'admin-category-form-container', 'edit');
                } else {
                    displayMessage(document.getElementById('admin-category-form-container'), '❌ Catégorie non trouvée.', 'error');
                }
            } catch (error) {
                appError("Error fetching category for edit", error);
                displayMessage(document.getElementById('admin-category-form-container'), '❌ Erreur chargement catégorie.', 'error');
            }
        }
        
        if (deleteButton) {
            const categoryId = deleteButton.dataset.id;
            if (confirm('⚠️ Êtes-vous sûr de vouloir supprimer cette catégorie ?\n\nCette action est irréversible et ne sera possible que si aucun produit n\'utilise cette catégorie.')) {
                devLog(`Deleting category ${categoryId}`);
                try {
                    await categoryAdminAPI.delete(categoryId);
                    // Recharger la liste
                    await loadAdminCategories();
                } catch (error) {
                    appError("Error deleting category", error);
                    alert(`❌ Erreur lors de la suppression: ${error.data?.message || error.message}`);
                }
            }
        }
    });
}
