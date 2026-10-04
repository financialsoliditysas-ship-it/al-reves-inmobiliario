const whatsappNumber = "573147637745";

let properties = [];
let selectedProperty = null;

const els = {
  list: document.querySelector("#propertyList"),
  resultSummary: document.querySelector("#resultSummary"),
  activeFilters: document.querySelector("#activeFilters"),
  searchInput: document.querySelector("#searchInput"),
  operationFilter: document.querySelector("#operationFilter"),
  municipalityFilter: document.querySelector("#municipalityFilter"),
  typeFilter: document.querySelector("#typeFilter"),
  budgetFilter: document.querySelector("#budgetFilter"),
  moreFilters: document.querySelector("#moreFilters"),
  detail: document.querySelector("#inmueble"),
  mobileContactBar: document.querySelector("#mobileContactBar")
};

function normalize(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function moneyNumber(value) {
  const digits = String(value || "").replace(/[^\d]/g, "");
  return digits ? Number(digits) : 0;
}

function formatCop(value) {
  const amount = moneyNumber(value);
  return amount ? new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(amount) : value || "Precio por consultar";
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function publicText(value) {
  return String(value || "").replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, "").replace(/\s{2,}/g, " ").trim();
}

function imageMarkup(src, alt, className = "") {
  if (src) {
    return `<img${className ? ` class="${className}"` : ""} src="${escapeHtml(src)}" alt="${escapeHtml(alt)}" loading="lazy">`;
  }

  return `
    <div class="image-placeholder${className ? ` ${className}` : ""}" role="img" aria-label="${escapeHtml(alt)}">
      <span>Foto pendiente</span>
    </div>
  `;
}

function trackMetric(event) {
  fetch("/api/metrics", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ event }),
    keepalive: true
  }).catch(() => {});
}

function whatsappUrl(text) {
  return `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(text)}`;
}

