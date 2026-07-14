import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Exclude heavy client-only packages from serverless bundles
  serverExternalPackages: ["maplibre-gl", "@maplibre/maplibre-gl-style-spec"],

  // Reduce output size
  output: "standalone",
};

export default nextConfig;
