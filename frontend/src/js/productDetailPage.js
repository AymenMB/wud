import { productAPI } from './api.js';
import { handleAddToCart } from './cart.js';
import { handleToggleWishlist } from './wishlist.js';
import { appError, devLog } from './uiUtils.js'; // Importer les utilitaires de log

let currentProduct = null;
let currentSelectedVariant = null; // Pour stocker l'objet complet de la variante sélectionnée (name, optionValue, additionalPrice)

function updateDisplayedPrice() {
    const priceElement = document.getElementById('product-price');
    if (!priceElement || !currentProduct) return;

    let finalPrice = currentProduct.price;
    if (currentSelectedVariant && currentSelectedVariant.additionalPrice) {
        finalPrice += currentSelectedVariant.additionalPrice;
    }
    priceElement.textContent = `${parseFloat(finalPrice).toFixed(2)} €`;
}

function displayProductDetails(product) {
    currentProduct = product;
    currentSelectedVariant = null; // Réinitialiser la variante sélectionnée

    document.title = `${product.name} - Wud'`;
    const breadcrumbProductName = document.getElementById('breadcrumb-product-name');
    if(breadcrumbProductName) breadcrumbProductName.textContent = product.name;

    const breadcrumbCategory = document.getElementById('breadcrumb-category');
    if (breadcrumbCategory) {
        if (product.categories && product.categories.length > 0) {
            breadcrumbCategory.textContent = product.categories[0].name;
            breadcrumbCategory.href = `/src/pages/catalog.html?category=${product.categories[0]._id}`;
        } else {
            breadcrumbCategory.textContent = 'Non classé';
            breadcrumbCategory.href = '/src/pages/catalog.html';
        }
    }

    const productNameEl = document.getElementById('product-name');
    if(productNameEl) productNameEl.textContent = product.name;
    const productSkuEl = document.getElementById('product-sku');
    if(productSkuEl) productSkuEl.textContent = product.sku || 'N/A';

    // Gérer promo
    const originalPriceEl = document.getElementById('product-original-price');
    const discountBadgeEl = document.getElementById('product-discount-badge');
    if (product.promotion && product.promotion.discountPercentage > 0 && product.price_before_discount) { // Supposons que l'API renvoie price_before_discount
        if(originalPriceEl) {
            originalPriceEl.textContent = `${parseFloat(product.price_before_discount).toFixed(2)} €`;
            originalPriceEl.classList.remove('hidden');
        }
        if(discountBadgeEl) {
            discountBadgeEl.textContent = product.promotion.promoText || `${product.promotion.discountPercentage}% OFF`;
            discountBadgeEl.classList.remove('hidden');
        }
    } else {
        if(originalPriceEl) originalPriceEl.classList.add('hidden');
        if(discountBadgeEl) discountBadgeEl.classList.add('hidden');
    }


    const shortDescEl = document.getElementById('product-short-description');
    if(shortDescEl) shortDescEl.textContent = product.description.substring(0,150) + (product.description.length > 150 ? "..." : "");

    const mainImage = document.getElementById('main-product-image');
    const thumbnailsContainer = document.getElementById('thumbnail-images');
    if (product.images && product.images.length > 0) {
        if(mainImage) {
            mainImage.src = product.images[0].url;
            mainImage.alt = product.images[0].altText || product.name;
        }
        if(thumbnailsContainer) {
            thumbnailsContainer.innerHTML = product.images.map((img, index) => `
                <button class="aspect-square bg-gray-200 rounded overflow-hidden border-2 ${index === 0 ? 'border-wud-accent' : 'border-transparent'} hover:border-wud-accent focus:border-wud-accent outline-none" data-image-url="${img.url}" data-image-alt="${img.altText || product.name}">
                    <img src="${img.url}" alt="Miniature ${index + 1}" class="w-full h-full object-cover pointer-events-none">
                </button>
            `).join('');
        }
    } else {
        if(mainImage) {
            mainImage.src = 'https://via.placeholder.com/600x600.png/A07C5B/FFFFFF?text=Image+Produit';
            mainImage.alt = product.name;
        }
        if(thumbnailsContainer) thumbnailsContainer.innerHTML = '';
    }

    const variantsContainer = document.getElementById('product-variants-container');
    if(variantsContainer) {
        variantsContainer.innerHTML = '';
        if (product.variants && product.variants.length > 0) {
            product.variants.forEach((variantGroup, groupIndex) => {
                const groupDiv = document.createElement('div');
                groupDiv.className = 'variant-group mb-4';
                const label = document.createElement('label');
                label.htmlFor = `variant-${variantGroup.name.toLowerCase().replace(/\s+/g, '-')}`;
                label.className = 'block text-sm font-medium text-wud-primary mb-1';
                label.textContent = `${variantGroup.name}:`;
                groupDiv.appendChild(label);

                const select = document.createElement('select');
                select.id = `variant-${variantGroup.name.toLowerCase().replace(/\s+/g, '-')}`;
                select.name = variantGroup.name;
                select.className = 'w-full p-2 border-gray-300 rounded-md shadow-sm focus:border-wud-primary focus:ring-wud-primary text-sm product-variant-select';
                select.dataset.variantGroupName = variantGroup.name;

                variantGroup.options.forEach((option, optionIndex) => {
                    const optionEl = document.createElement('option');
                    optionEl.value = option.value;
                    let optionText = option.value;
                    if (option.additionalPrice && option.additionalPrice !== 0) {
                        optionText += ` (${option.additionalPrice > 0 ? '+' : ''}${parseFloat(option.additionalPrice).toFixed(2)} €)`;
                    }
                    optionEl.textContent = optionText;
                    optionEl.dataset.additionalPrice = option.additionalPrice || 0;
                    // Pré-sélectionner la première option du premier groupe de variantes
                    if (groupIndex === 0 && optionIndex === 0) {
                        currentSelectedVariant = {
                            name: variantGroup.name,
                            optionValue: option.value,
                            additionalPrice: parseFloat(option.additionalPrice || 0)
                        };
                    }
                    select.appendChild(optionEl);
                });
                groupDiv.appendChild(select);
                variantsContainer.appendChild(groupDiv);
            });
        }
    }
    updateDisplayedPrice(); // Mettre à jour le prix après avoir potentiellement défini currentSelectedVariant

    const longDescEl = document.getElementById('product-long-description');
    if(longDescEl) longDescEl.innerHTML = product.longDescription || product.description;

    const dimensionsList = document.getElementById('product-dimensions');
    if (dimensionsList && product.dimensions) {
        dimensionsList.innerHTML = `
            ${product.dimensions.length ? `<li>Longueur: ${product.dimensions.length} cm</li>` : ''}
            ${product.dimensions.width ? `<li>Largeur: ${product.dimensions.width} cm</li>` : ''}
            ${product.dimensions.height ? `<li>Hauteur: ${product.dimensions.height} cm</li>` : ''}
            ${product.dimensions.weight ? `<li>Poids: ${product.dimensions.weight} kg</li>` : ''}
        `;
    } else if (dimensionsList) {
        dimensionsList.innerHTML = '<li>Dimensions non spécifiées.</li>';
    }
    const careEl = document.getElementById('product-care-instructions');
    if(careEl) careEl.textContent = product.careInstructions || 'Informations d\'entretien non disponibles.';
}

