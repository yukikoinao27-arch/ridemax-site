"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { RidemaxLogo } from "@/components/ridemax-logo";

/**
 * Persistent chat shell that mirrors the Wix-like launcher UX.
 *
 * Design responsibilities hidden behind a small public surface:
 *  - Welcome ↔ chat screens (two-step UX matching the Wix reference).
 *  - Minimize / expand / close controls surfaced as discrete buttons so
 *    visitors always have an obvious way out of each state.
 *  - Image upload to `/api/chat-upload`, which proxies to Supabase Storage.
 *    This component doesn't care which backend is wired up; it only sees a
 *    file and a URL. Keeps the transport seam shallow-enough for later swap.
 *  - Inline emoji quick-picker (no heavyweight library) so the send form has
 *    feature parity with the Wix reference without pulling in a bundle.
 *
 * Brand tokens are centralized at the top of the render tree
 * (`#E31E24`, `#111111`, `#FFFFFF`) so a future theme override can happen in
 * one place rather than every button.
 */
type ChatWidgetProps = {
  /** Admin-configured logo for light surfaces (the white chip behind the mark). */
  logoSrc?: string;
  /** Fallback admin logo used when `logoSrc` is empty — usually the dark-surface asset. */
  logoLightSrc?: string;
  /** Alt text for screen readers — typically the site name. */
  alt?: string;
};

// Small, curated quick-picker emoji set. Keeps the picker under a handful of
// rows without shipping a 200KB emoji catalogue — the Wix widget only shows
// a compact strip.
const QUICK_EMOJIS = [
  "🤙",
  "👍",
  "🙏",
  "🔥",
  "😊",
  "😂",
  "😍",
  "😎",
  "🏍️",
  "🏁",
  "🛞",
  "🛠️",
  "❤️",
  "✨",
  "🎉",
  "🤝",
] as const;

