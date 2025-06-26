import { authAPI } from './api.js';
// Importer pour vider/mettre à jour le panier au logout/login (sera créé plus tard)
// import { updateCartOnAuthChange } from './cart.js';
// import { updateWishlistOnAuthChange } from './wishlist.js';
import { setupAdminUI } from './admin/uiAdmin.js';

const USER_INFO_KEY = 'wudUserInfo';
const AUTH_TOKEN_KEY = 'authToken';

let currentUser = null;

export function getCurrentUser() {
    if (currentUser) return currentUser;
    const userInfo = localStorage.getItem(USER_INFO_KEY);
    if (userInfo) {
        try {
            currentUser = JSON.parse(userInfo);
            return currentUser;
        } catch (e) {
            console.error("Error parsing user info from localStorage", e);
            localStorage.removeItem(USER_INFO_KEY); // Clear corrupted data
            return null;
        }
    }
    return null;
}

export function getToken() {
    return localStorage.getItem(AUTH_TOKEN_KEY);
}

export async function login(email, password) {
    try {
        const data = await authAPI.login({ email, password });
        localStorage.setItem(AUTH_TOKEN_KEY, data.token);
        const userProfile = { _id: data._id, firstName: data.firstName, lastName: data.lastName, email: data.email, role: data.role };
        localStorage.setItem(USER_INFO_KEY, JSON.stringify(userProfile));
        currentUser = userProfile;
        updateUserUI();
        // Dispatche un événement pour que d'autres modules (panier, wishlist) puissent réagir
        document.dispatchEvent(new CustomEvent('authChange', { detail: { loggedIn: true, user: currentUser } }));
        return { success: true, user: userProfile };
    } catch (error) {
        console.error('Login failed:', error);
        return { success: false, message: error.message || 'Erreur de connexion.' };
    }
}

export async function register(userData) {
    try {
        const data = await authAPI.register(userData);
        localStorage.setItem(AUTH_TOKEN_KEY, data.token);
        const userProfile = { _id: data._id, firstName: data.firstName, lastName: data.lastName, email: data.email, role: data.role };
        localStorage.setItem(USER_INFO_KEY, JSON.stringify(userProfile));
        currentUser = userProfile;
        updateUserUI();
        document.dispatchEvent(new CustomEvent('authChange', { detail: { loggedIn: true, user: currentUser } }));
        return { success: true, user: userProfile };
    } catch (error) {
        console.error('Registration failed:', error);
        let message = 'Erreur lors de l\'inscription.';
        if (error.data && error.data.errors) {
            message = error.data.errors.join(', ');
        } else if (error.message) {
            message = error.message;
        }
        return { success: false, message: message };
    }
}

export function logout() {
    const userWasLoggedIn = !!getToken();
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(USER_INFO_KEY);
    currentUser = null;
    updateUserUI();
    if (userWasLoggedIn) {
        document.dispatchEvent(new CustomEvent('authChange', { detail: { loggedIn: false } }));
    }
    // Redirection optionnelle
    // if (window.location.pathname !== '/' && !window.location.pathname.endsWith('index.html')) {
    //     window.location.href = '/';
    // }
}

export function updateUserUI() {
    const user = getCurrentUser();
    const userAccountLink = document.getElementById('user-account-link');
    const mobileUserAccountLink = document.getElementById('mobile-user-account-link');
    // Les autres éléments (comme le bouton logout) seront gérés par les pages spécifiques si besoin

    if (userAccountLink && mobileUserAccountLink) {
        if (user) {
            const userName = user.firstName || user.email.split('@')[0];
            userAccountLink.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 inline-block mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span class="hidden sm:inline">${userName}</span>`;
            userAccountLink.href = '/src/pages/profile.html'; // Lien vers le profil

            mobileUserAccountLink.textContent = `Mon Compte (${userName})`;
            mobileUserAccountLink.href = '/src/pages/profile.html';
        } else {
            userAccountLink.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span class="hidden sm:inline">Connexion</span>`;
            userAccountLink.href = '/src/pages/login.html';

            mobileUserAccountLink.textContent = 'Connexion / Inscription';
            mobileUserAccountLink.href = '/src/pages/login.html';
        }
    }
    
    // Mettre à jour l'affichage du bouton admin
    setupAdminUI();
}

export function checkAuthState() {
    const token = getToken();
    if (token) {
        const user = getCurrentUser(); // Tente de charger depuis localStorage
        if (user) {
            // Optionnel: Valider le token avec un appel silencieux à /auth/profile
            // pour s'assurer qu'il est toujours valide côté serveur.
            // Si l'appel échoue (ex: token expiré), appeler logout().
            // Pour l'instant, on se fie à la présence locale.
            console.log('User is considered logged in (local state):', user);
        } else {
            console.log('Token found but no user info, logging out.');
            logout(); // Nettoie un état potentiellement invalide
        }
    } else {
        console.log('User is not logged in.');
    }
    updateUserUI(); // Met à jour l'UI en fonction de l'état trouvé
    // Dispatch l'événement initial pour que les autres modules (panier, wishlist) se synchronisent
    document.dispatchEvent(new CustomEvent('authChange', { detail: { loggedIn: !!token, user: getCurrentUser() } }));
}

export function protectPage(redirectUrl = '/src/pages/login.html') {
    if (!getToken()) {
        alert("Vous devez être connecté pour accéder à cette page.");
        window.location.href = redirectUrl;
        return false; // Indique que la protection a bloqué
    }
    return true; // L'utilisateur est authentifié
}

export function adminOnlyPage(redirectUrl = '/') {
    if (!protectPage()) return false; // Doit être connecté d'abord

    const user = getCurrentUser();
    if (user && user.role !== 'admin') {
        alert("Accès réservé aux administrateurs.");
        window.location.href = redirectUrl;
        return false; // Indique que la protection a bloqué
    }
    if (!user) return false; // Au cas où protectPage aurait un souci
    return true; // L'utilisateur est admin
}
