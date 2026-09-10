import { makeSlug, readProperties, requireAdmin, writeProperties } from "./_storage.js";

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      const properties = await readProperties();
      return res.status(200).json({ properties });
    }

    if (req.method !== "POST") {
      res.setHeader("Allow", "GET, POST");
      return res.status(405).json({ error: "Method not allowed" });
    }

    if (!requireAdmin(req)) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const current = await readProperties();
    const body = req.body || {};
    const now = new Date().toISOString();
    const slug = makeSlug(`${body.title}-${Date.now()}`);

    const property = {
      id: slug,
      title: body.title,
      type: body.type,
      operation: body.operation,
      price: body.price,
      location: body.location,
      mapUrl: body.mapUrl,
      videoUrl: body.videoUrl || "",
      images: Array.isArray(body.images) ? body.images.filter(Boolean) : [],
      features: Array.isArray(body.features) ? body.features.filter(Boolean) : [],
      description: body.description,
      createdAt: now,
      updatedAt: now
    };

    if (!property.title || !property.type || !property.operation || !property.price || !property.location || !property.description) {
      return res.status(400).json({ error: "Missing required property fields" });
    }

    if (property.images.length === 0) {
      return res.status(400).json({ error: "At least one image is required" });
    }

    const properties = [property, ...current];
    await writeProperties(properties);

    return res.status(201).json({ property, count: properties.length });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Unexpected error" });
  }
}