function splitLocation(location) {
  const parts = String(location || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  return {
    neighborhood: parts.length > 1 ? parts[0] : "",
    municipality: parts.length > 1 ? parts[parts.length - 1] : parts[0] || "Sin municipio"
  };
}

function municipalityOf(property) {
  return property.municipality || splitLocation(property.location).municipality || "Sin municipio";
}

function neighborhoodOf(property) {
  return property.neighborhood || splitLocation(property.location).neighborhood || property.location || "Ubicación por consultar";
}

function availabilityOf(property) {
  return property.status || property.availability || "Disponible";
}

function priceLabel(property) {
  if (property.operation === "Arriendo") {
    return property.rent || property.price || "Canon por consultar";
  }
  return property.price || "Precio por consultar";
}

function allText(property) {
  return normalize([
    property.title,
    property.reference,
    property.type,
    property.operation,
    property.location,
    property.municipality,
    property.neighborhood,
    property.description,
    ...(property.features || [])
  ].join(" "));
}

function shareUrl(property) {
  return `${window.location.origin}/api/share?id=${encodeURIComponent(property.id)}`;
}

function directUrl(property) {
  return `${window.location.origin}/?inmueble=${encodeURIComponent(property.id)}`;
}

function contactText(property, intent = "visita") {
  const action = intent === "pregunta" ? "hacer una pregunta sobre" : "solicitar una visita para";
  return [
    `Hola, quiero ${action} este inmueble de Al Revés Inmobiliaria.`,
    `Referencia: ${property.reference || property.id}`,
    `Inmueble: ${publicText(property.title)}`,
    `Operación: ${property.operation}`,
    `Precio/canon: ${priceLabel(property)}`,
    `URL: ${shareUrl(property)}`
  ].join("\n");
}

function saveFiltersToUrl(propertyId) {
  const params = new URLSearchParams();
  if (propertyId) params.set("inmueble", propertyId);
  if (els.operationFilter.value !== "todos") params.set("operacion", els.operationFilter.value);
  if (els.municipalityFilter.value !== "todos") params.set("municipio", els.municipalityFilter.value);
  if (els.typeFilter.value !== "todos") params.set("tipo", els.typeFilter.value);
  if (els.budgetFilter.value.trim()) params.set("presupuesto", els.budgetFilter.value.trim());
  if (els.searchInput.value.trim()) params.set("q", els.searchInput.value.trim());
  history.replaceState(null, "", `${window.location.pathname}?${params.toString()}${propertyId ? "#inmueble" : "#catalogo"}`);
}

function applyFiltersFromUrl() {
  const params = new URLSearchParams(window.location.search);
  if (params.get("operacion")) els.operationFilter.value = params.get("operacion");
  if (params.get("tipo")) els.typeFilter.value = params.get("tipo");
  if (params.get("presupuesto")) els.budgetFilter.value = params.get("presupuesto");
  if (params.get("q")) els.searchInput.value = params.get("q");
}

function updateMunicipalityOptions() {
  const selected = new URLSearchParams(window.location.search).get("municipio") || els.municipalityFilter.value;
  const municipalities = [...new Set(properties.map(municipalityOf).filter(Boolean))].sort((a, b) => a.localeCompare(b, "es"));
  els.municipalityFilter.innerHTML = '<option value="todos">Todos los municipios</option>';
  municipalities.forEach((municipality) => {
    const option = document.createElement("option");
    option.value = municipality;
    option.textContent = municipality;
    els.municipalityFilter.append(option);
  });
  if (municipalities.includes(selected)) els.municipalityFilter.value = selected;
}

function getFilteredProperties() {
  const term = normalize(els.searchInput.value);
  const operation = els.operationFilter.value;
  const municipality = els.municipalityFilter.value;
  const type = els.typeFilter.value;
  const maxBudget = moneyNumber(els.budgetFilter.value);

  return properties.filter((property) => {
    const listedPrice = moneyNumber(priceLabel(property));
    return (
      (!term || allText(property).includes(term)) &&
      (operation === "todos" || property.operation === operation) &&
      (municipality === "todos" || municipalityOf(property) === municipality) &&
      (type === "todos" || property.type === type) &&
      (!maxBudget || !listedPrice || listedPrice <= maxBudget)
    );
  });
}

function renderActiveFilters(filtered) {
  const labels = [];
  if (els.operationFilter.value !== "todos") labels.push(els.operationFilter.value);
  if (els.municipalityFilter.value !== "todos") labels.push(els.municipalityFilter.value);
  if (els.typeFilter.value !== "todos") labels.push(els.typeFilter.value);
  if (els.budgetFilter.value.trim()) labels.push(`Hasta ${formatCop(els.budgetFilter.value)}`);
  if (els.searchInput.value.trim()) labels.push(`Texto: ${els.searchInput.value.trim()}`);

  els.resultSummary.textContent = `${filtered.length} resultado${filtered.length === 1 ? "" : "s"} de ${properties.length} inmueble${properties.length === 1 ? "" : "s"} publicado${properties.length === 1 ? "" : "s"}`;
  els.activeFilters.innerHTML = labels.length
    ? `${labels.map((label) => `<span>${escapeHtml(label)}</span>`).join("")}<button type="button" id="clearFiltersInline">Limpiar filtros</button>`
    : '<span>Sin filtros activos</span>';

  document.querySelector("#clearFiltersInline")?.addEventListener("click", clearFilters);
}

function renderProperties() {
  const filtered = getFilteredProperties();
  renderActiveFilters(filtered);
  saveFiltersToUrl(selectedProperty?.id);

  if (!properties.length) {
    els.list.innerHTML = `
      <div class="empty-state">
        <h3>No hay inmuebles publicados en este momento.</h3>
        <p>Cuando el administrador cargue inventario real, aparecerá aquí. Puedes solicitar ayuda para buscar una opción.</p>
        <a class="primary" href="#contacto">Cuéntanos qué buscas</a>
      </div>
    `;
    return;
  }

  if (!filtered.length) {
    els.list.innerHTML = `
      <div class="empty-state">
        <h3>No encontramos inmuebles con esos filtros.</h3>
        <p>Modifica la búsqueda o envíanos lo que necesitas para revisar opciones disponibles.</p>
        <div class="empty-actions">
          <button type="button" class="secondary" id="emptyClear">Modificar búsqueda</button>
          <a class="primary" href="#contacto">Solicitar opciones</a>
        </div>
      </div>
    `;
    document.querySelector("#emptyClear")?.addEventListener("click", clearFilters);
    return;
  }

  els.list.innerHTML = filtered
    .map((property) => {
      const status = availabilityOf(property);
      const neighborhood = neighborhoodOf(property);
      const municipality = municipalityOf(property);
      const featureText = (property.features || []).slice(0, 3).map(publicText).join(" · ");
      const image = property.images?.[0] || "";
      return `
        <article class="property-card" data-id="${escapeHtml(property.id)}" tabindex="0">
          ${imageMarkup(image, publicText(property.title))}
          <div class="property-body">
            <div class="card-top">
              <span class="pill">${escapeHtml(property.operation || "Operación")}</span>
              <span class="availability">${escapeHtml(status)}</span>
            </div>
            <h3>${escapeHtml(publicText(property.title))}</h3>
            <p class="price">${escapeHtml(formatCop(priceLabel(property)))}</p>
            <p class="muted">${escapeHtml(property.type || "Tipo por consultar")} · ${escapeHtml(neighborhood)} · ${escapeHtml(municipality)}</p>
            ${featureText ? `<p class="feature-line">${escapeHtml(featureText)}</p>` : ""}
          </div>
        </article>
      `;
    })
    .join("");

  document.querySelectorAll(".property-card").forEach((card) => {
    const open = () => selectProperty(card.dataset.id, true);
    card.addEventListener("click", open);
    card.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        open();
      }
    });
  });
}

