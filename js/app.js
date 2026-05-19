/* ============================================
   AlyC Beauty — App principale
   Chargement produits V2, filtres, recherche, tri
   Modal fiche produit avec variantes
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
    const resp = await fetch('data/products_v2.json');
    allProducts = await resp.json();
    allProducts.forEach(p => {
        p._minPrice = Math.min(...p.variantes.map(v => v.prix_public_mur || Infinity));
        p._defaultVariant = p.variantes[0];
    });
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
            const text = (p.nom + ' ' + p.categorie + ' ' + p.sous_categorie + ' ' + p.id_product).toLowerCase();
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
            sorted.sort((a, b) => a._minPrice - b._minPrice);
            break;
        case 'prix-desc':
            sorted.sort((a, b) => b._minPrice - a._minPrice);
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

    const hasVariants = product.variantes.length > 1;
    const defaultVar = product._defaultVariant;
    const prixMur = defaultVar.prix_public_mur || product._minPrice;
    const priceLabel = hasVariants
        ? `À partir de ${formatMUR(product._minPrice)}`
        : formatMUR(prixMur);

    card.innerHTML = `
        <div class="product-img-wrap">
            <img src="${product.image}" alt="${escapeHtml(product.nom)}" loading="lazy"
                 onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 200 200%22><rect fill=%22%23F5E6E6%22 width=%22200%22 height=%22200%22/><text x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 dy=%22.3em%22 fill=%22%23D4A5A5%22 font-size=%2214%22>Image non disponible</text></svg>'">
            ${hasVariants ? '<span class="variant-badge">' + product.variantes.length + ' options</span>' : ''}
        </div>
        <div class="product-info">
            <span class="product-subcat">${escapeHtml(product.sous_categorie)}</span>
            <p class="product-name">${escapeHtml(product.nom)}</p>
            <span class="product-ref">Réf. ${product.id_product}</span>
            <div class="product-bottom">
                <span class="product-price">${priceLabel} <small>MUR</small></span>
                <button class="add-btn" title="${hasVariants ? 'Choisir une option' : 'Ajouter au panier'}">+</button>
            </div>
        </div>
    `;

    card.querySelector('.product-img-wrap').addEventListener('click', () => openProductDetail(product));
    card.querySelector('.product-name').addEventListener('click', () => openProductDetail(product));

    card.querySelector('.add-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        if (hasVariants) {
            openProductDetail(product);
        } else {
            addToCartFromProduct(product, defaultVar);
            const btn = card.querySelector('.add-btn');
            btn.classList.add('added');
            btn.textContent = '✓';
            setTimeout(() => { btn.classList.remove('added'); btn.textContent = '+'; }, 800);
        }
    });

    return card;
}

function addToCartFromProduct(product, variant) {
    const cartItem = {
        id: variant.id_attribute && variant.id_attribute !== '0'
            ? product.id_product + '-' + variant.id_attribute
            : product.id_product,
        ref: product.id_product,
        nom: product.nom,
        volume: variant.volume || null,
        id_product: product.id_product,
        id_attribute: variant.id_attribute || '0',
        prix_mur: variant.prix_public_mur,
        image: product.image,
    };
    addToCart(cartItem);
}

/* ---- PRODUCT DETAIL MODAL ---- */

