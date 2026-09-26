// Thingamagig (thingamagig.co.uk) Storefront Logic
let products = [];
let cart = JSON.parse(localStorage.getItem('thingamagig_cart') || '[]');
let activeCategory = 'All';
let searchQuery = '';
let deliveryMethod = 'post'; // 'post' or 'collect'
const POSTAL_FEE = 3.99;
const FREE_SHIPPING_THRESHOLD = 35.00;

// DOM Elements
const productGrid = document.getElementById('productGrid');
const cartBtn = document.getElementById('cartBtn');
const closeCartBtn = document.getElementById('closeCartBtn');
const cartOverlay = document.getElementById('cartOverlay');
const cartSidebar = document.getElementById('cartSidebar');
const cartBadge = document.getElementById('cartBadge');
const cartList = document.getElementById('cartList');
const emptyCartMessage = document.getElementById('emptyCartMessage');
const cartFooter = document.getElementById('cartFooter');
const subtotalDisplay = document.getElementById('subtotalDisplay');
const deliveryDisplay = document.getElementById('deliveryDisplay');
const totalDisplay = document.getElementById('totalDisplay');
const freeShippingMeter = document.getElementById('freeShippingMeter');
const freeShippingText = document.getElementById('freeShippingText');
const categoryTabs = document.getElementById('categoryTabs');
const searchInput = document.getElementById('searchInput');

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    await loadCatalog();
    setupEventListeners();
    renderCategories();
    renderProducts();
    updateCartUI();
    registerServiceWorker();
});

async function loadCatalog() {
    try {
        const res = await fetch('./catalog-data.json');
        if (res.ok) {
            products = await res.json();
            const customCatalog = localStorage.getItem('thingamagig_catalog');
            if (customCatalog) {
                products = JSON.parse(customCatalog);
            }
        }
    } catch (e) {
        console.warn('Could not load remote catalog, using fallback', e);
    }
}

function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js').catch(err => console.log('SW Registration error:', err));
    }
}

function renderCategories() {
    const categories = ['All', 'Electric Strings', 'Acoustic Strings', 'Bass Strings', 'Sticks & Heads', 'Cables', 'Emergency Essentials'];
    categoryTabs.innerHTML = categories.map(cat => `
        <button onclick="setCategory('${cat}')" class="px-4 py-2 rounded-full text-xs sm:text-sm font-semibold whitespace-nowrap transition-all ${activeCategory === cat ? 'bg-brand-500 text-white shadow-md shadow-brand-500/20' : 'bg-dark-800 text-slate-300 hover:bg-dark-700 border border-dark-700'}">
            ${cat}
        </button>
    `).join('');
}

window.setCategory = function(cat) {
    activeCategory = cat;
    renderCategories();
    renderProducts();
};

window.filterSearch = function(q) {
    searchQuery = q.toLowerCase();
    renderProducts();
};

