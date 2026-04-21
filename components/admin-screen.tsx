import { AdminDashboard, type AdminView } from "@/components/admin-dashboard";
import { draftMode } from "next/headers";
import {
  isAdminAuthenticated,
  isAdminPasswordConfigured,
  isAdminPasswordMisconfigured,
  isAdminProtectionEnabled,
} from "@/lib/server/admin-auth";
import { listJobApplications } from "@/lib/server/job-applications";
import { listMediaAssets } from "@/lib/server/media-library";
import {
  getAdminMetrics,
  getDraftSiteContent,
  listContactMessages,
} from "@/lib/server/ridemax-content-repository";

type AdminScreenProps = {
  view: AdminView;
  error?: string;
};

export async function AdminScreen({ view, error }: AdminScreenProps) {
  const hasMissingPasswordError = error === "missing-admin-password";
  const hasInvalidPasswordError = error === "invalid-password";
  const hasRateLimitError = error === "rate-limited";
  const protectedMode = isAdminProtectionEnabled();
  const hasConfiguredPassword = isAdminPasswordConfigured();
  const misconfiguredInProduction = isAdminPasswordMisconfigured();
  const authenticated = await isAdminAuthenticated();
  const preview = await draftMode();

  if (misconfiguredInProduction) {
    return (
      <main className="bg-[#f7f4f1] py-16">
        <div className="mx-auto max-w-xl px-6 md:px-10">
          <section className="rounded-[2rem] border border-[#8d120e]/20 bg-white p-8 shadow-[0_18px_44px_rgba(31,20,19,0.08)]">
            <p className="text-sm uppercase tracking-[0.18em] text-[#8d120e]">Admin Configuration Required</p>
            <h1 className="mt-4 text-5xl font-[family:var(--font-title)] uppercase leading-none text-[#220707]">
              Set admin password
            </h1>
            <p className="mt-4 text-sm leading-7 text-[#4d3b37]">
              The admin is locked in production until <code>RIDEMAX_ADMIN_PASSWORD</code> is configured in your deployment environment.
            </p>
          </section>
        </div>
      </main>
    );
  }

  if (protectedMode && !authenticated) {
    return (
      <main className="bg-[#f7f4f1] py-16">
        <div className="mx-auto max-w-xl px-6 md:px-10">
          <section className="rounded-[2rem] border border-black/10 bg-white p-8 shadow-[0_18px_44px_rgba(31,20,19,0.08)]">
            <p className="text-sm uppercase tracking-[0.18em] text-[#6a433d]">Protected Admin</p>
            <h1 className="mt-4 text-5xl font-[family:var(--font-title)] uppercase leading-none text-[#220707]">
              Sign in to manage content
            </h1>
            <p className="mt-4 text-sm leading-7 text-[#4d3b37]">
              Set <code>RIDEMAX_ADMIN_PASSWORD</code> in your environment and use it here to unlock content editing and the inbox.
            </p>
            {!hasConfiguredPassword || hasMissingPasswordError ? (
              <p className="mt-4 rounded border border-[#8d120e]/20 bg-[#fff4f3] px-4 py-3 text-sm text-[#8d120e]">
                Missing admin password configuration. Add <code>RIDEMAX_ADMIN_PASSWORD</code> in your environment settings, then retry.
              </p>
            ) : null}
            {hasInvalidPasswordError ? (
              <p className="mt-4 rounded border border-[#8d120e]/20 bg-[#fff4f3] px-4 py-3 text-sm text-[#8d120e]">
                Invalid admin password.
              </p>
            ) : null}
            {hasRateLimitError ? (
              <p className="mt-4 rounded border border-[#8d120e]/20 bg-[#fff4f3] px-4 py-3 text-sm text-[#8d120e]">
                Too many login attempts. Please wait a minute and try again.
              </p>
            ) : null}
            <form action="/api/admin/login" method="post" className="mt-8 space-y-4">
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6a433d]">
                  Your Work Email <span className="font-normal text-[#9b7771]">(for the activity log)</span>
                </span>
                <input
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@company.com"
                  className="mt-2 w-full border border-black/12 px-3 py-3 outline-none focus:border-[#8d120e]"
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6a433d]">Admin Password</span>
                <input
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  className="mt-2 w-full border border-black/12 px-3 py-3 outline-none focus:border-[#8d120e]"
                />
              </label>
              <button
                type="submit"
                className="inline-flex cursor-pointer bg-[#8d120e] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#a51611]"
              >
                Unlock Admin
              </button>
            </form>
          </section>
        </div>
      </main>
    );
  }

  const [content, metrics, messages, mediaAssets, jobApplications] = await Promise.all([
    getDraftSiteContent(),
    getAdminMetrics(),
    listContactMessages(),
    listMediaAssets(),
    listJobApplications(),
  ]);

  // The outer `<main>` + grid shell are provided by `app/admin/layout.tsx` so
  // the sidebar persists across admin route transitions. This screen only
  // renders the per-view content surface.
  return (
    <AdminDashboard
      initialContent={content}
      messages={messages}
      storageMode={metrics.storageMode}
      initialMediaAssets={mediaAssets}
      initialJobApplications={jobApplications}
      view={view}
      previewMode={preview.isEnabled}
    />
  );
}
