import { blogAPI } from './api.js';
import { devLog, appError } from './uiUtils.js';

let currentBlogPage = 1;
const BLOG_PAGE_SIZE = 6;
let currentBlogFilters = {
    category: null,
    tag: null,
    search: ''
};

function createPublicBlogPostCard(post) {
    const excerpt = post.excerpt || (post.content ? post.content.substring(0, 120) + '...' : 'Pas de contenu disponible.');
    const imageUrl = post.featuredImage?.url || `https://via.placeholder.com/400x250.png/A07C5B/FFFFFF?text=${encodeURIComponent(post.title.substring(0,10))}`;
    const imageAlt = post.featuredImage?.altText || post.title;
    const categoryName = post.category || 'Non classé';
    const publishedDate = new Date(post.publishedAt || post.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
    const authorName = (post.author && post.author.firstName) ? `${post.author.firstName} ${post.author.lastName || ''}`.trim() : 'L\'équipe Wud\'';


    return `
        <article class="group bg-white rounded-lg shadow-lg hover:shadow-2xl transition-shadow duration-300 overflow-hidden flex flex-col">
          <a href="/src/pages/blog-post.html?slug=${post.slug}" class="block">
            <img src="${imageUrl}" alt="${imageAlt}" class="w-full h-52 object-cover">
          </a>
          <div class="p-6 flex flex-col flex-grow">
            <div class="mb-2">
              <a href="/src/pages/blog.html?category=${encodeURIComponent(categoryName)}" class="text-xs font-semibold text-wud-accent hover:underline uppercase">${categoryName}</a>
            </div>
            <h2 class="text-xl font-semibold text-wud-primary mb-2 flex-grow">
              <a href="/src/pages/blog-post.html?slug=${post.slug}" class="group-hover:text-wud-accent transition-colors line-clamp-2">
                ${post.title}
              </a>
            </h2>
            <p class="text-sm text-gray-600 mb-3 leading-relaxed line-clamp-3">${excerpt}</p>
            <div class="mt-auto pt-3 border-t border-gray-100 text-xs text-wud-secondary">
              <span>Par ${authorName}</span> | <time datetime="${post.publishedAt || post.createdAt}">${publishedDate}</time>
            </div>
          </div>
        </article>
    `;
}

async function loadBlogPosts() {
    const postsContainer = document.getElementById('blog-list-container');
    const paginationContainer = document.querySelector('nav[aria-label="Pagination du Blog"] ul');
    const searchInput = document.getElementById('blog-search-input');

    if (!postsContainer || !paginationContainer) {
        devLog('Blog page: Essential elements for post listing not found.');
        return;
    }

    postsContainer.innerHTML = '<p class="col-span-full text-center py-10">Chargement des articles...</p>';
    paginationContainer.innerHTML = '';

    const params = {
        page: currentBlogPage,
        pageSize: BLOG_PAGE_SIZE,
        status: 'published'
    };
    if (currentBlogFilters.category) params.category = currentBlogFilters.category;
    if (currentBlogFilters.tag) params.tags = currentBlogFilters.tag;
    if (currentBlogFilters.search) params.search = currentBlogFilters.search;

    devLog("Loading blog posts with params:", params);
    try {
        const data = await blogAPI.getAllPosts(params); // API s'attend à `status` pour filtrer les publiés
        const { posts, count, pages } = data;

        if (posts && posts.length > 0) {
            postsContainer.innerHTML = posts.map(createPublicBlogPostCard).join('');
        } else {
            postsContainer.innerHTML = '<p class="col-span-full text-center text-wud-secondary py-10">Aucun article trouvé.</p>';
        }
        renderBlogPagination(pages || 0, currentBlogPage);
        if(searchInput && currentBlogFilters.search) searchInput.value = currentBlogFilters.search;

    } catch (error) {
        appError("Error loading blog posts", error);
        postsContainer.innerHTML = '<p class="col-span-full text-center text-red-500 py-10">Erreur lors du chargement des articles.</p>';
    }
}

function renderBlogPagination(totalPages, activePage) {
    const paginationContainer = document.querySelector('nav[aria-label="Pagination du Blog"] ul');
    if (!paginationContainer || totalPages <= 1) {
        if(paginationContainer) paginationContainer.innerHTML = '';
        return;
    }
    let paginationHTML = '';
    paginationHTML += `<li><a href="#" data-page="${activePage > 1 ? activePage - 1 : 1}" class="blog-pagination-link py-2 px-3 ml-0 leading-tight text-wud-secondary bg-white rounded-l-lg border border-gray-300 hover:bg-wud-gray-light hover:text-wud-primary ${activePage === 1 ? 'opacity-50 cursor-not-allowed' : ''}">Précédent</a></li>`;
    for (let i = 1; i <= totalPages; i++) {
        paginationHTML += `<li><a href="#" data-page="${i}" class="blog-pagination-link py-2 px-3 leading-tight border border-gray-300 ${i === activePage ? 'text-wud-primary bg-wud-gray-light hover:bg-wud-gray-dark hover:text-white' : 'text-wud-secondary bg-white hover:bg-wud-gray-light hover:text-wud-primary'}">${i}</a></li>`;
    }
    paginationHTML += `<li><a href="#" data-page="${activePage < totalPages ? activePage + 1 : totalPages}" class="blog-pagination-link py-2 px-3 leading-tight text-wud-secondary bg-white rounded-r-lg border border-gray-300 hover:bg-wud-gray-light hover:text-wud-primary ${activePage === totalPages ? 'opacity-50 cursor-not-allowed' : ''}">Suivant</a></li>`;
    paginationContainer.innerHTML = paginationHTML;
}

function attachBlogPageEventListeners() {
    const paginationContainer = document.querySelector('nav[aria-label="Pagination du Blog"] ul');
    if (paginationContainer) {
        paginationContainer.addEventListener('click', (e) => {
            e.preventDefault();
            const targetLink = e.target.closest('a.blog-pagination-link');
            if (targetLink && targetLink.dataset.page) {
                const page = parseInt(targetLink.dataset.page);
                if (page !== currentBlogPage && !targetLink.classList.contains('opacity-50')) {
                    currentBlogPage = page;
                    const url = new URL(window.location.href);
                    url.searchParams.set('page', currentBlogPage);
                    window.history.pushState({path:url.href}, '', url.href); // Mettre à jour l'URL
                    loadBlogPosts();
                }
            }
        });
    }

    const searchInput = document.getElementById('blog-search-input');
    if (searchInput) {
        const performSearch = () => {
            currentBlogFilters.search = searchInput.value.trim();
            currentBlogPage = 1;
            const url = new URL(window.location.href);
            if (currentBlogFilters.search) url.searchParams.set('search', currentBlogFilters.search);
            else url.searchParams.delete('search');
            url.searchParams.delete('page'); // Reset page on new search
            window.history.pushState({path:url.href}, '', url.href);
            loadBlogPosts();
        };
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                performSearch();
            }
        });
        // On pourrait ajouter un bouton search et/ou un debounce pour la recherche en direct.
    }
    // TODO: Gestion des filtres catégorie/tag si des éléments UI sont ajoutés.
}

export function initBlogPage() {
    // blog.html doit avoir <body id="blog-list-page">
    if (document.body.id === 'blog-list-page') {
        devLog('Initializing Blog List Page...');
        const urlParams = new URLSearchParams(window.location.search);
        currentBlogFilters.category = urlParams.get('category') || null;
        currentBlogFilters.tag = urlParams.get('tag') || null;
        currentBlogFilters.search = urlParams.get('search') || '';
        currentBlogPage = parseInt(urlParams.get('page')) || 1;

        loadBlogPosts();
        attachBlogPageEventListeners();
    }
}

