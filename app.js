// Thingamagig (thingamagig.co.uk) Pro Storefront Logic
let products = [];
let cart = JSON.parse(localStorage.getItem('thingamagig_cart') || '[]');
let activeCategory = 'All';
let sortBy = 'trending';
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
const sortSelect = document.getElementById('sortSelect');

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    await loadCatalog();
    setupEventListeners();
    renderCategories();
    renderProducts();
    updateCartUI();
    registerServiceWorker();
    startDepotCountdown();
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
        console.warn('Fallback inventory loaded', e);
    }
}

function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js').catch(err => console.log('SW Registration error:', err));
    }
}

function startDepotCountdown() {
    const timerEl = document.getElementById('depotTimer');
    if (!timerEl) return;
    
    function update() {
        const now = new Date();
        const cutoff = new Date();
        cutoff.setHours(19, 30, 0, 0); // 7:30 PM cutoff for same-day gig dispatch
        
        let diff = cutoff - now;
        if (diff <= 0) {
            timerEl.textContent = 'Open for Late Gig Emergency Callout';
            return;
        }
        
        const hrs = Math.floor(diff / (1000 * 60 * 60));
        const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const secs = Math.floor((diff % (1000 * 60)) / 1000);
        timerEl.textContent = `${hrs}h ${mins}m ${secs}s left for tonight's gigs`;
    }
    update();
    setInterval(update, 1000);
}

function renderCategories() {
    const categories = ['All', 'Gig Bundles', 'Electric Strings', 'Acoustic Strings', 'Bass Strings', 'Sticks & Heads', 'Cables', 'Emergency Essentials'];
    categoryTabs.innerHTML = categories.map(cat => `
        <button onclick="setCategory('${cat}')" class="px-4 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all duration-200 ${activeCategory === cat ? 'bg-gradient-to-r from-coral to-indigo text-white shadow-lg shadow-coral/30 border border-coral/40' : 'glass-panel text-[#8B8FA3] hover:text-white hover:border-white/20'}">
            ${cat === 'Gig Bundles' ? '🔥 Gig Bundles' : cat}
        </button>
    `).join('');
}

window.setCategory = function(cat) {
    activeCategory = cat;
    renderCategories();
    renderProducts();
};

window.setSort = function(val) {
    sortBy = val;
    renderProducts();
};

window.filterSearch = function(q) {
    searchQuery = q.toLowerCase();
    renderProducts();
};

