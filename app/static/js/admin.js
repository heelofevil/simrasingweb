(function () {
  const DRAFT_PREFIX = "pitline-admin-draft:";

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
    // unchecked checkboxes are absent from FormData — store explicit false for known ones
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
          // enforce one per category after restore
          form.querySelectorAll("[data-cat-group]").forEach((group) => {
            const checked = group.querySelectorAll("[data-cat-pick]:checked");
            checked.forEach((el, idx) => {
              if (idx > 0) el.checked = false;
            });
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
    // qty fields
    Object.keys(fields).forEach((name) => {
      if (!name.startsWith("qty_")) return;
      const el = form.querySelector(`[name="${CSS.escape(name)}"]`);
      if (el) el.value = fields[name];
    });
  }

  function enforceOnePerCategory(group, keep) {
    group.querySelectorAll("[data-cat-pick]").forEach((el) => {
      if (el !== keep) el.checked = false;
    });
  }

  document.querySelectorAll("[data-cat-group]").forEach((group) => {
    group.addEventListener("change", (e) => {
      const t = e.target;
      if (!(t instanceof HTMLInputElement) || !t.matches("[data-cat-pick]")) return;
      if (t.checked) enforceOnePerCategory(group, t);
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
    if (draft && draft.fields && bar) {
      if (isNew) {
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
      } else {
        bar.hidden = false;
      }
      const restoreBtn = form.querySelector(".js-draft-restore");
      const discardBtn = form.querySelector(".js-draft-discard");
      if (restoreBtn) {
        restoreBtn.addEventListener("click", () => {
          applyDraft(form, readDraft(form));
          bar.hidden = true;
          const hint = form.querySelector(".js-draft-hint");
          if (hint) {
            hint.hidden = false;
            hint.textContent = "Черновик восстановлен";
          }
          if (visibleEl && featuredEl) {
            if (!visibleEl.checked) {
              featuredEl.checked = false;
              featuredEl.disabled = true;
            } else {
              featuredEl.disabled = false;
            }
          }
        });
      }
      if (discardBtn) {
        discardBtn.addEventListener("click", () => {
          clearDraft(form);
          if (!isNew) window.location.reload();
        });
      }
    }
  });
})();
