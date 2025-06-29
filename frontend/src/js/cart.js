import { cartAPI } from './api.js';
import { getToken } from './auth.js';

export function initializeCart() {
    console.log('Cart initialized');
    updateCartDisplay();
}

async function fetchCartData() {
    const token = getToken();
    if (!token) return null;
    try {
        return await cartAPI.get();
    } catch (error) {
        console.warn('Could not fetch cart:', error.message);
        if (error.status === 401) { // Token invalide/expiré
            // Idéalement, auth.js devrait gérer la déconnexion globale
            // import { logout } from './auth.js'; logout();
        }
        return null;
    }
}

export async function updateCartDisplay() {
    const cartData = await fetchCartData();
    let itemCount = 0;
    let subtotal = 0;

    const cartItemsContainer = document.getElementById('cart-items-container');
    const cartSubtotalEl = document.getElementById('cart-subtotal');
    const checkoutButton = document.getElementById('checkout-button');


    if (cartData && cartData.items && cartData.items.length > 0) {
        itemCount = cartData.items.reduce((sum, item) => sum + item.quantity, 0);
        subtotal = cartData.totalPrice; // Utilise le total calculé par le backend

        if (cartItemsContainer) {
            cartItemsContainer.innerHTML = cartData.items.map(item => {
                const product = item.product;
                if (!product) return ''; // Au cas où le produit n'est pas peuplé
                const itemPrice = item.currentPricePerUnit || product.price; // Prix avec variante
                return `
                    <div class="flex items-center justify-between py-3 border-b border-gray-200" data-cart-item-id="${product._id}" data-variant="${item.selectedVariant?.optionValue || ''}">
                        <div class="flex items-center">
                            <img src="${product.images?.[0]?.url?.startsWith('http') ? product.images[0].url : (product.images?.[0]?.url?.startsWith('/uploads') ? `http://localhost:3001${product.images[0].url}` : '/src/assets/images/placeholder-product.svg')}" alt="${product.name}" class="w-16 h-16 object-cover rounded-md mr-3">
                            <div>
                                <h4 class="font-semibold text-sm text-wud-primary">${product.name}</h4>
                                ${item.selectedVariant?.optionValue ? `<p class="text-xs text-gray-500">${item.selectedVariant.name}: ${item.selectedVariant.optionValue}</p>` : ''}
                                <p class="text-xs text-gray-500">Quantité: ${item.quantity}</p>
                            </div>
                        </div>
                        <div class="text-right">
                            <p class="text-sm font-semibold text-wud-primary">${(item.quantity * itemPrice).toFixed(2)} €</p>
                            <button class="remove-from-cart-btn text-xs text-red-500 hover:text-red-700" data-product-id="${product._id}" data-variant-name="${item.selectedVariant?.name || ''}" data-variant-value="${item.selectedVariant?.optionValue || ''}">Supprimer</button>
                        </div>
                    </div>
                `;
            }).join('');
        }
        if (checkoutButton) checkoutButton.classList.remove('opacity-50', 'cursor-not-allowed');

    } else {
        if (cartItemsContainer) {
            cartItemsContainer.innerHTML = '<p class="text-gray-500 text-center py-10">Votre panier est vide.</p>';
        }
        if (checkoutButton) checkoutButton.classList.add('opacity-50', 'cursor-not-allowed');
    }

    if (cartSubtotalEl) {
        cartSubtotalEl.textContent = `${subtotal.toFixed(2)} €`;
    }

    // Mettre à jour les badges de compteur
    const badges = [document.getElementById('cart-count-badge'), document.getElementById('mobile-cart-count-badge')];
    badges.forEach(badge => {
        if (badge) {
            badge.textContent = itemCount;
            badge.classList.toggle('hidden', itemCount === 0);
        }
    });

    attachCartItemEventListeners(); // APPELER ICI après que le DOM de la modale est mis à jour
}


export function updateCartOnAuthChange(authDetail) {
    console.log('Cart reacting to auth change:', authDetail);
    updateCartDisplay(); // Recharge et affiche le panier (ou son état vide si déconnecté)
}

// Logique pour ajouter au panier (appelée depuis les pages produits/catalogue)
export async function handleAddToCart(productId, quantity = 1, selectedVariant = null) {
    if (!getToken()) {
        alert("Veuillez vous connecter pour ajouter des articles au panier.");
        window.location.href = '/src/pages/login.html';
        return;
    }
    try {
        await cartAPI.addItem({ productId, quantity, selectedVariant });
        await updateCartDisplay(); // Met à jour l'affichage du panier (modale et badge)
        // Optionnel: Afficher une notification de succès
        alert('Produit ajouté au panier !');
        // Ouvrir la modale du panier ?
        // const cartIcon = document.getElementById('cart-icon');
        // if(cartIcon) cartIcon.click();

    } catch (error) {
        console.error("Error adding to cart:", error);
        alert(error.data?.message || error.message || "Erreur lors de l'ajout au panier.");
    }
}

// Logique pour supprimer du panier (appelée depuis la modale du panier)
async function handleRemoveFromCart(productId, variantName, variantValue) {
    try {
        const selectedVariant = (variantName && variantValue) ? { name: variantName, optionValue: variantValue } : null;
        await cartAPI.removeItem({ productId, selectedVariant });
        await updateCartDisplay();
    } catch (error) {
        console.error("Error removing from cart:", error);
        alert(error.data?.message || error.message || "Erreur lors de la suppression de l'article.");
    }
}

// Attacher les écouteurs d'événements pour les boutons de suppression DANS la modale du panier
// Doit être appelé lorsque le contenu du panier est rendu/mis à jour.
export function attachCartItemEventListeners() {
    const cartItemsContainer = document.getElementById('cart-items-container');
    if (cartItemsContainer) {
        cartItemsContainer.addEventListener('click', (event) => {
            if (event.target.classList.contains('remove-from-cart-btn')) {
                const productId = event.target.dataset.productId;
                const variantName = event.target.dataset.variantName || null;
                const variantValue = event.target.dataset.variantValue || null;
                handleRemoveFromCart(productId, variantName, variantValue);
            }
            // Ajouter ici la logique pour changer la quantité si des inputs de quantité sont dans la modale
        });
    }
}

