/* ============================================
   AlyC Beauty — Gestion du panier (localStorage)
   Max 10 unités par produit/variante
   ============================================ */

const MAX_QTY = 10;
let cart = loadCart();

function loadCart() {
    try {
        return JSON.parse(localStorage.getItem('alycbeauty_cart')) || [];
    } catch {
        return [];
    }
}

function saveCart() {
    localStorage.setItem('alycbeauty_cart', JSON.stringify(cart));
    updateCartUI();
}

function addToCart(product) {
    const existing = cart.find(item => item.id === product.id);
    if (existing) {
        if (existing.qty < MAX_QTY) {
            existing.qty++;
        }
    } else {
        cart.push({
            id: product.id,
            ref: product.ref || product.id_product || product.id,
            nom: product.nom,
            volume: product.volume || null,
            id_product: product.id_product || '',
            id_attribute: product.id_attribute || '0',
            prix_mur: product.prix_mur,
            image: product.image,
            qty: 1,
        });
    }
    saveCart();
}

function removeFromCart(productId) {
    cart = cart.filter(item => item.id !== productId);
    saveCart();
}

function updateQty(productId, delta) {
    const item = cart.find(i => i.id === productId);
    if (!item) return;
    item.qty = Math.max(1, Math.min(MAX_QTY, item.qty + delta));
    saveCart();
}

function getCartTotal() {
    return cart.reduce((sum, item) => sum + item.prix_mur * item.qty, 0);
}

function getCartCount() {
    return cart.reduce((sum, item) => sum + item.qty, 0);
}

function clearCart() {
    cart = [];
    saveCart();
}

function updateCartUI() {
    const count = getCartCount();
    document.getElementById('cartCount').textContent = count;

    const itemsEl = document.getElementById('cartItems');
    const footerEl = document.getElementById('cartFooter');

    if (cart.length === 0) {
        itemsEl.innerHTML = '<p class="cart-empty">Votre panier est vide</p>';
        footerEl.style.display = 'none';
        return;
    }

    footerEl.style.display = 'block';
    document.getElementById('cartTotal').textContent = formatMUR(getCartTotal()) + ' MUR';

    itemsEl.innerHTML = cart.map(item => {
        const volumeTag = item.volume
            ? '<span class="cart-item-volume">' + escapeHtml(item.volume) + '</span>'
            : '';
        return `
        <div class="cart-item">
            <img class="cart-item-img" src="${item.image}" alt="${escapeHtml(item.nom)}"
                 onerror="this.style.display='none'">
            <div class="cart-item-info">
                <p class="cart-item-name">${escapeHtml(item.nom)}</p>
                ${volumeTag}
                <p class="cart-item-price">${formatMUR(item.prix_mur * item.qty)} MUR</p>
            </div>
            <div class="cart-item-qty">
                <button class="qty-btn" data-id="${item.id}" data-delta="-1">−</button>
                <span class="qty-val">${item.qty}</span>
                <button class="qty-btn" data-id="${item.id}" data-delta="1" ${item.qty >= MAX_QTY ? 'disabled' : ''}>+</button>
            </div>
            <button class="cart-item-remove" data-id="${item.id}" title="Retirer">✕</button>
        </div>
    `}).join('');

    itemsEl.querySelectorAll('.qty-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            updateQty(btn.dataset.id, parseInt(btn.dataset.delta));
        });
    });

    itemsEl.querySelectorAll('.cart-item-remove').forEach(btn => {
        btn.addEventListener('click', () => {
            removeFromCart(btn.dataset.id);
        });
    });
}

function openCart() {
    document.getElementById('cartPanel').classList.add('open');
    document.getElementById('cartOverlay').classList.add('open');
    document.body.style.overflow = 'hidden';
}

function closeCart() {
    document.getElementById('cartPanel').classList.remove('open');
    document.getElementById('cartOverlay').classList.remove('open');
    document.body.style.overflow = '';
}

// --- Event listeners ---
document.addEventListener('DOMContentLoaded', () => {
    updateCartUI();

    document.getElementById('cartBtn').addEventListener('click', openCart);
    document.getElementById('closeCart').addEventListener('click', closeCart);
    document.getElementById('cartOverlay').addEventListener('click', closeCart);
});
