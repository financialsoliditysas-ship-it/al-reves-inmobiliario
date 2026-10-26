import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const supabase = createClient(
  "https://imskfyqryfdkciooobsb.supabase.co",
  "sb_publishable_sPYgQH1mOYD_woV0fOdTag_Y5xTdSjb"
);

const form = document.querySelector("#propertyForm");
const statusEl = document.querySelector("#adminStatus");
const propertyIdInput = document.querySelector("#propertyId");
const submitButton = document.querySelector("#submitButton");
const newButton = document.querySelector("#newButton");
const listPin = document.querySelector("#listPin");
const loadPropertiesButton = document.querySelector("#loadPropertiesButton");
const adminPropertyList = document.querySelector("#adminPropertyList");
const metricsPin = document.querySelector("#metricsPin");
const loadMetricsButton = document.querySelector("#loadMetricsButton");
let loadedProperties = [];
let cachedAdminPin = "";

function setStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.classList.toggle("is-error", isError);
}

function setMode(property) {
  propertyIdInput.value = property?.id || "";
  submitButton.textContent = property ? "Actualizar inmueble" : "Guardar y publicar";
  document.querySelector(".admin-intro h1").textContent = property ? "Actualizar inmueble" : "Subir inmueble nuevo";
  document.querySelector("#media").required = !property;
}

function fillForm(property) {
  setMode(property);
  if (!form.elements.pin.value && cachedAdminPin) {
    form.elements.pin.value = cachedAdminPin;
  }
  form.elements.reference.value = property.reference || property.id || "";
  form.elements.status.value = property.status || property.availability || "Disponible";
  form.elements.title.value = property.title || "";
  form.elements.price.value = property.price || "";
  form.elements.rent.value = property.rent || "";
  form.elements.adminFee.value = property.adminFee || "";
  form.elements.otherCharges.value = property.otherCharges || "";
  form.elements.operation.value = property.operation || "Venta";
  form.elements.type.value = property.type || "Casa";
  form.elements.municipality.value = property.municipality || "";
  form.elements.neighborhood.value = property.neighborhood || "";
  form.elements.location.value = property.location || "";
  form.elements.mapUrl.value = property.mapUrl || "";
  form.elements.features.value = Array.isArray(property.features) ? property.features.join(", ") : "";
  form.elements.description.value = property.description || "";
  form.elements.videoUrl.value = property.videoUrl || "";
  setStatus(`Editando: ${property.title}`);
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function rememberPin(pin) {
  cachedAdminPin = String(pin || "").trim();
  if (cachedAdminPin) {
    form.elements.pin.value = cachedAdminPin;
    listPin.value = cachedAdminPin;
    metricsPin.value = metricsPin.value || cachedAdminPin;
  }
  return cachedAdminPin;
}

function currentPin(data) {
  return rememberPin(data?.get("pin") || form.elements.pin.value || listPin.value || metricsPin.value);
}

function friendlyError(error) {
  const message = error?.message || "";
  if (message === "Unauthorized" || message === "PIN_INVALIDO") {
    return "PIN inválido o vacío. Usa el mismo PIN privado con el que cargaste la lista e intenta de nuevo.";
  }
  return message || "Error procesando la solicitud";
}

function renderPropertyList() {
  if (loadedProperties.length === 0) {
    adminPropertyList.innerHTML = '<p class="muted">No hay inmuebles cargados todavia.</p>';
    return;
  }

  adminPropertyList.innerHTML = loadedProperties
    .map(
      (property) => `
        <button type="button" class="admin-property-item" data-id="${property.id}">
          <strong>${property.title}</strong>
          <span>${property.operation} | ${property.price}</span>
        </button>
      `
    )
    .join("");

  adminPropertyList.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => {
      const property = loadedProperties.find((item) => item.id === button.dataset.id);
      if (property) fillForm(property);
    });
  });
}

async function loadSavedProperties(pin) {
  const response = await fetch("/api/properties", {
    headers: {
      "x-admin-pin": pin
    },
    cache: "no-store"
  });
  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || "No se pudo cargar la lista");
  }

  loadedProperties = Array.isArray(result.properties) ? result.properties : [];
  renderPropertyList();
}

async function loadMetrics(pin) {
  const response = await fetch("/api/metrics", {
    headers: {
      "x-admin-pin": pin
    },
    cache: "no-store"
  });
  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || "No se pudieron cargar las metricas");
  }

  const metrics = result.metrics || {};
  document.querySelector("#adminSearchesMetric").textContent = Number(metrics.searches || 0);
  document.querySelector("#adminViewsMetric").textContent = Number(metrics.property_views || metrics.views || 0);
  document.querySelector("#adminContactMetric").textContent = Number(metrics.contact_clicks || metrics.whatsapp || 0);
  document.querySelector("#adminRequestsMetric").textContent = Number(metrics.requests_opened || metrics.leads || 0);
  document.querySelector("#adminSharesMetric").textContent = Number(metrics.shares || 0);
  document.querySelector("#adminOwnersMetric").textContent = Number(metrics.owner_publication_requests || 0);
}

