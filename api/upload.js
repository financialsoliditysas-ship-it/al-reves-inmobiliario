import { callBackend, requireAdmin } from "./_supabase.js";
import { randomUUID } from "node:crypto";

const allowedContentTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "video/mp4",
  "video/quicktime"
];

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    if (!requireAdmin(req)) return res.status(401).json({ error: "PIN_INVALIDO" });
    const { fileName, contentType } = req.body || {};
    if (!fileName || !allowedContentTypes.includes(contentType)) {
      return res.status(400).json({ error: "Tipo de archivo no permitido" });
    }
    const safeName = String(fileName).replace(/[^a-zA-Z0-9._-]+/g, "-");
    const path = `inmuebles/${Date.now()}-${randomUUID()}-${safeName}`;
    return res.status(200).json(await callBackend("create_upload_token", { path, contentType }));
  } catch (error) {
    return res.status(400).json({ error: error.message || "Upload failed" });
  }
}
