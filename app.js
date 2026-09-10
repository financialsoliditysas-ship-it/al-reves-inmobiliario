const whatsappNumber = "573147637745";

const fallbackProperties = [
  {
    id: "casa-la-playa",
    title: "Casa amplia lista para vender en Nechi",
    type: "Casa",
    operation: "Venta",
    price: "$185.000.000",
    location: "Barrio La Playa, Nechi",
    mapUrl: "https://www.google.com/maps/search/?api=1&query=Nechi%20Antioquia%20Barrio%20La%20Playa",
    videoUrl: "https://www.youtube.com/results?search_query=casa+en+venta+nechi",
    images: [
      "https://images.unsplash.com/photo-1570129477492-45c003edd2be?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80"
    ],
    features: ["3 habitaciones", "2 banos", "Patio", "Sala comedor", "Cerca al comercio"],
    description:
      "Casa familiar con espacios amplios, buena iluminacion y ubicacion practica para vivir o invertir. Ideal para publicar con fotos reales, video corto y visitas filtradas."
  },
  {
    id: "apartamento-centro",
    title: "Apartamento central en arriendo",
    type: "Apartamento",
    operation: "Arriendo",
    price: "$750.000 / mes",
    location: "Centro de Nechi",
    mapUrl: "https://www.google.com/maps/search/?api=1&query=Centro%20Nechi%20Antioquia",
    videoUrl: "https://www.youtube.com/results?search_query=apartamento+en+arriendo+nechi",
    images: [
      "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1560184897-ae75f418493e?auto=format&fit=crop&w=1200&q=80"
    ],
    features: ["2 habitaciones", "1 bano", "Cocina", "Zona central"],
    description:
      "Apartamento comodo para familia pequena, funcionario o contratista que necesita ubicacion central y acceso rapido a servicios."
  },
  {
    id: "local-comercial",
    title: "Local comercial para emprender",
    type: "Local",
    operation: "Arriendo",
    price: "$1.200.000 / mes",
    location: "Zona comercial, Nechi",
    mapUrl: "https://www.google.com/maps/search/?api=1&query=Zona%20comercial%20Nechi%20Antioquia",
    videoUrl: "https://www.youtube.com/results?search_query=local+comercial+nechi",
    images: [
      "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1604328698692-f76ea9498e76?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=1200&q=80"
    ],
    features: ["Frente comercial", "Alto trafico", "Bano", "Espacio abierto"],
    description:
      "Local visible y practico para negocio pequeno. El contacto directo permite medir demanda y agendar visita rapidamente."
  }
];

let properties = [...fallbackProperties];

const metrics = JSON.parse(localStorage.getItem("ariMetrics") || '{"views":0,"whatsapp":0,"leads":0}');
const list = document.querySelector("#propertyList");
const searchInput = document.querySelector("#searchInput");
const operationFilter = document.querySelector("#operationFilter");
const typeFilter = document.querySelector("#typeFilter");

function saveMetrics() {
  localStorage.setItem("ariMetrics", JSON.stringify(metrics));
  document.querySelector("#viewsMetric").textContent = metrics.views;
  document.querySelector("#whatsappMetric").textContent = metrics.whatsapp;
  document.querySelector("#leadsMetric").textContent = metrics.leads;
}

function whatsappUrl(text) {
  return `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(text)}`;
}

function moneyText(property) {
  return `${property.operation} | ${property.price}`;
}

function renderProperties() {
  const term = searchInput.value.trim().toLowerCase();
  const operation = operationFilter.value;
  const type = typeFilter.value;

  const filtered = properties.filter((property) => {
    const haystack = `${property.title} ${property.type} ${property.operation} ${property.location} ${property.description}`.toLowerCase();
    return (
      haystack.includes(term) &&
      (operation === "todos" || property.operation === operation) &&
      (type === "todos" || property.type === type)
    );
  });

  if (filtered.length === 0) {
    list.innerHTML = '<p class="muted">No hay inmuebles con esos filtros.</p>';
    return;
  }

  list.innerHTML = filtered
    .map(
      (property) => `
        <article class="property-card" data-id="${property.id}" tabindex="0">
          <img src="${property.images[0]}" alt="${property.title}">
          <div class="property-body">
            <div class="card-top">
              <span class="pill">${property.operation}</span>
              <span class="muted">${property.type}</span>
            </div>
            <h3>${property.title}</h3>
            <p class="price">${property.price}</p>
            <span class="muted">${property.location}</span>
          </div>
        </article>
      `
    )
    .join("");

  document.querySelectorAll(".property-card").forEach((card) => {
    const open = () => selectProperty(card.dataset.id);
    card.addEventListener("click", open);
    card.addEventListener("keydown", (event) => {
      if (event.key === "Enter") open();
    });
  });
}