function renderProducts() {
    const filtered = products.filter(p => {
        const matchesCat = activeCategory === 'All' || p.category === activeCategory;
        const matchesSearch = p.name.toLowerCase().includes(searchQuery) ||
                              p.brand.toLowerCase().includes(searchQuery) ||
                              p.description.toLowerCase().includes(searchQuery) ||
                              p.category.toLowerCase().includes(searchQuery);
        return matchesCat && matchesSearch;
    });

    if (filtered.length === 0) {
        productGrid.innerHTML = `
            <div class="col-span-full py-16 text-center text-slate-400">
                <i class="ph ph-magnifying-glass text-5xl opacity-30 mb-3 block"></i>
                <p class="text-lg font-semibold text-white">No gig essentials found matching your search</p>
                <p class="text-sm">Try another keyword or category filter.</p>
            </div>
        `;
        return;
    }

    productGrid.innerHTML = filtered.map(product => `
        <div class="group bg-dark-800 border border-dark-700 rounded-xl overflow-hidden hover:border-brand-500/50 transition-all duration-300 hover:shadow-[0_0_20px_rgba(249,115,22,0.15)] flex flex-col h-full">
            <div class="aspect-square bg-dark-900 relative overflow-hidden flex items-center justify-center p-6 border-b border-dark-700/60">
                <img src="https://placehold.co/400x400/${product.color}?text=${encodeURIComponent(product.imageText || product.sku)}&font=montserrat" alt="${product.name}" class="w-full h-full object-contain rounded-lg group-hover:scale-105 transition-transform duration-500">
                <span class="absolute top-3 left-3 bg-dark-900/90 backdrop-blur border border-dark-700 text-[11px] font-bold px-2 py-0.5 rounded text-slate-300 uppercase tracking-wider">${product.category}</span>
                ${product.badge ? `<span class="absolute top-3 right-3 bg-brand-500/90 backdrop-blur text-white text-[11px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">${product.badge}</span>` : ''}
                <div class="absolute bottom-2 left-3 text-[11px] text-slate-400">
                    <span class="inline-block w-2 h-2 rounded-full ${product.stock > 5 ? 'bg-emerald-500' : 'bg-amber-500'} mr-1"></span>
                    ${product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}
                </div>
            </div>
            <div class="p-5 flex flex-col flex-1 justify-between gap-4">
                <div>
                    <span class="text-xs text-brand-400 font-semibold tracking-wide uppercase">${product.brand}</span>
                    <h3 class="text-base font-bold text-white leading-snug mt-0.5 mb-1 group-hover:text-brand-400 transition-colors line-clamp-2">${product.name}</h3>
                    <p class="text-xs text-slate-400 line-clamp-2 leading-relaxed">${product.description}</p>
                </div>
                <div>
                    <div class="flex items-baseline justify-between mb-3">
                        <span class="text-2xl font-extrabold text-brand-500">£${product.retailPrice.toFixed(2)}</span>
                        <span class="text-[11px] text-slate-400">SKU: ${product.sku}</span>
                    </div>
                    <button onclick="addToCart('${product.id}')" ${product.stock === 0 ? 'disabled' : ''} class="w-full ${product.stock === 0 ? 'bg-dark-700 text-slate-500 cursor-not-allowed' : 'bg-dark-700 hover:bg-brand-500 text-white border border-dark-600 hover:border-brand-500 shadow-sm'} font-semibold py-2.5 rounded-lg transition-all flex justify-center items-center gap-2 text-sm">
                        <i class="ph ph-shopping-bag"></i> ${product.stock === 0 ? 'Backorder' : 'Add to Bag'}
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

function setupEventListeners() {
    cartBtn.addEventListener('click', toggleCart);
    closeCartBtn.addEventListener('click', toggleCart);
    cartOverlay.addEventListener('click', toggleCart);

    if (searchInput) {
        searchInput.addEventListener('input', (e) => filterSearch(e.target.value));
    }

    const deliveryRadios = document.querySelectorAll('input[name="deliveryOption"]');
    deliveryRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            deliveryMethod = e.target.value;
            deliveryRadios.forEach(r => {
                const container = r.closest('label');
                if (r.checked) {
                    container.classList.replace('border-dark-700', 'border-brand-500/60');
                    container.classList.replace('bg-dark-800', 'bg-brand-950/30');
                } else {
                    container.classList.replace('border-brand-500/60', 'border-dark-700');
                    container.classList.replace('bg-brand-950/30', 'bg-dark-800');
                }
            });
            updateCartUI();
        });
    });
}

window.addToCart = function(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    const existingItem = cart.find(item => item.id === productId);
    if (existingItem) {
        if (existingItem.quantity < product.stock) {
            existingItem.quantity += 1;
        } else {
            showToast(`Max stock reached for ${product.name}`, 'warning');
            return;
        }
    } else {
        cart.push({ ...product, quantity: 1 });
    }

    saveCart();
    updateCartUI();
    showToast(`Added ${product.name} to Thingamagig basket`);
    
    cartBtn.classList.add('scale-110', 'text-brand-500');
    setTimeout(() => cartBtn.classList.remove('scale-110', 'text-brand-500'), 200);
};

window.removeFromCart = function(productId) {
    cart = cart.filter(item => item.id !== productId);
    saveCart();
    updateCartUI();
};

window.updateQuantity = function(productId, change) {
    const item = cart.find(i => i.id === productId);
    if (item) {
        item.quantity += change;
        if (item.quantity <= 0) {
            removeFromCart(productId);
        } else {
            saveCart();
            updateCartUI();
        }
    }
};

function saveCart() {
    localStorage.setItem('thingamagig_cart', JSON.stringify(cart));
}

function updateCartUI() {
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    if (totalItems > 0) {
        cartBadge.textContent = totalItems;
        cartBadge.classList.remove('hidden');
    } else {
        cartBadge.classList.add('hidden');
    }

    if (cart.length === 0) {
        emptyCartMessage.classList.remove('hidden');
        cartList.classList.add('hidden');
        cartFooter.classList.add('opacity-50', 'pointer-events-none');
        if (freeShippingMeter) freeShippingMeter.style.width = '0%';
        if (freeShippingText) freeShippingText.textContent = `Add £${FREE_SHIPPING_THRESHOLD.toFixed(2)} for free UK delivery`;
    } else {
        emptyCartMessage.classList.add('hidden');
        cartList.classList.remove('hidden');
        cartList.classList.add('flex');
        cartFooter.classList.remove('opacity-50', 'pointer-events-none');
        
        cartList.innerHTML = cart.map(item => `
            <div class="flex gap-3 bg-dark-900 p-3 rounded-xl border border-dark-700 items-center">
                <div class="w-14 h-14 bg-dark-800 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center">
                     <img src="https://placehold.co/100x100/${item.color}?text=${encodeURIComponent(item.imageText || item.sku)}&font=montserrat" alt="${item.name}" class="w-full h-full object-cover">
                </div>
                <div class="flex-1 min-w-0">
                    <h4 class="text-white font-bold text-xs truncate" title="${item.name}">${item.name}</h4>
                    <p class="text-brand-500 font-extrabold text-xs mt-0.5">£${item.retailPrice.toFixed(2)}</p>
                    
                    <div class="flex items-center justify-between mt-2">
                        <div class="flex items-center bg-dark-800 rounded border border-dark-600">
                            <button onclick="updateQuantity('${item.id}', -1)" class="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-white transition focus:outline-none">-</button>
                            <span class="w-6 text-center text-xs font-bold text-white">${item.quantity}</span>
                            <button onclick="updateQuantity('${item.id}', 1)" class="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-white transition focus:outline-none">+</button>
                        </div>
                        <button onclick="removeFromCart('${item.id}')" class="text-xs text-slate-400 hover:text-red-400 underline transition">Remove</button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    const subtotal = cart.reduce((sum, item) => sum + (item.retailPrice * item.quantity), 0);
    let deliveryFee = 0;
    
    if (deliveryMethod === 'post') {
        if (subtotal >= FREE_SHIPPING_THRESHOLD || subtotal === 0) {
            deliveryFee = 0;
        } else {
            deliveryFee = POSTAL_FEE;
        }
    }

    const total = subtotal > 0 ? subtotal + deliveryFee : 0;

    subtotalDisplay.textContent = `£${subtotal.toFixed(2)}`;
    deliveryDisplay.textContent = deliveryMethod === 'post' 
        ? (deliveryFee === 0 && subtotal > 0 ? 'FREE (Over £35)' : `£${deliveryFee.toFixed(2)}`)
        : 'FREE (Depot Pickup)';
    totalDisplay.textContent = `£${total.toFixed(2)}`;

    // Free shipping progress bar
    if (freeShippingMeter && freeShippingText) {
        if (subtotal >= FREE_SHIPPING_THRESHOLD) {
            freeShippingMeter.style.width = '100%';
            freeShippingText.innerHTML = '<span class="text-emerald-400 font-bold">🎉 You qualify for FREE UK Postal Delivery!</span>';
        } else {
            const pct = Math.min(100, (subtotal / FREE_SHIPPING_THRESHOLD) * 100);
            freeShippingMeter.style.width = `${pct}%`;
            const gap = (FREE_SHIPPING_THRESHOLD - subtotal).toFixed(2);
            freeShippingText.innerHTML = `Add <strong class="text-brand-400">£${gap}</strong> more for free UK delivery`;
        }
    }
}

function toggleCart() {
    const isClosed = cartSidebar.classList.contains('translate-x-full');
    if (isClosed) {
        cartSidebar.classList.remove('translate-x-full');
        cartOverlay.classList.remove('hidden');
        setTimeout(() => cartOverlay.classList.remove('opacity-0'), 10);
        document.body.style.overflow = 'hidden';
    } else {
        cartSidebar.classList.add('translate-x-full');
        cartOverlay.classList.add('opacity-0');
        setTimeout(() => {
            cartOverlay.classList.add('hidden');
            document.body.style.overflow = '';
        }, 300);
    }
}

function showToast(message, type = 'success') {
    const toastContainer = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    const bgClass = type === 'warning' ? 'bg-amber-600' : 'bg-brand-500';
    toast.className = `${bgClass} text-white px-5 py-2.5 rounded-full font-medium shadow-lg text-sm toast-enter flex items-center gap-2 pointer-events-auto`;
    toast.innerHTML = `<i class="ph ${type === 'warning' ? 'ph-warning-circle' : 'ph-check-circle'} text-lg"></i> ${message}`;
    
    toastContainer.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(100%)';
        toast.style.transition = 'all 0.3s ease-in';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

window.openCheckoutModal = function() {
    if (cart.length === 0) return;
    const subtotal = cart.reduce((sum, item) => sum + (item.retailPrice * item.quantity), 0);
    const fee = deliveryMethod === 'post' ? (subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : POSTAL_FEE) : 0;
    const total = subtotal + fee;

    const modalHtml = `
        <div id="checkoutModal" class="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
            <div class="bg-dark-800 border border-dark-700 rounded-2xl max-w-lg w-full p-6 text-slate-200 transform scale-95 animate-[slideUp_0.2s_ease-out_forwards] max-h-[90vh] overflow-y-auto">
                <div class="flex justify-between items-center pb-4 border-b border-dark-700 mb-5">
                    <h3 class="text-xl font-bold text-white flex items-center gap-2">
                        <i class="ph ph-credit-card text-brand-500 text-2xl"></i> Complete Order
                    </h3>
                    <button onclick="document.getElementById('checkoutModal').remove()" class="text-slate-400 hover:text-white"><i class="ph ph-x text-2xl"></i></button>
                </div>
                
                <form id="checkoutForm" onsubmit="handlePlaceOrder(event)" class="space-y-4">
                    <div class="bg-dark-900 p-3.5 rounded-xl border border-dark-700 text-xs flex justify-between items-center">
                        <div>
                            <span class="text-slate-400 block">Fulfillment:</span>
                            <strong class="text-white text-sm">${deliveryMethod === 'post' ? '📦 UK Postal Delivery (Royal Mail)' : '📍 South Wales Depot Collection'}</strong>
                        </div>
                        <span class="text-brand-500 font-extrabold text-base">£${total.toFixed(2)}</span>
                    </div>

                    <div>
                        <label class="block text-xs font-semibold text-slate-400 mb-1">Customer / Band Name *</label>
                        <input type="text" id="custName" required placeholder="e.g. Nathan / The Great Unknown" class="w-full bg-dark-900 border border-dark-700 rounded-lg px-3 py-2 text-white text-sm focus:border-brand-500 focus:outline-none">
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label class="block text-xs font-semibold text-slate-400 mb-1">Mobile Number (SMS Updates) *</label>
                            <input type="tel" id="custPhone" required placeholder="07123 456789" class="w-full bg-dark-900 border border-dark-700 rounded-lg px-3 py-2 text-white text-sm focus:border-brand-500 focus:outline-none">
                        </div>
                        <div>
                            <label class="block text-xs font-semibold text-slate-400 mb-1">Email (Receipt) *</label>
                            <input type="email" id="custEmail" required placeholder="nathan@example.com" class="w-full bg-dark-900 border border-dark-700 rounded-lg px-3 py-2 text-white text-sm focus:border-brand-500 focus:outline-none">
                        </div>
                    </div>

                    ${deliveryMethod === 'post' ? `
                        <div>
                            <label class="block text-xs font-semibold text-slate-400 mb-1">Delivery Address *</label>
                            <textarea id="custAddress" required rows="2" placeholder="Street, Town, Postcode" class="w-full bg-dark-900 border border-dark-700 rounded-lg px-3 py-2 text-white text-sm focus:border-brand-500 focus:outline-none"></textarea>
                        </div>
                    ` : `
                        <div class="p-3 bg-brand-950/20 border border-brand-500/30 rounded-lg text-xs text-brand-300">
                            <strong>Collection Depot:</strong> South Wales Depot (Rehearsal Base). Ready for pickup in ~15 minutes upon confirmation.
                        </div>
                    `}

                    <div>
                        <label class="block text-xs font-semibold text-slate-400 mb-1">Gig Notes / Urgency (Optional)</label>
                        <input type="text" id="custNotes" placeholder="e.g. Soundcheck in Cardiff tonight at 6pm" class="w-full bg-dark-900 border border-dark-700 rounded-lg px-3 py-2 text-white text-sm focus:border-brand-500 focus:outline-none">
                    </div>

                    <div class="pt-2">
                        <button type="submit" class="w-full bg-brand-500 hover:bg-brand-600 text-white font-bold py-3 rounded-lg flex justify-center items-center gap-2 transition shadow-lg shadow-brand-500/20 text-base">
                            <i class="ph ph-check-circle text-xl"></i> Confirm & Submit Order (£${total.toFixed(2)})
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
};

window.handlePlaceOrder = function(e) {
    e.preventDefault();
    const orderId = 'TMG-' + Math.floor(100000 + Math.random() * 900000);
    const subtotal = cart.reduce((sum, item) => sum + (item.retailPrice * item.quantity), 0);
    const fee = deliveryMethod === 'post' ? (subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : POSTAL_FEE) : 0;
    const total = subtotal + fee;

    const order = {
        orderId,
        date: new Date().toISOString(),
        customer: {
            name: document.getElementById('custName').value,
            phone: document.getElementById('custPhone').value,
            email: document.getElementById('custEmail').value,
            address: deliveryMethod === 'post' ? document.getElementById('custAddress').value : 'Depot Collection (South Wales)',
            notes: document.getElementById('custNotes').value
        },
        deliveryMethod,
        items: [...cart],
        subtotal,
        deliveryFee: fee,
        total,
        status: deliveryMethod === 'collect' ? 'Ready for Collection' : 'Pending Packing'
    };

    // Save to shared orders store for Office Backend
    const existingOrders = JSON.parse(localStorage.getItem('thingamagig_orders') || '[]');
    existingOrders.unshift(order);
    localStorage.setItem('thingamagig_orders', JSON.stringify(existingOrders));

    // Deduct stock locally
    products.forEach(p => {
        const cartItem = cart.find(ci => ci.id === p.id);
        if (cartItem) {
            p.stock = Math.max(0, p.stock - cartItem.quantity);
        }
    });
    localStorage.setItem('thingamagig_catalog', JSON.stringify(products));

    // Clear cart
    cart = [];
    saveCart();
    updateCartUI();
    renderProducts();

    // Close modal & open success screen
    const checkoutModal = document.getElementById('checkoutModal');
    if (checkoutModal) checkoutModal.remove();
    toggleCart();

    const confirmationModal = `
        <div id="orderSuccessModal" class="fixed inset-0 bg-black/80 z-[70] flex items-center justify-center p-4 backdrop-blur-sm">
            <div class="bg-dark-800 border border-brand-500/40 rounded-2xl max-w-md w-full p-6 text-center text-slate-200">
                <div class="w-16 h-16 bg-brand-500/20 text-brand-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <i class="ph ph-confetti text-3xl"></i>
                </div>
                <h3 class="text-2xl font-extrabold text-white mb-1">Thingamagig Order Confirmed!</h3>
                <p class="text-brand-400 font-mono text-sm font-semibold mb-3">Ref: #${orderId}</p>
                <p class="text-slate-300 text-sm mb-6">
                    ${deliveryMethod === 'collect' 
                        ? 'Your items are being packed at the <strong>South Wales Depot</strong> and will be ready for pickup in 15 minutes.'
                        : 'Your parcel is in the fulfillment queue and will dispatch via <strong>Royal Mail Tracked</strong>.'}
                </p>
                <div class="bg-dark-900 p-4 rounded-xl border border-dark-700 text-left text-xs mb-6 space-y-1">
                    <div class="flex justify-between text-slate-400"><span>Customer:</span><strong class="text-white">${order.customer.name}</strong></div>
                    <div class="flex justify-between text-slate-400"><span>Total Paid:</span><strong class="text-brand-500 text-sm">£${total.toFixed(2)}</strong></div>
                    <div class="flex justify-between text-slate-400"><span>Status:</span><span class="text-emerald-400 font-bold">${order.status}</span></div>
                </div>
                <button onclick="document.getElementById('orderSuccessModal').remove()" class="w-full bg-brand-500 hover:bg-brand-600 text-white font-bold py-3 rounded-lg transition shadow-lg shadow-brand-500/20">
                    Back to Thingamagig
                </button>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', confirmationModal);
};
