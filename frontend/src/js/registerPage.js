import { register } from './auth.js';
import { displayMessage, setLoadingState, devLog, devWarn } from './uiUtils.js';

function initRegisterPage() {
    const registerForm = document.getElementById('register-form');
    const messageDiv = document.getElementById('register-message');
    const submitButton = registerForm ? registerForm.querySelector('button[type="submit"]') : null;

    if (registerForm && submitButton) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            displayMessage(messageDiv, '', 'info');

            const firstName = document.getElementById('register-firstName').value;
            const lastName = document.getElementById('register-lastName').value;
            const email = document.getElementById('register-email').value;
            const password = document.getElementById('register-password').value;
            const confirmPassword = document.getElementById('register-confirmPassword').value;

            if (!firstName || !lastName || !email || !password || !confirmPassword) {
                displayMessage(messageDiv, 'Veuillez remplir tous les champs.', 'error');
                return;
            }

            if (password !== confirmPassword) {
                displayMessage(messageDiv, 'Les mots de passe ne correspondent pas.', 'error');
                return;
            }
            if (password.length < 6) {
                 displayMessage(messageDiv, 'Le mot de passe doit contenir au moins 6 caractères.', 'error');
                return;
            }

            setLoadingState(submitButton, true, 'Création...');

            try {
                const result = await register({ firstName, lastName, email, password });
                if (result.success) {
                    devLog('Registration successful, redirecting...');
                    window.location.href = '/';
                } else {
                    displayMessage(messageDiv, result.message || 'Échec de l\'inscription.', 'error');
                }
            } catch (error) {
                devLog("Register page caught raw error:", error);
                displayMessage(messageDiv, 'Une erreur inattendue est survenue.', 'error');
            } finally {
                setLoadingState(submitButton, false);
            }
        });
    } else {
        devWarn("Register form or submit button not found on register page.");
    }
}

if (document.getElementById('register-form')) {
    initRegisterPage();
}
