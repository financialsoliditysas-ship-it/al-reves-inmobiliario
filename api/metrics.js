import { callBackend, requireAdmin } from "./_supabase.js";

const allowedEvents = [
  "views",
  "whatsapp",
  "leads",
  "searches",
  "property_views",
  "contact_clicks",
  "requests_opened",
  "shares",
  "owner_publication_requests"
];

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      if (!requireAdmin(req)) {
        return res.status(401).json({ error: "PIN_INVALIDO" });
      }

      return res.status(200).json(await callBackend("metrics_summary"));
    }

    if (req.method !== "POST") {
      res.setHeader("Allow", "GET, POST");
      return res.status(405).json({ error: "Method not allowed" });
    }

    const body = req.body || {};
    if (!allowedEvents.includes(body.event)) {
      return res.status(400).json({ error: "Invalid metric event" });
    }

    return res.status(200).json(await callBackend("metric", {
      event: body.event,
      propertyId: body.propertyId || null,
      sessionHash: body.sessionHash || null,
      metadata: body.metadata || {}
    }));
  } catch (error) {
    return res.status(500).json({ error: error.message || "Unexpected error" });
  }
}
