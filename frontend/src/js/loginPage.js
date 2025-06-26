import { login } from './auth.js';
import { displayMessage, setLoadingState, devLog, devWarn } from './uiUtils.js';

function initLoginPage() {
    const loginForm = document.getElementById('login-form');
    const messageDiv = document.getElementById('login-message');
    const submitButton = loginForm ? loginForm.querySelector('button[type="submit"]') : null;

    if (loginForm && submitButton) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            displayMessage(messageDiv, '', 'info'); // Clear previous message

            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;

            if (!email || !password) {
                displayMessage(messageDiv, 'Veuillez remplir tous les champs.', 'error');
                return;
            }

            setLoadingState(submitButton, true, 'Connexion...');

            try {
                const result = await login(email, password); // login gère déjà son propre console.error
                if (result.success) {
                    devLog('Login successful, redirecting...');
                    window.location.href = '/';
                } else {
                    displayMessage(messageDiv, result.message || 'Échec de la connexion.', 'error');
                }
            } catch (error) {
                devLog("Login page caught raw error during login process:", error);
                displayMessage(messageDiv, 'Une erreur inattendue est survenue lors de la connexion.', 'error');
            } finally {
                setLoadingState(submitButton, false);
            }
        });
    } else {
        devWarn("Login form or submit button not found on login page.");
    }
}

if (document.getElementById('login-form')) {
    initLoginPage();
}
