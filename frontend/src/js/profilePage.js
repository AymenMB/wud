import { authAPI } from './api.js';
import { getCurrentUser, logout, updateUserUI as refreshAuthUI, protectPage } from './auth.js';
import { displayMessage, setLoadingState, appError, devWarn, devLog } from './uiUtils.js';

async function initProfilePage() {
    const profileForm = document.getElementById('profile-form');
    const messageDiv = document.getElementById('profile-message');
    const logoutButtonDashboard = document.getElementById('logout-button');
    const submitButton = profileForm ? profileForm.querySelector('button[type="submit"]') : null;

    async function loadProfileData() {
        devLog('Loading profile data...');
        const localUser = getCurrentUser();
        if (localUser && profileForm) {
            profileForm.elements['firstName'].value = localUser.firstName || '';
            profileForm.elements['lastName'].value = localUser.lastName || '';
            profileForm.elements['email'].value = localUser.email || '';
        }

        if(submitButton) setLoadingState(submitButton, true, "Chargement...");
        try {
            const fullProfile = await authAPI.getProfile();
            if (fullProfile && profileForm) {
                profileForm.elements['firstName'].value = fullProfile.firstName || '';
                profileForm.elements['lastName'].value = fullProfile.lastName || '';
                profileForm.elements['email'].value = fullProfile.email || '';
                profileForm.elements['phoneNumber'].value = fullProfile.phoneNumber || '';
                devLog('Profile data loaded and form populated.');
            }
        } catch (error) {
            appError("Failed to load full profile", error);
            displayMessage(messageDiv, "Erreur lors du chargement de votre profil.", 'error');
            if (error.status === 401) {
                devLog('Unauthorized, logging out and redirecting to login.');
                logout();
                window.location.href = '/src/pages/login.html';
            }
        } finally {
            if(submitButton) setLoadingState(submitButton, false);
        }
    }

    if (profileForm && submitButton) {
        loadProfileData();

        profileForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            displayMessage(messageDiv, '', 'info');

            const updatedData = {
                firstName: profileForm.elements['firstName'].value,
                lastName: profileForm.elements['lastName'].value,
                email: profileForm.elements['email'].value,
                phoneNumber: profileForm.elements['phoneNumber'].value,
            };

            const newPassword = profileForm.elements['newPassword'].value;
            const confirmNewPassword = profileForm.elements['confirmNewPassword'].value;

            if (newPassword) {
                if (newPassword.length < 6) {
                    displayMessage(messageDiv, 'Le nouveau mot de passe doit faire au moins 6 caractères.', 'error');
                    return;
                }
                if (newPassword !== confirmNewPassword) {
                    displayMessage(messageDiv, 'Les nouveaux mots de passe ne correspondent pas.', 'error');
                    return;
                }
                updatedData.password = newPassword;
            }

            setLoadingState(submitButton, true, 'Sauvegarde...');

            try {
                const response = await authAPI.updateProfile(updatedData);
                displayMessage(messageDiv, 'Profil mis à jour avec succès !', 'success');
                if(newPassword) {
                    profileForm.elements['newPassword'].value = '';
                    profileForm.elements['confirmNewPassword'].value = '';
                    if(profileForm.elements['currentPassword']) profileForm.elements['currentPassword'].value = '';
                }

                localStorage.setItem('wudUserInfo', JSON.stringify({
                    _id: response._id,
                    firstName: response.firstName,
                    lastName: response.lastName,
                    email: response.email,
                    role: response.role
                }));
                refreshAuthUI();
                devLog('Profile updated successfully.');

            } catch (error) {
                appError("Erreur lors de la mise à jour du profil", error);
                displayMessage(messageDiv, error.data?.message || error.message || 'Erreur lors de la mise à jour du profil.', 'error');
            } finally {
                setLoadingState(submitButton, false);
            }
        });
    } else {
        devWarn("Profile form or submit button not found on profile page.");
    }

    if (logoutButtonDashboard) {
        logoutButtonDashboard.addEventListener('click', (e) => {
            e.preventDefault();
            devLog('Logout button clicked.');
            logout();
            window.location.href = '/';
        });
    }
}

if (document.body.id === 'profile-page') {
    devLog('Profile page detected, checking auth...');
    if (protectPage('/src/pages/login.html')) {
        initProfilePage();
    }
}

export { initProfilePage };
