import './style.css';
import { checkAuthState, logout } from './js/auth.js';
import { initializeCart, updateCartOnAuthChange, attachCartItemEventListeners } from './js/cart.js';
import { initializeWishlist, updateWishlistOnAuthChange } from './js/wishlist.js';
import { initHomePage } from './js/homePage.js';
import { initCatalogPage } from './js/catalogPage.js';
import { initProductDetailPage } from './js/productDetailPage.js';
import { initWishlistPage } from './js/wishlistPage.js';
import { initProfilePage } from './js/profilePage.js';
import { initCheckoutPage } from './js/checkoutPage.js';
import { initOrdersPage } from './js/ordersPage.js';
import { initBlogPage } from './js/blogPage.js'; // Ajouté
import { initBlogPostPage } from './js/blogPostPage.js'; // Ajouté

async function loadComponent(componentPath, placeholderId, callback) {
  const placeholder = document.getElementById(placeholderId);
  if (!placeholder) {
    return;
  }
  try {
    const response = await fetch(componentPath);
    if (!response.ok) {
      throw new Error(`Failed to fetch component ${componentPath}: ${response.statusText}`);
    }
    const html = await response.text();
    placeholder.innerHTML = html;
    if (callback) callback();
  } catch (error) {
    console.error(`Error loading component ${componentPath}:`, error);
    if (placeholder) {
        placeholder.innerHTML = `<p class="text-red-500 text-center">Error loading ${placeholderId}.</p>`;
    }
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  console.log("Wud' frontend initialized!");

  await loadComponent('/src/components/header.html', 'header-placeholder', () => {
    initializeHeaderInteractions();
    checkAuthState();
    initializeCart();
    initializeWishlist();
  });

  await loadComponent('/src/components/footer.html', 'footer-placeholder', initializeFooterInteractions);

  const bodyId = document.body.id;
  if (bodyId === 'home-page') {
    initHomePage();
  } else if (bodyId === 'catalog-page') {
    if (typeof initCatalogPage === 'function') initCatalogPage();
  } else if (bodyId === 'product-detail-page') {
    if (typeof initProductDetailPage === 'function') initProductDetailPage();
  } else if (bodyId === 'wishlist-page') {
    if (typeof initWishlistPage === 'function') initWishlistPage();
  } else if (bodyId === 'profile-page') {
    if (typeof initProfilePage === 'function') initProfilePage();
  } else if (bodyId === 'custom-project-page') {
    // initCustomProjectPage est auto-appelé
  } else if (bodyId === 'checkout-page') {
    if (typeof initCheckoutPage === 'function') initCheckoutPage();
  } else if (bodyId === 'orders-page') {
    if (typeof initOrdersPage === 'function') initOrdersPage();
  } else if (bodyId === 'blog-list-page') { // Ajouté
    if (typeof initBlogPage === 'function') initBlogPage();
  } else if (bodyId === 'blog-post-page') { // Ajouté
    if (typeof initBlogPostPage === 'function') initBlogPostPage();
  } else if (bodyId === 'admin-dashboard-page') {
    // initAdminDashboard est auto-appelé
  }
  // Les pages login et register gèrent leur propre initialisation.
  // order-confirmation.html a son propre script inline simple.
});

