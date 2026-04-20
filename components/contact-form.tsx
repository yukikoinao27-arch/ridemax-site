"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { ChangeEvent } from "react";

type ContactFormProps = {
  className?: string;
};

type FormValues = {
  firstName: string;
  lastName: string;
  email: string;
  message: string;
};

type FieldErrors = Partial<Record<keyof FormValues, string>>;

type Status = "idle" | "saving" | "success" | "error" | "rate-limited";

const initialValues: FormValues = {
  firstName: "",
  lastName: "",
  email: "",
  message: "",
};

const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";

declare global {
  interface Window {
    turnstile?: {
      render: (
        element: HTMLElement,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          "expired-callback": () => void;
          "error-callback": () => void;
        },
      ) => string;
      reset: (widgetId?: string) => void;
    };
  }
}

/**
 * Lightweight client-side validation. The server repeats this check with Zod,
 * so this layer is purely about fast feedback. If the client drifts, the
 * server is still the source of truth. Keeping the logic here (rather than
 * reaching for a form library) keeps the form a deep module: one file, one
 * responsibility, no props drilling through a context.
 */
function validate(values: FormValues): FieldErrors {
  const errors: FieldErrors = {};
  if (!values.firstName.trim()) {
    errors.firstName = "First name is required.";
  }
  if (!values.email.trim()) {
    errors.email = "Email is required.";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) {
    errors.email = "Enter a valid email address.";
  }
  if (!values.message.trim()) {
    errors.message = "Message is required.";
  }
  return errors;
}

/**
 * Reusable field primitive. Wraps a label, control, and inline error in a
 * single unit so every form on the site can adopt the same layout and a11y
 * wiring (aria-invalid, aria-describedby) without copy/paste.
 *
 * Deliberately small: the caller owns the actual <input>/<textarea> so the
 * component doesn't try to abstract every possible control shape. This keeps
 * the interface a single slot (`children`) and avoids the "props for every
 * HTML attribute" anti-pattern.
 */
type FormFieldProps = {
  id: string;
  label: string;
  required?: boolean;
  error?: string;
  children: (aria: {
    id: string;
    "aria-invalid": boolean | undefined;
    "aria-describedby": string | undefined;
  }) => React.ReactNode;
};

