import { devLog, devWarn, appError, debounce } from './uiUtils.js';
import { productAPI, categoryAPI } from './api.js';
import { handleAddToCart } from './cart.js';
import { handleToggleWishlist } from './wishlist.js';

// Variables pour filtres et pagination
let currentFilters = {
    categoryId: null,
    wood: [],
    minPrice: 0,
    maxPrice: 5000,
    sortBy: 'default',
    search: ''
};
let currentPage = 1;
const PAGE_SIZE = 12;

// Initialiser la page catalogue
export async function initCatalogPage() {
    if (document.getElementById('catalog-products-grid')) {
        devLog('Initializing catalog page...');
        
        try {
            // URL parameters
            const urlParams = new URLSearchParams(window.location.search);
            currentFilters.categoryId = urlParams.get('category') || null;
            currentFilters.search = urlParams.get('search') || '';
            currentFilters.sortBy = urlParams.get('sort') || 'default';
            
            // Charger les catégories et les produits
            await Promise.all([
                loadFilterCategories(),
                loadProducts()
            ]);
            
            // Initialiser les événements
            attachCatalogEventListeners();
            
            devLog('Catalog page initialized successfully');
        } catch (error) {
            appError('Failed to initialize catalog page', error);
        }
    }
}

// Charger les produits depuis l'API
async function loadProducts() {
    const productsGrid = document.getElementById('catalog-products-grid');
    const productCountDisplay = document.getElementById('product-count-display');
    
    if (!productsGrid) {
        devWarn("Catalog page: Products grid element not found.");
        return;
    }

    productsGrid.innerHTML = '<p class="col-span-full text-center py-10">Chargement des produits...</p>';
    if (productCountDisplay) productCountDisplay.textContent = '...';

    try {
        const params = buildAPIParams();
        const response = await productAPI.getAll(params);
        
        const products = response.products || response;
        const totalProducts = response.total || response.count || products.length;
        const totalPages = response.pages || response.totalPages || 1;
        const currentPageNum = response.currentPage || currentPage;
        
        renderProducts(products);
        updateProductCount(totalProducts);
        renderPagination(totalPages, currentPageNum);
        
        devLog(`Loaded ${products.length} products`);
    } catch (error) {
        appError('Failed to load products', error);
        renderProducts([]); // Afficher une grille vide en cas d'erreur
    }
}

async function loadFilterCategories() {
    const filterCategoriesList = document.getElementById('filter-categories');
    if (!filterCategoriesList) return;
    
    try {
        const categories = await categoryAPI.getAll();
        renderCategoryFilters(categories);
        devLog(`Loaded ${categories.length} categories`);
    } catch (error) {
        appError('Failed to load categories', error);
        filterCategoriesList.innerHTML = '<li><a href="#" class="text-wud-secondary hover:text-wud-accent transition-colors category-filter active" data-category-id="" data-category="all">📂 Toutes les catégories</a></li><li>Erreur chargement catégories.</li>';
    }
}

// Rendu des produits
function renderProducts(products) {
    const productsGrid = document.getElementById('catalog-products-grid');
    if (!productsGrid) return;
    
    if (products && products.length > 0) {
        productsGrid.innerHTML = products.map(createProductCard).join('');
    } else {
        productsGrid.innerHTML = '<p class="col-span-full text-center text-wud-secondary py-10">Aucun produit ne correspond à votre sélection.</p>';
    }
}

// Mettre à jour le compteur de produits
function updateProductCount(totalProducts = 0) {
    const productCountDisplay = document.getElementById('product-count-display');
    if (productCountDisplay) {
        productCountDisplay.textContent = `${totalProducts}`;
    }
}

// Construire les paramètres pour l'API
function buildAPIParams() {
    const params = {};
    
    if (currentFilters.categoryId) {
        params.category = currentFilters.categoryId;
    }
    
    if (currentFilters.wood && currentFilters.wood.length > 0) {
        params.materials = currentFilters.wood.join(',');
    }
    
    if (currentFilters.minPrice > 0) {
        params.priceMin = currentFilters.minPrice;
    }
    
    if (currentFilters.maxPrice < 5000) {
        params.priceMax = currentFilters.maxPrice;
    }
    
    if (currentFilters.search) {
        params.search = currentFilters.search;
    }
    
    if (currentFilters.sortBy !== 'default') {
        params.sortBy = currentFilters.sortBy;
    }
    
    params.page = currentPage;
    params.limit = PAGE_SIZE;
    
    return params;
}

