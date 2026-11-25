(function () {
  const STORAGE_KEY = "peluapp_a4_layout_v1";

  const SUPER_PIN = "202699";
  let superUnlocked = false;

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
      btn.style.cssText = [
        "position:fixed",
        "bottom:14px",
        "right:14px",
        "width:32px",
        "height:32px",
        "border-radius:50%",
        "border:1px solid #d1d5db",
        "background:rgba(255,255,255,0.85)",
        "color:#6b7280",
        "font-size:15px",
        "cursor:pointer",
        "z-index:99999",
        "opacity:0.45",
        "transition:opacity 0.2s"
      ].join(";");
      btn.onmouseenter = () => { btn.style.opacity = "1"; };
      btn.onmouseleave = () => { btn.style.opacity = "0.45"; };
      btn.onclick = promptSuperAdminUnlock;
      document.body.appendChild(btn);
    }
    btn.style.display = "block";
  }

  document.addEventListener("keydown", (e) => {
    if (e.altKey && (e.key === "M" || e.key === "m")) {
      const modal = document.getElementById("modal-factura-a4");
      if (isModalVisible(modal)) {
        e.preventDefault();
        promptSuperAdminUnlock();
      }
    }
  });

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
      #zona-impresion-a4.cal-editing .cal-item * { pointer-events: none !important; }
      #zona-impresion-a4.cal-editing .cal-item:hover {
        outline: 2px solid #db2777 !important;
        background: rgba(219, 39, 119, 0.14) !important;
      }
      @media print {
        #cal-a4-toolbar { display: none !important; }
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

  // Convierte los elementos renderizados dentro de #zona-impresion-a4 en bloques individuales arrastrables
  function prepareAndApplyLayout() {
    const zona = document.getElementById("zona-impresion-a4");
    if (!zona) return;
    const layout = loadLayout();

    zona.classList.toggle("cal-portrait", layout.orientation === "portrait");
    zona.classList.toggle("cal-landscape", layout.orientation !== "portrait");
    applyPageOrientationCSS(layout.orientation);

    // Identificar bloques directos de Original (primera mitad) y Copia (segunda mitad)
    const directChildren = Array.from(zona.children).filter(
      (el) => el.classList.contains("preimp-field") || el.classList.contains("preimp-items") || Boolean(el.querySelector && el.querySelector(".preimp-items"))
    );
    if (!directChildren.length) return;

    // Si solo renderizo el Original (11 elementos), clonamos el bloque para tener Copia editable a la derecha/abajo
    if (directChildren.length <= 12 && !zona.dataset.clonedCopy) {
      directChildren.forEach((el) => {
        const clone = el.cloneNode(true);
        clone.dataset.isCopyClone = "1";
        zona.appendChild(clone);
      });
      zona.dataset.clonedCopy = "1";
    }

    const allNodes = Array.from(zona.children).filter(
      (el) => el.classList.contains("preimp-field") || el.classList.contains("preimp-items") || Boolean(el.querySelector && el.querySelector(".preimp-items"))
    );

    // Mapear cada nodo a su clave semantica (fecha, contado, credito, cliente, ruc, vto, items, letras, total, iva10, ivatot)
    const assignKeys = (nodes, prefix) => {
      let ivaCount = 0;
      nodes.forEach((el) => {
        el.classList.add("cal-item");
        el.dataset.calGroup = prefix;
        if (el.classList.contains("preimp-items") || (el.querySelector && el.querySelector(".preimp-items"))) {
          el.dataset.calKey = prefix + "_items";
          return;
        }
        const txt = (el.textContent || "").trim();
        const topVal = parseFloat(el.style.top) || 0;
        const leftVal = parseFloat(el.style.left) || 0;

        if (/^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(txt) && topVal < 60) {
          el.dataset.calKey = prefix + "_fecha";
        } else if (txt === "X" && leftVal > 70 && topVal < 50) {
          el.dataset.calKey = prefix + (leftVal < 112 ? "_contado" : "_credito");
        } else if (txt === "" && leftVal > 70 && topVal < 50) {
          el.dataset.calKey = prefix + (leftVal < 112 ? "_contado" : "_credito");
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

    const half = Math.ceil(allNodes.length / 2);
    const origNodes = allNodes.filter((n) => !n.dataset.isCopyClone).slice(0, half);
    const copyNodes = allNodes.filter((n) => n.dataset.isCopyClone || allNodes.indexOf(n) >= half);

    assignKeys(origNodes, "orig");
    assignKeys(copyNodes, "copy");

    // Aplicar coordenadas guardadas
    allNodes.forEach((el) => {
      const k = el.dataset.calKey;
      const isCopy = el.dataset.calGroup === "copy";
      el.style.display = isCopy && !layout.showCopy ? "none" : "";
      if (k && layout.fields[k]) {
        el.style.top = layout.fields[k].top + "mm";
        el.style.left = layout.fields[k].left + "mm";
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
        <select id="cal-a4-orient" title="Orientación de la hoja A4">
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

      
      const syncConditionPlaceholders = (editing) => {
        zona.querySelectorAll(".cal-item").forEach((el) => {
          const k = el.dataset.calKey || "";
          if (k.endsWith("_contado") || k.endsWith("_credito")) {
            if (editing) {
              if (!el.dataset.realVal) el.dataset.realVal = el.textContent;
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

      // Drag & Drop en milimetros reales sobre #zona-impresion-a4
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
    bar.style.display = isSuperAdminActive() ? "flex" : "none";
    if (!isSuperAdminActive()) {
      zona.classList.remove("cal-editing");
    }
    document.getElementById("cal-a4-copy").checked = layout.showCopy;
  }

  // Observar cuando PeluApp abre o re-renderiza el modal de factura A4
  setInterval(() => {
    const modal = document.getElementById("modal-factura-a4");
    const zona = document.getElementById("zona-impresion-a4");
    ensureSecretGearButton();
    if (isModalVisible(modal) && zona && zona.children.length > 0) {
      if (zona.dataset.lastHtml !== zona.innerHTML && !zona.classList.contains("cal-editing")) {
        delete zona.dataset.clonedCopy;
        ensureToolbar();
        prepareAndApplyLayout();
        zona.dataset.lastHtml = zona.innerHTML;
      }
    }
  }, 500);

  window.addEventListener("DOMContentLoaded", () => {
    document.addEventListener("click", (e) => {
      if (e.target && /cerrar/i.test(e.target.textContent || "")) {
        superUnlocked = false;
        const bar = document.getElementById("cal-a4-toolbar");
        const zona = document.getElementById("zona-impresion-a4");
        if (bar) bar.style.display = "none";
        if (zona) zona.classList.remove("cal-editing");
      }
    });
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["style"] });
  });
})();
