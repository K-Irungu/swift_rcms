import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    qualities: [75, 95],
  },
  // mammoth and the Anthropic SDK use Node.js internals — keep them out of the webpack bundle
  serverExternalPackages: ["mammoth", "@google/generative-ai"],
};

export default nextConfig;
