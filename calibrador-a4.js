(function () {
  const STORAGE_KEY = "peluapp_a4_layout_v2";
  const SUPER_PIN = "202699";
  let superUnlocked = false;

  function defaultLayout(orient) {
    const isPort = orient === "portrait";
    const cTop = isPort ? 148 : 0;
    const cLeft = isPort ? 0 : 148;
    return {
      orientation: orient || "landscape",
      showCopy: true,
      fields: {
        orig_fecha:   { top: 28, left: 24,  label: "Orig · Fecha" },
        orig_contado: { top: 28, left: 105, label: "Orig · Contado" },
        orig_credito: { top: 28, left: 126, label: "Orig · Crédito" },
        orig_cliente: { top: 35, left: 34,  label: "Orig · Cliente" },
        orig_ruc:     { top: 42, left: 22,  label: "Orig · RUC" },
        orig_vto:     { top: 42, left: 106, label: "Orig · Vto" },
        orig_items:   { top: 52, left: 10,  label: "Orig · Tabla Ítems" },
        orig_letras:  { top: 136, left: 30, label: "Orig · Letras" },
        orig_total:   { top: 136, left: 118,label: "Orig · Total" },
        orig_iva10:   { top: 143, left: 46, label: "Orig · IVA 10%" },
        orig_ivatot:  { top: 143, left: 92, label: "Orig · Total IVA" },

        copy_fecha:   { top: 28 + cTop, left: 24 + cLeft,  label: "Copia · Fecha" },
        copy_contado: { top: 28 + cTop, left: 105 + cLeft, label: "Copia · Contado" },
        copy_credito: { top: 28 + cTop, left: 126 + cLeft, label: "Copia · Crédito" },
        copy_cliente: { top: 35 + cTop, left: 34 + cLeft,  label: "Copia · Cliente" },
        copy_ruc:     { top: 42 + cTop, left: 22 + cLeft,  label: "Copia · RUC" },
        copy_vto:     { top: 42 + cTop, left: 106 + cLeft, label: "Copia · Vto" },
        copy_items:   { top: 52 + cTop, left: 10 + cLeft,  label: "Copia · Tabla Ítems" },
        copy_letras:  { top: 136 + cTop, left: 30 + cLeft, label: "Copia · Letras" },
        copy_total:   { top: 136 + cTop, left: 118 + cLeft,label: "Copia · Total" },
        copy_iva10:   { top: 143 + cTop, left: 46 + cLeft, label: "Copia · IVA 10%" },
        copy_ivatot:  { top: 143 + cTop, left: 92 + cLeft, label: "Copia · Total IVA" }
      }
    };
  }

  function loadLayout() {
    try {
      const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      const base = defaultLayout((raw && raw.orientation) || "landscape");
      if (raw && raw.fields) {
        Object.keys(base.fields).forEach((k) => {
          if (raw.fields[k]) {
            base.fields[k].top = Number(raw.fields[k].top ?? base.fields[k].top);
            base.fields[k].left = Number(raw.fields[k].left ?? base.fields[k].left);
          }
        });
      }
      base.showCopy = (raw && raw.showCopy === false) ? false : true;
      return base;
    } catch (_) {
      return defaultLayout("landscape");
    }
  }

  function saveLayout(layout) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
  }

  function isModalVisible(modal) {
    if (!modal) return false;
    return window.getComputedStyle(modal).display !== "none";
  }

  function isSuperAdminActive() {
    if (superUnlocked) return true;
    try {
      const panel = document.getElementById("panel-super-admin") || document.getElementById("super-admin-view");
      if (panel && window.getComputedStyle(panel).display !== "none") return true;
      const pinInput = document.getElementById("login-pin");
      if (pinInput && pinInput.value === SUPER_PIN) return true;
    } catch (_) {}
    return false;
  }

  function promptSuperAdminUnlock() {
    if (isSuperAdminActive()) {
      superUnlocked = false;
      const bar = document.getElementById("cal-a4-toolbar");
      const zona = document.getElementById("zona-impresion-a4");
      if (bar) bar.style.display = "none";
      if (zona) zona.classList.remove("cal-editing");
      return;
    }
    const clave = prompt("Acceso Super Admin · Ingresá tu PIN maestro (202699):");
    if (clave === SUPER_PIN) {
      superUnlocked = true;
      ensureToolbar();
      const bar = document.getElementById("cal-a4-toolbar");
      if (bar) bar.style.display = "flex";
    } else if (clave !== null) {
      alert("PIN incorrecto.");
    }
  }

  function ensureSecretGearButton() {
    const modal = document.getElementById("modal-factura-a4");
    let btn = document.getElementById("sa-cal-gear-btn");
    if (!modal || !isModalVisible(modal)) {
      if (btn) btn.style.display = "none";
      return;
    }
    if (!btn) {
      btn = document.createElement("button");
      btn.id = "sa-cal-gear-btn";
      btn.type = "button";
      btn.className = "no-print";
      btn.textContent = "⚙";
      btn.title = "Calibración Super Admin";
      btn.style.cssText = "position:fixed;bottom:14px;right:14px;width:34px;height:34px;border-radius:50%;border:1px solid #d1d5db;background:#fff;color:#4b5563;font-size:16px;cursor:pointer;z-index:99999;box-shadow:0 2px 8px rgba(0,0,0,0.18);";
      btn.onclick = promptSuperAdminUnlock;
      document.body.appendChild(btn);
    }
    btn.style.display = "block";
  }

  function injectStyles() {
    if (document.getElementById("calibrador-a4-ext-css")) return;
    const st = document.createElement("style");
    st.id = "calibrador-a4-ext-css";
    st.textContent = `
      #cal-a4-toolbar {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        align-items: center;
        background: #f5f3ff;
        border: 1px solid #ddd6fe;
        border-radius: 8px;
        padding: 8px 12px;
        margin: 8px auto 12px auto;
        max-width: 297mm;
        font-size: 13px;
        color: #1f2937;
      }
      #cal-a4-toolbar select, #cal-a4-toolbar button {
        padding: 6px 10px;
        border-radius: 6px;
        font-size: 12.5px;
        cursor: pointer;
      }
      #cal-a4-status {
        margin-left: auto;
        font-family: monospace;
        font-size: 12px;
        color: #6d28d9;
        font-weight: 600;
      }
      #zona-impresion-a4 {
        position: relative !important;
        overflow: visible !important;
      }
      #zona-impresion-a4.cal-portrait {
        width: 210mm !important;
        height: 297mm !important;
        min-height: 297mm !important;
      }
      #zona-impresion-a4.cal-landscape {
        width: 297mm !important;
        height: 210mm !important;
        min-height: 210mm !important;
      }
      #zona-impresion-a4 .cal-item {
        position: absolute !important;
        user-select: none;
        touch-action: none;
      }
      #zona-impresion-a4.cal-editing .cal-item {
        cursor: move !important;
        outline: 1.5px dashed #7c3aed !important;
        background: rgba(124, 58, 237, 0.08) !important;
        border-radius: 3px;
        z-index: 50;
      }
      #zona-impresion-a4.cal-editing .cal-item * {
        pointer-events: none !important;
      }
      #zona-impresion-a4.cal-editing .cal-item:hover {
        outline: 2px solid #db2777 !important;
        background: rgba(219, 39, 119, 0.14) !important;
      }
      @media print {
        #cal-a4-toolbar, #sa-cal-gear-btn { display: none !important; }
        #zona-impresion-a4 .cal-item {
          outline: none !important;
          background: transparent !important;
        }
      }
    `;
    document.head.appendChild(st);
  }

  function applyPageOrientationCSS(orient) {
    let st = document.getElementById("cal-page-orient-css");
    if (!st) {
      st = document.createElement("style");
      st.id = "cal-page-orient-css";
      document.head.appendChild(st);
    }
    st.textContent = `@media print { @page { size: A4 ${orient}; margin: 0; } }`;
  }

  function prepareAndApplyLayout() {
    const zona = document.getElementById("zona-impresion-a4");
    if (!zona) return;
    const layout = loadLayout();

    zona.classList.toggle("cal-portrait", layout.orientation === "portrait");
    zona.classList.toggle("cal-landscape", layout.orientation !== "portrait");
    applyPageOrientationCSS(layout.orientation);

    // Eliminar clones previos
    zona.querySelectorAll("[data-is-copy-clone='1']").forEach((n) => n.remove());

    // Obtener todos los bloques directos (sin importar clase)
    const rawChildren = Array.from(zona.children).filter((el) => el.nodeType === 1);
    if (!rawChildren.length) return;

    // Si PeluApp ya genero dos bloques (Original y Copia), nos quedamos con la primera mitad como Original
    const half = rawChildren.length > 14 ? Math.ceil(rawChildren.length / 2) : rawChildren.length;
    const origNodes = rawChildren.slice(0, half);
    rawChildren.slice(half).forEach((n) => n.remove());

    // Clonar cada elemento del Original para crear la Copia
    const copyNodes = origNodes.map((el) => {
      const clone = el.cloneNode(true);
      clone.dataset.isCopyClone = "1";
      zona.appendChild(clone);
      return clone;
    });

    const assignKeys = (nodes, prefix) => {
      let ivaCount = 0;
      nodes.forEach((el) => {
        el.classList.add("cal-item");
        el.dataset.calGroup = prefix;
        if (el.classList.contains("preimp-items") || el.tagName === "TABLE" || el.querySelector("table, .preimp-items")) {
          el.dataset.calKey = prefix + "_items";
          return;
        }
        const txt = (el.textContent || "").trim();
        const topVal = parseFloat(el.style.top) || 0;
        const leftVal = parseFloat(el.style.left) || 0;

        if (/^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(txt) && topVal < 60) {
          el.dataset.calKey = prefix + "_fecha";
        } else if ((txt === "X" || txt === "") && leftVal > 70 && topVal < 50) {
          el.dataset.calKey = prefix + (leftVal < 115 ? "_contado" : "_credito");
        } else if (el.style.width === "84mm" || /[A-ZÁÉÍÓÚÑ]{4,}\s+GUARAN/i.test(txt)) {
          el.dataset.calKey = prefix + "_letras";
        } else if (el.style.width === "24mm") {
          el.dataset.calKey = prefix + "_total";
        } else if (topVal > 100 && /^[\d.]+$/.test(txt)) {
          ivaCount++;
          el.dataset.calKey = prefix + (ivaCount === 1 ? "_iva10" : "_ivatot");
        } else if (/^\d{5,9}-\d$/.test(txt) || (txt === "X" && topVal >= 45 && topVal <= 65)) {
          el.dataset.calKey = prefix + "_ruc";
        } else if (/^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(txt)) {
          el.dataset.calKey = prefix + "_vto";
        } else {
          el.dataset.calKey = prefix + "_cliente";
        }
      });
    };

    assignKeys(origNodes, "orig");
    assignKeys(copyNodes, "copy");

    const cTopOffset = layout.orientation === "portrait" ? 148 : 0;
    const cLeftOffset = layout.orientation === "portrait" ? 0 : 148;

    [...origNodes, ...copyNodes].forEach((el) => {
      const k = el.dataset.calKey;
      const isCopy = el.dataset.calGroup === "copy";
      el.style.display = isCopy && !layout.showCopy ? "none" : "block";
      el.style.visibility = isCopy && !layout.showCopy ? "hidden" : "visible";

      if (k && layout.fields[k]) {
        let t = Number(layout.fields[k].top);
        let l = Number(layout.fields[k].left);
        if (isCopy && layout.orientation !== "portrait" && l < 130) {
          l += cLeftOffset;
        }
        if (isCopy && layout.orientation === "portrait" && t < 130) {
          t += cTopOffset;
        }
        el.style.top = t + "mm";
        el.style.left = l + "mm";
      }
    });
  }

  function ensureToolbar() {
    const zona = document.getElementById("zona-impresion-a4");
    if (!zona || !zona.parentNode) return;
    injectStyles();

    let bar = document.getElementById("cal-a4-toolbar");
    if (!bar) {
      bar = document.createElement("div");
      bar.id = "cal-a4-toolbar";
      bar.className = "no-print";
      bar.innerHTML = `
        <strong>Plantilla del Salón:</strong>
        <select id="cal-a4-orient">
          <option value="landscape">A4 Apaisado (297×210 mm · Izq / Der)</option>
          <option value="portrait">A4 Vertical (210×297 mm · Arriba / Abajo)</option>
        </select>
        <label style="display:flex; align-items:center; gap:4px; cursor:pointer;">
          <input type="checkbox" id="cal-a4-copy" checked> Incluir Copia
        </label>
        <button type="button" id="cal-a4-drag-btn" style="background:#7c3aed; color:#fff; border:none;">Mover Campos (Arrastrar)</button>
        <button type="button" id="cal-a4-save-btn" style="background:#059669; color:#fff; border:none;">Guardar Posiciones</button>
        <button type="button" id="cal-a4-reset-btn" style="background:#fff; color:#374151; border:1px solid #d1d5db;">Restaurar</button>
        <span id="cal-a4-status">Listo</span>
      `;
      zona.parentNode.insertBefore(bar, zona);

      const orientSel = document.getElementById("cal-a4-orient");
      const copyChk = document.getElementById("cal-a4-copy");
      const dragBtn = document.getElementById("cal-a4-drag-btn");
      const saveBtn = document.getElementById("cal-a4-save-btn");
      const resetBtn = document.getElementById("cal-a4-reset-btn");
      const statusEl = document.getElementById("cal-a4-status");

      const syncConditionPlaceholders = (editing) => {
        zona.querySelectorAll(".cal-item").forEach((el) => {
          const k = el.dataset.calKey || "";
          if (k.endsWith("_contado") || k.endsWith("_credito")) {
            if (editing) {
              if (el.dataset.realVal === undefined) el.dataset.realVal = el.textContent;
              if (!el.dataset.realVal.trim()) {
                el.textContent = k.endsWith("_contado") ? "[Cont]" : "[Créd]";
                el.style.color = "#9333ea";
              }
            } else if (el.dataset.realVal !== undefined) {
              el.textContent = el.dataset.realVal;
              el.style.color = "";
              delete el.dataset.realVal;
            }
          }
        });
      };

      orientSel.onchange = () => {
        const cur = loadLayout();
        const fresh = defaultLayout(orientSel.value);
        fresh.showCopy = cur.showCopy;
        saveLayout(fresh);
        prepareAndApplyLayout();
        statusEl.textContent = "Orientación cambiada";
      };

      copyChk.onchange = () => {
        const cur = loadLayout();
        cur.showCopy = copyChk.checked;
        saveLayout(cur);
        prepareAndApplyLayout();
      };

      dragBtn.onclick = () => {
        const editing = zona.classList.toggle("cal-editing");
        syncConditionPlaceholders(editing);
        dragBtn.textContent = editing ? "Terminar de Mover" : "Mover Campos (Arrastrar)";
        statusEl.textContent = editing ? "Arrastrá cada dato sobre la hoja" : "Listo";
      };

      saveBtn.onclick = () => {
        const cur = loadLayout();
        zona.querySelectorAll(".cal-item").forEach((el) => {
          const k = el.dataset.calKey;
          if (k && cur.fields[k]) {
            cur.fields[k].top = Math.round((parseFloat(el.style.top) || 0) * 10) / 10;
            cur.fields[k].left = Math.round((parseFloat(el.style.left) || 0) * 10) / 10;
          }
        });
        saveLayout(cur);
        zona.classList.remove("cal-editing");
        syncConditionPlaceholders(false);
        dragBtn.textContent = "Mover Campos (Arrastrar)";
        statusEl.textContent = "Posiciones guardadas";
      };

      resetBtn.onclick = () => {
        const fresh = defaultLayout(orientSel.value);
        saveLayout(fresh);
        prepareAndApplyLayout();
        statusEl.textContent = "Valores restaurados";
      };

      let dragging = null, sX = 0, sY = 0, oTop = 0, oLeft = 0, pxMmX = 3.78, pxMmY = 3.78;
      zona.addEventListener("pointerdown", (e) => {
        if (!zona.classList.contains("cal-editing")) return;
        const item = e.target.closest(".cal-item");
        if (!item) return;
        e.preventDefault();
        dragging = item;
        const layout = loadLayout();
        const rect = zona.getBoundingClientRect();
        const wMm = layout.orientation === "portrait" ? 210 : 297;
        const hMm = layout.orientation === "portrait" ? 297 : 210;
        pxMmX = rect.width / wMm;
        pxMmY = rect.height / hMm;
        sX = e.clientX;
        sY = e.clientY;
        oTop = parseFloat(item.style.top) || 0;
        oLeft = parseFloat(item.style.left) || 0;
        item.setPointerCapture(e.pointerId);
      });

      zona.addEventListener("pointermove", (e) => {
        if (!dragging) return;
        const nLeft = Math.max(0, oLeft + (e.clientX - sX) / pxMmX);
        const nTop = Math.max(0, oTop + (e.clientY - sY) / pxMmY);
        dragging.style.left = nLeft.toFixed(1) + "mm";
        dragging.style.top = nTop.toFixed(1) + "mm";
        const info = loadLayout().fields[dragging.dataset.calKey];
        statusEl.textContent = `${info ? info.label : dragging.dataset.calKey}: Arriba ${nTop.toFixed(1)}mm · Izq ${nLeft.toFixed(1)}mm`;
      });

      zona.addEventListener("pointerup", () => {
        dragging = null;
      });
    }

    const layout = loadLayout();
    document.getElementById("cal-a4-orient").value = layout.orientation;
    document.getElementById("cal-a4-copy").checked = layout.showCopy;
    bar.style.display = isSuperAdminActive() ? "flex" : "none";
  }

  setInterval(() => {
    const modal = document.getElementById("modal-factura-a4");
    const zona = document.getElementById("zona-impresion-a4");
    ensureSecretGearButton();
    if (isModalVisible(modal) && zona && zona.children.length > 0) {
      if (!zona.dataset.calApplied && !zona.classList.contains("cal-editing")) {
        zona.dataset.calApplied = "1";
        ensureToolbar();
        prepareAndApplyLayout();
      }
    } else if (zona) {
      delete zona.dataset.calApplied;
    }
  }, 400);
})();
