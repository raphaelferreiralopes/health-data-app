// Shared between the manual upload route and the extraction route so both
// enforce the same "is this actually a PDF, and not an absurd size" check
// server-side -- the client-side .pdf check alone is trivially bypassable.
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
