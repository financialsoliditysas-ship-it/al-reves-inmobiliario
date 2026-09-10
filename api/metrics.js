import { readMetrics, requireAdmin, writeMetrics } from "./_storage.js";

const allowedEvents = ["views", "whatsapp", "leads"];

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      if (!requireAdmin(req)) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const metrics = await readMetrics();
      return res.status(200).json({ metrics });
    }

    if (req.method !== "POST") {
      res.setHeader("Allow", "GET, POST");
      return res.status(405).json({ error: "Method not allowed" });
    }

    const body = req.body || {};
    if (!allowedEvents.includes(body.event)) {
      return res.status(400).json({ error: "Invalid metric event" });
    }

    const metrics = await readMetrics();
    metrics[body.event] = Number(metrics[body.event] || 0) + 1;
    await writeMetrics(metrics);

    return res.status(200).json({ ok: true });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Unexpected error" });
  }
}
