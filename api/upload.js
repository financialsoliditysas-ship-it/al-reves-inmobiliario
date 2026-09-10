import { handleUpload } from "@vercel/blob/client";

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

  const configuredPin = process.env.ADMIN_PIN;
  const providedPin = req.headers["x-admin-pin"] || new URL(req.url, "https://local").searchParams.get("pin");

  if (!configuredPin || providedPin !== configuredPin) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const jsonResponse = await handleUpload({
      body: req.body,
      request: req,
      onBeforeGenerateToken: async (pathname) => ({
        allowedContentTypes,
        tokenPayload: JSON.stringify({ pathname })
      }),
      onUploadCompleted: async () => {}
    });

    return res.status(200).json(jsonResponse);
  } catch (error) {
    return res.status(400).json({ error: error.message || "Upload failed" });
  }
}