function renderPriceBreakdown(property) {
  const lines = [];
  if (property.operation === "Arriendo") {
    lines.push(["Canon mensual", property.rent || property.price]);
    if (property.adminFee) lines.push(["Administración", property.adminFee]);
    if (property.otherCharges) lines.push(["Otros cargos", property.otherCharges]);
  }

  document.querySelector("#priceBreakdown").innerHTML = lines.length
    ? lines.map(([label, value]) => `<span><strong>${escapeHtml(label)}:</strong> ${escapeHtml(formatCop(value))}</span>`).join("")
    : "";
}

function renderStructuredData(property) {
  const location = `${neighborhoodOf(property)}, ${municipalityOf(property)}`;
  const rows = [
    ["Tipo", property.type || "Por consultar"],
    ["Ubicación", location],
    ["Disponibilidad", availabilityOf(property)],
    ["Referencia", property.reference || property.id]
  ];

  document.querySelector("#structuredData").innerHTML = rows
    .map(([term, value]) => `<div><dt>${escapeHtml(term)}</dt><dd>${escapeHtml(value)}</dd></div>`)
    .join("");
}

function renderNotice(property) {
  const text = `${property.title || ""} ${property.description || ""}`;
  const hasConstructionSignal = /mejora|construccion|construcción|obra gris|incompleta/i.test(text);
  const notice = document.querySelector("#propertyNotice");

  if (property.type === "Casa" && hasConstructionSignal) {
    notice.hidden = false;
    notice.textContent = "Dato pendiente por confirmar: el inmueble figura como casa, pero la descripción menciona mejora, construcción u obra incompleta. La situación jurídica y física debe validarse con el propietario.";
    return;
  }

  notice.hidden = true;
  notice.textContent = "";
}

