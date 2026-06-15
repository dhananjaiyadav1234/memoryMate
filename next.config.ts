import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable Turbopack (default in Next.js 16) with empty config to suppress warnings
  turbopack: {},

  // face-api.js uses Node.js modules (fs, path) that aren't available in the browser.
  // We need to tell webpack to ignore them for client-side builds.
  // This is used when falling back to webpack mode.
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
      };
    }
    return config;
  },
};

export default nextConfig;
