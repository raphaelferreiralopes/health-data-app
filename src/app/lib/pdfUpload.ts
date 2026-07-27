// Validates a PDF data URL server-side rather than trusting the client's
// claimed file type -- shared by every route that accepts a PDF upload.
export const MAX_UPLOAD_PDF_BYTES = 8 * 1024 * 1024;

export function parsePdfDataUrl(fileData: string): { base64: string; approxBytes: number } | null {
  const match = fileData.match(/^data:application\/pdf;base64,(.+)$/);
  if (!match) {
    return null;
  }

  const base64 = match[1];
  const approxBytes = Math.ceil((base64.length * 3) / 4);
  return { base64, approxBytes };
}
