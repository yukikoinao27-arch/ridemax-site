import { createClient } from "@supabase/supabase-js";
import { readFile } from "node:fs/promises";
import path from "node:path";

const slug = process.env.RIDEMAX_SITE_CONTENT_SLUG || "primary";
const inputPath = path.resolve(process.argv[2] || "data/site-content.json");

function readSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.SUPABASE_SECRET_KEY?.trim();

  if (!url || !key) {
    throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before seeding.");
  }

  return { url, key };
}

/**
 * Seeds the draft/published CMS bundle from an exported JSON file. This keeps
 * local JSON as a bootstrap artifact while making Supabase the runtime source
 * of truth for production and shared development.
 */
async function main() {
  const { url, key } = readSupabaseConfig();
  const content = JSON.parse(await readFile(inputPath, "utf8"));
  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { error } = await supabase.from("site_content_documents").upsert(
    {
      slug,
      content,
      draft_content: content,
      published_content: content,
      last_published_at: new Date().toISOString(),
    },
    { onConflict: "slug" },
  );

  if (error) {
    throw new Error(error.message);
  }

  console.log(`Seeded ${slug} from ${inputPath}.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
