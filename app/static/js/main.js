const pageHeader = document.querySelector("header");
const syncHeaderBackground = () => {
  if (pageHeader) pageHeader.classList.toggle("is-scrolled", window.scrollY > 0);
};
syncHeaderBackground();
window.addEventListener("scroll", syncHeaderBackground, { passive: true });

const money = (n) => new Intl.NumberFormat("ru-RU").format(n) + " ₽";

const state = {
  screen: "start",
  mode: null,
  categories: [],
  activeCategory: null,
  openCategory: null,
  products: [],
  bundles: [],
  allBundles: [],
  featuredBundles: [],
  faqItems: [],
  tags: ["Все"],
  activeTag: "Все",
  build: {},
  selectedBundle: null,
  history: [],
  leadSent: false,
  leadFromHome: false,
  carouselIndex: 0,
  carouselImages: [],
};

const els = {
  topbar: document.getElementById("cfgTopbar"),
  back: document.getElementById("cfgBack"),
  bundleTags: document.getElementById("bundleTags"),
  bundleGrid: document.getElementById("bundleGrid"),
  catBar: document.getElementById("catBar"),
  productList: document.getElementById("productList"),
  checkoutPrice: document.getElementById("checkoutPrice"),
  checkoutList: document.getElementById("checkoutList"),
  formTier: document.getElementById("formTier"),
  featuredGrid: document.getElementById("featuredGrid"),
  faqList: document.getElementById("faqList"),
  contactDialog: document.getElementById("contactDialog"),
  leadDialog: document.getElementById("leadDialog"),
  leadDialogTier: document.getElementById("leadDialogTier"),
  diyCartBtn: document.getElementById("diyCartBtn"),
  diyCartCount: document.getElementById("diyCartCount"),
  diyOverlay: document.getElementById("diyOverlay"),
  diyOverlayTitle: document.getElementById("diyOverlayTitle"),
  diyOverlayClose: document.getElementById("diyOverlayClose"),
  cockpitStage: document.getElementById("cockpitStage"),
  leadDialogCarousel: document.getElementById("leadDialogCarousel"),
  leadCarouselTrack: document.getElementById("leadCarouselTrack"),
  leadCarouselPrev: document.getElementById("leadCarouselPrev"),
  leadCarouselNext: document.getElementById("leadCarouselNext"),
  leadCarouselDots: document.getElementById("leadCarouselDots"),
};

const PART_LABELS = {
  wheel: "Руль",
  base: "База",
  pedals: "Педали",
  shifter: "Шифтер",
  cockpit: "Кокпит",
  monitor: "Монитор",
  handbrake: "Ручник",
  accessories: "Аксессуары",
};

function buildList() {
  return Object.values(state.build).filter((p) => p && p.id != null);
}

function bundleCheckoutItems(bundle) {
  const items = (bundle?.products || []).map((p) => {
    const qty = Math.max(1, Number(p.qty) || 1);
    const unit = Number(p.price) || 0;
    return {
      ...p,
      name: qty > 1 ? `${p.name} × ${qty}` : p.name,
      price: unit * qty,
    };
  });
  const fieldWork = Math.max(0, Number(bundle?.field_work_price) || 0);
  if (fieldWork > 0) {
    items.push({
      id: null,
      sku: "FIELD-WORK",
      name: "Выездные работы",
      price: fieldWork,
      category: "service",
    });
  }
  return items;
}

const CAT_ICONS = {
  wheel: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2.5"/><path d="M12 5v3M12 16v3M5 12h3M16 12h3"/></svg>',
  base: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="5" y="8" width="14" height="10" rx="2"/><path d="M9 8V6h6v2"/><circle cx="12" cy="13" r="2"/></svg>',
  pedals: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="4" y="8" width="4" height="11" rx="1"/><rect x="10" y="5" width="4" height="14" rx="1"/><rect x="16" y="8" width="4" height="11" rx="1"/></svg>',
  shifter: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="8" y="15" width="8" height="5" rx="1"/><path d="M12 15V8l4-3"/><circle cx="16" cy="5" r="1.8" fill="currentColor"/></svg>',
  cockpit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 19l3-11h10l3 11"/><path d="M8 8V5h8v3"/><rect x="9" y="11" width="6" height="4" rx="0.5"/></svg>',
  monitor: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="4" width="18" height="12" rx="1.5"/><path d="M9 20h6M12 16v4"/></svg>',
  handbrake: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="7" y="16" width="10" height="4" rx="1"/><path d="M12 16L8 7"/><circle cx="7.5" cy="6.5" r="1.8" fill="currentColor"/></svg>',
  accessories: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M14.7 6.3a4 4 0 0 1 0 5.7l-5.7 5.7a2 2 0 0 1-2.8-2.8l5.7-5.7"/><path d="M12 8l4-4 3 3-4 4"/></svg>',
};