function splitFeatures(value) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

async function optimizeImage(file) {
  if (!file.type.startsWith("image/") || file.type === "image/gif") return file;
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1800 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  canvas.getContext("2d", { alpha: false }).drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob((result) => result ? resolve(result) : reject(new Error("No se pudo optimizar la imagen")), "image/webp", 0.82);
  });
  const baseName = file.name.replace(/\.[^.]+$/, "");
  return new File([blob], `${baseName}.webp`, { type: "image/webp", lastModified: Date.now() });
}

async function uploadFiles(files, pin) {
  const urls = [];

  for (const file of files) {
    if (file.type.startsWith("video/") && file.size > 50 * 1024 * 1024) {
      throw new Error(`El video ${file.name} supera el límite de 50 MB.`);
    }
    setStatus(`Optimizando y subiendo ${file.name}...`);
    const preparedFile = await optimizeImage(file);
    const tokenResponse = await fetch("/api/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-pin": pin },
      body: JSON.stringify({ fileName: preparedFile.name, contentType: preparedFile.type })
    });
    const tokenResult = await tokenResponse.json();
    if (!tokenResponse.ok) throw new Error(tokenResult.error || "No se pudo autorizar la carga");
    const { error } = await supabase.storage.from("property-media").uploadToSignedUrl(
      tokenResult.path,
      tokenResult.token,
      preparedFile,
      { contentType: preparedFile.type }
    );
    if (error) throw error;
    urls.push(tokenResult.publicUrl);
  }

  return urls;
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const data = new FormData(form);
  const pin = currentPin(data);
  const files = Array.from(data.getAll("media")).filter((file) => file.size > 0);
  const isEditing = Boolean(propertyIdInput.value);

  if (!pin) {
    setStatus("Escribe el PIN privado antes de guardar o actualizar.", true);
    return;
  }

  if (!isEditing && files.length === 0) {
    setStatus("Debes cargar al menos una foto.", true);
    return;
  }

  try {
    setStatus("Preparando carga...");
    const existing = loadedProperties.find((item) => item.id === propertyIdInput.value);
    const mediaUrls = files.length > 0 ? await uploadFiles(files, pin) : [];
    const imageUrls = mediaUrls.filter((url) => !url.toLowerCase().match(/\.(mp4|mov)(\?|$)/));
    const firstVideo = mediaUrls.find((url) => url.toLowerCase().match(/\.(mp4|mov)(\?|$)/));

    const payload = {
      id: propertyIdInput.value,
      reference: data.get("reference"),
      title: data.get("title"),
      type: data.get("type"),
      operation: data.get("operation"),
      status: data.get("status"),
      price: data.get("price"),
      rent: data.get("rent"),
      adminFee: data.get("adminFee"),
      otherCharges: data.get("otherCharges"),
      location: data.get("location"),
      municipality: data.get("municipality"),
      neighborhood: data.get("neighborhood"),
      mapUrl: data.get("mapUrl"),
      videoUrl: data.get("videoUrl") || firstVideo || existing?.videoUrl || "",
      images: [...(existing?.images || []), ...(imageUrls.length ? imageUrls : mediaUrls)],
      features: splitFeatures(data.get("features") || ""),
      description: data.get("description")
    };

    setStatus("Guardando inmueble...");
    const response = await fetch("/api/properties", {
      method: propertyIdInput.value ? "PUT" : "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-pin": pin
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || "No se pudo guardar el inmueble");
    }

    form.reset();
    setMode(null);
    await loadSavedProperties(pin);
    setStatus(`${isEditing ? "Actualizado" : "Publicado"}: ${result.property.title}`);
  } catch (error) {
    setStatus(friendlyError(error), true);
  }
});

loadPropertiesButton.addEventListener("click", async () => {
  try {
    const pin = rememberPin(listPin.value);
    if (!pin) {
      setStatus("Escribe el PIN privado para cargar los inmuebles.", true);
      return;
    }
    setStatus("Cargando inmuebles...");
    await loadSavedProperties(pin);
    setStatus("Lista cargada.");
  } catch (error) {
    setStatus(friendlyError(error), true);
  }
});

loadMetricsButton.addEventListener("click", async () => {
  try {
    const pin = rememberPin(metricsPin.value);
    if (!pin) {
      setStatus("Escribe el PIN privado para ver las métricas.", true);
      return;
    }
    setStatus("Cargando metricas...");
    await loadMetrics(pin);
    setStatus("Metricas actualizadas.");
  } catch (error) {
    setStatus(friendlyError(error), true);
  }
});

newButton.addEventListener("click", () => {
  form.reset();
  setMode(null);
  setStatus("Formulario listo para publicar un inmueble nuevo.");
});

setMode(null);
