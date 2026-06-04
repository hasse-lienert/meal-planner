import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['@supabase/supabase-js'],
  turbopack: { rules: {} },
};

export default nextConfig;