function syncTotals() {
  const n = buildList().length;
  if (els.diyCartCount) {
    els.diyCartCount.textContent = String(n);
    els.diyCartCount.classList.toggle("is-on", n > 0);
    els.diyCartCount.hidden = n === 0;
  }
  if (els.diyCartBtn) {
    els.diyCartBtn.classList.toggle("has-items", n > 0);
  }
}

function syncCockpit() {
  if (!els.cockpitStage) return;
  const focusSlug = state.openCategory || state.activeCategory;
  els.cockpitStage.querySelectorAll(".ck-part").forEach((el) => {
    const slug = el.dataset.part;
    const on = Boolean(state.build[slug]);
    el.classList.toggle("is-on", on);
    el.classList.toggle("is-focus", Boolean(focusSlug) && slug === focusSlug && !on);
  });
}

function animateCockpitPart(slug) {
  if (!els.cockpitStage) {
    syncCockpit();
    return;
  }
  const el = els.cockpitStage.querySelector(`.ck-part[data-part="${slug}"]`);
  syncCockpit();
  if (!el) return;
  el.classList.remove("is-flash");
  void el.offsetWidth;
  el.classList.add("is-flash");
  window.setTimeout(() => el.classList.remove("is-flash"), 280);
}

function bindCockpitClicks() {
  if (!els.cockpitStage || els.cockpitStage.dataset.bound) return;
  els.cockpitStage.dataset.bound = "1";
  els.cockpitStage.querySelectorAll(".ck-part").forEach((el) => {
    el.addEventListener("click", () => {
      const slug = el.dataset.part;
      if (!slug) return;
      toggleCategory(slug, true);
    });
  });
}

function syncOverlay() {
  if (!els.diyOverlay) return;
  const open = Boolean(state.openCategory);
  els.diyOverlay.hidden = !open;
  if (open && els.diyOverlayTitle) {
    els.diyOverlayTitle.textContent = PART_LABELS[state.openCategory] || state.openCategory;
  }
}

function showScreen(name, pushHistory = true) {
  if (pushHistory && state.screen !== name) state.history.push(state.screen);
  state.screen = name;
  const shell = document.getElementById("cfgApp");
  if (shell) {
    shell.classList.add("is-switching");
    window.setTimeout(() => shell.classList.remove("is-switching"), 450);
  }
  document.querySelectorAll(".cfg-screen").forEach((el) => {
    const on = el.dataset.screen === name;
    if (on) {
      el.classList.remove("active");
      void el.offsetWidth;
      el.classList.add("active");
    } else {
      el.classList.remove("active");
    }
  });
  const onStart = name === "start";
  if (els.topbar) els.topbar.hidden = onStart;
  els.back.hidden = onStart;
}

function goBack() {
  const prev = state.history.pop() || "start";
  showScreen(prev, false);
  syncTotals();
}

els.back.addEventListener("click", goBack);

function switchTab(name) {
  document.querySelectorAll("#mainTabs .tab").forEach((t) => {
    t.classList.toggle("active", t.dataset.tab === name);
  });
  document.querySelectorAll("[data-panel]").forEach((p) => {
    p.classList.toggle("active", p.id === `tab-${name}`);
  });
  window.scrollTo({ top: 0, behavior: "smooth" });
}

document.querySelectorAll("#mainTabs .tab").forEach((btn) => {
  btn.addEventListener("click", () => switchTab(btn.dataset.tab));
});