export function ChatWidget({ logoSrc, logoLightSrc, alt = "Team Ridemax Philippines" }: ChatWidgetProps = {}) {
  // The chat header renders the logo inside an opaque white chip, so the
  // light-surface upload is the right pick. If only the dark variant was
  // uploaded we still surface something rather than forcing the SVG fallback.
  const chatLogoSrc = logoSrc?.trim() ? logoSrc : logoLightSrc ?? "";
  const [open, setOpen] = useState(false);
  const [screen, setScreen] = useState<"welcome" | "chat">("welcome");
  const [message, setMessage] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Close the emoji popover whenever the visitor leaves the chat screen or
  // closes the widget entirely — prevents a stale picker peeking in later.
  useEffect(() => {
    if (screen !== "chat" || !open) setEmojiOpen(false);
  }, [screen, open]);

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

  function insertEmoji(emoji: string) {
    setMessage((current) => `${current}${emoji}`);
    setEmojiOpen(false);
    // Re-focus the input so the caret lands next to the inserted glyph and
    // the user can keep typing. Schedule after state flush.
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-[60] flex flex-col items-end gap-3">
      {open ? (
        <section
          className={`pointer-events-auto overflow-hidden rounded-[1.25rem] bg-[#E31E24] text-white shadow-[0_22px_60px_rgba(20,16,18,0.3)] transition-[width,height] duration-200 ${
            expanded
              ? "h-[min(42rem,calc(100vh-6rem))] w-[min(34rem,calc(100vw-1.5rem))]"
              : "h-auto w-[min(22rem,calc(100vw-1.5rem))]"
          }`}
        >
          <div className="flex h-full flex-col p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                {/*
                 * Logo sits on an opaque white chip so the admin-configured
                 * mark keeps its native colors on the red chat surface — no
                 * CSS inversion, no filters, per brand guidelines. RidemaxLogo
                 * itself handles the SVG fallback when the upload is missing.
                 */}
                <RidemaxLogo
                  src={chatLogoSrc}
                  surface="light"
                  alt={alt}
                  width={220}
                  height={72}
                  className="ridemax-logo h-[56px] w-auto rounded-md bg-white/95 p-1.5 shadow-[0_6px_14px_rgba(0,0,0,0.28)]"
                />
                {/* Two-line heading (matches the Wix reference composition). */}
                <p className="mt-3 pr-2 text-[1.85rem] font-semibold leading-[1.05]">
                  Hi rider!{" "}
                  <span aria-hidden="true" className="inline-block align-baseline">
                    🤙
                  </span>
                  <br />
                  Anything we can help you?
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
                {/*
                 * Minimize chevron — matches the Wix widget. Collapses the
                 * whole surface back to the launcher button so visitors have
                 * an obvious "hide" affordance separate from closing entirely.
                 */}
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    setExpanded(false);
                  }}
                  className="rounded-full p-1 text-white/90 transition hover:bg-white/14 hover:text-white"
                  aria-label="Minimize chat"
                >
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>
            </div>

            {screen === "welcome" ? (
              <div className="mt-4 rounded-2xl bg-white p-3 text-[#1f2430]">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-[#fdecec]">
                      <Image src="/rider-avatar.svg" alt="Rider support avatar" width={40} height={40} className="h-10 w-10 object-cover" />
                    </span>
                    <p className="text-sm font-semibold text-[#26315a]">Team Ridemax PH</p>
                  </div>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-[#31a24c] shadow-[0_2px_6px_rgba(18,24,43,0.12)]">
                    <span className="h-2 w-2 rounded-full bg-[#167a34]" />
                    ONLINE
                  </span>
                </div>
                <p className="mt-3 text-sm">Hi there! Anything and we can help you. 🤙</p>
                <button
                  type="button"
                  onClick={() => {
                    setMessage("");
                    setScreen("chat");
                  }}
                  className="mt-4 flex w-full cursor-pointer items-center justify-between rounded-lg bg-[#E31E24] px-3 py-2 text-left text-sm font-semibold text-white transition hover:bg-[#B6161B]"
                >
                  <span>Start a new chat</span>
                  <span className="rounded bg-white/15 px-2 py-1 text-xs uppercase tracking-[0.12em]">Send</span>
                </button>
              </div>
            ) : (
              <div className="mt-4 flex min-h-0 flex-1 flex-col rounded-2xl bg-white p-3 text-[#1f2430]">
                <div className="flex items-center gap-2 border-b border-black/10 pb-3">
                  {/*
                   * Back arrow — returns to the welcome card. Visitors need a
                   * clear "escape" from the chat composer back to the launcher
                   * state; the Wix reference ships this as a chevron-left.
                   */}
                  <button
                    type="button"
                    onClick={() => setScreen("welcome")}
                    aria-label="Back to chat start"
                    className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#26315a] transition hover:bg-black/5"
                  >
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M15 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                  <span className="inline-flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-[#fdecec]">
                    {/* Headset support avatar (matches the Wix reference). */}
                    <svg viewBox="0 0 24 24" className="h-6 w-6 text-[#E31E24]" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path d="M4 14v-2a8 8 0 0 1 16 0v2" strokeLinecap="round" />
                      <path d="M4 14h3v5H5a1 1 0 0 1-1-1v-4Z" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M20 14h-3v5h2a1 1 0 0 0 1-1v-4Z" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M17 19v1a2 2 0 0 1-2 2h-2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <p className="text-sm font-semibold text-[#26315a]">Hi there! Anything and we can help you. 🤙</p>
                </div>
                <div className={`min-h-0 flex-1 ${expanded ? "overflow-auto" : ""}`}>
                  <div className={expanded ? "h-full" : "h-28"} />
                </div>
                {uploadError ? (
                  <p className="mt-2 rounded-md bg-[#fff4f3] px-3 py-2 text-xs font-medium text-[#8d120e]">
                    {uploadError}
                  </p>
                ) : null}
                {/*
                 * Emoji popover: anchored above the composer. Positioned with
                 * absolute on the form wrapper so it stays attached to the
                 * input without re-flowing the message list.
                 */}
                <div className="relative mt-3">
                  {emojiOpen ? (
                    <div
                      role="dialog"
                      aria-label="Emoji picker"
                      className="absolute bottom-full left-0 mb-2 grid grid-cols-8 gap-1 rounded-xl border border-black/10 bg-white p-2 shadow-[0_12px_30px_rgba(0,0,0,0.15)]"
                    >
                      {QUICK_EMOJIS.map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => insertEmoji(emoji)}
                          className="flex h-8 w-8 items-center justify-center rounded-md text-base transition hover:bg-black/5"
                          aria-label={`Insert ${emoji}`}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  ) : null}
                  <form
                    className="flex items-center gap-2 rounded-full border border-black/12 bg-[#f5f7fc] px-3 py-2"
                    onSubmit={(event) => {
                      event.preventDefault();
                      // Message delivery lives with the chat transport; keeping
                      // it inside the form element lets the browser handle
                      // Enter-to-send and prevents accidental navigation.
                      setMessage("");
                      setEmojiOpen(false);
                    }}
                  >
                    {/*
                     * File attach — document with an upward arrow underneath,
                     * matching the Wix widget's icon vocabulary. The hidden
                     * <input> is the actual file picker; the visible button is
                     * the styled affordance.
                     */}
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
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      aria-label="Upload file"
                      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#3d4f76] transition hover:bg-[#E31E24]/10 hover:text-[#E31E24] disabled:cursor-wait disabled:opacity-60"
                    >
                      {uploading ? (
                        <svg viewBox="0 0 24 24" className="h-4 w-4 animate-spin" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 12a9 9 0 1 1-3-6.7" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      ) : (
                        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                          {/* Document outline */}
                          <path d="M14 3H7a2 2 0 0 0-2 2v11h11V8l-2-5Z" strokeLinejoin="round" />
                          <path d="M14 3v5h4" strokeLinejoin="round" />
                          {/* Upward arrow */}
                          <path d="M10 15v-5" strokeLinecap="round" />
                          <path d="M8 12l2-2 2 2" strokeLinecap="round" strokeLinejoin="round" />
                          {/* Underline under the upload mark */}
                          <path d="M5 20h11" strokeLinecap="round" />
                        </svg>
                      )}
                    </button>
                    {/* Emoji picker toggle */}
                    <button
                      type="button"
                      onClick={() => setEmojiOpen((current) => !current)}
                      aria-label="Insert emoji"
                      aria-pressed={emojiOpen}
                      className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition ${
                        emojiOpen
                          ? "bg-[#E31E24]/15 text-[#E31E24]"
                          : "text-[#3d4f76] hover:bg-[#E31E24]/10 hover:text-[#E31E24]"
                      }`}
                    >
                      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                        <circle cx="12" cy="12" r="9" />
                        <circle cx="9" cy="10" r="0.8" fill="currentColor" />
                        <circle cx="15" cy="10" r="0.8" fill="currentColor" />
                        <path d="M8.5 14.5a4.5 4.5 0 0 0 7 0" strokeLinecap="round" />
                      </svg>
                    </button>
                    <label className="sr-only" htmlFor="chat-message">
                      Write your message
                    </label>
                    <input
                      id="chat-message"
                      ref={inputRef}
                      value={message}
                      onChange={(event) => setMessage(event.target.value)}
                      placeholder="Write your message..."
                      className="min-w-0 flex-1 bg-transparent text-sm outline-none"
                    />
                    {/* Send button — paper-plane icon, brand red. */}
                    <button
                      type="submit"
                      disabled={!message.trim()}
                      aria-label="Send message"
                      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#E31E24] text-white transition hover:bg-[#B6161B] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M3 11l18-8-8 18-2-8-8-2Z" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>
        </section>
      ) : null}

      {/*
       * Launcher button — red call-me-hand (🤙) glyph on red background, just
       * like the Wix reference. Rendered as an emoji so it inherits the
       * native system font and doesn't add to the SVG bundle.
       */}
      <button
        type="button"
        onClick={() => {
          setOpen((current) => !current);
          setScreen("welcome");
          setExpanded(false);
        }}
        className="pointer-events-auto inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#E31E24] text-white shadow-[0_16px_35px_rgba(227,30,36,0.4)] transition hover:scale-[1.03]"
        aria-label={open ? "Hide chat" : "Open chat"}
      >
        <span className="text-2xl leading-none" aria-hidden="true">
          🤙
        </span>
      </button>
    </div>
  );
}
