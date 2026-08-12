(function () {
  const DRAFT_PREFIX = "pitline-admin-draft:";
  const LEAVE_MSG = "Есть несохранённые изменения. Уйти без сохранения?";

  function draftKey(form) {
    const key = form.getAttribute("data-draft-key");
    return key ? DRAFT_PREFIX + key : null;
  }

  function readDraft(form) {
    const key = draftKey(form);
    if (!key) return null;
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  }

  function writeDraft(form) {
    const key = draftKey(form);
    if (!key) return;
    const data = { savedAt: Date.now(), fields: {} };
    const fd = new FormData(form);
    for (const [name, value] of fd.entries()) {
      if (value instanceof File) continue;
      if (Object.prototype.hasOwnProperty.call(data.fields, name)) {
        const cur = data.fields[name];
        data.fields[name] = Array.isArray(cur) ? cur.concat(value) : [cur, value];
      } else {
        data.fields[name] = value;
      }
    }
    form.querySelectorAll('input[type="checkbox"][name]').forEach((el) => {
      if (!el.checked && !(el.name in data.fields)) data.fields[el.name] = "";
    });
    localStorage.setItem(key, JSON.stringify(data));
    const hint = form.querySelector(".js-draft-hint");
    if (hint) {
      hint.hidden = false;
      hint.textContent = "Черновик сохранён";
    }
  }

  function clearDraft(form) {
    const key = draftKey(form);
    if (key) localStorage.removeItem(key);
    const hint = form.querySelector(".js-draft-hint");
    if (hint) hint.hidden = true;
    const bar = form.querySelector(".draft-bar");
    if (bar) bar.hidden = true;
  }

  function applyDraft(form, draft) {
    if (!draft || !draft.fields) return;
    const fields = draft.fields;
    Object.keys(fields).forEach((name) => {
      const value = fields[name];
      const els = form.querySelectorAll(`[name="${CSS.escape(name)}"]`);
      if (!els.length) return;
      const first = els[0];
      if (first.type === "checkbox") {
        if (first.name === "product_ids") {
          const selected = new Set(Array.isArray(value) ? value.map(String) : value ? [String(value)] : []);
          els.forEach((el) => {
            el.checked = selected.has(String(el.value));
          });
        } else {
          first.checked = value === "on" || value === true || value === "true";
        }
        return;
      }
      if (first.type === "file") return;
      if (first.tagName === "SELECT" || first.tagName === "TEXTAREA" || first.tagName === "INPUT") {
        first.value = Array.isArray(value) ? value[0] : value;
      }
    });
    Object.keys(fields).forEach((name) => {
      if (!name.startsWith("qty_")) return;
      const el = form.querySelector(`[name="${CSS.escape(name)}"]`);
      if (el) el.value = fields[name];
    });
  }

  function formatRub(value) {
    return Math.round(value).toLocaleString("ru-RU").replace(/\u00a0/g, " ") + " ₽";
  }

  function rowPrice(row, cb) {
    const raw = cb?.getAttribute("data-price") || row?.getAttribute("data-price") || "0";
    return Number(raw) || 0;
  }

  function updateComposeTotal(form) {
    const el = form.querySelector("#composeTotal");
    if (!el) return;
    let itemsSum = 0;
    form.querySelectorAll("[data-cat-pick]").forEach((cb) => {
      if (!cb.checked) return;
      const row = cb.closest(".compose-row");
      const qtyEl = row?.querySelector('input[name^="qty_"]');
      const qty = Math.max(1, parseInt(qtyEl?.value || "1", 10) || 1);
      itemsSum += rowPrice(row, cb) * qty;
    });
    const fieldWorkEl = form.querySelector('[name="field_work_price"]');
    const fieldWork = Math.max(0, parseInt(fieldWorkEl?.value || "0", 10) || 0);
    const overrideEl = form.querySelector('[name="price_override"]');
    const overrideRaw = (overrideEl?.value || "").trim();
    let base = itemsSum;
    if (overrideRaw) {
      const override = parseInt(overrideRaw, 10);
      if (!Number.isNaN(override) && override >= 0) base = override;
    }
    el.textContent = formatRub(base + fieldWork);
  }

  function bindComposeTotal(form) {
    const compose = form.querySelector(".compose-block");
    if (!compose) return;
    const refresh = () => requestAnimationFrame(() => updateComposeTotal(form));
    compose.addEventListener("input", refresh);
    compose.addEventListener("change", refresh);
    compose.querySelectorAll("[data-cat-pick]").forEach((cb) => {
      cb.addEventListener("click", refresh);
    });
    form.querySelector('[name="field_work_price"]')?.addEventListener("input", refresh);
    form.querySelector('[name="field_work_price"]')?.addEventListener("change", refresh);
    form.querySelector('[name="price_override"]')?.addEventListener("input", refresh);
    form.querySelector('[name="price_override"]')?.addEventListener("change", refresh);
    refresh();
  }

  function initUnsavedGuard(form) {
    let dirty = false;
    let allowLeave = false;
    let armed = false;

    setTimeout(() => {
      armed = true;
    }, 150);

    const markDirty = () => {
      if (armed) dirty = true;
    };

    form.addEventListener("input", markDirty);
    form.addEventListener("change", markDirty);

    form.addEventListener("submit", () => {
      allowLeave = true;
      dirty = false;
    });

    const clearBtn = form.querySelector(".js-draft-clear");
    if (clearBtn) {
      clearBtn.addEventListener("click", () => {
        allowLeave = true;
      });
    }

    const discardBtn = form.querySelector(".js-draft-discard");
    if (discardBtn) {
      discardBtn.addEventListener("click", () => {
        allowLeave = true;
      });
    }

    window.addEventListener("beforeunload", (e) => {
      if (dirty && !allowLeave) {
        e.preventDefault();
        e.returnValue = "";
      }
    });

    document.addEventListener(
      "click",
      (e) => {
        if (!dirty || allowLeave) return;
        const link = e.target.closest("a[href]");
        if (!link || link.target === "_blank" || link.hasAttribute("download")) return;
        const href = link.getAttribute("href");
        if (!href || href.startsWith("#")) return;
        try {
          const url = new URL(link.href, window.location.href);
          if (url.origin !== window.location.origin) return;
        } catch (_) {
          return;
        }
        if (!window.confirm(LEAVE_MSG)) {
          e.preventDefault();
          e.stopPropagation();
        } else {
          allowLeave = true;
        }
      },
      true
    );
  }

  document.querySelectorAll("[data-cat-group]").forEach((group) => {
    group.addEventListener("change", (e) => {
      const t = e.target;
      if (!(t instanceof HTMLInputElement) || !t.matches("[data-cat-pick]")) return;
      const form = group.closest("form");
      if (form) requestAnimationFrame(() => updateComposeTotal(form));
    });

    const toggle = group.querySelector("[data-cat-toggle]");
    if (toggle) {
      toggle.addEventListener("click", () => {
        const collapsed = group.classList.toggle("is-collapsed");
        toggle.setAttribute("aria-expanded", collapsed ? "false" : "true");
      });
    }
  });

  document.querySelectorAll(".js-draft-form").forEach((form) => {
    bindComposeTotal(form);
    initUnsavedGuard(form);

    const allowedExt = /\.(jpe?g|png|webp|gif)$/i;
    const allowedMime = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", ""]);
    form.querySelectorAll('input[type="file"][name="image"]').forEach((input) => {
      input.addEventListener("change", () => {
        const file = input.files && input.files[0];
        if (!file) return;
        const okExt = allowedExt.test(file.name);
        const okMime = allowedMime.has(file.type);
        if (!okExt && !okMime) {
          alert("Поддерживаются только JPG, PNG, WEBP или GIF. HEIC и другие форматы — сначала экспортируй в JPG.");
          input.value = "";
        }
      });
    });

    let timer = null;
    const schedule = () => {
      clearTimeout(timer);
      timer = setTimeout(() => writeDraft(form), 350);
    };

    form.addEventListener("input", schedule);
    form.addEventListener("change", schedule);

    form.addEventListener("submit", () => {
      clearDraft(form);
    });

    const clearBtn = form.querySelector(".js-draft-clear");
    if (clearBtn) {
      clearBtn.addEventListener("click", () => {
        clearDraft(form);
        const isNew = (form.getAttribute("data-draft-key") || "").endsWith(":new");
        if (isNew) {
          form.reset();
          form.querySelectorAll("[data-cat-pick]").forEach((el) => {
            el.checked = false;
          });
          updateComposeTotal(form);
          const hint = form.querySelector(".js-draft-hint");
          if (hint) {
            hint.hidden = false;
            hint.textContent = "Черновик сброшен";
          }
        } else {
          window.location.reload();
        }
      });
    }

    const visibleEl = form.querySelector("#bundleVisible");
    const featuredEl = form.querySelector("#bundleFeatured");
    if (visibleEl && featuredEl) {
      const syncFeatured = () => {
        if (!visibleEl.checked) {
          featuredEl.checked = false;
          featuredEl.disabled = true;
        } else {
          featuredEl.disabled = false;
        }
      };
      visibleEl.addEventListener("change", syncFeatured);
      syncFeatured();
    }

    const draft = readDraft(form);
    const bar = form.querySelector(".draft-bar");
    const isNew = (form.getAttribute("data-draft-key") || "").endsWith(":new");
    if (!isNew) {
      clearDraft(form);
    } else if (draft && draft.fields && bar) {
      applyDraft(form, draft);
      const hint = form.querySelector(".js-draft-hint");
      if (hint) {
        hint.hidden = false;
        hint.textContent = "Черновик восстановлен";
      }
      if (visibleEl && featuredEl) {
        if (!visibleEl.checked) {
          featuredEl.checked = false;
          featuredEl.disabled = true;
        }
      }
      updateComposeTotal(form);
    }
  });
})();
