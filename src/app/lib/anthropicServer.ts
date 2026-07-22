import Anthropic from '@anthropic-ai/sdk';

/**
 * Server-only client. Never import from a Client Component or expose the
 * API key to the browser.
 */
export function getAnthropicServerClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    throw new Error(
      'Missing ANTHROPIC_API_KEY. Copy .env.local.example to .env.local and fill in your Anthropic API key.',
    );
  }

  return new Anthropic({ apiKey });
}
