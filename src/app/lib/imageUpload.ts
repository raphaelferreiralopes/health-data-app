// Mirrors pdfUpload.ts's parsePdfDataUrl, but for photo uploads (e.g. a
// prescription photo) -- validates the data URL server-side rather than
// trusting the client's claimed file type.
export const MAX_UPLOAD_IMAGE_BYTES = 8 * 1024 * 1024;

const IMAGE_DATA_URL_PATTERN = /^data:(image\/(?:jpeg|png|webp|heic|heif));base64,(.+)$/;

export function parseImageDataUrl(fileData: string): { mimeType: string; base64: string; approxBytes: number } | null {
  const match = fileData.match(IMAGE_DATA_URL_PATTERN);
  if (!match) {
    return null;
  }

  const [, mimeType, base64] = match;
  const approxBytes = Math.ceil((base64.length * 3) / 4);
  return { mimeType, base64, approxBytes };
}
