import { fallbackProperties } from "./_fallback-properties.js";
import { readProperties } from "./_storage.js";

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function absoluteUrl(req, path) {
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  const protocol = req.headers["x-forwarded-proto"] || "https";
  return `${protocol}://${host}${path}`;
}

export default async function handler(req, res) {
  const id = req.query?.id;
  let properties = [];

  try {
    properties = await readProperties();
  } catch {
    properties = [];
  }

  const allProperties = properties.length ? properties : fallbackProperties;
  const property = allProperties.find((item) => item.id === id) || allProperties[0];
  const pageUrl = absoluteUrl(req, `/?inmueble=${encodeURIComponent(property.id)}`);
  const shareUrl = absoluteUrl(req, `/api/share?id=${encodeURIComponent(property.id)}`);
  const image = property.images?.[0] || "";
  const title = `${property.title} | ${property.price}`;
  const description = `${property.operation} en ${property.location}. ${property.description}`;

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=0, must-revalidate");
  return res.status(200).send(`<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}">
    <meta property="og:type" content="website">
    <meta property="og:site_name" content="Al Reves Inmobiliario">
    <meta property="og:title" content="${escapeHtml(title)}">
    <meta property="og:description" content="${escapeHtml(description)}">
    <meta property="og:image" content="${escapeHtml(image)}">
    <meta property="og:image:secure_url" content="${escapeHtml(image)}">
    <meta property="og:url" content="${escapeHtml(shareUrl)}">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${escapeHtml(title)}">
    <meta name="twitter:description" content="${escapeHtml(description)}">
    <meta name="twitter:image" content="${escapeHtml(image)}">
    <meta http-equiv="refresh" content="0;url=${escapeHtml(pageUrl)}">
  </head>
  <body>
    <p>Abriendo inmueble...</p>
    <script>window.location.replace(${JSON.stringify(pageUrl)});</script>
  </body>
</html>`);
}
