/* ============================================
   AlyC Beauty — Soumission de commande
   Envoie vers Google Apps Script (webhook)
   Mode CORS avec fallback no-cors
   ============================================ */

// URL du Google Apps Script — à configurer après déploiement
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwwKjvhgMEd9up_ZfWG9eZ0t4ziAUW3uEsPGJukJKX60bcNOpszSAwyryrSBUj6t1E/exec';

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
        const volLabel = item.volume ? ' (' + escapeHtml(item.volume) + ')' : '';
        html += `
            <div class="order-summary-line">
                <span>${escapeHtml(item.nom)}${volLabel} × ${item.qty}</span>
                <span>${formatMUR(item.prix_mur * item.qty)} MUR HT</span>
            </div>
        `;
    });

    html += `
        <div class="order-summary-total">
            <span>Total estimé HT</span>
            <span>${formatMUR(getCartTotal())} MUR</span>
        </div>
    `;

    summary.innerHTML = html;
}

function generateOrderRef() {
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
            volume: item.volume || null,
            id_product: item.id_product || '',
            id_attribute: item.id_attribute || '0',
            prix_mur: item.prix_mur,
            qty: item.qty,
            total: item.prix_mur * item.qty,
        })),
        total_mur: getCartTotal(),
        nb_articles: getCartCount(),
    };

    let success = false;
    let serverRef = orderRef;

    if (APPS_SCRIPT_URL) {
        // Tentative 1 : mode CORS (permet de lire la réponse)
        try {
            const formData = new FormData();
            formData.append('payload', JSON.stringify(orderData));

            const response = await fetch(APPS_SCRIPT_URL, {
                method: 'POST',
                body: formData,
            });

            if (response.ok || response.type === 'opaqueredirect') {
                // Redirect 302 suivi automatiquement par le navigateur
                try {
                    const result = await response.json();
                    if (result.success) {
                        success = true;
                        serverRef = result.ref || orderRef;
                    } else {
                        console.error('Erreur serveur:', result.error);
                    }
                } catch {
                    // Réponse non-JSON mais HTTP OK = probablement OK
                    success = response.ok;
                }
            }
        } catch (corsErr) {
            console.warn('Mode CORS échoué, fallback no-cors:', corsErr.message);

            // Tentative 2 : fallback no-cors (fire & forget)
            try {
                const formData = new FormData();
                formData.append('payload', JSON.stringify(orderData));

                await fetch(APPS_SCRIPT_URL, {
                    method: 'POST',
                    mode: 'no-cors',
                    body: formData,
                });
                // En no-cors, pas de confirmation possible
                success = true;
            } catch (fallbackErr) {
                console.error('Échec complet envoi commande:', fallbackErr);
            }
        }
    } else {
        console.log('Mode démo — commande:', JSON.stringify(orderData, null, 2));
        success = true;
    }

    if (success) {
        document.getElementById('orderModal').classList.remove('open');

        document.getElementById('confirmRef').textContent = `Référence : ${serverRef}`;
        document.getElementById('confirmModal').classList.add('open');

        clearCart();
        document.getElementById('orderForm').reset();
    } else {
        alert('Une erreur est survenue. Veuillez réessayer ou nous contacter directement par WhatsApp.');
    }

    submitBtn.disabled = false;
    submitBtn.textContent = 'Envoyer ma commande';
}