document.querySelectorAll("[data-goto]").forEach((btn) => {
  btn.addEventListener("click", () => switchTab(btn.dataset.goto));
});

document.getElementById("logoHome")?.addEventListener("click", (e) => {
  e.preventDefault();
  switchTab("home");
});

document.querySelectorAll("[data-scroll]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const el = document.querySelector(btn.dataset.scroll);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  });
});

document.getElementById("openContactModal").addEventListener("click", () => {
  els.contactDialog.showModal();
});

document.querySelectorAll(".cfg-branch").forEach((btn) => {
  btn.addEventListener("click", async () => {
    state.mode = btn.dataset.mode;
    if (state.mode === "presets") {
      await loadBundles();
      showScreen("presets");
    } else {
      if (!state.categories.length) await loadCategories();
      else {
        renderCats();
        syncOverlay();
      }
      bindCockpitClicks();
      syncCockpit();
      showScreen("diy");
    }
    syncTotals();
  });
});

async function loadCategories() {
  const res = await fetch("/api/categories");
  state.categories = await res.json();
  if (!state.activeCategory) state.activeCategory = state.categories[0]?.slug || null;
  renderCats();
  bindCockpitClicks();
  syncCockpit();
  syncOverlay();
  syncTotals();
}

async function toggleCategory(slug, forceOpen = false) {
  if (!forceOpen && state.openCategory === slug) {
    state.openCategory = null;
    renderCats();
    syncOverlay();
    syncCockpit();
    return;
  }
  state.openCategory = slug;
  state.activeCategory = slug;
  renderCats();
  syncOverlay();
  await loadProducts(slug);
  syncCockpit();
}

function closeOverlay() {
  state.openCategory = null;
  renderCats();
  syncOverlay();
  syncCockpit();
}

function renderCats() {
  if (!els.catBar) return;
  els.catBar.innerHTML = state.categories
    .map((c) => {
      const picked = Boolean(state.build[c.slug]);
      const open = state.openCategory === c.slug;
      const icon = CAT_ICONS[c.slug] || CAT_ICONS.accessories;
      return `<button type="button" class="diy-cat-btn ${open ? "is-open" : ""} ${picked ? "has-pick" : ""}" data-slug="${c.slug}" aria-label="${c.name}">
        ${icon}
        <span class="diy-dot" aria-hidden="true"></span>
        <span class="diy-tip">${c.name}</span>
      </button>`;
    })
    .join("");

  els.catBar.querySelectorAll(".diy-cat-btn").forEach((btn) => {
    btn.addEventListener("click", () => toggleCategory(btn.dataset.slug));
  });
}

async function loadProducts(category) {
  const res = await fetch(`/api/products?category=${encodeURIComponent(category)}`);
  state.products = await res.json();
  renderProducts();
}

function renderProducts() {
  if (!els.productList || !state.openCategory) return;
  const selected = state.build[state.openCategory];
  els.productList.innerHTML = state.products
    .map((p) => {
      const isSelected = selected && Number(selected.id) === Number(p.id);
      const img = p.image || `/static/img/products/${p.sku}.jpg`;
      return `<article class="cfg-product ${isSelected ? "is-selected" : ""}">
        <img class="cfg-product-photo" src="${img}" alt="" loading="lazy" width="56" height="42">
        <div>
          <div class="specs">${p.brand || ""}</div>
          <h4>${p.name}${p.badge ? ` <span class="cfg-badge">${p.badge}</span>` : ""}</h4>
          <div class="specs">${p.specs || ""}</div>
        </div>
        <div class="meta">
          <span class="price">${money(p.price)}</span>
          <button type="button" class="cfg-add ${isSelected ? "replace" : ""}" data-id="${p.id}">
            ${isSelected ? "Выбрано ✓" : "Добавить"}
          </button>
        </div>
      </article>`;
    })
    .join("");

  els.productList.querySelectorAll(".cfg-add").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const product = state.products.find((p) => String(p.id) === String(btn.dataset.id));
      if (!product) return;
      const cat = product.category || state.openCategory || state.activeCategory;
      const current = state.build[cat];
      if (current && Number(current.id) === Number(product.id)) {
        delete state.build[cat];
      } else {
        state.build[cat] = product;
      }
      state.selectedBundle = null;
      animateCockpitPart(cat);
      renderCats();
      renderProducts();
      syncTotals();
    });
  });
}

