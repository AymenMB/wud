import { orderAPI } from './api.js';
import { protectPage } from './auth.js';
import { displayMessage, appError, devLog, devWarn, setLoadingState } from './uiUtils.js';

// let currentPage = 1; // Pour pagination future
// const PAGE_SIZE = 10;

function createOrderRow(order) {
    const orderDate = new Date(order.createdAt).toLocaleDateString('fr-FR', {
        day: '2-digit', month: 'long', year: 'numeric'
    });
    const total = parseFloat(order.totalAmount).toFixed(2);

    let statusText = order.status;
    let statusColorClass = 'bg-yellow-100 text-yellow-800';
    switch (order.status) {
        case 'pending': statusText = 'En attente'; statusColorClass = 'bg-yellow-100 text-yellow-800'; break;
        case 'paid': statusText = 'Payée'; statusColorClass = 'bg-blue-100 text-blue-800'; break;
        case 'shipped': statusText = 'Expédiée'; statusColorClass = 'bg-indigo-100 text-indigo-800'; break;
        case 'delivered': statusText = 'Livrée'; statusColorClass = 'bg-green-100 text-green-800'; break;
        case 'cancelled': statusText = 'Annulée'; statusColorClass = 'bg-red-100 text-red-800'; break;
        case 'refunded': statusText = 'Remboursée'; statusColorClass = 'bg-gray-100 text-gray-800'; break;
        default: statusText = order.status.charAt(0).toUpperCase() + order.status.slice(1); break;
    }

    return `
        <tr class="border-b hover:bg-gray-50">
            <td class="py-3 px-4 text-sm text-wud-primary font-medium">
                <a href="#order-detail-${order._id}" class="hover:underline order-detail-link" data-order-id="${order._id}">#${order._id.substring(0, 8)}...</a>
            </td>
            <td class="py-3 px-4 text-sm text-gray-600">${orderDate}</td>
            <td class="py-3 px-4 text-sm">
                <span class="px-2 py-1 text-xs font-semibold rounded-full ${statusColorClass}">${statusText}</span>
            </td>
            <td class="py-3 px-4 text-sm text-gray-700 text-right">${total} €</td>
            <td class="py-3 px-4 text-sm text-right">
                <a href="#order-detail-${order._id}" class="text-wud-accent hover:underline order-detail-link" data-order-id="${order._id}">Voir détails</a>
            </td>
        </tr>
    `;
}

async function displayOrderDetail(orderId, container) {
    devLog(`Displaying details for order ${orderId}`);
    container.innerHTML = `<div class="p-4 border rounded-md mt-4 bg-gray-50"><p>Chargement des détails...</p></div>`;
    try {
        const order = await orderAPI.getById(orderId);
        let itemsHTML = order.items.map(item => `
            <li class="py-1">${item.name} (Qté: ${item.quantity}) - ${parseFloat(item.price * item.quantity).toFixed(2)} €</li>
        `).join('');

        let shippingHTML = `
            <p class="text-sm"><strong>Rue:</strong> ${order.shippingAddress.street}</p>
            <p class="text-sm"><strong>Ville:</strong> ${order.shippingAddress.zipCode} ${order.shippingAddress.city}</p>
            <p class="text-sm"><strong>Pays:</strong> ${order.shippingAddress.country}</p>
            ${order.shippingAddress.phoneNumber ? `<p class="text-sm"><strong>Tél:</strong> ${order.shippingAddress.phoneNumber}</p>` : ''}
        `;

        container.innerHTML = `
            <div class="p-4 border rounded-md mt-4 bg-gray-50 shadow">
                <div class="flex justify-between items-center mb-3">
                    <h3 class="text-lg font-semibold text-wud-primary">Détail de la Commande #${order._id.substring(0,8)}...</h3>
                    <button class="close-order-detail text-sm text-wud-accent hover:underline">&times; Fermer</button>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div><p><strong>Date:</strong> ${new Date(order.createdAt).toLocaleDateString('fr-FR', {day:'2-digit', month:'long', year:'numeric'})}</p></div>
                    <div><p><strong>Statut:</strong> ${order.status.charAt(0).toUpperCase() + order.status.slice(1)}</p></div>
                    <div><p><strong>Total Commande:</strong> ${parseFloat(order.totalAmount).toFixed(2)} €</p></div>
                    <div><p><strong>Méthode de livraison:</strong> ${order.shippingMethod || 'N/A'}</p></div>
                </div>
                <h4 class="font-medium mt-4 mb-1 text-wud-primary">Articles:</h4>
                <ul class="list-disc list-inside text-sm space-y-1">${itemsHTML}</ul>
                <h4 class="font-medium mt-4 mb-1 text-wud-primary">Adresse de livraison:</h4>
                ${shippingHTML}
            </div>`;

        container.querySelector('.close-order-detail').addEventListener('click', () => {
            container.innerHTML = '';
        });

    } catch (error) {
        appError("Error fetching order detail", error);
        container.innerHTML = `<div class="p-4 border rounded-md mt-4 bg-red-50 text-red-700">Erreur lors du chargement des détails de la commande.</div>`;
    }
}

async function loadUserOrders() {
    const ordersTableBody = document.getElementById('user-orders-table-body');
    const ordersContainer = document.getElementById('user-orders-container');
    const orderDetailContainer = document.getElementById('order-detail-view-container');

    if (!ordersTableBody || !ordersContainer || !orderDetailContainer) {
        devWarn('Orders page: Essential elements not found.');
        return;
    }

    ordersTableBody.innerHTML = '<tr><td colspan="5" class="text-center py-10 text-wud-secondary">Chargement de vos commandes...</td></tr>';

    try {
        const { orders } = await orderAPI.getMyOrders();

        if (orders && orders.length > 0) {
            ordersTableBody.innerHTML = orders.map(createOrderRow).join('');
        } else {
            // Masquer le tableau et afficher un message dans le conteneur principal
            ordersContainer.querySelector('table')?.classList.add('hidden');
            ordersContainer.innerHTML = '<p class="text-center text-wud-secondary py-10">Vous n\'avez aucune commande pour le moment.</p>' + ordersContainer.innerHTML; // Conserver orderDetailContainer
        }
    } catch (error) {
        appError("Error loading user orders", error);
        ordersContainer.innerHTML = '<p class="text-center text-red-500 py-10">Erreur lors du chargement de vos commandes.</p>' +  `<div id="order-detail-view-container" class="mt-6"></div>`;
    }
}

function attachOrdersPageEventListeners() {
    const ordersTableBody = document.getElementById('user-orders-table-body');
    const orderDetailContainer = document.getElementById('order-detail-view-container');

    if (ordersTableBody && orderDetailContainer) {
        ordersTableBody.addEventListener('click', (e) => {
            const targetLink = e.target.closest('a.order-detail-link');
            if (targetLink) {
                e.preventDefault();
                const orderId = targetLink.dataset.orderId;
                displayOrderDetail(orderId, orderDetailContainer);
            }
        });
    }
    // L'écouteur pour le bouton "fermer détails" est dans displayOrderDetail car l'élément est créé dynamiquement.
}

export function initOrdersPage() {
    // La page orders.html doit avoir <body id="orders-page">
    if (document.body.id === 'orders-page') {
        if (!protectPage('/src/pages/login.html?redirect=/src/pages/orders.html')) return;
        devLog('Initializing Orders Page...');
        loadUserOrders();
        attachOrdersPageEventListeners();
    }
}