function initializeHeaderInteractions() {
  // Navigation mobile toggle
  const mobileMenuButton = document.getElementById('mobile-menu-button');
  const mobileMenu = document.getElementById('mobile-menu');
  
  if (mobileMenuButton && mobileMenu) {
    mobileMenuButton.addEventListener('click', () => {
      mobileMenu.classList.toggle('hidden');
    });
  }

  // Search modal functionality
  const searchIcon = document.getElementById('search-icon');
  const mobileSearchIcon = document.getElementById('mobile-search-icon');
  const searchModal = document.getElementById('search-modal');
  const closeSearchModalButton = document.getElementById('close-search-modal');
  const searchInput = document.getElementById('search-input');
  const searchResults = document.getElementById('search-results');

  const openSearchModal = () => {
    if (searchModal) {
      searchModal.classList.remove('hidden');
      if(searchInput) searchInput.focus();
    }
  };
  const closeSearchModal = () => {
    if (searchModal) {
      searchModal.classList.add('hidden');
      if (searchResults) searchResults.innerHTML = '';
      if (searchInput) searchInput.value = '';
    }
  };

  // Search functionality
  let searchTimeout;
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      const query = e.target.value.trim();
      
      if (query.length < 2) {
        searchResults.innerHTML = '';
        return;
      }

      searchTimeout = setTimeout(async () => {
        try {
          searchResults.innerHTML = '<div class="p-4 text-center text-gray-500">Recherche en cours...</div>';
          
          const { productAPI } = await import('./js/api.js');
          const response = await productAPI.getAll({ 
            search: query, 
            limit: 5 
          });
          
          if (response.products && response.products.length > 0) {
            searchResults.innerHTML = response.products.map(product => `
              <div class="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0" onclick="window.location.href='/src/pages/product-detail.html?id=${product._id}'">
                <div class="flex items-center space-x-3">
                  <img src="${product.images?.[0] || '/src/assets/images/product-placeholder.svg'}" 
                       alt="${product.name}" 
                       class="w-12 h-12 object-cover rounded">
                  <div class="flex-1">
                    <h4 class="text-sm font-medium text-gray-900">${product.name}</h4>
                    <p class="text-xs text-gray-500">${product.price} €</p>
                  </div>
                </div>
              </div>
            `).join('');
          } else {
            searchResults.innerHTML = '<div class="p-4 text-center text-gray-500">Aucun produit trouvé</div>';
          }
        } catch (error) {
          console.error('Search error:', error);
          searchResults.innerHTML = '<div class="p-4 text-center text-red-500">Erreur lors de la recherche</div>';
        }
      }, 300);
    });
  }

  if (searchIcon) searchIcon.addEventListener('click', openSearchModal);
  if (mobileSearchIcon) mobileSearchIcon.addEventListener('click', () => {
    openSearchModal();
    if (mobileMenu && !mobileMenu.classList.contains('hidden')) {
        mobileMenu.classList.add('hidden');
    }
  });
  if (closeSearchModalButton) closeSearchModalButton.addEventListener('click', closeSearchModal);
  if (searchModal) {
    searchModal.addEventListener('click', (event) => {
      if (event.target === searchModal) closeSearchModal();
    });
  }

  // Cart modal functionality
  const cartIcon = document.getElementById('cart-icon');
  const mobileCartIcon = document.getElementById('mobile-cart-icon');
  const cartModal = document.getElementById('cart-modal');
  const cartPanel = document.getElementById('cart-panel');
  const closeCartModalButton = document.getElementById('close-cart-modal');
  const cartOverlay = document.getElementById('cart-overlay');

  const openCartModal = () => {
    if (cartModal && cartPanel) {
      cartModal.classList.remove('hidden');
      setTimeout(() => cartPanel.classList.remove('translate-x-full'), 10);
      attachCartItemEventListeners();
    }
  };
  const closeCartModal = () => {
    if (cartModal && cartPanel) {
      cartPanel.classList.add('translate-x-full');
      setTimeout(() => cartModal.classList.add('hidden'), 300);
    }
  };

  if (cartIcon) cartIcon.addEventListener('click', openCartModal);
  if (mobileCartIcon) mobileCartIcon.addEventListener('click', () => {
      openCartModal();
      if (mobileMenu && !mobileMenu.classList.contains('hidden')) {
        mobileMenu.classList.add('hidden');
    }
  });
  if (closeCartModalButton) closeCartModalButton.addEventListener('click', closeCartModal);
  if (cartOverlay) cartOverlay.addEventListener('click', closeCartModal);
}

function initializeFooterInteractions() {
    const currentYearSpanFooter = document.getElementById('currentYearFooter');
    if (currentYearSpanFooter) {
        currentYearSpanFooter.textContent = new Date().getFullYear();
    }

    const newsletterFormFooter = document.getElementById('newsletter-form-footer');
    const newsletterEmailFooter = document.getElementById('newsletter-email-footer');
    const newsletterMessageFooter = document.getElementById('newsletter-message-footer');

    if (newsletterFormFooter && newsletterEmailFooter && newsletterMessageFooter) {
        newsletterFormFooter.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = newsletterEmailFooter.value;
            newsletterMessageFooter.textContent = 'Envoi en cours...';
            newsletterMessageFooter.className = 'text-xs mt-2 text-wud-secondary';

            try {
                const { newsletterAPI } = await import('./js/api.js');
                const data = await newsletterAPI.subscribe(email);
                newsletterMessageFooter.textContent = data.message || 'Inscription réussie !';
                newsletterMessageFooter.className = 'text-xs mt-2 text-green-600';
                newsletterEmailFooter.value = '';
            } catch (err) {
                newsletterMessageFooter.textContent = err.data?.message || err.message || 'Une erreur est survenue.';
                newsletterMessageFooter.className = 'text-xs mt-2 text-red-600';
                console.error("Newsletter subscription error:", err);
            }
        });
    }
}

document.addEventListener('authChange', (event) => {
    console.log('Auth state changed globally:', event.detail);
    if (typeof updateCartOnAuthChange === 'function') updateCartOnAuthChange(event.detail);
    if (typeof updateWishlistOnAuthChange === 'function') updateWishlistOnAuthChange(event.detail);
});

window.WudApp = {
    logout,
};