// Rendu des filtres de catégorie
function renderCategoryFilters(categories) {
    const categoryList = document.getElementById('filter-categories');
    if (!categoryList) return;
    
    // Ajouter les catégories dynamiques
    const categoryItems = categories.map(category => `
        <li>
            <a href="#" class="text-wud-secondary hover:text-wud-accent transition-colors category-filter" 
               data-category-id="${category._id}">
                ${getCategoryIcon(category.name)} ${category.name}
                ${category.productCount ? `<span class="text-xs text-gray-500 ml-1">(${category.productCount})</span>` : ''}
            </a>
        </li>
    `).join('');
    
    categoryList.innerHTML = `
        <li>
            <a href="#" class="text-wud-secondary hover:text-wud-accent transition-colors category-filter active" 
               data-category-id="">
                📂 Toutes les catégories
            </a>
        </li>
        ${categoryItems}
    `;
}

// Obtenir une icône pour la catégorie
function getCategoryIcon(categoryName) {
    const icons = {
        'Cuisine': '🪵',
        'Salle à Manger': '🪵', 
        'Cuisine & Salle à Manger': '🪵',
        'Chambre': '🪵',
        'Meubles de Chambre': '🪵',
        'Salon': '🪵',
        'Meubles de Salon': '🪵',
        'Tables': '🪑',
        'Chaises': '🪑',
        'Assises': '🛋️',
        'Bureaux': '🖥️',
        'Rangements': '📚',
        'Étagères': '📚',
        'Commodes': '🗄️',
        'Armoires': '🚪',
        'Lits': '🛏️',
        'Canapés': '🛋️'
    };
    
    // Recherche exacte d'abord
    if (icons[categoryName]) {
        return icons[categoryName];
    }
    
    // Recherche partielle ensuite
    for (const [key, icon] of Object.entries(icons)) {
        if (categoryName.toLowerCase().includes(key.toLowerCase()) || 
            key.toLowerCase().includes(categoryName.toLowerCase())) {
            return icon;
        }
    }
    
    return '🪵'; // Icône par défaut pour le bois
}