function FormField({ id, label, required, error, children }: FormFieldProps) {
  const errorId = `${id}-error`;
  const aria = {
    id,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": error ? errorId : undefined,
  } as const;

  return (
    <div className="text-sm text-[#2b1512]">
      <label htmlFor={id} className="block">
        <span>
          {label}
          {required ? " *" : ""}
        </span>
      </label>
      <div className="mt-2">{children(aria)}</div>
      {error ? (
        <p id={errorId} role="alert" className="mt-1 text-xs font-medium text-[#9f251d]">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function ContactForm({ className = "" }: ContactFormProps) {
  const [form, setForm] = useState<FormValues>(initialValues);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [status, setStatus] = useState<Status>("idle");
  const [note, setNote] = useState("");
  const [website, setWebsite] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const turnstileRef = useRef<HTMLDivElement | null>(null);
  const turnstileWidgetId = useRef<string | null>(null);
  // One-per-render id seed so field IDs stay stable and don't collide when
  // the form is rendered multiple times on a page (home + about both embed
  // the contact block).
  const uid = useId();

  useEffect(() => {
    if (!turnstileSiteKey || turnstileWidgetId.current) {
      return;
    }

    function renderTurnstile() {
      if (!turnstileRef.current || !window.turnstile || turnstileWidgetId.current) {
        return;
      }

      turnstileWidgetId.current = window.turnstile.render(turnstileRef.current, {
        sitekey: turnstileSiteKey,
        callback: setTurnstileToken,
        "expired-callback": () => setTurnstileToken(""),
        "error-callback": () => setTurnstileToken(""),
      });
    }

    const existing = document.querySelector<HTMLScriptElement>("script[data-turnstile-script]");
    if (existing) {
      renderTurnstile();
      existing.addEventListener("load", renderTurnstile, { once: true });
      return () => existing.removeEventListener("load", renderTurnstile);
    }

    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.defer = true;
    script.dataset.turnstileScript = "true";
    script.addEventListener("load", renderTurnstile, { once: true });
    document.head.appendChild(script);

    return () => script.removeEventListener("load", renderTurnstile);
  }, []);

  function updateField<K extends keyof FormValues>(key: K) {
    return (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value = event.target.value;
      setForm((current) => ({ ...current, [key]: value }));
      // Clear the inline error the moment the user starts correcting the
      // field. This matches common consumer-grade form UX.
      if (errors[key]) {
        setErrors((current) => {
          const next = { ...current };
          delete next[key];
          return next;
        });
      }
    };
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const clientErrors = validate(form);
    if (Object.keys(clientErrors).length > 0) {
      setErrors(clientErrors);
      setStatus("error");
      setNote("Please fix the highlighted fields.");
      return;
    }

    setErrors({});
    setStatus("saving");
    setNote("");

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...form,
          website,
          turnstileToken,
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        message?: string;
        fieldErrors?: FieldErrors;
      };

      if (response.status === 429) {
        setStatus("rate-limited");
        setNote(payload.error ?? "Too many requests. Please try again in a minute.");
        return;
      }

      if (!response.ok) {
        setStatus("error");
        setErrors(payload.fieldErrors ?? {});
        setNote(payload.error ?? "Something went wrong.");
        return;
      }

      setStatus("success");
      setNote(payload.message ?? "Thanks - your message is on its way.");
      setForm(initialValues);
      setWebsite("");
      setTurnstileToken("");
      if (turnstileWidgetId.current) {
        window.turnstile?.reset(turnstileWidgetId.current);
      }
    } catch {
      setStatus("error");
      setNote("Unable to send the message right now. Please try again.");
    }
  }

  const inputClass =
    "w-full border border-[#3a2320] px-3 py-2.5 outline-none transition focus:border-[#8d2018] aria-[invalid=true]:border-[#9f251d] aria-[invalid=true]:focus:border-[#9f251d]";

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className={`rounded-[2rem] bg-white p-7 shadow-[0_18px_40px_rgba(33,18,17,0.08)] ${className}`.trim()}
    >
      <h2 className="text-4xl font-[family:var(--font-title)] uppercase leading-none text-[#220707]">Send a Message</h2>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <FormField id={`${uid}-firstName`} label="First Name" required error={errors.firstName}>
          {(aria) => (
            <input
              {...aria}
              type="text"
              autoComplete="given-name"
              value={form.firstName}
              onChange={updateField("firstName")}
              className={inputClass}
            />
          )}
        </FormField>
        <FormField id={`${uid}-lastName`} label="Last Name" error={errors.lastName}>
          {(aria) => (
            <input
              {...aria}
              type="text"
              autoComplete="family-name"
              value={form.lastName}
              onChange={updateField("lastName")}
              className={inputClass}
            />
          )}
        </FormField>
      </div>
      <div className="mt-4">
        <FormField id={`${uid}-email`} label="Email" required error={errors.email}>
          {(aria) => (
            <input
              {...aria}
              type="email"
              autoComplete="email"
              inputMode="email"
              value={form.email}
              onChange={updateField("email")}
              className={inputClass}
            />
          )}
        </FormField>
      </div>
      <div className="mt-4">
        <FormField id={`${uid}-message`} label="Message" required error={errors.message}>
          {(aria) => (
            <textarea
              {...aria}
              rows={5}
              value={form.message}
              onChange={updateField("message")}
              className={`${inputClass} h-28 resize-y`}
            />
          )}
        </FormField>
      </div>
      <div className="hidden" aria-hidden="true">
        <label htmlFor={`${uid}-website`}>Website</label>
        <input
          id={`${uid}-website`}
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(event) => setWebsite(event.target.value)}
        />
      </div>
      {turnstileSiteKey ? (
        <div className="mt-5">
          <div ref={turnstileRef} />
          {!turnstileToken ? (
            <p className="mt-2 text-xs text-[#6a433d]">Complete the security check to send.</p>
          ) : null}
        </div>
      ) : null}
      <button
        type="submit"
        disabled={status === "saving" || Boolean(turnstileSiteKey && !turnstileToken)}
        className="mt-5 inline-flex min-w-36 items-center justify-center bg-[#8d120e] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#a11410] disabled:cursor-not-allowed disabled:opacity-70"
      >
        {status === "saving" ? "Sending..." : "Send"}
      </button>
      {note ? (
        <p
          role={status === "error" || status === "rate-limited" ? "alert" : "status"}
          aria-live="polite"
          className={`mt-3 text-sm ${
            status === "error"
              ? "text-[#9f251d]"
              : status === "rate-limited"
                ? "text-[#8a5a00]"
                : "text-[#255c2f]"
          }`}
        >
          {note}
        </p>
      ) : null}
    </form>
  );
}