if (els.diyOverlayClose) {
  els.diyOverlayClose.addEventListener("click", closeOverlay);
}

if (els.diyOverlay) {
  els.diyOverlay.addEventListener("click", (e) => {
    if (e.target === els.diyOverlay) closeOverlay();
  });
}

if (els.diyCartBtn) {
  els.diyCartBtn.addEventListener("click", () => {
    const items = buildList();
    openLeadDialog({
      mode: "diy",
      tier: "Кастомная сборка",
      items,
      total: items.reduce((s, p) => s + p.price, 0),
    });
  });
}

async function loadBundles() {
  const [tagsRes, bundlesRes] = await Promise.all([
    fetch("/api/bundle-tags"),
    fetch(`/api/bundles?tag=${encodeURIComponent(state.activeTag)}`),
  ]);
  state.tags = await tagsRes.json();
  state.bundles = await bundlesRes.json();
  renderTags();
  renderBundles();
}

function bundleProductImages(bundle) {
  const seen = new Set();
  const images = [];
  for (const product of bundle?.products || []) {
    const url = product?.image;
    if (!url || seen.has(url)) continue;
    seen.add(url);
    images.push({ url, name: product.name || "" });
  }
  return images;
}

function carouselViewportEl() {
  return els.leadDialogCarousel?.querySelector(".lead-carousel-viewport") || null;
}

function carouselViewportWidth() {
  return carouselViewportEl()?.clientWidth || 0;
}

function updateCarouselTransform() {
  if (!els.leadCarouselTrack) return;
  const offset = state.carouselIndex * carouselViewportWidth();
  els.leadCarouselTrack.style.transform = `translateX(-${offset}px)`;
}

function setCarouselIndex(index) {
  const total = state.carouselImages.length;
  if (!total) return;
  state.carouselIndex = ((index % total) + total) % total;
  updateCarouselTransform();
  if (els.leadCarouselDots) {
    els.leadCarouselDots.querySelectorAll(".lead-carousel-dot").forEach((dot, i) => {
      dot.classList.toggle("is-active", i === state.carouselIndex);
      dot.setAttribute("aria-current", i === state.carouselIndex ? "true" : "false");
    });
  }
}

function renderLeadCarousel(images) {
  const carousel = els.leadDialogCarousel;
  const track = els.leadCarouselTrack;
  const dots = els.leadCarouselDots;
  const prev = els.leadCarouselPrev;
  const next = els.leadCarouselNext;
  state.carouselImages = Array.isArray(images) ? images : [];
  state.carouselIndex = 0;

  if (!carousel || !track) return;

  if (!state.carouselImages.length) {
    carousel.hidden = true;
    track.innerHTML = "";
    if (dots) {
      dots.innerHTML = "";
      dots.hidden = true;
    }
    if (prev) prev.hidden = true;
    if (next) next.hidden = true;
    return;
  }

  carousel.hidden = false;
  track.innerHTML = state.carouselImages
    .map(
      (img) => `<figure class="lead-carousel-slide"><img src="${img.url}" alt="${img.name}" loading="lazy"></figure>`
    )
    .join("");
  state.carouselIndex = 0;
  requestAnimationFrame(() => updateCarouselTransform());

  const showNav = state.carouselImages.length > 1;
  if (prev) prev.hidden = !showNav;
  if (next) next.hidden = !showNav;
  if (dots) {
    if (!showNav) {
      dots.innerHTML = "";
      dots.hidden = true;
    } else {
      dots.hidden = false;
      dots.innerHTML = state.carouselImages
        .map(
          (_, i) =>
            `<button type="button" class="lead-carousel-dot ${i === 0 ? "is-active" : ""}" data-index="${i}" aria-label="Фото ${i + 1}" aria-current="${i === 0 ? "true" : "false"}"></button>`
        )
        .join("");
      dots.querySelectorAll(".lead-carousel-dot").forEach((dot) => {
        dot.addEventListener("click", () => setCarouselIndex(Number(dot.dataset.index)));
      });
    }
  }
}