function createProductCard(product) {
    const now = new Date();
    let isOnSale = false;
    let displayPrice = parseFloat(product.price);
    let priceBeforeDiscount = null;
    let promoTextToShow = '';

    if (product.promotion) {
        const startDate = product.promotion.startDate ? new Date(product.promotion.startDate) : null;
        const endDate = product.promotion.endDate ? new Date(product.promotion.endDate) : null;

        if ((!startDate || startDate <= now) && (!endDate || endDate >= now)) {
            isOnSale = true;
            // On attend price_before_discount de l'API si une promotion est active
            if (product.price_before_discount) {
                 priceBeforeDiscount = parseFloat(product.price_before_discount).toFixed(2);
            } else if (product.promotion.discountPercentage) {
                // Fallback si price_before_discount n'est pas là mais qu'on a un pourcentage
                // Cela suppose que product.price EST le prix déjà réduit.
                // priceBeforeDiscount = (displayPrice / (1 - product.promotion.discountPercentage / 100)).toFixed(2);
                // Pour plus de sûreté, on n'affiche le prix barré que si price_before_discount est fourni.
            }
            promoTextToShow = product.promotion.promoText || (product.promotion.discountPercentage ? `${product.promotion.discountPercentage}% OFF` : 'PROMO');
        }
    }
    const currentPriceString = displayPrice.toFixed(2);

    const imageUrl = product.images && product.images.length > 0 ? 
        (product.images[0].url || product.images[0]) : 
        'https://via.placeholder.com/400x300.png/A07C5B/FFFFFF?text=Produit';
    
    // Make sure the image URL is properly formatted
    const fullImageUrl = imageUrl.startsWith('http') ? imageUrl : 
        (imageUrl.startsWith('/uploads') ? `http://localhost:3001${imageUrl}` : imageUrl);
    
    const imageAlt = product.images && product.images.length > 0 ? 
        (product.images[0].altText || product.name) : 
        product.name;

    return `
        <div class="group rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-shadow duration-300 flex flex-col bg-white">
            <a href="/src/pages/product-detail.html?id=${product._id}" class="block">
                <div class="h-64 bg-gray-200 bg-cover bg-center relative">
                    <img src="${fullImageUrl}" alt="${imageAlt}" class="w-full h-full object-cover">
                    ${isOnSale && promoTextToShow ? `<div class="absolute top-2 right-2 bg-red-500 text-white text-xs font-semibold px-2 py-1 rounded">${promoTextToShow}</div>` : ''}
                </div>
            </a>
            <div class="p-4 flex flex-col flex-grow">
                <h3 class="text-md font-semibold text-wud-primary mb-1 line-clamp-2">
                    <a href="/src/pages/product-detail.html?id=${product._id}" class="hover:text-wud-accent">${product.name}</a>
                </h3>
                <p class="text-sm text-wud-secondary mb-2 flex-grow line-clamp-2">${product.description}</p>
                <div class="flex items-baseline justify-start mb-3">
                    <p class="text-lg font-bold text-wud-primary">${currentPriceString} €</p>
                    ${isOnSale && priceBeforeDiscount ? `<p class="text-sm text-gray-400 line-through ml-2">${priceBeforeDiscount} €</p>` : ''}
                </div>
                <div class="flex items-center space-x-2 mt-auto">
                    <button data-product-id="${product._id}" class="add-to-cart-btn flex-1 bg-wud-primary hover:bg-wud-dark text-white text-xs font-medium py-2 px-3 rounded-md transition-colors">Ajouter</button>
                    <button data-product-id="${product._id}" aria-label="Ajouter à la wishlist" class="add-to-wishlist-btn p-2 text-gray-400 hover:text-red-500 border rounded-md hover:border-red-300">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                    </button>
                </div>
            </div>
        </div>
    `;
}

function updateFilterControlsUI() {
    devLog("Updating filter controls UI from state:", currentFilters);
    
    // Update category filters
    const filterCategoriesList = document.getElementById('filter-categories');
    if (filterCategoriesList) {
        filterCategoriesList.querySelectorAll('a').forEach(a => {
            a.classList.remove('active', 'font-bold', 'text-wud-accent');
            if (a.dataset.categoryId === (currentFilters.categoryId || '')) {
                a.classList.add('active', 'font-bold', 'text-wud-accent');
            }
        });
    }

    // Update wood checkboxes
    const woodCheckboxes = document.querySelectorAll('#filter-wood input[type="checkbox"]');
    woodCheckboxes.forEach(cb => {
        cb.checked = currentFilters.wood.includes(cb.value);
    });

    // Update price range slider
    const priceRangeInput = document.getElementById('price-range');
    const priceRangeValueDisplay = document.getElementById('price-range-value');
    if (priceRangeInput && priceRangeValueDisplay) {
        priceRangeInput.value = currentFilters.maxPrice;
        priceRangeValueDisplay.textContent = currentFilters.maxPrice + ' €';
    }

    // Update price preset filters
    const pricePresetFilters = document.querySelectorAll('.price-preset-filter');
    pricePresetFilters.forEach(filter => {
        const [min, max] = filter.value.split('-').map(v => parseInt(v));
        filter.checked = (currentFilters.minPrice === min && currentFilters.maxPrice === max);
    });

    // Update sort by select
    const sortBySelect = document.getElementById('sort-by');
    if (sortBySelect) sortBySelect.value = currentFilters.sortBy;

    // Update search input
    const searchInputHeader = document.getElementById('search-input');
    if (searchInputHeader && currentFilters.search !== searchInputHeader.value) {
        searchInputHeader.value = currentFilters.search;
    }
}

function initFilters() {
    // Initialize filter event listeners and UI
    updateFilterControlsUI();
}

function initEventListeners() {
    // Attach all event listeners
    attachCatalogEventListeners();
}

// Helper function pour update UI filters