function renderProducts() {
    let filtered = products.filter(p => {
        const matchesCat = activeCategory === 'All' || p.category === activeCategory;
        const matchesSearch = p.name.toLowerCase().includes(searchQuery) ||
                              p.brand.toLowerCase().includes(searchQuery) ||
                              p.description.toLowerCase().includes(searchQuery) ||
                              p.category.toLowerCase().includes(searchQuery);
        return matchesCat && matchesSearch;
    });

    if (sortBy === 'price-low') {
        filtered.sort((a, b) => a.retailPrice - b.retailPrice);
    } else if (sortBy === 'price-high') {
        filtered.sort((a, b) => b.retailPrice - a.retailPrice);
    } else if (sortBy === 'savings') {
        filtered.sort((a, b) => ((b.originalPrice || b.retailPrice) - b.retailPrice) - ((a.originalPrice || a.retailPrice) - a.retailPrice));
    }

    if (filtered.length === 0) {
        productGrid.innerHTML = `
            <div class="col-span-full py-20 text-center text-[#8B8FA3]">
                <div class="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-center mx-auto mb-4 text-3xl text-coral-glow">
                    <i class="ph ph-magnifying-glass"></i>
                </div>
                <p class="text-xl font-extrabold text-white mb-1">No gig consumables match your search</p>
                <p class="text-sm">Try searching for string gauges (e.g. 10-46), 5A sticks, or tour cables.</p>
            </div>
        `;
        return;
    }

    productGrid.innerHTML = filtered.map(product => {
        const hasDiscount = product.originalPrice && product.originalPrice > product.retailPrice;
        const discountAmt = hasDiscount ? (product.originalPrice - product.retailPrice).toFixed(2) : 0;
        const isBundle = product.category === 'Gig Bundles';

        return `
            <div class="group relative rounded-2xl transition-all duration-300 flex flex-col h-full ${isBundle ? 'bg-gradient-to-b from-navy-mid via-navy-light to-navy border border-coral/40 shadow-xl shadow-coral/10 hover:border-coral hover:shadow-coral/25' : 'glass-panel hover:border-coral/50 hover:shadow-2xl hover:shadow-coral/15'} overflow-hidden">
                <!-- Visual Image Area -->
                <div class="aspect-square bg-navy relative overflow-hidden flex items-center justify-center p-6 border-b border-white/[0.06] cursor-pointer" onclick="openProductModal('${product.id}')">
                    <img src="https://placehold.co/400x400/${product.color}?text=${encodeURIComponent(product.imageText || product.sku)}&font=montserrat" alt="${product.name}" class="w-full h-full object-contain rounded-xl group-hover:scale-105 transition-transform duration-500">
                    
                    <!-- Badges -->
                    <div class="absolute top-3 left-3 flex flex-col gap-1.5">
                        <span class="bg-navy-mid/90 backdrop-blur-md border border-white/10 text-[10px] font-bold px-2.5 py-0.5 rounded-lg text-[#F0F0F5] uppercase tracking-wider">${product.category}</span>
                        ${isBundle ? `<span class="bg-gradient-to-r from-coral to-indigo text-white text-[10px] font-black px-2 py-0.5 rounded-lg uppercase tracking-wider shadow-md">SAVE £${discountAmt}</span>` : ''}
                    </div>

                    ${product.badge && !isBundle ? `
                        <span class="absolute top-3 right-3 bg-coral/90 backdrop-blur-md text-white text-[10px] font-extrabold px-2.5 py-0.5 rounded-lg uppercase tracking-wider shadow-md shadow-coral/30">
                            ${product.badge}
                        </span>
                    ` : ''}

                    <!-- Stock Indicator -->
                    <div class="absolute bottom-2.5 left-3 text-[11px] font-semibold text-[#8B8FA3] flex items-center gap-1.5 bg-navy/80 px-2 py-0.5 rounded-md border border-white/5">
                        <span class="w-2 h-2 rounded-full ${product.stock > 5 ? 'bg-mint' : 'bg-gold'} animate-pulse"></span>
                        <span class="${product.stock > 5 ? 'text-[#F0F0F5]' : 'text-gold'}">${product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}</span>
                    </div>

                    <!-- Quick View Overlay Action -->
                    <div class="absolute inset-0 bg-navy/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                        <span class="bg-white/10 backdrop-blur-md border border-white/20 text-white font-bold text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-lg">
                            <i class="ph ph-eye"></i> Musician Rig Note
                        </span>
                    </div>
                </div>

                <!-- Product Body Details -->
                <div class="p-5 flex flex-col flex-1 justify-between gap-4">
                    <div>
                        <div class="flex items-center justify-between text-xs mb-1">
                            <span class="text-coral-glow font-bold uppercase tracking-wider">${product.brand}</span>
                            <span class="text-[#4A4E63] font-mono">${product.sku}</span>
                        </div>
                        <h3 class="text-base font-extrabold text-white leading-snug mb-1.5 group-hover:text-coral-glow transition-colors line-clamp-2 cursor-pointer" onclick="openProductModal('${product.id}')">
                            ${product.name}
                        </h3>
                        <p class="text-xs text-[#8B8FA3] line-clamp-2 leading-relaxed mb-3">${product.description}</p>
                        
                        <!-- Musician Gig Wisdom Callout -->
                        ${product.gigNote ? `
                            <div class="bg-navy/80 p-2.5 rounded-xl border border-white/5 text-[11px] text-slate-300 flex items-start gap-2">
                                <i class="ph ph-speaker-high text-coral-glow text-sm flex-shrink-0 mt-0.5"></i>
                                <span class="italic text-[#8B8FA3] line-clamp-2">"${product.gigNote}"</span>
                            </div>
                        ` : ''}
                    </div>

                    <div>
                        <!-- Pricing Row -->
                        <div class="flex items-baseline gap-2 mb-3">
                            <span class="text-2xl font-black text-white">£${product.retailPrice.toFixed(2)}</span>
                            ${hasDiscount ? `<span class="text-xs text-[#8B8FA3] line-through font-semibold">£${product.originalPrice.toFixed(2)}</span>` : ''}
                        </div>

                        <!-- Add to Bag CTA -->
                        <div class="grid grid-cols-5 gap-2">
                            <button onclick="openProductModal('${product.id}')" class="col-span-1 glass-panel hover:bg-navy-mid text-[#8B8FA3] hover:text-white rounded-xl flex items-center justify-center transition" title="View Rig Specs & Gig Notes">
                                <i class="ph ph-info text-lg"></i>
                            </button>
                            <button onclick="addToCart('${product.id}')" ${product.stock === 0 ? 'disabled' : ''} class="col-span-4 ${product.stock === 0 ? 'bg-navy-mid text-[#4A4E63] cursor-not-allowed' : 'bg-gradient-to-r from-coral to-coral-dim hover:from-coral-glow hover:to-coral text-white shadow-md shadow-coral/20 hover:shadow-coral/40'} font-bold py-2.5 px-4 rounded-xl transition-all duration-200 flex justify-center items-center gap-2 text-xs sm:text-sm">
                                <i class="ph ph-shopping-bag font-bold text-base"></i> ${product.stock === 0 ? 'Backorder' : 'Add to Bag'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function setupEventListeners() {
    cartBtn.addEventListener('click', toggleCart);
    closeCartBtn.addEventListener('click', toggleCart);
    cartOverlay.addEventListener('click', toggleCart);

    if (searchInput) {
        searchInput.addEventListener('input', (e) => filterSearch(e.target.value));
    }
    if (sortSelect) {
        sortSelect.addEventListener('change', (e) => setSort(e.target.value));
    }

    const deliveryRadios = document.querySelectorAll('input[name="deliveryOption"]');
    deliveryRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            deliveryMethod = e.target.value;
            deliveryRadios.forEach(r => {
                const container = r.closest('label');
                if (r.checked) {
                    if (r.value === 'post') {
                        container.className = 'flex items-center justify-between p-3.5 border border-coral/60 bg-coral/10 rounded-xl cursor-pointer transition shadow-sm shadow-coral/10';
                    } else {
                        container.className = 'flex items-center justify-between p-3.5 border border-mint/60 bg-mint/10 rounded-xl cursor-pointer transition shadow-sm shadow-mint/10';
                    }
                } else {
                    container.className = 'flex items-center justify-between p-3.5 border border-navy-border bg-navy-light rounded-xl cursor-pointer transition opacity-80 hover:opacity-100';
                }
            });
            updateCartUI();
        });
    });
}

// Pre-Gig Checklist Quick Adder
window.addChecklistToBag = function() {
    const checkboxes = document.querySelectorAll('.gig-check:not(:checked)');
    if (checkboxes.length === 0) {
        showToast("Your gig bag is already fully stocked! Have a killer show! 🎸", 'success');
        return;
    }

    let addedCount = 0;
    checkboxes.forEach(cb => {
        const sku = cb.dataset.sku;
        const prod = products.find(p => p.sku === sku);
        if (prod) {
            addToCart(prod.id);
            addedCount++;
        }
    });

    showToast(`Added ${addedCount} missing emergency items to your gig bag!`, 'success');
    toggleCart();
};

window.addToCart = function(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    const existingItem = cart.find(item => item.id === productId);
    if (existingItem) {
        if (existingItem.quantity < product.stock) {
            existingItem.quantity += 1;
        } else {
            showToast(`Max available stock reached for ${product.name}`, 'warning');
            return;
        }
    } else {
        cart.push({ ...product, quantity: 1 });
    }

    saveCart();
    updateCartUI();
    showToast(`Added ${product.name} to Thingamagig bag`);
    
    cartBtn.classList.add('scale-110', 'text-coral-glow');
    setTimeout(() => cartBtn.classList.remove('scale-110', 'text-coral-glow'), 200);
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
            <div class="flex gap-3.5 bg-navy-light p-3.5 rounded-2xl border border-navy-border items-center hover:border-white/20 transition">
                <div class="w-14 h-14 bg-navy rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center border border-white/5">
                     <img src="https://placehold.co/100x100/${item.color}?text=${encodeURIComponent(item.imageText || item.sku)}&font=montserrat" alt="${item.name}" class="w-full h-full object-cover">
                </div>
                <div class="flex-1 min-w-0">
                    <h4 class="text-white font-extrabold text-xs truncate" title="${item.name}">${item.name}</h4>
                    <div class="flex items-baseline gap-2 mt-0.5">
                        <span class="text-coral-glow font-black text-sm">£${item.retailPrice.toFixed(2)}</span>
                        ${item.originalPrice ? `<span class="text-[11px] text-[#8B8FA3] line-through">£${item.originalPrice.toFixed(2)}</span>` : ''}
                    </div>
                    
                    <div class="flex items-center justify-between mt-2">
                        <div class="flex items-center bg-navy rounded-lg border border-navy-border">
                            <button onclick="updateQuantity('${item.id}', -1)" class="w-6 h-6 flex items-center justify-center text-[#8B8FA3] hover:text-white transition focus:outline-none">-</button>
                            <span class="w-6 text-center text-xs font-bold text-white">${item.quantity}</span>
                            <button onclick="updateQuantity('${item.id}', 1)" class="w-6 h-6 flex items-center justify-center text-[#8B8FA3] hover:text-white transition focus:outline-none">+</button>
                        </div>
                        <button onclick="removeFromCart('${item.id}')" class="text-xs text-[#8B8FA3] hover:text-coral underline transition">Remove</button>
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
        : 'FREE (South Wales Depot)';
    totalDisplay.textContent = `£${total.toFixed(2)}`;

    // Free shipping progress bar
    if (freeShippingMeter && freeShippingText) {
        if (subtotal >= FREE_SHIPPING_THRESHOLD) {
            freeShippingMeter.style.width = '100%';
            freeShippingText.innerHTML = '<span class="text-mint font-bold flex items-center gap-1"><i class="ph ph-check-circle"></i> Unlocked FREE UK Postal Delivery + Free Stage Picks!</span>';
        } else {
            const pct = Math.min(100, (subtotal / FREE_SHIPPING_THRESHOLD) * 100);
            freeShippingMeter.style.width = `${pct}%`;
            const gap = (FREE_SHIPPING_THRESHOLD - subtotal).toFixed(2);
            freeShippingText.innerHTML = `Add <strong class="text-coral-glow">£${gap}</strong> more for free UK delivery`;
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

window.openProductModal = function(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    const modalHtml = `
        <div id="productDetailModal" class="fixed inset-0 bg-black/85 z-[65] flex items-center justify-center p-4 backdrop-blur-md">
            <div class="glass-panel-elevated rounded-3xl max-w-2xl w-full p-6 text-[#F0F0F5] transform scale-95 animate-[slideUp_0.25s_ease-out_forwards] max-h-[90vh] overflow-y-auto border border-white/10 shadow-2xl">
                <div class="flex justify-between items-start pb-4 border-b border-navy-border mb-6">
                    <div>
                        <span class="text-xs text-coral-glow font-bold uppercase tracking-wider">${product.brand}</span>
                        <h2 class="text-xl sm:text-2xl font-black text-white">${product.name}</h2>
                        <span class="text-xs text-[#8B8FA3] font-mono">SKU: ${product.sku}</span>
                    </div>
                    <button onclick="document.getElementById('productDetailModal').remove()" class="text-[#8B8FA3] hover:text-white p-2 rounded-xl hover:bg-navy transition"><i class="ph ph-x text-2xl"></i></button>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div class="aspect-square bg-navy rounded-2xl flex items-center justify-center p-6 border border-white/5">
                        <img src="https://placehold.co/400x400/${product.color}?text=${encodeURIComponent(product.imageText || product.sku)}&font=montserrat" alt="${product.name}" class="w-full h-full object-contain rounded-xl">
                    </div>
                    
                    <div class="flex flex-col justify-between">
                        <div>
                            <div class="flex items-baseline gap-3 mb-3">
                                <span class="text-3xl font-black text-white">£${product.retailPrice.toFixed(2)}</span>
                                ${product.originalPrice ? `<span class="text-sm text-[#8B8FA3] line-through font-semibold">£${product.originalPrice.toFixed(2)}</span>` : ''}
                                <span class="bg-mint/10 text-mint text-xs font-bold px-2 py-0.5 rounded-lg border border-mint/20">In Stock (${product.stock} units)</span>
                            </div>
                            
                            <p class="text-xs text-[#8B8FA3] leading-relaxed mb-4">${product.description}</p>
                            
                            <!-- Musician Rig Note -->
                            ${product.gigNote ? `
                                <div class="bg-navy p-3.5 rounded-xl border border-coral/30 text-xs mb-4">
                                    <div class="text-coral-glow font-extrabold text-[11px] uppercase tracking-wider mb-1 flex items-center gap-1.5">
                                        <i class="ph ph-speaker-high"></i> Musician Rig Note:
                                    </div>
                                    <p class="text-[#F0F0F5] italic leading-relaxed text-xs">"${product.gigNote}"</p>
                                </div>
                            ` : ''}

                            <!-- Detailed Specs Breakdown -->
                            ${product.specs ? `
                                <div class="bg-navy p-3.5 rounded-xl border border-navy-border text-xs space-y-1.5 mb-4">
                                    <strong class="text-white block text-xs border-b border-navy-border pb-1">Stage Specifications:</strong>
                                    ${Object.entries(product.specs).map(([key, val]) => `
                                        <div class="flex justify-between"><span class="text-[#8B8FA3]">${key}:</span><strong class="text-white">${val}</strong></div>
                                    `).join('')}
                                </div>
                            ` : ''}
                        </div>

                        <button onclick="addToCart('${product.id}'); document.getElementById('productDetailModal').remove(); toggleCart();" class="w-full bg-gradient-to-r from-coral to-coral-dim hover:from-coral-glow hover:to-coral text-white font-extrabold py-3 rounded-xl transition shadow-lg shadow-coral/30 flex items-center justify-center gap-2">
                            <i class="ph ph-shopping-bag text-lg"></i> Add to Bag (£${product.retailPrice.toFixed(2)})
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
};

function showToast(message, type = 'success') {
    const toastContainer = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    const bgClass = type === 'warning' ? 'bg-gold text-navy font-bold' : 'bg-gradient-to-r from-coral to-indigo text-white font-semibold';
    toast.className = `${bgClass} px-5 py-3 rounded-2xl shadow-2xl text-xs sm:text-sm toast-enter flex items-center gap-2.5 pointer-events-auto border border-white/20`;
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
        <div id="checkoutModal" class="fixed inset-0 bg-black/85 z-[70] flex items-center justify-center p-4 backdrop-blur-md">
            <div class="glass-panel-elevated rounded-3xl max-w-lg w-full p-6 text-[#F0F0F5] transform scale-95 animate-[slideUp_0.2s_ease-out_forwards] max-h-[92vh] overflow-y-auto border border-white/10 shadow-2xl">
                <div class="flex justify-between items-center pb-4 border-b border-navy-border mb-5">
                    <h3 class="text-xl font-black text-white flex items-center gap-2">
                        <i class="ph ph-credit-card text-coral text-2xl"></i> Express Checkout
                    </h3>
                    <button onclick="document.getElementById('checkoutModal').remove()" class="text-[#8B8FA3] hover:text-white"><i class="ph ph-x text-2xl"></i></button>
                </div>
                
                <form id="checkoutForm" onsubmit="handlePlaceOrder(event)" class="space-y-4">
                    <div class="bg-navy p-4 rounded-2xl border border-navy-border text-xs flex justify-between items-center">
                        <div>
                            <span class="text-[#8B8FA3] block">Fulfillment Method:</span>
                            <strong class="text-white text-sm">${deliveryMethod === 'post' ? '📦 Royal Mail Tracked 24/48' : '📍 South Wales Depot 15-Min Collection'}</strong>
                        </div>
                        <div class="text-right">
                            <span class="text-[#8B8FA3] block text-[10px]">Total to Pay</span>
                            <span class="text-transparent bg-clip-text bg-gradient-to-r from-coral to-coral-glow font-black text-lg">£${total.toFixed(2)}</span>
                        </div>
                    </div>

                    <div>
                        <label class="block text-xs font-bold text-[#8B8FA3] mb-1">Customer / Act Name *</label>
                        <input type="text" id="custName" required placeholder="e.g. Nathan / The Green Tangerine" class="w-full bg-navy border border-navy-border rounded-xl px-3.5 py-2.5 text-white text-sm focus:border-coral focus:outline-none">
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label class="block text-xs font-bold text-[#8B8FA3] mb-1">Mobile Number (SMS Updates) *</label>
                            <input type="tel" id="custPhone" required placeholder="07700 900123" class="w-full bg-navy border border-navy-border rounded-xl px-3.5 py-2.5 text-white text-sm focus:border-coral focus:outline-none">
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-[#8B8FA3] mb-1">Email (Digital Receipt) *</label>
                            <input type="email" id="custEmail" required placeholder="nathan@thingamagig.co.uk" class="w-full bg-navy border border-navy-border rounded-xl px-3.5 py-2.5 text-white text-sm focus:border-coral focus:outline-none">
                        </div>
                    </div>

                    ${deliveryMethod === 'post' ? `
                        <div>
                            <label class="block text-xs font-bold text-[#8B8FA3] mb-1">Delivery Address *</label>
                            <textarea id="custAddress" required rows="2" placeholder="Street Address, Town, Postcode" class="w-full bg-navy border border-navy-border rounded-xl px-3.5 py-2.5 text-white text-sm focus:border-coral focus:outline-none"></textarea>
                        </div>
                    ` : `
                        <div class="p-4 bg-mint/10 border border-mint/30 rounded-2xl text-xs text-mint flex items-start gap-3">
                            <i class="ph ph-map-pin text-xl flex-shrink-0 mt-0.5"></i>
                            <div>
                                <strong class="block text-white">South Wales Depot (Rehearsal Base)</strong>
                                <span>Packed and staged in ~15 minutes. Show your SMS / Ref number on arrival.</span>
                            </div>
                        </div>
                    `}

                    <div>
                        <label class="block text-xs font-bold text-[#8B8FA3] mb-1">Gig Notes / Show Urgency (Optional)</label>
                        <input type="text" id="custNotes" placeholder="e.g. Gig tonight in Cardiff / Newport at 7pm" class="w-full bg-navy border border-navy-border rounded-xl px-3.5 py-2 text-white text-sm focus:border-coral focus:outline-none">
                    </div>

                    <div class="pt-2">
                        <button type="submit" class="w-full bg-gradient-to-r from-coral via-coral-glow to-indigo hover:opacity-95 text-white font-black py-3.5 rounded-2xl flex justify-center items-center gap-2 transition shadow-xl shadow-coral/30 text-base">
                            <i class="ph ph-check-circle text-xl"></i> Complete Order (£${total.toFixed(2)})
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

    const existingOrders = JSON.parse(localStorage.getItem('thingamagig_orders') || '[]');
    existingOrders.unshift(order);
    localStorage.setItem('thingamagig_orders', JSON.stringify(existingOrders));

    products.forEach(p => {
        const cartItem = cart.find(ci => ci.id === p.id);
        if (cartItem) {
            p.stock = Math.max(0, p.stock - cartItem.quantity);
        }
    });
    localStorage.setItem('thingamagig_catalog', JSON.stringify(products));

    cart = [];
    saveCart();
    updateCartUI();
    renderProducts();

    const checkoutModal = document.getElementById('checkoutModal');
    if (checkoutModal) checkoutModal.remove();
    toggleCart();

    const confirmationModal = `
        <div id="orderSuccessModal" class="fixed inset-0 bg-black/85 z-[80] flex items-center justify-center p-4 backdrop-blur-md">
            <div class="glass-panel-elevated rounded-3xl max-w-md w-full p-6 text-center text-[#F0F0F5] border border-coral/30 shadow-2xl">
                <div class="w-16 h-16 bg-gradient-to-tr from-coral to-indigo text-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-coral/30">
                    <i class="ph ph-confetti text-3xl"></i>
                </div>
                <h3 class="text-2xl font-black text-white mb-1">Order Confirmed!</h3>
                <p class="text-coral-glow font-mono text-sm font-bold mb-3">Ref: #${orderId}</p>
                <p class="text-[#8B8FA3] text-sm mb-6 leading-relaxed">
                    ${deliveryMethod === 'collect' 
                        ? 'Your items are being packed at the <strong>South Wales Depot</strong> and will be ready for pickup in 15 minutes.'
                        : 'Your parcel is in the queue and will dispatch via <strong>Royal Mail Tracked</strong>.'}
                </p>
                <div class="bg-navy p-4 rounded-2xl border border-navy-border text-left text-xs mb-6 space-y-1.5">
                    <div class="flex justify-between text-[#8B8FA3]"><span>Customer:</span><strong class="text-white">${order.customer.name}</strong></div>
                    <div class="flex justify-between text-[#8B8FA3]"><span>Total Paid:</span><strong class="text-coral-glow text-sm">£${total.toFixed(2)}</strong></div>
                    <div class="flex justify-between text-[#8B8FA3]"><span>Status:</span><span class="text-mint font-bold">${order.status}</span></div>
                </div>
                <button onclick="document.getElementById('orderSuccessModal').remove()" class="w-full bg-gradient-to-r from-coral to-indigo hover:opacity-95 text-white font-extrabold py-3.5 rounded-2xl transition shadow-lg shadow-coral/25">
                    Back to Thingamagig Store
                </button>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', confirmationModal);
};
