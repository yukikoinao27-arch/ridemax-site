import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    // Whitelist of trusted image hosts. If the admin pastes an external URL
    // from anywhere else, Next/Image refuses to render it — that is the whole
    // point of the whitelist. Add new origins here deliberately.
    remotePatterns: [
      { protocol: "https", hostname: "static.wixstatic.com" },
      // AWS S3 direct bucket URLs + the CloudFront edge in front of them.
      { protocol: "https", hostname: "**.amazonaws.com" },
      { protocol: "https", hostname: "**.cloudfront.net" },
      // Supabase Storage public buckets (project-scoped subdomain pattern).
      { protocol: "https", hostname: "**.supabase.co" },
      { protocol: "https", hostname: "**.supabase.in" },
    ],
  },
};

export default nextConfig;
