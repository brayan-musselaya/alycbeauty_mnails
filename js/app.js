/* ============================================
   AlyC Beauty — App principale
   Chargement produits, filtres, recherche, tri
   ============================================ */

const PRODUCTS_PER_PAGE = 40;
let allProducts = [];
let filteredProducts = [];
let displayedCount = 0;
let currentCategory = 'all';
let currentSubCategory = null;
let currentSearch = '';
let currentSort = 'nom';

async function loadProducts() {
    const resp = await fetch('data/products.json');
    allProducts = await resp.json();
    buildCategoryNav();
    applyFilters();
}

function buildCategoryNav() {
    const cats = {};
    allProducts.forEach(p => {
        if (!cats[p.categorie]) cats[p.categorie] = new Set();
        cats[p.categorie].add(p.sous_categorie);
    });

    const list = document.getElementById('categoryList');
    const sorted = Object.keys(cats).sort();

    sorted.forEach(cat => {
        const group = document.createElement('div');
        group.className = 'cat-group';

        const title = document.createElement('button');
        title.className = 'cat-group-title';
        title.textContent = cat;
        title.addEventListener('click', () => {
            const subs = group.querySelector('.cat-subcats');
            subs.classList.toggle('open');
            setCategory(cat, null);
        });

        const subcats = document.createElement('div');
        subcats.className = 'cat-subcats';

        const sortedSubs = [...cats[cat]].sort();
        sortedSubs.forEach(sub => {
            const btn = document.createElement('button');
            btn.className = 'subcat-btn';
            btn.textContent = sub;
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                setCategory(cat, sub);
            });
            subcats.appendChild(btn);
        });

        group.appendChild(title);
        group.appendChild(subcats);
        list.appendChild(group);
    });
}

function setCategory(cat, sub) {
    currentCategory = cat || 'all';
    currentSubCategory = sub;

    document.querySelectorAll('.cat-btn, .subcat-btn, .cat-group-title').forEach(b => b.classList.remove('active'));

    if (cat === 'all' || (!cat && !sub)) {
        document.querySelector('.cat-btn[data-category="all"]').classList.add('active');
    } else if (sub) {
        document.querySelectorAll('.subcat-btn').forEach(b => {
            if (b.textContent === sub) b.classList.add('active');
        });
        const group = [...document.querySelectorAll('.cat-group-title')].find(t => t.textContent === cat);
        if (group) group.parentElement.querySelector('.cat-subcats').classList.add('open');
    } else {
        const group = [...document.querySelectorAll('.cat-group-title')].find(t => t.textContent === cat);
        if (group) group.classList.add('active');
    }

    applyFilters();
    closeMobileSidebar();
}

function applyFilters() {
    let results = allProducts;

    if (currentCategory !== 'all') {
        results = results.filter(p => p.categorie === currentCategory);
        if (currentSubCategory) {
            results = results.filter(p => p.sous_categorie === currentSubCategory);
        }
    }

    if (currentSearch.length >= 2) {
        const terms = currentSearch.toLowerCase().split(/\s+/);
        results = results.filter(p => {
            const text = (p.nom + ' ' + p.categorie + ' ' + p.sous_categorie + ' ' + p.ref).toLowerCase();
            return terms.every(t => text.includes(t));
        });
    }

    results = sortProducts(results);
    filteredProducts = results;
    displayedCount = 0;
    document.getElementById('productsGrid').innerHTML = '';
    showMore();
    updateCount();
}

function sortProducts(products) {
    const sorted = [...products];
    switch (currentSort) {
        case 'nom':
            sorted.sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));
            break;
        case 'nom-desc':
            sorted.sort((a, b) => b.nom.localeCompare(a.nom, 'fr'));
            break;
        case 'prix':
            sorted.sort((a, b) => a.prix_mur - b.prix_mur);
            break;
        case 'prix-desc':
            sorted.sort((a, b) => b.prix_mur - a.prix_mur);
            break;
    }
    return sorted;
}

function showMore() {
    const grid = document.getElementById('productsGrid');
    const end = Math.min(displayedCount + PRODUCTS_PER_PAGE, filteredProducts.length);

    for (let i = displayedCount; i < end; i++) {
        grid.appendChild(createProductCard(filteredProducts[i]));
    }

    displayedCount = end;

    const btn = document.getElementById('loadMoreBtn');
    btn.style.display = displayedCount < filteredProducts.length ? 'inline-block' : 'none';
}

function createProductCard(product) {
    const card = document.createElement('div');
    card.className = 'product-card';

    const prixFormatted = formatMUR(product.prix_mur);

    card.innerHTML = `
        <div class="product-img-wrap">
            <img src="${product.image}" alt="${escapeHtml(product.nom)}" loading="lazy"
                 onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 200 200%22><rect fill=%22%23F5E6E6%22 width=%22200%22 height=%22200%22/><text x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 dy=%22.3em%22 fill=%22%23D4A5A5%22 font-size=%2214%22>Image non disponible</text></svg>'">
        </div>
        <div class="product-info">
            <span class="product-subcat">${escapeHtml(product.sous_categorie)}</span>
            <p class="product-name">${escapeHtml(product.nom)}</p>
            <span class="product-ref">Réf. ${product.ref}</span>
            <div class="product-bottom">
                <span class="product-price">${prixFormatted} <small>MUR</small></span>
                <button class="add-btn" data-id="${product.id}" title="Ajouter au panier">+</button>
            </div>
        </div>
    `;

    card.querySelector('.add-btn').addEventListener('click', () => {
        addToCart(product);
        const btn = card.querySelector('.add-btn');
        btn.classList.add('added');
        btn.textContent = '✓';
        setTimeout(() => {
            btn.classList.remove('added');
            btn.textContent = '+';
        }, 800);
    });

    return card;
}

function formatMUR(amount) {
    return amount.toLocaleString('fr-MU', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function escapeHtml(text) {
    const d = document.createElement('div');
    d.textContent = text;
    return d.innerHTML;
}

function updateCount() {
    document.getElementById('resultsCount').textContent =
        `${filteredProducts.length} produit${filteredProducts.length > 1 ? 's' : ''}`;
}

function closeMobileSidebar() {
    document.getElementById('sidebar').classList.remove('open');
}

// --- Event listeners ---
document.addEventListener('DOMContentLoaded', () => {
    loadProducts();

    document.getElementById('searchInput').addEventListener('input', (e) => {
        currentSearch = e.target.value.trim();
        applyFilters();
    });

    document.getElementById('sortSelect').addEventListener('change', (e) => {
        currentSort = e.target.value;
        applyFilters();
    });

    document.getElementById('loadMoreBtn').addEventListener('click', showMore);

    document.querySelector('.cat-btn[data-category="all"]').addEventListener('click', () => {
        setCategory('all', null);
    });

    // Mobile menu
    const menuBtn = document.createElement('button');
    menuBtn.className = 'menu-toggle';
    menuBtn.textContent = '☰ Catégories';
    menuBtn.addEventListener('click', () => {
        document.getElementById('sidebar').classList.toggle('open');
    });
    document.querySelector('.header-actions').prepend(menuBtn);
});
