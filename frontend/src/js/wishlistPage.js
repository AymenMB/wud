import { wishlistAPI } from './api.js';
// handleToggleWishlist est plus pour les boutons qui changent d'état visuel.
// Pour une suppression directe depuis la page wishlist, un appel direct à l'API est plus simple.
// import { handleToggleWishlist } from './wishlist.js';
import { updateWishlistCount } from './wishlist.js'; // Pour mettre à jour le badge
import { handleAddToCart } from './cart.js';

function createWishlistProductCard(item) {
    const product = item.product;
    if (!product) return '';

    const price = parseFloat(product.price).toFixed(2);
    const imageUrl = product.images && product.images.length > 0 ? product.images[0].url : 'https://via.placeholder.com/300x300.png/A07C5B/FFFFFF?text=Produit';
    const imageAlt = product.images && product.images.length > 0 ? product.images[0].altText || product.name : product.name;

    return `
        <div class="group bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300 flex flex-col p-4 relative" data-product-id="${product._id}">
            <a href="/src/pages/product-detail.html?id=${product._id}" class="block mb-3">
                <div class="h-48 sm:h-56 bg-gray-200 rounded-md overflow-hidden">
                    <img src="${imageUrl}" alt="${imageAlt}" class="w-full h-full object-cover">
                </div>
            </a>
            <h3 class="text-md font-semibold text-wud-primary mb-1 line-clamp-2">
                <a href="/src/pages/product-detail.html?id=${product._id}" class="hover:text-wud-accent">${product.name}</a>
            </h3>
            <p class="text-lg font-bold text-wud-primary mb-3">${price} €</p>
            <div class="mt-auto space-y-2">
                <button data-product-id="${product._id}" class="add-to-cart-btn-wishlist w-full bg-wud-primary hover:bg-wud-dark text-white text-xs font-medium py-2 px-3 rounded-md transition-colors">
                    Ajouter au Panier
                </button>
                <button data-product-id="${product._id}" aria-label="Retirer de la wishlist" class="remove-from-wishlist-page-btn w-full text-red-500 hover:text-red-700 text-xs font-medium py-2 px-3 border border-red-500 rounded-md hover:bg-red-50 transition-colors">
                    Retirer de la Wishlist
                </button>
            </div>
        </div>
    `;
}

async function loadWishlistItems() {
    const wishlistContainer = document.getElementById('wishlist-items-container');
    if (!wishlistContainer) return;

    wishlistContainer.innerHTML = '<p class="col-span-full text-center py-10">Chargement de votre wishlist...</p>';

    try {
        const wishlistData = await wishlistAPI.get();
        if (wishlistData && wishlistData.items && wishlistData.items.length > 0) {
            const validItems = wishlistData.items.filter(item => item.product);
            if (validItems.length > 0) {
                wishlistContainer.innerHTML = validItems.map(createWishlistProductCard).join('');
            } else {
                 wishlistContainer.innerHTML = '<p class="col-span-full text-center text-wud-secondary py-10">Votre liste de souhaits est vide.</p>';
            }
        } else {
            wishlistContainer.innerHTML = '<p class="col-span-full text-center text-wud-secondary py-10">Votre liste de souhaits est vide.</p>';
        }
    } catch (error) {
        console.error("Error loading wishlist items:", error);
        wishlistContainer.innerHTML = '<p class="col-span-full text-center text-red-500 py-10">Erreur lors du chargement de votre liste de souhaits.</p>';
    }
}

function attachWishlistPageEventListeners() {
    const wishlistContainer = document.getElementById('wishlist-items-container');
    if (wishlistContainer) {
        wishlistContainer.addEventListener('click', async (event) => {
            const removeButton = event.target.closest('.remove-from-wishlist-page-btn');
            const addToCartButton = event.target.closest('.add-to-cart-btn-wishlist');

            if (removeButton) {
                event.preventDefault();
                const productId = removeButton.dataset.productId;
                try {
                    await wishlistAPI.removeItem(productId);
                    await loadWishlistItems(); // Recharger la liste
                    updateWishlistCount(); // Mettre à jour le badge du header
                } catch (err) {
                    console.error("Error removing item from wishlist page:", err);
                    alert("Erreur lors de la suppression de l'article de la wishlist.");
                }
            }

            if (addToCartButton) {
                event.preventDefault();
                const productId = addToCartButton.dataset.productId;
                handleAddToCart(productId, 1, null);
            }
        });
    }
}

export function initWishlistPage() {
    // La page wishlist.html doit avoir <body id="wishlist-page">
    if (document.body.id === 'wishlist-page') {
        console.log('Initializing Wishlist Page...');
        loadWishlistItems();
        attachWishlistPageEventListeners();
    }
}