if (els.leadCarouselPrev) {
  els.leadCarouselPrev.addEventListener("click", () => setCarouselIndex(state.carouselIndex - 1));
}
if (els.leadCarouselNext) {
  els.leadCarouselNext.addEventListener("click", () => setCarouselIndex(state.carouselIndex + 1));
}

const carouselViewport = carouselViewportEl();
if (carouselViewport && typeof ResizeObserver !== "undefined") {
  const carouselResize = new ResizeObserver(() => updateCarouselTransform());
  carouselResize.observe(carouselViewport);
}

async function loadAllBundles() {
  const [allRes, featuredRes] = await Promise.all([
    fetch("/api/bundles"),
    fetch("/api/featured-bundles"),
  ]);
  state.allBundles = await allRes.json();
  state.featuredBundles = await featuredRes.json();
  renderFeatured();
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatFaqAnswer(text) {
  return escapeHtml(text).replace(/\n/g, "<br>");
}

async function loadFaq() {
  try {
    const res = await fetch("/api/faq");
    state.faqItems = await res.json();
  } catch (_) {
    state.faqItems = [];
  }
  renderFaq();
}

function renderFaq() {
  if (!els.faqList) return;
  const items = Array.isArray(state.faqItems) ? state.faqItems : [];
  if (!items.length) {
    els.faqList.innerHTML = `<p class="muted">Раздел в подготовке.</p>`;
    return;
  }
  els.faqList.innerHTML = items
    .map(
      (item) => `<details class="faq-item">
        <summary>${escapeHtml(item.question)}</summary>
        <div class="faq-answer">${formatFaqAnswer(item.answer)}</div>
      </details>`
    )
    .join("");
  setupFaqTransitions();
}

function setupFaqTransitions() {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  els.faqList.querySelectorAll(".faq-item").forEach((item) => {
    const summary = item.querySelector("summary");
    const answer = item.querySelector(".faq-answer");
    if (!summary || !answer || reduceMotion) return;

    summary.addEventListener("click", (event) => {
      event.preventDefault();

      item.getAnimations().forEach((animation) => animation.cancel());

      const isOpening = !item.open;
      const startHeight = item.offsetHeight;
      if (isOpening) item.open = true;

      const endHeight = isOpening
        ? summary.offsetHeight + answer.offsetHeight
        : summary.offsetHeight;

      item.style.overflow = "hidden";
      const animation = item.animate(
        { height: [`${startHeight}px`, `${endHeight}px`] },
        { duration: 300, easing: "cubic-bezier(0.22, 1, 0.36, 1)" }
      );

      animation.onfinish = () => {
        if (!isOpening) item.open = false;
        item.style.height = "";
        item.style.overflow = "";
      };

      animation.oncancel = () => {
        item.style.height = "";
        item.style.overflow = "";
      };
    });
  });
}

function renderFeatured() {
  if (!els.featuredGrid) return;
  const list = Array.isArray(state.featuredBundles) ? state.featuredBundles : [];
  if (!list.length) {
    els.featuredGrid.innerHTML = `<p class="muted" style="grid-column:1/-1;">Топ сборки пока не выбраны в админке.</p>`;
    return;
  }
  els.featuredGrid.innerHTML = list
    .map(
      (b) => `<button type="button" class="featured-card" data-id="${b.id}">
        <div class="tag">${b.filter_tag}${b.badge ? " · " + b.badge : ""}</div>
        <h3>${b.name}</h3>
        <p>${b.description}</p>
        <div class="price">${money(b.price)}</div>
      </button>`
    )
    .join("");

  els.featuredGrid.querySelectorAll(".featured-card").forEach((btn) => {
    btn.addEventListener("click", () => {
      const bundle =
        state.featuredBundles.find((b) => String(b.id) === String(btn.dataset.id)) ||
        state.allBundles.find((b) => String(b.id) === String(btn.dataset.id));
      if (!bundle) return;
      state.leadFromHome = true;
      state.selectedBundle = bundle;
      openLeadDialog({
        mode: "preset",
        tier: bundle.name,
        items: bundleCheckoutItems(bundle),
        total: bundle.price,
        images: bundleProductImages(bundle),
      });
    });
  });
}

function renderTags() {
  els.bundleTags.innerHTML = state.tags
    .map(
      (t) =>
        `<button type="button" class="cfg-tag ${t === state.activeTag ? "active" : ""}" data-tag="${t}">${t}</button>`
    )
    .join("");
  els.bundleTags.querySelectorAll(".cfg-tag").forEach((btn) => {
    btn.addEventListener("click", async () => {
      state.activeTag = btn.dataset.tag;
      const res = await fetch(`/api/bundles?tag=${encodeURIComponent(state.activeTag)}`);
      state.bundles = await res.json();
      renderTags();
      renderBundles();
    });
  });
}

function renderBundles() {
  els.bundleGrid.innerHTML = state.bundles
    .map((b) => {
      const active = state.selectedBundle && Number(state.selectedBundle.id) === Number(b.id);
      return `<button type="button" class="cfg-bundle ${active ? "is-selected" : ""}" data-id="${b.id}">
        <div class="tag">${b.filter_tag}${b.badge ? " · " + b.badge : ""}${active ? " · выбрано" : ""}</div>
        <h4>${b.name}</h4>
        <p>${b.description}</p>
        <div class="price">${money(b.price)}</div>
      </button>`;
    })
    .join("");

  els.bundleGrid.querySelectorAll(".cfg-bundle").forEach((btn) => {
    btn.addEventListener("click", () => {
      const bundle = state.bundles.find((b) => String(b.id) === String(btn.dataset.id));
      if (!bundle) return;
      if (state.selectedBundle && Number(state.selectedBundle.id) === Number(bundle.id)) {
        state.selectedBundle = null;
        renderBundles();
        syncTotals();
        return;
      }
      state.selectedBundle = bundle;
      state.leadFromHome = false;
      openLeadDialog({
        mode: "preset",
        tier: bundle.name,
        items: bundleCheckoutItems(bundle),
        total: bundle.price,
        images: bundleProductImages(bundle),
      });
      syncTotals();
    });
  });
}

function resetLeadForm() {
  const form = document.getElementById("leadForm");
  const errorEl = document.getElementById("formError");
  const successEl = document.getElementById("formSuccess");
  if (!form) return;
  form.reset();
  form.style.display = "";
  if (els.formTier && state._checkout?.tier) els.formTier.value = state._checkout.tier;
  const submitBtn = document.getElementById("leadSubmitBtn");
  if (submitBtn) {
    submitBtn.disabled = false;
    submitBtn.textContent = "Отправить заявку";
  }
  if (errorEl) {
    errorEl.classList.remove("show");
    errorEl.textContent = "";
  }
  if (successEl) successEl.classList.remove("show");
  state.leadSent = false;
}

function resetSimpleLeadForm() {
  const form = document.getElementById("simpleLeadForm");
  const errorEl = document.getElementById("simpleFormError");
  const successEl = document.getElementById("simpleFormSuccess");
  if (!form) return;
  form.reset();
  form.style.display = "";
  const submitBtn = document.getElementById("simpleSubmitBtn");
  if (submitBtn) {
    submitBtn.disabled = false;
    submitBtn.textContent = "Связаться с инженером";
  }
  if (errorEl) {
    errorEl.classList.remove("show");
    errorEl.textContent = "";
  }
  if (successEl) successEl.classList.remove("show");
}

function openLeadDialog({ mode, tier, items, total, images }) {
  state.mode = mode === "preset" ? "presets" : "diy";
  resetLeadForm();
  const list = items || [];
  const sum = total ?? list.reduce((s, p) => s + p.price, 0);
  if (els.leadDialogTier) els.leadDialogTier.textContent = tier;
  if (els.formTier) els.formTier.value = tier;
  if (els.checkoutPrice) els.checkoutPrice.textContent = money(sum);
  if (els.checkoutList) {
    els.checkoutList.innerHTML = list.length
      ? list.map((p) => `<li><span>${p.name}</span><span class="mono">${money(p.price)}</span></li>`).join("")
      : `<li><span>Пока пусто — выбери позиции в кокпите</span><span></span></li>`;
  }
  renderLeadCarousel(images);
  state._checkout = { mode, tier, items: list, total: sum };
  if (els.leadDialog) {
    els.leadDialog.showModal();
    requestAnimationFrame(() => updateCarouselTransform());
  }
}

if (els.leadDialog) {
  els.leadDialog.addEventListener("close", () => {
    if (state.leadFromHome) {
      state.selectedBundle = null;
      state.leadFromHome = false;
    }
    renderLeadCarousel([]);
  });
}

async function submitLead(payload, formEl, errorEl, successEl, submitBtn) {
  errorEl.classList.remove("show");
  errorEl.textContent = "";
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = "Отправка…";
  }
  try {
    const res = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    let data = {};
    try {
      data = await res.json();
    } catch (_) {
      data = {};
    }
    if (res.status === 429) {
      throw new Error(data.error || "Слишком много заявок. Попробуй позже.");
    }
    if (!res.ok || !data.ok) throw new Error(data.error || "Не удалось отправить");
    formEl.style.display = "none";
    successEl.classList.add("show");
    return true;
  } catch (err) {
    errorEl.textContent = err.message || "Ошибка отправки";
    errorEl.classList.add("show");
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = submitBtn.id === "simpleSubmitBtn" ? "Связаться с инженером" : "Отправить заявку";
    }
    return false;
  }
}

