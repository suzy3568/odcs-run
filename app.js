(() => {
  'use strict';
  const catalog = window.ODCS_CATALOG;
  const purchasable = catalog.flatMap(item => item.variants
    ? item.variants.filter(variant => variant.available).map(variant => ({ ...item, id: variant.id, size: variant.size }))
    : [item]);
  const product = catalog.find(item => item.id === document.body.dataset.productId) || catalog[0];
  const key = 'odcs-run-cart-v1';
  const money = value => '₩' + value.toLocaleString('ko-KR');
  const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const byId = id => document.getElementById(id);
  const getProduct = id => purchasable.find(p => p.id === id);
  const displayName = item => item.original === true ? item.name : String(item.name).toLocaleLowerCase('en-US');
  const displayColor = item => item.original === true ? item.color : String(item.color).toLocaleLowerCase('en-US');
  const productNameHeading = byId('product-name');
  if (productNameHeading && product.original !== true) {
    productNameHeading.textContent = productNameHeading.textContent.toLocaleLowerCase('en-US');
    document.title = productNameHeading.textContent + ' — ODCS RUN';
  }
  const menuToggle = document.querySelector('[data-toggle-menu]');
  const categoryMenu = byId('category-menu');
  function closeMenu() {
    if (!menuToggle || !categoryMenu) return;
    categoryMenu.hidden = true;
    menuToggle.setAttribute('aria-expanded', 'false');
  }
  menuToggle?.addEventListener('click', () => {
    const expanded = menuToggle.getAttribute('aria-expanded') === 'true';
    categoryMenu.hidden = expanded;
    menuToggle.setAttribute('aria-expanded', String(!expanded));
  });
  document.addEventListener('click', event => {
    if (!event.target.closest('.category-navigation')) closeMenu();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && menuToggle?.getAttribute('aria-expanded') === 'true') {
      closeMenu();
      menuToggle.focus();
    }
  });
  const shopProducts = byId('shop-products');
  if (shopProducts) {
    const params = new URLSearchParams(window.location.search);
    const collections = { original: 'ORIGINAL COLLECTION', 'symbol-bandana': 'SYMBOL BANDANA', 'symbol-cap': 'SYMBOL CAP' };
    const categories = { headwear: 'HEADWEAR', sunglasses: 'SUNGLASSES', top: 'TOP', bottom: 'BOTTOM', socks: 'SOCKS', accessories: 'ACCESSORIES', gear: 'RUNNING GEAR' };
    const collection = Object.hasOwn(collections, params.get('collection')) ? params.get('collection') : null;
    const category = Object.hasOwn(categories, params.get('category')) ? params.get('category') : null;
    const title = collection ? collections[collection] : category ? categories[category] : 'SHOP';
    const items = catalog.filter(item => {
      if (collection === 'original') return item.original === true;
      if (collection) return item.collection === collection;
      return category ? item.category === category : true;
    });
    byId('collection-title').textContent = title;
    document.title = title + ' — ODCS RUN';
    shopProducts.innerHTML = items.map(item => `<a class="product-card ${esc(item.cardClass || '')}" href="${esc(item.href)}"><div class="card-photo"><img src="${esc(item.image)}" alt="${esc(item.imageAlt || displayName(item))}" width="1086" height="1448" loading="lazy">${item.hoverImage ? `<img class="card-hover" src="${esc(item.hoverImage)}" alt="" width="1086" height="1448" loading="lazy">` : ''}</div><p class="card-brand">${esc(item.brand || 'ODCS RUN')}</p><h2>${esc(displayName(item))} (${esc(displayColor(item))})</h2><p>${item.listPrice && item.listPrice > item.price ? `<del>${money(item.listPrice)}</del> ` : ''}${money(item.price)}</p></a>`).join('');
    shopProducts.hidden = items.length === 0;
    byId('collection-empty').hidden = items.length > 0;
    const activeCategory = category || (items.length && items.every(item => item.category === items[0].category) ? items[0].category : null);
    document.querySelector(`[data-category="${activeCategory}"]`)?.setAttribute('aria-current', 'page');
  }
  const clampQuantity = value => Math.min(99, Math.max(1, Math.floor(Number(value) || 1)));
  let cart = [];
  let toastTimeout;
  let savedFocus;
  let activePhoto = 0;
  const photos = [...document.querySelectorAll('#main-image, .back-image')].map(img => ({src:img.getAttribute('src'),alt:img.alt}));
  function normalizeCart(data) {
    if (!Array.isArray(data)) return [];
    const items = new Map();
    for (const row of data) {
      if (!row || !getProduct(row.id) || !Number.isInteger(row.quantity) || row.quantity < 1) continue;
      items.set(row.id, { id: row.id, quantity: clampQuantity((items.get(row.id)?.quantity || 0) + row.quantity) });
    }
    return [...items.values()];
  }
  try { cart = normalizeCart(JSON.parse(localStorage.getItem(key) || '[]')); } catch { cart = []; }
  function toast(message) { const el = byId('toast'); el.textContent = message; el.classList.add('visible'); clearTimeout(toastTimeout); toastTimeout = setTimeout(() => el.classList.remove('visible'), 2800); }
  function count() { return cart.reduce((sum,row) => sum + row.quantity, 0); }
  function subtotal() { return cart.reduce((sum,row) => sum + getProduct(row.id).price * row.quantity, 0); }
  function persist() {
    try { localStorage.setItem(key, JSON.stringify(cart)); } catch { toast('이 브라우저에서는 장바구니가 새로고침 후 유지되지 않을 수 있습니다.'); }
    updateCount();
  }
  function updateCount() { byId('cart-count').textContent = count(); byId('drawer-count').textContent = count(); }
  function orderText() {
    const lines = ['[ODCS RUN 주문 문의]', '', ...cart.flatMap((row,i) => {
      const p = getProduct(row.id);
      return [`${i+1}. ${p.brand || 'ODCS RUN'} — ${displayName(p)}`, `색상: ${displayColor(p)} / 사이즈: ${p.size}`, `수량: ${row.quantity}개 / 단가: ${p.price.toLocaleString('ko-KR')}원`, `상품 금액: ${(p.price * row.quantity).toLocaleString('ko-KR')}원`, ''];
    }), `총 수량: ${count()}개`, `상품 합계: ${subtotal().toLocaleString('ko-KR')}원`, '배송비: 별도 안내', '', '재고, 실측 사이즈, 배송비를 포함한 최종 금액과 입금 계좌를 안내해주세요.'];
    return lines.join('\n');
  }
  function renderCart() {
    updateCount();
    if (!cart.length) {
      byId('cart-body').innerHTML = '<div class="empty-cart"><div class="empty-cart-symbol" aria-hidden="true">＋</div><h3>아직 담긴 상품이 없어요.</h3><p>마음에 드는 상품을 담고<br>ODCS RUN에 주문을 문의해보세요.</p><button class="button primary" data-continue>상품 보러 가기</button></div>';
      return;
    }
    byId('cart-body').innerHTML = cart.map(row => {
      const p = getProduct(row.id);
      const name = displayName(p);
      const color = displayColor(p);
      return `<article class="cart-item"><img src="${esc(p.image)}" alt="${esc(name+' '+color)}" width="96" height="128"><div><div class="cart-item-header"><h3>${esc(name)}</h3><button class="remove-item" data-remove="${esc(p.id)}" aria-label="${esc(name)} 삭제">삭제</button></div><p class="cart-options">${esc(color)} · ${esc(p.size)}</p><div class="cart-item-bottom"><div class="stepper"><button data-delta="-1" data-id="${esc(p.id)}" aria-label="${esc(name)} 수량 줄이기" ${row.quantity === 1 ? 'disabled' : ''}>−</button><input type="number" min="1" max="99" value="${row.quantity}" data-cart-quantity="${esc(p.id)}" aria-label="${esc(name)} 장바구니 수량" inputmode="numeric"><button data-delta="1" data-id="${esc(p.id)}" aria-label="${esc(name)} 수량 늘리기" ${row.quantity === 99 ? 'disabled' : ''}>+</button></div><span>${money(p.price * row.quantity)}</span></div></div></article>`;
    }).join('') + `<div class="cart-summary"><div class="subtotal"><span>상품 합계</span><strong>${money(subtotal())}</strong></div><div><span>배송비</span><span>DM에서 안내</span></div></div><p class="cart-notice">재고 확인 후 배송비를 포함한 최종 금액과 입금 방법을 안내해드립니다. 현재 단계에서는 주문이 확정되지 않습니다.</p><div class="order-preview"><label for="order-text">DM으로 보낼 주문 내용</label><textarea id="order-text" readonly spellcheck="false">${esc(orderText())}</textarea></div><div class="cart-actions"><button class="button primary" id="copy-order">1. 주문 내용 복사하기</button><a class="button secondary" href="https://ig.me/m/${esc(window.ODCS_INSTAGRAM)}" target="_blank" rel="noopener noreferrer" id="open-dm">2. 인스타그램 DM 열기 ↗</a></div><p class="copy-status" id="copy-status" role="status" aria-live="polite"></p><p class="dm-instruction">DM 입력창에 복사한 내용을 붙여넣고 직접 전송해주세요. 자동으로 발송되지는 않습니다.<br>DM이 열리지 않으면 <a href="https://www.instagram.com/${esc(window.ODCS_INSTAGRAM)}/" target="_blank" rel="noopener noreferrer"><u>@${esc(window.ODCS_INSTAGRAM)} 프로필</u></a>에서 메시지를 보내주세요.</p>`;
  }
  function openDialog(id) { savedFocus = document.activeElement; byId(id).showModal(); document.body.classList.add('modal-open'); }
  function closeDialog(id) { byId(id).close(); }
  for (const dialog of document.querySelectorAll('dialog')) {
    dialog.addEventListener('close', () => { if (!document.querySelector('dialog[open]')) document.body.classList.remove('modal-open'); if (savedFocus?.isConnected) savedFocus.focus(); });
    dialog.addEventListener('click', event => { if (event.target !== dialog) return; const r=dialog.getBoundingClientRect(); if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom) dialog.close(); });
  }
  document.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', () => closeDialog(button.dataset.close)));
  document.querySelectorAll('[data-open-cart]').forEach(button => button.addEventListener('click', () => {renderCart(); openDialog('cart-dialog');}));
  document.querySelectorAll('[data-open-guide]').forEach(button => button.addEventListener('click', () => openDialog('guide-dialog')));
  byId('guide-cart').addEventListener('click', () => { closeDialog('guide-dialog'); renderCart(); openDialog('cart-dialog'); });
  const quantity = byId('product-quantity');
  function updateQuantity(value) { if (!quantity) return; quantity.value = clampQuantity(value); byId('quantity-minus').disabled = Number(quantity.value)===1; byId('quantity-plus').disabled = Number(quantity.value)===99; }
  byId('quantity-minus')?.addEventListener('click', () => updateQuantity(Number(quantity.value)-1));
  byId('quantity-plus')?.addEventListener('click', () => updateQuantity(Number(quantity.value)+1));
  quantity?.addEventListener('change', () => updateQuantity(quantity.value));
  byId('add-to-cart')?.addEventListener('click', () => {
    const sizeField = byId('product-size');
    const selectedProduct = getProduct(sizeField ? sizeField.value : product.id);
    if (!selectedProduct) { toast('사이즈를 선택해주세요.'); sizeField?.focus(); return; }
    updateQuantity(quantity.value);
    const existing=cart.find(row => row.id===selectedProduct.id);
    const requested=(existing?.quantity || 0) + Number(quantity.value);
    if (existing) existing.quantity=clampQuantity(requested); else cart.push({id:selectedProduct.id,quantity:Number(quantity.value)});
    persist(); renderCart(); openDialog('cart-dialog');
    if (requested>99) toast('한 상품은 최대 99개까지 담을 수 있습니다.');
  });
  byId('cart-body').addEventListener('click', async event => {
    const button=event.target.closest('button'); if(!button) return;
    if (button.hasAttribute('data-continue')) { closeDialog('cart-dialog'); if (!quantity) location.href='shop.html'; return; }
    if (button.dataset.remove) { cart=cart.filter(row => row.id!==button.dataset.remove); persist(); renderCart(); byId('cart-dialog').querySelector('button').focus(); return; }
    if (button.dataset.delta) {
      const row=cart.find(row => row.id===button.dataset.id); if(!row) return;
      row.quantity=clampQuantity(row.quantity+Number(button.dataset.delta)); persist(); renderCart();
      byId('cart-body').querySelector(`[data-cart-quantity="${CSS.escape(row.id)}"]`)?.focus(); return;
    }
    if (button.id==='copy-order') {
      const field=byId('order-text'); let copied=false;
      try { if (navigator.clipboard && window.isSecureContext) { await navigator.clipboard.writeText(field.value); copied=true; } } catch {}
      if(!copied) { field.focus(); field.select(); try{copied=document.execCommand('copy');}catch{} }
      const status=byId('copy-status');
      if(copied) {button.textContent='복사 완료 ✓'; status.textContent='이제 DM을 열고 붙여넣어 전송해주세요.';}
      else {status.textContent='자동 복사가 되지 않았습니다. 위 주문 내용을 길게 눌러 복사해주세요.'; field.focus(); field.select();}
    }
  });
  byId('cart-body').addEventListener('change', event => {
    const id=event.target.dataset.cartQuantity; if(!id)return;
    const row=cart.find(row => row.id===id); if(!row)return;
    row.quantity=clampQuantity(event.target.value);persist();renderCart();
    byId('cart-body').querySelector(`[data-cart-quantity="${CSS.escape(id)}"]`)?.focus();
  });
  document.querySelectorAll('[data-photo]').forEach(button => button.addEventListener('click', () => {
    activePhoto=Number(button.dataset.photo);
    byId('main-image').src=photos[activePhoto].src;byId('main-image').alt=photos[activePhoto].alt;byId('photo-index').textContent=String(activePhoto+1).padStart(2,'0');
    document.querySelectorAll('[data-photo]').forEach(item=>{const selected=item===button;item.classList.toggle('selected',selected);item.setAttribute('aria-pressed',String(selected));});
  }));
  byId('zoom-image')?.addEventListener('click',()=>{byId('zoomed-image').src=photos[activePhoto].src;byId('zoomed-image').alt=photos[activePhoto].alt;openDialog('image-dialog');});
  window.addEventListener('storage', event=>{if(event.key!==key)return;try{cart=normalizeCart(JSON.parse(event.newValue||'[]'));updateCount();if(byId('cart-dialog').open)renderCart();}catch{}});
  updateQuantity(1);updateCount();
})();
