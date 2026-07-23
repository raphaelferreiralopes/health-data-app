import { GoogleGenAI } from '@google/genai';

/**
 * Server-only client. Never import from a Client Component or expose the
 * API key to the browser.
 */
export function getGeminiServerClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error(
      'Missing GEMINI_API_KEY. Copy .env.local.example to .env.local and fill in your Gemini API key.',
    );
  }

  return new GoogleGenAI({ apiKey });
}
