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

  try {
    const jsonResponse = await handleUpload({
      body: req.body,
      request: req,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const configuredPin = process.env.ADMIN_PIN;
        const providedPin = clientPayload;

        if (!configuredPin || providedPin !== configuredPin) {
          throw new Error("Unauthorized");
        }

        return {
          allowedContentTypes,
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({ pathname })
        };
      },
      onUploadCompleted: async () => {}
    });

    return res.status(200).json(jsonResponse);
  } catch (error) {
    return res.status(400).json({ error: error.message || "Upload failed" });
  }
}
