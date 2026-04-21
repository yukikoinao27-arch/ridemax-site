"use client";

import { useEffect, useId, useRef, useState } from "react";

type JobApplicationFormProps = {
  jobSlug: string;
  jobTitle: string;
  className?: string;
};

type FormValues = {
  fullName: string;
  email: string;
  phone: string;
  message: string;
  resumeUrl: string;
};

type FieldErrors = Partial<Record<keyof FormValues, string>>;
type Status = "idle" | "saving" | "success" | "error" | "rate-limited";

const initialValues: FormValues = {
  fullName: "",
  email: "",
  phone: "",
  message: "",
  resumeUrl: "",
};

const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";

function validate(values: FormValues): FieldErrors {
  const errors: FieldErrors = {};
  if (!values.fullName.trim()) {
    errors.fullName = "Full name is required.";
  }
  if (!values.email.trim()) {
    errors.email = "Email is required.";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) {
    errors.email = "Enter a valid email address.";
  }
  if (values.resumeUrl.trim()) {
    try {
      new URL(values.resumeUrl.trim());
    } catch {
      errors.resumeUrl = "Link must start with http:// or https://";
    }
  }
  return errors;
}

export function JobApplicationForm({ jobSlug, jobTitle, className = "" }: JobApplicationFormProps) {
  const uid = useId();
  const [form, setForm] = useState<FormValues>(initialValues);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [status, setStatus] = useState<Status>("idle");
  const [note, setNote] = useState("");
  const [website, setWebsite] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const turnstileRef = useRef<HTMLDivElement | null>(null);
  const turnstileWidgetId = useRef<string | null>(null);

  useEffect(() => {
    if (!turnstileSiteKey || turnstileWidgetId.current) return;

    function renderTurnstile() {
      if (!turnstileRef.current || !window.turnstile || turnstileWidgetId.current) return;
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
    return (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value = event.target.value;
      setForm((current) => ({ ...current, [key]: value }));
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
      const response = await fetch("/api/careers/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobSlug,
          jobTitle,
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
        setNote(payload.error ?? "Too many submissions. Please try again soon.");
        return;
      }

      if (!response.ok) {
        setStatus("error");
        setErrors(payload.fieldErrors ?? {});
        setNote(payload.error ?? "Something went wrong.");
        return;
      }

      setStatus("success");
      setNote(payload.message ?? "Thanks — the hiring team will be in touch.");
      setForm(initialValues);
      setWebsite("");
      setTurnstileToken("");
      if (turnstileWidgetId.current) {
        window.turnstile?.reset(turnstileWidgetId.current);
      }
    } catch {
      setStatus("error");
      setNote("Unable to submit the application right now. Please try again.");
    }
  }

  const inputClass =
    "w-full rounded-[1rem] border border-black/15 bg-white px-3 py-2.5 outline-none transition focus:border-[#8d120e] aria-[invalid=true]:border-[#9f251d]";

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className={`rounded-[1.75rem] border border-black/10 bg-white p-6 shadow-[0_14px_30px_rgba(33,18,17,0.06)] ${className}`.trim()}
    >
      <h3 className="text-3xl font-[family:var(--font-title)] uppercase leading-none text-[#220707]">
        Apply Online
      </h3>
      <p className="mt-2 text-sm text-[#5c4743]">
        We&apos;ll send your submission to the hiring team. You can optionally link a resume hosted on Drive or Dropbox.
      </p>

      <div className="mt-5 grid gap-4">
        <label className="block text-sm text-[#2b1512]">
          Full Name *
          <input
            type="text"
            autoComplete="name"
            value={form.fullName}
            onChange={updateField("fullName")}
            aria-invalid={errors.fullName ? true : undefined}
            className={`${inputClass} mt-1`}
          />
          {errors.fullName ? <span className="mt-1 block text-xs text-[#9f251d]">{errors.fullName}</span> : null}
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm text-[#2b1512]">
            Email *
            <input
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={updateField("email")}
              aria-invalid={errors.email ? true : undefined}
              className={`${inputClass} mt-1`}
            />
            {errors.email ? <span className="mt-1 block text-xs text-[#9f251d]">{errors.email}</span> : null}
          </label>
          <label className="block text-sm text-[#2b1512]">
            Phone
            <input
              type="tel"
              autoComplete="tel"
              value={form.phone}
              onChange={updateField("phone")}
              className={`${inputClass} mt-1`}
            />
          </label>
        </div>

        <label className="block text-sm text-[#2b1512]">
          Resume Link (Drive, Dropbox, etc.)
          <input
            type="url"
            value={form.resumeUrl}
            onChange={updateField("resumeUrl")}
            placeholder="https://..."
            aria-invalid={errors.resumeUrl ? true : undefined}
            className={`${inputClass} mt-1`}
          />
          {errors.resumeUrl ? <span className="mt-1 block text-xs text-[#9f251d]">{errors.resumeUrl}</span> : null}
        </label>

        <label className="block text-sm text-[#2b1512]">
          Cover Note
          <textarea
            rows={5}
            value={form.message}
            onChange={updateField("message")}
            className={`${inputClass} mt-1 resize-y`}
          />
        </label>
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
            <p className="mt-2 text-xs text-[#6a433d]">Complete the security check to apply.</p>
          ) : null}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={status === "saving" || Boolean(turnstileSiteKey && !turnstileToken)}
        className="mt-6 inline-flex min-w-40 cursor-pointer items-center justify-center rounded-full bg-[#8d120e] px-6 py-3 text-sm font-semibold text-white transition duration-150 ease-out hover:-translate-y-0.5 hover:bg-[#a51611] hover:shadow-[0_12px_26px_rgba(141,18,14,0.22)] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0 disabled:hover:shadow-none"
      >
        {status === "saving" ? "Submitting..." : "Submit Application"}
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