function selectProperty(id) {
  const property = properties.find((item) => item.id === id) || properties[0];
  if (!property) {
    return;
  }

  metrics.views += 1;
  saveMetrics();

  document.querySelector("#detailOperation").textContent = property.operation;
  document.querySelector("#detailTitle").textContent = property.title;
  document.querySelector("#detailPrice").textContent = moneyText(property);
  document.querySelector("#detailLocation").textContent = property.location;
  document.querySelector("#detailDescription").textContent = property.description;
  document.querySelector("#mainImage").src = property.images[0];

  const thumbs = document.querySelector("#thumbs");
  thumbs.innerHTML = property.images
    .map(
      (image, index) => `
        <button type="button" class="${index === 0 ? "active" : ""}" data-image="${image}" aria-label="Ver foto ${index + 1}">
          <img src="${image}" alt="Foto ${index + 1} de ${property.title}">
        </button>
      `
    )
    .join("");

  thumbs.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelector("#mainImage").src = button.dataset.image;
      thumbs.querySelectorAll("button").forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
    });
  });

  document.querySelector("#detailFeatures").innerHTML = property.features.map((feature) => `<span>${feature}</span>`).join("");
  document.querySelector("#detailMap").href = property.mapUrl;
  document.querySelector("#detailVideo").href = property.videoUrl;
  document.querySelector("#detailWhatsapp").href = whatsappUrl(`Hola, quiero informacion sobre: ${property.title} (${property.price})`);
  document.querySelector("#detalle").scrollIntoView({ behavior: "smooth", block: "start" });
}

async function loadProperties() {
  try {
    const response = await fetch("/api/properties", { cache: "no-store" });
    if (!response.ok) {
      throw new Error("Backend unavailable");
    }

    const data = await response.json();
    if (Array.isArray(data.properties) && data.properties.length > 0) {
      properties = data.properties;
    }
  } catch {
    properties = [...fallbackProperties];
  }
}

function setupContactLinks() {
  const publishText = "Hola, quiero publicar un inmueble con Al Reves Inmobiliario.";
  document.querySelector("#headerWhatsapp").href = whatsappUrl("Hola, quiero informacion de inmuebles en Nechi.");
  document.querySelector("#publishWhatsapp").href = whatsappUrl(publishText);

  document.querySelectorAll("#headerWhatsapp, #publishWhatsapp, #detailWhatsapp").forEach((link) => {
    link.addEventListener("click", () => {
      metrics.whatsapp += 1;
      saveMetrics();
    });
  });
}

function setupLeadForm() {
  document.querySelector("#leadForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const text = [
      "Hola, quiero que me contacten desde Al Reves Inmobiliario.",
      `Nombre: ${data.get("name")}`,
      `Celular: ${data.get("phone")}`,
      `Interes: ${data.get("interest")}`,
      `Mensaje: ${data.get("message") || "Sin mensaje adicional"}`
    ].join("\n");
    metrics.leads += 1;
    metrics.whatsapp += 1;
    saveMetrics();
    window.open(whatsappUrl(text), "_blank", "noopener,noreferrer");
    event.currentTarget.reset();
  });
}

searchInput.addEventListener("input", renderProperties);
operationFilter.addEventListener("change", renderProperties);
typeFilter.addEventListener("change", renderProperties);

async function init() {
  await loadProperties();
  document.querySelector("#heroCount").textContent = properties.length;
  renderProperties();
  selectProperty(properties[0]?.id);
  setupContactLinks();
  setupLeadForm();
  saveMetrics();
}

init();
