import { productAPI, categoryAPI, blogAPI } from './api.js';
import { handleAddToCart } from './cart.js';
import { handleToggleWishlist } from './wishlist.js';
import { appError, devLog } from './uiUtils.js';

const MAX_FEATURED_PRODUCTS = 4;
const MAX_FEATURED_CATEGORIES = 4;
const MAX_LATEST_POSTS = 3;

function createProductCard(product) {
    const now = new Date();
    let isOnSale = false;
    let displayPrice = parseFloat(product.price); // Le prix affiché, potentiellement réduit
    let priceBeforeDiscount = null; // Le prix original avant la promotion
    let promoTextToShow = '';

    if (product.promotion) {
        const startDate = product.promotion.startDate ? new Date(product.promotion.startDate) : null;
        const endDate = product.promotion.endDate ? new Date(product.promotion.endDate) : null;

        if ((!startDate || startDate <= now) && (!endDate || endDate >= now)) {
            isOnSale = true;
            // On suppose que product.price est le prix AVEC promotion si une promotion est active.
            // L'API doit fournir product.price_before_discount
            if (product.price_before_discount) {
                 priceBeforeDiscount = parseFloat(product.price_before_discount).toFixed(2);
            }
            promoTextToShow = product.promotion.promoText || (product.promotion.discountPercentage ? `${product.promotion.discountPercentage}% OFF` : 'PROMO');
        }
    }
    const currentPriceString = displayPrice.toFixed(2);

    const imageUrl = product.images && product.images.length > 0 ? 
        (product.images[0].url || product.images[0]) : 
        '/src/assets/images/product-placeholder.svg';
    
    // Make sure the image URL is properly formatted
    const fullImageUrl = imageUrl.startsWith('http') ? imageUrl : 
        (imageUrl.startsWith('/uploads') ? `http://localhost:3001${imageUrl}` : imageUrl);
    
    const imageAlt = product.images && product.images.length > 0 ? 
        (product.images[0].altText || product.name) : 
        product.name;

    return `
        <div class="group rounded-lg overflow-hidden shadow-lg hover:shadow-2xl transition-shadow duration-300 flex flex-col bg-white">
            <a href="/src/pages/product-detail.html?id=${product._id}" class="block">
                <div class="h-72 bg-gray-200 bg-cover bg-center relative">
                    <img src="${fullImageUrl}" alt="${imageAlt}" class="w-full h-full object-cover">
                    ${isOnSale && promoTextToShow ? `<div class="absolute top-2 right-2 bg-red-500 text-white text-xs font-semibold px-2 py-1 rounded">${promoTextToShow}</div>` : ''}
                </div>
            </a>
            <div class="p-5 flex flex-col flex-grow">
                <h3 class="text-lg font-semibold text-wud-primary mb-1">
                    <a href="/src/pages/product-detail.html?id=${product._id}" class="hover:text-wud-accent transition-colors line-clamp-2">${product.name}</a>
                </h3>
                <p class="text-sm text-wud-secondary mb-3 flex-grow line-clamp-2">${product.description}</p>
                <div class="flex items-baseline justify-start mb-3"> {/* Changé justify-between par justify-start */}
                    <p class="text-xl font-bold text-wud-primary">${currentPriceString} €</p>
                    ${isOnSale && priceBeforeDiscount ? `<p class="text-sm text-gray-400 line-through ml-2">${priceBeforeDiscount} €</p>` : ''}
                </div>
                <div class="flex items-center space-x-2 mt-auto">
                    <button data-product-id="${product._id}" class="add-to-cart-btn flex-1 bg-wud-primary hover:bg-wud-dark text-white text-sm font-medium py-2 px-3 rounded-md transition-colors">
                        Ajouter au Panier
                    </button>
                    <button data-product-id="${product._id}" aria-label="Ajouter à la wishlist" class="add-to-wishlist-btn p-2 text-gray-400 hover:text-red-500 border rounded-md hover:border-red-300 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                    </button>
                </div>
            </div>
        </div>
    `;
}

function createCategoryCard(category) {
    const imageUrl = category.image?.url || '/src/assets/images/product-placeholder.svg';
    const imageAlt = category.image?.altText || category.name;
    return `
        <a href="/src/pages/catalog.html?category=${category.slug}" class="group block rounded-lg overflow-hidden shadow-lg hover:shadow-2xl transition-shadow duration-300">
            <div class="h-64 bg-gray-300 bg-cover bg-center relative">
                <img src="${imageUrl}" alt="${imageAlt}" class="w-full h-full object-cover">
                <div class="absolute inset-0 bg-black bg-opacity-20 group-hover:bg-opacity-10 transition-opacity duration-300"></div>
            </div>
            <div class="p-6 bg-white">
                <h3 class="text-xl font-semibold text-wud-primary group-hover:text-wud-accent transition-colors">${category.name}</h3>
                <p class="text-sm text-wud-secondary mt-1 line-clamp-2">${category.description || 'Découvrez nos créations.'}</p>
            </div>
        </a>
    `;
}

