/* ============================================
   AlyC Beauty — Soumission de commande
   Envoie vers Google Apps Script (webhook)
   ============================================ */

// URL du Google Apps Script — à configurer après déploiement
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyciOvKbQLVkpRkQ-CTaOuU_nKypZmU_v_Z6hdP4q2AGtJl6ipZSvI1C5vk3X67VBE/exec';

document.addEventListener('DOMContentLoaded', () => {
    const checkoutBtn = document.getElementById('checkoutBtn');
    const orderModal = document.getElementById('orderModal');
    const closeModal = document.getElementById('closeModal');
    const orderForm = document.getElementById('orderForm');
    const confirmModal = document.getElementById('confirmModal');
    const closeConfirm = document.getElementById('closeConfirm');

    checkoutBtn.addEventListener('click', () => {
        closeCart();
        buildOrderSummary();
        orderModal.classList.add('open');
        document.body.style.overflow = 'hidden';
    });

    closeModal.addEventListener('click', () => {
        orderModal.classList.remove('open');
        document.body.style.overflow = '';
    });

    orderModal.addEventListener('click', (e) => {
        if (e.target === orderModal) {
            orderModal.classList.remove('open');
            document.body.style.overflow = '';
        }
    });

    closeConfirm.addEventListener('click', () => {
        confirmModal.classList.remove('open');
        document.body.style.overflow = '';
    });

    orderForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await submitOrder();
    });
});

function buildOrderSummary() {
    const summary = document.getElementById('orderSummary');
    let html = '<p class="order-summary-title">Récapitulatif</p>';

    cart.forEach(item => {
        html += `
            <div class="order-summary-line">
                <span>${escapeHtml(item.nom)} × ${item.qty}</span>
                <span>${formatMUR(item.prix_mur * item.qty)} MUR</span>
            </div>
        `;
    });

    html += `
        <div class="order-summary-total">
            <span>Total estimé</span>
            <span>${formatMUR(getCartTotal())} MUR</span>
        </div>
    `;

    summary.innerHTML = html;
}

function generateOrderRef() {
    // Genere une reference unique CMD-2026-XXXX
    // Format : CMD-ANNEE-MDHHMM (mois+jour+heure+minute pour unicite)
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hour = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');
    const sec = String(now.getSeconds()).padStart(2, '0');
    return `CMD-${year}-${month}${day}${hour}${min}${sec}`;
}

async function submitOrder() {
    const submitBtn = document.getElementById('submitBtn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Envoi en cours...';

    // Generer la reference AVANT l'envoi — meme ref pour le client et le Sheet
    const orderRef = generateOrderRef();

    const orderData = {
        timestamp: new Date().toISOString(),
        ref: orderRef,
        client: {
            nom: document.getElementById('clientName').value.trim(),
            whatsapp: document.getElementById('clientWhatsapp').value.trim(),
            email: document.getElementById('clientEmail').value.trim(),
            adresse: document.getElementById('clientAddress').value.trim(),
            notes: document.getElementById('clientNotes').value.trim(),
        },
        items: cart.map(item => ({
            id: item.id,
            ref: item.ref,
            nom: item.nom,
            prix_mur: item.prix_mur,
            qty: item.qty,
            total: item.prix_mur * item.qty,
        })),
        total_mur: getCartTotal(),
        nb_articles: getCartCount(),
    };

    let success = false;

    if (APPS_SCRIPT_URL) {
        try {
            const formData = new FormData();
            formData.append('payload', JSON.stringify(orderData));
            await fetch(APPS_SCRIPT_URL, {
                method: 'POST',
                mode: 'no-cors',
                body: formData,
            });
            success = true;
        } catch (err) {
            console.error('Erreur envoi commande:', err);
        }
    } else {
        console.log('Mode démo — commande:', JSON.stringify(orderData, null, 2));
        success = true;
    }

    if (success) {
        document.getElementById('orderModal').classList.remove('open');

        document.getElementById('confirmRef').textContent = `Référence : ${orderRef}`;
        document.getElementById('confirmModal').classList.add('open');

        clearCart();
        document.getElementById('orderForm').reset();
    } else {
        alert('Une erreur est survenue. Veuillez réessayer ou nous contacter directement par WhatsApp.');
    }

    submitBtn.disabled = false;
    submitBtn.textContent = 'Envoyer ma commande';
}
