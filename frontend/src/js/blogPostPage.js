import { blogAPI } from './api.js';
import { devLog, appError } from './uiUtils.js';

function displayBlogPost(post) {
    document.title = `${post.title} - Blog Wud'`;

    const breadcrumbTitle = document.getElementById('breadcrumb-post-title');
    if (breadcrumbTitle) breadcrumbTitle.textContent = post.title;

    const postTitleEl = document.getElementById('post-title');
    if (postTitleEl) postTitleEl.textContent = post.title;

    const postAuthorEl = document.getElementById('post-author');
    if (postAuthorEl && post.author) { // Vérifier si author est peuplé
        postAuthorEl.textContent = `${post.author.firstName || ''} ${post.author.lastName || ''}`.trim() || 'Auteur Wud\'';
        // postAuthorEl.href = `/author/${post.author._id}`; // Si on a une page auteur
    } else if (postAuthorEl) {
        postAuthorEl.textContent = 'L\'équipe Wud\'';
    }

    const postDateEl = document.getElementById('post-date');
    if (postDateEl) {
        const publishedDate = new Date(post.publishedAt || post.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
        postDateEl.textContent = publishedDate;
        if(postDateEl.tagName === 'TIME') postDateEl.dateTime = post.publishedAt || post.createdAt;
    }

    const postCategoryEl = document.getElementById('post-category');
    if (postCategoryEl && post.category) {
        postCategoryEl.textContent = post.category;
        postCategoryEl.href = `/src/pages/blog.html?category=${encodeURIComponent(post.category)}`;
    } else if (postCategoryEl) {
        postCategoryEl.textContent = 'Non classé';
        postCategoryEl.href = `/src/pages/blog.html`;
    }


    const postTagsContainer = document.getElementById('post-tags');
    if (postTagsContainer) {
        if (post.tags && post.tags.length > 0) {
            postTagsContainer.innerHTML = 'Tags: ' + post.tags.map(tag =>
                `<a href="/src/pages/blog.html?tag=${encodeURIComponent(tag)}" class="ml-1 bg-wud-gray-light text-wud-secondary px-2 py-0.5 rounded hover:bg-wud-accent hover:text-white">${tag}</a>`
            ).join('');
        } else {
            postTagsContainer.innerHTML = '';
        }
    }


    const featuredImageContainer = document.getElementById('post-featured-image-container');
    const featuredImageEl = document.getElementById('post-featured-image');
    if (featuredImageEl && featuredImageContainer) { // S'assurer que les deux existent
        if (post.featuredImage?.url) {
            featuredImageEl.src = post.featuredImage.url;
            featuredImageEl.alt = post.featuredImage.altText || post.title;
            featuredImageContainer.classList.remove('hidden');
        } else {
            featuredImageContainer.classList.add('hidden');
        }
    }


    const postContentEl = document.getElementById('post-content');
    if (postContentEl) {
        // IMPORTANT: Si le contenu est du HTML brut de l'admin, il faut le sanitizer côté client
        // avant de l'injecter avec innerHTML pour prévenir les attaques XSS.
        // Pour une version simple, on suppose que le HTML est sûr ou qu'on utilise Markdown converti en HTML sûr.
        // Si on utilise une librairie comme DOMPurify:
        // import DOMPurify from 'dompurify';
        // postContentEl.innerHTML = DOMPurify.sanitize(post.content);
        // Pour l'instant, injection directe (attention en production réelle):
        postContentEl.innerHTML = post.content;
    }
}

export async function initBlogPostPage() {
    // blog-post.html doit avoir <body id="blog-post-page">
    if (document.body.id === 'blog-post-page') {
        devLog('Initializing Blog Post Page...');
        const urlParams = new URLSearchParams(window.location.search);
        const slug = urlParams.get('slug');
        const mainContentArticle = document.querySelector('main.container article'); // Sélecteur plus précis

        if (!slug) {
            if(mainContentArticle) mainContentArticle.innerHTML = '<p class="text-center text-red-500 py-10">Aucun article spécifié.</p>';
            return;
        }

        // Cacher le contenu de l'article pendant le chargement
        if(mainContentArticle) mainContentArticle.style.opacity = '0.5';

        try {
            const post = await blogAPI.getPostBySlug(slug);
            if (post) {
                displayBlogPost(post);
            } else {
                if(mainContentArticle) mainContentArticle.innerHTML = '<p class="text-center text-red-500 py-10">Article non trouvé.</p>';
            }
        } catch (error) {
            appError("Error loading blog post", error);
            if(mainContentArticle) mainContentArticle.innerHTML = `<p class="text-center text-red-500 py-10">Erreur: ${error.message}</p>`;
        } finally {
            if(mainContentArticle) mainContentArticle.style.opacity = '1';
        }
    }
}