function selectProperty(id, fromUser = false) {
  const property = properties.find((item) => item.id === id);
  if (!property) return;

  selectedProperty = property;
  if (fromUser) trackMetric("property_views");

  document.querySelector("#detailReference").textContent = `Referencia: ${property.reference || property.id}`;
  document.querySelector("#detailOperation").textContent = property.operation || "Operación";
  document.querySelector("#detailStatus").textContent = availabilityOf(property);
  document.querySelector("#detailTitle").textContent = publicText(property.title) || "Inmueble";
  document.querySelector("#detailPrice").textContent = formatCop(priceLabel(property));
  document.querySelector("#detailDescription").textContent = publicText(property.description) || "Descripción por completar.";
  const mainImage = document.querySelector("#mainImage");
  const firstImage = property.images?.[0] || "";
  mainImage.src = firstImage;
  mainImage.alt = firstImage ? `Foto principal de ${publicText(property.title)}` : "Foto pendiente del inmueble";
  mainImage.hidden = !firstImage;

  renderPriceBreakdown(property);
  renderStructuredData(property);
  renderNotice(property);

  const thumbs = document.querySelector("#thumbs");
  const images = property.images || [];
  thumbs.innerHTML = images.length
    ? images
      .map(
        (image, index) => `
        <button type="button" class="${index === 0 ? "active" : ""}" data-image="${escapeHtml(image)}" aria-label="Ver foto ${index + 1}">
          <img src="${escapeHtml(image)}" alt="Foto ${index + 1} de ${escapeHtml(publicText(property.title))}" loading="lazy">
        </button>
      `
      )
      .join("")
    : '<div class="image-placeholder gallery-placeholder"><span>Fotos pendientes por recargar</span></div>';

  thumbs.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => {
      mainImage.hidden = false;
      mainImage.src = button.dataset.image;
      thumbs.querySelectorAll("button").forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
    });
  });

  document.querySelector("#detailFeatures").innerHTML = (property.features || []).map((feature) => `<span>${escapeHtml(publicText(feature))}</span>`).join("");
  document.querySelector("#detailMap").href = property.mapUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(property.location || municipalityOf(property))}`;
  document.querySelector("#detailVideo").href = property.videoUrl || "#";
  document.querySelector("#detailVideo").hidden = !property.videoUrl;
  document.querySelector("#detailWhatsapp").textContent = property.operation === "Arriendo" ? "Consultar disponibilidad" : "Solicitar visita";
  document.querySelector("#detailWhatsapp").href = whatsappUrl(contactText(property, "visita"));
  document.querySelector("#questionWhatsapp").href = whatsappUrl(contactText(property, "pregunta"));
  document.querySelector("#shareProperty").dataset.shareText = `${publicText(property.title)} - ${formatCop(priceLabel(property))}`;
  document.querySelector("#shareProperty").dataset.shareUrl = shareUrl(property);
  document.querySelector("#mobileVisitAction").href = whatsappUrl(contactText(property, "visita"));
  document.querySelector("#mobileVisitAction").textContent = property.operation === "Arriendo" ? "Consultar" : "Visita";
  els.detail.hidden = false;
  els.mobileContactBar.hidden = false;
  saveFiltersToUrl(property.id);
  if (fromUser) els.detail.scrollIntoView({ behavior: "smooth", block: "start" });
}

function clearFilters() {
  els.operationFilter.value = "todos";
  els.municipalityFilter.value = "todos";
  els.typeFilter.value = "todos";
  els.budgetFilter.value = "";
  els.searchInput.value = "";
  selectedProperty = null;
  els.detail.hidden = true;
  els.mobileContactBar.hidden = true;
  renderProperties();
}

async function loadProperties() {
  try {
    const response = await fetch("/api/properties", { cache: "no-store" });
    if (!response.ok) throw new Error("No se pudo cargar el inventario");
    const data = await response.json();
    properties = Array.isArray(data.properties) ? data.properties : [];
  } catch {
    properties = [];
  }
}

function setupFilters() {
  els.moreFilters.open = window.matchMedia("(min-width: 981px)").matches;

  [els.searchInput, els.operationFilter, els.municipalityFilter, els.typeFilter, els.budgetFilter].forEach((input) => {
    input.addEventListener("input", () => {
      trackMetric("searches");
      renderProperties();
    });
    input.addEventListener("change", () => {
      trackMetric("searches");
      renderProperties();
    });
  });

  document.querySelector("#clearFiltersTop").addEventListener("click", clearFilters);
  document.querySelector("#backToResults").addEventListener("click", () => {
    selectedProperty = null;
    els.detail.hidden = true;
    els.mobileContactBar.hidden = true;
    saveFiltersToUrl();
    document.querySelector("#catalogo").scrollIntoView({ behavior: "smooth" });
  });

  document.querySelectorAll("[data-operation-link]").forEach((link) => {
    link.addEventListener("click", () => {
      els.operationFilter.value = link.dataset.operationLink;
      renderProperties();
    });
  });
}

function setupShare() {
  async function shareCurrent() {
    if (!selectedProperty) return;
    const text = document.querySelector("#shareProperty").dataset.shareText || selectedProperty.title;
    const url = document.querySelector("#shareProperty").dataset.shareUrl || shareUrl(selectedProperty);

    if (navigator.share) {
      try {
        await navigator.share({ title: "Al Revés Inmobiliaria", text, url });
        trackMetric("shares");
        return;
      } catch {
        return;
      }
    }

    window.open(whatsappUrl(`${text}\n${url}`), "_blank", "noopener,noreferrer");
    trackMetric("shares");
  }

  document.querySelector("#shareProperty").addEventListener("click", shareCurrent);
  document.querySelector("#mobileShareAction").addEventListener("click", shareCurrent);

  document.querySelector("#saveProperty").addEventListener("click", () => {
    if (!selectedProperty) return;
    const saved = new Set(JSON.parse(localStorage.getItem("savedProperties") || "[]"));
    saved.add(selectedProperty.id);
    localStorage.setItem("savedProperties", JSON.stringify([...saved]));
    document.querySelector("#saveProperty").textContent = "Guardado";
  });
}

function setupContactTracking() {
  ["#detailWhatsapp", "#questionWhatsapp", "#mobileVisitAction"].forEach((selector) => {
    document.querySelector(selector).addEventListener("click", () => {
      trackMetric("contact_clicks");
      trackMetric("requests_opened");
    });
  });
}

function setupForms() {
  document.querySelector("#buyerForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const text = [
      "Hola, quiero que me contacten desde Al Revés Inmobiliaria.",
      `Nombre: ${data.get("name")}`,
      `Celular: ${data.get("phone")}`,
      `Necesidad: ${data.get("interest")}`,
      `Detalle: ${data.get("message") || "Sin detalle adicional"}`
    ].join("\n");
    trackMetric("requests_opened");
    window.open(whatsappUrl(text), "_blank", "noopener,noreferrer");
  });

  document.querySelector("#ownerForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const text = [
      "Hola, quiero solicitar la publicación de un inmueble en Al Revés Inmobiliaria.",
      `Nombre: ${data.get("name")}`,
      `Celular: ${data.get("phone")}`,
      `Operación: ${data.get("operation")}`,
      `Datos del inmueble: ${data.get("message") || "Pendiente por ampliar"}`
    ].join("\n");
    trackMetric("owner_publication_requests");
    window.open(whatsappUrl(text), "_blank", "noopener,noreferrer");
  });
}

async function init() {
  applyFiltersFromUrl();
  await loadProperties();
  updateMunicipalityOptions();
  setupFilters();
  setupShare();
  setupContactTracking();
  setupForms();
  renderProperties();

  const requestedPropertyId = new URLSearchParams(window.location.search).get("inmueble");
  if (requestedPropertyId) selectProperty(requestedPropertyId, false);
}

init();