document.getElementById("leadForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const checkout = state._checkout || {
    mode: "diy",
    tier: els.formTier?.value || "Кастом",
    items: buildList(),
    total: buildList().reduce((s, p) => s + p.price, 0),
  };
  const ok = await submitLead(
    {
      name: document.getElementById("leadName").value.trim(),
      contact: document.getElementById("leadContact").value.trim(),
      tier: checkout.tier,
      mode: checkout.mode,
      total_price: checkout.total,
      build: (checkout.items || []).map((p) => ({
        id: p.id,
        sku: p.sku,
        name: p.name,
        price: p.price,
        category: p.category,
      })),
    },
    e.target,
    document.getElementById("formError"),
    document.getElementById("formSuccess"),
    document.getElementById("leadSubmitBtn")
  );
  if (ok) state.leadSent = true;
});

document.getElementById("simpleLeadForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  await submitLead(
    {
      name: document.getElementById("simpleName").value.trim(),
      contact: document.getElementById("simpleContact").value.trim(),
      tier: "Консультация",
      mode: "consult",
      total_price: 0,
      build: [],
    },
    e.target,
    document.getElementById("simpleFormError"),
    document.getElementById("simpleFormSuccess"),
    document.getElementById("simpleSubmitBtn")
  );
});

document.querySelectorAll("[data-again]").forEach((btn) => {
  btn.addEventListener("click", () => {
    if (btn.dataset.again === "simple") resetSimpleLeadForm();
    else resetLeadForm();
  });
});

