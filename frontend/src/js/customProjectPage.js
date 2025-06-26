import { customRequestAPI } from './api.js';
// getToken n'est plus nécessaire ici car customRequestAPI.submit le gère via apiRequest
import { displayMessage, setLoadingState, devLog, devWarn, appError } from './uiUtils.js';

function initCustomProjectPage() {
    const form = document.getElementById('custom-project-form');
    const messageDiv = document.getElementById('form-message');
    const imageInput = document.getElementById('inspirationImages');
    const previewsContainer = document.getElementById('image-previews');
    const submitButton = form ? form.querySelector('button[type="submit"]') : null;

    if (imageInput && previewsContainer) {
        imageInput.addEventListener('change', function(event) {
            previewsContainer.innerHTML = '';
            const files = Array.from(event.target.files).slice(0, 3);

            if (event.target.files.length > 3) {
                displayMessage(messageDiv, 'Vous ne pouvez télécharger que 3 images au maximum.', 'error');
                imageInput.value = '';
            }

            files.forEach(file => {
                if (file.size > 5 * 1024 * 1024) {
                    displayMessage(messageDiv, `Le fichier ${file.name} est trop volumineux (max 5MB).`, 'error');
                    return;
                }
                if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
                    displayMessage(messageDiv, `Format non supporté pour ${file.name}. Utilisez PNG, JPG, ou WEBP.`, 'error');
                    return;
                }

                const reader = new FileReader();
                reader.onload = function(e) {
                    const imgElement = document.createElement('img');
                    imgElement.src = e.target.result;
                    imgElement.alt = `Aperçu ${file.name}`;
                    imgElement.className = 'h-24 w-full object-cover rounded-md border';
                    previewsContainer.appendChild(imgElement);
                }
                reader.readAsDataURL(file);
            });
        });
    }

    if (form && submitButton) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            displayMessage(messageDiv, '', 'info');

            const formData = new FormData(form);
            const requestData = {
                firstName: formData.get('firstName'),
                lastName: formData.get('lastName'),
                email: formData.get('email'),
                phoneNumber: formData.get('phoneNumber'),
                projectDescription: formData.get('projectDescription'),
                dimensions: formData.get('dimensions'),
                woodTypes: formData.get('woodTypes') ? formData.get('woodTypes').split(',').map(s => s.trim()).filter(s => s) : [],
                budgetRange: formData.get('budgetRange'),
                // inspirationImages: [] // La gestion des fichiers sera plus complexe (upload séparé ou multipart)
                                       // Pour l'instant, le backend ne les traite pas via JSON.
            };

            for (const key in requestData) {
                if (!requestData[key] && !['firstName', 'lastName', 'email', 'projectDescription'].includes(key)) {
                    delete requestData[key];
                }
            }

            const submitButton = form.querySelector('button[type="submit"]');
            const originalButtonText = submitButton.textContent;
            submitButton.innerHTML = `<svg class="animate-spin h-5 w-5 text-white mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Envoi...`;
            submitButton.disabled = true;

            try {
                const response = await customRequestAPI.submit(requestData);
                if (messageDiv) {
                    messageDiv.textContent = 'Votre demande a été envoyée avec succès ! Nous vous recontacterons bientôt.';
                    messageDiv.className = 'mt-4 text-sm text-green-600';
                }
                form.reset();
                if(previewsContainer) previewsContainer.innerHTML = '';
            } catch (error) {
                if (messageDiv) {
                    messageDiv.textContent = error.data?.message || error.message || 'Erreur lors de l\'envoi de la demande.';
                    messageDiv.className = 'mt-4 text-sm text-red-600';
                }
            } finally {
                submitButton.textContent = originalButtonText;
                submitButton.disabled = false;
            }
        });
    }
}

if (document.getElementById('custom-project-form')) {
    initCustomProjectPage();
}
