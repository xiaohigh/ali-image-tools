import type { NextConfig } from "next";

const nextConfig: any = {
  /* config options here */
  output: 'standalone', // Required for Electron production build
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;

