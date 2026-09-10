import { upload } from "https://esm.sh/@vercel/blob/client";

const form = document.querySelector("#propertyForm");
const statusEl = document.querySelector("#adminStatus");

function setStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.classList.toggle("is-error", isError);
}

function splitFeatures(value) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

async function uploadFiles(files, pin) {
  const urls = [];

  for (const file of files) {
    setStatus(`Subiendo ${file.name}...`);
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, "-");
    const blob = await upload(`inmuebles/${Date.now()}-${safeName}`, file, {
      access: "public",
      handleUploadUrl: `/api/upload?pin=${encodeURIComponent(pin)}`
    });
    urls.push(blob.url);
  }

  return urls;
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const data = new FormData(form);
  const pin = data.get("pin");
  const files = Array.from(data.getAll("media")).filter((file) => file.size > 0);

  if (files.length === 0) {
    setStatus("Debes cargar al menos una foto.", true);
    return;
  }

  try {
    setStatus("Preparando carga...");
    const mediaUrls = await uploadFiles(files, pin);
    const imageUrls = mediaUrls.filter((url) => !url.toLowerCase().match(/\.(mp4|mov)(\?|$)/));
    const firstVideo = mediaUrls.find((url) => url.toLowerCase().match(/\.(mp4|mov)(\?|$)/));

    const payload = {
      title: data.get("title"),
      type: data.get("type"),
      operation: data.get("operation"),
      price: data.get("price"),
      location: data.get("location"),
      mapUrl: data.get("mapUrl"),
      videoUrl: data.get("videoUrl") || firstVideo || "",
      images: imageUrls.length ? imageUrls : mediaUrls,
      features: splitFeatures(data.get("features") || ""),
      description: data.get("description")
    };

    setStatus("Guardando inmueble...");
    const response = await fetch("/api/properties", {
      method: "POST",
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
    setStatus(`Publicado: ${result.property.title}`);
  } catch (error) {
    setStatus(error.message || "Error publicando el inmueble", true);
  }
});
