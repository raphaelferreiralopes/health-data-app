'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import { getBrowserSupabaseClient } from '@/app/lib/supabaseBrowser';

type ChatMessage = { role: 'user' | 'model'; text: string };

export function ChatBubble() {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const init = async () => {
      const client = getBrowserSupabaseClient();
      if (!client) return;
      const { data } = await client.auth.getSession();
      setAccessToken(data.session?.access_token ?? null);
    };
    void init();
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, isSending]);

  if (!accessToken) {
    return null;
  }

  const sendMessage = async (event: FormEvent) => {
    event.preventDefault();
    const text = input.trim();
    if (!text || isSending) return;

    setError('');
    const nextMessages: ChatMessage[] = [...messages, { role: 'user', text }];
    setMessages(nextMessages);
    setInput('');
    setIsSending(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ messages: nextMessages }),
      });

      const payload = (await response.json()) as { reply?: string; error?: string };
      if (!response.ok || !payload.reply) {
        throw new Error(payload.error ?? 'Antwort fehlgeschlagen.');
      }

      setMessages((current) => [...current, { role: 'model', text: payload.reply as string }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Antwort fehlgeschlagen.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <>
      {isOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="chat-bubble-title"
          className="fixed bottom-24 right-4 z-40 flex h-[70vh] max-h-[600px] w-[calc(100vw-2rem)] max-w-sm flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-xl sm:right-6"
        >
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <h2 id="chat-bubble-title" className="text-sm font-semibold text-ink">
              Gesundheits-Assistent
            </h2>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="Chat schließen"
              className="rounded-full p-1 text-muted hover:bg-card hover:text-ink"
            >
              ✕
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3">
            {messages.length === 0 ? (
              <p className="text-sm text-muted">
                Frag mich etwas zu deinen Laborwerten, Medikamenten oder hochgeladenen Arztbefunden.
              </p>
            ) : (
              <div className="flex flex-col gap-3">
                {messages.map((message, index) => (
                  <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <p
                      className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
                        message.role === 'user' ? 'bg-brand text-white' : 'bg-card text-ink'
                      }`}
                    >
                      {message.text}
                    </p>
                  </div>
                ))}
                {isSending ? (
                  <div className="flex justify-start">
                    <p className="max-w-[85%] rounded-2xl bg-card px-3.5 py-2 text-sm text-muted">…</p>
                  </div>
                ) : null}
              </div>
            )}
            {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
          </div>

          <form onSubmit={sendMessage} className="flex items-center gap-2 border-t border-line p-3">
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Nachricht schreiben…"
              className="flex-1 rounded-full border border-line bg-card px-4 py-2 text-sm text-ink outline-none focus:border-brand"
            />
            <button
              type="submit"
              disabled={isSending || !input.trim()}
              className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-deep disabled:opacity-60"
            >
              Senden
            </button>
          </form>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        aria-label={isOpen ? 'Chat schließen' : 'Chat öffnen'}
        className="fixed bottom-6 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-brand text-2xl text-white shadow-lg transition hover:bg-brand-deep sm:right-6"
      >
        {isOpen ? '✕' : '💬'}
      </button>
    </>
  );
}