function renderPagination(totalPages, activePage) {
    const paginationContainer = document.querySelector('nav[aria-label="Pagination"] ul');
    if (!paginationContainer) return;
    
    if (totalPages <= 1) {
        paginationContainer.innerHTML = '';
        return;
    }
    
    let paginationHTML = '';
    paginationHTML += `<li><a href="#" data-page="${activePage > 1 ? activePage - 1 : 1}" class="pagination-link py-2 px-3 ml-0 leading-tight text-wud-secondary bg-white rounded-l-lg border border-gray-300 hover:bg-wud-light hover:text-wud-primary ${activePage === 1 ? 'opacity-50 cursor-not-allowed' : ''}">Précédent</a></li>`;
    
    for (let i = 1; i <= totalPages; i++) {
        paginationHTML += `<li><a href="#" data-page="${i}" class="pagination-link py-2 px-3 leading-tight border border-gray-300 ${i === activePage ? 'text-wud-primary bg-wud-light hover:bg-wud-dark hover:text-white' : 'text-wud-secondary bg-white hover:bg-wud-light hover:text-wud-primary'}">${i}</a></li>`;
    }
    
    paginationHTML += `<li><a href="#" data-page="${activePage < totalPages ? activePage + 1 : totalPages}" class="pagination-link py-2 px-3 leading-tight text-wud-secondary bg-white rounded-r-lg border border-gray-300 hover:bg-wud-light hover:text-wud-primary ${activePage === totalPages ? 'opacity-50 cursor-not-allowed' : ''}">Suivant</a></li>`;
    
    paginationContainer.innerHTML = paginationHTML;
}