function openProductDetail(product) {
    const modal = document.getElementById('productDetailModal');
    const hasVariants = product.variantes.length > 1;
    let selectedIdx = 0;

    const v = product.variantes[selectedIdx];

    modal.querySelector('.pd-image').src = product.image;
    modal.querySelector('.pd-image').alt = product.nom;
    modal.querySelector('.pd-subcat').textContent = product.sous_categorie;
    modal.querySelector('.pd-name').textContent = product.nom;
    modal.querySelector('.pd-ref').textContent = 'Réf. ' + product.id_product;

    // Description
    const descEl = modal.querySelector('.pd-description');
    if (product.description) {
        const lines = product.description.split('\n');
        const short = lines.slice(0, 4).join('\n');
        const isTruncated = lines.length > 4;
        descEl.innerHTML = `<p class="pd-desc-text">${escapeHtml(short)}${isTruncated ? '...' : ''}</p>`;
        if (isTruncated) {
            descEl.innerHTML += `<button class="pd-desc-toggle" data-expanded="false">Voir plus</button>`;
            descEl.querySelector('.pd-desc-toggle').addEventListener('click', function() {
                const expanded = this.dataset.expanded === 'true';
                descEl.querySelector('.pd-desc-text').textContent = expanded ? short + '...' : product.description;
                this.textContent = expanded ? 'Voir plus' : 'Voir moins';
                this.dataset.expanded = expanded ? 'false' : 'true';
            });
        }
    } else {
        descEl.innerHTML = '';
    }

    // Features
    const featEl = modal.querySelector('.pd-features');
    if (product.features && Object.keys(product.features).length > 0) {
        const entries = Object.entries(product.features).slice(0, 8);
        featEl.innerHTML = '<h4>Caractéristiques</h4><dl class="pd-feat-list">' +
            entries.map(([k, val]) => `<dt>${escapeHtml(k)}</dt><dd>${escapeHtml(val)}</dd>`).join('') +
            '</dl>';
        if (Object.keys(product.features).length > 8) {
            featEl.innerHTML += `<button class="pd-feat-toggle" data-expanded="false">Voir toutes (${Object.keys(product.features).length})</button>`;
            featEl.querySelector('.pd-feat-toggle').addEventListener('click', function() {
                const expanded = this.dataset.expanded === 'true';
                const items = expanded ? entries : Object.entries(product.features);
                featEl.querySelector('.pd-feat-list').innerHTML =
                    items.map(([k, val]) => `<dt>${escapeHtml(k)}</dt><dd>${escapeHtml(val)}</dd>`).join('');
                this.textContent = expanded ? `Voir toutes (${Object.keys(product.features).length})` : 'Voir moins';
                this.dataset.expanded = expanded ? 'false' : 'true';
            });
        }
    } else {
        featEl.innerHTML = '';
    }

    // Ingredients
    const inciEl = modal.querySelector('.pd-ingredients');
    if (product.ingredients) {
        inciEl.innerHTML = `<h4>Ingrédients</h4><p class="pd-inci-text">${escapeHtml(product.ingredients)}</p>`;
    } else {
        inciEl.innerHTML = '';
    }

    // Variants
    const varEl = modal.querySelector('.pd-variants');
    if (hasVariants) {
        varEl.innerHTML = '<h4>Options disponibles</h4><div class="pd-var-options">' +
            product.variantes.map((vr, i) => {
                const label = vr.volume || ('Option ' + (i + 1));
                return `<button class="pd-var-btn${i === 0 ? ' active' : ''}" data-idx="${i}">${escapeHtml(label)}</button>`;
            }).join('') + '</div>';

        varEl.querySelectorAll('.pd-var-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                selectedIdx = parseInt(btn.dataset.idx);
                varEl.querySelectorAll('.pd-var-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                updateDetailPrice(product, selectedIdx, modal);
            });
        });
    } else {
        varEl.innerHTML = '';
    }

    updateDetailPrice(product, selectedIdx, modal);

    // Weight
    const weightEl = modal.querySelector('.pd-weight');
    const w = v.poids_kg;
    if (w && w > 0) {
        weightEl.textContent = w >= 1 ? w.toFixed(2) + ' kg' : Math.round(w * 1000) + ' g';
    } else {
        weightEl.textContent = '';
    }

    // Add to cart button
    const addBtn = modal.querySelector('.pd-add-btn');
    const newBtn = addBtn.cloneNode(true);
    addBtn.parentNode.replaceChild(newBtn, addBtn);
    newBtn.addEventListener('click', () => {
        addToCartFromProduct(product, product.variantes[selectedIdx]);
        newBtn.classList.add('added');
        newBtn.textContent = 'Ajouté !';
        setTimeout(() => { newBtn.classList.remove('added'); newBtn.textContent = 'Ajouter au panier'; }, 1200);
    });

    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
}

function updateDetailPrice(product, idx, modal) {
    const v = product.variantes[idx];
    const priceEl = modal.querySelector('.pd-price');
    priceEl.innerHTML = `${formatMUR(v.prix_public_mur)} <small>MUR</small>`;

    const weightEl = modal.querySelector('.pd-weight');
    if (v.poids_kg && v.poids_kg > 0) {
        weightEl.textContent = v.poids_kg >= 1 ? v.poids_kg.toFixed(2) + ' kg' : Math.round(v.poids_kg * 1000) + ' g';
    } else {
        weightEl.textContent = '';
    }
}

function closeProductDetail() {
    document.getElementById('productDetailModal').classList.remove('open');
    document.body.style.overflow = '';
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

    // Product detail modal close
    document.getElementById('closeProductDetail').addEventListener('click', closeProductDetail);
    document.getElementById('productDetailModal').addEventListener('click', (e) => {
        if (e.target === document.getElementById('productDetailModal')) closeProductDetail();
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
