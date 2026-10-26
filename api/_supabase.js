function config() {
  const url = process.env.SUPABASE_URL;
  const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;
  const backendToken = process.env.SUPABASE_BACKEND_TOKEN;

  if (!url || !publishableKey) {
    throw new Error("Supabase is not configured");
  }

  return { url, publishableKey, backendToken };
}

function mapProperty(row) {
  const media = [...(row.property_media || [])].sort((a, b) => a.position - b.position);
  return {
    id: row.id,
    reference: row.reference,
    title: row.title,
    type: row.type,
    operation: row.operation,
    status: row.status,
    price: row.price == null ? "" : String(row.price),
    rent: row.rent == null ? "" : String(row.rent),
    adminFee: row.admin_fee == null ? "" : String(row.admin_fee),
    otherCharges: row.other_charges == null ? "" : String(row.other_charges),
    location: row.location,
    municipality: row.municipality,
    neighborhood: row.neighborhood || "",
    mapUrl: row.map_url || "",
    videoUrl: media.find((item) => item.kind === "video")?.url || "",
    images: media.filter((item) => item.kind === "image").map((item) => item.url),
    features: Array.isArray(row.features) ? row.features : [],
    description: row.description,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    published: row.published
  };
}

export async function readProperties() {
  const { url, publishableKey } = config();
  const query = new URLSearchParams({
    select: "*,property_media(*)",
    published: "eq.true",
    order: "created_at.desc"
  });
  const response = await fetch(`${url}/rest/v1/properties?${query}`, {
    headers: { apikey: publishableKey, Authorization: `Bearer ${publishableKey}` },
    cache: "no-store"
  });
  if (!response.ok) throw new Error("Could not read properties from Supabase");
  return (await response.json()).map(mapProperty);
}

export async function callBackend(action, payload = {}) {
  const { url, publishableKey, backendToken } = config();
  if (!backendToken) throw new Error("Supabase backend token is not configured");
  const response = await fetch(`${url}/functions/v1/al-reves-backend`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: publishableKey,
      Authorization: `Bearer ${publishableKey}`,
      "x-backend-token": backendToken
    },
    body: JSON.stringify({ action, ...payload })
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || "Supabase request failed");
  return result;
}

export function requireAdmin(req) {
  const configuredPin = process.env.ADMIN_PIN;
  return Boolean(configuredPin && req.headers["x-admin-pin"] === configuredPin);
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
