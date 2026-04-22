import { createClient } from "@supabase/supabase-js";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const slug = process.env.RIDEMAX_SITE_CONTENT_SLUG || "primary";
const outputArg = process.argv[2];

function readSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.SUPABASE_SECRET_KEY?.trim();

  if (!url || !key) {
    throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before exporting.");
  }

  return { url, key };
}

function defaultOutputPath() {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  return path.resolve("exports", `site-content-${stamp}.json`);
}

/**
 * Exports the Supabase CMS bundle to a portable JSON snapshot. Use this before
 * large edits, migrations, or production handoffs so the team has a clean
 * restore point without treating the repo data folder as the live database.
 */
async function main() {
  const { url, key } = readSupabaseConfig();
  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase
    .from("site_content_documents")
    .select("slug, content, draft_content, published_content, last_published_at, updated_at")
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  if (!data) {
    throw new Error(`No site_content_documents row found for slug "${slug}".`);
  }

  const outputPath = path.resolve(outputArg || defaultOutputPath());
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(data, null, 2)}\n`, "utf8");

  console.log(`Exported ${slug} to ${outputPath}.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
