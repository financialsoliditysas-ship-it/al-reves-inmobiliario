import { list, put } from "@vercel/blob";

const dataPath = "data/properties.json";
const metricsPath = "data/metrics.json";

export async function readProperties() {
  const { blobs } = await list({ prefix: dataPath, limit: 1 });
  const blob = blobs.find((item) => item.pathname === dataPath);

  if (!blob) {
    return [];
  }

  const response = await fetch(blob.url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Could not read properties storage");
  }

  return response.json();
}

export async function writeProperties(properties) {
  await put(dataPath, JSON.stringify(properties, null, 2), {
    access: "public",
    allowOverwrite: true,
    contentType: "application/json"
  });
}

export async function readMetrics() {
  const { blobs } = await list({ prefix: metricsPath, limit: 1 });
  const blob = blobs.find((item) => item.pathname === metricsPath);

  if (!blob) {
    return { views: 0, whatsapp: 0, leads: 0 };
  }

  const response = await fetch(blob.url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Could not read metrics storage");
  }

  return response.json();
}

export async function writeMetrics(metrics) {
  await put(metricsPath, JSON.stringify(metrics, null, 2), {
    access: "public",
    allowOverwrite: true,
    contentType: "application/json"
  });
}

export function requireAdmin(req) {
  const configuredPin = process.env.ADMIN_PIN;
  if (!configuredPin) {
    return false;
  }

  const providedPin = req.headers["x-admin-pin"];
  return providedPin === configuredPin;
}

export function makeSlug(text) {
  return String(text || "inmueble")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}
