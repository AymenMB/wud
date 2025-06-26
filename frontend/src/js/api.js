import { appError, devLog } from './uiUtils.js';

const BASE_URL = 'http://localhost:3001/api'; // L'URL de notre backend (ajuster si différent)

// Fonction helper pour gérer les réponses et les erreurs de fetch
async function handleResponse(response) {
    const contentType = response.headers.get('content-type');
    let data;

    if (contentType && contentType.includes('application/json')) {
        data = await response.json();
    } else {
        // Si ce n'est pas du JSON, on essaie de lire en texte (pour les erreurs HTML par exemple)
        // ou on retourne une réponse vide si pas de contenu.
        const text = await response.text();
        data = text ? { message: text } : { message: response.statusText };
    }

    if (!response.ok) {
        // Construire un message d'erreur plus informatif
        const error = new Error(data.message || `Erreur ${response.status}: ${response.statusText}`);
        error.status = response.status;
        error.data = data; // Contient potentiellement plus de détails (ex: errors array pour la validation)
        throw error;
    }
    return data;
}

// Fonction générique pour les requêtes API
export async function apiRequest(endpoint, method = 'GET', body = null, requiresAuth = false) {
    const headers = {
        'Content-Type': 'application/json',
    };

    const token = localStorage.getItem('authToken');
    if (requiresAuth && token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const config = {
        method: method,
        headers: headers,
    };

    if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH' || method === 'DELETE')) { // Ajout de DELETE pour cartAPI
        config.body = JSON.stringify(body);
    }

    try {
        devLog(`API Request: ${method} ${BASE_URL}${endpoint}`, body || '<No body>');
        const response = await fetch(`${BASE_URL}${endpoint}`, config);
        return await handleResponse(response);
    } catch (error) {
        // error.data et error.message sont déjà formatés par handleResponse ou par fetch lui-même
        appError(`API Call Failed: ${method} ${endpoint}`, error);
        throw error;
    }
}

// Exemples de fonctions spécifiques (peuvent être étendues)
export const authAPI = {
    login: (credentials) => apiRequest('/auth/login', 'POST', credentials),
    register: (userData) => apiRequest('/auth/register', 'POST', userData),
    getProfile: () => apiRequest('/auth/profile', 'GET', null, true),
    updateProfile: (profileData) => apiRequest('/auth/profile', 'PUT', profileData, true),
};

export const productAPI = {
    getAll: (params = {}) => {
        const query = new URLSearchParams(params).toString();
        return apiRequest(`/products?${query}`);
    },
    getById: (id) => apiRequest(`/products/${id}`),
    // create: (productData) => apiRequest('/products', 'POST', productData, true), // Admin
};

export const categoryAPI = {
    getAll: () => apiRequest('/categories'),
    getByIdOrSlug: (idOrSlug) => apiRequest(`/categories/${idOrSlug}`),
};

export const cartAPI = {
    get: () => apiRequest('/cart', 'GET', null, true),
    addItem: (itemData) => apiRequest('/cart/items', 'POST', itemData, true),
    updateItem: (itemData) => apiRequest('/cart/items', 'PUT', itemData, true),
    removeItem: (itemData) => apiRequest('/cart/items', 'DELETE', itemData, true),
    clear: () => apiRequest('/cart', 'DELETE', null, true),
};

export const wishlistAPI = {
    get: () => apiRequest('/wishlist', 'GET', null, true),
    addItem: (productId) => apiRequest('/wishlist/items', 'POST', { productId }, true),
    removeItem: (productId) => apiRequest(`/wishlist/items/${productId}`, 'DELETE', null, true),
};

export const orderAPI = {
    getMyOrders: () => apiRequest('/orders/myorders', 'GET', null, true),
    getById: (id) => apiRequest(`/orders/${id}`, 'GET', null, true),
    create: (orderData) => apiRequest('/orders', 'POST', orderData, true),
    // Admin routes
    getAllAdmin: (params = {}) => {
        const queryParams = new URLSearchParams(params).toString();
        return apiRequest(`/orders/admin/allorders${queryParams ? '?' + queryParams : ''}`, 'GET', null, true);
    },
    updateStatusAdmin: (id, statusData) => apiRequest(`/orders/admin/${id}/status`, 'PUT', statusData, true),
};

export const blogAPI = {
    // Public routes
    getAllPosts: (params = {}) => {
        const queryParams = new URLSearchParams(params).toString();
        return apiRequest(`/blog/posts${queryParams ? '?' + queryParams : ''}`);
    },
    getAllPublished: (params = {}) => {
        const queryParams = new URLSearchParams(params).toString();
        return apiRequest(`/blog/posts${queryParams ? '?' + queryParams : ''}`);
    },
    getBySlug: (slug) => apiRequest(`/blog/posts/${slug}`),
    getPostBySlug: (slug) => apiRequest(`/blog/posts/${slug}`),
    // Admin routes
    getAllAdmin: (params = {}) => {
        const queryParams = new URLSearchParams(params).toString();
        return apiRequest(`/blog/admin/posts/all${queryParams ? '?' + queryParams : ''}`, 'GET', null, true);
    },
    getByIdAdmin: (id) => apiRequest(`/blog/admin/posts/${id}`, 'GET', null, true),
    createAdmin: (postData) => apiRequest('/blog/admin/posts', 'POST', postData, true),
    updateAdmin: (id, postData) => apiRequest(`/blog/admin/posts/${id}`, 'PUT', postData, true),
    deleteAdmin: (id) => apiRequest(`/blog/admin/posts/${id}`, 'DELETE', null, true),
};