function attachCatalogEventListeners() {
    const filtersAside = document.getElementById('catalog-filters-aside');
    const sortBySelect = document.getElementById('sort-by');
    const paginationContainer = document.querySelector('nav[aria-label="Pagination"] ul');
    const catalogGrid = document.getElementById('catalog-products-grid');
    const searchInputHeader = document.getElementById('search-input');

    // Category filters
    if (filtersAside) {
        const filterCategoriesList = document.getElementById('filter-categories');
        if (filterCategoriesList) {
            filterCategoriesList.addEventListener('click', (e) => {
                e.preventDefault();
                const targetLink = e.target.closest('a.category-filter');
                if (targetLink && typeof targetLink.dataset.categoryId !== 'undefined') {
                    currentFilters.categoryId = targetLink.dataset.categoryId === '' ? null : targetLink.dataset.categoryId;
                    currentPage = 1;
                    updateFilterControlsUI();
                    loadProducts();
                }
            });
        }

        // Wood material filters
        const woodFilters = document.querySelectorAll('#filter-wood input[type="checkbox"]');
        woodFilters.forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                currentFilters.wood = Array.from(woodFilters).filter(cb => cb.checked).map(cb => cb.value);
                currentPage = 1;
                devLog('Wood filters changed:', currentFilters.wood);
                loadProducts();
            });
        });

        // Price range filter
        const priceRangeInput = document.getElementById('price-range');
        const priceRangeValueDisplay = document.getElementById('price-range-value');
        if (priceRangeInput && priceRangeValueDisplay) {
            priceRangeInput.addEventListener('input', (e) => {
                priceRangeValueDisplay.textContent = e.target.value + ' €';
            });
            priceRangeInput.addEventListener('change', (e) => {
                currentFilters.maxPrice = parseInt(e.target.value);
                currentPage = 1;
                devLog('Price range changed:', currentFilters.maxPrice);
                
                // Désélectionner les filtres de prix prédéfinis
                const presetFilters = document.querySelectorAll('.price-preset-filter');
                presetFilters.forEach(filter => filter.checked = false);
                
                loadProducts();
            });
        }

        // Price preset filters
        const pricePresetFilters = document.querySelectorAll('.price-preset-filter');
        pricePresetFilters.forEach(filter => {
            filter.addEventListener('change', (e) => {
                if (e.target.checked) {
                    const value = e.target.value;
                    const [min, max] = value.split('-').map(v => parseInt(v));
                    
                    currentFilters.minPrice = min;
                    currentFilters.maxPrice = max;
                    currentPage = 1;
                    
                    // Mettre à jour le slider de prix
                    if (priceRangeInput) {
                        priceRangeInput.value = max;
                    }
                    if (priceRangeValueDisplay) {
                        priceRangeValueDisplay.textContent = max + ' €';
                    }
                    
                    devLog('Price preset changed:', { min, max });
                    loadProducts();
                }
            });
        });

        // Apply filters button
        const applyFiltersBtn = document.getElementById('apply-filters-btn');
        if (applyFiltersBtn) {
            applyFiltersBtn.addEventListener('click', () => {
                currentPage = 1;
                devLog('Apply filters clicked');
                loadProducts();
            });
        }

        // Reset filters button
        const resetFiltersBtn = document.getElementById('reset-filters-btn');
        if (resetFiltersBtn) {
            resetFiltersBtn.addEventListener('click', () => {
                // Reset all filters to default
                currentFilters = {
                    categoryId: null,
                    wood: [],
                    minPrice: 0,
                    maxPrice: 5000,
                    sortBy: 'default',
                    search: ''
                };
                currentPage = 1;
                
                // Reset UI elements
                updateFilterControlsUI();
                
                // Reset price range slider
                if (priceRangeInput) {
                    priceRangeInput.value = 5000;
                }
                if (priceRangeValueDisplay) {
                    priceRangeValueDisplay.textContent = '5000€';
                }
                
                // Reset price preset filters
                const presetFilters = document.querySelectorAll('.price-preset-filter');
                presetFilters.forEach(filter => filter.checked = false);
                
                // Reset search input
                if (searchInputHeader) {
                    searchInputHeader.value = '';
                }
                
                devLog('Filters reset');
                loadProducts();
            });
        }
    }

    // Sort by select
    if (sortBySelect) {
        sortBySelect.addEventListener('change', (e) => {
            currentFilters.sortBy = e.target.value;
            currentPage = 1;
            devLog('Sort changed:', currentFilters.sortBy);
            loadProducts();
        });
    }

    // Pagination
    if (paginationContainer) {
        paginationContainer.addEventListener('click', (e) => {
            e.preventDefault();
            const targetLink = e.target.closest('a.pagination-link');
            if (targetLink && targetLink.dataset.page) {
                const page = parseInt(targetLink.dataset.page);
                if (page !== currentPage && !targetLink.classList.contains('opacity-50')) {
                    currentPage = page;
                    loadProducts();
                }
            }
        });
    }

    // Product grid interactions (Add to cart, Add to wishlist)
    if (catalogGrid) {
        catalogGrid.addEventListener('click', function(event) {
            const addToCartButton = event.target.closest('.add-to-cart-btn');
            const addToWishlistButton = event.target.closest('.add-to-wishlist-btn');
            
            if (addToCartButton) {
                event.preventDefault();
                handleAddToCart(addToCartButton.dataset.productId, 1, null);
            }
            
            if (addToWishlistButton) {
                event.preventDefault();
                handleToggleWishlist(addToWishlistButton.dataset.productId, addToWishlistButton);
            }
        });
    }

    // Search functionality
    if (searchInputHeader) {
        const performSearchFromHeader = debounce(() => {
            const searchTerm = searchInputHeader.value.trim();
            if (document.body.id === 'catalog-page') {
                currentFilters.search = searchTerm;
                currentPage = 1;
                devLog('Search changed:', searchTerm);
                loadProducts();
            } else {
                window.location.href = `/src/pages/catalog.html?search=${encodeURIComponent(searchTerm)}`;
            }
        }, 500);
        
        searchInputHeader.addEventListener('keyup', performSearchFromHeader);
        
        searchInputHeader.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const searchTerm = searchInputHeader.value.trim();
                if (document.body.id === 'catalog-page') {
                    currentFilters.search = searchTerm;
                    currentPage = 1;
                    loadProducts();
                } else {
                    window.location.href = `/src/pages/catalog.html?search=${encodeURIComponent(searchTerm)}`;
                }
            }
        });
        
        const searchModalForm = document.querySelector('#search-modal form');
        if (searchModalForm) {
            searchModalForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const searchTerm = searchInputHeader.value.trim();
                if (document.body.id === 'catalog-page') {
                    currentFilters.search = searchTerm;
                    currentPage = 1;
                    loadProducts();
                } else {
                    window.location.href = `/src/pages/catalog.html?search=${encodeURIComponent(searchTerm)}`;
                }
            });
        }
    }
}

