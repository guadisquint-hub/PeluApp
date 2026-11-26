(function () {
  if (window.__peluTurnosInit) return;
  window.__peluTurnosInit = true;

  const HORARIOS_BASE = [
    "08:00","08:30","09:00","09:30","10:00","10:30","11:00","11:30",
    "12:00","12:30","13:00","13:30","14:00","14:30","15:00","15:30",
    "16:00","16:30","17:00","17:30","18:00","18:30","19:00"
  ];

  function hoyISO(offsetDias = 0) {
    const d = new Date();
    d.setDate(d.getDate() + offsetDias);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  function formatearFechaPY(iso) {
    if (!iso || !iso.includes("-")) return iso || "";
    const [y, m, d] = iso.split("-");
    return `${d}/${m}/${y}`;
  }

  function limpiarTelefonoPY(tel) {
    const digits = String(tel || "").replace(/\D/g, "");
    if (!digits) return "";
    if (digits.startsWith("595")) return digits;
    if (digits.startsWith("0")) return "595" + digits.slice(1);
    return "595" + digits;
  }

  function getSalonKey() {
    const lic = localStorage.getItem("peluapp_active_license")
      || localStorage.getItem("activeLicenseCode")
      || "default";
    return "peluapp_turnos_" + lic;
  }

  function getNombreSalon() {
    const candidatos = [
      document.getElementById("header-salon-name")?.textContent,
      document.getElementById("salon-nombre")?.value,
      document.getElementById("cfg-nombre-salon")?.value,
      localStorage.getItem("peluapp_salon_name")
    ];
    for (const c of candidatos) {
      if (c && c.trim() && !c.includes("PeluApp")) return c.trim();
    }
    return "nuestro salón";
  }

  function cargarTurnos() {
    try {
      const raw = localStorage.getItem(getSalonKey());
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch (_) {
      return [];
    }
  }

  function guardarTurnos(lista) {
    localStorage.setItem(getSalonKey(), JSON.stringify(lista));
    // Si la app expone estado global + sincronización Firestore cifrada, acoplar sin romper nada
    try {
      if (window.state && typeof window.state === "object") {
        window.state.turnosAgenda = lista;
        if (typeof window.saveState === "function") window.saveState();
      }
    } catch (_) {}
  }

  function serviciosSugeridos() {
    const base = ["Brushing", "Lavado", "Corte", "Tintura", "Retoque de raíces", "Alisado", "Nutrición", "Peinado", "Manicura", "Pedicura"];
    try {
      const prods = (window.state && Array.isArray(window.state.servicios)) ? window.state.servicios : [];
      prods.forEach((s) => {
        const n = typeof s === "string" ? s : (s && s.nombre);
        if (n && !base.includes(n)) base.push(n);
      });
    } catch (_) {}
    return base;
  }

  function esc(str) {
    if (typeof window.esc === "function") return window.esc(str);
    return String(str ?? "")
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  let fechaFiltro = hoyISO(0);

  function construirVistaTurnos() {
    if (document.getElementById("vista-turnos-salon")) return;

    // Buscar contenedor principal donde viven las demás vistas/pestañas
    const vistaRef = document.querySelector('[id^="vista-"], [id^="tab-"], main > div');
    const contenedorPadre = vistaRef ? vistaRef.parentElement : document.body;

    const sec = document.createElement("section");
    sec.id = "vista-turnos-salon";
    sec.style.cssText = "display:none; padding:16px; max-width:1100px; margin:0 auto; font-family:system-ui,-apple-system,sans-serif;";
    sec.innerHTML = `
      <div style="display:flex; flex-wrap:wrap; align-items:center; justify-content:space-between; gap:10px; margin-bottom:16px;">
        <div>
          <h2 style="margin:0; font-size:20px; color:#1e1b4b;">📅 Agenda de Turnos y Recordatorios</h2>
          <p style="margin:2px 0 0 0; font-size:13px; color:#64748b;">Reservá servicios hoy o a futuro, visualizá horarios libres y enviá recordatorios por WhatsApp.</p>
        </div>
        <div style="display:flex; gap:8px; align-items:center;">
          <button type="button" id="trn-btn-hoy" style="padding:7px 12px; border:1px solid #cbd5e1; background:#fff; border-radius:8px; font-size:12px; font-weight:600; cursor:pointer;">Hoy</button>
          <button type="button" id="trn-btn-manana" style="padding:7px 12px; border:1px solid #7c3aed; background:#f5f3ff; color:#5b21b6; border-radius:8px; font-size:12px; font-weight:700; cursor:pointer;">Ver Mañana</button>
          <input type="date" id="trn-filtro-fecha" value="${fechaFiltro}" style="padding:7px 10px; border:1px solid #cbd5e1; border-radius:8px; font-size:13px;" />
        </div>
      </div>

      <!-- BLOQUE DESTACADO: TURNOS DE MAÑANA PARA RECORDATORIO WHATSAPP -->
      <div id="trn-card-manana" style="background:linear-gradient(135deg,#ecfdf5,#f0fdf4); border:1px solid #86efac; border-radius:14px; padding:14px 16px; margin-bottom:16px;">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; margin-bottom:10px;">
          <strong style="color:#14532d; font-size:15px;">📲 Turnos de Mañana (<span id="trn-manana-fecha-lbl"></span>) — Recordatorios WhatsApp</strong>
          <span id="trn-manana-count" style="background:#16a34a; color:#fff; font-size:11px; font-weight:700; padding:3px 9px; border-radius:999px;">0 turnos</span>
        </div>
        <div id="trn-lista-manana" style="display:grid; gap:8px;"></div>
      </div>

      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(310px, 1fr)); gap:16px; align-items:start;">
        <!-- FORMULARIO NUEVO TURNO / SEGUIMIENTO FUTURO -->
        <div style="background:#ffffff; border:1px solid #e2e8f0; border-radius:14px; padding:16px; box-shadow:0 4px 12px rgba(15,23,42,0.04);">
          <h3 style="margin:0 0 12px 0; font-size:16px; color:#1e293b;">➕ Agendar Turno / Servicio Futuro</h3>

          <label style="display:block; font-size:12px; font-weight:600; color:#334155; margin-bottom:4px;">Clienta</label>
          <input id="trn-clienta" type="text" placeholder="Ej: María González" style="width:100%; box-sizing:border-box; padding:9px 11px; border:1px solid #cbd5e1; border-radius:8px; font-size:13px; margin-bottom:10px;" />

          <label style="display:block; font-size:12px; font-weight:600; color:#334155; margin-bottom:4px;">WhatsApp de la clienta</label>
          <input id="trn-telefono" type="tel" placeholder="Ej: 0981 123 456" style="width:100%; box-sizing:border-box; padding:9px 11px; border:1px solid #cbd5e1; border-radius:8px; font-size:13px; margin-bottom:10px;" />

          <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:8px;">
            <div>
              <label style="display:block; font-size:12px; font-weight:600; color:#334155; margin-bottom:4px;">Fecha</label>
              <input id="trn-fecha" type="date" value="${fechaFiltro}" style="width:100%; box-sizing:border-box; padding:8px 10px; border:1px solid #cbd5e1; border-radius:8px; font-size:13px;" />
            </div>
            <div>
              <label style="display:block; font-size:12px; font-weight:600; color:#334155; margin-bottom:4px;">Hora</label>
              <select id="trn-hora" style="width:100%; box-sizing:border-box; padding:8px 10px; border:1px solid #cbd5e1; border-radius:8px; font-size:13px;">
                ${HORARIOS_BASE.map(h => `<option value="${h}">${h} hs</option>`).join("")}
              </select>
            </div>
          </div>

          <div style="display:flex; flex-wrap:wrap; gap:6px; margin-bottom:12px;">
            <button type="button" data-followup="15" data-srv="Retoque de raíces" class="trn-quick-btn" style="padding:5px 9px; border:1px solid #ddd6fe; background:#f5f3ff; color:#5b21b6; border-radius:6px; font-size:11px; font-weight:600; cursor:pointer;">+15 días (Retoque raíces)</button>
            <button type="button" data-followup="30" data-srv="Mantenimiento / Color" class="trn-quick-btn" style="padding:5px 9px; border:1px solid #ddd6fe; background:#f5f3ff; color:#5b21b6; border-radius:6px; font-size:11px; font-weight:600; cursor:pointer;">+30 días (Mantenimiento)</button>
          </div>

          <label style="display:block; font-size:12px; font-weight:600; color:#334155; margin-bottom:4px;">Servicios a realizar (tocá para sumar o escribí)</label>
          <div id="trn-chips-servicios" style="display:flex; flex-wrap:wrap; gap:5px; margin-bottom:8px;"></div>
          <input id="trn-servicios-txt" type="text" placeholder="Ej: Brushing, lavado, corte" style="width:100%; box-sizing:border-box; padding:9px 11px; border:1px solid #cbd5e1; border-radius:8px; font-size:13px; margin-bottom:10px;" />

          <label style="display:block; font-size:12px; font-weight:600; color:#334155; margin-bottom:4px;">Profesional / Nota (opcional)</label>
          <input id="trn-nota" type="text" placeholder="Ej: Con Laura · Traer referencia" style="width:100%; box-sizing:border-box; padding:9px 11px; border:1px solid #cbd5e1; border-radius:8px; font-size:13px; margin-bottom:12px;" />

          <button type="button" id="trn-btn-guardar" style="width:100%; padding:11px; border:none; border-radius:10px; background:#6d28d9; color:#fff; font-size:14px; font-weight:700; cursor:pointer;">Guardar Reserva</button>
        </div>

        <!-- PANEL DERECHO: HORARIOS DISPONIBLES + TURNOS DEL DÍA -->
        <div style="display:grid; gap:16px;">
          <div style="background:#ffffff; border:1px solid #e2e8f0; border-radius:14px; padding:16px;">
            <h3 style="margin:0 0 8px 0; font-size:15px; color:#1e293b;">🟢 Turnos Disponibles (<span id="trn-disp-fecha-lbl"></span>)</h3>
            <p style="margin:0 0 10px 0; font-size:12px; color:#64748b;">Hacé clic en un horario libre para cargarlo en el formulario.</p>
            <div id="trn-horarios-libres" style="display:flex; flex-wrap:wrap; gap:6px;"></div>
          </div>

          <div style="background:#ffffff; border:1px solid #e2e8f0; border-radius:14px; padding:16px;">
            <h3 style="margin:0 0 10px 0; font-size:15px; color:#1e293b;">📋 Agenda del Día (<span id="trn-agenda-fecha-lbl"></span>)</h3>
            <div id="trn-lista-dia" style="display:grid; gap:8px;"></div>
          </div>
        </div>
      </div>
    `;

    contenedorPadre.appendChild(sec);
    bindEventosTurnos();
    renderTurnos();
  }

  function abrirWhatsAppRecordatorio(turno) {
    const tel = limpiarTelefonoPY(turno.telefono);
    if (!tel) {
      alert("Esta clienta no tiene número de WhatsApp cargado en el turno.");
      return;
    }
    const salon = getNombreSalon();
    const fechaTxt = formatearFechaPY(turno.fecha);
    const msg = `Hola ${turno.clienta}! Te recordamos desde *${salon}* tu turno para el día ${fechaTxt} a las ${turno.hora} hs para: ${turno.servicios}. ¡Te esperamos!`;
    window.open(`https://wa.me/${tel}?text=${encodeURIComponent(msg)}`, "_blank", "noopener");
  }

  function renderTurnos() {
    const todos = cargarTurnos();
    const manana = hoyISO(1);

    // 1. Chips de servicios rápidos
    const chipsBox = document.getElementById("trn-chips-servicios");
    if (chipsBox) {
      chipsBox.innerHTML = serviciosSugeridos().map((s) =>
        `<button type="button" class="trn-srv-chip" data-srv="${esc(s)}" style="padding:4px 9px; border:1px solid #cbd5e1; background:#f8fafc; color:#334155; border-radius:999px; font-size:11px; cursor:pointer;">+ ${esc(s)}</button>`
      ).join("");
      chipsBox.querySelectorAll(".trn-srv-chip").forEach((btn) => {
        btn.onclick = () => {
          const inp = document.getElementById("trn-servicios-txt");
          const actual = inp.value.trim();
          const srv = btn.getAttribute("data-srv");
          if (!actual) inp.value = srv;
          else if (!actual.toLowerCase().includes(srv.toLowerCase())) inp.value = actual + ", " + srv;
        };
      });
    }

    // 2. Turnos de mañana (WhatsApp)
    const turnosManana = todos
      .filter((t) => t.fecha === manana && t.estado !== "cancelado")
      .sort((a, b) => a.hora.localeCompare(b.hora));
    const lblManana = document.getElementById("trn-manana-fecha-lbl");
    const cntManana = document.getElementById("trn-manana-count");
    const boxManana = document.getElementById("trn-lista-manana");
    if (lblManana) lblManana.textContent = formatearFechaPY(manana);
    if (cntManana) cntManana.textContent = `${turnosManana.length} turno(s)`;
    if (boxManana) {
      if (!turnosManana.length) {
        boxManana.innerHTML = `<div style="font-size:13px; color:#166534;">No hay turnos agendados para mañana todavía.</div>`;
      } else {
        boxManana.innerHTML = turnosManana.map((t) => `
          <div style="background:#ffffff; border:1px solid #bbf7d0; border-radius:10px; padding:10px 12px; display:flex; flex-wrap:wrap; justify-content:space-between; align-items:center; gap:8px;">
            <div>
              <div style="font-weight:700; color:#14532d; font-size:14px;">⏰ ${esc(t.hora)} hs — ${esc(t.clienta)}</div>
              <div style="font-size:12px; color:#334155;">✂️ ${esc(t.servicios)} ${t.nota ? "· " + esc(t.nota) : ""}</div>
            </div>
            <button type="button" data-wa-id="${esc(t.id)}" style="padding:7px 12px; border:none; border-radius:8px; background:#16a34a; color:#fff; font-size:12px; font-weight:700; cursor:pointer;">📲 Recordar por WhatsApp</button>
          </div>
        `).join("");
        boxManana.querySelectorAll("[data-wa-id]").forEach((b) => {
          b.onclick = () => {
            const t = todos.find((x) => x.id === b.getAttribute("data-wa-id"));
            if (t) abrirWhatsAppRecordatorio(t);
          };
        });
      }
    }

    // 3. Horarios disponibles del día seleccionado
    const turnosDia = todos
      .filter((t) => t.fecha === fechaFiltro)
      .sort((a, b) => a.hora.localeCompare(b.hora));
    const ocupados = new Set(turnosDia.filter((t) => t.estado !== "cancelado").map((t) => t.hora));

    const lblDisp = document.getElementById("trn-disp-fecha-lbl");
    const boxLibres = document.getElementById("trn-horarios-libres");
    if (lblDisp) lblDisp.textContent = formatearFechaPY(fechaFiltro);
    if (boxLibres) {
      boxLibres.innerHTML = HORARIOS_BASE.map((h) => {
        const libre = !ocupados.has(h);
        return libre
          ? `<button type="button" data-slot="${h}" style="padding:6px 10px; border:1px solid #86efac; background:#f0fdf4; color:#166534; border-radius:8px; font-size:12px; font-weight:600; cursor:pointer;">${h}</button>`
          : `<span style="padding:6px 10px; border:1px solid #e2e8f0; background:#f1f5f9; color:#94a3b8; border-radius:8px; font-size:12px; text-decoration:line-through;">${h}</span>`;
      }).join("");
      boxLibres.querySelectorAll("[data-slot]").forEach((b) => {
        b.onclick = () => {
          document.getElementById("trn-fecha").value = fechaFiltro;
          document.getElementById("trn-hora").value = b.getAttribute("data-slot");
          document.getElementById("trn-clienta").focus();
        };
      });
    }

    // 4. Agenda detallada del día seleccionado
    const lblAgenda = document.getElementById("trn-agenda-fecha-lbl");
    const boxDia = document.getElementById("trn-lista-dia");
    if (lblAgenda) lblAgenda.textContent = formatearFechaPY(fechaFiltro);
    if (boxDia) {
      if (!turnosDia.length) {
        boxDia.innerHTML = `<div style="font-size:13px; color:#64748b;">No hay turnos reservados para esta fecha.</div>`;
      } else {
        boxDia.innerHTML = turnosDia.map((t) => {
          const esAtendido = t.estado === "atendido";
          return `
            <div style="border:1px solid #e2e8f0; border-radius:10px; padding:10px 12px; background:${esAtendido ? "#f8fafc" : "#fff"}; display:flex; flex-wrap:wrap; justify-content:space-between; align-items:center; gap:8px;">
              <div>
                <div style="font-weight:700; color:#1e293b; font-size:14px;">
                  ${esc(t.hora)} hs · ${esc(t.clienta)}
                  <span style="font-size:11px; font-weight:600; padding:2px 7px; border-radius:999px; background:${esAtendido ? "#dcfce7" : "#ede9fe"}; color:${esAtendido ? "#166534" : "#5b21b6"}; margin-left:6px;">${esAtendido ? "Atendido" : "Reservado"}</span>
                </div>
                <div style="font-size:12px; color:#475569; margin-top:2px;">✂️ ${esc(t.servicios)} ${t.telefono ? "· 📞 " + esc(t.telefono) : ""} ${t.nota ? "· " + esc(t.nota) : ""}</div>
              </div>
              <div style="display:flex; gap:6px; flex-wrap:wrap;">
                <button type="button" data-wa-dia="${esc(t.id)}" style="padding:6px 10px; border:none; border-radius:7px; background:#16a34a; color:#fff; font-size:11px; font-weight:700; cursor:pointer;">📲 WhatsApp</button>
                <button type="button" data-done-id="${esc(t.id)}" style="padding:6px 10px; border:1px solid #cbd5e1; background:#fff; color:#334155; border-radius:7px; font-size:11px; font-weight:600; cursor:pointer;">${esAtendido ? "Reabrir" : "✓ Atendido"}</button>
                <button type="button" data-del-id="${esc(t.id)}" style="padding:6px 9px; border:none; border-radius:7px; background:#fee2e2; color:#b91c1c; font-size:11px; font-weight:700; cursor:pointer;">✕</button>
              </div>
            </div>
          `;
        }).join("");

        boxDia.querySelectorAll("[data-wa-dia]").forEach((b) => {
          b.onclick = () => {
            const t = todos.find((x) => x.id === b.getAttribute("data-wa-dia"));
            if (t) abrirWhatsAppRecordatorio(t);
          };
        });
        boxDia.querySelectorAll("[data-done-id]").forEach((b) => {
          b.onclick = () => {
            const lista = cargarTurnos();
            const item = lista.find((x) => x.id === b.getAttribute("data-done-id"));
            if (item) {
              item.estado = item.estado === "atendido" ? "reservado" : "atendido";
              guardarTurnos(lista);
              renderTurnos();
            }
          };
        });
        boxDia.querySelectorAll("[data-del-id]").forEach((b) => {
          b.onclick = () => {
            if (!confirm("¿Eliminar este turno?")) return;
            const lista = cargarTurnos().filter((x) => x.id !== b.getAttribute("data-del-id"));
            guardarTurnos(lista);
            renderTurnos();
          };
        });
      }
    }
  }

  function bindEventosTurnos() {
    const filtro = document.getElementById("trn-filtro-fecha");
    filtro.onchange = () => {
      fechaFiltro = filtro.value || hoyISO(0);
      document.getElementById("trn-fecha").value = fechaFiltro;
      renderTurnos();
    };

    document.getElementById("trn-btn-hoy").onclick = () => {
      fechaFiltro = hoyISO(0);
      filtro.value = fechaFiltro;
      document.getElementById("trn-fecha").value = fechaFiltro;
      renderTurnos();
    };

    document.getElementById("trn-btn-manana").onclick = () => {
      fechaFiltro = hoyISO(1);
      filtro.value = fechaFiltro;
      document.getElementById("trn-fecha").value = fechaFiltro;
      renderTurnos();
    };

    document.querySelectorAll(".trn-quick-btn").forEach((btn) => {
      btn.onclick = () => {
        const dias = Number(btn.getAttribute("data-followup") || 15);
        const srv = btn.getAttribute("data-srv") || "";
        const f = hoyISO(dias);
        document.getElementById("trn-fecha").value = f;
        fechaFiltro = f;
        filtro.value = f;
        const inpSrv = document.getElementById("trn-servicios-txt");
        if (srv && !inpSrv.value.includes(srv)) {
          inpSrv.value = inpSrv.value.trim() ? inpSrv.value.trim() + ", " + srv : srv;
        }
        renderTurnos();
      };
    });

    document.getElementById("trn-btn-guardar").onclick = () => {
      const clienta = document.getElementById("trn-clienta").value.trim();
      const telefono = document.getElementById("trn-telefono").value.trim();
      const fecha = document.getElementById("trn-fecha").value;
      const hora = document.getElementById("trn-hora").value;
      const servicios = document.getElementById("trn-servicios-txt").value.trim();
      const nota = document.getElementById("trn-nota").value.trim();

      if (!clienta) return alert("Ingresá el nombre de la clienta.");
      if (!fecha || !hora) return alert("Seleccioná fecha y hora.");
      if (!servicios) return alert("Ingresá al menos un servicio (ej: Brushing, lavado, corte).");

      const lista = cargarTurnos();
      lista.push({
        id: "trn_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6),
        clienta,
        telefono,
        fecha,
        hora,
        servicios,
        nota,
        estado: "reservado",
        createdAt: Date.now()
      });
      guardarTurnos(lista);

      document.getElementById("trn-clienta").value = "";
      document.getElementById("trn-servicios-txt").value = "";
      document.getElementById("trn-nota").value = "";
      fechaFiltro = fecha;
      filtro.value = fecha;
      renderTurnos();
    };
  }

  let vistasOcultadas = [];

  function restaurarVistasNativas() {
    const sec = document.getElementById("vista-turnos-salon");
    if (sec) sec.style.display = "none";
    vistasOcultadas.forEach(({ el, prevDisplay }) => {
      el.style.display = prevDisplay;
    });
    vistasOcultadas = [];
  }

  function mostrarVistaTurnos() {
    construirVistaTurnos();
    const sec = document.getElementById("vista-turnos-salon");
    if (!sec) return;
    if (sec.style.display === "block") {
      renderTurnos();
      return;
    }
    vistasOcultadas = [];
    Array.from(sec.parentElement.children).forEach((el) => {
      if (el === sec) return;
      if (el.tagName === "NAV" || el.tagName === "HEADER" || el.id === "modal-superadmin-auth") return;
      const computed = window.getComputedStyle(el).display;
      if (computed !== "none") {
        vistasOcultadas.push({ el, prevDisplay: el.style.display });
        el.style.display = "none";
      }
    });
    sec.style.display = "block";
    renderTurnos();
  }

  function inyectarBotonPestana() {
    if (document.getElementById("nav-btn-turnos")) return;
    const navButtons = Array.from(document.querySelectorAll("nav button, header button, .tab-btn, [data-tab], [onclick*='mostrarVista'], [onclick*='cambiarTab']"));
    const refBtn = navButtons.find((b) => /caja|ventas|clientes|servicios|reportes/i.test(b.textContent || ""));
    if (!refBtn || !refBtn.parentElement) return;

    const btn = document.createElement("button");
    btn.id = "nav-btn-turnos";
    btn.type = "button";
    btn.className = refBtn.className;
    btn.textContent = "📅 Turnos";
    btn.onclick = (e) => {
      e.preventDefault();
      mostrarVistaTurnos();
    };

    // En fase de captura (true), restaurar las vistas nativas ANTES de que la app cambie a la pestaña tocada
    document.addEventListener("click", (ev) => {
      const clickedNav = ev.target && ev.target.closest("button, [data-tab]");
      if (!clickedNav || clickedNav.id === "nav-btn-turnos") return;
      if (refBtn.parentElement.contains(clickedNav)) {
        restaurarVistasNativas();
      }
    }, true);

    refBtn.parentElement.appendChild(btn);
  }

  setInterval(inyectarBotonPestana, 700);
})();
