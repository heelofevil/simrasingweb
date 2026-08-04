const money = (n) => new Intl.NumberFormat("ru-RU").format(n) + " ₽";
const FEATURED_SLUGS = ["legend-pro", "master-pro", "immersion-manual"];

const state = {
  screen: "start",
  mode: null,
  categories: [],
  activeCategory: null,
  products: [],
  bundles: [],
  allBundles: [],
  tags: ["Все"],
  activeTag: "Все",
  build: {},
  selectedBundle: null,
  history: [],
};

const els = {
  total: document.getElementById("cfgTotal"),
  back: document.getElementById("cfgBack"),
  bundleTags: document.getElementById("bundleTags"),
  bundleGrid: document.getElementById("bundleGrid"),
  catBar: document.getElementById("catBar"),
  productList: document.getElementById("productList"),
  buildItems: document.getElementById("buildItems"),
  buildSum: document.getElementById("buildSum"),
  buildContinue: document.getElementById("buildContinue"),
  checkoutLabel: document.getElementById("checkoutLabel"),
  checkoutPrice: document.getElementById("checkoutPrice"),
  checkoutList: document.getElementById("checkoutList"),
  formTier: document.getElementById("formTier"),
  featuredGrid: document.getElementById("featuredGrid"),
  contactDialog: document.getElementById("contactDialog"),
};

function buildList() {
  return Object.values(state.build);
}

function buildTotal() {
  if (state.selectedBundle && state.mode === "presets") return state.selectedBundle.price;
  return buildList().reduce((sum, p) => sum + p.price, 0);
}

function syncTotals() {
  els.total.textContent = money(buildTotal());
  els.buildSum.textContent = money(buildList().reduce((s, p) => s + p.price, 0));
  els.buildContinue.disabled = buildList().length === 0;
}

function showScreen(name, pushHistory = true) {
  if (pushHistory && state.screen !== name) state.history.push(state.screen);
  state.screen = name;
  document.querySelectorAll(".cfg-screen").forEach((el) => {
    el.classList.toggle("active", el.dataset.screen === name);
  });
  els.back.hidden = name === "start";
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
        await loadProducts(state.activeCategory);
        renderBuild();
      }
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
  if (state.activeCategory) await loadProducts(state.activeCategory);
  renderBuild();
}

function renderCats() {
  els.catBar.innerHTML = state.categories
    .map((c) => {
      const picked = Boolean(state.build[c.slug]);
      const active = c.slug === state.activeCategory;
      return `<button type="button" class="cfg-cat ${active ? "active" : ""} ${picked ? "has-pick" : ""}" data-slug="${c.slug}">${c.name}${picked ? " · ✓" : ""}</button>`;
    })
    .join("");
  els.catBar.querySelectorAll(".cfg-cat").forEach((btn) => {
    btn.addEventListener("click", async () => {
      state.activeCategory = btn.dataset.slug;
      renderCats();
      await loadProducts(state.activeCategory);
    });
  });
}

async function loadProducts(category) {
  const res = await fetch(`/api/products?category=${encodeURIComponent(category)}`);
  state.products = await res.json();
  renderProducts();
}

function renderProducts() {
  const selected = state.build[state.activeCategory];
  els.productList.innerHTML = state.products
    .map((p) => {
      const isSelected = selected && Number(selected.id) === Number(p.id);
      return `<article class="cfg-product ${isSelected ? "is-selected" : ""}">
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
      state.build[product.category || state.activeCategory] = product;
      state.selectedBundle = null;
      renderProducts();
      renderCats();
      renderBuild();
      syncTotals();
    });
  });
}

function renderBuild() {
  const items = buildList();
  if (!items.length) {
    els.buildItems.innerHTML = `<div class="cfg-build-empty">Выбери позиции по категориям</div>`;
    return;
  }
  els.buildItems.innerHTML = items
    .map(
      (p) => `<div class="cfg-build-row">
        <div>
          <div>${p.category_name || p.category}: ${p.name}</div>
          <div class="specs" style="color:var(--dim-2)">${money(p.price)}</div>
        </div>
        <button type="button" data-cat="${p.category}" aria-label="Удалить">✕</button>
      </div>`
    )
    .join("");

  els.buildItems.querySelectorAll("button[data-cat]").forEach((btn) => {
    btn.addEventListener("click", () => {
      delete state.build[btn.dataset.cat];
      renderBuild();
      renderCats();
      renderProducts();
      syncTotals();
    });
  });
}

els.buildContinue.addEventListener("click", () => {
  openCheckout({
    mode: "diy",
    tier: "Кастомная сборка",
    items: buildList(),
    total: buildList().reduce((s, p) => s + p.price, 0),
  });
});

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
      openCheckout({
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
      state.selectedBundle = bundle;
      openCheckout({
        mode: "preset",
        tier: bundle.name,
        items: bundle.products,
        total: bundle.price,
      });
      syncTotals();
    });
  });
}

function openCheckout({ mode, tier, items, total }) {
  state.mode = mode === "preset" ? "presets" : "diy";
  els.checkoutLabel.textContent = tier;
  els.checkoutPrice.textContent = money(total);
  els.formTier.value = tier;
  els.checkoutList.innerHTML = items
    .map((p) => `<li><span>${p.name}</span><span class="mono">${money(p.price)}</span></li>`)
    .join("");
  state._checkout = { mode, tier, items, total };
  showScreen("checkout");
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
  } catch (err) {
    errorEl.textContent = err.message || "Ошибка отправки";
    errorEl.classList.add("show");
  }
}

document.getElementById("leadForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const checkout = state._checkout || {
    mode: "diy",
    tier: els.formTier.value,
    items: buildList(),
    total: buildList().reduce((s, p) => s + p.price, 0),
  };
  await submitLead(
    {
      name: document.getElementById("leadName").value.trim(),
      contact: document.getElementById("leadContact").value.trim(),
      tier: checkout.tier,
      mode: checkout.mode,
      total_price: checkout.total,
      build: checkout.items.map((p) => ({
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