function attachProductDetailEventListeners() {
    const thumbnailsContainer = document.getElementById('thumbnail-images');
    const mainImage = document.getElementById('main-product-image');
    if (thumbnailsContainer && mainImage) {
        thumbnailsContainer.addEventListener('click', (e) => {
            const button = e.target.closest('button');
            if (button && button.dataset.imageUrl) {
                mainImage.src = button.dataset.imageUrl;
                mainImage.alt = button.dataset.imageAlt;
                thumbnailsContainer.querySelectorAll('button').forEach(btn => btn.classList.remove('border-wud-accent'));
                button.classList.add('border-wud-accent');
            }
        });
    }

    const variantsContainer = document.getElementById('product-variants-container');
    if (variantsContainer) {
        variantsContainer.addEventListener('change', (e) => {
            if (e.target.classList.contains('product-variant-select')) {
                const selectedOption = e.target.options[e.target.selectedIndex];
                // Pour l'instant, on ne gère qu'un seul groupe de variantes pour la sélection stockée.
                // Si plusieurs groupes, il faudrait un objet plus complexe pour currentSelectedVariant.
                currentSelectedVariant = {
                    name: e.target.dataset.variantGroupName,
                    optionValue: selectedOption.value,
                    additionalPrice: parseFloat(selectedOption.dataset.additionalPrice || 0)
                };
                updateDisplayedPrice();
            }
        });
    }

    const addToCartBtn = document.getElementById('add-to-cart-detail-btn');
    if (addToCartBtn) { // currentProduct sera défini quand displayProductDetails est appelé
        addToCartBtn.addEventListener('click', () => {
            if(!currentProduct) return;
            const quantityInput = document.getElementById('quantity');
            const quantity = parseInt(quantityInput.value) || 1;
            handleAddToCart(currentProduct._id, quantity, currentSelectedVariant);
        });
    }

    const addToWishlistBtn = document.getElementById('add-to-wishlist-detail-btn');
    if (addToWishlistBtn) {
        addToWishlistBtn.addEventListener('click', () => {
            if(!currentProduct) return;
            handleToggleWishlist(currentProduct._id, addToWishlistBtn);
        });
    }

    const accordionToggles = document.querySelectorAll('#product-details-accordion .accordion-toggle');
    accordionToggles.forEach(toggle => {
        if (!toggle.dataset.accordionAttached) {
            toggle.addEventListener('click', () => {
                const content = toggle.nextElementSibling;
                const icon = toggle.querySelector('svg');
                content.classList.toggle('hidden');
                icon.classList.toggle('rotate-180');
            });
            toggle.dataset.accordionAttached = 'true';
        }
    });
}
// Helper function for loading related products
// ... (updateDisplayedPrice, displayProductDetails, attachProductDetailEventListeners) ...

