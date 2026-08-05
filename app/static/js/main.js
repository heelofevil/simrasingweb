const money = (n) => new Intl.NumberFormat("ru-RU").format(n) + " ₽";
const FEATURED_SLUGS = ["legend-pro", "master-pro", "immersion-manual"];

const state = {
  screen: "start",
  mode: null,
  categories: [],
  activeCategory: null,
  openCategory: null,
  products: [],
  bundles: [],
  allBundles: [],
  tags: ["Все"],
  activeTag: "Все",
  build: {},
  selectedBundle: null,
  history: [],
  leadSent: false,
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
  contactDialog: document.getElementById("contactDialog"),
  leadDialog: document.getElementById("leadDialog"),
  leadDialogTier: document.getElementById("leadDialogTier"),
  diyCartBtn: document.getElementById("diyCartBtn"),
  diyCartCount: document.getElementById("diyCartCount"),
  diyOverlay: document.getElementById("diyOverlay"),
  diyOverlayTitle: document.getElementById("diyOverlayTitle"),
  diyOverlayClose: document.getElementById("diyOverlayClose"),
  cockpitStage: document.getElementById("cockpitStage"),
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
          <h4>${p.name}</h4>
          <div class="specs">${p.specs || ""}</div>
        </div>
        <div class="meta">
          ${p.badge ? `<span class="cfg-badge">${p.badge}</span>` : ""}
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

async function loadAllBundles() {
  const res = await fetch("/api/bundles");
  state.allBundles = await res.json();
  renderFeatured();
}

function renderFeatured() {
  if (!els.featuredGrid) return;
  const featured = FEATURED_SLUGS.map((slug) => state.allBundles.find((b) => b.slug === slug)).filter(Boolean);
  const list = featured.length === 3 ? featured : [...state.allBundles].sort((a, b) => b.price - a.price).slice(0, 3);
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
      const bundle = state.allBundles.find((b) => String(b.id) === String(btn.dataset.id));
      if (!bundle) return;
      switchTab("config");
      state.mode = "presets";
      state.selectedBundle = bundle;
      openLeadDialog({
        mode: "preset",
        tier: bundle.name,
        items: bundle.products,
        total: bundle.price,
      });
      syncTotals();
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
      openLeadDialog({
        mode: "preset",
        tier: bundle.name,
        items: bundle.products,
        total: bundle.price,
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
  if (errorEl) {
    errorEl.classList.remove("show");
    errorEl.textContent = "";
  }
  if (successEl) successEl.classList.remove("show");
  state.leadSent = false;
}

function openLeadDialog({ mode, tier, items, total }) {
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
  state._checkout = { mode, tier, items: list, total: sum };
  if (els.leadDialog) els.leadDialog.showModal();
}

async function submitLead(payload, formEl, errorEl, successEl) {
  errorEl.classList.remove("show");
  errorEl.textContent = "";
  try {
    const res = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok || !data.ok) throw new Error(data.error || "Не удалось отправить");
    formEl.style.display = "none";
    successEl.classList.add("show");
    return true;
  } catch (err) {
    errorEl.textContent = err.message || "Ошибка отправки";
    errorEl.classList.add("show");
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
    document.getElementById("formSuccess")
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
    document.getElementById("simpleFormSuccess")
  );
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
