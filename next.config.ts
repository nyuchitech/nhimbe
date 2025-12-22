import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable system TLS certs for Google Fonts in some environments
  experimental: {
    turbopackUseSystemTlsCerts: true,
  },
};

export default nextConfig;
