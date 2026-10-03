import { makeSlug, readProperties, requireAdmin, writeProperties } from "./_storage.js";

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      let properties = [];
      try {
        properties = await readProperties();
      } catch {
        properties = [];
      }
      return res.status(200).json({ properties });
    }

    if (req.method !== "POST" && req.method !== "PUT") {
      res.setHeader("Allow", "GET, POST, PUT");
      return res.status(405).json({ error: "Method not allowed" });
    }

    if (!requireAdmin(req)) {
      return res.status(401).json({ error: "PIN_INVALIDO" });
    }

    const current = await readProperties();
    const body = req.body || {};
    const now = new Date().toISOString();
    const existing = current.find((item) => item.id === body.id);
    const slug = existing ? existing.id : makeSlug(`${body.title}-${Date.now()}`);

    const property = {
      id: slug,
      reference: body.reference || slug,
      title: body.title,
      type: body.type,
      operation: body.operation,
      status: body.status || "Disponible",
      price: body.price,
      rent: body.rent || "",
      adminFee: body.adminFee || "",
      otherCharges: body.otherCharges || "",
      location: body.location,
      municipality: body.municipality || "",
      neighborhood: body.neighborhood || "",
      mapUrl: body.mapUrl,
      videoUrl: body.videoUrl || "",
      images: Array.isArray(body.images) ? body.images.filter(Boolean) : [],
      features: Array.isArray(body.features) ? body.features.filter(Boolean) : [],
      description: body.description,
      createdAt: existing?.createdAt || now,
      updatedAt: now
    };

    if (!property.title || !property.type || !property.operation || !property.price || !property.location || !property.description) {
      return res.status(400).json({ error: "Missing required property fields" });
    }

    if (property.images.length === 0) {
      return res.status(400).json({ error: "At least one image is required" });
    }

    const properties =
      req.method === "PUT"
        ? current.map((item) => (item.id === property.id ? property : item))
        : [property, ...current];

    if (req.method === "PUT" && !existing) {
      return res.status(404).json({ error: "Property not found" });
    }

    await writeProperties(properties);

    return res.status(req.method === "PUT" ? 200 : 201).json({ property, count: properties.length });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Unexpected error" });
  }
}
