import { cartAPI, orderAPI, authAPI } from './api.js';
import { protectPage, getCurrentUser } from './auth.js';
import { displayMessage, setLoadingState, appError, devLog, devWarn } from './uiUtils.js';
import { updateCartDisplay } from './cart.js'; // Pour mettre à jour le badge après commande

let currentCart = null;
const shippingCosts = {
    standard: 5.00,
    express: 15.00
};

function renderCartSummary(cart) {
    const summaryContainer = document.getElementById('checkout-cart-summary');
    const itemsSubtotalEl = document.getElementById('summary-items-subtotal');

    if (!summaryContainer || !cart || !cart.items || cart.items.length === 0) {
        if (summaryContainer) summaryContainer.innerHTML = '<p class="text-gray-500">Votre panier est vide.</p>';
        const submitBtn = document.getElementById('submit-order-btn');
        if(submitBtn) {
            submitBtn.disabled = true;
            submitBtn.classList.add('opacity-50', 'cursor-not-allowed');
        }
        return;
    }

    summaryContainer.innerHTML = cart.items.map(item => {
        const product = item.product;
        if (!product) return '';
        const displayPrice = item.currentPricePerUnit || product.price;
        return `
            <div class="flex justify-between items-start py-2 border-b border-gray-100 last:border-b-0">
                <div class="flex items-start">
                    <img src="${product.images?.[0]?.url || '/src/assets/images/placeholder-product.svg'}" alt="${product.name}" class="w-12 h-12 object-cover rounded-md mr-3">
                    <div>
                        <p class="font-medium text-wud-primary text-sm">${product.name}</p>
                        ${item.selectedVariant?.optionValue ? `<p class="text-xs text-gray-500">${item.selectedVariant.name}: ${item.selectedVariant.optionValue}</p>` : ''}
                        <p class="text-xs text-gray-500">Qté: ${item.quantity}</p>
                    </div>
                </div>
                <p class="text-sm font-medium text-wud-primary whitespace-nowrap">${(item.quantity * displayPrice).toFixed(2)} €</p>
            </div>
        `;
    }).join('');
    if(itemsSubtotalEl) itemsSubtotalEl.textContent = `${parseFloat(cart.totalPrice).toFixed(2)} €`;
    updateTotalsDisplay();
}

function updateTotalsDisplay() {
    const itemsSubtotalEl = document.getElementById('summary-items-subtotal');
    const shippingCostEl = document.getElementById('summary-shipping-cost');
    const totalAmountEl = document.getElementById('summary-total-amount');
    const selectedShippingMethodInput = document.querySelector('input[name="shippingMethod"]:checked');

    if (!currentCart || !itemsSubtotalEl || !shippingCostEl || !totalAmountEl || !selectedShippingMethodInput) {
        devWarn("One or more elements for total display not found or cart not loaded.");
        return;
    }
    const selectedShippingMethod = selectedShippingMethodInput.value;


    const itemsTotal = parseFloat(currentCart.totalPrice) || 0;
    const shippingCost = shippingCosts[selectedShippingMethod] || 0;
    const grandTotal = itemsTotal + shippingCost;

    itemsSubtotalEl.textContent = `${itemsTotal.toFixed(2)} €`;
    shippingCostEl.textContent = `${shippingCost.toFixed(2)} €`;
    totalAmountEl.textContent = `${grandTotal.toFixed(2)} €`;
}


async function prefillUserData() {
    const user = getCurrentUser();
    const form = document.getElementById('checkout-form');
    if (!form) return;

    if (user) {
        form.elements['firstName'].value = user.firstName || '';
        form.elements['lastName'].value = user.lastName || '';
        form.elements['email'].value = user.email || '';
    }

    try {
        const profile = await authAPI.getProfile();
        if (profile) {
            if (profile.phoneNumber) form.elements['shippingAddress.phoneNumber'].value = profile.phoneNumber;
            const defaultShipping = profile.addresses?.find(addr => addr.isDefault === true); // Check for true explicitly
            const firstAddress = profile.addresses?.[0];
            const addressToUse = defaultShipping || firstAddress;

            if (addressToUse) {
                form.elements['shippingAddress.street'].value = addressToUse.street || '';
                form.elements['shippingAddress.zipCode'].value = addressToUse.zipCode || '';
                form.elements['shippingAddress.city'].value = addressToUse.city || '';
                form.elements['shippingAddress.country'].value = addressToUse.country || 'France';
            }
        }
    } catch (error) {
        appError("Error prefilling user data for checkout", error);
    }
}

