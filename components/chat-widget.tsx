"use client";

import Image from "next/image";
import { useRef, useState } from "react";

/**
 * Persistent chat shell that mirrors the Wix-like launcher UX.
 *
 * Responsibilities the component hides behind a very small public surface:
 *  - Welcome <-> chat screens (two-step UX the marketing team specified).
 *  - Expand / collapse, so the iframe-style window can grow into a full
 *    side-panel without a second component.
 *  - Image upload to `/api/chat-upload`, which proxies to Supabase Storage.
 *    The component does not know or care which backend is wired up; it only
 *    sees a file and a URL, per AGENTS.md guidance on deep modules.
 *
 * Provider-agnostic on purpose: a real chat transport (WebSocket, webhook,
 * third-party widget) can attach later without changing this surface.
 */
export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [screen, setScreen] = useState<"welcome" | "chat">("welcome");
  const [message, setMessage] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  /**
   * Forward the selected image to the chat upload proxy. Kept inline because
   * the handler is small, has no reuse outside the widget, and is easier to
   * reason about next to the element that triggers it.
   */
  async function handleFileUpload(file: File) {
    setUploadError(null);
    setUploading(true);

    try {
      const body = new FormData();
      body.set("file", file);

      const response = await fetch("/api/chat-upload", {
        method: "POST",
        body,
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error ?? "Upload failed.");
      }

      const payload = (await response.json()) as { url?: string };

      // Surface the uploaded asset URL to the user so the chat agent on the
      // other side has a link to reference. The message state is the single
      // shared sink, so the rest of the form keeps working unchanged.
      setMessage((current) =>
        current ? `${current}\n${payload.url ?? ""}` : payload.url ?? "",
      );
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-[60] flex flex-col items-end gap-3">
      {open ? (
        <section
          className={`pointer-events-auto overflow-hidden rounded-[1.25rem] border border-[#0e2f67] bg-[#0a3d89] text-white shadow-[0_22px_60px_rgba(20,16,18,0.3)] transition-[width,height] duration-200 ${
            expanded
              ? "h-[min(42rem,calc(100vh-6rem))] w-[min(34rem,calc(100vw-1.5rem))]"
              : "h-auto w-[min(22rem,calc(100vw-1.5rem))]"
          }`}
        >
          <div className="flex h-full flex-col p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <Image
                  src="/ridemax-full-logo.jpg"
                  alt="Team Ridemax Philippines"
                  width={220}
                  height={72}
                  className="ridemax-logo h-[56px] w-auto rounded-md bg-white/95 p-1.5 shadow-[0_6px_14px_rgba(0,0,0,0.28)]"
                  // The chat header sits on a navy background, so the logo needs
                  // a small opaque chip behind it to preserve contrast. We do
                  // NOT invert or recolor the logo — the mark ships in its
                  // native colors per brand guidelines.
                  onError={(event) => {
                    // Fall back to the SVG mark if the high-res JPG is absent.
                    const target = event.currentTarget as HTMLImageElement;
                    if (!target.src.endsWith("/ridemax-logo-light.svg")) {
                      target.src = "/ridemax-logo-light.svg";
                    }
                  }}
                />
                {/* Three-line heading (matches the reference composition). */}
                <p className="mt-3 pr-2 text-[2rem] font-semibold leading-[1.02]">
                  Hi rider!
                  <br />
                  Anything we
                  <br />
                  can help you?
                </p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setExpanded((current) => !current)}
                  className="rounded-full p-1 text-white/90 transition hover:scale-110 hover:bg-white/14 hover:text-white"
                  aria-label={expanded ? "Collapse chat window" : "Expand chat window"}
                  aria-pressed={expanded}
                >
                  {/* Diagonal arrows: four short strokes anchored at each corner. */}
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 10V4h6" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M20 14v6h-6" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M4 4l6 6" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M20 20l-6-6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-full p-1 text-white/90 transition hover:bg-white/14 hover:text-white"
                  aria-label="Close chat card"
                >
                  <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M5 5l10 10M15 5 5 15" />
                  </svg>
                </button>
              </div>
            </div>

            {screen === "welcome" ? (
              <div className="mt-4 rounded-2xl bg-white p-3 text-[#1f2430]">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-[#eff2f8]">
                      <Image src="/rider-avatar.svg" alt="Rider support avatar" width={40} height={40} className="h-10 w-10 object-cover" />
                    </span>
                    <p className="text-sm font-semibold text-[#26315a]">Team Ridemax PH</p>
                  </div>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-[#31a24c] shadow-[0_2px_6px_rgba(18,24,43,0.12)]">
                    <span className="h-2 w-2 rounded-full bg-[#167a34]" />
                    ONLINE
                  </span>
                </div>
                <p className="mt-3 text-sm">Hi there! Anything we can help you?</p>
                <button
                  type="button"
                  onClick={() => {
                    setMessage("");
                    setScreen("chat");
                  }}
                  className="mt-4 flex w-full cursor-pointer items-center justify-between rounded-lg bg-[#4269a5] px-3 py-2 text-left text-sm font-semibold text-white transition hover:bg-[#365a92]"
                >
                  <span>Start a new chat</span>
                  <span className="rounded bg-[#5a80bb] px-2 py-1 text-xs uppercase tracking-[0.12em]">Send</span>
                </button>
              </div>
            ) : (
              <div className="mt-4 flex min-h-0 flex-1 flex-col rounded-2xl bg-white p-3 text-[#1f2430]">
                <div className="flex items-center justify-between gap-2 border-b border-black/10 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-[#eff2f8]">
                      <Image src="/rider-avatar.svg" alt="Rider support avatar" width={40} height={40} className="h-10 w-10 object-cover" />
                    </span>
                    <p className="text-sm font-semibold text-[#26315a]">Hi there! Anything we can help you?</p>
                  </div>
                </div>
                <div className={`min-h-0 flex-1 ${expanded ? "overflow-auto" : ""}`}>
                  <div className={expanded ? "h-full" : "h-28"} />
                </div>
                {uploadError ? (
                  <p className="mt-2 rounded-md bg-[#fff4f3] px-3 py-2 text-xs font-medium text-[#8d120e]">
                    {uploadError}
                  </p>
                ) : null}
                <form
                  className="relative mt-3 rounded-lg border border-black/12 bg-[#f5f7fc] px-2 py-2"
                  onSubmit={(event) => {
                    event.preventDefault();
                    // Message delivery lives with the chat transport; keeping
                    // it inside the form element lets the browser handle
                    // Enter-to-send and prevents accidental navigation.
                    setMessage("");
                  }}
                >
                  <label className="sr-only" htmlFor="chat-message">
                    Write your message
                  </label>
                  <input
                    id="chat-message"
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    placeholder="Write your message..."
                    className="w-full bg-transparent pr-10 text-sm outline-none"
                  />
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) {
                        void handleFileUpload(file);
                      }
                      // Reset so selecting the same file twice still fires onChange.
                      event.target.value = "";
                    }}
                  />
                  {/* Single upload arrow icon anchored inside the right side
                      of the input. Hover promotes it to the brand blue and
                      scales slightly (no layout shift because the wrapper has
                      a fixed size). */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    aria-label="Upload image"
                    className="absolute right-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-[#3d4f76] transition duration-200 hover:scale-110 hover:bg-[#0056d9]/10 hover:text-[#0056d9] disabled:cursor-wait disabled:opacity-60"
                  >
                    {uploading ? (
                      <svg viewBox="0 0 24 24" className="h-4 w-4 animate-spin" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 12a9 9 0 1 1-3-6.7" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    ) : (
                      // Upward-pointing arrow (upload symbol).
                      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 19V5" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M6 11l6-6 6 6" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </button>
                </form>
              </div>
            )}
          </div>
        </section>
      ) : null}

      <button
        type="button"
        onClick={() => {
          setOpen((current) => !current);
          setScreen("welcome");
          setExpanded(false);
        }}
        className="pointer-events-auto inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#0056d9] text-white shadow-[0_16px_35px_rgba(0,58,153,0.4)] transition hover:scale-[1.03]"
        aria-label={open ? "Hide chat" : "Open chat"}
      >
        <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M5 6.5h14a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1h-7l-4.5 3v-3H5a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1Z" />
        </svg>
      </button>
    </div>
  );
}
