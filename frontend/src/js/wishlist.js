import { wishlistAPI } from './api.js';
import { getToken } from './auth.js';

export function initializeWishlist() {
    console.log('Wishlist initialized');
    updateWishlistCount();
}

export async function updateWishlistCount() {
    const token = getToken();
    let count = 0;
    if (token) {
        try {
            const wishlistData = await wishlistAPI.get();
            count = wishlistData.items.length;
        } catch (error) {
            console.warn('Could not fetch wishlist for count update:', error.message);
            // Gérer les erreurs 401 etc. si nécessaire, ex: forcer la déconnexion
        }
    }

    const badges = [document.getElementById('wishlist-count-badge'), document.getElementById('mobile-wishlist-count-badge')];
    badges.forEach(badge => {
        if (badge) {
            badge.textContent = count;
            badge.classList.toggle('hidden', count === 0);
        }
    });
    return count; // Retourner le compte peut être utile
}

export function updateWishlistOnAuthChange(authDetail) {
    console.log('Wishlist reacting to auth change:', authDetail);
    updateWishlistCount(); // Met à jour le compteur (charge les données si connecté, sinon 0)
}

// Logique pour ajouter/supprimer de la wishlist (appelée depuis les pages produits/catalogue)
export async function handleToggleWishlist(productId, buttonElement) {
    if (!getToken()) {
        alert("Veuillez vous connecter pour gérer votre liste de souhaits.");
        window.location.href = '/src/pages/login.html';
        return;
    }

    // Vérifier l'état actuel (si le produit est dans la wishlist) - plus complexe sans état local
    // Pour une version simple, on peut juste tenter d'ajouter, et si déjà présent, le backend ne fera rien ou on le supprime.
    // Une meilleure approche serait de savoir si on ajoute ou supprime.
    // On peut se baser sur l'apparence du bouton si on le met à jour.

    const isWishlisted = buttonElement ? buttonElement.classList.contains('text-red-500') : false; // Supposition basée sur le style

    try {
        if (isWishlisted) {
            await wishlistAPI.removeItem(productId);
            if (buttonElement) {
                buttonElement.classList.remove('text-red-500', 'bg-red-100'); // Style "non-wishlisté"
                buttonElement.classList.add('text-gray-400');
                // Mettre à jour l'attribut aria-label ou title si besoin
            }
            alert('Produit retiré de la wishlist.');
        } else {
            await wishlistAPI.addItem(productId);
            if (buttonElement) {
                buttonElement.classList.add('text-red-500', 'bg-red-100'); // Style "wishlisté"
                buttonElement.classList.remove('text-gray-400');
            }
            alert('Produit ajouté à la wishlist !');
        }
        await updateWishlistCount(); // Met à jour le badge
    } catch (error) {
        console.error("Error toggling wishlist item:", error);
        alert(error.data?.message || error.message || "Erreur lors de la mise à jour de la wishlist.");
    }
}

