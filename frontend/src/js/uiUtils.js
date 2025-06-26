/**
 * Affiche un message dans un élément spécifié.
 * @param {HTMLElement|string} targetElement - L'élément DOM ou son sélecteur où afficher le message.
 * @param {string} message - Le message à afficher.
 * @param {'success'|'error'|'info'} type - Le type de message (affecte le style).
 */
export function displayMessage(targetElement, message, type = 'info') {
    const el = typeof targetElement === 'string' ? document.querySelector(targetElement) : targetElement;
    if (!el) {
        if (import.meta.env.DEV) console.warn("displayMessage: Target element not found", targetElement);
        return;
    }
    el.textContent = message;
    // Assurer que les classes de base sont là et que les anciennes couleurs sont retirées
    el.className = 'text-sm mt-2';
    switch (type) {
        case 'success':
            el.classList.add('text-green-600');
            break;
        case 'error':
            el.classList.add('text-red-600');
            break;
        case 'info':
        default:
            el.classList.add('text-wud-secondary'); // Ou une autre couleur neutre
            break;
    }
}

/**
 * Gère l'état d'un bouton de soumission (texte, désactivation, indicateur de chargement).
 * @param {HTMLButtonElement|string} buttonElement - Le bouton ou son sélecteur.
 * @param {boolean} isLoading - True si l'état de chargement doit être activé.
 * @param {string} [loadingText='Chargement...'] - Texte à afficher pendant le chargement.
 */
export function setLoadingState(buttonElement, isLoading, loadingText = 'Chargement...') {
    const btn = typeof buttonElement === 'string' ? document.querySelector(buttonElement) : buttonElement;
    if (!btn) {
        if (import.meta.env.DEV) console.warn("setLoadingState: Button element not found", buttonElement);
        return;
    }

    if (isLoading) {
        // Sauvegarder le contenu HTML original seulement s'il n'est pas déjà un spinner
        if (!btn.dataset.originalContent && !btn.querySelector('svg.animate-spin')) {
            btn.dataset.originalContent = btn.innerHTML;
        }
        btn.innerHTML = `<svg class="animate-spin h-5 w-5 text-white mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> <span class="ml-2">${loadingText}</span>`;
        btn.disabled = true;
    } else {
        if (btn.dataset.originalContent) {
            btn.innerHTML = btn.dataset.originalContent;
            delete btn.dataset.originalContent; // Nettoyer l'attribut
        }
        btn.disabled = false;
    }
}

/**
 * Wrapper pour les console.log qui ne s'affichent qu'en mode DEV.
 * @param  {...any} args - Arguments à logger.
 */
export function devLog(...args) {
    if (import.meta.env.DEV) {
        console.log(...args);
    }
}

/**
 * Wrapper pour les console.warn qui ne s'affichent qu'en mode DEV.
 * @param  {...any} args - Arguments à logger.
 */
export function devWarn(...args) {
    if (import.meta.env.DEV) {
        console.warn(...args);
    }
}

/**
 * Wrapper pour les console.error. En DEV, loggue l'erreur complète. En PROD, loggue un message générique ou rien.
 * @param {string} contextMessage - Un message de contexte pour l'erreur.
 * @param {Error} errorObject - L'objet erreur.
 */
export function appError(contextMessage, errorObject) {
    if (import.meta.env.DEV) {
        console.error(`[APP ERROR] ${contextMessage}:`, errorObject);
    } else {
        // En production, on pourrait envoyer à un service de logging ou juste logguer un message simple.
        console.error(`[APP ERROR] ${contextMessage}. Voir les logs serveur pour détails.`);
    }
}

/**
 * Utility function to debounce calls to a function.
 * @param {Function} func - The function to debounce.
 * @param {number} wait - The number of milliseconds to delay.
 * @param {boolean} immediate - If true, trigger the function on the leading edge.
 * @returns {Function} The debounced function.
 */
export function debounce(func, wait, immediate) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            timeout = null;
            if (!immediate) func(...args);
        };
        const callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (callNow) func(...args);
    };
}
