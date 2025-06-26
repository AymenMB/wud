import { blogAPI } from '../api.js';
import { devLog } from '../uiUtils.js';

// État global pour la gestion des articles de blog
let blogManagementState = {
    currentFilters: {
        page: 1,
        pageSize: 20,
        status: 'all',
        sortBy: 'createdAt',
        sortOrder: 'desc'
    }
};

// Fonction de rendu du tableau des articles
function renderBlogPostTable(posts, containerId = 'admin-blog-list-table-body') {
    const tableBody = document.getElementById(containerId);
    if (!tableBody) {
        devLog('Blog post table body element not found');
        return;
    }
    
    if (!posts || posts.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="6" class="text-center py-8 text-gray-500">Aucun article trouvé</td></tr>';
        return;
    }

    tableBody.innerHTML = posts.map(post => {
        const statusClass = getBlogPostStatusClass(post.status);
        
        return `
            <tr class="hover:bg-gray-50">
                <td class="px-6 py-4 text-sm font-medium text-gray-900 max-w-xs">
                    <div>
                        <p class="truncate">${post.title}</p>
                        ${post.isFeatured ? '<span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">En vedette</span>' : ''}
                    </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${post.author ? post.author.firstName + ' ' + post.author.lastName : 'Auteur supprimé'}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${post.category || 'Sans catégorie'}
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusClass}">
                        ${getBlogPostStatusText(post.status)}
                    </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${new Date(post.createdAt).toLocaleDateString('fr-FR')}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div class="flex space-x-2">
                        <button onclick="viewBlogPost('${post._id}')" 
                                class="text-blue-600 hover:text-blue-900">
                            Voir
                        </button>
                        <button onclick="editBlogPost('${post._id}')" 
                                class="text-green-600 hover:text-green-900">
                            Modifier
                        </button>
                        <button onclick="deleteBlogPost('${post._id}')" 
                                class="text-red-600 hover:text-red-900">
                            Supprimer
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// Fonctions utilitaires pour le statut des articles
function getBlogPostStatusClass(status) {
    const statusClasses = {
        'draft': 'bg-gray-100 text-gray-800',
        'published': 'bg-green-100 text-green-800',
        'archived': 'bg-yellow-100 text-yellow-800'
    };
    return statusClasses[status] || 'bg-gray-100 text-gray-800';
}

function getBlogPostStatusText(status) {
    const statusTexts = {
        'draft': 'Brouillon',
        'published': 'Publié',
        'archived': 'Archivé'
    };
    return statusTexts[status] || status;
}

// Rendu des filtres
function renderBlogPostFilters(containerId = 'admin-blog-filters') {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = `
        <div class="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6">
            <div class="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div>
                    <label for="blog-status-filter" class="block text-sm font-medium text-gray-700 mb-1">
                        Statut
                    </label>
                    <select id="blog-status-filter" class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-wud-primary">
                        <option value="all">Tous les statuts</option>
                        <option value="draft">Brouillons</option>
                        <option value="published">Publiés</option>
                        <option value="archived">Archivés</option>
                    </select>
                </div>
                
                <div>
                    <label for="blog-sort-filter" class="block text-sm font-medium text-gray-700 mb-1">
                        Trier par
                    </label>
                    <select id="blog-sort-filter" class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-wud-primary">
                        <option value="createdAt">Date de création</option>
                        <option value="publishedAt">Date de publication</option>
                        <option value="title">Titre</option>
                        <option value="views">Vues</option>
                    </select>
                </div>

                <div>
                    <label for="blog-sort-order" class="block text-sm font-medium text-gray-700 mb-1">
                        Ordre
                    </label>
                    <select id="blog-sort-order" class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-wud-primary">
                        <option value="desc">Décroissant</option>
                        <option value="asc">Croissant</option>
                    </select>
                </div>

                <div>
                    <label for="blog-page-size" class="block text-sm font-medium text-gray-700 mb-1">
                        Résultats par page
                    </label>
                    <select id="blog-page-size" class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-wud-primary">
                        <option value="10">10</option>
                        <option value="20" selected>20</option>
                        <option value="50">50</option>
                    </select>
                </div>

                <div class="flex items-end">
                    <button onclick="createNewBlogPost()" 
                            class="w-full px-4 py-2 bg-wud-primary text-white rounded-md hover:bg-wud-secondary">
                        Nouvel article
                    </button>
                </div>
            </div>
        </div>
    `;

    attachBlogPostFilterEventListeners();
}

function attachBlogPostFilterEventListeners() {
    const statusFilter = document.getElementById('blog-status-filter');
    const sortFilter = document.getElementById('blog-sort-filter');
    const sortOrderFilter = document.getElementById('blog-sort-order');
    const pageSizeFilter = document.getElementById('blog-page-size');

    [statusFilter, sortFilter, sortOrderFilter, pageSizeFilter].forEach(filter => {
        if (filter) {
            filter.addEventListener('change', () => {
                blogManagementState.currentFilters.page = 1;
                blogManagementState.currentFilters.status = statusFilter.value;
                blogManagementState.currentFilters.sortBy = sortFilter.value;
                blogManagementState.currentFilters.sortOrder = sortOrderFilter.value;
                blogManagementState.currentFilters.pageSize = parseInt(pageSizeFilter.value);
                loadBlogPostsWithFilters();
            });
        }
    });
}

// Charger les articles avec filtres
async function loadBlogPostsWithFilters() {
    try {
        const params = {};
        if (blogManagementState.currentFilters.status !== 'all') {
            params.status = blogManagementState.currentFilters.status;
        }
        
        params.page = blogManagementState.currentFilters.page;
        params.pageSize = blogManagementState.currentFilters.pageSize;
        params.sortBy = blogManagementState.currentFilters.sortBy;
        params.sortOrder = blogManagementState.currentFilters.sortOrder;

        const response = await blogAPI.getAllAdmin(params);
        
        renderBlogPostTable(response.posts || response.blogPosts || response);
        if (response.page) {
            renderBlogPostPagination(response);
        }
        
    } catch (error) {
        console.error('Erreur lors du chargement des articles:', error);
        const tableBody = document.getElementById('admin-blog-list-table-body');
        if (tableBody) {
            tableBody.innerHTML = '<tr><td colspan="6" class="text-center py-8 text-red-500">Erreur lors du chargement des articles</td></tr>';
        }
    }
}

// Rendu de la pagination
function renderBlogPostPagination(response) {
    const paginationContainer = document.getElementById('admin-blog-pagination');
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
                        onclick="changeBlogPostPage(${page - 1})"
                        class="relative inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 ${page <= 1 ? 'opacity-50 cursor-not-allowed' : ''}">
                    Précédent
                </button>
                <button ${page >= pages ? 'disabled' : ''} 
                        onclick="changeBlogPostPage(${page + 1})"
                        class="relative ml-3 inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 ${page >= pages ? 'opacity-50 cursor-not-allowed' : ''}">
                    Suivant
                </button>
            </div>
            <div class="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                <div>
                    <p class="text-sm text-gray-700">
                        Affichage de <span class="font-medium">${((page - 1) * blogManagementState.currentFilters.pageSize) + 1}</span>
                        à <span class="font-medium">${Math.min(page * blogManagementState.currentFilters.pageSize, count)}</span>
                        sur <span class="font-medium">${count}</span> résultats
                    </p>
                </div>
            </div>
        </div>
    `;

    paginationContainer.innerHTML = paginationHTML;
}

// Fonction globale pour changer de page
window.changeBlogPostPage = function(newPage) {
    blogManagementState.currentFilters.page = newPage;
    loadBlogPostsWithFilters();
};

// Fonctions globales pour les actions
window.viewBlogPost = async function(postId) {
    try {
        const post = await blogAPI.getByIdAdmin(postId);
        showBlogPostDetailModal(post);
    } catch (error) {
        console.error('Erreur lors du chargement de l\'article:', error);
        alert('Erreur lors du chargement de l\'article');
    }
};

window.editBlogPost = function(postId) {
    showBlogPostFormModal(postId);
};

window.createNewBlogPost = function() {
    showBlogPostFormModal();
};

window.deleteBlogPost = async function(postId) {
    if (confirm('Êtes-vous sûr de vouloir supprimer cet article de blog ?')) {
        try {
            await blogAPI.deleteAdmin(postId);
            loadBlogPostsWithFilters();
        } catch (error) {
            console.error('Erreur lors de la suppression:', error);
            alert('Erreur lors de la suppression de l\'article');
        }
    }
};

// Modal pour afficher les détails d'un article
function showBlogPostDetailModal(post) {
    const modalHTML = `
        <div id="blog-post-detail-modal" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div class="relative top-10 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-2/3 shadow-lg rounded-md bg-white">
                <div class="mt-3">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="text-lg font-bold text-gray-900">
                            ${post.title}
                        </h3>
                        <button onclick="closeBlogPostDetailModal()" class="text-gray-400 hover:text-gray-600">
                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                            </svg>
                        </button>
                    </div>
                    
                    <div class="space-y-4">
                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <h4 class="font-semibold text-gray-700">Informations</h4>
                                <p><strong>Auteur:</strong> ${post.author ? post.author.firstName + ' ' + post.author.lastName : 'Auteur supprimé'}</p>
                                <p><strong>Statut:</strong> 
                                    <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getBlogPostStatusClass(post.status)}">
                                        ${getBlogPostStatusText(post.status)}
                                    </span>
                                </p>
                                <p><strong>Catégorie:</strong> ${post.category || 'Sans catégorie'}</p>
                                <p><strong>Vues:</strong> ${post.views || 0}</p>
                            </div>
                            <div>
                                <h4 class="font-semibold text-gray-700">Dates</h4>
                                <p><strong>Créé le:</strong> ${new Date(post.createdAt).toLocaleDateString('fr-FR')}</p>
                                <p><strong>Mis à jour le:</strong> ${new Date(post.updatedAt).toLocaleDateString('fr-FR')}</p>
                                ${post.publishedAt ? `<p><strong>Publié le:</strong> ${new Date(post.publishedAt).toLocaleDateString('fr-FR')}</p>` : ''}
                            </div>
                        </div>
                        
                        ${post.excerpt ? `
                            <div>
                                <h4 class="font-semibold text-gray-700">Résumé</h4>
                                <p class="text-gray-600">${post.excerpt}</p>
                            </div>
                        ` : ''}
                        
                        ${post.tags && post.tags.length > 0 ? `
                            <div>
                                <h4 class="font-semibold text-gray-700">Tags</h4>
                                <div class="flex flex-wrap gap-1">
                                    ${post.tags.map(tag => `
                                        <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                                            ${tag}
                                        </span>
                                    `).join('')}
                                </div>
                            </div>
                        ` : ''}
                        
                        <div>
                            <h4 class="font-semibold text-gray-700">Contenu</h4>
                            <div class="bg-gray-50 p-4 rounded-md max-h-96 overflow-y-auto">
                                <div class="prose max-w-none">${post.content}</div>
                            </div>
                        </div>
                        
                        <div class="flex justify-between items-center pt-4 border-t">
                            <div class="space-x-2">
                                <button onclick="editBlogPost('${post._id}')" 
                                        class="px-4 py-2 bg-wud-primary text-white rounded-md hover:bg-wud-secondary">
                                    Modifier
                                </button>
                                ${post.status === 'published' ? `
                                    <a href="/src/pages/blog-post.html?slug=${post.slug}" target="_blank"
                                       class="inline-block px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600">
                                        Voir en ligne
                                    </a>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

window.closeBlogPostDetailModal = function() {
    const modal = document.getElementById('blog-post-detail-modal');
    if (modal) {
        modal.remove();
    }
};

// Modal pour créer/modifier un article
function showBlogPostFormModal(postId = null) {
    const isEdit = postId !== null;
    
    const modalHTML = `
        <div id="blog-post-form-modal" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div class="relative top-10 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-2/3 shadow-lg rounded-md bg-white">
                <div class="mt-3">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="text-lg font-bold text-gray-900">
                            ${isEdit ? 'Modifier l\'article' : 'Créer un nouvel article'}
                        </h3>
                        <button onclick="closeBlogPostFormModal()" class="text-gray-400 hover:text-gray-600">
                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                            </svg>
                        </button>
                    </div>
                    
                    <form id="blog-post-form" class="space-y-4">
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label for="blog-title" class="block text-sm font-medium text-gray-700 mb-1">
                                    Titre *
                                </label>
                                <input type="text" id="blog-title" required
                                       class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-wud-primary">
                            </div>
                            
                            <div>
                                <label for="blog-category" class="block text-sm font-medium text-gray-700 mb-1">
                                    Catégorie
                                </label>
                                <input type="text" id="blog-category"
                                       class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-wud-primary"
                                       placeholder="ex: Artisanat, Conseils, etc.">
                            </div>
                        </div>
                        
                        <div>
                            <label for="blog-excerpt" class="block text-sm font-medium text-gray-700 mb-1">
                                Résumé
                            </label>
                            <textarea id="blog-excerpt" rows="2"
                                    class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-wud-primary"
                                    placeholder="Court résumé de l'article"></textarea>
                        </div>
                        
                        <div>
                            <label for="blog-tags" class="block text-sm font-medium text-gray-700 mb-1">
                                Tags (séparés par des virgules)
                            </label>
                            <input type="text" id="blog-tags"
                                   class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-wud-primary"
                                   placeholder="bois, artisanat, conseils">
                        </div>
                        
                        <div>
                            <label for="blog-content" class="block text-sm font-medium text-gray-700 mb-1">
                                Contenu *
                            </label>
                            <textarea id="blog-content" rows="10" required
                                    class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-wud-primary"
                                    placeholder="Contenu de l'article (HTML accepté)"></textarea>
                        </div>
                        
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label for="blog-status" class="block text-sm font-medium text-gray-700 mb-1">
                                    Statut
                                </label>
                                <select id="blog-status" class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-wud-primary">
                                    <option value="draft">Brouillon</option>
                                    <option value="published">Publié</option>
                                    <option value="archived">Archivé</option>
                                </select>
                            </div>
                            
                            <div>
                                <label class="flex items-center">
                                    <input type="checkbox" id="blog-featured" class="rounded border-gray-300 text-wud-primary focus:ring-wud-primary">
                                    <span class="ml-2 text-sm text-gray-700">Article en vedette</span>
                                </label>
                            </div>
                        </div>
                        
                        <div class="flex justify-end space-x-2 pt-4 border-t">
                            <button type="button" onclick="closeBlogPostFormModal()" 
                                    class="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50">
                                Annuler
                            </button>
                            <button type="submit" 
                                    class="px-4 py-2 bg-wud-primary text-white rounded-md hover:bg-wud-secondary">
                                ${isEdit ? 'Mettre à jour' : 'Créer'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Charger les données si c'est une modification
    if (isEdit) {
        loadBlogPostDataForEdit(postId);
    }

    // Attacher l'événement de soumission
    document.getElementById('blog-post-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = {
            title: document.getElementById('blog-title').value,
            category: document.getElementById('blog-category').value,
            excerpt: document.getElementById('blog-excerpt').value,
            content: document.getElementById('blog-content').value,
            status: document.getElementById('blog-status').value,
            isFeatured: document.getElementById('blog-featured').checked,
            tags: document.getElementById('blog-tags').value.split(',').map(tag => tag.trim()).filter(tag => tag)
        };
        
        try {
            if (isEdit) {
                await blogAPI.updateAdmin(postId, formData);
            } else {
                await blogAPI.createAdmin(formData);
            }
            
            closeBlogPostFormModal();
            loadBlogPostsWithFilters();
            
        } catch (error) {
            console.error('Erreur lors de la sauvegarde:', error);
            alert('Erreur lors de la sauvegarde de l\'article');
        }
    });
}

// Charger les données d'un article pour modification
async function loadBlogPostDataForEdit(postId) {
    try {
        const post = await blogAPI.getByIdAdmin(postId);
        
        document.getElementById('blog-title').value = post.title || '';
        document.getElementById('blog-category').value = post.category || '';
        document.getElementById('blog-excerpt').value = post.excerpt || '';
        document.getElementById('blog-content').value = post.content || '';
        document.getElementById('blog-status').value = post.status || 'draft';
        document.getElementById('blog-featured').checked = post.isFeatured || false;
        document.getElementById('blog-tags').value = post.tags ? post.tags.join(', ') : '';
        
    } catch (error) {
        console.error('Erreur lors du chargement des données:', error);
        alert('Erreur lors du chargement des données de l\'article');
    }
}

window.closeBlogPostFormModal = function() {
    const modal = document.getElementById('blog-post-form-modal');
    if (modal) {
        modal.remove();
    }
};

// Fonction principale pour charger la gestion des articles de blog
export async function loadAdminBlogPosts() {
    const container = document.getElementById('admin-main-content');
    if (!container) return;

    container.innerHTML = `
        <div class="space-y-6">
            <div class="flex justify-between items-center">
                <h2 class="text-2xl font-bold text-gray-900">Gestion des Articles de Blog</h2>
            </div>
            
            <div id="admin-blog-filters"></div>
            
            <div class="bg-white shadow-sm rounded-lg overflow-hidden">
                <table class="min-w-full divide-y divide-gray-200">
                    <thead class="bg-gray-50">
                        <tr>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Titre
                            </th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Auteur
                            </th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Catégorie
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
                    <tbody id="admin-blog-list-table-body" class="bg-white divide-y divide-gray-200">
                        <tr>
                            <td colspan="6" class="text-center py-8 text-gray-500">Chargement des articles...</td>
                        </tr>
                    </tbody>
                </table>
            </div>
            
            <div id="admin-blog-pagination"></div>
        </div>
    `;

    // Charger les filtres et les articles
    renderBlogPostFilters();
    await loadBlogPostsWithFilters();
}
