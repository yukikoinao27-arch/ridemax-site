import { NextResponse } from "next/server";
import { jobApplicationInputSchema } from "@/lib/content-schemas";
import {
  hasFilledHoneypot,
  readTurnstileToken,
  verifyTurnstileToken,
} from "@/lib/server/contact-protection";
import {
  type JobApplicationResumeAttachment,
  notifyHrOfJobApplication,
} from "@/lib/server/job-application-notifications";
import { submitJobApplication } from "@/lib/server/job-applications";
import { consumeRateLimit } from "@/lib/server/rate-limit";
import { getSiteContent } from "@/lib/server/ridemax-content-repository";

const maxResumeBytes = 5 * 1024 * 1024;

type ApplicationRequestPayload = {
  body: unknown;
  resumeFile: File | null;
};

function formValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

async function readApplicationRequest(request: Request): Promise<ApplicationRequestPayload> {
  const contentType = request.headers.get("content-type") ?? "";

  if (!contentType.includes("multipart/form-data")) {
    return {
      body: await request.json().catch(() => null),
      resumeFile: null,
    };
  }

  const formData = await request.formData();
  const resumeEntry = formData.get("resumeFile");

  return {
    body: {
      jobSlug: formValue(formData, "jobSlug"),
      jobTitle: formValue(formData, "jobTitle"),
      fullName: formValue(formData, "fullName"),
      email: formValue(formData, "email"),
      phone: formValue(formData, "phone"),
      message: formValue(formData, "message"),
      resumeUrl: "",
      website: formValue(formData, "website"),
      turnstileToken: formValue(formData, "turnstileToken"),
    },
    resumeFile: resumeEntry instanceof File && resumeEntry.size > 0 ? resumeEntry : null,
  };
}

async function readResumeAttachment(
  file: File | null,
): Promise<{ attachment: JobApplicationResumeAttachment | null; error?: string }> {
  if (!file) {
    return { attachment: null };
  }

  const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  if (!isPdf) {
    return { attachment: null, error: "Resume must be a PDF file." };
  }

  if (file.size > maxResumeBytes) {
    return { attachment: null, error: "Resume PDF must be 5 MB or smaller." };
  }

  return {
    attachment: {
      fileName: file.name || "resume.pdf",
      contentType: "application/pdf",
      contentBase64: Buffer.from(await file.arrayBuffer()).toString("base64"),
      size: file.size,
    },
  };
}

// Job applications use the same defense-in-depth stack as /api/contact:
// rate limit + honeypot + Turnstile. Marketing doesn't want to manually sift
// bot submissions out of the careers inbox.
export async function POST(request: Request) {
  const rateLimit = consumeRateLimit(request, "careers-apply", {
    limit: 5,
    windowMs: 60_000,
  });

  if (!rateLimit.ok) {
    return NextResponse.json(
      { error: "Too many applications in a short time. Please retry in a minute." },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil((rateLimit.resetAt - Date.now()) / 1000)),
        },
      },
    );
  }

  const { body, resumeFile } = await readApplicationRequest(request);

  // Silent success on honeypot trip so bots don't learn the field name by
  // watching status codes.
  if (hasFilledHoneypot(body)) {
    return NextResponse.json({ message: "Application received." });
  }

  const securityCheck = await verifyTurnstileToken(request, readTurnstileToken(body));
  if (!securityCheck.ok) {
    return NextResponse.json(
      { error: securityCheck.error ?? "Security check failed." },
      { status: 403 },
    );
  }

  const parsed = jobApplicationInputSchema.safeParse(body);

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const path = issue.path[0];
      if (typeof path === "string" && !fieldErrors[path]) {
        fieldErrors[path] = issue.message;
      }
    }

    return NextResponse.json(
      {
        error: parsed.error.issues[0]?.message ?? "Invalid application input.",
        fieldErrors,
      },
      { status: 400 },
    );
  }

  const resume = await readResumeAttachment(resumeFile);
  if (resume.error) {
    return NextResponse.json(
      {
        error: resume.error,
        fieldErrors: { resumeFile: resume.error },
      },
      { status: 400 },
    );
  }

  try {
    await submitJobApplication(parsed.data);
    const content = await getSiteContent().catch(() => null);
    const notification = await notifyHrOfJobApplication({
      application: parsed.data,
      fallbackRecipient: content?.contact.email,
      resume: resume.attachment,
    });

    return NextResponse.json({
      message: notification.sent
        ? "Application received and sent to the hiring team."
        : "Application received. The hiring team will review it shortly.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to submit application.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