function toggleBillingAddressForm() {
    const checkbox = document.getElementById('use-shipping-for-billing');
    const billingSection = document.getElementById('billing-address-section');
    if (checkbox && billingSection) {
        const isHidden = checkbox.checked;
        billingSection.classList.toggle('hidden', isHidden);
        billingSection.querySelectorAll('input').forEach(input => {
            input.required = !isHidden;
        });
    }
}

async function handleCheckoutSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const messageDiv = document.getElementById('checkout-message');
    const submitButton = document.getElementById('submit-order-btn');

    displayMessage(messageDiv, '', 'info');
    setLoadingState(submitButton, true, 'Validation...');

    const formData = new FormData(form);
    const shippingAddress = {
        street: formData.get('shippingAddress.street'),
        city: formData.get('shippingAddress.city'),
        zipCode: formData.get('shippingAddress.zipCode'),
        country: formData.get('shippingAddress.country'),
        phoneNumber: formData.get('shippingAddress.phoneNumber'),
    };
    let billingAddress = null;
    if (!formData.get('useShippingForBilling')) {
        billingAddress = {
            street: formData.get('billingAddress.street'),
            city: formData.get('billingAddress.city'),
            zipCode: formData.get('billingAddress.zipCode'),
            country: formData.get('billingAddress.country'),
        };
        if (!billingAddress.street || !billingAddress.zipCode || !billingAddress.city || !billingAddress.country) {
            displayMessage(messageDiv, "Veuillez remplir tous les champs de l'adresse de facturation.", "error");
            setLoadingState(submitButton, false);
            return;
        }
    }

    const orderData = {
        shippingAddress,
        billingAddress: billingAddress || shippingAddress,
        paymentMethod: formData.get('paymentMethod'),
        shippingMethod: formData.get('shippingMethod'),
    };

    try {
        const createdOrder = await orderAPI.create(orderData);
        devLog('Order created successfully:', createdOrder);
        await updateCartDisplay(); // Mettre à jour l'affichage du panier
        window.location.href = `/src/pages/order-confirmation.html?orderId=${createdOrder._id}&total=${createdOrder.totalAmount}`;
    } catch (error) {
        appError("Error creating order", error);
        displayMessage(messageDiv, error.data?.message || error.message || 'Erreur lors de la création de la commande.', 'error');
    } finally { // Assurer que le bouton est réactivé même si la redirection a lieu
        setLoadingState(submitButton, false);
    }
}

export async function initCheckoutPage() {
    if (!document.body.id === 'checkout-page') return; // Vérifier si on est sur la bonne page
    if (!protectPage('/src/pages/login.html?redirect=/src/pages/checkout.html')) return;

    devLog('Initializing Checkout Page...');

    const useShippingCheckbox = document.getElementById('use-shipping-for-billing');
    if (useShippingCheckbox) {
        useShippingCheckbox.addEventListener('change', toggleBillingAddressForm);
        toggleBillingAddressForm();
    }

    const shippingMethodRadios = document.querySelectorAll('input[name="shippingMethod"]');
    shippingMethodRadios.forEach(radio => {
        radio.addEventListener('change', updateTotalsDisplay);
    });

    const checkoutForm = document.getElementById('checkout-form');
    if (checkoutForm) {
        checkoutForm.addEventListener('submit', handleCheckoutSubmit);
    }

    const checkoutContent = document.getElementById('checkout-content');
    try {
        currentCart = await cartAPI.get();
        if (!currentCart || currentCart.items.length === 0) {
            devWarn('Checkout page: Cart is empty, redirecting to catalog.');
            if (checkoutContent) checkoutContent.innerHTML =
                '<p class="text-center text-wud-secondary py-10 col-span-full">Votre panier est vide. <a href="/src/pages/catalog.html" class="text-wud-accent hover:underline">Continuer vos achats</a>.</p>';
            return;
        }
        renderCartSummary(currentCart); // Cela appellera updateTotalsDisplay
        await prefillUserData();
    } catch (error) {
        appError("Error initializing checkout page (loading cart)", error);
        if (checkoutContent) checkoutContent.innerHTML =
            '<p class="text-center text-red-500 py-10 col-span-full">Erreur lors du chargement de votre panier. Veuillez réessayer.</p>';
    }
}