export const customRequestAPI = {
    submit: (requestData) => apiRequest('/custom-requests', 'POST', requestData, false),
    // Admin routes
    getAllAdmin: (params = {}) => {
        const queryParams = new URLSearchParams(params).toString();
        return apiRequest(`/custom-requests/admin/all${queryParams ? '?' + queryParams : ''}`, 'GET', null, true);
    },
    getByIdAdmin: (id) => apiRequest(`/custom-requests/admin/${id}`, 'GET', null, true),
    updateAdmin: (id, requestData) => apiRequest(`/custom-requests/admin/${id}`, 'PUT', requestData, true),
    deleteAdmin: (id) => apiRequest(`/custom-requests/admin/${id}`, 'DELETE', null, true),
};

export const userAPI = {
    // Admin routes for user management
    getAllAdmin: (params = {}) => {
        const queryParams = new URLSearchParams(params).toString();
        return apiRequest(`/users${queryParams ? '?' + queryParams : ''}`, 'GET', null, true);
    },
    getByIdAdmin: (id) => apiRequest(`/users/${id}`, 'GET', null, true),
    createAdmin: (userData) => apiRequest('/users', 'POST', userData, true),
    updateAdmin: (id, userData) => apiRequest(`/users/${id}`, 'PUT', userData, true),
    deleteAdmin: (id) => apiRequest(`/users/${id}`, 'DELETE', null, true),
};

export const newsletterAPI = {
    subscribe: (email) => apiRequest('/newsletter/subscribe', 'POST', { email }),
    // Admin routes
    getAllSubscriptionsAdmin: (params = {}) => {
        const queryParams = new URLSearchParams(params).toString();
        return apiRequest(`/newsletter/admin/subscriptions${queryParams ? '?' + queryParams : ''}`, 'GET', null, true);
    },
};

// Admin dashboard stats API
export const dashboardAPI = {
    getStats: () => apiRequest('/admin/stats', 'GET', null, true),
    getOverview: () => apiRequest('/admin/overview', 'GET', null, true),
};

// Enhanced product API with admin functions
export const productAdminAPI = {
    getAll: (params = {}) => {
        const queryParams = new URLSearchParams(params).toString();
        return apiRequest(`/products/admin/all${queryParams ? '?' + queryParams : ''}`, 'GET', null, true);
    },
    getById: (id) => apiRequest(`/products/admin/${id}`, 'GET', null, true),
    create: (productData) => apiRequest('/products', 'POST', productData, true),
    update: (id, productData) => apiRequest(`/products/admin/${id}`, 'PUT', productData, true),
    delete: (id) => apiRequest(`/products/admin/${id}`, 'DELETE', null, true),
    getStats: () => apiRequest('/products/admin/stats', 'GET', null, true),
};

// Enhanced category API with admin functions  
export const categoryAdminAPI = {
    getAll: (params = {}) => {
        const queryParams = new URLSearchParams(params).toString();
        return apiRequest(`/categories/admin/all${queryParams ? '?' + queryParams : ''}`, 'GET', null, true);
    },
    create: (categoryData) => apiRequest('/categories', 'POST', categoryData, true),
    update: (id, categoryData) => apiRequest(`/categories/admin/${id}`, 'PUT', categoryData, true),
    delete: (id) => apiRequest(`/categories/admin/${id}`, 'DELETE', null, true),
    getStats: () => apiRequest('/categories/admin/stats', 'GET', null, true),
};

// Orders admin API
export const orderAdminAPI = {
    getAll: (params = {}) => {
        const queryParams = new URLSearchParams(params).toString();
        return apiRequest(`/orders/admin/allorders${queryParams ? '?' + queryParams : ''}`, 'GET', null, true);
    },
    getById: (id) => apiRequest(`/orders/${id}`, 'GET', null, true),
    updateStatus: (id, status) => apiRequest(`/orders/admin/${id}/status`, 'PUT', { status }, true),
};

// Users admin API 
export const userAdminAPI = {
    getAll: (params = {}) => {
        const queryParams = new URLSearchParams(params).toString();
        return apiRequest(`/users${queryParams ? '?' + queryParams : ''}`, 'GET', null, true);
    },
    getById: (id) => apiRequest(`/users/${id}`, 'GET', null, true),
    create: (userData) => apiRequest('/users', 'POST', userData, true),
    update: (id, userData) => apiRequest(`/users/${id}`, 'PUT', userData, true),
    delete: (id) => apiRequest(`/users/${id}`, 'DELETE', null, true),
};

// Custom requests admin API
export const customRequestAdminAPI = {
    getAll: (params = {}) => {
        const queryParams = new URLSearchParams(params).toString();
        return apiRequest(`/custom-requests/admin/all${queryParams ? '?' + queryParams : ''}`, 'GET', null, true);
    },
    getById: (id) => apiRequest(`/custom-requests/admin/${id}`, 'GET', null, true),
    update: (id, data) => apiRequest(`/custom-requests/admin/${id}`, 'PUT', data, true),
    delete: (id) => apiRequest(`/custom-requests/admin/${id}`, 'DELETE', null, true),
};

// Blog posts admin API
export const blogPostAdminAPI = {
    getAll: (params = {}) => {
        const queryParams = new URLSearchParams(params).toString();
        return apiRequest(`/blog/admin/posts/all${queryParams ? '?' + queryParams : ''}`, 'GET', null, true);
    },
    getById: (id) => apiRequest(`/blog/admin/posts/${id}`, 'GET', null, true),
    create: (postData) => apiRequest('/blog/admin/posts', 'POST', postData, true),
    update: (id, postData) => apiRequest(`/blog/admin/posts/${id}`, 'PUT', postData, true),
    delete: (id) => apiRequest(`/blog/admin/posts/${id}`, 'DELETE', null, true),
};