async function loadRelatedProducts(productId, categoryId) {
    const relatedGrid = document.getElementById('related-products-grid');
    const relatedPlaceholder = document.getElementById('related-products-placeholder');

    if (!relatedGrid || !relatedPlaceholder) {
        devLog("Related products section not fully found.");
        return;
    }

    relatedPlaceholder.textContent = 'Chargement des recommandations...';
    relatedPlaceholder.classList.remove('hidden');
    relatedGrid.innerHTML = ''; // Vider au cas où il y aurait des placeholders statiques

    try {
        // Placeholder: L'API ne fournit pas encore de produits liés.
        // const { products } = await productAPI.getAll({ limit: 4, categories: categoryId, exclude: productId, isPublished: 'true' });
        const products = []; // Simuler une réponse vide pour l'instant

        if (products && products.length > 0) {
            // Il faudrait une fonction createSimilarProductCard, qui serait une variante de createProductCard
            // Par exemple, plus petite ou avec moins d'infos. Pour l'instant, on pourrait réutiliser createProductCard
            // si elle est importée ou définie ici.
            // relatedGrid.innerHTML = products.map(createProductCard).join(''); // Supposons que createProductCard est accessible
            relatedPlaceholder.classList.add('hidden');
        } else {
            relatedPlaceholder.textContent = 'Aucune recommandation pour le moment.';
        }
    } catch (error) {
        appError("Error loading related products", error);
        relatedPlaceholder.textContent = 'Erreur lors du chargement des recommandations.';
    }
}


export async function initProductDetailPage() {
    const productInfoSection = document.getElementById('product-info');
    if (!productInfoSection) return;

    devLog('Initializing Product Detail Page...');
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id');
    const mainProductDisplayArea = productInfoSection.closest('div.grid'); // Zone principale pour afficher erreurs/chargement

    if (!productId) {
        if (mainProductDisplayArea) mainProductDisplayArea.innerHTML = '<p class="md:col-span-2 text-center text-red-500 py-10">Aucun produit spécifié.</p>';
        return;
    }

    // Cacher le contenu actuel pendant le chargement pour éviter un flash de contenu placeholder
    if(mainProductDisplayArea) mainProductDisplayArea.classList.add('opacity-0');


    try {
        const product = await productAPI.getById(productId);

        if (product) {
            displayProductDetails(product);
            attachProductDetailEventListeners();
            // Charger les produits similaires après que le produit principal est affiché
            const mainCategoryId = product.categories && product.categories.length > 0 ? product.categories[0]._id : null;
            loadRelatedProducts(product._id, mainCategoryId);
        } else {
            if (mainProductDisplayArea) mainProductDisplayArea.innerHTML = '<p class="md:col-span-2 text-center text-red-500 py-10">Produit non trouvé.</p>';
        }
    } catch (error) {
        appError("Error loading product details", error);
        if (mainProductDisplayArea) {
            mainProductDisplayArea.innerHTML = `<p class="md:col-span-2 text-center text-red-500 py-10">Erreur lors du chargement du produit: ${error.message}</p>`;
        }
    } finally {
        if(mainProductDisplayArea) mainProductDisplayArea.classList.remove('opacity-0'); // Rendre visible
    }
}