function createBlogPostCard(post) {
    const excerpt = post.excerpt || post.content.substring(0, 100) + '...';
    const imageUrl = post.featuredImage?.url || '/src/assets/images/blog-placeholder.svg';
    const imageAlt = post.featuredImage?.altText || post.title;
    const categoryName = post.category || 'Non classé';
    const publishedDate = new Date(post.publishedAt || post.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

    return `
        <a href="/src/pages/blog-post.html?slug=${post.slug}" class="group block rounded-lg overflow-hidden shadow-lg hover:shadow-2xl transition-shadow duration-300 bg-white">
            <div class="h-52 bg-gray-300 bg-cover bg-center">
                <img src="${imageUrl}" alt="${imageAlt}" class="w-full h-full object-cover">
            </div>
            <div class="p-6">
                <p class="text-xs text-wud-secondary mb-1 uppercase">${categoryName} | ${publishedDate}</p>
                <h3 class="text-lg font-semibold text-wud-primary group-hover:text-wud-accent transition-colors mb-2 line-clamp-2">${post.title}</h3>
                <p class="text-sm text-gray-600 leading-relaxed line-clamp-3">${excerpt}</p>
            </div>
        </a>
    `;
}

async function loadFeaturedProducts() {
    const productsGrid = document.getElementById('products-grid');
    if (!productsGrid) return;
    productsGrid.innerHTML = '<p class="col-span-full text-center py-8">Chargement des produits...</p>';
    try {
        const { products } = await productAPI.getAll({ isFeatured: 'true', pageSize: MAX_FEATURED_PRODUCTS, isPublished: 'true' });
        if (products && products.length > 0) {
            productsGrid.innerHTML = products.map(createProductCard).join('');
        } else {
            productsGrid.innerHTML = '<p class="col-span-full text-center text-wud-secondary py-8">Aucun produit phare à afficher pour le moment.</p>';
        }
    } catch (error) {
        console.error("Error loading featured products:", error);
        productsGrid.innerHTML = '<p class="col-span-full text-center text-red-500 py-8">Erreur lors du chargement des produits.</p>';
    }
}

async function loadFeaturedCategories() {
    const categoriesGrid = document.getElementById('categories-grid');
    if (!categoriesGrid) return;
    categoriesGrid.innerHTML = '<p class="col-span-full text-center py-8">Chargement des catégories...</p>';
    try {
        const categories = await categoryAPI.getAll();
        const featuredCategories = categories.filter(c => c.isFeatured).slice(0, MAX_FEATURED_CATEGORIES);

        if (featuredCategories && featuredCategories.length > 0) {
            categoriesGrid.innerHTML = featuredCategories.map(createCategoryCard).join('');
        } else if (categories && categories.length > 0) {
            categoriesGrid.innerHTML = categories.slice(0, MAX_FEATURED_CATEGORIES).map(createCategoryCard).join('');
        } else {
            categoriesGrid.innerHTML = '<p class="col-span-full text-center text-wud-secondary py-8">Aucune catégorie à afficher.</p>';
        }
    } catch (error) {
        console.error("Error loading featured categories:", error);
        categoriesGrid.innerHTML = '<p class="col-span-full text-center text-red-500 py-8">Erreur lors du chargement des catégories.</p>';
    }
}

async function loadLatestBlogPosts() {
    const blogPostsGrid = document.getElementById('blog-posts-grid');
    if (!blogPostsGrid) return;
    blogPostsGrid.innerHTML = '<p class="col-span-full text-center py-8">Chargement des articles...</p>';
    try {
        const response = await blogAPI.getAllPublished({ pageSize: MAX_LATEST_POSTS });
        const posts = response.posts || response; // Handle different response formats
        if (posts && posts.length > 0) {
            blogPostsGrid.innerHTML = posts.map(createBlogPostCard).join('');
        } else {
            blogPostsGrid.innerHTML = '<p class="col-span-full text-center text-wud-secondary py-8">Aucun article de blog récent.</p>';
        }
    } catch (error) {
        console.error("Error loading latest blog posts:", error);
        blogPostsGrid.innerHTML = '<p class="col-span-full text-center text-red-500 py-8">Erreur lors du chargement des articles.</p>';
    }
}

function attachHomePageEventListeners() {
    const pageContent = document.getElementById('app'); // Attacher à un parent stable

    pageContent.addEventListener('click', function(event) {
        const addToCartButton = event.target.closest('.add-to-cart-btn');
        const addToWishlistButton = event.target.closest('.add-to-wishlist-btn');

        if (addToCartButton) {
            event.preventDefault();
            const productId = addToCartButton.dataset.productId;
            handleAddToCart(productId, 1, null);
        }

        if (addToWishlistButton) {
            event.preventDefault();
            const productId = addToWishlistButton.dataset.productId;
            handleToggleWishlist(productId, addToWishlistButton);
        }
    });
}

export function initHomePage() {
    if (document.getElementById('hero-banner')) {
        console.log('Initializing Home Page dynamic content...');
        loadFeaturedProducts();
        loadFeaturedCategories();
        loadLatestBlogPosts();
        attachHomePageEventListeners();
    }
}
