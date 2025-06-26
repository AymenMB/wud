// frontend/src/js/admin/uiAdmin.js
import { getCurrentUser } from '../auth.js'; // Supposant que getCurrentUser retourne l'utilisateur ou null

export function setupAdminUI() {
    const user = getCurrentUser(); // Récupère les informations de l'utilisateur (doit inclure le rôle)

    const adminLinkDesktop = document.getElementById('admin-link-desktop');
    const adminLinkMobile = document.getElementById('admin-link-mobile');

    if (user && user.role === 'admin') {
        if (adminLinkDesktop) {
            adminLinkDesktop.classList.remove('hidden');
        }
        if (adminLinkMobile) {
            adminLinkMobile.classList.remove('hidden');
        }
    } else {
        if (adminLinkDesktop) {
            adminLinkDesktop.classList.add('hidden');
        }
        if (adminLinkMobile) {
            adminLinkMobile.classList.add('hidden');
        }
    }
}