// Telemetry
function genTrace(seedOffset) {
  let d = "M 0 60 ";
  for (let x = 0; x <= 1000; x += 20) {
    const y = 60 + Math.sin((x + seedOffset) / 38) * 22 + Math.sin((x + seedOffset) / 11) * 6;
    d += `L ${x} ${y.toFixed(1)} `;
  }
  return d;
}

let offset = 0;
const p1 = document.getElementById("tracePath");
const p2 = document.getElementById("tracePath2");
const val = document.getElementById("telemetryVal");
function animateTrace() {
  offset += 4;
  if (p1 && p2 && val) {
    p1.setAttribute("d", genTrace(offset));
    p2.setAttribute("d", genTrace(offset * 0.6 + 200));
    const nm = 13 + Math.sin(offset / 40) * 8 + Math.sin(offset / 13) * 2;
    val.textContent = nm.toFixed(1) + " Н·м";
  }
  requestAnimationFrame(animateTrace);
}
animateTrace();

const revealEls = document.querySelectorAll(".reveal");
const io = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) entry.target.classList.add("in");
    });
  },
  { threshold: 0.12 }
);
revealEls.forEach((el) => io.observe(el));

loadAllBundles().then(() => {
  showScreen("start", false);
  syncTotals();
});
loadFaq();
