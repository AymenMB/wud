import { customRequestAPI } from './api.js';
// getToken n'est plus nécessaire ici car customRequestAPI.submit le gère via apiRequest
import { displayMessage, setLoadingState, devLog, devWarn, appError } from './uiUtils.js';

// Helper function to convert file to base64
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

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
                // Create a new FileList with only the first 3 files
                const dt = new DataTransfer();
                files.forEach(file => dt.items.add(file));
                imageInput.files = dt.files;
            }

            files.forEach((file, index) => {
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
                    const previewDiv = document.createElement('div');
                    previewDiv.className = 'relative';
                    previewDiv.innerHTML = `
                        <img src="${e.target.result}" alt="Aperçu ${file.name}" class="h-24 w-full object-cover rounded-md border">
                        <button type="button" 
                                class="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 text-xs hover:bg-red-600 remove-image-btn" 
                                data-image-index="${index}">×</button>
                        <p class="text-xs text-gray-500 mt-1 truncate">${file.name}</p>
                    `;
                    previewsContainer.appendChild(previewDiv);
                    
                    // Add remove functionality
                    const removeBtn = previewDiv.querySelector('.remove-image-btn');
                    removeBtn.addEventListener('click', function() {
                        previewDiv.remove();
                        // Remove the file from the input
                        const dt = new DataTransfer();
                        const currentFiles = Array.from(imageInput.files);
                        currentFiles.forEach((f, i) => {
                            if (i !== index) dt.items.add(f);
                        });
                        imageInput.files = dt.files;
                        // Clear error message if any
                        if (messageDiv && messageDiv.className.includes('text-red-600')) {
                            displayMessage(messageDiv, '', 'info');
                        }
                    });
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
            
            // Collect inspiration images
            const imageFiles = imageInput ? imageInput.files : [];
            const inspirationImages = [];
            
            // Convert images to base64 for now (simple solution)
            if (imageFiles.length > 0) {
                for (let i = 0; i < Math.min(imageFiles.length, 3); i++) {
                    const file = imageFiles[i];
                    try {
                        const base64 = await fileToBase64(file);
                        inspirationImages.push({
                            url: base64,
                            caption: `Image d'inspiration ${i + 1}`,
                            fileName: file.name,
                            fileType: file.type,
                            fileSize: file.size
                        });
                    } catch (error) {
                        console.warn(`Erreur lors de la conversion de l'image ${file.name}:`, error);
                    }
                }
            }

            const requestData = {
                firstName: formData.get('firstName'),
                lastName: formData.get('lastName'),
                email: formData.get('email'),
                phoneNumber: formData.get('phoneNumber'),
                projectDescription: formData.get('projectDescription'),
                dimensions: formData.get('dimensions'),
                woodTypes: formData.get('woodTypes') ? formData.get('woodTypes').split(',').map(s => s.trim()).filter(s => s) : [],
                budgetRange: formData.get('budgetRange'),
                inspirationImages: inspirationImages
            };

            // Clean up empty optional fields
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
