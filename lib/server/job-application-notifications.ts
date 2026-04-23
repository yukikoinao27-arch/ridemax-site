import type { JobApplicationInput } from "@/lib/content-schemas";

export type JobApplicationResumeAttachment = {
  fileName: string;
  contentType: "application/pdf";
  contentBase64: string;
  size: number;
};

type JobApplicationNotificationInput = {
  application: JobApplicationInput;
  fallbackRecipient?: string;
  resume?: JobApplicationResumeAttachment | null;
};

type NotificationResult = {
  sent: boolean;
  reason?: string;
};

function resolveRecipient(fallbackRecipient?: string) {
  return (
    process.env.RIDEMAX_HR_EMAIL?.trim() ||
    process.env.RIDEMAX_APPLICATIONS_EMAIL?.trim() ||
    fallbackRecipient?.trim() ||
    ""
  );
}

function textBodyForApplication(input: JobApplicationNotificationInput) {
  const { application, resume } = input;

  return [
    `New application for ${application.jobTitle || application.jobSlug}`,
    "",
    `Name: ${application.fullName}`,
    `Email: ${application.email}`,
    application.phone ? `Phone: ${application.phone}` : "Phone: Not provided",
    "",
    "Cover note:",
    application.message || "No cover note provided.",
    "",
    resume
      ? `Resume PDF attached: ${resume.fileName} (${Math.max(1, Math.round(resume.size / 1024))} KB)`
      : "Resume PDF: Not attached",
  ].join("\n");
}

/**
 * Sends a best-effort HR notification for public job applications.
 *
 * The application row is the source of truth; email is a delivery channel. This
 * keeps applicant submissions from failing just because a transactional email
 * provider is temporarily unavailable or not configured in a new deployment.
 */
export async function notifyHrOfJobApplication(
  input: JobApplicationNotificationInput,
): Promise<NotificationResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const to = resolveRecipient(input.fallbackRecipient);

  if (!apiKey) {
    return { sent: false, reason: "RESEND_API_KEY is not configured." };
  }

  if (!to) {
    return { sent: false, reason: "No HR recipient email is configured." };
  }

  const from =
    process.env.RIDEMAX_EMAIL_FROM?.trim() ||
    "Team Ridemax Careers <onboarding@resend.dev>";

  const payload = {
    from,
    to: [to],
    reply_to: input.application.email,
    subject: `Application for ${input.application.jobTitle || input.application.jobSlug}`,
    text: textBodyForApplication(input),
    attachments: input.resume
      ? [
          {
            filename: input.resume.fileName,
            content: input.resume.contentBase64,
          },
        ]
      : undefined,
  };

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  }).catch((error: unknown) => ({
    ok: false,
    json: async () => ({
      message: error instanceof Error ? error.message : "Unable to reach HR email provider.",
    }),
  }));

  if (!response.ok) {
    const errorPayload = (await response.json().catch(() => ({}))) as { message?: string };
    return {
      sent: false,
      reason: errorPayload.message ?? "HR email provider rejected the application notification.",
    };
  }

  return { sent: true };
}
