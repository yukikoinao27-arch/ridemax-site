"use client";

import { useState } from "react";

type ContactFormProps = {
  className?: string;
};

const initialState = {
  firstName: "",
  lastName: "",
  email: "",
  message: "",
};

export function ContactForm({ className = "" }: ContactFormProps) {
  const [form, setForm] = useState(initialState);
  const [status, setStatus] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [note, setNote] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("saving");
    setNote("");

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const payload = (await response.json()) as { error?: string; message?: string };

      if (!response.ok) {
        setStatus("error");
        setNote(payload.error ?? "Something went wrong.");
        return;
      }

      setStatus("success");
      setNote(payload.message ?? "Message sent.");
      setForm(initialState);
    } catch {
      setStatus("error");
      setNote("Unable to send the message right now.");
    }
  }

  return (
    <form onSubmit={handleSubmit} className={`rounded-[2rem] bg-white p-7 shadow-[0_18px_40px_rgba(33,18,17,0.08)] ${className}`.trim()}>
      <h2 className="text-4xl font-[family:var(--font-title)] uppercase leading-none text-[#220707]">Send a Message</h2>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <label className="text-sm text-[#2b1512]">
          <span>First Name *</span>
          <input
            required
            value={form.firstName}
            onChange={(event) => setForm((current) => ({ ...current, firstName: event.target.value }))}
            className="mt-2 w-full border border-[#3a2320] px-3 py-2.5 outline-none focus:border-[#8d2018]"
          />
        </label>
        <label className="text-sm text-[#2b1512]">
          <span>Last Name</span>
          <input
            value={form.lastName}
            onChange={(event) => setForm((current) => ({ ...current, lastName: event.target.value }))}
            className="mt-2 w-full border border-[#3a2320] px-3 py-2.5 outline-none focus:border-[#8d2018]"
          />
        </label>
      </div>
      <label className="mt-4 block text-sm text-[#2b1512]">
        <span>Email *</span>
        <input
          type="email"
          required
          value={form.email}
          onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
          className="mt-2 w-full border border-[#3a2320] px-3 py-2.5 outline-none focus:border-[#8d2018]"
        />
      </label>
      <label className="mt-4 block text-sm text-[#2b1512]">
        <span>Message *</span>
        <textarea
          required
          value={form.message}
          onChange={(event) => setForm((current) => ({ ...current, message: event.target.value }))}
          className="mt-2 h-28 w-full border border-[#3a2320] px-3 py-2.5 outline-none focus:border-[#8d2018]"
        />
      </label>
      <button
        type="submit"
        disabled={status === "saving"}
        className="mt-5 inline-flex min-w-36 items-center justify-center bg-[#8d120e] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#a11410] disabled:cursor-not-allowed disabled:opacity-70"
      >
        {status === "saving" ? "Sending..." : "Send"}
      </button>
      {note ? (
        <p className={`mt-3 text-sm ${status === "error" ? "text-[#9f251d]" : "text-[#255c2f]"}`}>{note}</p>
      ) : null}
    </form>
  );
}
